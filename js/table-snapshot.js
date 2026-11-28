/**
 * FISHAO - Fish Table Snapshot Generator (js/table-snapshot.js)
 * -------------------------------------------------------------
 * Floating camera button and localized PNG snapshot studio for the
 * Fishdex, Fish Market, and Club Fishes tables with row highlighting.
 */

var _tableSnapshotState = {
  view: 'all',
  lang: 'cs',
  list: [],
  startIdx: 0,
  count: 6,
  viewportStartIdx: 0,
  viewportCount: 6,
  scopeMode: 'viewport', // 'viewport' | 'single' | 'fixed'
  highlightedIds: [],
  showCaught: false,
  tzMode: 'local', // 'local' | 'utc'
  baitFilterCtx: null,
  filterSummary: null,
  dataUrl: '',
  blob: null,
  canvas: null
};

var _tableSnapshotRenderSeq = 0;
var _tableSnapshotImgCache = Object.create(null);

function tsTranslate(lang, key, params, fallback) {
  if (typeof window !== 'undefined' && window.FISHAO_I18N && typeof window.FISHAO_I18N.tForLang === 'function') {
    return window.FISHAO_I18N.tForLang(lang, key, params, fallback);
  }
  return t(key, params, fallback);
}

function tsGetLocale(lang) {
  if (typeof window !== 'undefined' && window.FISHAO_I18N && typeof window.FISHAO_I18N.getLocale === 'function') {
    return window.FISHAO_I18N.getLocale(lang);
  }
  return getLocale();
}

function tsGetLanguages() {
  if (typeof window !== 'undefined' && window.FISHAO_I18N && typeof window.FISHAO_I18N.getLanguages === 'function') {
    return window.FISHAO_I18N.getLanguages();
  }
  return [
    { code: 'cs', label: 'Čeština', short: 'CZ', flag: '🇨🇿' },
    { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' }
  ];
}

function tsNormalizeLang(lang) {
  if (typeof window !== 'undefined' && window.FISHAO_I18N && typeof window.FISHAO_I18N.normalizeLang === 'function') {
    return window.FISHAO_I18N.normalizeLang(lang);
  }
  return lang || getLang();
}

function tsSlugify(str) {
  var s = String(str || '').replace(/ł/g, 'l').replace(/Ł/g, 'l').replace(/ı/g, 'i').replace(/İ/g, 'i');
  if (s.normalize) s = s.normalize('NFD');
  return s.replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'fish';
}

function tsLoadImage(src) {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);
  if (_tableSnapshotImgCache[src] !== undefined) {
    return Promise.resolve(_tableSnapshotImgCache[src]);
  }
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      _tableSnapshotImgCache[src] = img;
      resolve(img);
    };
    img.onerror = function () {
      _tableSnapshotImgCache[src] = null;
      resolve(null);
    };
    img.src = src;
  });
}

function tsRoundRect(ctx, x, y, w, h, r) {
  var radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function tsFitText(ctx, text, maxW) {
  var s = String(text || '');
  if (maxW <= 0) return '';
  if (ctx.measureText(s).width <= maxW) return s;
  var ell = '…';
  while (s.length > 1 && ctx.measureText(s + ell).width > maxW) {
    s = s.slice(0, -1);
  }
  return s + ell;
}

function tsDrawPill(ctx, x, y, text, bgColor, borderColor, textColor, padX, height, fontSpec, radius) {
  ctx.font = fontSpec || '700 11px Inter, "Segoe UI", system-ui, sans-serif';
  var tw = ctx.measureText(text).width;
  var pw = tw + padX * 2;
  tsRoundRect(ctx, x, y, pw, height, typeof radius === 'number' ? radius : 5);
  ctx.fillStyle = bgColor;
  ctx.fill();
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + height / 2 + 0.5);
  return pw;
}

/**
 * Updates visibility and stacking position of the floating camera button.
 */
