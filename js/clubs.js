/**
 * FISHAO - Club Management & Roadmap (js/clubs.js)
 * -------------------------------------------------------------
 * Real-time club synchronization with Firestore, club search,
 * create/join/leave actions, points management, milestones roadmap,
 * and FC / Monster special fish unlocks.
 */

var pendingMemberFetches = new Set();
var _boundClubId = "";
var _lastClubMemberSyncSig = "";

async function bindClubListener(clubId) {
  if (!db || !clubId) return;
  if (clubUnsubscribe && _boundClubId === clubId) return;
  try {
    var fsModule = await getFirestoreModule();
    if (clubUnsubscribe) {
      clubUnsubscribe();
      clubUnsubscribe = null;
    }
    _boundClubId = clubId;
    currentClubId = clubId;
    var clubDocRef = fsModule.doc(db, "clubs", clubId);

    clubUnsubscribe = fsModule.onSnapshot(clubDocRef, function (snap) {
      if (snap.exists()) {
        var data = snap.data();
        var members = data.members || {};

        // If current user is supposedly in this club, verify if still registered as member
        if (currentUser && currentClubId === clubId) {
          if (!members[currentUser.uid]) {
            console.info("Current user " + currentUser.uid + " is no longer a member of club " + clubId + ", detaching listener.");
            if (userProfile && userProfile.clubId === clubId) {
              userProfile.clubId = "";
              userProfile.clubName = "";
              try {
                var uRef = fsModule.doc(db, "users", currentUser.uid);
                fsModule.updateDoc(uRef, { clubId: "", clubName: "" }).catch(function () {});
              } catch (e) {}
            }
            unbindClubListener();
            showToast(t('club_you_were_removed'), "info");
            return;
          }
        }

        var memberKeys = Object.keys(members);
        var actualCount = memberKeys.length;

        currentClubName = data.name || "";
        currentClubPoints = typeof data.points === 'number' ? data.points : 0;
        currentClubMemberCount = actualCount;

        var acName = document.getElementById("activeClubName");
        if (acName) acName.innerText = currentClubName || "Klub";
        var acPts = document.getElementById("activeClubPtsDisplay");
        if (acPts) acPts.innerText = currentClubPoints.toLocaleString(getLocale());
        var acMemb = document.getElementById("activeClubMembers");
        if (acMemb) acMemb.innerText = '👥 ' + formatClubMemberCount(currentClubMemberCount);

        currentClubUnlockedFcFishIds = new Set(data.unlockedFcFishIds || []);
        currentClubUnlockedMonsterIds = new Set(data.unlockedMonsterIds || []);
        renderClubMembers(members, data.createdBy);

        // Sync ONLY own member stats if changed since last sync signature
        if (currentUser && currentClubId === clubId && userProfile && userProfile.clubId === clubId) {
          var curMember = members[currentUser.uid];
          if (curMember) {
            var myClubCount = 0;
            clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
            var curSig = caughtFishIds.size + "|" + myClubCount + "|" + (userProfile.displayName || "") + "|" + (userProfile.avatarUrl || "");
            var remoteSig = (curMember.caughtCount || 0) + "|" + (curMember.caughtClubCount || 0) + "|" + (curMember.displayName || "") + "|" + (curMember.avatarUrl || "");
            if (curSig !== remoteSig && _lastClubMemberSyncSig !== curSig) {
              _lastClubMemberSyncSig = curSig;
              var upM = {
                updatedAt: new Date().toISOString(),
                lastUpdatedBy: currentUser.uid
              };
              upM["members." + currentUser.uid + ".caughtCount"] = caughtFishIds.size;
              upM["members." + currentUser.uid + ".caughtClubCount"] = myClubCount;
              if (userProfile.displayName) upM["members." + currentUser.uid + ".displayName"] = userProfile.displayName;
              if (userProfile.avatarUrl) upM["members." + currentUser.uid + ".avatarUrl"] = userProfile.avatarUrl;
              fsModule.updateDoc(clubDocRef, upM).catch(function (e) {
                console.warn("Could not sync member stats in club:", e);
              });
            }
          }
        }
      } else {
        console.warn("Club document not found:", clubId);
        _boundClubId = "";
        currentClubId = "";
        currentClubName = "";
        currentClubPoints = 0;
        currentClubMemberCount = 1;
        currentClubUnlockedFcFishIds.clear();
        currentClubUnlockedMonsterIds.clear();
        renderClubMembers({}, "");
      }
      updateClubStats();
      if (currentView === 'club_manage') {
        renderClubMilestones();
        renderClubSpecialFishes();
      }
      updateAuthUI();
      if (typeof isTableViewActive !== 'function' || isTableViewActive()) {
        applyFilters();
      } else {
        _tableViewDirty = true;
      }
    }, function (err) {
      console.warn("Club snapshot error:", err);
    });
  } catch (err) {
    console.error("Error binding club listener:", err);
  }
}

