/**
 * FISHAO - Market & Price Management (js/market.js)
 * -------------------------------------------------------------
 * Fish Market price history (variable community prices), single price
 * submission/deletion through Firestore transactions, bulk text import with
 * fuzzy search, duplicate price detection, and JSON price export.
 */

var _bulkFishNameCacheLang = null;
var _bulkFishNameCacheMap = null;
var _selectedChartPointIdx = 0;

function saveLocalPriceSummary(metaLastUpdated) {
  try {
    priceSummary = compactSummaryMap(priceSummary || {});
    safeStorageSet('fishao_price_summary_v2', JSON.stringify(priceSummary));
    if (metaLastUpdated !== false) {
      var prevMetaRaw = safeStorageGet('fishao_price_summary_meta_v2');
      var prevMeta = prevMetaRaw ? JSON.parse(prevMetaRaw) : {};
      safeStorageSet('fishao_price_summary_meta_v2', JSON.stringify({
        lastUpdated: typeof metaLastUpdated === 'string' ? metaLastUpdated : (prevMeta.lastUpdated || ''),
        fetchedAt: Date.now()
      }));
    }
  } catch (err) {
    console.warn("Failed to save price summary locally:", err);
  }
  priceHistory = summaryMapToPriceHistory(priceSummary);
  if (typeof bumpPriceDataVersion === 'function') bumpPriceDataVersion();
}

function clonePriceSummary(map) {
  return compactSummaryMap(map);
}

function mergeSummaryShard(shardIdx, shardPrices, metaLastUpdated) {
  var nextSum = clonePriceSummary(priceSummary);
  Object.keys(nextSum).forEach(function (k) {
    if (getMarketSummaryShardIndex(k) === shardIdx) {
      delete nextSum[k];
    }
  });
  var cleanShard = compactSummaryMap(shardPrices);
  Object.keys(cleanShard).forEach(function (k) {
    nextSum[k] = cleanShard[k];
  });
  priceSummary = nextSum;
  saveLocalPriceSummary(metaLastUpdated);
}

function toDayEntryList(rawVal) {
  if (Array.isArray(rawVal)) {
    return rawVal.map(Number).filter(function (n) { return isFinite(n) && n > 0; });
  }
  var single = Number(rawVal);
  return (isFinite(single) && single > 0) ? [single] : [];
}

function encodeDayEntryList(list) {
  if (!list || list.length === 0) return undefined;
  return list.length === 1 ? list[0] : list;
}

function applyPriceToSummaryMap(summaryMap, fidStr, dateISO, priceNum, todayISO) {
  var dec = decodeFishSummaryEntry(summaryMap[fidStr]);
  var byPrice = Object.assign({}, dec.byPrice);

  var pKey = String(priceNum);
  var curInfo = byPrice[pKey];
  var prevLast = curInfo && typeof curInfo.l === "string" ? curInfo.l : "";
  var prevCount = curInfo && isFinite(Number(curInfo.c)) ? Number(curInfo.c) : 0;

  byPrice[pKey] = {
    l: (!prevLast || dateISO > prevLast) ? dateISO : prevLast,
    c: prevCount + 1
  };

  var td = dec.td || "";
  var tArr = Array.isArray(dec.t) ? dec.t.slice() : [];
  if (dateISO === (todayISO || getTodayISO())) {
    if (td === dateISO) {
      if (tArr.indexOf(priceNum) === -1) tArr.push(priceNum);
    } else {
      td = dateISO;
      tArr = [priceNum];
    }
  }

  var encoded = encodeFishSummaryEntry({ byPrice: byPrice, td: td, t: tArr });
  if (encoded) summaryMap[fidStr] = encoded;
}

function removePriceFromSummaryMap(summaryMap, fidStr, priceNum, targetDate, removedFromDaily, fallbackLastDate) {
  if (!summaryMap[fidStr]) return;
  var dec = decodeFishSummaryEntry(summaryMap[fidStr]);
  var byPrice = Object.assign({}, dec.byPrice);
  var pKey = String(priceNum);
  var info = byPrice[pKey];

  if (info && typeof info === "object") {
    var curCount = Math.max(1, parseInt(info.c, 10) || 1);
    if (targetDate && removedFromDaily && curCount > 1) {
      info.c = curCount - 1;
      if (fallbackLastDate) {
        info.l = fallbackLastDate;
      }
    } else {
      delete byPrice[pKey];
    }
  }

  var td = dec.td || "";
  var tArr = Array.isArray(dec.t) ? dec.t.slice() : [];
  if (targetDate && td === targetDate && tArr.length > 0) {
    tArr = tArr.filter(function (v) { return Number(v) !== priceNum; });
    if (tArr.length === 0) td = "";
  }

  var encoded = encodeFishSummaryEntry({ byPrice: byPrice, td: td, t: tArr });
  if (!encoded) {
    delete summaryMap[fidStr];
  } else {
    summaryMap[fidStr] = encoded;
  }
}

function sortPriceEntriesNewestFirst(list) {
  return list.slice().sort(function (a, b) {
    var dc = String(b.date || "").localeCompare(String(a.date || ""));
    return dc !== 0 ? dc : (Number(b.price) - Number(a.price));
  });
}

/**
 * Single display-only normalization for known prices.
 *
 * Returns a new, newest-first array with at most one entry per (date, price)
 * pair. Invalid entries are dropped and occurrence counts are preserved.
 */
function normalizePriceEntries(list) {
  if (!Array.isArray(list)) return [];

  var valid = [];
  list.forEach(function (item) {
    if (!item || typeof item !== "object") return;
    var price = Number(item.price);
    var date = typeof item.date === "string" ? item.date : "";
    if (!isFinite(price) || price <= 0 || !date) return;
    var countVal = Number(item.count);
    valid.push({
      date: date,
      price: price,
      count: (isFinite(countVal) && countVal > 1) ? Math.floor(countVal) : 1
    });
  });

  var sorted = sortPriceEntriesNewestFirst(valid);
  var seen = Object.create(null);
  var normalized = [];

  sorted.forEach(function (entry) {
    var key = entry.date + "|" + String(entry.price);
    if (seen[key]) return;
    seen[key] = true;
    normalized.push(entry);
  });

  return normalized;
}

var _normalizedPriceCacheVer = -1;
var _normalizedPriceCache = new Map();

function getNormalizedFishPrices(fid) {
  if (fid === undefined || fid === null) return [];
  var curVer = (typeof _priceDataVersion !== "undefined") ? _priceDataVersion : 0;
  if (_normalizedPriceCacheVer !== curVer) {
    _normalizedPriceCacheVer = curVer;
    _normalizedPriceCache.clear();
  }
  var key = String(fid);
  var cached = _normalizedPriceCache.get(key);
  if (cached) return cached;
  var normList = normalizePriceEntries(getFishPrices(key));
  _normalizedPriceCache.set(key, normList);
  return normList;
}

function getFishPrices(fid) {
  return priceHistory[fid.toString()] || [];
}

function isMarketClosedToday() {
  // In FISHAO game mechanics, Sunday market closure is strictly determined by UTC server time
  // (Sunday 00:00:00 UTC to Monday 00:00:00 UTC).
  return new Date().getUTCDay() === 0;
}

function getMarketClosedWindowText() {
  if (typeof userTimezone === 'undefined' || userTimezone === 'utc') {
    return t('market_window_utc');
  }

  // Calculate Sunday 00:00 UTC to Monday 00:00 UTC converted to user local timezone
  var now = new Date();
  var curUtcDay = now.getUTCDay(); // 0 = Sunday
  var sunUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - curUtcDay, 0, 0, 0, 0));
  var monUtc = new Date(sunUtc.getTime() + 24 * 60 * 60 * 1000);

  var days = t('day_names').split(',');

  var startDay = days[sunUtc.getDay()] || '';
  var startH = String(sunUtc.getHours()).padStart(2, '0');
  var startM = String(sunUtc.getMinutes()).padStart(2, '0');
  var startTime = startH + ':' + startM;

  var endDay = days[monUtc.getDay()] || '';
  var endH = String(monUtc.getHours()).padStart(2, '0');
  var endM = String(monUtc.getMinutes()).padStart(2, '0');
  var endTime = endH + ':' + endM;

  var localRange;
  if (startDay === endDay) {
    localRange = startDay + ' ' + startTime + ' – ' + endTime;
  } else {
    localRange = startDay + ' ' + startTime + ' – ' + endDay + ' ' + endTime;
  }

  return localRange + ' (' + t('market_window_game_ref') + ')';
}

function updateMarketSundayCountdown() {
  if (typeof currentView !== "undefined" && currentView !== "market") return;
  var isSunday = isMarketClosedToday();
  var countdownEl = document.getElementById("marketSundayCountdown");
  var openTimeEl = document.getElementById("marketSundayOpenTimeText");
  var utcWarningEl = document.getElementById("marketSundayUtcWarning");
  var utcWarningTextEl = document.getElementById("marketSundayUtcWarningText");

  if (!isSunday) return;

  var now = new Date();
  var curUtcDay = now.getUTCDay();
  var daysUntilMonday = (7 - curUtcDay) % 7 || 1;
  var monUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0, 0));
  var diffMs = Math.max(0, monUtc.getTime() - now.getTime());

  if (countdownEl) {
    var totalSec = Math.floor(diffMs / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    countdownEl.innerText = String(h).padStart(2, '0') + "h " + String(m).padStart(2, '0') + "m " + String(s).padStart(2, '0') + "s";
  }

  var city = (typeof getLocalizedTzCity === 'function') ? getLocalizedTzCity() : t('tz_local_city_default');
  var days = t('day_names').split(',');
  var openLocalDay = days[monUtc.getDay()] || '';

  var localH = String(monUtc.getHours()).padStart(2, '0');
  var localM = String(monUtc.getMinutes()).padStart(2, '0');
  var localTimeStr = localH + ":" + localM;

  var tzOffset = -now.getTimezoneOffset();
  var tzSign = tzOffset >= 0 ? "+" : "-";
  var tzHours = Math.floor(Math.abs(tzOffset) / 60);
  var tzOffsetStr = "UTC" + tzSign + tzHours;

  if (openTimeEl) {
    if (userTimezone === "utc") {
      openTimeEl.innerText = t('market_opens_utc');
    } else {
      openTimeEl.innerText = t('market_opens_local', {
        day: openLocalDay,
        time: localTimeStr,
        city: city,
        tz: tzOffsetStr
      });
    }
  }

  if (utcWarningEl && utcWarningTextEl) {
    if (userTimezone === "utc") {
      utcWarningEl.style.display = "flex";
      utcWarningTextEl.innerText = t('market_utc_warning_text', {
        city: city,
        day: openLocalDay,
        time: localTimeStr
      });
    } else {
      utcWarningEl.style.display = "none";
    }
  }
}

function formatPriceDate(isoDate) {
  if (!isoDate) return "";
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.formatDate === 'function') {
    return window.FISHAO_I18N.formatDate(isoDate);
  }
  return isoDate;
}

