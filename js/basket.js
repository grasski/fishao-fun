/**
 * FISHAO - Fish Basket ("Vybírátko ryb") & Custom Group Filters (js/basket.js)
 * ----------------------------------------------------------------------------
 * Personal fish basket (localStorage + Firestore private settings sync),
 * unlocked club fish filter in Fishdex/Market, and jumping from a player's
 * backyard pond into the Fishdex table with full filtering support.
 */

var _basketSyncTimer = null;

function persistBasketLocal() {
  try {
    safeStorageSet(BASKET_STORAGE_KEY, JSON.stringify(Array.from(basketFishIds)));
  } catch (e) { }
}

function scheduleBasketCloudSync() {
  persistBasketLocal();
  if (userProfile && currentUser) {
    userProfile.basketFishIds = Array.from(basketFishIds);
    if (typeof saveProfileToCache === 'function') {
      saveProfileToCache(currentUser.uid, userProfile, { basketFishIds: userProfile.basketFishIds });
    }
  }
  if (!currentUser || !db || typeof savePrivateUserSettings !== 'function') return;
  if (_basketSyncTimer) clearTimeout(_basketSyncTimer);
  _basketSyncTimer = setTimeout(function () {
    _basketSyncTimer = null;
    if (!currentUser || !db) return;
    savePrivateUserSettings({ basketFishIds: Array.from(basketFishIds) }).catch(function (err) {
      console.warn('Failed to sync fish basket to Firestore:', err);
    });
  }, 350);
}

function syncBasketFromProfile(privData) {
  if (!privData || !Array.isArray(privData.basketFishIds)) return;
  var nextSet = new Set();
  privData.basketFishIds.forEach(function (id) {
    var n = Number(id);
    if (isFinite(n) && fishById.has(n) && nextSet.size < BASKET_MAX_ITEMS) {
      nextSet.add(n);
    }
  });
  var changed = nextSet.size !== basketFishIds.size;
  if (!changed) {
    nextSet.forEach(function (id) {
      if (!basketFishIds.has(id)) changed = true;
    });
  }
  if (!changed) return;
  basketFishIds = nextSet;
  persistBasketLocal();
  updateBasketUI();
  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (filterOnlyBasket) {
      applyFilters();
    } else {
      syncAllVisibleBasketButtons();
    }
  }
  if (selectedModalFishId) {
    updateModalBasketBtn(selectedModalFishId);
  }
}

function getBasketBtnTitle(inBasket) {
  return inBasket ? t('basket_btn_remove_title') : t('basket_btn_add_title');
}

function renderBasketBtn(fishId) {
  var inBasket = basketFishIds.has(Number(fishId));
  var title = getBasketBtnTitle(inBasket);
  return '<button type="button" class="basket-btn' + (inBasket ? ' in-basket' : '') + '" data-basket-id="' + fishId + '" aria-pressed="' + (inBasket ? 'true' : 'false') + '" title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '">' +
    '<span aria-hidden="true">' + (inBasket ? '🧺' : '+') + '</span>' +
  '</button>';
}

function applyBasketBtnState(btn, fishId) {
  if (!btn) return;
  var inBasket = basketFishIds.has(Number(fishId));
  var title = getBasketBtnTitle(inBasket);
  btn.classList.toggle('in-basket', inBasket);
  btn.setAttribute('aria-pressed', inBasket ? 'true' : 'false');
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = '<span aria-hidden="true">' + (inBasket ? '🧺' : '+') + '</span>';
}

function updateBasketRowInPlace(fishId) {
  var fid = Number(fishId);
  var inBasket = basketFishIds.has(fid);
  var tbody = document.getElementById('tableBody');
  if (!tbody) return;
  var tr = tbody.querySelector('tr[data-fish-id="' + fid + '"]');
  if (tr) {
    tr.classList.toggle('row-in-basket', inBasket);
    applyBasketBtnState(tr.querySelector('.basket-btn[data-basket-id="' + fid + '"]'), fid);
  }
}

function syncAllVisibleBasketButtons() {
  var tbody = document.getElementById('tableBody');
  if (!tbody) return;
  var btns = tbody.querySelectorAll('.basket-btn[data-basket-id]');
  for (var i = 0; i < btns.length; i++) {
    var fid = Number(btns[i].dataset.basketId);
    applyBasketBtnState(btns[i], fid);
    var tr = btns[i].closest ? btns[i].closest('tr[data-fish-id]') : null;
    if (tr) tr.classList.toggle('row-in-basket', basketFishIds.has(fid));
  }
}

function updateModalBasketBtn(fid) {
  var btn = document.getElementById('modalBtnBasket');
  if (!btn) return;
  var inBasket = basketFishIds.has(Number(fid));
  btn.className = 'btn-basket-pill' + (inBasket ? ' in-basket' : '');
  btn.setAttribute('aria-pressed', inBasket ? 'true' : 'false');
  btn.textContent = inBasket ? t('modal_btn_basket_yes') : t('modal_btn_basket_no');
}

