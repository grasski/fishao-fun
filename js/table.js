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

function isFishInSeasonNow(rawDates) {
  if (!rawDates || rawDates.length === 0) return true;
  var now = new Date();
  var curVal = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();

  for (var i = 0; i < rawDates.length; i++) {
    var clean = rawDates[i].trim();
    if (!clean.includes('-')) continue;
    var parts = clean.split('-');
    var sParts = parts[0].split('.').map(Number);
    var eParts = parts[1].split('.').map(Number);
    var sVal = sParts[0] * 100 + sParts[1];
    var eVal = eParts[0] * 100 + eParts[1];

    if (sVal <= eVal) {
      if (curVal >= sVal && curVal <= eVal) return true;
    } else {
      if (curVal >= sVal || curVal <= eVal) return true;
    }
  }
  return false;
}

function formatCatchDate(rawDates) {
  if (!rawDates || rawDates.length === 0) {
    return {
      text: t('date_all_year') || 'Celoročně',
      isSeasonal: false,
      inSeason: true
    };
  }

  var isEn = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang === 'en');
  var enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var formatted = rawDates.map(function (dStr) {
    var clean = dStr.trim();
    if (!clean.includes('-')) return clean;
    var parts = clean.split('-');
    var s = parts[0].split('.').map(Number);
    var e = parts[1].split('.').map(Number);
    if (isEn) {
      return (enMonths[s[0] - 1] || s[0]) + " " + s[1] + " – " + (enMonths[e[0] - 1] || e[0]) + " " + e[1];
    } else {
      return s[1] + ". " + s[0] + ". – " + e[1] + ". " + e[0] + ".";
    }
  });

  var inSeason = isFishInSeasonNow(rawDates);
  return {
    text: formatted.join(', '),
    isSeasonal: true,
    inSeason: inSeason
  };
}

function isFishActiveNow(rawTimes, rawDates) {
  if (rawDates && rawDates.length > 0 && !isFishInSeasonNow(rawDates)) {
    return false;
  }
  if (!rawTimes || rawTimes.length === 0) return true;
  var now = new Date();
  var curUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (var i = 0; i < rawTimes.length; i++) {
    var clean = rawTimes[i].trim();
    if (!clean.includes('-')) continue;
    var parts = clean.split('-');
    var sParts = parts[0].split(':').map(Number);
    var eParts = parts[1].split(':').map(Number);
    var st = sParts[0] * 60 + (sParts[1] || 0);
    var et = eParts[0] * 60 + (eParts[1] || 0);
    if (et === 0) et = 24 * 60;

    if (et <= st) {
      if (curUtcMinutes >= st || curUtcMinutes <= et) return true;
    } else {
      if (curUtcMinutes >= st && curUtcMinutes <= et) return true;
    }
  }
  return false;
}

function isFishActiveAtLocalHour(rawTimes, testLocalHour) {
  if (userTimezone === "utc") {
    return isFishActiveAtUTCHour(rawTimes, testLocalHour);
  }
  var d = new Date();
  d.setHours(testLocalHour, 0, 0, 0);
  var testUtcHour = d.getUTCHours();
  return isFishActiveAtUTCHour(rawTimes, testUtcHour);
}