function updateTableSnapshotFab() {
  if (typeof document === 'undefined') return;
  var btn = document.getElementById('tableSnapshotFab');
  if (!btn) return;

  var isTable = (typeof isTableViewActive === 'function')
    ? isTableViewActive()
    : (currentView === 'all' || currentView === 'market' || currentView === 'club');
  var isModalOpen = !!(document.body && document.body.classList.contains('modal-open'));
  var hasRows = !!(typeof _tableScrollState !== 'undefined' && Array.isArray(_tableScrollState.data) && _tableScrollState.data.length > 0);

  if (!isTable || isModalOpen || !hasRows) {
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

/**
 * Detects which rows in the fish table are currently visible in the viewport.
 */
function getVisibleTableSlice(list) {
  var total = list.length;
  if (total === 0) return { startIdx: 0, count: 0 };

  var fallbackCount = Math.min(total, 8);
  var tbody = document.getElementById('tableBody');
  if (!tbody) return { startIdx: 0, count: fallbackCount };

  var idToIdx = new Map();
  for (var i = 0; i < total; i++) {
    idToIdx.set(Number(list[i].id), i);
  }

  var viewH = window.innerHeight || 800;
  var rows = tbody.querySelectorAll('tr[data-fish-id]');
  var visibleIndices = [];
  for (var r = 0; r < rows.length; r++) {
    var rect = rows[r].getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (rect.bottom > 16 && rect.top < viewH - 16) {
      var fid = Number(rows[r].dataset.fishId);
      if (idToIdx.has(fid)) {
        visibleIndices.push(idToIdx.get(fid));
      }
    }
  }

  if (visibleIndices.length > 0) {
    var start = visibleIndices[0];
    var end = visibleIndices[visibleIndices.length - 1];
    var count = Math.max(1, Math.min(15, end - start + 1));
    if (start + count > total) {
      start = Math.max(0, total - count);
    }
    return { startIdx: start, count: count };
  }

  return { startIdx: 0, count: fallbackCount };
}

function captureActiveFilterMeta() {
  var searchEl = document.getElementById('search');
  var baitEl = document.getElementById('baitFilter');
  var areaEl = document.getElementById('areaFilter');
  var timeEl = document.getElementById('timeFilter');
  var minEl = document.getElementById('minSizeInput');
  var maxEl = document.getElementById('maxSizeInput');
  var hideLockedEl = document.getElementById('hideLockedCheckbox');

  return {
    q: searchEl ? searchEl.value.trim() : '',
    locations: (typeof locationFilterValues !== 'undefined' && Array.isArray(locationFilterValues)) ? locationFilterValues.slice() : [],
    area: areaEl ? areaEl.value : '',
    bait: baitEl ? baitEl.value : '',
    ratings: (typeof ratingFilterValues !== 'undefined' && Array.isArray(ratingFilterValues)) ? ratingFilterValues.slice() : [],
    timeVal: timeEl ? timeEl.value : '',
    minSize: minEl && minEl.value !== '' ? minEl.value : '',
    maxSize: maxEl && maxEl.value !== '' ? maxEl.value : '',
    todayHighPrice: typeof filterTodayHighPrice !== 'undefined' ? !!filterTodayHighPrice : false,
    hideLocked: !!(currentView === 'club' && hideLockedEl && hideLockedEl.checked),
    onlyBasket: typeof filterOnlyBasket !== 'undefined' ? !!filterOnlyBasket : false,
    onlyClubUnlocked: typeof filterOnlyClubUnlocked !== 'undefined' ? !!filterOnlyClubUnlocked : false,
    playerBackyardName: (typeof activePlayerBackyardFilter !== 'undefined' && activePlayerBackyardFilter && activePlayerBackyardFilter.displayName)
      ? activePlayerBackyardFilter.displayName
      : ''
  };
}

function buildLocalizedFilterSummary(meta, view, lang) {
  if (!meta) return '';
  var parts = [];
  if (meta.onlyBasket) {
    parts.push('🪣 ' + tsTranslate(lang, 'filter_btn_basket'));
  }
  if (meta.playerBackyardName) {
    parts.push('🏡 ' + meta.playerBackyardName);
  }
  if (meta.onlyClubUnlocked && view !== 'club') {
    parts.push('🏆 ' + tsTranslate(lang, 'filter_btn_only_club_unlocked'));
  }
  if (meta.q) {
    parts.push('"' + meta.q + '"');
  }
  if (view !== 'club' && meta.locations && meta.locations.length) {
    var locNames = meta.locations.slice(0, 3).map(function (lk) {
      return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(lk, lang) : lk;
    });
    if (meta.locations.length > 3) locNames.push('+' + (meta.locations.length - 3));
    parts.push(locNames.join(', '));
  }
  if (meta.area && meta.area !== (typeof AREA_FILTER_ANY !== 'undefined' ? AREA_FILTER_ANY : '__any__')) {
    var areaName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(meta.area, lang) : meta.area;
    parts.push('📍 ' + areaName);
  }
  if (meta.bait) {
    var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(meta.bait, lang) : meta.bait;
    parts.push(bName);
  }
  if (meta.ratings && meta.ratings.length) {
    parts.push(meta.ratings.map(function (r) { return r + '★'; }).join('/'));
  }
  if (meta.timeVal === 'now') {
    parts.push('⚡ ' + tsTranslate(lang, 'time_active_now_short'));
  } else if (meta.timeVal === 'night') {
    parts.push('🌙');
  } else if (meta.timeVal === 'day') {
    parts.push('☀️');
  } else if (meta.timeVal === 'seasonal') {
    parts.push('📅');
  }
  if (meta.minSize || meta.maxSize) {
    var sz = (meta.minSize ? meta.minSize : '0') + '–' + (meta.maxSize ? meta.maxSize : '∞') + ' cm';
    parts.push('📏 ' + sz);
  }
  if (meta.todayHighPrice) {
    parts.push('🔥');
  }
  return parts.join('  •  ');
}

function getTableSnapshotSlice(st) {
  var list = st.list || [];
  var total = list.length;
  if (total === 0) return { startIdx: 0, endIdx: 0, rows: [], isSelectedOnly: false };

  if (st.scopeMode === 'single' && Array.isArray(st.highlightedIds) && st.highlightedIds.length > 0) {
    var hlSet = new Set(st.highlightedIds.map(Number));
    var selRows = [];
    for (var si = 0; si < total; si++) {
      if (hlSet.has(Number(list[si].id))) {
        selRows.push({ fish: list[si], index: si });
      }
    }
    if (selRows.length > 0) {
      return {
        startIdx: selRows[0].index,
        endIdx: selRows[selRows.length - 1].index,
        rows: selRows,
        isSelectedOnly: true
      };
    }
  }

  var count = Math.max(1, Math.min(total, st.count || 6));
  var start = Math.max(0, Math.min(total - count, st.startIdx || 0));
  var rows = [];
  for (var i = start; i < start + count; i++) {
    rows.push({ fish: list[i], index: i });
  }
  return { startIdx: start, endIdx: start + count - 1, rows: rows, isSelectedOnly: false };
}

function tsFormatCatchTime(rawTimes, lang, tzMode) {
  if (!rawTimes || rawTimes.length === 0) {
    return { primary: tsTranslate(lang, 'time_all_day'), sub: '' };
  }
  if (tzMode === 'utc') {
    return { primary: rawTimes.join(', ') + ' UTC', sub: '' };
  }
  var converted = rawTimes.map(function (part) {
    var clean = String(part || '').trim();
    if (clean.indexOf('-') === -1) return clean;
    var parts = clean.split('-');
    var sParts = parts[0].split(':').map(Number);
    var eParts = parts[1].split(':').map(Number);
    var sLocal = (typeof utcToLocalStr === 'function')
      ? utcToLocalStr(sParts[0], sParts[1] || 0)
      : parts[0];
    var eLocal = (typeof utcToLocalStr === 'function')
      ? utcToLocalStr(eParts[0], eParts[1] || 0)
      : parts[1];
    return sLocal + ' - ' + eLocal;
  });
  return {
    primary: converted.join(', '),
    sub: '(UTC: ' + rawTimes.join(', ') + ')'
  };
}

function tsFormatCatchDate(rawDates, lang) {
  if (!rawDates || rawDates.length === 0) {
    return { text: '', isSeasonal: false, inSeason: true };
  }
  var formatted = rawDates.map(function (dStr) {
    var clean = String(dStr || '').trim();
    if (clean.indexOf('-') === -1) return clean;
    var parts = clean.split('-');
    var s = parts[0].split('.').map(Number);
    var e = parts[1].split('.').map(Number);
    if (window.FISHAO_I18N && typeof window.FISHAO_I18N.formatDayMonth === 'function') {
      return window.FISHAO_I18N.formatDayMonth(s[0], s[1], lang) + ' – ' + window.FISHAO_I18N.formatDayMonth(e[0], e[1], lang);
    }
    return s[1] + '. ' + s[0] + '. – ' + e[1] + '. ' + e[0] + '.';
  });
  return {
    text: formatted.join(', '),
    isSeasonal: true,
    inSeason: (typeof isFishInSeasonNow === 'function') ? isFishInSeasonNow(rawDates) : true
  };
}

function tsGetUnlockStatusForLang(fish, userPoints, lang) {
  if (!fish) return { isUnlocked: true, costText: '', desc: '' };
  var f = fish;
  if (!f.unlock_type && typeof clubFishes !== 'undefined' && Array.isArray(clubFishes)) {
    var cf = clubFishes.find(function (x) { return x.id === fish.id; });
    if (cf) f = Object.assign({}, fish, cf);
  }
  if (f.unlock_type === 'points' && f.points !== undefined && f.points !== null) {
    var required = f.points;
    var diff = required - (userPoints || 0);
    var isUnlocked = diff <= 0;
    return {
      isUnlocked: isUnlocked,
      costText: required + ' ' + tsTranslate(lang, 'unit_pts'),
      desc: isUnlocked ? tsTranslate(lang, 'unlock_unlocked') : tsTranslate(lang, 'unlock_needs_pts', { diff: diff })
    };
  }
  if (f.unlock_type === 'fc') {
    var isFc = typeof currentClubUnlockedFcFishIds !== 'undefined' && currentClubUnlockedFcFishIds.has(f.id);
    return {
      isUnlocked: isFc,
      costText: (f.fc || 0) + ' FC',
      desc: isFc ? tsTranslate(lang, 'unlock_club_fc_unlocked') : tsTranslate(lang, 'unlock_requires_fc')
    };
  }
  if (f.unlock_type === 'monster') {
    var isMon = typeof currentClubUnlockedMonsterIds !== 'undefined' && currentClubUnlockedMonsterIds.has(f.id);
    return {
      isUnlocked: isMon,
      costText: tsTranslate(lang, 'unlock_monster'),
      desc: isMon ? tsTranslate(lang, 'unlock_club_monster_unlocked') : tsTranslate(lang, 'unlock_club_monster')
    };
  }
  return { isUnlocked: true, costText: '', desc: '' };
}

function tsComputeBaitItems(fish, baitFilterCtx, lang) {
  if (!fish || !Array.isArray(fish.baits) || fish.baits.length === 0) return [];
  var rec = (typeof computeFishBaitRecommendations === 'function')
    ? computeFishBaitRecommendations(fish, {
        timeMode: (baitFilterCtx && baitFilterCtx.timeMode) || 'overlap',
        filterLoc: (baitFilterCtx && baitFilterCtx.locFilter) || '',
        filterArea: (baitFilterCtx && baitFilterCtx.areaFilter) || '',
        onlyUnlockedClub: !!(baitFilterCtx && baitFilterCtx.hideLocked),
        nowCtx: (baitFilterCtx && baitFilterCtx.nowCtx) || null
      })
    : null;

  if (!rec || !rec.spots || !rec.spots.length) {
    return fish.baits.map(function (b) {
      return {
        bait: b,
        label: window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b, lang) : b,
        compText: '',
        chanceText: '',
        isBest: false
      };
    });
  }

  var summaries = fish.baits.map(function (baitCode) {
    var bestMatch = null;
    for (var si = 0; si < rec.spots.length; si++) {
      var spot = rec.spots[si];
      for (var bi = 0; bi < spot.baits.length; bi++) {
        var bItem = spot.baits[bi];
        if (bItem.bait !== baitCode) continue;
        if (!bestMatch || compareBaitScores(bItem, bestMatch) < 0) {
          bestMatch = {
            bait: baitCode,
            sameRatingCount: bItem.sameRatingCount,
            competitorCount: bItem.competitorCount,
            commonCount: bItem.commonCount,
            competitorWeight: bItem.competitorWeight,
            chancePct: bItem.chancePct
          };
        }
      }
    }
    return bestMatch;
  }).filter(Boolean);

  if (!summaries.length) {
    return fish.baits.map(function (b) {
      return {
        bait: b,
        label: window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b, lang) : b,
        compText: '',
        chanceText: '',
        isBest: false
      };
    });
  }

  var hasMultiple = fish.baits.length > 1;
  if (hasMultiple) summaries.sort(compareBaitScores);
  var top = summaries[0];

  return summaries.map(function (item) {
    var isBest = hasMultiple ? isBaitScoreTied(item, top) : (item.competitorCount === 0);
    return {
      bait: item.bait,
      label: window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(item.bait, lang) : item.bait,
      compText: item.competitorCount === 0 ? '0' : ('+' + item.competitorCount),
      chanceText: isBest ? (item.chancePct === 100 ? '100%' : ('~' + item.chancePct + '%')) : '',
      isBest: isBest
    };
  });
}

function tsMeasureBaitLines(ctx, baitItems, maxW, fontFamily) {
  var lines = [];
  var curLine = [];
  var curW = 0;
  var gapX = 5;

  for (var i = 0; i < baitItems.length; i++) {
    var item = baitItems[i];
    ctx.font = (item.isBest ? '700' : '600') + ' 11px ' + fontFamily;
    var nameW = ctx.measureText(item.label).width;
    var w = 6 + 14 + 4 + nameW + 6; // padL + icon + gap + name + padR
    if (item.compText) {
      ctx.font = '800 9.5px ' + fontFamily;
      w += 4 + ctx.measureText(item.compText).width + 8;
    }
    if (item.chanceText) {
      ctx.font = '800 9.5px ' + fontFamily;
      w += 4 + ctx.measureText(item.chanceText).width + 8;
    }
    w = Math.min(w, maxW);
    var measured = Object.assign({}, item, { width: w });

    if (curLine.length > 0 && curW + gapX + w > maxW) {
      lines.push(curLine);
      curLine = [measured];
      curW = w;
    } else {
      curLine.push(measured);
      curW += (curLine.length > 1 ? gapX : 0) + w;
    }
  }
  if (curLine.length) lines.push(curLine);
  return lines;
}