/**
 * Returns the newest distinct known price entry for a fish.
 */
function getLatestPrice(fid) {
  var list = getNormalizedFishPrices(fid);
  return list.length ? list[0] : null;
}

/**
 * Returns the highest distinct known price entry for a fish.
 * The normalized list is newest-first, so on a tie the most recent record wins.
 */
function getMaxPrice(fid) {
  var list = getNormalizedFishPrices(fid);
  if (!list.length) return null;
  return list.reduce(function (best, item) {
    return item.price > best.price ? item : best;
  });
}

/**
 * Maps the game's rarity_factor (spawn weight multiplier) to a display tier.
 * 1.0 is the baseline weight; lower values are rarer (0.01 = 100x rarer than baseline).
 */
function getRarityTier(factor) {
  var val = (typeof factor === 'number') ? factor : parseFloat(factor);
  if (!isFinite(val) || val >= 1) return { key: 'common', cls: 'rarity-common' };
  if (val >= 0.5) return { key: 'uncommon', cls: 'rarity-uncommon' };
  if (val >= 0.2) return { key: 'rare', cls: 'rarity-rare' };
  if (val >= 0.1) return { key: 'very_rare', cls: 'rarity-very-rare' };
  return { key: 'legendary', cls: 'rarity-legendary' };
}

function formatRarityPercent(factor) {
  var val = (typeof factor === 'number') ? factor : parseFloat(factor);
  if (!isFinite(val) || val <= 0) return '';
  return parseFloat((val * 100).toFixed(2)).toString() + '%';
}

var modalBaitAdvisorTimeMode = 'now'; // 'now' | 'overlap'
var modalBaitExpandedKeys = {};
var modalBaitInfoOpen = false;

function formatAdvisorChanceLabel(chancePct, competitorCount) {
  if (competitorCount === 0 || chancePct >= 100) {
    return t('advisor_chance_label_pure');
  }
  return t('advisor_chance_label', { pct: chancePct });
}

function renderModalHeaderBaits(fish, rec) {
  var baitsEl = document.getElementById("modalFishBaits");
  if (!baitsEl) return;
  if (!fish || !fish.baits || !fish.baits.length) {
    baitsEl.innerHTML = '<span style="color: var(--text-muted);">' + t('bait_unknown') + '</span>';
    return;
  }
  var bestBaitSet = {};
  if (fish.baits.length > 1 && rec && Array.isArray(rec.spots)) {
    rec.spots.forEach(function (sp) {
      sp.baits.forEach(function (bi) {
        if (bi.isBestOverall) bestBaitSet[bi.bait] = true;
      });
    });
  }
  baitsEl.innerHTML = fish.baits.map(function (b) {
    if (bestBaitSet[b]) {
      var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
      return '<span class="bait-tag bait-best" title="' + escapeHtml(t('advisor_best_badge')) + '">' +
        renderBaitIconImg(b, 'bait-tag-icon', true) +
        '<span>' + escapeHtml(bName) + '</span>' +
      '</span>';
    }
    return renderBaitTag(b);
  }).join('');
}

function setModalBaitAdvisorTimeMode(mode) {
  if (mode === 'now') {
    modalBaitAdvisorTimeMode = (modalBaitAdvisorTimeMode === 'now') ? 'overlap' : 'now';
  } else {
    modalBaitAdvisorTimeMode = 'overlap';
  }
  if (selectedModalFishId) {
    var fishObj = (typeof getFishById === "function") ? getFishById(selectedModalFishId) : null;
    var rec = renderModalBaitAdvisor(selectedModalFishId);
    if (fishObj) renderModalHeaderBaits(fishObj, rec);
  }
}

function toggleModalBaitAdvisorInfo() {
  modalBaitInfoOpen = !modalBaitInfoOpen;
  if (selectedModalFishId) {
    var modalBody = document.querySelector('#priceModalOverlay .modal-body');
    var prevScroll = modalBody ? modalBody.scrollTop : 0;
    renderModalBaitAdvisor(selectedModalFishId);
    if (modalBody) modalBody.scrollTop = prevScroll;
  }
}

function toggleModalBaitCompetitors(spotBaitKey) {
  if (!spotBaitKey) return;
  modalBaitExpandedKeys[spotBaitKey] = !modalBaitExpandedKeys[spotBaitKey];
  if (selectedModalFishId) {
    var modalBody = document.querySelector('#priceModalOverlay .modal-body');
    var prevScroll = modalBody ? modalBody.scrollTop : 0;
    renderModalBaitAdvisor(selectedModalFishId);
    if (modalBody) modalBody.scrollTop = prevScroll;
  }
}

function openSpotBaitInFishdex(locKey, placeKey, baitCode) {
  closePriceModal();
  var timeArg = (modalBaitAdvisorTimeMode === 'now') ? 'now' : '';
  if (typeof openLocationInFishdex === 'function') {
    openLocationInFishdex(locKey, placeKey || '', timeArg, 'all');
  }
  if (baitCode) {
    var baitSelect = document.getElementById('baitFilter');
    if (baitSelect) baitSelect.value = baitCode;
    if (typeof syncBaitSelectIcon === 'function') {
      syncBaitSelectIcon('baitFilter', 'baitFilterIcon');
    }
    if (typeof applyFilters === 'function') {
      applyFilters();
    }
  }
}

function areOtherBaitsHidden() {
  try {
    return localStorage.getItem('fishao_hide_other_baits') !== 'false';
  } catch (e) {
    return true;
  }
}

function toggleOtherBaitsVisibility() {
  var next = !areOtherBaitsHidden();
  try {
    localStorage.setItem('fishao_hide_other_baits', next ? 'true' : 'false');
  } catch (e) { }
  if (selectedModalFishId) {
    renderModalBaitAdvisor(selectedModalFishId);
  }
}

