/**
 * FISHAO - Delete Fish Market Prices For One Day (scripts/delete-market-day.mjs)
 * ----------------------------------------------------------------------
 * Removes every recorded Fish Market price for a single date from BOTH stores:
 *   - `fishao_market_daily/{YYYY-MM}`  -> `days[YYYY-MM-DD]` is deleted
 *   - `fishao_market/prices_summary_0..3` -> affected price buckets are
 *     decremented (`c`), their `l` (last date) is recomputed from the remaining
 *     monthly archives, and empty buckets / fish entries are dropped
 *
 * The summary mutation mirrors the client-side admin delete path in
 * `js/market.js` (`removePriceFromSummaryMap`) so the two stay consistent.
 * When `l` has to be recomputed, every `fishao_market_daily` document is scanned
 * once up front to find the newest remaining date for that (fishId, price) pair.
 *
 * The whole write happens in a single Firestore transaction (4 shard docs +
 * 1 monthly archive doc), so a partial delete can never be committed.
 *
 * Usage:
 *   node scripts/delete-market-day.mjs [--date=YYYY-MM-DD] [--dry-run] [--yes]
 *                                      [--keep-sync-status] [--backup-out=FILE]
 *
 *   --date=YYYY-MM-DD    Date to clear. Defaults to today (UTC).
 *   --dry-run            Preview only, never writes to Firestore.
 *   --yes                Required to actually delete. Without it the script
 *                        prints the plan and exits without writing.
 *   --keep-sync-status   Do not reset `/fishao_market/sync_status` when the
 *                        deleted date is the last successfully synced date.
 *   --backup-out=FILE    Write a JSON snapshot of the removed day bucket and of
 *                        the affected summary entries (useful for undo).
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT  JSON string of a Firebase service account key.
 */

import fs from 'node:fs';

const SUMMARY_SHARD_COUNT = 4;
const FIRESTORE_DOC_LIMIT_BYTES = 1024 * 1024;
const SUMMARY_WARN_THRESHOLD_BYTES = 700 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------ *
 * Summary encoding helpers (must stay byte-compatible with
 * js/state.js and scripts/sync-market-prices.mjs)
 * ------------------------------------------------------------------ */

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

function compactShardMap(rawMap) {
  const out = {};
  if (!rawMap || typeof rawMap !== 'object') return out;
  for (const [k, v] of Object.entries(rawMap)) {
    const enc = encodeFishSummaryEntry(v);
    if (enc) out[k] = enc;
  }
  return out;
}

function toDayEntryList(rawVal) {
  if (Array.isArray(rawVal)) {
    return rawVal.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  const single = Number(rawVal);
  return Number.isFinite(single) && single > 0 ? [single] : [];
}

/* ------------------------------------------------------------------ *
 * Doc size estimation (warn before hitting Firestore's 1 MiB limit)
 * ------------------------------------------------------------------ */

function estimateFirestoreValueBytes(val) {
  if (val === null || val === undefined || typeof val === 'boolean') return 1;
  if (typeof val === 'number') return 8;
  if (typeof val === 'string') return Buffer.byteLength(val, 'utf8') + 1;
  if (Array.isArray(val)) {
    let sum = 0;
    for (let i = 0; i < val.length; i++) sum += estimateFirestoreValueBytes(val[i]);
    return sum;
  }
  if (typeof val === 'object') {
    let sum = 32;
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
  let maxShardBytes = 0;
  let totalFirestoreBytes = 0;

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
    const fsBytes = estimateFirestoreDocBytes('fishao_market', getShardDocId(i), payload);
    totalFirestoreBytes += fsBytes;
    if (fsBytes > maxShardBytes) maxShardBytes = fsBytes;
  }

  return {
    fishCount,
    uniquePrices,
    firestoreBytes: totalFirestoreBytes,
    maxShardBytes,
    limitPct: Number(((maxShardBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1)),
    isNearLimit: maxShardBytes >= SUMMARY_WARN_THRESHOLD_BYTES
  };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isValidISODate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/delete-market-day.mjs [options]',
      '',
      '  --date=YYYY-MM-DD    Date to clear (default: today, UTC)',
      '  --dry-run            Preview only; never writes to Firestore',
      '  --yes                Confirm the deletion (required for any write)',
      '  --keep-sync-status   Keep /fishao_market/sync_status untouched',
      '  --backup-out=FILE    Write a JSON snapshot of the removed data',
      '  -h, --help           Show this help',
      '',
      'Environment:',
      '  FIREBASE_SERVICE_ACCOUNT  Firebase service account JSON (always required)'
    ].join('\n')
  );
}

