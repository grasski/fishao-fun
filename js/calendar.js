/**
 * FISHAO - Seasonal Fish Calendar & Timeline (js/calendar.js)
 * ------------------------------------------------------------------
 * Renders an interactive 12-month seasonal calendar and countdown
 * timeline for all 47 seasonal fish with live biting status,
 * month filtering, location filtering, and direct catch toggling.
 */

var calStatusFilter = 'all'; // 'all' | 'in_season' | 'biting_now' | 'ending_soon' | 'starting_soon' | 'missing'
var calMonthFilter = 0;      // 0 = Full year, 1..12 = Jan..Dec
var calLocationFilter = '';
var calSearchQuery = '';

function parseRawDateRange(rangeStr) {
  var clean = String(rangeStr || '').trim();
  if (clean.indexOf('-') === -1) return null;
  var parts = clean.split('-');
  if (parts.length !== 2) return null;
  var s = parts[0].split('.').map(Number);
  var e = parts[1].split('.').map(Number);
  if (s.length !== 2 || e.length !== 2 || isNaN(s[0]) || isNaN(s[1]) || isNaN(e[0]) || isNaN(e[1])) {
    return null;
  }
  return { sm: s[0], sd: s[1], em: e[0], ed: e[1] };
}

/**
 * Checks whether a fish's raw_dates includes a given UTC month (1..12) and day (1..31).
 * Treats 02.28 range end as also valid on leap day 02.29.
 */
function isFishInSeasonOnUtcDate(rawDates, month, day) {
  if (!Array.isArray(rawDates) || rawDates.length === 0) return true;
  var curVal = month * 100 + day;

  for (var i = 0; i < rawDates.length; i++) {
    var r = parseRawDateRange(rawDates[i]);
    if (!r) continue;
    var sVal = r.sm * 100 + r.sd;
    var eVal = (r.em === 2 && r.ed === 28) ? 229 : (r.em * 100 + r.ed);

    if (sVal <= eVal) {
      if (curVal >= sVal && curVal <= eVal) return true;
    } else {
      if (curVal >= sVal || curVal <= eVal) return true;
    }
  }
  return false;
}

function isFishActiveInMonth(rawDates, monthNum) {
  if (!Array.isArray(rawDates) || rawDates.length === 0) return true;
  for (var d = 1; d <= 31; d++) {
    if (isFishInSeasonOnUtcDate(rawDates, monthNum, d)) return true;
  }
  return false;
}

function formatDayMonthSafe(month, day) {
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.formatDayMonth === 'function') {
    return window.FISHAO_I18N.formatDayMonth(month, day);
  }
  return day + '. ' + month + '.';
}

/**
 * Merges split year-boundary ranges (e.g. ["12.01-12.31", "01.01-03.31"] or
 * ["01.01-02.28", "05.01-12.31"]) into a single continuous seasonal display string.
 */
function formatMergedSeasonRanges(rawDates) {
  if (!Array.isArray(rawDates) || rawDates.length === 0) {
    return typeof t === 'function' ? t('date_all_year') : 'All year';
  }
  var ranges = rawDates.map(parseRawDateRange).filter(Boolean);
  if (ranges.length === 0) return rawDates.join(', ');

  // Merge Dec 31 -> Jan 1 wrap-around if both endpoints exist
  var decEndIdx = -1;
  var janStartIdx = -1;
  for (var i = 0; i < ranges.length; i++) {
    if (ranges[i].em === 12 && ranges[i].ed === 31) decEndIdx = i;
    if (ranges[i].sm === 1 && ranges[i].sd === 1) janStartIdx = i;
  }

  if (decEndIdx !== -1 && janStartIdx !== -1 && decEndIdx !== janStartIdx) {
    var decRange = ranges[decEndIdx];
    var janRange = ranges[janStartIdx];
    var merged = {
      sm: decRange.sm,
      sd: decRange.sd,
      em: janRange.em,
      ed: janRange.ed
    };
    var remaining = [];
    for (var j = 0; j < ranges.length; j++) {
      if (j === decEndIdx) {
        remaining.push(merged);
      } else if (j !== janStartIdx) {
        remaining.push(ranges[j]);
      }
    }
    ranges = remaining;
  }

  return ranges.map(function (r) {
    return formatDayMonthSafe(r.sm, r.sd) + ' – ' + formatDayMonthSafe(r.em, r.ed);
  }).join(', ');
}

