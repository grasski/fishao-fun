/**
 * FISHAO - Daily Fish Market Price Sync (scripts/sync-market-prices.mjs)
 * ----------------------------------------------------------------------
 * Fetches daily Fish Market prices from https://www.fishao.net/wiki/fish/<id>/__data.json
 * for all fish IDs in fish.json and merges daily market prices into
 * Firestore document `fishao_market/prices_history`.
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
 * Resolves SvelteKit `devalue` pointers from `/wiki/fish/<id>/__data.json`
 * to extract the numeric market price, or returns null if unavailable.
 */
function extractMarketPrice(payload) {
  const node = payload?.nodes?.[2];
  if (!node || node.type !== 'data' || !Array.isArray(node.data)) return null;

  const data = node.data;
  const root = data[0];
  if (!root || typeof root !== 'object' || root.market === undefined) return null;

  const market = data[root.market];
  if (!market || typeof market !== 'object' || market.price === undefined) return null;

  const price = Number(data[market.price]);
  return Number.isFinite(price) && price > 0 ? price : null;
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

async function getTodaySyncStatus(db, todayISO) {
  const snap = await db.collection('fishao_market').doc('sync_status').get();
  if (!snap.exists) return null;
  const data = snap.data();
  return data?.lastSuccessDate === todayISO ? data : null;
}

async function markTodaySynced(db, todayISO, stats) {
  await db.collection('fishao_market').doc('sync_status').set({
    lastSuccessDate: todayISO,
    lastSuccessAt: new Date().toISOString(),
    pricesFetched: stats.pricesFetched,
    addedCount: stats.addedCount,
    duplicateCount: stats.duplicateCount
  });
}

async function writeToFirestore(db, fetchedPrices, todayISO) {
  const docRef = db.collection('fishao_market').doc('prices_history');

  let addedCount = 0;
  let duplicateCount = 0;
  const addedSample = [];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const existingData = snap.exists ? snap.data() : {};
    const prices = (existingData?.prices && typeof existingData.prices === 'object')
      ? { ...existingData.prices }
      : {};

    for (const { id, price } of fetchedPrices) {
      const key = String(id);
      const list = Array.isArray(prices[key]) ? [...prices[key]] : [];
      const alreadyExists = list.some(
        (entry) => entry && entry.date === todayISO && Number(entry.price) === price
      );

      if (alreadyExists) {
        duplicateCount++;
        continue;
      }

      list.push({ date: todayISO, price });
      prices[key] = list;
      addedCount++;
      if (addedSample.length < 15) {
        addedSample.push({ id, price });
      }
    }

    if (addedCount > 0) {
      tx.set(docRef, {
        prices,
        lastUpdated: new Date().toISOString()
      });
    }
  });

  return { addedCount, duplicateCount, addedSample };
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

  const { addedCount, duplicateCount, addedSample } = await writeToFirestore(db, ok, todayISO);
  if (args.limit === 0) {
    await markTodaySynced(db, todayISO, {
      pricesFetched: ok.length,
      addedCount,
      duplicateCount
    });
  }
  console.log(
    `Firestore sync complete: ${addedCount} new price entries added, ` +
    `${duplicateCount} same-day duplicates skipped.`
  );

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
    `| Same-day duplicates skipped | ${duplicateCount} |`
  ];

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