function parseArgs(argv) {
  const args = {
    date: '',
    dryRun: false,
    yes: false,
    keepSyncStatus: false,
    backupOut: '',
    help: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--keep-sync-status') args.keepSyncStatus = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--date=')) args.date = arg.slice('--date='.length).trim();
    else if (arg.startsWith('--backup-out=')) args.backupOut = arg.slice('--backup-out='.length).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

/* ------------------------------------------------------------------ *
 * Firestore
 * ------------------------------------------------------------------ */

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

async function loadMonthlyArchives(db) {
  const snap = await db.collection('fishao_market_daily').get();
  const months = new Map();
  snap.forEach((docSnap) => {
    months.set(docSnap.id, docSnap.data() || {});
  });
  return months;
}

/**
 * Builds `{ "<fid>|<price>": "<newestISO>" }` across every monthly archive,
 * ignoring `excludeDate`, so a deleted last occurrence can fall back to the
 * newest remaining date instead of keeping a stale `l`.
 */
function buildLatestDateIndex(months, excludeDate) {
  const index = new Map();
  let scannedDays = 0;

  for (const data of months.values()) {
    const days = data && data.days;
    if (!days || typeof days !== 'object') continue;
    for (const [dateISO, bucket] of Object.entries(days)) {
      if (dateISO === excludeDate) continue;
      if (!bucket || typeof bucket !== 'object') continue;
      scannedDays++;
      for (const [fidKey, rawVal] of Object.entries(bucket)) {
        for (const price of toDayEntryList(rawVal)) {
          const key = `${fidKey}|${price}`;
          const prev = index.get(key);
          if (!prev || dateISO > prev) index.set(key, dateISO);
        }
      }
    }
  }

  return { index, scannedDays, monthCount: months.size };
}

/* ------------------------------------------------------------------ *
 * Core mutation (pure: works on plain objects, no I/O)
 * ------------------------------------------------------------------ */