async function fetchAndSyncMemberStats(uid) {
  if (!uid || !currentUser || pendingMemberFetches.has(uid)) return;
  pendingMemberFetches.add(uid);
  try {
    var uData = null;
    var cachedPlayer = (typeof allPlayersList !== "undefined" && Array.isArray(allPlayersList))
      ? allPlayersList.find(function (p) { return p.uid === uid && typeof p.caughtCount === "number"; })
      : null;

    var totalC = 0;
    var clubC = 0;
    if (cachedPlayer) {
      uData = cachedPlayer;
      totalC = cachedPlayer.caughtCount;
      clubC = typeof cachedPlayer.caughtClubCount === "number" ? cachedPlayer.caughtClubCount : 0;
    } else {
      if (!db) return;
      var fsModule = await getFirestoreModule();
      var uSnap = await fsModule.getDoc(fsModule.doc(db, "users", uid));
      if (!uSnap.exists()) return;
      uData = uSnap.data();
      var uCaught = Array.isArray(uData.caughtFishIds) ? uData.caughtFishIds : [];
      totalC = uCaught.length;
      var clubFishIdsSet = new Set(clubFishes.map(function (f) { return f.id; }));
      uCaught.forEach(function (fid) { if (clubFishIdsSet.has(fid)) clubC++; });
    }

    if (currentClubMembersMap) {
      if (!currentClubMembersMap[uid]) currentClubMembersMap[uid] = {};
      currentClubMembersMap[uid].caughtCount = totalC;
      currentClubMembersMap[uid].caughtClubCount = clubC;
      if (uData.displayName) currentClubMembersMap[uid].displayName = uData.displayName;
      if (uData.avatarUrl) currentClubMembersMap[uid].avatarUrl = uData.avatarUrl;
      if (uData.preferredLang) {
        currentClubMembersMap[uid].preferredLang = uData.preferredLang;
      } else {
        delete currentClubMembersMap[uid].preferredLang;
      }
    }

    // Update member chip badge in active grid
    var badgeEl = document.getElementById("clubMemberCatchBadge_" + sanitizeDomId(uid));
    if (badgeEl) {
      badgeEl.innerText = "• 🎣 " + totalC + "/" + allFishes.length;
      badgeEl.style.display = "inline";
    }

    // If player modal is open for this player, update modal live
    var modalNameEl = document.getElementById("playerModalName");
    if (modalNameEl && modalNameEl.dataset.currentUid === uid) {
      var totalClub = clubFishes.length || 80;
      var clubCountEl = document.getElementById("playerModalClubCount");
      var clubFillEl = document.getElementById("playerModalClubFill");
      if (clubCountEl) clubCountEl.innerText = clubC + " / " + totalClub;
      if (clubFillEl) clubFillEl.style.width = Math.min(100, Math.round((clubC / totalClub) * 100)) + "%";

      var totalCountEl = document.getElementById("playerModalTotalCount");
      var totalFillEl = document.getElementById("playerModalTotalFill");
      var totalPct = Math.round((totalC / allFishes.length) * 100);
      if (totalCountEl) totalCountEl.innerText = totalC + " / " + allFishes.length + " (" + totalPct + "%)";
      if (totalFillEl) totalFillEl.style.width = Math.min(100, (totalC / allFishes.length) * 100).toFixed(1) + "%";

      var avWrap = document.getElementById("playerModalAvatarWrap");
      var av = uData.avatarUrl || "🎣";
      if (avWrap) {
        avWrap.innerHTML = '<div class="player-modal-avatar-large">' + renderAvatarHtml(av, "🎣") + '</div>';
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
  var activeCreatorUid = Object.keys(currentClubMembersMap).find(function (k) {
    return currentClubMembersMap[k] && currentClubMembersMap[k].isCreator === true;
  }) || creatorId || "";
  currentClubCreatorId = activeCreatorUid;

  var grid = document.getElementById("clubMembersGrid");
  var countEl = document.getElementById("activeClubMembersCount");
  if (!grid) return;

  var memberKeys = Object.keys(membersMap || {});
  if (memberKeys.length === 0 && currentUser) {
    var myClubCount = 0;
    clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
    var myName = (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_fisher');
    var myAv = (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣";
    membersMap = {};
    membersMap[currentUser.uid] = {
      displayName: myName,
      avatarUrl: myAv,
      isCreator: (activeCreatorUid === currentUser.uid),
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
    var isCrA = !!(mA.isCreator || a === activeCreatorUid);
    var isCrB = !!(mB.isCreator || b === activeCreatorUid);

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
    var dName = m.displayName || t('user_default_fisher');
    var av = m.avatarUrl || "🎣";
    var isCr = !!(m.isCreator || uid === activeCreatorUid);
    var isMe = (currentUser && uid === currentUser.uid);

    var avatarHtml = '<div class="club-member-avatar">' + renderAvatarHtml(av, "🎣") + '</div>';

    var roleBadge = isCr
      ? '<span class="club-member-creator-badge">👑 ' + t('club_member_creator') + '</span>'
      : '<span>🎣 ' + t('club_member_role') + '</span>';

    var cCount = isMe ? caughtFishIds.size : (typeof m.caughtCount === 'number' ? m.caughtCount : null);
    var countBadge = '<span id="clubMemberCatchBadge_' + sanitizeDomId(uid) + '" style="color: #38bdf8; font-size: 11px; margin-left: 4px; font-weight: 600;">• 🎣 ' + (cCount !== null ? cCount : (typeof m.caughtCount === 'number' ? m.caughtCount : 0)) + '/' + allFishes.length + '</span>';

    html += '<button type="button" class="club-member-chip' + (isCr ? ' creator' : '') + '" data-uid="' + escapeHtml(uid) + '" title="' + escapeHtml(t('club_member_view_profile')) + '">' +
      avatarHtml +
      '<div class="club-member-info">' +
        '<div class="club-member-name">' + escapeHtml(dName) + renderPlayerLangFlag(m.preferredLang) + (isMe ? ' <span style="font-size:11px;color:#a78bfa;">(' + escapeHtml(t('player_card_me_tag')) + ')</span>' : '') + '</div>' +
        '<div class="club-member-tag">' +
          roleBadge + countBadge +
        '</div>' +
      '</div>' +
    '</button>';

    if (!isMe && currentUser && db && (m.caughtCount === undefined || m.caughtClubCount === undefined)) {
      fetchAndSyncMemberStats(uid);
    }
  });

  if (!grid.dataset.boundMemberClick) {
    grid.dataset.boundMemberClick = "1";
    grid.addEventListener("click", function (ev) {
      var chip = ev.target && ev.target.closest ? ev.target.closest(".club-member-chip") : null;
      if (!chip || !chip.dataset.uid) return;
      if (window.fishaoApp && typeof window.fishaoApp.openPlayerModal === "function") {
        window.fishaoApp.openPlayerModal(chip.dataset.uid);
      }
    });
  }

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
  _boundClubId = "";
  _lastClubMemberSyncSig = "";
  currentClubId = "";
  currentClubName = "";
  currentClubPoints = 0;
  currentClubMemberCount = 1;
  currentClubUnlockedFcFishIds.clear();
  currentClubUnlockedMonsterIds.clear();
  currentClubMembersMap = {};
  renderClubMembers({}, "");
  updateClubStats();
  if (currentView === 'club_manage') {
    renderClubMilestones();
    renderClubSpecialFishes();
  }
  updateAuthUI();
  if (typeof isTableViewActive !== 'function' || isTableViewActive()) {
    applyFilters();
  } else {
    _tableViewDirty = true;
  }
}

function applyLeaveClubTxWrites(tx, fs, clubRef, snap, uRef, uid) {
  if (!snap || !snap.exists()) {
    if (uRef) tx.update(uRef, { clubId: "", clubName: "" });
    return;
  }

  var cData = snap.data() || {};
  var members = Object.assign({}, cData.members || {});
  if (!Object.prototype.hasOwnProperty.call(members, uid)) {
    if (uRef) tx.update(uRef, { clubId: "", clubName: "" });
    return;
  }
  var targetMem = members[uid];
  var remainingUids = Object.keys(members).filter(function (k) { return k !== uid; });

  if (remainingUids.length === 0) {
    tx.delete(clubRef);
    if (uRef) tx.update(uRef, { clubId: "", clubName: "" });
    return;
  }

  var leaveUpdate = {
    memberCount: remainingUids.length,
    updatedAt: new Date().toISOString(),
    lastUpdatedBy: (currentUser && currentUser.uid) ? currentUser.uid : uid
  };
  leaveUpdate["members." + uid] = fs.deleteField();

  if ((cData.createdBy === uid || (targetMem && targetMem.isCreator)) && remainingUids.length > 0) {
    remainingUids.sort(function (a, b) {
      var ja = (members[a] && members[a].joinedAt) || "";
      var jb = (members[b] && members[b].joinedAt) || "";
      return ja.localeCompare(jb);
    });
    leaveUpdate["members." + remainingUids[0] + ".isCreator"] = true;
  }

  tx.update(clubRef, leaveUpdate);
  if (uRef) tx.update(uRef, { clubId: "", clubName: "" });
}

async function removeMemberFromClubDoc(fsModule, clubId, uid, alsoClearUserDoc) {
  if (!db || !clubId || !uid) return;
  if (!window.FISHAO_FS_TX) return;

  await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
    var clubRef = fs.doc(db, "clubs", clubId);
    var snap = await tx.get(clubRef);
    var uRef = alsoClearUserDoc ? fs.doc(db, "users", uid) : null;
    applyLeaveClubTxWrites(tx, fs, clubRef, snap, uRef, uid);
  });
}

async function searchClubs(query) {
  if (!db) return;
  var searchInput = document.getElementById("clubSearchInput");
  var q = (query !== undefined ? query : (searchInput ? searchInput.value : "")).trim();
  var resultsEl = document.getElementById("clubSearchResults");
  if (!resultsEl) return;

  resultsEl.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12px;">⏳ ' + t('club_btn_search') + '...</div>';

  try {
    var fsModule = await getFirestoreModule();
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
        '<button type="button" class="pill-btn purple btn-club-join" data-club-id="' + escapeHtml(cId) + '" data-club-name="' + escapeHtml(name) + '">' + escapeHtml(t('club_btn_join')) + '</button>' +
        '</div>';
    });

    if (!resultsEl.dataset.boundJoinClick) {
      resultsEl.dataset.boundJoinClick = "1";
      resultsEl.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-club-join") : null;
        if (!btn) return;
        joinClub(btn.getAttribute("data-club-id"), btn.getAttribute("data-club-name"));
      });
    }

    resultsEl.innerHTML = html;
  } catch (err) {
    console.error("Error searching clubs:", err);
    resultsEl.innerHTML = '<div style="padding: 10px; color: #f87171; font-size: 12px;">' + escapeHtml(t('err_generic') + (err && err.message ? err.message : String(err))) + '</div>';
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
    showToast(t('club_name_too_long'), "error");
    return;
  }

  try {
    var fsModule = await getFirestoreModule();
    var clubsCol = fsModule.collection(db, "clubs");
    var oldClubId = currentClubId;

    var myClubCount = 0;
    clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
    var memberData = {
      displayName: (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_fisher'),
      avatarUrl: (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣",
      isCreator: true,
      joinedAt: new Date().toISOString(),
      caughtCount: caughtFishIds.size,
      caughtClubCount: myClubCount
    };
    var initialMembers = {};
    initialMembers[currentUser.uid] = memberData;
    var nowIso = new Date().toISOString();

    var newClubRef = fsModule.doc(clubsCol);
    await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var oldClubRef = oldClubId ? fs.doc(db, "clubs", oldClubId) : null;
      var oldSnap = oldClubRef ? await tx.get(oldClubRef) : null;
      if (oldClubRef && oldSnap) {
        applyLeaveClubTxWrites(tx, fs, oldClubRef, oldSnap, null, currentUser.uid);
      }

      var userDocRef = fs.doc(db, "users", currentUser.uid);
      tx.set(newClubRef, {
        name: clubName,
        name_lower: clubName.toLowerCase(),
        points: 0,
        unlockedFcFishIds: [],
        unlockedMonsterIds: [],
        memberCount: 1,
        members: initialMembers,
        createdBy: currentUser.uid,
        createdAt: nowIso,
        updatedAt: nowIso
      });
      tx.update(userDocRef, {
        clubId: newClubRef.id,
        clubName: clubName
      });
    });

    if (input) input.value = "";
    showToast(t('club_created_success', { name: clubName }), "success");
    bindClubListener(newClubRef.id);
  } catch (err) {
    console.error("Failed to create club:", err);
    showToast(t('club_err_create') + err.message, "error");
  }
}

