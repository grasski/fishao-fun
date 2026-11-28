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
  var shopItem = null;

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

    // 1b. Check for guide shop / decoration detail modal route: #shop-<kind>-<id> or #decoration-<id>
    if (!fishId && hash) {
      var shopMatch = /^shop-(bait|rod|float|resource)-(\d+)$/.exec(hash);
      var decMatch = !shopMatch ? /^decoration-(\d+)$/.exec(hash) : null;
      if (shopMatch) {
        shopItem = { kind: shopMatch[1], id: parseInt(shopMatch[2], 10) };
        tab = 'guide_shop';
      } else if (decMatch) {
        shopItem = { kind: 'decoration', id: parseInt(decMatch[1], 10) };
        tab = 'guide_decorations';
      }
    }

    // 2. Check for tab route
    var rawTab = tabQuery || hash;
    if (!tab && rawTab) {
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
      } else if (rawTab === 'guide' || rawTab === 'pruvodce' || rawTab === 'poradnik' || rawTab === 'tree' || rawTab === 'stromecek' || rawTab === 'guide_tree' || rawTab === 'guide-tree') {
        tab = 'guide_tree';
      } else if (rawTab === 'line' || rawTab === 'vlasec' || rawTab === 'zyka' || rawTab === 'zylka' || rawTab === 'guide_line' || rawTab === 'guide-line') {
        tab = 'guide_line';
      } else if (rawTab === 'shop' || rawTab === 'obchod' || rawTab === 'sklep' || rawTab === 'guide_shop' || rawTab === 'guide-shop') {
        tab = 'guide_shop';
      } else if (rawTab === 'decorations' || rawTab === 'dekorace' || rawTab === 'dekoracje' || rawTab === 'decoratie' || rawTab === 'decoratiuni' || rawTab === 'dekorasyon' || rawTab === 'guide_decorations' || rawTab === 'guide-decorations') {
        tab = 'guide_decorations';
      } else if (rawTab === 'all' || rawTab === 'encyklopedie' || rawTab === 'ryby') {
        tab = 'all';
      }
    }
  } catch (e) { }

  return { tab: tab, fishId: fishId, shopItem: shopItem };
}

