/**
 * FISHAO - Core Application Logic (app.js v2.1)
 * ---------------------------------------------
 * Handles data rendering, filtering, mission size logic,
 * automatic timezone calculations, and Firebase synchronization.
 */

(function () {
  var firebaseConfig = window.FISHAO_FIREBASE_CONFIG || {};
  var isFirebaseConfigured = typeof window.isFirebaseConfigured === 'function' ? window.isFirebaseConfigured() : false;

  var clubFishes = window.FISHAO_DATA?.clubFishes || [];
  var allFishes = window.FISHAO_DATA?.allFishes || [];
  var initialPrices = window.FISHAO_DEFAULT_PRICES || {};

  // Application state
  var currentView = "all";
  var currentClubPoints = 0;
  var currentClubName = "";
  var filterNowActive = false;
  var filterOnlyPrice = false;
  var selectedModalFishId = null;

  // i18n Translation helper
  function t(key, fallback) {
    if (window.FISHAO_I18N && typeof window.FISHAO_I18N.t === 'function') {
      return window.FISHAO_I18N.t(key, fallback);
    }
    return fallback !== undefined ? fallback : key;
  }

  // Timezone detection
  var detectedTzName = "";
  var detectedTzCity = "Místní čas";
  try {
    detectedTzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (detectedTzName) {
      var cityRaw = detectedTzName.split('/').pop().replace(/_/g, ' ');
      var cityDict = {
        "Prague": "Praha",
        "Vienna": "Vídeň",
        "Bratislava": "Bratislava",
        "Warsaw": "Varšava",
        "Berlin": "Berlín",
        "London": "Londýn",
        "Paris": "Paříž",
        "Rome": "Řím"
      };
      detectedTzCity = cityDict[cityRaw] || cityRaw;
    }
  } catch (e) { }

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

    var savedIncludeFc = localStorage.getItem('fishao_include_fc');
    if (savedIncludeFc !== null) {
      var el2 = document.getElementById("includeFcCheckbox");
      if (el2) el2.checked = (savedIncludeFc === 'true');
    }
  } catch (e) { }

  // Today ISO date for date inputs
  var todayISO = new Date().toISOString().split('T')[0];
  var elNewDate = document.getElementById("newPriceDate");
  if (elNewDate) elNewDate.value = todayISO;
  var elBulkDate = document.getElementById("bulkImportDate");
  if (elBulkDate) elBulkDate.value = todayISO;

  updateTzButtonsUI();

  // -------------------------------------------------------------
  // Timezone and Clock Utilities
  // -------------------------------------------------------------

  function updateTzButtonsUI() {
    var tzLocalBtn = document.getElementById("tzLocalBtn");
    var tzUtcBtn = document.getElementById("tzUtcBtn");
    var clockLabel = document.getElementById("clockLabel");

    if (tzLocalBtn) {
      tzLocalBtn.classList.toggle("active", userTimezone === "local");
      tzLocalBtn.innerText = "📍 " + (detectedTzCity || "Místní");
      tzLocalBtn.title = "Automaticky podle tvého zařízení: " + (detectedTzName || "Místní čas");
    }
    if (tzUtcBtn) {
      tzUtcBtn.classList.toggle("active", userTimezone === "utc");
    }
    if (clockLabel) {
      clockLabel.innerText = userTimezone === "local" ? (detectedTzCity || "Místní čas") : "Herní UTC";
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
    var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
    var labelEl = document.getElementById("clockLabel");
    if (userTimezone === "utc") {
      h = now.getUTCHours();
      m = now.getUTCMinutes();
      s = now.getUTCSeconds();
      if (labelEl) labelEl.innerText = isEn ? "UTC Time (server)" : "UTC čas (server)";
    } else {
      h = now.getHours();
      m = now.getMinutes();
      s = now.getSeconds();
      if (labelEl) labelEl.innerText = (isEn ? "Local Time" : "Místní čas") + (detectedTzCity ? " (" + detectedTzCity + ")" : "");
    }
    var clockEl = document.getElementById("liveClock");
    if (clockEl) {
      clockEl.innerText = h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  function utcToLocalStr(utcH, utcM) {
    var d = new Date();
    d.setUTCHours(utcH, utcM || 0, 0, 0);
    return d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
  }

  function formatCatchTime(rawTimes) {
    if (!rawTimes || rawTimes.length === 0) return { primary: "Celý den", sub: "" };
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
    var syncBadge = document.getElementById("syncStatusBadge");
    var syncText = document.getElementById("syncStatusText");

    if (!isFirebaseConfigured) {
      if (syncBadge && syncText) {
        syncBadge.className = "sync-status-badge local";
        syncText.innerText = "Lokální";
        syncBadge.title = "Ceny a profil se ukládají pouze v tvém prohlížeči. Pro online sdílení vyplň firebase-config.js.";
      }
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

      if (syncBadge && syncText) {
        syncBadge.className = "sync-status-badge live";
        syncText.innerText = "Živě";
        syncBadge.title = "Propojeno s cloudem: Ceny a profily se synchronizují v reálném čase!";
      }

      authModule.onAuthStateChanged(auth, function (user) {
        currentUser = user;
        if (user) {
          loadUserProfile(user);
        } else {
          userProfile = null;
          isAdmin = false;
          caughtFishIds = new Set();
          currentClubName = "";
          currentClubPoints = 0;
          var ptsInput = document.getElementById("clubPointsInput");
          if (ptsInput) ptsInput.value = 0;
          var nameInput = document.getElementById("clubNameInput");
          if (nameInput) nameInput.value = "";
          var ptsManage = document.getElementById("clubPointsManageInput");
          if (ptsManage) ptsManage.value = 0;
          var nameManage = document.getElementById("clubNameManageInput");
          if (nameManage) nameManage.value = "";
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
        if (syncBadge && syncText) {
          syncBadge.className = "sync-status-badge local";
          syncText.innerText = "Offline";
        }
      });

    } catch (err) {
      console.error("Firebase initialization failed:", err);
      if (syncBadge && syncText) {
        syncBadge.className = "sync-status-badge local";
        syncText.innerText = "Chyba";
      }
      updateAuthUI();
    }
  }

  // -------------------------------------------------------------
  // Authentication & User Profile
  // -------------------------------------------------------------

  async function signIn() {
    if (!auth) {
      showAuthNotice("Pro přihlášení je potřeba nejdříve vyplnit firebase-config.js.");
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
        alert("Doména " + window.location.hostname + " není povolena ve Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else {
        alert("Přihlášení se nezdařilo: " + err.message);
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
        userProfile = {
          displayName: user.displayName || "Hráč",
          email: user.email || "",
          photoURL: user.photoURL || "",
          role: "member",
          clubName: "",
          clubPoints: currentClubPoints,
          caughtFishIds: Array.from(caughtFishIds),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await fsModule.setDoc(userDocRef, userProfile);
      }

      isAdmin = (userProfile.role === "admin");
      if (userProfile.clubPoints !== undefined) {
        currentClubPoints = userProfile.clubPoints;
        var ptsEl = document.getElementById("clubPointsInput");
        if (ptsEl) ptsEl.value = currentClubPoints;
        var ptsManage = document.getElementById("clubPointsManageInput");
        if (ptsManage) ptsManage.value = currentClubPoints;
      }
      if (userProfile.clubName !== undefined) {
        currentClubName = (userProfile.clubName || "").trim();
        var cnEl = document.getElementById("clubNameInput");
        if (cnEl) cnEl.value = currentClubName;
        var cnManage = document.getElementById("clubNameManageInput");
        if (cnManage) cnManage.value = currentClubName;
      }
      if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
        caughtFishIds = new Set(userProfile.caughtFishIds);
      }

      fsModule.onSnapshot(userDocRef, function (snap) {
        if (snap.exists()) {
          userProfile = snap.data();
          isAdmin = (userProfile.role === "admin");
          if (userProfile.clubPoints !== undefined) {
            currentClubPoints = userProfile.clubPoints;
            var ptsEl2 = document.getElementById("clubPointsInput");
            if (ptsEl2) ptsEl2.value = currentClubPoints;
            var ptsManage2 = document.getElementById("clubPointsManageInput");
            if (ptsManage2) ptsManage2.value = currentClubPoints;
          }
          if (userProfile.clubName !== undefined) {
            currentClubName = (userProfile.clubName || "").trim();
            var cnEl2 = document.getElementById("clubNameInput");
            if (cnEl2) cnEl2.value = currentClubName;
            var cnManage2 = document.getElementById("clubNameManageInput");
            if (cnManage2) cnManage2.value = currentClubName;
          }
          if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
            caughtFishIds = new Set(userProfile.caughtFishIds);
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

  function updateAuthUI() {
      var tabClub = document.getElementById("tabClub");
      var isInClub = !!(currentUser && currentClubName && currentClubName.trim().length > 0);
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

      if (!isFirebaseConfigured) {
        if (signInBtn) signInBtn.style.display = "none";
        if (userInfoBar) userInfoBar.style.display = "none";
        if (adminBadge) adminBadge.style.display = "none";
        return;
      }

      if (currentUser) {
        if (signInBtn) signInBtn.style.display = "none";
        if (userInfoBar) userInfoBar.style.display = "inline-flex";

        var avatarEl = document.getElementById("userAvatar");
        var nameEl = document.getElementById("userName");
        if (avatarEl) {
          avatarEl.src = currentUser.photoURL || "images/default-avatar.png";
          avatarEl.style.display = currentUser.photoURL ? "block" : "none";
        }
        if (nameEl) nameEl.innerText = currentUser.displayName || currentUser.email || "Hráč";
        if (adminBadge) adminBadge.style.display = isAdmin ? "inline-block" : "none";
        var resetBtn = document.getElementById("btnResetPrices");
        if (resetBtn) resetBtn.style.display = isAdmin ? "inline-block" : "none";
        var resetModalBtn = document.getElementById("btnResetPricesModal");
        if (resetModalBtn) resetModalBtn.style.display = isAdmin ? "inline-block" : "none";
        var exportBtn = document.getElementById("btnExportPrices");
        if (exportBtn) exportBtn.style.display = isAdmin ? "inline-block" : "none";

        if (bannerClubAuth) bannerClubAuth.style.display = "flex";
        if (bannerClubGuestNotice) bannerClubGuestNotice.style.display = "none";

        var collNotice = document.getElementById("collectionSyncNotice");
        if (collNotice) {
          collNotice.innerHTML = "☁️ Synchronizováno s Google profilem (" + (currentUser.displayName || currentUser.email || "Přihlášen") + ")";
        }

        if (currentView === "club_manage") {
          if (gateClub) gateClub.style.display = "none";
          if (manageContent) manageContent.style.display = "block";
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
        var resetBtnOffline = document.getElementById("btnResetPrices");
        if (resetBtnOffline) resetBtnOffline.style.display = "none";
        var resetModalBtnOff = document.getElementById("btnResetPricesModal");
        if (resetModalBtnOff) resetModalBtnOff.style.display = "none";
        var exportBtnOff = document.getElementById("btnExportPrices");
        if (exportBtnOff) exportBtnOff.style.display = "none";

        if (bannerClubAuth) bannerClubAuth.style.display = "none";
        if (bannerClubGuestNotice) bannerClubGuestNotice.style.display = "block";

        var collNoticeOff = document.getElementById("collectionSyncNotice");
        if (collNoticeOff) {
          collNoticeOff.innerHTML = "🔒 Pro ukládání úlovků do sbírky se <a href=\"javascript:window.fishaoApp.signIn()\" style=\"color: #34d399; font-weight: 700; text-decoration: underline;\">přihlas přes Google</a>";
        }

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
      notice.innerText = "🔑 " + (msg || "Pro tuto akci se musíš nejdříve přihlásit přes Google účet.");
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
        showAuthNotice("Pro ukládání úlovků do sbírky se musíš přihlásit přes Google.");
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
          navBadge.innerText = "Zamčeno 🔒";
        } else {
          navBadge.innerText = (currentView === "club" ? clubCount + " / 80" : allCount + " / 615");
        }
      }

      var clubPtsBadge = document.getElementById("navClubPtsBadge");
      if (clubPtsBadge) {
        if (!currentUser) {
          clubPtsBadge.innerText = "Zamčeno 🔒";
        } else if (currentClubName) {
          clubPtsBadge.innerText = currentClubPoints.toLocaleString('cs-CZ') + " b.";
        } else {
          clubPtsBadge.innerText = "Bez klubu";
        }
      }

      var manageCaught = document.getElementById("manageCaughtClub");
      if (manageCaught) manageCaught.innerText = clubCount + " / " + clubFishes.length + " chyceno";
      var manageFill = document.getElementById("manageProgressFill");
      if (manageFill) {
        var clubPct = clubFishes.length > 0 ? (clubCount / clubFishes.length * 100) : 0;
        manageFill.style.width = clubPct.toFixed(1) + "%";
      }

      var marketSummary = document.getElementById("marketStatsSummary");
      if (marketSummary) {
        var priceCount = Object.keys(priceHistory).length;
        marketSummary.innerText = "Zaznamenáno cen ryb: " + priceCount;
      }
    }

    // -------------------------------------------------------------
    // Club and Profile Settings
    // -------------------------------------------------------------

    function syncClubName(val) {
      if (!currentUser) {
        showAuthNotice("Pro správu klubu se musíš přihlásit přes Google.");
        return;
      }
      currentClubName = (val || "").trim();

      var el1 = document.getElementById("clubNameInput");
      if (el1 && el1.value !== currentClubName) el1.value = currentClubName;
      var el2 = document.getElementById("clubNameManageInput");
      if (el2 && el2.value !== currentClubName) el2.value = currentClubName;

      updateAuthUI();
      updateCaughtStats();

      if (currentUser && db) {
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(function (fsModule) {
          var userDocRef = fsModule.doc(db, "users", currentUser.uid);
          fsModule.updateDoc(userDocRef, { clubName: currentClubName });
        }).catch(function (e) { console.error("Failed to update club name:", e); });
      }
    }

    function syncClubPoints(val) {
      if (!currentUser) {
        showAuthNotice("Pro nastavení klubových bodů se musíš přihlásit přes Google.");
        return;
      }
      var pts = Math.max(0, parseInt(val) || 0);
      currentClubPoints = pts;

      var el1 = document.getElementById("clubPointsInput");
      if (el1 && parseInt(el1.value) !== pts) el1.value = pts;
      var el2 = document.getElementById("clubPointsManageInput");
      if (el2 && parseInt(el2.value) !== pts) el2.value = pts;

      var badge = document.getElementById("navClubPtsBadge");
      if (badge) badge.innerText = pts.toLocaleString('cs-CZ') + " b.";

      if (currentUser && db) {
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(function (fsModule) {
          var userDocRef = fsModule.doc(db, "users", currentUser.uid);
          fsModule.updateDoc(userDocRef, { clubPoints: pts });
        }).catch(function (e) { console.error("Failed to update club points:", e); });
      }

      if (currentView === 'club_manage') {
        renderClubMilestones();
      } else {
        applyFilters();
      }
    }

    function addClubPoints(amount) {
      syncClubPoints(currentClubPoints + amount);
    }

    function onClubNameChange() {
      var val = document.getElementById("clubNameInput") ? document.getElementById("clubNameInput").value : "";
      syncClubName(val);
    }

    function onPointsChange() {
      var val = document.getElementById("clubPointsInput") ? document.getElementById("clubPointsInput").value : 0;
      syncClubPoints(val);
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

    function getLatestPrice(fid) {
      var list = getFishPrices(fid);
      if (!list || list.length === 0) return null;
      return list[0];
    }

    function updateModalCaughtBtn(fid) {
      var btn = document.getElementById("modalBtnCaught");
      if (!btn) return;
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var isCaught = caughtFishIds.has(fid);
      btn.className = "btn-caught-pill " + (isCaught ? "caught" : "");
      btn.innerHTML = isCaught ? (isEn ? "✓ Caught (in collection)" : "✓ Chyceno (ve sbírce)") : (isEn ? "+ Mark as caught" : "+ Označit jako chycené");
    }

    function toggleCaughtFromModal() {
      if (!selectedModalFishId) return;
      toggleCaughtFish(selectedModalFishId);
      updateModalCaughtBtn(selectedModalFishId);
    }

    function openPriceModal(fid) {
      selectedModalFishId = fid;
      var f = (currentView === "club" ? clubFishes : allFishes).find(function (x) { return x.id === fid; })
        || allFishes.find(function (x) { return x.id === fid; })
        || clubFishes.find(function (x) { return x.id === fid; });
      if (!f) return;

      var nameEl = document.getElementById("modalFishName");
      if (nameEl) nameEl.innerText = f.name;

      var idBadge = document.getElementById("modalFishIdBadge");
      if (idBadge) idBadge.innerText = "#" + f.id;

      var clubTag = document.getElementById("modalFishClubTag");
      if (clubTag) clubTag.style.display = (f.is_club || f.points !== undefined) ? "inline-block" : "none";

      var imgEl = document.getElementById("modalFishImg");
      if (imgEl) {
        imgEl.src = "images/fish_" + f.id + ".png";
        imgEl.onerror = function () {
          this.src = "https://play.fishao.net/data/image/fishes/fish255x85_" + f.id + "_item.png";
        };
      }

      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      if (nameEl) nameEl.innerText = fishName;

      var isNow = isFishActiveNow(f.raw_times);
      var actBadge = document.getElementById("modalFishActiveBadge");
      if (actBadge) {
        actBadge.innerText = t('time_active_now', isEn ? "⚡ BITING NOW" : "⚡ BERE TEĎ");
        actBadge.style.display = isNow ? "inline-block" : "none";
      }

      var ratingBox = document.getElementById("modalFishRatingBox");
      if (ratingBox) ratingBox.innerHTML = renderRatingBadge(f.rating);

      updateModalCaughtBtn(fid);

      // Locations and water
      var locEl = document.getElementById("modalFishLocations");
      if (locEl) {
        var waterBadge = f.water ? (f.water === 'Slaná' ? '🌊 ' + (isEn ? 'Saltwater' : 'Slaná voda') : '🌿 ' + (isEn ? 'Freshwater' : 'Sladká voda')) : '';
        var locs = f.locations && f.locations.length
          ? f.locations.map(function(l) { return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l; }).join(', ')
          : (f.is_club ? (window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName('Klubový revír') : 'Klubový revír') : (isEn ? 'Unspecified' : 'Nespecifikováno'));
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
          : '<span style="color: var(--text-muted);">' + (isEn ? 'Unknown' : 'Neznámé') + '</span>';
      }

      // Time
      var timeEl = document.getElementById("modalFishTime");
      if (timeEl) {
        var timeInfo = formatCatchTime(f.raw_times);
        timeEl.innerHTML = '<span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
          (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
          (isNow ? ' <span class="time-now-active">BERE TEĎ</span>' : '') +
          '</span>' + (timeInfo.sub ? ' <span style="font-size: 11px; color: var(--text-muted);">' + timeInfo.sub + '</span>' : '');
      }

      // Dimensions
      var dimEl = document.getElementById("modalFishDimensions");
      if (dimEl) {
        dimEl.innerHTML = '<span class="len-dim">Min: ' + f.min_l + ' cm</span> • ' +
          '<strong class="len-avg" style="color: #38bdf8;">Průměr: ' + f.avg_l + ' cm</strong> • ' +
          '<span class="len-dim">Max: ' + f.max_l + ' cm</span>';
      }

      // Club unlock status
      var clubBox = document.getElementById("modalFishClubBox");
      var clubUnlockEl = document.getElementById("modalFishClubUnlock");
      if (clubBox && clubUnlockEl) {
        if (f.unlock_type || f.is_club) {
          clubBox.style.display = "block";
          var status = getUnlockStatus(f, currentClubPoints, true);
          clubUnlockEl.innerHTML = '<strong style="color: #fbbf24;">' + status.costText + '</strong> (' + status.desc + ')';
        } else {
          clubBox.style.display = "none";
        }
      }

      var elNewDate = document.getElementById("newPriceDate");
      if (elNewDate) elNewDate.value = todayISO;
      var elNewVal = document.getElementById("newPriceValue");
      if (elNewVal) elNewVal.value = "";

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

      var todayPriceEl = document.getElementById("statTodayPrice");
      var minPriceEl = document.getElementById("statMinPrice");
      var maxPriceEl = document.getElementById("statMaxPrice");

      // Look for today's price entry
      var todayEntry = list.find(function (x) { return x.date === todayISO; });
      if (todayEntry) {
        if (todayPriceEl) {
          todayPriceEl.innerText = todayEntry.price.toLocaleString('cs-CZ') + " FB";
          todayPriceEl.style.color = "#38bdf8";
        }
      } else {
        if (todayPriceEl) {
          todayPriceEl.innerText = "--";
          todayPriceEl.style.color = "var(--text-muted)";
        }
      }

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 15px;">Zatím žádná zaznamenaná cena pro tuto rybu.</td></tr>';
        if (minPriceEl) minPriceEl.innerText = "--";
        if (maxPriceEl) maxPriceEl.innerText = "--";
        return;
      }

      var pricesNum = list.map(function (x) { return x.price; });
      var minP = Math.min.apply(null, pricesNum);
      var maxP = Math.max.apply(null, pricesNum);

      if (minPriceEl) minPriceEl.innerText = minP.toLocaleString('cs-CZ') + " FB";
      if (maxPriceEl) maxPriceEl.innerText = maxP.toLocaleString('cs-CZ') + " FB";

      tbody.innerHTML = list.map(function (item, idx) {
        var actionHtml = isAdmin
          ? '<button class="btn-delete-price" title="Smazat záznam (Admin)" onclick="window.fishaoApp.deletePriceEntry(' + fid + ', ' + idx + ')">🗑️</button>'
          : '<span title="Smazat záznam může pouze administrátor" style="color: var(--text-muted); font-size: 13px; cursor: default;">🔒</span>';

        var isToday = (item.date === todayISO);
        var rowStyle = isToday ? 'background: rgba(56, 189, 248, 0.08);' : '';
        var todayTag = isToday ? ' <span style="font-size: 10px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 4px; font-weight: 700;">Dnes</span>' : '';

        return '<tr style="' + rowStyle + '">' +
          '<td style="color: #cbd5e1; font-weight: 600;">' + item.date + todayTag + '</td>' +
          '<td style="color: #34d399; font-weight: 800;"><span class="cash-icon">💵</span> ' + item.price.toLocaleString('cs-CZ') + ' FB</td>' +
          '<td style="text-align: center;">' + actionHtml + '</td>' +
          '</tr>';
      }).join('');
    }

    async function submitNewPrice() {
      if (!selectedModalFishId) return;

      if (!currentUser) {
        showAuthNotice("Pro zadání ceny do Fish Marketu se prosím přihlas přes Google.");
        return;
      }

      var d = document.getElementById("newPriceDate").value;
      var p = parseInt(document.getElementById("newPriceValue").value);

      if (!d || isNaN(p) || p <= 0) {
        alert("Prosím zadej platné datum a kladnou částku ve fishměně (FB).");
        return;
      }

      var fidStr = selectedModalFishId.toString();
      if (!priceHistory[fidStr]) priceHistory[fidStr] = [];

      var existingIdx = priceHistory[fidStr].findIndex(function (it) { return it.date === d; });
      if (existingIdx !== -1) {
        if (!isAdmin) {
          alert("Cena pro tuto rybu na datum " + d + " již v systému existuje (" + priceHistory[fidStr][existingIdx].price + " FB).\n\nBěžný uživatel smí nastavit cenu pro daný den pouze jednou. Přepsání nebo úpravu může provést pouze administrátor.");
          return;
        }
        if (!confirm("Cena pro datum " + d + " již existuje (" + priceHistory[fidStr][existingIdx].price + " FB).\n\nJako administrátor ji chceš přepsat na " + p + " FB?")) {
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
        alert("Smazat záznam z historie cen může pouze administrátor.");
        return;
      }

      var fidStr = fid.toString();
      if (!priceHistory[fidStr]) return;
      if (!confirm("Opravdu chceš smazat tento záznam z historie?")) return;

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

    function openBulkModal() {
      if (!currentUser) {
        showAuthNotice("Hromadný import do Fish Marketu vyžaduje přihlášení přes Google.");
        return;
      }
      document.getElementById("bulkModalOverlay").classList.add("active");
      document.getElementById("bulkResultMsg").style.display = "none";
    }

    function closeBulkModal() {
      document.getElementById("bulkModalOverlay").classList.remove("active");
    }

    function closeAllModals() {
      closePriceModal();
      closeBulkModal();
    }

    function onModalOverlayClick(e, id) {
      if (e.target.id === id) {
        if (id === 'priceModalOverlay') closePriceModal();
        if (id === 'bulkModalOverlay') closeBulkModal();
      }
    }

    // Close modals on Escape key press
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        closeAllModals();
      }
    });

    function normStr(s) {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    async function processBulkImport() {
      if (!currentUser) {
        showAuthNotice("Hromadný import do Fish Marketu vyžaduje přihlášení přes Google.");
        return;
      }
      var dateVal = document.getElementById("bulkImportDate").value || todayISO;
      var text = document.getElementById("bulkInputText").value.trim();
      var resEl = document.getElementById("bulkResultMsg");

      if (!text) {
        resEl.style.display = "block";
        resEl.style.background = "rgba(239,68,68,0.2)";
        resEl.style.color = "#f87171";
        resEl.innerText = "Vlož prosím nejprve text se seznamem ryb a cen.";
        return;
      }

      var nameToFish = new Map();
      for (var i = 0; i < allFishes.length; i++) {
        nameToFish.set(normStr(allFishes[i].name), allFishes[i]);
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
              // Non-admin cannot overwrite an already existing price for this day
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
      resEl.innerText = "Zpracováno: " + matched + " cen k datu " + dateVal + (skipped > 0 ? " (" + skipped + " přeskočeno: buď neznámé, nebo cena pro daný den již existuje a nemáš admin práva na přepsání)" : "") + ".";
    }

    function exportPricesJson() {
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(priceHistory, null, 2));
      var a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "fishao_ceny_" + todayISO + ".json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    async function resetPriceHistoryToDefault() {
      if (!isAdmin) {
        alert("Obnovit výchozí ceník pro všechny hráče může pouze administrátor.");
        return;
      }
      if (!confirm("Opravdu chceš vymazat všechny vlastní úpravy a obnovit výchozí ceník pro všechny uživatele?")) return;
      priceHistory = JSON.parse(JSON.stringify(initialPrices));
      await persistPriceHistory();
      applyFilters();
      var resEl = document.getElementById("bulkResultMsg");
      resEl.style.display = "block";
      resEl.style.background = "rgba(56,189,248,0.2)";
      resEl.style.color = "#38bdf8";
      resEl.innerText = "Historie cen byla obnovena na výchozí hodnoty (Admin).";
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

      // Reset all size pills
      document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });

      if (isAlreadyActive) {
        // Toggle off - clear the size filter inputs
        if (minEl) minEl.value = "";
        if (maxEl) maxEl.value = "";
      } else {
        // Activate this size preset
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

    function getUnlockStatus(fish, userPoints, includeFc) {
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      if (fish.unlock_type === 'points') {
        var required = fish.points;
        var diff = required - userPoints;
        var isUnlocked = diff <= 0;
        return {
          isUnlocked: isUnlocked,
          costText: required + (isEn ? " pts" : " b."),
          desc: isUnlocked ? (isEn ? "✓ Unlocked" : "✓ Odemčeno") : (isEn ? "Needs " + diff + " pts" : "Chybí ještě " + diff + " b.")
        };
      } else if (fish.unlock_type === 'fc') {
        return {
          isUnlocked: includeFc,
          costText: fish.fc + " FC",
          desc: includeFc ? "✓ Fishcoins" : (isEn ? "Requires Fishcoins" : "Vyžaduje Fishcoins")
        };
      } else {
        return {
          isUnlocked: includeFc,
          costText: isEn ? "Monster" : "Monstrum",
          desc: includeFc ? (isEn ? "✓ Club feeding" : "✓ Krmení klubu") : (isEn ? "Club monster" : "Klubové monstrum")
        };
      }
    }

    function renderRatingBadge(r) {
      var ratingNum = Math.max(1, Math.min(5, parseInt(r) || 1));
      var filledStars = "★".repeat(ratingNum);
      var emptyStars = "★".repeat(5 - ratingNum);
      return '<span class="rating-badge rate-' + ratingNum + '" title="Rating: ' + ratingNum + ' / 5 hvězd">' +
        '<span class="rating-num">' + ratingNum + '★</span>' +
        '<span class="rating-stars-track">' +
        '<span class="stars-active">' + filledStars + '</span>' +
        '<span class="stars-inactive">' + emptyStars + '</span>' +
        '</span>' +
        '</span>';
    }

    function renderStars(r) {
      return renderRatingBadge(r);
    }

    var collectionFilterMode = 'all'; // 'all', 'caught', 'missing'
    var currentMilestoneFilter = 'all'; // 'all', 'unlocked', 'locked', 'fc'

    function setCollectionFilter(mode, btn) {
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
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');

      var ptsInput = document.getElementById("clubPointsManageInput");
      if (ptsInput) ptsInput.value = currentClubPoints;
      var nameInput = document.getElementById("clubNameManageInput");
      if (nameInput) nameInput.value = currentClubName;

      // Sort club fish: points fish first (by points asc), then fc, then monster
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

      if (managePtsUnlocked) managePtsUnlocked.innerText = unlockedPointsCount + " / " + totalPointsFish + (isEn ? " fish" : " ryb");
      if (manageCaughtClub) manageCaughtClub.innerText = caughtClubCount + " / " + clubFishes.length + (isEn ? " caught" : " chyceno");
      if (manageProgressFill) {
        var pct = clubFishes.length > 0 ? (caughtClubCount / clubFishes.length * 100) : 0;
        manageProgressFill.style.width = pct.toFixed(1) + "%";
      }

      // Render Next Milestone Card
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
          var nextWater = nextFish.water === 'Slaná' ? ('🌊 ' + (isEn ? 'Saltwater' : 'Slaná')) : ('🌿 ' + (isEn ? 'Freshwater' : 'Sladká'));
          var nextBaits = nextFish.baits ? nextFish.baits.map(function (b) { return window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b; }).join(', ') : '';

          nextCard.innerHTML =
            '<div class="dash-card-header">' +
            '<span class="dash-card-title" style="color: #fbbf24;">' + (isEn ? "🎯 Next Unlockable Fish" : "🎯 Nejbližší odemknutelná ryba") + '</span>' +
            '<span class="dash-stat-badge" style="color: #fbbf24; border-color: rgba(245,158,11,0.3);">' + nextFish.points + (isEn ? " pts" : " b.") + '</span>' +
            '</div>' +
            '<div class="dash-card-body">' +
            '<div class="milestone-fish-row" style="margin-top: 4px;">' +
            '<div class="milestone-fish-img-box" style="width: 70px; height: 46px;">' +
            '<img src="images/fish_' + nextFish.id + '.png" class="milestone-fish-img" alt="' + nextFishName + '" onerror="this.src=\'images/default-fish.png\'">' +
            '</div>' +
            '<div class="milestone-fish-info">' +
            '<div class="milestone-fish-name" style="font-size: 14px;">' + nextFishName + '</div>' +
            '<div class="milestone-fish-meta">' + nextWater + ' • ' + renderRatingBadge(nextFish.rating) + ' • ' + nextBaits + '</div>' +
            '<div style="font-size: 11px; color: #f87171; font-weight: 700; margin-top: 2px;">' + (isEn ? (minDiff + " pts remaining") : ("Zbývá ještě " + minDiff + " bodů")) + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="caught-progress-track" style="margin-top: 8px;" title="' + (isEn ? "Progress to milestone: " : "Postup k tomuto milníku: ") + targetPct.toFixed(0) + '%">' +
            '<div class="caught-progress-fill" style="width: ' + targetPct.toFixed(1) + '%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>' +
            '</div>' +
            '</div>';
        } else {
          nextCard.innerHTML =
            '<div class="dash-card-header">' +
            '<span class="dash-card-title" style="color: #34d399;">' + (isEn ? "🎉 All Unlocked!" : "🎉 Vše odemčeno!") + '</span>' +
            '</div>' +
            '<div class="dash-card-body" style="text-align: center; padding: 16px;">' +
            '<div style="font-size: 32px;">🏆</div>' +
            '<div style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 4px;">' + (isEn ? "Your club has unlocked all points fishes!" : "Váš klub má odemčené všechny bodové ryby!") + '</div>' +
            '<div style="font-size: 12px; color: var(--text-muted);">' + (isEn ? ("Congratulations on reaching " + currentClubPoints + " pts.") : ("Gratulace k dosažení " + currentClubPoints + " bodů.")) + '</div>' +
            '</div>';
        }
      }

      if (!grid) return;

      var filteredCards = sorted.filter(function (f) {
        var isUnlocked = (f.unlock_type === 'points') ? (currentClubPoints >= f.points) : true;
        if (currentMilestoneFilter === 'unlocked') return isUnlocked && f.unlock_type === 'points';
        if (currentMilestoneFilter === 'locked') return !isUnlocked && f.unlock_type === 'points';
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
          statusText = isUnlocked ? (isEn ? "✓ Unlocked" : "✓ Odemčeno") : (isEn ? "🔒 Needs " + diff + " pts" : "🔒 Chybí " + diff + " b.");
          costBadge = f.points + (isEn ? " pts" : " b.");
        } else if (f.unlock_type === 'fc') {
          isUnlocked = true;
          statusClass = "fc";
          statusText = "💎 Fishcoins";
          costBadge = (f.fc || "") + " FC";
        } else {
          isUnlocked = true;
          statusClass = "monster";
          statusText = isEn ? "👾 Monster" : "👾 Monstrum";
          costBadge = isEn ? "Club" : "Klubové";
        }

        var isCaught = caughtFishIds.has(f.id);
        var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
        var waterLabel = f.water === 'Slaná' ? ('🌊 ' + (isEn ? 'Saltwater' : 'Slaná')) : ('🌿 ' + (isEn ? 'Freshwater' : 'Sladká'));
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
          (isCaught ? (isEn ? '✓ Caught' : '✓ Chyceno') : (isEn ? '+ Catch' : '+ Chytit')) +
          '</button>' +
          '</div>' +
          '</div>';
      }).join('');
    }

    function switchView(view) {
      var isInClub = !!(currentUser && currentClubName && currentClubName.trim().length > 0);
      if (view === "club" && !isInClub) {
        view = "all";
      }
      currentView = view;

      // Toggle active state on all tabs
      var tabs = ["tabClub", "tabAll", "tabClubManage", "tabCollection", "tabMarket"];
      var tabMap = {
        "club": "tabClub",
        "all": "tabAll",
        "club_manage": "tabClubManage",
        "collection": "tabCollection",
        "market": "tabMarket"
      };

      tabs.forEach(function (tId) {
        var el = document.getElementById(tId);
        if (el) el.classList.toggle("active", tabMap[view] === tId);
      });

      // Contextual banners and sections
      var bClub = document.getElementById("bannerClub");
      var bAll = document.getElementById("bannerAll");
      var bCollection = document.getElementById("bannerCollection");
      var bMarket = document.getElementById("bannerMarket");
      var secManage = document.getElementById("sectionClubManage");
      var secTable = document.getElementById("sectionFishTable");
      var filterCard = document.getElementById("filterCard");
      var gateClub = document.getElementById("gateClubManage");
      var manageContent = document.getElementById("manageClubContent");
      var gateCollection = document.getElementById("gateCollection");

      if (bClub) bClub.style.display = (view === "club") ? "flex" : "none";
      if (bAll) bAll.style.display = (view === "all") ? "flex" : "none";
      if (bCollection) bCollection.style.display = (view === "collection" && currentUser) ? "flex" : "none";
      if (bMarket) bMarket.style.display = (view === "market") ? "flex" : "none";

      if (view === "club_manage") {
        if (secManage) secManage.style.display = "block";
        if (secTable) secTable.style.display = "none";
        if (gateCollection) gateCollection.style.display = "none";

        if (!currentUser) {
          if (gateClub) gateClub.style.display = "block";
          if (manageContent) manageContent.style.display = "none";
        } else {
          if (gateClub) gateClub.style.display = "none";
          if (manageContent) manageContent.style.display = "block";
          renderClubMilestones();
          updateCaughtStats();
        }
        return;
      } else {
        if (secManage) secManage.style.display = "none";
      }

      if (view === "collection") {
        if (!currentUser) {
          if (gateCollection) gateCollection.style.display = "block";
          if (secTable) secTable.style.display = "none";
          if (filterCard) filterCard.style.display = "none";
          return;
        } else {
          if (gateCollection) gateCollection.style.display = "none";
          if (secTable) secTable.style.display = "block";
          if (filterCard) filterCard.style.display = "flex";
        }
      } else {
        if (gateCollection) gateCollection.style.display = "none";
        if (secTable) secTable.style.display = "block";
        if (filterCard) filterCard.style.display = "flex";
      }

      var waterFilterGroup = document.getElementById("waterFilterGroup");
      var locationFilterGroup = document.getElementById("locationFilterGroup");
      var missionSizeRow = document.getElementById("missionSizeRow");

      if (waterFilterGroup) waterFilterGroup.style.display = (view === "club") ? "flex" : "none";
      if (locationFilterGroup) locationFilterGroup.style.display = (view !== "club") ? "flex" : "none";
      if (missionSizeRow) missionSizeRow.style.display = (view === "all" || view === "collection") ? "flex" : "none";

      if (view === "market") {
        filterOnlyPrice = true;
        var btnP = document.getElementById("btnOnlyPrice");
        if (btnP) btnP.classList.add("active");
        var sortEl = document.getElementById("sortBy");
        if (sortEl) sortEl.value = "price_desc";
      } else if (view === "club") {
        filterOnlyPrice = false;
        var btnP2 = document.getElementById("btnOnlyPrice");
        if (btnP2) btnP2.classList.remove("active");
      }

      renderTableHead();
      updateCaughtStats();
      applyFilters();
    }

    function renderTableHead() {
      var thead = document.getElementById("tableHead");
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var caughtCol = '<th style="width: 44px; text-align: center;" title="' + (isEn ? 'Mark fishes you have caught' : 'Označ ryby, které jsi již chytil/a') + '">✓</th>';

      if (currentView === "club") {
        thead.innerHTML =
          '<tr>' +
          '<th style="width: 48px;">#</th>' +
          caughtCol +
          '<th style="width: 95px;">' + (isEn ? 'Appearance' : 'Vzhled') + '</th>' +
          '<th>' + t('col_water', 'Voda') + '</th>' +
          '<th>' + t('col_fish', 'Název ryby') + '</th>' +
          '<th>' + t('col_rarity', 'Rating') + '</th>' +
          '<th>' + t('col_price', 'Cena (Fish Market)') + '</th>' +
          '<th>' + t('col_baits', 'Návnada') + '</th>' +
          '<th>' + t('col_time', 'Čas lovu') + '</th>' +
          '<th>' + (isEn ? 'Size (Min / AVG / Max)' : 'Rozměry (Min / PRŮMĚR / Max)') + '</th>' +
          '<th style="min-width: 140px;">' + t('col_unlock', 'Klubové odemčení') + '</th>' +
          '</tr>';
      } else {
        thead.innerHTML =
          '<tr>' +
          '<th style="width: 48px;">#</th>' +
          caughtCol +
          '<th style="width: 95px;">' + (isEn ? 'Appearance' : 'Vzhled') + '</th>' +
          '<th>' + t('col_fish', 'Název ryby') + '</th>' +
          '<th>' + t('col_rarity', 'Rating') + '</th>' +
          '<th>' + t('col_price', 'Cena (Fish Market)') + '</th>' +
          '<th>' + t('col_loc', 'Lokace výskytu') + '</th>' +
          '<th>' + t('col_baits', 'Návnada') + '</th>' +
          '<th>' + t('col_time', 'Čas lovu') + '</th>' +
          '<th>' + (isEn ? 'Size (Min / AVG / Max)' : 'Rozměry (Min / PRŮMĚR / Max)') + '</th>' +
          '</tr>';
      }
    }

    function renderPriceCell(fid) {
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var latest = getLatestPrice(fid);
      var list = getFishPrices(fid);
      var histCount = list.length > 1 ? '<span class="price-history-count" title="' + (isEn ? 'Records in history' : 'Záznamů v historii') + '">' + list.length + 'x</span>' : "";

      if (latest) {
        return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + (isEn ? 'Click for details & history' : 'Klikni pro detail ryby a Fish Market') + '">' +
          '<span class="price-badge"><span class="cash-icon">💵</span> ' + latest.price.toLocaleString(isEn ? 'en-US' : 'cs-CZ') + ' FB' + histCount + '</span></div>';
      } else {
        return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + (isEn ? 'Click to enter price' : 'Klikni pro zadání ceny') + '">' +
          '<span class="price-empty">+ ' + (isEn ? 'Add' : 'Zadat') + '</span></div>';
      }
    }

    function renderCaughtBtn(fishId) {
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var isCaught = caughtFishIds.has(fishId);
      var title = !currentUser
        ? (isEn ? "Sign in with Google to save catches to your collection" : "Pro ukládání úlovků do sbírky se musíš přihlásit přes Google")
        : (isCaught ? (isEn ? "Marked as caught (click to unmark)" : "Označeno jako chycené (klikni pro zrušení)") : (isEn ? "Click to mark as caught" : "Klikni pro označení jako chycené"));
      return '<button class="caught-btn' + (isCaught ? ' caught' : '') + '" onclick="event.stopPropagation(); window.fishaoApp.toggleCaughtFish(' + fishId + ')" title="' + title + '">' +
        (isCaught ? '✓' : '') + '</button>';
    }

    function renderTableBody(data) {
      var tbody = document.getElementById("tableBody");
      var total = currentView === "club" ? clubFishes.length : allFishes.length;
      var includeFc = document.getElementById("includeFcCheckbox").checked;
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');

      if (data.length === 0) {
        var colCount = currentView === "club" ? 11 : 10;
        var emptyMsg = isEn 
          ? "❌ No fish match the selected filters. Try adjusting or resetting filters." 
          : "❌ Žádná ryba neodpovídá zadaným filtrům. Zkus upravit nebo obnovit filtry.";
        tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="empty-state">' + emptyMsg + '</td></tr>';
        document.getElementById("counter").innerText = (isEn ? "Showing 0 of " + total + " fish" : "Zobrazeno 0 z " + total + " ryb");
        return;
      }

      var rowClickTitle = isEn ? "Click for fish details and Fish Market" : "Klikni pro detail ryby a Fish Market";
      var activeNowLabel = t('time_active_now', isEn ? "BITING NOW" : "BERE TEĎ");

      if (currentView === "club") {
        tbody.innerHTML = data.map(function (f) {
          var isNow = isFishActiveNow(f.raw_times);
          var timeInfo = formatCatchTime(f.raw_times);
          var unlock = getUnlockStatus(f, currentClubPoints, includeFc);
          var rowClass = [];
          if (!unlock.isUnlocked) rowClass.push("row-locked");
          if (caughtFishIds.has(f.id)) rowClass.push("row-caught");

          var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
          var waterLabel = f.water === 'Slaná' ? ('🌊 ' + (isEn ? 'Saltwater' : 'Slaná')) : ('🌿 ' + (isEn ? 'Freshwater' : 'Sladká'));

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
        tbody.innerHTML = data.map(function (f, idx) {
          var isNow = isFishActiveNow(f.raw_times);
          var timeInfo = formatCatchTime(f.raw_times);
          var rowClass = caughtFishIds.has(f.id) ? "row-caught" : "";

          var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
          var clubTagText = isEn ? "🏆 Club Fish" : "🏆 Klubová";
          var unspecText = isEn ? "Unspecified" : "Nespecifikováno";

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

      document.getElementById("counter").innerText = isEn ? ("Showing " + data.length + " of " + total + " fish") : ("Zobrazeno " + data.length + " z " + total + " ryb");
    }

    function updateClubStats() {
      var includeFc = document.getElementById("includeFcCheckbox").checked;
      var hideLocked = document.getElementById("hideLockedCheckbox").checked;

      localStorage.setItem('fishao_hide_locked', hideLocked);
      localStorage.setItem('fishao_include_fc', includeFc);

      var unlockedCount = 0;
      var nextFish = null;
      var minDiff = Infinity;

      for (var i = 0; i < clubFishes.length; i++) {
        var f = clubFishes[i];
        var status = getUnlockStatus(f, currentClubPoints, includeFc);
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

      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var lockedCount = 80 - unlockedCount;
      var lockedNoticeEl = document.getElementById("lockedNotice");
      if (lockedNoticeEl) {
        lockedNoticeEl.innerText = lockedCount > 0 ? ("(" + lockedCount + " " + (isEn ? "locked" : "zamčeno") + ")") : "";
      }

      var hintEl = document.getElementById("nextUnlockHint");
      if (hintEl) {
        if (nextFish) {
          var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(nextFish) : nextFish.name;
          var waterName = window.FISHAO_I18N ? window.FISHAO_I18N.getWaterName(nextFish.water) : nextFish.water;
          if (isEn) {
            hintEl.innerHTML = "🎯 Next fish to unlock: <strong>" + fishName + "</strong> (" + waterName + ", requires " + nextFish.points + " pts – <strong>" + minDiff + " pts remaining</strong>)";
          } else {
            hintEl.innerHTML = "🎯 Další ryba k odemčení: <strong>" + fishName + "</strong> (" + waterName + ", vyžaduje " + nextFish.points + " b. – zbývá ještě <strong>" + minDiff + " b.</strong>)";
          }
        } else {
          hintEl.innerHTML = isEn ? "🎉 You have unlocked all points-based club fishes!" : "🎉 Všechny bodové klubové ryby máš odemčeny!";
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
      var includeFc = document.getElementById("includeFcCheckbox").checked;
      var filterUncaught = document.getElementById("filterUncaughtCheckbox") ? document.getElementById("filterUncaughtCheckbox").checked : false;

      var minEl = document.getElementById("minSizeInput");
      var maxEl = document.getElementById("maxSizeInput");
      var minSize = minEl && minEl.value !== "" ? parseFloat(minEl.value) : NaN;
      var maxSize = maxEl && maxEl.value !== "" ? parseFloat(maxEl.value) : NaN;

      filterNowActive = (timeVal === "now");
      document.getElementById("btnNow").classList.toggle("active", filterNowActive);

      var dataset = currentView === "club" ? clubFishes : allFishes;

      var filtered = dataset.filter(function (f) {
        // Locked club fish filter
        if (currentView === "club" && hideLocked) {
          var status = getUnlockStatus(f, currentClubPoints, includeFc);
          if (!status.isUnlocked) return false;
        }

        // Name or ID search (supports both active language, original name, and ID)
        var localizedName = (window.FISHAO_I18N && window.FISHAO_I18N.getFishName) ? window.FISHAO_I18N.getFishName(f).toLowerCase() : '';
        if (q && !f.name.toLowerCase().includes(q) && !localizedName.includes(q) && !f.id.toString().includes(q)) return false;

        // Bait category
        if (bait && !f.baits.includes(bait)) return false;

        // Star rating
        if (rating) {
          if (rating === "min3" && f.rating < 3) return false;
          if (rating === "min4" && f.rating < 4) return false;
          if (rating.match(/^\d$/) && f.rating !== parseInt(rating)) return false;
        }

        // Water type or location
        if (currentView === "club" && water && f.water !== water) return false;
        if (currentView === "all" && location && !f.locations.includes(location)) return false;

        // Size range filter (interval overlap):
        // A fish matches [minSize, maxSize] if f.max_l >= minSize and f.min_l <= maxSize
        if (!isNaN(minSize) && f.max_l < minSize) return false;
        if (!isNaN(maxSize) && f.min_l > maxSize) return false;

        // Time of day activity
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

        // Only with price
        if (filterOnlyPrice) {
          var latest = getLatestPrice(f.id);
          if (!latest) return false;
        }

        // Only uncaught fish
        if (filterUncaught && caughtFishIds.has(f.id)) return false;

        // Collection view filter mode (all, caught, missing)
        if (currentView === "collection") {
          if (collectionFilterMode === "caught" && !caughtFishIds.has(f.id)) return false;
          if (collectionFilterMode === "missing" && caughtFishIds.has(f.id)) return false;
        }

        return true;
      });

      // Sorting
      if (sortBy === "price_desc") {
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
        var curLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
        filtered.sort(function (a, b) {
          var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
          var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
          return nameA.localeCompare(nameB, curLang);
        });
      } else if (sortBy === "name_desc") {
        var curLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
        filtered.sort(function (a, b) {
          var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
          var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
          return nameB.localeCompare(nameA, curLang);
        });
      } else if (sortBy === "rating_desc") {
        filtered.sort(function (a, b) { return b.rating - a.rating || b.avg_l - a.avg_l; });
      } else if (sortBy === "avg_desc") {
        filtered.sort(function (a, b) { return b.avg_l - a.avg_l; });
      } else if (sortBy === "avg_asc") {
        filtered.sort(function (a, b) { return a.avg_l - b.avg_l; });
      } else if (sortBy === "max_desc") {
        filtered.sort(function (a, b) { return b.max_l - a.max_l; });
      } else if (sortBy === "points_desc" && currentView === "club") {
        filtered.sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
      } else if (sortBy === "points_asc" && currentView === "club") {
        filtered.sort(function (a, b) { return (a.points || 999999) - (b.points || 999999); });
      }

      // Active filter tags in status line
      var filterNotes = [];
      if (currentView === "club" && hideLocked) filterNotes.push("Pouze odemčené");
      if (filterOnlyPrice) filterNotes.push("Pouze s cenou");
      if (filterUncaught) filterNotes.push("Pouze nechycené");

      if (!isNaN(minSize) && !isNaN(maxSize)) {
        filterNotes.push("Velikost " + minSize + "–" + maxSize + " cm");
      } else {
        if (!isNaN(minSize)) filterNotes.push("Velikost " + minSize + "+ cm");
        if (!isNaN(maxSize)) filterNotes.push("Velikost do " + maxSize + " cm");
      }

      if (filterNowActive) {
        var now = new Date();
        filterNotes.push("Právě beroucí v " + now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'));
      }

      var activeDescEl = document.getElementById("activeFilterDesc");
      if (activeDescEl) {
        activeDescEl.innerText = filterNotes.length ? "[Aktivní: " + filterNotes.join(', ') + "]" : "";
      }

      renderTableBody(filtered);
    }

    function resetFilters() {
      document.getElementById("search").value = "";
      document.getElementById("baitFilter").value = "";
      document.getElementById("ratingFilter").value = "";
      document.getElementById("waterFilter").value = "";
      var loc = document.getElementById("locationFilter");
      if (loc) loc.value = "";
      document.getElementById("timeFilter").value = "";
      document.getElementById("sortBy").value = "default";
      var minEl = document.getElementById("minSizeInput");
      if (minEl) minEl.value = "";
      var maxEl = document.getElementById("maxSizeInput");
      if (maxEl) maxEl.value = "";
      filterNowActive = false;
      filterOnlyPrice = false;

      var btnNow = document.getElementById("btnNow");
      if (btnNow) btnNow.classList.remove("active");
      var btnOnlyPrice = document.getElementById("btnOnlyPrice");
      if (btnOnlyPrice) btnOnlyPrice.classList.remove("active");
      var activeDesc = document.getElementById("activeFilterDesc");
      if (activeDesc) activeDesc.innerText = "";

      var uncaughtCb = document.getElementById("filterUncaughtCheckbox");
      if (uncaughtCb) uncaughtCb.checked = false;

      document.querySelectorAll(".pill-btn").forEach(function (p) { p.classList.remove("active"); });

      renderTableHead();
      applyFilters();
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
      submitNewPrice: submitNewPrice,
      deletePriceEntry: deletePriceEntry,
      processBulkImport: processBulkImport,
      exportPricesJson: exportPricesJson,
      resetPriceHistoryToDefault: resetPriceHistoryToDefault,
      signIn: signIn,
      signOut: signOut,
      toggleCaughtFish: toggleCaughtFish,
      onClubNameChange: onClubNameChange,
      syncClubName: syncClubName,
      syncClubPoints: syncClubPoints,
      addClubPoints: addClubPoints,
      setCollectionFilter: setCollectionFilter,
      filterMilestones: filterMilestones,
      renderClubMilestones: renderClubMilestones,
      renderRatingBadge: renderRatingBadge,
      toggleCaughtFromModal: toggleCaughtFromModal,
      openFishDetail: openPriceModal,
      setLanguage: setLanguage,
      t: t
    };

    function updateStaticTranslations() {
      var lang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
      document.documentElement.lang = lang;

      var csBtn = document.getElementById("langCsBtn");
      var enBtn = document.getElementById("langEnBtn");
      if (csBtn) csBtn.classList.toggle("active", lang === "cs");
      if (enBtn) enBtn.classList.toggle("active", lang === "en");

      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var val = t(key);
        if (val !== undefined && val !== null) {
          if (val.indexOf('<') !== -1) {
            el.innerHTML = val;
          } else {
            el.textContent = val;
          }
        }
      });

      document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-placeholder");
        var val = t(key);
        if (val) el.placeholder = val;
      });

      document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var key = el.getAttribute("data-i18n-title");
        var val = t(key);
        if (val) el.title = val;
      });
    }

    function updateWaterFilterOptions() {
      var select = document.getElementById("waterFilter");
      if (!select) return;
      var curVal = select.value;
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      select.innerHTML =
        '<option value="">' + (isEn ? 'All water types' : 'Všechny vody') + '</option>' +
        '<option value="Slaná">🌊 ' + (isEn ? 'Saltwater (Sea)' : 'Slaná voda (Moře)') + '</option>' +
        '<option value="Sladká">🌿 ' + (isEn ? 'Freshwater' : 'Sladká voda') + '</option>';
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
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      select.innerHTML = '<option value="">' + (isEn ? 'All locations' : 'Všechny lokace') + ' (' + sortedLocs.length + ')</option>' +
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
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      var allBaits = [
        'Hmyz', 'Rostlinné', 'Ryby', 'Těsta', 'Přívlač/Nástrahy', 'Maso', 'Žraločí',
        'Háčky', 'Ďasí', 'Monstrum', 'Šírotlamčí', 'Prehistorické', 'Svítivčí',
        'Tuňáčí', 'Soltýní', 'Marlíní'
      ];
      select.innerHTML = '<option value="">' + (isEn ? 'All baits' : 'Všechny návnady') + '</option>' +
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
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      select.innerHTML =
        '<option value="">' + (isEn ? 'All day & night' : 'Celý den i noc') + '</option>' +
        '<option value="now">⚡ ' + (isEn ? 'BITING NOW (LIVE)' : 'PRÁVĚ BERE (ŽIVĚ)') + '</option>' +
        '<option value="night">🌙 ' + (isEn ? 'Night fish only' : 'Noční ryby') + '</option>' +
        '<option value="day">☀️ ' + (isEn ? 'Day fish only' : 'Denní ryby') + '</option>' +
        '<option value="morning">🌅 ' + (isEn ? 'Morning (06:00 - 12:00)' : 'Ráno (06:00 - 12:00)') + '</option>' +
        '<option value="afternoon">☀️ ' + (isEn ? 'Afternoon (12:00 - 18:00)' : 'Odpoledne (12:00 - 18:00)') + '</option>' +
        '<option value="evening">🌇 ' + (isEn ? 'Evening (18:00 - 24:00)' : 'Večer (18:00 - 24:00)') + '</option>' +
        '<option value="deepnight">🌌 ' + (isEn ? 'Deep night (00:00 - 06:00)' : 'Hluboká noc (00:00 - 06:00)') + '</option>';
      select.value = curVal;
    }

    function updateSortByOptions() {
      var select = document.getElementById("sortBy");
      if (!select) return;
      var curVal = select.value;
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      select.innerHTML =
        '<option value="default">' + (isEn ? 'Default order' : 'Výchozí (pořadí)') + '</option>' +
        '<option value="name_asc">' + (isEn ? 'Name (A → Z)' : 'Název (A → Z)') + '</option>' +
        '<option value="name_desc">' + (isEn ? 'Name (Z → A)' : 'Název (Z → A)') + '</option>' +
        '<option value="rating_desc">' + (isEn ? 'Rating (highest 5★)' : 'Rating (od nejvyššího 5★)') + '</option>' +
        '<option value="rating_asc">' + (isEn ? 'Rating (lowest 1★)' : 'Rating (od nejnižšího 1★)') + '</option>' +
        '<option value="price_desc">' + (isEn ? 'Today\'s price (highest)' : 'Dnešní cena (od nejvyšší)') + '</option>' +
        '<option value="price_asc">' + (isEn ? 'Today\'s price (lowest)' : 'Dnešní cena (od nejnižší)') + '</option>' +
        '<option value="length_desc">' + (isEn ? 'Max length (largest)' : 'Max délka (od největší)') + '</option>' +
        '<option value="length_asc">' + (isEn ? 'Max length (smallest)' : 'Max délka (od nejmenší)') + '</option>';
      select.value = curVal;
    }

    function updateRatingFilterOptions() {
      var select = document.getElementById("ratingFilter");
      if (!select) return;
      var curVal = select.value;
      var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
      select.innerHTML =
        '<option value="">' + (isEn ? 'All ratings' : 'Všechny') + '</option>' +
        '<option value="5">★★★★★ (5)</option>' +
        '<option value="4">★★★★☆ (4)</option>' +
        '<option value="3">★★★☆☆ (3)</option>' +
        '<option value="2">★★☆☆☆ (2)</option>' +
        '<option value="1">★☆☆☆☆ (1)</option>' +
        '<option value="min3">' + (isEn ? 'At least 3★' : 'Minimálně 3★') + '</option>' +
        '<option value="min4">' + (isEn ? 'At least 4★' : 'Minimálně 4★') + '</option>';
      select.value = curVal;
    }

    function setLanguage(lang) {
      if (lang !== 'cs' && lang !== 'en') lang = 'cs';
      if (window.FISHAO_I18N) {
        window.FISHAO_I18N.currentLang = lang;
      }
      try {
        localStorage.setItem('fishao_lang', lang);
      } catch (e) {}

      updateStaticTranslations();
      updateWaterFilterOptions();
      initLocationOptions();
      initBaitOptions();
      updateTimeFilterOptions();
      updateSortByOptions();
      updateRatingFilterOptions();
      renderTableHead();
      updateCaughtStats();
      applyFilters();

      if (currentView === "club_manage") {
        renderClubMilestones();
      }

      if (selectedModalFishId) {
        var modal = document.getElementById("priceModalOverlay");
        if (modal && modal.classList.contains("active")) {
          openPriceModal(selectedModalFishId);
        }
      }
    }

    // Initialize localization & application
    var initialLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
    setLanguage(initialLang);
    switchView("all");
    initFirebaseSync();
  }) ();
