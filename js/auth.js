/**
 * FISHAO - Firebase Auth & User Profile Management (js/auth.js)
 * -------------------------------------------------------------
 * Handles Google OAuth, user profile loading, avatar selection,
 * profile modal interactions, and auth state changes.
 */

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
        backyardFishIds = new Set();
        friendUids = new Set();
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

    var isNewUser = !docSnap.exists();
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
        backyardFishIds: Array.from(backyardFishIds),
        friendUids: Array.from(friendUids),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      await fsModule.setDoc(userDocRef, userProfile);
    }

    isAdmin = (userProfile.role === "admin");
    if (userProfile.caughtFishIds && Array.isArray(userProfile.caughtFishIds)) {
      caughtFishIds = new Set(userProfile.caughtFishIds);
    }
    if (userProfile.backyardFishIds && Array.isArray(userProfile.backyardFishIds)) {
      backyardFishIds = new Set(userProfile.backyardFishIds);
    }
    if (userProfile.friendUids && Array.isArray(userProfile.friendUids)) {
      friendUids = new Set(userProfile.friendUids);
    }

    if (userProfile.clubId) {
      bindClubListener(userProfile.clubId);
    } else {
      unbindClubListener();
    }

    updateAuthUI();
    updateCaughtStats();
    applyFilters();

    // Automatically prompt new users to set their custom nickname and avatar
    var nickStorageKey = 'fishao_nick_prompted_' + user.uid;
    var hasDefaultNick = userProfile && userProfile.displayName && (
      userProfile.displayName.startsWith(t('user_default_player')) ||
      userProfile.displayName.startsWith("Rybář #") ||
      userProfile.displayName.startsWith("Angler #")
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
        showToast(t('auth_welcome_new_user', 'Vítej ve FISHAO! Nastav si prosím svou herní přezdívku a avatar.'), 'info');
      }, 450);
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
        if (userProfile.backyardFishIds && Array.isArray(userProfile.backyardFishIds)) {
          backyardFishIds = new Set(userProfile.backyardFishIds);
        }
        if (userProfile.friendUids && Array.isArray(userProfile.friendUids)) {
          friendUids = new Set(userProfile.friendUids);
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

  if (typeof renderBackyardProfilePicker === 'function') {
    renderBackyardProfilePicker();
  }

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

    try {
      localStorage.setItem('fishao_nick_prompted_' + currentUser.uid, '1');
    } catch (e) {}

    closeProfileModal();
    updateAuthUI();
    showToast(t('profile_saved_success', 'Profil byl úspěšně uložen!'), "success");
  } catch (err) {
    console.error("Failed to save profile:", err);
    showToast("Chyba při ukládání: " + err.message, "error");
  }
}

async function deleteAccount() {
  if (!currentUser || !db) return;

  var ok = await showConfirmModal(
    t('profile_delete_title', 'Trvalé smazání účtu'),
    t('profile_delete_confirm', 'Opravdu chceš trvale smazat svůj účet a veškerá herní data? Tato akce je nevratná: smaže tvůj herní profil, úlovky, ryby za domem, odebere tě z klubu a odhlásí tě.'),
    t('profile_delete_btn', 'Smazat vše'),
    true
  );
  if (!ok) return;

  try {
    var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    var uid = currentUser.uid;
    var clubIdToLeave = (userProfile && userProfile.clubId) || currentClubId;

    // 1. Immediately detach club real-time listener and clear local club state
    // This CRITICALLY prevents the onSnapshot listener from executing any self-heal re-registration
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
    if (clubIdToLeave) {
      try {
        var clubRef = fsModule.doc(db, "clubs", clubIdToLeave);
        var snap = await fsModule.getDoc(clubRef);
        if (snap.exists()) {
          var cData = snap.data();
          var cnt = cData.memberCount || 1;
          var members = cData.members || {};
          var wasMember = !!members[uid];
          var leaveUpdate = {
            memberCount: Math.max(0, wasMember ? (cnt - 1) : cnt),
            updatedAt: new Date().toISOString(),
            lastUpdatedBy: uid
          };
          leaveUpdate["members." + uid] = fsModule.deleteField();

          // If deleting user was the creator and there are other members, promote the oldest member
          if (cData.createdBy === uid || (members[uid] && members[uid].isCreator)) {
            var remainingUids = Object.keys(members).filter(function (k) { return k !== uid; });
            if (remainingUids.length > 0) {
              remainingUids.sort(function (a, b) {
                var ja = (members[a] && members[a].joinedAt) || "";
                var jb = (members[b] && members[b].joinedAt) || "";
                return ja.localeCompare(jb);
              });
              leaveUpdate["members." + remainingUids[0] + ".isCreator"] = true;
            }
          }

          await fsModule.updateDoc(clubRef, leaveUpdate);
        }
      } catch (e) {
        console.warn("Could not clean up club membership on account deletion:", e);
      }
    }

    // 3. Delete user profile document from Firestore
    var userDocRef = fsModule.doc(db, "users", uid);
    await fsModule.deleteDoc(userDocRef);

    // 4. Clear local storage and caches
    try {
      localStorage.removeItem('fishao_backyard_fish_ids');
      localStorage.removeItem('fishao_friends_uids');
      localStorage.removeItem('fishao_nick_prompted_' + uid);
      sessionStorage.removeItem('fishao_players_cache_v1');
    } catch (e) {}

    // 5. Remove from in-memory allPlayersList
    if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
      allPlayersList = allPlayersList.filter(function (p) { return p.uid !== uid; });
    }

    caughtFishIds.clear();
    backyardFishIds.clear();
    friendUids.clear();
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
      console.warn("Auth user deletion requires recent login, signing out instead:", authErr);
      await signOut();
    }

    closeProfileModal();
    updateAuthUI();
    updateCaughtStats();
    applyFilters();
    showToast(t('profile_deleted_success', 'Tvůj účet a veškerá herní data byla úspěšně smazána.'), "info");
  } catch (err) {
    console.error("Failed to delete account:", err);
    showToast("Chyba při mazání účtu: " + err.message, "error");
  }
}

function editNickname() {
  openProfileModal();
}

