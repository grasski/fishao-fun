/**
 * FISHAO - Table & Display Rendering (js/table.js)
 * -------------------------------------------------------------
 * Fish table rendering (Club / All / Market / Collection),
 * time formatting (UTC / Local), price cells, rating badges,
 * and caught collection toggling.
 */

function utcToLocalStr(utcH, utcM) {
  var d = new Date();
  d.setUTCHours(utcH, utcM || 0, 0, 0);
  return d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
}

function formatCatchTime(rawTimes) {
  if (!rawTimes || rawTimes.length === 0) return { primary: t('time_all_day'), sub: "" };
  if (userTimezone === "utc") {
    return { primary: rawTimes.join(', ') + " UTC", sub: "" };
  }
  var converted = rawTimes.map(function (part) {
    var clean = part.trim();
    if (!clean.includes('-')) return clean;
    var parts = clean.split('-');
    var sParts = parts[0].split(':').map(Number);
    var eParts = parts[1].split(':').map(Number);
    var sLocal = utcToLocalStr(sParts[0], sParts[1] || 0);
    var eLocal = utcToLocalStr(eParts[0], eParts[1] || 0);
    return sLocal + " - " + eLocal;
  });
  return {
    primary: converted.join(', '),
    sub: "(UTC: " + rawTimes.join(', ') + ")"
  };
}

function formatCatchDate(rawDates) {
  if (!rawDates || rawDates.length === 0) {
    return {
      text: t('date_all_year'),
      isSeasonal: false,
      inSeason: true
    };
  }

  var formatted = rawDates.map(function (dStr) {
    var clean = dStr.trim();
    if (!clean.includes('-')) return clean;
    var parts = clean.split('-');
    var s = parts[0].split('.').map(Number);
    var e = parts[1].split('.').map(Number);
    if (window.FISHAO_I18N && typeof window.FISHAO_I18N.formatDayMonth === 'function') {
      return window.FISHAO_I18N.formatDayMonth(s[0], s[1]) + " – " + window.FISHAO_I18N.formatDayMonth(e[0], e[1]);
    }
    return s[1] + ". " + s[0] + ". – " + e[1] + ". " + e[0] + ".";
  });

  var inSeason = isFishInSeasonNow(rawDates);
  return {
    text: formatted.join(', '),
    isSeasonal: true,
    inSeason: inSeason
  };
}

function renderRatingBadge(r) {
  var ratingNum = Math.max(1, Math.min(5, parseInt(r) || 1));
  var filledStars = "★".repeat(ratingNum);
  var emptyStars = "★".repeat(5 - ratingNum);
  return '<span class="rating-badge rate-' + ratingNum + '" title="' + t('rating_title', { rating: ratingNum }) + '">' +
    '<span class="rating-num">' + ratingNum + '★</span>' +
    '<span class="rating-stars-track">' +
    '<span class="stars-active">' + filledStars + '</span>' +
    '<span class="stars-inactive">' + emptyStars + '</span>' +
    '</span>' +
    '</span>';
}

function renderPriceCell(fid, priceCtx) {
  // Display-only normalization: one row per distinct known price value.
  var list = (typeof getNormalizedFishPrices === "function")
    ? getNormalizedFishPrices(fid)
    : normalizePriceEntries(getFishPrices(fid));
  var locale = (priceCtx && priceCtx.locale) ? priceCtx.locale : getLocale();
  var est = (typeof getEstimatedPrice === "function") ? getEstimatedPrice(fid) : null;
  var estRangeStr = est ? (est.min.toLocaleString(locale) + '–' + est.max.toLocaleString(locale)) : '';
  var estTitleSuffix = est ? ('\n' + t('price_est_cell_title', { min: est.min.toLocaleString(locale), max: est.max.toLocaleString(locale) })) : '';

  var estSubHtml = est
    ? '<span class="price-est-sub" title="' + escapeHtml(t('price_est_cell_title', { min: est.min.toLocaleString(locale), max: est.max.toLocaleString(locale) })) + '">~ ' + estRangeStr + ' FB</span>'
    : '';

  var todayISO = (priceCtx && priceCtx.todayISO !== undefined)
    ? priceCtx.todayISO
    : ((typeof getTodayISO === "function") ? getTodayISO() : "");
  var todayEntries = todayISO ? list.filter(function (x) { return x.date === todayISO; }) : [];

  if (list.length === 0) {
    var emptyTitle = t('price_cell_add_title') + estTitleSuffix;
    return '<div class="price-cell price-cell-stack" title="' + escapeHtml(emptyTitle) + '">' +
      '<span class="price-empty">+ ' + t('price_add_btn') + '</span>' +
      estSubHtml +
      '</div>';
  }

  var pricesNum = list.map(function (x) { return x.price; });
  var minP = Math.min.apply(null, pricesNum);
  var maxP = Math.max.apply(null, pricesNum);
  var count = list.length;

  var histCount = '<span class="price-history-count" title="' + t('price_history_count_title') + '">' + count + 'x</span>';

  var cellTitle;
  var valuesHtml;
  if (todayEntries.length > 0) {
    var todayPrices = todayEntries.map(function (x) { return x.price; });
    var minT = Math.min.apply(null, todayPrices);
    var maxT = Math.max.apply(null, todayPrices);
    var todayPriceStr = (minT === maxT)
      ? minT.toLocaleString(locale)
      : (minT.toLocaleString(locale) + '–' + maxT.toLocaleString(locale));
    var highPct = (priceCtx && typeof priceCtx.highPct === "number")
      ? priceCtx.highPct
      : ((typeof getTodayHighPricePct === "function") ? getTodayHighPricePct() : 90);
    var isHighToday = !!(est && est.max > 0 && maxT >= est.max * (highPct / 100));
    cellTitle = t('price_today_sub', { price: todayPriceStr }) + '\n' +
      t('price_cell_range_title', {
        min: minP.toLocaleString(locale),
        max: maxP.toLocaleString(locale),
        count: count
      }) + estTitleSuffix;
    valuesHtml = '<span class="price-range-single price-today-val' + (isHighToday ? ' is-high' : '') + '">' + todayPriceStr + '</span>' +
      '<span class="price-unit">FB</span>';
  } else if (minP === maxP) {
    cellTitle = t('price_cell_single_title', {
      price: minP.toLocaleString(locale),
      date: formatPriceDate(list[0].date)
    }) + estTitleSuffix;
    valuesHtml = '<span class="price-range-single">' + minP.toLocaleString(locale) + '</span>' +
      '<span class="price-unit">FB</span>';
  } else {
    cellTitle = t('price_cell_range_title', {
      min: minP.toLocaleString(locale),
      max: maxP.toLocaleString(locale),
      count: count
    }) + estTitleSuffix;
    valuesHtml = '<span class="price-range-min">' + minP.toLocaleString(locale) + '</span>' +
      '<span class="price-range-sep">–</span>' +
      '<span class="price-range-max">' + maxP.toLocaleString(locale) + '</span>' +
      '<span class="price-unit">FB</span>';
  }

  return '<div class="price-cell price-cell-stack" title="' + escapeHtml(cellTitle) + '">' +
    '<span class="price-inline">' + valuesHtml + histCount + '</span>' +
    estSubHtml +
    '</div>';
}

