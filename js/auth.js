/**
 * FISHAO - Firebase Auth & User Profile Management (js/auth.js)
 * -------------------------------------------------------------
 * Handles Google OAuth, user profile loading, avatar selection,
 * profile modal interactions, and auth state changes.
 */

var firebaseAnalytics = null;
var analyticsModuleRef = null;
var userPrivateUnsubscribe = null;
var marketPricesUnsubscribe = null;

var _refreshRafId = 0;
var _refreshFlags = {
  auth: false,
  stats: false,
  filters: false,
  marketTab: false,
  modal: false
};

function scheduleViewRefresh(opts) {
  if (opts) {
    if (opts.auth) _refreshFlags.auth = true;
    if (opts.stats) _refreshFlags.stats = true;
    if (opts.filters) _refreshFlags.filters = true;
    if (opts.marketTab) _refreshFlags.marketTab = true;
    if (opts.modal) _refreshFlags.modal = true;
  } else {
    _refreshFlags.auth = true;
    _refreshFlags.stats = true;
    _refreshFlags.filters = true;
  }

  if (_refreshRafId) return;
  _refreshRafId = requestAnimationFrame(function () {
    _refreshRafId = 0;
    var flags = {
      auth: _refreshFlags.auth,
      stats: _refreshFlags.stats,
      filters: _refreshFlags.filters,
      marketTab: _refreshFlags.marketTab,
      modal: _refreshFlags.modal
    };
    _refreshFlags.auth = false;
    _refreshFlags.stats = false;
    _refreshFlags.filters = false;
    _refreshFlags.marketTab = false;
    _refreshFlags.modal = false;

    if (flags.auth) updateAuthUI();
    if (flags.stats) updateCaughtStats();
    if (flags.filters) applyFilters();
    if (flags.marketTab && typeof updateMarketTabStatus === "function") updateMarketTabStatus();
    if (flags.modal && selectedModalFishId && typeof renderModalHistory === "function") {
      renderModalHistory(selectedModalFishId);
    }
  });
}

var PROFILE_CACHE_KEY = 'fishao_cached_profile_v1';

function saveProfileToCache(uid, profile, privData) {
  if (!uid || !profile) return;
  try {
    var existingFriends = (privData && Array.isArray(privData.friendUids))
      ? privData.friendUids
      : Array.from(friendUids || []);
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      uid: uid,
      displayName: profile.displayName || "",
      avatarUrl: profile.avatarUrl || "",
      role: profile.role || "member",
      clubId: profile.clubId || "",
      clubName: profile.clubName || "",
      caughtFishIds: Array.isArray(profile.caughtFishIds) ? profile.caughtFishIds : [],
      backyardFishIds: Array.isArray(profile.backyardFishIds) ? profile.backyardFishIds : [],
      friendUids: existingFriends
    }));
  } catch (e) {}
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (e) {}
}

function hydrateProfileFromCache(uid) {
  if (!uid) return false;
  try {
    var raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return false;
    var cached = JSON.parse(raw);
    if (!cached || cached.uid !== uid) return false;
    userProfile = cached;
    isAdmin = (cached.role === "admin");
    caughtFishIds = new Set(Array.isArray(cached.caughtFishIds) ? cached.caughtFishIds : []);
    backyardFishIds = new Set(Array.isArray(cached.backyardFishIds) ? cached.backyardFishIds : []);
    friendUids = new Set(Array.isArray(cached.friendUids) ? cached.friendUids : []);
    return true;
  } catch (e) {
    return false;
  }
}

async function savePrivateUserSettings(partialFields) {
  if (!currentUser || !db || !partialFields || typeof partialFields !== "object") return;
  var fsModule = await getFirestoreModule();
  var privDocRef = fsModule.doc(db, "users", currentUser.uid, "private", "settings");
  var payload = Object.assign({}, partialFields, { updatedAt: new Date().toISOString() });
  await fsModule.setDoc(privDocRef, payload, { merge: true });
}