async function joinClub(clubId, clubName) {
  if (!currentUser || !db) {
    showAuthNotice(t('auth_notice_club'));
    return;
  }
  if (currentClubId === clubId) {
    showToast(t('club_already_member'), "purple");
    return;
  }

  try {
    var oldClubId = currentClubId;
    if (oldClubId) {
      var targetClubName = clubName || "—";
      var ok = await showConfirmModal(
        t('club_btn_join'),
        t('club_change_confirm', { current: currentClubName || '—', target: targetClubName }),
        t('club_btn_join'),
        false
      );
      if (!ok) return;
    }

    var myJoinClubCount = 0;
    clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myJoinClubCount++; });
    var memberData = {
      displayName: (userProfile && userProfile.displayName) ? userProfile.displayName : t('user_default_fisher'),
      avatarUrl: (userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : "🎣",
      isCreator: false,
      joinedAt: new Date().toISOString(),
      caughtCount: caughtFishIds.size,
      caughtClubCount: myJoinClubCount
    };

    var resolvedClubName = await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var newClubRef = fs.doc(db, "clubs", clubId);
      var newSnap = await tx.get(newClubRef);
      if (!newSnap.exists()) {
        throw new Error("CLUB_NOT_FOUND");
      }

      var oldClubRef = (oldClubId && oldClubId !== clubId) ? fs.doc(db, "clubs", oldClubId) : null;
      var oldSnap = oldClubRef ? await tx.get(oldClubRef) : null;
      if (oldClubRef && oldSnap) {
        applyLeaveClubTxWrites(tx, fs, oldClubRef, oldSnap, null, currentUser.uid);
      }

      var data = newSnap.data() || {};
      var membersCopy = Object.assign({}, data.members || {});
      membersCopy[currentUser.uid] = memberData;

      var updatePayload = {
        memberCount: Object.keys(membersCopy).length,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.uid
      };
      updatePayload["members." + currentUser.uid] = memberData;
      tx.update(newClubRef, updatePayload);

      var finalName = clubName || data.name || "Klub";
      var userDocRef = fs.doc(db, "users", currentUser.uid);
      tx.update(userDocRef, {
        clubId: clubId,
        clubName: finalName
      });

      return finalName;
    });

    showToast(t('club_joined_success', { name: resolvedClubName }), "success");
    bindClubListener(clubId);
  } catch (err) {
    if (err && err.message === "CLUB_NOT_FOUND") {
      showToast(t('club_not_found'), "error");
      return;
    }
    console.error("Failed to join club:", err);
    showToast(t('club_err_join') + err.message, "error");
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

  // 1. Unbind club listener FIRST so snapshot cannot trigger anything for stale club
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
    var fsModule = await getFirestoreModule();
    // 2. Atomically remove member from club & clear clubId in /users/{uid}
    await removeMemberFromClubDoc(fsModule, clubToLeave, currentUser.uid, true);

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
    showToast(t('club_err_leave') + err.message, "error");
  }
}

