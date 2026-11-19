/**
 * FISHAO - Application Controller & Bootstrap (js/main.js)
 * -------------------------------------------------------------
 * Tab view switching, clock/timezone management, static translations,
 * modal dialog controls, window.fishaoApp exports, and application boot.
 */

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
  safeStorageSet('fishao_tz', tz);
  updateTzButtonsUI();
  updateClock();
  updateMarketTabStatus();
  applyFilters();
  if (currentView === 'locations' && typeof renderLocationsView === 'function') renderLocationsView();
  if (currentView === 'calendar' && typeof renderCalendarView === 'function') renderCalendarView();
  var remModal = document.getElementById("remindersModalOverlay");
  if (remModal && remModal.classList.contains("active") && typeof renderRemindersModal === 'function') {
    renderRemindersModal();
  }
  var remAlert = document.getElementById("remindersAlertModalOverlay");
  if (remAlert && remAlert.classList.contains("active") && typeof renderRemindersAlertModal === 'function') {
    renderRemindersAlertModal();
  }
}

var _lastClockLabelText = "";

function updateClock() {
  var now = new Date();
  var h, m, s;
  var labelEl = document.getElementById("clockLabel");
  var city = getLocalizedTzCity();
  var nextLabelText = "";

  if (userTimezone === "utc") {
    h = now.getUTCHours();
    m = now.getUTCMinutes();
    s = now.getUTCSeconds();
    nextLabelText = t('clock_utc_server');
  } else {
    h = now.getHours();
    m = now.getMinutes();
    s = now.getSeconds();
    nextLabelText = t('clock_local_time') + (detectedCityRaw ? " (" + city + ")" : "");
  }
  if (labelEl && nextLabelText !== _lastClockLabelText) {
    _lastClockLabelText = nextLabelText;
    labelEl.innerText = nextLabelText;
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
      if (rawTab === 'market' || rawTab === 'trh' || rawTab === 'targ') {
        tab = 'market';
      } else if (rawTab === 'club' || rawTab === 'klub' || rawTab === 'club_manage' || rawTab === 'club-manage') {
        tab = 'club_manage';
      } else if (rawTab === 'club-fishes' || rawTab === 'klubove-ryby' || rawTab === 'ryby-klubowe') {
        tab = 'club';
      } else if (rawTab === 'players' || rawTab === 'hraci' || rawTab === 'komunita' || rawTab === 'dvorek' || rawTab === 'gracze' || rawTab === 'podworko') {
        tab = 'players';
      } else if (rawTab === 'locations' || rawTab === 'lokace' || rawTab === 'mapa' || rawTab === 'lokalizacje') {
        tab = 'locations';
      } else if (rawTab === 'calendar' || rawTab === 'kalendar' || rawTab === 'sezona' || rawTab === 'seasonal' || rawTab === 'sezon' || rawTab === 'kalendarz') {
        tab = 'calendar';
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

    var urlObj = new URL(window.location.href);
    var hadStaleQuery = false;
    ['tab', 'view', 'fish', 'ryba'].forEach(function (qk) {
      if (urlObj.searchParams.has(qk)) {
        urlObj.searchParams.delete(qk);
        hadStaleQuery = true;
      }
    });

    var curHash = window.location.hash || '';
    if (!hadStaleQuery && (curHash === targetHash || (curHash === '' && targetHash === ''))) return;

    var cleanSearch = urlObj.searchParams.toString();
    var newUrl = window.location.pathname + (cleanSearch ? ('?' + cleanSearch) : '') + targetHash;

    if (window.history) {
      if (replace && window.history.replaceState) {
        window.history.replaceState({ view: view, fishId: fishId }, '', newUrl);
      } else if (window.history.pushState) {
        window.history.pushState({ view: view, fishId: fishId }, '', newUrl);
      }
    }

    var canLink = document.getElementById('canonicalLink');
    if (canLink) {
      var canPath = window.location.pathname || '/';
      if (!canPath.endsWith('/') && !canPath.endsWith('.html')) canPath += '/';
      canLink.setAttribute('href', window.location.origin + canPath);
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
  var prevView = currentView;
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

  var isEncyclopediaView = (view === "all" || view === "locations" || view === "calendar");
  var isClubView = (view === "club_manage" || view === "club");

  var tabAllEl = document.getElementById("tabAll");
  var tabMarketEl = document.getElementById("tabMarket");
  var tabClubManageEl = document.getElementById("tabClubManage");
  var tabPlayersEl = document.getElementById("tabPlayers");
  if (tabAllEl) tabAllEl.classList.toggle("active", isEncyclopediaView);
  if (tabMarketEl) tabMarketEl.classList.toggle("active", view === "market");
  if (tabClubManageEl) tabClubManageEl.classList.toggle("active", isClubView);
  if (tabPlayersEl) tabPlayersEl.classList.toggle("active", view === "players");

  var subTabMap = {
    "all": "subTabAll",
    "locations": "tabLocations",
    "calendar": "tabCalendar",
    "club_manage": "subTabClubManage",
    "club": "tabClub"
  };
  ["subTabAll", "tabLocations", "tabCalendar", "subTabClubManage", "tabClub"].forEach(function (tId) {
    var el = document.getElementById(tId);
    if (el) el.classList.toggle("active", subTabMap[view] === tId);
  });

  var subNavEncyclopedia = document.getElementById("subNavEncyclopedia");
  var subNavClub = document.getElementById("subNavClub");
  if (subNavEncyclopedia) subNavEncyclopedia.style.display = isEncyclopediaView ? "flex" : "none";
  if (subNavClub) subNavClub.style.display = (isClubView && isInClub) ? "flex" : "none";

  var bClub = document.getElementById("bannerClub");
  var bCollection = document.getElementById("bannerCollection");
  var bMarket = document.getElementById("bannerMarket");
  var bPlayers = document.getElementById("bannerPlayers");
  var secManage = document.getElementById("sectionClubManage");
  var secTable = document.getElementById("sectionFishTable");
  var secPlayers = document.getElementById("sectionPlayers");
  var secLocations = document.getElementById("sectionLocations");
  var secCalendar = document.getElementById("sectionCalendar");
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
  if (subNoticeClubs) subNoticeClubs.style.display = isClubView ? "flex" : "none";

  updateMarketTabStatus();
  if (typeof updateCalendarTabPill === 'function') updateCalendarTabPill();

  if (view === "players") {
    if (secPlayers) secPlayers.style.display = "block";
    if (secLocations) secLocations.style.display = "none";
    if (secCalendar) secCalendar.style.display = "none";
    if (secManage) secManage.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (filterCard) filterCard.style.display = "none";
    if (typeof resetPlayerFilters === 'function') resetPlayerFilters(true);

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
    if (secLocations) secLocations.style.display = "none";
    if (secCalendar) secCalendar.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (typeof resetClubManageFilters === 'function') resetClubManageFilters(true);

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
  }

  if (view === "locations") {
    if (secLocations) secLocations.style.display = "block";
    if (secCalendar) secCalendar.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (filterCard) filterCard.style.display = "none";
    if (typeof resetLocationsFilters === 'function') resetLocationsFilters(true);
    if (typeof preloadLocationImages === 'function') preloadLocationImages();
    updateCaughtStats();
    return;
  } else {
    if (secLocations) secLocations.style.display = "none";
  }

  if (view === "calendar") {
    if (secCalendar) secCalendar.style.display = "block";
    if (secLocations) secLocations.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (filterCard) filterCard.style.display = "none";
    if (typeof resetCalendarFilters === 'function') resetCalendarFilters(true);
    updateCaughtStats();
    return;
  } else {
    if (secCalendar) secCalendar.style.display = "none";
  }

  if (secTable) secTable.style.display = "block";
  if (filterCard) filterCard.style.display = "flex";

  var locationFilterGroup = document.getElementById("locationFilterGroup");
  var missionSizeRow = document.getElementById("missionSizeRow");

  if (locationFilterGroup) locationFilterGroup.style.display = (view !== "club") ? "flex" : "none";
  if (missionSizeRow) {
    missionSizeRow.style.display = (view === "all" || view === "market") ? "flex" : "none";
    var sizeCluster = missionSizeRow.querySelector(".size-filter-cluster");
    if (sizeCluster) sizeCluster.style.display = (view === "all") ? "flex" : "none";
  }

  if (view === "market" && typeof updateMarketSundayCountdown === "function") {
    updateMarketSundayCountdown();
  }

  updateSortByOptions();
  resetFilters();
  updateCaughtStats();
  updateScrollTopButton();
}

function updateStaticTranslations() {
  var lang = getLang();
  document.documentElement.lang = lang;

  var langSelect = document.getElementById("langSelect");
  if (langSelect && langSelect.value !== lang) langSelect.value = lang;

  var wikiLink = document.getElementById("footerWikiLink");
  if (wikiLink) {
    wikiLink.setAttribute("href", lang === "en" ? "/en/fish/" : (lang === "pl" ? "/pl/ryby/" : "/ryby/"));
  }

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
      if (val.indexOf('<') !== -1) {
        if (el.innerHTML !== val) el.innerHTML = val;
      } else {
        if (el.textContent.replace(/\s+/g, ' ').trim() !== val.replace(/\s+/g, ' ').trim()) {
          el.textContent = val;
        }
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

  document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-aria-label");
    var val = t(key);
    if (val && val !== key) el.setAttribute("aria-label", val);
  });

  updateMarketTabStatus();
}

function setLanguage(lang, opts) {
  opts = opts || {};
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.setLang === 'function') {
    lang = window.FISHAO_I18N.setLang(lang);
    if (!opts.skipEnsure &&
      typeof window.FISHAO_I18N.isLangLoaded === 'function' &&
      typeof window.FISHAO_I18N.ensureLangLoaded === 'function' &&
      !window.FISHAO_I18N.isLangLoaded(lang)) {
      window.FISHAO_I18N.ensureLangLoaded(lang).then(function (loaded) {
        if (loaded && window.FISHAO_I18N.currentLang === lang) {
          setLanguage(lang, { skipEnsure: true });
        }
      });
    }
  } else {
    if (!lang) lang = 'cs';
    try {
      localStorage.setItem('fishao_lang', lang);
    } catch (e) { }
  }

  if (!opts.skipRender && typeof window !== 'undefined' && window.history && window.history.replaceState) {
    try {
      // Only rewrite the URL path to /en/ or /pl/ when running on the built site (or already on /en/ or /pl/),
      // so raw local dev servers without /en/index.html don't 404 on F5 reload.
      var curPath = window.location.pathname || '/';
      var isBuiltOrSubpath = !!(window.FISHAO_APP_VERSION || /^\/(en|pl)(\/|$)/i.test(curPath));
      if (isBuiltOrSubpath && /^\/(en|pl)?\/?(index\.html)?$/i.test(curPath)) {
        var nextPath = (lang === 'en') ? '/en/' : ((lang === 'pl') ? '/pl/' : '/');
        if (curPath !== nextPath && !(curPath === '/index.html' && nextPath === '/')) {
          var urlObj = new URL(window.location.href);
          urlObj.searchParams.delete('lang');
          var searchStr = urlObj.searchParams.toString();
          var targetUrl = nextPath + (searchStr ? ('?' + searchStr) : '') + (window.location.hash || '');
          window.history.replaceState(window.history.state, '', targetUrl);
          var canLink = document.getElementById('canonicalLink');
          if (canLink) canLink.setAttribute('href', window.location.origin + nextPath);
        }
      }
    } catch (e) { }
  }

  updateStaticTranslations();
  updateTzButtonsUI();
  updateClock();
  initLocationOptions();
  updateAreaFilterOptions();
  initBaitOptions();
  updateTimeFilterOptions();
  updateSortByOptions();
  updateRatingFilterOptions();
  renderTableHead();

  if (opts.skipRender) return;

  updateAuthUI();
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
  if (typeof updateCalendarTabPill === 'function') updateCalendarTabPill();

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

  var remModal = document.getElementById("remindersModalOverlay");
  if (remModal && remModal.classList.contains("active") && typeof renderRemindersModal === 'function') {
    renderRemindersModal();
  }
  var remAlert = document.getElementById("remindersAlertModalOverlay");
  if (remAlert && remAlert.classList.contains("active") && typeof renderRemindersAlertModal === 'function') {
    renderRemindersAlertModal();
  }
  var chatModal = document.getElementById("chatModalOverlay");
  if (chatModal && chatModal.classList.contains("active")) {
    if (typeof resetChatPaneRenderState === 'function') resetChatPaneRenderState();
    if (typeof renderChatSidebarList === 'function') renderChatSidebarList();
    if (typeof renderChatActivePane === 'function') renderChatActivePane();
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
  if (typeof closeChatReportModal === 'function') closeChatReportModal();
  if (typeof closeChatRequestModal === 'function') closeChatRequestModal();
  if (typeof closeChatModal === 'function') closeChatModal();
  if (typeof closeChatIntroModal === 'function') closeChatIntroModal(false);
  var remModal = document.getElementById("remindersModalOverlay");
  if (remModal && remModal.classList.contains("active") && typeof closeRemindersModal === 'function') {
    closeRemindersModal();
  }
  var remAlert = document.getElementById("remindersAlertModalOverlay");
  if (remAlert && remAlert.classList.contains("active") && typeof closeRemindersAlertModal === 'function') {
    closeRemindersAlertModal(false);
  }
  resolveConfirmModal(false);
}

function closeModalById(id) {
  if (id === 'priceModalOverlay') closePriceModal();
  else if (id === 'bulkModalOverlay') closeBulkModal();
  else if (id === 'profileModalOverlay') closeProfileModal();
  else if (id === 'playerModalOverlay') closePlayerModal();
  else if (id === 'privacyModalOverlay') closePrivacyModal();
  else if (id === 'chatModalOverlay' && typeof closeChatModal === 'function') closeChatModal();
  else if (id === 'chatIntroModalOverlay' && typeof closeChatIntroModal === 'function') closeChatIntroModal(false);
  else if (id === 'chatRequestModalOverlay' && typeof closeChatRequestModal === 'function') closeChatRequestModal();
  else if (id === 'chatReportModalOverlay' && typeof closeChatReportModal === 'function') closeChatReportModal();
  else if (id === 'remindersModalOverlay' && typeof closeRemindersModal === 'function') closeRemindersModal();
  else if (id === 'remindersAlertModalOverlay' && typeof closeRemindersAlertModal === 'function') closeRemindersAlertModal(false);
  else if (id === 'confirmModalOverlay') resolveConfirmModal(false);
}

function getTopActiveModal() {
  if (typeof document === 'undefined') return null;
  var actives = document.querySelectorAll('.modal-overlay.active');
  if (!actives.length) return null;
  var best = actives[0];
  var bestZ = -Infinity;
  for (var i = 0; i < actives.length; i++) {
    var zRaw = window.getComputedStyle ? window.getComputedStyle(actives[i]).zIndex : '0';
    var zNum = parseInt(zRaw, 10);
    if (isNaN(zNum)) zNum = 0;
    if (zNum >= bestZ) {
      bestZ = zNum;
      best = actives[i];
    }
  }
  return best;
}

function onModalOverlayClick(e, id) {
  if (e.target.id === id) {
    closeModalById(id);
  }
}

(function initModalScrollLock() {
  if (typeof document === 'undefined') return;
  var _prevPaddingRight = '';
  var _isLocked = false;
  var _touchStartY = 0;
  var _lastFocusedBeforeModal = null;

  function getModalFocusableElements(modalEl) {
    if (!modalEl) return [];
    var selector = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var nodes = modalEl.querySelectorAll(selector);
    var visible = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
        visible.push(el);
      }
    }
    return visible;
  }

  function focusActiveModal() {
    var modalEl = getTopActiveModal();
    if (!modalEl) return;
    requestAnimationFrame(function () {
      var curModal = getTopActiveModal();
      if (!curModal) return;
      if (curModal.contains(document.activeElement)) return;
      var autoEl = curModal.querySelector('[autofocus]');
      if (autoEl && (autoEl.offsetWidth > 0 || autoEl.offsetHeight > 0)) {
        try { autoEl.focus({ preventScroll: true }); } catch (e) { }
        return;
      }
      var dialogEl = curModal.matches('[role="dialog"]') ? curModal : (curModal.querySelector('[role="dialog"]') || curModal.querySelector('.modal-box') || curModal);
      if (dialogEl) {
        if (!dialogEl.hasAttribute('tabindex')) dialogEl.setAttribute('tabindex', '-1');
        try { dialogEl.focus({ preventScroll: true }); } catch (e) { }
      }
    });
  }

  function syncModalBodyLock() {
    var activeModal = getTopActiveModal();
    var hasActive = !!activeModal;
    if (hasActive) {
      focusActiveModal();
    }
    if (hasActive === _isLocked) return;
    _isLocked = hasActive;

    var root = document.documentElement;
    var body = document.body;
    if (!root || !body) return;

    if (hasActive) {
      var ae = document.activeElement;
      if (ae && ae !== body && ae !== root && !ae.closest('.modal-overlay')) {
        _lastFocusedBeforeModal = ae;
      }
      var scrollbarW = window.innerWidth - root.clientWidth;
      _prevPaddingRight = body.style.paddingRight || '';
      if (scrollbarW > 0) {
        var computedPr = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = (computedPr + scrollbarW) + 'px';
      }
      root.classList.add('modal-open');
      body.classList.add('modal-open');
      focusActiveModal();
    } else {
      root.classList.remove('modal-open');
      body.classList.remove('modal-open');
      body.style.paddingRight = _prevPaddingRight;
      var toRestore = _lastFocusedBeforeModal;
      _lastFocusedBeforeModal = null;
      if (toRestore && toRestore.isConnected && typeof toRestore.focus === 'function') {
        try { toRestore.focus({ preventScroll: true }); } catch (e) { }
      }
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !_isLocked) return;
    var modalEl = getTopActiveModal();
    if (!modalEl) return;
    var focusables = getModalFocusableElements(modalEl);
    if (!focusables.length) {
      e.preventDefault();
      return;
    }
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (!modalEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === modalEl) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  function canScrollInModal(startEl, deltaY) {
    var el = startEl;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.classList && el.classList.contains('modal-overlay')) return false;
      var style = window.getComputedStyle(el);
      var ovY = style ? style.overflowY : '';
      if ((ovY === 'auto' || ovY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        if (deltaY === 0) return true;
        if (deltaY > 0 && el.scrollTop > 0) return true;
        if (deltaY < 0 && (el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  document.addEventListener('touchstart', function (e) {
    if (_isLocked && e.touches && e.touches.length) {
      _touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!_isLocked) return;
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }
    var deltaY = (e.touches && e.touches.length) ? (e.touches[0].clientY - _touchStartY) : 0;
    if (!canScrollInModal(target, deltaY)) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('wheel', function (e) {
    if (!_isLocked) return;
    if (!canScrollInModal(e.target, -e.deltaY)) {
      e.preventDefault();
    }
  }, { passive: false });

  if (typeof MutationObserver === 'function') {
    var obs = new MutationObserver(syncModalBodyLock);
    document.querySelectorAll('.modal-overlay').forEach(function (el) {
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }
  syncModalBodyLock();
})();

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (typeof closeAllBaitDropdowns === 'function') closeAllBaitDropdowns();
    var topModal = getTopActiveModal();
    if (topModal && topModal.id) {
      closeModalById(topModal.id);
    } else {
      closeAllModals();
    }
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
  applyFilters: applyFilters,
  resetFilters: resetFilters,
  onLocationFilterChange: onLocationFilterChange,
  updateAreaFilterOptions: updateAreaFilterOptions,
  setSizeFilter: setSizeFilter,
  onRangeSizeInput: onRangeSizeInput,
  toggleNowActive: toggleNowActive,
  toggleBestChanceSort: toggleBestChanceSort,
  onSortByChange: onSortByChange,
  toggleTodayHighPrice: toggleTodayHighPrice,
  onTodayHighPricePctInput: onTodayHighPricePctInput,
  toggleOnlyCaught: toggleOnlyCaught,
  openPriceModal: openPriceModal,
  togglePriceChartVisibility: togglePriceChartVisibility,
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
  openProfileModal: openProfileModal,
  closeProfileModal: closeProfileModal,
  openPlayerModal: openPlayerModal,
  togglePlayerBadge: typeof togglePlayerBadge === 'function' ? togglePlayerBadge : function () {},
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
  toggleManualImportFlag: toggleManualImportFlag,
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
  onPlayerSortChange: onPlayerSortChange,
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
  onSearchInput: onSearchInput,
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
  setLocCategoryFilter: setLocCategoryFilter,
  toggleLocIncompleteFilter: toggleLocIncompleteFilter,
  onLocSearchInput: onLocSearchInput,
  resetLocationsFilters: resetLocationsFilters,
  openLocationInFishdex: openLocationInFishdex,
  openLocationInCalendar: openLocationInCalendar,
  renderLocationsView: renderLocationsView,
  setCalStatusFilter: setCalStatusFilter,
  setCalMonthFilter: setCalMonthFilter,
  onCalLocationChange: onCalLocationChange,
  onCalSearchInput: onCalSearchInput,
  resetCalendarFilters: resetCalendarFilters,
  renderCalendarView: renderCalendarView,
  updateCalendarTabPill: updateCalendarTabPill,
  setModalBaitAdvisorTimeMode: setModalBaitAdvisorTimeMode,
  toggleOtherBaitsVisibility: toggleOtherBaitsVisibility,
  toggleModalBaitAdvisorInfo: toggleModalBaitAdvisorInfo,
  toggleModalBaitCompetitors: toggleModalBaitCompetitors,
  openSpotBaitInFishdex: openSpotBaitInFishdex,
  openRemindersModal: openRemindersModal,
  closeRemindersModal: closeRemindersModal,
  openRemindersAlertModal: openRemindersAlertModal,
  closeRemindersAlertModal: closeRemindersAlertModal,
  applyReminderPreset: applyReminderPreset,
  setReminderQuickTime: setReminderQuickTime,
  setReminderQuickInterval: setReminderQuickInterval,
  submitReminderForm: submitReminderForm,
  completeReminder: completeReminder,
  editReminder: editReminder,
  resetReminderForm: resetReminderForm,
  deleteReminder: deleteReminder,
  openChatModal: typeof openChatModal === 'function' ? openChatModal : null,
  closeChatModal: typeof closeChatModal === 'function' ? closeChatModal : null,
  openChatIntroModal: typeof openChatIntroModal === 'function' ? openChatIntroModal : null,
  closeChatIntroModal: typeof closeChatIntroModal === 'function' ? closeChatIntroModal : null,
  backToChatList: typeof backToChatList === 'function' ? backToChatList : null,
  setChatFilterMode: typeof setChatFilterMode === 'function' ? setChatFilterMode : null,
  onChatPlayerSearchInput: typeof onChatPlayerSearchInput === 'function' ? onChatPlayerSearchInput : null,
  clearChatPlayerSearch: typeof clearChatPlayerSearch === 'function' ? clearChatPlayerSearch : null,
  toggleChatSafetyPanel: typeof toggleChatSafetyPanel === 'function' ? toggleChatSafetyPanel : null,
  openChatWithPlayer: typeof openChatWithPlayer === 'function' ? openChatWithPlayer : null,
  openChatRequestModal: typeof openChatRequestModal === 'function' ? openChatRequestModal : null,
  closeChatRequestModal: typeof closeChatRequestModal === 'function' ? closeChatRequestModal : null,
  submitChatRequest: typeof submitChatRequest === 'function' ? submitChatRequest : null,
  selectChatThread: typeof selectChatThread === 'function' ? selectChatThread : null,
  acceptChatRequest: typeof acceptChatRequest === 'function' ? acceptChatRequest : null,
  rejectChatRequest: typeof rejectChatRequest === 'function' ? rejectChatRequest : null,
  cancelChatRequest: typeof cancelChatRequest === 'function' ? cancelChatRequest : null,
  blockChatUser: typeof blockChatUser === 'function' ? blockChatUser : null,
  unblockChatUser: typeof unblockChatUser === 'function' ? unblockChatUser : null,
  sendChatMessage: typeof sendChatMessage === 'function' ? sendChatMessage : null,
  updateChatCharCounter: typeof updateChatCharCounter === 'function' ? updateChatCharCounter : null,
  onChatInputKeyDown: typeof onChatInputKeyDown === 'function' ? onChatInputKeyDown : null,
  openChatReportModal: typeof openChatReportModal === 'function' ? openChatReportModal : null,
  closeChatReportModal: typeof closeChatReportModal === 'function' ? closeChatReportModal : null,
  submitChatReport: typeof submitChatReport === 'function' ? submitChatReport : null,
  loadAdminChatReports: typeof loadAdminChatReports === 'function' ? loadAdminChatReports : null,
  setAdminReportsFilterMode: typeof setAdminReportsFilterMode === 'function' ? setAdminReportsFilterMode : null,
  adminBanChatUser: typeof adminBanChatUser === 'function' ? adminBanChatUser : null,
  adminUpdateReportStatus: typeof adminUpdateReportStatus === 'function' ? adminUpdateReportStatus : null,
  adminUnbanChatUser: typeof adminUnbanChatUser === 'function' ? adminUnbanChatUser : null,
  dismissDeletedChatThread: typeof dismissDeletedChatThread === 'function' ? dismissDeletedChatThread : null,
  saveHideLockedClubPreference: typeof saveHideLockedClubPreference === 'function' ? saveHideLockedClubPreference : null,
  scrollToTop: scrollToTop,
  t: t
};

var _scrollTopRaf = false;

function scrollToTop() {
  var reduceMotion = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: 0,
    behavior: reduceMotion ? 'auto' : 'smooth'
  });
}

function updateScrollTopButton() {
  var btn = document.getElementById('scrollToTopBtn');
  if (!btn) return;

  var scrollY = window.scrollY || window.pageYOffset || 0;
  var isModalOpen = document.body && document.body.classList.contains('modal-open');
  if (scrollY <= 320 || isModalOpen) {
    btn.style.display = 'none';
    return;
  }

  var cookieBanner = document.getElementById('cookieConsentBanner');
  var cookieVisible = !!(cookieBanner && cookieBanner.style.display !== 'none');
  var importBtn = document.getElementById('marketFloatingImportBtn');
  var importVisible = !!(importBtn && importBtn.style.display !== 'none');

  btn.classList.toggle('above-cookie', cookieVisible);
  btn.classList.toggle('above-import-fab', importVisible);
  btn.style.display = 'inline-flex';
}

function scheduleUpdateScrollTopButton() {
  if (_scrollTopRaf) return;
  _scrollTopRaf = true;
  requestAnimationFrame(function () {
    _scrollTopRaf = false;
    updateScrollTopButton();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', scheduleUpdateScrollTopButton, { passive: true });
  window.addEventListener('resize', scheduleUpdateScrollTopButton, { passive: true });
}

// Initialize localization & application (avoid double initial render)
(async function bootApplication() {
  var initialLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || safeStorageGet('fishao_lang') || 'cs';
  var needsLangFetch = !!(window.FISHAO_I18N &&
    typeof window.FISHAO_I18N.isLangLoaded === 'function' &&
    typeof window.FISHAO_I18N.ensureLangLoaded === 'function' &&
    !window.FISHAO_I18N.isLangLoaded(initialLang));

  var langPromise = null;
  if (needsLangFetch) {
    langPromise = window.FISHAO_I18N.ensureLangLoaded(initialLang);
    await Promise.race([
      langPromise,
      new Promise(function (resolve) { setTimeout(resolve, 450); })
    ]);
  }

  setLanguage(initialLang, { skipRender: true, skipEnsure: true });

  var initialRoute = getHashOrQueryRoute();
  var targetTab = (initialRoute.tab && initialRoute.tab !== "all") ? initialRoute.tab : "all";
  switchView(targetTab, true);

  updateAuthUI();
  updateCaughtStats();
  if (typeof populatePlayerFishFilterDropdown === 'function') populatePlayerFishFilterDropdown();

  if (initialRoute.fishId) {
    openPriceModal(initialRoute.fishId, true);
  }

  if (langPromise && !window.FISHAO_I18N.isLangLoaded(initialLang)) {
    langPromise.then(function (loaded) {
      if (loaded && window.FISHAO_I18N.currentLang === initialLang) {
        setLanguage(initialLang, { skipEnsure: true });
      }
    });
  }

  // Setup popstate & hashchange listeners for back/forward browser navigation
  window.addEventListener('popstate', handleRoute);
  window.addEventListener('hashchange', handleRoute);

  if (typeof updateRemindersBellBadge === 'function') {
    updateRemindersBellBadge();
  }
  if (typeof checkChatIntroOnStartup === 'function') {
    checkChatIntroOnStartup();
  }
  if (typeof checkRemindersOnStartup === 'function') {
    checkRemindersOnStartup(false);
  }

  initFirebaseSync();
})();

// Register Service Worker for offline/long-term image caching and prune stale hashed assets
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    var hadController = !!navigator.serviceWorker.controller;
    var refreshingBySw = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || refreshingBySw) return;
      refreshingBySw = true;
      if (typeof window.__fishaoShowUpdateBanner === 'function') {
        window.__fishaoShowUpdateBanner();
      }
    });

    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      var sendPrune = function (worker) {
        if (!worker) return;
        try {
          var activeAssets = [];
          document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(function (el) {
            var rawUrl = el.getAttribute('src') || el.getAttribute('href') || '';
            if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
              activeAssets.push(new URL(rawUrl, window.location.href).pathname);
            }
          });
          worker.postMessage({ type: 'PRUNE_STATIC', activeAssets: activeAssets });
        } catch (e) { }
      };
      if (reg.active) sendPrune(reg.active);
      else if (navigator.serviceWorker.controller) sendPrune(navigator.serviceWorker.controller);

      if (reg.waiting && navigator.serviceWorker.controller && typeof window.__fishaoShowUpdateBanner === 'function') {
        window.__fishaoShowUpdateBanner();
      }
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller && typeof window.__fishaoShowUpdateBanner === 'function') {
            window.__fishaoShowUpdateBanner();
          }
        });
      });
    }).catch(function () { });
  });
}

