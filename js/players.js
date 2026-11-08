/**
 * FISHAO – Community Players, Friends & Backyard Management (js/players.js)
 * --------------------------------------------------------------------------
 * Handles the community player directory, friend management, backyard
 * (Za domem) fish breeding (strictly for the 83 backyard species),
 * universal player detail modal, and reverse fish-to-player lookups.
 */

/**
 * Check whether a fish is breedable "Za domem" according to game data
 * (strictly the 83 fishes located in 'Za domem' / 'Home backyard' / location_300)
 */
function isBackyardBreedable(fish) {
  if (!fish) return false;
  var fObj = (typeof fish === 'object') ? fish : allFishes.find(function (x) { return x.id === fish; });
  if (!fObj || !fObj.locations || !Array.isArray(fObj.locations)) return false;
  return fObj.locations.some(function (l) {
    return l === 'Za domem' || l === 'Home backyard' || l === 'location_300' || (typeof l === 'string' && l.toLowerCase().indexOf('za dom') !== -1);
  });
}

/**
 * Load all players from Firestore collection 'users'
 */
async function loadAllPlayers(force) {
  if (allPlayersList.length > 0 && !force) {
    renderPlayersList();
    return;
  }

  if (!currentUser) {
    allPlayersList = [];
    renderPlayersList();
    return;
  }

  if (!db) {
    // Local / Offline fallback with current user
    if (userProfile) {
      allPlayersList = [{
        uid: currentUser ? currentUser.uid : "local_user",
        displayName: userProfile.displayName || t('user_default_player'),
        avatarUrl: userProfile.avatarUrl || "🎣",
        role: userProfile.role || "member",
        clubId: userProfile.clubId || "",
        clubName: userProfile.clubName || "",
        caughtFishIds: Array.from(caughtFishIds),
        backyardFishIds: Array.from(backyardFishIds),
        createdAt: userProfile.createdAt || new Date().toISOString()
      }];
    } else {
      allPlayersList = [];
    }
    renderPlayersList();
    return;
  }

  try {
    var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    var usersCol = fsModule.collection(db, "users");
    var snap = await fsModule.getDocs(usersCol);
    var list = [];

    snap.forEach(function (doc) {
      var d = doc.data();
      list.push({
        uid: doc.id,
        displayName: d.displayName || t('user_default_player'),
        avatarUrl: d.avatarUrl || "🎣",
        role: d.role || "member",
        clubId: d.clubId || "",
        clubName: d.clubName || "",
        caughtFishIds: Array.isArray(d.caughtFishIds) ? d.caughtFishIds : [],
        backyardFishIds: Array.isArray(d.backyardFishIds) ? d.backyardFishIds : [],
        createdAt: d.createdAt || ""
      });
    });

    allPlayersList = list;
    populatePlayerFishFilterDropdown();
    renderPlayersList();
  } catch (err) {
    console.error("Failed to load community players:", err);
  }
}

/**
 * Populate select dropdown with fish that are bred by at least one player
 */
function populatePlayerFishFilterDropdown() {
  var select = document.getElementById("playerFishFilterSelect");
  if (!select) return;

  var currentVal = select.value;
  var bredFishIdSet = new Set();
  allPlayersList.forEach(function (p) {
    if (p.backyardFishIds && Array.isArray(p.backyardFishIds)) {
      p.backyardFishIds.forEach(function (fid) {
        if (isBackyardBreedable(fid)) bredFishIdSet.add(fid);
      });
    }
  });

  var bredFishes = [];
  bredFishIdSet.forEach(function (fid) {
    var f = allFishes.find(function (x) { return x.id === fid; });
    if (f) bredFishes.push(f);
  });

  bredFishes.sort(function (a, b) {
    var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
    var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
    return nameA.localeCompare(nameB);
  });

  var html = '<option value="">' + t('players_filter_all_fishes', 'Všechny odchované ryby') + ' (' + bredFishes.length + ')</option>';
  bredFishes.forEach(function (f) {
    var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    html += '<option value="' + f.id + '"' + (String(f.id) === String(currentVal) ? ' selected' : '') + '>' + escapeHtml(fName) + ' (#' + f.id + ')</option>';
  });

  select.innerHTML = html;
}