function tsMeasureLocChips(ctx, locItems, maxW, fontFamily) {
  var lines = [];
  var curLine = [];
  var curW = 0;
  var gapX = 4;

  ctx.font = '600 11px ' + fontFamily;
  for (var i = 0; i < locItems.length; i++) {
    var item = locItems[i];
    var text = item.isArea ? ('📍 ' + item.label) : item.label;
    var fitted = tsFitText(ctx, text, maxW - 14);
    var w = Math.min(maxW, ctx.measureText(fitted).width + 14);
    var chip = { text: fitted, isArea: item.isArea, width: w };

    if (curLine.length > 0 && curW + gapX + w > maxW) {
      lines.push(curLine);
      curLine = [chip];
      curW = w;
    } else {
      curLine.push(chip);
      curW += (curLine.length > 1 ? gapX : 0) + w;
    }
  }
  if (curLine.length) lines.push(curLine);
  return lines;
}

function tsGetPriceInfo(fid, lang, todayISO, highPct) {
  var list = (typeof getNormalizedFishPrices === 'function')
    ? getNormalizedFishPrices(fid)
    : (typeof normalizePriceEntries === 'function' ? normalizePriceEntries(getFishPrices(fid)) : []);
  var locale = tsGetLocale(lang);
  var est = (typeof getEstimatedPrice === 'function') ? getEstimatedPrice(fid) : null;
  var estStr = est ? ('~ ' + est.min.toLocaleString(locale) + '–' + est.max.toLocaleString(locale) + ' FB') : '';

  if (!list || list.length === 0) {
    return { primary: '—', unit: '', countText: '', isToday: false, isHigh: false, estStr: estStr };
  }

  var todayEntries = todayISO ? list.filter(function (x) { return x.date === todayISO; }) : [];
  var countText = list.length + 'x';
  if (todayEntries.length > 0) {
    var tPrices = todayEntries.map(function (x) { return x.price; });
    var minT = Math.min.apply(null, tPrices);
    var maxT = Math.max.apply(null, tPrices);
    var tStr = (minT === maxT) ? minT.toLocaleString(locale) : (minT.toLocaleString(locale) + '–' + maxT.toLocaleString(locale));
    var isHigh = !!(est && est.max > 0 && maxT >= est.max * ((highPct || 90) / 100));
    return { primary: tStr, unit: 'FB', countText: countText, isToday: true, isHigh: isHigh, estStr: estStr };
  }

  var pricesNum = list.map(function (x) { return x.price; });
  var minP = Math.min.apply(null, pricesNum);
  var maxP = Math.max.apply(null, pricesNum);
  var rangeStr = (minP === maxP)
    ? minP.toLocaleString(locale)
    : (minP.toLocaleString(locale) + '–' + maxP.toLocaleString(locale));
  return { primary: rangeStr, unit: 'FB', countText: countText, isToday: false, isHigh: false, estStr: estStr };
}

/**
 * Renders the Fish Table Snapshot onto a high-DPI HTML5 Canvas.
 */