function updateBasketUI() {
  var count = basketFishIds.size;

  var btn = document.getElementById('btnOnlyBasket');
  if (btn) btn.classList.toggle('active', filterOnlyBasket);

  var clubBtn = document.getElementById('btnClubOnlyBasket');
  if (clubBtn) clubBtn.classList.toggle('active', filterOnlyBasket);

  ['basketCountBadge', 'clubBasketCountBadge'].forEach(function (id) {
    var badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });

  var clubUnlockedBtn = document.getElementById('btnOnlyClubUnlocked');
  if (clubUnlockedBtn) {
    var showClubUnlocked = !!(currentUser && currentClubId && currentView !== 'club');
    clubUnlockedBtn.style.display = showClubUnlocked ? '' : 'none';
    if (!showClubUnlocked && filterOnlyClubUnlocked) {
      filterOnlyClubUnlocked = false;
    }
    clubUnlockedBtn.classList.toggle('active', filterOnlyClubUnlocked);
  }

  renderFishSelectionBar();
}

function toggleBasketFish(fishId) {
  var fid = Number(fishId);
  if (!isFinite(fid) || !fishById.has(fid)) return false;

  var wasIn = basketFishIds.has(fid);
  if (wasIn) {
    basketFishIds.delete(fid);
  } else {
    if (basketFishIds.size >= BASKET_MAX_ITEMS) {
      showToast(t('basket_full_toast', { max: BASKET_MAX_ITEMS }), 'error');
      return false;
    }
    basketFishIds.add(fid);
  }

  scheduleBasketCloudSync();
  updateBasketUI();

  if (selectedModalFishId && Number(selectedModalFishId) === fid) {
    updateModalBasketBtn(fid);
  }

  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (filterOnlyBasket) {
      applyFilters();
    } else {
      updateBasketRowInPlace(fid);
      updateAddFilteredToBasketButton();
    }
  }
  return !wasIn;
}

function toggleBasketFromModal() {
  if (!selectedModalFishId) return;
  var added = toggleBasketFish(selectedModalFishId);
  var fObj = getFishById(selectedModalFishId);
  var fName = fObj ? (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(fObj) : fObj.name) : ('#' + selectedModalFishId);
  if (added) {
    showToast(t('basket_added_one_toast', { name: fName }), 'success');
  } else if (!basketFishIds.has(Number(selectedModalFishId))) {
    showToast(t('basket_removed_one_toast', { name: fName }), 'info');
  }
}

function addFishesToBasket(fishIds, sourceLabel) {
  if (!Array.isArray(fishIds) || fishIds.length === 0) return 0;
  var added = 0;
  var hitLimit = false;

  for (var i = 0; i < fishIds.length; i++) {
    var fid = Number(fishIds[i]);
    if (!isFinite(fid) || !fishById.has(fid)) continue;
    if (basketFishIds.has(fid)) continue;
    if (basketFishIds.size >= BASKET_MAX_ITEMS) {
      hitLimit = true;
      break;
    }
    basketFishIds.add(fid);
    added++;
  }

  if (added > 0) {
    scheduleBasketCloudSync();
    updateBasketUI();
    if (selectedModalFishId) updateModalBasketBtn(selectedModalFishId);
    if (typeof isTableViewActive === 'function' && isTableViewActive()) {
      if (filterOnlyBasket) {
        applyFilters();
      } else {
        syncAllVisibleBasketButtons();
        updateAddFilteredToBasketButton();
      }
    }
  }

  if (hitLimit) {
    showToast(t('basket_limit_reached_toast', { added: added, max: BASKET_MAX_ITEMS }), 'info');
  } else if (added === 0) {
    showToast(t('basket_already_in_toast'), 'info');
  } else if (sourceLabel) {
    showToast(t('basket_added_from_toast', { added: added, source: sourceLabel, total: basketFishIds.size }), 'success');
  } else {
    showToast(t('basket_added_many_toast', { added: added, total: basketFishIds.size }), 'success');
  }

  return added;
}

function clearFishBasket() {
  if (basketFishIds.size === 0) return;
  basketFishIds.clear();
  scheduleBasketCloudSync();
  updateBasketUI();
  if (selectedModalFishId) updateModalBasketBtn(selectedModalFishId);
  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (filterOnlyBasket) {
      applyFilters();
    } else {
      syncAllVisibleBasketButtons();
      updateAddFilteredToBasketButton();
    }
  }
  showToast(t('basket_cleared_toast'), 'info');
}

function toggleOnlyBasket(forceState) {
  var next = (typeof forceState === 'boolean') ? forceState : !filterOnlyBasket;
  filterOnlyBasket = next;
  if (filterOnlyBasket && activePlayerBackyardFilter) {
    activePlayerBackyardFilter = null;
  }
  updateBasketUI();
  applyFilters();
}

