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
var _firebaseInitPromise = null;

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
    var cachedTreeLevel = (privData && typeof privData.treeLevel === "number")
      ? privData.treeLevel
      : ((typeof guideTreeFromLevel === "number" && safeStorageGet('fishao_guide_tree_saved') === '1') ? guideTreeFromLevel : null);
    var cachedLineLevel = (privData && typeof privData.lineLevel === "number")
      ? privData.lineLevel
      : ((typeof guideLineFromLevel === "number" && safeStorageGet('fishao_guide_line_saved') === '1') ? guideLineFromLevel : null);
    var cachePayload = {
      uid: uid,
      displayName: profile.displayName || "",
      avatarUrl: profile.avatarUrl || "",
      preferredLang: normalizePlayerLang(profile.preferredLang),
      role: profile.role || "member",
      clubId: profile.clubId || "",
      clubName: profile.clubName || "",
      caughtFishIds: Array.isArray(profile.caughtFishIds) ? profile.caughtFishIds : [],
      shinyFishIds: Array.isArray(profile.shinyFishIds) ? profile.shinyFishIds : [],
      backyardFishIds: Array.isArray(profile.backyardFishIds) ? profile.backyardFishIds : [],
      friendUids: existingFriends
    };
    if (cachedTreeLevel !== null) cachePayload.treeLevel = cachedTreeLevel;
    if (cachedLineLevel !== null) cachePayload.lineLevel = cachedLineLevel;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cachePayload));
  } catch (e) { }
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (e) { }
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
    shinyFishIds = new Set(Array.isArray(cached.shinyFishIds) ? cached.shinyFishIds : []);
    backyardFishIds = new Set(Array.isArray(cached.backyardFishIds) ? cached.backyardFishIds : []);
    friendUids = new Set(Array.isArray(cached.friendUids) ? cached.friendUids : []);
    if (typeof syncGuideLevelsFromProfile === "function") {
      syncGuideLevelsFromProfile(cached, true);
    }
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

function isSearchCrawlerAgent() {
  try {
    if (typeof navigator === "undefined") return false;
    var ua = String(navigator.userAgent || "");
    if (/bot\b|crawl|spider|slurp|mediapartners|inspectiontool|lighthouse|headlesschrome|bingpreview|facebookexternalhit|embedly|discordbot|twitterbot|whatsapp|telegrambot|linkedinbot|ahrefs|semrush|bytespider|petalbot|applebot|yandex|baiduspider|duckduckbot|gptbot|claudebot|oai-searchbot|perplexitybot/i.test(ua)) {
      return true;
    }
    var isLocal = typeof window !== "undefined" && window.location &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (!isLocal && navigator.webdriver === true) {
      return true;
    }
  } catch (e) { }
  return false;
}

function initFirebaseSync() {
  if (_firebaseInitPromise) return _firebaseInitPromise;
  _firebaseInitPromise = _runInitFirebaseSync();
  return _firebaseInitPromise;
}

