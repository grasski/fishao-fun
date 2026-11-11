/**
 * FISHAO - Application Controller & Bootstrap (js/main.js)
 * -------------------------------------------------------------
 * Tab view switching, clock/timezone management, static translations,
 * modal dialog controls, window.fishaoApp exports, and application boot.
 */

function updateSyncBadgeUI() {}

function updateTzButtonsUI() {
  var tzLocalBtn = document.getElementById("tzLocalBtn");
  var tzUtcBtn = document.getElementById("tzUtcBtn");
  var clockLabel = document.getElementById("clockLabel");
  var city = getLocalizedTzCity();

  if (tzLocalBtn) {
    tzLocalBtn.classList.toggle("active", userTimezone === "local");
    tzLocalBtn.innerText = "📍 " + (city || t('tz_local_short'));
    tzLocalBtn.title = t('tz_local_btn_title', { tz: detectedTzName || t('tz_local_city_default') });
  }
  if (tzUtcBtn) {
    tzUtcBtn.classList.toggle("active", userTimezone === "utc");
  }
  if (clockLabel) {
    clockLabel.innerText = userTimezone === "local" ? city : t('tz_game_utc');
  }
}

function setTimezone(tz) {
  userTimezone = tz;
  localStorage.setItem('fishao_tz', tz);
  updateTzButtonsUI();
  updateClock();
  updateMarketTabStatus();
  applyFilters();
}

function updateClock() {
  var now = new Date();
  var h, m, s;
  var labelEl = document.getElementById("clockLabel");
  var city = getLocalizedTzCity();

  if (userTimezone === "utc") {
    h = now.getUTCHours();
    m = now.getUTCMinutes();
    s = now.getUTCSeconds();
    if (labelEl) labelEl.innerText = t('clock_utc_server');
  } else {
    h = now.getHours();
    m = now.getMinutes();
    s = now.getSeconds();
    if (labelEl) labelEl.innerText = t('clock_local_time') + (detectedCityRaw ? " (" + city + ")" : "");
  }
  var clockEl = document.getElementById("liveClock");
  if (clockEl) {
    clockEl.innerText = h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');
  }
  if (typeof updateMarketSundayCountdown === 'function') {
    updateMarketSundayCountdown();
  }
}
setInterval(updateClock, 1000);

var isHandlingRoute = false;

function getHashOrQueryRoute() {
  var tab = null;
  var fishId = null;

  try {
    var params = new URLSearchParams(window.location.search);
    var fishQuery = params.get('fish') || params.get('ryba');
    var tabQuery = params.get('tab') || params.get('view');

    var hash = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();

    // 1. Check for fish route: #fish-123, #ryba-123 or ?fish=123
    if (fishQuery && !isNaN(parseInt(fishQuery, 10))) {
      fishId = parseInt(fishQuery, 10);
    } else if (hash.indexOf('fish-') === 0 || hash.indexOf('ryba-') === 0) {
      var rawId = hash.replace(/^(fish-|ryba-)/, '');
      if (!isNaN(parseInt(rawId, 10))) {
        fishId = parseInt(rawId, 10);
      }
    }

    // 2. Check for tab route
    var rawTab = tabQuery || hash;
    if (rawTab) {
      if (rawTab === 'market' || rawTab === 'trh') {
        tab = 'market';
      } else if (rawTab === 'club' || rawTab === 'klub' || rawTab === 'club_manage' || rawTab === 'club-manage') {
        tab = 'club_manage';
      } else if (rawTab === 'club-fishes' || rawTab === 'klubove-ryby') {
        tab = 'club';
      } else if (rawTab === 'players' || rawTab === 'hraci' || rawTab === 'komunita' || rawTab === 'dvorek') {
        tab = 'players';
      } else if (rawTab === 'all' || rawTab === 'encyklopedie' || rawTab === 'ryby') {
        tab = 'all';
      }
    }
  } catch (e) { }

  return { tab: tab, fishId: fishId };
}