function getSeasonalFishStatus(fish, refDate) {
  var now = (refDate instanceof Date) ? refDate : new Date();
  var y = now.getUTCFullYear();
  var m = now.getUTCMonth();
  var d = now.getUTCDate();

  var rawDates = (fish && fish.raw_dates) || [];
  var inSeason = isFishInSeasonOnUtcDate(rawDates, m + 1, d);
  var isBitingNow = inSeason && (typeof isFishActiveNow === 'function' ? isFishActiveNow(fish.raw_times, rawDates) : false);

  var daysRemaining = null;
  var daysUntilStart = null;
  var targetMonth = m + 1;
  var targetDay = d;

  if (inSeason) {
    var endOffset = null;
    for (var off = 1; off <= 366; off++) {
      var dt = new Date(Date.UTC(y, m, d + off));
      if (!isFishInSeasonOnUtcDate(rawDates, dt.getUTCMonth() + 1, dt.getUTCDate())) {
        endOffset = off;
        var lastActive = new Date(Date.UTC(y, m, d + off - 1));
        targetMonth = lastActive.getUTCMonth() + 1;
        targetDay = lastActive.getUTCDate();
        break;
      }
    }
    daysRemaining = endOffset !== null ? endOffset : 365;
  } else {
    var startOffset = null;
    for (var off2 = 1; off2 <= 366; off2++) {
      var dt2 = new Date(Date.UTC(y, m, d + off2));
      if (isFishInSeasonOnUtcDate(rawDates, dt2.getUTCMonth() + 1, dt2.getUTCDate())) {
        startOffset = off2;
        targetMonth = dt2.getUTCMonth() + 1;
        targetDay = dt2.getUTCDate();
        break;
      }
    }
    daysUntilStart = startOffset !== null ? startOffset : 365;
  }

  return {
    inSeason: inSeason,
    isBitingNow: isBitingNow,
    daysRemaining: daysRemaining,
    daysUntilStart: daysUntilStart,
    targetDateFormatted: formatDayMonthSafe(targetMonth, targetDay),
    endingSoon: inSeason && daysRemaining <= 14,
    startingSoon: !inSeason && daysUntilStart <= 30
  };
}

function getSeasonalFishesList() {
  var fishes = (typeof allFishes !== 'undefined' && Array.isArray(allFishes)) ? allFishes : [];
  return fishes.filter(function (f) {
    return f && Array.isArray(f.raw_dates) && f.raw_dates.length > 0;
  });
}

