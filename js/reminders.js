/**
 * FISHAO - Game Reminders & Cooldown Tracker (js/reminders.js)
 * -------------------------------------------------------------
 * Manages recurring and one-time in-game reminders with exact
 * date & time cooldowns (e.g. Bob FC every 7 days, Desert furniture
 * every 2 days), synced to Firestore /users/{uid}.reminders with
 * localStorage fallback.
 */

var REMINDERS_STORAGE_KEY = 'fishao_reminders_v1';
var REMINDERS_SESSION_DISMISS_KEY = 'fishao_reminders_due_dismissed';
var REMINDERS_TODAY_NOTIFIED_KEY = 'fishao_reminders_today_notified_date';

var userReminders = [];
var editingReminderId = null;
var remindersStartupChecked = false;

function loadLocalReminders() {
  try {
    var raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizeRemindersList(parsed) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalReminders(list) {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) { }
}

function sanitizeRemindersList(list) {
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length && out.length < 100; i++) {
    var item = list[i];
    if (!item || typeof item !== 'object') continue;
    var rawId = String(item.id || ('rem_' + Date.now() + '_' + i));
    var id = (typeof sanitizeDomId === 'function')
      ? sanitizeDomId(rawId)
      : rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
    var title = String(item.title || '').trim().slice(0, 80);
    if (!title) continue;
    var intervalDays = parseInt(item.intervalDays, 10);
    if (isNaN(intervalDays) || intervalDays < 0) intervalDays = 0;
    if (intervalDays > 365) intervalDays = 365;
    var nextMs = Date.parse(item.nextAt);
    if (isNaN(nextMs)) continue;
    out.push({
      id: id,
      title: title,
      intervalDays: intervalDays,
      nextAt: new Date(nextMs).toISOString(),
      completed: !!item.completed,
      createdAt: item.createdAt || new Date().toISOString()
    });
  }
  return out;
}

async function persistReminders() {
  userReminders = sanitizeRemindersList(userReminders);
  saveLocalReminders(userReminders);
  updateRemindersBellBadge();

  if (typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db) {
    try {
      if (typeof savePrivateUserSettings === 'function') {
        await savePrivateUserSettings({ reminders: userReminders });
      }
    } catch (err) {
      console.warn("Could not sync reminders to Firestore:", err);
      if (typeof showToast === 'function') {
        showToast(t('reminders_sync_warn'), 'warning');
      }
    }
  }
}

function syncRemindersFromProfile(profile) {
  if (profile && Array.isArray(profile.reminders)) {
    userReminders = sanitizeRemindersList(profile.reminders);
    saveLocalReminders(userReminders);
  } else {
    var local = loadLocalReminders();
    userReminders = local;
    if (local.length > 0 && typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db) {
      // Migrate guest local reminders to user's Firestore profile on first sync
      persistReminders();
    }
  }
  updateRemindersBellBadge();
  var modal = document.getElementById('remindersModalOverlay');
  if (modal && modal.classList.contains('active')) {
    renderRemindersModal();
  }
  var alertModal = document.getElementById('remindersAlertModalOverlay');
  if (alertModal && alertModal.classList.contains('active')) {
    renderRemindersAlertModal();
  }
  checkRemindersOnStartup(true);
}