function syncUrlRoute(view, fishId, replace) {
  if (isHandlingRoute) return;
  try {
    var targetHash = '';
    if (fishId) {
      targetHash = '#fish-' + fishId;
    } else if (view && view !== 'all') {
      targetHash = '#' + view;
    }

    var curHash = window.location.hash || '';
    if (curHash === targetHash || (curHash === '' && targetHash === '')) return;

    var newUrl = targetHash ? (window.location.pathname + window.location.search + targetHash) : (window.location.pathname + window.location.search);

    if (window.history) {
      if (replace && window.history.replaceState) {
        window.history.replaceState({ view: view, fishId: fishId }, '', newUrl);
      } else if (window.history.pushState) {
        window.history.pushState({ view: view, fishId: fishId }, '', newUrl);
      }
    }
  } catch (e) { }
}

function handleRoute() {
  if (isHandlingRoute) return;
  isHandlingRoute = true;
  try {
    var route = getHashOrQueryRoute();

    // 1. Switch tab if needed
    if (route.tab && route.tab !== currentView) {
      switchView(route.tab, true);
    } else if (!route.tab && !route.fishId && currentView !== 'all') {
      switchView('all', true);
    }

    // 2. Open or close fish modal
    var modal = document.getElementById('priceModalOverlay');
    var isModalActive = modal && modal.classList.contains('active');

    if (route.fishId) {
      if (typeof openPriceModal === 'function') {
        openPriceModal(route.fishId, true);
      }
    } else if (isModalActive) {
      if (typeof closePriceModal === 'function') {
        closePriceModal(true);
      }
    }
  } catch (e) {
  } finally {
    isHandlingRoute = false;
  }
}

function switchView(view, skipSync) {
  var isInClub = !!(currentUser && currentClubId);
  if (view === "club" && !isInClub) {
    view = "all";
  }
  currentView = view;

  if (!skipSync) {
    syncUrlRoute(view, null);
  }

  if (typeof logAnalyticsEvent === "function") {
    logAnalyticsEvent("screen_view", { screen_name: view });
  }

  var tabs = ["tabClub", "tabAll", "tabClubManage", "tabMarket", "tabPlayers"];
  var tabMap = {
    "club": "tabClub",
    "all": "tabAll",
    "club_manage": "tabClubManage",
    "market": "tabMarket",
    "players": "tabPlayers"
  };

  tabs.forEach(function (tId) {
    var el = document.getElementById(tId);
    if (el) el.classList.toggle("active", tabMap[view] === tId);
  });

  var bClub = document.getElementById("bannerClub");
  var bCollection = document.getElementById("bannerCollection");
  var bMarket = document.getElementById("bannerMarket");
  var bPlayers = document.getElementById("bannerPlayers");
  var secManage = document.getElementById("sectionClubManage");
  var secTable = document.getElementById("sectionFishTable");
  var secPlayers = document.getElementById("sectionPlayers");
  var filterCard = document.getElementById("filterCard");
  var gateClub = document.getElementById("gateClubManage");
  var manageContent = document.getElementById("manageClubContent");
  var gatePlayers = document.getElementById("gatePlayers");
  var playersContent = document.getElementById("playersContent");

  if (bClub) bClub.style.display = (view === "club") ? "flex" : "none";
  if (bCollection) bCollection.style.display = (view === "all") ? "flex" : "none";
  if (bMarket) bMarket.style.display = (view === "market") ? "flex" : "none";
  if (bPlayers) bPlayers.style.display = (view === "players" && currentUser) ? "flex" : "none";

  var subNoticePlayers = document.getElementById("subNoticePlayers");
  var subNoticeClubs = document.getElementById("subNoticeClubs");
  if (subNoticePlayers) subNoticePlayers.style.display = (view === "players") ? "flex" : "none";
  if (subNoticeClubs) subNoticeClubs.style.display = (view === "club_manage") ? "flex" : "none";

  updateMarketTabStatus();

  if (view === "players") {
    if (secPlayers) secPlayers.style.display = "block";
    if (secManage) secManage.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (filterCard) filterCard.style.display = "none";

    if (!currentUser) {
      if (bPlayers) bPlayers.style.display = "none";
      if (gatePlayers) gatePlayers.style.display = "block";
      if (playersContent) playersContent.style.display = "none";
    } else {
      if (bPlayers) bPlayers.style.display = "flex";
      if (gatePlayers) gatePlayers.style.display = "none";
      if (playersContent) playersContent.style.display = "block";
      if (typeof loadAllPlayers === 'function') loadAllPlayers();
    }
    return;
  } else {
    if (secPlayers) secPlayers.style.display = "none";
  }

  if (view === "club_manage") {
    if (secManage) secManage.style.display = "block";
    if (secTable) secTable.style.display = "none";

    if (!currentUser) {
      if (gateClub) gateClub.style.display = "block";
      if (manageContent) manageContent.style.display = "none";
    } else {
      if (gateClub) gateClub.style.display = "none";
      if (manageContent) manageContent.style.display = "block";
      updateAuthUI();
      renderClubMilestones();
      renderClubSpecialFishes();
      updateCaughtStats();
    }
    return;
  } else {
    if (secManage) secManage.style.display = "none";
    if (secTable) secTable.style.display = "block";
    if (filterCard) filterCard.style.display = "flex";
  }

  var waterFilterGroup = document.getElementById("waterFilterGroup");
  var locationFilterGroup = document.getElementById("locationFilterGroup");
  var missionSizeRow = document.getElementById("missionSizeRow");

  if (waterFilterGroup) waterFilterGroup.style.display = (view === "club") ? "flex" : "none";
  if (locationFilterGroup) locationFilterGroup.style.display = (view !== "club") ? "flex" : "none";
  if (missionSizeRow) missionSizeRow.style.display = (view === "all") ? "flex" : "none";

  // Reset filters completely when switching tabs
  resetFilters();
  updateCaughtStats();
}