async function renderFishTableSnapshotCanvas(st) {
  var lang = tsNormalizeLang(st.lang || getLang());
  var locale = tsGetLocale(lang);
  var tr = function (key, params, fallback) { return tsTranslate(lang, key, params, fallback); };
  var view = st.view || 'all';
  var isClub = view === 'club';
  var showCaught = !!(st.showCaught && typeof currentUser !== 'undefined' && currentUser);
  var tzMode = st.tzMode === 'utc' ? 'utc' : 'local';

  var slice = getTableSnapshotSlice(st);
  var rows = slice.rows;
  var highlightSet = new Set((st.highlightedIds || []).map(Number));
  var hasHighlights = false;
  for (var hi = 0; hi < rows.length; hi++) {
    if (highlightSet.has(Number(rows[hi].fish.id))) {
      hasHighlights = true;
      break;
    }
  }

  // Preload all fish sprites and bait icons for the captured rows
  var imgUrls = new Set();
  rows.forEach(function (entry) {
    imgUrls.add('/images/fish_' + entry.fish.id + '.webp');
    (entry.fish.baits || []).forEach(function (b) {
      imgUrls.add('/images/bait_' + b + '.webp');
    });
  });
  var imgPromises = [];
  imgUrls.forEach(function (u) { imgPromises.push(tsLoadImage(u)); });
  await Promise.all(imgPromises);

  var W = isClub ? 1480 : 1380;
  var PAD = 28;
  var TABLE_W = W - PAD * 2;
  var Y_HDR = 24;
  var HDR_H = 68;
  var Y_TABLE = Y_HDR + HDR_H + 8;
  var TH_H = 38;
  var FOOT_H = 42;
  var fontFamily = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';

  // Column definitions (verified exact sums against TABLE_W: 1324 non-club, 1424 club)
  var cols = [];
  var cx = PAD;
  function addCol(key, w, label, align) {
    cols.push({ key: key, x: cx, w: w, label: label, align: align || 'left' });
    cx += w;
  }

  var caughtW = showCaught ? 42 : 0;
  addCol('idx', isClub ? 50 : 52, '#', 'left');
  if (showCaught) addCol('caught', caughtW, '✓', 'center');
  addCol('img', isClub ? 98 : 100, tr('col_appearance'), 'left');

  if (isClub) {
    addCol('loc', showCaught ? 124 : 132, tr('col_area'), 'left');
    addCol('name', showCaught ? 180 : 192, tr('col_fish'), 'left');
    addCol('rating', 112, tr('col_rarity'), 'left');
    addCol('price', 130, tr('col_price'), 'left');
    addCol('baits', showCaught ? 214 : 230, tr('col_baits'), 'left');
    addCol('time', showCaught ? 170 : 176, tr('col_time'), 'left');
    addCol('size', 146, tr('col_size'), 'left');
    addCol('unlock', TABLE_W - (cx - PAD), tr('col_unlock'), 'left');
  } else {
    addCol('name', showCaught ? 184 : 196, tr('col_fish'), 'left');
    addCol('rating', 112, tr('col_rarity'), 'left');
    addCol('price', 134, tr('col_price'), 'left');
    addCol('loc', showCaught ? 154 : 164, tr('col_loc'), 'left');
    addCol('baits', showCaught ? 220 : 236, tr('col_baits'), 'left');
    addCol('time', showCaught ? 176 : 180, tr('col_time'), 'left');
    addCol('size', TABLE_W - (cx - PAD), tr('col_size'), 'left');
  }

  var colByKey = {};
  cols.forEach(function (c) { colByKey[c.key] = c; });

  // Measure row heights using an offscreen context
  var measureCanvas = document.createElement('canvas');
  var mCtx = measureCanvas.getContext('2d');
  var nowCtx = (typeof createTimeNowContext === 'function') ? createTimeNowContext() : null;
  var todayISO = (typeof getTodayISO === 'function') ? getTodayISO() : '';
  var highPct = (typeof getTodayHighPricePct === 'function') ? getTodayHighPricePct() : 90;

  var preparedRows = rows.map(function (entry) {
    var f = entry.fish;
    var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f, lang) : f.name;
    var isHl = highlightSet.has(Number(f.id));
    var isNow = (typeof isFishActiveNow === 'function') ? isFishActiveNow(f.raw_times, f.raw_dates, nowCtx) : false;
    var timeInfo = tsFormatCatchTime(f.raw_times, lang, tzMode);
    var dateInfo = tsFormatCatchDate(f.raw_dates, lang);
    var priceInfo = tsGetPriceInfo(f.id, lang, todayISO, highPct);
    var baitItems = tsComputeBaitItems(f, st.baitFilterCtx, lang);
    var baitLines = tsMeasureBaitLines(mCtx, baitItems, colByKey.baits.w - 16, fontFamily);

    var locItems = [];
    if (isClub) {
      (f.places || []).forEach(function (pk) {
        locItems.push({ label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(pk, lang) : pk, isArea: false });
      });
    } else {
      (f.locations || []).forEach(function (lk) {
        locItems.push({ label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(lk, lang) : lk, isArea: false });
      });
      (f.places || []).forEach(function (pk) {
        locItems.push({ label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(pk, lang) : pk, isArea: true });
      });
    }
    var locLines = tsMeasureLocChips(mCtx, locItems, colByKey.loc.w - 14, fontFamily);
    var unlockInfo = isClub ? tsGetUnlockStatusForLang(f, typeof currentClubPoints !== 'undefined' ? currentClubPoints : 0, lang) : null;

    var baitsH = baitLines.length * 24 + Math.max(0, baitLines.length - 1) * 4 + 18;
    var locsH = locLines.length * 22 + Math.max(0, locLines.length - 1) * 4 + 18;
    var timeLinesCount = 1 + (timeInfo.sub ? 1 : 0) + (dateInfo.isSeasonal ? 1 : 0);
    var timeH = timeLinesCount * 20 + 18;
    var rowH = Math.max(66, baitsH, locsH, timeH);

    return {
      fish: f,
      index: entry.index,
      fishName: fishName,
      isHighlighted: isHl,
      isNow: isNow,
      timeInfo: timeInfo,
      dateInfo: dateInfo,
      priceInfo: priceInfo,
      baitLines: baitLines,
      locLines: locLines,
      unlockInfo: unlockInfo,
      rowH: rowH
    };
  });

  var rowsTotalH = preparedRows.reduce(function (acc, r) { return acc + r.rowH; }, 0);
  var TABLE_H = TH_H + rowsTotalH;
  var H = Y_TABLE + TABLE_H + FOOT_H;

  var dpr = 2;
  var canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Background gradient
  var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#090f1d');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top accent stripe
  var accentColor = view === 'market' ? '#10b981' : (isClub ? '#f59e0b' : '#38bdf8');
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, W, 4);

  // Header left: view title + highlighted fish pill / subtitle
  var titleKey = view === 'market' ? 'table_snapshot_title_market' : (isClub ? 'table_snapshot_title_club' : 'table_snapshot_title_all');
  var titleStr = tr(titleKey);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 22px ' + fontFamily;
  ctx.fillText(titleStr, PAD, Y_HDR + 25);

  // Subtitle: row range + filter summary
  var totalFiltered = (st.list || []).length;
  var rangeStr = (slice.isSelectedOnly && rows.length > 1)
    ? tr('table_snapshot_subtitle_selected', { count: rows.length, total: totalFiltered })
    : ((rows.length === 1)
        ? tr('table_snapshot_subtitle_single', { num: rows[0].index + 1, total: totalFiltered })
        : tr('table_snapshot_subtitle_range', { from: slice.startIdx + 1, to: slice.endIdx + 1, total: totalFiltered }));
  var filterStr = buildLocalizedFilterSummary(st.filterSummary, view, lang);
  var subLine = filterStr ? (rangeStr + '  •  ' + filterStr) : rangeStr;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12.5px ' + fontFamily;
  ctx.fillText(tsFitText(ctx, subLine, W - PAD * 2 - 270), PAD, Y_HDR + 49);

  // Header right: site branding + date + TZ
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 13.5px ' + fontFamily;
  ctx.fillText('FISHAO Tracker • fishao-tracker.cz', W - PAD, Y_HDR + 23);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11.5px ' + fontFamily;
  var dateLabel = '';
  try { dateLabel = new Date().toLocaleDateString(locale); } catch (e) { }
  var tzBadgeText = tzMode === 'utc'
    ? 'UTC'
    : ((typeof detectedCityRaw !== 'undefined' && detectedCityRaw)
        ? (window.FISHAO_I18N && typeof window.FISHAO_I18N.getCityName === 'function' ? window.FISHAO_I18N.getCityName(detectedCityRaw, lang) : detectedCityRaw)
        : tr('tz_local_city_default'));
  ctx.fillText(dateLabel + (tzBadgeText ? ('  •  ' + tzBadgeText) : ''), W - PAD, Y_HDR + 46);
  ctx.textAlign = 'left';

  // Table Container
  tsRoundRect(ctx, PAD, Y_TABLE, TABLE_W, TABLE_H, 12);
  ctx.fillStyle = '#0f1624';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  tsRoundRect(ctx, PAD, Y_TABLE, TABLE_W, TABLE_H, 12);
  ctx.clip();

  // Table Header Bar
  ctx.fillStyle = '#0c121e';
  ctx.fillRect(PAD, Y_TABLE, TABLE_W, TH_H);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, Y_TABLE + TH_H);
  ctx.lineTo(PAD + TABLE_W, Y_TABLE + TH_H);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 10.5px ' + fontFamily;
  for (var hci = 0; hci < cols.length; hci++) {
    var hc = cols[hci];
    var hText = tsFitText(ctx, String(hc.label || '').toUpperCase(), hc.w - 14);
    if (hc.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(hText, hc.x + hc.w / 2, Y_TABLE + TH_H / 2 + 0.5);
      ctx.textAlign = 'left';
    } else {
      ctx.fillText(hText, hc.x + 12, Y_TABLE + TH_H / 2 + 0.5);
    }
  }

  // Rating tier styles
  var ratingStyles = {
    1: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.28)', numBg: 'rgba(0,0,0,0.4)', num: '#cbd5e1', star: '#cbd5e1' },
    2: { bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.36)', numBg: 'rgba(0,0,0,0.4)', num: '#6ee7b7', star: '#34d399' },
    3: { bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.36)', numBg: 'rgba(0,0,0,0.4)', num: '#7dd3fc', star: '#38bdf8' },
    4: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.45)', numBg: 'rgba(0,0,0,0.42)', num: '#e9d5ff', star: '#c084fc' },
    5: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(251, 191, 36, 0.58)', numBg: 'rgba(245, 158, 11, 0.35)', num: '#fef08a', star: '#fbbf24' }
  };

  // Draw Rows
  var curY = Y_TABLE + TH_H;
  for (var ri = 0; ri < preparedRows.length; ri++) {
    var r = preparedRows[ri];
    var f = r.fish;
    var ry = curY;
    var rh = r.rowH;
    var midY = ry + rh / 2;
    var isHl = r.isHighlighted;
    var isDimmed = hasHighlights && !isHl && preparedRows.length > 1;

    // Row background
    if (isHl) {
      var hlGrad = ctx.createLinearGradient(PAD, ry, PAD + TABLE_W, ry);
      hlGrad.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
      hlGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.14)');
      hlGrad.addColorStop(1, 'rgba(245, 158, 11, 0.10)');
      ctx.fillStyle = hlGrad;
      ctx.fillRect(PAD, ry, TABLE_W, rh);
    } else if (ri % 2 === 1) {
      ctx.fillStyle = '#111a2c';
      ctx.fillRect(PAD, ry, TABLE_W, rh);
    } else {
      ctx.fillStyle = '#0f1624';
      ctx.fillRect(PAD, ry, TABLE_W, rh);
    }

    // Row divider
    if (ri < preparedRows.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, ry + rh);
      ctx.lineTo(PAD + TABLE_W, ry + rh);
      ctx.stroke();
    }

    ctx.save();
    if (isDimmed) {
      ctx.globalAlpha = 0.52;
    }

    // Col: Index (#)
    var cIdx = colByKey.idx;
    ctx.textBaseline = 'middle';
    if (isHl) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 13px ' + fontFamily;
      ctx.fillText('★ ' + (isClub ? (f.order || (r.index + 1)) : (r.index + 1)), cIdx.x + 10, midY);
    } else {
      ctx.fillStyle = '#8492a6';
      ctx.font = '600 12.5px ' + fontFamily;
      ctx.fillText(String(isClub ? (f.order || (r.index + 1)) : (r.index + 1)), cIdx.x + 14, midY);
    }

    // Col: Caught (optional)
    if (showCaught && colByKey.caught) {
      var cCaught = colByKey.caught;
      var catchState = (typeof getFishCatchState === 'function') ? getFishCatchState(f.id) : 'none';
      var ccx = cCaught.x + cCaught.w / 2;
      ctx.beginPath();
      ctx.arc(ccx, midY, 12, 0, Math.PI * 2);
      if (catchState === 'caught') {
        ctx.fillStyle = '#059669';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 13px ' + fontFamily;
        ctx.textAlign = 'center';
        ctx.fillText('✓', ccx, midY + 0.5);
        ctx.textAlign = 'left';
      } else if (catchState === 'shiny') {
        ctx.fillStyle = '#d97706';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px ' + fontFamily;
        ctx.textAlign = 'center';
        ctx.fillText('✨', ccx, midY + 0.5);
        ctx.textAlign = 'left';
      } else {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
      if (!isHl && (catchState === 'caught' || catchState === 'shiny')) {
        ctx.fillStyle = catchState === 'shiny' ? '#fbbf24' : '#10b981';
        ctx.fillRect(PAD, ry, 3, rh);
      }
    }

    // Col: Fish Sprite Image
    var cImg = colByKey.img;
    var fishImg = _tableSnapshotImgCache['/images/fish_' + f.id + '.webp'];
    if (isHl) {
      var glowGrad = ctx.createRadialGradient(cImg.x + cImg.w / 2, midY, 4, cImg.x + cImg.w / 2, midY, 44);
      glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cImg.x + cImg.w / 2, midY, 44, 0, Math.PI * 2);
      ctx.fill();
    }
    if (fishImg && fishImg.naturalWidth > 0 && fishImg.naturalHeight > 0) {
      var boxW = 86;
      var boxH = 48;
      var scale = Math.min(boxW / fishImg.naturalWidth, boxH / fishImg.naturalHeight);
      var dw = fishImg.naturalWidth * scale;
      var dh = fishImg.naturalHeight * scale;
      var dx = cImg.x + (cImg.w - dw) / 2;
      var dy = midY - dh / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(fishImg, dx, dy, dw, dh);
      ctx.restore();
    }

    // Col: Fish Name + small tags
    var cName = colByKey.name;
    var nameMaxW = cName.w - 18;
    var hasExtraTags = (!isClub && f.is_club) || (Array.isArray(f.fruit_recipe) && f.fruit_recipe.length) || !!f.fossil_collection;
    ctx.font = (isHl ? '800 14.5px ' : '700 14px ') + fontFamily;
    ctx.fillStyle = isHl ? '#fef3c7' : '#ffffff';
    ctx.textBaseline = 'middle';
    if (hasExtraTags) {
      ctx.fillText(tsFitText(ctx, r.fishName, nameMaxW), cName.x + 10, midY - 9);
      var tagX = cName.x + 10;
      if (!isClub && f.is_club) {
        tagX += tsDrawPill(ctx, tagX, midY + 4, tr('badge_club_fish'), 'rgba(245, 158, 11, 0.16)', 'rgba(245, 158, 11, 0.38)', '#fbbf24', 5, 17, '700 9.5px ' + fontFamily, 4) + 4;
      }
      if (Array.isArray(f.fruit_recipe) && f.fruit_recipe.length) {
        tagX += tsDrawPill(ctx, tagX, midY + 4, '🍹', 'rgba(251, 146, 60, 0.15)', 'rgba(251, 146, 60, 0.42)', '#fed7aa', 5, 17, '700 10px ' + fontFamily, 4) + 4;
      }
      if (f.fossil_collection) {
        tsDrawPill(ctx, tagX, midY + 4, '🦴', 'rgba(168, 162, 158, 0.15)', 'rgba(168, 162, 158, 0.42)', '#e7e5e4', 5, 17, '700 10px ' + fontFamily, 4);
      }
    } else {
      ctx.fillText(tsFitText(ctx, r.fishName, nameMaxW), cName.x + 10, midY);
    }

    // Col: Rating Badge
    var cRat = colByKey.rating;
    var rNum = Math.max(1, Math.min(5, parseInt(f.rating, 10) || 1));
    var rSt = ratingStyles[rNum] || ratingStyles[1];
    var rBoxX = cRat.x + 8;
    var rBoxY = midY - 12;
    var rBoxW = 94;
    var rBoxH = 24;
    tsRoundRect(ctx, rBoxX, rBoxY, rBoxW, rBoxH, 6);
    ctx.fillStyle = rSt.bg;
    ctx.fill();
    ctx.strokeStyle = rSt.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner num pill
    tsRoundRect(ctx, rBoxX + 4, rBoxY + 4, 24, 16, 4);
    ctx.fillStyle = rSt.numBg;
    ctx.fill();
    ctx.fillStyle = rSt.num;
    ctx.font = '800 10.5px ' + fontFamily;
    ctx.textAlign = 'center';
    ctx.fillText(rNum + '★', rBoxX + 16, midY + 0.5);
    ctx.textAlign = 'left';

    // 5 stars track
    var starX = rBoxX + 33;
    ctx.font = '700 11px ' + fontFamily;
    for (var stIdx = 0; stIdx < 5; stIdx++) {
      ctx.fillStyle = stIdx < rNum ? rSt.star : 'rgba(255, 255, 255, 0.16)';
      ctx.fillText('★', starX + stIdx * 11.2, midY + 0.5);
    }

    // Col: Price
    var cPrice = colByKey.price;
    var pi = r.priceInfo;
    var hasEst = !!pi.estStr;
    var pTopY = hasEst ? (midY - 8) : midY;
    var px = cPrice.x + 10;
    ctx.textBaseline = 'middle';
    ctx.font = '800 13.5px ' + fontFamily;
    ctx.fillStyle = pi.isToday ? (pi.isHigh ? '#6ee7b7' : '#34d399') : (pi.primary === '—' ? '#64748b' : '#e2e8f0');
    ctx.fillText(pi.primary, px, pTopY);
    px += ctx.measureText(pi.primary).width + 3;
    if (pi.unit) {
      ctx.font = '700 10px ' + fontFamily;
      ctx.fillStyle = '#64748b';
      ctx.fillText(pi.unit, px, pTopY + 1);
      px += ctx.measureText(pi.unit).width + 4;
    }
    if (pi.countText) {
      tsDrawPill(ctx, px, pTopY - 8, pi.countText, 'rgba(255, 255, 255, 0.07)', null, '#94a3b8', 4, 15, '700 9px ' + fontFamily, 3);
    }
    if (hasEst) {
      ctx.font = '700 11px ' + fontFamily;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.88)';
      ctx.fillText(tsFitText(ctx, pi.estStr, cPrice.w - 16), cPrice.x + 10, midY + 10);
    }

    // Col: Locations / Areas
    var cLoc = colByKey.loc;
    if (r.locLines.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11.5px ' + fontFamily;
      ctx.fillText(tr('loc_unspecified'), cLoc.x + 10, midY);
    } else {
      var locBlockH = r.locLines.length * 22 + Math.max(0, r.locLines.length - 1) * 4;
      var locStartY = midY - locBlockH / 2;
      for (var li = 0; li < r.locLines.length; li++) {
        var lx = cLoc.x + 8;
        var ly = locStartY + li * 26;
        for (var lj = 0; lj < r.locLines[li].length; lj++) {
          var lChip = r.locLines[li][lj];
          if (lChip.isArea) {
            tsDrawPill(ctx, lx, ly, lChip.text, 'rgba(56, 189, 248, 0.12)', 'rgba(56, 189, 248, 0.34)', '#7dd3fc', 7, 21, '600 11px ' + fontFamily, 5);
          } else {
            tsDrawPill(ctx, lx, ly, lChip.text, '#0c1322', 'rgba(255, 255, 255, 0.14)', '#cbd5e1', 7, 21, '600 11px ' + fontFamily, 5);
          }
          lx += lChip.width + 4;
        }
      }
    }

    // Col: Baits (with icons + best highlight + competition + chance %)
    var cBait = colByKey.baits;
    var baitBlockH = r.baitLines.length * 24 + Math.max(0, r.baitLines.length - 1) * 4;
    var baitStartY = midY - baitBlockH / 2;
    for (var bli = 0; bli < r.baitLines.length; bli++) {
      var bx = cBait.x + 8;
      var by = baitStartY + bli * 28;
      for (var bji = 0; bji < r.baitLines[bli].length; bji++) {
        var bItem = r.baitLines[bli][bji];
        var bw = bItem.width;
        var bh = 23;
        tsRoundRect(ctx, bx, by, bw, bh, 5);
        if (bItem.isBest) {
          var bGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
          bGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
          bGrad.addColorStop(1, 'rgba(20, 184, 166, 0.14)');
          ctx.fillStyle = bGrad;
          ctx.fill();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        } else {
          ctx.fillStyle = '#151e30';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        }
        ctx.lineWidth = 1;
        ctx.stroke();

        var bCurX = bx + 6;
        var bMidY = by + bh / 2;
        var bImg = _tableSnapshotImgCache['/images/bait_' + bItem.bait + '.webp'];
        if (bImg && bImg.naturalWidth > 0) {
          ctx.drawImage(bImg, bCurX, bMidY - 7, 14, 14);
        }
        bCurX += 18;

        ctx.font = (bItem.isBest ? '700' : '600') + ' 11px ' + fontFamily;
        ctx.fillStyle = bItem.isBest ? '#ecfdf5' : '#cbd5e1';
        ctx.textBaseline = 'middle';
        ctx.fillText(bItem.label, bCurX, bMidY + 0.5);
        bCurX += ctx.measureText(bItem.label).width + 4;

        if (bItem.compText) {
          var cw = tsDrawPill(
            ctx,
            bCurX,
            bMidY - 7.5,
            bItem.compText,
            bItem.isBest ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255, 255, 255, 0.07)',
            null,
            bItem.isBest ? '#6ee7b7' : '#94a3b8',
            4,
            15,
            '800 9.5px ' + fontFamily,
            3
          );
          bCurX += cw + 3;
        }
        if (bItem.chanceText) {
          tsDrawPill(
            ctx,
            bCurX,
            bMidY - 7.5,
            bItem.chanceText,
            'rgba(56, 189, 248, 0.22)',
            'rgba(56, 189, 248, 0.38)',
            '#7dd3fc',
            4,
            15,
            '800 9.5px ' + fontFamily,
            3
          );
        }

        bx += bw + 5;
      }
    }

    // Col: Time + Biting Now + Seasonal
    var cTime = colByKey.time;
    var tLines = [];
    tLines.push({ kind: 'primary', text: (f.is_night ? '🌙 ' : '☀️ ') + r.timeInfo.primary, isNight: !!f.is_night, isNow: r.isNow });
    if (r.timeInfo.sub) {
      tLines.push({ kind: 'sub', text: r.timeInfo.sub });
    }
    if (r.dateInfo.isSeasonal) {
      tLines.push({ kind: 'date', text: '📅 ' + r.dateInfo.text, inSeason: r.dateInfo.inSeason });
    }
    var tBlockH = tLines.length * 19;
    var tStartY = midY - tBlockH / 2 + 9.5;
    for (var ti = 0; ti < tLines.length; ti++) {
      var tl = tLines[ti];
      var ty = tStartY + ti * 19;
      if (tl.kind === 'primary') {
        var nowLabel = tl.isNow ? tr('time_active_now_short') : '';
        var nowPillW = 0;
        if (nowLabel) {
          ctx.font = '900 8.5px ' + fontFamily;
          nowPillW = ctx.measureText(nowLabel).width + 14;
        }
        ctx.font = '600 11.5px ' + fontFamily;
        ctx.fillStyle = tl.isNight ? '#a5b4fc' : '#e2e8f0';
        var pTxt = tsFitText(ctx, tl.text, cTime.w - 18 - nowPillW);
        ctx.fillText(pTxt, cTime.x + 8, ty);
        if (nowLabel) {
          var pTw = ctx.measureText(pTxt).width;
          tsDrawPill(ctx, cTime.x + 8 + pTw + 5, ty - 7.5, nowLabel, '#34d399', null, '#022c22', 5, 15, '900 8.5px ' + fontFamily, 999);
        }
      } else if (tl.kind === 'sub') {
        ctx.font = '500 10.5px ' + fontFamily;
        ctx.fillStyle = '#8492a6';
        ctx.fillText(tsFitText(ctx, tl.text, cTime.w - 16), cTime.x + 8, ty);
      } else if (tl.kind === 'date') {
        tsDrawPill(
          ctx,
          cTime.x + 8,
          ty - 8,
          tsFitText(ctx, tl.text, cTime.w - 22),
          tl.inSeason ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.14)',
          tl.inSeason ? 'rgba(16, 185, 129, 0.38)' : 'rgba(239, 68, 68, 0.35)',
          tl.inSeason ? '#6ee7b7' : '#fca5a5',
          5,
          16,
          '700 10px ' + fontFamily,
          4
        );
      }
    }

    // Col: Size (min / avg cm / max cm)
    var cSize = colByKey.size;
    var sx = cSize.x + 10;
    var maxSizeW = cSize.w - 16;
    ctx.textBaseline = 'middle';
    var sMin = String(f.min_l) + ' / ';
    var sAvg = String(f.avg_l) + ' cm';
    var sMax = ' / ' + String(f.max_l) + ' cm';
    ctx.font = '500 11.5px ' + fontFamily;
    var wMin = ctx.measureText(sMin).width;
    var wMax = ctx.measureText(sMax).width;
    ctx.font = '800 12.5px ' + fontFamily;
    var wAvg = ctx.measureText(sAvg).width;
    var compactSize = (wMin + wAvg + wMax) > maxSizeW;
    var dimFont = (compactSize ? '500 10.5px ' : '500 11.5px ') + fontFamily;
    var avgFont = (compactSize ? '800 11.5px ' : '800 12.5px ') + fontFamily;

    ctx.font = dimFont;
    ctx.fillStyle = '#8492a6';
    ctx.fillText(sMin, sx, midY);
    sx += ctx.measureText(sMin).width;
    ctx.font = avgFont;
    ctx.fillStyle = isHl ? '#fef3c7' : '#f8fafc';
    ctx.fillText(sAvg, sx, midY);
    sx += ctx.measureText(sAvg).width;
    ctx.font = dimFont;
    ctx.fillStyle = '#8492a6';
    ctx.fillText(tsFitText(ctx, sMax, Math.max(0, (cSize.x + cSize.w - 8) - sx)), sx, midY);

    // Col: Club Unlock (club view only)
    if (isClub && colByKey.unlock && r.unlockInfo) {
      var cUnl = colByKey.unlock;
      ctx.font = '700 11.5px ' + fontFamily;
      ctx.fillStyle = r.unlockInfo.isUnlocked ? '#34d399' : '#f87171';
      ctx.fillText(tsFitText(ctx, r.unlockInfo.costText, cUnl.w - 14), cUnl.x + 8, midY - 8);
      ctx.font = '600 10.5px ' + fontFamily;
      ctx.fillStyle = r.unlockInfo.isUnlocked ? '#10b981' : '#ef4444';
      ctx.fillText(tsFitText(ctx, r.unlockInfo.desc, cUnl.w - 14), cUnl.x + 8, midY + 8);
    }

    ctx.restore(); // end dim alpha

    // Spotlight border + left golden bar on highlighted row (always full opacity!)
    if (isHl) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(PAD, ry, 5, rh);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, ry + 0.75);
      ctx.lineTo(PAD + TABLE_W, ry + 0.75);
      ctx.moveTo(PAD, ry + rh - 0.75);
      ctx.lineTo(PAD + TABLE_W, ry + rh - 0.75);
      ctx.stroke();
    }

    curY += rh;
  }

  ctx.restore(); // end table clip

  // Footer
  var footY = Y_TABLE + TABLE_H + 22;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11.5px ' + fontFamily;
  ctx.fillText(tsFitText(ctx, rangeStr, W - PAD * 2 - 260), PAD, footY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 12.5px ' + fontFamily;
  ctx.fillText('https://fishao-tracker.cz/', W - PAD, footY);
  ctx.textAlign = 'left';

  return canvas;
}