function renderFishYearTimelineBar(rawDates, refDate) {
  var now = (refDate instanceof Date) ? refDate : new Date();
  var year = now.getUTCFullYear();
  var curMonth = now.getUTCMonth() + 1; // 1..12
  var curDay = now.getUTCDate();
  var curMonthDays = new Date(Date.UTC(year, curMonth, 0)).getUTCDate();

  var shortMonths = String(t('cal_months_short')).split(',');
  var cellsHtml = '';

  for (var m = 1; m <= 12; m++) {
    var daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
    var runs = [];
    var runStart = null;

    for (var day = 1; day <= daysInMonth; day++) {
      var active = isFishInSeasonOnUtcDate(rawDates, m, day);
      if (active && runStart === null) {
        runStart = day;
      } else if (!active && runStart !== null) {
        runs.push([runStart, day - 1]);
        runStart = null;
      }
    }
    if (runStart !== null) {
      runs.push([runStart, daysInMonth]);
    }

    var isFull = (runs.length === 1 && runs[0][0] === 1 && runs[0][1] === daysInMonth);
    var segClass = 'cal-month-seg';
    if (isFull) segClass += ' active-full';
    else if (runs.length > 0) segClass += ' active-partial';
    if (calMonthFilter === m) segClass += ' is-selected';
    if (curMonth === m) segClass += ' is-current';

    var fillsHtml = runs.map(function (r) {
      var leftPct = ((r[0] - 1) / daysInMonth * 100).toFixed(2);
      var widthPct = ((r[1] - r[0] + 1) / daysInMonth * 100).toFixed(2);
      return '<span class="cal-month-fill" style="left:' + leftPct + '%; width:' + widthPct + '%;"></span>';
    }).join('');

    var mLabel = shortMonths[m - 1] || String(m);
    cellsHtml += '<div class="' + segClass + '">' +
      '<div class="cal-month-bar">' + fillsHtml + '</div>' +
      '<span class="cal-month-lbl">' + escapeHtml(mLabel) + '</span>' +
    '</div>';
  }

  var todayPct = (((curMonth - 1) + (curDay - 0.5) / curMonthDays) / 12 * 100).toFixed(2);
  var todayDateText = formatDayMonthSafe(curMonth, curDay);
  var todayTitle = t('cal_today_marker', { date: todayDateText });

  return '<div class="cal-timeline-wrap" title="' + escapeHtml(todayTitle) + '">' +
    '<div class="cal-timeline-grid">' + cellsHtml + '</div>' +
    '<div class="cal-today-line" style="left:' + todayPct + '%;"></div>' +
  '</div>';
}

function setCalStatusFilter(status) {
  calStatusFilter = status || 'all';
  renderCalendarView();
}

function setCalMonthFilter(monthNum) {
  var next = parseInt(monthNum, 10) || 0;
  calMonthFilter = (calMonthFilter === next && next !== 0) ? 0 : next;
  renderCalendarView();
}

function onCalLocationChange(val) {
  calLocationFilter = String(val || '');
  renderCalendarView();
}

function onCalSearchInput(val) {
  calSearchQuery = String(val || '');
  renderCalendarView();
}

function resetCalendarFilters() {
  calStatusFilter = 'all';
  calMonthFilter = 0;
  calLocationFilter = '';
  calSearchQuery = '';
  var locEl = document.getElementById('calLocationFilter');
  if (locEl) locEl.value = '';
  var searchEl = document.getElementById('calSearchInput');
  if (searchEl) searchEl.value = '';
  renderCalendarView();
}

function updateCalendarTabPill() {
  var pill = document.getElementById('tabCalendarPill');
  if (!pill) return;
  var seasonal = getSeasonalFishesList();
  var now = new Date();
  var inSeasonCount = 0;
  seasonal.forEach(function (f) {
    if (isFishInSeasonOnUtcDate(f.raw_dates, now.getUTCMonth() + 1, now.getUTCDate())) {
      inSeasonCount++;
    }
  });
  pill.innerText = inSeasonCount + ' / ' + seasonal.length;
}

function populateCalendarLocationFilter(seasonalFishes) {
  var select = document.getElementById('calLocationFilter');
  if (!select) return;
  var locSet = new Set();
  seasonalFishes.forEach(function (f) {
    (f.locations || []).forEach(function (l) {
      if (l) locSet.add(l);
    });
  });

  var curLang = typeof getLang === 'function' ? getLang() : 'cs';
  var sortedLocs = Array.from(locSet).map(function (l) {
    return {
      value: l,
      label: (window.FISHAO_I18N && window.FISHAO_I18N.getLocationName)
        ? window.FISHAO_I18N.getLocationName(l)
        : l
    };
  }).sort(function (a, b) {
    return String(a.label).localeCompare(String(b.label), curLang);
  });

  select.innerHTML = '<option value="">' + escapeHtml(t('opt_loc_all', { count: sortedLocs.length })) + '</option>' +
    sortedLocs.map(function (l) {
      return '<option value="' + escapeHtml(l.value) + '"' + (calLocationFilter === l.value ? ' selected' : '') + '>' +
        escapeHtml(l.label) + '</option>';
    }).join('');
}