/**
 * Toggle friend status for a player
 */
async function toggleFriend(uid, event) {
  if (event) {
    event.stopPropagation();
  }

  if (!currentUser) {
    showAuthNotice(t('auth_notice_default', 'Pro tuto akci se musíš nejdříve přihlásit přes Google účet.'));
    return;
  }

  if (uid === currentUser.uid) return;

  var isFriend = friendUids.has(uid);
  if (isFriend) {
    friendUids.delete(uid);
  } else {
    friendUids.add(uid);
  }

  // Persist locally
  try {
    localStorage.setItem('fishao_friends_uids', JSON.stringify(Array.from(friendUids)));
  } catch (e) {}

  if (userProfile) {
    userProfile.friendUids = Array.from(friendUids);
  }

  // Sync to Firestore
  if (currentUser && db) {
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var userRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userRef, {
        friendUids: Array.from(friendUids)
      });
    } catch (err) {
      console.warn("Failed to sync friends to Firestore:", err);
    }
  }

  var targetPlayer = allPlayersList.find(function (p) { return p.uid === uid; });
  var targetName = targetPlayer ? targetPlayer.displayName : 'Hráč';

  if (isFriend) {
    showToast(t('friend_removed_toast', { name: targetName }), "info");
  } else {
    showToast(t('friend_added_toast', { name: targetName }), "success");
  }

  renderPlayersList();

  // If player modal is open for this player, update modal friend button
  var modalNameEl = document.getElementById("playerModalName");
  if (modalNameEl && modalNameEl.dataset.currentUid === uid) {
    updateModalFriendBtn(uid);
  }

  // If fish detail modal is open, re-render owners box so friends are highlighted
  if (selectedModalFishId) {
    renderModalBackyardOwners(selectedModalFishId);
  }
}

function togglePlayerFriendsFilter() {
  filterPlayerFriendsOnly = !filterPlayerFriendsOnly;
  var btn = document.getElementById("filterPlayerFriendsOnlyBtn");
  if (btn) btn.classList.toggle("active", filterPlayerFriendsOnly);
  renderPlayersList();
}

/**
 * Render player cards in the community grid
 */
