/**
 * FISHAO - State & Common Utilities (js/state.js)
 * -------------------------------------------------------------
 * Global state variables, localization helper, date/string helpers,
 * and dialog/toast notification utilities.
 */

// Firebase Configuration & Detection
var firebaseConfig = window.FISHAO_FIREBASE_CONFIG || {};
var isFirebaseConfigured = typeof window.isFirebaseConfigured === 'function' ? window.isFirebaseConfigured() : false;

// Fish & Market Data
var allFishes = (window.FISHAO_DATA && window.FISHAO_DATA.allFishes) || [];
var fishById = new Map();
allFishes.forEach(function (f) {
  if (f && f.id !== undefined) {
    fishById.set(Number(f.id), f);
  }
});

function getFishById(fid) {
  return fishById.get(Number(fid)) || null;
}

/**
 * Resolve a fish's water type. Club fish encode salt/fresh in their specific
 * fishing place, so no separate `water` field is stored in the data.
 */
function getFishWater(fish) {
  if (!fish) return '';
  var places = fish.places || [];
  if (places.indexOf('EFPT_CLUB_AREA_SALT') !== -1) return 'salt';
  if (places.indexOf('EFPT_CLUB_AREA_FRESH') !== -1) return 'fresh';
  return '';
}

// Club fishes are derived from allFishes (is_club) and keep the historical
// saltwater-first ordering used by the club table.
var clubFishes = allFishes.filter(function (f) {
  return f.is_club;
}).sort(function (a, b) {
  var aw = getFishWater(a) === 'salt' ? 0 : 1;
  var bw = getFishWater(b) === 'salt' ? 0 : 1;
  return (aw - bw) || ((a.order || 0) - (b.order || 0));
});
var initialPrices = window.FISHAO_DEFAULT_PRICES || {};

/**
 * Resolve the parent location labels to display for a fish (e.g. Lost Valley).
 * Tables show parent locations only; specific fishing areas are rendered
 * separately and compactly in the fish detail modal.
 */
function getFishParentLocationLabels(fish) {
  if (!fish) return [];
  return (fish.locations || []).map(function (loc) {
    return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(loc) : loc;
  });
}

/**
 * Resolve the short specific-area labels for a fish
 * (e.g. EFPT_COOL_MOUNTAIN_RAFT -> "Vor" / "Raft").
 */
function getFishAreaLabels(fish) {
  if (!fish) return [];
  return (fish.places || []).map(function (place) {
    return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(place) : place;
  });
}

/**
 * Resolve the specific fishing areas available under a parent location.
 * Derived from the fish dataset so new EFPT places need no hardcoded map.
 */
function getFishAreasForLocation(location) {
  var areas = new Set();
  if (!location) return [];
  allFishes.forEach(function (f) {
    if ((f.locations || []).indexOf(location) === -1) return;
    (f.places || []).forEach(function (place) {
      if (place) areas.add(place);
    });
  });
  return Array.from(areas);
}

/**
 * Resolve the specific fishing areas of the club waters. Every club fish shares
 * the parent location "Klubový revír", so the club view cannot derive its area
 * filter options from a selected parent location.
 */
function getClubAreas() {
  var areas = new Set();
  clubFishes.forEach(function (f) {
    (f.places || []).forEach(function (place) {
      if (place) areas.add(place);
    });
  });
  return Array.from(areas);
}

/**
 * Backwards-compatible helper. Now returns parent locations only; callers that
 * need specific areas should use getFishAreaLabels().
 */
function getFishLocationLabels(fish) {
  return getFishParentLocationLabels(fish);
}

// View & Navigation State
var currentView = "all";
var selectedModalFishId = null;

// Club State
var currentClubId = "";
var currentClubName = "";
var currentClubPoints = 0;
var currentClubMemberCount = 1;
var currentClubUnlockedFcFishIds = new Set();
var currentClubUnlockedMonsterIds = new Set();
var currentClubMembersMap = {};
var currentClubCreatorId = "";
var clubUnsubscribe = null;
var userUnsubscribe = null;
var currentSpecialFilter = "all"; // 'all' | 'fc' | 'monster'
var currentMilestoneFilter = "all";

// Filters & Collection State
var filterNowActive = false;
var filterOnlyPrice = false;
var collectionFilterMode = "all"; // 'all' | 'caught' | 'missing'