var _distinctPriceCountVer = -1;
var _distinctPriceCountVal = 0;

function countDistinctRecordedPrices() {
  if (typeof _priceDataVersion !== 'undefined' && _distinctPriceCountVer === _priceDataVersion) {
    return _distinctPriceCountVal;
  }
  var total = Object.keys(priceHistory).reduce(function (sum, fid) {
    var list = (typeof getNormalizedFishPrices === "function")
      ? getNormalizedFishPrices(fid)
      : normalizePriceEntries(getFishPrices(fid));
    return sum + list.length;
  }, 0);
  if (typeof _priceDataVersion !== 'undefined') {
    _distinctPriceCountVer = _priceDataVersion;
    _distinctPriceCountVal = total;
  }
  return total;
}

/**
 * Catch state of a fish: 'none' | 'caught' | 'shiny'.
 * A shiny is always also caught, so shinyFishIds is stored as a subset.
 */
function getFishCatchState(fishId) {
  if (shinyFishIds.has(fishId)) return "shiny";
  if (caughtFishIds.has(fishId)) return "caught";
  return "none";
}

function getCaughtBtnTitle(state) {
  if (!currentUser) return t('auth_notice_collection');
  if (state === "shiny") return t('caught_btn_shiny_unmark_title');
  if (state === "caught") return t('caught_btn_shiny_mark_title');
  return t('caught_btn_mark_title');
}

function getCaughtBtnGlyph(state) {
  if (state === "shiny") return "✨";
  if (state === "caught") return "✓";
  return "";
}

function renderCaughtBtn(fishId) {
  var state = getFishCatchState(fishId);
  var title = getCaughtBtnTitle(state);
  return '<button type="button" class="caught-btn' + (state === "none" ? '' : ' ' + state) + '" data-catch-id="' + fishId + '" data-catch-state="' + state + '" title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '">' +
    getCaughtBtnGlyph(state) + '</button>';
}

function updateModalCaughtBtn(fid) {
  var btn = document.getElementById("modalBtnCaught");
  if (!btn) return;
  var isCaught = caughtFishIds.has(fid);
  btn.className = "btn-caught-pill " + (isCaught ? "caught" : "");
  btn.innerHTML = isCaught ? t('modal_btn_caught_yes') : t('modal_btn_caught_no');
}

function updateModalShinyBtn(fid) {
  var btn = document.getElementById("modalBtnShiny");
  if (!btn) return;
  var isShiny = shinyFishIds.has(fid);
  btn.className = "btn-caught-pill" + (isShiny ? " shiny" : "");
  btn.innerHTML = isShiny ? t('modal_btn_shiny_yes') : t('modal_btn_shiny_no');
}

function toggleCaughtFromModal() {
  if (!selectedModalFishId) return;
  toggleCaughtFish(selectedModalFishId);
  updateModalCaughtBtn(selectedModalFishId);
  updateModalShinyBtn(selectedModalFishId);
}

