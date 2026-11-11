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
  if (places.indexOf('EFPT_CLUB_AREA_SALT') !== -1) return 'Slaná';
  if (places.indexOf('EFPT_CLUB_AREA_FRESH') !== -1) return 'Sladká';
  return '';
}

// Club fishes are derived from allFishes (is_club) and keep the historical
// saltwater-first ordering used by the club table.
var clubFishes = allFishes.filter(function (f) {
  return f.is_club;
}).sort(function (a, b) {
  var aw = getFishWater(a) === 'Slaná' ? 0 : 1;
  var bw = getFishWater(b) === 'Slaná' ? 0 : 1;
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
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getLang() {
  return (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en') ? 'en' : 'cs';
}

function getLocale() {
  return getLang() === 'en' ? 'en-US' : 'cs-CZ';
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
  if (num === 1) return t('member_count_1');
  if (num >= 2 && num <= 4) return t('member_count_2_4', { count: num });
  return t('member_count_5', { count: num });
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
  if (getLang() === 'en') return detectedCityRaw;
  var cityDictCs = {
    "Prague": "Praha",
    "Vienna": "Vídeň",
    "Bratislava": "Bratislava",
    "Warsaw": "Varšava",
    "Berlin": "Berlín",
    "London": "Londýn",
    "Paris": "Paříž",
    "Rome": "Řím"
  };
  return cityDictCs[detectedCityRaw] || detectedCityRaw;
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

    if (titleEl) titleEl.innerText = title || t('confirm_btn', 'Potvrzení');
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