// Authentication & User Profile State
var currentUser = null;
var userProfile = null;
var caughtFishIds = new Set();
var backyardFishIds = new Set();
try {
  var localBackyard = localStorage.getItem('fishao_backyard_fish_ids');
  if (localBackyard) {
    backyardFishIds = new Set(JSON.parse(localBackyard));
  }
} catch (e) {}
var allPlayersList = [];
var friendUids = new Set();
try {
  var localFriends = localStorage.getItem('fishao_friends_uids');
  if (localFriends) {
    friendUids = new Set(JSON.parse(localFriends));
  }
} catch (e) {}
var filterPlayerFriendsOnly = false;
var filterPlayerBackyardOnly = false;
var filterPlayerActiveNow = false;
var filterPlayerTime = "";
var filterPlayerFishId = null;
var filterPlayerBait = "";
var filterPlayerRating = null;
var filterPlayerSearchText = "";
var isProfileBackyardCatalogOpen = false;
var isAdmin = false;

// Firebase service instances
var db = null;
var auth = null;
var firebaseDocRef = null;
var firebaseApp = null;

// Market price history
var priceHistory = {};
try {
  var saved = localStorage.getItem('fishao_price_history_v1');
  priceHistory = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(initialPrices));
} catch (e) {
  priceHistory = JSON.parse(JSON.stringify(initialPrices));
}

// Timezone Detection
var detectedTzName = "";
var detectedCityRaw = "";
try {
  detectedTzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (detectedTzName) {
    detectedCityRaw = detectedTzName.split('/').pop().replace(/_/g, ' ');
  }
} catch (e) { }

var userTimezone = "local";
try {
  var savedTz = localStorage.getItem('fishao_tz');
  userTimezone = savedTz === "utc" ? "utc" : "local";
} catch (e) { }

// Restore UI preferences from local storage
try {
  var savedHideLocked = localStorage.getItem('fishao_hide_locked');
  if (savedHideLocked !== null) {
    var el = document.getElementById("hideLockedCheckbox");
    if (el) el.checked = (savedHideLocked === 'true');
  }
} catch (e) { }

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normStr(s) {
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.norm === 'function') {
    return window.FISHAO_I18N.norm(s);
  }
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase().trim();
}

function getLang() {
  return (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
}

function getLocale() {
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getLocale === 'function') {
    return window.FISHAO_I18N.getLocale();
  }
  return 'cs-CZ';
}

function t(key, params, fallback) {
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.t === 'function') {
    return window.FISHAO_I18N.t(key, params, fallback);
  }
  if (typeof params === 'string') return params;
  return fallback !== undefined ? fallback : key;
}

function formatClubMemberCount(count) {
  var num = Math.max(0, parseInt(count) || 0);
  return t('member_count', { count: num });
}

function getFirestoreModule() {
  if (window.FISHAO_FS_TX && typeof window.FISHAO_FS_TX.loadFirestoreModule === 'function') {
    return window.FISHAO_FS_TX.loadFirestoreModule();
  }
  return import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
}

function renderAvatarHtml(avatarVal, fallbackEmoji, imgCss) {
  var fb = fallbackEmoji || "🎣";
  var val = avatarVal || fb;
  if (val.indexOf("http://") === 0 || val.indexOf("https://") === 0) {
    var styleStr = imgCss || "width:100%; height:100%; object-fit:cover; border-radius:inherit;";
    return '<img src="' + escapeHtml(val) + '" alt="" style="' + styleStr + '" onerror="this.style.display=\'none\'; this.parentElement.innerText=\'' + fb + '\';">';
  }
  return escapeHtml(val);
}

function updateNavClubBadge() {
  var navClubPtsBadge = document.getElementById("navClubPtsBadge");
  if (!navClubPtsBadge) return;
  var locale = getLocale();
  if (currentClubPoints > 0) {
    navClubPtsBadge.innerText = currentClubPoints.toLocaleString(locale) + " " + t('unit_pts');
  } else if (currentClubId || currentClubName) {
    navClubPtsBadge.innerText = "0 " + t('unit_pts');
  } else {
    navClubPtsBadge.innerText = t('badge_no_club');
  }
}

function getLocalizedTzCity() {
  if (!detectedCityRaw) return t('tz_local_city_default');
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getCityName === 'function') {
    return window.FISHAO_I18N.getCityName(detectedCityRaw);
  }
  return detectedCityRaw;
}