function toggleShinyFromModal() {
  if (!selectedModalFishId) return;
  var nextState = (getFishCatchState(selectedModalFishId) === "shiny") ? "caught" : "shiny";
  setFishCatchState(selectedModalFishId, nextState);
  updateModalCaughtBtn(selectedModalFishId);
  updateModalShinyBtn(selectedModalFishId);
}

var _caughtSyncTimer = null;
var _caughtSyncPromise = null;
var _caughtSyncDirty = false;
var _pendingCaughtBaseArr = null;
var _pendingCaughtUid = "";

function applyCaughtBtnState(btn, fishId) {
  if (!btn) return;
  var state = getFishCatchState(fishId);
  var title = getCaughtBtnTitle(state);
  btn.classList.toggle('caught', state === 'caught');
  btn.classList.toggle('shiny', state === 'shiny');
  btn.dataset.catchState = state;
  btn.textContent = getCaughtBtnGlyph(state);
  btn.title = title;
  btn.setAttribute('aria-label', title);
}

function updateCaughtRowInPlace(fishId) {
  var state = getFishCatchState(fishId);
  var tbody = document.getElementById("tableBody");
  if (tbody) {
    var tr = tbody.querySelector('tr[data-fish-id="' + fishId + '"]');
    if (tr) {
      tr.classList.toggle('row-caught', state === 'caught');
      tr.classList.toggle('row-shiny', state === 'shiny');
      applyCaughtBtnState(tr.querySelector('.caught-btn[data-catch-id="' + fishId + '"]'), fishId);
    }
  }
  var calGrid = document.getElementById("calendarGrid");
  if (calGrid) {
    var card = calGrid.querySelector('.cal-fish-card[data-fish-id="' + fishId + '"]');
    if (card) {
      card.classList.toggle('is-caught', state !== 'none');
      card.classList.toggle('is-shiny', state === 'shiny');
      applyCaughtBtnState(card.querySelector('.caught-btn[data-catch-id="' + fishId + '"]'), fishId);
    }
  }
}

function syncOwnPlayerCacheCounts() {
  if (!currentUser) return;
  var clubCount = 0;
  clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) clubCount++; });
  if (typeof allPlayersList !== "undefined" && Array.isArray(allPlayersList)) {
    var meInList = allPlayersList.find(function (p) { return p.uid === currentUser.uid; });
    if (meInList) {
      meInList.caughtCount = caughtFishIds.size;
      meInList.caughtClubCount = clubCount;
      meInList.shinyCount = shinyFishIds.size;
      if (typeof savePlayersSessionCache === "function" && typeof lastPlayersFetchTime !== "undefined") {
        savePlayersSessionCache(lastPlayersFetchTime);
      }
    }
  }
}

function refreshViewAfterCaughtChange(changedFishId) {
  var isTable = (typeof isTableViewActive === "function") ? isTableViewActive() : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  if (currentView === 'club_manage') {
    updateCaughtStats({ skipSubViewRender: true });
    renderClubMilestones();
    return;
  }
  if (currentView === 'calendar') {
    var needsCalRebuild = (typeof calStatusFilter !== 'undefined' && calStatusFilter === 'missing');
    if (needsCalRebuild) {
      updateCaughtStats();
    } else {
      updateCaughtStats({ skipSubViewRender: true });
      if (changedFishId !== undefined) updateCaughtRowInPlace(changedFishId);
    }
    return;
  }
  if (currentView === 'locations') {
    updateCaughtStats();
    return;
  }
  if (currentView === 'players') {
    updateCaughtStats({ skipSubViewRender: true });
    if (typeof renderPlayersList === 'function') renderPlayersList();
    return;
  }
  if (isTable) {
    var uncaughtEl = document.getElementById("filterUncaughtCheckbox");
    var hasUncaughtFilter = !!(uncaughtEl && uncaughtEl.checked);
    var hasCollectionFilter = collectionFilterMode !== 'all';
    if (filterOnlyCaught || hasUncaughtFilter || hasCollectionFilter) {
      updateCaughtStats({ skipSubViewRender: true });
      applyFilters();
    } else {
      updateCaughtStats({ skipSubViewRender: true });
      if (changedFishId !== undefined) {
        updateCaughtRowInPlace(changedFishId);
      } else {
        applyFilters();
      }
    }
    return;
  }
  updateCaughtStats();
}

