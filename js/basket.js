/**
 * FISHAO - Fish Basket ("Vybírátko ryb") Modal, Quick-Pick Mode & Custom Group Filters (js/basket.js)
 * ---------------------------------------------------------------------------------------------------
 * Spacious Basket Modal opened from the floating basket button, quick-pick table
 * selection mode (no extra table column), localStorage + Firestore private settings
 * sync, unlocked club fish filter, and jumping from any player's backyard pond into Fishdex.
 */

var _basketSyncTimer = null;
var basketPickMode = false;
var _basketModalState = {
  onlyNow: false,
  onlyMissing: false,
  onlyMissingShiny: false,
  sortBy: 'name_asc' // 'name_asc' | 'chance_desc' | 'price_desc' | 'rating_desc'
};

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
  refreshOpenBasketModal();
  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (filterOnlyBasket) {
      applyFilters();
    } else {
      syncAllVisibleBasketRows();
    }
  }
  if (selectedModalFishId) {
    updateModalBasketBtn(selectedModalFishId);
  }
}

function updateBasketRowInPlace(fishId) {
  var fid = Number(fishId);
  var inBasket = basketFishIds.has(fid);
  var tbody = document.getElementById('tableBody');
  if (!tbody) return;
  var tr = tbody.querySelector('tr[data-fish-id="' + fid + '"]');
  if (!tr) return;
  tr.classList.toggle('row-in-basket', inBasket);
  var nameLine = tr.querySelector('.fish-name-cell-line');
  if (nameLine) {
    var existingTag = nameLine.querySelector('.badge-basket-tag');
    if (inBasket && !existingTag) {
      var tag = document.createElement('span');
      tag.className = 'badge-basket-tag';
      tag.title = t('modal_btn_basket_yes');
      tag.textContent = '🪣';
      nameLine.appendChild(tag);
    } else if (!inBasket && existingTag) {
      existingTag.remove();
    }
  }
}