function isFishActiveAtUTCHour(rawTimes, testUtcHour) {
  if (!rawTimes || rawTimes.length === 0) return true;
  for (var i = 0; i < rawTimes.length; i++) {
    var clean = rawTimes[i].trim();
    if (!clean.includes('-')) continue;
    var parts = clean.split('-');
    var sParts = parts[0].split(':').map(Number);
    var eParts = parts[1].split(':').map(Number);
    var st = sParts[0] * 60 + (sParts[1] || 0);
    var et = eParts[0] * 60 + (eParts[1] || 0);
    if (et === 0) et = 24 * 60;
    var cur = testUtcHour * 60;
    if (et <= st) {
      if (cur >= st || cur <= et) return true;
    } else {
      if (cur >= st && cur <= et) return true;
    }
  }
  return false;
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

function renderPriceCell(fid) {
  // Display-only normalization: one row per distinct known price value.
  var list = normalizePriceEntries(getFishPrices(fid));
  var locale = getLocale();

  if (list.length === 0) {
    return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + t('price_cell_add_title') + '">' +
      '<span class="price-empty">+ ' + t('price_add_btn') + '</span></div>';
  }

  var pricesNum = list.map(function (x) { return x.price; });
  var minP = Math.min.apply(null, pricesNum);
  var maxP = Math.max.apply(null, pricesNum);
  var count = list.length;

  var histCount = '<span class="price-history-count" title="' + t('price_history_count_title') + '">' + count + 'x</span>';

  var cellTitle;
  var valuesHtml;
  if (minP === maxP) {
    cellTitle = t('price_cell_single_title', {
      price: minP.toLocaleString(locale),
      date: formatPriceDate(list[0].date)
    });
    valuesHtml = '<span class="price-range-single">' + minP.toLocaleString(locale) + '</span>' +
      '<span class="price-unit">FB</span>';
  } else {
    cellTitle = t('price_cell_range_title', {
      min: minP.toLocaleString(locale),
      max: maxP.toLocaleString(locale),
      count: count
    });
    valuesHtml = '<span class="price-range-min">' + minP.toLocaleString(locale) + '</span>' +
      '<span class="price-range-sep">–</span>' +
      '<span class="price-range-max">' + maxP.toLocaleString(locale) + '</span>' +
      '<span class="price-unit">FB</span>';
  }

  return '<div class="price-cell" onclick="window.fishaoApp.openPriceModal(' + fid + ')" title="' + cellTitle + '">' +
    '<span class="price-inline">' + valuesHtml + histCount + '</span></div>';
}

function countDistinctRecordedPrices() {
  return Object.keys(priceHistory).reduce(function (sum, fid) {
    return sum + normalizePriceEntries(getFishPrices(fid)).length;
  }, 0);
}

function renderCaughtBtn(fishId) {
  var isCaught = caughtFishIds.has(fishId);
  var title = !currentUser
    ? t('auth_notice_collection')
    : (isCaught ? t('caught_btn_unmarked_title') : t('caught_btn_mark_title'));
  return '<button class="caught-btn' + (isCaught ? ' caught' : '') + '" onclick="event.stopPropagation(); window.fishaoApp.toggleCaughtFish(' + fishId + ')" title="' + title + '">' +
    (isCaught ? '✓' : '') + '</button>';
}

function updateModalCaughtBtn(fid) {
  var btn = document.getElementById("modalBtnCaught");
  if (!btn) return;
  var isCaught = caughtFishIds.has(fid);
  btn.className = "btn-caught-pill " + (isCaught ? "caught" : "");
  btn.innerHTML = isCaught ? t('modal_btn_caught_yes') : t('modal_btn_caught_no');
}

function toggleCaughtFromModal() {
  if (!selectedModalFishId) return;
  toggleCaughtFish(selectedModalFishId);
  updateModalCaughtBtn(selectedModalFishId);
}

async function toggleCaughtFish(fishId) {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_collection'));
    return;
  }

  if (caughtFishIds.has(fishId)) {
    caughtFishIds.delete(fishId);
  } else {
    caughtFishIds.add(fishId);
  }

  try {
    localStorage.setItem('fishao_caught_fish_ids', JSON.stringify(Array.from(caughtFishIds)));
  } catch (e) {}

  if (currentUser && db) {
    try {
      var fsModule = await getFirestoreModule();
      var userDocRef = fsModule.doc(db, "users", currentUser.uid);
      await fsModule.updateDoc(userDocRef, {
        caughtFishIds: Array.from(caughtFishIds)
      });

      if (currentClubId) {
        try {
          var myClubCount = 0;
          clubFishes.forEach(function (f) { if (caughtFishIds.has(f.id)) myClubCount++; });
          var clubDocRef = fsModule.doc(db, "clubs", currentClubId);
          var mSync = {};
          mSync["members." + currentUser.uid + ".caughtCount"] = caughtFishIds.size;
          mSync["members." + currentUser.uid + ".caughtClubCount"] = myClubCount;
          await fsModule.updateDoc(clubDocRef, mSync);
        } catch (e) {
          console.warn("Could not sync member catch counts to club:", e);
        }
      }
    } catch (err) {
      console.error("Failed to update caught fish:", err);
    }
  }

  updateCaughtStats();
  if (currentView === 'club_manage') {
    renderClubMilestones();
  } else {
    applyFilters();
  }
}

