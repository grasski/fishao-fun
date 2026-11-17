/**
 * FISHAO - Daily Fish Market Price Sync (scripts/sync-market-prices.mjs)
 * ----------------------------------------------------------------------
 * Fetches daily Fish Market prices from https://www.fishao.net/wiki/fish/<id>/__data.json
 * for all fish IDs in fish.json and merges daily market prices into:
 *   - `fishao_market/prices_summary` (compact unique-price summary for fast loads)
 *   - `fishao_market_daily/{YYYY-MM}` (monthly daily archive, immune to 1 MiB limit)
 *
 * Usage:
 *   node scripts/sync-market-prices.mjs [--dry-run] [--limit=N] [--migrate-only]
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
const FIRESTORE_DOC_LIMIT_BYTES = 1024 * 1024;
const SUMMARY_WARN_THRESHOLD_BYTES = 700 * 1024;

function parseArgs(argv) {
  const args = { dryRun: false, migrateOnly: false, limit: 0 };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--migrate-only') args.migrateOnly = true;
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

function measureSummaryDocument(summaryPrices, lastUpdated) {
  const safePrices = (summaryPrices && typeof summaryPrices === 'object') ? summaryPrices : {};
  let fishCount = 0;
  let uniquePrices = 0;

  for (const fishSum of Object.values(safePrices)) {
    if (!fishSum || typeof fishSum !== 'object') continue;
    fishCount++;
    if (fishSum.byPrice && typeof fishSum.byPrice === 'object') {
      uniquePrices += Object.keys(fishSum.byPrice).length;
    }
  }

  const payload = { prices: safePrices, lastUpdated: lastUpdated || '' };
  const jsonBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  const firestoreBytes = estimateFirestoreDocBytes('fishao_market', 'prices_summary', payload);
  const limitPct = Number(((firestoreBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1));

  return {
    fishCount,
    uniquePrices,
    jsonBytes,
    firestoreBytes,
    limitPct,
    isNearLimit: firestoreBytes >= SUMMARY_WARN_THRESHOLD_BYTES
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
    pricesFetched: stats.pricesFetched,
    addedCount: stats.addedCount,
    duplicateCount: stats.duplicateCount
  };
  if (stats.summaryMetrics) {
    doc.summaryBytes = stats.summaryMetrics.firestoreBytes;
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
  let fishSum = summaryPrices[fidKey];
  if (!fishSum || typeof fishSum !== 'object') {
    fishSum = { byPrice: {}, td: '', t: [] };
  }
  const byPrice = (fishSum.byPrice && typeof fishSum.byPrice === 'object')
    ? { ...fishSum.byPrice }
    : {};

  const pKey = String(priceNum);
  const curInfo = byPrice[pKey];
  const prevLast = curInfo && typeof curInfo.l === 'string' ? curInfo.l : '';
  const prevCount = curInfo && Number.isFinite(Number(curInfo.c)) ? Number(curInfo.c) : 0;

  byPrice[pKey] = {
    l: (!prevLast || dateISO > prevLast) ? dateISO : prevLast,
    c: prevCount + 1
  };

  let td = typeof fishSum.td === 'string' ? fishSum.td : '';
  let t = Array.isArray(fishSum.t) ? [...fishSum.t] : [];
  if (dateISO === todayISO) {
    if (td === todayISO) {
      if (!t.includes(priceNum)) t.push(priceNum);
    } else {
      td = todayISO;
      t = [priceNum];
    }
  }

  summaryPrices[fidKey] = { byPrice, td, t };
}

async function migrateLegacyPricesIfNeeded(db, todayISO) {
  const summaryRef = db.collection('fishao_market').doc('prices_summary');
  const summarySnap = await summaryRef.get();
  if (summarySnap.exists) {
    return false;
  }

  const legacyRef = db.collection('fishao_market').doc('prices_history');
  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists) {
    return false;
  }

  const legacyPrices = legacySnap.data()?.prices;
  if (!legacyPrices || typeof legacyPrices !== 'object') {
    return false;
  }

  const summaryPrices = {};
  const monthlyDays = {};
  let migratedEntries = 0;

  for (const [fidKey, rawList] of Object.entries(legacyPrices)) {
    if (!Array.isArray(rawList)) continue;
    const seenPairs = new Set();

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const dateISO = typeof item.date === 'string' ? item.date.trim() : '';
      const priceNum = Number(item.price);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !Number.isFinite(priceNum) || priceNum <= 0) {
        continue;
      }
      const pairKey = `${dateISO}|${priceNum}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      applyPriceToSummary(summaryPrices, fidKey, dateISO, priceNum, todayISO);

      const monthId = dateISO.slice(0, 7);
      if (!monthlyDays[monthId]) monthlyDays[monthId] = {};
      if (!monthlyDays[monthId][dateISO]) monthlyDays[monthId][dateISO] = {};

      const existing = toDayEntryList(monthlyDays[monthId][dateISO][fidKey]);
      if (!existing.includes(priceNum)) {
        existing.push(priceNum);
        monthlyDays[monthId][dateISO][fidKey] = encodeDayEntryList(existing);
      }
      migratedEntries++;
    }
  }

  const nowIso = new Date().toISOString();
  const monthEntries = Object.entries(monthlyDays);
  for (let i = 0; i < monthEntries.length; i += 400) {
    const chunk = monthEntries.slice(i, i + 400);
    const batch = db.batch();
    for (const [monthId, days] of chunk) {
      const dailyRef = db.collection('fishao_market_daily').doc(monthId);
      batch.set(dailyRef, { days, lastUpdated: nowIso }, { merge: true });
    }
    await batch.commit();
  }
  await summaryRef.set({ prices: summaryPrices, lastUpdated: nowIso });

  console.log(
    `Migrated legacy prices_history -> prices_summary + ${monthEntries.length} monthly docs (${migratedEntries} entries).`
  );
  return true;
}

async function writeToFirestore(db, fetchedPrices, todayISO) {
  const summaryRef = db.collection('fishao_market').doc('prices_summary');
  const monthId = todayISO.slice(0, 7);
  const dailyRef = db.collection('fishao_market_daily').doc(monthId);

  const txResult = await db.runTransaction(async (tx) => {
    const [summarySnap, dailySnap] = await Promise.all([
      tx.get(summaryRef),
      tx.get(dailyRef)
    ]);

    const summaryData = summarySnap.exists ? summarySnap.data() : {};
    const summaryPrices = (summaryData?.prices && typeof summaryData.prices === 'object')
      ? { ...summaryData.prices }
      : {};

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

    for (const { id, price } of fetchedPrices) {
      const key = String(id);
      const dayList = toDayEntryList(dayBucket[key]);

      if (dayList.includes(price)) {
        txDupes++;
        continue;
      }

      dayList.push(price);
      dayBucket[key] = encodeDayEntryList(dayList);
      applyPriceToSummary(summaryPrices, key, todayISO, price, todayISO);
      txAdded++;
      if (txSample.length < 15) {
        txSample.push({ id, price });
      }
    }

    let finalLastUpdated = (typeof summaryData?.lastUpdated === 'string') ? summaryData.lastUpdated : '';
    if (txAdded > 0) {
      const nowIso = new Date().toISOString();
      finalLastUpdated = nowIso;
      days[todayISO] = dayBucket;
      tx.set(summaryRef, {
        prices: summaryPrices,
        lastUpdated: nowIso
      });
      tx.set(dailyRef, {
        days,
        lastUpdated: nowIso
      });
    }

    return {
      addedCount: txAdded,
      duplicateCount: txDupes,
      addedSample: txSample,
      summaryPrices,
      lastUpdated: finalLastUpdated
    };
  });

  const summaryMetrics = measureSummaryDocument(txResult.summaryPrices, txResult.lastUpdated);
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

  if (args.migrateOnly) {
    const db = await initFirestore();
    const migrated = await migrateLegacyPricesIfNeeded(db, todayISO);
    console.log(migrated ? 'Migration complete.' : 'Nothing to migrate (prices_summary already exists or legacy missing).');
    return;
  }

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
    await migrateLegacyPricesIfNeeded(db, todayISO);
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
  const fsKb = (summaryMetrics.firestoreBytes / 1024).toFixed(1);
  const jsonKb = (summaryMetrics.jsonBytes / 1024).toFixed(1);
  console.log(
    `Firestore sync complete: ${addedCount} new price entries added, ` +
    `${duplicateCount} same-day duplicates skipped. ` +
    `prices_summary size: ${fsKb} KB / 1024 KB (${summaryMetrics.limitPct}% Firestore est., ` +
    `${jsonKb} KB JSON, ${summaryMetrics.uniquePrices} unique prices across ${summaryMetrics.fishCount} fish).`
  );
  if (summaryMetrics.isNearLimit) {
    console.warn(
      `::warning::fishao_market/prices_summary reached ${fsKb} KB (${summaryMetrics.limitPct}% of 1 MiB limit). ` +
      `Consider compacting entries or sharding summaries from fishao_market_daily.`
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
    `| \`prices_summary\` size (est.) | ${fsKb} KB / 1,024 KB (${summaryMetrics.limitPct}%) |`
  ];

  if (summaryMetrics.isNearLimit) {
    summaryLines.push(
      '',
      '> [!WARNING]',
      `> \`fishao_market/prices_summary\` reached **${fsKb} KB (${summaryMetrics.limitPct}%)** of Firestore's 1 MiB document limit (JSON: ${jsonKb} KB). Time to switch to compact strings or sharded summary docs using \`fishao_market_daily\`.`
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