function applyDayRemoval({ shardMaps, days, targetDate, latestDateIndex }) {
  const stats = {
    dayFishCount: 0,
    removedPriceEntries: 0,
    decrementedBuckets: 0,
    removedBuckets: 0,
    clearedTodayMarkers: 0,
    missingInSummary: 0,
    staleShardCopiesRemoved: 0,
    inconsistent: []
  };

  const dayBucketRaw = days[targetDate];
  if (!dayBucketRaw || typeof dayBucketRaw !== 'object') {
    return { removed: false, shardMaps, days, dirtyShards: new Set(), stats, backup: null };
  }

  const removals = [];
  for (const [fidKey, rawVal] of Object.entries(dayBucketRaw)) {
    const prices = [...new Set(toDayEntryList(rawVal))];
    if (prices.length === 0) continue;
    stats.dayFishCount++;
    for (const price of prices) removals.push({ fidKey, price });
  }

  if (removals.length === 0) {
    return { removed: false, shardMaps, days, dirtyShards: new Set(), stats, backup: null };
  }

  const dirtyShards = new Set();
  const previousSummaryEntries = {};
  const fishWork = new Map();

  const getFishWork = (fidKey) => {
    if (fishWork.has(fidKey)) return fishWork.get(fidKey);

    // Entries are normally stored in the shard derived from the fish id, but a
    // stale copy in another shard would stay visible in the UI, so track every
    // shard that holds this fish and clean the duplicates on write-back.
    const expectedShard = getShardIndex(fidKey);
    const shardIndices = [];
    for (let i = 0; i < SUMMARY_SHARD_COUNT; i++) {
      if (shardMaps[i] && Object.prototype.hasOwnProperty.call(shardMaps[i], fidKey)) {
        shardIndices.push(i);
      }
    }
    shardIndices.sort((a, b) => (a === expectedShard ? -1 : b === expectedShard ? 1 : a - b));

    const sourceShard = shardIndices.length > 0 ? shardIndices[0] : expectedShard;
    const original = shardMaps[sourceShard] ? shardMaps[sourceShard][fidKey] : null;
    const dec = decodeFishSummaryEntry(original);
    const work = {
      shardIdx: expectedShard,
      otherShardIndices: shardIndices.filter((i) => i !== expectedShard),
      original: original || null,
      byPrice: { ...dec.byPrice },
      td: dec.td || '',
      t: Array.isArray(dec.t) ? [...dec.t] : [],
      changed: false
    };
    fishWork.set(fidKey, work);
    return work;
  };

  for (const { fidKey, price } of removals) {
    const work = getFishWork(fidKey);
    const pKey = String(price);
    const info = work.byPrice[pKey];

    if (info) {
      const curCount = Math.max(1, Number.parseInt(info.c, 10) || 1);
      if (curCount > 1) {
        const nextCount = curCount - 1;
        const nextLast = (info.l === targetDate)
          ? (latestDateIndex.get(`${fidKey}|${price}`) || '')
          : info.l;

        if (nextLast) {
          work.byPrice[pKey] = { l: nextLast, c: nextCount };
          stats.decrementedBuckets++;
        } else {
          // Count claimed > 1 but no other archived day holds this price:
          // drop the bucket rather than keeping an unreachable last date.
          delete work.byPrice[pKey];
          stats.removedBuckets++;
          stats.inconsistent.push(`#${fidKey} @ ${price} (count ${curCount}, no other date found)`);
        }
      } else {
        delete work.byPrice[pKey];
        stats.removedBuckets++;
      }
      work.changed = true;
      if (!(fidKey in previousSummaryEntries)) {
        previousSummaryEntries[fidKey] = work.original;
      }
    } else {
      stats.missingInSummary++;
    }

    if (work.td === targetDate && work.t.length > 0) {
      // `td`/`t` mirror the last synced day, so the whole marker set belongs to
      // the deleted date; drop it and let the next sync repopulate today.
      stats.clearedTodayMarkers += work.t.length;
      work.t = [];
      work.td = '';
      work.changed = true;
      if (!(fidKey in previousSummaryEntries)) {
        previousSummaryEntries[fidKey] = work.original;
      }
    }
  }

  for (const [fidKey, work] of fishWork) {
    if (!work.changed) continue;
    const encoded = encodeFishSummaryEntry({ byPrice: work.byPrice, td: work.td, t: work.t });
    if (encoded) shardMaps[work.shardIdx][fidKey] = encoded;
    else delete shardMaps[work.shardIdx][fidKey];
    dirtyShards.add(work.shardIdx);

    for (const staleShard of work.otherShardIndices) {
      if (!shardMaps[staleShard] || !(fidKey in shardMaps[staleShard])) continue;
      delete shardMaps[staleShard][fidKey];
      dirtyShards.add(staleShard);
      stats.staleShardCopiesRemoved++;
    }
  }

  delete days[targetDate];
  stats.removedPriceEntries = removals.length;

  const backup = {
    date: targetDate,
    monthId: targetDate.slice(0, 7),
    removedDayBucket: JSON.parse(JSON.stringify(dayBucketRaw)),
    previousSummaryEntries
  };

  return { removed: true, shardMaps, days, dirtyShards, stats, backup };
}

function snapshotFromDocs(shardSnaps, monthSnap) {
  const shardMaps = shardSnaps.map((snap) =>
    compactShardMap(snap.exists ? snap.data()?.prices : {})
  );
  const monthData = monthSnap.exists ? (monthSnap.data() || {}) : {};
  const days = (monthData.days && typeof monthData.days === 'object') ? { ...monthData.days } : {};
  return { shardMaps, days };
}