async function flushPendingCaughtSync() {
  if (_caughtSyncTimer) {
    clearTimeout(_caughtSyncTimer);
    _caughtSyncTimer = null;
  }
  if (_caughtSyncPromise) return _caughtSyncPromise;
  if (!_caughtSyncDirty || !currentUser || !db) return;

  _caughtSyncPromise = (async function () {
    while (_caughtSyncDirty && currentUser && db) {
      _caughtSyncDirty = false;
      var syncUid = currentUser.uid;
      var caughtSnapshotArr = Array.from(caughtFishIds);
      var shinySnapshotArr = Array.from(shinyFishIds);
      var rollbackBase = (_pendingCaughtUid === syncUid && _pendingCaughtBaseArr && !Array.isArray(_pendingCaughtBaseArr))
        ? _pendingCaughtBaseArr
        : null;

      try {
        var fsModule = await getFirestoreModule();
        var userDocRef = fsModule.doc(db, "users", syncUid);
        await fsModule.updateDoc(userDocRef, {
          caughtFishIds: caughtSnapshotArr,
          shinyFishIds: shinySnapshotArr
        });

        if (currentClubId && currentUser && currentUser.uid === syncUid) {
          try {
            var myClubCount = 0;
            clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
            var clubDocRef = fsModule.doc(db, "clubs", currentClubId);
            var mSync = {};
            mSync["members." + syncUid + ".caughtCount"] = caughtFishIds.size;
            mSync["members." + syncUid + ".caughtClubCount"] = myClubCount;
            await fsModule.updateDoc(clubDocRef, mSync);
          } catch (clubSyncErr) {
            console.warn("Could not sync member catch counts to club:", clubSyncErr);
          }
        }

        if (!_caughtSyncDirty && _pendingCaughtUid === syncUid) {
          _pendingCaughtBaseArr = null;
          _pendingCaughtUid = "";
        }
      } catch (err) {
        console.error("Failed to update caught fish:", err);
        _caughtSyncDirty = false;
        if (currentUser && currentUser.uid === syncUid && rollbackBase) {
          if (Array.isArray(rollbackBase.caught)) caughtFishIds = new Set(rollbackBase.caught);
          if (Array.isArray(rollbackBase.shiny)) shinyFishIds = new Set(rollbackBase.shiny);
          if (userProfile) {
            userProfile.caughtFishIds = Array.from(caughtFishIds);
            userProfile.shinyFishIds = Array.from(shinyFishIds);
            if (typeof saveProfileToCache === 'function') {
              saveProfileToCache(syncUid, userProfile);
            }
          }
          syncOwnPlayerCacheCounts();
          if (selectedModalFishId) {
            updateModalCaughtBtn(selectedModalFishId);
            updateModalShinyBtn(selectedModalFishId);
          }
          refreshViewAfterCaughtChange(undefined);
        }
        _pendingCaughtBaseArr = null;
        _pendingCaughtUid = "";
        if (typeof showToast === 'function') {
          showToast(t('err_save') + err.message, "error");
        }
        break;
      }
    }
  })().finally(function () {
    _caughtSyncPromise = null;
  });

  return _caughtSyncPromise;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && _caughtSyncDirty) {
      flushPendingCaughtSync();
    }
  });
  window.addEventListener('pagehide', function () {
    if (_caughtSyncDirty) flushPendingCaughtSync();
  });
}

/**
 * Set an explicit catch state ('none' | 'caught' | 'shiny') for a fish and
 * queue the debounced Firestore sync. Returns false when the user is a guest.
 */
function setFishCatchState(fishId, state) {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_collection'));
    return false;
  }

  if (!_pendingCaughtBaseArr || Array.isArray(_pendingCaughtBaseArr) || _pendingCaughtUid !== currentUser.uid) {
    _pendingCaughtUid = currentUser.uid;
    _pendingCaughtBaseArr = {
      caught: Array.from(caughtFishIds),
      shiny: Array.from(shinyFishIds)
    };
  }

  if (state === "none") {
    caughtFishIds.delete(fishId);
    shinyFishIds.delete(fishId);
  } else if (state === "caught") {
    caughtFishIds.add(fishId);
    shinyFishIds.delete(fishId);
  } else {
    caughtFishIds.add(fishId);
    shinyFishIds.add(fishId);
  }

  if (userProfile) {
    userProfile.caughtFishIds = Array.from(caughtFishIds);
    userProfile.shinyFishIds = Array.from(shinyFishIds);
    if (typeof saveProfileToCache === 'function') {
      saveProfileToCache(currentUser.uid, userProfile);
    }
  }
  syncOwnPlayerCacheCounts();
  refreshViewAfterCaughtChange(fishId);

  if (db) {
    _caughtSyncDirty = true;
    if (_caughtSyncTimer) clearTimeout(_caughtSyncTimer);
    _caughtSyncTimer = setTimeout(function () {
      _caughtSyncTimer = null;
      flushPendingCaughtSync();
    }, 300);
  }
  return true;
}

/**
 * Binary caught toggle (not caught -> caught, anything else -> not caught).
 * Kept for the fish modal "Mark as caught" button and club milestone cards.
 */
function toggleCaughtFish(fishId) {
  return setFishCatchState(fishId, getFishCatchState(fishId) === "none" ? "caught" : "none");
}

/**
 * Three-state circle toggle: not caught -> caught -> caught shiny -> not caught.
 */
function cycleCaughtState(fishId) {
  var state = getFishCatchState(fishId);
  if (state === "none") return setFishCatchState(fishId, "caught");
  if (state === "caught") return setFishCatchState(fishId, "shiny");
  return setFishCatchState(fishId, "none");
}

