/**
 * FISHAO - Locations Overview & Progress Dashboard (js/locations.js)
 * ------------------------------------------------------------------
 * Renders an interactive overview of all 24 fishing locations,
 * per-location catch progress, live biting fish counts, sub-area
 * breakdowns, and one-click deep links into the Fishdex table.
 */

var locCategoryFilter = 'all'; // 'all' | 'main' | 'special' | 'events'
var locIncompleteOnly = false;
var locSearchQuery = '';

var LOCATION_ICONS = {
  location_1: '🏡',
  location_2: '🌴',
  location_3: '🏖️',
  location_4: '🏔️',
  location_5: '🏜️',
  location_6: '❄️',
  location_7: '⛩️',
  location_8: '⚓',
  location_9: '🦁',
  location_10: '🐊',
  location_11: '🏝️',
  location_12: '🛶',
  location_101: '🐟',
  location_104: '🔺',
  location_108: '🏞️',
  location_110: '🌿',
  location_111: '🏴‍☠️',
  location_112: '🏰',
  location_113: '🏭',
  location_201: '⛵',
  location_202: '🏃',
  location_203: '🏁',
  location_204: '🐍',
  location_300: '🏡'
};

var LOCATION_PREVIEW_IMAGE_IDS = {
  1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true,
  12: true, 104: true, 108: true, 110: true, 112: true, 201: true, 202: true, 204: true, 300: true
};

function getLocationPreviewImage(locKey) {
  var num = getLocationNumericId(locKey);
  if (!LOCATION_PREVIEW_IMAGE_IDS[num]) return null;
  var isSquareIcon = (num === 12);
  return {
    src: '/images/location_preview_' + num + '.webp',
    isIconImg: isSquareIcon
  };
}

var LOCATION_UNLOCK_INFO = {
  location_1: { type: 'free', sortOrder: 1 },
  location_2: { type: 'free', sortOrder: 2 },
  location_3: { type: 'free', sortOrder: 3 },
  location_4: { type: 'level', level: 10, sortOrder: 4 },
  location_5: { type: 'level', level: 20, sortOrder: 5 },
  location_6: { type: 'fish', fishId: 96, sortOrder: 6 },
  location_7: { type: 'level', level: 40, sortOrder: 7 },
  location_8: { type: 'level', level: 60, sortOrder: 8 },
  location_9: { type: 'level', level: 80, sortOrder: 9 },
  location_12: { type: 'level', level: 100, sortOrder: 10 },
  location_10: { type: 'level', level: 120, sortOrder: 11 },
  location_11: { type: 'fc', fc: 50, days: 30, sortOrder: 12 }
};

function getLocationNumericId(locKey) {
  var match = /^location_(\d+)$/.exec(String(locKey || ''));
  return match ? parseInt(match[1], 10) : 9999;
}

function getLocationSortOrder(locKey) {
  var u = LOCATION_UNLOCK_INFO[locKey];
  if (u && typeof u.sortOrder === 'number') return u.sortOrder;
  return getLocationNumericId(locKey);
}