function getReminderDayKey(dateInput) {
  var d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  var useUtc = (typeof userTimezone !== 'undefined' && userTimezone === 'utc');
  var y = useUtc ? d.getUTCFullYear() : d.getFullYear();
  var m = String((useUtc ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, '0');
  var day = String(useUtc ? d.getUTCDate() : d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getDueReminders() {
  var nowMs = Date.now();
  return userReminders.filter(function (r) {
    if (r.completed) return false;
    var tMs = Date.parse(r.nextAt);
    return !isNaN(tMs) && tMs <= nowMs;
  }).sort(function (a, b) {
    return Date.parse(a.nextAt) - Date.parse(b.nextAt);
  });
}

function getTodayUpcomingReminders() {
  var now = new Date();
  var nowMs = now.getTime();
  var todayKey = getReminderDayKey(now);
  return userReminders.filter(function (r) {
    if (r.completed) return false;
    var tMs = Date.parse(r.nextAt);
    if (isNaN(tMs) || tMs <= nowMs) return false;
    return getReminderDayKey(tMs) === todayKey;
  }).sort(function (a, b) {
    return Date.parse(a.nextAt) - Date.parse(b.nextAt);
  });
}

function updateRemindersBellBadge() {
  var badge = document.getElementById('remindersBadge');
  var btn = document.getElementById('remindersBellBtn');
  var dueCount = getDueReminders().length;
  var todayCount = getTodayUpcomingReminders().length;

  if (badge) {
    if (dueCount > 0) {
      badge.textContent = dueCount > 99 ? '99+' : String(dueCount);
      badge.classList.remove('is-today-only');
      badge.style.display = 'inline-flex';
    } else if (todayCount > 0) {
      badge.textContent = todayCount > 99 ? '99+' : String(todayCount);
      badge.classList.add('is-today-only');
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if (btn) {
    btn.classList.toggle('has-due', dueCount > 0);
    btn.classList.toggle('has-today', dueCount === 0 && todayCount > 0);
  }
}

function isReminderUtcMode() {
  return (typeof userTimezone !== 'undefined' && userTimezone === 'utc');
}

function toLocalDatetimeInputValue(dateObj) {
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) d = new Date();
  var useUtc = isReminderUtcMode();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return (useUtc ? d.getUTCFullYear() : d.getFullYear()) + '-' +
    pad((useUtc ? d.getUTCMonth() : d.getMonth()) + 1) + '-' +
    pad(useUtc ? d.getUTCDate() : d.getDate()) + 'T' +
    pad(useUtc ? d.getUTCHours() : d.getHours()) + ':' +
    pad(useUtc ? d.getUTCMinutes() : d.getMinutes());
}

function formatReminderDateTime(isoString) {
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  var useUtc = (typeof userTimezone !== 'undefined' && userTimezone === 'utc');
  var lang = (typeof getLang === 'function') ? getLang() : 'cs';
  var locale = lang === 'en' ? 'en-GB' : (lang === 'pl' ? 'pl-PL' : 'cs-CZ');
  try {
    var formatted = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: useUtc ? 'UTC' : undefined
    }).format(d);
    return useUtc ? (formatted + ' UTC') : formatted;
  } catch (e) {
    return d.toLocaleString();
  }
}

function formatReminderCountdown(isoString) {
  var targetMs = Date.parse(isoString);
  if (isNaN(targetMs)) return '';
  var diffMs = targetMs - Date.now();
  var absMin = Math.floor(Math.abs(diffMs) / 60000);
  var days = Math.floor(absMin / 1440);
  var hours = Math.floor((absMin % 1440) / 60);
  var mins = absMin % 60;

  var parts = [];
  if (days > 0) parts.push(days + t('reminders_unit_d'));
  if (hours > 0) parts.push(hours + t('reminders_unit_h'));
  if (days === 0 && mins > 0) parts.push(mins + t('reminders_unit_m'));
  if (parts.length === 0) parts.push('< 1' + t('reminders_unit_m'));
  var spanText = parts.join(' ');

  if (diffMs <= 0) {
    if (absMin < 1) return t('reminders_due_now');
    return t('reminders_overdue_by', { time: spanText });
  }
  return t('reminders_in_time', { time: spanText });
}

function checkRemindersOnStartup(fromAuthLoad) {
  var dismissedSession = false;
  try {
    dismissedSession = sessionStorage.getItem(REMINDERS_SESSION_DISMISS_KEY) === '1';
  } catch (e) { }

  var due = getDueReminders();
  var todayUpcoming = getTodayUpcomingReminders();
  var todayKey = getReminderDayKey(new Date());
  var todayNotified = '';
  try {
    todayNotified = localStorage.getItem(REMINDERS_TODAY_NOTIFIED_KEY) || '';
  } catch (e) { }

  var shouldNotifyDue = due.length > 0 && !dismissedSession;
  var shouldNotifyToday = todayUpcoming.length > 0 && todayNotified !== todayKey;

  if (shouldNotifyDue || shouldNotifyToday) {
    if (!remindersStartupChecked || fromAuthLoad) {
      remindersStartupChecked = true;
      setTimeout(function () {
        var alreadyOpen = document.querySelector('.modal-overlay.active');
        if (!alreadyOpen) {
          if (shouldNotifyToday) {
            try {
              localStorage.setItem(REMINDERS_TODAY_NOTIFIED_KEY, todayKey);
            } catch (e) { }
          }
          openRemindersAlertModal();
        }
      }, 500);
    }
  } else {
    remindersStartupChecked = true;
  }
}

function openRemindersModal() {
  resetReminderForm();
  renderRemindersModal();
  var modal = document.getElementById('remindersModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeRemindersModal() {
  var modal = document.getElementById('remindersModalOverlay');
  if (modal) modal.classList.remove('active');
  try {
    sessionStorage.setItem(REMINDERS_SESSION_DISMISS_KEY, '1');
  } catch (e) { }
}

function openRemindersAlertModal() {
  renderRemindersAlertModal();
  var modal = document.getElementById('remindersAlertModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeRemindersAlertModal(openManagerAfter) {
  var modal = document.getElementById('remindersAlertModalOverlay');
  if (modal) modal.classList.remove('active');
  try {
    sessionStorage.setItem(REMINDERS_SESSION_DISMISS_KEY, '1');
  } catch (e) { }
  if (openManagerAfter) {
    openRemindersModal();
  }
}

function resetReminderForm() {
  editingReminderId = null;
  var titleEl = document.getElementById('reminderTitleInput');
  var dtEl = document.getElementById('reminderDatetimeInput');
  var intEl = document.getElementById('reminderIntervalInput');
  var submitBtn = document.getElementById('reminderSubmitBtn');
  var cancelBtn = document.getElementById('reminderCancelEditBtn');
  var formTitle = document.getElementById('reminderFormTitle');

  if (titleEl) titleEl.value = '';
  if (dtEl) dtEl.value = toLocalDatetimeInputValue(new Date());
  if (intEl) intEl.value = '7';
  if (submitBtn) submitBtn.textContent = t('reminders_btn_add');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (formTitle) formTitle.textContent = t('reminders_form_add_title');
}

function applyReminderPreset(presetKey) {
  resetReminderForm();
  var titleEl = document.getElementById('reminderTitleInput');
  var dtEl = document.getElementById('reminderDatetimeInput');
  var intEl = document.getElementById('reminderIntervalInput');

  if (presetKey === 'bob_fc') {
    if (titleEl) titleEl.value = t('reminders_preset_bob_title');
    if (intEl) intEl.value = '7';
    if (dtEl) dtEl.value = toLocalDatetimeInputValue(new Date(Date.now() + 7 * 86400000));
  } else if (presetKey === 'desert_furniture') {
    if (titleEl) titleEl.value = t('reminders_preset_desert_title');
    if (intEl) intEl.value = '2';
    if (dtEl) dtEl.value = toLocalDatetimeInputValue(new Date(Date.now() + 2 * 86400000));
  } else if (presetKey === 'sid_meat') {
    if (titleEl) titleEl.value = t('reminders_preset_sid_title');
    if (intEl) intEl.value = '10';
    if (dtEl) dtEl.value = toLocalDatetimeInputValue(new Date(Date.now() + 10 * 86400000));
  }

  if (titleEl) titleEl.focus();
}

function setReminderQuickTime(offsetHours) {
  var dtEl = document.getElementById('reminderDatetimeInput');
  if (!dtEl) return;
  var target = new Date(Date.now() + (Number(offsetHours) || 0) * 3600000);
  dtEl.value = toLocalDatetimeInputValue(target);
}

function setReminderQuickInterval(days) {
  var intEl = document.getElementById('reminderIntervalInput');
  if (!intEl) return;
  intEl.value = String(Math.max(0, Math.min(365, Number(days) || 0)));
}

function editReminder(id) {
  var rem = userReminders.find(function (r) { return r.id === id; });
  if (!rem) return;
  editingReminderId = rem.id;

  var titleEl = document.getElementById('reminderTitleInput');
  var dtEl = document.getElementById('reminderDatetimeInput');
  var intEl = document.getElementById('reminderIntervalInput');
  var submitBtn = document.getElementById('reminderSubmitBtn');
  var cancelBtn = document.getElementById('reminderCancelEditBtn');
  var formTitle = document.getElementById('reminderFormTitle');

  if (titleEl) titleEl.value = rem.title;
  if (dtEl) dtEl.value = toLocalDatetimeInputValue(new Date(rem.nextAt));
  if (intEl) intEl.value = String(rem.intervalDays || 0);
  if (submitBtn) submitBtn.textContent = t('reminders_btn_save');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  if (formTitle) formTitle.textContent = t('reminders_form_edit_title');

  if (titleEl) titleEl.focus();
}

function parseReminderInputDate(dtVal) {
  if (!dtVal) return new Date(NaN);
  if (isReminderUtcMode()) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(dtVal).trim());
    if (m) {
      return new Date(Date.UTC(
        parseInt(m[1], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[3], 10),
        parseInt(m[4], 10),
        parseInt(m[5], 10),
        m[6] ? parseInt(m[6], 10) : 0
      ));
    }
  }
  return new Date(dtVal);
}

async function submitReminderForm(e) {
  if (e && e.preventDefault) e.preventDefault();

  var titleEl = document.getElementById('reminderTitleInput');
  var dtEl = document.getElementById('reminderDatetimeInput');
  var intEl = document.getElementById('reminderIntervalInput');

  var title = titleEl ? titleEl.value.trim().slice(0, 80) : '';
  var dtVal = dtEl ? dtEl.value : '';
  var intervalDays = intEl ? parseInt(intEl.value, 10) : 0;

  if (!title) {
    if (typeof showToast === 'function') showToast(t('reminders_err_title'), 'warning');
    return;
  }
  var parsedDate = parseReminderInputDate(dtVal);
  if (!dtVal || isNaN(parsedDate.getTime())) {
    if (typeof showToast === 'function') showToast(t('reminders_err_date'), 'warning');
    return;
  }
  if (isNaN(intervalDays) || intervalDays < 0) intervalDays = 0;
  if (intervalDays > 365) intervalDays = 365;

  if (editingReminderId) {
    var idx = userReminders.findIndex(function (r) { return r.id === editingReminderId; });
    if (idx !== -1) {
      userReminders[idx].title = title;
      userReminders[idx].nextAt = parsedDate.toISOString();
      userReminders[idx].intervalDays = intervalDays;
      userReminders[idx].completed = false;
    }
    if (typeof showToast === 'function') showToast(t('reminders_toast_updated'), 'success');
  } else {
    if (userReminders.length >= 100) {
      if (typeof showToast === 'function') showToast(t('reminders_err_limit'), 'warning');
      return;
    }
    userReminders.push({
      id: 'rem_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      title: title,
      intervalDays: intervalDays,
      nextAt: parsedDate.toISOString(),
      completed: false,
      createdAt: new Date().toISOString()
    });
    if (typeof showToast === 'function') showToast(t('reminders_toast_added'), 'success');
  }

  await persistReminders();
  resetReminderForm();
  renderRemindersModal();
}

async function completeReminder(id) {
  var idx = userReminders.findIndex(function (r) { return r.id === id; });
  if (idx === -1) return;
  var rem = userReminders[idx];

  if (rem.intervalDays > 0) {
    var nextDate = new Date(Date.now() + rem.intervalDays * 86400000);
    rem.nextAt = nextDate.toISOString();
    rem.completed = false;
    if (typeof showToast === 'function') {
      showToast(t('reminders_toast_rescheduled', {
        days: rem.intervalDays,
        date: formatReminderDateTime(rem.nextAt)
      }), 'success');
    }
  } else {
    rem.completed = true;
    if (typeof showToast === 'function') {
      showToast(t('reminders_toast_completed'), 'success');
    }
  }

  await persistReminders();
  renderRemindersModal();
  var alertModal = document.getElementById('remindersAlertModalOverlay');
  if (alertModal && alertModal.classList.contains('active')) {
    var remDue = getDueReminders();
    var remToday = getTodayUpcomingReminders();
    if (remDue.length === 0 && remToday.length === 0) {
      closeRemindersAlertModal(false);
    } else {
      renderRemindersAlertModal();
    }
  }
}

async function deleteReminder(id) {
  userReminders = userReminders.filter(function (r) { return r.id !== id; });
  if (editingReminderId === id) {
    resetReminderForm();
  }
  await persistReminders();
  renderRemindersModal();
  if (typeof showToast === 'function') {
    showToast(t('reminders_toast_deleted'), 'info');
  }
}

function renderReminderItemHtml(rem, statusType, compactAlert) {
  var isDue = statusType === 'due';
  var isTodayLater = statusType === 'today';
  var safeTitle = typeof escapeHtml === 'function' ? escapeHtml(rem.title) : rem.title;
  var dateStr = formatReminderDateTime(rem.nextAt);
  var countdownStr = rem.completed ? t('reminders_status_done') : formatReminderCountdown(rem.nextAt);
  var intervalBadge = rem.intervalDays > 0
    ? t('reminders_every_n_days', { days: rem.intervalDays })
    : t('reminders_one_time');

  var completeLabel = rem.intervalDays > 0
    ? t('reminders_btn_done_shift', { days: rem.intervalDays })
    : t('reminders_btn_done');

  var cardClass = 'reminder-item' +
    (isDue ? ' is-due' : '') +
    (isTodayLater ? ' is-today-later' : '') +
    (rem.completed ? ' is-completed' : '');

  var safeRemId = escapeHtml(rem.id);
  var manageBtns = compactAlert ? '' : (
    '<button type="button" class="reminder-btn-icon" data-rem-action="edit" data-rem-id="' + safeRemId + '" title="' + escapeHtml(t('reminders_btn_edit')) + '">✏️</button>' +
    '<button type="button" class="reminder-btn-icon danger" data-rem-action="delete" data-rem-id="' + safeRemId + '" title="' + escapeHtml(t('reminders_btn_delete')) + '">🗑️</button>'
  );

  return '<div class="' + cardClass + '">' +
    '<div class="reminder-item-main">' +
      '<div class="reminder-item-top">' +
        '<span class="reminder-item-title">' + safeTitle + '</span>' +
        '<span class="reminder-interval-chip">' + intervalBadge + '</span>' +
      '</div>' +
      '<div class="reminder-item-meta">' +
        '<span class="reminder-datetime">🕒 ' + dateStr + '</span>' +
        '<span class="reminder-countdown' + (isDue ? ' due' : (isTodayLater ? ' today' : '')) + '">' + countdownStr + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="reminder-item-actions">' +
      (!rem.completed
        ? '<button type="button" class="reminder-btn-done" data-rem-action="complete" data-rem-id="' + safeRemId + '">✓ ' + escapeHtml(completeLabel) + '</button>'
        : '') +
      manageBtns +
    '</div>' +
  '</div>';
}

function bindRemindersDelegation(containerEl) {
  if (!containerEl || containerEl.dataset.boundRemindersClick) return;
  containerEl.dataset.boundRemindersClick = "1";
  containerEl.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-rem-action]") : null;
    if (!btn) return;
    var remId = btn.dataset.remId;
    var action = btn.dataset.remAction;
    if (!remId) return;
    if (action === "edit") editReminder(remId);
    else if (action === "delete") deleteReminder(remId);
    else if (action === "complete") completeReminder(remId);
  });
}

