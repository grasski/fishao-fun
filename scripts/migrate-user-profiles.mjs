/**
 * FISHAO - One-time Admin Migration for User Profiles
 * ---------------------------------------------------
 * Moves any remaining legacy private fields (`friendUids`, `reminders`, `lastLogin`)
 * from public `/users/{uid}` documents into `/users/{uid}/private/settings`,
 * deletes those fields from `/users/{uid}` inside a per-user Firestore transaction,
 * and optionally cleans up legacy `/fishao_market/prices_summary` + `prices_history`.
 *
 * Usage:
 *   node scripts/migrate-user-profiles.mjs [--dry-run] [--delete-legacy-market]
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT  JSON string of a Firebase service account key.
 */

import fs from 'node:fs';

function parseArgs(argv) {
  const args = { dryRun: false, deleteLegacyMarket: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--delete-legacy-market') args.deleteLegacyMarket = true;
  }
  return args;
}

async function initFirestore() {
  const rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawCreds) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  }
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const serviceAccount = JSON.parse(rawCreds);
  initializeApp({ credential: cert(serviceAccount) });
  return { db: getFirestore(), FieldValue };
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

async function migrateUsers(db, FieldValue, dryRun) {
  const usersSnap = await db.collection('users').get();
  let totalUsers = 0;
  let alreadyClean = 0;
  let needsMigration = 0;
  let migrated = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    totalUsers++;
    const data = userDoc.data() || {};
    const hasFriendUids = data.friendUids !== undefined;
    const hasReminders = data.reminders !== undefined;
    const hasLastLogin = data.lastLogin !== undefined;

    if (!hasFriendUids && !hasReminders && !hasLastLogin) {
      alreadyClean++;
      continue;
    }

    needsMigration++;
    if (dryRun) {
      continue;
    }

    try {
      const userRef = userDoc.ref;
      const privRef = userRef.collection('private').doc('settings');

      await db.runTransaction(async (tx) => {
        const [freshUserSnap, privSnap] = await Promise.all([tx.get(userRef), tx.get(privRef)]);
        if (!freshUserSnap.exists) return;

        const curUserData = freshUserSnap.data() || {};
        const curPrivData = privSnap.exists ? (privSnap.data() || {}) : {};
        const nowIso = new Date().toISOString();

        const privUpdate = { updatedAt: nowIso };
        const userCleanup = {};

        if (curUserData.friendUids !== undefined) {
          userCleanup.friendUids = FieldValue.delete();
          if (Array.isArray(curUserData.friendUids)) {
            const existingFriends = Array.isArray(curPrivData.friendUids) ? curPrivData.friendUids : [];
            privUpdate.friendUids = existingFriends.length > 0
              ? Array.from(new Set([...existingFriends, ...curUserData.friendUids]))
              : curUserData.friendUids;
          }
        }

        if (curUserData.reminders !== undefined) {
          userCleanup.reminders = FieldValue.delete();
          if (Array.isArray(curUserData.reminders)) {
            const existingReminders = Array.isArray(curPrivData.reminders) ? curPrivData.reminders : [];
            privUpdate.reminders = existingReminders.length > 0
              ? existingReminders
              : curUserData.reminders;
          }
        }

        if (curUserData.lastLogin !== undefined) {
          userCleanup.lastLogin = FieldValue.delete();
          const legacyLogin = typeof curUserData.lastLogin === 'string' ? curUserData.lastLogin : '';
          const privLogin = typeof curPrivData.lastLogin === 'string' ? curPrivData.lastLogin : '';
          if (legacyLogin || privLogin) {
            privUpdate.lastLogin = privLogin > legacyLogin ? privLogin : (legacyLogin || nowIso);
          }
        }

        tx.set(privRef, privUpdate, { merge: true });
        if (Object.keys(userCleanup).length > 0) {
          tx.update(userRef, userCleanup);
        }
      });

      migrated++;
    } catch (err) {
      errors++;
      console.error(`Failed migrating one user document: ${err.message}`);
    }
  }

  return { totalUsers, alreadyClean, needsMigration, migrated, errors };
}

async function cleanupLegacyMarketDocs(db, dryRun) {
  const legacyIds = ['prices_summary', 'prices_history'];
  const deleted = [];
  const missing = [];

  for (const docId of legacyIds) {
    const ref = db.collection('fishao_market').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      missing.push(docId);
      continue;
    }
    if (!dryRun) {
      await ref.delete();
    }
    deleted.push(docId);
  }

  return { deleted, missing };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db, FieldValue } = await initFirestore();

  console.log(`Starting user profile migration check (dryRun=${args.dryRun})...`);
  const userStats = await migrateUsers(db, FieldValue, args.dryRun);

  console.log(
    `Users scanned: ${userStats.totalUsers}, already clean: ${userStats.alreadyClean}, ` +
    `needing migration: ${userStats.needsMigration}, migrated: ${userStats.migrated}, errors: ${userStats.errors}`
  );

  let marketStats = null;
  if (args.deleteLegacyMarket) {
    marketStats = await cleanupLegacyMarketDocs(db, args.dryRun);
    console.log(
      `Legacy market docs (${args.dryRun ? 'would delete' : 'deleted'}): ` +
      `${marketStats.deleted.join(', ') || 'none'} (not present: ${marketStats.missing.join(', ') || 'none'})`
    );
  }

  const summaryLines = [
    `## User Profile Migration${args.dryRun ? ' (Dry Run)' : ''}`,
    '',
    '| Metric | Count |',
    '| :--- | ---: |',
    `| Total \`/users\` documents | ${userStats.totalUsers} |`,
    `| Already clean | ${userStats.alreadyClean} |`,
    `| Found with legacy fields | ${userStats.needsMigration} |`,
    `| **Migrated now** | **${userStats.migrated}** |`,
    `| Errors | ${userStats.errors} |`
  ];

  if (marketStats) {
    summaryLines.push(
      '',
      `**Legacy market docs ${args.dryRun ? 'to delete' : 'deleted'}:** ${marketStats.deleted.join(', ') || '_none_'}`
    );
  }

  writeStepSummary(summaryLines);

  if (userStats.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