function renderModalBaitAdvisor(fid, precomputedRec) {
  var box = document.getElementById("modalBaitAdvisorBox");
  if (!box) return null;

  var fish = (typeof getFishById === "function")
    ? getFishById(fid)
    : allFishes.find(function (x) { return x.id === fid; });
  if (!fish || !Array.isArray(fish.baits) || fish.baits.length === 0 || typeof computeFishBaitRecommendations !== 'function') {
    box.style.display = "none";
    box.innerHTML = "";
    return null;
  }

  var rec = precomputedRec || computeFishBaitRecommendations(fish, { timeMode: modalBaitAdvisorTimeMode });
  if (!rec || !rec.spots || rec.spots.length === 0) {
    box.style.display = "none";
    box.innerHTML = "";
    return rec;
  }

  box.style.display = "block";

  var hideOtherBaits = areOtherBaitsHidden();

  var isNowActive = (modalBaitAdvisorTimeMode === 'now');
  var modeBtnsHtml = '<button type="button" class="bait-advisor-mode-btn' + (isNowActive ? ' active' : '') + '"' +
    ' title="' + escapeHtml(t('advisor_mode_now_title')) + '"' +
    ' onclick="window.fishaoApp.setModalBaitAdvisorTimeMode(\'now\')">' +
    escapeHtml(t('advisor_mode_now')) +
  '</button>';

  var nowWarnHtml = '';
  if (modalBaitAdvisorTimeMode === 'now' && typeof isFishActiveNow === 'function' && !isFishActiveNow(fish.raw_times, fish.raw_dates)) {
    nowWarnHtml = '<div class="bait-advisor-now-warn">' + escapeHtml(t('advisor_inactive_now_warn')) + '</div>';
  }

  var topTipHtml = '';
  if ((fish.baits.length > 1 || rec.spots.length > 1) && rec.bestOverall) {
    var best = rec.bestOverall;
    var bestSpotText = best.areaLabel ? (best.locLabel + ' · ' + best.areaLabel) : best.locLabel;
    var bestCompText = formatCompetitorCountLabel(best.competitorCount);
    topTipHtml = '<div class="bait-advisor-top-tip">' +
      '<span class="bait-advisor-top-label">' + escapeHtml(t('advisor_top_tip_label')) + '</span> ' +
      '<span class="bait-advisor-top-spot">' + escapeHtml(bestSpotText) + '</span> ' +
      '<span class="bait-advisor-top-sep">→</span> ' +
      renderBaitInline(best.bait) +
      '<span class="bait-advisor-top-meta">(' + escapeHtml(bestCompText) + ' • ' +
        escapeHtml(formatAdvisorChanceLabel(best.chancePct, best.competitorCount)) + ')</span>' +
    '</div>';
  }

  var hasMultipleSpots = rec.spots.length > 1;
  var spotsHtml = rec.spots.map(function (spot, spotIdx) {
    var spotKey = spot.locKey + '|' + (spot.placeKey || 'general');
    var bestBaitCode = spot.bestBait ? spot.bestBait.bait : '';
    var isTopSpot = !!(hasMultipleSpots && spot.bestBait && spot.bestBait.isBestOverall);
    var safeLocArg = escapeHtml(spot.locKey).replace(/'/g, '&#39;');
    var safePlaceArg = escapeHtml(spot.placeKey || '').replace(/'/g, '&#39;');
    var safeBaitArg = escapeHtml(bestBaitCode).replace(/'/g, '&#39;');

    var visibleBaits = hideOtherBaits ? spot.baits.slice(0, 1) : spot.baits;
    var rowHtmlList = visibleBaits.map(function (bItem, bIdx) {
      var rowKey = spotKey + '|' + bItem.bait;
      var safeRowKey = escapeHtml(rowKey).replace(/'/g, '&#39;');
      var isHighlight = bItem.isBestInSpot && (spot.baits.length > 1 || bItem.competitorCount === 0 || (hasMultipleSpots && bItem.isBestOverall));
      var compClass = bItem.competitorCount <= 3 ? 'low' : (bItem.competitorCount <= 8 ? 'med' : 'high');
      var rareTotal = bItem.midCount + bItem.rareCount;
      var isExpanded = Boolean(modalBaitExpandedKeys[rowKey]);

      var rankBadge = isHighlight
        ? '<span class="bait-advisor-rank best">' + escapeHtml(t('advisor_best_badge')) + '</span>'
        : '<span class="bait-advisor-rank">#' + (bIdx + 1) + '</span>';

      var breakdownHtml = bItem.competitorCount > 0
        ? '<span class="bait-advisor-breakdown">' +
            '<span class="breakdown-common">' + escapeHtml(t('advisor_breakdown_common', { count: bItem.commonCount })) + '</span>' +
            '<span class="breakdown-sep">•</span>' +
            '<span class="breakdown-rare">' + escapeHtml(t('advisor_breakdown_rare', { count: rareTotal })) + '</span>' +
          '</span>'
        : '';

      var toggleBtnHtml = bItem.competitorCount > 0
        ? '<button type="button" class="bait-advisor-comp-toggle' + (isExpanded ? ' open' : '') + '"' +
            ' onclick="window.fishaoApp.toggleModalBaitCompetitors(\'' + safeRowKey + '\')">' +
            '<span>👥 ' + escapeHtml(isExpanded ? t('advisor_hide_competitors') : t('advisor_show_competitors', { count: bItem.competitorCount })) + '</span>' +
            '<span class="toggle-caret">' + (isExpanded ? '▲' : '▼') + '</span>' +
          '</button>'
        : '';

      var compListHtml = '';
      if (bItem.competitorCount > 0 && isExpanded) {
        if (!bItem._competitorsSorted && Array.isArray(bItem.competitors)) {
          bItem._competitorsSorted = true;
          bItem.competitors.sort(function (a, b) {
            return (getFishSpawnWeight(b) - getFishSpawnWeight(a)) || (a.rating - b.rating);
          });
        }
        var chips = bItem.competitors.map(function (cf) {
          var cfName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(cf) : cf.name;
          var cfTime = (cf.raw_times && cf.raw_times.length && typeof formatCatchTime === 'function')
            ? formatCatchTime(cf.raw_times).primary
            : t('time_all_day');
          var cfStars = (cf.rating || 1) + '★';
          return '<button type="button" class="bait-advisor-comp-chip rate-' + (cf.rating || 1) + '"' +
            ' onclick="window.fishaoApp.openPriceModal(' + Number(cf.id) + ')"' +
            ' title="' + escapeHtml(cfName + ' (' + cfStars + ') • ' + cfTime) + '">' +
            '<img src="images/fish_' + Number(cf.id) + '.webp" alt="" loading="lazy"' +
              ' onerror="this.onerror=null;this.style.display=\'none\';">' +
            '<span class="comp-chip-name">' + escapeHtml(cfName) + '</span>' +
            '<span class="comp-chip-stars">' + escapeHtml(cfStars) + '</span>' +
            '<span class="comp-chip-time">' + escapeHtml(cfTime) + '</span>' +
          '</button>';
        }).join('');
        compListHtml = '<div class="bait-advisor-comp-list">' + chips + '</div>';
      }

      return '<div class="bait-advisor-row' + (isHighlight ? ' is-best' : '') + '">' +
        '<div class="bait-advisor-row-main">' +
          '<div class="bait-advisor-row-left">' +
            rankBadge +
            renderBaitTag(bItem.bait) +
          '</div>' +
          '<div class="bait-advisor-row-metrics">' +
            '<span class="comp-pill ' + compClass + '">' + escapeHtml(formatCompetitorCountLabel(bItem.competitorCount)) + '</span>' +
            breakdownHtml +
            '<span class="chance-pill" title="' + escapeHtml(t('advisor_chance_tooltip')) + '">' +
              escapeHtml(formatAdvisorChanceLabel(bItem.chancePct, bItem.competitorCount)) +
            '</span>' +
          '</div>' +
        '</div>' +
        (toggleBtnHtml ? '<div class="bait-advisor-row-sub">' + toggleBtnHtml + compListHtml + '</div>' : '') +
      '</div>';
    });

    var otherToggleHtml = '';
    if (spot.baits.length > 1) {
      var otherCount = spot.baits.length - 1;
      var otherLabel = hideOtherBaits
        ? (t('advisor_show_other_baits') + ' (+' + otherCount + ')')
        : t('advisor_hide_other_baits');
      otherToggleHtml = '<button type="button" class="bait-advisor-other-toggle"' +
        ' onclick="window.fishaoApp.toggleOtherBaitsVisibility()">' +
        '<span>' + escapeHtml(otherLabel) + '</span>' +
        '<span class="toggle-caret">' + (hideOtherBaits ? '▼' : '▲') + '</span>' +
      '</button>';
    }

    var rowsContentHtml = (rowHtmlList[0] || '') + otherToggleHtml + rowHtmlList.slice(1).join('');

    var spotRankHtml = '';
    if (hasMultipleSpots) {
      spotRankHtml = isTopSpot
        ? '<span class="bait-advisor-spot-rank best">' + escapeHtml(t('advisor_best_spot_badge')) + '</span>'
        : '<span class="bait-advisor-spot-rank">#' + (spotIdx + 1) + '</span>';
    }
    var cardCls = 'bait-advisor-loc-card' +
      (hasMultipleSpots ? (isTopSpot ? ' is-top-spot' : ' is-secondary-spot') : '');

    return '<div class="' + cardCls + '">' +
      '<div class="bait-advisor-loc-header">' +
        '<div class="bait-advisor-loc-title">' +
          spotRankHtml +
          '<span class="loc-tag">' + escapeHtml(spot.locLabel) + '</span>' +
          (spot.areaLabel ? '<span class="loc-area-chip">📍 ' + escapeHtml(spot.areaLabel) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="bait-advisor-filter-btn"' +
          ' onclick="window.fishaoApp.openSpotBaitInFishdex(\'' + safeLocArg + '\', \'' + safePlaceArg + '\', \'' + safeBaitArg + '\')">' +
          escapeHtml(t('advisor_filter_in_table')) +
        '</button>' +
      '</div>' +
      '<div class="bait-advisor-rows">' + rowsContentHtml + '</div>' +
    '</div>';
  }).join('');

  var infoBoxHtml = modalBaitInfoOpen
    ? '<div class="bait-advisor-info-box">' + t('advisor_info_desc') + '</div>'
    : '';

  box.innerHTML =
    '<div class="bait-advisor-header">' +
      '<div class="bait-advisor-title-group">' +
        '<span class="bait-advisor-title">' + escapeHtml(t('advisor_title')) + '</span>' +
        '<button type="button" class="bait-advisor-info-btn' + (modalBaitInfoOpen ? ' active' : '') + '"' +
          ' aria-expanded="' + (modalBaitInfoOpen ? 'true' : 'false') + '"' +
          ' title="' + escapeHtml(t('advisor_info_title')) + '"' +
          ' onclick="window.fishaoApp.toggleModalBaitAdvisorInfo()">' +
          escapeHtml(t('advisor_info_btn')) +
        '</button>' +
      '</div>' +
      '<div class="bait-advisor-mode-pills">' + modeBtnsHtml + '</div>' +
    '</div>' +
    infoBoxHtml +
    nowWarnHtml +
    topTipHtml +
    '<div class="bait-advisor-spots-grid">' + spotsHtml + '</div>';

  return rec;
}

function openPriceModal(fid, skipSync) {
  selectedModalFishId = fid;
  modalBaitExpandedKeys = {};
  _selectedChartPointIdx = -1;
  var fishObj = (typeof getFishById === "function") ? getFishById(fid) : allFishes.find(function (x) { return x.id === fid; });
  if (!fishObj) return;

  var f = Object.assign({}, fishObj);

  var nameEl = document.getElementById("modalFishName");
  var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
  if (nameEl) nameEl.innerText = fishName;
  var modalTitleFishEl = document.getElementById("modalTitleFishName");
  if (modalTitleFishEl) modalTitleFishEl.innerText = fishName ? (" – " + fishName) : "";
  var altNameEl = document.getElementById("modalFishAltName");
  if (altNameEl) {
    var otherName = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getAltFishName === 'function')
      ? window.FISHAO_I18N.getAltFishName(f)
      : '';
    if (otherName && otherName !== fishName) {
      altNameEl.innerText = '(' + otherName + ')';
      altNameEl.style.display = 'inline-block';
    } else {
      altNameEl.style.display = 'none';
      altNameEl.innerText = '';
    }
  }
  try {
    document.title = fishName + t('seo_fish_title_suffix');
  } catch (e) { }

  if (!skipSync && window.fishaoApp && typeof window.fishaoApp.syncUrlRoute === "function") {
    window.fishaoApp.syncUrlRoute(currentView, fid);
  }

  var idBadge = document.getElementById("modalFishIdBadge");
  if (idBadge) idBadge.innerText = "#" + f.id;

  var clubTag = document.getElementById("modalFishClubTag");
  if (clubTag) {
    clubTag.innerText = t('badge_club_fish');
    clubTag.style.display = (f.is_club || f.points !== undefined) ? "inline-block" : "none";
  }

  var imgEl = document.getElementById("modalFishImg");
  if (imgEl) {
    imgEl.style.display = "";
    imgEl.src = "images/fish_" + f.id + ".webp";
    imgEl.onerror = function () {
      this.onerror = null;
      this.style.display = "none";
    };
  }

  var isNow = isFishActiveNow(f.raw_times, f.raw_dates);
  var actBadge = document.getElementById("modalFishActiveBadge");
  if (actBadge) {
    actBadge.innerText = t('time_active_now');
    actBadge.style.display = isNow ? "inline-block" : "none";
  }

  var ratingBox = document.getElementById("modalFishRatingBox");
  if (ratingBox) ratingBox.innerHTML = renderRatingBadge(f.rating);

  updateModalCaughtBtn(fid);
  if (typeof updateModalBackyardBtn === 'function') {
    updateModalBackyardBtn(fid);
  }
  if (typeof renderModalBackyardOwners === 'function') {
    renderModalBackyardOwners(fid);
  }

  // Locations: parent location tags plus a compact specific-area chip.
  var locEl = document.getElementById("modalFishLocations");
  if (locEl) {
    var parentLabels = getFishParentLocationLabels(f);
    var areaLabels = getFishAreaLabels(f);
    var locHtml = '';

    if (parentLabels.length) {
      locHtml += parentLabels.map(function (locName) {
        return '<span class="loc-tag">' + escapeHtml(locName) + '</span>';
      }).join(' ');
    } else if (f.is_club) {
      var clubLoc = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName('location_112') : 'location_112';
      locHtml += '<span class="loc-tag">' + escapeHtml(clubLoc) + '</span>';
    } else {
      locHtml += '<span style="color: var(--text-muted);">' + t('loc_unspecified') + '</span>';
    }

    if (areaLabels.length) {
      locHtml += ' ' + areaLabels.map(function (areaName) {
        return '<span class="loc-area-chip" title="' +
          escapeHtml(t('modal_area_title', { name: areaName })) + '">📍 ' +
          escapeHtml(areaName) + '</span>';
      }).join(' ');
    }

    locEl.innerHTML = locHtml;
  }

  // Baits & Smart Bait Advisor
  var advisorRec = renderModalBaitAdvisor(fid);
  renderModalHeaderBaits(f, advisorRec);

  // Time
  var timeEl = document.getElementById("modalFishTime");
  if (timeEl) {
    var timeInfo = formatCatchTime(f.raw_times);
    timeEl.innerHTML = '<span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
      (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
      (isNow ? ' <span class="time-now-active">' + t('time_active_now_short') + '</span>' : '') +
      '</span>' + (timeInfo.sub ? ' <span style="font-size: 11px; color: var(--text-muted);">' + timeInfo.sub + '</span>' : '');
  }

  // Season / Dates
  var seasonEl = document.getElementById("modalFishSeason");
  if (seasonEl) {
    var dateInfo = formatCatchDate(f.raw_dates);
    if (dateInfo.isSeasonal) {
      var badgeClass = dateInfo.inSeason ? "date-badge in-season" : "date-badge out-of-season";
      var statusText = dateInfo.inSeason ? t('date_in_season') : t('date_out_of_season');
      seasonEl.innerHTML = '<span class="' + badgeClass + '"><span class="date-icon">📅</span> ' + dateInfo.text + '</span> ' +
        '<span style="font-size: 11px; margin-left: 4px; color: ' + (dateInfo.inSeason ? '#34d399' : '#fb923c') + ';">(' + statusText + ')</span>';
    } else {
      seasonEl.innerHTML = '<span style="color: var(--text-muted);">' + t('date_all_year') + '</span>';
    }
  }

  // Dimensions
  var dimEl = document.getElementById("modalFishDimensions");
  if (dimEl) {
    dimEl.innerHTML = '<span class="len-dim">' + t('dim_min', { val: f.min_l }) + '</span> • ' +
      '<strong class="len-avg" style="color: #38bdf8;">' + t('dim_avg', { val: f.avg_l }) + '</strong> • ' +
      '<span class="len-dim">' + t('dim_max', { val: f.max_l }) + '</span>';
  }

  // Rarity (game rarity_factor, 1.0 = baseline weight, lower = rarer)
  var rarityEl = document.getElementById("modalFishRarity");
  if (rarityEl) {
    var rarityFactor = (typeof f.rarity_factor === 'number') ? f.rarity_factor : parseFloat(f.rarity_factor);
    if (isFinite(rarityFactor) && rarityFactor > 0) {
      var rarityTier = getRarityTier(rarityFactor);
      rarityEl.innerHTML = '<span class="rarity-pill ' + rarityTier.cls + '">' +
        t('rarity_' + rarityTier.key) + ' (' + formatRarityPercent(rarityFactor) + ')' +
        '</span>';
    } else {
      rarityEl.innerHTML = '<span style="color: var(--text-muted);">--</span>';
    }
  }

  // Club unlock status
  var clubBox = document.getElementById("modalFishClubBox");
  var clubUnlockEl = document.getElementById("modalFishClubUnlock");
  if (clubBox && clubUnlockEl) {
    var status = getUnlockStatus(f, currentClubPoints);
    if (status && (f.is_club || f.unlock_type)) {
      clubBox.style.display = "block";
      clubUnlockEl.innerHTML = '<strong style="color: #fbbf24;">' + status.costText + '</strong> (' + status.desc + ')';
    } else {
      clubBox.style.display = "none";
    }
  }

  var initialPriceDate = getTodayISO();
  var elNewDate = document.getElementById("newPriceDate");
  if (elNewDate) elNewDate.value = initialPriceDate;
  var elNewVal = document.getElementById("newPriceValue");
  if (elNewVal) elNewVal.value = "";

  onPriceDateChange(initialPriceDate);

  syncManualImportVisibility();

  renderModalHistory(fid);
  var overlayEl = document.getElementById("priceModalOverlay");
  overlayEl.classList.add("active");

  var modalBody = overlayEl.querySelector(".modal-body");
  if (modalBody) {
    if (currentView === "market") {
      requestAnimationFrame(function () {
        var marketDivider = modalBody.querySelector(".modal-market-divider");
        if (marketDivider) {
          var offset = marketDivider.getBoundingClientRect().top - modalBody.getBoundingClientRect().top + modalBody.scrollTop - 12;
          modalBody.scrollTop = Math.max(0, offset);
        } else {
          modalBody.scrollTop = modalBody.scrollHeight;
        }
      });
    } else {
      modalBody.scrollTop = 0;
    }
  }
}

function closePriceModal(skipSync) {
  document.getElementById("priceModalOverlay").classList.remove("active");
  selectedModalFishId = null;
  try {
    var defTitle = t("seo_page_title");
    if (defTitle && defTitle !== "seo_page_title") {
      document.title = defTitle;
    }
  } catch (e) { }

  if (!skipSync && window.fishaoApp && typeof window.fishaoApp.syncUrlRoute === "function") {
    window.fishaoApp.syncUrlRoute(currentView, null, true);
  }
}

/**
 * Summary statistics over display-normalized price entries.
 * Returns null for an empty list.
 */
function computePriceStats(list) {
  if (!list || !list.length) return null;
  var values = list.map(function (x) { return x.price; }).sort(function (a, b) { return a - b; });
  var n = values.length;
  var sum = values.reduce(function (acc, v) { return acc + v; }, 0);
  var median = (n % 2 === 1) ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
  return { min: values[0], max: values[n - 1], avg: sum / n, median: median, count: n };
}

function isPriceChartHidden() {
  try {
    return localStorage.getItem('fishao_hide_price_chart') === 'true';
  } catch (e) {
    return false;
  }
}

function togglePriceChartVisibility() {
  var next = !isPriceChartHidden();
  try {
    localStorage.setItem('fishao_hide_price_chart', next ? 'true' : 'false');
  } catch (e) { }
  if (selectedModalFishId) {
    renderModalPriceScale(getNormalizedFishPrices(selectedModalFishId), selectedModalFishId);
  }
}

/**
 * Renders the visual price distribution mini-chart & touch/pointer point inspector
 * inside #modalPriceScale so values, last-seen dates, and occurrence counts are
 * readable and interactive on both mobile (tap/step) and desktop (hover/click).
 */
function renderModalPriceScale(list, fid) {
  var box = document.getElementById("modalPriceScale");
  if (!box) return;
  var fishId = fid || selectedModalFishId;
  var stats = computePriceStats(list);
  if (!stats) {
    box.style.display = "none";
    box.classList.remove("collapsed");
    box.innerHTML = "";
    return;
  }

  var locale = getLocale();
  var fmt = function (v) {
    return Math.round(v).toLocaleString(locale) + " FB";
  };
  var medLabel = t('modal_price_median');

  var hidden = isPriceChartHidden();
  box.classList.toggle("collapsed", hidden);

  var toggleLabel = t(hidden ? 'modal_price_chart_show' : 'modal_price_chart_hide');
  var headHtml =
    '<div class="price-scale-head">' +
      '<span class="price-scale-title">' + escapeHtml(t('modal_price_scale_title')) + '</span>' +
      '<span class="price-scale-median-pill"><i></i>' + escapeHtml(medLabel) + ': <strong>' + fmt(stats.median) + '</strong></span>' +
      '<div class="price-scale-head-right">' +
        '<span class="price-scale-count">' + escapeHtml(t('modal_price_count')) + ': <strong>' + stats.count + '</strong></span>' +
        '<button type="button" class="price-scale-toggle-btn">' + escapeHtml(toggleLabel) + '</button>' +
      '</div>' +
    '</div>';

  if (hidden) {
    box.innerHTML = headHtml;
    box.style.display = "";
    var collapsedBtn = box.querySelector(".price-scale-toggle-btn");
    if (collapsedBtn) collapsedBtn.addEventListener("click", togglePriceChartVisibility);
    return;
  }

  var sorted = list.slice().sort(function (a, b) {
    return a.price - b.price || String(a.date || "").localeCompare(String(b.date || ""));
  });

  // Default to the newest entry on initial open so the latest recorded price & date are immediately visible
  if (_selectedChartPointIdx < 0 || _selectedChartPointIdx >= sorted.length) {
    var newestItem = list[0];
    var newestIdx = newestItem ? sorted.indexOf(newestItem) : sorted.length - 1;
    _selectedChartPointIdx = newestIdx >= 0 ? newestIdx : sorted.length - 1;
  }

  var chartHtml = '';
  var pts = [];
  if (stats.count >= 2) {
    var W = 420;
    var H = 124;
    var padL = 46;
    var padR = 14;
    var padT = 14;
    var padB = 14;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var span = stats.max - stats.min;

    var xFor = function (idx) {
      return padL + (idx / (sorted.length - 1)) * plotW;
    };
    var yFor = function (val) {
      if (span <= 0) return padT + plotH / 2;
      return padT + plotH - ((val - stats.min) / span) * plotH;
    };

    pts = sorted.map(function (item, idx) {
      return {
        idx: idx,
        x: xFor(idx),
        y: yFor(item.price),
        item: item
      };
    });

    var linePath = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
    var bottomY = (padT + plotH).toFixed(1);
    var areaPath = linePath +
      ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + bottomY +
      ' L' + pts[0].x.toFixed(1) + ',' + bottomY + ' Z';

    var medY = yFor(stats.median).toFixed(1);
    var midY = (padT + plotH / 2).toFixed(1);
    var topY = padT.toFixed(1);
    var dotR = sorted.length > 24 ? 3.2 : 4.2;
    var selPt = pts[_selectedChartPointIdx] || pts[pts.length - 1];

    var nodesHtml = pts.map(function (p) {
      var title = t('modal_price_dot_title', {
        price: p.item.price.toLocaleString(locale),
        date: formatPriceDate(p.item.date)
      });
      var selCls = (p.idx === selPt.idx) ? ' is-selected' : '';
      return '<g class="price-chart-node' + selCls + '" data-idx="' + p.idx + '" tabindex="0" role="button" aria-label="' + escapeHtml(title) + '">' +
        '<circle class="price-chart-hit" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="15"></circle>' +
        '<circle class="price-chart-ring" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="8"></circle>' +
        '<circle class="price-chart-dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + dotR + '"></circle>' +
        '<title>' + escapeHtml(title) + '</title>' +
      '</g>';
    }).join('');

    var axisLblsHtml =
      '<text class="price-chart-axis-lbl" x="' + (padL - 6) + '" y="' + (padT + 3) + '">' + escapeHtml(stats.max.toLocaleString(locale)) + '</text>' +
      '<text class="price-chart-axis-lbl med" x="' + (padL - 6) + '" y="' + (Number(medY) + 3).toFixed(1) + '">' + escapeHtml(Math.round(stats.median).toLocaleString(locale)) + '</text>' +
      '<text class="price-chart-axis-lbl" x="' + (padL - 6) + '" y="' + (Number(bottomY) + 3).toFixed(1) + '">' + escapeHtml(stats.min.toLocaleString(locale)) + '</text>';

    chartHtml =
      '<div class="price-chart-wrap">' +
        '<svg class="price-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + escapeHtml(t('modal_price_scale_title')) + '">' +
          '<defs>' +
            '<linearGradient id="priceChartAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#34d399" stop-opacity="0.28"/>' +
              '<stop offset="100%" stop-color="#34d399" stop-opacity="0.02"/>' +
            '</linearGradient>' +
            '<linearGradient id="priceChartLineGrad" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0%" stop-color="#f87171"/>' +
              '<stop offset="50%" stop-color="#fbbf24"/>' +
              '<stop offset="100%" stop-color="#34d399"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<line class="price-chart-grid" x1="' + padL + '" y1="' + topY + '" x2="' + (W - padR) + '" y2="' + topY + '"/>' +
          '<line class="price-chart-grid" x1="' + padL + '" y1="' + midY + '" x2="' + (W - padR) + '" y2="' + midY + '"/>' +
          '<line class="price-chart-grid" x1="' + padL + '" y1="' + bottomY + '" x2="' + (W - padR) + '" y2="' + bottomY + '"/>' +
          axisLblsHtml +
          '<path d="' + areaPath + '" fill="url(#priceChartAreaGrad)"/>' +
          '<line class="price-chart-ref median" x1="' + padL + '" y1="' + medY + '" x2="' + (W - padR) + '" y2="' + medY + '"><title>' + escapeHtml(medLabel + ': ' + fmt(stats.median)) + '</title></line>' +
          '<line class="price-chart-crosshair" x1="' + selPt.x.toFixed(1) + '" y1="' + topY + '" x2="' + selPt.x.toFixed(1) + '" y2="' + bottomY + '"/>' +
          '<path class="price-chart-line" d="' + linePath + '" stroke="url(#priceChartLineGrad)"/>' +
          nodesHtml +
        '</svg>' +
      '</div>';
  }

  var stepBtnsVisible = sorted.length > 1;
  var inspectorHtml =
    '<div class="price-chart-inspector">' +
      (stepBtnsVisible
        ? '<button type="button" class="price-chart-step-btn" data-step="-1" title="' + escapeHtml(t('modal_chart_prev')) + '" aria-label="' + escapeHtml(t('modal_chart_prev')) + '">‹</button>'
        : '') +
      '<div class="price-chart-inspector-main" id="priceChartInspectorMain"></div>' +
      (stepBtnsVisible
        ? '<button type="button" class="price-chart-step-btn" data-step="1" title="' + escapeHtml(t('modal_chart_next')) + '" aria-label="' + escapeHtml(t('modal_chart_next')) + '">›</button>'
        : '') +
    '</div>';

  var hintHtml = stats.count === 1
    ? '<div class="price-scale-note">' + escapeHtml(t('modal_price_scale_single')) + '</div>'
    : '<div class="price-scale-note">' + escapeHtml(t('modal_chart_hint')) + '</div>';

  box.innerHTML =
    headHtml +
    chartHtml +
    inspectorHtml +
    hintHtml;
  box.style.display = "";

  var expandedBtn = box.querySelector(".price-scale-toggle-btn");
  if (expandedBtn) expandedBtn.addEventListener("click", togglePriceChartVisibility);

  var updateInspector = function (idx) {
    if (idx < 0 || idx >= sorted.length) return;
    _selectedChartPointIdx = idx;
    var item = sorted[idx];
    var mainEl = box.querySelector("#priceChartInspectorMain");
    if (mainEl && item) {
      var occHtml = (item.count && item.count > 1)
        ? '<span class="price-occ-badge">' + escapeHtml(t('modal_price_occurrences', { count: item.count })) + '</span>'
        : '';
      var posHtml = sorted.length > 1
        ? '<span class="price-inspector-pos">' + (idx + 1) + '/' + sorted.length + '</span>'
        : '';
      var delHtml = (isAdmin && fishId)
        ? '<button type="button" class="btn-delete-price price-inspector-delete" title="' + escapeHtml(t('price_delete_admin_title')) + '" data-fid="' + fishId + '" data-price="' + item.price + '" data-date="' + escapeHtml(item.date) + '">🗑️</button>'
        : '';
      mainEl.innerHTML =
        '<span class="price-inspector-val">💵 ' + escapeHtml(item.price.toLocaleString(locale)) + ' FB</span>' +
        occHtml +
        '<span class="price-inspector-sep">•</span>' +
        '<span class="price-inspector-date">📅 ' + escapeHtml(formatPriceDate(item.date)) + '</span>' +
        posHtml +
        delHtml;

      var delBtn = mainEl.querySelector(".price-inspector-delete");
      if (delBtn) {
        delBtn.addEventListener("click", function () {
          deletePriceEntry(Number(this.dataset.fid), Number(this.dataset.price), this.dataset.date || "");
        });
      }
    }

    var svg = box.querySelector(".price-chart-svg");
    if (svg && pts[idx]) {
      var crosshair = svg.querySelector(".price-chart-crosshair");
      if (crosshair) {
        var xStr = pts[idx].x.toFixed(1);
        crosshair.setAttribute("x1", xStr);
        crosshair.setAttribute("x2", xStr);
      }
      var allNodes = svg.querySelectorAll(".price-chart-node");
      allNodes.forEach(function (nEl, nIdx) {
        nEl.classList.toggle("is-selected", nIdx === idx);
      });
    }
  };

  updateInspector(_selectedChartPointIdx);

  var svgEl = box.querySelector(".price-chart-svg");
  if (svgEl) {
    var handleNodeSelect = function (ev) {
      var g = ev.target && ev.target.closest ? ev.target.closest(".price-chart-node") : null;
      if (!g) return;
      var idx = parseInt(g.getAttribute("data-idx"), 10);
      if (!isNaN(idx)) updateInspector(idx);
    };
    svgEl.addEventListener("pointerdown", handleNodeSelect);
    svgEl.addEventListener("click", handleNodeSelect);
    svgEl.addEventListener("mouseover", handleNodeSelect);
    svgEl.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        updateInspector((_selectedChartPointIdx - 1 + sorted.length) % sorted.length);
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        updateInspector((_selectedChartPointIdx + 1) % sorted.length);
      }
    });
  }

  box.querySelectorAll(".price-chart-step-btn").forEach(function (stepBtn) {
    stepBtn.addEventListener("click", function () {
      var step = parseInt(this.dataset.step, 10) || 0;
      var nextIdx = (_selectedChartPointIdx + step + sorted.length) % sorted.length;
      updateInspector(nextIdx);
    });
  });
}

function renderModalHistory(fid) {
  // Display-only normalization: same-day duplicate prices are shown once.
  var list = getNormalizedFishPrices(fid);
  var locale = getLocale();

  var minPriceEl = document.getElementById("statMinPrice");
  var todayPriceEl = document.getElementById("statTodayPrice");
  var maxPriceEl = document.getElementById("statMaxPrice");
  var emptyNoticeEl = document.getElementById("modalPriceEmptyNotice");
  var estBoxEl = document.getElementById("modalEstimatedPriceBox");
  var estValEl = document.getElementById("modalEstimatedPriceVal");

  var est = (typeof getEstimatedPrice === "function") ? getEstimatedPrice(fid) : null;
  if (estBoxEl && estValEl) {
    if (est) {
      estValEl.innerText = est.min.toLocaleString(locale) + " – " + est.max.toLocaleString(locale) + " FB";
      estBoxEl.style.display = "block";
    } else {
      estBoxEl.style.display = "none";
    }
  }

  var todayISO = (typeof getTodayISO === "function") ? getTodayISO() : "";
  var todayEntries = todayISO ? list.filter(function (x) { return x.date === todayISO; }) : [];
  if (todayPriceEl) {
    todayPriceEl.classList.remove("is-high", "muted");
    todayPriceEl.removeAttribute("title");
    if (todayEntries.length > 0) {
      var tVals = todayEntries.map(function (x) { return x.price; });
      var tMin = Math.min.apply(null, tVals);
      var tMax = Math.max.apply(null, tVals);
      todayPriceEl.innerText = (tMin === tMax)
        ? (tMin.toLocaleString(locale) + " FB")
        : (tMin.toLocaleString(locale) + "–" + tMax.toLocaleString(locale) + " FB");
      var highPct = (typeof getTodayHighPricePct === "function") ? getTodayHighPricePct() : 90;
      if (est && est.max > 0 && tMax >= est.max * (highPct / 100)) {
        todayPriceEl.classList.add("is-high");
      }
    } else {
      todayPriceEl.classList.add("muted");
      if (typeof isMarketClosedToday === "function" && isMarketClosedToday()) {
        todayPriceEl.innerText = "🚫";
        todayPriceEl.setAttribute("title", t('market_closed_sunday_tooltip'));
      } else {
        todayPriceEl.innerText = "--";
      }
    }
  }

  if (list.length === 0) {
    if (minPriceEl) minPriceEl.innerText = "--";
    if (maxPriceEl) maxPriceEl.innerText = "--";
    if (emptyNoticeEl) emptyNoticeEl.style.display = "";
    renderModalPriceScale([], fid);
    return;
  }

  if (emptyNoticeEl) emptyNoticeEl.style.display = "none";

  var pricesNum = list.map(function (x) { return x.price; });
  var minP = Math.min.apply(null, pricesNum);
  var maxP = Math.max.apply(null, pricesNum);

  if (minPriceEl) minPriceEl.innerText = minP.toLocaleString(locale) + " FB";
  if (maxPriceEl) maxPriceEl.innerText = maxP.toLocaleString(locale) + " FB";
  renderModalPriceScale(list, fid);
}

function onPriceDateChange(dateVal) {
  var isSunday = isDateSunday(dateVal);
  var notice = document.getElementById("modalPriceSundayNotice");
  var formBox = document.getElementById("priceAddFormBox");
  var dateInput = document.getElementById("newPriceDate");
  var btnSubmit = document.getElementById("btnSubmitPrice");

  if (notice) notice.style.display = isSunday ? "flex" : "none";
  if (formBox) formBox.classList.toggle("sunday-blocked", isSunday);
  if (dateInput) dateInput.classList.toggle("is-sunday", isSunday);
  if (btnSubmit) {
    btnSubmit.disabled = isSunday;
    if (isSunday) {
      btnSubmit.setAttribute("title", t('modal_save_price_sunday_disabled'));
    } else {
      btnSubmit.removeAttribute("title");
    }
  }
}

async function submitNewPrice() {
  if (!selectedModalFishId) return;

  if (!currentUser) {
    showAuthNotice(t('auth_notice_price'));
    return;
  }

  if (db && typeof isManualImportEnabled === "function" && !isManualImportEnabled() && !isAdmin) {
    showToast(t('admin_manual_import_off'), "error");
    return;
  }

  var d = document.getElementById("newPriceDate").value;
  var p = parseInt(document.getElementById("newPriceValue").value, 10);

  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    showToast(t('price_invalid_input'), "error");
    return;
  }

  if (isDateSunday(d)) {
    showToast(t('price_sunday_blocked'), "error");
    return;
  }

  if (isNaN(p) || p <= 0) {
    showToast(t('price_invalid_input'), "error");
    return;
  }

  var fidStr = selectedModalFishId.toString();
  var fid = selectedModalFishId;
  var monthId = d.slice(0, 7);
  var todayISO = getTodayISO();

  // Fast local duplicate check for the exact (date, price) pair.
  var localDuplicate = getFishPrices(fid).find(function (it) {
    return it.date === d && Number(it.price) === p;
  });
  var cachedDays = dailyMonthsCache.get(monthId);
  if (!localDuplicate && cachedDays && cachedDays[d]) {
    if (toDayEntryList(cachedDays[d][fidStr]).indexOf(p) !== -1) {
      localDuplicate = { date: d, price: p };
    }
  }
  if (localDuplicate) {
    showToast(t('price_exists', { price: p.toLocaleString(getLocale()), date: formatPriceDate(localDuplicate.date) }), "error");
    return;
  }

  // Local-only mode (no Firestore connection available).
  var hasShards = !!(firebaseSummaryShardRefs && firebaseSummaryShardRefs.length === MARKET_SUMMARY_SHARD_COUNT);
  var shardIdx = hasShards ? getMarketSummaryShardIndex(fidStr) : -1;
  var summaryRef = hasShards ? firebaseSummaryShardRefs[shardIdx] : null;
  if (!db || !summaryRef || !window.FISHAO_FS_TX) {
    var localSummary = clonePriceSummary(priceSummary);
    applyPriceToSummaryMap(localSummary, fidStr, d, p, todayISO);
    priceSummary = localSummary;
    saveLocalPriceSummary(new Date().toISOString());
    renderModalHistory(fid);
    applyFilters();
    document.getElementById("newPriceValue").value = "";
    showToast(t('price_added', { price: p }), "success");
    return;
  }

  try {
    var result = await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var dailyRef = fs.doc(db, "fishao_market_daily", monthId);
      var snaps = await Promise.all([tx.get(summaryRef), tx.get(dailyRef)]);
      var summarySnap = snaps[0];
      var dailySnap = snaps[1];

      var summaryData = summarySnap.exists() ? summarySnap.data() : {};
      var summaryPrices = clonePriceSummary(summaryData && summaryData.prices ? summaryData.prices : {});

      var dailyData = dailySnap.exists() ? dailySnap.data() : {};
      var days = (dailyData && dailyData.days && typeof dailyData.days === "object")
        ? Object.assign({}, dailyData.days)
        : {};
      var dayBucket = (days[d] && typeof days[d] === "object")
        ? Object.assign({}, days[d])
        : {};

      var dayList = toDayEntryList(dayBucket[fidStr]);
      if (dayList.indexOf(p) !== -1) {
        return {
          status: "duplicate",
          date: d,
          summaryPrices: summaryPrices,
          shardIdx: shardIdx,
          days: days
        };
      }

      dayList.push(p);
      dayBucket[fidStr] = encodeDayEntryList(dayList);
      days[d] = dayBucket;

      applyPriceToSummaryMap(summaryPrices, fidStr, d, p, todayISO);
      var nowIso = new Date().toISOString();

      tx.set(summaryRef, { prices: summaryPrices, lastUpdated: nowIso });
      tx.set(dailyRef, { days: days, lastUpdated: nowIso });

      return {
        status: "added",
        summaryPrices: summaryPrices,
        shardIdx: shardIdx,
        days: days,
        lastUpdated: nowIso
      };
    });

    if (result && result.days) {
      dailyMonthsCache.set(monthId, result.days);
    }

    if (!result || result.status === "duplicate") {
      if (result && result.summaryPrices) {
        mergeSummaryShard(result.shardIdx, result.summaryPrices, false);
      }
      renderModalHistory(fid);
      applyFilters();
      showToast(t('price_exists', {
        price: p.toLocaleString(getLocale()),
        date: result && result.date ? formatPriceDate(result.date) : "--"
      }), "error");
      return;
    }

    mergeSummaryShard(result.shardIdx, result.summaryPrices, result.lastUpdated);
    renderModalHistory(fid);
    applyFilters();
    document.getElementById("newPriceValue").value = "";
    showToast(t('price_added', { price: p }), "success");
  } catch (err) {
    console.error("Failed to save price to Firestore:", err);
    showToast(t('price_sync_failed'), "error");
  }
}

