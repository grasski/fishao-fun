/**
 * FISHAO - Application Controller & Bootstrap (js/main.js)
 * -------------------------------------------------------------
 * Tab view switching, clock/timezone management, static translations,
 * modal dialog controls, window.fishaoApp exports, and application boot.
 */

function updateSyncBadgeUI() {
  var syncBadge = document.getElementById("syncStatusBadge");
  var syncText = document.getElementById("syncStatusText");
  if (!syncBadge || !syncText) return;

  if (currentSyncState === "live") {
    syncBadge.className = "sync-status-badge live";
    syncText.innerText = t('sync_live');
    syncBadge.title = t('sync_live_title');
  } else if (currentSyncState === "offline") {
    syncBadge.className = "sync-status-badge local";
    syncText.innerText = t('sync_offline');
  } else if (currentSyncState === "error") {
    syncBadge.className = "sync-status-badge local";
    syncText.innerText = t('sync_error');
  } else {
    syncBadge.className = "sync-status-badge local";
    syncText.innerText = t('sync_local');
    syncBadge.title = t('sync_local_title');
  }
}

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
}
setInterval(updateClock, 1000);

function switchView(view) {
  var isInClub = !!(currentUser && currentClubId);
  if (view === "club" && !isInClub) {
    view = "all";
  }
  currentView = view;

  var tabs = ["tabClub", "tabAll", "tabClubManage", "tabMarket"];
  var tabMap = {
    "club": "tabClub",
    "all": "tabAll",
    "club_manage": "tabClubManage",
    "market": "tabMarket"
  };

  tabs.forEach(function (tId) {
    var el = document.getElementById(tId);
    if (el) el.classList.toggle("active", tabMap[view] === tId);
  });

  var bClub = document.getElementById("bannerClub");
  var bCollection = document.getElementById("bannerCollection");
  var bMarket = document.getElementById("bannerMarket");
  var secManage = document.getElementById("sectionClubManage");
  var secTable = document.getElementById("sectionFishTable");
  var filterCard = document.getElementById("filterCard");
  var gateClub = document.getElementById("gateClubManage");
  var manageContent = document.getElementById("manageClubContent");

  if (bClub) bClub.style.display = (view === "club") ? "flex" : "none";
  if (bCollection) bCollection.style.display = (view === "all") ? "flex" : "none";
  if (bMarket) bMarket.style.display = (view === "market") ? "flex" : "none";

  updateMarketTabStatus();

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

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    // Skip syncStatusText so we don't overwrite live/offline state with default attribute
    if (el.id === "syncStatusText" || el.id === "tzLocalBtn" || el.id === "clockLabel") return;
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
  updateSyncBadgeUI();
  updateTzButtonsUI();
  updateClock();
  updateAuthUI();
  updateWaterFilterOptions();
  initLocationOptions();
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

  if (selectedModalFishId) {
    var modal = document.getElementById("priceModalOverlay");
    if (modal && modal.classList.contains("active")) {
      openPriceModal(selectedModalFishId);
    }
  }
}

function closeAllModals() {
  closePriceModal();
  closeBulkModal();
  closeProfileModal();
  closePlayerModal();
  resolveConfirmModal(false);
}

function onModalOverlayClick(e, id) {
  if (e.target.id === id) {
    if (id === 'priceModalOverlay') closePriceModal();
    if (id === 'bulkModalOverlay') closeBulkModal();
    if (id === 'profileModalOverlay') closeProfileModal();
    if (id === 'playerModalOverlay') closePlayerModal();
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
  selectPresetAvatar: selectPresetAvatar,
  onAvatarUrlInput: onAvatarUrlInput,
  saveProfile: saveProfile,
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
  openFishDetail: openPriceModal,
  onPriceDateChange: onPriceDateChange,
  onBulkDateChange: onBulkDateChange,
  isDateSunday: isDateSunday,
  getYesterdayISO: getYesterdayISO,
  getTodayISO: getTodayISO,
  setLanguage: setLanguage,
  isMarketClosedToday: isMarketClosedToday,
  getTodayPrice: getTodayPrice,
  updateMarketTabStatus: updateMarketTabStatus,
  t: t
};

// Initialize localization & application
var initialLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || localStorage.getItem('fishao_lang') || 'cs';
setLanguage(initialLang);
switchView("all");
initFirebaseSync();