function toggleOnlyClubUnlocked(forceState) {
  if (!currentUser || !currentClubId) {
    showAuthNotice(t('auth_notice_club'));
    return;
  }
  var next = (typeof forceState === 'boolean') ? forceState : !filterOnlyClubUnlocked;
  filterOnlyClubUnlocked = next;
  updateBasketUI();
  applyFilters();
}

function getUnlockedClubFishIds() {
  if (!currentUser || !currentClubId || !Array.isArray(clubFishes)) return [];
  var ids = [];
  for (var i = 0; i < clubFishes.length; i++) {
    var f = clubFishes[i];
    if (typeof getUnlockStatus === 'function' && getUnlockStatus(f, currentClubPoints).isUnlocked) {
      ids.push(f.id);
    }
  }
  return ids;
}

function addOwnBackyardToBasket() {
  if (!currentUser || !backyardFishIds || backyardFishIds.size === 0) {
    showToast(t('basket_no_backyard_toast'), 'info');
    return;
  }
  addFishesToBasket(Array.from(backyardFishIds), t('filter_btn_only_backyard'));
}

function addUnlockedClubToBasket() {
  var ids = getUnlockedClubFishIds();
  if (!ids.length) {
    showToast(t('basket_no_club_toast'), 'info');
    return;
  }
  addFishesToBasket(ids, t('filter_btn_only_club_unlocked'));
}

function addFilteredFishesToBasket() {
  var list = (typeof _tableScrollState !== 'undefined' && Array.isArray(_tableScrollState.data))
    ? _tableScrollState.data
    : [];
  if (!list.length) return;
  var ids = list.map(function (f) { return f.id; });
  addFishesToBasket(ids, activePlayerBackyardFilter ? activePlayerBackyardFilter.displayName : '');
}

function getPlayerBackyardDataByUid(uid) {
  if (!uid) return null;
  var isMe = !!(currentUser && currentUser.uid === uid);
  var player = (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList))
    ? allPlayersList.find(function (p) { return p && p.uid === uid; })
    : null;
  if (!player && typeof _playerProfileCache !== 'undefined' && _playerProfileCache && _playerProfileCache.get) {
    var cached = _playerProfileCache.get(uid);
    if (cached && cached.player) player = cached.player;
  }
  var displayName = isMe
    ? ((userProfile && userProfile.displayName) || t('user_default_player'))
    : ((player && player.displayName) || t('user_default_player'));
  var rawIds = isMe
    ? Array.from(backyardFishIds)
    : ((player && Array.isArray(player.backyardFishIds)) ? player.backyardFishIds : []);
  var validIds = rawIds.filter(function (id) {
    return typeof isBackyardBreedable === 'function' ? isBackyardBreedable(id) : true;
  }).map(Number);

  return {
    uid: uid,
    displayName: displayName,
    fishIds: validIds
  };
}

function openPlayerBackyardInFishdex(uid, onlyMissing) {
  var info = getPlayerBackyardDataByUid(uid);
  if (!info || !info.fishIds.length) {
    showToast(t('player_modal_backyard_empty'), 'info');
    return;
  }

  if (typeof closePlayerModal === 'function') closePlayerModal();
  if (typeof closeAllModals === 'function') closeAllModals();

  if (typeof switchView === 'function') {
    switchView('all');
  }

  activePlayerBackyardFilter = {
    uid: info.uid,
    displayName: info.displayName,
    fishIds: new Set(info.fishIds)
  };
  filterOnlyBasket = false;

  if (onlyMissing && currentUser) {
    collectionFilterMode = 'missing';
    var collAll = document.getElementById('collFilterAll');
    var collCaught = document.getElementById('collFilterCaught');
    var collMissing = document.getElementById('collFilterMissing');
    var collMissingShiny = document.getElementById('collFilterMissingShiny');
    if (collAll) collAll.classList.remove('active');
    if (collCaught) collCaught.classList.remove('active');
    if (collMissing) collMissing.classList.add('active');
    if (collMissingShiny) collMissingShiny.classList.remove('active');
  }

  updateBasketUI();
  applyFilters();

  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { }
}

function addPlayerBackyardToBasket(uid) {
  var info = getPlayerBackyardDataByUid(uid);
  if (!info || !info.fishIds.length) {
    showToast(t('player_modal_backyard_empty'), 'info');
    return;
  }
  addFishesToBasket(info.fishIds, info.displayName);
}

function clearPlayerBackyardFilter() {
  if (!activePlayerBackyardFilter) return;
  activePlayerBackyardFilter = null;
  updateBasketUI();
  applyFilters();
}