function syncAllVisibleBasketRows() {
  var tbody = document.getElementById('tableBody');
  if (!tbody) return;
  var rows = tbody.querySelectorAll('tr[data-fish-id]');
  for (var i = 0; i < rows.length; i++) {
    updateBasketRowInPlace(Number(rows[i].dataset.fishId));
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

function updateBasketFab() {
  if (typeof document === 'undefined') return;
  var fab = document.getElementById('basketFab');
  if (!fab) return;

  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  var isModalOpen = !!(document.body && document.body.classList.contains('modal-open'));
  var count = basketFishIds.size;

  if (isModalOpen || (!isTable && count === 0)) {
    fab.style.display = 'none';
    return;
  }

  var isPick = !!(isTable && basketPickMode);
  var isHighlight = (isTable && (filterOnlyBasket || basketPickMode));
  fab.classList.toggle('active', isHighlight);
  fab.classList.toggle('is-pick-mode', isPick);
  fab.setAttribute('aria-pressed', isHighlight ? 'true' : 'false');
  var fabTitle = isPick
    ? t('basket_pick_bar_title', { count: count })
    : ((isTable && filterOnlyBasket) ? t('selection_bar_close_btn') : t('filter_btn_basket_title'));
  fab.title = fabTitle;
  fab.setAttribute('aria-label', fabTitle);
  fab.style.display = 'inline-flex';

  var badge = document.getElementById('basketFabBadge');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  var editBadge = document.getElementById('basketFabEditBadge');
  if (editBadge) {
    editBadge.style.display = isPick ? 'inline-flex' : 'none';
  }
}

function onBasketFabClick() {
  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  if (isTable && filterOnlyBasket) {
    toggleOnlyBasket(false);
    return;
  }
  if (basketPickMode) {
    setBasketPickMode(false);
  }
  openBasketModal();
}

function updateBasketUI() {
  var secTable = document.getElementById('sectionFishTable');
  if (secTable) {
    secTable.classList.toggle('basket-pick-mode', !!basketPickMode);
  }

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
  if (typeof updateScrollTopButton === 'function') {
    updateScrollTopButton();
  } else {
    updateBasketFab();
  }
}

function setBasketPickMode(active) {
  var next = !!active;
  if (basketPickMode === next) return;
  basketPickMode = next;
  updateBasketUI();
}

function startBasketTablePickMode() {
  closeBasketModal();
  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  if (!isTable && typeof switchView === 'function') {
    switchView('all');
  }
  if (filterOnlyBasket) {
    filterOnlyBasket = false;
    applyFilters();
  }
  basketPickMode = true;
  updateBasketUI();
  var bar = document.getElementById('fishSelectionBar');
  if (bar && typeof bar.scrollIntoView === 'function') {
    try { bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { }
  }
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

  refreshOpenBasketModal();

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
    refreshOpenBasketModal();
    if (selectedModalFishId) updateModalBasketBtn(selectedModalFishId);
    if (typeof isTableViewActive === 'function' && isTableViewActive()) {
      if (filterOnlyBasket) {
        applyFilters();
      } else {
        syncAllVisibleBasketRows();
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

function removeCaughtFromBasket() {
  if (!currentUser || !caughtFishIds || basketFishIds.size === 0) return;
  var removed = 0;
  Array.from(basketFishIds).forEach(function (fid) {
    if (caughtFishIds.has(fid)) {
      basketFishIds.delete(fid);
      removed++;
    }
  });
  if (removed === 0) return;
  scheduleBasketCloudSync();
  updateBasketUI();
  refreshOpenBasketModal();
  if (selectedModalFishId) updateModalBasketBtn(selectedModalFishId);
  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (filterOnlyBasket) {
      applyFilters();
    } else {
      syncAllVisibleBasketRows();
      updateAddFilteredToBasketButton();
    }
  }
  showToast(t('basket_removed_caught_toast', { count: removed }), 'info');
}

function clearFishBasket() {
  var hadItems = basketFishIds.size > 0;
  var wasBasketFilter = !!filterOnlyBasket;
  var wasPickMode = !!basketPickMode;
  if (!hadItems && !wasBasketFilter && !wasPickMode) return;
  basketFishIds.clear();
  filterOnlyBasket = false;
  basketPickMode = false;
  scheduleBasketCloudSync();
  updateBasketUI();
  refreshOpenBasketModal();
  if (selectedModalFishId) updateModalBasketBtn(selectedModalFishId);
  if (typeof isTableViewActive === 'function' && isTableViewActive()) {
    if (wasBasketFilter) {
      applyFilters();
    } else {
      syncAllVisibleBasketRows();
      updateAddFilteredToBasketButton();
    }
  }
  if (hadItems) {
    showToast(t('basket_cleared_toast'), 'info');
  }
}

function toggleOnlyBasket(forceState) {
  var next = (typeof forceState === 'boolean') ? forceState : !filterOnlyBasket;
  filterOnlyBasket = next;
  if (filterOnlyBasket) {
    activePlayerBackyardFilter = null;
    basketPickMode = false;
  }
  updateBasketUI();
  applyFilters();
}

function openBasketInMainTable() {
  closeBasketModal();
  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  if (!isTable && typeof switchView === 'function') {
    switchView('all');
  }
  filterOnlyBasket = true;
  activePlayerBackyardFilter = null;
  basketPickMode = false;
  updateBasketUI();
  applyFilters();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { }
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
  basketPickMode = false;

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

  if (!isTable || (!basketPickMode && !filterOnlyBasket && !activePlayerBackyardFilter)) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  // Variant B: Table Quick-Pick Mode
  if (basketPickMode) {
    var pickCount = basketFishIds.size;
    bar.className = 'fish-selection-bar is-pick-mode';
    bar.style.display = 'flex';
    bar.innerHTML =
      '<div class="fsb-left">' +
        '<span class="fsb-icon" aria-hidden="true">✏️</span>' +
        '<div class="fsb-text">' +
          '<strong class="fsb-title">' + escapeHtml(t('basket_pick_bar_title', { count: pickCount })) + '</strong>' +
          '<span class="fsb-hint">' + escapeHtml(t('basket_pick_bar_hint')) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="fsb-actions">' +
        '<button type="button" class="pill-btn primary active" onclick="window.fishaoApp.openBasketModal()">' +
          escapeHtml(t('basket_pick_open_modal_btn', { count: pickCount })) +
        '</button>' +
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.setBasketPickMode(false)">' +
          escapeHtml(t('basket_pick_done_btn')) +
        '</button>' +
      '</div>';
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

  // Basket table-filter mode
  var bCount = basketFishIds.size;
  var clearBtn = bCount > 0
    ? '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.clearFishBasket()">' +
        escapeHtml(t('basket_clear_btn')) +
      '</button>'
    : '';

  bar.className = 'fish-selection-bar is-basket';
  bar.style.display = 'flex';
  bar.innerHTML =
    '<div class="fsb-left">' +
      '<span class="fsb-icon" aria-hidden="true">🪣</span>' +
      '<div class="fsb-text">' +
        '<strong class="fsb-title">' + escapeHtml(t('basket_bar_title', { count: bCount })) + '</strong>' +
        '<span class="fsb-hint">' + escapeHtml(bCount > 0 ? t('basket_bar_hint') : t('basket_bar_empty_hint')) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="fsb-actions">' +
      '<button type="button" class="pill-btn primary" onclick="window.fishaoApp.openBasketModal()">' +
        escapeHtml(t('basket_manage_modal_btn')) +
      '</button>' +
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

/* ===================================================================
   LARGE BASKET MODAL ("Košík ryb")
   =================================================================== */

function ensureBasketModalOverlay() {
  var overlay = document.getElementById('basketModalOverlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'basketModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'basketModalTitleText');
  overlay.onclick = function (e) {
    if (e.target === overlay) closeBasketModal();
  };

  overlay.innerHTML =
    '<div class="modal-box basket-modal-box" id="basketModalBox">' +
      '<div class="modal-header">' +
        '<div class="modal-title basket-modal-title-group">' +
          '<span id="basketModalTitleText"></span>' +
          '<span id="basketModalCountChip" class="basket-modal-count-chip">0</span>' +
        '</div>' +
        '<button type="button" class="modal-close" aria-label="Close" onclick="window.fishaoApp.closeBasketModal()">&times;</button>' +
      '</div>' +
      '<div class="modal-body basket-modal-body">' +
        '<div class="basket-modal-add-panel">' +
          '<div class="basket-search-wrap">' +
            '<input type="text" id="basketSearchInput" class="filter-control basket-search-input" autocomplete="off" ' +
              'oninput="window.fishaoApp.onBasketModalSearchInput(this.value)" ' +
              'onfocus="window.fishaoApp.onBasketModalSearchInput(this.value)">' +
            '<div id="basketSearchSuggestions" class="basket-search-suggestions" style="display:none;"></div>' +
          '</div>' +
          '<div class="basket-quick-sources" id="basketModalQuickSources"></div>' +
        '</div>' +
        '<div class="basket-modal-toolbar" id="basketModalToolbar" style="display:none;"></div>' +
        '<div class="basket-modal-list" id="basketModalList"></div>' +
      '</div>' +
      '<div class="modal-footer basket-modal-footer" id="basketModalFooter"></div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Close autocomplete dropdown when clicking outside it inside the modal
  overlay.addEventListener('click', function (ev) {
    var drop = document.getElementById('basketSearchSuggestions');
    var inp = document.getElementById('basketSearchInput');
    if (drop && drop.style.display !== 'none' && !drop.contains(ev.target) && ev.target !== inp) {
      drop.style.display = 'none';
    }
  });

  // Delegated click handler on the basket list (caught toggle, remove, open fish detail)
  var listEl = document.getElementById('basketModalList');
  if (listEl) {
    listEl.addEventListener('click', function (ev) {
      var catchBtn = ev.target && ev.target.closest ? ev.target.closest('.caught-btn[data-catch-id]') : null;
      if (catchBtn) {
        ev.stopPropagation();
        if (typeof cycleCaughtState === 'function') {
          cycleCaughtState(Number(catchBtn.dataset.catchId));
        }
        return;
      }
      var remBtn = ev.target && ev.target.closest ? ev.target.closest('.bm-remove-btn[data-remove-id]') : null;
      if (remBtn) {
        ev.stopPropagation();
        toggleBasketFish(Number(remBtn.dataset.removeId));
        return;
      }
      var itemEl = ev.target && ev.target.closest ? ev.target.closest('.bm-fish-row[data-fish-id]') : null;
      if (itemEl) {
        openPriceModal(Number(itemEl.dataset.fishId));
      }
    });
  }

  return overlay;
}

function openBasketModal() {
  if (typeof document === 'undefined') return;
  if (basketPickMode) {
    setBasketPickMode(false);
  }
  var overlay = ensureBasketModalOverlay();
  var searchInp = document.getElementById('basketSearchInput');
  if (searchInp) searchInp.value = '';
  var drop = document.getElementById('basketSearchSuggestions');
  if (drop) drop.style.display = 'none';

  renderBasketModalContent();
  overlay.classList.add('active');
  if (typeof window !== 'undefined' && typeof window.syncModalBodyLock === 'function') {
    window.syncModalBodyLock();
  } else {
    if (document.documentElement) document.documentElement.classList.add('modal-open');
    if (document.body) document.body.classList.add('modal-open');
    if (typeof updateScrollTopButton === 'function') updateScrollTopButton();
  }
}

function closeBasketModal() {
  var overlay = document.getElementById('basketModalOverlay');
  if (overlay) overlay.classList.remove('active');
  var drop = document.getElementById('basketSearchSuggestions');
  if (drop) drop.style.display = 'none';
  if (typeof window !== 'undefined' && typeof window.syncModalBodyLock === 'function') {
    window.syncModalBodyLock();
  } else {
    if (!document.querySelector('.modal-overlay.active')) {
      if (document.documentElement) document.documentElement.classList.remove('modal-open');
      if (document.body) document.body.classList.remove('modal-open');
    }
    if (typeof updateScrollTopButton === 'function') updateScrollTopButton();
  }
}

function refreshOpenBasketModal() {
  if (typeof document === 'undefined') return;
  var overlay = document.getElementById('basketModalOverlay');
  if (!overlay || !overlay.classList.contains('active')) return;
  renderBasketModalContent();
}

function toggleBasketModalFilter(key) {
  if ((key === 'onlyMissing' || key === 'onlyMissingShiny') && !currentUser) {
    showAuthNotice(t('coll_gate_title'));
    return;
  }
  if (key === 'onlyNow') _basketModalState.onlyNow = !_basketModalState.onlyNow;
  else if (key === 'onlyMissing') {
    _basketModalState.onlyMissing = !_basketModalState.onlyMissing;
    if (_basketModalState.onlyMissing) _basketModalState.onlyMissingShiny = false;
  } else if (key === 'onlyMissingShiny') {
    _basketModalState.onlyMissingShiny = !_basketModalState.onlyMissingShiny;
    if (_basketModalState.onlyMissingShiny) _basketModalState.onlyMissing = false;
  }
  renderBasketModalContent();
}

function onBasketModalSortChange(val) {
  _basketModalState.sortBy = val || 'name_asc';
  renderBasketModalContent();
}

function onBasketModalSearchInput(rawQuery) {
  var drop = document.getElementById('basketSearchSuggestions');
  if (!drop) return;
  var q = String(rawQuery || '').trim();
  if (!q) {
    drop.style.display = 'none';
    return;
  }

  var matches = [];
  for (var i = 0; i < allFishes.length; i++) {
    var f = allFishes[i];
    var isMatch = (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function')
      ? window.FISHAO_I18N.matchesFishSearch(f, q)
      : (normStr(f.name).indexOf(normStr(q)) !== -1);
    if (isMatch) {
      matches.push(f);
      if (matches.length >= 14) break;
    }
  }

  if (!matches.length) {
    drop.innerHTML = '<div class="ts-sugg-empty">' + escapeHtml(t('bulk_no_fish_found')) + '</div>';
    drop.style.display = 'block';
    return;
  }

  drop.innerHTML = matches.map(function (f) {
    var dispName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    var inB = basketFishIds.has(Number(f.id));
    return '<button type="button" class="ts-sugg-item' + (inB ? ' is-in-basket' : '') + '" ' +
      'onclick="window.fishaoApp.selectBasketSearchFish(' + f.id + ')">' +
      '<img src="/images/fish_' + f.id + '.webp" alt="" class="ts-sugg-img" loading="lazy">' +
      '<span class="ts-sugg-name">' + escapeHtml(dispName) + '</span>' +
      '<span class="ts-sugg-meta">' + (f.rating || 1) + '★ · ' + (inB ? '✓' : '+') + '</span>' +
    '</button>';
  }).join('');
  drop.style.display = 'block';
}

function selectBasketSearchFish(fishId) {
  toggleBasketFish(fishId);
  var inp = document.getElementById('basketSearchInput');
  if (inp && inp.value.trim()) {
    onBasketModalSearchInput(inp.value);
  }
}

function getFilteredTableNotInBasketIds() {
  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  if (!isTable || filterOnlyBasket) return [];
  var list = (typeof _tableScrollState !== 'undefined' && Array.isArray(_tableScrollState.data))
    ? _tableScrollState.data
    : [];
  var total = currentView === 'club' ? clubFishes.length : allFishes.length;
  if (!list.length || list.length >= total || list.length > BASKET_MAX_ITEMS) return [];
  return list.filter(function (f) { return !basketFishIds.has(Number(f.id)); }).map(function (f) { return f.id; });
}

function renderBasketModalContent() {
  var titleEl = document.getElementById('basketModalTitleText');
  if (titleEl) titleEl.textContent = '🪣 ' + t('basket_modal_title');

  var countChip = document.getElementById('basketModalCountChip');
  if (countChip) countChip.textContent = basketFishIds.size + ' / ' + BASKET_MAX_ITEMS;

  var searchInp = document.getElementById('basketSearchInput');
  if (searchInp) searchInp.placeholder = t('basket_modal_search_ph');

  // Quick source buttons
  var sourcesEl = document.getElementById('basketModalQuickSources');
  if (sourcesEl) {
    var srcBtns = [];
    srcBtns.push(
      '<button type="button" class="pill-btn primary" onclick="window.fishaoApp.startBasketTablePickMode()">' +
        escapeHtml(t('basket_pick_start_btn')) +
      '</button>'
    );
    var filteredToAdd = getFilteredTableNotInBasketIds();
    if (filteredToAdd.length > 0) {
      srcBtns.push(
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.addFilteredFishesToBasket()">' +
          escapeHtml(t('basket_add_filtered_btn', { count: filteredToAdd.length })) +
        '</button>'
      );
    }
    if (currentUser && backyardFishIds && backyardFishIds.size > 0) {
      srcBtns.push(
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.addOwnBackyardToBasket()">' +
          escapeHtml(t('basket_quick_add_backyard')) +
        '</button>'
      );
    }
    if (currentUser && currentClubId) {
      srcBtns.push(
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.addUnlockedClubToBasket()">' +
          escapeHtml(t('basket_quick_add_club')) +
        '</button>'
      );
    }
    sourcesEl.innerHTML = srcBtns.join('');
  }

  var nowCtx = (typeof createTimeNowContext === 'function') ? createTimeNowContext() : null;
  var basketFishes = [];
  basketFishIds.forEach(function (fid) {
    var f = getFishById(fid);
    if (f) basketFishes.push(f);
  });

  var nowCount = 0;
  var missingCount = 0;
  var caughtInBasketCount = 0;
  var activeNowMap = new Map();
  for (var i = 0; i < basketFishes.length; i++) {
    var bf = basketFishes[i];
    var isNow = (typeof isFishActiveNow === 'function') ? isFishActiveNow(bf.raw_times, bf.raw_dates, nowCtx) : false;
    activeNowMap.set(bf.id, isNow);
    if (isNow) nowCount++;
    if (currentUser) {
      if (caughtFishIds.has(bf.id)) caughtInBasketCount++;
      else missingCount++;
    }
  }

  // Toolbar (filters + sort inside modal)
  var toolbarEl = document.getElementById('basketModalToolbar');
  if (toolbarEl) {
    if (basketFishes.length === 0) {
      toolbarEl.style.display = 'none';
      toolbarEl.innerHTML = '';
    } else {
      toolbarEl.style.display = 'flex';
      var sortOpts = [
        { val: 'name_asc', lbl: t('opt_sort_name_asc') },
        { val: 'chance_desc', lbl: t('opt_sort_chance_desc') },
        { val: 'price_desc', lbl: t('opt_sort_price_desc') },
        { val: 'rating_desc', lbl: t('opt_sort_rating_desc') }
      ];
      toolbarEl.innerHTML =
        '<div class="bm-filter-pills">' +
          '<button type="button" class="pill-btn bm-mini-pill' + (_basketModalState.onlyNow ? ' active' : '') + '" onclick="window.fishaoApp.toggleBasketModalFilter(\'onlyNow\')">' +
            '⚡ ' + escapeHtml(t('basket_filter_now_count', { count: nowCount })) +
          '</button>' +
          (currentUser
            ? '<button type="button" class="pill-btn bm-mini-pill' + (_basketModalState.onlyMissing ? ' active' : '') + '" onclick="window.fishaoApp.toggleBasketModalFilter(\'onlyMissing\')">' +
                '❓ ' + escapeHtml(t('basket_filter_missing_count', { count: missingCount })) +
              '</button>' +
              '<button type="button" class="pill-btn bm-mini-pill' + (_basketModalState.onlyMissingShiny ? ' active' : '') + '" onclick="window.fishaoApp.toggleBasketModalFilter(\'onlyMissingShiny\')">' +
                escapeHtml(t('filter_btn_missing_shiny')) +
              '</button>'
            : '') +
        '</div>' +
        '<select class="filter-control bm-sort-select" aria-label="' + escapeHtml(t('filter_sort_label')) + '" onchange="window.fishaoApp.onBasketModalSortChange(this.value)">' +
          sortOpts.map(function (o) {
            return '<option value="' + o.val + '"' + (_basketModalState.sortBy === o.val ? ' selected' : '') + '>' + escapeHtml(o.lbl) + '</option>';
          }).join('') +
        '</select>';
    }
  }

  // Filter & sort basket fishes
  var shown = basketFishes.filter(function (f) {
    if (_basketModalState.onlyNow && !activeNowMap.get(f.id)) return false;
    if (currentUser && _basketModalState.onlyMissing && caughtFishIds.has(f.id)) return false;
    if (currentUser && _basketModalState.onlyMissingShiny && shinyFishIds.has(f.id)) return false;
    return true;
  });

  var curLang = getLang();
  var sortMode = _basketModalState.sortBy || 'name_asc';
  if (sortMode === 'chance_desc') {
    var cMap = new Map();
    var getTopChance = function (f) {
      if (cMap.has(f.id)) return cMap.get(f.id);
      var rec = (typeof computeFishBaitRecommendations === 'function')
        ? computeFishBaitRecommendations(f, { timeMode: _basketModalState.onlyNow ? 'now' : 'overlap', nowCtx: nowCtx })
        : null;
      var val = (rec && rec.spots && rec.spots[0] && rec.spots[0].bestBait) ? rec.spots[0].bestBait.chancePct : 0;
      cMap.set(f.id, val);
      return val;
    };
    shown.sort(function (a, b) {
      return (getTopChance(b) - getTopChance(a)) || (b.rating - a.rating);
    });
  } else if (sortMode === 'price_desc') {
    shown.sort(function (a, b) {
      var pa = (typeof getMaxPrice === 'function' && getMaxPrice(a.id)) ? getMaxPrice(a.id).price : 0;
      var pb = (typeof getMaxPrice === 'function' && getMaxPrice(b.id)) ? getMaxPrice(b.id).price : 0;
      return (pb - pa) || (b.rating - a.rating);
    });
  } else if (sortMode === 'rating_desc') {
    shown.sort(function (a, b) {
      return (b.rating - a.rating) || (b.avg_l - a.avg_l);
    });
  } else {
    shown.sort(function (a, b) {
      var na = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
      var nb = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
      return na.localeCompare(nb, curLang);
    });
  }

  // Render list
  var listEl = document.getElementById('basketModalList');
  if (listEl) {
    if (basketFishes.length === 0) {
      listEl.innerHTML =
        '<div class="bm-empty-state">' +
          '<div class="bm-empty-icon" aria-hidden="true">🪣</div>' +
          '<div class="bm-empty-title">' + escapeHtml(t('basket_modal_empty_title')) + '</div>' +
          '<p class="bm-empty-desc">' + escapeHtml(t('basket_modal_empty_desc')) + '</p>' +
        '</div>';
    } else if (shown.length === 0) {
      listEl.innerHTML =
        '<div class="bm-empty-state">' +
          '<div class="bm-empty-desc">' + escapeHtml(t('table_empty_state')) + '</div>' +
        '</div>';
    } else {
      var priceCtx = {
        locale: getLocale(),
        todayISO: (typeof getTodayISO === 'function') ? getTodayISO() : '',
        highPct: (typeof getTodayHighPricePct === 'function') ? getTodayHighPricePct() : 90
      };
      var baitCtx = {
        locFilter: '',
        areaFilter: '',
        timeMode: _basketModalState.onlyNow ? 'now' : 'overlap',
        hideLocked: false,
        nowCtx: nowCtx
      };
      var activeNowLbl = t('time_active_now_short');
      var clubTagText = t('badge_club_fish');
      var removeTitle = escapeHtml(t('basket_btn_remove_title'));

      listEl.innerHTML = shown.map(function (f) {
        var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
        var catchState = (typeof getFishCatchState === 'function') ? getFishCatchState(f.id) : 'none';
        var isNow = !!activeNowMap.get(f.id);
        var timeInfo = formatCatchTime(f.raw_times);
        var dateInfo = formatCatchDate(f.raw_dates);
        var locLabels = getFishLocationLabels(f);
        var areaLabels = getFishAreaLabels(f);
        var locHtml = locLabels.map(function (l) { return '<span class="loc-tag">' + escapeHtml(l) + '</span>'; }).join('') +
          areaLabels.map(function (a) { return '<span class="loc-area-chip">📍 ' + escapeHtml(a) + '</span>'; }).join('');
        var baitsHtml = (typeof renderFishBaitsCell === 'function')
          ? renderFishBaitsCell(f, baitCtx)
          : (f.baits || []).map(function (b) { return renderBaitTag(b); }).join('');
        var seasonHtml = dateInfo.isSeasonal
          ? '<span class="date-badge ' + (dateInfo.inSeason ? 'in-season' : 'out-of-season') + '">📅 ' + dateInfo.text + '</span>'
          : '';
        var rowStateCls = catchState === 'shiny' ? ' is-shiny' : (catchState === 'caught' ? ' is-caught' : '');

        return '<div class="bm-fish-row' + rowStateCls + (isNow ? ' is-biting' : '') + '" data-fish-id="' + f.id + '">' +
          '<div class="bm-col-catch">' + renderCaughtBtn(f.id) + '</div>' +
          '<div class="bm-col-img"><img src="/images/fish_' + f.id + '.webp" alt="' + escapeHtml(fName) + '" class="fish-img" loading="lazy" decoding="async" onerror="this.style.display=\'none\';"></div>' +
          '<div class="bm-col-main">' +
            '<div class="bm-main-top">' +
              '<span class="bm-fish-name">' + escapeHtml(fName) + '</span>' +
              (f.is_club ? '<span class="badge-club-tag">' + clubTagText + '</span>' : '') +
              renderRatingBadge(f.rating) +
              (isNow ? '<span class="time-now-active">' + activeNowLbl + '</span>' : '') +
            '</div>' +
            '<div class="bm-main-meta">' +
              '<div class="bm-locs">' + locHtml + '</div>' +
              '<div class="bm-baits">' + baitsHtml + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="bm-col-right">' +
            '<div class="bm-time-box">' +
              '<span class="time-badge' + (f.is_night ? ' time-night' : '') + '">' + (f.is_night ? '🌙 ' : '☀️ ') + escapeHtml(timeInfo.primary) + '</span>' +
              seasonHtml +
            '</div>' +
            '<div class="bm-price-size">' +
              renderPriceCell(f.id, priceCtx) +
              '<span class="bm-size-text">' + f.min_l + ' / <strong>' + f.avg_l + ' cm</strong> / ' + f.max_l + ' cm</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="bm-remove-btn" data-remove-id="' + f.id + '" title="' + removeTitle + '" aria-label="' + removeTitle + '">&times;</button>' +
        '</div>';
      }).join('');
    }
  }

  // Footer
  var footerEl = document.getElementById('basketModalFooter');
  if (footerEl) {
    var leftBtns = [];
    if (currentUser && caughtInBasketCount > 0) {
      leftBtns.push(
        '<button type="button" class="pill-btn" onclick="window.fishaoApp.removeCaughtFromBasket()">' +
          escapeHtml(t('basket_remove_caught_btn', { count: caughtInBasketCount })) +
        '</button>'
      );
    }
    if (basketFishes.length > 0) {
      leftBtns.push(
        '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.clearFishBasket()">' +
          escapeHtml(t('basket_clear_btn')) +
        '</button>'
      );
    }

    var rightBtns = [];
    if (basketFishes.length > 0) {
      rightBtns.push(
        '<button type="button" class="pill-btn primary" onclick="window.fishaoApp.openBasketInMainTable()">' +
          escapeHtml(t('basket_open_in_table_btn')) +
        '</button>'
      );
    }
    rightBtns.push(
      '<button type="button" class="pill-btn" onclick="window.fishaoApp.closeBasketModal()">' +
        escapeHtml(t('action_close')) +
      '</button>'
    );

    footerEl.innerHTML =
      '<div class="bm-footer-left">' + leftBtns.join('') + '</div>' +
      '<div class="bm-footer-right">' + rightBtns.join('') + '</div>';
  }
}