function updateCaughtStats(opts) {
  var skipSubViewRender = !!(opts && opts.skipSubViewRender);
  var clubCount = 0;
  var allCount = 0;
  var shinyCount = 0;

  clubFishes.forEach(function (f) {
    if (caughtFishIds.has(f.id)) clubCount++;
  });
  allFishes.forEach(function (f) {
    if (caughtFishIds.has(f.id)) allCount++;
    if (shinyFishIds.has(f.id)) shinyCount++;
  });

  var clubCountEl = document.getElementById("caughtClubCount");
  var allCountEl = document.getElementById("caughtAllCount");
  var shinyCountEl = document.getElementById("caughtShinyCount");
  var progressEl = document.getElementById("caughtProgressFill");
  var pctTextEl = document.getElementById("caughtPctText");

  if (clubCountEl) clubCountEl.innerText = clubCount;
  if (allCountEl) allCountEl.innerText = allCount;
  if (shinyCountEl) shinyCountEl.innerText = shinyCount;

  var pct = allFishes.length > 0 ? (allCount / allFishes.length * 100) : 0;
  if (currentView === "club") {
    pct = clubFishes.length > 0 ? (clubCount / clubFishes.length * 100) : 0;
  }

  if (progressEl) progressEl.style.width = pct.toFixed(1) + "%";
  if (pctTextEl) pctTextEl.innerText = pct.toFixed(0) + "%";

  updateNavClubBadge();

  var manageCaught = document.getElementById("manageCaughtClub");
  if (manageCaught) {
    manageCaught.innerText = t('status_caught_count', { caught: clubCount, total: clubFishes.length });
  }
  var manageFill = document.getElementById("manageProgressFill");
  if (manageFill) {
    var clubPct = clubFishes.length > 0 ? (clubCount / clubFishes.length * 100) : 0;
    manageFill.style.width = clubPct.toFixed(1) + "%";
  }

  var marketSummary = document.getElementById("marketStatsSummary");
  if (marketSummary) {
    var priceCount = countDistinctRecordedPrices();
    marketSummary.innerText = t('market_recorded_prices', { count: priceCount });
  }

  if (!skipSubViewRender) {
    if (currentView === 'locations' && typeof renderLocationsView === 'function') {
      renderLocationsView();
    } else if (currentView === 'calendar' && typeof renderCalendarView === 'function') {
      renderCalendarView();
    }
  }
}

function updateMarketTabStatus() {
  var pill = document.getElementById("tabMarketPill");
  var isSunday = isMarketClosedToday();
  if (pill) {
    if (isSunday) {
      pill.innerHTML = '🔒 ' + t('market_closed_tag');
      pill.classList.add("pill-closed");
      pill.setAttribute("title", t('market_closed_sunday_tooltip'));
    } else {
      pill.innerText = t('nav_market_pill');
      pill.classList.remove("pill-closed");
      pill.removeAttribute("title");
    }
  }
  if (typeof syncMobileNavTrigger === 'function') syncMobileNavTrigger();

  var bannerSunday = document.getElementById("bannerMarketSunday");
  if (bannerSunday) {
    bannerSunday.style.display = (currentView === "market" && isSunday) ? "flex" : "none";
  }

  var bannerTimers = document.getElementById("bannerMarketTimers");
  if (bannerTimers) {
    bannerTimers.style.display = (currentView === "market" && !isSunday) ? "flex" : "none";
  }

  if (typeof updateMarketResetAlertVisibility === 'function') {
    updateMarketResetAlertVisibility();
  }

  if (typeof updateMarketFloatingImportBtn === 'function') {
    updateMarketFloatingImportBtn();
  }

  var descEl = document.getElementById("marketSundayNoticeDesc");
  if (descEl) {
    var windowText = (typeof getMarketClosedWindowText === 'function') ? getMarketClosedWindowText() : t('market_window_utc');
    descEl.innerText = t('market_sunday_banner_desc', { window: windowText });
  }

  var marketSummary = document.getElementById("marketStatsSummary");
  if (marketSummary) {
    var priceCount = countDistinctRecordedPrices();
    var summaryText = t('market_recorded_prices', { count: priceCount });
    if (isSunday) {
      summaryText += ' • ' + t('market_closed_sunday_short');
    }
    marketSummary.innerText = summaryText;
  }

  if (typeof updateMarketSundayCountdown === 'function') {
    updateMarketSundayCountdown();
  }
}

function renderTableHead() {
  var thead = document.getElementById("tableHead");
  if (!thead) return;
  var caughtCol = '<th style="width: 44px; text-align: center;" title="' + t('col_caught_title') + '">✓</th>';
  var isSunday = isMarketClosedToday();
  var priceColHtml = '<th title="' + t('col_price_title') + '">' + t('col_price') + (isSunday ? ' <span class="th-sunday-closed-pill" title="' + t('market_closed_sunday_tooltip') + '">🔒 ' + t('market_closed_tag') + '</span>' : '') + '</th>';

  if (currentView === "club") {
    thead.innerHTML =
      '<tr>' +
      '<th style="width: 48px;">#</th>' +
      caughtCol +
      '<th style="width: 108px;">' + t('col_appearance') + '</th>' +
      '<th>' + t('col_area') + '</th>' +
      '<th>' + t('col_fish') + '</th>' +
      '<th>' + t('col_rarity') + '</th>' +
      priceColHtml +
      '<th>' + t('col_baits') + ' <span class="th-info-badge" title="' + escapeHtml(t('col_baits_info_tooltip')) + '">ℹ️</span></th>' +
      '<th>' + t('col_time') + '</th>' +
      '<th>' + t('col_size') + '</th>' +
      '<th style="min-width: 140px;">' + t('col_unlock') + '</th>' +
      '</tr>';
  } else {
    thead.innerHTML =
      '<tr>' +
      '<th style="width: 48px;">#</th>' +
      caughtCol +
      '<th style="width: 108px;">' + t('col_appearance') + '</th>' +
      '<th>' + t('col_fish') + '</th>' +
      '<th>' + t('col_rarity') + '</th>' +
      priceColHtml +
      '<th>' + t('col_loc') + '</th>' +
      '<th>' + t('col_baits') + ' <span class="th-info-badge" title="' + escapeHtml(t('col_baits_info_tooltip')) + '">ℹ️</span></th>' +
      '<th>' + t('col_time') + '</th>' +
      '<th>' + t('col_size') + '</th>' +
      '</tr>';
  }
}