function renderPlayersList() {
  var grid = document.getElementById("playersGrid");
  var countBadge = document.getElementById("playersCountBadge");
  if (!grid) return;

  var myUid = currentUser ? currentUser.uid : "";
  var searchNorm = normStr(filterPlayerSearchText);

  var filtered = allPlayersList.filter(function (p) {
    if (filterPlayerFriendsOnly && !friendUids.has(p.uid)) {
      return false;
    }
    if (filterPlayerBackyardOnly && (!p.backyardFishIds || p.backyardFishIds.length === 0)) {
      return false;
    }
    if (filterPlayerFishId && (!p.backyardFishIds || p.backyardFishIds.indexOf(filterPlayerFishId) === -1)) {
      return false;
    }
    if (searchNorm) {
      var nameMatch = normStr(p.displayName).indexOf(searchNorm) !== -1;
      var clubMatch = normStr(p.clubName).indexOf(searchNorm) !== -1;
      var fishMatch = false;
      if (p.backyardFishIds && p.backyardFishIds.length) {
        fishMatch = p.backyardFishIds.some(function (fid) {
          var fObj = allFishes.find(function (x) { return x.id === fid; });
          if (!fObj) return false;
          var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name;
          return normStr(fName).indexOf(searchNorm) !== -1;
        });
      }
      if (!nameMatch && !clubMatch && !fishMatch) return false;
    }
    return true;
  });

  // Sort order:
  // 1. Current user (isMe)
  // 2. Friends (friendUids)
  // 3. Most backyard fish
  // 4. Most catches
  filtered.sort(function (a, b) {
    if (a.uid === myUid) return -1;
    if (b.uid === myUid) return 1;

    var isFriendA = friendUids.has(a.uid) ? 1 : 0;
    var isFriendB = friendUids.has(b.uid) ? 1 : 0;
    if (isFriendB !== isFriendA) return isFriendB - isFriendA;

    var bCountA = (a.backyardFishIds && a.backyardFishIds.length) || 0;
    var bCountB = (b.backyardFishIds && b.backyardFishIds.length) || 0;
    if (bCountB !== bCountA) return bCountB - bCountA;

    var cCountA = (a.caughtFishIds && a.caughtFishIds.length) || 0;
    var cCountB = (b.caughtFishIds && b.caughtFishIds.length) || 0;
    return cCountB - cCountA;
  });

  if (countBadge) {
    countBadge.innerText = t('players_count_stat', { count: filtered.length });
  }

  // Update clear button in search input
  var clearBtn = document.getElementById("playerSearchClearBtn");
  if (clearBtn) {
    clearBtn.style.display = searchNorm ? "flex" : "none";
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted);">' +
      '<div style="font-size: 36px; margin-bottom: 10px;">👥</div>' +
      '<div>' + t('players_empty_search', 'Nenalezen žádný hráč odpovídající zadaným filtrům.') + '</div>' +
      '</div>';
    return;
  }

  var html = "";
  filtered.forEach(function (p) {
    var isMe = (p.uid === myUid);
    var isFriend = friendUids.has(p.uid);
    var av = p.avatarUrl || "🎣";
    var avatarHtml = "";
    if (av.startsWith("http://") || av.startsWith("https://")) {
      avatarHtml = '<div class="player-card-avatar-wrap"><img src="' + escapeHtml(av) + '" alt="" onerror="this.parentElement.innerHTML=\'🎣\'"></div>';
    } else {
      avatarHtml = '<div class="player-card-avatar-wrap">' + escapeHtml(av || "🎣") + '</div>';
    }

    var roleBadge = "";
    if (p.role === "admin") {
      roleBadge = '<span class="pill-btn danger active" style="font-size: 10px; padding: 1px 7px; height: auto;">🛡️ Admin</span>';
    }

    var clubInfo = p.clubName
      ? '<span class="player-card-club-badge">🏆 ' + escapeHtml(p.clubName) + '</span>'
      : '<span style="color: var(--text-muted);">' + t('player_card_no_club', 'Bez klubu') + '</span>';

    // Catch counts
    var totalCatches = (p.caughtFishIds && p.caughtFishIds.length) || 0;
    var clubCatches = 0;
    if (p.caughtFishIds && p.caughtFishIds.length) {
      clubFishes.forEach(function (cf) {
        if (p.caughtFishIds.indexOf(cf.id) !== -1) clubCatches++;
      });
    }

    // Backyard fish preview chips (strictly backyard species)
    var bFishes = (p.backyardFishIds || []).filter(isBackyardBreedable);
    var backyardChipsHtml = "";
    if (bFishes.length > 0) {
      var maxPreview = 4;
      var previewSlice = bFishes.slice(0, maxPreview);
      previewSlice.forEach(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('#' + fid);
        backyardChipsHtml += '<span class="backyard-mini-chip" title="' + escapeHtml(fName) + '">' +
          '<img src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
          escapeHtml(fName) +
          '</span>';
      });
      if (bFishes.length > maxPreview) {
        backyardChipsHtml += '<span class="backyard-mini-chip more">+' + (bFishes.length - maxPreview) + '</span>';
      }
    } else {
      backyardChipsHtml = '<div class="player-card-empty-backyard">' + t('player_card_backyard_empty', 'Žádné ryby za domem') + '</div>';
    }

    var friendBtnHtml = "";
    if (!isMe && currentUser) {
      friendBtnHtml = '<button type="button" class="player-friend-star-btn ' + (isFriend ? 'active' : '') + '" onclick="window.fishaoApp.toggleFriend(\'' + p.uid + '\', event)" title="' + (isFriend ? 'Odebrat z přátel' : 'Přidat do přátel') + '">' +
        (isFriend ? '⭐ ' + t('btn_friend_yes', 'Přítel') : '☆ ' + t('btn_friend_add', 'Přidat do přátel')) +
        '</button>';
    }

    html += '<div class="player-card' + (isMe ? ' is-me' : '') + (isFriend ? ' is-friend' : '') + '">' +
      '<div>' +
        '<div class="player-card-header">' +
          avatarHtml +
          '<div class="player-card-meta">' +
            '<div class="player-card-name-row">' +
              '<span class="player-card-name">' + escapeHtml(p.displayName) + '</span>' +
              (isMe ? '<span class="player-card-me-tag">(Ty)</span>' : '') +
              roleBadge +
              (isFriend ? '<span class="player-friend-badge" title="Tento hráč je v tvých přátelích">⭐ Přítel</span>' : '') +
            '</div>' +
            '<div class="player-card-club-row">' + clubInfo + '</div>' +
          '</div>' +
          friendBtnHtml +
        '</div>' +

        '<div class="player-card-stats">' +
          '<div class="player-card-stat-line">' +
            '<span class="player-card-stat-label">🎣 Úlovky:</span>' +
            '<span class="player-card-stat-val" style="color: #38bdf8;">' + totalCatches + ' / ' + allFishes.length + '</span>' +
          '</div>' +
          '<div class="player-card-stat-line">' +
            '<span class="player-card-stat-label">🏆 Klubové ryby:</span>' +
            '<span class="player-card-stat-val" style="color: #34d399;">' + clubCatches + ' / 80</span>' +
          '</div>' +
        '</div>' +

        '<div class="player-card-backyard">' +
          '<div class="player-card-backyard-header">' +
            '<span>🏡 ' + t('player_card_backyard_title', { count: bFishes.length }) + '</span>' +
          '</div>' +
          '<div class="player-card-backyard-chips">' +
            backyardChipsHtml +
          '</div>' +
        '</div>' +
      '</div>' +

      '<button type="button" class="player-card-btn" onclick="window.fishaoApp.openPlayerModal(\'' + p.uid + '\')">' +
        '<span>' + t('player_card_view_profile', 'Zobrazit profil & dvorek →') + '</span>' +
      '</button>' +
    '</div>';
  });

  grid.innerHTML = html;
}