async function deletePriceEntry(fid, price, date) {
  if (!isAdmin) {
    showToast(t('price_delete_non_admin'), "error");
    return;
  }

  var fidStr = fid.toString();
  var priceNum = Number(price);
  var targetDate = (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : null;
  if (!isFinite(priceNum)) return;
  if (!priceSummary[fidStr] && !priceHistory[fidStr]) return;

  var ok = await showConfirmModal(
    t('price_delete_admin_title'),
    t('price_delete_confirm'),
    t('confirm_btn'),
    true
  );
  if (!ok) return;

  var monthId = targetDate ? targetDate.slice(0, 7) : "";

  // Preload historical daily archives before transaction when deleting the last known occurrence
  // of a price that has count > 1, so replacementLastDate resolves accurately across months.
  var decodedSummaryEntry = (priceSummary && priceSummary[fidStr]) ? decodeFishSummaryEntry(priceSummary[fidStr]) : null;
  var curEntryInfo = (decodedSummaryEntry && decodedSummaryEntry.byPrice)
    ? decodedSummaryEntry.byPrice[String(priceNum)]
    : null;
  if (db && monthId && curEntryInfo && Number(curEntryInfo.c) > 1 && curEntryInfo.l === targetDate) {
    try {
      var fsPreload = await getFirestoreModule();
      var allDailySnap = await fsPreload.getDocs(fsPreload.collection(db, "fishao_market_daily"));
      allDailySnap.forEach(function (dDoc) {
        var dData = dDoc.data();
        if (dData && dData.days && typeof dData.days === "object") {
          dailyMonthsCache.set(dDoc.id, dData.days);
        }
      });
    } catch (preloadErr) {
      console.warn("Could not preload daily archive months for delete fallback:", preloadErr);
    }
  }

  // Local-only mode (no Firestore connection available).
  var hasShards = !!(firebaseSummaryShardRefs && firebaseSummaryShardRefs.length === MARKET_SUMMARY_SHARD_COUNT);
  var shardIdx = hasShards ? getMarketSummaryShardIndex(fidStr) : -1;
  var summaryRef = hasShards ? firebaseSummaryShardRefs[shardIdx] : null;
  if (!db || !summaryRef || !window.FISHAO_FS_TX) {
    var localSummary = clonePriceSummary(priceSummary);
    removePriceFromSummaryMap(localSummary, fidStr, priceNum, targetDate, false, "");
    priceSummary = localSummary;
    saveLocalPriceSummary(new Date().toISOString());
    renderModalHistory(fid);
    applyFilters();
    return;
  }

  try {
    var txResult = await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
      var dailyRef = monthId ? fs.doc(db, "fishao_market_daily", monthId) : null;
      var reads = [tx.get(summaryRef)];
      if (dailyRef) reads.push(tx.get(dailyRef));
      var snaps = await Promise.all(reads);

      var summarySnap = snaps[0];
      var dailySnap = snaps[1] || null;

      var summaryData = summarySnap.exists() ? summarySnap.data() : {};
      var summaryPrices = clonePriceSummary(summaryData && summaryData.prices ? summaryData.prices : {});

      var removedFromDaily = false;
      var replacementLastDate = "";
      var updatedDays = null;

      if (dailyRef && dailySnap && dailySnap.exists()) {
        var dailyData = dailySnap.data() || {};
        updatedDays = (dailyData.days && typeof dailyData.days === "object")
          ? Object.assign({}, dailyData.days)
          : {};

        if (targetDate && updatedDays[targetDate] && updatedDays[targetDate][fidStr] !== undefined) {
          var dayBucket = Object.assign({}, updatedDays[targetDate]);
          var prevList = toDayEntryList(dayBucket[fidStr]);
          var nextList = prevList.filter(function (v) { return v !== priceNum; });
          if (nextList.length !== prevList.length) {
            removedFromDaily = true;
            if (nextList.length > 0) {
              dayBucket[fidStr] = encodeDayEntryList(nextList);
            } else {
              delete dayBucket[fidStr];
            }
            if (Object.keys(dayBucket).length > 0) {
              updatedDays[targetDate] = dayBucket;
            } else {
              delete updatedDays[targetDate];
            }
          }
        }

        // Look up newest remaining date for (fidStr, priceNum) in this month & cached months.
        if (removedFromDaily) {
          var scanDays = function (daysObj) {
            Object.keys(daysObj || {}).forEach(function (dKey) {
              if (!daysObj[dKey]) return;
              if (toDayEntryList(daysObj[dKey][fidStr]).indexOf(priceNum) !== -1) {
                if (!replacementLastDate || dKey > replacementLastDate) {
                  replacementLastDate = dKey;
                }
              }
            });
          };
          scanDays(updatedDays);
          dailyMonthsCache.forEach(function (cachedObj, cMonthId) {
            if (cMonthId !== monthId) scanDays(cachedObj);
          });
        }
      }

      removePriceFromSummaryMap(summaryPrices, fidStr, priceNum, targetDate, removedFromDaily, replacementLastDate);

      var nowIso = new Date().toISOString();
      tx.set(summaryRef, { prices: summaryPrices, lastUpdated: nowIso });
      if (dailyRef && removedFromDaily && updatedDays) {
        tx.set(dailyRef, { days: updatedDays, lastUpdated: nowIso });
      }

      return {
        summaryPrices: summaryPrices,
        shardIdx: shardIdx,
        days: updatedDays,
        removedFromDaily: removedFromDaily,
        lastUpdated: nowIso
      };
    });

    if (txResult && monthId && txResult.removedFromDaily && txResult.days) {
      dailyMonthsCache.set(monthId, txResult.days);
    }
    if (txResult && txResult.summaryPrices) {
      mergeSummaryShard(txResult.shardIdx, txResult.summaryPrices, txResult.lastUpdated);
    }
    renderModalHistory(fid);
    applyFilters();
  } catch (err) {
    console.error("Failed to delete price from Firestore:", err);
    showToast(t('price_sync_failed'), "error");
  }
}

