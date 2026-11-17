/**
 * FISHAO - Daily Fish Market Price Sync (scripts/sync-market-prices.mjs)
 * ----------------------------------------------------------------------
 * Fetches daily Fish Market prices from https://www.fishao.net/wiki/fish/<id>/__data.json
 * for all fish IDs in fish.json and merges daily market prices into:
 *   - `fishao_market/prices_summary_0..3` (4-sharded compact unique-price summary)
 *   - `fishao_market_daily/{YYYY-MM}` (monthly daily archive, immune to 1 MiB limit)
 *
 * Usage:
 *   node scripts/sync-market-prices.mjs [--dry-run] [--limit=N]
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT  JSON string of a Firebase service account key
 *                             (required unless --dry-run is passed).
 *   FORCE_SYNC=1              Allow running on Sunday (UTC) or re-syncing on
 *                             the same day if needed.
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://www.fishao.net/wiki/fish';
const CONCURRENCY = 12;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const SUMMARY_SHARD_COUNT = 4;
const FIRESTORE_DOC_LIMIT_BYTES = 1024 * 1024;
const SUMMARY_WARN_THRESHOLD_BYTES = 700 * 1024;

function getShardIndex(fidKey) {
  const n = Number.parseInt(fidKey, 10);
  return (Number.isFinite(n) && n >= 0) ? (n % SUMMARY_SHARD_COUNT) : 0;
}

function getShardDocId(shardIdx) {
  return `prices_summary_${shardIdx}`;
}

function packSummaryDate(isoDate) {
  if (typeof isoDate !== 'string') return '';
  const s = isoDate.trim();
  if (/^20\d{2}-\d{2}-\d{2}$/.test(s)) {
    return s.slice(2, 4) + s.slice(5, 7) + s.slice(8, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s.slice(0, 4) + s.slice(5, 7) + s.slice(8, 10);
  }
  return s;
}

function unpackSummaryDate(packed) {
  if (typeof packed !== 'string') return '';
  if (packed.length === 6 && /^\d{6}$/.test(packed)) {
    return `20${packed.slice(0, 2)}-${packed.slice(2, 4)}-${packed.slice(4, 6)}`;
  }
  if (packed.length === 8 && /^\d{8}$/.test(packed)) {
    return `${packed.slice(0, 4)}-${packed.slice(4, 6)}-${packed.slice(6, 8)}`;
  }
  return packed;
}

function decodeFishSummaryEntry(fishSum) {
  const byPrice = {};
  if (!fishSum || typeof fishSum !== 'object') {
    return { byPrice, td: '', t: [] };
  }
  if (typeof fishSum.p === 'string' && fishSum.p) {
    const tokens = fishSum.p.split('|');
    for (const tok of tokens) {
      if (!tok) continue;
      const parts = tok.split(':');
      const priceNum = Number(parts[0]);
      const lastDate = parts[1] ? unpackSummaryDate(parts[1]) : '';
      const countNum = parts[2] ? Math.max(1, Number.parseInt(parts[2], 10) || 1) : 1;
      if (!Number.isFinite(priceNum) || priceNum <= 0 || !lastDate) continue;
      byPrice[String(priceNum)] = { l: lastDate, c: countNum };
    }
  }
  const td = typeof fishSum.td === 'string' ? fishSum.td : '';
  const t = Array.isArray(fishSum.t)
    ? fishSum.t.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  return { byPrice, td, t };
}

function encodeFishSummaryEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const dec = (typeof entry.p === 'string' && !entry.byPrice) ? decodeFishSummaryEntry(entry) : entry;
  const keys = Object.keys(dec.byPrice || {}).sort((a, b) => Number(a) - Number(b));
  const tokens = [];
  for (const pKey of keys) {
    const info = dec.byPrice[pKey];
    if (!info || !info.l) continue;
    const cNum = Math.max(1, Number.parseInt(info.c, 10) || 1);
    tokens.push(`${pKey}:${packSummaryDate(info.l)}${cNum > 1 ? `:${cNum}` : ''}`);
  }
  if (tokens.length === 0) return null;
  const out = { p: tokens.join('|') };
  if (dec.td && Array.isArray(dec.t) && dec.t.length > 0) {
    out.td = dec.td;
    out.t = [...dec.t];
  }
  return out;
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: 0 };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (Number.isInteger(n) && n > 0) args.limit = n;
    }
  }
  return args;
}

/**
 * Extracts market price from a SvelteKit `devalue` node.
 */