/**
 * Filter and search handlers for community view
 */
function onPlayerSearchInput(val) {
  filterPlayerSearchText = (val || "").trim();
  renderPlayersList();
}

function clearPlayerSearch() {
  var input = document.getElementById("playerSearchInput");
  if (input) input.value = "";
  filterPlayerSearchText = "";
  renderPlayersList();
}

function togglePlayerBackyardFilter() {
  filterPlayerBackyardOnly = !filterPlayerBackyardOnly;
  var btn = document.getElementById("filterPlayerBackyardOnlyBtn");
  if (btn) btn.classList.toggle("active", filterPlayerBackyardOnly);
  renderPlayersList();
}

function onPlayerFishFilterChange(val) {
  filterPlayerFishId = val ? parseInt(val, 10) : null;
  renderPlayersList();
}

/**
 * Toggle a fish in current user's backyard
 */
async function toggleBackyardFish(fishId) {
  if (!fishId) return;
  if (!currentUser) {
    showAuthNotice(t('auth_notice_default', 'Pro tuto akci se musíš nejdříve přihlásit přes Google účet.'));
    return;
  }

  // Enforce backyard breeding restriction: only the 83 specific fish are allowed
  if (!isBackyardBreedable(fishId)) {
    showToast(t('backyard_not_breedable', 'Tato ryba není určena pro chov za domem.'), "error");
    return;
  }

  var isBred = backyardFishIds.has(fishId);
  if (isBred) {
    backyardFishIds.delete(fishId);
  } else {
    backyardFishIds.add(fishId);
  }

  // Persist locally
  try {
    localStorage.setItem('fishao_backyard_fish_ids', JSON.stringify(Array.from(backyardFishIds)));
  } catch (e) {}

  if (userProfile) {
    userProfile.backyardFishIds = Array.from(backyardFishIds);
  }

  // Update in allPlayersList
  var meInList = allPlayersList.find(function (p) { return p.uid === currentUser.uid; });
  if (meInList) {
    meInList.backyardFishIds = Array.from(backyardFishIds);
  }

  // Sync to Firestore
  if (currentUser && db) {
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var userRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userRef, {
        backyardFishIds: Array.from(backyardFishIds)
      });
    } catch (err) {
      console.warn("Failed to sync backyard fish to Firestore:", err);
    }
  }

  var fObj = allFishes.find(function (x) { return x.id === fishId; });
  var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('Ryba #' + fishId);

  if (isBred) {
    showToast(t('backyard_removed_toast', { name: fName }), "info");
  } else {
    showToast(t('backyard_added_toast', { name: fName }), "success");
  }

  updateModalBackyardBtn(fishId);
  renderModalBackyardOwners(fishId);
  renderBackyardProfilePicker();
  populatePlayerFishFilterDropdown();
  if (currentView === "players") {
    renderPlayersList();
  }
}