// Check for new build reliably on desktop & mobile (initial delay, resume, bfcache, interval)
(function setupUpdateCheck() {
  var lastVersionCheck = 0;
  var CHECK_THROTTLE_MS = 45 * 1000;
  var PERIODIC_CHECK_MS = 3 * 60 * 1000;
  var initialVersion = window.FISHAO_APP_VERSION || null;
  var isBannerDismissed = false;

  function checkAppVersion(force) {
    if (window.location.protocol === 'file:' || isBannerDismissed) return;
    var now = Date.now();
    if (!force && lastVersionCheck && (now - lastVersionCheck) < CHECK_THROTTLE_MS) {
      return;
    }
    lastVersionCheck = now;

    fetch('/version.json?t=' + now, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.version) return;
        if (!initialVersion) {
          initialVersion = data.version;
          return;
        }
        if (data.version !== initialVersion) {
          showUpdateBanner();
        }
      })
      .catch(function () { });
  }

  function forceHardReload() {
    var curUrl = window.location.href.split('#')[0];
    Promise.all([
      fetch(curUrl, { cache: 'reload' }).catch(function () { return null; }),
      ('serviceWorker' in navigator)
        ? navigator.serviceWorker.getRegistration().then(function (r) { return r ? r.update() : null; }).catch(function () { return null; })
        : Promise.resolve(null)
    ]).finally(function () {
      window.location.reload();
    });
  }

  function showUpdateBanner() {
    if (isBannerDismissed || document.getElementById('appUpdateBanner')) return;
    var banner = document.createElement('div');
    banner.id = 'appUpdateBanner';
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:10005;background:#1e293b;color:#f8fafc;border:1px solid #38bdf8;border-radius:12px;padding:10px 14px;box-shadow:0 10px 28px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;width:calc(100vw - 24px);max-width:390px;box-sizing:border-box;';
    var msg = document.createElement('span');
    msg.style.cssText = 'flex:1;line-height:1.35;';
    msg.textContent = '🔄 ' + (typeof t === 'function' && t('app_update_available') !== 'app_update_available' ? t('app_update_available') : 'Je dostupná nová verze webu.');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = (typeof t === 'function' && t('app_update_reload') !== 'app_update_reload' ? t('app_update_reload') : 'Obnovit');
    btn.style.cssText = 'background:#38bdf8;color:#0f172a;border:none;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;';
    btn.onclick = function () {
      btn.disabled = true;
      btn.style.opacity = '0.7';
      forceHardReload();
    };
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'background:transparent;color:#94a3b8;border:none;font-size:20px;line-height:1;cursor:pointer;padding:0 4px;flex-shrink:0;';
    closeBtn.onclick = function () {
      isBannerDismissed = true;
      banner.remove();
    };
    banner.appendChild(msg);
    banner.appendChild(btn);
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
  }

  window.__fishaoShowUpdateBanner = showUpdateBanner;
  window.__fishaoCheckAppVersion = checkAppVersion;

  // Check shortly after boot in case mobile/SW/HTTP cache served an older HTML shell
  setTimeout(function () {
    checkAppVersion(true);
  }, 2500);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkAppVersion(false);
    }
  });

  window.addEventListener('pageshow', function (ev) {
    if (ev && ev.persisted) {
      checkAppVersion(true);
    } else {
      checkAppVersion(false);
    }
  });

  window.addEventListener('focus', function () {
    checkAppVersion(false);
  });

  setInterval(function () {
    if (document.visibilityState === 'visible') {
      checkAppVersion(true);
    }
  }, PERIODIC_CHECK_MS);
})();