async function kickMemberFromClub(targetUid) {
  if (!currentUser || !currentClubId || !targetUid || targetUid === currentUser.uid) return;
  var targetMem = (currentClubMembersMap && currentClubMembersMap[targetUid]) || {};
  var targetName = targetMem.displayName || t('user_default_player');
  var ok = await showConfirmModal(
    t('club_btn_kick'),
    t('club_kick_confirm', { name: targetName }),
    t('club_btn_kick'),
    true
  );
  if (!ok) return;

  try {
    await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var clubRef = fs.doc(db, "clubs", currentClubId);
      var snap = await tx.get(clubRef);
      if (snap.exists()) {
        var cData = snap.data() || {};
        var membersCopy = Object.assign({}, cData.members || {});
        delete membersCopy[targetUid];
        var update = {
          memberCount: Object.keys(membersCopy).length,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        };
        update["members." + targetUid] = fs.deleteField();
        tx.update(clubRef, update);
      }

      if (isAdmin) {
        var uRef = fs.doc(db, "users", targetUid);
        tx.update(uRef, { clubId: "", clubName: "" });
      }
    });

    // Update local allPlayersList cache immediately so community player list reflects the kick
    var kickedPlayer = allPlayersList.find(function (p) { return p.uid === targetUid; });
    if (kickedPlayer) {
      kickedPlayer.clubId = "";
      kickedPlayer.clubName = "";
    }

    closePlayerModal();
    showToast(t('club_member_kicked'), "info");
  } catch (err) {
    console.error("Failed to kick member:", err);
    showToast(t('club_err_kick') + err.message, "error");
  }
}