function onBulkDateChange(dateVal) {
  var isSunday = isDateSunday(dateVal);
  var notice = document.getElementById("bulkSundayNotice");
  var dt = document.getElementById("bulkImportDate");
  var btn = document.getElementById("btnProcessBulk");
  var btnAdd = document.getElementById("btnBulkAddFish");

  if (notice) notice.style.display = isSunday ? "flex" : "none";
  if (dt) dt.classList.toggle("is-sunday", isSunday);
  if (btn) {
    btn.disabled = isSunday;
    if (isSunday) {
      btn.setAttribute("title", t('bulk_sunday_blocked'));
    } else {
      btn.removeAttribute("title");
    }
  }
  if (btnAdd) {
    btnAdd.disabled = isSunday;
    if (isSunday) {
      btnAdd.setAttribute("title", t('bulk_sunday_blocked'));
    } else {
      btnAdd.removeAttribute("title");
    }
  }
}

function openBulkModal() {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_bulk'));
    return;
  }
  var initialBulkDate = getTodayISO();
  var dt = document.getElementById("bulkImportDate");
  if (dt) dt.value = initialBulkDate;
  onBulkDateChange(initialBulkDate);

  document.getElementById("bulkModalOverlay").classList.add("active");
  document.getElementById("bulkResultMsg").style.display = "none";
  var fishInp = document.getElementById("bulkFishInput");
  var priceInp = document.getElementById("bulkFishPrice");
  var textInp = document.getElementById("bulkInputText");
  var drop = document.getElementById("bulkFishSuggestions");
  if (fishInp) fishInp.value = "";
  if (priceInp) priceInp.value = "";
  if (textInp) textInp.value = "";
  if (drop) { drop.style.display = "none"; drop.innerHTML = ""; }
  setTimeout(function () {
    if (fishInp) fishInp.focus({ preventScroll: true });
  }, 100);
}