function ensureTableSnapshotModalOverlay() {
  var overlay = document.getElementById('tableSnapshotModalOverlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'tableSnapshotModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tableSnapshotModalTitle');
  overlay.onclick = function (e) {
    if (e.target === overlay) closeTableSnapshotModal();
  };

  overlay.innerHTML =
    '<div class="modal-box table-snapshot-modal-box" id="tableSnapshotModalBox">' +
      '<div class="modal-header">' +
        '<span class="modal-title" id="tableSnapshotModalTitle"></span>' +
        '<button type="button" class="modal-close" aria-label="Close" onclick="window.fishaoApp.closeTableSnapshotModal()">&times;</button>' +
      '</div>' +
      '<div class="modal-body table-snapshot-body">' +
        '<div class="table-snapshot-controls">' +
          '<div class="ts-control-row">' +
            '<span class="ts-control-label" id="tsLangLabel"></span>' +
            '<div class="guide-snapshot-lang-pills" id="tsLangPills"></div>' +
          '</div>' +
          '<div class="ts-control-row ts-highlight-row">' +
            '<span class="ts-control-label" id="tsHighlightLabel"></span>' +
            '<div class="ts-highlight-controls">' +
              '<div class="ts-search-wrap">' +
                '<input type="text" id="tsFishSearchInput" class="filter-control ts-search-input" autocomplete="off" ' +
                  'oninput="window.fishaoApp.onTableSnapshotFishSearch(this.value)" ' +
                  'onfocus="window.fishaoApp.onTableSnapshotFishSearch(this.value)">' +
                '<div id="tsFishSuggestions" class="ts-suggestions-dropdown" style="display:none;"></div>' +
              '</div>' +
              '<button type="button" id="tsClearHighlightBtn" class="pill-btn ts-clear-hl-btn" style="display:none;" ' +
                'onclick="window.fishaoApp.clearTableSnapshotHighlight()"></button>' +
            '</div>' +
          '</div>' +
          '<div class="ts-row-chips-wrap" id="tsRowChipsWrap"></div>' +
          '<div class="ts-control-row ts-range-row">' +
            '<div class="ts-range-group">' +
              '<span class="ts-control-label" id="tsRangeLabel"></span>' +
              '<div class="ts-scope-pills" id="tsScopePills"></div>' +
              '<div class="ts-shift-group">' +
                '<button type="button" id="tsShiftUpBtn" class="pill-btn ts-shift-btn" onclick="window.fishaoApp.shiftTableSnapshotWindow(-1)">▲</button>' +
                '<span id="tsRangeCounter" class="ts-range-counter"></span>' +
                '<button type="button" id="tsShiftDownBtn" class="pill-btn ts-shift-btn" onclick="window.fishaoApp.shiftTableSnapshotWindow(1)">▼</button>' +
              '</div>' +
            '</div>' +
            '<div class="ts-options-group">' +
              '<button type="button" id="tsTzToggleBtn" class="pill-btn ts-opt-btn" onclick="window.fishaoApp.toggleTableSnapshotTz()"></button>' +
              '<button type="button" id="tsCaughtToggleBtn" class="pill-btn ts-opt-btn" style="display:none;" onclick="window.fishaoApp.toggleTableSnapshotCaught()"></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="guide-snapshot-preview-wrap table-snapshot-preview-wrap">' +
          '<div id="tsSnapshotLoading" class="guide-snapshot-loading" style="display:none;"></div>' +
          '<img id="tsSnapshotPreviewImg" class="guide-snapshot-preview-img" alt="">' +
        '</div>' +
        '<div class="guide-snapshot-actions">' +
          '<button type="button" id="tsCopyBtn" class="pill-btn" onclick="window.fishaoApp.copyTableSnapshotToClipboard()"></button>' +
          '<button type="button" id="tsDownloadBtn" class="pill-btn active" onclick="window.fishaoApp.downloadTableSnapshotPng()"></button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Close search suggestions on outside click inside modal
  overlay.addEventListener('click', function (ev) {
    var drop = document.getElementById('tsFishSuggestions');
    var inp = document.getElementById('tsFishSearchInput');
    if (drop && drop.style.display !== 'none' && !drop.contains(ev.target) && ev.target !== inp) {
      drop.style.display = 'none';
    }
  });

  return overlay;
}

function renderTableSnapshotModalControls() {
  var st = _tableSnapshotState;
  var lang = st.lang;
  var slice = getTableSnapshotSlice(st);
  var hlSet = new Set((st.highlightedIds || []).map(Number));

  var titleEl = document.getElementById('tableSnapshotModalTitle');
  if (titleEl) {
    titleEl.textContent = t('table_snapshot_modal_title');
  }
  var langLbl = document.getElementById('tsLangLabel');
  if (langLbl) langLbl.textContent = t('guide_snapshot_lang_label');
  var hlLbl = document.getElementById('tsHighlightLabel');
  if (hlLbl) hlLbl.textContent = t('table_snapshot_highlight_label');
  var rangeLbl = document.getElementById('tsRangeLabel');
  if (rangeLbl) rangeLbl.textContent = t('table_snapshot_rows_label');

  var searchInp = document.getElementById('tsFishSearchInput');
  if (searchInp) searchInp.placeholder = t('table_snapshot_search_ph');

  var clearHlBtn = document.getElementById('tsClearHighlightBtn');
  if (clearHlBtn) {
    clearHlBtn.textContent = t('table_snapshot_clear_hl');
    clearHlBtn.style.display = st.highlightedIds.length > 0 ? '' : 'none';
  }

  // Language pills
  var pillsEl = document.getElementById('tsLangPills');
  if (pillsEl) {
    var langs = tsGetLanguages();
    pillsEl.innerHTML = langs.map(function (item) {
      var isAct = item.code === lang;
      return '<button type="button" class="pill-btn guide-snapshot-lang-pill' + (isAct ? ' active' : '') + '" ' +
        'aria-pressed="' + (isAct ? 'true' : 'false') + '" title="' + escapeHtml(item.label || item.code.toUpperCase()) + '" ' +
        'onclick="window.fishaoApp.selectTableSnapshotLang(\'' + escapeHtml(item.code) + '\')">' +
        '<span aria-hidden="true">' + escapeHtml(item.flag || '') + '</span> ' + escapeHtml(item.short || item.code.toUpperCase()) +
      '</button>';
    }).join('');
  }

  // Clickable fish chips for rows currently in frame
  var chipsWrap = document.getElementById('tsRowChipsWrap');
  if (chipsWrap) {
    var chipsHtml = slice.rows.map(function (entry) {
      var f = entry.fish;
      var fName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f, lang) : f.name;
      var isHl = hlSet.has(Number(f.id));
      var num = st.view === 'club' ? (f.order || (entry.index + 1)) : (entry.index + 1);
      return '<button type="button" class="ts-row-chip' + (isHl ? ' is-highlighted' : '') + '" ' +
        'aria-pressed="' + (isHl ? 'true' : 'false') + '" ' +
        'onclick="window.fishaoApp.toggleTableSnapshotHighlight(' + f.id + ')">' +
        '<span class="ts-row-chip-num">' + (isHl ? '★' : ('#' + num)) + '</span>' +
        '<span class="ts-row-chip-name">' + escapeHtml(fName) + '</span>' +
      '</button>';
    }).join('');
    chipsWrap.innerHTML =
      '<span class="ts-chips-hint">' + escapeHtml(t('table_snapshot_chips_hint')) + '</span>' +
      '<div class="ts-row-chips-list">' + chipsHtml + '</div>';
  }

  // Scope / row count presets
  var scopeEl = document.getElementById('tsScopePills');
  if (scopeEl) {
    var total = st.list.length;
    var presets = [];
    presets.push({ id: 'viewport', label: t('table_snapshot_scope_visible', { count: st.viewportCount }), active: st.scopeMode === 'viewport' });
    if (st.highlightedIds.length > 0) {
      var selLabel = st.highlightedIds.length === 1
        ? t('table_snapshot_scope_single')
        : t('table_snapshot_scope_selected', { count: st.highlightedIds.length });
      presets.push({ id: 'single', label: selLabel, active: st.scopeMode === 'single' });
    }
    [5, 10, 15].forEach(function (n) {
      if (total > 1) {
        var capped = Math.min(total, n);
        var lbl = (capped === total && n >= total) ? t('table_snapshot_scope_all', { count: total }) : String(n);
        if (!presets.some(function (p) { return p.id === ('n_' + capped); })) {
          presets.push({ id: 'n_' + capped, count: capped, label: lbl, active: st.scopeMode === 'fixed' && st.count === capped });
        }
      }
    });
    scopeEl.innerHTML = presets.map(function (p) {
      return '<button type="button" class="pill-btn ts-scope-pill' + (p.active ? ' active' : '') + '" ' +
        'onclick="window.fishaoApp.setTableSnapshotScope(\'' + p.id + '\')">' + escapeHtml(p.label) + '</button>';
    }).join('');
  }

  // Window shift buttons + counter
  var upBtn = document.getElementById('tsShiftUpBtn');
  var downBtn = document.getElementById('tsShiftDownBtn');
  var counterEl = document.getElementById('tsRangeCounter');
  if (counterEl) {
    if (slice.isSelectedOnly && slice.rows.length > 1) {
      counterEl.textContent = '★ ' + slice.rows.length + ' / ' + st.list.length;
    } else if (slice.rows.length === 1) {
      counterEl.textContent = '#' + (slice.rows[0].index + 1) + ' / ' + st.list.length;
    } else {
      counterEl.textContent = '#' + (slice.startIdx + 1) + '–' + (slice.endIdx + 1) + ' / ' + st.list.length;
    }
  }
  if (upBtn) {
    upBtn.disabled = slice.isSelectedOnly || slice.startIdx <= 0;
    upBtn.title = t('table_snapshot_shift_up');
  }
  if (downBtn) {
    downBtn.disabled = slice.isSelectedOnly || (slice.endIdx + 1) >= st.list.length;
    downBtn.title = t('table_snapshot_shift_down');
  }

  // TZ & Caught toggles
  var tzBtn = document.getElementById('tsTzToggleBtn');
  if (tzBtn) {
    tzBtn.textContent = st.tzMode === 'utc' ? '🌐 UTC' : ('📍 ' + t('tz_local_short'));
    tzBtn.classList.toggle('active', st.tzMode === 'utc');
    tzBtn.title = t('table_snapshot_tz_title');
  }
  var caughtBtn = document.getElementById('tsCaughtToggleBtn');
  if (caughtBtn) {
    var loggedIn = !!(typeof currentUser !== 'undefined' && currentUser);
    caughtBtn.style.display = loggedIn ? '' : 'none';
    caughtBtn.textContent = (st.showCaught ? '✅ ' : '○ ') + t('table_snapshot_show_caught');
    caughtBtn.classList.toggle('active', st.showCaught);
  }

  // Action buttons
  var copyBtn = document.getElementById('tsCopyBtn');
  if (copyBtn) {
    copyBtn.textContent = t('guide_snapshot_copy_btn');
    copyBtn.style.display = (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem === 'function') ? '' : 'none';
  }
  var dlBtn = document.getElementById('tsDownloadBtn');
  if (dlBtn) {
    dlBtn.textContent = t('guide_snapshot_download_btn');
  }
}