async function removeDay(db, targetDate, latestDateIndex, commit) {
  const shardRefs = Array.from({ length: SUMMARY_SHARD_COUNT }, (_, i) =>
    db.collection('fishao_market').doc(getShardDocId(i))
  );
  const monthRef = db.collection('fishao_market_daily').doc(targetDate.slice(0, 7));

  const apply = (shardSnaps, monthSnap) => {
    const { shardMaps, days } = snapshotFromDocs(shardSnaps, monthSnap);
    return applyDayRemoval({ shardMaps, days, targetDate, latestDateIndex });
  };

  if (!commit) {
    const snaps = await db.getAll(...shardRefs, monthRef);
    return apply(snaps.slice(0, SUMMARY_SHARD_COUNT), snaps[SUMMARY_SHARD_COUNT]);
  }

  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all([
      ...shardRefs.map((ref) => tx.get(ref)),
      tx.get(monthRef)
    ]);
    const shardSnaps = snaps.slice(0, SUMMARY_SHARD_COUNT);
    const monthSnap = snaps[SUMMARY_SHARD_COUNT];

    const result = apply(shardSnaps, monthSnap);
    if (!result.removed) return result;

    const nowIso = new Date().toISOString();
    result.lastUpdated = nowIso;

    for (const shardIdx of result.dirtyShards) {
      tx.set(shardRefs[shardIdx], {
        prices: result.shardMaps[shardIdx],
        lastUpdated: nowIso
      });
    }
    tx.set(monthRef, { days: result.days, lastUpdated: nowIso });

    return result;
  });
}

async function resetSyncStatusIfNeeded(db, targetDate) {
  const ref = db.collection('fishao_market').doc('sync_status');
  const snap = await ref.get();
  if (!snap.exists) return { reset: false, reason: 'missing' };

  const lastSuccessDate = snap.data()?.lastSuccessDate;
  if (lastSuccessDate !== targetDate) {
    return { reset: false, reason: `lastSuccessDate=${lastSuccessDate || '(empty)'}` };
  }

  await ref.delete();
  return { reset: true, reason: 'deleted' };
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function writeStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    fs.appendFileSync(summaryPath, lines.join('\n') + '\n', 'utf8');
  } catch (err) {
    console.warn('Failed to write GITHUB_STEP_SUMMARY:', err.message);
  }
}

