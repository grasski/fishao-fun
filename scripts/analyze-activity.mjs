/**
 * FISHAO - Local User Activity Analyzer (scripts/analyze-activity.mjs)
 * --------------------------------------------------------------------
 * Analyzes registered user activity (`lastLogin` from `users_private`)
 * directly from an admin Firestore backup JSON (v2.2+), offline and
 * with zero external dependencies.
 *
 * Usage:
 *   node scripts/analyze-activity.mjs [path/to/fishao_firestore_backup_YYYY-MM-DD.json]
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  let file = '';
  for (const arg of argv) {
    if (!arg.startsWith('--') && !file) {
      file = arg;
    }
  }
  return { file };
}

function findLatestBackupFile() {
  const backupDir = path.resolve(process.cwd(), 'backup');
  let best = null;
  try {
    if (!fs.existsSync(backupDir)) return null;
    const entries = fs.readdirSync(backupDir);
    for (const name of entries) {
      if (!/^fishao_firestore_backup_.*\.json$/i.test(name)) continue;
      const full = path.join(backupDir, name);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = { full, mtimeMs: stat.mtimeMs };
      }
    }
  } catch {
    return null;
  }
  return best ? best.full : null;
}

function parseIsoMs(val) {
  if (!val) return 0;
  if (typeof val === 'string') {
    const ms = Date.parse(val);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  return 0;
}

function formatDateShort(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatAgo(ms, refMs) {
  if (!ms) return 'bez záznamu';
  const diffSec = Math.max(0, Math.floor((refMs - ms) / 1000));
  if (diffSec < 60) return 'právě teď';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `před ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `před ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'před 1 dnem';
  return `před ${diffDays} dny`;
}

function formatDuration(ms, refMs) {
  if (!ms) return '—';
  const diffDays = Math.max(0, Math.floor((refMs - ms) / (24 * 60 * 60 * 1000)));
  if (diffDays === 0) return '< 1 den';
  if (diffDays === 1) return '1 den';
  if (diffDays < 30) return `${diffDays} ${diffDays <= 4 ? 'dny' : 'dní'}`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} měs.`;
  const years = Math.floor(diffDays / 365);
  const remMonths = Math.floor((diffDays % 365) / 30);
  const yLabel = years === 1 ? '1 rok' : (years <= 4 ? `${years} roky` : `${years} let`);
  return remMonths > 0 ? `${yLabel} ${remMonths} měs.` : yLabel;
}

function makeBar(count, total, width = 24) {
  if (!total) return ' '.repeat(width);
  const filled = Math.round((count / total) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function pct(count, total) {
  if (!total) return '0.0%';
  return ((count / total) * 100).toFixed(1) + '%';
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const filePath = opts.file ? path.resolve(opts.file) : findLatestBackupFile();

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Nenalezen soubor se zálohou ve složce backup/ (fishao_firestore_backup_*.json).');
    console.error('Ulož zálohu z webu do složky backup/ a spusť:');
    console.error('  node scripts/analyze-activity.mjs');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const users = (raw && raw.collections && Array.isArray(raw.collections.users)) ? raw.collections.users : [];
  const usersPrivate = (raw && raw.collections && raw.collections.users_private && typeof raw.collections.users_private === 'object')
    ? raw.collections.users_private
    : null;

  if (!usersPrivate) {
    console.error('Tato záloha neobsahuje `collections.users_private` (je ze starší verze před v2.2).');
    console.error('Stáhni prosím novou zálohu z webu a spusť skript znovu.');
    process.exit(1);
  }

  const refMs = parseIsoMs(raw.exportedAt) || Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const SIGNUP_SESSION_MS = 15 * 60 * 1000;

  const rows = users.map((u) => {
    const priv = usersPrivate[u.id] || {};
    const createdMs = parseIsoMs(u.createdAt);
    const lastLoginMs = parseIsoMs(priv.lastLogin) || parseIsoMs(priv.updatedAt);
    const ageAfterSignupMs = (createdMs && lastLoginMs) ? (lastLoginMs - createdMs) : 0;
    const neverReturned = !lastLoginMs || (createdMs > 0 && ageAfterSignupMs < SIGNUP_SESSION_MS);
    return {
      uid: u.id,
      nick: u.displayName || '(bez nicku)',
      club: u.clubName || '',
      caught: Array.isArray(u.caughtFishIds) ? u.caughtFishIds.length : 0,
      friends: Array.isArray(priv.friendUids) ? priv.friendUids.length : 0,
      reminders: Array.isArray(priv.reminders) ? priv.reminders.length : 0,
      createdMs,
      lastLoginMs,
      returned: ageAfterSignupMs >= DAY,
      neverReturned
    };
  });

  const total = rows.length;
  const withLogin = rows.filter((r) => r.lastLoginMs > 0);
  const withoutLogin = total - withLogin.length;

  const activeWithin = (days) => withLogin.filter((r) => (refMs - r.lastLoginMs) <= days * DAY).length;
  const registeredWithin = (days) => rows.filter((r) => r.createdMs > 0 && (refMs - r.createdMs) <= days * DAY).length;
  const returningUsers = withLogin.filter((r) => r.returned).length;
  const neverReturnedUsers = rows.filter((r) => r.neverReturned).length;
  const neverReturnedWithLogin = withLogin.filter((r) => r.neverReturned).length;

  const d1 = activeWithin(1);
  const d7 = activeWithin(7);
  const d14 = activeWithin(14);
  const d30 = activeWithin(30);
  const d90 = activeWithin(90);
  const older90 = withLogin.length - d90;

  console.log('');
  console.log('=== FISHAO - Aktivita registrovaných uživatelů ===');
  console.log(`Záloha:              ${path.basename(filePath)} (${formatDateShort(refMs)})`);
  console.log(`Celkem účtů:         ${total} (s lastLogin: ${withLogin.length}, bez záznamu: ${withoutLogin})`);
  console.log(`Vracející se:        ${returningUsers} (${pct(returningUsers, total)}) - přihlásili se znovu >24 h po registraci`);
  console.log(`Nezaplo od reg.:     ${neverReturnedUsers} (${pct(neverReturnedUsers, total)}) - jen registrace (${neverReturnedWithLogin}) + bez lastLogin (${withoutLogin})`);
  console.log(`Nové registrace:     za 7 dní: ${registeredWithin(7)} | za 30 dní: ${registeredWithin(30)}`);
  console.log('');
  console.log('Aktivní podle posledního přihlášení (kumulativně):');
  const buckets = [
    ['Posledních 24 h (DAU)', d1],
    ['Posledních 7 dní (WAU)', d7],
    ['Posledních 14 dní', d14],
    ['Posledních 30 dní (MAU)', d30],
    ['Posledních 90 dní', d90],
    ['Neaktivní > 90 dní', older90],
    ['Bez záznamu lastLogin', withoutLogin]
  ];
  for (const [label, count] of buckets) {
    const padLabel = label.padEnd(25, ' ');
    const padCount = String(count).padStart(4, ' ');
    const padPct = pct(count, total).padStart(6, ' ');
    console.log(`  ${padLabel} ${padCount}  (${padPct})  ${makeBar(count, total)}`);
  }

  // Sort most recently active first
  rows.sort((a, b) => (b.lastLoginMs - a.lastLoginMs) || (b.caught - a.caught));

  console.log('');
  console.log(`Všichni uživatelé (${rows.length}):`);
  console.table(
    rows.map((r) => ({
      Nick: r.nick,
      Klub: r.club || '—',
      Ryby: r.caught,
      'Poslední login': formatDateShort(r.lastLoginMs),
      Kdy: formatAgo(r.lastLoginMs, refMs),
      Registrace: r.createdMs ? formatDateShort(r.createdMs).slice(0, 10) : '—',
      'Registrován': formatDuration(r.createdMs, refMs)
    }))
  );
}

main();
