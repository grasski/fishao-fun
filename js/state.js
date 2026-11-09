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
 * Resolve the location labels to display for a fish.
 * Specific fishing places (e.g. EFPT_LOST_VALLEY_POND_1) take precedence over
 * the parent location (e.g. Lost Valley).
 */
function getFishLocationLabels(fish) {
  if (!fish) return [];
  var list = (fish.places && fish.places.length) ? fish.places : (fish.locations || []);
  return list.map(function (loc) {
    return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(loc) : loc;
  });
}

// View & Navigation State
var currentView = "all";
var currentSyncState = "local"; // 'local' | 'live' | 'offline' | 'error'
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
var expandedPlayerBackyardCards = new Set();
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
  if (getLang() === 'en') {
    return num + (num === 1 ? ' member' : ' members');
  }
  if (num === 1) return '1 člen';
  if (num >= 2 && num <= 4) return num + ' členové';
  return num + ' členů';
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

// Date utilities for local date inputs
function getTodayISO() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getYesterdayISO() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
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

    if (titleEl) titleEl.innerText = title || "Potvrzení";
    if (msgEl) msgEl.innerText = message || "";
    if (btnEl) {
      btnEl.innerText = confirmText || t('confirm_btn');
      btnEl.className = "pill-btn active " + (isDanger ? "danger" : "purple");
    }
    if (overlay) overlay.style.display = "flex";
  });
}

function resolveConfirmModal(result) {
  var overlay = document.getElementById("confirmModalOverlay");
  if (overlay) overlay.style.display = "none";
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