var _tableRenderToken = 0;
var _fishRenderCacheKey = "";
var _fishRenderCache = new Map();

function getFishRenderData(f) {
  var cached = _fishRenderCache.get(f.id);
  if (cached) return cached;

  var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
  var areaLabels = getFishAreaLabels(f);
  var data = {
    fishName: fishName,
    safeFishName: escapeHtml(fishName),
    timeInfo: formatCatchTime(f.raw_times),
    dateInfo: formatCatchDate(f.raw_dates),
    locLabels: getFishLocationLabels(f),
    areaLabels: areaLabels,
    areaName: areaLabels[0] || ""
  };
  _fishRenderCache.set(f.id, data);
  return data;
}

function renderFishRowHtml(f, idx, ctx) {
  var isNow = isFishActiveNow(f.raw_times, f.raw_dates, ctx.nowCtx);
  var rc = getFishRenderData(f);
  var timeInfo = rc.timeInfo;
  var dateInfo = rc.dateInfo;
  var dateBadgeHtml = "";
  if (dateInfo.isSeasonal) {
    var sClass = dateInfo.inSeason ? "date-badge in-season" : "date-badge out-of-season";
    var sTitle = dateInfo.inSeason ? ctx.inSeasonTitle : ctx.outSeasonTitle;
    dateBadgeHtml = '<div class="' + sClass + '" title="' + sTitle + '"><span class="date-icon">📅</span> ' + dateInfo.text + '</div>';
  }

  var altMatch = (ctx.searchQ && window.FISHAO_I18N && typeof window.FISHAO_I18N.getMatchingFishAltName === 'function')
    ? window.FISHAO_I18N.getMatchingFishAltName(f, ctx.searchQ)
    : "";
  var altMatchHtml = altMatch ? '<div style="font-size: 11px; color: #38bdf8; font-weight: 500; margin-top: 2px;">' + escapeHtml(altMatch) + '</div>' : '';
  var safeFishName = rc.safeFishName;

  var fruitBadgeHtml = "";
  if (Array.isArray(f.fruit_recipe) && f.fruit_recipe.length) {
    var fruitRecipeText = f.fruit_recipe.map(function (fruitId) {
      return window.FISHAO_I18N ? window.FISHAO_I18N.getFruitName(fruitId) : String(fruitId);
    }).join(", ");
    fruitBadgeHtml = '<span class="badge-fruit-tag" title="' +
      escapeHtml(t('fruit_recipe_badge_title', { recipe: fruitRecipeText })) + '">🍹</span>';
  }

  var fossilBadgeHtml = "";
  if (f.fossil_collection) {
    fossilBadgeHtml = '<span class="badge-fossil-tag" title="' +
      escapeHtml(t('fossil_requirement_badge_title')) + '">🦴</span>';
  }

  if (ctx.isClubView) {
    var unlock = getUnlockStatus(f, currentClubPoints);
    var rowClass = [];
    if (!unlock.isUnlocked) rowClass.push("row-locked");
    var catchState = getFishCatchState(f.id);
    if (catchState === "caught") rowClass.push("row-caught");
    if (catchState === "shiny") rowClass.push("row-shiny");
    var areaName = rc.areaName;

    return '<tr class="' + rowClass.join(' ') + '" tabindex="0" data-fish-id="' + f.id + '" title="' + ctx.rowClickTitle + '">' +
      '<td style="color: var(--text-muted); font-weight: 600;">' + f.order + '</td>' +
      '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
      '<td><div class="fish-img-box"><img src="/images/fish_' + f.id + '.webp" alt="' + safeFishName + '" class="fish-img" width="92" height="52" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';"></div></td>' +
      '<td class="loc-box">' +
      (areaName ? '<span class="loc-tag">' + escapeHtml(areaName) + '</span>' : '<span class="loc-unspecified">' + ctx.unspecText + '</span>') +
      '</td>' +
      '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + safeFishName + '</div>' + altMatchHtml + '</td>' +
      '<td>' + renderRatingBadge(f.rating) + '</td>' +
      '<td>' + renderPriceCell(f.id, ctx.priceCtx) + '</td>' +
      '<td>' + (typeof renderFishBaitsCell === 'function' ? renderFishBaitsCell(f, ctx.baitFilterCtx) : f.baits.map(function (b) {
        return renderBaitTag(b);
      }).join('')) + '</td>' +
      '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
      (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
      (isNow ? '<span class="time-now-active">' + ctx.activeNowLabel + '</span>' : '') +
      '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') +
      dateBadgeHtml + '</div></td>' +
      '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
      '<td><div class="' + (unlock.isUnlocked ? 'status-unlocked' : 'status-locked') + '"><span class="status-cost">' + unlock.costText + '</span><span class="status-desc">' + unlock.desc + '</span></div></td>' +
      '</tr>';
  }

  var catchState = getFishCatchState(f.id);
  var rowCls = catchState === "shiny" ? "row-shiny" : (catchState === "caught" ? "row-caught" : "");
  var locLabels = rc.locLabels;
  var areaLabels = rc.areaLabels;
  var locHtml = locLabels.map(function (locName) {
    return '<span class="loc-tag">' + escapeHtml(locName) + '</span>';
  }).join('') + areaLabels.map(function (areaName) {
    return '<span class="loc-area-chip" title="' +
      escapeHtml(t('modal_area_title', { name: areaName })) + '">📍 ' +
      escapeHtml(areaName) + '</span>';
  }).join('');

  return '<tr class="' + rowCls + '" tabindex="0" data-fish-id="' + f.id + '" title="' + ctx.rowClickTitle + '">' +
    '<td style="color: var(--text-muted); font-weight: 600;">' + (idx + 1) + '</td>' +
    '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
    '<td><div class="fish-img-box"><img src="/images/fish_' + f.id + '.webp" alt="' + safeFishName + '" class="fish-img" width="92" height="52" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';"></div></td>' +
    '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + safeFishName +
    (f.is_club ? '<span class="badge-club-tag">' + ctx.clubTagText + '</span>' : '') +
    fruitBadgeHtml +
    fossilBadgeHtml +
    '</div>' + altMatchHtml + '</td>' +
    '<td>' + renderRatingBadge(f.rating) + '</td>' +
    '<td>' + renderPriceCell(f.id, ctx.priceCtx) + '</td>' +
    '<td class="loc-box">' +
    (locHtml || '<span class="loc-unspecified">' + ctx.unspecText + '</span>') +
    '</td>' +
    '<td>' + (typeof renderFishBaitsCell === 'function' ? renderFishBaitsCell(f, ctx.baitFilterCtx) : f.baits.map(function (b) {
      return renderBaitTag(b);
    }).join('')) + '</td>' +
    '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
    (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
    (isNow ? '<span class="time-now-active">' + ctx.activeNowLabel + '</span>' : '') +
    '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') +
    dateBadgeHtml + '</div></td>' +
    '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
    '</tr>';
}