function updateStaticTranslations() {
  var lang = getLang();
  document.documentElement.lang = lang;

  var csBtn = document.getElementById("langCsBtn");
  var enBtn = document.getElementById("langEnBtn");
  if (csBtn) csBtn.classList.toggle("active", lang === "cs");
  if (enBtn) enBtn.classList.toggle("active", lang === "en");

  // Dynamic SEO title & meta description update on language change
  try {
    var pageTitle = t("seo_page_title");
    if (pageTitle && pageTitle !== "seo_page_title") {
      document.title = pageTitle;
    }
    var metaDescEl = document.getElementById("metaDescription");
    var pageDesc = t("seo_meta_desc");
    if (metaDescEl && pageDesc && pageDesc !== "seo_meta_desc") {
      metaDescEl.setAttribute("content", pageDesc);
    }
  } catch (e) { }

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    if (el.id === "tzLocalBtn" || el.id === "clockLabel" || el.id === "marketSundayNoticeDesc") return;
    var key = el.getAttribute("data-i18n");
    var val = t(key);
    if (val !== undefined && val !== null && val !== key) {
      if (val.indexOf('<') !== -1 || val.indexOf('&') !== -1) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-placeholder");
    var val = t(key);
    if (val && val !== key) el.placeholder = val;
  });

  document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-title");
    var val = t(key);
    if (val && val !== key) el.title = val;
  });

  updateMarketTabStatus();
}