async function setClubPoints(val, isDelta) {
  if (!currentUser || !db) {
    showAuthNotice(t('auth_notice_points'));
    return;
  }
  if (!currentClubId) {
    showToast(t('club_err_points_member'), "error");
    return;
  }
  try {
    await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var clubRef = fs.doc(db, "clubs", currentClubId);
      var snap = await tx.get(clubRef);
      if (!snap.exists()) return;
      var data = snap.data() || {};
      var base = isDelta ? (typeof data.points === 'number' ? data.points : 0) : 0;
      var num = Math.max(0, Math.min(100000000, parseInt(base + (Number(val) || 0), 10) || 0));
      tx.update(clubRef, {
        points: num,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.uid
      });
    });
  } catch (err) {
    console.error("Failed to update club points:", err);
    showToast(t('err_save') + err.message, "error");
  }
}

function addClubPoints(amount) {
  setClubPoints(amount, true);
}

async function toggleClubSpecialFish(fishId) {
  if (!currentUser || !db) {
    showAuthNotice(t('auth_notice_club'));
    return;
  }
  if (!currentClubId) {
    showToast(t('club_err_special_member'), "error");
    return;
  }

  var cf = clubFishes.find(function (x) { return x.id === fishId; });
  if (!cf) return;

  var isMonster = (cf.unlock_type === 'monster');
  var isFc = (cf.unlock_type === 'fc');
  if (!isMonster && !isFc) return;

  try {
    await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var clubRef = fs.doc(db, "clubs", currentClubId);
      var snap = await tx.get(clubRef);
      if (!snap.exists()) return;
      var data = snap.data() || {};
      if (isMonster) {
        var updatedMonsters = new Set(Array.isArray(data.unlockedMonsterIds) ? data.unlockedMonsterIds : []);
        if (updatedMonsters.has(fishId)) {
          updatedMonsters.delete(fishId);
        } else {
          updatedMonsters.add(fishId);
        }
        tx.update(clubRef, {
          unlockedMonsterIds: Array.from(updatedMonsters),
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        });
      } else {
        var updatedFc = new Set(Array.isArray(data.unlockedFcFishIds) ? data.unlockedFcFishIds : []);
        if (updatedFc.has(fishId)) {
          updatedFc.delete(fishId);
        } else {
          updatedFc.add(fishId);
        }
        tx.update(clubRef, {
          unlockedFcFishIds: Array.from(updatedFc),
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.uid
        });
      }
    });
  } catch (err) {
    console.error("Failed to toggle special fish:", err);
    showToast(t('err_save') + err.message, "error");
  }
}