async function regenerateTableSnapshotPreview() {
  var overlay = document.getElementById('tableSnapshotModalOverlay');
  if (!overlay || !overlay.classList.contains('active')) return;

  var st = _tableSnapshotState;
  var lang = tsNormalizeLang(st.lang || getLang());
  st.lang = lang;
  var seq = ++_tableSnapshotRenderSeq;

  renderTableSnapshotModalControls();

  var imgEl = document.getElementById('tsSnapshotPreviewImg');
  var loadingEl = document.getElementById('tsSnapshotLoading');
  var copyBtn = document.getElementById('tsCopyBtn');
  var dlBtn = document.getElementById('tsDownloadBtn');

  var needsLoad = !!(window.FISHAO_I18N &&
    typeof window.FISHAO_I18N.ensureLangChainLoaded === 'function' &&
    typeof window.FISHAO_I18N.isLangLoaded === 'function' &&
    !window.FISHAO_I18N.isLangLoaded(lang));

  if (needsLoad || !st.dataUrl) {
    if (loadingEl) {
      loadingEl.textContent = t('guide_snapshot_generating');
      loadingEl.style.display = '';
    }
    if (!st.dataUrl && imgEl) imgEl.style.display = 'none';
    if (copyBtn) copyBtn.disabled = true;
    if (dlBtn) dlBtn.disabled = true;
  }

  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.ensureLangChainLoaded === 'function') {
    var loaded = true;
    try {
      loaded = await window.FISHAO_I18N.ensureLangChainLoaded(lang);
    } catch (err) {
      loaded = false;
    }
    if (seq !== _tableSnapshotRenderSeq || !overlay.classList.contains('active')) return;
    if (!loaded && needsLoad && typeof showToast === 'function') {
      showToast(t('guide_snapshot_lang_load_error'), 'error');
    }
  }

  // Re-render chips once language chain is loaded (in case fish names/labels updated)
  renderTableSnapshotModalControls();

  var canvas = await renderFishTableSnapshotCanvas(st);
  if (seq !== _tableSnapshotRenderSeq || !overlay.classList.contains('active')) return;

  var dataUrl = canvas.toDataURL('image/png');
  st.dataUrl = dataUrl;
  st.canvas = canvas;
  st.blob = null;
  if (typeof canvas.toBlob === 'function') {
    canvas.toBlob(function (blob) {
      if (_tableSnapshotState.canvas === canvas) {
        _tableSnapshotState.blob = blob;
      }
    }, 'image/png');
  }

  if (loadingEl) loadingEl.style.display = 'none';
  if (imgEl) {
    imgEl.src = dataUrl;
    imgEl.alt = t('table_snapshot_modal_title') + ' (' + lang.toUpperCase() + ')';
    imgEl.style.display = '';
  }
  if (copyBtn) copyBtn.disabled = false;
  if (dlBtn) dlBtn.disabled = false;
}