function toggleBackyardFromModal() {
  if (!selectedModalFishId) return;
  toggleBackyardFish(selectedModalFishId);
}

function addBackyardFish(fishId) {
  if (!backyardFishIds.has(fishId)) {
    toggleBackyardFish(fishId);
  }
}

function removeBackyardFish(fishId) {
  if (backyardFishIds.has(fishId)) {
    toggleBackyardFish(fishId);
  }
}

/**
 * Update the state of the backyard toggle button in the fish detail modal
 */
function updateModalBackyardBtn(fishId) {
  var btn = document.getElementById("modalBtnBackyard");
  if (!btn) return;

  // If this fish is NOT breedable in backyard, hide the button completely
  if (!isBackyardBreedable(fishId)) {
    btn.style.display = "none";
    return;
  }

  btn.style.display = "inline-flex";
  var isBred = backyardFishIds.has(fishId);
  btn.className = "btn-backyard-pill " + (isBred ? "active" : "");
  btn.innerHTML = isBred ? t('modal_btn_backyard_yes', '🏡 Za domem ✓') : t('modal_btn_backyard_no', '🏡 Za domem');
}

/**
 * Render which players currently have the selected fish bred in their backyard
 */
function renderModalBackyardOwners(fishId) {
  var box = document.getElementById("modalBackyardOwnersBox");
  if (!box) return;

  // Only show this box for actual backyard-breedable fish
  if (!isBackyardBreedable(fishId)) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  var owners = allPlayersList.filter(function (p) {
    return p.backyardFishIds && p.backyardFishIds.indexOf(fishId) !== -1;
  });

  // Sort owners: friends first, then current user, then alphabetical
  owners.sort(function (a, b) {
    var isFriendA = friendUids.has(a.uid) ? 1 : 0;
    var isFriendB = friendUids.has(b.uid) ? 1 : 0;
    if (isFriendB !== isFriendA) return isFriendB - isFriendA;
    return a.displayName.localeCompare(b.displayName);
  });

  if (owners.length === 0) {
    box.innerHTML = '<div class="modal-backyard-owners-title">🏡 ' + t('modal_backyard_owners_title', 'Kdo má tuto rybu za domem:') + '</div>' +
      '<div style="font-size: 11.5px; color: var(--text-muted);">' + t('modal_backyard_owners_none', 'Tuto rybu zatím nikdo nemá za domem.') + '</div>';
    return;
  }

  var pillsHtml = "";
  owners.forEach(function (p) {
    var isFriend = friendUids.has(p.uid);
    var av = p.avatarUrl || "🎣";
    var avIcon = (av.startsWith("http://") || av.startsWith("https://")) ? "🎣" : av;
    pillsHtml += '<span class="modal-backyard-owner-pill' + (isFriend ? ' is-friend' : '') + '" onclick="window.fishaoApp.openPlayerModal(\'' + p.uid + '\')" title="' + escapeHtml(p.displayName) + (isFriend ? ' (Přítel)' : '') + '">' +
      (isFriend ? '⭐ ' : '') + avIcon + ' ' + escapeHtml(p.displayName) +
      '</span>';
  });

  box.innerHTML = '<div class="modal-backyard-owners-title">🏡 ' + t('modal_backyard_owners_title', 'Kdo má tuto rybu za domem:') + ' (' + owners.length + ')</div>' +
    '<div class="modal-backyard-owners-list">' + pillsHtml + '</div>';
}