async function _runInitFirebaseSync() {
  if (!isFirebaseConfigured || isSearchCrawlerAgent()) {
    updateAuthUI();
    checkCookieConsentBanner();
    if (!isSearchCrawlerAgent() && typeof checkRemindersOnStartup === 'function') {
      checkRemindersOnStartup(false);
    }
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
    firebaseSummaryShardRefs = [0, 1, 2, 3].map(function (idx) {
      return firestoreModule.doc(db, "fishao_market", "prices_summary_" + idx);
    });
    marketConfigDocRef = firestoreModule.doc(db, "fishao_market", "config");
    var syncStatusDocRef = firestoreModule.doc(db, "fishao_market", "sync_status");

    checkCookieConsentBanner();
    if (safeStorageGet("fishao_cookie_consent") === "granted") {
      initFirebaseAnalytics();
    }

    var computePriceSummarySig = function (sumObj, lastUpdatedStr) {
      if (typeof lastUpdatedStr === "string" && lastUpdatedStr && !manualImportEnabled) {
        return "u:" + lastUpdatedStr + ":" + Object.keys(sumObj || {}).length;
      }
      var keys = Object.keys(sumObj || {});
      var totalPrices = 0;
      for (var i = 0; i < keys.length; i++) {
        var entry = sumObj[keys[i]];
        if (!entry || typeof entry !== "object") continue;
        if (typeof entry.p === "string") {
          totalPrices += entry.p ? entry.p.split("|").length : 0;
        }
        if (Array.isArray(entry.t)) totalPrices += entry.t.length;
      }
      return keys.length + "|" + totalPrices + "|" + (lastUpdatedStr || "");
    };

    var hasHandledInitialAuth = false;
    var wasSignedIn = false;
    var lastPriceSummarySig = computePriceSummarySig(priceSummary || {}, "");

    var applySummarySnapshot = function (nextSummary, lastUpdatedStr) {
      var safeSum = compactSummaryMap((nextSummary && typeof nextSummary === "object") ? nextSummary : {});
      var nextSig = computePriceSummarySig(safeSum, lastUpdatedStr);

      if (nextSig && nextSig === lastPriceSummarySig) {
        if (typeof lastUpdatedStr === "string") {
          safeStorageSet('fishao_price_summary_meta_v2', JSON.stringify({
            lastUpdated: lastUpdatedStr,
            fetchedAt: Date.now()
          }));
        }
        return;
      }

      priceSummary = safeSum;
      lastPriceSummarySig = nextSig;
      if (typeof saveLocalPriceSummary === "function") {
        saveLocalPriceSummary(typeof lastUpdatedStr === "string" ? lastUpdatedStr : "");
      } else {
        priceHistory = summaryMapToPriceHistory(priceSummary);
        if (typeof bumpPriceDataVersion === "function") bumpPriceDataVersion();
      }
      scheduleViewRefresh({ filters: true, marketTab: true, modal: true });
    };

    var fetchMarketSummaryShards = async function () {
      try {
        var shardSnaps = await Promise.all(firebaseSummaryShardRefs.map(function (ref) {
          return firestoreModule.getDoc(ref);
        }));
        var mergedShards = {};
        var maxLastUpdated = "";
        var hasAny = false;
        shardSnaps.forEach(function (s) {
          if (!s.exists()) return;
          hasAny = true;
          var d = s.data() || {};
          if (d.lastUpdated && typeof d.lastUpdated === "string" && d.lastUpdated > maxLastUpdated) {
            maxLastUpdated = d.lastUpdated;
          }
          if (d.prices && typeof d.prices === "object") {
            Object.assign(mergedShards, d.prices);
          }
        });
        if (hasAny) {
          applySummarySnapshot(mergedShards, maxLastUpdated);
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
        var shardMaps = [{}, {}, {}, {}];
        var shardDates = ["", "", "", ""];
        var shardReady = [false, false, false, false];
        var mergeTimer = 0;

        var flushMergedRealtime = function () {
          mergeTimer = 0;
          var combined = {};
          var latestTs = "";
          for (var si = 0; si < shardMaps.length; si++) {
            Object.assign(combined, shardMaps[si]);
            if (shardDates[si] && shardDates[si] > latestTs) latestTs = shardDates[si];
          }
          if (shardReady.every(Boolean)) {
            applySummarySnapshot(combined, latestTs);
          }
        };

        var unsubs = firebaseSummaryShardRefs.map(function (ref, idx) {
          return firestoreModule.onSnapshot(ref, function (docSnap) {
            shardReady[idx] = true;
            if (docSnap.exists()) {
              var cd = docSnap.data() || {};
              shardMaps[idx] = (cd.prices && typeof cd.prices === "object") ? cd.prices : {};
              shardDates[idx] = typeof cd.lastUpdated === "string" ? cd.lastUpdated : "";
            } else {
              shardMaps[idx] = {};
              shardDates[idx] = "";
            }
            if (!mergeTimer) {
              mergeTimer = setTimeout(flushMergedRealtime, 30);
            }
          }, function (error) {
            console.warn("Firestore market shard realtime warning:", error);
          });
        });
        marketPricesUnsubscribe = function () {
          if (mergeTimer) {
            clearTimeout(mergeTimer);
            mergeTimer = 0;
          }
          unsubs.forEach(function (u) { try { u(); } catch (e) { } });
        };
        return;
      }

      // Auto-sync mode: check localStorage TTL + tiny sync_status before downloading shards
      var SUMMARY_TTL_MS = 15 * 60 * 1000;
      var needsFetch = !priceSummary || Object.keys(priceSummary).length === 0;
      if (!needsFetch) {
        try {
          var metaRaw = safeStorageGet('fishao_price_summary_meta_v2');
          var meta = metaRaw ? JSON.parse(metaRaw) : null;
          var isFreshTtl = !!(meta && meta.fetchedAt && (Date.now() - meta.fetchedAt) < SUMMARY_TTL_MS);

          if (!isFreshTtl) {
            var statusSnap = await firestoreModule.getDoc(syncStatusDocRef);
            var statusData = statusSnap.exists() ? statusSnap.data() : null;
            if (!statusData || !meta || !meta.lastUpdated || (statusData.lastSuccessAt && statusData.lastSuccessAt > meta.lastUpdated)) {
              needsFetch = true;
            } else {
              safeStorageSet('fishao_price_summary_meta_v2', JSON.stringify({
                lastUpdated: meta.lastUpdated || "",
                fetchedAt: Date.now()
              }));
            }
          }
        } catch (e) {
          needsFetch = true;
        }
      }

      if (needsFetch) {
        await fetchMarketSummaryShards();
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
        if (typeof initChatSync === 'function') {
          initChatSync();
        }
        return;
      } else {
        wasSignedIn = false;
        if (typeof _guideCloudSyncAttempted !== "undefined") {
          _guideCloudSyncAttempted = false;
        }
        if (typeof unbindChatListeners === 'function') {
          unbindChatListeners();
        }
        if (typeof clearBackyardOwnersCache === 'function') {
          clearBackyardOwnersCache();
        }
        clearProfileCache();
        try {
          localStorage.removeItem('fishao_backyard_fish_ids');
          localStorage.removeItem('fishao_friends_uids');
        } catch (e) { }
        if (isInitialGuest) {
          updateAuthUI();
          if (typeof checkRemindersOnStartup === 'function') {
            checkRemindersOnStartup(false);
          }
          return;
        }
        userProfile = null;
        isAdmin = false;
        caughtFishIds = new Set();
        shinyFishIds = new Set();
        backyardFishIds = new Set();
        friendUids = new Set();
        if (typeof resetRemindersStartupState === 'function') {
          resetRemindersStartupState();
        }
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

    // Resolve market config without blocking initial sync_status / prices_summary fetch (cached TTL + parallel check)
    (async function syncMarketConfigAndPrices() {
      var CONFIG_CACHE_KEY = 'fishao_market_config_v1';
      var CONFIG_TTL_MS = 5 * 60 * 1000;
      var cachedCfg = null;
      try {
        var rawCfg = safeStorageGet(CONFIG_CACHE_KEY);
        if (rawCfg) cachedCfg = JSON.parse(rawCfg);
      } catch (e) { }

      var initialManualFlag = !!(cachedCfg && cachedCfg.manualImportEnabled === true);
      manualImportEnabled = initialManualFlag;
      if (typeof syncManualImportVisibility === "function") {
        syncManualImportVisibility();
      }

      var hasFreshCfgCache = !!(cachedCfg && cachedCfg.ts && (Date.now() - cachedCfg.ts) < CONFIG_TTL_MS && !initialManualFlag);
      // Kick off market sync immediately using cached flag (avoids waiting on config roundtrip)
      syncMarketPricesMode(initialManualFlag);

      if (hasFreshCfgCache) return;

      var bindConfigRealtime = function () {
        firestoreModule.onSnapshot(marketConfigDocRef, function (docSnap) {
          var d = docSnap.exists() ? docSnap.data() : null;
          var nextFlag = !!(d && d.manualImportEnabled === true);
          safeStorageSet(CONFIG_CACHE_KEY, JSON.stringify({ manualImportEnabled: nextFlag, ts: Date.now() }));
          if (nextFlag !== manualImportEnabled) {
            manualImportEnabled = nextFlag;
            if (typeof syncManualImportVisibility === "function") syncManualImportVisibility();
            syncMarketPricesMode(nextFlag);
          }
        }, function (error) {
          console.warn("Firestore market config warning:", error);
        });
      };

      if (initialManualFlag) {
        bindConfigRealtime();
        return;
      }

      try {
        var cfgSnap = await firestoreModule.getDoc(marketConfigDocRef);
        var cfgData = cfgSnap.exists() ? cfgSnap.data() : null;
        var liveFlag = !!(cfgData && cfgData.manualImportEnabled === true);
        safeStorageSet(CONFIG_CACHE_KEY, JSON.stringify({ manualImportEnabled: liveFlag, ts: Date.now() }));
        if (liveFlag !== manualImportEnabled) {
          manualImportEnabled = liveFlag;
          if (typeof syncManualImportVisibility === "function") syncManualImportVisibility();
          syncMarketPricesMode(liveFlag);
        }
        if (liveFlag) {
          bindConfigRealtime();
        }
      } catch (error) {
        console.warn("Firestore market config warning:", error);
      }
    })();

  } catch (err) {
    console.error("Firebase initialization failed:", err);
    updateAuthUI();
    checkCookieConsentBanner();
    if (!safeStorageGet(PROFILE_CACHE_KEY) && typeof checkRemindersOnStartup === 'function') {
      checkRemindersOnStartup(false);
    }
  }
}

/**
 * Firebase Analytics & Cookie Consent Management
 * Strictly opt-in: Analytics is NOT initialized unless user explicitly accepts.
 */
async function initFirebaseAnalytics() {
  if (firebaseAnalytics) return firebaseAnalytics;
  var consent = safeStorageGet("fishao_cookie_consent");
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
  var consent = safeStorageGet("fishao_cookie_consent");
  var banner = document.getElementById("cookieConsentBanner");
  if (!banner) return;

  if (!consent) {
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}

function acceptCookieConsent(fromPrivacyModal) {
  safeStorageSet("fishao_cookie_consent", "granted");
  var banner = document.getElementById("cookieConsentBanner");
  if (banner) banner.style.display = "none";
  if (typeof updateScrollTopButton === "function") updateScrollTopButton();

  if (firebaseApp) {
    initFirebaseAnalytics();
  }
  updatePrivacyConsentStatusUI();
  if (typeof showToast === "function") {
    showToast(t("cookies_accepted_toast"), "success");
  }
}

function declineCookieConsent(fromPrivacyModal) {
  safeStorageSet("fishao_cookie_consent", "denied");
  var banner = document.getElementById("cookieConsentBanner");
  if (banner) banner.style.display = "none";
  if (typeof updateScrollTopButton === "function") updateScrollTopButton();

  if (typeof firebaseConfig !== "undefined" && firebaseConfig && firebaseConfig.measurementId) {
    window["ga-disable-" + firebaseConfig.measurementId] = true;
  }
  if (analyticsModuleRef && firebaseAnalytics && typeof analyticsModuleRef.setAnalyticsCollectionEnabled === "function") {
    try {
      analyticsModuleRef.setAnalyticsCollectionEnabled(firebaseAnalytics, false);
    } catch (e) { }
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

  var consent = safeStorageGet("fishao_cookie_consent");
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
  if (!_firebaseInitPromise) {
    initFirebaseSync();
  }
  if (!auth && _firebaseInitPromise) {
    try {
      await _firebaseInitPromise;
    } catch (e) { }
  }
  if (!auth) {
    showAuthNotice(t('auth_need_config'));
    showToast(t('auth_need_config'), "error");
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
      showToast(t('auth_unauth_domain', { domain: window.location.hostname }), "error");
    } else {
      showToast(t('auth_signin_failed', { msg: err.message }), "error");
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
    var handledServerRemindersSync = false;
    var isBootstrappingNewUser = false;
    var userDocExists = false;
    var lastAppliedProfileSig = "";
    var activeBoundClubId = cachedClubId || "";

    if (hadCachedProfile && userProfile) {
      try {
        lastAppliedProfileSig = JSON.stringify({
          displayName: userProfile.displayName || "",
          avatarUrl: userProfile.avatarUrl || "",
          preferredLang: userProfile.preferredLang || "",
          role: userProfile.role || "member",
          badges: Array.isArray(userProfile.badges) ? userProfile.badges : [],
          clubId: userProfile.clubId || "",
          caughtFishIds: userProfile.caughtFishIds || [],
          shinyFishIds: userProfile.shinyFishIds || [],
          backyardFishIds: userProfile.backyardFishIds || [],
          friendUids: userProfile.friendUids || []
        });
      } catch (e) { }
    }

    userPrivateUnsubscribe = fsModule.onSnapshot(privDocRef, async function (privSnap) {
      var privData = privSnap.exists() ? (privSnap.data() || {}) : {};
      var isFromCache = !!(privSnap.metadata && privSnap.metadata.fromCache);
      var privChanged = false;

      if (Array.isArray(privData.friendUids)) {
        friendUids = new Set(privData.friendUids);
        if (userProfile) userProfile.friendUids = privData.friendUids;
        privChanged = true;
      }
      if (typeof syncRemindersFromProfile === "function") {
        if (Array.isArray(privData.reminders)) {
          var shouldCheckRemindersStartup = !isFromCache && !handledServerRemindersSync;
          if (!isFromCache) handledServerRemindersSync = true;
          syncRemindersFromProfile({ reminders: privData.reminders }, {
            checkStartup: shouldCheckRemindersStartup
          });
        } else if (!isFromCache && !handledServerRemindersSync && !isBootstrappingNewUser) {
          handledServerRemindersSync = true;
          syncRemindersFromProfile(privData, { checkStartup: true });
        }
      }
      if (typeof syncGuideLevelsFromProfile === "function") {
        syncGuideLevelsFromProfile(privData);
      }

      if (!privSnap.exists() && !isBootstrappingNewUser && handledFirstSnapshot && userDocExists && userProfile) {
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
      userDocExists = snap.exists();
      var oldClubId = userProfile ? userProfile.clubId : activeBoundClubId;

      if (snap.exists()) {
        var rawData = snap.data() || {};
        userProfile = rawData;

        // Throttle lastLogin write (onto private settings) to once every 15 minutes
        if (isFirst) {
          var loginSyncKey = 'fishao_last_login_sync_' + user.uid;
          var lastSync = parseInt(safeStorageGet(loginSyncKey) || '0', 10);
          if (!lastSync || (Date.now() - lastSync) > 15 * 60 * 1000) {
            safeStorageSet(loginSyncKey, String(Date.now()));
            savePrivateUserSettings({ lastLogin: new Date().toISOString() }).catch(function () { });
          }
        }
      } else {
        // Privacy / GDPR: zero PII on public profile (NO email, NO avatar photo from OAuth)
        isBootstrappingNewUser = true;
        try {
          var defaultNick = t('user_default_player') + " #" + Math.floor(1000 + Math.random() * 9000);
          userProfile = {
            displayName: defaultNick,
            role: "member",
            clubId: "",
            clubName: "",
            caughtFishIds: Array.from(caughtFishIds),
            shinyFishIds: Array.from(shinyFishIds),
            backyardFishIds: Array.from(backyardFishIds),
            createdAt: new Date().toISOString()
          };
          await fsModule.setDoc(userDocRef, userProfile);
          userDocExists = true;
          await fsModule.setDoc(privDocRef, {
            friendUids: Array.from(friendUids || []),
            reminders: (typeof userReminders !== 'undefined' && Array.isArray(userReminders)) ? userReminders : [],
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } finally {
          isBootstrappingNewUser = false;
        }
      }

      isAdmin = (userProfile.role === "admin");
      if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
        caughtFishIds = new Set(userProfile.caughtFishIds);
      }
      shinyFishIds = new Set(Array.isArray(userProfile.shinyFishIds) ? userProfile.shinyFishIds : []);
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
          badges: Array.isArray(userProfile.badges) ? userProfile.badges : [],
          clubId: userProfile.clubId || "",
          caughtFishIds: userProfile.caughtFishIds || [],
          shinyFishIds: userProfile.shinyFishIds || [],
          backyardFishIds: userProfile.backyardFishIds || [],
          friendUids: Array.from(friendUids || [])
        });
      } catch (e) { }

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
        if (isNewUser || (hasDefaultNick && safeStorageGet(nickStorageKey) !== '1')) {
          safeStorageSet(nickStorageKey, '1');
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
    var wantClubDisplay = isInClub ? "" : "none";
    if (tabClub.style.display !== wantClubDisplay) tabClub.style.display = wantClubDisplay;
  }
  if (subNavClub) {
    var wantSubNavDisplay = (isInClub && (currentView === "club_manage" || currentView === "club")) ? "flex" : "none";
    if (subNavClub.style.display !== wantSubNavDisplay) subNavClub.style.display = wantSubNavDisplay;
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
    var wantAuthDisp = currentUser ? "flex" : "none";
    var wantGuestDisp = currentUser ? "none" : "flex";
    if (collBannerAuth.style.display !== wantAuthDisp) collBannerAuth.style.display = wantAuthDisp;
    if (collBannerGuest.style.display !== wantGuestDisp) collBannerGuest.style.display = wantGuestDisp;
  }

  var btnOnlyCaught = document.getElementById("btnOnlyCaught");
  if (btnOnlyCaught) {
    var wantCaughtBtnDisp = currentUser ? "" : "none";
    if (btnOnlyCaught.style.display !== wantCaughtBtnDisp) {
      btnOnlyCaught.style.display = wantCaughtBtnDisp;
    }
    if (!currentUser) {
      filterOnlyCaught = false;
      btnOnlyCaught.classList.remove("active");
    }
  }

  var btnOnlyBackyard = document.getElementById("btnOnlyBackyard");
  if (btnOnlyBackyard) {
    var wantBackyardBtnDisp = currentUser ? "" : "none";
    if (btnOnlyBackyard.style.display !== wantBackyardBtnDisp) {
      btnOnlyBackyard.style.display = wantBackyardBtnDisp;
    }
    if (!currentUser) {
      filterOnlyBackyard = false;
      btnOnlyBackyard.classList.remove("active");
    }
  }

  var gatePlayers = document.getElementById("gatePlayers");
  var playersContent = document.getElementById("playersContent");
  if (gatePlayers && playersContent) {
    var wantGateDisp = currentUser ? "none" : "block";
    var wantPlayersDisp = currentUser ? "block" : "none";
    if (gatePlayers.style.display !== wantGateDisp) gatePlayers.style.display = wantGateDisp;
    if (playersContent.style.display !== wantPlayersDisp) playersContent.style.display = wantPlayersDisp;
  }

  if (typeof updateChatHeaderBadge === "function") {
    updateChatHeaderBadge();
  }
  if (typeof syncAdminReportsWatcher === "function") {
    syncAdminReportsWatcher();
  }

  if (!isFirebaseConfigured) {
    if (signInBtn) signInBtn.style.display = "none";
    if (userInfoBar) userInfoBar.style.display = "none";
    if (adminBadge) adminBadge.style.display = "none";
    if (collBannerAuth) collBannerAuth.style.display = "none";
    if (collBannerGuest) collBannerGuest.style.display = "none";
    if (btnOnlyCaught) btnOnlyCaught.style.display = "none";
    if (btnOnlyBackyard) btnOnlyBackyard.style.display = "none";
    return;
  }

  if (currentUser) {
    if (signInBtn) signInBtn.style.display = "none";
    if (userInfoBar) userInfoBar.style.display = "inline-flex";

    var nameEl = document.getElementById("userName");
    if (nameEl) nameEl.innerText = (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_player');

    var userLangFlagEl = document.getElementById("userLangFlag");
    if (userLangFlagEl) {
      userLangFlagEl.innerHTML = renderPlayerLangFlag(getPlayerLang(userProfile));
    }

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
      if (avatarImg) {
        avatarImg.removeAttribute("src");
        avatarImg.style.display = "none";
      }
      if (avatarBadge) {
        avatarBadge.innerText = /^https?:\/\//i.test(uAv) ? "🎣" : (uAv || "🎣");
        avatarBadge.style.display = "flex";
      }
    }

    if (adminBadge) adminBadge.style.display = isAdmin ? "inline-block" : "none";
    var exportBtn = document.getElementById("btnExportPrices");
    if (exportBtn) exportBtn.style.display = isAdmin ? "inline-block" : "none";

    // Admin-only action column/buttons inside fish modal
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
    var collMissingShiny = document.getElementById("collFilterMissingShiny");
    if (collAll) collAll.classList.add("active");
    if (collCaught) collCaught.classList.remove("active");
    if (collMissing) collMissing.classList.remove("active");
    if (collMissingShiny) collMissingShiny.classList.remove("active");

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

  if ((currentView === "guide_tree" || currentView === "guide_line" || currentView === "guide_shop") && typeof renderGuideView === "function") {
    renderGuideView(currentView === "guide_line" ? "line" : (currentView === "guide_shop" ? "shop" : "tree"));
  }
}

var _profileCountryDropdownOpen = false;
var _profileCountryQuery = "";

function isProfileCountryDropdownOpen() {
  return _profileCountryDropdownOpen === true;
}

function closeProfileCountryDropdown() {
  _profileCountryDropdownOpen = false;
  var menu = document.getElementById("profileCountryMenu");
  var trigger = document.getElementById("profileCountryTrigger");
  if (menu) menu.style.display = "none";
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function renderProfileCountryList(query) {
  var listEl = document.getElementById("profileCountryList");
  if (!listEl) return;

  var q = typeof query === "string" ? query : _profileCountryQuery;
  var normQ = (typeof normStr === "function") ? normStr(q.trim()) : q.trim().toLowerCase();
  var entries = (typeof getAllCountryEntries === "function") ? getAllCountryEntries() : [];
  var noneLabel = t('profile_lang_none');
  var normNone = (typeof normStr === "function") ? normStr(noneLabel) : noneLabel.toLowerCase();

  var html = [];
  if (!normQ || normNone.indexOf(normQ) !== -1) {
    var noneActive = !selectedProfileLang;
    html.push(
      '<button type="button" class="profile-country-option profile-country-option-none' + (noneActive ? ' active' : '') + '" ' +
      'role="option" aria-selected="' + (noneActive ? 'true' : 'false') + '" data-country="" ' +
      'onclick="window.fishaoApp.selectPreferredLang(\'\')">' +
      '<span class="profile-country-none-icon" aria-hidden="true">🚫</span>' +
      '<span class="profile-country-name">' + escapeHtml(noneLabel) + '</span>' +
      '</button>'
    );
  }

  var matched = 0;
  for (var i = 0; i < entries.length; i++) {
    var item = entries[i];
    if (normQ && item.searchKey.indexOf(normQ) === -1) continue;
    matched++;
    var isActive = selectedProfileLang === item.code;
    var flagHtml = renderPlayerLangFlag(item.code);
    html.push(
      '<button type="button" class="profile-country-option' + (isActive ? ' active' : '') + '" ' +
      'role="option" aria-selected="' + (isActive ? 'true' : 'false') + '" data-country="' + item.code + '" ' +
      'onclick="window.fishaoApp.selectPreferredLang(\'' + item.code + '\')">' +
      flagHtml +
      '<span class="profile-country-name">' + escapeHtml(item.label) + '</span>' +
      '<span class="profile-country-code">' + item.code + '</span>' +
      '</button>'
    );
  }

  if (!html.length || (normQ && matched === 0 && html.length === 0)) {
    html.push('<div class="profile-country-empty">' + escapeHtml(t('profile_country_empty')) + '</div>');
  }

  listEl.innerHTML = html.join('');
}

function toggleProfileCountryDropdown(forceState) {
  var nextOpen = (typeof forceState === "boolean") ? forceState : !_profileCountryDropdownOpen;
  if (!nextOpen) {
    closeProfileCountryDropdown();
    return;
  }
  _profileCountryDropdownOpen = true;
  _profileCountryQuery = "";
  var menu = document.getElementById("profileCountryMenu");
  var trigger = document.getElementById("profileCountryTrigger");
  var searchInput = document.getElementById("profileCountrySearch");
  if (searchInput) searchInput.value = "";
  renderProfileCountryList("");
  if (menu) menu.style.display = "block";
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  if (searchInput) {
    setTimeout(function () { searchInput.focus(); }, 10);
  }
  var listEl = document.getElementById("profileCountryList");
  if (listEl) {
    var activeOpt = listEl.querySelector(".profile-country-option.active");
    if (activeOpt && typeof activeOpt.scrollIntoView === "function") {
      activeOpt.scrollIntoView({ block: "nearest" });
    } else {
      listEl.scrollTop = 0;
    }
  }
}

function onProfileCountrySearchInput(val) {
  _profileCountryQuery = String(val || "");
  renderProfileCountryList(_profileCountryQuery);
}

function onProfileCountrySearchKeyDown(e) {
  if (!e) return;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    closeProfileCountryDropdown();
    var trigger = document.getElementById("profileCountryTrigger");
    if (trigger) trigger.focus();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    var listEl = document.getElementById("profileCountryList");
    if (!listEl) return;
    var firstOpt = listEl.querySelector(".profile-country-option");
    if (firstOpt) {
      selectPreferredLang(firstOpt.getAttribute("data-country") || "");
    }
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    var listEl2 = document.getElementById("profileCountryList");
    if (!listEl2) return;
    var opts = listEl2.querySelectorAll(".profile-country-option");
    if (!opts.length) return;
    var target = (e.key === "ArrowDown") ? opts[0] : opts[opts.length - 1];
    if (target) target.focus();
  }
}

function syncProfileLangPicker() {
  var valEl = document.getElementById("profileCountryTriggerValue");
  if (valEl) {
    if (selectedProfileLang) {
      var label = getPlayerLangLabel(selectedProfileLang);
      valEl.innerHTML = renderPlayerLangFlag(selectedProfileLang) +
        '<span class="profile-country-trigger-label">' + escapeHtml(label) + '</span>' +
        '<span class="profile-country-code">' + escapeHtml(selectedProfileLang) + '</span>';
    } else {
      valEl.innerHTML = '<span class="profile-country-none-icon" aria-hidden="true">🚫</span>' +
        '<span class="profile-country-trigger-label profile-country-trigger-placeholder">' +
        escapeHtml(t('profile_lang_none')) + '</span>';
    }
  }
  if (_profileCountryDropdownOpen) {
    renderProfileCountryList(_profileCountryQuery);
  }
}

function selectPreferredLang(code) {
  selectedProfileLang = normalizePlayerLang(code);
  syncProfileLangPicker();
  closeProfileCountryDropdown();
}

function openProfileModal(scrollToAdmin) {
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

  selectedProfileLang = normalizePlayerLang(userProfile && userProfile.preferredLang);
  syncProfileLangPicker();

  if (typeof renderBackyardProfilePicker === 'function') {
    renderBackyardProfilePicker();
  }

  var adminSection = document.getElementById("profileAdminSection");
  var isProfileAdmin = !!(userProfile && userProfile.role === 'admin');
  if (adminSection) {
    adminSection.style.display = isProfileAdmin ? "block" : "none";
  }
  if (isProfileAdmin) {
    var adminJsonDateEl = document.getElementById("adminJsonImportDate");
    if (adminJsonDateEl && !adminJsonDateEl.value && typeof getTodayISO === "function") {
      adminJsonDateEl.value = getTodayISO();
    }
    if (typeof setAdminJsonImportStatus === "function") {
      setAdminJsonImportStatus("", "");
    }
  }
  if (typeof syncManualImportVisibility === "function") {
    syncManualImportVisibility();
  }
  if (typeof updateAdminReportsAlertUI === "function") {
    updateAdminReportsAlertUI();
  }
  if (isProfileAdmin && (scrollToAdmin === true || (typeof adminOpenReportsCount !== "undefined" && adminOpenReportsCount > 0))) {
    if (typeof loadAdminChatReports === "function") {
      loadAdminChatReports();
    }
  }

  if (overlay) overlay.classList.add("active");
  if (isProfileAdmin && scrollToAdmin === true && adminSection && typeof adminSection.scrollIntoView === "function") {
    setTimeout(function () {
      adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }
}

function closeProfileModal() {
  closeProfileCountryDropdown();
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

  var finalLang = normalizePlayerLang(selectedProfileLang);

  try {
    var fsModule = await getFirestoreModule();
    var userDocRef = fsModule.doc(db, "users", currentUser.uid);
    var profileUpdate = {
      displayName: newNick,
      avatarUrl: finalAvatar
    };
    profileUpdate.preferredLang = finalLang ? finalLang : fsModule.deleteField();
    await fsModule.updateDoc(userDocRef, profileUpdate);

    if (userProfile) {
      userProfile.displayName = newNick;
      userProfile.avatarUrl = finalAvatar;
      if (finalLang) {
        userProfile.preferredLang = finalLang;
      } else {
        delete userProfile.preferredLang;
      }
      saveProfileToCache(currentUser.uid, userProfile);
    }

    if (typeof allPlayersList !== "undefined" && Array.isArray(allPlayersList)) {
      var meEntry = allPlayersList.find(function (p) { return p.uid === currentUser.uid; });
      if (meEntry) {
        meEntry.displayName = newNick;
        meEntry.avatarUrl = finalAvatar;
        if (finalLang) {
          meEntry.preferredLang = finalLang;
        } else {
          delete meEntry.preferredLang;
        }
        if (currentView === "players" && typeof renderPlayersList === "function") {
          renderPlayersList();
        }
      }
    }
    if (typeof updateUserInBackyardOwnersCache === "function") {
      updateUserInBackyardOwnersCache(currentUser.uid, {
        displayName: newNick,
        avatarUrl: finalAvatar,
        preferredLang: finalLang || ""
      });
    }

    if (currentClubId) {
      try {
        var clubDocRef = fsModule.doc(db, "clubs", currentClubId);
        var memUp = {};
        memUp["members." + currentUser.uid + ".displayName"] = newNick;
        memUp["members." + currentUser.uid + ".avatarUrl"] = finalAvatar;
        memUp["members." + currentUser.uid + ".preferredLang"] = finalLang ? finalLang : fsModule.deleteField();
        await fsModule.updateDoc(clubDocRef, memUp);
      } catch (e) {
        console.warn("Could not sync member profile to club doc:", e);
      }
    }

    safeStorageSet('fishao_nick_prompted_' + currentUser.uid, '1');

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

    // 3. Delete private settings subdoc & public user profile document from Firestore, then anonymize user's chats
    if (typeof unbindChatListeners === 'function') {
      unbindChatListeners();
    }
    try {
      var privDocRef = fsModule.doc(db, "users", uid, "private", "settings");
      await fsModule.deleteDoc(privDocRef);
    } catch (e) { }
    var userDocRef = fsModule.doc(db, "users", uid);
    await fsModule.deleteDoc(userDocRef);
    if (typeof cleanupUserChatsOnAccountDelete === 'function') {
      await cleanupUserChatsOnAccountDelete(uid);
    }

    // 4. Clear local storage, profile cache, and session caches
    clearProfileCache();
    safeStorageRemove('fishao_caught_fish_ids');
    safeStorageRemove('fishao_backyard_fish_ids');
    safeStorageRemove('fishao_friends_uids');
    safeStorageRemove('fishao_reminders_v1');
    safeStorageRemove('fishao_nick_prompted_' + uid);
    safeStorageRemove('fishao_last_login_sync_' + uid);
    safeStorageRemove('fishao_chat_rules_v1_' + uid);
    safeStorageRemove('fishao_players_cache_v1');
    try {
      sessionStorage.removeItem('fishao_players_cache_v1');
    } catch (e) { }

    // 5. Remove from in-memory allPlayersList & per-fish backyard owners cache
    if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
      allPlayersList = allPlayersList.filter(function (p) { return p.uid !== uid; });
    }
    if (typeof clearBackyardOwnersCache === 'function') {
      clearBackyardOwnersCache();
    }

    caughtFishIds.clear();
    shinyFishIds.clear();
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

    // 1. Fetch Market docs (4 summary shards, config, sync_status)
    var readOptDoc = async function (docId) {
      try {
        var s = await firestoreModule.getDoc(firestoreModule.doc(db, "fishao_market", docId));
        return s.exists() ? s.data() : null;
      } catch (e) {
        return null;
      }
    };
    var marketDocs = await Promise.all([
      readOptDoc("prices_summary_0"),
      readOptDoc("prices_summary_1"),
      readOptDoc("prices_summary_2"),
      readOptDoc("prices_summary_3"),
      readOptDoc("config"),
      readOptDoc("sync_status")
    ]);
    var shardDocs = marketDocs.slice(0, 4);
    var configData = marketDocs[4];
    var syncStatusData = marketDocs[5];

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

    var summaryFishCount = shardDocs.reduce(function (acc, s) {
      return acc + ((s && s.prices) ? Object.keys(s.prices).length : 0);
    }, 0);

    // Compile backup payload
    var backupData = {
      app: "FISHAO Tracker",
      version: "2.1",
      exportedAt: new Date().toISOString(),
      stats: {
        usersCount: usersList.length,
        clubsCount: clubsList.length,
        marketSummaryFishCount: summaryFishCount,
        dailyMonthsCount: Object.keys(dailyArchive).length
      },
      collections: {
        fishao_market: {
          prices_summary_0: shardDocs[0],
          prices_summary_1: shardDocs[1],
          prices_summary_2: shardDocs[2],
          prices_summary_3: shardDocs[3],
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