function resetClubManageFilters(skipRender) {
  currentSpecialFilter = 'all';
  document.querySelectorAll('.special-header-filters .pill-btn').forEach(function (b, idx) {
    b.classList.toggle('active', idx === 0);
  });
  currentMilestoneFilter = 'all';
  document.querySelectorAll('.roadmap-header-filters .pill-btn').forEach(function (b, idx) {
    b.classList.toggle('active', idx === 0);
  });
  if (!skipRender) {
    renderClubSpecialFishes();
    renderClubMilestones();
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

  if (!grid.dataset.boundSpecialActions) {
    grid.dataset.boundSpecialActions = "1";
    grid.addEventListener("click", function (ev) {
      var toggleBtn = ev.target && ev.target.closest ? ev.target.closest(".special-toggle-btn") : null;
      if (toggleBtn && toggleBtn.dataset.fishId) {
        toggleClubSpecialFish(Number(toggleBtn.dataset.fishId));
        return;
      }
      var leftEl = ev.target && ev.target.closest ? ev.target.closest(".special-fish-left") : null;
      if (leftEl && leftEl.dataset.fishId) {
        openPriceModal(Number(leftEl.dataset.fishId));
      }
    });
    grid.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var leftEl = ev.target && ev.target.closest ? ev.target.closest(".special-fish-left") : null;
      if (leftEl && leftEl.dataset.fishId) {
        ev.preventDefault();
        openPriceModal(Number(leftEl.dataset.fishId));
      }
    });
  }

  grid.innerHTML = filtered.map(function (f) {
    var isMonster = (f.unlock_type === 'monster');
    var isUnlocked = isMonster ? currentClubUnlockedMonsterIds.has(f.id) : currentClubUnlockedFcFishIds.has(f.id);
    var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    var costLabel = isMonster ? ("👾 " + t('unlock_monster')) : ("🪙 " + (f.fc || "") + " FC");

    var btnClass = isUnlocked ? "special-toggle-btn unlocked" : "special-toggle-btn locked";
    var btnText = isUnlocked ? t('special_status_unlocked') : t('special_status_locked');

    return '<div class="special-fish-card ' + (isUnlocked ? 'unlocked' : '') + '">' +
      '<div class="special-fish-left" role="button" tabindex="0" data-fish-id="' + f.id + '" style="cursor: pointer;">' +
      '<img src="/images/fish_' + f.id + '.webp" class="special-fish-img" alt="' + escapeHtml(fishName) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';">' +
      '<div class="special-fish-details">' +
      '<span class="special-fish-name" title="' + escapeHtml(fishName) + '">' + escapeHtml(fishName) + '</span>' +
      '<span class="special-fish-cost">' + escapeHtml(costLabel) + '</span>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="' + btnClass + '" data-fish-id="' + f.id + '">' + escapeHtml(btnText) + '</button>' +
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
      var nextWaterType = getFishWater(nextFish);
      var nextWater = (window.FISHAO_I18N && window.FISHAO_I18N.getWaterName)
        ? window.FISHAO_I18N.getWaterName(nextWaterType || 'fresh')
        : t(nextWaterType === 'salt' ? 'water_salt_short' : 'water_fresh_short');
      var nextBaits = nextFish.baits ? nextFish.baits.map(function (b) { return renderBaitInline(b); }).join(' ') : '';

      nextCard.style.cursor = 'pointer';
      nextCard.classList.add('clickable-card');
      nextCard.setAttribute('role', 'button');
      nextCard.setAttribute('tabindex', '0');
      nextCard.title = nextFishName + t('click_for_detail_suffix');
      nextCard.onclick = function () {
        window.fishaoApp.openPriceModal(nextFish.id);
      };
      nextCard.onkeydown = function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          window.fishaoApp.openPriceModal(nextFish.id);
        }
      };
      nextCard.innerHTML =
        '<div class="dash-card-header">' +
        '<span class="dash-card-title" style="color: #fbbf24;">' + t('milestone_next_title') + '</span>' +
        '<span class="dash-stat-badge" style="color: #fbbf24; border-color: rgba(245,158,11,0.3);">' + nextFish.points + ' ' + t('unit_pts') + '</span>' +
        '</div>' +
        '<div class="dash-card-body">' +
        '<div class="milestone-fish-row" style="margin-top: 4px;">' +
        '<div class="milestone-fish-img-box" style="width: 84px; height: 52px;">' +
        '<img src="/images/fish_' + nextFish.id + '.webp" class="milestone-fish-img" alt="' + escapeHtml(nextFishName) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';">' +
        '</div>' +
        '<div class="milestone-fish-info">' +
        '<div class="milestone-fish-name" style="font-size: 14px;">' + escapeHtml(nextFishName) + '</div>' +
        '<div class="milestone-fish-meta">' + escapeHtml(nextWater) + ' • ' + renderRatingBadge(nextFish.rating) + ' • ' + nextBaits + '</div>' +
        '<div style="font-size: 11px; color: #f87171; font-weight: 700; margin-top: 2px;">' + escapeHtml(t('milestone_remaining_pts', { diff: minDiff })) + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="caught-progress-track" style="margin-top: 8px;" title="' + t('milestone_progress_title', { pct: targetPct.toFixed(0) }) + '">' +
        '<div class="caught-progress-fill" style="width: ' + targetPct.toFixed(1) + '%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>' +
        '</div>' +
        '</div>';
    } else {
      nextCard.style.cursor = '';
      nextCard.classList.remove('clickable-card');
      nextCard.removeAttribute('role');
      nextCard.removeAttribute('tabindex');
      nextCard.removeAttribute('title');
      nextCard.onclick = null;
      nextCard.onkeydown = null;
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

  if (!grid.dataset.boundMilestoneActions) {
    grid.dataset.boundMilestoneActions = "1";
    grid.addEventListener("click", function (ev) {
      var catchBtn = ev.target && ev.target.closest ? ev.target.closest(".btn-caught-milestone") : null;
      if (catchBtn && catchBtn.dataset.catchId) {
        ev.stopPropagation();
        toggleCaughtFish(Number(catchBtn.dataset.catchId));
        return;
      }
      var cardEl = ev.target && ev.target.closest ? ev.target.closest(".milestone-card") : null;
      if (cardEl && cardEl.dataset.fishId) {
        openPriceModal(Number(cardEl.dataset.fishId));
      }
    });
    grid.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var cardEl = ev.target && ev.target.closest ? ev.target.closest(".milestone-card") : null;
      if (cardEl && ev.target === cardEl && cardEl.dataset.fishId) {
        ev.preventDefault();
        openPriceModal(Number(cardEl.dataset.fishId));
      }
    });
  }

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
    var waterType = getFishWater(f);
    var waterLabel = (window.FISHAO_I18N && window.FISHAO_I18N.getWaterName)
      ? window.FISHAO_I18N.getWaterName(waterType || 'fresh')
      : t(waterType === 'salt' ? 'water_salt_short' : 'water_fresh_short');
    var baitsLabel = f.baits ? f.baits.map(function (b) { return renderBaitInline(b); }).join(' ') : '';

    return '<div class="milestone-card ' + (isUnlocked ? 'unlocked' : 'locked') + '" role="button" tabindex="0" data-fish-id="' + f.id + '" style="cursor: pointer;">' +
      '<div class="milestone-card-top">' +
      '<span class="milestone-status ' + statusClass + '">' + escapeHtml(statusText) + '</span>' +
      '<span class="milestone-cost-badge">' + escapeHtml(costBadge) + '</span>' +
      '</div>' +
      '<div class="milestone-fish-row">' +
      '<div class="milestone-fish-img-box">' +
      '<img src="/images/fish_' + f.id + '.webp" class="milestone-fish-img" alt="' + escapeHtml(fishName) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';">' +
      '</div>' +
      '<div class="milestone-fish-info">' +
      '<div class="milestone-fish-name" title="' + escapeHtml(fishName) + '">' + escapeHtml(fishName) + '</div>' +
      '<div class="milestone-fish-meta">' + escapeHtml(waterLabel) + ' • ' + renderRatingBadge(f.rating) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="milestone-card-footer">' +
      '<span class="milestone-baits-list">' + baitsLabel + '</span>' +
      '<button type="button" class="btn-caught-milestone ' + (isCaught ? 'caught' : '') + '" data-catch-id="' + f.id + '">' +
      escapeHtml(isCaught ? t('btn_caught_short') : t('btn_catch_short')) +
      '</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function saveHideLockedClubPreference(checked) {
  try {
    localStorage.setItem('fishao_hide_locked', !!checked);
  } catch (e) {}
}

function updateClubStats() {
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

  var totalClub = clubFishes.length || 80;
  var unlockedCountEl = document.getElementById("unlockedCount");
  if (unlockedCountEl) unlockedCountEl.innerText = unlockedCount;

  var tabClubBadge = document.getElementById("tabClubBadge");
  if (tabClubBadge) tabClubBadge.innerText = unlockedCount + " / " + totalClub;

  var lockedCount = totalClub - unlockedCount;
  var lockedNoticeEl = document.getElementById("lockedNotice");
  if (lockedNoticeEl) {
    lockedNoticeEl.innerText = lockedCount > 0 ? t('club_locked_count', { count: lockedCount }) : "";
  }

  var hintEl = document.getElementById("nextUnlockHint");
  if (hintEl) {
    if (nextFish) {
      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(nextFish) : nextFish.name;
      var nextFishWater = getFishWater(nextFish);
      var waterName = window.FISHAO_I18N ? window.FISHAO_I18N.getWaterName(nextFishWater) : nextFishWater;
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

