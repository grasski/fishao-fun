/**
 * FISHAO - Daily Chat Cleanup Script (scripts/cleanup-chat.mjs)
 * ----------------------------------------------------------------------
 * Runs daily via GitHub Actions on the free Spark plan using standard
 * Admin SDK delete() calls (covered by the 20,000 free deletes/day quota).
 *
 * Behavior:
 *   - Keeps `accepted` chat threads active permanently so approved players
 *     do not need to re-request, while deleting messages older than 14 days.
 *   - Clears `lastMessagePreview` / `lastSenderUid` on `accepted` chats once
 *     their last message has expired (>14 days) and no newer messages remain.
 *   - Deletes expired `pending` requests (`expiresAt <= now`, 14 days).
 *   - NEVER deletes `blocked` or `rejected` threads so blocked spammers
 *     cannot send new requests after 14 days.
 *   - Cleans up orphaned `accepted` chats when a participant account no
 *     longer exists in `/users` (and no `open` report references the chat).
 *   - Deletes expired `resolved`/`dismissed` `/chat_reports` and expired
 *     temporary bans in `/chat_bans`.
 *
 * Usage:
 *   node scripts/cleanup-chat.mjs [--dry-run]
 */

import fs from 'node:fs';

const MESSAGE_RETENTION_DAYS = 14;
const BATCH_LIMIT = 400;

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run')
  };
}

async function initFirestore() {
  const rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawCreds) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

  const serviceAccount = JSON.parse(rawCreds);
  initializeApp({ credential: cert(serviceAccount) });

  return { db: getFirestore(), Timestamp };
}