function sampleRemovedEntries(dayBucket, limit = 15) {
  const out = [];
  for (const [fidKey, rawVal] of Object.entries(dayBucket || {})) {
    const prices = toDayEntryList(rawVal);
    if (prices.length === 0) continue;
    out.push(`#${fidKey}: ${prices.join(', ')}`);
    if (out.length >= limit) break;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const targetDate = args.date || getTodayISO();
  if (!isValidISODate(targetDate)) {
    throw new Error(`Invalid --date value "${targetDate}". Expected YYYY-MM-DD.`);
  }

  const willWrite = args.yes && !args.dryRun;

  const db = await initFirestore();
  const months = await loadMonthlyArchives(db);
  const monthId = targetDate.slice(0, 7);
  const monthData = months.get(monthId);
  const dayBucket = monthData && monthData.days ? monthData.days[targetDate] : null;

  if (!dayBucket || typeof dayBucket !== 'object' || Object.keys(dayBucket).length === 0) {
    console.log(`[${targetDate}] No recorded prices found in fishao_market_daily/${monthId}. Nothing to delete.`);
    writeStepSummary([
      `## Fish Market Day Delete (${targetDate})`,
      '',
      'ℹ️ **Nothing to delete:** no price entries are archived for this date.'
    ]);
    return;
  }

  const { index: latestDateIndex, scannedDays, monthCount } = buildLatestDateIndex(months, targetDate);
  console.log(
    `[${targetDate}] Indexed ${monthCount} monthly archive(s) / ${scannedDays} day bucket(s) ` +
    `for last-date fallback lookups.`
  );

  const result = await removeDay(db, targetDate, latestDateIndex, willWrite);
  if (!result.removed) {
    console.log(`[${targetDate}] Nothing to delete after re-reading Firestore.`);
    return;
  }

  const { stats, shardMaps } = result;
  const metrics = measureShardedSummaries(shardMaps, result.lastUpdated || new Date().toISOString());

  console.log(
    `[${targetDate}] Day bucket: ${stats.dayFishCount} fish, ${stats.removedPriceEntries} price entries.`
  );
  console.log(
    `Summary: ${stats.removedBuckets} price bucket(s) removed, ` +
    `${stats.decrementedBuckets} decremented, ` +
    `${stats.clearedTodayMarkers} "today" marker(s) cleared, ` +
    `${stats.missingInSummary} price(s) not present in summary, ` +
    `${stats.staleShardCopiesRemoved} stale cross-shard cop(ies) cleaned.`
  );

  let backupPath = '';
  if (args.backupOut) {
    backupPath = args.backupOut;
    const payload = {
      app: 'FISHAO Tracker',
      kind: 'fishao_market_day_delete',
      generatedAt: new Date().toISOString(),
      dryRun: !willWrite,
      ...result.backup,
      stats: {
        dayFishCount: stats.dayFishCount,
        removedPriceEntries: stats.removedPriceEntries,
        removedBuckets: stats.removedBuckets,
        decrementedBuckets: stats.decrementedBuckets,
        clearedTodayMarkers: stats.clearedTodayMarkers,
        staleShardCopiesRemoved: stats.staleShardCopiesRemoved
      }
    };
    try {
      fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`Backup written to ${backupPath}`);
    } catch (err) {
      backupPath = '';
      console.warn(`Failed to write backup to ${backupPath || args.backupOut}:`, err.message);
    }
  }

  let syncStatusNote = 'not checked (dry run / no write)';
  if (willWrite && !args.keepSyncStatus) {
    const syncResult = await resetSyncStatusIfNeeded(db, targetDate);
    syncStatusNote = syncResult.reset
      ? 'deleted (today will be re-fetched by the next sync run)'
      : `kept (${syncResult.reason})`;
  } else if (willWrite && args.keepSyncStatus) {
    syncStatusNote = 'kept (--keep-sync-status)';
  }

  const maxFsKb = (metrics.maxShardBytes / 1024).toFixed(1);
  const totalFsKb = (metrics.firestoreBytes / 1024).toFixed(1);

  const summaryLines = [
    `## Fish Market Day Delete (${targetDate})`,
    '',
    willWrite ? '🗑️ **Deleted** prices for this date.' : '👀 **Preview only** — no Firestore writes were made.',
    '',
    '| Metric | Value |',
    '| :--- | ---: |',
    `| Fish with prices on this date | ${stats.dayFishCount} |`,
    `| Price entries removed | ${stats.removedPriceEntries} |`,
    `| Summary buckets removed | ${stats.removedBuckets} |`,
    `| Summary buckets decremented | ${stats.decrementedBuckets} |`,
    `| "Today" markers cleared | ${stats.clearedTodayMarkers} |`,
    `| Prices missing from summary | ${stats.missingInSummary} |`,
    `| Stale cross-shard copies cleaned | ${stats.staleShardCopiesRemoved} |`,
    `| Max \`prices_summary_*\` shard (est.) | ${maxFsKb} KB / 1,024 KB (${metrics.limitPct}%) |`,
    `| Total summary across ${SUMMARY_SHARD_COUNT} shards | ${totalFsKb} KB |`,
    `| \`sync_status\` | ${syncStatusNote} |`
  ];

  const sample = sampleRemovedEntries(result.backup?.removedDayBucket);
  if (sample.length > 0) {
    summaryLines.push('', `**Sample removed prices:** ${sample.join(' · ')}${stats.dayFishCount > sample.length ? ', …' : ''}`);
  }

  if (stats.inconsistent.length > 0) {
    summaryLines.push(
      '',
      '> [!WARNING]',
      `> ${stats.inconsistent.length} summary bucket(s) claimed a count > 1 but had no other archived date and were dropped: ${stats.inconsistent.slice(0, 5).join(', ')}${stats.inconsistent.length > 5 ? ', …' : ''}`
    );
  }

  if (metrics.isNearLimit) {
    summaryLines.push(
      '',
      '> [!WARNING]',
      `> Largest \`fishao_market/prices_summary_*\` shard is now **${maxFsKb} KB (${metrics.limitPct}%)** of Firestore's 1 MiB document limit.`
    );
  }

  if (!willWrite) {
    summaryLines.push(
      '',
      '_Re-run with `--yes` (and `dry_run: false` in the workflow) to apply this deletion._'
    );
    console.log('Preview mode: no Firestore writes were made. Re-run with --yes to apply.');
  }

  writeStepSummary(summaryLines);
}

main().catch((err) => {
  console.error('Delete failed:', err);
  process.exit(1);
});