function closeBulkModal() {
  document.getElementById("bulkModalOverlay").classList.remove("active");
  var drop = document.getElementById("bulkFishSuggestions");
  if (drop) { drop.style.display = "none"; drop.innerHTML = ""; }
}

var bulkSelectedSuggestionIndex = -1;
var currentBulkSuggestions = [];

function onBulkSearchInput(e) {
  var query = (e.target.value || "").trim();
  var drop = document.getElementById("bulkFishSuggestions");
  if (!drop) return;

  if (!query || query.length < 1) {
    drop.style.display = "none";
    drop.innerHTML = "";
    currentBulkSuggestions = [];
    bulkSelectedSuggestionIndex = -1;
    return;
  }

  var nq = normStr(query);
  var matches = [];
  var seenNames = new Set();

  for (var i = 0; i < allFishes.length; i++) {
    var f = allFishes[i];
    var nameCz = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function') ? window.FISHAO_I18N.getFishName(f, 'cs') : (f.name || "");
    var nameEn = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function') ? window.FISHAO_I18N.getFishName(f, 'en') : "";
    var curName = (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name) || "";

    var isMatch = (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function')
      ? window.FISHAO_I18N.matchesFishSearch(f, nq)
      : (normStr(nameCz).includes(nq) || (nameEn && normStr(nameEn).includes(nq)));

    if (isMatch) {
      if (!seenNames.has(curName)) {
        seenNames.add(curName);
        var latestPr = getLatestPrice(f.id);
        var alt = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getAltFishName === 'function')
          ? window.FISHAO_I18N.getAltFishName(f)
          : '';
        matches.push({
          id: f.id,
          name: curName,
          altName: (alt && alt !== curName) ? alt : "",
          latestPrice: latestPr ? latestPr.price : null
        });
        if (matches.length >= 8) break;
      }
    }
  }

  currentBulkSuggestions = matches;
  bulkSelectedSuggestionIndex = -1;

  if (matches.length === 0) {
    drop.innerHTML = '<div style="padding: 8px 12px; font-size: 12px; color: var(--text-muted);">' + t('bulk_no_fish_found') + '</div>';
    drop.style.display = "block";
    return;
  }

  var html = "";
  matches.forEach(function (m, idx) {
    var priceHint = m.latestPrice ? '<span class="bulk-suggestion-meta">💵 ' + m.latestPrice.toLocaleString(getLocale()) + ' FB</span>' : '';
    html += '<div class="bulk-suggestion-item" data-index="' + idx + '" data-name="' + escapeHtml(m.name) + '" onclick="window.fishaoApp.selectBulkFishSuggestion(this.getAttribute(\'data-name\'))">' +
      '<span class="bulk-suggestion-name">' + escapeHtml(m.name) + (m.altName ? ' <small style="color:var(--text-muted);font-weight:normal;">(' + escapeHtml(m.altName) + ')</small>' : '') + '</span>' +
      priceHint +
    '</div>';
  });

  drop.innerHTML = html;
  drop.style.display = "block";
}