function syncUrlRoute(view, fishId, replace, shopItem) {
  if (isHandlingRoute) return;
  try {
    var targetHash = '';
    if (fishId) {
      targetHash = '#fish-' + fishId;
    } else if (shopItem && shopItem.kind && shopItem.id) {
      targetHash = (shopItem.kind === 'decoration')
        ? ('#decoration-' + shopItem.id)
        : ('#shop-' + shopItem.kind + '-' + shopItem.id);
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

    var stateObj = { view: view, fishId: fishId || null, shopItem: shopItem || null };
    if (window.history) {
      if (replace && window.history.replaceState) {
        window.history.replaceState(stateObj, '', newUrl);
      } else if (window.history.pushState) {
        window.history.pushState(stateObj, '', newUrl);
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
    } else if (!route.tab && !route.fishId && !route.shopItem && currentView !== 'all') {
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

    // 3. Open or close guide shop / decoration detail modal
    var shopModal = document.getElementById('shopItemModalOverlay');
    var isShopModalActive = shopModal && shopModal.classList.contains('active');

    if (route.shopItem) {
      if (typeof openGuideShopItemModal === 'function') {
        openGuideShopItemModal(route.shopItem.kind, route.shopItem.id, true);
      }
    } else if (isShopModalActive) {
      if (typeof closeGuideShopItemModal === 'function') {
        closeGuideShopItemModal(true);
      }
    }
  } catch (e) {
  } finally {
    isHandlingRoute = false;
  }
}

function syncMobileNavTrigger() {
  var navBar = document.getElementById("mainNavBar");
  var tabsWrap = document.getElementById("mainNavTabs");
  if (!navBar || !tabsWrap) return;

  var activeTab = tabsWrap.querySelector(".nav-tab.active");
  if (!activeTab) return;

  var themes = ["blue", "yellow", "purple", "teal", "gold", "green", "cyan", "orange"];
  var theme = "blue";
  for (var i = 0; i < themes.length; i++) {
    if (activeTab.classList.contains(themes[i])) {
      theme = themes[i];
      break;
    }
  }
  navBar.setAttribute("data-active-theme", theme);

  tabsWrap.querySelectorAll(".nav-tab").forEach(function (btn) {
    if (btn === activeTab) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  var iconEl = document.getElementById("mobileNavCurrentIcon");
  var titleEl = document.getElementById("mobileNavCurrentTitle");
  var pillEl = document.getElementById("mobileNavCurrentPill");
  var srcIcon = activeTab.querySelector(".tab-icon");
  var srcTitle = activeTab.querySelector(".tab-title");
  var srcPill = activeTab.querySelector(".tab-pill");

  if (iconEl && srcIcon) iconEl.textContent = srcIcon.textContent.trim();
  if (titleEl && srcTitle) titleEl.textContent = srcTitle.textContent.trim();
  if (pillEl) {
    var pillText = srcPill ? srcPill.textContent.trim() : "";
    if (pillText) {
      pillEl.textContent = pillText;
      pillEl.classList.remove("is-empty");
      pillEl.classList.toggle("pill-closed", !!(srcPill && srcPill.classList.contains("pill-closed")));
    } else {
      pillEl.textContent = "";
      pillEl.classList.add("is-empty");
      pillEl.classList.remove("pill-closed");
    }
  }

  var isOpen = navBar.classList.contains("mobile-open");
  var labelEl = document.getElementById("mobileNavHamburgerLabel");
  if (labelEl) {
    var lblKey = isOpen ? "nav_menu_close" : "nav_menu_btn";
    var lblText = t(lblKey);
    labelEl.setAttribute("data-i18n", lblKey);
    if (lblText && lblText !== lblKey) labelEl.textContent = lblText;
  }
}

function toggleMobileNav(forceOpen) {
  var navBar = document.getElementById("mainNavBar");
  var trigger = document.getElementById("mobileNavTrigger");
  if (!navBar) return;
  var nextOpen = (typeof forceOpen === "boolean") ? forceOpen : !navBar.classList.contains("mobile-open");
  navBar.classList.toggle("mobile-open", nextOpen);
  if (trigger) trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  syncMobileNavTrigger();
}

function closeMobileNav() {
  var navBar = document.getElementById("mainNavBar");
  if (navBar && navBar.classList.contains("mobile-open")) {
    toggleMobileNav(false);
  }
}

function switchView(view, skipSync) {
  var prevView = currentView;
  var isInClub = !!(currentUser && currentClubId);
  if (view === "club" && !isInClub) {
    view = "all";
  }
  if (view === "guide") {
    if (typeof currentGuideSubTab === "string" && currentGuideSubTab === "line") view = "guide_line";
    else if (typeof currentGuideSubTab === "string" && currentGuideSubTab === "shop") view = "guide_shop";
    else if (typeof currentGuideSubTab === "string" && currentGuideSubTab === "decorations") view = "guide_decorations";
    else view = "guide_tree";
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
  var isGuideView = (view === "guide_tree" || view === "guide_line" || view === "guide_shop" || view === "guide_decorations");

  var tabAllEl = document.getElementById("tabAll");
  var tabMarketEl = document.getElementById("tabMarket");
  var tabClubManageEl = document.getElementById("tabClubManage");
  var tabPlayersEl = document.getElementById("tabPlayers");
  var tabGuideEl = document.getElementById("tabGuide");
  if (tabAllEl) tabAllEl.classList.toggle("active", isEncyclopediaView);
  if (tabMarketEl) tabMarketEl.classList.toggle("active", view === "market");
  if (tabClubManageEl) tabClubManageEl.classList.toggle("active", isClubView);
  if (tabPlayersEl) tabPlayersEl.classList.toggle("active", view === "players");
  if (tabGuideEl) tabGuideEl.classList.toggle("active", isGuideView);
  syncMobileNavTrigger();
  closeMobileNav();

  var subTabMap = {
    "all": "subTabAll",
    "locations": "tabLocations",
    "calendar": "tabCalendar",
    "club_manage": "subTabClubManage",
    "club": "tabClub",
    "guide_tree": "subTabGuideTree",
    "guide_line": "subTabGuideLine",
    "guide_shop": "subTabGuideShop",
    "guide_decorations": "subTabGuideDecorations"
  };
  ["subTabAll", "tabLocations", "tabCalendar", "subTabClubManage", "tabClub", "subTabGuideTree", "subTabGuideLine", "subTabGuideShop", "subTabGuideDecorations"].forEach(function (tId) {
    var el = document.getElementById(tId);
    if (el) el.classList.toggle("active", subTabMap[view] === tId);
  });

  var subNavEncyclopedia = document.getElementById("subNavEncyclopedia");
  var subNavClub = document.getElementById("subNavClub");
  var subNavGuide = document.getElementById("subNavGuide");
  if (subNavEncyclopedia) subNavEncyclopedia.style.display = isEncyclopediaView ? "flex" : "none";
  if (subNavClub) subNavClub.style.display = (isClubView && isInClub) ? "flex" : "none";
  if (subNavGuide) subNavGuide.style.display = isGuideView ? "flex" : "none";

  var bClub = document.getElementById("bannerClub");
  var bCollection = document.getElementById("bannerCollection");
  var bMarket = document.getElementById("bannerMarket");
  var bPlayers = document.getElementById("bannerPlayers");
  var secManage = document.getElementById("sectionClubManage");
  var secTable = document.getElementById("sectionFishTable");
  var secPlayers = document.getElementById("sectionPlayers");
  var secLocations = document.getElementById("sectionLocations");
  var secCalendar = document.getElementById("sectionCalendar");
  var secGuide = document.getElementById("sectionGuide");
  var filterCard = document.getElementById("filterCard");
  var gateClub = document.getElementById("gateClubManage");
  var manageContent = document.getElementById("manageClubContent");
  var gatePlayers = document.getElementById("gatePlayers");
  var playersContent = document.getElementById("playersContent");

  if (bClub) bClub.style.display = (view === "club") ? "flex" : "none";
  if (bCollection) bCollection.style.display = (view === "all") ? "flex" : "none";
  if (bMarket) bMarket.style.display = (view === "market") ? "flex" : "none";
  if (bPlayers) bPlayers.style.display = (view === "players" && currentUser) ? "flex" : "none";
  if (secGuide) secGuide.style.display = isGuideView ? "block" : "none";

  var subNoticePlayers = document.getElementById("subNoticePlayers");
  var subNoticeClubs = document.getElementById("subNoticeClubs");
  if (subNoticePlayers) subNoticePlayers.style.display = (view === "players") ? "flex" : "none";
  if (subNoticeClubs) subNoticeClubs.style.display = isClubView ? "flex" : "none";

  updateMarketTabStatus();
  if (typeof updateCalendarTabPill === 'function') updateCalendarTabPill();

  if (isGuideView) {
    if (secPlayers) secPlayers.style.display = "none";
    if (secManage) secManage.style.display = "none";
    if (secLocations) secLocations.style.display = "none";
    if (secCalendar) secCalendar.style.display = "none";
    if (secTable) secTable.style.display = "none";
    if (filterCard) filterCard.style.display = "none";
    if (typeof renderGuideView === 'function') {
      renderGuideView(view === "guide_line" ? "line" : (view === "guide_shop" ? "shop" : (view === "guide_decorations" ? "decorations" : "tree")));
    }
    updateCaughtStats();
    updateScrollTopButton();
    return;
  }

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
    updateScrollTopButton();
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
    updateScrollTopButton();
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
    updateScrollTopButton();
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
    updateScrollTopButton();
    return;
  } else {
    if (secCalendar) secCalendar.style.display = "none";
  }

  if (secTable) secTable.style.display = "block";
  if (filterCard) {
    filterCard.style.display = "flex";
    filterCard.classList.toggle("market-mode", view === "market");
  }

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

var _baseDocumentTitle = (typeof document !== 'undefined' && document.title)
  ? document.title.replace(/^\(\d+\+?\)\s+/, '')
  : 'FISHAO Tracker';
var _browserActivityCount = 0;
var _browserOrigFaviconLinks = null;
var _browserFaviconBaseImg = null;
var _browserFaviconBaseLoading = false;
var _browserFaviconBaseFailed = false;
var _browserFaviconCache = Object.create(null);
var _browserAppliedFaviconKey = '';

function setBaseDocumentTitle(title) {
  if (typeof title !== 'string' || !title) return;
  _baseDocumentTitle = title.replace(/^\(\d+\+?\)\s+/, '');
  applyBrowserTabTitle(_browserActivityCount);
}

function getBrowserActivityCount() {
  var unreadChat = (typeof getUnreadChatCount === 'function') ? getUnreadChatCount() : 0;
  var dueReminders = (typeof getDueReminders === 'function') ? getDueReminders().length : 0;
  return Math.max(0, (unreadChat || 0) + (dueReminders || 0));
}

function applyBrowserTabTitle(count) {
  if (typeof document === 'undefined') return;
  var base = _baseDocumentTitle || 'FISHAO Tracker';
  var nextTitle = count > 0
    ? ('(' + (count > 99 ? '99+' : String(count)) + ') ' + base)
    : base;
  if (document.title !== nextTitle) {
    document.title = nextTitle;
  }
}

function captureOriginalFaviconLinks() {
  if (_browserOrigFaviconLinks !== null || typeof document === 'undefined' || !document.head) return;
  var nodes = document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  _browserOrigFaviconLinks = [];
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (el.getAttribute('data-fishao-badge-icon') === '1') continue;
    _browserOrigFaviconLinks.push({
      rel: el.getAttribute('rel') || 'icon',
      type: el.getAttribute('type') || '',
      sizes: el.getAttribute('sizes') || '',
      href: el.getAttribute('href') || ''
    });
  }
}

function getPreferredFaviconHref() {
  captureOriginalFaviconLinks();
  var list = _browserOrigFaviconLinks || [];
  var best = '';
  for (var i = 0; i < list.length; i++) {
    if (list[i].type === 'image/png' && list[i].sizes === '96x96' && list[i].href) return list[i].href;
  }
  for (var j = 0; j < list.length; j++) {
    if (list[j].type === 'image/png' && list[j].href) return list[j].href;
  }
  for (var k = 0; k < list.length; k++) {
    if (list[k].href) { best = list[k].href; break; }
  }
  return best || '/favicon-96x96.png';
}

function renderBadgedFaviconDataUrl(label, baseImg) {
  if (typeof document === 'undefined') return '';
  try {
    var size = 64;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) return '';

    if (baseImg && baseImg.naturalWidth > 0) {
      ctx.drawImage(baseImg, 0, 0, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a5f';
      ctx.fill();
    }

    var cx = 44;
    var cy = 20;
    var r = 19;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = (label.length > 1 ? '800 21px ' : '800 27px ') + 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);

    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}

function setDocumentFaviconToDataUrl(dataUrl) {
  if (typeof document === 'undefined' || !document.head || !dataUrl) return;
  captureOriginalFaviconLinks();
  var existing = document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  for (var i = 0; i < existing.length; i++) {
    existing[i].parentNode.removeChild(existing[i]);
  }
  var link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.setAttribute('data-fishao-badge-icon', '1');
  link.href = dataUrl;
  document.head.appendChild(link);
}

function restoreOriginalFaviconLinks() {
  if (typeof document === 'undefined' || !document.head || !_browserOrigFaviconLinks) return;
  var existing = document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  for (var i = 0; i < existing.length; i++) {
    existing[i].parentNode.removeChild(existing[i]);
  }
  for (var j = 0; j < _browserOrigFaviconLinks.length; j++) {
    var spec = _browserOrigFaviconLinks[j];
    var link = document.createElement('link');
    link.rel = spec.rel || 'icon';
    if (spec.type) link.type = spec.type;
    if (spec.sizes) link.sizes = spec.sizes;
    if (spec.href) link.href = spec.href;
    document.head.appendChild(link);
  }
}

function updateBrowserFaviconBadge(count) {
  if (typeof document === 'undefined' || !document.head) return;
  if (count <= 0) {
    if (_browserAppliedFaviconKey !== '') {
      _browserAppliedFaviconKey = '';
      restoreOriginalFaviconLinks();
    }
    return;
  }

  var label = count > 9 ? '9+' : String(count);
  if (_browserAppliedFaviconKey === label) return;

  if (_browserFaviconCache[label]) {
    _browserAppliedFaviconKey = label;
    setDocumentFaviconToDataUrl(_browserFaviconCache[label]);
    return;
  }

  var paintAndApply = function (img) {
    if (_browserActivityCount <= 0) return;
    var curLabel = _browserActivityCount > 9 ? '9+' : String(_browserActivityCount);
    if (_browserAppliedFaviconKey === curLabel) return;
    var url = _browserFaviconCache[curLabel] || renderBadgedFaviconDataUrl(curLabel, img);
    if (!url) return;
    _browserFaviconCache[curLabel] = url;
    _browserAppliedFaviconKey = curLabel;
    setDocumentFaviconToDataUrl(url);
  };

  if (_browserFaviconBaseImg || _browserFaviconBaseFailed || typeof Image === 'undefined') {
    paintAndApply(_browserFaviconBaseImg);
    return;
  }

  if (_browserFaviconBaseLoading) return;
  _browserFaviconBaseLoading = true;
  captureOriginalFaviconLinks();

  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    _browserFaviconBaseLoading = false;
    _browserFaviconBaseImg = img;
    paintAndApply(img);
  };
  img.onerror = function () {
    _browserFaviconBaseLoading = false;
    _browserFaviconBaseFailed = true;
    paintAndApply(null);
  };
  img.src = getPreferredFaviconHref();
}

function updateBrowserActivityIndicator() {
  var count = getBrowserActivityCount();
  _browserActivityCount = count;

  applyBrowserTabTitle(count);
  updateBrowserFaviconBadge(count);

  try {
    if (typeof navigator !== 'undefined') {
      if (count > 0 && typeof navigator.setAppBadge === 'function') {
        var p1 = navigator.setAppBadge(count);
        if (p1 && typeof p1.catch === 'function') p1.catch(function () { });
      } else if (count === 0 && typeof navigator.clearAppBadge === 'function') {
        var p2 = navigator.clearAppBadge();
        if (p2 && typeof p2.catch === 'function') p2.catch(function () { });
      }
    }
  } catch (e) { }
}

function updateStaticTranslations() {
  var lang = getLang();
  document.documentElement.lang = lang;

  var langSelect = document.getElementById("langSelect");
  if (langSelect && langSelect.value !== lang) langSelect.value = lang;

  var wikiLink = document.getElementById("footerWikiLink");
  if (wikiLink) {
    var wikiPaths = { cs: "/ryby/", en: "/en/fish/", pl: "/pl/ryby/", nl: "/nl/vissen/", ro: "/ro/pesti/", tr: "/tr/baliklar/" };
    wikiLink.setAttribute("href", wikiPaths[lang] || "/ryby/");
  }

  // Dynamic SEO title & meta description update on language change
  try {
    var pageTitle = t("seo_page_title");
    if (pageTitle && pageTitle !== "seo_page_title") {
      setBaseDocumentTitle(pageTitle);
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
  syncMobileNavTrigger();
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
      // Only rewrite the URL path to /<lang>/ when running on the built site (or already on a localized subpath),
      // so raw local dev servers without /en/index.html don't 404 on F5 reload.
      var curPath = window.location.pathname || '/';
      var isBuiltOrSubpath = !!(window.FISHAO_APP_VERSION || /^\/(en|pl|nl|ro|tr)(\/|$)/i.test(curPath));
      if (isBuiltOrSubpath && /^\/(en|pl|nl|ro|tr)?\/?(index\.html)?$/i.test(curPath)) {
        var nextPath = (lang === 'cs') ? '/' : ('/' + lang + '/');
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
  initRatingFilterOptions();
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
  if (typeof syncProfileLangPicker === 'function') syncProfileLangPicker();
  if (typeof updateCalendarTabPill === 'function') updateCalendarTabPill();
  if ((currentView === 'guide_tree' || currentView === 'guide_line' || currentView === 'guide_shop' || currentView === 'guide_decorations') && typeof renderGuideView === 'function') {
    renderGuideView(currentView === 'guide_line' ? 'line' : (currentView === 'guide_shop' ? 'shop' : (currentView === 'guide_decorations' ? 'decorations' : 'tree')));
  }

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
  if (typeof closeGuideShopItemModal === 'function') closeGuideShopItemModal();
  if (typeof closeGuideSnapshotModal === 'function') closeGuideSnapshotModal();
  if (typeof closeTableSnapshotModal === 'function') closeTableSnapshotModal();
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
  else if (id === 'shopItemModalOverlay' && typeof closeGuideShopItemModal === 'function') closeGuideShopItemModal();
  else if (id === 'guideSnapshotModalOverlay' && typeof closeGuideSnapshotModal === 'function') closeGuideSnapshotModal();
  else if (id === 'tableSnapshotModalOverlay' && typeof closeTableSnapshotModal === 'function') closeTableSnapshotModal();
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
    if (typeof updateScrollTopButton === 'function') updateScrollTopButton();
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
    var navBar = document.getElementById("mainNavBar");
    if (navBar && navBar.classList.contains("mobile-open")) {
      closeMobileNav();
      var trigger = document.getElementById("mobileNavTrigger");
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
      return;
    }
    if (typeof isProfileCountryDropdownOpen === 'function' && isProfileCountryDropdownOpen()) {
      closeProfileCountryDropdown();
      return;
    }
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
  if (typeof isProfileCountryDropdownOpen === 'function' && isProfileCountryDropdownOpen()) {
    var cDrop = document.getElementById("profileCountryDropdown");
    if (cDrop && !cDrop.contains(e.target)) {
      closeProfileCountryDropdown();
    }
  }
  var navBar = document.getElementById("mainNavBar");
  if (navBar && navBar.classList.contains("mobile-open") && !navBar.contains(e.target)) {
    closeMobileNav();
  }
});

// Export to global window object
window.fishaoApp = {
  switchView: switchView,
  toggleMobileNav: toggleMobileNav,
  closeMobileNav: closeMobileNav,
  setTimezone: setTimezone,
  applyFilters: applyFilters,
  resetFilters: resetFilters,
  onLocationFilterChange: onLocationFilterChange,
  onPlayerLevelInput: onPlayerLevelInput,
  updateAreaFilterOptions: updateAreaFilterOptions,
  setSizeFilter: setSizeFilter,
  onRangeSizeInput: onRangeSizeInput,
  toggleNowActive: toggleNowActive,
  toggleBestChanceSort: toggleBestChanceSort,
  onSortByChange: onSortByChange,
  toggleTodayHighPrice: toggleTodayHighPrice,
  onTodayHighPricePctInput: onTodayHighPricePctInput,
  toggleOnlyCaught: toggleOnlyCaught,
  toggleOnlyBackyard: toggleOnlyBackyard,
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
  selectPreferredLang: selectPreferredLang,
  toggleProfileCountryDropdown: toggleProfileCountryDropdown,
  onProfileCountrySearchInput: onProfileCountrySearchInput,
  onProfileCountrySearchKeyDown: onProfileCountrySearchKeyDown,
  onAvatarUrlInput: onAvatarUrlInput,
  saveProfile: saveProfile,
  deleteAccount: deleteAccount,
  exportFirestoreBackup: exportFirestoreBackup,
  toggleManualImportFlag: toggleManualImportFlag,
  triggerAdminJsonImport: triggerAdminJsonImport,
  onAdminJsonFileSelected: onAdminJsonFileSelected,
  resolveConfirmModal: resolveConfirmModal,
  showToast: showToast,
  dismissHeavyLoadBanner: dismissHeavyLoadBanner,
  toggleCaughtFish: toggleCaughtFish,
  cycleCaughtState: cycleCaughtState,
  toggleMissingShiny: toggleMissingShiny,
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
  toggleShinyFromModal: toggleShinyFromModal,
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
  onPlayerRatingSelectionChange: onPlayerRatingSelectionChange,
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
  onGuideCalcChange: typeof onGuideCalcChange === 'function' ? onGuideCalcChange : function () {},
  onGuideRowClick: typeof onGuideRowClick === 'function' ? onGuideRowClick : function () {},
  renderGuideView: typeof renderGuideView === 'function' ? renderGuideView : function () {},
  setGuideShopCategory: typeof setGuideShopCategory === 'function' ? setGuideShopCategory : function () {},
  onGuideShopSearchInput: typeof onGuideShopSearchInput === 'function' ? onGuideShopSearchInput : function () {},
  toggleGuideShopFbOnly: typeof toggleGuideShopFbOnly === 'function' ? toggleGuideShopFbOnly : function () {},
  onGuideShopBaitCatChange: typeof onGuideShopBaitCatChange === 'function' ? onGuideShopBaitCatChange : function () {},
  toggleGuideShopBestValue: typeof toggleGuideShopBestValue === 'function' ? toggleGuideShopBestValue : function () {},
  openGuideShopItemModal: typeof openGuideShopItemModal === 'function' ? openGuideShopItemModal : function () {},
  closeGuideShopItemModal: typeof closeGuideShopItemModal === 'function' ? closeGuideShopItemModal : function () {},
  setGuideDecType: typeof setGuideDecType === 'function' ? setGuideDecType : function () {},
  onGuideDecSearchInput: typeof onGuideDecSearchInput === 'function' ? onGuideDecSearchInput : function () {},
  onGuideDecCollectionChange: typeof onGuideDecCollectionChange === 'function' ? onGuideDecCollectionChange : function () {},
  onGuideDecRarityChange: typeof onGuideDecRarityChange === 'function' ? onGuideDecRarityChange : function () {},
  onGuideDecSourceChange: typeof onGuideDecSourceChange === 'function' ? onGuideDecSourceChange : function () {},
  onGuideDecSortChange: typeof onGuideDecSortChange === 'function' ? onGuideDecSortChange : function () {},
  resetGuideDecFilters: typeof resetGuideDecFilters === 'function' ? resetGuideDecFilters : function () {},
  openGuideSnapshotModal: typeof openGuideSnapshotModal === 'function' ? openGuideSnapshotModal : function () {},
  selectGuideSnapshotLang: typeof selectGuideSnapshotLang === 'function' ? selectGuideSnapshotLang : function () {},
  closeGuideSnapshotModal: typeof closeGuideSnapshotModal === 'function' ? closeGuideSnapshotModal : function () {},
  downloadGuideSnapshotPng: typeof downloadGuideSnapshotPng === 'function' ? downloadGuideSnapshotPng : function () {},
  copyGuideSnapshotToClipboard: typeof copyGuideSnapshotToClipboard === 'function' ? copyGuideSnapshotToClipboard : function () {},
  openTableSnapshotModal: typeof openTableSnapshotModal === 'function' ? openTableSnapshotModal : function () {},
  closeTableSnapshotModal: typeof closeTableSnapshotModal === 'function' ? closeTableSnapshotModal : function () {},
  selectTableSnapshotLang: typeof selectTableSnapshotLang === 'function' ? selectTableSnapshotLang : function () {},
  toggleTableSnapshotHighlight: typeof toggleTableSnapshotHighlight === 'function' ? toggleTableSnapshotHighlight : function () {},
  clearTableSnapshotHighlight: typeof clearTableSnapshotHighlight === 'function' ? clearTableSnapshotHighlight : function () {},
  onTableSnapshotFishSearch: typeof onTableSnapshotFishSearch === 'function' ? onTableSnapshotFishSearch : function () {},
  selectTableSnapshotFishFromSearch: typeof selectTableSnapshotFishFromSearch === 'function' ? selectTableSnapshotFishFromSearch : function () {},
  setTableSnapshotScope: typeof setTableSnapshotScope === 'function' ? setTableSnapshotScope : function () {},
  shiftTableSnapshotWindow: typeof shiftTableSnapshotWindow === 'function' ? shiftTableSnapshotWindow : function () {},
  toggleTableSnapshotTz: typeof toggleTableSnapshotTz === 'function' ? toggleTableSnapshotTz : function () {},
  toggleTableSnapshotCaught: typeof toggleTableSnapshotCaught === 'function' ? toggleTableSnapshotCaught : function () {},
  downloadTableSnapshotPng: typeof downloadTableSnapshotPng === 'function' ? downloadTableSnapshotPng : function () {},
  copyTableSnapshotToClipboard: typeof copyTableSnapshotToClipboard === 'function' ? copyTableSnapshotToClipboard : function () {},
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
  if (typeof updateTableSnapshotFab === 'function') {
    updateTableSnapshotFab();
  }
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
  var snapshotBtn = document.getElementById('tableSnapshotFab');
  var snapshotVisible = !!(snapshotBtn && snapshotBtn.style.display !== 'none');

  btn.classList.toggle('above-cookie', cookieVisible);
  btn.classList.toggle('above-import-fab', importVisible);
  btn.classList.toggle('above-snapshot-fab', snapshotVisible);
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
  } else if (initialRoute.shopItem && typeof openGuideShopItemModal === 'function') {
    openGuideShopItemModal(initialRoute.shopItem.kind, initialRoute.shopItem.id, true);
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

  if (typeof initFirebaseSync === 'function') {
    initFirebaseSync();
  } else if (typeof checkRemindersOnStartup === 'function') {
    checkRemindersOnStartup(false);
  }
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

  function positionUpdateBanner() {
    var banner = document.getElementById('appUpdateBanner');
    if (!banner) return;
    var heavy = document.getElementById('heavyLoadBanner');
    if (heavy && heavy.classList.contains('active') && heavy.offsetHeight > 0) {
      var rect = heavy.getBoundingClientRect();
      if (rect.bottom > 0) {
        banner.style.top = (Math.round(rect.bottom) + 10) + 'px';
        return;
      }
    }
    banner.style.top = 'max(12px,env(safe-area-inset-top))';
  }

  function showUpdateBanner() {
    if (isBannerDismissed || document.getElementById('appUpdateBanner')) return;
    var banner = document.createElement('div');
    banner.id = 'appUpdateBanner';
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:10080;background:#1e293b;color:#f8fafc;border:1px solid #38bdf8;border-radius:12px;padding:10px 14px;box-shadow:0 10px 28px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;width:calc(100vw - 24px);max-width:390px;box-sizing:border-box;transition:top 0.2s ease;';
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
    positionUpdateBanner();
  }

  window.__fishaoShowUpdateBanner = showUpdateBanner;
  window.__fishaoPositionUpdateBanner = positionUpdateBanner;
  window.__fishaoCheckAppVersion = checkAppVersion;
  window.addEventListener('resize', positionUpdateBanner);

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

