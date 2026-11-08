/**
 * FISHAO - Core Application Logic (app.js v2.2 - i18n Fixed)
 * ----------------------------------------------------------
 * Handles data rendering, filtering, mission size logic,
 * automatic timezone calculations, i18n, and Firebase synchronization.
 */

(function () {
  var firebaseConfig = window.FISHAO_FIREBASE_CONFIG || {};
  var isFirebaseConfigured = typeof window.isFirebaseConfigured === 'function' ? window.isFirebaseConfigured() : false;

  var clubFishes = window.FISHAO_DATA?.clubFishes || [];
  var allFishes = window.FISHAO_DATA?.allFishes || [];
  var initialPrices = window.FISHAO_DEFAULT_PRICES || {};

  // Application state
  var currentView = "all";
  var currentClubId = "";
  var currentClubName = "";
  var currentClubPoints = 0;
  var currentClubMemberCount = 1;
  var currentClubUnlockedFcFishIds = new Set();
  var currentClubUnlockedMonsterIds = new Set();
  var clubUnsubscribe = null;
  var currentSpecialFilter = "all"; // 'all' | 'fc' | 'monster'
  var filterNowActive = false;
  var filterOnlyPrice = false;
  var selectedModalFishId = null;
  var currentSyncState = "local"; // 'local' | 'live' | 'offline' | 'error'

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Unified i18n translation helper delegating to window.FISHAO_I18N
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

  // Timezone detection
  var detectedTzName = "";
  var detectedCityRaw = "";
  try {
    detectedTzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (detectedTzName) {
      detectedCityRaw = detectedTzName.split('/').pop().replace(/_/g, ' ');
    }
  } catch (e) { }

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

  var userTimezone = "local";
  try {
    var savedTz = localStorage.getItem('fishao_tz');
    userTimezone = savedTz === "utc" ? "utc" : "local";
  } catch (e) { }

  // Authentication & user profile state
  var currentUser = null;
  var userProfile = null;
  var caughtFishIds = new Set();
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

  // Restore UI preferences from local storage
  try {
    var savedHideLocked = localStorage.getItem('fishao_hide_locked');
    if (savedHideLocked !== null) {
      var el = document.getElementById("hideLockedCheckbox");
      if (el) el.checked = (savedHideLocked === 'true');
    }
  } catch (e) { }

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
    var dt = new Date(y, m, day);
    return dt.getDay() === 0;
  }

  var todayISO = getTodayISO();
  var defaultOpenDate = (new Date().getDay() === 0) ? getYesterdayISO() : todayISO;
  var elNewDate = document.getElementById("newPriceDate");
  if (elNewDate) elNewDate.value = defaultOpenDate;
  var elBulkDate = document.getElementById("bulkImportDate");
  if (elBulkDate) elBulkDate.value = defaultOpenDate;

  // -------------------------------------------------------------
  // Timezone and Clock Utilities
  // -------------------------------------------------------------

  function updateSyncBadgeUI() {
    var syncBadge = document.getElementById("syncStatusBadge");
    var syncText = document.getElementById("syncStatusText");
    if (!syncBadge || !syncText) return;

    if (currentSyncState === "live") {
      syncBadge.className = "sync-status-badge live";
      syncText.innerText = t('sync_live');
      syncBadge.title = t('sync_live_title');
    } else if (currentSyncState === "offline") {
      syncBadge.className = "sync-status-badge local";
      syncText.innerText = t('sync_offline');
    } else if (currentSyncState === "error") {
      syncBadge.className = "sync-status-badge local";
      syncText.innerText = t('sync_error');
    } else {
      syncBadge.className = "sync-status-badge local";
      syncText.innerText = t('sync_local');
      syncBadge.title = t('sync_local_title');
    }
  }

  function updateTzButtonsUI() {
    var tzLocalBtn = document.getElementById("tzLocalBtn");
    var tzUtcBtn = document.getElementById("tzUtcBtn");
    var clockLabel = document.getElementById("clockLabel");
    var city = getLocalizedTzCity();

    if (tzLocalBtn) {
      tzLocalBtn.classList.toggle("active", userTimezone === "local");
      tzLocalBtn.innerText = "📍 " + (city || t('tz_local_short'));
      tzLocalBtn.title = t('tz_local_btn_title', { tz: detectedTzName || t('tz_local_city_default') });
    }
    if (tzUtcBtn) {
      tzUtcBtn.classList.toggle("active", userTimezone === "utc");
    }
    if (clockLabel) {
      clockLabel.innerText = userTimezone === "local" ? city : t('tz_game_utc');
    }
  }

  function setTimezone(tz) {
    userTimezone = tz;
    localStorage.setItem('fishao_tz', tz);
    updateTzButtonsUI();
    updateClock();
    applyFilters();
  }

  function updateClock() {
    var now = new Date();
    var h, m, s;
    var labelEl = document.getElementById("clockLabel");
    var city = getLocalizedTzCity();

    if (userTimezone === "utc") {
      h = now.getUTCHours();
      m = now.getUTCMinutes();
      s = now.getUTCSeconds();
      if (labelEl) labelEl.innerText = t('clock_utc_server');
    } else {
      h = now.getHours();
      m = now.getMinutes();
      s = now.getSeconds();
      if (labelEl) labelEl.innerText = t('clock_local_time') + (detectedCityRaw ? " (" + city + ")" : "");
    }
    var clockEl = document.getElementById("liveClock");
    if (clockEl) {
      clockEl.innerText = h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');
    }
  }
  setInterval(updateClock, 1000);

  function utcToLocalStr(utcH, utcM) {
    var d = new Date();
    d.setUTCHours(utcH, utcM || 0, 0, 0);
    return d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
  }

  function formatCatchTime(rawTimes) {
    if (!rawTimes || rawTimes.length === 0) return { primary: t('time_all_day'), sub: "" };
    if (userTimezone === "utc") {
      return { primary: rawTimes.join(', ') + " UTC", sub: "" };
    }
    var converted = rawTimes.map(function (part) {
      var clean = part.trim();
      if (!clean.includes('-')) return clean;
      var parts = clean.split('-');
      var sParts = parts[0].split(':').map(Number);
      var eParts = parts[1].split(':').map(Number);
      var sLocal = utcToLocalStr(sParts[0], sParts[1] || 0);
      var eLocal = utcToLocalStr(eParts[0], eParts[1] || 0);
      return sLocal + " - " + eLocal;
    });
    return {
      primary: converted.join(', '),
      sub: "(UTC: " + rawTimes.join(', ') + ")"
    };
  }

  function isFishActiveNow(rawTimes) {
    if (!rawTimes || rawTimes.length === 0) return true;
    var now = new Date();
    var curUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    for (var i = 0; i < rawTimes.length; i++) {
      var clean = rawTimes[i].trim();
      if (!clean.includes('-')) continue;
      var parts = clean.split('-');
      var sParts = parts[0].split(':').map(Number);
      var eParts = parts[1].split(':').map(Number);
      var st = sParts[0] * 60 + (sParts[1] || 0);
      var et = eParts[0] * 60 + (eParts[1] || 0);
      if (et === 0) et = 24 * 60;

      if (et <= st) {
        if (curUtcMinutes >= st || curUtcMinutes <= et) return true;
      } else {
        if (curUtcMinutes >= st && curUtcMinutes <= et) return true;
      }
    }
    return false;
  }

  function isFishActiveAtLocalHour(rawTimes, testLocalHour) {
    var d = new Date();
    d.setHours(testLocalHour, 0, 0, 0);
    var testUtcHour = d.getUTCHours();
    return isFishActiveAtUTCHour(rawTimes, testUtcHour);
  }

  function isFishActiveAtUTCHour(rawTimes, testUtcHour) {
    if (!rawTimes || rawTimes.length === 0) return true;
    for (var i = 0; i < rawTimes.length; i++) {
      var clean = rawTimes[i].trim();
      if (!clean.includes('-')) continue;
      var parts = clean.split('-');
      var sParts = parts[0].split(':').map(Number);
      var eParts = parts[1].split(':').map(Number);
      var st = sParts[0] * 60 + (sParts[1] || 0);
      var et = eParts[0] * 60 + (eParts[1] || 0);
      if (et === 0) et = 24 * 60;
      var cur = testUtcHour * 60;
      if (et <= st) {
        if (cur >= st || cur <= et) return true;
      } else {
        if (cur >= st && cur <= et) return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------
  // Firebase Auth and Firestore Synchronization
  // -------------------------------------------------------------

  async function initFirebaseSync() {
    if (!isFirebaseConfigured) {
      currentSyncState = "local";
      updateSyncBadgeUI();
      updateAuthUI();
      return;
    }

    try {
      var appModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      var firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var authModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

      firebaseApp = appModule.initializeApp(firebaseConfig);
      db = firestoreModule.getFirestore(firebaseApp);
      auth = authModule.getAuth(firebaseApp);
      firebaseDocRef = firestoreModule.doc(db, "fishao_market", "prices_history");

      currentSyncState = "live";
      updateSyncBadgeUI();

      authModule.onAuthStateChanged(auth, function (user) {
        currentUser = user;
        if (user) {
          loadUserProfile(user);
        } else {
          userProfile = null;
          isAdmin = false;
          caughtFishIds = new Set();
          if (clubUnsubscribe) {
            clubUnsubscribe();
            clubUnsubscribe = null;
          }
          currentClubId = "";
          currentClubName = "";
          currentClubPoints = 0;
          currentClubMemberCount = 1;
          currentClubUnlockedFcFishIds.clear();
          currentClubUnlockedMonsterIds.clear();
          var ptsManage = document.getElementById("clubPointsManageInput");
          if (ptsManage) ptsManage.value = 0;
        }
        updateAuthUI();
        updateCaughtStats();
        applyFilters();
      });

      firestoreModule.onSnapshot(firebaseDocRef, function (docSnap) {
        if (docSnap.exists()) {
          var cloudData = docSnap.data();
          if (cloudData && cloudData.prices) {
            priceHistory = cloudData.prices;
            localStorage.setItem('fishao_price_history_v1', JSON.stringify(priceHistory));
            applyFilters();
            if (selectedModalFishId) renderModalHistory(selectedModalFishId);
          }
        } else if (currentUser) {
          firestoreModule.setDoc(firebaseDocRef, { prices: priceHistory });
        }
      }, function (error) {
        console.warn("Firestore connection warning:", error);
        currentSyncState = "offline";
        updateSyncBadgeUI();
      });

    } catch (err) {
      console.error("Firebase initialization failed:", err);
      currentSyncState = "error";
      updateSyncBadgeUI();
      updateAuthUI();
    }
  }

  // -------------------------------------------------------------
  // Authentication & User Profile
  // -------------------------------------------------------------

  async function signIn() {
    if (!auth) {
      showAuthNotice(t('auth_need_config'));
      return;
    }
    try {
      var authModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      var provider = new authModule.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authModule.signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Sign-in error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        alert(t('auth_unauth_domain', { domain: window.location.hostname }));
      } else {
        alert(t('auth_signin_failed', { msg: err.message }));
      }
    }
  }

  async function signOut() {
    if (!auth) return;
    try {
      var authModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      await authModule.signOut(auth);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  }

  async function loadUserProfile(user) {
    if (!db) return;
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var userDocRef = fsModule.doc(db, "users", user.uid);
      var docSnap = await fsModule.getDoc(userDocRef);

      if (docSnap.exists()) {
        userProfile = docSnap.data();
        fsModule.updateDoc(userDocRef, { lastLogin: new Date().toISOString() });
      } else {
        // Privacy / GDPR: zero PII (NO email, NO avatar photo stored)
        var defaultNick = t('user_default_player') + " #" + Math.floor(1000 + Math.random() * 9000);
        userProfile = {
          displayName: defaultNick,
          role: "member",
          clubId: "",
          clubName: "",
          caughtFishIds: Array.from(caughtFishIds),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await fsModule.setDoc(userDocRef, userProfile);
      }

      isAdmin = (userProfile.role === "admin");
      if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
        caughtFishIds = new Set(userProfile.caughtFishIds);
      }

      if (userProfile.clubId) {
        bindClubListener(userProfile.clubId);
      } else {
        unbindClubListener();
      }

      fsModule.onSnapshot(userDocRef, function (snap) {
        if (snap.exists()) {
          var updated = snap.data();
          var oldClubId = userProfile ? userProfile.clubId : "";
          userProfile = updated;
          isAdmin = (userProfile.role === "admin");
          if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
            caughtFishIds = new Set(userProfile.caughtFishIds);
          }
          if (userProfile.clubId !== oldClubId) {
            if (userProfile.clubId) {
              bindClubListener(userProfile.clubId);
            } else {
              unbindClubListener();
            }
          }
          updateAuthUI();
          updateCaughtStats();
          applyFilters();
        }
      });

    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }

  // -------------------------------------------------------------
  // Profile, Avatar & Custom Dialogs (GDPR & UX)
  // -------------------------------------------------------------

  var selectedProfilePresetEmoji = "🎣";
  var confirmModalResolver = null;
  var appToastTimer = null;

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

  function openProfileModal() {
    if (!currentUser) {
      signIn();
      return;
    }
    var overlay = document.getElementById("profileModalOverlay");
    var nickInput = document.getElementById("inputProfileNickname");
    var urlInput = document.getElementById("inputProfileAvatarUrl");

    var curName = (userProfile && userProfile.displayName) ? userProfile.displayName : "";
    var curAv = (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣";

    if (nickInput) nickInput.value = curName;

    if (curAv.startsWith("http://") || curAv.startsWith("https://")) {
      if (urlInput) urlInput.value = curAv;
      selectedProfilePresetEmoji = "🎣";
      updateProfileModalPreview(curAv);
    } else {
      if (urlInput) urlInput.value = "";
      selectedProfilePresetEmoji = curAv || "🎣";
      updateProfileModalPreview(selectedProfilePresetEmoji);
    }

    var btns = document.querySelectorAll(".emoji-pick-btn");
    btns.forEach(function (b) {
      b.classList.toggle("active", b.innerText.trim() === selectedProfilePresetEmoji);
    });

    if (overlay) overlay.style.display = "flex";
  }

  function closeProfileModal() {
    var overlay = document.getElementById("profileModalOverlay");
    if (overlay) overlay.style.display = "none";
  }

  function selectPresetAvatar(emoji) {
    selectedProfilePresetEmoji = emoji;
    var urlInput = document.getElementById("inputProfileAvatarUrl");
    if (urlInput) urlInput.value = "";
    var btns = document.querySelectorAll(".emoji-pick-btn");
    btns.forEach(function (b) {
      b.classList.toggle("active", b.innerText.trim() === emoji);
    });
    updateProfileModalPreview(emoji);
  }

  function onAvatarUrlInput(val) {
    var trimmed = (val || "").trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      var btns = document.querySelectorAll(".emoji-pick-btn");
      btns.forEach(function (b) { b.classList.remove("active"); });
      updateProfileModalPreview(trimmed);
    } else {
      updateProfileModalPreview(selectedProfilePresetEmoji);
    }
  }

  function updateProfileModalPreview(val) {
    var img = document.getElementById("profilePreviewImg");
    var badge = document.getElementById("profilePreviewBadge");
    if (!img || !badge) return;

    if (val.startsWith("http://") || val.startsWith("https://")) {
      img.src = val;
      img.style.display = "block";
      badge.style.display = "none";
    } else {
      img.style.display = "none";
      badge.innerText = val || "🎣";
      badge.style.display = "flex";
    }
  }

  async function saveProfile() {
    if (!currentUser || !db) return;
    var nickInput = document.getElementById("inputProfileNickname");
    var urlInput = document.getElementById("inputProfileAvatarUrl");

    var newNick = (nickInput ? nickInput.value : "").trim();
    if (newNick.length < 2) {
      showToast(t('nick_too_short'), "error");
      return;
    }
    if (newNick.length > 40) {
      showToast("Přezdívka může mít maximálně 40 znaků.", "error");
      return;
    }

    var avatarUrlVal = (urlInput ? urlInput.value : "").trim();
    var finalAvatar = "";
    if (avatarUrlVal.startsWith("http://") || avatarUrlVal.startsWith("https://")) {
      if (avatarUrlVal.length > 500) {
        showToast("URL adresa je příliš dlouhá (max 500 znaků).", "error");
        return;
      }
      finalAvatar = avatarUrlVal;
    } else {
      finalAvatar = selectedProfilePresetEmoji || "🎣";
    }

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var userDocRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userDocRef, {
        displayName: newNick,
        avatarUrl: finalAvatar
      });

      if (userProfile) {
        userProfile.displayName = newNick;
        userProfile.avatarUrl = finalAvatar;
      }

      if (currentClubId) {
        try {
          var clubDocRef = fsModule.doc(db, "clubs", currentClubId);
          var memUp = {};
          memUp["members." + currentUser.uid + ".displayName"] = newNick;
          memUp["members." + currentUser.uid + ".avatarUrl"] = finalAvatar;
          await fsModule.updateDoc(clubDocRef, memUp);
        } catch (e) {
          console.warn("Could not sync member profile to club doc:", e);
        }
      }

      closeProfileModal();
      updateAuthUI();
      showToast(t('profile_saved_success', 'Profil byl úspěšně uložen!'), "success");
    } catch (err) {
      console.error("Failed to save profile:", err);
      showToast("Chyba při ukládání: " + err.message, "error");
    }
  }

  function editNickname() {
    openProfileModal();
  }

  // -------------------------------------------------------------
  // Real-time Shared Club Synchronization
  // -------------------------------------------------------------

  async function bindClubListener(clubId) {
    if (!db || !clubId) return;
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      if (clubUnsubscribe) {
        clubUnsubscribe();
        clubUnsubscribe = null;
      }
      currentClubId = clubId;
      var clubDocRef = fsModule.doc(db, "clubs", clubId);

      clubUnsubscribe = fsModule.onSnapshot(clubDocRef, function (snap) {
        if (snap.exists()) {
          var data = snap.data();
          currentClubName = data.name || "";
          currentClubPoints = typeof data.points === 'number' ? data.points : 0;
          currentClubMemberCount = typeof data.memberCount === 'number' ? data.memberCount : 1;
          currentClubUnlockedFcFishIds = new Set(data.unlockedFcFishIds || []);
          currentClubUnlockedMonsterIds = new Set(data.unlockedMonsterIds || []);
          renderClubMembers(data.members || {}, data.createdBy);

          // Self-heal: ensure current user is registered in members map and stats are synced
          if (currentUser) {
            var myClubCount = 0;
            clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
            var curMember = (data.members && data.members[currentUser.uid]) || {};
            if (!data.members || !data.members[currentUser.uid] || curMember.caughtCount !== caughtFishIds.size || curMember.caughtClubCount !== myClubCount) {
              try {
                var mObj = {
                  displayName: (userProfile && userProfile.displayName) ? userProfile.displayName : (curMember.displayName || "Rybář"),
                  avatarUrl: (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : (curMember.avatarUrl || "🎣"),
                  isCreator: (data.createdBy === currentUser.uid || curMember.isCreator || false),
                  joinedAt: curMember.joinedAt || new Date().toISOString(),
                  caughtCount: caughtFishIds.size,
                  caughtClubCount: myClubCount
                };
                var upM = {};
                upM["members." + currentUser.uid] = mObj;
                fsModule.updateDoc(clubDocRef, upM);
              } catch (e) {
                console.warn("Could not auto-register member in club:", e);
              }
            }
          }
        } else {
          console.warn("Club document not found:", clubId);
          currentClubId = "";
          currentClubName = "";
          currentClubPoints = 0;
          currentClubMemberCount = 1;
          currentClubUnlockedFcFishIds.clear();
          currentClubUnlockedMonsterIds.clear();
          renderClubMembers({}, "");
        }
        updateClubStats();
        renderClubMilestones();
        renderClubSpecialFishes();
        updateAuthUI();
        applyFilters();
      }, function (err) {
        console.warn("Club snapshot error:", err);
      });
    } catch (err) {
      console.error("Error binding club listener:", err);
    }
  }

  var currentClubMembersMap = {};
  var currentClubCreatorId = "";
  var pendingMemberFetches = new Set();

  async function fetchAndSyncMemberStats(uid) {
    if (!db || !uid || !currentUser || pendingMemberFetches.has(uid)) return;
    pendingMemberFetches.add(uid);
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var uSnap = await fsModule.getDoc(fsModule.doc(db, "users", uid));
      if (uSnap.exists()) {
        var uData = uSnap.data();
        var uCaught = Array.isArray(uData.caughtFishIds) ? uData.caughtFishIds : [];
        var totalC = uCaught.length;
        var clubFishIdsSet = new Set(clubFishes.map(function (f) { return f.id; }));
        var clubC = 0;
        uCaught.forEach(function (fid) { if (clubFishIdsSet.has(fid)) clubC++; });

        if (currentClubMembersMap) {
          if (!currentClubMembersMap[uid]) currentClubMembersMap[uid] = {};
          currentClubMembersMap[uid].caughtCount = totalC;
          currentClubMembersMap[uid].caughtClubCount = clubC;
          if (uData.displayName) currentClubMembersMap[uid].displayName = uData.displayName;
          if (uData.avatarUrl) currentClubMembersMap[uid].avatarUrl = uData.avatarUrl;
        }

        // Update member chip badge in active grid
        var badgeEl = document.getElementById("clubMemberCatchBadge_" + uid);
        if (badgeEl) {
          badgeEl.innerText = "• 🎣 " + totalC + "/615";
          badgeEl.style.display = "inline";
        }

        // If player modal is open for this player, update modal live
        var modalNameEl = document.getElementById("playerModalName");
        if (modalNameEl && modalNameEl.dataset.currentUid === uid) {
          var clubCountEl = document.getElementById("playerModalClubCount");
          var clubFillEl = document.getElementById("playerModalClubFill");
          if (clubCountEl) clubCountEl.innerText = clubC + " / 80";
          if (clubFillEl) clubFillEl.style.width = Math.min(100, Math.round((clubC / 80) * 100)) + "%";

          var totalCountEl = document.getElementById("playerModalTotalCount");
          var totalFillEl = document.getElementById("playerModalTotalFill");
          var totalPct = Math.round((totalC / allFishes.length) * 100);
          if (totalCountEl) totalCountEl.innerText = totalC + " / " + allFishes.length + " (" + totalPct + "%)";
          if (totalFillEl) totalFillEl.style.width = Math.min(100, (totalC / allFishes.length) * 100).toFixed(1) + "%";

          var avWrap = document.getElementById("playerModalAvatarWrap");
          var av = uData.avatarUrl || "🎣";
          if (avWrap) {
            if (av && (av.startsWith("http://") || av.startsWith("https://"))) {
              avWrap.innerHTML = '<div class="player-modal-avatar-large"><img src="' + escapeHtml(av) + '" alt="" onerror="this.parentElement.innerHTML=\'🎣\'"></div>';
            } else {
              avWrap.innerHTML = '<div class="player-modal-avatar-large">' + escapeHtml(av || "🎣") + '</div>';
            }
          }
        }

        // Cache into club doc only if values changed to avoid unnecessary Firestore updates
        var existingMem = (currentClubMembersMap && currentClubMembersMap[uid]) || {};
        var needsUpdate = (existingMem.caughtCount !== totalC || existingMem.caughtClubCount !== clubC || existingMem.displayName !== uData.displayName || existingMem.avatarUrl !== uData.avatarUrl);
        if (needsUpdate && currentClubId) {
          try {
            var cRef = fsModule.doc(db, "clubs", currentClubId);
            var patch = {
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.uid
            };
            patch["members." + uid + ".caughtCount"] = totalC;
            patch["members." + uid + ".caughtClubCount"] = clubC;
            if (uData.displayName) patch["members." + uid + ".displayName"] = uData.displayName;
            if (uData.avatarUrl) patch["members." + uid + ".avatarUrl"] = uData.avatarUrl;
            await fsModule.updateDoc(cRef, patch);
          } catch (e) {
            // Silently ignore if permissions prevent caching
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch user stats for member " + uid + ":", err);
    } finally {
      pendingMemberFetches.delete(uid);
    }
  }

  function renderClubMembers(membersMap, creatorId) {
    currentClubMembersMap = membersMap || {};
    currentClubCreatorId = creatorId || "";

    var grid = document.getElementById("clubMembersGrid");
    var countEl = document.getElementById("activeClubMembersCount");
    if (!grid) return;

    var memberKeys = Object.keys(membersMap || {});
    if (memberKeys.length === 0 && currentUser) {
      var myClubCount = 0;
      clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
      var myName = (userProfile && userProfile.displayName) ? userProfile.displayName : "Rybář";
      var myAv = (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣";
      membersMap = {};
      membersMap[currentUser.uid] = {
        displayName: myName,
        avatarUrl: myAv,
        isCreator: (creatorId === currentUser.uid),
        joinedAt: new Date().toISOString(),
        caughtCount: caughtFishIds.size,
        caughtClubCount: myClubCount
      };
      currentClubMembersMap = membersMap;
      memberKeys = [currentUser.uid];
    }

    // Sort memberKeys deterministically so order NEVER jumps or flips when clicking
    memberKeys.sort(function (a, b) {
      var mA = membersMap[a] || {};
      var mB = membersMap[b] || {};
      var isCrA = !!(mA.isCreator || a === creatorId);
      var isCrB = !!(mB.isCreator || b === creatorId);

      // 1. Creator ALWAYS first
      if (isCrA && !isCrB) return -1;
      if (!isCrA && isCrB) return 1;

      // 2. Original join date (joinedAt)
      var jA = mA.joinedAt || "";
      var jB = mB.joinedAt || "";
      if (jA && jB && jA !== jB) {
        return jA.localeCompare(jB);
      }

      // 3. Alphabetical by display name
      var nameA = (mA.displayName || "").toLowerCase();
      var nameB = (mB.displayName || "").toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }

      // 4. UID tie-breaker
      return a.localeCompare(b);
    });

    if (countEl) countEl.innerText = Math.max(memberKeys.length, currentClubMemberCount || 1);

    var html = "";
    memberKeys.forEach(function (uid) {
      var m = membersMap[uid] || {};
      var dName = m.displayName || "Rybář";
      var av = m.avatarUrl || "🎣";
      var isCr = (m.isCreator || uid === creatorId);
      var isMe = (currentUser && uid === currentUser.uid);

      var avatarHtml = "";
      if (av && (av.startsWith("http://") || av.startsWith("https://"))) {
        avatarHtml = '<div class="club-member-avatar"><img src="' + escapeHtml(av) + '" alt="" onerror="this.parentElement.innerHTML=\'🎣\'"></div>';
      } else {
        avatarHtml = '<div class="club-member-avatar">' + escapeHtml(av || "🎣") + '</div>';
      }

      var roleBadge = isCr
        ? '<span class="club-member-creator-badge">👑 ' + t('club_member_creator', 'Zakladatel') + '</span>'
        : '<span>🎣 ' + t('club_member_role', 'Člen') + '</span>';

      var cCount = isMe ? caughtFishIds.size : (typeof m.caughtCount === 'number' ? m.caughtCount : null);
      var countBadge = '<span id="clubMemberCatchBadge_' + uid + '" style="color: #38bdf8; font-size: 11px; margin-left: 4px; font-weight: 600;">• 🎣 ' + (cCount !== null ? cCount : (typeof m.caughtCount === 'number' ? m.caughtCount : 0)) + '/615</span>';

      html += '<div class="club-member-chip' + (isCr ? ' creator' : '') + '" onclick="window.fishaoApp.openPlayerModal(\'' + uid + '\')" title="' + escapeHtml(t('club_member_view_profile', 'Kliknutím zobrazíš detail hráče')) + '">' +
        avatarHtml +
        '<div class="club-member-info">' +
          '<div class="club-member-name">' + escapeHtml(dName) + (isMe ? ' <span style="font-size:11px;color:#a78bfa;">(Ty)</span>' : '') + '</div>' +
          '<div class="club-member-tag">' +
            roleBadge + countBadge +
          '</div>' +
        '</div>' +
      '</div>';

      if (!isMe && currentUser && db && (m.caughtCount === undefined || m.caughtClubCount === undefined)) {
        fetchAndSyncMemberStats(uid);
      }
    });

    grid.innerHTML = html;
  }

  function openPlayerModal(uid) {
    if (!uid) return;
    var m = (currentClubMembersMap && currentClubMembersMap[uid]) || {};
    var isMe = !!(currentUser && uid === currentUser.uid);
    var isCr = !!(m.isCreator || uid === currentClubCreatorId);

    var dName = isMe
      ? ((userProfile && userProfile.displayName) ? userProfile.displayName : (m.displayName || "Rybář"))
      : (m.displayName || "Rybář");

    var av = isMe
      ? ((userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : (m.avatarUrl || "🎣"))
      : (m.avatarUrl || "🎣");

    var myClubCount = 0;
    if (isMe) {
      clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
    }
    var cClub = isMe ? myClubCount : (m.caughtClubCount || 0);
    var cTotal = isMe ? caughtFishIds.size : (m.caughtCount || 0);

    var avatarWrap = document.getElementById("playerModalAvatarWrap");
    if (avatarWrap) {
      if (av && (av.startsWith("http://") || av.startsWith("https://"))) {
        avatarWrap.innerHTML = '<div class="player-modal-avatar-large"><img src="' + escapeHtml(av) + '" alt="" onerror="this.parentElement.innerHTML=\'🎣\'"></div>';
      } else {
        avatarWrap.innerHTML = '<div class="player-modal-avatar-large">' + escapeHtml(av || "🎣") + '</div>';
      }
    }

    var nameEl = document.getElementById("playerModalName");
    if (nameEl) {
      nameEl.innerText = dName + (isMe ? " (Ty)" : "");
      nameEl.dataset.currentUid = uid;
    }

    var roleEl = document.getElementById("playerModalRole");
    if (roleEl) {
      roleEl.innerHTML = isCr
        ? '<span class="pill-btn gold active" style="cursor: default; font-size: 11px; padding: 2px 10px;">👑 ' + t('club_member_creator', 'Zakladatel') + '</span>'
        : '<span class="pill-btn purple" style="cursor: default; font-size: 11px; padding: 2px 10px;">🎣 ' + t('club_member_role', 'Člen') + '</span>';
    }

    var clubCountEl = document.getElementById("playerModalClubCount");
    var clubFillEl = document.getElementById("playerModalClubFill");
    if (clubCountEl) clubCountEl.innerText = cClub + " / 80";
    if (clubFillEl) clubFillEl.style.width = Math.min(100, Math.round((cClub / 80) * 100)) + "%";

    var totalCountEl = document.getElementById("playerModalTotalCount");
    var totalFillEl = document.getElementById("playerModalTotalFill");
    var totalPct = Math.round((cTotal / allFishes.length) * 100);
    if (totalCountEl) totalCountEl.innerText = cTotal + " / " + allFishes.length + " (" + totalPct + "%)";
    if (totalFillEl) totalFillEl.style.width = Math.min(100, (cTotal / allFishes.length) * 100).toFixed(1) + "%";

    var joinedEl = document.getElementById("playerModalJoined");
    if (joinedEl) {
      var dateStr = "";
      if (m.joinedAt) {
        try {
          var d = new Date(m.joinedAt);
          dateStr = d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'numeric', year: 'numeric' });
        } catch (e) {
          dateStr = m.joinedAt;
        }
      }
      joinedEl.innerText = dateStr
        ? t('club_member_joined', { date: dateStr })
        : (isCr ? t('club_member_creator', 'Zakladatel') : t('club_member_role', 'Člen'));
    }

    var selfActions = document.getElementById("playerModalSelfActions");
    if (selfActions) selfActions.style.display = isMe ? "block" : "none";

    var modal = document.getElementById("playerModalOverlay");
    if (modal) modal.classList.add("active");

    // Fetch live user doc to guarantee fresh real-time stats even if member is offline or was added earlier
    if (!isMe && currentUser && db) {
      fetchAndSyncMemberStats(uid);
    }
  }

  function closePlayerModal() {
    var modal = document.getElementById("playerModalOverlay");
    if (modal) modal.classList.remove("active");
  }

  function unbindClubListener() {
    if (clubUnsubscribe) {
      clubUnsubscribe();
      clubUnsubscribe = null;
    }
    currentClubId = "";
    currentClubName = "";
    currentClubPoints = 0;
    currentClubMemberCount = 1;
    currentClubUnlockedFcFishIds.clear();
    currentClubUnlockedMonsterIds.clear();
    renderClubMembers({}, "");
    updateClubStats();
    renderClubMilestones();
    renderClubSpecialFishes();
    updateAuthUI();
    applyFilters();
  }

  async function searchClubs(query) {
    if (!db) return;
    var searchInput = document.getElementById("clubSearchInput");
    var q = (query !== undefined ? query : (searchInput ? searchInput.value : "")).trim();
    var resultsEl = document.getElementById("clubSearchResults");
    if (!resultsEl) return;

    resultsEl.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12px;">⏳ ' + t('club_btn_search') + '...</div>';

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var clubsCol = fsModule.collection(db, "clubs");
      var qry;

      if (!q) {
        qry = fsModule.query(clubsCol, fsModule.orderBy("points", "desc"), fsModule.limit(15));
      } else {
        var qLower = q.toLowerCase();
        qry = fsModule.query(
          clubsCol,
          fsModule.where("name_lower", ">=", qLower),
          fsModule.where("name_lower", "<=", qLower + "\uf8ff"),
          fsModule.limit(15)
        );
      }

      var snap = await fsModule.getDocs(qry);
      if (snap.empty) {
        resultsEl.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 12px; text-align: center;">' + t('club_no_search_results') + '</div>';
        return;
      }

      var html = "";
      snap.forEach(function (doc) {
        var d = doc.data();
        var cId = doc.id;
        var name = d.name || "Klub";
        var pts = typeof d.points === 'number' ? d.points : 0;
        var members = typeof d.memberCount === 'number' ? d.memberCount : 1;
        var unlockedFcCount = (d.unlockedFcFishIds || []).length + (d.unlockedMonsterIds || []).length;

        html += '<div class="club-search-item">' +
          '<div>' +
          '<div class="club-item-name">🏰 ' + escapeHtml(name) + '</div>' +
          '<div class="club-item-meta">' +
          '<span>⭐ ' + pts.toLocaleString(getLocale()) + ' ' + t('unit_pts') + '</span>' +
          '<span>👥 ' + t('club_active_members', { count: members }) + '</span>' +
          '<span>🪙 ' + unlockedFcCount + '/24</span>' +
          '</div>' +
          '</div>' +
          '<button class="pill-btn purple" onclick="window.fishaoApp.joinClub(\'' + cId + '\', \'' + escapeHtml(name).replace(/'/g, "\\'") + '\')">' + t('club_btn_join') + '</button>' +
          '</div>';
      });

      resultsEl.innerHTML = html;
    } catch (err) {
      console.error("Error searching clubs:", err);
      resultsEl.innerHTML = '<div style="padding: 10px; color: #f87171; font-size: 12px;">Chyba: ' + err.message + '</div>';
    }
  }

  async function createClub(name) {
    if (!currentUser || !db) {
      showAuthNotice(t('auth_notice_club'));
      return;
    }
    var input = document.getElementById("newClubNameInput");
    var clubName = (name !== undefined ? name : (input ? input.value : "")).trim();
    if (clubName.length < 2) {
      showToast(t('club_name_too_short'), "error");
      return;
    }
    if (clubName.length > 40) {
      showToast("Název klubu může mít maximálně 40 znaků.", "error");
      return;
    }

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var clubsCol = fsModule.collection(db, "clubs");

      // Decrement previous club member count if user was in a club
      if (currentClubId) {
        try {
          var prevClubRef = fsModule.doc(db, "clubs", currentClubId);
          var prevSnap = await fsModule.getDoc(prevClubRef);
          if (prevSnap.exists()) {
            var prevCount = prevSnap.data().memberCount || 1;
            var prevUpdate = {
              memberCount: Math.max(0, prevCount - 1),
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.uid
            };
            prevUpdate["members." + currentUser.uid] = fsModule.deleteField();
            await fsModule.updateDoc(prevClubRef, prevUpdate);
          }
        } catch (e) {
          console.warn("Could not decrement prev club:", e);
        }
      }

      var myClubCount = 0;
      clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
      var memberData = {
        displayName: (userProfile && userProfile.displayName) ? userProfile.displayName : "Rybář",
        avatarUrl: (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣",
        isCreator: true,
        joinedAt: new Date().toISOString(),
        caughtCount: caughtFishIds.size,
        caughtClubCount: myClubCount
      };
      var initialMembers = {};
      initialMembers[currentUser.uid] = memberData;

      var newDocRef = await fsModule.addDoc(clubsCol, {
        name: clubName,
        name_lower: clubName.toLowerCase(),
        points: 0,
        unlockedFcFishIds: [],
        unlockedMonsterIds: [],
        memberCount: 1,
        members: initialMembers,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      var userDocRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userDocRef, {
        clubId: newDocRef.id,
        clubName: clubName
      });

      if (input) input.value = "";
      showToast(t('club_created_success', { name: clubName }), "success");
      bindClubListener(newDocRef.id);
    } catch (err) {
      console.error("Failed to create club:", err);
      showToast("Chyba při vytváření klubu: " + err.message, "error");
    }
  }

  async function joinClub(clubId, clubName) {
    if (!currentUser || !db) {
      showAuthNotice(t('auth_notice_club'));
      return;
    }
    if (currentClubId === clubId) {
      showToast("V tomto klubu již jsi!", "purple");
      return;
    }

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

      if (currentClubId) {
        var targetClubName = clubName || "Klub";
        var ok = await showConfirmModal(
          t('club_btn_join'),
          t('club_change_confirm', { current: currentClubName || 'Klub', target: targetClubName }),
          t('club_btn_join'),
          false
        );
        if (!ok) return;

        try {
          var oldClubRef = fsModule.doc(db, "clubs", currentClubId);
          var oldSnap = await fsModule.getDoc(oldClubRef);
          if (oldSnap.exists()) {
            var oldCnt = oldSnap.data().memberCount || 1;
            var oldUpdate = {
              memberCount: Math.max(0, oldCnt - 1),
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.uid
            };
            oldUpdate["members." + currentUser.uid] = fsModule.deleteField();
            await fsModule.updateDoc(oldClubRef, oldUpdate);
          }
        } catch (e) {
          console.warn("Could not decrement old club:", e);
        }
      }

      var newClubRef = fsModule.doc(db, "clubs", clubId);
      var newSnap = await fsModule.getDoc(newClubRef);
      if (!newSnap.exists()) {
        showToast(t('club_not_found'), "error");
        return;
      }
      var newCount = (newSnap.data().memberCount || 0) + 1;
      var myJoinClubCount = 0;
      clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myJoinClubCount++; });
      var memberData = {
        displayName: (userProfile && userProfile.displayName) ? userProfile.displayName : "Rybář",
        avatarUrl: (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣",
        isCreator: false,
        joinedAt: new Date().toISOString(),
        caughtCount: caughtFishIds.size,
        caughtClubCount: myJoinClubCount
      };
      var updatePayload = {
        memberCount: newCount,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.uid
      };
      updatePayload["members." + currentUser.uid] = memberData;
      await fsModule.updateDoc(newClubRef, updatePayload);

      var userDocRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userDocRef, {
        clubId: clubId,
        clubName: clubName || newSnap.data().name || "Klub"
      });

      showToast(t('club_joined_success', { name: clubName || newSnap.data().name }), "success");
      bindClubListener(clubId);
    } catch (err) {
      console.error("Failed to join club:", err);
      showToast("Chyba při připojování ke klubu: " + err.message, "error");
    }
  }

  async function leaveClub() {
    if (!currentUser || !db || !currentClubId) return;
    var ok = await showConfirmModal(
      t('club_btn_leave'),
      t('club_leave_confirm'),
      t('club_btn_leave'),
      true
    );
    if (!ok) return;

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      try {
        var clubRef = fsModule.doc(db, "clubs", currentClubId);
        var snap = await fsModule.getDoc(clubRef);
        if (snap.exists()) {
          var cnt = snap.data().memberCount || 1;
          var leaveUpdate = {
            memberCount: Math.max(0, cnt - 1),
            updatedAt: new Date().toISOString(),
            lastUpdatedBy: currentUser.uid
          };
          leaveUpdate["members." + currentUser.uid] = fsModule.deleteField();
          await fsModule.updateDoc(clubRef, leaveUpdate);
        }
      } catch (e) {
        console.warn("Could not decrement club:", e);
      }

      var userDocRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userDocRef, {
        clubId: "",
        clubName: ""
      });

      unbindClubListener();
      showToast(t('club_left_success'), "purple");
      searchClubs("");
    } catch (err) {
      console.error("Failed to leave club:", err);
      showToast("Chyba při opouštění klubu: " + err.message, "error");
    }
  }

  async function setClubPoints(val) {
    if (!currentUser || !db) {
      showAuthNotice(t('auth_notice_points'));
      return;
    }
    if (!currentClubId) {
      alert("Pro nastavení bodů musíš být členem klubu!");
      return;
    }
    var num = Math.max(0, parseInt(val) || 0);
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var clubRef = fsModule.doc(db, "clubs", currentClubId);
      await fsModule.updateDoc(clubRef, {
        points: num,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.uid
      });
    } catch (err) {
      console.error("Failed to update club points:", err);
    }
  }

  function addClubPoints(amount) {
    setClubPoints(currentClubPoints + amount);
  }

  async function toggleClubSpecialFish(fishId) {
    if (!currentUser || !db) {
      showAuthNotice(t('auth_notice_club'));
      return;
    }
    if (!currentClubId) {
      alert("Pro odemykání speciálních ryb musíš být členem klubu!");
      return;
    }

    var cf = clubFishes.find(function (x) { return x.id === fishId; });
    if (!cf) return;

    var isMonster = (cf.unlock_type === 'monster');
    var isFc = (cf.unlock_type === 'fc');
    if (!isMonster && !isFc) return;

    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var clubRef = fsModule.doc(db, "clubs", currentClubId);

      if (isMonster) {
        var updatedMonsters = new Set(currentClubUnlockedMonsterIds);
        if (updatedMonsters.has(fishId)) {
          updatedMonsters.delete(fishId);
        } else {
          updatedMonsters.add(fishId);
        }
        await fsModule.updateDoc(clubRef, {
          unlockedMonsterIds: Array.from(updatedMonsters),
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        });
      } else {
        var updatedFc = new Set(currentClubUnlockedFcFishIds);
        if (updatedFc.has(fishId)) {
          updatedFc.delete(fishId);
        } else {
          updatedFc.add(fishId);
        }
        await fsModule.updateDoc(clubRef, {
          unlockedFcFishIds: Array.from(updatedFc),
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        });
      }
    } catch (err) {
      console.error("Failed to toggle special fish:", err);
      alert("Chyba při ukládání: " + err.message);
    }
  }

  function filterSpecialFishes(filter, btn) {
    currentSpecialFilter = filter || 'all';
    var btns = document.querySelectorAll('.special-header-filters .pill-btn');
    btns.forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    renderClubSpecialFishes();
  }

  function renderClubSpecialFishes() {
    var grid = document.getElementById("clubSpecialGrid");
    if (!grid) return;

    var specials = clubFishes.filter(function (f) {
      return f.unlock_type === 'fc' || f.unlock_type === 'monster';
    });

    var filtered = specials.filter(function (f) {
      if (currentSpecialFilter === 'fc') return f.unlock_type === 'fc';
      if (currentSpecialFilter === 'monster') return f.unlock_type === 'monster';
      return true;
    });

    var manageSpecialUnlocked = document.getElementById("manageSpecialUnlocked");
    var totalUnlockedSpecial = currentClubUnlockedFcFishIds.size + currentClubUnlockedMonsterIds.size;
    if (manageSpecialUnlocked) {
      manageSpecialUnlocked.innerText = totalUnlockedSpecial + " / " + specials.length;
    }

    grid.innerHTML = filtered.map(function (f) {
      var isMonster = (f.unlock_type === 'monster');
      var isUnlocked = isMonster ? currentClubUnlockedMonsterIds.has(f.id) : currentClubUnlockedFcFishIds.has(f.id);
      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      var costLabel = isMonster ? ("👾 " + t('unlock_monster')) : ("🪙 " + (f.fc || "") + " FC");

      var btnClass = isUnlocked ? "special-toggle-btn unlocked" : "special-toggle-btn locked";
      var btnText = isUnlocked ? t('special_status_unlocked') : t('special_status_locked');

      return '<div class="special-fish-card ' + (isUnlocked ? 'unlocked' : '') + '">' +
        '<div class="special-fish-left" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" style="cursor: pointer;">' +
        '<img src="images/fish_' + f.id + '.png" class="special-fish-img" alt="' + fishName + '" onerror="this.src=\'images/default-fish.png\'">' +
        '<div class="special-fish-details">' +
        '<span class="special-fish-name" title="' + fishName + '">' + fishName + '</span>' +
        '<span class="special-fish-cost">' + costLabel + '</span>' +
        '</div>' +
        '</div>' +
        '<button class="' + btnClass + '" onclick="window.fishaoApp.toggleClubSpecialFish(' + f.id + ')">' + btnText + '</button>' +
        '</div>';
    }).join("");
  }

  function updateAuthUI() {
    var tabClub = document.getElementById("tabClub");
    var isInClub = !!(currentUser && currentClubId);
    if (tabClub) {
      tabClub.style.display = isInClub ? "" : "none";
    }
    if (!isInClub && currentView === "club") {
      switchView("all");
    }

    var signInBtn = document.getElementById("signInBtn");
    var userInfoBar = document.getElementById("userInfoBar");
    var adminBadge = document.getElementById("adminBadge");

    var bannerClubAuth = document.getElementById("bannerClubAuth");
    var bannerClubGuestNotice = document.getElementById("bannerClubGuestNotice");
    var gateClub = document.getElementById("gateClubManage");
    var manageContent = document.getElementById("manageClubContent");
    var gateCollection = document.getElementById("gateCollection");
    var bCollection = document.getElementById("bannerCollection");
    var secTable = document.getElementById("sectionFishTable");
    var filterCard = document.getElementById("filterCard");

    var clubPtsBadge = document.getElementById("navClubPtsBadge");
    if (clubPtsBadge) {
      if (!currentUser) {
        clubPtsBadge.innerText = t('badge_locked');
      } else if (currentClubId) {
        clubPtsBadge.innerText = currentClubPoints.toLocaleString(getLocale()) + " " + t('unit_pts');
      } else {
        clubPtsBadge.innerText = t('badge_no_club');
      }
    }

    var collBannerAuth = document.getElementById("collBannerAuth");
    var collBannerGuest = document.getElementById("collBannerGuest");
    if (collBannerAuth && collBannerGuest) {
      collBannerAuth.style.display = currentUser ? "flex" : "none";
      collBannerGuest.style.display = currentUser ? "none" : "flex";
    }

    if (!isFirebaseConfigured) {
      if (signInBtn) signInBtn.style.display = "none";
      if (userInfoBar) userInfoBar.style.display = "none";
      if (adminBadge) adminBadge.style.display = "none";
      if (collBannerAuth) collBannerAuth.style.display = "none";
      if (collBannerGuest) collBannerGuest.style.display = "none";
      return;
    }

    if (currentUser) {
      if (signInBtn) signInBtn.style.display = "none";
      if (userInfoBar) userInfoBar.style.display = "inline-flex";

      var nameEl = document.getElementById("userName");
      if (nameEl) nameEl.innerText = (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_player');

      var avatarImg = document.getElementById("userAvatarImg");
      var avatarBadge = document.getElementById("userAvatarBadge");
      var uAv = (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "";
      if (uAv && (uAv.startsWith("http://") || uAv.startsWith("https://"))) {
        if (avatarImg) {
          avatarImg.src = uAv;
          avatarImg.style.display = "block";
        }
        if (avatarBadge) avatarBadge.style.display = "none";
      } else {
        if (avatarImg) avatarImg.style.display = "none";
        if (avatarBadge) {
          avatarBadge.innerText = uAv || "🎣";
          avatarBadge.style.display = "flex";
        }
      }

      if (adminBadge) adminBadge.style.display = isAdmin ? "inline-block" : "none";
      var exportBtn = document.getElementById("btnExportPrices");
      if (exportBtn) exportBtn.style.display = isAdmin ? "inline-block" : "none";

      if (bannerClubAuth) bannerClubAuth.style.display = "flex";
      if (bannerClubGuestNotice) bannerClubGuestNotice.style.display = "none";

      var collNotice = document.getElementById("collectionSyncNotice");
      if (collNotice) {
        var pName = (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_player');
        collNotice.innerHTML = t('coll_sync_google', { user: pName });
      }

      if (currentView === "club_manage") {
        if (gateClub) gateClub.style.display = "none";
        if (manageContent) manageContent.style.display = "block";
        var noClubSt = document.getElementById("clubNoClubState");
        var activeSt = document.getElementById("clubActiveState");
        if (currentClubId) {
          if (noClubSt) noClubSt.style.display = "none";
          if (activeSt) activeSt.style.display = "block";
          var acName = document.getElementById("activeClubName");
          if (acName) acName.innerText = currentClubName || "Klub";
          var acMemb = document.getElementById("activeClubMembers");
          if (acMemb) acMemb.innerText = t('club_active_members', { count: currentClubMemberCount });
          var acPtsDisplay = document.getElementById("activeClubPtsDisplay");
          if (acPtsDisplay) acPtsDisplay.innerText = currentClubPoints.toLocaleString(getLocale());
          var ptsManage = document.getElementById("clubPointsManageInput");
          if (ptsManage) ptsManage.value = currentClubPoints;
        } else {
          if (activeSt) activeSt.style.display = "none";
          if (noClubSt) noClubSt.style.display = "block";
          var resEl = document.getElementById("clubSearchResults");
          if (resEl && !resEl.children.length) {
            searchClubs("");
          }
        }
      } else if (currentView === "collection") {
        if (gateCollection) gateCollection.style.display = "none";
        if (bCollection) bCollection.style.display = "flex";
        if (secTable) secTable.style.display = "block";
        if (filterCard) filterCard.style.display = "flex";
      }
    } else {
      if (signInBtn) signInBtn.style.display = "inline-flex";
      if (userInfoBar) userInfoBar.style.display = "none";
      if (adminBadge) adminBadge.style.display = "none";
      var exportBtnOff = document.getElementById("btnExportPrices");
      if (exportBtnOff) exportBtnOff.style.display = "none";

      if (bannerClubAuth) bannerClubAuth.style.display = "none";
      if (bannerClubGuestNotice) bannerClubGuestNotice.style.display = "block";

      var collNoticeOff = document.getElementById("collectionSyncNotice");
      if (collNoticeOff) {
        collNoticeOff.innerHTML = t('coll_sync_logged_out');
      }

      collectionFilterMode = "all";
      var collAll = document.getElementById("collFilterAll");
      var collCaught = document.getElementById("collFilterCaught");
      var collMissing = document.getElementById("collFilterMissing");
      if (collAll) collAll.classList.add("active");
      if (collCaught) collCaught.classList.remove("active");
      if (collMissing) collMissing.classList.remove("active");

      if (currentView === "club_manage") {
        if (gateClub) gateClub.style.display = "block";
        if (manageContent) manageContent.style.display = "none";
      } else if (currentView === "collection") {
        if (gateCollection) gateCollection.style.display = "block";
        if (bCollection) bCollection.style.display = "none";
        if (secTable) secTable.style.display = "none";
        if (filterCard) filterCard.style.display = "none";
      }
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

  // -------------------------------------------------------------
  // Caught Fish Collection
  // -------------------------------------------------------------

  async function toggleCaughtFish(fishId) {
    if (!currentUser) {
      showAuthNotice(t('auth_notice_collection'));
      return;
    }

    if (caughtFishIds.has(fishId)) {
      caughtFishIds.delete(fishId);
    } else {
      caughtFishIds.add(fishId);
    }

    if (currentUser && db) {
      try {
        var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        var userDocRef = fsModule.doc(db, "users", currentUser.uid);
        await fsModule.updateDoc(userDocRef, {
          caughtFishIds: Array.from(caughtFishIds)
        });

        if (currentClubId) {
          try {
            var myClubCount = 0;
            clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
            var clubDocRef = fsModule.doc(db, "clubs", currentClubId);
            var mSync = {};
            mSync["members." + currentUser.uid + ".caughtCount"] = caughtFishIds.size;
            mSync["members." + currentUser.uid + ".caughtClubCount"] = myClubCount;
            await fsModule.updateDoc(clubDocRef, mSync);
          } catch (e) {
            console.warn("Could not sync member catch counts to club:", e);
          }
        }
      } catch (err) {
        console.error("Failed to update caught fish:", err);
      }
    }

    updateCaughtStats();
    if (currentView === 'club_manage') {
      renderClubMilestones();
    } else {
      applyFilters();
    }
  }

  function updateCaughtStats() {
    var clubCount = 0;
    var allCount = 0;

    clubFishes.forEach(function (f) {
      if (caughtFishIds.has(f.id)) clubCount++;
    });
    allFishes.forEach(function (f) {
      if (caughtFishIds.has(f.id)) allCount++;
    });

    var clubCountEl = document.getElementById("caughtClubCount");
    var allCountEl = document.getElementById("caughtAllCount");
    var progressEl = document.getElementById("caughtProgressFill");
    var pctTextEl = document.getElementById("caughtPctText");
    var navBadge = document.getElementById("navCaughtBadge");

    if (clubCountEl) clubCountEl.innerText = clubCount;
    if (allCountEl) allCountEl.innerText = allCount;

    var pct = allFishes.length > 0 ? (allCount / allFishes.length * 100) : 0;
    if (currentView === "club") {
      pct = clubFishes.length > 0 ? (clubCount / clubFishes.length * 100) : 0;
    }

    if (progressEl) progressEl.style.width = pct.toFixed(1) + "%";
    if (pctTextEl) pctTextEl.innerText = pct.toFixed(0) + "%";

    if (navBadge) {
      if (!currentUser) {
        navBadge.innerText = t('badge_locked');
      } else {
        navBadge.innerText = (currentView === "club" ? clubCount + " / 80" : allCount + " / 615");
      }
    }

    var clubPtsBadge = document.getElementById("navClubPtsBadge");
    if (clubPtsBadge) {
      if (!currentUser) {
        clubPtsBadge.innerText = t('badge_locked');
      } else if (currentClubName) {
        clubPtsBadge.innerText = currentClubPoints.toLocaleString(getLocale()) + " " + t('unit_pts');
      } else {
        clubPtsBadge.innerText = t('badge_no_club');
      }
    }

    var manageCaught = document.getElementById("manageCaughtClub");
    if (manageCaught) {
      manageCaught.innerText = t('status_caught_count', { caught: clubCount, total: clubFishes.length });
    }
    var manageFill = document.getElementById("manageProgressFill");
    if (manageFill) {
      var clubPct = clubFishes.length > 0 ? (clubCount / clubFishes.length * 100) : 0;
      manageFill.style.width = clubPct.toFixed(1) + "%";
    }

    var marketSummary = document.getElementById("marketStatsSummary");
    if (marketSummary) {
      var priceCount = Object.keys(priceHistory).length;
      marketSummary.innerText = t('market_recorded_prices', { count: priceCount });
    }
  }

  // -------------------------------------------------------------
  // Club and Profile Settings
  // -------------------------------------------------------------

  function syncClubName(val) {
    currentClubName = (val || "").trim();
  }

  function syncClubPoints(val) {
    setClubPoints(val);
  }

  function onClubNameChange() {
    var val = document.getElementById("clubNameInput") ? document.getElementById("clubNameInput").value : "";
    syncClubName(val);
  }

  function onPointsChange() {
    var val = document.getElementById("clubPointsInput") ? document.getElementById("clubPointsInput").value : 0;
    setClubPoints(val);
  }

  // -------------------------------------------------------------
  // Market Price Management
  // -------------------------------------------------------------

  async function persistPriceHistory() {
    localStorage.setItem('fishao_price_history_v1', JSON.stringify(priceHistory));

    if (db && firebaseDocRef && currentUser) {
      try {
        var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        await fsModule.setDoc(firebaseDocRef, {
          prices: priceHistory,
          lastUpdated: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to persist prices to Firestore:", err);
      }
    }
  }

  function getFishPrices(fid) {
    return priceHistory[fid.toString()] || [];
  }

  function isMarketClosedToday() {
    return new Date().getDay() === 0; // 0 = Sunday
  }

  function getTodayPrice(fid) {
    if (isMarketClosedToday()) return null;
    var list = getFishPrices(fid);
    if (!list || list.length === 0) return null;
    var tIso = getTodayISO();
    return list.find(function (x) { return x.date === tIso; }) || null;
  }

  function formatPriceDate(isoDate) {
    if (!isoDate) return "";
    var parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    if (getLang() === "cz" || getLang() === "cs") {
      return parseInt(parts[2], 10) + ". " + parseInt(parts[1], 10) + ". " + parts[0];
    } else {
      return isoDate;
    }
  }

  function getLatestPrice(fid) {
    var list = getFishPrices(fid);
    if (!list || list.length === 0) return null;
    return list[0];
  }

  function updateModalCaughtBtn(fid) {
    var btn = document.getElementById("modalBtnCaught");
    if (!btn) return;
    var isCaught = caughtFishIds.has(fid);
    btn.className = "btn-caught-pill " + (isCaught ? "caught" : "");
    btn.innerHTML = isCaught ? t('modal_btn_caught_yes') : t('modal_btn_caught_no');
  }

  function toggleCaughtFromModal() {
    if (!selectedModalFishId) return;
    toggleCaughtFish(selectedModalFishId);
    updateModalCaughtBtn(selectedModalFishId);
  }

  function openPriceModal(fid) {
    selectedModalFishId = fid;
    var clubFishObj = clubFishes.find(function (x) { return x.id === fid; });
    var allFishObj = allFishes.find(function (x) { return x.id === fid; });
    if (!clubFishObj && !allFishObj) return;

    var f = Object.assign({}, allFishObj || {}, clubFishObj || {});

    var nameEl = document.getElementById("modalFishName");
    var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    if (nameEl) nameEl.innerText = fishName;

    var idBadge = document.getElementById("modalFishIdBadge");
    if (idBadge) idBadge.innerText = "#" + f.id;

    var clubTag = document.getElementById("modalFishClubTag");
    if (clubTag) {
      clubTag.innerText = t('badge_club_fish');
      clubTag.style.display = (f.is_club || f.points !== undefined) ? "inline-block" : "none";
    }

    var imgEl = document.getElementById("modalFishImg");
    if (imgEl) {
      imgEl.src = "images/fish_" + f.id + ".png";
      imgEl.onerror = function () {
        this.src = "https://play.fishao.net/data/image/fishes/fish255x85_" + f.id + "_item.png";
      };
    }

    var isNow = isFishActiveNow(f.raw_times);
    var actBadge = document.getElementById("modalFishActiveBadge");
    if (actBadge) {
      actBadge.innerText = t('time_active_now');
      actBadge.style.display = isNow ? "inline-block" : "none";
    }

    var ratingBox = document.getElementById("modalFishRatingBox");
    if (ratingBox) ratingBox.innerHTML = renderRatingBadge(f.rating);

    updateModalCaughtBtn(fid);

    // Locations and water
    var locEl = document.getElementById("modalFishLocations");
    if (locEl) {
      var waterBadge = f.water ? (f.water === 'Slaná' ? '🌊 ' + t('water_salt_full') : '🌿 ' + t('water_fresh_full')) : '';
      var locs = f.locations && f.locations.length
        ? f.locations.map(function (l) { return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l; }).join(', ')
        : (f.is_club ? (window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName('Klubový revír') : 'Klubový revír') : t('loc_unspecified'));
      locEl.innerHTML = (waterBadge ? '<strong>' + waterBadge + '</strong> • ' : '') + locs;
    }

    // Baits
    var baitsEl = document.getElementById("modalFishBaits");
    if (baitsEl) {
      baitsEl.innerHTML = f.baits && f.baits.length
        ? f.baits.map(function (b) {
          var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
          return '<span class="bait-tag">' + bName + '</span>';
        }).join('')
        : '<span style="color: var(--text-muted);">' + t('bait_unknown') + '</span>';
    }

    // Time
    var timeEl = document.getElementById("modalFishTime");
    if (timeEl) {
      var timeInfo = formatCatchTime(f.raw_times);
      timeEl.innerHTML = '<span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
        (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
        (isNow ? ' <span class="time-now-active">' + t('time_active_now_short') + '</span>' : '') +
        '</span>' + (timeInfo.sub ? ' <span style="font-size: 11px; color: var(--text-muted);">' + timeInfo.sub + '</span>' : '');
    }

    // Dimensions
    var dimEl = document.getElementById("modalFishDimensions");
    if (dimEl) {
      dimEl.innerHTML = '<span class="len-dim">' + t('dim_min', { val: f.min_l }) + '</span> • ' +
        '<strong class="len-avg" style="color: #38bdf8;">' + t('dim_avg', { val: f.avg_l }) + '</strong> • ' +
        '<span class="len-dim">' + t('dim_max', { val: f.max_l }) + '</span>';
    }

    // Club unlock status
    var clubBox = document.getElementById("modalFishClubBox");
    var clubUnlockEl = document.getElementById("modalFishClubUnlock");
    if (clubBox && clubUnlockEl) {
      var status = getUnlockStatus(f, currentClubPoints);
      if (status && (f.is_club || f.unlock_type)) {
        clubBox.style.display = "block";
        clubUnlockEl.innerHTML = '<strong style="color: #fbbf24;">' + status.costText + '</strong> (' + status.desc + ')';
      } else {
        clubBox.style.display = "none";
      }
    }

    var initialPriceDate = (new Date().getDay() === 0) ? getYesterdayISO() : getTodayISO();
    var elNewDate = document.getElementById("newPriceDate");
    if (elNewDate) elNewDate.value = initialPriceDate;
    var elNewVal = document.getElementById("newPriceValue");
    if (elNewVal) elNewVal.value = "";

    onPriceDateChange(initialPriceDate);

    var formBox = document.getElementById("priceAddFormBox");
    var loginNotice = document.getElementById("priceAddLoginNotice");
    if (formBox) formBox.style.display = currentUser ? "block" : "none";
    if (loginNotice) loginNotice.style.display = currentUser ? "none" : "block";

    renderModalHistory(fid);
    document.getElementById("priceModalOverlay").classList.add("active");
  }

  function closePriceModal() {
    document.getElementById("priceModalOverlay").classList.remove("active");
    selectedModalFishId = null;
  }

  function renderModalHistory(fid) {
    var list = getFishPrices(fid);
    var tbody = document.getElementById("modalPriceHistoryTbody");
    var locale = getLocale();

    var todayPriceEl = document.getElementById("statTodayPrice");
    var minPriceEl = document.getElementById("statMinPrice");
    var maxPriceEl = document.getElementById("statMaxPrice");

    var isSunday = isMarketClosedToday();
    var curTodayIso = getTodayISO();
    var todayEntry = isSunday ? null : list.find(function (x) { return x.date === curTodayIso; });

    if (isSunday) {
      if (todayPriceEl) {
        todayPriceEl.innerHTML = '<span style="color: #f59e0b; font-size: 13px; font-weight: 700;">🔒 ' + t('market_closed_sunday_short') + '</span>';
      }
    } else if (todayEntry) {
      if (todayPriceEl) {
        todayPriceEl.innerText = todayEntry.price.toLocaleString(locale) + " FB";
        todayPriceEl.style.color = "#34d399";
      }
    } else {
      if (todayPriceEl) {
        todayPriceEl.innerText = "--";
        todayPriceEl.style.color = "var(--text-muted)";
      }
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 15px;">' + t('price_empty_history') + '</td></tr>';
      if (minPriceEl) minPriceEl.innerText = "--";
      if (maxPriceEl) maxPriceEl.innerText = "--";
      return;
    }

    var pricesNum = list.map(function (x) { return x.price; });
    var minP = Math.min.apply(null, pricesNum);
    var maxP = Math.max.apply(null, pricesNum);

    if (minPriceEl) minPriceEl.innerText = minP.toLocaleString(locale) + " FB";
    if (maxPriceEl) maxPriceEl.innerText = maxP.toLocaleString(locale) + " FB";

    tbody.innerHTML = list.map(function (item, idx) {
      var actionHtml = isAdmin
        ? '<button class="btn-delete-price" title="' + t('price_delete_admin_title') + '" onclick="window.fishaoApp.deletePriceEntry(' + fid + ', ' + idx + ')">🗑️</button>'
        : '<span title="' + t('price_delete_locked_title') + '" style="color: var(--text-muted); font-size: 13px; cursor: default;">🔒</span>';

      var isToday = (!isSunday && item.date === curTodayIso);
      var rowStyle = isToday ? 'background: rgba(56, 189, 248, 0.08);' : '';
      var todayTag = isToday ? ' <span style="font-size: 10px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 4px; font-weight: 700;">' + t('price_today_tag') + '</span>' : '';

      return '<tr style="' + rowStyle + '">' +
        '<td style="color: #cbd5e1; font-weight: 600;">' + formatPriceDate(item.date) + todayTag + '</td>' +
        '<td style="color: #34d399; font-weight: 800;"><span class="cash-icon">💵</span> ' + item.price.toLocaleString(locale) + ' FB</td>' +
        '<td style="text-align: center;">' + actionHtml + '</td>' +
        '</tr>';
    }).join('');
  }

  function onPriceDateChange(dateVal) {
    var isSunday = isDateSunday(dateVal);
    var notice = document.getElementById("modalPriceSundayNotice");
    var formBox = document.getElementById("priceAddFormBox");
    var dateInput = document.getElementById("newPriceDate");
    var btnSubmit = document.getElementById("btnSubmitPrice");

    if (notice) notice.style.display = isSunday ? "flex" : "none";
    if (formBox) formBox.classList.toggle("sunday-blocked", isSunday);
    if (dateInput) dateInput.classList.toggle("is-sunday", isSunday);
    if (btnSubmit) {
      btnSubmit.disabled = isSunday;
      if (isSunday) {
        btnSubmit.setAttribute("title", t('modal_save_price_sunday_disabled'));
      } else {
        btnSubmit.removeAttribute("title");
      }
    }
  }

  async function submitNewPrice() {
    if (!selectedModalFishId) return;

    if (!currentUser) {
      showAuthNotice(t('auth_notice_price'));
      return;
    }

    var d = document.getElementById("newPriceDate").value;
    var p = parseInt(document.getElementById("newPriceValue").value);

    if (isDateSunday(d)) {
      alert(t('price_sunday_blocked'));
      return;
    }

    if (!d || isNaN(p) || p <= 0) {
      alert(t('price_invalid_input'));
      return;
    }

    var fidStr = selectedModalFishId.toString();
    if (!priceHistory[fidStr]) priceHistory[fidStr] = [];

    var existingIdx = priceHistory[fidStr].findIndex(function (it) { return it.date === d; });
    if (existingIdx !== -1) {
      var existingPrice = priceHistory[fidStr][existingIdx].price;
      if (!isAdmin) {
        alert(t('price_exists_non_admin', { date: d, price: existingPrice }));
        return;
      }
      if (!confirm(t('price_exists_admin_confirm', { date: d, price: existingPrice, newPrice: p }))) {
        return;
      }
      priceHistory[fidStr][existingIdx].price = p;
    } else {
      priceHistory[fidStr].unshift({ date: d, price: p });
    }

    priceHistory[fidStr].sort(function (a, b) { return b.date.localeCompare(a.date); });

    await persistPriceHistory();
    renderModalHistory(selectedModalFishId);
    applyFilters();
    document.getElementById("newPriceValue").value = "";
  }

  async function deletePriceEntry(fid, index) {
    if (!isAdmin) {
      alert(t('price_delete_non_admin'));
      return;
    }

    var fidStr = fid.toString();
    if (!priceHistory[fidStr]) return;
    if (!confirm(t('price_delete_confirm'))) return;

    priceHistory[fidStr].splice(index, 1);
    if (priceHistory[fidStr].length === 0) {
      delete priceHistory[fidStr];
    }
    await persistPriceHistory();
    renderModalHistory(fid);
    applyFilters();
  }

  // -------------------------------------------------------------
  // Bulk Import and Export
  // -------------------------------------------------------------

  function onBulkDateChange(dateVal) {
    var isSunday = isDateSunday(dateVal);
    var notice = document.getElementById("bulkSundayNotice");
    var dt = document.getElementById("bulkImportDate");
    var btn = document.getElementById("btnProcessBulk");
    var btnAdd = document.getElementById("btnBulkAddFish");

    if (notice) notice.style.display = isSunday ? "flex" : "none";
    if (dt) dt.classList.toggle("is-sunday", isSunday);
    if (btn) {
      btn.disabled = isSunday;
      if (isSunday) {
        btn.setAttribute("title", t('bulk_sunday_blocked'));
      } else {
        btn.removeAttribute("title");
      }
    }
    if (btnAdd) {
      btnAdd.disabled = isSunday;
      if (isSunday) {
        btnAdd.setAttribute("title", t('bulk_sunday_blocked'));
      } else {
        btnAdd.removeAttribute("title");
      }
    }
  }

  function openBulkModal() {
    if (!currentUser) {
      showAuthNotice(t('auth_notice_bulk'));
      return;
    }
    var initialBulkDate = (new Date().getDay() === 0) ? getYesterdayISO() : getTodayISO();
    var dt = document.getElementById("bulkImportDate");
    if (dt) dt.value = initialBulkDate;
    onBulkDateChange(initialBulkDate);

    document.getElementById("bulkModalOverlay").classList.add("active");
    document.getElementById("bulkResultMsg").style.display = "none";
    var fishInp = document.getElementById("bulkFishInput");
    var priceInp = document.getElementById("bulkFishPrice");
    var drop = document.getElementById("bulkFishSuggestions");
    if (fishInp) fishInp.value = "";
    if (priceInp) priceInp.value = "";
    if (drop) { drop.style.display = "none"; drop.innerHTML = ""; }
    setTimeout(function () {
      if (fishInp) fishInp.focus();
    }, 100);
  }

  function closeBulkModal() {
    document.getElementById("bulkModalOverlay").classList.remove("active");
    var drop = document.getElementById("bulkFishSuggestions");
    if (drop) { drop.style.display = "none"; drop.innerHTML = ""; }
  }

  var bulkSelectedSuggestionIndex = -1;
  var currentBulkSuggestions = [];

  function onBulkSearchInput(e) {
    var query = (e.target.value || "").trim();
    var drop = document.getElementById("bulkFishSuggestions");
    if (!drop) return;

    if (!query || query.length < 1) {
      drop.style.display = "none";
      drop.innerHTML = "";
      currentBulkSuggestions = [];
      bulkSelectedSuggestionIndex = -1;
      return;
    }

    var nq = normStr(query);
    var matches = [];
    var seenNames = new Set();

    for (var i = 0; i < allFishes.length; i++) {
      var f = allFishes[i];
      var nameCz = f.name || "";
      var nameEn = (window.FISHAO_I18N && window.FISHAO_I18N.translations && window.FISHAO_I18N.translations.en && window.FISHAO_I18N.translations.en.fish_names && window.FISHAO_I18N.translations.en.fish_names[f.id]) || "";
      var curName = (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name) || "";

      var normCz = normStr(nameCz);
      var normEn = normStr(nameEn);

      if (normCz.includes(nq) || (normEn && normEn.includes(nq))) {
        if (!seenNames.has(curName)) {
          seenNames.add(curName);
          var latestPr = getLatestPrice(f.id);
          matches.push({
            id: f.id,
            name: curName,
            altName: (getLang() === 'cz' ? nameEn : nameCz),
            latestPrice: latestPr ? latestPr.price : null
          });
          if (matches.length >= 8) break;
        }
      }
    }

    currentBulkSuggestions = matches;
    bulkSelectedSuggestionIndex = -1;

    if (matches.length === 0) {
      drop.innerHTML = '<div style="padding: 8px 12px; font-size: 12px; color: var(--text-muted);">' + t('bulk_no_fish_found') + '</div>';
      drop.style.display = "block";
      return;
    }

    var html = "";
    matches.forEach(function (m, idx) {
      var priceHint = m.latestPrice ? '<span class="bulk-suggestion-meta">💵 ' + m.latestPrice.toLocaleString(getLocale()) + ' FB</span>' : '';
      html += '<div class="bulk-suggestion-item" data-index="' + idx + '" onclick="window.fishaoApp.selectBulkFishSuggestion(\'' + escapeHtml(m.name).replace(/'/g, "\\'") + '\')">' +
        '<span class="bulk-suggestion-name">' + escapeHtml(m.name) + (m.altName ? ' <small style="color:var(--text-muted);font-weight:normal;">(' + escapeHtml(m.altName) + ')</small>' : '') + '</span>' +
        priceHint +
      '</div>';
    });

    drop.innerHTML = html;
    drop.style.display = "block";
  }

  function selectBulkFishSuggestion(name) {
    var input = document.getElementById("bulkFishInput");
    var drop = document.getElementById("bulkFishSuggestions");
    var priceInput = document.getElementById("bulkFishPrice");
    if (input) input.value = name;
    if (drop) {
      drop.style.display = "none";
      drop.innerHTML = "";
    }
    currentBulkSuggestions = [];
    bulkSelectedSuggestionIndex = -1;
    if (priceInput) {
      priceInput.focus();
      priceInput.select();
    }
  }

  function onBulkInputKeyDown(e) {
    var drop = document.getElementById("bulkFishSuggestions");
    if (!drop || drop.style.display === "none" || currentBulkSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        var priceInput = document.getElementById("bulkFishPrice");
        if (priceInput) priceInput.focus();
      }
      return;
    }

    var items = drop.querySelectorAll(".bulk-suggestion-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      bulkSelectedSuggestionIndex = (bulkSelectedSuggestionIndex + 1) % currentBulkSuggestions.length;
      items.forEach(function (el, idx) {
        el.classList.toggle("highlighted", idx === bulkSelectedSuggestionIndex);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      bulkSelectedSuggestionIndex = (bulkSelectedSuggestionIndex - 1 + currentBulkSuggestions.length) % currentBulkSuggestions.length;
      items.forEach(function (el, idx) {
        el.classList.toggle("highlighted", idx === bulkSelectedSuggestionIndex);
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (bulkSelectedSuggestionIndex >= 0 && bulkSelectedSuggestionIndex < currentBulkSuggestions.length) {
        selectBulkFishSuggestion(currentBulkSuggestions[bulkSelectedSuggestionIndex].name);
      } else if (currentBulkSuggestions.length > 0) {
        selectBulkFishSuggestion(currentBulkSuggestions[0].name);
      }
    } else if (e.key === "Escape") {
      drop.style.display = "none";
    }
  }

  function addFishToBulkList() {
    var dateVal = document.getElementById("bulkImportDate").value || todayISO;
    if (isDateSunday(dateVal)) {
      showToast(t('bulk_sunday_blocked'), "error");
      return;
    }

    var nameInput = document.getElementById("bulkFishInput");
    var priceInput = document.getElementById("bulkFishPrice");
    var textArea = document.getElementById("bulkInputText");
    if (!nameInput || !priceInput || !textArea) return;

    var nameVal = (nameInput.value || "").trim();
    var priceVal = (priceInput.value || "").trim();

    if (!nameVal) {
      showToast("Zadej nebo vyber název ryby.", "error");
      nameInput.focus();
      return;
    }
    if (!priceVal || isNaN(Number(priceVal)) || Number(priceVal) < 0) {
      showToast("Zadej platnou cenu ryby.", "error");
      priceInput.focus();
      return;
    }

    var newLine = nameVal + ": " + priceVal;
    if (textArea.value.trim().length > 0) {
      textArea.value = textArea.value.trimEnd() + "\n" + newLine + "\n";
    } else {
      textArea.value = newLine + "\n";
    }

    showToast("Přidáno: " + newLine, "success");
    nameInput.value = "";
    priceInput.value = "";
    var drop = document.getElementById("bulkFishSuggestions");
    if (drop) drop.style.display = "none";
    nameInput.focus();
  }

  function closeAllModals() {
    closePriceModal();
    closeBulkModal();
    closeProfileModal();
    closePlayerModal();
    resolveConfirmModal(false);
  }

  function onModalOverlayClick(e, id) {
    if (e.target.id === id) {
      if (id === 'priceModalOverlay') closePriceModal();
      if (id === 'bulkModalOverlay') closeBulkModal();
      if (id === 'profileModalOverlay') closeProfileModal();
      if (id === 'playerModalOverlay') closePlayerModal();
      if (id === 'confirmModalOverlay') resolveConfirmModal(false);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
      closeAllModals();
    }
  });

  document.addEventListener('click', function (e) {
    var drop = document.getElementById("bulkFishSuggestions");
    var input = document.getElementById("bulkFishInput");
    if (drop && drop.style.display !== "none") {
      if (!drop.contains(e.target) && e.target !== input) {
        drop.style.display = "none";
      }
    }
  });

  function normStr(s) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  async function processBulkImport() {
    if (!currentUser) {
      showAuthNotice(t('auth_notice_bulk'));
      return;
    }
    var dateVal = document.getElementById("bulkImportDate").value || todayISO;
    var text = document.getElementById("bulkInputText").value.trim();
    var resEl = document.getElementById("bulkResultMsg");

    if (isDateSunday(dateVal)) {
      resEl.style.display = "block";
      resEl.style.background = "rgba(239,68,68,0.2)";
      resEl.style.color = "#f87171";
      resEl.innerText = t('bulk_sunday_blocked');
      return;
    }

    if (!text) {
      resEl.style.display = "block";
      resEl.style.background = "rgba(239,68,68,0.2)";
      resEl.style.color = "#f87171";
      resEl.innerText = t('bulk_empty_error');
      return;
    }

    // Index both Czech and English fish names so bulk import works in any active language
    var nameToFish = new Map();
    for (var i = 0; i < allFishes.length; i++) {
      var f = allFishes[i];
      nameToFish.set(normStr(f.name), f);
      if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function') {
        var prevLang = window.FISHAO_I18N.currentLang;
        window.FISHAO_I18N.currentLang = 'en';
        var enName = window.FISHAO_I18N.getFishName(f);
        window.FISHAO_I18N.currentLang = 'cs';
        var csName = window.FISHAO_I18N.getFishName(f);
        window.FISHAO_I18N.currentLang = prevLang;
        if (enName) nameToFish.set(normStr(enName), f);
        if (csName) nameToFish.set(normStr(csName), f);
      }
    }

    var matched = 0;
    var skipped = 0;
    var lines = text.split(/\r?\n/);

    for (var li = 0; li < lines.length; li++) {
      var l = lines[li].trim();
      if (!l) continue;

      var fishName = "";
      var priceNum = 0;

      if (l.includes(":")) {
        var parts = l.split(":");
        fishName = parts[0].trim();
        var match = parts[1].match(/\d+/);
        if (match) priceNum = parseInt(match[0]);
      } else {
        var match2 = l.match(/^(.*?)\s+(\d+)\s*(?:fb|fishbuck|fishbucks|fishmena|fishměna|dolar|dolary|\$|minc|coins|kc|b)?$/i);
        if (match2) {
          fishName = match2[1].trim();
          priceNum = parseInt(match2[2]);
        }
      }

      if (!fishName || !priceNum) {
        skipped++;
        continue;
      }

      var n = normStr(fishName);
      var targetFish = nameToFish.get(n);
      if (targetFish) {
        var fidStr = targetFish.id.toString();
        if (!priceHistory[fidStr]) priceHistory[fidStr] = [];

        var existingDateIdx = priceHistory[fidStr].findIndex(function (x) { return x.date === dateVal; });
        if (existingDateIdx !== -1) {
          if (isAdmin) {
            priceHistory[fidStr][existingDateIdx].price = priceNum;
            matched++;
          } else {
            skipped++;
          }
        } else {
          priceHistory[fidStr].unshift({ date: dateVal, price: priceNum });
          priceHistory[fidStr].sort(function (a, b) { return b.date.localeCompare(a.date); });
          matched++;
        }
      } else {
        skipped++;
      }
    }

    await persistPriceHistory();
    applyFilters();

    resEl.style.display = "block";
    resEl.style.background = "rgba(16,185,129,0.2)";
    resEl.style.color = "#34d399";
    var skippedPart = skipped > 0 ? t('bulk_result_skipped', { skipped: skipped }) : "";
    resEl.innerText = t('bulk_result_msg', { matched: matched, date: dateVal, skippedPart: skippedPart });
  }

  function exportPricesJson() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(priceHistory, null, 2));
    var a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "fishao_prices_" + todayISO + ".json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function resetPriceHistoryToDefault() {
    if (!isAdmin) {
      alert(t('reset_prices_non_admin'));
      return;
    }
    if (!confirm(t('reset_prices_confirm'))) return;
    priceHistory = JSON.parse(JSON.stringify(initialPrices));
    await persistPriceHistory();
    applyFilters();
    var resEl = document.getElementById("bulkResultMsg");
    if (resEl) {
      resEl.style.display = "block";
      resEl.style.background = "rgba(56,189,248,0.2)";
      resEl.style.color = "#38bdf8";
      resEl.innerText = t('reset_prices_done');
    }
  }

  // -------------------------------------------------------------
  // Mission Size Input Handlers
  // -------------------------------------------------------------

  function onRangeSizeInput() {
    document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });
    applyFilters();
  }

  function onExactSizeInput() {
    applyFilters();
  }

  function setSizeFilter(min, exact, max, btn) {
    var minEl = document.getElementById("minSizeInput");
    var maxEl = document.getElementById("maxSizeInput");

    var isAlreadyActive = btn && btn.classList.contains("active");

    document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });

    if (isAlreadyActive) {
      if (minEl) minEl.value = "";
      if (maxEl) maxEl.value = "";
    } else {
      if (minEl) minEl.value = (min !== null && min !== undefined) ? min : "";
      if (maxEl) maxEl.value = (max !== null && max !== undefined) ? max : "";
      if (btn) btn.classList.add("active");
    }

    applyFilters();
  }

  function toggleOnlyPrice() {
    filterOnlyPrice = !filterOnlyPrice;
    document.getElementById("btnOnlyPrice").classList.toggle("active", filterOnlyPrice);
    applyFilters();
  }

  function toggleNowActive() {
    filterNowActive = !filterNowActive;
    document.getElementById("btnNow").classList.toggle("active", filterNowActive);
    document.getElementById("timeFilter").value = filterNowActive ? "now" : "";
    applyFilters();
  }

  function getUnlockStatus(fish, userPoints) {
    if (!fish) return { isUnlocked: false, costText: "", desc: "" };
    // If fish is missing unlock_type (e.g. general instance), look it up in clubFishes
    if (!fish.unlock_type && clubFishes) {
      var cf = clubFishes.find(function (x) { return x.id === fish.id; });
      if (cf) fish = Object.assign({}, fish, cf);
    }
    if (fish.unlock_type === 'points' && fish.points !== undefined && fish.points !== null) {
      var required = fish.points;
      var diff = required - userPoints;
      var isUnlocked = diff <= 0;
      return {
        isUnlocked: isUnlocked,
        costText: required + " " + t('unit_pts'),
        desc: isUnlocked ? t('unlock_unlocked') : t('unlock_needs_pts', { diff: diff })
      };
    } else if (fish.unlock_type === 'fc') {
      var isFcClub = currentClubUnlockedFcFishIds.has(fish.id);
      return {
        isUnlocked: isFcClub,
        costText: "🪙 " + (fish.fc || 0) + " FC",
        desc: isFcClub ? t('unlock_club_fc_unlocked') : t('unlock_requires_fc')
      };
    } else if (fish.unlock_type === 'monster') {
      var isMonsterClub = currentClubUnlockedMonsterIds.has(fish.id);
      return {
        isUnlocked: isMonsterClub,
        costText: "👾 " + t('unlock_monster'),
        desc: isMonsterClub ? t('unlock_club_monster_unlocked') : t('unlock_club_monster')
      };
    }
    return {
      isUnlocked: true,
      costText: "",
      desc: ""
    };
  }

  function renderRatingBadge(r) {
    var ratingNum = Math.max(1, Math.min(5, parseInt(r) || 1));
    var filledStars = "★".repeat(ratingNum);
    var emptyStars = "★".repeat(5 - ratingNum);
    return '<span class="rating-badge rate-' + ratingNum + '" title="' + t('rating_title', { rating: ratingNum }) + '">' +
      '<span class="rating-num">' + ratingNum + '★</span>' +
      '<span class="rating-stars-track">' +
      '<span class="stars-active">' + filledStars + '</span>' +
      '<span class="stars-inactive">' + emptyStars + '</span>' +
      '</span>' +
      '</span>';
  }

  var collectionFilterMode = 'all';
  var currentMilestoneFilter = 'all';

  function setCollectionFilter(mode, btn) {
    if (mode !== 'all' && !currentUser) {
      showAuthNotice(t('coll_gate_title', 'Sbírka úlovků vyžaduje přihlášení.'));
      return;
    }
    collectionFilterMode = mode;
    document.querySelectorAll("#bannerCollection .pill-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    if (btn) btn.classList.add("active");
    applyFilters();
  }

  function filterMilestones(filter, btn) {
    currentMilestoneFilter = filter;
    document.querySelectorAll(".roadmap-header-filters .pill-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    if (btn) btn.classList.add("active");
    renderClubMilestones();
  }

  function renderClubMilestones() {
    var grid = document.getElementById("milestoneGrid");
    var nextCard = document.getElementById("nextMilestoneCard");
    var managePtsUnlocked = document.getElementById("managePointsUnlocked");
    var manageCaughtClub = document.getElementById("manageCaughtClub");
    var manageProgressFill = document.getElementById("manageProgressFill");

    var ptsInput = document.getElementById("clubPointsManageInput");
    if (ptsInput) ptsInput.value = currentClubPoints;
    var nameInput = document.getElementById("clubNameManageInput");
    if (nameInput) nameInput.value = currentClubName;

    var sorted = clubFishes.slice().sort(function (a, b) {
      if (a.unlock_type === 'points' && b.unlock_type === 'points') {
        return (a.points || 0) - (b.points || 0);
      }
      if (a.unlock_type === 'points') return -1;
      if (b.unlock_type === 'points') return 1;
      return (a.order || 0) - (b.order || 0);
    });

    var unlockedPointsCount = 0;
    var totalPointsFish = 0;
    var caughtClubCount = 0;
    var nextFish = null;
    var minDiff = Infinity;

    sorted.forEach(function (f) {
      if (f.unlock_type === 'points') {
        totalPointsFish++;
        if (currentClubPoints >= f.points) {
          unlockedPointsCount++;
        } else {
          var diff = f.points - currentClubPoints;
          if (diff < minDiff) {
            minDiff = diff;
            nextFish = f;
          }
        }
      }
      if (caughtFishIds.has(f.id)) caughtClubCount++;
    });

    if (managePtsUnlocked) {
      managePtsUnlocked.innerText = t('status_fish_count', { unlocked: unlockedPointsCount, total: totalPointsFish });
    }
    if (manageCaughtClub) {
      manageCaughtClub.innerText = t('status_caught_count', { caught: caughtClubCount, total: clubFishes.length });
    }
    if (manageProgressFill) {
      var pct = clubFishes.length > 0 ? (caughtClubCount / clubFishes.length * 100) : 0;
      manageProgressFill.style.width = pct.toFixed(1) + "%";
    }

    if (nextCard) {
      if (nextFish) {
        var prevPoints = 0;
        var pIdx = sorted.findIndex(function (x) { return x.id === nextFish.id; });
        if (pIdx > 0 && sorted[pIdx - 1].unlock_type === 'points') {
          prevPoints = sorted[pIdx - 1].points;
        }
        var span = nextFish.points - prevPoints;
        var currentSpan = Math.max(0, currentClubPoints - prevPoints);
        var targetPct = span > 0 ? Math.min(100, (currentSpan / span * 100)) : 0;
        var nextFishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(nextFish) : nextFish.name;
        var nextWater = nextFish.water === 'Slaná' ? ('🌊 ' + t('water_salt_short')) : ('🌿 ' + t('water_fresh_short'));
        var nextBaits = nextFish.baits ? nextFish.baits.map(function (b) { return window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b; }).join(', ') : '';

        nextCard.innerHTML =
          '<div class="dash-card-header">' +
          '<span class="dash-card-title" style="color: #fbbf24;">' + t('milestone_next_title') + '</span>' +
          '<span class="dash-stat-badge" style="color: #fbbf24; border-color: rgba(245,158,11,0.3);">' + nextFish.points + ' ' + t('unit_pts') + '</span>' +
          '</div>' +
          '<div class="dash-card-body">' +
          '<div class="milestone-fish-row" style="margin-top: 4px;">' +
          '<div class="milestone-fish-img-box" style="width: 70px; height: 46px;">' +
          '<img src="images/fish_' + nextFish.id + '.png" class="milestone-fish-img" alt="' + nextFishName + '" onerror="this.src=\'images/default-fish.png\'">' +
          '</div>' +
          '<div class="milestone-fish-info">' +
          '<div class="milestone-fish-name" style="font-size: 14px;">' + nextFishName + '</div>' +
          '<div class="milestone-fish-meta">' + nextWater + ' • ' + renderRatingBadge(nextFish.rating) + ' • ' + nextBaits + '</div>' +
          '<div style="font-size: 11px; color: #f87171; font-weight: 700; margin-top: 2px;">' + t('milestone_remaining_pts', { diff: minDiff }) + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="caught-progress-track" style="margin-top: 8px;" title="' + t('milestone_progress_title', { pct: targetPct.toFixed(0) }) + '">' +
          '<div class="caught-progress-fill" style="width: ' + targetPct.toFixed(1) + '%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>' +
          '</div>' +
          '</div>';
      } else {
        nextCard.innerHTML =
          '<div class="dash-card-header">' +
          '<span class="dash-card-title" style="color: #34d399;">' + t('milestone_all_title') + '</span>' +
          '</div>' +
          '<div class="dash-card-body" style="text-align: center; padding: 16px;">' +
          '<div style="font-size: 32px;">🏆</div>' +
          '<div style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 4px;">' + t('milestone_all_desc') + '</div>' +
          '<div style="font-size: 12px; color: var(--text-muted);">' + t('milestone_all_congrats', { pts: currentClubPoints }) + '</div>' +
          '</div>';
      }
    }

    if (!grid) return;

    var filteredCards = sorted.filter(function (f) {
      var isUnlocked = false;
      if (f.unlock_type === 'points') {
        isUnlocked = currentClubPoints >= f.points;
      } else if (f.unlock_type === 'fc') {
        isUnlocked = currentClubUnlockedFcFishIds.has(f.id);
      } else if (f.unlock_type === 'monster') {
        isUnlocked = currentClubUnlockedMonsterIds.has(f.id);
      }
      if (currentMilestoneFilter === 'unlocked') return isUnlocked;
      if (currentMilestoneFilter === 'locked') return !isUnlocked;
      if (currentMilestoneFilter === 'fc') return f.unlock_type !== 'points';
      return true;
    });

    grid.innerHTML = filteredCards.map(function (f) {
      var isUnlocked = false;
      var statusClass = "";
      var statusText = "";
      var costBadge = "";

      if (f.unlock_type === 'points') {
        var diff = f.points - currentClubPoints;
        isUnlocked = diff <= 0;
        statusClass = isUnlocked ? "unlocked" : "locked";
        statusText = isUnlocked ? t('unlock_unlocked') : t('unlock_needs_pts_short', { diff: diff });
        costBadge = f.points + " " + t('unit_pts');
      } else if (f.unlock_type === 'fc') {
        isUnlocked = currentClubUnlockedFcFishIds.has(f.id);
        statusClass = isUnlocked ? "unlocked" : "fc";
        statusText = isUnlocked ? t('special_status_unlocked') : ("🪙 " + t('unlock_fc_badge'));
        costBadge = "🪙 " + (f.fc || "") + " FC";
      } else {
        isUnlocked = currentClubUnlockedMonsterIds.has(f.id);
        statusClass = isUnlocked ? "unlocked" : "monster";
        statusText = isUnlocked ? t('special_status_unlocked') : t('unlock_monster_badge');
        costBadge = t('unlock_club_short');
      }

      var isCaught = caughtFishIds.has(f.id);
      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      var waterLabel = f.water === 'Slaná' ? ('🌊 ' + t('water_salt_short')) : ('🌿 ' + t('water_fresh_short'));
      var baitsLabel = f.baits ? f.baits.map(function (b) { return window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b; }).join(', ') : '';

      return '<div class="milestone-card ' + (isUnlocked ? 'unlocked' : 'locked') + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" style="cursor: pointer;">' +
        '<div class="milestone-card-top">' +
        '<span class="milestone-status ' + statusClass + '">' + statusText + '</span>' +
        '<span class="milestone-cost-badge">' + costBadge + '</span>' +
        '</div>' +
        '<div class="milestone-fish-row">' +
        '<div class="milestone-fish-img-box">' +
        '<img src="images/fish_' + f.id + '.png" class="milestone-fish-img" alt="' + fishName + '" onerror="this.src=\'images/default-fish.png\'">' +
        '</div>' +
        '<div class="milestone-fish-info">' +
        '<div class="milestone-fish-name" title="' + fishName + '">' + fishName + '</div>' +
        '<div class="milestone-fish-meta">' + waterLabel + ' • ' + renderRatingBadge(f.rating) + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="milestone-card-footer">' +
        '<span style="font-size: 11px; color: var(--text-muted);">' + baitsLabel + '</span>' +
        '<button class="btn-caught-milestone ' + (isCaught ? 'caught' : '') + '" onclick="event.stopPropagation(); window.fishaoApp.toggleCaughtFish(' + f.id + ')">' +
        (isCaught ? t('btn_caught_short') : t('btn_catch_short')) +
        '</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function switchView(view) {
    var isInClub = !!(currentUser && currentClubId);
    if (view === "club" && !isInClub) {
      view = "all";
    }
    currentView = view;

    var tabs = ["tabClub", "tabAll", "tabClubManage", "tabMarket"];
    var tabMap = {
      "club": "tabClub",
      "all": "tabAll",
      "club_manage": "tabClubManage",
      "market": "tabMarket"
    };

    tabs.forEach(function (tId) {
      var el = document.getElementById(tId);
      if (el) el.classList.toggle("active", tabMap[view] === tId);
    });

    var bClub = document.getElementById("bannerClub");
    var bCollection = document.getElementById("bannerCollection");
    var bMarket = document.getElementById("bannerMarket");
    var secManage = document.getElementById("sectionClubManage");
    var secTable = document.getElementById("sectionFishTable");
    var filterCard = document.getElementById("filterCard");
    var gateClub = document.getElementById("gateClubManage");
    var manageContent = document.getElementById("manageClubContent");

    if (bClub) bClub.style.display = (view === "club") ? "flex" : "none";
    if (bCollection) bCollection.style.display = (view === "all") ? "flex" : "none";
    if (bMarket) bMarket.style.display = (view === "market") ? "flex" : "none";

    updateMarketTabStatus();

    if (view === "club_manage") {
      if (secManage) secManage.style.display = "block";
      if (secTable) secTable.style.display = "none";

      if (!currentUser) {
        if (gateClub) gateClub.style.display = "block";
        if (manageContent) manageContent.style.display = "none";
      } else {
        if (gateClub) gateClub.style.display = "none";
        if (manageContent) manageContent.style.display = "block";
        updateAuthUI();
        renderClubMilestones();
        renderClubSpecialFishes();
        updateCaughtStats();
      }
      return;
    } else {
      if (secManage) secManage.style.display = "none";
      if (secTable) secTable.style.display = "block";
      if (filterCard) filterCard.style.display = "flex";
    }

    var waterFilterGroup = document.getElementById("waterFilterGroup");
    var locationFilterGroup = document.getElementById("locationFilterGroup");
    var missionSizeRow = document.getElementById("missionSizeRow");

    if (waterFilterGroup) waterFilterGroup.style.display = (view === "club") ? "flex" : "none";
    if (locationFilterGroup) locationFilterGroup.style.display = (view !== "club") ? "flex" : "none";
    if (missionSizeRow) missionSizeRow.style.display = (view === "all") ? "flex" : "none";

    // Reset filters completely when switching tabs
    resetFilters();
    updateCaughtStats();
  }

  function updateMarketTabStatus() {
    var pill = document.getElementById("tabMarketPill");
    var isSunday = isMarketClosedToday();
    if (pill) {
      if (isSunday) {
        pill.innerHTML = '🔒 ' + t('market_closed_tag');
        pill.classList.add("pill-closed");
        pill.setAttribute("title", t('market_closed_sunday_tooltip'));
      } else {
        pill.innerText = t('nav_market_pill');
        pill.classList.remove("pill-closed");
        pill.removeAttribute("title");
      }
    }

    var bannerSunday = document.getElementById("bannerMarketSunday");
    if (bannerSunday) {
      bannerSunday.style.display = (currentView === "market" && isSunday) ? "flex" : "none";
    }

    var marketSummary = document.getElementById("marketStatsSummary");
    if (marketSummary) {
      var priceCount = Object.keys(priceHistory).length;
      var summaryText = t('market_recorded_prices', { count: priceCount });
      if (isSunday) {
        summaryText += ' • ' + t('market_closed_sunday_short');
      }
      marketSummary.innerText = summaryText;
    }
  }

  function renderTableHead() {
    var thead = document.getElementById("tableHead");
    if (!thead) return;
    var caughtCol = '<th style="width: 44px; text-align: center;" title="' + t('col_caught_title') + '">✓</th>';
    var isSunday = isMarketClosedToday();
    var priceColHtml = '<th>' + t('col_price') + (isSunday ? ' <span class="th-sunday-closed-pill" title="' + t('market_closed_sunday_tooltip') + '">🔒 ' + t('market_closed_tag') + '</span>' : '') + '</th>';

    if (currentView === "club") {
      thead.innerHTML =
        '<tr>' +
        '<th style="width: 48px;">#</th>' +
        caughtCol +
        '<th style="width: 95px;">' + t('col_appearance') + '</th>' +
        '<th>' + t('col_water') + '</th>' +
        '<th>' + t('col_fish') + '</th>' +
        '<th>' + t('col_rarity') + '</th>' +
        priceColHtml +
        '<th>' + t('col_baits') + '</th>' +
        '<th>' + t('col_time') + '</th>' +
        '<th>' + t('col_size') + '</th>' +
        '<th style="min-width: 140px;">' + t('col_unlock') + '</th>' +
        '</tr>';
    } else {
      thead.innerHTML =
        '<tr>' +
        '<th style="width: 48px;">#</th>' +
        caughtCol +
        '<th style="width: 95px;">' + t('col_appearance') + '</th>' +
        '<th>' + t('col_fish') + '</th>' +
        '<th>' + t('col_rarity') + '</th>' +
        priceColHtml +
        '<th>' + t('col_loc') + '</th>' +
        '<th>' + t('col_baits') + '</th>' +
        '<th>' + t('col_time') + '</th>' +
        '<th>' + t('col_size') + '</th>' +
        '</tr>';
    }
  }

  function renderPriceCell(fid) {
    var isSunday = isMarketClosedToday();
    var todayEntry = getTodayPrice(fid);
    var latest = getLatestPrice(fid);
    var list = getFishPrices(fid);
    var locale = getLocale();
    var histCount = list.length > 1 ? '<span class="price-history-count" title="' + t('price_history_count_title') + '">' + list.length + 'x</span>' : "";

    if (isSunday) {
      if (latest) {
        var dateFormatted = formatPriceDate(latest.date);
        var titleText = t('price_cell_sunday_title', { price: latest.price.toLocaleString(locale), date: dateFormatted });
        return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + titleText + '">' +
          '<span class="price-badge price-closed"><span class="price-closed-icon">🔒</span> ' +
          '<span class="price-closed-label">' + t('market_closed_tag') + '</span> ' +
          '<span class="price-past-sub">(' + t('price_last_prefix') + ' ' + latest.price.toLocaleString(locale) + ' FB)</span>' +
          histCount + '</span></div>';
      } else {
        return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + t('market_closed_notice') + '">' +
          '<span class="price-empty price-closed-empty"><span class="price-closed-icon">🔒</span> ' + t('market_closed_tag') + '</span></div>';
      }
    }

    if (todayEntry) {
      var todayTitle = t('price_cell_today_active_title', { price: todayEntry.price.toLocaleString(locale) });
      return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + todayTitle + '">' +
        '<span class="price-badge price-today"><span class="cash-icon">💵</span> ' +
        todayEntry.price.toLocaleString(locale) + ' FB ' +
        '<span class="badge-today-pill">' + t('price_today_tag') + '</span>' +
        histCount + '</span></div>';
    } else if (latest) {
      var dateFormatted = formatPriceDate(latest.date);
      var pastTitle = t('price_cell_past_title', { price: latest.price.toLocaleString(locale), date: dateFormatted });
      return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + pastTitle + '">' +
        '<span class="price-badge price-past"><span class="price-past-dash">--</span> ' +
        '<span class="price-past-sub">(' + t('price_last_prefix') + ' ' + latest.price.toLocaleString(locale) + ' FB)</span>' +
        histCount + '</span></div>';
    } else {
      return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + t('price_cell_add_title') + '">' +
        '<span class="price-empty">+ ' + t('price_add_btn') + '</span></div>';
    }
  }

  function renderCaughtBtn(fishId) {
    var isCaught = caughtFishIds.has(fishId);
    var title = !currentUser
      ? t('auth_notice_collection')
      : (isCaught ? t('caught_btn_unmarked_title') : t('caught_btn_mark_title'));
    return '<button class="caught-btn' + (isCaught ? ' caught' : '') + '" onclick="event.stopPropagation(); window.fishaoApp.toggleCaughtFish(' + fishId + ')" title="' + title + '">' +
      (isCaught ? '✓' : '') + '</button>';
  }

  function renderTableBody(data) {
    var tbody = document.getElementById("tableBody");
    var total = currentView === "club" ? clubFishes.length : allFishes.length;

    if (data.length === 0) {
      var colCount = currentView === "club" ? 11 : 10;
      tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="empty-state">' + t('table_empty_state') + '</td></tr>';
      document.getElementById("counter").innerText = t('counter_showing', { shown: 0, total: total });
      return;
    }

    var rowClickTitle = t('price_cell_detail_title');
    var activeNowLabel = t('time_active_now_short');

    if (currentView === "club") {
      tbody.innerHTML = data.map(function (f) {
        var isNow = isFishActiveNow(f.raw_times);
        var timeInfo = formatCatchTime(f.raw_times);
        var unlock = getUnlockStatus(f, currentClubPoints);
        var rowClass = [];
        if (!unlock.isUnlocked) rowClass.push("row-locked");
        if (caughtFishIds.has(f.id)) rowClass.push("row-caught");

        var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
        var waterLabel = f.water === 'Slaná' ? ('🌊 ' + t('water_salt_short')) : ('🌿 ' + t('water_fresh_short'));

        return '<tr class="' + rowClass.join(' ') + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" title="' + rowClickTitle + '">' +
          '<td style="color: var(--text-muted); font-weight: 600;">' + f.order + '</td>' +
          '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
          '<td><div class="fish-img-box"><img src="images/fish_' + f.id + '.png" alt="' + fishName + '" class="fish-img" onerror="this.src=\'https://play.fishao.net/data/image/fishes/fish255x85_' + f.id + '_item.png\'"></div></td>' +
          '<td><span class="badge ' + (f.water === 'Slaná' ? 'badge-salt' : 'badge-fresh') + '">' + waterLabel + '</span></td>' +
          '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + fishName + '</div></td>' +
          '<td>' + renderRatingBadge(f.rating) + '</td>' +
          '<td>' + renderPriceCell(f.id) + '</td>' +
          '<td>' + f.baits.map(function (b) {
            var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
            return '<span class="bait-tag">' + bName + '</span>';
          }).join('') + '</td>' +
          '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
          (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
          (isNow ? '<span class="time-now-active">' + activeNowLabel + '</span>' : '') +
          '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') + '</div></td>' +
          '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
          '<td><div class="' + (unlock.isUnlocked ? 'status-unlocked' : 'status-locked') + '"><span class="status-cost">' + unlock.costText + '</span><span class="status-desc">' + unlock.desc + '</span></div></td>' +
          '</tr>';
      }).join('');
    } else {
      var clubTagText = t('badge_club_fish');
      var unspecText = t('loc_unspecified');

      tbody.innerHTML = data.map(function (f, idx) {
        var isNow = isFishActiveNow(f.raw_times);
        var timeInfo = formatCatchTime(f.raw_times);
        var rowClass = caughtFishIds.has(f.id) ? "row-caught" : "";
        var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;

        return '<tr class="' + rowClass + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" title="' + rowClickTitle + '">' +
          '<td style="color: var(--text-muted); font-weight: 600;">' + (idx + 1) + '</td>' +
          '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
          '<td><div class="fish-img-box"><img src="images/fish_' + f.id + '.png" alt="' + fishName + '" class="fish-img" onerror="this.src=\'https://play.fishao.net/data/image/fishes/fish255x85_' + f.id + '_item.png\'"></div></td>' +
          '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + fishName +
          (f.is_club ? '<span class="badge-club-tag">' + clubTagText + '</span>' : '') +
          '</div></td>' +
          '<td>' + renderRatingBadge(f.rating) + '</td>' +
          '<td>' + renderPriceCell(f.id) + '</td>' +
          '<td style="max-width: 250px;">' +
          (f.locations.length ? f.locations.map(function (loc) {
            var locName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(loc) : loc;
            return '<span class="loc-tag">' + locName + '</span>';
          }).join('') : '<span style="color:var(--text-muted); font-size:12px;">' + unspecText + '</span>') +
          '</td>' +
          '<td>' + f.baits.map(function (b) {
            var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
            return '<span class="bait-tag">' + bName + '</span>';
          }).join('') + '</td>' +
          '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
          (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
          (isNow ? '<span class="time-now-active">' + activeNowLabel + '</span>' : '') +
          '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') + '</div></td>' +
          '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
          '</tr>';
      }).join('');
    }

    document.getElementById("counter").innerText = t('counter_showing', { shown: data.length, total: total });
  }

  function updateClubStats() {
    var hideLocked = document.getElementById("hideLockedCheckbox").checked;
    localStorage.setItem('fishao_hide_locked', hideLocked);

    var unlockedCount = 0;
    var nextFish = null;
    var minDiff = Infinity;

    for (var i = 0; i < clubFishes.length; i++) {
      var f = clubFishes[i];
      var status = getUnlockStatus(f, currentClubPoints);
      if (status.isUnlocked) {
        unlockedCount++;
      } else if (f.unlock_type === 'points' && f.points > currentClubPoints) {
        var diff = f.points - currentClubPoints;
        if (diff < minDiff) {
          minDiff = diff;
          nextFish = f;
        }
      }
    }

    var unlockedCountEl = document.getElementById("unlockedCount");
    if (unlockedCountEl) unlockedCountEl.innerText = unlockedCount;

    var tabClubBadge = document.getElementById("tabClubBadge");
    if (tabClubBadge) tabClubBadge.innerText = unlockedCount + " / 80";

    var lockedCount = 80 - unlockedCount;
    var lockedNoticeEl = document.getElementById("lockedNotice");
    if (lockedNoticeEl) {
      lockedNoticeEl.innerText = lockedCount > 0 ? t('club_locked_count', { count: lockedCount }) : "";
    }

    var hintEl = document.getElementById("nextUnlockHint");
    if (hintEl) {
      if (nextFish) {
        var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(nextFish) : nextFish.name;
        var waterName = window.FISHAO_I18N ? window.FISHAO_I18N.getWaterName(nextFish.water) : nextFish.water;
        hintEl.innerHTML = t('club_next_hint', {
          name: fishName,
          water: waterName,
          points: nextFish.points,
          diff: minDiff
        });
      } else {
        hintEl.innerHTML = t('club_all_unlocked_hint');
      }
    }
  }

  // -------------------------------------------------------------
  // Filter Application
  // -------------------------------------------------------------

  function applyFilters() {
    updateClubStats();

    var q = document.getElementById("search").value.trim().toLowerCase();
    var bait = document.getElementById("baitFilter").value;
    var rating = document.getElementById("ratingFilter").value;
    var water = document.getElementById("waterFilter").value;
    var location = document.getElementById("locationFilter").value;
    var timeVal = document.getElementById("timeFilter").value;
    var sortBy = document.getElementById("sortBy").value;
    var hideLocked = document.getElementById("hideLockedCheckbox").checked;
    var filterUncaught = document.getElementById("filterUncaughtCheckbox") ? document.getElementById("filterUncaughtCheckbox").checked : false;

    var minEl = document.getElementById("minSizeInput");
    var maxEl = document.getElementById("maxSizeInput");
    var minSize = minEl && minEl.value !== "" ? parseFloat(minEl.value) : NaN;
    var maxSize = maxEl && maxEl.value !== "" ? parseFloat(maxEl.value) : NaN;

    filterNowActive = (timeVal === "now");
    document.getElementById("btnNow").classList.toggle("active", filterNowActive);

    var dataset = currentView === "club" ? clubFishes : allFishes;

    var filtered = dataset.filter(function (f) {
      if (currentView === "club") {
        if (hideLocked) {
          var status = getUnlockStatus(f, currentClubPoints);
          if (!status.isUnlocked) return false;
        }
      }

      var localizedName = (window.FISHAO_I18N && window.FISHAO_I18N.getFishName) ? window.FISHAO_I18N.getFishName(f).toLowerCase() : '';
      if (q && !f.name.toLowerCase().includes(q) && !localizedName.includes(q)) return false;

      if (bait && !f.baits.includes(bait)) return false;

      if (rating) {
        if (rating === "min3" && f.rating < 3) return false;
        if (rating === "min4" && f.rating < 4) return false;
        if (rating.match(/^\d$/) && f.rating !== parseInt(rating)) return false;
      }

      if (currentView === "club" && water && f.water !== water) return false;
      if (currentView === "all" && location && !f.locations.includes(location)) return false;

      if (!isNaN(minSize) && f.max_l < minSize) return false;
      if (!isNaN(maxSize) && f.min_l > maxSize) return false;

      if (timeVal === "now") {
        if (!isFishActiveNow(f.raw_times)) return false;
      } else if (timeVal === "night") {
        if (!f.is_night) return false;
      } else if (timeVal === "day") {
        if (f.is_night) return false;
      } else if (timeVal === "morning") {
        if (!isFishActiveAtLocalHour(f.raw_times, 9)) return false;
      } else if (timeVal === "afternoon") {
        if (!isFishActiveAtLocalHour(f.raw_times, 15)) return false;
      } else if (timeVal === "evening") {
        if (!isFishActiveAtLocalHour(f.raw_times, 21)) return false;
      } else if (timeVal === "deepnight") {
        if (!isFishActiveAtLocalHour(f.raw_times, 3)) return false;
      }

      if (filterOnlyPrice) {
        var latest = getLatestPrice(f.id);
        if (!latest) return false;
      }

      if (filterUncaught && caughtFishIds.has(f.id)) return false;

      if (currentView === "collection" || currentView === "all") {
        if (collectionFilterMode === "caught" && !caughtFishIds.has(f.id)) return false;
        if (collectionFilterMode === "missing" && caughtFishIds.has(f.id)) return false;
      }

      return true;
    });

    // Sorting (fixed option keys alignment)
    var curLang = getLang();
    if (sortBy === "today_price_desc") {
      filtered.sort(function (a, b) {
        var pa = (getTodayPrice(a.id) || {}).price || 0;
        var pb = (getTodayPrice(b.id) || {}).price || 0;
        return pb - pa || b.rating - a.rating;
      });
    } else if (sortBy === "price_desc") {
      filtered.sort(function (a, b) {
        var pa = (getLatestPrice(a.id) || {}).price || 0;
        var pb = (getLatestPrice(b.id) || {}).price || 0;
        return pb - pa || b.rating - a.rating;
      });
    } else if (sortBy === "price_asc") {
      filtered.sort(function (a, b) {
        var pa = (getLatestPrice(a.id) || {}).price || 999999;
        var pb = (getLatestPrice(b.id) || {}).price || 999999;
        return pa - pb || b.rating - a.rating;
      });
    } else if (sortBy === "name_asc") {
      filtered.sort(function (a, b) {
        var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
        var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
        return nameA.localeCompare(nameB, curLang);
      });
    } else if (sortBy === "name_desc") {
      filtered.sort(function (a, b) {
        var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
        var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
        return nameB.localeCompare(nameA, curLang);
      });
    } else if (sortBy === "rating_desc") {
      filtered.sort(function (a, b) { return b.rating - a.rating || b.avg_l - a.avg_l; });
    } else if (sortBy === "rating_asc") {
      filtered.sort(function (a, b) { return a.rating - b.rating || a.avg_l - b.avg_l; });
    } else if (sortBy === "avg_desc") {
      filtered.sort(function (a, b) { return b.avg_l - a.avg_l; });
    } else if (sortBy === "avg_asc") {
      filtered.sort(function (a, b) { return a.avg_l - b.avg_l; });
    } else if (sortBy === "max_desc" || sortBy === "length_desc") {
      filtered.sort(function (a, b) { return b.max_l - a.max_l; });
    } else if (sortBy === "max_asc" || sortBy === "length_asc") {
      filtered.sort(function (a, b) { return a.max_l - b.max_l; });
    } else if (sortBy === "points_desc" && currentView === "club") {
      filtered.sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
    } else if (sortBy === "points_asc" && currentView === "club") {
      filtered.sort(function (a, b) { return (a.points || 999999) - (b.points || 999999); });
    } else {
      filtered.sort(function (a, b) {
        var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
        var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
        return nameA.localeCompare(nameB, curLang);
      });
    }

    // Localized active filter summary
    var filterNotes = [];
    if (currentView === "club" && hideLocked) filterNotes.push(t('filter_note_unlocked'));
    if (filterOnlyPrice) {
      if (isMarketClosedToday()) {
        filterNotes.push(t('filter_note_priced_sunday'));
      } else {
        filterNotes.push(t('filter_note_priced'));
      }
    }
    if (filterUncaught) filterNotes.push(t('filter_note_uncaught'));

    if (!isNaN(minSize) && !isNaN(maxSize)) {
      filterNotes.push(t('filter_note_size_range', { min: minSize, max: maxSize }));
    } else {
      if (!isNaN(minSize)) filterNotes.push(t('filter_note_size_min', { min: minSize }));
      if (!isNaN(maxSize)) filterNotes.push(t('filter_note_size_max', { max: maxSize }));
    }

    if (filterNowActive) {
      var now = new Date();
      var timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
      filterNotes.push(t('filter_note_now', { time: timeStr }));
    }

    var activeDescEl = document.getElementById("activeFilterDesc");
    if (activeDescEl) {
      activeDescEl.innerText = filterNotes.length ? t('filter_active_wrapper', { notes: filterNotes.join(', ') }) : "";
    }

    renderTableBody(filtered);
  }

  function resetFilters() {
    var searchEl = document.getElementById("search");
    if (searchEl) searchEl.value = "";
    var baitEl = document.getElementById("baitFilter");
    if (baitEl) baitEl.value = "";
    var ratingEl = document.getElementById("ratingFilter");
    if (ratingEl) ratingEl.value = "";
    var waterEl = document.getElementById("waterFilter");
    if (waterEl) waterEl.value = "";
    var loc = document.getElementById("locationFilter");
    if (loc) loc.value = "";
    var timeEl = document.getElementById("timeFilter");
    if (timeEl) timeEl.value = "";

    var sortEl = document.getElementById("sortBy");
    if (sortEl) {
      sortEl.value = (currentView === "market") ? "price_desc" : "name_asc";
    }

    var minEl = document.getElementById("minSizeInput");
    if (minEl) minEl.value = "";
    var maxEl = document.getElementById("maxSizeInput");
    if (maxEl) maxEl.value = "";

    filterNowActive = false;
    var btnNow = document.getElementById("btnNow");
    if (btnNow) btnNow.classList.remove("active");

    if (currentView === "market") {
      filterOnlyPrice = true;
      var btnOnlyPrice = document.getElementById("btnOnlyPrice");
      if (btnOnlyPrice) btnOnlyPrice.classList.add("active");
    } else {
      filterOnlyPrice = false;
      var btnOnlyPrice2 = document.getElementById("btnOnlyPrice");
      if (btnOnlyPrice2) btnOnlyPrice2.classList.remove("active");
    }

    var uncaughtCb = document.getElementById("filterUncaughtCheckbox");
    if (uncaughtCb) uncaughtCb.checked = false;

    var hideLockedCb = document.getElementById("hideLockedCheckbox");
    if (hideLockedCb) hideLockedCb.checked = false;

    collectionFilterMode = "all";
    var collAll = document.getElementById("collFilterAll");
    var collCaught = document.getElementById("collFilterCaught");
    var collMissing = document.getElementById("collFilterMissing");
    if (collAll) collAll.classList.add("active");
    if (collCaught) collCaught.classList.remove("active");
    if (collMissing) collMissing.classList.remove("active");

    document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });

    var activeDesc = document.getElementById("activeFilterDesc");
    if (activeDesc) activeDesc.innerText = "";

    renderTableHead();
    applyFilters();
  }

  function updateStaticTranslations() {
    var lang = getLang();
    document.documentElement.lang = lang;

    var csBtn = document.getElementById("langCsBtn");
    var enBtn = document.getElementById("langEnBtn");
    if (csBtn) csBtn.classList.toggle("active", lang === "cs");
    if (enBtn) enBtn.classList.toggle("active", lang === "en");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      // Skip syncStatusText so we don't overwrite live/offline state with default attribute
      if (el.id === "syncStatusText" || el.id === "tzLocalBtn" || el.id === "clockLabel") return;
      var key = el.getAttribute("data-i18n");
      var val = t(key);
      if (val !== undefined && val !== null && val !== key) {
        if (val.indexOf('<') !== -1 || val.indexOf('&') !== -1) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var val = t(key);
      if (val && val !== key) el.placeholder = val;
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      var val = t(key);
      if (val && val !== key) el.title = val;
    });

    updateMarketTabStatus();
  }

  function updateWaterFilterOptions() {
    var select = document.getElementById("waterFilter");
    if (!select) return;
    var curVal = select.value;
    select.innerHTML =
      '<option value="">' + t('opt_water_all') + '</option>' +
      '<option value="Slaná">' + t('opt_water_salt') + '</option>' +
      '<option value="Sladká">' + t('opt_water_fresh') + '</option>';
    select.value = curVal;
  }

  function initLocationOptions() {
    var locSet = new Set();
    allFishes.forEach(function (f) {
      if (f.locations && Array.isArray(f.locations)) {
        f.locations.forEach(function (l) { if (l) locSet.add(l); });
      }
    });
    var select = document.getElementById("locationFilter");
    if (!select) return;
    var currentVal = select.value;
    var sortedLocs = Array.from(locSet).sort();
    select.innerHTML = '<option value="">' + t('opt_loc_all', { count: sortedLocs.length }) + '</option>' +
      sortedLocs.map(function (l) {
        var locName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l;
        return '<option value="' + l + '">' + locName + '</option>';
      }).join('');
    select.value = currentVal;
  }

  function initBaitOptions() {
    var select = document.getElementById("baitFilter");
    if (!select) return;
    var curVal = select.value;
    var allBaits = [
      'Hmyz', 'Rostlinné', 'Ryby', 'Těsta', 'Přívlač/Nástrahy', 'Maso', 'Žraločí',
      'Háčky', 'Ďasí', 'Monstrum', 'Šírotlamčí', 'Prehistorické', 'Svítivčí',
      'Tuňáčí', 'Soltýní', 'Marlíní'
    ];
    select.innerHTML = '<option value="">' + t('opt_bait_all') + '</option>' +
      allBaits.map(function (b) {
        var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
        return '<option value="' + b + '">' + bName + '</option>';
      }).join('');
    select.value = curVal;
  }

  function updateTimeFilterOptions() {
    var select = document.getElementById("timeFilter");
    if (!select) return;
    var curVal = select.value;
    select.innerHTML =
      '<option value="">' + t('opt_time_all') + '</option>' +
      '<option value="now">' + t('opt_time_now') + '</option>' +
      '<option value="night">' + t('opt_time_night') + '</option>' +
      '<option value="day">' + t('opt_time_day') + '</option>' +
      '<option value="morning">' + t('opt_time_morning') + '</option>' +
      '<option value="afternoon">' + t('opt_time_afternoon') + '</option>' +
      '<option value="evening">' + t('opt_time_evening') + '</option>' +
      '<option value="deepnight">' + t('opt_time_deepnight') + '</option>';
    select.value = curVal;
  }

  function updateSortByOptions() {
    var select = document.getElementById("sortBy");
    if (!select) return;
    var curVal = select.value;
    var isSunday = isMarketClosedToday();
    var todaySortHtml = !isSunday
      ? '<option value="today_price_desc">' + t('opt_sort_today_price_desc') + '</option>'
      : '';

    select.innerHTML =
      '<option value="name_asc">' + t('opt_sort_name_asc') + '</option>' +
      '<option value="name_desc">' + t('opt_sort_name_desc') + '</option>' +
      todaySortHtml +
      '<option value="price_desc">' + t('opt_sort_price_desc') + '</option>' +
      '<option value="price_asc">' + t('opt_sort_price_asc') + '</option>' +
      '<option value="rating_desc">' + t('opt_sort_rating_desc') + '</option>' +
      '<option value="rating_asc">' + t('opt_sort_rating_asc') + '</option>' +
      '<option value="max_desc">' + t('opt_sort_max_desc') + '</option>' +
      '<option value="max_asc">' + t('opt_sort_max_asc') + '</option>' +
      '<option value="avg_desc">' + t('opt_sort_avg_desc') + '</option>' +
      '<option value="avg_asc">' + t('opt_sort_avg_asc') + '</option>';
    select.value = (curVal && curVal !== "default") ? curVal : "name_asc";
  }

  function updateRatingFilterOptions() {
    var select = document.getElementById("ratingFilter");
    if (!select) return;
    var curVal = select.value;
    select.innerHTML =
      '<option value="">' + t('opt_rating_all') + '</option>' +
      '<option value="5">★★★★★ (5)</option>' +
      '<option value="4">★★★★☆ (4)</option>' +
      '<option value="3">★★★☆☆ (3)</option>' +
      '<option value="2">★★☆☆☆ (2)</option>' +
      '<option value="1">★☆☆☆☆ (1)</option>' +
      '<option value="min3">' + t('opt_rating_min3') + '</option>' +
      '<option value="min4">' + t('opt_rating_min4') + '</option>';
    select.value = curVal;
  }

  function setLanguage(lang) {
    if (lang !== 'cs' && lang !== 'en') lang = 'cs';
    if (window.FISHAO_I18N) {
      window.FISHAO_I18N.currentLang = lang;
    }
    try {
      localStorage.setItem('fishao_lang', lang);
    } catch (e) { }

    updateStaticTranslations();
    updateSyncBadgeUI();
    updateTzButtonsUI();
    updateClock();
    updateAuthUI();
    updateWaterFilterOptions();
    initLocationOptions();
    initBaitOptions();
    updateTimeFilterOptions();
    updateSortByOptions();
    updateRatingFilterOptions();
    renderTableHead();
    updateCaughtStats();
    updateClubStats();
    renderClubMilestones();
    renderClubSpecialFishes();
    renderClubMembers(currentClubMembersMap, currentClubCreatorId);
    applyFilters();

    if (selectedModalFishId) {
      var modal = document.getElementById("priceModalOverlay");
      if (modal && modal.classList.contains("active")) {
        openPriceModal(selectedModalFishId);
      }
    }
  }

  // Export to global window object
  window.fishaoApp = {
    switchView: switchView,
    setTimezone: setTimezone,
    onPointsChange: onPointsChange,
    applyFilters: applyFilters,
    resetFilters: resetFilters,
    setSizeFilter: setSizeFilter,
    onRangeSizeInput: onRangeSizeInput,
    onExactSizeInput: onExactSizeInput,
    toggleNowActive: toggleNowActive,
    toggleOnlyPrice: toggleOnlyPrice,
    openPriceModal: openPriceModal,
    closePriceModal: closePriceModal,
    openBulkModal: openBulkModal,
    closeBulkModal: closeBulkModal,
    closeAllModals: closeAllModals,
    onModalOverlayClick: onModalOverlayClick,
    onBulkSearchInput: onBulkSearchInput,
    selectBulkFishSuggestion: selectBulkFishSuggestion,
    onBulkInputKeyDown: onBulkInputKeyDown,
    addFishToBulkList: addFishToBulkList,
    submitNewPrice: submitNewPrice,
    deletePriceEntry: deletePriceEntry,
    processBulkImport: processBulkImport,
    exportPricesJson: exportPricesJson,
    signIn: signIn,
    signOut: signOut,
    editNickname: editNickname,
    openProfileModal: openProfileModal,
    closeProfileModal: closeProfileModal,
    openPlayerModal: openPlayerModal,
    closePlayerModal: closePlayerModal,
    selectPresetAvatar: selectPresetAvatar,
    onAvatarUrlInput: onAvatarUrlInput,
    saveProfile: saveProfile,
    resolveConfirmModal: resolveConfirmModal,
    showToast: showToast,
    toggleCaughtFish: toggleCaughtFish,
    searchClubs: searchClubs,
    createClub: createClub,
    joinClub: joinClub,
    leaveClub: leaveClub,
    renderClubMembers: renderClubMembers,
    setClubPoints: setClubPoints,
    addClubPoints: addClubPoints,
    toggleClubSpecialFish: toggleClubSpecialFish,
    filterSpecialFishes: filterSpecialFishes,
    renderClubSpecialFishes: renderClubSpecialFishes,
    onClubNameChange: onClubNameChange,
    syncClubName: syncClubName,
    syncClubPoints: syncClubPoints,
    setCollectionFilter: setCollectionFilter,
    filterMilestones: filterMilestones,
    renderClubMilestones: renderClubMilestones,
    renderRatingBadge: renderRatingBadge,
    toggleCaughtFromModal: toggleCaughtFromModal,
    openFishDetail: openPriceModal,
    onPriceDateChange: onPriceDateChange,
    onBulkDateChange: onBulkDateChange,
    isDateSunday: isDateSunday,
    getYesterdayISO: getYesterdayISO,
    getTodayISO: getTodayISO,
    setLanguage: setLanguage,
    isMarketClosedToday: isMarketClosedToday,
    getTodayPrice: getTodayPrice,
    updateMarketTabStatus: updateMarketTabStatus,
    t: t
  };

  // Initialize localization & application
  var initialLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || localStorage.getItem('fishao_lang') || 'cs';
  setLanguage(initialLang);
  switchView("all");
  initFirebaseSync();
})();