function renderRemindersAlertModal() {
  var listEl = document.getElementById('remindersAlertListContainer');
  if (!listEl) return;
  bindRemindersDelegation(listEl);

  var due = getDueReminders();
  var todayLater = getTodayUpcomingReminders();

  if (due.length === 0 && todayLater.length === 0) {
    listEl.innerHTML = '<div class="reminders-empty">' + t('reminders_empty') + '</div>';
    return;
  }

  var html = '';
  if (due.length > 0) {
    html += '<div class="reminders-section-label due">🔔 ' + t('reminders_section_due') + ' (' + due.length + ')</div>';
    html += due.map(function (r) { return renderReminderItemHtml(r, 'due', true); }).join('');
  }
  if (todayLater.length > 0) {
    html += '<div class="reminders-section-label today">📆 ' + t('reminders_section_today_later') + ' (' + todayLater.length + ')</div>';
    html += todayLater.map(function (r) { return renderReminderItemHtml(r, 'today', true); }).join('');
  }
  listEl.innerHTML = html;
}

function renderRemindersModal() {
  var listEl = document.getElementById('remindersListContainer');
  var syncHintEl = document.getElementById('remindersSyncHint');
  if (!listEl) return;
  bindRemindersDelegation(listEl);

  if (syncHintEl) {
    var isSignedIn = (typeof currentUser !== 'undefined' && !!currentUser);
    syncHintEl.textContent = isSignedIn ? t('reminders_sync_cloud') : t('reminders_sync_local');
  }

  var due = getDueReminders();
  var dueIds = new Set(due.map(function (r) { return r.id; }));

  var todayLater = getTodayUpcomingReminders();
  var todayIds = new Set(todayLater.map(function (r) { return r.id; }));

  var upcoming = userReminders.filter(function (r) {
    return !r.completed && !dueIds.has(r.id) && !todayIds.has(r.id);
  }).sort(function (a, b) {
    return Date.parse(a.nextAt) - Date.parse(b.nextAt);
  });

  var completed = userReminders.filter(function (r) {
    return !!r.completed;
  }).sort(function (a, b) {
    return Date.parse(b.nextAt) - Date.parse(a.nextAt);
  });

  if (userReminders.length === 0) {
    listEl.innerHTML = '<div class="reminders-empty">' + t('reminders_empty') + '</div>';
    return;
  }

  var html = '';
  if (due.length > 0) {
    html += '<div class="reminders-section-label due">🔔 ' + t('reminders_section_due') + ' (' + due.length + ')</div>';
    html += due.map(function (r) { return renderReminderItemHtml(r, 'due'); }).join('');
  }
  if (todayLater.length > 0) {
    html += '<div class="reminders-section-label today">📆 ' + t('reminders_section_today_later') + ' (' + todayLater.length + ')</div>';
    html += todayLater.map(function (r) { return renderReminderItemHtml(r, 'today'); }).join('');
  }
  if (upcoming.length > 0) {
    html += '<div class="reminders-section-label">📅 ' + t('reminders_section_upcoming') + ' (' + upcoming.length + ')</div>';
    html += upcoming.map(function (r) { return renderReminderItemHtml(r, 'upcoming'); }).join('');
  }
  if (completed.length > 0) {
    html += '<div class="reminders-section-label">✓ ' + t('reminders_section_completed') + ' (' + completed.length + ')</div>';
    html += completed.map(function (r) { return renderReminderItemHtml(r, 'completed'); }).join('');
  }

  listEl.innerHTML = html;
}

// Initialize local reminders immediately on script load
userReminders = loadLocalReminders();
setInterval(updateRemindersBellBadge, 30000);
