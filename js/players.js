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
 * Helper to build a rich backyard fish card
 */
function createRichBackyardFishCard(fObj, extraClass, isModal) {
  if (!fObj) return '';
  var fid = fObj.id;
  var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name;
  var stars = '★'.repeat(fObj.rating || 1);
  var isNow = isFishActiveNow(fObj.raw_times);
  var timeInfo = formatCatchTime(fObj.raw_times);
  var timeDisplay = (fObj.raw_times && fObj.raw_times.length > 0)
    ? timeInfo.primary
    : t('time_all_day', 'Celý den (24h)');
  var baitsDisplay = (fObj.baits && fObj.baits.length > 0)
    ? fObj.baits.map(function (b) {
        return (window.FISHAO_I18N && window.FISHAO_I18N.getBaitName)
          ? window.FISHAO_I18N.getBaitName(b)
          : b;
      }).join(', ')
    : '-';

  var clickAction = 'event.stopPropagation(); ' + (isModal
    ? 'window.fishaoApp.closePlayerModal(); window.fishaoApp.openFishDetail(' + fid + ');'
    : 'window.fishaoApp.openFishDetail(' + fid + ');');

  return '<div class="player-backyard-fish-card ' + (extraClass || '') + '" onclick="' + clickAction + '" title="' + escapeHtml(fName) + ' (klikni pro detail)">' +
    '<div class="pbfc-top">' +
      '<img class="pbfc-img" src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
      '<div class="pbfc-info">' +
        '<span class="pbfc-name">' + escapeHtml(fName) + '</span>' +
        '<span class="pbfc-stars">' + stars + '</span>' +
      '</div>' +
      (isNow ? '<span class="pbfc-active-pill">⚡ ' + t('time_active_now_short', 'Bere teď') + '</span>' : '') +
    '</div>' +
    '<div class="pbfc-meta">' +
      '<span class="pbfc-time" title="' + escapeHtml(timeInfo.sub || timeDisplay) + '">⏰ ' + escapeHtml(timeDisplay) + '</span>' +
      '<span class="pbfc-baits" title="' + escapeHtml(baitsDisplay) + '">' + escapeHtml(baitsDisplay) + '</span>' +
    '</div>' +
  '</div>';
}

/**
 * Populate select dropdowns for player filtering (fishes & baits)
 */