function updateCaughtStats() {
  var clubCount = 0;
  var allCount = 0;

  clubFishes.forEach(function (f) {
    if (caughtFishIds.has(f.id)) clubCount++;
  });
  allFishes.forEach(function (f) {
    if (caughtFishIds.has(f.id)) allCount++;
  });

  var clubCountEl = document.getElementById("caughtClubCount");
  var allCountEl = document.getElementById("caughtAllCount");
  var progressEl = document.getElementById("caughtProgressFill");
  var pctTextEl = document.getElementById("caughtPctText");

  if (clubCountEl) clubCountEl.innerText = clubCount;
  if (allCountEl) allCountEl.innerText = allCount;

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

  var bannerSunday = document.getElementById("bannerMarketSunday");
  if (bannerSunday) {
    bannerSunday.style.display = (currentView === "market" && isSunday) ? "flex" : "none";
  }

  if (typeof updateMarketResetAlertVisibility === 'function') {
    updateMarketResetAlertVisibility();
  }

  var descEl = document.getElementById("marketSundayNoticeDesc");
  if (descEl) {
    var windowText = (typeof getMarketClosedWindowText === 'function') ? getMarketClosedWindowText() : 'neděle 00:00 – 24:00 UTC';
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
      '<th>' + t('col_water') + '</th>' +
      '<th>' + t('col_fish') + '</th>' +
      '<th>' + t('col_rarity') + '</th>' +
      priceColHtml +
      '<th>' + t('col_baits') + '</th>' +
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
      '<th>' + t('col_baits') + '</th>' +
      '<th>' + t('col_time') + '</th>' +
      '<th>' + t('col_size') + '</th>' +
      '</tr>';
  }
}