function extractPriceFromNode(node) {
  if (!node || node.type !== 'data' || !Array.isArray(node.data)) return null;

  const data = node.data;
  const root = data[0];
  if (!root || typeof root !== 'object' || root.market === undefined) return null;

  const market = data[root.market];
  if (!market || typeof market !== 'object' || market.price === undefined) return null;

  const price = Number(data[market.price]);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * Resolves SvelteKit `devalue` pointers from `/wiki/fish/<id>/__data.json`
 * to extract the numeric market price, or returns null if unavailable.
 */
function extractMarketPrice(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  if (nodes[2]) {
    const p = extractPriceFromNode(nodes[2]);
    if (p !== null) return p;
  }
  for (let i = 0; i < nodes.length; i++) {
    if (i === 2) continue;
    const p = extractPriceFromNode(nodes[i]);
    if (p !== null) return p;
  }
  return null;
}

async function fetchFishPrice(fishId) {
  const url = `${BASE_URL}/${fishId}/__data.json`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'fishao-fun-market-sync/1.0'
        }
      });

      if (res.status === 404) {
        return { id: fishId, status: 'not_found', price: null };
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = await res.json();
      const price = extractMarketPrice(payload);
      return price !== null
        ? { id: fishId, status: 'ok', price }
        : { id: fishId, status: 'no_price', price: null };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { id: fishId, status: 'error', price: null, error: err.message };
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  );
  await Promise.all(workers);
  return results;
}