function togglePlayerBackyardMissingQuick() {
  if (!currentUser) {
    showAuthNotice(t('coll_gate_title'));
    return;
  }
  var nextMode = (collectionFilterMode === 'missing') ? 'all' : 'missing';
  var targetBtn = document.getElementById(nextMode === 'missing' ? 'collFilterMissing' : 'collFilterAll');
  if (typeof setCollectionFilter === 'function') {
    setCollectionFilter(nextMode, targetBtn);
  } else {
    collectionFilterMode = nextMode;
    applyFilters();
  }
  renderFishSelectionBar();
}

function renderFishSelectionBar() {
  if (typeof document === 'undefined') return;
  var bar = document.getElementById('fishSelectionBar');
  if (!bar) return;

  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');

  if (!isTable || (!filterOnlyBasket && !activePlayerBackyardFilter)) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  if (activePlayerBackyardFilter) {
    var pf = activePlayerBackyardFilter;
    var pTotal = pf.fishIds.size;
    var missingActive = collectionFilterMode === 'missing';
    var missingBtnHtml = currentUser
      ? '<button type="button" class="pill-btn' + (missingActive ? ' active' : '') + '" onclick="window.fishaoApp.togglePlayerBackyardMissingQuick()">' +
          escapeHtml(t('coll_filter_missing')) +
        '</button>'
      : '';

    bar.className = 'fish-selection-bar is-player-backyard';
    bar.style.display = 'flex';
    bar.innerHTML =
      '<div class="fsb-left">' +
        '<span class="fsb-icon" aria-hidden="true">🏡</span>' +
        '<div class="fsb-text">' +
          '<strong class="fsb-title">' + escapeHtml(t('player_backyard_filter_title', { name: pf.displayName, count: pTotal })) + '</strong>' +
          '<span class="fsb-hint">' + escapeHtml(t('player_backyard_filter_hint')) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="fsb-actions">' +
        missingBtnHtml +
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.addFilteredFishesToBasket()">' +
          escapeHtml(t('basket_add_shown_btn')) +
        '</button>' +
        '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.clearPlayerBackyardFilter()">' +
          escapeHtml(t('selection_bar_close_btn')) +
        '</button>' +
      '</div>';
    return;
  }

  // Basket mode
  var bCount = basketFishIds.size;
  var ownBackyardBtn = (currentUser && backyardFishIds && backyardFishIds.size > 0)
    ? '<button type="button" class="pill-btn" onclick="window.fishaoApp.addOwnBackyardToBasket()">' +
        escapeHtml(t('basket_quick_add_backyard')) +
      '</button>'
    : '';
  var ownClubBtn = (currentUser && currentClubId)
    ? '<button type="button" class="pill-btn" onclick="window.fishaoApp.addUnlockedClubToBasket()">' +
        escapeHtml(t('basket_quick_add_club')) +
      '</button>'
    : '';
  var clearBtn = bCount > 0
    ? '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.clearFishBasket()">' +
        escapeHtml(t('basket_clear_btn')) +
      '</button>'
    : '';

  bar.className = 'fish-selection-bar is-basket';
  bar.style.display = 'flex';
  bar.innerHTML =
    '<div class="fsb-left">' +
      '<span class="fsb-icon" aria-hidden="true">🧺</span>' +
      '<div class="fsb-text">' +
        '<strong class="fsb-title">' + escapeHtml(t('basket_bar_title', { count: bCount })) + '</strong>' +
        '<span class="fsb-hint">' + escapeHtml(bCount > 0 ? t('basket_bar_hint') : t('basket_bar_empty_hint')) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="fsb-actions">' +
      ownBackyardBtn +
      ownClubBtn +
      clearBtn +
      '<button type="button" class="pill-btn" onclick="window.fishaoApp.toggleOnlyBasket(false)">' +
        escapeHtml(t('selection_bar_close_btn')) +
      '</button>' +
    '</div>';
}

function updateAddFilteredToBasketButton() {
  if (typeof document === 'undefined') return;
  var btn = document.getElementById('btnAddFilteredToBasket');
  if (!btn) return;

  var list = (typeof _tableScrollState !== 'undefined' && Array.isArray(_tableScrollState.data))
    ? _tableScrollState.data
    : [];
  var total = currentView === 'club' ? clubFishes.length : allFishes.length;
  var isFiltered = list.length > 0 && list.length < total && list.length <= BASKET_MAX_ITEMS;

  if (!isFiltered || filterOnlyBasket) {
    btn.style.display = 'none';
    return;
  }

  var notInBasketCount = 0;
  for (var i = 0; i < list.length; i++) {
    if (!basketFishIds.has(Number(list[i].id))) notInBasketCount++;
  }

  if (notInBasketCount === 0) {
    btn.style.display = 'none';
    return;
  }

  btn.textContent = t('basket_add_filtered_btn', { count: notInBasketCount });
  btn.style.display = 'inline-flex';
}