function renderCalendarView() {
  var gridEl = document.getElementById('calendarGrid');
  if (!gridEl) return;

  var now = new Date();
  var curUtcMonth = now.getUTCMonth() + 1;
  var seasonalFishes = getSeasonalFishesList();
  populateCalendarLocationFilter(seasonalFishes);
  updateCalendarTabPill();

  var entries = seasonalFishes.map(function (f) {
    return {
      fish: f,
      status: getSeasonalFishStatus(f, now),
      isCaught: (typeof caughtFishIds !== 'undefined' && caughtFishIds.has(f.id))
    };
  });

  var counts = {
    all: entries.length,
    in_season: 0,
    biting_now: 0,
    ending_soon: 0,
    starting_soon: 0,
    missing: 0
  };
  entries.forEach(function (item) {
    if (item.status.inSeason) counts.in_season++;
    if (item.status.isBitingNow) counts.biting_now++;
    if (item.status.endingSoon) counts.ending_soon++;
    if (item.status.startingSoon) counts.starting_soon++;
    if (!item.isCaught) counts.missing++;
  });

  // Update summary chips
  var statInSeason = document.getElementById('calStatInSeason');
  if (statInSeason) statInSeason.innerText = t('cal_stat_in_season', { count: counts.in_season });
  var statBitingNow = document.getElementById('calStatBitingNow');
  if (statBitingNow) statBitingNow.innerText = t('cal_stat_biting_now', { count: counts.biting_now });
  var statEndingSoon = document.getElementById('calStatEndingSoon');
  if (statEndingSoon) statEndingSoon.innerText = t('cal_stat_ending_soon', { count: counts.ending_soon });
  var statStartingSoon = document.getElementById('calStatStartingSoon');
  if (statStartingSoon) statStartingSoon.innerText = t('cal_stat_starting_soon', { count: counts.starting_soon });

  // Update status filter pills
  var statusBtnMap = [
    { id: 'calFilterAll', key: 'cal_filter_all', mode: 'all' },
    { id: 'calFilterInSeason', key: 'cal_filter_in_season', mode: 'in_season' },
    { id: 'calFilterBitingNow', key: 'cal_filter_biting_now', mode: 'biting_now' },
    { id: 'calFilterEndingSoon', key: 'cal_filter_ending_soon', mode: 'ending_soon' },
    { id: 'calFilterStartingSoon', key: 'cal_filter_starting_soon', mode: 'starting_soon' }
  ];
  statusBtnMap.forEach(function (btnCfg) {
    var btn = document.getElementById(btnCfg.id);
    if (!btn) return;
    btn.innerText = t(btnCfg.key, { count: counts[btnCfg.mode] || 0 });
    btn.classList.toggle('active', calStatusFilter === btnCfg.mode);
  });

  var missingBtn = document.getElementById('calFilterMissing');
  if (missingBtn) {
    var isLoggedIn = (typeof currentUser !== 'undefined' && !!currentUser);
    missingBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    missingBtn.classList.toggle('active', calStatusFilter === 'missing');
  }

  // Render 12-month bar
  var monthsBar = document.getElementById('calMonthsBar');
  if (monthsBar) {
    var monthShorts = String(t('cal_months_short')).split(',');
    var monthFulls = String(t('cal_months_full')).split(',');
    var monthHtml = '<button type="button" class="cal-month-btn' + (calMonthFilter === 0 ? ' active' : '') + '" ' +
      'onclick="window.fishaoApp.setCalMonthFilter(0)">' + escapeHtml(t('cal_month_all')) + '</button>';

    for (var m = 1; m <= 12; m++) {
      var mCount = 0;
      seasonalFishes.forEach(function (f) {
        if (isFishActiveInMonth(f.raw_dates, m)) mCount++;
      });
      var isCurrent = (m === curUtcMonth);
      var isSel = (calMonthFilter === m);
      monthHtml += '<button type="button" class="cal-month-btn' + (isSel ? ' active' : '') + (isCurrent ? ' current' : '') + '" ' +
        'onclick="window.fishaoApp.setCalMonthFilter(' + m + ')" title="' + escapeHtml(monthFulls[m - 1] || '') + '">' +
        '<span>' + escapeHtml(monthShorts[m - 1] || String(m)) + '</span>' +
        '<span class="cal-month-count">' + mCount + '</span>' +
      '</button>';
    }
    monthsBar.innerHTML = monthHtml;
  }

  // Filter seasonal entries
  var qNorm = normStr(calSearchQuery);
  var filtered = entries.filter(function (item) {
    var f = item.fish;
    var st = item.status;

    if (calStatusFilter === 'in_season' && !st.inSeason) return false;
    if (calStatusFilter === 'biting_now' && !st.isBitingNow) return false;
    if (calStatusFilter === 'ending_soon' && !st.endingSoon) return false;
    if (calStatusFilter === 'starting_soon' && !st.startingSoon) return false;
    if (calStatusFilter === 'missing' && item.isCaught) return false;

    if (calMonthFilter > 0 && !isFishActiveInMonth(f.raw_dates, calMonthFilter)) return false;

    if (calLocationFilter && (!f.locations || f.locations.indexOf(calLocationFilter) === -1)) return false;

    if (qNorm) {
      var match = (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function')
        ? window.FISHAO_I18N.matchesFishSearch(f, calSearchQuery)
        : normStr(f.name).indexOf(qNorm) !== -1;
      if (!match) return false;
    }

    return true;
  });

  // Smart sort: Biting now -> In season (ending soonest first) -> Out of season (starting soonest first)
  var curLang = typeof getLang === 'function' ? getLang() : 'cs';
  filtered.sort(function (a, b) {
    if (a.status.isBitingNow !== b.status.isBitingNow) return a.status.isBitingNow ? -1 : 1;
    if (a.status.inSeason !== b.status.inSeason) return a.status.inSeason ? -1 : 1;
    if (a.status.inSeason && b.status.inSeason) {
      if (a.status.daysRemaining !== b.status.daysRemaining) {
        return a.status.daysRemaining - b.status.daysRemaining;
      }
    } else {
      if (a.status.daysUntilStart !== b.status.daysUntilStart) {
        return a.status.daysUntilStart - b.status.daysUntilStart;
      }
    }
    var na = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a.fish) : a.fish.name;
    var nb = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b.fish) : b.fish.name;
    return String(na).localeCompare(String(nb), curLang);
  });

  var counterEl = document.getElementById('calCounterText');
  if (counterEl) {
    counterEl.innerText = t('counter_showing', { shown: filtered.length, total: seasonalFishes.length });
  }

  if (filtered.length === 0) {
    gridEl.innerHTML = '<div class="cal-empty-state">' + escapeHtml(t('cal_empty_state')) + '</div>';
    return;
  }

  gridEl.innerHTML = filtered.map(function (item) {
    var f = item.fish;
    var st = item.status;
    var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
    var altName = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getAltFishName === 'function')
      ? window.FISHAO_I18N.getAltFishName(f)
      : '';

    var statusCls = '';
    var statusText = '';
    if (st.endingSoon) {
      statusCls = 'ending-soon';
      statusText = t('cal_status_ending_soon', { days: st.daysRemaining, date: st.targetDateFormatted });
    } else if (st.inSeason) {
      statusCls = 'in-season';
      statusText = t('cal_status_in_season', { days: st.daysRemaining, date: st.targetDateFormatted });
    } else if (st.startingSoon) {
      statusCls = 'starting-soon';
      statusText = t('cal_status_starting_soon', { days: st.daysUntilStart, date: st.targetDateFormatted });
    } else {
      statusCls = 'out-of-season';
      statusText = t('cal_status_out_of_season', { days: st.daysUntilStart, date: st.targetDateFormatted });
    }

    var mergedSeasonStr = formatMergedSeasonRanges(f.raw_dates);
    var timeInfo = typeof formatCatchTime === 'function' ? formatCatchTime(f.raw_times) : { primary: '', sub: '' };
    var locLabels = typeof getFishParentLocationLabels === 'function' ? getFishParentLocationLabels(f) : [];
    var areaLabels = typeof getFishAreaLabels === 'function' ? getFishAreaLabels(f) : [];

    var locTagsHtml = locLabels.map(function (locName) {
      return '<span class="loc-tag">' + escapeHtml(locName) + '</span>';
    }).join(' ');
    if (areaLabels.length > 0) {
      locTagsHtml += ' ' + areaLabels.map(function (areaName) {
        return '<span class="loc-area-chip">📍 ' + escapeHtml(areaName) + '</span>';
      }).join(' ');
    }

    var baitsHtml = (f.baits || []).map(function (b) {
      return typeof renderBaitTag === 'function' ? renderBaitTag(b) : escapeHtml(b);
    }).join('');

    var cardClasses = ['cal-fish-card'];
    if (st.isBitingNow) cardClasses.push('is-biting-now');
    else if (st.inSeason) cardClasses.push('is-in-season');
    if (item.isCaught) cardClasses.push('is-caught');

    return '<article class="' + cardClasses.join(' ') + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')">' +
      '<div class="cal-card-top">' +
        '<div class="cal-card-caught-wrap" onclick="event.stopPropagation();">' + renderCaughtBtn(f.id) + '</div>' +
        '<div class="cal-card-img-box">' +
          '<img src="images/fish_' + f.id + '.png" alt="' + escapeHtml(fishName) + '" class="fish-img" onerror="this.src=\'https://play.fishao.net/data/image/fishes/fish255x85_' + f.id + '_item.png\'">' +
        '</div>' +
        '<div class="cal-card-title-wrap">' +
          '<div class="cal-card-name-row">' +
            '<h3 class="cal-card-name">' + escapeHtml(fishName) + '</h3>' +
            (f.is_club ? '<span class="badge-club-tag">' + escapeHtml(t('badge_club_fish')) + '</span>' : '') +
          '</div>' +
          (altName ? '<div class="cal-card-alt-name">' + escapeHtml(altName) + '</div>' : '') +
          '<div class="cal-card-badges">' +
            renderRatingBadge(f.rating) +
            '<div class="cal-price-wrap" onclick="event.stopPropagation();">' + renderPriceCell(f.id) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cal-season-status-row">' +
        '<span class="cal-status-pill ' + statusCls + '">' + escapeHtml(statusText) + '</span>' +
        '<span class="cal-range-text">📅 ' + escapeHtml(mergedSeasonStr) + '</span>' +
      '</div>' +
      renderFishYearTimelineBar(f.raw_dates, now) +
      '<div class="cal-card-meta">' +
        '<div class="cal-meta-row">' + locTagsHtml + '</div>' +
        '<div class="cal-meta-row cal-meta-bottom">' +
          '<div class="cal-baits-wrap">' + baitsHtml + '</div>' +
          '<div class="cal-time-wrap">' +
            '<span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
              (f.is_night ? '🌙 ' : '☀️ ') + escapeHtml(timeInfo.primary) +
              (st.isBitingNow ? '<span class="time-now-active">' + escapeHtml(t('time_active_now_short')) + '</span>' : '') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
}