/**
 * Render backyard chips inside the profile modal
 */
function renderBackyardProfilePicker() {
  var container = document.getElementById("profileBackyardChips");
  var countEl = document.getElementById("profileBackyardCount");
  if (!container) return;

  var ids = Array.from(backyardFishIds).filter(isBackyardBreedable);
  if (countEl) countEl.innerText = ids.length + " / 83 ryb";

  if (ids.length === 0) {
    container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted);">' +
      t('profile_backyard_empty_hint', 'Zatím nemáš vybrané žádné ryby. Můžeš je přidat vyhledáním níže.') +
      '</span>';
    return;
  }

  var html = "";
  ids.forEach(function (fid) {
    var fObj = allFishes.find(function (x) { return x.id === fid; });
    var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('Ryba #' + fid);
    html += '<span class="profile-backyard-chip">' +
      '<img src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
      escapeHtml(fName) +
      '<button type="button" class="profile-backyard-chip-remove" onclick="window.fishaoApp.removeBackyardFish(' + fid + ')" title="Odebrat">&times;</button>' +
      '</span>';
  });

  container.innerHTML = html;
}

/**
 * Live search suggestions for adding backyard fish in profile modal
 * (strictly filtered to the 83 backyard breedable fishes)
 */
function onBackyardSearchInput(val) {
  var popup = document.getElementById("backyardSearchSuggestions");
  if (!popup) return;

  var q = normStr(val);
  if (!q || q.length < 1) {
    popup.style.display = "none";
    return;
  }

  var matches = allFishes.filter(function (f) {
    if (!isBackyardBreedable(f)) return false;
    if (backyardFishIds.has(f.id)) return false;
    var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    return normStr(fName).indexOf(q) !== -1 || String(f.id) === q;
  }).slice(0, 10);

  if (matches.length === 0) {
    popup.innerHTML = '<div style="padding: 8px 12px; font-size: 12px; color: var(--text-muted);">' + t('bulk_no_fish_found', 'Žádná ryba nenalezena') + '</div>';
    popup.style.display = "block";
    return;
  }

  var html = "";
  matches.forEach(function (f) {
    var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    html += '<div class="profile-backyard-sugg-item" onclick="window.fishaoApp.selectBackyardSearchResult(' + f.id + ')">' +
      '<img src="images/fish_' + f.id + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
      '<span style="font-weight: 600;">' + escapeHtml(fName) + '</span>' +
      '<span style="font-size: 11px; color: #2dd4bf; margin-left: auto;">🏡 Za domem</span>' +
      '</div>';
  });

  popup.innerHTML = html;
  popup.style.display = "block";
}

function selectBackyardSearchResult(fishId) {
  var input = document.getElementById("inputBackyardSearch");
  var popup = document.getElementById("backyardSearchSuggestions");
  if (input) input.value = "";
  if (popup) popup.style.display = "none";
  addBackyardFish(fishId);
}