function setLanguage(lang) {
  if (lang !== 'cs' && lang !== 'en') lang = 'cs';
  if (window.FISHAO_I18N) {
    window.FISHAO_I18N.currentLang = lang;
  }
  try {
    localStorage.setItem('fishao_lang', lang);
  } catch (e) { }

  updateStaticTranslations();
  updateTzButtonsUI();
  updateClock();
  updateAuthUI();
  updateWaterFilterOptions();
  initLocationOptions();
  updateAreaFilterOptions();
  initBaitOptions();
  updateTimeFilterOptions();
  updateSortByOptions();
  updateRatingFilterOptions();
  renderTableHead();
  updateCaughtStats();
  updateClubStats();
  renderClubMilestones();
  renderClubSpecialFishes();
  renderClubMembers(currentClubMembersMap, currentClubCreatorId);
  applyFilters();

  if (typeof populatePlayerFishFilterDropdown === 'function') populatePlayerFishFilterDropdown();
  if (typeof renderPlayersActiveFiltersBar === 'function') renderPlayersActiveFiltersBar();
  if (typeof renderPlayersList === 'function' && currentView === 'players') renderPlayersList();
  if (typeof renderBackyardProfilePicker === 'function') renderBackyardProfilePicker();

  var pModal = document.getElementById("playerModalOverlay");
  if (pModal && pModal.classList.contains("active")) {
    var nameEl = document.getElementById("playerModalName");
    if (nameEl && nameEl.dataset.currentUid && typeof openPlayerModal === 'function') {
      openPlayerModal(nameEl.dataset.currentUid);
    }
  }

  if (selectedModalFishId) {
    var modal = document.getElementById("priceModalOverlay");
    if (modal && modal.classList.contains("active")) {
      openPriceModal(selectedModalFishId);
    }
  }

  if (typeof updatePrivacyConsentStatusUI === 'function') {
    updatePrivacyConsentStatusUI();
  }
}

function openPrivacyModal() {
  if (typeof updatePrivacyConsentStatusUI === 'function') {
    updatePrivacyConsentStatusUI();
  }
  var modal = document.getElementById("privacyModalOverlay");
  if (modal) modal.classList.add("active");
}

function closePrivacyModal() {
  var modal = document.getElementById("privacyModalOverlay");
  if (modal) modal.classList.remove("active");
}

function closeAllModals() {
  closePriceModal();
  closeBulkModal();
  closeProfileModal();
  closePlayerModal();
  closePrivacyModal();
  resolveConfirmModal(false);
}

function onModalOverlayClick(e, id) {
  if (e.target.id === id) {
    if (id === 'priceModalOverlay') closePriceModal();
    if (id === 'bulkModalOverlay') closeBulkModal();
    if (id === 'profileModalOverlay') closeProfileModal();
    if (id === 'playerModalOverlay') closePlayerModal();
    if (id === 'privacyModalOverlay') closePrivacyModal();
    if (id === 'confirmModalOverlay') resolveConfirmModal(false);
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    closeAllModals();
  }
});

document.addEventListener('click', function (e) {
  var drop = document.getElementById("bulkFishSuggestions");
  var input = document.getElementById("bulkFishInput");
  if (drop && drop.style.display !== "none") {
    if (!drop.contains(e.target) && e.target !== input) {
      drop.style.display = "none";
    }
  }
});