function openTableSnapshotModal(optHighlightFishId) {
  if (typeof document === 'undefined') return;
  var list = (typeof _tableScrollState !== 'undefined' && Array.isArray(_tableScrollState.data))
    ? _tableScrollState.data.slice()
    : [];

  if (!list.length) {
    if (typeof showToast === 'function') {
      showToast(t('table_snapshot_empty_toast'), 'info');
    }
    return;
  }

  var vis = getVisibleTableSlice(list);
  var initialHighlights = [];
  var startIdx = vis.startIdx;
  var count = vis.count;
  var scopeMode = 'viewport';

  if (optHighlightFishId !== undefined && optHighlightFishId !== null) {
    var targetId = Number(optHighlightFishId);
    var foundIdx = list.findIndex(function (f) { return Number(f.id) === targetId; });
    if (foundIdx !== -1) {
      initialHighlights = [targetId];
      if (foundIdx < startIdx || foundIdx >= startIdx + count) {
        count = Math.min(list.length, 5);
        startIdx = Math.max(0, Math.min(list.length - count, foundIdx - Math.floor(count / 2)));
        scopeMode = 'fixed';
      }
    }
  }

  var baitCtx = (typeof _tableScrollState !== 'undefined' && _tableScrollState.ctx && _tableScrollState.ctx.baitFilterCtx)
    ? Object.assign({}, _tableScrollState.ctx.baitFilterCtx)
    : null;

  _tableSnapshotRenderSeq++;
  _tableSnapshotState = {
    view: currentView === 'market' ? 'market' : (currentView === 'club' ? 'club' : 'all'),
    lang: getLang(),
    list: list,
    startIdx: startIdx,
    count: count,
    viewportStartIdx: vis.startIdx,
    viewportCount: vis.count,
    scopeMode: scopeMode,
    highlightedIds: initialHighlights,
    showCaught: false,
    tzMode: (typeof userTimezone !== 'undefined' && userTimezone === 'utc') ? 'utc' : 'local',
    baitFilterCtx: baitCtx,
    filterSummary: captureActiveFilterMeta(),
    dataUrl: '',
    blob: null,
    canvas: null
  };

  var overlay = ensureTableSnapshotModalOverlay();
  var searchInp = document.getElementById('tsFishSearchInput');
  if (searchInp) searchInp.value = '';
  var drop = document.getElementById('tsFishSuggestions');
  if (drop) drop.style.display = 'none';

  overlay.classList.add('active');
  if (document.documentElement) document.documentElement.classList.add('modal-open');
  if (document.body) document.body.classList.add('modal-open');
  updateTableSnapshotFab();
  if (typeof updateScrollTopButton === 'function') updateScrollTopButton();

  regenerateTableSnapshotPreview();
}