// Date utilities for game-consistent (UTC) date inputs
function getTodayISO() {
  var d = new Date();
  var y = d.getUTCFullYear();
  var m = String(d.getUTCMonth() + 1).padStart(2, '0');
  var day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getYesterdayISO() {
  var d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  var y = d.getUTCFullYear();
  var m = String(d.getUTCMonth() + 1).padStart(2, '0');
  var day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isDateSunday(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return false;
  var parts = isoDate.split('-');
  if (parts.length !== 3) return false;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  var dt = new Date(Date.UTC(y, m, day));
  return dt.getUTCDay() === 0;
}

var todayISO = getTodayISO();
var elNewDate = document.getElementById("newPriceDate");
if (elNewDate) elNewDate.value = todayISO;
var elBulkDate = document.getElementById("bulkImportDate");
if (elBulkDate) elBulkDate.value = todayISO;

// -------------------------------------------------------------
// Toast & Modal Notification Utilities
// -------------------------------------------------------------

var confirmModalResolver = null;
var appToastTimer = null;
var selectedProfilePresetEmoji = "🎣";

function showToast(msg, type) {
  var toast = document.getElementById("appToast");
  if (!toast) return;
  if (appToastTimer) {
    clearTimeout(appToastTimer);
    appToastTimer = null;
  }
  toast.className = "app-toast " + (type || "");
  toast.innerText = msg;
  toast.style.display = "inline-flex";
  appToastTimer = setTimeout(function () {
    toast.style.display = "none";
  }, 3500);
}

function showConfirmModal(title, message, confirmText, isDanger) {
  return new Promise(function (resolve) {
    confirmModalResolver = resolve;
    var titleEl = document.getElementById("confirmModalTitle");
    var msgEl = document.getElementById("confirmModalMessage");
    var btnEl = document.getElementById("confirmModalBtnConfirm");
    var overlay = document.getElementById("confirmModalOverlay");

    if (titleEl) titleEl.innerText = title || t('confirm_btn');
    if (msgEl) msgEl.innerText = message || "";
    if (btnEl) {
      btnEl.innerText = confirmText || t('confirm_btn');
      btnEl.className = "pill-btn active " + (isDanger ? "danger" : "purple");
    }
    if (overlay) overlay.classList.add("active");
  });
}

function resolveConfirmModal(result) {
  var overlay = document.getElementById("confirmModalOverlay");
  if (overlay) overlay.classList.remove("active");
  if (typeof confirmModalResolver === "function") {
    confirmModalResolver(Boolean(result));
    confirmModalResolver = null;
  }
}

function showAuthNotice(msg) {
  var notice = document.getElementById("authNotice");
  if (!notice) return;
  notice.innerText = "🔑 " + (msg || t('auth_notice_default'));
  notice.style.display = "block";
  notice.style.position = "fixed";
  notice.style.bottom = "24px";
  notice.style.left = "50%";
  notice.style.transform = "translateX(-50%)";
  notice.style.zIndex = "9999";
  setTimeout(function () { notice.style.display = "none"; }, 4000);
}

var BAIT_ICON_IDS = {
  insects: 10,
  vegetal: 2,
  fish: 5,
  dough: 3,
  lures: 22,
  meat: 11,
  shark: 44,
  hook: 1,
  monkfish: 47,
  monster: 52,
  pelican: 46,
  prehistoric: 45,
  star: 48,
  tuna: 49,
  barracuda: 51,
  marlin: 50
};

function getBaitIconUrl(baitCode) {
  if (!baitCode || !BAIT_ICON_IDS[baitCode]) return '';
  return 'images/bait_' + String(baitCode) + '.png';
}

function getBaitRemoteIconUrl(baitCode) {
  var id = BAIT_ICON_IDS[baitCode];
  if (!id) return '';
  return 'https://play.fishao.net/data/image/baits/bait_56x56_' + id + '.png';
}

/**
 * Build an <img> tag for a bait category icon with automatic remote fallback.
 */
function renderBaitIconImg(baitCode, iconClass, isLazy) {
  var localUrl = getBaitIconUrl(baitCode);
  if (!localUrl) return '';
  var remoteUrl = getBaitRemoteIconUrl(baitCode);
  var fallbackHandler = remoteUrl
    ? "if(this.dataset.fb){this.style.display='none';}else{this.dataset.fb='1';this.src='" + escapeHtml(remoteUrl) + "';}"
    : "this.style.display='none'";
  return '<img src="' + escapeHtml(localUrl) + '" alt="" class="' + iconClass + '"' +
    (isLazy ? ' loading="lazy"' : '') + ' onerror="' + fallbackHandler + '">';
}

/**
 * Render a bait category badge with its category icon and localized label.
 */
function renderBaitHtml(baitCode, containerClass, iconClass) {
  var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(baitCode) : baitCode;
  var imgHtml = renderBaitIconImg(baitCode, iconClass, true);
  return '<span class="' + containerClass + '">' + imgHtml + '<span>' + escapeHtml(bName) + '</span></span>';
}

function renderBaitTag(baitCode) {
  return renderBaitHtml(baitCode, 'bait-tag', 'bait-tag-icon');
}

function renderBaitInline(baitCode) {
  return renderBaitHtml(baitCode, 'bait-inline', 'bait-inline-icon');
}

function closeAllBaitDropdowns(exceptWrapper) {
  document.querySelectorAll('.bait-select-wrapper.open').forEach(function (w) {
    if (exceptWrapper && w === exceptWrapper) return;
    w.classList.remove('open');
    var trig = w.querySelector('.bait-custom-trigger');
    if (trig) trig.setAttribute('aria-expanded', 'false');
  });
}

function bindGlobalBaitDropdownListeners() {
  if (window._baitDropdownListenersBound || typeof document === 'undefined') return;
  window._baitDropdownListenersBound = true;
  document.addEventListener('click', function (e) {
    var wrapper = e.target && e.target.closest ? e.target.closest('.bait-select-wrapper') : null;
    if (!wrapper) closeAllBaitDropdowns(null);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllBaitDropdowns(null);
  });
}

/**
 * Render and sync an image-enabled custom dropdown inside .bait-select-wrapper.
 */
function syncBaitSelectIcon(selectId, iconId) {
  var selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  var wrapper = selectEl.closest('.bait-select-wrapper');
  if (!wrapper) return;

  bindGlobalBaitDropdownListeners();
  selectEl.classList.add('bait-native-select-hidden');

  var legacyIcon = iconId ? document.getElementById(iconId) : null;
  if (legacyIcon) legacyIcon.style.display = 'none';

  var triggerEl = wrapper.querySelector('.bait-custom-trigger');
  var menuEl = wrapper.querySelector('.bait-custom-menu');

  if (!triggerEl) {
    triggerEl = document.createElement('button');
    triggerEl.type = 'button';
    triggerEl.className = 'filter-control bait-custom-trigger';
    triggerEl.setAttribute('aria-haspopup', 'listbox');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.onclick = function (e) {
      e.stopPropagation();
      var willOpen = !wrapper.classList.contains('open');
      closeAllBaitDropdowns(willOpen ? wrapper : null);
      wrapper.classList.toggle('open', willOpen);
      triggerEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };
    wrapper.appendChild(triggerEl);
  }

  if (!menuEl) {
    menuEl = document.createElement('div');
    menuEl.className = 'bait-custom-menu';
    menuEl.setAttribute('role', 'listbox');
    menuEl.onclick = function (e) {
      var optBtn = e.target && e.target.closest ? e.target.closest('.bait-custom-option') : null;
      if (!optBtn) return;
      e.stopPropagation();
      var nextVal = optBtn.getAttribute('data-value') || '';
      selectEl.value = nextVal;
      closeAllBaitDropdowns(null);
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      syncBaitSelectIcon(selectId, iconId);
    };
    wrapper.appendChild(menuEl);
  }

  var ariaLabel = selectEl.getAttribute('aria-label');
  if (ariaLabel) {
    triggerEl.setAttribute('aria-label', ariaLabel);
    menuEl.setAttribute('aria-label', ariaLabel);
  }

  var selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
  var curVal = selectEl.value || '';
  var curLabel = selectedOpt ? selectedOpt.textContent : '';
  var curImg = renderBaitIconImg(curVal, 'bait-option-icon', false);

  triggerEl.innerHTML =
    '<span class="bait-trigger-content">' +
      curImg +
      '<span class="bait-trigger-label">' + escapeHtml(curLabel) + '</span>' +
    '</span>' +
    '<span class="bait-trigger-arrow" aria-hidden="true">▼</span>';

  var optsHtml = '';
  for (var i = 0; i < selectEl.options.length; i++) {
    var opt = selectEl.options[i];
    var optVal = opt.value || '';
    var isSel = (optVal === curVal);
    var optImg = renderBaitIconImg(optVal, 'bait-option-icon', false);
    optsHtml += '<button type="button" role="option" class="bait-custom-option' +
      (isSel ? ' active' : '') + '" data-value="' + escapeHtml(optVal) + '" aria-selected="' +
      (isSel ? 'true' : 'false') + '">' +
      optImg +
      '<span>' + escapeHtml(opt.textContent) + '</span>' +
    '</button>';
  }
  menuEl.innerHTML = optsHtml;
}