function renderTableBody(data) {
  var tbody = document.getElementById("tableBody");
  var total = currentView === "club" ? clubFishes.length : allFishes.length;

  if (data.length === 0) {
    var colCount = currentView === "club" ? 11 : 10;
    tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="empty-state">' + t('table_empty_state') + '</td></tr>';
    document.getElementById("counter").innerText = t('counter_showing', { shown: 0, total: total });
    return;
  }

  var rowClickTitle = t('price_cell_detail_title');
  var activeNowLabel = t('time_active_now_short');
  var searchInput = document.getElementById("search");
  var searchQ = searchInput ? searchInput.value.trim() : "";

  if (currentView === "club") {
    tbody.innerHTML = data.map(function (f) {
      var isNow = isFishActiveNow(f.raw_times, f.raw_dates);
      var timeInfo = formatCatchTime(f.raw_times);
      var dateInfo = formatCatchDate(f.raw_dates);
      var dateBadgeHtml = "";
      if (dateInfo.isSeasonal) {
        var sClass = dateInfo.inSeason ? "date-badge in-season" : "date-badge out-of-season";
        var sTitle = dateInfo.inSeason ? t('date_in_season_title') : t('date_out_of_season_title');
        dateBadgeHtml = '<div class="' + sClass + '" title="' + sTitle + '"><span class="date-icon">📅</span> ' + dateInfo.text + '</div>';
      }
      var unlock = getUnlockStatus(f, currentClubPoints);
      var rowClass = [];
      if (!unlock.isUnlocked) rowClass.push("row-locked");
      if (caughtFishIds.has(f.id)) rowClass.push("row-caught");

      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      var altMatch = (searchQ && window.FISHAO_I18N && typeof window.FISHAO_I18N.getMatchingFishAltName === 'function')
        ? window.FISHAO_I18N.getMatchingFishAltName(f, searchQ)
        : "";
      var altMatchHtml = altMatch ? '<div style="font-size: 11px; color: #38bdf8; font-weight: 500; margin-top: 2px;">' + escapeHtml(altMatch) + '</div>' : '';
      var safeFishName = escapeHtml(fishName);
      var waterType = getFishWater(f);
      var waterLabel = waterType === 'Slaná' ? ('🌊 ' + t('water_salt_short')) : ('🌿 ' + t('water_fresh_short'));

      return '<tr class="' + rowClass.join(' ') + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" title="' + rowClickTitle + '">' +
        '<td style="color: var(--text-muted); font-weight: 600;">' + f.order + '</td>' +
        '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
        '<td><div class="fish-img-box"><img src="images/fish_' + f.id + '.png" alt="' + safeFishName + '" class="fish-img" onerror="this.src=\'https://play.fishao.net/data/image/fishes/fish255x85_' + f.id + '_item.png\'"></div></td>' +
        '<td><span class="badge ' + (waterType === 'Slaná' ? 'badge-salt' : 'badge-fresh') + '">' + waterLabel + '</span></td>' +
        '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + safeFishName + '</div>' + altMatchHtml + '</td>' +
        '<td>' + renderRatingBadge(f.rating) + '</td>' +
        '<td>' + renderPriceCell(f.id) + '</td>' +
        '<td>' + f.baits.map(function (b) {
          var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
          return '<span class="bait-tag">' + bName + '</span>';
        }).join('') + '</td>' +
        '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
        (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
        (isNow ? '<span class="time-now-active">' + activeNowLabel + '</span>' : '') +
        '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') +
        dateBadgeHtml + '</div></td>' +
        '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
        '<td><div class="' + (unlock.isUnlocked ? 'status-unlocked' : 'status-locked') + '"><span class="status-cost">' + unlock.costText + '</span><span class="status-desc">' + unlock.desc + '</span></div></td>' +
        '</tr>';
    }).join('');
  } else {
    var clubTagText = t('badge_club_fish');
    var unspecText = t('loc_unspecified');

    tbody.innerHTML = data.map(function (f, idx) {
      var isNow = isFishActiveNow(f.raw_times, f.raw_dates);
      var timeInfo = formatCatchTime(f.raw_times);
      var dateInfo = formatCatchDate(f.raw_dates);
      var dateBadgeHtml = "";
      if (dateInfo.isSeasonal) {
        var sClass = dateInfo.inSeason ? "date-badge in-season" : "date-badge out-of-season";
        var sTitle = dateInfo.inSeason ? t('date_in_season_title') : t('date_out_of_season_title');
        dateBadgeHtml = '<div class="' + sClass + '" title="' + sTitle + '"><span class="date-icon">📅</span> ' + dateInfo.text + '</div>';
      }
      var rowClass = caughtFishIds.has(f.id) ? "row-caught" : "";
      var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
      var altMatch = (searchQ && window.FISHAO_I18N && typeof window.FISHAO_I18N.getMatchingFishAltName === 'function')
        ? window.FISHAO_I18N.getMatchingFishAltName(f, searchQ)
        : "";
      var altMatchHtml = altMatch ? '<div style="font-size: 11px; color: #38bdf8; font-weight: 500; margin-top: 2px;">' + escapeHtml(altMatch) + '</div>' : '';
      var safeFishName = escapeHtml(fishName);
      var locLabels = getFishLocationLabels(f);

      return '<tr class="' + rowClass + '" onclick="window.fishaoApp.openPriceModal(' + f.id + ')" title="' + rowClickTitle + '">' +
        '<td style="color: var(--text-muted); font-weight: 600;">' + (idx + 1) + '</td>' +
        '<td style="text-align: center;">' + renderCaughtBtn(f.id) + '</td>' +
        '<td><div class="fish-img-box"><img src="images/fish_' + f.id + '.png" alt="' + safeFishName + '" class="fish-img" onerror="this.src=\'https://play.fishao.net/data/image/fishes/fish255x85_' + f.id + '_item.png\'"></div></td>' +
        '<td><div style="font-weight: 700; font-size: 15px; color: #fff;">' + safeFishName +
        (f.is_club ? '<span class="badge-club-tag">' + clubTagText + '</span>' : '') +
        '</div>' + altMatchHtml + '</td>' +
        '<td>' + renderRatingBadge(f.rating) + '</td>' +
        '<td>' + renderPriceCell(f.id) + '</td>' +
        '<td style="max-width: 250px;">' +
        (locLabels.length ? locLabels.map(function (locName) {
          return '<span class="loc-tag">' + locName + '</span>';
        }).join('') : '<span style="color:var(--text-muted); font-size:12px;">' + unspecText + '</span>') +
        '</td>' +
        '<td>' + f.baits.map(function (b) {
          var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
          return '<span class="bait-tag">' + bName + '</span>';
        }).join('') + '</td>' +
        '<td><div class="time-cell"><span class="time-badge ' + (f.is_night ? 'time-night' : '') + '">' +
        (f.is_night ? '🌙 ' : '☀️ ') + timeInfo.primary +
        (isNow ? '<span class="time-now-active">' + activeNowLabel + '</span>' : '') +
        '</span>' + (timeInfo.sub ? '<span class="time-subtext">' + timeInfo.sub + '</span>' : '') +
        dateBadgeHtml + '</div></td>' +
        '<td class="len-box"><span class="len-dim">' + f.min_l + '</span> / <strong class="len-avg">' + f.avg_l + ' cm</strong> / <span class="len-dim">' + f.max_l + ' cm</span></td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById("counter").innerText = t('counter_showing', { shown: data.length, total: total });
}

