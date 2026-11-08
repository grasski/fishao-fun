/**
 * FISHAO - Club Management & Roadmap (js/clubs.js)
 * -------------------------------------------------------------
 * Real-time club synchronization with Firestore, club search,
 * create/join/leave actions, points management, milestones roadmap,
 * and FC / Monster special fish unlocks.
 */

var pendingMemberFetches = new Set();

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
        var members = data.members || {};

        // If current user is supposedly in this club, verify if still registered as member
        if (currentUser && currentClubId === clubId) {
          if (!members[currentUser.uid]) {
            // User was removed / kicked or left this club: cleanly detach and do NOT resurrect!
            console.info("Current user " + currentUser.uid + " is no longer a member of club " + clubId + ", detaching listener.");
            if (userProfile && userProfile.clubId === clubId) {
              userProfile.clubId = "";
              userProfile.clubName = "";
              try {
                var uRef = fsModule.doc(db, "users", currentUser.uid);
                fsModule.updateDoc(uRef, { clubId: "", clubName: "" });
              } catch (e) {}
            }
            unbindClubListener();
            showToast(t('club_you_were_removed', 'Byl jsi odebrán z klubu.'), "info");
            return;
          }
        }

        var memberKeys = Object.keys(members);
        var actualCount = memberKeys.length;

        currentClubName = data.name || "";
        currentClubPoints = typeof data.points === 'number' ? data.points : 0;
        currentClubMemberCount = Math.max(actualCount, typeof data.memberCount === 'number' ? data.memberCount : actualCount);

        var acName = document.getElementById("activeClubName");
        if (acName) acName.innerText = currentClubName || "Klub";
        var acPts = document.getElementById("activeClubPtsDisplay");
        if (acPts) acPts.innerText = currentClubPoints.toLocaleString(getLocale());
        var acMemb = document.getElementById("activeClubMembers");
        if (acMemb) acMemb.innerText = '👥 ' + formatClubMemberCount(currentClubMemberCount);

        // Self-heal memberCount in Firestore if desynced
        if (data.memberCount !== actualCount && actualCount > 0) {
          try {
            fsModule.updateDoc(clubDocRef, { memberCount: actualCount });
          } catch (e) {}
        }

        currentClubUnlockedFcFishIds = new Set(data.unlockedFcFishIds || []);
        currentClubUnlockedMonsterIds = new Set(data.unlockedMonsterIds || []);
        renderClubMembers(members, data.createdBy);

        // Sync stats if current user belongs to this club and stats have changed
        if (currentUser && currentClubId === clubId && userProfile && userProfile.clubId === clubId) {
          var curMember = members[currentUser.uid];
          if (curMember) {
            var myClubCount = 0;
            clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
            var needsSync = (curMember.caughtCount !== caughtFishIds.size ||
                             curMember.caughtClubCount !== myClubCount ||
                             (userProfile.displayName && curMember.displayName !== userProfile.displayName) ||
                             (userProfile.avatarUrl && curMember.avatarUrl !== userProfile.avatarUrl));
            if (needsSync) {
              try {
                var upM = {};
                upM["members." + currentUser.uid + ".caughtCount"] = caughtFishIds.size;
                upM["members." + currentUser.uid + ".caughtClubCount"] = myClubCount;
                if (userProfile.displayName) upM["members." + currentUser.uid + ".displayName"] = userProfile.displayName;
                if (userProfile.avatarUrl) upM["members." + currentUser.uid + ".avatarUrl"] = userProfile.avatarUrl;
                fsModule.updateDoc(clubDocRef, upM);
              } catch (e) {
                console.warn("Could not sync member stats in club:", e);
              }
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

async function fetchAndSyncMemberStats(uid) {
  if (!db || !uid || !currentUser || pendingMemberFetches.has(uid)) return;
  pendingMemberFetches.add(uid);
  try {
    var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    var uSnap = await fsModule.getDoc(fsModule.doc(db, "users", uid));
    if (!uSnap.exists()) {
      // User document does not exist (account deleted)!
      // Clean up orphaned member from club document so ghost members disappear automatically
      if (currentClubId) {
        try {
          var cRef = fsModule.doc(db, "clubs", currentClubId);
          var cSnap = await fsModule.getDoc(cRef);
          if (cSnap.exists()) {
            var cData = cSnap.data();
            var cnt = cData.memberCount || 1;
            var delPatch = {
              memberCount: Math.max(0, cnt - 1),
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.uid
            };
            delPatch["members." + uid] = fsModule.deleteField();
            await fsModule.updateDoc(cRef, delPatch);
            console.info("Cleaned up orphaned deleted member " + uid + " from club " + currentClubId);
          }
        } catch (e) {
          console.warn("Could not clean up deleted member from club:", e);
        }
      }
      return;
    }
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

  var actualCount = memberKeys.length;
  currentClubMemberCount = actualCount;
  if (countEl) countEl.innerText = actualCount;
  var acMemb = document.getElementById("activeClubMembers");
  if (acMemb) acMemb.innerText = '👥 ' + formatClubMemberCount(actualCount);
  var acName = document.getElementById("activeClubName");
  if (acName && currentClubName) acName.innerText = currentClubName;
  var acPts = document.getElementById("activeClubPtsDisplay");
  if (acPts) acPts.innerText = currentClubPoints.toLocaleString(getLocale());

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
        '<div class="club-member-name">' + escapeHtml(dName) + (isMe ? ' <span style="font-size:11px;color:#a78bfa;">(' + t('player_card_me_tag', 'Ty') + ')</span>' : '') + '</div>' +
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

// openPlayerModal(uid) is implemented in js/players.js (universal for clubs & community)

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
  currentClubMembersMap = {};
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

  var clubToLeave = currentClubId;

  // 1. Unbind club listener FIRST so self-heal snapshot cannot re-register leaving member
  unbindClubListener();
  currentClubId = "";
  currentClubName = "";
  currentClubPoints = 0;
  currentClubMemberCount = 1;
  currentClubUnlockedFcFishIds.clear();
  currentClubUnlockedMonsterIds.clear();
  currentClubMembersMap = {};
  if (userProfile) {
    userProfile.clubId = "";
    userProfile.clubName = "";
  }
  var myPlayer = allPlayersList.find(function (p) { return p.uid === currentUser.uid; });
  if (myPlayer) {
    myPlayer.clubId = "";
    myPlayer.clubName = "";
  }

  try {
    var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    
    // 2. Remove member from club document and decrement count
    try {
      var clubRef = fsModule.doc(db, "clubs", clubToLeave);
      var snap = await fsModule.getDoc(clubRef);
      if (snap.exists()) {
        var cData = snap.data();
        var cnt = cData.memberCount || 1;
        var members = cData.members || {};
        var wasMember = !!members[currentUser.uid];
        var leaveUpdate = {
          memberCount: Math.max(0, wasMember ? (cnt - 1) : cnt),
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        };
        leaveUpdate["members." + currentUser.uid] = fsModule.deleteField();

        // If creator left and other members remain, promote the oldest member
        if (cData.createdBy === currentUser.uid || (members[currentUser.uid] && members[currentUser.uid].isCreator)) {
          var remainingUids = Object.keys(members).filter(function (k) { return k !== currentUser.uid; });
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
      console.warn("Could not decrement club:", e);
    }

    // 3. Clear clubId in user profile document
    var userDocRef = fsModule.doc(db, "users", currentUser.uid);
    await fsModule.updateDoc(userDocRef, {
      clubId: "",
      clubName: ""
    });

    renderClubMembers({}, "");
    updateClubStats();
    renderClubMilestones();
    renderClubSpecialFishes();
    updateAuthUI();
    applyFilters();

    showToast(t('club_left_success'), "purple");
    searchClubs("");
  } catch (err) {
    console.error("Failed to leave club:", err);
    showToast("Chyba při opouštění klubu: " + err.message, "error");
  }
}

async function kickMemberFromClub(targetUid) {
  if (!currentUser || !currentClubId || !targetUid || targetUid === currentUser.uid) return;
  var targetMem = (currentClubMembersMap && currentClubMembersMap[targetUid]) || {};
  var targetName = targetMem.displayName || "tohoto hráče";
  var ok = await showConfirmModal(
    t('club_btn_kick', 'Odebrat z klubu'),
    t('club_kick_confirm', { name: targetName }, 'Opravdu chceš odebrat hráče ' + targetName + ' z klubu?'),
    t('club_btn_kick', 'Odebrat'),
    true
  );
  if (!ok) return;

  try {
    var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    var clubRef = fsModule.doc(db, "clubs", currentClubId);
    var snap = await fsModule.getDoc(clubRef);
    if (snap.exists()) {
      var cData = snap.data();
      var cnt = cData.memberCount || 1;
      var members = cData.members || {};
      var wasMember = !!members[targetUid];
      var update = {
        memberCount: Math.max(0, wasMember ? (cnt - 1) : cnt),
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.uid
      };
      update["members." + targetUid] = fsModule.deleteField();
      await fsModule.updateDoc(clubRef, update);
    }

    try {
      var uRef = fsModule.doc(db, "users", targetUid);
      await fsModule.updateDoc(uRef, { clubId: "", clubName: "" });
    } catch (e) {
      // Ignored if permissions restrict
    }

    closePlayerModal();
    showToast(t('club_member_kicked', 'Hráč byl odebrán z klubu.'), "info");
  } catch (err) {
    console.error("Failed to kick member:", err);
    showToast("Chyba při odebírání člena: " + err.message, "error");
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
        '<div class="milestone-fish-img-box" style="width: 84px; height: 52px;">' +
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

function updateClubStats() {
  var hideLockedCheckbox = document.getElementById("hideLockedCheckbox");
  var hideLocked = hideLockedCheckbox ? hideLockedCheckbox.checked : false;
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