/**
 * Update friend toggle button inside player modal
 */
function updateModalFriendBtn(uid) {
  var btn = document.getElementById("playerModalFriendBtn");
  if (!btn) return;
  var isMe = !!(currentUser && uid === currentUser.uid);
  if (isMe || !currentUser) {
    btn.style.display = "none";
    return;
  }
  btn.style.display = "inline-flex";
  var isFriend = friendUids.has(uid);
  btn.className = "pill-btn " + (isFriend ? "gold active" : "");
  btn.innerHTML = isFriend ? '⭐ ' + t('btn_friend_yes', 'Přítel') : '☆ ' + t('btn_friend_add', 'Přidat do přátel');
}

/**
 * Universal Player Detail Modal (works for all players across clubs and community)
 */
async function openPlayerModal(uid) {
  if (!uid) return;

  var player = allPlayersList.find(function (p) { return p.uid === uid; });
  var clubMem = (currentClubMembersMap && currentClubMembersMap[uid]) || null;
  var isMe = !!(currentUser && uid === currentUser.uid);

  // If not found in memory, try to load directly from Firestore
  if (!player && !clubMem && db) {
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var snap = await fsModule.getDoc(fsModule.doc(db, "users", uid));
      if (snap.exists()) {
        var d = snap.data();
        player = {
          uid: uid,
          displayName: d.displayName || t('user_default_player'),
          avatarUrl: d.avatarUrl || "🎣",
          role: d.role || "member",
          clubId: d.clubId || "",
          clubName: d.clubName || "",
          caughtFishIds: Array.isArray(d.caughtFishIds) ? d.caughtFishIds : [],
          backyardFishIds: Array.isArray(d.backyardFishIds) ? d.backyardFishIds : [],
          createdAt: d.createdAt || ""
        };
      }
    } catch (e) {
      console.warn("Failed to load user doc for modal:", e);
    }
  }

  var dName = isMe
    ? ((userProfile && userProfile.displayName) ? userProfile.displayName : ((player && player.displayName) || "Rybář"))
    : ((player && player.displayName) || (clubMem && clubMem.displayName) || "Rybář");

  var av = isMe
    ? ((userProfile && userProfile.avatarUrl) ? userProfile.avatarUrl : ((player && player.avatarUrl) || "🎣"))
    : ((player && player.avatarUrl) || (clubMem && clubMem.avatarUrl) || "🎣");

  var role = isMe
    ? ((userProfile && userProfile.role) || "member")
    : ((player && player.role) || (clubMem && clubMem.isCreator ? "creator" : "member"));

  var clubName = (player && player.clubName) || (clubMem ? currentClubName : "");

  // Catches calculation
  var cCaught = isMe ? caughtFishIds.size : ((player && player.caughtFishIds && player.caughtFishIds.length) || (clubMem && clubMem.caughtCount) || 0);
  var cClub = 0;
  if (isMe) {
    clubFishes.forEach(function (cf) { if (caughtFishIds.has(cf.id)) cClub++; });
  } else if (player && player.caughtFishIds) {
    clubFishes.forEach(function (cf) { if (player.caughtFishIds.indexOf(cf.id) !== -1) cClub++; });
  } else if (clubMem && clubMem.caughtClubCount !== undefined) {
    cClub = clubMem.caughtClubCount;
  }

  // Backyard fish list (strictly valid backyard species)
  var bFishes = (isMe
    ? Array.from(backyardFishIds)
    : ((player && player.backyardFishIds) || [])).filter(isBackyardBreedable);

  // Avatar rendering
  var avatarWrap = document.getElementById("playerModalAvatarWrap");
  if (avatarWrap) {
    if (av.startsWith("http://") || av.startsWith("https://")) {
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
    var badges = [];
    if (role === "admin") {
      badges.push('<span class="pill-btn danger active" style="font-size: 11px; padding: 2px 10px;">🛡️ ' + t('admin_badge', 'Admin') + '</span>');
    }
    if (clubName) {
      badges.push('<span class="pill-btn gold active" style="font-size: 11px; padding: 2px 10px;">🏆 ' + escapeHtml(clubName) + '</span>');
    } else {
      badges.push('<span class="pill-btn" style="font-size: 11px; padding: 2px 10px; cursor: default;">' + t('player_card_no_club', 'Bez klubu') + '</span>');
    }
    roleEl.innerHTML = badges.join(' ');
  }

  updateModalFriendBtn(uid);

  var clubCountEl = document.getElementById("playerModalClubCount");
  var clubFillEl = document.getElementById("playerModalClubFill");
  if (clubCountEl) clubCountEl.innerText = cClub + " / 80";
  if (clubFillEl) clubFillEl.style.width = Math.min(100, Math.round((cClub / 80) * 100)) + "%";

  var totalCountEl = document.getElementById("playerModalTotalCount");
  var totalFillEl = document.getElementById("playerModalTotalFill");
  var totalPct = Math.round((cCaught / allFishes.length) * 100);
  if (totalCountEl) totalCountEl.innerText = cCaught + " / " + allFishes.length + " (" + totalPct + "%)";
  if (totalFillEl) totalFillEl.style.width = Math.min(100, (cCaught / allFishes.length) * 100).toFixed(1) + "%";

  var joinedEl = document.getElementById("playerModalJoined");
  if (joinedEl) {
    var dateStr = "";
    var rawDate = (player && player.createdAt) || (clubMem && clubMem.joinedAt);
    if (rawDate) {
      try {
        var d = new Date(rawDate);
        dateStr = d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'numeric', year: 'numeric' });
      } catch (e) {
        dateStr = rawDate;
      }
    }
    joinedEl.innerText = dateStr ? t('club_member_joined', { date: dateStr }) : "";
  }

  // Backyard section rendering in modal
  var backyardWrap = document.getElementById("playerModalBackyardWrap");
  if (backyardWrap) {
    var backyardHtml = '<div class="player-modal-backyard-section">' +
      '<div class="player-modal-backyard-header">' +
        '<span>' + t('player_modal_backyard_title', { count: bFishes.length }) + '</span>' +
        (isMe ? '<button type="button" class="btn-subtle-link" onclick="window.fishaoApp.closePlayerModal(); window.fishaoApp.openProfileModal();" style="font-size: 11.5px; color: #2dd4bf;">' + t('player_modal_edit_backyard', '🏡 Upravit mé ryby za domem') + '</button>' : '') +
      '</div>';

    if (bFishes.length === 0) {
      backyardHtml += '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; padding: 6px 0;">' +
        t('player_modal_backyard_empty', 'Hráč zatím nemá nastavené žádné ryby za domem.') +
        '</div>';
    } else {
      backyardHtml += '<div class="player-modal-backyard-grid">';
      bFishes.forEach(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('Ryba #' + fid);
        var stars = fObj ? '★'.repeat(fObj.rating || 1) : '';
        backyardHtml += '<div class="player-modal-backyard-card" onclick="window.fishaoApp.closePlayerModal(); window.fishaoApp.openFishDetail(' + fid + ')" title="' + escapeHtml(fName) + ' (klikni pro detail)">' +
          '<img src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
          '<div class="player-modal-backyard-card-name">' + escapeHtml(fName) + '</div>' +
          '<div class="player-modal-backyard-card-stars">' + stars + '</div>' +
          '</div>';
      });
      backyardHtml += '</div>';
    }
    backyardHtml += '</div>';
    backyardWrap.innerHTML = backyardHtml;
  }

  var selfActions = document.getElementById("playerModalSelfActions");
  if (selfActions) selfActions.style.display = isMe ? "block" : "none";

  var modal = document.getElementById("playerModalOverlay");
  if (modal) modal.classList.add("active");
}