function selectBulkFishSuggestion(name) {
  var input = document.getElementById("bulkFishInput");
  var drop = document.getElementById("bulkFishSuggestions");
  var priceInput = document.getElementById("bulkFishPrice");
  if (input) input.value = name;
  if (drop) {
    drop.style.display = "none";
    drop.innerHTML = "";
  }
  currentBulkSuggestions = [];
  bulkSelectedSuggestionIndex = -1;
  if (priceInput) {
    priceInput.focus({ preventScroll: true });
    priceInput.select();
  }
}

function onBulkInputKeyDown(e) {
  var drop = document.getElementById("bulkFishSuggestions");
  if (!drop || drop.style.display === "none" || currentBulkSuggestions.length === 0) {
    if (e.key === "Enter") {
      e.preventDefault();
      var priceInput = document.getElementById("bulkFishPrice");
      if (priceInput) priceInput.focus({ preventScroll: true });
    }
    return;
  }

  var items = drop.querySelectorAll(".bulk-suggestion-item");
  if (e.key === "ArrowDown") {
    e.preventDefault();
    bulkSelectedSuggestionIndex = (bulkSelectedSuggestionIndex + 1) % currentBulkSuggestions.length;
    items.forEach(function (el, idx) {
      el.classList.toggle("highlighted", idx === bulkSelectedSuggestionIndex);
    });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    bulkSelectedSuggestionIndex = (bulkSelectedSuggestionIndex - 1 + currentBulkSuggestions.length) % currentBulkSuggestions.length;
    items.forEach(function (el, idx) {
      el.classList.toggle("highlighted", idx === bulkSelectedSuggestionIndex);
    });
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (bulkSelectedSuggestionIndex >= 0 && bulkSelectedSuggestionIndex < currentBulkSuggestions.length) {
      selectBulkFishSuggestion(currentBulkSuggestions[bulkSelectedSuggestionIndex].name);
    } else if (currentBulkSuggestions.length > 0) {
      selectBulkFishSuggestion(currentBulkSuggestions[0].name);
    }
  } else if (e.key === "Escape") {
    drop.style.display = "none";
  }
}

function addFishToBulkList() {
  var dateVal = document.getElementById("bulkImportDate").value || getTodayISO();
  if (isDateSunday(dateVal)) {
    showToast(t('bulk_sunday_blocked'), "error");
    return;
  }

  var nameInput = document.getElementById("bulkFishInput");
  var priceInput = document.getElementById("bulkFishPrice");
  var textArea = document.getElementById("bulkInputText");
  if (!nameInput || !priceInput || !textArea) return;

  var nameVal = (nameInput.value || "").trim();
  var priceVal = (priceInput.value || "").trim();

  if (!nameVal) {
    showToast(t('bulk_err_no_fish'), "error");
    nameInput.focus({ preventScroll: true });
    return;
  }
  if (!priceVal || isNaN(Number(priceVal)) || Number(priceVal) <= 0) {
    showToast(t('bulk_err_no_price'), "error");
    priceInput.focus({ preventScroll: true });
    return;
  }

  var newLine = nameVal + ": " + priceVal;
  if (textArea.value.trim().length > 0) {
    textArea.value = textArea.value.trimEnd() + "\n" + newLine + "\n";
  } else {
    textArea.value = newLine + "\n";
  }

  showToast(t('bulk_added_line', { line: newLine }), "success");
  nameInput.value = "";
  priceInput.value = "";
  var drop = document.getElementById("bulkFishSuggestions");
  if (drop) drop.style.display = "none";
  nameInput.focus({ preventScroll: true });
}

function getBulkFishNameIndex() {
  var lang = (typeof getLang === "function") ? getLang() : "cs";
  if (_bulkFishNameCacheMap && _bulkFishNameCacheLang === lang) {
    return _bulkFishNameCacheMap;
  }
  var nameToFish = new Map();
  for (var i = 0; i < allFishes.length; i++) {
    var f = allFishes[i];
    nameToFish.set(normStr(f.name), f);
    if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishNames === 'function') {
      var allNames = window.FISHAO_I18N.getFishNames(f);
      for (var ni = 0; ni < allNames.length; ni++) {
        nameToFish.set(normStr(allNames[ni]), f);
      }
    } else if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function') {
      var enName = window.FISHAO_I18N.getFishName(f, 'en');
      var csName = window.FISHAO_I18N.getFishName(f, 'cs');
      if (enName) nameToFish.set(normStr(enName), f);
      if (csName) nameToFish.set(normStr(csName), f);
    }
  }
  _bulkFishNameCacheLang = lang;
  _bulkFishNameCacheMap = nameToFish;
  return nameToFish;
}