function closeTableSnapshotModal() {
  _tableSnapshotRenderSeq++;
  var overlay = document.getElementById('tableSnapshotModalOverlay');
  if (overlay) overlay.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) {
    if (document.documentElement) document.documentElement.classList.remove('modal-open');
    if (document.body) document.body.classList.remove('modal-open');
  }
  updateTableSnapshotFab();
  if (typeof updateScrollTopButton === 'function') updateScrollTopButton();
}

function refreshOpenTableSnapshot() {
  if (typeof document === 'undefined') return;
  var overlay = document.getElementById('tableSnapshotModalOverlay');
  if (!overlay || !overlay.classList.contains('active')) return;
  regenerateTableSnapshotPreview();
}

function selectTableSnapshotLang(langCode) {
  var nextLang = tsNormalizeLang(langCode);
  if (_tableSnapshotState.lang === nextLang && _tableSnapshotState.dataUrl) return;
  _tableSnapshotState.lang = nextLang;
  regenerateTableSnapshotPreview();
}

function toggleTableSnapshotHighlight(fishId) {
  var fid = Number(fishId);
  var arr = _tableSnapshotState.highlightedIds.slice();
  var idx = arr.indexOf(fid);
  if (idx !== -1) {
    arr.splice(idx, 1);
  } else {
    arr.push(fid);
  }
  _tableSnapshotState.highlightedIds = arr;
  if (_tableSnapshotState.scopeMode === 'single' && arr.length === 0) {
    _tableSnapshotState.scopeMode = 'viewport';
    _tableSnapshotState.startIdx = _tableSnapshotState.viewportStartIdx;
    _tableSnapshotState.count = _tableSnapshotState.viewportCount;
  }
  regenerateTableSnapshotPreview();
}

function clearTableSnapshotHighlight() {
  _tableSnapshotState.highlightedIds = [];
  if (_tableSnapshotState.scopeMode === 'single') {
    _tableSnapshotState.scopeMode = 'viewport';
    _tableSnapshotState.startIdx = _tableSnapshotState.viewportStartIdx;
    _tableSnapshotState.count = _tableSnapshotState.viewportCount;
  }
  regenerateTableSnapshotPreview();
}

function selectTableSnapshotFishFromSearch(fishId) {
  var fid = Number(fishId);
  var st = _tableSnapshotState;
  var foundIdx = st.list.findIndex(function (f) { return Number(f.id) === fid; });
  if (foundIdx === -1) return;

  if (st.highlightedIds.indexOf(fid) === -1) {
    st.highlightedIds.push(fid);
  }

  // If the chosen fish is outside the current slice, center the slice around it
  var slice = getTableSnapshotSlice(st);
  if (st.scopeMode === 'single') {
    // Selected-only mode automatically includes all highlightedIds
  } else if (foundIdx < slice.startIdx || foundIdx > slice.endIdx) {
    var desiredCount = Math.min(st.list.length, Math.max(5, Math.min(st.count || 5, 7)));
    st.count = desiredCount;
    st.startIdx = Math.max(0, Math.min(st.list.length - desiredCount, foundIdx - Math.floor(desiredCount / 2)));
    st.scopeMode = 'fixed';
  }

  var searchInp = document.getElementById('tsFishSearchInput');
  if (searchInp) searchInp.value = '';
  var drop = document.getElementById('tsFishSuggestions');
  if (drop) drop.style.display = 'none';

  regenerateTableSnapshotPreview();
}

function onTableSnapshotFishSearch(rawQuery) {
  var drop = document.getElementById('tsFishSuggestions');
  if (!drop) return;
  var q = String(rawQuery || '').trim();
  if (!q) {
    drop.style.display = 'none';
    return;
  }

  var st = _tableSnapshotState;
  var lang = st.lang || getLang();
  var hlSet = new Set(st.highlightedIds);
  var matches = [];

  for (var i = 0; i < st.list.length; i++) {
    var f = st.list[i];
    var isMatch = (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function')
      ? window.FISHAO_I18N.matchesFishSearch(f, q)
      : (normStr(f.name).indexOf(normStr(q)) !== -1);
    if (isMatch) {
      matches.push({ fish: f, index: i });
      if (matches.length >= 12) break;
    }
  }

  if (!matches.length) {
    drop.innerHTML = '<div class="ts-sugg-empty">' + escapeHtml(t('bulk_no_fish_found')) + '</div>';
    drop.style.display = 'block';
    return;
  }

  drop.innerHTML = matches.map(function (m) {
    var f = m.fish;
    var dispName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f, lang) : f.name;
    var num = st.view === 'club' ? (f.order || (m.index + 1)) : (m.index + 1);
    var isHl = hlSet.has(Number(f.id));
    return '<button type="button" class="ts-sugg-item' + (isHl ? ' is-hl' : '') + '" ' +
      'onclick="window.fishaoApp.selectTableSnapshotFishFromSearch(' + f.id + ')">' +
      '<img src="/images/fish_' + f.id + '.webp" alt="" class="ts-sugg-img" loading="lazy">' +
      '<span class="ts-sugg-name">' + escapeHtml(dispName) + '</span>' +
      '<span class="ts-sugg-meta">#' + num + (isHl ? ' ★' : '') + '</span>' +
    '</button>';
  }).join('');
  drop.style.display = 'block';
}

function setTableSnapshotScope(scopeId) {
  var st = _tableSnapshotState;
  var total = st.list.length;
  if (!total) return;

  if (scopeId === 'viewport') {
    st.scopeMode = 'viewport';
    st.startIdx = st.viewportStartIdx;
    st.count = st.viewportCount;
  } else if (scopeId === 'single') {
    if (!st.highlightedIds.length) return;
    st.scopeMode = 'single';
  } else if (scopeId && scopeId.indexOf('n_') === 0) {
    var n = parseInt(scopeId.slice(2), 10);
    if (!isFinite(n) || n < 1) n = 5;
    n = Math.min(total, n);
    st.scopeMode = 'fixed';
    st.count = n;
    // Keep last highlighted fish centered if any is highlighted
    if (st.highlightedIds.length > 0) {
      var lastHlId = st.highlightedIds[st.highlightedIds.length - 1];
      var hlIdx = st.list.findIndex(function (f) { return Number(f.id) === Number(lastHlId); });
      if (hlIdx !== -1 && (hlIdx < st.startIdx || hlIdx >= st.startIdx + n)) {
        st.startIdx = Math.max(0, Math.min(total - n, hlIdx - Math.floor(n / 2)));
      }
    }
    if (st.startIdx + st.count > total) {
      st.startIdx = Math.max(0, total - st.count);
    }
  }
  regenerateTableSnapshotPreview();
}

function shiftTableSnapshotWindow(delta) {
  var st = _tableSnapshotState;
  var total = st.list.length;
  if (!total) return;
  var maxStart = Math.max(0, total - st.count);
  var nextStart = Math.max(0, Math.min(maxStart, st.startIdx + delta));
  if (nextStart === st.startIdx) return;
  st.startIdx = nextStart;
  if (st.scopeMode === 'viewport') st.scopeMode = 'fixed';
  regenerateTableSnapshotPreview();
}

function toggleTableSnapshotTz() {
  _tableSnapshotState.tzMode = (_tableSnapshotState.tzMode === 'utc') ? 'local' : 'utc';
  regenerateTableSnapshotPreview();
}

function toggleTableSnapshotCaught() {
  _tableSnapshotState.showCaught = !_tableSnapshotState.showCaught;
  regenerateTableSnapshotPreview();
}

function downloadTableSnapshotPng() {
  var st = _tableSnapshotState;
  if (!st.dataUrl || typeof document === 'undefined') return;
  var langSuffix = st.lang ? ('-' + st.lang) : '';
  var base = 'fishao-' + (st.view === 'market' ? 'market' : (st.view === 'club' ? 'club' : 'fishdex'));
  if (st.highlightedIds.length === 1) {
    var f = getFishById(st.highlightedIds[0]);
    if (f) {
      var fn = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f, st.lang) : f.name;
      base = 'fishao-' + tsSlugify(fn);
    }
  } else if (st.highlightedIds.length > 1 && st.scopeMode === 'single') {
    base = 'fishao-selected-' + st.highlightedIds.length;
  }
  var a = document.createElement('a');
  a.href = st.dataUrl;
  a.download = base + langSuffix + '.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof showToast === 'function') {
    showToast(t('guide_snapshot_downloaded_toast'), 'success');
  }
}

async function copyTableSnapshotToClipboard() {
  var st = _tableSnapshotState;
  if (!st.dataUrl) return;
  try {
    var blob = st.blob;
    if (!blob && st.canvas && typeof st.canvas.toBlob === 'function') {
      blob = await new Promise(function (resolve) {
        st.canvas.toBlob(resolve, 'image/png');
      });
    }
    if (!blob || !navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem !== 'function') {
      downloadTableSnapshotPng();
      return;
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    if (typeof showToast === 'function') {
      showToast(t('guide_snapshot_copied_toast'), 'success');
    }
  } catch (err) {
    console.warn('Could not copy fish table snapshot to clipboard:', err);
    downloadTableSnapshotPng();
  }
}