var _tableScrollState = {
  token: 0,
  data: [],
  offset: 0,
  ctx: null,
  observer: null,
  sentinel: null,
  rafScheduled: false
};

function bindTableDelegation(tbody) {
  if (!tbody || tbody.dataset.boundTableActions) return;
  tbody.dataset.boundTableActions = '1';

  tbody.addEventListener('click', function (ev) {
    var catchBtn = ev.target && ev.target.closest ? ev.target.closest('.caught-btn[data-catch-id]') : null;
    if (catchBtn) {
      ev.stopPropagation();
      cycleCaughtState(Number(catchBtn.dataset.catchId));
      return;
    }
    var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-fish-id]') : null;
    if (tr) {
      openPriceModal(Number(tr.dataset.fishId));
    }
  });

  tbody.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (ev.target && ev.target.closest && ev.target.closest('.caught-btn')) return;
    var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-fish-id]') : null;
    if (tr && ev.target === tr) {
      ev.preventDefault();
      openPriceModal(Number(tr.dataset.fishId));
    }
  });
}

function ensureTableScrollSentinel(tbody) {
  if (_tableScrollState.sentinel && _tableScrollState.sentinel.isConnected) {
    return _tableScrollState.sentinel;
  }
  var existing = document.getElementById('tableScrollSentinel');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'tableScrollSentinel';
    existing.setAttribute('aria-hidden', 'true');
    existing.style.width = '100%';
    existing.style.height = '1px';
    existing.style.pointerEvents = 'none';
    var tableWrap = tbody.closest ? tbody.closest('.table-container') : null;
    if (tableWrap && tableWrap.parentNode) {
      tableWrap.parentNode.insertBefore(existing, tableWrap.nextSibling);
    } else if (tbody.parentNode && tbody.parentNode.parentNode) {
      tbody.parentNode.parentNode.appendChild(existing);
    }
  }
  _tableScrollState.sentinel = existing;

  if (!_tableScrollState.observer && typeof IntersectionObserver === 'function') {
    _tableScrollState.observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          scheduleMoreTableRows();
          break;
        }
      }
    }, { rootMargin: '750px 0px' });
    _tableScrollState.observer.observe(existing);
  } else if (!window._tableScrollFallbackBound) {
    window._tableScrollFallbackBound = true;
    var checkScrollMore = function () {
      if (_tableScrollState.offset >= _tableScrollState.data.length) return;
      var s = _tableScrollState.sentinel;
      if (!s) return;
      var rect = s.getBoundingClientRect();
      if (rect.top <= (window.innerHeight || 800) + 750) {
        scheduleMoreTableRows();
      }
    };
    window.addEventListener('scroll', checkScrollMore, { passive: true });
    window.addEventListener('resize', checkScrollMore, { passive: true });
  }
  return existing;
}