async function processBulkImport() {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_bulk'));
    return;
  }
  var dateVal = document.getElementById("bulkImportDate").value || getTodayISO();
  var text = document.getElementById("bulkInputText").value.trim();
  var resEl = document.getElementById("bulkResultMsg");

  if (db && typeof isManualImportEnabled === "function" && !isManualImportEnabled() && !isAdmin) {
    resEl.style.display = "block";
    resEl.style.background = "rgba(239,68,68,0.2)";
    resEl.style.color = "#f87171";
    resEl.innerText = t('admin_manual_import_off');
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal) || isDateSunday(dateVal)) {
    resEl.style.display = "block";
    resEl.style.background = "rgba(239,68,68,0.2)";
    resEl.style.color = "#f87171";
    resEl.innerText = t('bulk_sunday_blocked');
    return;
  }

  if (!text) {
    resEl.style.display = "block";
    resEl.style.background = "rgba(239,68,68,0.2)";
    resEl.style.color = "#f87171";
    resEl.innerText = t('bulk_empty_error');
    return;
  }

  var nameToFish = getBulkFishNameIndex();

  var additions = {};
  var skipped = 0;
  var duplicates = 0;
  var lines = text.split(/\r?\n/);

  var monthId = dateVal.slice(0, 7);
  var cachedDays = dailyMonthsCache.get(monthId);
  var todayISO = getTodayISO();

  for (var li = 0; li < lines.length; li++) {
    var l = lines[li].trim();
    if (!l) continue;

    var fishName = "";
    var priceNum = 0;

    if (l.includes(":")) {
      var parts = l.split(":");
      fishName = parts[0].trim();
      var match = parts[1].match(/\d+/);
      if (match) priceNum = parseInt(match[0], 10);
    } else {
      var match2 = l.match(/^(.*?)\s+(\d+)\s*(?:fb|fishbuck|fishbucks|fishmena|fishměna|fiszdolar|fiszdolary|fiszdolarów|fiszdolarow|dolar|dolary|\$|minc|coins|kc|b)?$/i);
      if (match2) {
        fishName = match2[1].trim();
        priceNum = parseInt(match2[2], 10);
      }
    }

    if (!fishName || !isFinite(priceNum) || priceNum <= 0) {
      skipped++;
      continue;
    }

    var n = normStr(fishName);
    var targetFish = nameToFish.get(n);
    if (!targetFish) {
      skipped++;
      continue;
    }

    var fidStr = targetFish.id.toString();
    var localList = Array.isArray(priceHistory[fidStr]) ? priceHistory[fidStr] : [];
    var existsLocally = localList.some(function (it) {
      return it.date === dateVal && Number(it.price) === priceNum;
    });
    if (!existsLocally && cachedDays && cachedDays[dateVal]) {
      existsLocally = toDayEntryList(cachedDays[dateVal][fidStr]).indexOf(priceNum) !== -1;
    }

    var bucket = additions[fidStr];
    var seenInImport = !!(bucket && bucket.prices.indexOf(priceNum) !== -1);

    // A price value is stored at most once per fish per date.
    if (existsLocally || seenInImport) {
      duplicates++;
      continue;
    }

    if (!bucket) {
      bucket = additions[fidStr] = { date: dateVal, prices: [] };
    }
    bucket.prices.push(priceNum);
  }

  var planned = 0;
  Object.keys(additions).forEach(function (key) {
    planned += additions[key].prices.length;
  });

  var added = 0;
  var hasShards = !!(firebaseSummaryShardRefs && firebaseSummaryShardRefs.length === MARKET_SUMMARY_SHARD_COUNT);

  if (planned > 0) {
    if (!db || !hasShards || !window.FISHAO_FS_TX) {
      // Local-only mode.
      var localSummary = clonePriceSummary(priceSummary);
      Object.keys(additions).forEach(function (key) {
        var bucket = additions[key];
        bucket.prices.forEach(function (price) {
          applyPriceToSummaryMap(localSummary, key, bucket.date, price, todayISO);
        });
      });
      priceSummary = localSummary;
      saveLocalPriceSummary(new Date().toISOString());
      added = planned;
      var prevScrollLocal = window.scrollY;
      applyFilters();
      window.scrollTo(0, prevScrollLocal);
    } else {
      try {
        var txResult = await window.FISHAO_FS_TX.runTx(db, async function (tx, fs) {
          var dailyRef = fs.doc(db, "fishao_market_daily", monthId);
          var additionKeys = Object.keys(additions);

          var shardIdxList = [];
          var seenShards = {};
          additionKeys.forEach(function (key) {
            var sIdx = getMarketSummaryShardIndex(key);
            if (!seenShards[sIdx]) {
              seenShards[sIdx] = true;
              shardIdxList.push(sIdx);
            }
          });

          var readPromises = shardIdxList.map(function (sIdx) {
            return tx.get(firebaseSummaryShardRefs[sIdx]);
          });
          readPromises.push(tx.get(dailyRef));

          var snaps = await Promise.all(readPromises);
          var dailySnap = snaps[snaps.length - 1];

          var shardMaps = {};
          for (var si = 0; si < shardIdxList.length; si++) {
            var shData = snaps[si].exists() ? snaps[si].data() : {};
            shardMaps[shardIdxList[si]] = clonePriceSummary(shData && shData.prices ? shData.prices : {});
          }

          var dailyData = dailySnap.exists() ? dailySnap.data() : {};
          var days = (dailyData && dailyData.days && typeof dailyData.days === "object")
            ? Object.assign({}, dailyData.days)
            : {};
          var dayBucket = (days[dateVal] && typeof days[dateVal] === "object")
            ? Object.assign({}, days[dateVal])
            : {};

          var cloudAdded = 0;
          var cloudDuplicates = 0;
          var dirtyShards = {};

          additionKeys.forEach(function (key) {
            var bucket = additions[key];
            var dayList = toDayEntryList(dayBucket[key]);
            var sIdx = getMarketSummaryShardIndex(key);
            var targetSummaryMap = shardMaps[sIdx];

            bucket.prices.forEach(function (price) {
              if (dayList.indexOf(price) !== -1) {
                cloudDuplicates++;
                return;
              }
              dayList.push(price);
              applyPriceToSummaryMap(targetSummaryMap, key, bucket.date, price, todayISO);
              dirtyShards[sIdx] = true;
              cloudAdded++;
            });

            if (dayList.length > 0) {
              dayBucket[key] = encodeDayEntryList(dayList);
            }
          });

          if (cloudAdded === 0) {
            return {
              shardMaps: shardMaps,
              days: days,
              added: 0,
              duplicates: cloudDuplicates,
              lastUpdated: false
            };
          }

          var nowIso = new Date().toISOString();
          days[dateVal] = dayBucket;
          Object.keys(dirtyShards).forEach(function (sKey) {
            var sIdxNum = Number(sKey);
            tx.set(firebaseSummaryShardRefs[sIdxNum], {
              prices: shardMaps[sIdxNum],
              lastUpdated: nowIso
            });
          });
          tx.set(dailyRef, { days: days, lastUpdated: nowIso });

          return {
            shardMaps: shardMaps,
            days: days,
            added: cloudAdded,
            duplicates: cloudDuplicates,
            lastUpdated: nowIso
          };
        });

        if (txResult && txResult.days) {
          dailyMonthsCache.set(monthId, txResult.days);
        }
        if (txResult && txResult.shardMaps) {
          var shardKeys = Object.keys(txResult.shardMaps);
          shardKeys.forEach(function (sKey, kIdx) {
            mergeSummaryShard(Number(sKey), txResult.shardMaps[sKey], kIdx === shardKeys.length - 1 ? txResult.lastUpdated : false);
          });
        }
        added = (txResult && txResult.added) || 0;
        duplicates += (txResult && txResult.duplicates) || 0;
        var prevScrollCloud = window.scrollY;
        applyFilters();
        window.scrollTo(0, prevScrollCloud);
      } catch (err) {
        console.error("Failed to import prices to Firestore:", err);
        resEl.style.display = "block";
        resEl.style.background = "rgba(239,68,68,0.2)";
        resEl.style.color = "#f87171";
        resEl.innerText = t('price_sync_failed');
        return;
      }
    }
  }

  resEl.style.display = "block";
  resEl.style.background = "rgba(16,185,129,0.2)";
  resEl.style.color = "#34d399";
  var duplicatesPart = duplicates > 0 ? t('bulk_result_duplicates', { duplicates: duplicates }) : "";
  var skippedPart = skipped > 0 ? t('bulk_result_skipped', { skipped: skipped }) : "";
  resEl.innerText = t('bulk_result_msg', { date: dateVal, added: added, duplicatesPart: duplicatesPart, skippedPart: skippedPart });
}

function exportPricesJson() {
  var blob = new Blob([JSON.stringify(priceHistory, null, 2)], { type: "application/json;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.setAttribute("href", url);
  a.setAttribute("download", "fishao_prices_" + getTodayISO() + ".json");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

var MARKET_RESET_ALERT_STORAGE_KEY = 'fishao_market_reset_alert_dismissed_v1';

/**
 * Returns whether the Fish Market price reset notice has been dismissed locally.
 */
function isMarketResetAlertDismissed() {
  try {
    return localStorage.getItem(MARKET_RESET_ALERT_STORAGE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

/**
 * Shows or hides the Fish Market price reset alert banner based on active view and dismissal state.
 */
function updateMarketResetAlertVisibility() {
  var banner = document.getElementById("bannerMarketResetAlert");
  if (!banner) return;
  var shouldShow = (currentView === "market") && !isMarketResetAlertDismissed();
  banner.style.display = shouldShow ? "flex" : "none";
}

/**
 * Dismisses the Fish Market price reset alert banner and persists the choice in localStorage.
 */
function dismissMarketResetAlert() {
  try {
    localStorage.setItem(MARKET_RESET_ALERT_STORAGE_KEY, '1');
  } catch (e) { }
  updateMarketResetAlertVisibility();
}

function isManualImportEnabled() {
  return typeof manualImportEnabled !== "undefined" && manualImportEnabled === true;
}

/**
 * Syncs visibility of all manual price entry / bulk import UI controls
 * according to the Firestore feature flag (/fishao_market/config -> manualImportEnabled).
 */
function syncManualImportVisibility() {
  var enabled = isManualImportEnabled();

  var actionBarRight = document.getElementById("marketImportActionBarRight");
  if (actionBarRight) {
    actionBarRight.style.display = enabled ? "" : "none";
  }

  var autoSyncNote = document.getElementById("marketAutoSyncNote");
  if (autoSyncNote) {
    autoSyncNote.style.display = enabled ? "none" : "";
  }

  updateMarketFloatingImportBtn();

  var formBox = document.getElementById("priceAddFormBox");
  var loginNotice = document.getElementById("priceAddLoginNotice");
  if (formBox) {
    formBox.style.display = (enabled && currentUser) ? "block" : "none";
  }
  if (loginNotice) {
    loginNotice.style.display = (enabled && !currentUser) ? "block" : "none";
  }

  var toggleBtn = document.getElementById("btnAdminToggleManualImport");
  var toggleText = document.getElementById("btnAdminToggleManualImportText");
  if (toggleBtn) {
    toggleBtn.classList.toggle("active", enabled);
    toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }
  if (toggleText) {
    toggleText.innerText = enabled ? t('admin_manual_import_on') : t('admin_manual_import_off');
  }
}

/**
 * Admin-only toggle for the /fishao_market/config manualImportEnabled feature flag.
 */
async function toggleManualImportFlag() {
  if (!isAdmin || !currentUser || !userProfile || userProfile.role !== "admin") {
    return;
  }
  if (!isFirebaseConfigured || !db || !marketConfigDocRef || !window.FISHAO_FS_TX) {
    showToast(t('admin_manual_import_error', { msg: "Firestore not ready" }));
    return;
  }

  var toggleBtn = document.getElementById("btnAdminToggleManualImport");
  var nextVal = !isManualImportEnabled();
  if (toggleBtn) toggleBtn.disabled = true;

  try {
    await window.FISHAO_FS_TX.setDocument(db, marketConfigDocRef, {
      manualImportEnabled: nextVal,
      lastUpdated: new Date().toISOString()
    });
    manualImportEnabled = nextVal;
    syncManualImportVisibility();
    showToast(nextVal ? t('admin_manual_import_enabled_toast') : t('admin_manual_import_disabled_toast'));
  } catch (err) {
    console.error("Failed to toggle manualImportEnabled:", err);
    showToast(t('admin_manual_import_error', { msg: err && err.message ? err.message : String(err) }));
  } finally {
    if (toggleBtn) toggleBtn.disabled = false;
  }
}

/**
 * Updates visibility of the floating Bulk Import button in the Fish Market view
 * when the user scrolls past the top Market action bar.
 */
function updateMarketFloatingImportBtn() {
  var btn = document.getElementById("marketFloatingImportBtn");
  if (!btn) return;

  if (!isManualImportEnabled() || currentView !== "market") {
    btn.style.display = "none";
    return;
  }

  var banner = document.getElementById("bannerMarket");
  var isScrolledPastBanner = false;
  if (banner && banner.style.display !== "none") {
    var rect = banner.getBoundingClientRect();
    isScrolledPastBanner = rect.bottom < 0;
  } else {
    isScrolledPastBanner = (window.scrollY || window.pageYOffset || 0) > 200;
  }

  if (isScrolledPastBanner) {
    var cookieBanner = document.getElementById("cookieConsentBanner");
    var cookieVisible = !!(cookieBanner && cookieBanner.style.display !== "none");
    btn.classList.toggle("above-cookie", cookieVisible);
    btn.style.display = "inline-flex";
  } else {
    btn.style.display = "none";
  }
  if (typeof updateScrollTopButton === "function") {
    updateScrollTopButton();
  }
}

window.addEventListener("scroll", updateMarketFloatingImportBtn, { passive: true });