async function initFirebaseSync() {
  if (!isFirebaseConfigured) {
    updateAuthUI();
    checkCookieConsentBanner();
    return;
  }

  try {
    var importPromises = [
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
      getFirestoreModule(),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js")
    ];
    if (firebaseConfig.recaptchaSiteKey) {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      importPromises.push(
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js").catch(function (err) {
          console.warn("[FISHAO AppCheck] Failed to load:", err);
          return null;
        })
      );
    }

    var modules = await Promise.all(importPromises);
    var appModule = modules[0];
    var firestoreModule = modules[1];
    var authModule = modules[2];
    var appCheckModule = modules[3] || null;

    firebaseApp = appModule.initializeApp(firebaseConfig);
    if (firebaseConfig.recaptchaSiteKey && appCheckModule) {
      try {
        appCheckModule.initializeAppCheck(firebaseApp, {
          provider: new appCheckModule.ReCaptchaEnterpriseProvider(firebaseConfig.recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      } catch (appCheckErr) {
        console.warn("[FISHAO AppCheck] Failed to initialize:", appCheckErr);
      }
    }
    db = firestoreModule.getFirestore(firebaseApp);
    auth = authModule.getAuth(firebaseApp);
    firebaseDocRef = firestoreModule.doc(db, "fishao_market", "prices_history");
    firebaseSummaryDocRef = firestoreModule.doc(db, "fishao_market", "prices_summary");
    estimatedPricesDocRef = firestoreModule.doc(db, "fishao_market", "estimated_prices");
    marketConfigDocRef = firestoreModule.doc(db, "fishao_market", "config");
    var syncStatusDocRef = firestoreModule.doc(db, "fishao_market", "sync_status");

    checkCookieConsentBanner();
    if (localStorage.getItem("fishao_cookie_consent") === "granted") {
      initFirebaseAnalytics();
    }

    var hasHandledInitialAuth = false;
    var wasSignedIn = false;
    var lastPriceSummaryJson = "";
    try {
      lastPriceSummaryJson = JSON.stringify(priceSummary || {});
    } catch (e) {}

    var applySummarySnapshot = function (nextSummary, lastUpdatedStr) {
      var safeSum = (nextSummary && typeof nextSummary === "object") ? nextSummary : {};
      var nextJson = "";
      try {
        nextJson = JSON.stringify(safeSum);
      } catch (e) {}

      if (nextJson && nextJson === lastPriceSummaryJson) {
        if (typeof lastUpdatedStr === "string") {
          try {
            localStorage.setItem('fishao_price_summary_meta_v2', JSON.stringify({
              lastUpdated: lastUpdatedStr,
              fetchedAt: Date.now()
            }));
          } catch (e) {}
        }
        return;
      }

      priceSummary = safeSum;
      lastPriceSummaryJson = nextJson;
      if (typeof saveLocalPriceSummary === "function") {
        saveLocalPriceSummary(typeof lastUpdatedStr === "string" ? lastUpdatedStr : "");
      } else {
        priceHistory = summaryMapToPriceHistory(priceSummary);
        if (typeof bumpPriceDataVersion === "function") bumpPriceDataVersion();
      }
      scheduleViewRefresh({ filters: true, marketTab: true, modal: true });
    };

    var fetchSummaryOrLegacyOnce = async function () {
      try {
        var sumSnap = await firestoreModule.getDoc(firebaseSummaryDocRef);
        if (sumSnap.exists()) {
          var sData = sumSnap.data() || {};
          applySummarySnapshot(sData.prices || {}, sData.lastUpdated || "");
          return;
        }
        // Backward compatibility: fall back to legacy prices_history until migration runs
        var legSnap = await firestoreModule.getDoc(firebaseDocRef);
        if (legSnap.exists()) {
          var lData = legSnap.data() || {};
          var converted = legacyHistoryToSummaryMap(lData.prices || {});
          applySummarySnapshot(converted, lData.lastUpdated || "");
        }
      } catch (err) {
        console.warn("Firestore market price fetch warning:", err);
      }
    };

    var syncMarketPricesMode = async function (enableRealtime) {
      if (marketPricesUnsubscribe) {
        marketPricesUnsubscribe();
        marketPricesUnsubscribe = null;
      }

      if (enableRealtime) {
        marketPricesUnsubscribe = firestoreModule.onSnapshot(firebaseSummaryDocRef, function (docSnap) {
          if (docSnap.exists()) {
            var cloudData = docSnap.data() || {};
            applySummarySnapshot(cloudData.prices || {}, cloudData.lastUpdated || "");
          } else {
            fetchSummaryOrLegacyOnce();
          }
        }, function (error) {
          console.warn("Firestore market realtime warning:", error);
        });
        return;
      }

      // Auto-sync mode: check localStorage TTL + tiny sync_status before downloading prices_summary
      var SUMMARY_TTL_MS = 15 * 60 * 1000;
      var needsFetch = !priceSummary || Object.keys(priceSummary).length === 0;
      if (!needsFetch) {
        try {
          var metaRaw = localStorage.getItem('fishao_price_summary_meta_v2');
          var meta = metaRaw ? JSON.parse(metaRaw) : null;
          var todayStr = getTodayISO();
          var fetchedDay = (meta && meta.fetchedAt) ? new Date(meta.fetchedAt).toISOString().slice(0, 10) : "";
          var isFreshTtl = !!(meta && meta.fetchedAt && (Date.now() - meta.fetchedAt) < SUMMARY_TTL_MS && fetchedDay === todayStr);

          if (!isFreshTtl) {
            var statusSnap = await firestoreModule.getDoc(syncStatusDocRef);
            var statusData = statusSnap.exists() ? statusSnap.data() : null;
            if (!statusData || !meta || !meta.lastUpdated || (statusData.lastSuccessAt && statusData.lastSuccessAt > meta.lastUpdated) || fetchedDay !== todayStr) {
              needsFetch = true;
            } else {
              try {
                localStorage.setItem('fishao_price_summary_meta_v2', JSON.stringify({
                  lastUpdated: meta.lastUpdated || "",
                  fetchedAt: Date.now()
                }));
              } catch (e) {}
            }
          }
        } catch (e) {
          needsFetch = true;
        }
      }

      if (needsFetch) {
        await fetchSummaryOrLegacyOnce();
      }
    };

    authModule.onAuthStateChanged(auth, function (user) {
      currentUser = user;
      var isInitialGuest = !hasHandledInitialAuth && !user && !wasSignedIn;
      hasHandledInitialAuth = true;

      if (user) {
        wasSignedIn = true;
        var hadCached = hydrateProfileFromCache(user.uid);
        var cachedClubId = (hadCached && userProfile && userProfile.clubId) ? userProfile.clubId : "";
        if (hadCached) {
          if (cachedClubId) {
            bindClubListener(cachedClubId);
          }
          scheduleViewRefresh({ auth: true, stats: true, filters: true });
        } else {
          updateAuthUI();
        }
        loadUserProfile(user, hadCached, cachedClubId);
        return;
      } else {
        wasSignedIn = false;
        clearProfileCache();
        try {
          localStorage.removeItem('fishao_backyard_fish_ids');
          localStorage.removeItem('fishao_friends_uids');
        } catch (e) {}
        if (isInitialGuest) {
          updateAuthUI();
          return;
        }
        userProfile = null;
        isAdmin = false;
        caughtFishIds = new Set();
        backyardFishIds = new Set();
        friendUids = new Set();
        if (typeof loadLocalReminders === 'function') {
          userReminders = loadLocalReminders();
        }
        if (typeof updateRemindersBellBadge === 'function') {
          updateRemindersBellBadge();
        }
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        if (userPrivateUnsubscribe) {
          userPrivateUnsubscribe();
          userPrivateUnsubscribe = null;
        }
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
      scheduleViewRefresh({ auth: true, stats: true, filters: true });
    });

    // Estimated prices rarely change: use 6-hour localStorage TTL cache + one-time getDoc instead of onSnapshot
    (async function syncEstimatedPricesWithCache() {
      var EST_TTL_MS = 6 * 60 * 60 * 1000;
      try {
        var cachedEst = localStorage.getItem('fishao_estimated_prices_v1');
        var cachedTs = parseInt(localStorage.getItem('fishao_estimated_prices_ts_v1') || '0', 10);
        if (cachedEst && cachedTs && (Date.now() - cachedTs) < EST_TTL_MS) {
          return;
        }
      } catch (e) {}

      try {
        var docSnap = await firestoreModule.getDoc(estimatedPricesDocRef);
        if (docSnap.exists()) {
          var estData = docSnap.data();
          if (estData && estData.prices && typeof estData.prices === "object" && Object.keys(estData.prices).length > 0) {
            var nextEstimated = Object.assign({}, window.FISHAO_ESTIMATED_PRICES || {}, estData.prices);
            var prevJson = "";
            var nextJson = "";
            try {
              prevJson = JSON.stringify(estimatedPrices || {});
              nextJson = JSON.stringify(nextEstimated);
            } catch (e) {}

            estimatedPrices = nextEstimated;
            try {
              localStorage.setItem('fishao_estimated_prices_v1', nextJson || JSON.stringify(estimatedPrices));
              localStorage.setItem('fishao_estimated_prices_ts_v1', String(Date.now()));
            } catch (e) {}

            if (!prevJson || nextJson !== prevJson) {
              scheduleViewRefresh({ filters: true, modal: true });
            }
          }
        }
      } catch (error) {
        console.warn("Firestore estimated prices warning:", error);
      }
    })();

    var hasBoundMarketMode = false;
    var prevRealtimeFlag = null;
    firestoreModule.onSnapshot(marketConfigDocRef, function (docSnap) {
      var data = docSnap.exists() ? docSnap.data() : null;
      manualImportEnabled = !!(data && data.manualImportEnabled === true);
      if (typeof syncManualImportVisibility === "function") {
        syncManualImportVisibility();
      }
      if (!hasBoundMarketMode || prevRealtimeFlag !== manualImportEnabled) {
        hasBoundMarketMode = true;
        prevRealtimeFlag = manualImportEnabled;
        syncMarketPricesMode(manualImportEnabled);
      }
    }, function (error) {
      console.warn("Firestore market config warning:", error);
      if (!hasBoundMarketMode) {
        hasBoundMarketMode = true;
        syncMarketPricesMode(false);
      }
    });

  } catch (err) {
    console.error("Firebase initialization failed:", err);
    updateAuthUI();
    checkCookieConsentBanner();
  }
}

/**
 * Firebase Analytics & Cookie Consent Management
 * Strictly opt-in: Analytics is NOT initialized unless user explicitly accepts.
 */
async function initFirebaseAnalytics() {
  if (firebaseAnalytics) return firebaseAnalytics;
  var consent = localStorage.getItem("fishao_cookie_consent");
  if (consent !== "granted") {
    console.log("[FISHAO Analytics] Waiting for consent (status: " + consent + ")");
    return null;
  }
  if (!firebaseApp || !firebaseConfig || !firebaseConfig.measurementId) {
    console.warn("[FISHAO Analytics] Missing firebaseApp or measurementId");
    return null;
  }

  try {
    var analyticsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js");
    var supported = await analyticsModule.isSupported();
    if (!supported) {
      console.warn("[FISHAO Analytics] isSupported() returned false (cookies/IndexedDB may be blocked by browser or adblock)");
      return null;
    }

    analyticsModuleRef = analyticsModule;
    firebaseAnalytics = analyticsModule.getAnalytics(firebaseApp);

    analyticsModule.logEvent(firebaseAnalytics, "app_open");
    analyticsModule.logEvent(firebaseAnalytics, "page_view", {
      page_title: document.title,
      page_location: window.location.href
    });

    console.log("[FISHAO Analytics] Active & tracking:", firebaseConfig.measurementId);
    return firebaseAnalytics;
  } catch (err) {
    console.warn("[FISHAO Analytics] Failed to initialize:", err);
    return null;
  }
}

function logAnalyticsEvent(eventName, eventParams) {
  if (!firebaseAnalytics || !analyticsModuleRef) return;
  try {
    analyticsModuleRef.logEvent(firebaseAnalytics, eventName, eventParams || {});
  } catch (e) {
    console.debug("Analytics event failed:", e);
  }
}

function checkCookieConsentBanner() {
  var consent = localStorage.getItem("fishao_cookie_consent");
  var banner = document.getElementById("cookieConsentBanner");
  if (!banner) return;

  if (!consent) {
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}

function acceptCookieConsent(fromPrivacyModal) {
  localStorage.setItem("fishao_cookie_consent", "granted");
  var banner = document.getElementById("cookieConsentBanner");
  if (banner) banner.style.display = "none";

  if (firebaseApp) {
    initFirebaseAnalytics();
  }
  updatePrivacyConsentStatusUI();
  if (typeof showToast === "function") {
    showToast(t("cookies_accepted_toast"), "success");
  }
}

function declineCookieConsent(fromPrivacyModal) {
  localStorage.setItem("fishao_cookie_consent", "denied");
  var banner = document.getElementById("cookieConsentBanner");
  if (banner) banner.style.display = "none";

  if (typeof firebaseConfig !== "undefined" && firebaseConfig && firebaseConfig.measurementId) {
    window["ga-disable-" + firebaseConfig.measurementId] = true;
  }
  if (analyticsModuleRef && firebaseAnalytics && typeof analyticsModuleRef.setAnalyticsCollectionEnabled === "function") {
    try {
      analyticsModuleRef.setAnalyticsCollectionEnabled(firebaseAnalytics, false);
    } catch (e) {}
  }

  firebaseAnalytics = null;
  clearAnalyticsCookies();
  updatePrivacyConsentStatusUI();
  if (typeof showToast === "function") {
    showToast(t("cookies_declined_toast"), "info");
  }
}

function clearAnalyticsCookies() {
  try {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      if (name.indexOf("_ga") === 0) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    }
  } catch (e) {
    console.debug("Could not clear analytics cookies:", e);
  }
}

function updatePrivacyConsentStatusUI() {
  var badge = document.getElementById("privacyConsentStatusBadge");
  var btnAccept = document.getElementById("privacyBtnAccept");
  var btnDecline = document.getElementById("privacyBtnDecline");
  if (!badge) return;

  var consent = localStorage.getItem("fishao_cookie_consent");
  if (consent === "granted") {
    badge.textContent = t("cookie_status_granted");
    badge.style.background = "rgba(16, 185, 129, 0.2)";
    badge.style.color = "#34d399";
    badge.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    if (btnAccept) btnAccept.style.display = "none";
    if (btnDecline) btnDecline.style.display = "inline-flex";
  } else if (consent === "denied") {
    badge.textContent = t("cookie_status_denied");
    badge.style.background = "rgba(239, 68, 68, 0.15)";
    badge.style.color = "#f87171";
    badge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
    if (btnAccept) btnAccept.style.display = "inline-flex";
    if (btnDecline) btnDecline.style.display = "none";
  } else {
    badge.textContent = t("cookie_status_undecided");
    badge.style.background = "rgba(148, 163, 184, 0.15)";
    badge.style.color = "#94a3b8";
    badge.style.border = "1px solid rgba(148, 163, 184, 0.3)";
    if (btnAccept) btnAccept.style.display = "inline-flex";
    if (btnDecline) btnDecline.style.display = "inline-flex";
  }
}

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

async function loadUserProfile(user, hadCachedProfile, cachedClubId) {
  if (!db) return;
  try {
    var fsModule = await getFirestoreModule();
    var userDocRef = fsModule.doc(db, "users", user.uid);
    var privDocRef = fsModule.doc(db, "users", user.uid, "private", "settings");

    if (userUnsubscribe) {
      userUnsubscribe();
      userUnsubscribe = null;
    }
    if (userPrivateUnsubscribe) {
      userPrivateUnsubscribe();
      userPrivateUnsubscribe = null;
    }

    var handledFirstSnapshot = false;
    var lastAppliedProfileSig = "";
    var activeBoundClubId = cachedClubId || "";
    var legacyMigrationDone = false;

    if (hadCachedProfile && userProfile) {
      try {
        lastAppliedProfileSig = JSON.stringify({
          displayName: userProfile.displayName || "",
          avatarUrl: userProfile.avatarUrl || "",
          role: userProfile.role || "member",
          clubId: userProfile.clubId || "",
          caughtFishIds: userProfile.caughtFishIds || [],
          backyardFishIds: userProfile.backyardFishIds || [],
          friendUids: userProfile.friendUids || []
        });
      } catch (e) {}
    }

    userPrivateUnsubscribe = fsModule.onSnapshot(privDocRef, async function (privSnap) {
      var privData = privSnap.exists() ? (privSnap.data() || {}) : {};
      var privChanged = false;

      if (Array.isArray(privData.friendUids)) {
        friendUids = new Set(privData.friendUids);
        if (userProfile) userProfile.friendUids = privData.friendUids;
        privChanged = true;
      }
      if (Array.isArray(privData.reminders) && typeof syncRemindersFromProfile === "function") {
        syncRemindersFromProfile({ reminders: privData.reminders });
      }

      if (!privSnap.exists() && userProfile) {
        try {
          await fsModule.setDoc(privDocRef, {
            friendUids: Array.from(friendUids || []),
            reminders: (typeof userReminders !== "undefined" && Array.isArray(userReminders)) ? userReminders : [],
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (privCreateErr) {
          console.warn("Failed creating private settings doc:", privCreateErr);
        }
      }

      if (userProfile) {
        saveProfileToCache(user.uid, userProfile, privData);
      }
      if (privChanged && typeof currentView !== "undefined" && currentView === "players" && typeof renderPlayersList === "function") {
        renderPlayersList();
      }
    }, function (privErr) {
      console.warn("Private settings snapshot warning:", privErr);
    });

    userUnsubscribe = fsModule.onSnapshot(userDocRef, async function (snap) {
      var isFirst = !handledFirstSnapshot;
      handledFirstSnapshot = true;

      var isNewUser = !snap.exists();
      var oldClubId = userProfile ? userProfile.clubId : activeBoundClubId;

      if (snap.exists()) {
        var rawData = snap.data() || {};
        userProfile = rawData;

        // Auto-migrate legacy private fields from /users/{uid} into /users/{uid}/private/settings
        if (!legacyMigrationDone && (rawData.friendUids !== undefined || rawData.reminders !== undefined || rawData.lastLogin !== undefined)) {
          legacyMigrationDone = true;
          try {
            var migPayload = { updatedAt: new Date().toISOString() };
            if (Array.isArray(rawData.friendUids)) {
              friendUids = new Set(rawData.friendUids);
              migPayload.friendUids = rawData.friendUids;
            }
            if (Array.isArray(rawData.reminders)) {
              if (typeof syncRemindersFromProfile === "function") syncRemindersFromProfile({ reminders: rawData.reminders });
              migPayload.reminders = rawData.reminders;
            }
            migPayload.lastLogin = rawData.lastLogin || new Date().toISOString();
            await fsModule.setDoc(privDocRef, migPayload, { merge: true });
            var cleanupUpdate = {};
            if (rawData.friendUids !== undefined) cleanupUpdate.friendUids = fsModule.deleteField();
            if (rawData.reminders !== undefined) cleanupUpdate.reminders = fsModule.deleteField();
            if (rawData.lastLogin !== undefined) cleanupUpdate.lastLogin = fsModule.deleteField();
            await fsModule.updateDoc(userDocRef, cleanupUpdate);
          } catch (migErr) {
            console.warn("Private profile migration deferred:", migErr);
          }
        }

        // Throttle lastLogin write (onto private settings) to once every 15 minutes
        if (isFirst) {
          try {
            var loginSyncKey = 'fishao_last_login_sync_' + user.uid;
            var lastSync = parseInt(localStorage.getItem(loginSyncKey) || '0', 10);
            if (!lastSync || (Date.now() - lastSync) > 15 * 60 * 1000) {
              localStorage.setItem(loginSyncKey, String(Date.now()));
              savePrivateUserSettings({ lastLogin: new Date().toISOString() }).catch(function () {});
            }
          } catch (e) {}
        }
      } else {
        // Privacy / GDPR: zero PII on public profile (NO email, NO avatar photo from OAuth)
        var defaultNick = t('user_default_player') + " #" + Math.floor(1000 + Math.random() * 9000);
        userProfile = {
          displayName: defaultNick,
          role: "member",
          clubId: "",
          clubName: "",
          caughtFishIds: Array.from(caughtFishIds),
          backyardFishIds: Array.from(backyardFishIds),
          createdAt: new Date().toISOString()
        };
        await fsModule.setDoc(userDocRef, userProfile);
        await fsModule.setDoc(privDocRef, {
          friendUids: Array.from(friendUids || []),
          reminders: (typeof userReminders !== 'undefined' && Array.isArray(userReminders)) ? userReminders : [],
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      isAdmin = (userProfile.role === "admin");
      if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
        caughtFishIds = new Set(userProfile.caughtFishIds);
      }
      if (userProfile.backyardFishIds && Array.isArray(userProfile.backyardFishIds)) {
        backyardFishIds = new Set(userProfile.backyardFishIds);
      }

      saveProfileToCache(user.uid, userProfile);

      if (userProfile.clubId) {
        if (userProfile.clubId !== activeBoundClubId) {
          activeBoundClubId = userProfile.clubId;
          bindClubListener(userProfile.clubId);
        }
      } else if (activeBoundClubId || oldClubId) {
        activeBoundClubId = "";
        unbindClubListener();
      }

      var nextSig = "";
      try {
        nextSig = JSON.stringify({
          displayName: userProfile.displayName || "",
          avatarUrl: userProfile.avatarUrl || "",
          role: userProfile.role || "member",
          clubId: userProfile.clubId || "",
          caughtFishIds: userProfile.caughtFishIds || [],
          backyardFishIds: userProfile.backyardFishIds || [],
          friendUids: Array.from(friendUids || [])
        });
      } catch (e) {}

      if (!nextSig || nextSig !== lastAppliedProfileSig) {
        lastAppliedProfileSig = nextSig;
        scheduleViewRefresh({ auth: true, stats: true, filters: true });
      }

      if (isFirst) {
        // Automatically prompt new users to set their custom nickname and avatar
        var nickStorageKey = 'fishao_nick_prompted_' + user.uid;
        var hasDefaultNick = userProfile && userProfile.displayName && (
          userProfile.displayName.startsWith(t('user_default_player')) ||
          userProfile.displayName.startsWith("Rybář #") ||
          userProfile.displayName.startsWith("Angler #") ||
          userProfile.displayName.startsWith("Gracz #") ||
          userProfile.displayName.startsWith("Wędkarz #") ||
          userProfile.displayName.startsWith("Player #")
        );
        if (isNewUser || (hasDefaultNick && localStorage.getItem(nickStorageKey) !== '1')) {
          localStorage.setItem(nickStorageKey, '1');
          setTimeout(function () {
            openProfileModal();
            var nickInput = document.getElementById("inputProfileNickname");
            if (nickInput) {
              nickInput.focus();
              nickInput.select();
            }
            showToast(t('auth_welcome_new_user'), 'info');
          }, 450);
        }
      }
    }, function (err) {
      console.warn("User profile snapshot warning:", err);
    });

  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

function updateAuthUI() {
  var tabClub = document.getElementById("tabClub");
  var subNavClub = document.getElementById("subNavClub");
  var isInClub = !!(currentUser && currentClubId);
  if (tabClub) {
    tabClub.style.display = isInClub ? "" : "none";
  }
  if (subNavClub) {
    subNavClub.style.display = (isInClub && (currentView === "club_manage" || currentView === "club")) ? "flex" : "none";
  }
  if (!isInClub && currentView === "club") {
    switchView("all");
  }

  var signInBtn = document.getElementById("signInBtn");
  var userInfoBar = document.getElementById("userInfoBar");
  var adminBadge = document.getElementById("adminBadge");

  var gateClub = document.getElementById("gateClubManage");
  var manageContent = document.getElementById("manageClubContent");

  updateNavClubBadge();

  var collBannerAuth = document.getElementById("collBannerAuth");
  var collBannerGuest = document.getElementById("collBannerGuest");
  if (collBannerAuth && collBannerGuest) {
    collBannerAuth.style.display = currentUser ? "flex" : "none";
    collBannerGuest.style.display = currentUser ? "none" : "flex";
  }

  var gatePlayers = document.getElementById("gatePlayers");
  var playersContent = document.getElementById("playersContent");
  if (gatePlayers && playersContent) {
    gatePlayers.style.display = currentUser ? "none" : "block";
    playersContent.style.display = currentUser ? "block" : "none";
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
    if (isValidHttpsUrl(uAv)) {
      if (avatarImg) {
        avatarImg.src = uAv;
        avatarImg.style.display = "block";
      }
      if (avatarBadge) avatarBadge.style.display = "none";
    } else {
      if (avatarImg) avatarImg.style.display = "none";
      if (avatarBadge) {
        avatarBadge.innerText = /^https?:\/\//i.test(uAv) ? "🎣" : (uAv || "🎣");
        avatarBadge.style.display = "flex";
      }
    }

    if (adminBadge) adminBadge.style.display = isAdmin ? "inline-block" : "none";
    var exportBtn = document.getElementById("btnExportPrices");
    if (exportBtn) exportBtn.style.display = isAdmin ? "inline-block" : "none";

    // Admin-only action column in the fish modal price history.
    if (typeof syncPriceHistoryActionColumn === "function") syncPriceHistoryActionColumn();
    if (typeof syncManualImportVisibility === "function") syncManualImportVisibility();
    if (selectedModalFishId && typeof renderModalHistory === "function") {
      renderModalHistory(selectedModalFishId);
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
        if (acMemb) acMemb.innerText = '👥 ' + formatClubMemberCount(currentClubMemberCount);
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
    } else if (currentView === "players") {
      var bPlayersOn = document.getElementById("bannerPlayers");
      var gatePlayersOn = document.getElementById("gatePlayers");
      var playersContentOn = document.getElementById("playersContent");
      if (bPlayersOn) bPlayersOn.style.display = "flex";
      if (gatePlayersOn) gatePlayersOn.style.display = "none";
      if (playersContentOn) playersContentOn.style.display = "block";
    }
  } else {
    if (signInBtn) signInBtn.style.display = "inline-flex";
    if (userInfoBar) userInfoBar.style.display = "none";
    if (adminBadge) adminBadge.style.display = "none";
    var exportBtnOff = document.getElementById("btnExportPrices");
    if (exportBtnOff) exportBtnOff.style.display = "none";

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
    } else if (currentView === "players") {
      var bPlayersOff = document.getElementById("bannerPlayers");
      var gatePlayersOff = document.getElementById("gatePlayers");
      var playersContentOff = document.getElementById("playersContent");
      if (bPlayersOff) bPlayersOff.style.display = "none";
      if (gatePlayersOff) gatePlayersOff.style.display = "block";
      if (playersContentOff) playersContentOff.style.display = "none";
    }
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

  if (isValidHttpsUrl(curAv)) {
    if (urlInput) urlInput.value = curAv;
    selectedProfilePresetEmoji = "🎣";
    updateProfileModalPreview(curAv);
  } else {
    if (urlInput) urlInput.value = "";
    selectedProfilePresetEmoji = /^https?:\/\//i.test(curAv) ? "🎣" : (curAv || "🎣");
    updateProfileModalPreview(selectedProfilePresetEmoji);
  }

  var btns = document.querySelectorAll(".emoji-pick-btn");
  btns.forEach(function (b) {
    b.classList.toggle("active", b.innerText.trim() === selectedProfilePresetEmoji);
  });

  if (typeof renderBackyardProfilePicker === 'function') {
    renderBackyardProfilePicker();
  }

  var adminSection = document.getElementById("profileAdminSection");
  if (adminSection) {
    adminSection.style.display = (userProfile && userProfile.role === 'admin') ? "block" : "none";
  }
  if (typeof syncManualImportVisibility === "function") {
    syncManualImportVisibility();
  }

  if (overlay) overlay.classList.add("active");
}

function closeProfileModal() {
  var overlay = document.getElementById("profileModalOverlay");
  if (overlay) overlay.classList.remove("active");
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
  if (isValidHttpsUrl(trimmed)) {
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

  if (isValidHttpsUrl(val)) {
    img.src = val;
    img.style.display = "block";
    badge.style.display = "none";
  } else {
    img.style.display = "none";
    badge.innerText = /^https?:\/\//i.test(val) ? "🎣" : (val || "🎣");
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
    showToast(t('nick_too_long'), "error");
    return;
  }

  var avatarUrlVal = (urlInput ? urlInput.value : "").trim();
  var finalAvatar = "";
  if (avatarUrlVal) {
    if (avatarUrlVal.length > 500) {
      showToast(t('avatar_url_too_long'), "error");
      return;
    }
    if (!isValidHttpsUrl(avatarUrlVal)) {
      showToast(t('avatar_url_https_only'), "error");
      return;
    }
    finalAvatar = avatarUrlVal;
  } else {
    finalAvatar = selectedProfilePresetEmoji || "🎣";
  }

  try {
    var fsModule = await getFirestoreModule();
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

    try {
      localStorage.setItem('fishao_nick_prompted_' + currentUser.uid, '1');
    } catch (e) {}

    closeProfileModal();
    updateAuthUI();
    showToast(t('profile_saved_success'), "success");
  } catch (err) {
    console.error("Failed to save profile:", err);
    showToast(t('err_save') + err.message, "error");
  }
}

async function deleteAccount() {
  if (!currentUser || !db) return;

  var ok = await showConfirmModal(
    t('profile_delete_title'),
    t('profile_delete_confirm'),
    t('profile_delete_btn'),
    true
  );
  if (!ok) return;

  try {
    var authModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    var lastSignInMs = (currentUser.metadata && currentUser.metadata.lastSignInTime)
      ? Date.parse(currentUser.metadata.lastSignInTime)
      : 0;
    if (!lastSignInMs || (Date.now() - lastSignInMs) > 4 * 60 * 1000) {
      if (typeof authModule.reauthenticateWithPopup === "function") {
        showToast(t('auth_reauth_required'), "info");
        try {
          var provider = new authModule.GoogleAuthProvider();
          await authModule.reauthenticateWithPopup(currentUser, provider);
        } catch (reauthErr) {
          if (reauthErr && (reauthErr.code === "auth/popup-closed-by-user" || reauthErr.code === "auth/cancelled-popup-request")) {
            return;
          }
          showToast(t('auth_reauth_required'), "error");
          return;
        }
      }
    }

    var fsModule = await getFirestoreModule();
    var uid = currentUser.uid;
    var clubIdToLeave = (userProfile && userProfile.clubId) || currentClubId;

    // 1. Immediately detach club & user real-time listeners and clear local state
    // This prevents onSnapshot listeners from executing any self-heal re-registration
    if (userUnsubscribe) {
      userUnsubscribe();
      userUnsubscribe = null;
    }
    if (userPrivateUnsubscribe) {
      userPrivateUnsubscribe();
      userPrivateUnsubscribe = null;
    }
    if (typeof unbindClubListener === 'function') {
      unbindClubListener();
    }
    currentClubId = "";
    currentClubName = "";
    currentClubMembersMap = {};
    if (userProfile) {
      userProfile.clubId = "";
      userProfile.clubName = "";
    }

    // 2. If user was in a club, clean up member entry from club document
    if (clubIdToLeave && typeof removeMemberFromClubDoc === 'function') {
      try {
        await removeMemberFromClubDoc(fsModule, clubIdToLeave, uid);
      } catch (e) {
        console.warn("Could not clean up club membership on account deletion:", e);
      }
    }

    // 3. Delete private settings subdoc & public user profile document from Firestore
    try {
      var privDocRef = fsModule.doc(db, "users", uid, "private", "settings");
      await fsModule.deleteDoc(privDocRef);
    } catch (e) {}
    var userDocRef = fsModule.doc(db, "users", uid);
    await fsModule.deleteDoc(userDocRef);

    // 4. Clear local storage, profile cache, and session caches
    clearProfileCache();
    try {
      localStorage.removeItem('fishao_caught_fish_ids');
      localStorage.removeItem('fishao_backyard_fish_ids');
      localStorage.removeItem('fishao_friends_uids');
      localStorage.removeItem('fishao_reminders_v1');
      localStorage.removeItem('fishao_nick_prompted_' + uid);
      localStorage.removeItem('fishao_last_login_sync_' + uid);
      sessionStorage.removeItem('fishao_players_cache_v1');
    } catch (e) {}

    // 5. Remove from in-memory allPlayersList
    if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
      allPlayersList = allPlayersList.filter(function (p) { return p.uid !== uid; });
    }

    caughtFishIds.clear();
    backyardFishIds.clear();
    friendUids.clear();
    if (typeof userReminders !== 'undefined') userReminders = [];
    if (typeof updateRemindersBellBadge === 'function') updateRemindersBellBadge();
    userProfile = null;
    currentClubId = "";
    currentClubName = "";
    isAdmin = false;

    // 6. Delete Firebase Auth user if supported, or sign out
    try {
      if (typeof currentUser.delete === 'function') {
        await currentUser.delete();
      }
    } catch (authErr) {
      console.warn("Auth user deletion failed, signing out instead:", authErr);
      await signOut();
    }

    closeProfileModal();
    scheduleViewRefresh({ auth: true, stats: true, filters: true });
    showToast(t('profile_deleted_success'), "info");
  } catch (err) {
    console.error("Failed to delete account:", err);
    showToast(t('err_delete_account') + err.message, "error");
  }
}

async function exportFirestoreBackup() {
  if (!currentUser || !userProfile || userProfile.role !== 'admin') {
    showToast(t('auth_notice_default'), 'error');
    return;
  }
  if (!db) {
    showToast(t('auth_need_config'), 'error');
    return;
  }

  var btn = document.getElementById("btnAdminExportBackup");
  var oldHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ ' + t('admin_backup_progress');
  }

  try {
    var firestoreModule = await getFirestoreModule();

    // 1. Fetch Market docs (summary, legacy history if present, estimated, config, sync_status)
    var readOptDoc = async function (docId) {
      try {
        var s = await firestoreModule.getDoc(firestoreModule.doc(db, "fishao_market", docId));
        return s.exists() ? s.data() : null;
      } catch (e) {
        return null;
      }
    };
    var marketDocs = await Promise.all([
      readOptDoc("prices_summary"),
      readOptDoc("prices_history"),
      readOptDoc("estimated_prices"),
      readOptDoc("config"),
      readOptDoc("sync_status")
    ]);
    var summaryData = marketDocs[0];
    var legacyMarketData = marketDocs[1];
    var estData = marketDocs[2];
    var configData = marketDocs[3];
    var syncStatusData = marketDocs[4];

    // Fetch monthly daily archives (/fishao_market_daily)
    var dailySnap = await firestoreModule.getDocs(firestoreModule.collection(db, "fishao_market_daily"));
    var dailyArchive = {};
    dailySnap.forEach(function (d) {
      dailyArchive[d.id] = d.data();
    });

    // 2. Fetch Clubs (/clubs)
    var clubsSnap = await firestoreModule.getDocs(firestoreModule.collection(db, "clubs"));
    var clubsList = [];
    clubsSnap.forEach(function (doc) {
      clubsList.push(Object.assign({ id: doc.id }, doc.data()));
    });

    // 3. Fetch Users (/users)
    var usersSnap = await firestoreModule.getDocs(firestoreModule.collection(db, "users"));
    var usersList = [];
    usersSnap.forEach(function (doc) {
      usersList.push(Object.assign({ id: doc.id }, doc.data()));
    });

    // Compile backup payload
    var backupData = {
      app: "FISHAO Tracker",
      version: "2.0",
      exportedAt: new Date().toISOString(),
      stats: {
        usersCount: usersList.length,
        clubsCount: clubsList.length,
        marketSummaryFishCount: (summaryData && summaryData.prices) ? Object.keys(summaryData.prices).length : 0,
        dailyMonthsCount: Object.keys(dailyArchive).length
      },
      collections: {
        fishao_market: {
          prices_summary: summaryData,
          prices_history: legacyMarketData,
          estimated_prices: estData,
          config: configData,
          sync_status: syncStatusData
        },
        fishao_market_daily: dailyArchive,
        clubs: clubsList,
        users: usersList
      }
    };

    var jsonStr = JSON.stringify(backupData, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "fishao_firestore_backup_" + dateStr + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('admin_backup_success', { users: usersList.length, clubs: clubsList.length }), 'info');
  } catch (err) {
    console.error("Backup failed:", err);
    showToast(t('admin_backup_error', { msg: err.message }), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
}