function getLocationUnlockBadgeData(locKey) {
  var u = LOCATION_UNLOCK_INFO[locKey];
  if (!u) return null;
  if (u.type === 'free') {
    var freeText = t('loc_unlock_free');
    return {
      type: 'free',
      cls: 'unlock-free',
      text: '🔓 ' + freeText,
      title: freeText
    };
  }
  if (u.type === 'level') {
    var lvlText = t('loc_unlock_level', { level: u.level });
    var lvlTitle = t('loc_unlock_level_title', { level: u.level });
    return {
      type: 'level',
      cls: 'unlock-level',
      text: '⭐ ' + lvlText,
      title: lvlTitle
    };
  }
  if (u.type === 'fish') {
    var fishObj = (typeof getFishById === 'function') ? getFishById(u.fishId) : null;
    var fishName = (fishObj && window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function')
      ? window.FISHAO_I18N.getFishName(fishObj)
      : (fishObj && fishObj.name ? fishObj.name : ('#' + u.fishId));
    var fishText = t('loc_unlock_fish', { fish: fishName, id: u.fishId });
    var fishTitle = t('loc_unlock_fish_title', { fish: fishName, id: u.fishId });
    return {
      type: 'fish',
      cls: 'unlock-fish',
      fishId: u.fishId,
      text: '🐟 ' + fishText,
      title: fishTitle
    };
  }
  if (u.type === 'fc') {
    var fcText = t('loc_unlock_fc_days', { fc: u.fc, days: u.days });
    var fcTitle = t('loc_unlock_fc_days_title', { fc: u.fc, days: u.days });
    return {
      type: 'fc',
      cls: 'unlock-fc',
      text: '🪙 ' + fcText,
      title: fcTitle
    };
  }
  return null;
}

function getLocationCategoryInfo(locKey) {
  var num = getLocationNumericId(locKey);
  var icon = LOCATION_ICONS[locKey] || '📍';

  if (num >= 1 && num <= 99) {
    return { category: 'main', badgeKey: 'loc_badge_main', icon: icon, order: num };
  }
  if (num === 112) {
    return { category: 'special', badgeKey: 'loc_badge_club', icon: icon, order: num };
  }
  if (num >= 100 && num <= 199) {
    return { category: 'special', badgeKey: 'loc_badge_special', icon: icon, order: num };
  }
  if (num >= 200 && num <= 299) {
    return { category: 'events', badgeKey: 'loc_badge_tournament', icon: icon, order: num };
  }
  if (num === 300) {
    return { category: 'events', badgeKey: 'loc_badge_backyard', icon: icon, order: num };
  }
  return { category: 'special', badgeKey: 'loc_badge_special', icon: icon, order: num };
}

function sortAreaKeysForLocation(areas) {
  var curLang = typeof getLang === 'function' ? getLang() : 'cs';
  return areas.slice().sort(function (a, b) {
    if (typeof getPalmZoneLetter === 'function') {
      var zoneA = getPalmZoneLetter(a);
      var zoneB = getPalmZoneLetter(b);
      if (zoneA && zoneB) return zoneA.localeCompare(zoneB);
    }
    var nameA = (window.FISHAO_I18N && window.FISHAO_I18N.getLocationName) ? window.FISHAO_I18N.getLocationName(a) : a;
    var nameB = (window.FISHAO_I18N && window.FISHAO_I18N.getLocationName) ? window.FISHAO_I18N.getLocationName(b) : b;
    return String(nameA).localeCompare(String(nameB), curLang);
  });
}

function computeLocationsData() {
  var byLoc = Object.create(null);
  var fishes = (typeof allFishes !== 'undefined' && Array.isArray(allFishes)) ? allFishes : [];

  fishes.forEach(function (f) {
    if (!f || !Array.isArray(f.locations)) return;
    f.locations.forEach(function (locKey) {
      if (!locKey) return;
      if (!byLoc[locKey]) byLoc[locKey] = [];
      byLoc[locKey].push(f);
    });
  });

  var locKeys = Object.keys(byLoc).sort(function (a, b) {
    return getLocationSortOrder(a) - getLocationSortOrder(b);
  });

  return locKeys.map(function (locKey) {
    var locFishes = byLoc[locKey];
    var info = getLocationCategoryInfo(locKey);
    var label = (window.FISHAO_I18N && window.FISHAO_I18N.getLocationName)
      ? window.FISHAO_I18N.getLocationName(locKey)
      : locKey;

    var caughtCount = 0;
    var bitingFishes = [];
    var missingBitingFishes = [];
    var seasonalCount = 0;

    locFishes.forEach(function (f) {
      var isCaught = (typeof caughtFishIds !== 'undefined' && caughtFishIds.has(f.id));
      if (isCaught) caughtCount++;

      var isNow = (typeof isFishActiveNow === 'function')
        ? isFishActiveNow(f.raw_times, f.raw_dates)
        : false;
      if (isNow) {
        bitingFishes.push(f);
        if (!isCaught) missingBitingFishes.push(f);
      }
      if (f.raw_dates && f.raw_dates.length > 0) {
        seasonalCount++;
      }
    });

    var rawAreaKeys = (typeof getFishAreasForLocation === 'function')
      ? getFishAreasForLocation(locKey)
      : [];
    var sortedAreaKeys = sortAreaKeysForLocation(rawAreaKeys);
    var areas = sortedAreaKeys.map(function (areaKey) {
      var areaLabel = (window.FISHAO_I18N && window.FISHAO_I18N.getLocationName)
        ? window.FISHAO_I18N.getLocationName(areaKey)
        : areaKey;
      var areaTotal = 0;
      var areaCaught = 0;
      var areaBiting = 0;

      locFishes.forEach(function (f) {
        if (!f.places || f.places.indexOf(areaKey) === -1) return;
        areaTotal++;
        if (typeof caughtFishIds !== 'undefined' && caughtFishIds.has(f.id)) areaCaught++;
        if (typeof isFishActiveNow === 'function' && isFishActiveNow(f.raw_times, f.raw_dates)) areaBiting++;
      });

      return {
        areaKey: areaKey,
        label: areaLabel,
        total: areaTotal,
        caught: areaCaught,
        biting: areaBiting
      };
    });

    var total = locFishes.length;
    var pct = total > 0 ? Math.round((caughtCount / total) * 100) : 0;

    return {
      locKey: locKey,
      label: label,
      category: info.category,
      badgeKey: info.badgeKey,
      icon: info.icon,
      image: getLocationPreviewImage(locKey),
      unlock: getLocationUnlockBadgeData(locKey),
      fishes: locFishes,
      total: total,
      caughtCount: caughtCount,
      missingCount: total - caughtCount,
      pct: pct,
      isComplete: total > 0 && caughtCount >= total,
      bitingFishes: bitingFishes,
      missingBitingFishes: missingBitingFishes,
      seasonalCount: seasonalCount,
      areas: areas
    };
  });
}

function setLocCategoryFilter(cat) {
  locCategoryFilter = cat || 'all';
  renderLocationsView();
}

function toggleLocIncompleteFilter() {
  locIncompleteOnly = !locIncompleteOnly;
  renderLocationsView();
}

var _debouncedRenderLocations = (typeof debounce === 'function')
  ? debounce(function () { renderLocationsView(); }, 150)
  : function () { renderLocationsView(); };

function onLocSearchInput(val) {
  locSearchQuery = String(val || '');
  _debouncedRenderLocations();
}

function resetLocationsFilters(skipRender) {
  locCategoryFilter = 'all';
  locIncompleteOnly = false;
  locSearchQuery = '';
  var searchEl = document.getElementById('locSearchInput');
  if (searchEl) searchEl.value = '';
  if (!skipRender) {
    renderLocationsView();
  }
}

function openLocationInFishdex(locKey, areaKey, timeMode, collMode) {
  if (typeof switchView === 'function') {
    switchView('all');
  }

  var locSelect = document.getElementById('locationFilter');
  if (locSelect) {
    locSelect.value = locKey || '';
  }

  if (typeof updateAreaFilterOptions === 'function') {
    updateAreaFilterOptions();
  }

  var areaSelect = document.getElementById('areaFilter');
  if (areaSelect && areaKey) {
    areaSelect.value = areaKey;
  }

  if (timeMode) {
    var timeSelect = document.getElementById('timeFilter');
    if (timeSelect) timeSelect.value = timeMode;
    filterNowActive = (timeMode === 'now');
    var btnNow = document.getElementById('btnNow');
    if (btnNow) btnNow.classList.toggle('active', filterNowActive);
  }

  if (collMode && collMode !== 'all' && typeof currentUser !== 'undefined' && currentUser) {
    collectionFilterMode = collMode;
    var collAll = document.getElementById('collFilterAll');
    var collCaught = document.getElementById('collFilterCaught');
    var collMissing = document.getElementById('collFilterMissing');
    var collMissingShiny = document.getElementById('collFilterMissingShiny');
    if (collAll) collAll.classList.toggle('active', collMode === 'all');
    if (collCaught) collCaught.classList.toggle('active', collMode === 'caught');
    if (collMissing) collMissing.classList.toggle('active', collMode === 'missing');
    if (collMissingShiny) collMissingShiny.classList.toggle('active', collMode === 'missing_shiny');
  }

  if (typeof applyFilters === 'function') {
    applyFilters();
  }

  var secTable = document.getElementById('sectionFishTable');
  if (secTable && typeof secTable.scrollIntoView === 'function') {
    secTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function openLocationInCalendar(locKey) {
  if (typeof switchView === 'function') {
    switchView('calendar');
  }
  if (typeof calLocationFilter !== 'undefined') {
    calLocationFilter = locKey || '';
  }
  if (typeof calStatusFilter !== 'undefined') {
    calStatusFilter = 'all';
  }
  if (typeof calMonthFilter !== 'undefined') {
    calMonthFilter = 0;
  }
  if (typeof calSearchQuery !== 'undefined') {
    calSearchQuery = '';
  }
  var locSelect = document.getElementById('calLocationFilter');
  if (locSelect) locSelect.value = locKey || '';
  var searchEl = document.getElementById('calSearchInput');
  if (searchEl) searchEl.value = '';
  if (typeof renderCalendarView === 'function') {
    renderCalendarView();
  }
}

function renderLocationsView() {
  var gridEl = document.getElementById('locationsGrid');
  if (!gridEl) return;

  var allLocs = computeLocationsData();
  var isLoggedIn = (typeof currentUser !== 'undefined' && !!currentUser);

  var catCounts = { all: allLocs.length, main: 0, special: 0, events: 0 };
  var completedCount = 0;
  var uniqueBitingIds = new Set();
  var uniqueMissingBitingIds = new Set();

  allLocs.forEach(function (loc) {
    if (catCounts[loc.category] !== undefined) catCounts[loc.category]++;
    if (loc.isComplete) completedCount++;
    loc.bitingFishes.forEach(function (f) { uniqueBitingIds.add(f.id); });
    loc.missingBitingFishes.forEach(function (f) { uniqueMissingBitingIds.add(f.id); });
  });

  // Update summary bar stats
  var completedEl = document.getElementById('locSummaryCompleted');
  if (completedEl) {
    completedEl.innerText = t('loc_view_completed_stat', { done: completedCount, total: allLocs.length });
  }
  var bitingEl = document.getElementById('locSummaryBiting');
  if (bitingEl) {
    bitingEl.innerText = t('loc_view_biting_stat', { count: uniqueBitingIds.size });
  }
  var missingBitingEl = document.getElementById('locSummaryMissingBiting');
  if (missingBitingEl) {
    if (isLoggedIn) {
      missingBitingEl.style.display = 'inline-flex';
      missingBitingEl.innerText = t('loc_view_missing_biting_stat', { count: uniqueMissingBitingIds.size });
    } else {
      missingBitingEl.style.display = 'none';
    }
  }

  // Update category pill labels and active state
  var catBtnMap = [
    { id: 'locCatAll', cat: 'all', key: 'loc_cat_all' },
    { id: 'locCatMain', cat: 'main', key: 'loc_cat_main' },
    { id: 'locCatSpecial', cat: 'special', key: 'loc_cat_special' },
    { id: 'locCatEvents', cat: 'events', key: 'loc_cat_events' }
  ];
  catBtnMap.forEach(function (item) {
    var btn = document.getElementById(item.id);
    if (!btn) return;
    btn.innerText = t(item.key, { count: catCounts[item.cat] || 0 });
    btn.classList.toggle('active', locCategoryFilter === item.cat);
  });

  var incBtn = document.getElementById('locIncompleteBtn');
  if (incBtn) {
    incBtn.classList.toggle('active', locIncompleteOnly);
  }

  // Apply view filters
  var qNorm = normStr(locSearchQuery);
  var filtered = allLocs.filter(function (loc) {
    if (locCategoryFilter !== 'all' && loc.category !== locCategoryFilter) return false;
    if (locIncompleteOnly && loc.isComplete) return false;
    if (qNorm) {
      var nameMatch = normStr(loc.label).indexOf(qNorm) !== -1;
      var areaMatch = loc.areas.some(function (a) {
        return normStr(a.label).indexOf(qNorm) !== -1;
      });
      var fishMatch = loc.fishes.some(function (f) {
        if (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function') {
          return window.FISHAO_I18N.matchesFishSearch(f, locSearchQuery);
        }
        return normStr(f.name).indexOf(qNorm) !== -1;
      });
      var unlockMatch = !!(loc.unlock && normStr(loc.unlock.text).indexOf(qNorm) !== -1);
      if (!nameMatch && !areaMatch && !fishMatch && !unlockMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = '<div class="loc-empty-state">' + escapeHtml(t('loc_empty_state')) + '</div>';
    return;
  }

  var curLang = typeof getLang === 'function' ? getLang() : 'cs';

  gridEl.innerHTML = filtered.map(function (loc) {
    var safeLocKey = escapeHtml(loc.locKey);
    var safeLocName = escapeHtml(loc.label);
    var badgeLabel = escapeHtml(t(loc.badgeKey));

    // Areas HTML
    var areasHtml = '';
    if (loc.areas.length > 0) {
      areasHtml = '<div class="loc-areas-box">' +
        '<div class="loc-areas-title">' + escapeHtml(t('loc_areas_label')) + '</div>' +
        '<div class="loc-areas-list">' +
        loc.areas.map(function (a) {
          return '<button type="button" class="loc-subarea-chip" onclick="window.fishaoApp.openLocationInFishdex(\'' +
            safeLocKey + '\', \'' + escapeHtml(a.areaKey) + '\', \'\', \'all\')">' +
            '<span>📍 ' + escapeHtml(a.label) + '</span>' +
            '<span class="loc-subarea-count">' + a.caught + '/' + a.total + '</span>' +
          '</button>';
        }).join('') +
        '</div></div>';
    }

    // Preview fishes: prioritize missing & biting for logged-in users, else biting now
    var showMissingPreview = isLoggedIn && loc.missingBitingFishes.length > 0;
    var previewPool = showMissingPreview ? loc.missingBitingFishes : loc.bitingFishes;
    var previewTitleKey = showMissingPreview ? 'loc_preview_missing_now' : 'loc_preview_biting_now';
    var previewHtml = '';

    if (previewPool.length > 0) {
      var sortedPreview = previewPool.slice().sort(function (a, b) {
        if ((b.rating || 1) !== (a.rating || 1)) return (b.rating || 1) - (a.rating || 1);
        var na = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
        var nb = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
        return String(na).localeCompare(String(nb), curLang);
      }).slice(0, 5);

      previewHtml = '<div class="loc-preview-box">' +
        '<div class="loc-preview-title">' + escapeHtml(t(previewTitleKey)) + '</div>' +
        '<div class="loc-preview-chips">' +
        sortedPreview.map(function (f) {
          var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
          return '<button type="button" class="loc-fish-chip" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" title="' + escapeHtml(fName + t('click_for_detail_suffix')) + '">' +
            '<img src="/images/fish_' + f.id + '.webp" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';">' +
            '<span class="loc-fish-chip-name">' + escapeHtml(fName) + '</span>' +
            '<span class="loc-fish-chip-stars">' + (f.rating || 1) + '★</span>' +
          '</button>';
        }).join('') +
        (previewPool.length > 5 ? '<span class="loc-preview-more">+' + (previewPool.length - 5) + '</span>' : '') +
        '</div></div>';
    }

    // Activity chips
    var activityChips = '<button type="button" class="loc-stat-chip biting' + (loc.bitingFishes.length === 0 ? ' muted' : '') + '" ' +
      'onclick="window.fishaoApp.openLocationInFishdex(\'' + safeLocKey + '\', \'\', \'now\', \'all\')">' +
      escapeHtml(t('loc_chip_biting_now', { count: loc.bitingFishes.length })) + '</button>';

    if (isLoggedIn && loc.missingBitingFishes.length > 0) {
      activityChips += '<button type="button" class="loc-stat-chip missing-now" ' +
        'onclick="window.fishaoApp.openLocationInFishdex(\'' + safeLocKey + '\', \'\', \'now\', \'missing\')">' +
        escapeHtml(t('loc_chip_missing_now', { count: loc.missingBitingFishes.length })) + '</button>';
    }

    if (loc.seasonalCount > 0) {
      activityChips += '<button type="button" class="loc-stat-chip seasonal" ' +
        'onclick="window.fishaoApp.openLocationInCalendar(\'' + safeLocKey + '\')">' +
        escapeHtml(t('loc_chip_seasonal', { count: loc.seasonalCount })) + '</button>';
    }

    // Action buttons
    var actionsHtml = '<button type="button" class="pill-btn primary" onclick="window.fishaoApp.openLocationInFishdex(\'' + safeLocKey + '\', \'\', \'\', \'all\')">' +
      escapeHtml(t('loc_btn_show_all', { count: loc.total })) + '</button>';

    if (loc.bitingFishes.length > 0) {
      actionsHtml += '<button type="button" class="pill-btn green" onclick="window.fishaoApp.openLocationInFishdex(\'' + safeLocKey + '\', \'\', \'now\', \'all\')">' +
        escapeHtml(t('loc_btn_show_now', { count: loc.bitingFishes.length })) + '</button>';
    }

    if (isLoggedIn && loc.missingCount > 0) {
      actionsHtml += '<button type="button" class="pill-btn amber" onclick="window.fishaoApp.openLocationInFishdex(\'' + safeLocKey + '\', \'\', \'\', \'missing\')">' +
        escapeHtml(t('loc_btn_show_missing', { count: loc.missingCount })) + '</button>';
    }

    var thumbHtml;
    if (loc.image) {
      thumbHtml = '<div class="loc-card-thumb' + (loc.image.isIconImg ? ' is-icon-img' : '') + '">' +
        '<img class="loc-card-thumb-img" src="' + escapeHtml(loc.image.src) + '" alt="' + safeLocName + '" loading="lazy" decoding="async" ' +
        'onerror="this.parentElement.classList.add(\'fallback-icon\');this.remove();">' +
        '<span class="loc-card-thumb-fallback" aria-hidden="true">' + loc.icon + '</span>' +
      '</div>';
    } else {
      thumbHtml = '<div class="loc-card-thumb fallback-icon">' +
        '<span class="loc-card-thumb-fallback" aria-hidden="true">' + loc.icon + '</span>' +
      '</div>';
    }

    var unlockBadgeHtml = '';
    if (loc.unlock) {
      if (loc.unlock.type === 'fish' && loc.unlock.fishId) {
        unlockBadgeHtml = '<button type="button" class="loc-unlock-badge ' + loc.unlock.cls + '" ' +
          'onclick="window.fishaoApp.openPriceModal(' + Number(loc.unlock.fishId) + ')" ' +
          'title="' + escapeHtml(loc.unlock.title) + '">' + escapeHtml(loc.unlock.text) + '</button>';
      } else {
        unlockBadgeHtml = '<span class="loc-unlock-badge ' + loc.unlock.cls + '" title="' +
          escapeHtml(loc.unlock.title) + '">' + escapeHtml(loc.unlock.text) + '</span>';
      }
    }

    var completeBadgeHtml = loc.isComplete
      ? '<span class="loc-complete-badge">' + escapeHtml(t('loc_badge_complete')) + '</span>'
      : '';
    var headerRightHtml = (unlockBadgeHtml || completeBadgeHtml)
      ? '<div class="loc-card-header-right">' + unlockBadgeHtml + completeBadgeHtml + '</div>'
      : '';

    return '<article class="location-card' + (loc.isComplete ? ' is-complete' : '') + '">' +
      '<div class="loc-card-header">' +
        '<div class="loc-card-title-row">' +
          thumbHtml +
          '<div class="loc-card-titles">' +
            '<h3 class="loc-card-name">' + safeLocName + '</h3>' +
            '<span class="loc-category-badge cat-' + loc.category + '">' + badgeLabel + '</span>' +
          '</div>' +
        '</div>' +
        headerRightHtml +
      '</div>' +
      '<div class="loc-progress-block">' +
        '<div class="loc-progress-labels">' +
          '<span>' + escapeHtml(t('loc_caught_label')) + ' <strong>' + loc.caughtCount + '</strong> / ' + loc.total + '</span>' +
          '<span class="loc-progress-pct' + (loc.isComplete ? ' complete' : '') + '">' + loc.pct + '%</span>' +
        '</div>' +
        '<div class="caught-progress-track loc-progress-track">' +
          '<div class="caught-progress-fill' + (loc.isComplete ? ' complete' : '') + '" style="width: ' + loc.pct + '%;"></div>' +
        '</div>' +
      '</div>' +
      '<div class="loc-chips-row">' + activityChips + '</div>' +
      areasHtml +
      previewHtml +
      '<div class="loc-card-actions">' + actionsHtml + '</div>' +
    '</article>';
  }).join('');
}

/**
 * Preloading 20+ large WebP previews eagerly hurts mobile bandwidth; location cards
 * already use native `<img loading="lazy">` and decode on demand when scrolled into view.
 */
function preloadLocationImages() {}