function populatePlayerFishFilterDropdown() {
  var selectFish = document.getElementById("playerFishFilterSelect");
  if (selectFish) {
    var currentVal = selectFish.value;
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

    var htmlFish = '<option value="">' + t('players_filter_all_fishes', 'Všechny odchované ryby') + ' (' + bredFishes.length + ')</option>';
    bredFishes.forEach(function (f) {
      var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      htmlFish += '<option value="' + f.id + '"' + (String(f.id) === String(currentVal) ? ' selected' : '') + '>' + escapeHtml(fName) + ' (#' + f.id + ')</option>';
    });
    selectFish.innerHTML = htmlFish;
  }

  var selectBait = document.getElementById("playerBaitFilterSelect");
  if (selectBait) {
    var currentBaitVal = selectBait.value || filterPlayerBait || "";
    var backyardBaits = ['Ryby', 'Maso', 'Rostlinné', 'Hmyz', 'Těsta', 'Přívlač/Nástrahy', 'Žraločí', 'Háčky'];
    var htmlBait = '<option value="">' + t('players_filter_bait_label', 'Všechny návnady') + '</option>';
    backyardBaits.forEach(function (b) {
      var bName = (window.FISHAO_I18N && window.FISHAO_I18N.getBaitName)
        ? window.FISHAO_I18N.getBaitName(b)
        : b;
      htmlBait += '<option value="' + b + '"' + (b === currentBaitVal ? ' selected' : '') + '>' + escapeHtml(bName) + '</option>';
    });
    selectBait.innerHTML = htmlBait;
  }
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

function togglePlayerBackyardFilter() {
  filterPlayerBackyardOnly = !filterPlayerBackyardOnly;
  var btn = document.getElementById("filterPlayerBackyardOnlyBtn");
  if (btn) btn.classList.toggle("active", filterPlayerBackyardOnly);
  renderPlayersList();
}

function togglePlayerActiveNowFilter() {
  filterPlayerActiveNow = !filterPlayerActiveNow;
  var btn = document.getElementById("filterPlayerActiveNowBtn");
  if (btn) btn.classList.toggle("active", filterPlayerActiveNow);
  renderPlayersList();
}

function onPlayerFishFilterChange(val) {
  filterPlayerFishId = val ? parseInt(val, 10) : null;
  renderPlayersList();
}

function onPlayerBaitFilterChange(val) {
  filterPlayerBait = val || "";
  renderPlayersList();
}

function onPlayerRatingFilterChange(val) {
  filterPlayerRating = val ? parseInt(val, 10) : null;
  renderPlayersList();
}

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

function resetPlayerFilters() {
  filterPlayerSearchText = "";
  filterPlayerFriendsOnly = false;
  filterPlayerBackyardOnly = false;
  filterPlayerActiveNow = false;
  filterPlayerFishId = null;
  filterPlayerBait = "";
  filterPlayerRating = null;

  var sInput = document.getElementById("playerSearchInput");
  if (sInput) sInput.value = "";
  var fFriendsBtn = document.getElementById("filterPlayerFriendsOnlyBtn");
  if (fFriendsBtn) fFriendsBtn.classList.remove("active");
  var fBackyardBtn = document.getElementById("filterPlayerBackyardOnlyBtn");
  if (fBackyardBtn) fBackyardBtn.classList.remove("active");
  var fActiveBtn = document.getElementById("filterPlayerActiveNowBtn");
  if (fActiveBtn) fActiveBtn.classList.remove("active");
  var sFish = document.getElementById("playerFishFilterSelect");
  if (sFish) sFish.value = "";
  var sBait = document.getElementById("playerBaitFilterSelect");
  if (sBait) sBait.value = "";
  var sRating = document.getElementById("playerRatingFilterSelect");
  if (sRating) sRating.value = "";

  renderPlayersList();
}

function renderPlayersActiveFiltersBar() {
  var bar = document.getElementById("playersActiveFiltersBar");
  var resetBtn = document.getElementById("resetPlayersFiltersBtn");
  var searchWrap = document.getElementById("playerSearchWrap");
  var selectFish = document.getElementById("playerFishFilterSelect");
  var selectBait = document.getElementById("playerBaitFilterSelect");
  var selectRating = document.getElementById("playerRatingFilterSelect");

  if (searchWrap) searchWrap.classList.toggle("has-value", !!filterPlayerSearchText);
  if (selectFish) selectFish.classList.toggle("has-value", !!filterPlayerFishId);
  if (selectBait) selectBait.classList.toggle("has-value", !!filterPlayerBait);
  if (selectRating) selectRating.classList.toggle("has-value", !!filterPlayerRating);

  var chips = [];

  var clearTitle = t('filter_clear_btn_title', 'Vymazat filtr');

  if (filterPlayerSearchText) {
    chips.push(
      '<span class="active-filter-chip">' +
        '🔍 ' + t('filter_active_search', { term: escapeHtml(filterPlayerSearchText) }) +
        '<button type="button" onclick="window.fishaoApp.clearPlayerSearch()" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerFriendsOnly) {
    chips.push(
      '<span class="active-filter-chip">' +
        '⭐ ' + t('filter_active_friends', 'Pouze přátelé') +
        '<button type="button" onclick="window.fishaoApp.togglePlayerFriendsFilter()" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerBackyardOnly) {
    chips.push(
      '<span class="active-filter-chip">' +
        '🏡 ' + t('filter_active_backyard', 'Pouze za domem') +
        '<button type="button" onclick="window.fishaoApp.togglePlayerBackyardFilter()" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerActiveNow) {
    chips.push(
      '<span class="active-filter-chip">' +
        '⚡ ' + t('filter_active_now', 'Bere právě teď') +
        '<button type="button" onclick="window.fishaoApp.togglePlayerActiveNowFilter()" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerFishId) {
    var fObj = allFishes.find(function (x) { return x.id === filterPlayerFishId; });
    var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('#' + filterPlayerFishId);
    chips.push(
      '<span class="active-filter-chip">' +
        '🐟 ' + t('filter_active_fish', { name: escapeHtml(fName) }) +
        '<button type="button" onclick="window.fishaoApp.onPlayerFishFilterChange(\'\')" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerBait) {
    var bName = (window.FISHAO_I18N && window.FISHAO_I18N.getBaitName)
      ? window.FISHAO_I18N.getBaitName(filterPlayerBait)
      : filterPlayerBait;
    chips.push(
      '<span class="active-filter-chip">' +
        t('filter_active_bait', { bait: escapeHtml(bName) }) +
        '<button type="button" onclick="window.fishaoApp.onPlayerBaitFilterChange(\'\')" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  if (filterPlayerRating) {
    chips.push(
      '<span class="active-filter-chip">' +
        '⭐ ' + t('filter_active_rating', { stars: filterPlayerRating }) +
        '<button type="button" onclick="window.fishaoApp.onPlayerRatingFilterChange(\'\')" title="' + escapeHtml(clearTitle) + '">&times;</button>' +
      '</span>'
    );
  }

  var fFriendsBtn = document.getElementById("filterPlayerFriendsOnlyBtn");
  if (fFriendsBtn) fFriendsBtn.classList.toggle("active", !!filterPlayerFriendsOnly);
  var fBackyardBtn = document.getElementById("filterPlayerBackyardOnlyBtn");
  if (fBackyardBtn) fBackyardBtn.classList.toggle("active", !!filterPlayerBackyardOnly);
  var fActiveBtn = document.getElementById("filterPlayerActiveNowBtn");
  if (fActiveBtn) fActiveBtn.classList.toggle("active", !!filterPlayerActiveNow);

  var hasAnyFilter = (chips.length > 0);
  if (resetBtn) {
    resetBtn.style.display = hasAnyFilter ? "inline-flex" : "none";
  }

  if (bar) {
    if (hasAnyFilter) {
      bar.style.display = "flex";
      bar.innerHTML = '<span class="active-filters-title">🎯 ' + t('players_active_filters_title', 'Aktivní filtry:') + '</span>' +
        chips.join('') +
        '<button type="button" class="active-filters-clear-all" onclick="window.fishaoApp.resetPlayerFilters()" title="' + escapeHtml(t('filter_reset_all_title', 'Resetovat všechny filtry')) + '">' +
          t('players_filter_clear_all', 'Vymazat vše ↺') +
        '</button>';
    } else {
      bar.style.display = "none";
      bar.innerHTML = "";
    }
  }
}

var activeBackyardMenuUid = null;

function toggleBackyardMenu(uid, event) {
  if (event) {
    event.stopPropagation();
  }
  if (activeBackyardMenuUid === uid) {
    closeBackyardMenu(uid, event);
    return;
  }
  closeBackyardMenu();
  activeBackyardMenuUid = uid;
  var menu = document.getElementById("backyardMenu_" + uid);
  if (menu) {
    menu.style.display = "flex";
  }
}

function closeBackyardMenu(uid, event) {
  if (event) {
    event.stopPropagation();
  }
  var targetUid = uid || activeBackyardMenuUid;
  if (targetUid) {
    var menu = document.getElementById("backyardMenu_" + targetUid);
    if (menu) {
      menu.style.display = "none";
    }
  }
  if (!uid || uid === activeBackyardMenuUid) {
    activeBackyardMenuUid = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', function (e) {
    if (activeBackyardMenuUid) {
      var menu = document.getElementById("backyardMenu_" + activeBackyardMenuUid);
      if (menu && !menu.contains(e.target)) {
        closeBackyardMenu();
      }
    }
  });
}

/**
 * Render player cards in the community grid
 */
function renderPlayersList() {
  var grid = document.getElementById("playersGrid");
  var countBadge = document.getElementById("playersCountBadge");
  if (!grid) return;

  renderPlayersActiveFiltersBar();

  var myUid = currentUser ? currentUser.uid : "";
  var searchNorm = normStr(filterPlayerSearchText);

  var filtered = allPlayersList.filter(function (p) {
    var pBackyard = (p.backyardFishIds || []).filter(isBackyardBreedable);

    if (filterPlayerFriendsOnly && !friendUids.has(p.uid)) {
      return false;
    }
    if (filterPlayerBackyardOnly && pBackyard.length === 0) {
      return false;
    }
    if (filterPlayerFishId && pBackyard.indexOf(filterPlayerFishId) === -1) {
      return false;
    }
    if (filterPlayerActiveNow) {
      var hasActive = pBackyard.some(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        return fObj && isFishActiveNow(fObj.raw_times);
      });
      if (!hasActive) return false;
    }
    if (filterPlayerBait) {
      var hasBait = pBackyard.some(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        return fObj && fObj.baits && fObj.baits.indexOf(filterPlayerBait) !== -1;
      });
      if (!hasBait) return false;
    }
    if (filterPlayerRating) {
      var hasRating = pBackyard.some(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        return fObj && fObj.rating === filterPlayerRating;
      });
      if (!hasRating) return false;
    }
    if (searchNorm) {
      var nameMatch = normStr(p.displayName).indexOf(searchNorm) !== -1;
      var clubMatch = normStr(p.clubName).indexOf(searchNorm) !== -1;
      var fishMatch = pBackyard.some(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        if (!fObj) return false;
        var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name;
        if (normStr(fName).indexOf(searchNorm) !== -1) return true;
        if (fObj.baits && fObj.baits.some(function (b) { return normStr(b).indexOf(searchNorm) !== -1; })) return true;
        return false;
      });
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
    var isMe = !!(currentUser && p.uid === currentUser.uid);
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
      roleBadge = '<span class="pill-btn danger active" style="font-size: 10px; padding: 1px 7px; height: auto;">🛡️ ' + t('admin_badge', 'Admin') + '</span>';
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

    // Backyard fish rich cards (strictly backyard species)
    var bFishes = (p.backyardFishIds || []).filter(isBackyardBreedable);
    var backyardCardsHtml = "";
    if (bFishes.length > 0) {
      var maxPreview = 2;
      var showSlice = bFishes.slice(0, maxPreview);

      backyardCardsHtml += '<div class="player-backyard-list">';
      showSlice.forEach(function (fid) {
        var fObj = allFishes.find(function (x) { return x.id === fid; });
        if (fObj) {
          backyardCardsHtml += createRichBackyardFishCard(fObj);
        }
      });
      backyardCardsHtml += '</div>';

      if (bFishes.length > maxPreview) {
        backyardCardsHtml += '<button type="button" class="player-backyard-expand-btn" onclick="window.fishaoApp.toggleBackyardMenu(\'' + p.uid + '\', event)">' +
          '+ ' + t('backyard_show_all', { count: bFishes.length }) +
          '</button>';

        // Floating Popover Menu (renders all fish without expanding card height or stretching grid)
        backyardCardsHtml += '<div id="backyardMenu_' + p.uid + '" class="player-backyard-popover-menu" style="display: none;" onclick="event.stopPropagation();">' +
          '<div class="pbm-header">' +
            '<span class="pbm-title">🏡 ' + escapeHtml(p.displayName) + ' – ' + t('player_backyard_menu_title', { count: bFishes.length }) + '</span>' +
            '<button type="button" class="pbm-close" onclick="window.fishaoApp.closeBackyardMenu(\'' + p.uid + '\', event)" title="' + t('action_close', 'Zavřít') + '">&times;</button>' +
          '</div>' +
          '<div class="pbm-list">';
        bFishes.forEach(function (fid) {
          var fObj = allFishes.find(function (x) { return x.id === fid; });
          if (fObj) {
            backyardCardsHtml += createRichBackyardFishCard(fObj);
          }
        });
        backyardCardsHtml += '</div></div>';
      }
    } else {
      backyardCardsHtml = '<div class="player-card-empty-backyard">' + t('player_card_backyard_empty', 'Žádné ryby za domem') + '</div>';
    }

    var friendBtnHtml = "";
    if (!isMe && currentUser) {
      friendBtnHtml = '<button type="button" class="player-friend-star-btn ' + (isFriend ? 'active' : '') + '" onclick="window.fishaoApp.toggleFriend(\'' + p.uid + '\', event)" title="' + (isFriend ? t('btn_friend_remove_title', 'Odebrat z přátel') : t('btn_friend_add_title', 'Přidat do přátel')) + '">' +
        (isFriend ? '⭐ ' + t('btn_friend_yes', 'Přítel') : '☆ ' + t('btn_friend_add', 'Přidat do přátel')) +
        '</button>';
    }

    html += '<div class="player-card' + (isMe ? ' is-me' : '') + (isFriend ? ' is-friend' : '') + '" onclick="window.fishaoApp.openPlayerModal(\'' + p.uid + '\')">' +
      '<div>' +
        '<div class="player-card-header">' +
          avatarHtml +
          '<div class="player-card-meta">' +
            '<div class="player-card-name-row">' +
              '<span class="player-card-name">' + escapeHtml(p.displayName) + '</span>' +
              (isMe ? '<span class="player-card-me-tag">(' + t('player_card_me_tag', 'Ty') + ')</span>' : '') +
              roleBadge +
            '</div>' +
            '<div class="player-card-club-row">' + clubInfo + '</div>' +
          '</div>' +
          friendBtnHtml +
        '</div>' +

        '<div class="player-card-stats">' +
          '<div class="player-card-stat-line">' +
            '<span class="player-card-stat-label">🎣 ' + t('player_card_stat_catches', 'Úlovky:') + '</span>' +
            '<span class="player-card-stat-val" style="color: #38bdf8;">' + totalCatches + ' / ' + allFishes.length + '</span>' +
          '</div>' +
          '<div class="player-card-stat-line">' +
            '<span class="player-card-stat-label">🏆 ' + t('player_card_stat_club_fish', 'Klubové ryby:') + '</span>' +
            '<span class="player-card-stat-val" style="color: #34d399;">' + clubCatches + ' / 80</span>' +
          '</div>' +
        '</div>' +

        '<div class="player-card-backyard">' +
          '<div class="player-card-backyard-header">' +
            '<span>🏡 ' + t('player_card_backyard_title', { count: bFishes.length }) + '</span>' +
          '</div>' +
          backyardCardsHtml +
        '</div>' +
      '</div>' +

      '<button type="button" class="player-card-btn" onclick="event.stopPropagation(); window.fishaoApp.openPlayerModal(\'' + p.uid + '\')">' +
        '<span>' + t('player_card_view_profile', 'Zobrazit profil & dvorek →') + '</span>' +
      '</button>' +
    '</div>';
  });

  grid.innerHTML = html;
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
    pillsHtml += '<span class="modal-backyard-owner-pill' + (isFriend ? ' is-friend' : '') + '" onclick="window.fishaoApp.openPlayerModal(\'' + p.uid + '\')" title="' + escapeHtml(p.displayName) + (isFriend ? ' (' + t('btn_friend_yes', 'Přítel') + ')' : '') + '">' +
      (isFriend ? '⭐ ' : '') + avIcon + ' ' + escapeHtml(p.displayName) +
      '</span>';
  });

  box.innerHTML = '<div class="modal-backyard-owners-title">🏡 ' + t('modal_backyard_owners_title', 'Kdo má tuto rybu za domem:') + ' (' + owners.length + ')</div>' +
    '<div class="modal-backyard-owners-list">' + pillsHtml + '</div>';
}

/**
 * Toggle visual catalog of all 83 breedable backyard fish in profile modal
 */
function toggleBackyardAllGrid() {
  isProfileBackyardCatalogOpen = !isProfileBackyardCatalogOpen;
  var container = document.getElementById("profileAllBackyardCatalog");
  var btnText = document.getElementById("btnToggleAllBackyardGridText");
  if (container) {
    container.style.display = isProfileBackyardCatalogOpen ? "block" : "none";
  }
  if (btnText) {
    btnText.innerText = isProfileBackyardCatalogOpen
      ? t('profile_btn_catalog_hide', '📋 Skrýt katalog ryb ▴')
      : t('profile_btn_catalog_show', '📋 Procházet všech 83 ryb k odchovu ▾');
  }
  if (isProfileBackyardCatalogOpen) {
    renderProfileBackyardCatalog();
  }
}

function renderProfileBackyardCatalog(searchTerm) {
  var container = document.getElementById("profileAllBackyardCatalog");
  if (!container || !isProfileBackyardCatalogOpen) return;

  var q = normStr(searchTerm || "");
  var bBreedables = allFishes.filter(isBackyardBreedable);
  bBreedables.sort(function (a, b) {
    var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
    var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
    return nameA.localeCompare(nameB);
  });

  if (q) {
    bBreedables = bBreedables.filter(function (f) {
      var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      return normStr(fName).indexOf(q) !== -1 || String(f.id) === q;
    });
  }

  var html = '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px;">' +
    '<span style="font-size: 11.5px; font-weight: 700; color: #2dd4bf;">' +
      t('profile_catalog_header', { count: bBreedables.length }, 'Katalog 83 ryb k odchovu (' + bBreedables.length + ')') +
    '</span>' +
    '<input type="text" class="dash-input" style="height: 28px; font-size: 11px; padding: 2px 8px; width: 150px;" placeholder="' + escapeHtml(t('profile_catalog_filter_placeholder', 'Hledat v katalogu...')) + '" value="' + escapeHtml(searchTerm || '') + '" oninput="window.fishaoApp.filterBackyardCatalog(this.value)">' +
  '</div>';

  html += '<div class="profile-catalog-grid">';
  bBreedables.forEach(function (f) {
    var fid = f.id;
    var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    var isSelected = backyardFishIds.has(fid);
    var stars = '★'.repeat(f.rating || 1);

    html += '<div class="catalog-fish-card ' + (isSelected ? 'selected' : '') + '" onclick="window.fishaoApp.toggleBackyardFish(' + fid + ')" title="' + escapeHtml(fName) + ' (' + stars + ')">' +
      (isSelected ? '<span class="catalog-fish-check">✓</span>' : '') +
      '<img src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
      '<span class="catalog-fish-name">' + escapeHtml(fName) + '</span>' +
      '<span class="catalog-fish-stars">' + stars + '</span>' +
    '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function filterBackyardCatalog(val) {
  renderProfileBackyardCatalog(val);
}

/**
 * Render backyard chips inside the profile modal
 */
function renderBackyardProfilePicker() {
  var container = document.getElementById("profileBackyardChips");
  var countEl = document.getElementById("profileBackyardCount");
  if (!container) return;

  var ids = Array.from(backyardFishIds).filter(isBackyardBreedable);
  if (countEl) countEl.innerText = t('profile_backyard_count_label', { count: ids.length }, ids.length + " / 83 ryb");

  if (ids.length === 0) {
    container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted);">' +
      t('profile_backyard_empty_hint', 'Zatím nemáš vybrané žádné ryby. Můžeš je přidat vyhledáním níže.') +
      '</span>';
  } else {
    var html = "";
    ids.forEach(function (fid) {
      var fObj = allFishes.find(function (x) { return x.id === fid; });
      var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('Ryba #' + fid);
      var stars = fObj ? '★'.repeat(fObj.rating || 1) : '';
      html += '<span class="profile-backyard-chip">' +
        '<img src="images/fish_' + fid + '.png" alt="" onerror="this.src=\'images/fish_icon.png\'">' +
        '<span>' + escapeHtml(fName) + '</span>' +
        '<span class="chip-stars">' + stars + '</span>' +
        '<button type="button" class="profile-backyard-chip-remove" onclick="window.fishaoApp.removeBackyardFish(' + fid + ')" title="' + escapeHtml(t('profile_chip_remove_title', 'Odebrat')) + '">&times;</button>' +
        '</span>';
    });
    container.innerHTML = html;
  }

  // Keep visual catalog checkmarks in sync if open
  if (isProfileBackyardCatalogOpen) {
    renderProfileBackyardCatalog();
  }
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

  var defaultFisher = t('user_default_fisher', 'Rybář');
  var dName = isMe
    ? ((userProfile && userProfile.displayName) ? userProfile.displayName : ((player && player.displayName) || defaultFisher))
    : ((player && player.displayName) || (clubMem && clubMem.displayName) || defaultFisher);

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
    nameEl.innerText = dName + (isMe ? (" (" + t('player_card_me_tag', 'Ty') + ")") : "");
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
        if (fObj) {
          backyardHtml += createRichBackyardFishCard(fObj, '', true);
        }
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