async function deleteDocRefsInBatches(db, docRefs, dryRun) {
  if (!docRefs.length || dryRun) return docRefs.length;
  let deleted = 0;
  for (let i = 0; i < docRefs.length; i += BATCH_LIMIT) {
    const chunk = docRefs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
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
  const { db, Timestamp } = await initFirestore();

  const nowMs = Date.now();
  const nowTs = Timestamp.fromMillis(nowMs);
  const cutoff14Ms = nowMs - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoff14Ts = Timestamp.fromMillis(cutoff14Ms);

  let expiredMessagesCount = 0;
  let expiredPendingCount = 0;
  let clearedPreviewsCount = 0;
  let orphanedChatsCount = 0;
  let expiredReportsCount = 0;
  let expiredBansCount = 0;

  // Track which chats are referenced by still-open moderation reports
  const openReportChatIds = new Set();
  const openReportsSnap = await db
    .collection('chat_reports')
    .where('status', '==', 'open')
    .select('chatId')
    .get();
  openReportsSnap.forEach((docSnap) => {
    const cid = docSnap.get('chatId');
    if (typeof cid === 'string' && cid) openReportChatIds.add(cid);
  });

  // Cache /users existence checks for orphaned account cleanup
  const userExistsCache = new Map();
  async function doesUserExist(uid) {
    if (!uid) return false;
    if (userExistsCache.has(uid)) return userExistsCache.get(uid);
    const snap = await db.collection('users').doc(uid).get();
    const exists = snap.exists;
    userExistsCache.set(uid, exists);
    return exists;
  }

  // List ALL /chats doc refs (including virtual parentless refs that still hold /messages)
  const allChatRefs = await db.collection('chats').listDocuments();

  for (let idx = 0; idx < allChatRefs.length; idx += 100) {
    const refChunk = allChatRefs.slice(idx, idx + 100);
    const chatSnaps = await db.getAll(...refChunk);

    for (const chatDoc of chatSnaps) {
      // Parent doc already gone (only orphan subcollection remains)
      if (!chatDoc.exists) {
        if (!openReportChatIds.has(chatDoc.id)) {
          while (true) {
            const allMsgs = await chatDoc.ref.collection('messages').limit(BATCH_LIMIT).get();
            if (allMsgs.empty) break;
            expiredMessagesCount += await deleteDocRefsInBatches(
              db,
              allMsgs.docs.map((d) => d.ref),
              args.dryRun
            );
            if (args.dryRun) break;
          }
          orphanedChatsCount++;
        }
        continue;
      }

      const data = chatDoc.data() || {};
      const status = data.status;
      const parts = Array.isArray(data.participants) ? data.participants : [];

      // Verify both participant profiles actually exist in /users (do not trust client-writable participantInfo.deleted alone)
      let hasDeletedParticipant = false;
      if (parts.length !== 2) {
        hasDeletedParticipant = true;
      } else {
        const [e0, e1] = await Promise.all([doesUserExist(parts[0]), doesUserExist(parts[1])]);
        if (!e0 || !e1) {
          hasDeletedParticipant = true;
        }
      }

      if (hasDeletedParticipant) {
        if (!openReportChatIds.has(chatDoc.id)) {
          while (true) {
            const allMsgs = await chatDoc.ref.collection('messages').limit(BATCH_LIMIT).get();
            if (allMsgs.empty) break;
            expiredMessagesCount += await deleteDocRefsInBatches(
              db,
              allMsgs.docs.map((d) => d.ref),
              args.dryRun
            );
            if (args.dryRun) break;
          }
          if (!args.dryRun) {
            await chatDoc.ref.delete();
          }
          orphanedChatsCount++;
        }
        continue;
      }

      // Never delete active rejected records between existing accounts (protects anti-spam state)
      if (status === 'rejected') {
        continue;
      }

      // Expired unanswered pending request (>14 days)
      if (status === 'pending') {
        const expMs = data.expiresAt && typeof data.expiresAt.toMillis === 'function'
          ? data.expiresAt.toMillis()
          : (data.createdAt && typeof data.createdAt.toMillis === 'function'
            ? data.createdAt.toMillis() + MESSAGE_RETENTION_DAYS * 86400 * 1000
            : 0);
        if (expMs > 0 && expMs <= nowMs) {
          if (!args.dryRun) {
            await chatDoc.ref.delete();
          }
          expiredPendingCount++;
        }
        continue;
      }

      // For accepted or blocked chats: keep the parent thread doc active (so approval or block state persists),
      // while deleting expired messages (>14 days) and clearing stale previews.
      if (status === 'accepted' || status === 'blocked') {
        const lastMsgMs = data.lastMessageAt && typeof data.lastMessageAt.toMillis === 'function'
          ? data.lastMessageAt.toMillis()
          : 0;
        const hasPreviewOrSender = Boolean(data.lastMessagePreview || data.lastSenderUid);

        // Skip querying /messages on dormant threads that never had messages or whose >14d messages were already purged
        if (!lastMsgMs && !hasPreviewOrSender) {
          continue;
        }
        if (lastMsgMs > 0 && lastMsgMs <= cutoff14Ms && !hasPreviewOrSender) {
          continue;
        }

        while (true) {
          const expMsgs = await chatDoc.ref
            .collection('messages')
            .where('expiresAt', '<=', nowTs)
            .limit(BATCH_LIMIT)
            .get();
          if (expMsgs.empty) break;
          expiredMessagesCount += await deleteDocRefsInBatches(
            db,
            expMsgs.docs.map((d) => d.ref),
            args.dryRun
          );
          if (args.dryRun) break;
        }

        // Clear stale preview if the last message is older than 14 days and no active messages remain
        if (lastMsgMs > 0 && lastMsgMs <= cutoff14Ms && hasPreviewOrSender) {
          const remainingSnap = await chatDoc.ref
            .collection('messages')
            .limit(1)
            .get();
          if (remainingSnap.empty) {
            if (!args.dryRun) {
              await chatDoc.ref.update({
                lastMessagePreview: '',
                lastSenderUid: null
              });
            }
            clearedPreviewsCount++;
          }
        }
      }
    }
  }

  // Delete expired resolved/dismissed reports (>90 days)
  let lastReportDoc = null;
  while (true) {
    let rq = db
      .collection('chat_reports')
      .where('expiresAt', '<=', nowTs)
      .orderBy('expiresAt')
      .limit(BATCH_LIMIT);
    if (lastReportDoc) rq = rq.startAfter(lastReportDoc);
    const expReportsSnap = await rq.get();
    if (expReportsSnap.empty) break;
    lastReportDoc = expReportsSnap.docs[expReportsSnap.docs.length - 1];
    const deletableRefs = expReportsSnap.docs
      .filter((d) => d.get('status') !== 'open')
      .map((d) => d.ref);
    if (deletableRefs.length > 0) {
      expiredReportsCount += await deleteDocRefsInBatches(db, deletableRefs, args.dryRun);
    }
    if (expReportsSnap.size < BATCH_LIMIT) break;
  }

  // Delete expired temporary bans
  while (true) {
    const expBansSnap = await db
      .collection('chat_bans')
      .where('bannedUntil', '<=', nowTs)
      .limit(BATCH_LIMIT)
      .get();
    if (expBansSnap.empty) break;
    const banRefs = expBansSnap.docs
      .filter((d) => d.get('bannedUntil') != null)
      .map((d) => d.ref);
    if (!banRefs.length) break;
    expiredBansCount += await deleteDocRefsInBatches(db, banRefs, args.dryRun);
    if (args.dryRun || expBansSnap.size < BATCH_LIMIT) break;
  }

  const summary = {
    dryRun: args.dryRun,
    expiredMessagesCount,
    expiredPendingCount,
    clearedPreviewsCount,
    orphanedChatsCount,
    expiredReportsCount,
    expiredBansCount
  };
  console.log('Chat cleanup summary:', summary);

  writeStepSummary([
    `## Chat Cleanup (${new Date().toISOString().slice(0, 10)})${args.dryRun ? ' — Dry Run' : ''}`,
    '',
    '| Metric | Count |',
    '| :--- | ---: |',
    `| Expired messages deleted (>14d) | ${expiredMessagesCount} |`,
    `| Expired pending requests deleted (>14d) | ${expiredPendingCount} |`,
    `| Stale previews cleared | ${clearedPreviewsCount} |`,
    `| Orphaned chats deleted | ${orphanedChatsCount} |`,
    `| Expired closed reports deleted | ${expiredReportsCount} |`,
    `| Expired temporary bans cleared | ${expiredBansCount} |`
  ]);
}

main().catch((err) => {
  console.error('Chat cleanup failed:', err);
  process.exit(1);
});