function isSentinelNearViewport() {
  var s = _tableScrollState.sentinel;
  if (!s || s.style.display === 'none') return false;
  var rect = s.getBoundingClientRect();
  return rect.top <= (window.innerHeight || 800) + 750;
}

function appendNextTableBatch() {
  _tableScrollState.rafScheduled = false;
  var st = _tableScrollState;
  if (st.token !== _tableRenderToken) return;
  if (st.offset >= st.data.length) {
    if (st.sentinel) st.sentinel.style.display = 'none';
    return;
  }

  var tbody = document.getElementById("tableBody");
  if (!tbody) return;

  var NEXT_BATCH = 45;
  var end = Math.min(st.data.length, st.offset + NEXT_BATCH);
  var chunk = [];
  for (var j = st.offset; j < end; j++) {
    chunk.push(renderFishRowHtml(st.data[j], j, st.ctx));
  }
  tbody.insertAdjacentHTML('beforeend', chunk.join(''));
  st.offset = end;

  if (st.offset >= st.data.length) {
    if (st.sentinel) st.sentinel.style.display = 'none';
  } else if (isSentinelNearViewport()) {
    scheduleMoreTableRows();
  }
}

function scheduleMoreTableRows() {
  if (_tableScrollState.rafScheduled) return;
  if (_tableScrollState.offset >= _tableScrollState.data.length) return;
  _tableScrollState.rafScheduled = true;
  requestAnimationFrame(appendNextTableBatch);
}

function renderTableBody(data) {
  var tbody = document.getElementById("tableBody");
  if (!tbody) return;
  bindTableDelegation(tbody);
  var sentinel = ensureTableScrollSentinel(tbody);

  var total = currentView === "club" ? clubFishes.length : allFishes.length;
  var token = ++_tableRenderToken;
  _tableScrollState.token = token;
  _tableScrollState.data = data || [];
  _tableScrollState.offset = 0;
  _tableScrollState.rafScheduled = false;

  var now = new Date();
  var langKey = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
  var cacheKey = langKey + '|' + userTimezone + '|' + now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate();
  if (cacheKey !== _fishRenderCacheKey) {
    _fishRenderCacheKey = cacheKey;
    _fishRenderCache.clear();
  }

  if (data.length === 0) {
    var colCount = currentView === "club" ? 11 : 10;
    tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="empty-state">' + t('table_empty_state') + '</td></tr>';
    sentinel.style.display = 'none';
    document.getElementById("counter").innerText = t('counter_showing', { shown: 0, total: total });
    return;
  }

  var searchInput = document.getElementById("search");
  var areaEl = document.getElementById("areaFilter");
  var hideLockedEl = document.getElementById("hideLockedCheckbox");
  var nowCtx = (typeof createTimeNowContext === "function") ? createTimeNowContext(now) : null;
  var todayIsoStr = (typeof getTodayISO === "function") ? getTodayISO() : "";
  var ctx = {
    isClubView: currentView === "club",
    rowClickTitle: escapeHtml(t('price_cell_detail_title')),
    activeNowLabel: t('time_active_now_short'),
    inSeasonTitle: escapeHtml(t('date_in_season_title')),
    outSeasonTitle: escapeHtml(t('date_out_of_season_title')),
    clubTagText: t('badge_club_fish'),
    unspecText: t('loc_unspecified'),
    searchQ: searchInput ? searchInput.value.trim() : "",
    nowCtx: nowCtx,
    priceCtx: {
      locale: getLocale(),
      todayISO: todayIsoStr,
      highPct: (typeof getTodayHighPricePct === "function") ? getTodayHighPricePct() : 90
    },
    baitFilterCtx: {
      locFilter: (currentView === 'club') ? 'location_112' : ((typeof locationFilterValues !== 'undefined' && locationFilterValues.length === 1) ? locationFilterValues[0] : ''),
      areaFilter: (areaEl && areaEl.value) || '',
      timeMode: filterNowActive ? 'now' : 'overlap',
      hideLocked: (currentView === 'club' && hideLockedEl && hideLockedEl.checked),
      nowCtx: nowCtx
    }
  };

  var FIRST_BATCH = 20;
  var firstEnd = Math.min(data.length, FIRST_BATCH);
  var firstHtml = [];
  for (var i = 0; i < firstEnd; i++) {
    firstHtml.push(renderFishRowHtml(data[i], i, ctx));
  }
  tbody.innerHTML = firstHtml.join('');
  document.getElementById("counter").innerText = t('counter_showing', { shown: data.length, total: total });

  _tableScrollState.offset = firstEnd;
  _tableScrollState.ctx = ctx;

  if (firstEnd >= data.length) {
    sentinel.style.display = 'none';
    return;
  }

  sentinel.style.display = 'block';
  if (isSentinelNearViewport()) {
    scheduleMoreTableRows();
  }
}