// Export to global window object
window.fishaoApp = {
  switchView: switchView,
  setTimezone: setTimezone,
  onPointsChange: onPointsChange,
  applyFilters: applyFilters,
  resetFilters: resetFilters,
  onLocationFilterChange: onLocationFilterChange,
  updateAreaFilterOptions: updateAreaFilterOptions,
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
  onBulkSearchInput: onBulkSearchInput,
  selectBulkFishSuggestion: selectBulkFishSuggestion,
  onBulkInputKeyDown: onBulkInputKeyDown,
  addFishToBulkList: addFishToBulkList,
  submitNewPrice: submitNewPrice,
  deletePriceEntry: deletePriceEntry,
  processBulkImport: processBulkImport,
  exportPricesJson: exportPricesJson,
  signIn: signIn,
  signOut: signOut,
  editNickname: editNickname,
  openProfileModal: openProfileModal,
  closeProfileModal: closeProfileModal,
  openPlayerModal: openPlayerModal,
  closePlayerModal: closePlayerModal,
  openPrivacyModal: openPrivacyModal,
  closePrivacyModal: closePrivacyModal,
  acceptCookieConsent: acceptCookieConsent,
  declineCookieConsent: declineCookieConsent,
  updatePrivacyConsentStatusUI: updatePrivacyConsentStatusUI,
  logAnalyticsEvent: logAnalyticsEvent,
  selectPresetAvatar: selectPresetAvatar,
  onAvatarUrlInput: onAvatarUrlInput,
  saveProfile: saveProfile,
  deleteAccount: deleteAccount,
  exportFirestoreBackup: exportFirestoreBackup,
  resolveConfirmModal: resolveConfirmModal,
  showToast: showToast,
  toggleCaughtFish: toggleCaughtFish,
  searchClubs: searchClubs,
  createClub: createClub,
  joinClub: joinClub,
  leaveClub: leaveClub,
  renderClubMembers: renderClubMembers,
  setClubPoints: setClubPoints,
  addClubPoints: addClubPoints,
  toggleClubSpecialFish: toggleClubSpecialFish,
  filterSpecialFishes: filterSpecialFishes,
  renderClubSpecialFishes: renderClubSpecialFishes,
  onClubNameChange: onClubNameChange,
  syncClubName: syncClubName,
  syncClubPoints: syncClubPoints,
  setCollectionFilter: setCollectionFilter,
  filterMilestones: filterMilestones,
  renderClubMilestones: renderClubMilestones,
  renderRatingBadge: renderRatingBadge,
  toggleCaughtFromModal: toggleCaughtFromModal,
  toggleBackyardFish: toggleBackyardFish,
  toggleBackyardFromModal: toggleBackyardFromModal,
  addBackyardFish: addBackyardFish,
  removeBackyardFish: removeBackyardFish,
  onPlayerSearchInput: onPlayerSearchInput,
  clearPlayerSearch: clearPlayerSearch,
  togglePlayerBackyardFilter: togglePlayerBackyardFilter,
  togglePlayerFriendsFilter: togglePlayerFriendsFilter,
  togglePlayerActiveNowFilter: togglePlayerActiveNowFilter,
  onPlayerTimeFilterChange: onPlayerTimeFilterChange,
  onPlayerFishFilterChange: onPlayerFishFilterChange,
  onPlayerBaitFilterChange: onPlayerBaitFilterChange,
  onPlayerRatingFilterChange: onPlayerRatingFilterChange,
  resetPlayerFilters: resetPlayerFilters,
  toggleBackyardMenu: toggleBackyardMenu,
  closeBackyardMenu: closeBackyardMenu,
  toggleBackyardAllGrid: toggleBackyardAllGrid,
  filterBackyardCatalog: filterBackyardCatalog,
  toggleFriend: toggleFriend,
  onBackyardSearchInput: onBackyardSearchInput,
  selectBackyardSearchResult: selectBackyardSearchResult,
  loadAllPlayers: loadAllPlayers,
  refreshPlayersList: refreshPlayersList,
  setPlayerPage: setPlayerPage,
  kickMemberFromClub: kickMemberFromClub,
  unbindClubListener: unbindClubListener,
  openFishDetail: openPriceModal,
  onPriceDateChange: onPriceDateChange,
  onBulkDateChange: onBulkDateChange,
  isDateSunday: isDateSunday,
  getYesterdayISO: getYesterdayISO,
  getTodayISO: getTodayISO,
  setLanguage: setLanguage,
  isMarketClosedToday: isMarketClosedToday,
  getMarketClosedWindowText: getMarketClosedWindowText,
  getMaxPrice: getMaxPrice,
  updateMarketTabStatus: updateMarketTabStatus,
  updateMarketSundayCountdown: updateMarketSundayCountdown,
  dismissMarketResetAlert: dismissMarketResetAlert,
  syncUrlRoute: syncUrlRoute,
  handleRoute: handleRoute,
  getHashOrQueryRoute: getHashOrQueryRoute,
  t: t
};

// Initialize localization & application
var initialLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || localStorage.getItem('fishao_lang') || 'cs';
setLanguage(initialLang);

// Initialize routing from URL hash or query params
var initialRoute = getHashOrQueryRoute();
if (initialRoute.tab && initialRoute.tab !== "all") {
  switchView(initialRoute.tab, true);
} else {
  switchView("all", true);
}

if (initialRoute.fishId) {
  openPriceModal(initialRoute.fishId, true);
}

// Setup popstate & hashchange listeners for back/forward browser navigation
window.addEventListener('popstate', handleRoute);
window.addEventListener('hashchange', handleRoute);

initFirebaseSync();