function loadFishIds() {
  const fishJsonPath = path.resolve('data/raw/fish.json');
  const raw = JSON.parse(fs.readFileSync(fishJsonPath, 'utf8'));
  const list = Array.isArray(raw?.data) ? raw.data : [];
  const seen = new Set();
  const ids = [];

  for (const item of list) {
    const id = Number(item?.id);
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

async function initFirestore() {
  const rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawCreds) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const serviceAccount = JSON.parse(rawCreds);
  initializeApp({ credential: cert(serviceAccount) });

  return getFirestore();
}

function estimateFirestoreValueBytes(val) {
  if (val === null || val === undefined || typeof val === 'boolean') return 1;
  if (typeof val === 'number') return 8;
  if (typeof val === 'string') return Buffer.byteLength(val, 'utf8') + 1;
  if (Array.isArray(val)) {
    let sum = 0;
    for (let i = 0; i < val.length; i++) {
      sum += estimateFirestoreValueBytes(val[i]);
    }
    return sum;
  }
  if (typeof val === 'object') {
    let sum = 32; // Nested map / document overhead
    for (const [k, v] of Object.entries(val)) {
      if (v === undefined) continue;
      sum += Buffer.byteLength(k, 'utf8') + 1 + estimateFirestoreValueBytes(v);
    }
    return sum;
  }
  return 0;
}

function estimateFirestoreDocBytes(collectionId, docId, data) {
  const nameBytes =
    Buffer.byteLength(collectionId, 'utf8') + 1 +
    Buffer.byteLength(docId, 'utf8') + 1 +
    16;
  return nameBytes + estimateFirestoreValueBytes(data || {});
}

function measureShardedSummaries(shardMaps, lastUpdated) {
  let fishCount = 0;
  let uniquePrices = 0;
  let totalJsonBytes = 0;
  let totalFirestoreBytes = 0;
  let maxShardBytes = 0;
  const shardBytes = [];

  for (let i = 0; i < SUMMARY_SHARD_COUNT; i++) {
    const safePrices = (shardMaps[i] && typeof shardMaps[i] === 'object') ? shardMaps[i] : {};
    for (const fishSum of Object.values(safePrices)) {
      if (!fishSum || typeof fishSum !== 'object') continue;
      fishCount++;
      if (typeof fishSum.p === 'string' && fishSum.p) {
        uniquePrices += fishSum.p.split('|').length;
      }
    }
    const payload = { prices: safePrices, lastUpdated: lastUpdated || '' };
    totalJsonBytes += Buffer.byteLength(JSON.stringify(payload), 'utf8');
    const fsBytes = estimateFirestoreDocBytes('fishao_market', getShardDocId(i), payload);
    shardBytes.push(fsBytes);
    totalFirestoreBytes += fsBytes;
    if (fsBytes > maxShardBytes) maxShardBytes = fsBytes;
  }

  const maxShardLimitPct = Number(((maxShardBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1));

  return {
    fishCount,
    uniquePrices,
    jsonBytes: totalJsonBytes,
    firestoreBytes: totalFirestoreBytes,
    maxShardBytes,
    shardBytes,
    limitPct: maxShardLimitPct,
    isNearLimit: maxShardBytes >= SUMMARY_WARN_THRESHOLD_BYTES
  };
}

async function getTodaySyncStatus(db, todayISO) {
  const snap = await db.collection('fishao_market').doc('sync_status').get();
  if (!snap.exists) return null;
  const data = snap.data();
  return data?.lastSuccessDate === todayISO ? data : null;
}

async function markTodaySynced(db, todayISO, stats) {
  const doc = {
    lastSuccessDate: todayISO,
    lastSuccessAt: new Date().toISOString(),
    summaryMode: 'sharded_compact_v2',
    shardCount: SUMMARY_SHARD_COUNT,
    pricesFetched: stats.pricesFetched,
    addedCount: stats.addedCount,
    duplicateCount: stats.duplicateCount
  };
  if (stats.summaryMetrics) {
    doc.summaryBytes = stats.summaryMetrics.firestoreBytes;
    doc.maxShardBytes = stats.summaryMetrics.maxShardBytes;
    doc.summaryLimitPct = stats.summaryMetrics.limitPct;
    doc.summaryUniquePrices = stats.summaryMetrics.uniquePrices;
  }
  await db.collection('fishao_market').doc('sync_status').set(doc);
}

function toDayEntryList(rawVal) {
  if (Array.isArray(rawVal)) {
    return rawVal.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  const single = Number(rawVal);
  return Number.isFinite(single) && single > 0 ? [single] : [];
}

function encodeDayEntryList(list) {
  if (!list || list.length === 0) return undefined;
  return list.length === 1 ? list[0] : list;
}

function applyPriceToSummary(summaryPrices, fidKey, dateISO, priceNum, todayISO) {
  const dec = decodeFishSummaryEntry(summaryPrices[fidKey]);
  const byPrice = { ...dec.byPrice };

  const pKey = String(priceNum);
  const curInfo = byPrice[pKey];
  const prevLast = curInfo && typeof curInfo.l === 'string' ? curInfo.l : '';
  const prevCount = curInfo && Number.isFinite(Number(curInfo.c)) ? Number(curInfo.c) : 0;

  byPrice[pKey] = {
    l: (!prevLast || dateISO > prevLast) ? dateISO : prevLast,
    c: prevCount + 1
  };

  let td = dec.td || '';
  let t = Array.isArray(dec.t) ? [...dec.t] : [];
  if (dateISO === todayISO) {
    if (td === todayISO) {
      if (!t.includes(priceNum)) t.push(priceNum);
    } else {
      td = todayISO;
      t = [priceNum];
    }
  }

  const encoded = encodeFishSummaryEntry({ byPrice, td, t });
  if (encoded) summaryPrices[fidKey] = encoded;
}

function compactShardMap(rawMap) {
  const out = {};
  if (!rawMap || typeof rawMap !== 'object') return out;
  for (const [k, v] of Object.entries(rawMap)) {
    const enc = encodeFishSummaryEntry(v);
    if (enc) out[k] = enc;
  }
  return out;
}

async function writeToFirestore(db, fetchedPrices, todayISO) {
  const shardRefs = Array.from({ length: SUMMARY_SHARD_COUNT }, (_, i) =>
    db.collection('fishao_market').doc(getShardDocId(i))
  );
  const monthId = todayISO.slice(0, 7);
  const dailyRef = db.collection('fishao_market_daily').doc(monthId);

  const txResult = await db.runTransaction(async (tx) => {
    const snaps = await Promise.all([
      ...shardRefs.map((ref) => tx.get(ref)),
      tx.get(dailyRef)
    ]);
    const shardSnaps = snaps.slice(0, SUMMARY_SHARD_COUNT);
    const dailySnap = snaps[SUMMARY_SHARD_COUNT];

    const shardMaps = shardSnaps.map((s) =>
      compactShardMap(s.exists ? s.data()?.prices : {})
    );

    const dailyData = dailySnap.exists ? dailySnap.data() : {};
    const days = (dailyData?.days && typeof dailyData.days === 'object')
      ? { ...dailyData.days }
      : {};
    const dayBucket = (days[todayISO] && typeof days[todayISO] === 'object')
      ? { ...days[todayISO] }
      : {};

    let txAdded = 0;
    let txDupes = 0;
    const txSample = [];
    const shardDirty = new Array(SUMMARY_SHARD_COUNT).fill(false);

    for (const { id, price } of fetchedPrices) {
      const key = String(id);
      const dayList = toDayEntryList(dayBucket[key]);

      if (dayList.includes(price)) {
        txDupes++;
        continue;
      }

      const sIdx = getShardIndex(key);
      dayList.push(price);
      dayBucket[key] = encodeDayEntryList(dayList);
      applyPriceToSummary(shardMaps[sIdx], key, todayISO, price, todayISO);
      shardDirty[sIdx] = true;
      txAdded++;
      if (txSample.length < 15) {
        txSample.push({ id, price });
      }
    }

    let finalLastUpdated = shardSnaps.reduce((latest, s) => {
      const lu = s.exists && typeof s.data()?.lastUpdated === 'string' ? s.data().lastUpdated : '';
      return lu > latest ? lu : latest;
    }, '');

    if (txAdded > 0) {
      const nowIso = new Date().toISOString();
      finalLastUpdated = nowIso;
      days[todayISO] = dayBucket;
      for (let i = 0; i < SUMMARY_SHARD_COUNT; i++) {
        if (shardDirty[i] || !shardSnaps[i].exists) {
          tx.set(shardRefs[i], {
            prices: shardMaps[i],
            lastUpdated: nowIso
          });
        }
      }
      tx.set(dailyRef, {
        days,
        lastUpdated: nowIso
      });
    }

    return {
      addedCount: txAdded,
      duplicateCount: txDupes,
      addedSample: txSample,
      shardMaps,
      lastUpdated: finalLastUpdated
    };
  });

  const summaryMetrics = measureShardedSummaries(txResult.shardMaps, txResult.lastUpdated);
  return {
    addedCount: txResult.addedCount,
    duplicateCount: txResult.duplicateCount,
    addedSample: txResult.addedSample,
    summaryMetrics
  };
}

function writeStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    fs.appendFileSync(summaryPath, lines.join('\n') + '\n', 'utf8');
  } catch (err) {
    console.warn('Failed to write GITHUB_STEP_SUMMARY:', err.message);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  if (now.getUTCDay() === 0 && !process.env.FORCE_SYNC && !args.dryRun) {
    console.log(`[${todayISO}] Sunday (UTC): Fish Market is closed. Skipping sync.`);
    writeStepSummary([
      `## Fish Market Sync (${todayISO})`,
      '',
      '⏸️ **Skipped:** Sunday (UTC) — Fish Market is closed.'
    ]);
    return;
  }

  let db = null;
  if (!args.dryRun) {
    db = await initFirestore();
    if (!process.env.FORCE_SYNC) {
      const existingSync = await getTodaySyncStatus(db, todayISO);
      if (existingSync) {
        const syncedAt = existingSync.lastSuccessAt || todayISO;
        console.log(`[${todayISO}] Already synced today at ${syncedAt}. Skipping fetch.`);
        writeStepSummary([
          `## Fish Market Sync (${todayISO})`,
          '',
          `⏭️ **Skipped:** Market prices were already synced today at \`${syncedAt}\`.`
        ]);
        return;
      }
    }
  }

  let fishIds = loadFishIds();
  if (args.limit > 0) {
    fishIds = fishIds.slice(0, args.limit);
  }

  console.log(`[${todayISO}] Fetching market prices for ${fishIds.length} fish...`);
  const results = await mapWithConcurrency(fishIds, CONCURRENCY, fetchFishPrice);

  const ok = results.filter((r) => r.status === 'ok');
  const notFound = results.filter((r) => r.status === 'not_found');
  const noPrice = results.filter((r) => r.status === 'no_price');
  const errors = results.filter((r) => r.status === 'error');

  console.log(
    `Fetched: ${ok.length} prices, ${notFound.length} not found, ` +
    `${noPrice.length} without price, ${errors.length} errors.`
  );

  if (errors.length > 0) {
    console.warn('Sample errors:', errors.slice(0, 5));
  }

  if (args.dryRun) {
    console.log('Dry-run mode enabled; skipping Firestore write.');
    console.log('Sample fetched prices:', ok.slice(0, 10));
    writeStepSummary([
      `## Fish Market Sync (${todayISO}) — Dry Run`,
      '',
      '| Metric | Count |',
      '| :--- | ---: |',
      `| Fish IDs checked | ${fishIds.length} |`,
      `| Prices fetched | ${ok.length} |`,
      `| Not found (404) | ${notFound.length} |`,
      `| Without market price | ${noPrice.length} |`,
      `| Errors | ${errors.length} |`,
      '',
      '_Dry-run mode: Firestore was not modified._'
    ]);
    return;
  }

  if (ok.length === 0) {
    writeStepSummary([
      `## Fish Market Sync (${todayISO}) — Failed`,
      '',
      `❌ No prices were fetched (${errors.length} errors). Firestore write aborted.`
    ]);
    throw new Error('No prices were fetched; aborting Firestore write.');
  }

  const { addedCount, duplicateCount, addedSample, summaryMetrics } = await writeToFirestore(db, ok, todayISO);
  if (args.limit === 0) {
    await markTodaySynced(db, todayISO, {
      pricesFetched: ok.length,
      addedCount,
      duplicateCount,
      summaryMetrics
    });
  }
  const maxFsKb = (summaryMetrics.maxShardBytes / 1024).toFixed(1);
  const totalFsKb = (summaryMetrics.firestoreBytes / 1024).toFixed(1);
  const jsonKb = (summaryMetrics.jsonBytes / 1024).toFixed(1);
  console.log(
    `Firestore sync complete: ${addedCount} new price entries added, ` +
    `${duplicateCount} same-day duplicates skipped. ` +
    `Max shard size: ${maxFsKb} KB / 1024 KB (${summaryMetrics.limitPct}% est., ` +
    `total ${totalFsKb} KB across ${SUMMARY_SHARD_COUNT} shards, ${jsonKb} KB JSON, ` +
    `${summaryMetrics.uniquePrices} unique prices across ${summaryMetrics.fishCount} fish).`
  );
  if (summaryMetrics.isNearLimit) {
    console.warn(
      `::warning::Max prices_summary shard reached ${maxFsKb} KB (${summaryMetrics.limitPct}% of 1 MiB limit).`
    );
  }

  const summaryLines = [
    `## Fish Market Sync (${todayISO})`,
    '',
    '| Metric | Count |',
    '| :--- | ---: |',
    `| Fish IDs checked | ${fishIds.length} |`,
    `| Prices fetched | ${ok.length} |`,
    `| Not found (404) | ${notFound.length} |`,
    `| Without market price | ${noPrice.length} |`,
    `| Errors | ${errors.length} |`,
    `| **New prices added** | **${addedCount}** |`,
    `| Same-day duplicates skipped | ${duplicateCount} |`,
    `| Unique prices in summary | ${summaryMetrics.uniquePrices} (${summaryMetrics.fishCount} fish) |`,
    `| Max \`prices_summary_*\` shard (est.) | ${maxFsKb} KB / 1,024 KB (${summaryMetrics.limitPct}%) |`,
    `| Total summary across ${SUMMARY_SHARD_COUNT} shards | ${totalFsKb} KB (JSON: ${jsonKb} KB) |`
  ];

  if (summaryMetrics.isNearLimit) {
    summaryLines.push(
      '',
      '> [!WARNING]',
      `> Largest \`fishao_market/prices_summary_*\` shard reached **${maxFsKb} KB (${summaryMetrics.limitPct}%)** of Firestore's 1 MiB document limit.`
    );
  }

  if (addedSample.length > 0) {
    const preview = addedSample.map((e) => `#${e.id}: ${e.price} FB`).join(', ');
    summaryLines.push('', `**Sample new prices:** ${preview}${addedCount > addedSample.length ? ', …' : ''}`);
  }
  if (errors.length > 0) {
    const errPreview = errors.slice(0, 5).map((e) => `#${e.id} (${e.error})`).join(', ');
    summaryLines.push('', `⚠️ **Sample errors:** ${errPreview}`);
  }

  writeStepSummary(summaryLines);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
