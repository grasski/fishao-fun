/**
 * FISHAO - Market & Price Management (js/market.js)
 * -------------------------------------------------------------
 * Fish Market price history (variable community prices), single price
 * submission/deletion through Firestore transactions, bulk text import with
 * fuzzy search, duplicate price detection, and JSON price export.
 */

function saveLocalPriceHistory() {
  try {
    localStorage.setItem('fishao_price_history_v1', JSON.stringify(priceHistory));
  } catch (err) {
    console.warn("Failed to save price history locally:", err);
  }
}

function clonePriceMap(map) {
  var source = (map && typeof map === "object") ? map : {};
  var copy = {};
  Object.keys(source).forEach(function (key) {
    var list = source[key];
    copy[key] = Array.isArray(list)
      ? list.map(function (item) {
        return (item && typeof item === "object")
          ? { date: item.date, price: item.price }
          : item;
      })
      : [];
  });
  return copy;
}

function sortPriceEntriesNewestFirst(list) {
  return list.slice().sort(function (a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

/**
 * Single display-only normalization for known prices.
 *
 * Returns a new, newest-first array with exactly one entry per distinct
 * numeric price (the newest date wins). Invalid entries are dropped.
 * It never mutates its input and never writes to storage, so legacy duplicate
 * rows stay untouched in Firestore/localStorage while every UI path shows a
 * de-duplicated list.
 */
function normalizePriceEntries(list) {
  if (!Array.isArray(list)) return [];

  var valid = [];
  list.forEach(function (item) {
    if (!item || typeof item !== "object") return;
    var price = Number(item.price);
    var date = typeof item.date === "string" ? item.date : "";
    if (!isFinite(price) || price <= 0 || !date) return;
    valid.push({ date: date, price: price });
  });

  var sorted = sortPriceEntriesNewestFirst(valid);
  var seen = Object.create(null);
  var normalized = [];

  sorted.forEach(function (entry) {
    var key = String(entry.price);
    if (seen[key]) return;
    seen[key] = true;
    normalized.push(entry);
  });

  return normalized;
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
  var parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  if (getLang() === "cs") {
    return parseInt(parts[2], 10) + ". " + parseInt(parts[1], 10) + ". " + parts[0];
  } else {
    return isoDate;
  }
}

/**
 * Returns the newest distinct known price entry for a fish.
 */
function getLatestPrice(fid) {
  var list = normalizePriceEntries(getFishPrices(fid));
  return list.length ? list[0] : null;
}

/**
 * Returns the highest distinct known price entry for a fish.
 * The normalized list is newest-first, so on a tie the most recent record wins.
 */
function getMaxPrice(fid) {
  var list = normalizePriceEntries(getFishPrices(fid));
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

function openPriceModal(fid, skipSync) {
  selectedModalFishId = fid;
  var fishObj = (typeof getFishById === "function") ? getFishById(fid) : allFishes.find(function (x) { return x.id === fid; });
  if (!fishObj) return;

  var f = Object.assign({}, fishObj);

  var nameEl = document.getElementById("modalFishName");
  var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
  if (nameEl) nameEl.innerText = fishName;
  var altNameEl = document.getElementById("modalFishAltName");
  if (altNameEl) {
    var curLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
    var otherLang = curLang === 'cs' ? 'en' : 'cs';
    var otherName = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function')
      ? window.FISHAO_I18N.getFishName(f, otherLang)
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
    document.title = fishName + t('seo_fish_title_suffix', ' – FISHAO Wiki & Ryby');
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
    imgEl.src = "images/fish_" + f.id + ".png";
    imgEl.onerror = function () {
      this.src = "https://play.fishao.net/data/image/fishes/fish255x85_" + f.id + "_item.png";
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
      var clubLoc = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName('Klubový revír') : 'Klubový revír';
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

  // Baits
  var baitsEl = document.getElementById("modalFishBaits");
  if (baitsEl) {
    baitsEl.innerHTML = f.baits && f.baits.length
      ? f.baits.map(function (b) {
        var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
        return '<span class="bait-tag">' + bName + '</span>';
      }).join('')
      : '<span style="color: var(--text-muted);">' + t('bait_unknown') + '</span>';
  }

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
      seasonEl.innerHTML = '<span style="color: var(--text-muted);">' + (t('date_all_year') || 'Celoročně') + '</span>';
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

  var formBox = document.getElementById("priceAddFormBox");
  var loginNotice = document.getElementById("priceAddLoginNotice");
  if (formBox) formBox.style.display = currentUser ? "block" : "none";
  if (loginNotice) loginNotice.style.display = currentUser ? "none" : "block";

  renderModalHistory(fid);
  document.getElementById("priceModalOverlay").classList.add("active");
}

function closePriceModal(skipSync) {
  document.getElementById("priceModalOverlay").classList.remove("active");
  selectedModalFishId = null;
  try {
    var defTitle = (window.FISHAO_I18N && window.FISHAO_I18N.t) ? window.FISHAO_I18N.t("seo_page_title") : "FISHAO Wiki & Encyklopedie – Ryby, Fish Market ceník a Kluby";
    if (defTitle && defTitle !== "seo_page_title") {
      document.title = defTitle;
    }
  } catch (e) { }

  if (!skipSync && window.fishaoApp && typeof window.fishaoApp.syncUrlRoute === "function") {
    window.fishaoApp.syncUrlRoute(currentView, null, true);
  }
}

function renderModalHistory(fid) {
  // Display-only normalization: duplicate prices are shown once.
  var list = normalizePriceEntries(getFishPrices(fid));
  var tbody = document.getElementById("modalPriceHistoryTbody");
  var locale = getLocale();

  var minPriceEl = document.getElementById("statMinPrice");
  var maxPriceEl = document.getElementById("statMaxPrice");
  var historyTitleEl = document.getElementById("modalHistoryTitle");

  if (historyTitleEl) {
    historyTitleEl.innerText = t('modal_history_title', { count: list.length });
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 15px;">' + t('price_empty_history') + '</td></tr>';
    if (minPriceEl) minPriceEl.innerText = "--";
    if (maxPriceEl) maxPriceEl.innerText = "--";
    return;
  }

  var pricesNum = list.map(function (x) { return x.price; });
  var minP = Math.min.apply(null, pricesNum);
  var maxP = Math.max.apply(null, pricesNum);

  if (minPriceEl) minPriceEl.innerText = minP.toLocaleString(locale) + " FB";
  if (maxPriceEl) maxPriceEl.innerText = maxP.toLocaleString(locale) + " FB";

  tbody.innerHTML = list.map(function (item) {
    var actionHtml = isAdmin
      ? '<button class="btn-delete-price" title="' + t('price_delete_admin_title') + '" onclick="window.fishaoApp.deletePriceEntry(' + fid + ', ' + item.price + ')">🗑️</button>'
      : '<span title="' + t('price_delete_locked_title') + '" style="color: var(--text-muted); font-size: 13px; cursor: default;">🔒</span>';

    return '<tr>' +
      '<td style="color: #cbd5e1; font-weight: 600;">' + formatPriceDate(item.date) + '</td>' +
      '<td style="color: #34d399; font-weight: 800;"><span class="cash-icon">💵</span> ' + item.price.toLocaleString(locale) + ' FB</td>' +
      '<td style="text-align: center;">' + actionHtml + '</td>' +
      '</tr>';
  }).join('');
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

function applyCloudFishPriceList(fidStr, list) {
  if (Array.isArray(list) && list.length > 0) {
    priceHistory[fidStr] = list;
  } else {
    delete priceHistory[fidStr];
  }
  saveLocalPriceHistory();
}

async function submitNewPrice() {
  if (!selectedModalFishId) return;

  if (!currentUser) {
    showAuthNotice(t('auth_notice_price'));
    return;
  }

  var d = document.getElementById("newPriceDate").value;
  var p = parseInt(document.getElementById("newPriceValue").value, 10);

  if (!d) {
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

  // Fast local duplicate check: a price value is stored only once per fish.
  var localDuplicate = getFishPrices(fid).find(function (it) {
    return Number(it.price) === p;
  });
  if (localDuplicate) {
    showToast(t('price_exists', { price: p.toLocaleString(getLocale()), date: formatPriceDate(localDuplicate.date) }), "error");
    return;
  }

  // Local-only mode (no Firestore connection available).
  if (!db || !firebaseDocRef || !window.FISHAO_FS_TX) {
    var localMap = clonePriceMap(priceHistory);
    var localList = Array.isArray(localMap[fidStr]) ? localMap[fidStr] : [];
    localList.push({ date: d, price: p });
    localMap[fidStr] = sortPriceEntriesNewestFirst(localList);
    priceHistory = localMap;
    saveLocalPriceHistory();
    renderModalHistory(fid);
    applyFilters();
    document.getElementById("newPriceValue").value = "";
    showToast(t('price_added', { price: p }), "success");
    return;
  }

  try {
    var result = await window.FISHAO_FS_TX.readModifyWrite(db, firebaseDocRef, function (currentData) {
      var prices = clonePriceMap(currentData && currentData.prices ? currentData.prices : {});
      var list = Array.isArray(prices[fidStr]) ? prices[fidStr] : [];

      var duplicate = list.find(function (it) {
        return Number(it.price) === p;
      });
      if (duplicate) {
        return {
          write: false,
          result: { status: "duplicate", entry: duplicate, list: sortPriceEntriesNewestFirst(list) }
        };
      }

      list.push({ date: d, price: p });
      prices[fidStr] = sortPriceEntriesNewestFirst(list);

      return {
        write: true,
        data: { prices: prices, lastUpdated: new Date().toISOString() },
        result: { status: "added", list: prices[fidStr] }
      };
    });

    if (!result || result.status === "duplicate") {
      var dupEntry = result && result.entry ? result.entry : null;
      applyCloudFishPriceList(fidStr, (result && result.list) || []);
      renderModalHistory(fid);
      applyFilters();
      showToast(t('price_exists', {
        price: p.toLocaleString(getLocale()),
        date: dupEntry ? formatPriceDate(dupEntry.date) : "--"
      }), "error");
      return;
    }

    applyCloudFishPriceList(fidStr, result.list);
    renderModalHistory(fid);
    applyFilters();
    document.getElementById("newPriceValue").value = "";
    showToast(t('price_added', { price: p }), "success");
  } catch (err) {
    console.error("Failed to save price to Firestore:", err);
    showToast(t('price_sync_failed'), "error");
  }
}

async function deletePriceEntry(fid, price) {
  if (!isAdmin) {
    showToast(t('price_delete_non_admin'), "error");
    return;
  }

  var fidStr = fid.toString();
  var priceNum = Number(price);
  if (!priceHistory[fidStr] || !isFinite(priceNum)) return;
  var ok = await showConfirmModal(
    t('price_delete_admin_title', 'Smazat záznam ceny'),
    t('price_delete_confirm'),
    t('confirm_btn', 'Smazat'),
    true
  );
  if (!ok) return;

  // Local-only mode (no Firestore connection available).
  if (!db || !firebaseDocRef || !window.FISHAO_FS_TX) {
    var localMap = clonePriceMap(priceHistory);
    var localList = (localMap[fidStr] || []).filter(function (it) {
      return Number(it.price) !== priceNum;
    });
    if (localList.length > 0) {
      localMap[fidStr] = localList;
    } else {
      delete localMap[fidStr];
    }
    priceHistory = localMap;
    saveLocalPriceHistory();
    renderModalHistory(fid);
    applyFilters();
    return;
  }

  try {
    var result = await window.FISHAO_FS_TX.readModifyWrite(db, firebaseDocRef, function (currentData) {
      var prices = clonePriceMap(currentData && currentData.prices ? currentData.prices : {});
      var list = Array.isArray(prices[fidStr]) ? prices[fidStr] : [];

      // Removing all raw rows with this price makes the normalized row disappear.
      var filtered = list.filter(function (it) {
        return Number(it.price) !== priceNum;
      });

      if (filtered.length > 0) {
        prices[fidStr] = filtered;
      } else {
        delete prices[fidStr];
      }

      return {
        write: true,
        data: { prices: prices, lastUpdated: new Date().toISOString() },
        result: { list: filtered }
      };
    });

    applyCloudFishPriceList(fidStr, (result && result.list) || []);
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
        var curLang = (window.FISHAO_I18N && window.FISHAO_I18N.currentLang) || 'cs';
        var alt = curLang === 'cs' ? nameEn : nameCz;
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
    showToast(t('bulk_err_no_fish', 'Zadej nebo vyber název ryby.'), "error");
    nameInput.focus({ preventScroll: true });
    return;
  }
  if (!priceVal || isNaN(Number(priceVal)) || Number(priceVal) < 0) {
    showToast(t('bulk_err_no_price', 'Zadej platnou cenu ryby.'), "error");
    priceInput.focus({ preventScroll: true });
    return;
  }

  var newLine = nameVal + ": " + priceVal;
  if (textArea.value.trim().length > 0) {
    textArea.value = textArea.value.trimEnd() + "\n" + newLine + "\n";
  } else {
    textArea.value = newLine + "\n";
  }

  showToast(t('bulk_added_line', { line: newLine }, "Přidáno: " + newLine), "success");
  nameInput.value = "";
  priceInput.value = "";
  var drop = document.getElementById("bulkFishSuggestions");
  if (drop) drop.style.display = "none";
  nameInput.focus({ preventScroll: true });
}

async function processBulkImport() {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_bulk'));
    return;
  }
  var dateVal = document.getElementById("bulkImportDate").value || getTodayISO();
  var text = document.getElementById("bulkInputText").value.trim();
  var resEl = document.getElementById("bulkResultMsg");

  if (isDateSunday(dateVal)) {
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

  // Index both Czech and English fish names so bulk import works in any active language
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

  var additions = {};
  var skipped = 0;
  var duplicates = 0;
  var lines = text.split(/\r?\n/);

  for (var li = 0; li < lines.length; li++) {
    var l = lines[li].trim();
    if (!l) continue;

    var fishName = "";
    var priceNum = 0;

    if (l.includes(":")) {
      var parts = l.split(":");
      fishName = parts[0].trim();
      var match = parts[1].match(/\d+/);
      if (match) priceNum = parseInt(match[0]);
    } else {
      var match2 = l.match(/^(.*?)\s+(\d+)\s*(?:fb|fishbuck|fishbucks|fishmena|fishměna|dolar|dolary|\$|minc|coins|kc|b)?$/i);
      if (match2) {
        fishName = match2[1].trim();
        priceNum = parseInt(match2[2]);
      }
    }

    if (!fishName || !priceNum) {
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
      return Number(it.price) === priceNum;
    });

    var bucket = additions[fidStr];
    var seenInImport = !!(bucket && bucket.prices.indexOf(priceNum) !== -1);

    // A price value is stored only once per fish, across all dates.
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

  if (planned > 0) {
    if (!db || !firebaseDocRef || !window.FISHAO_FS_TX) {
      // Local-only mode.
      var localMap = clonePriceMap(priceHistory);
      Object.keys(additions).forEach(function (key) {
        var bucket = additions[key];
        var list = Array.isArray(localMap[key]) ? localMap[key] : [];
        bucket.prices.forEach(function (price) {
          list.push({ date: bucket.date, price: price });
        });
        localMap[key] = sortPriceEntriesNewestFirst(list);
      });
      priceHistory = localMap;
      saveLocalPriceHistory();
      added = planned;
      var prevScrollLocal = window.scrollY;
      applyFilters();
      window.scrollTo(0, prevScrollLocal);
    } else {
      try {
        var txResult = await window.FISHAO_FS_TX.readModifyWrite(db, firebaseDocRef, function (currentData) {
          var prices = clonePriceMap(currentData && currentData.prices ? currentData.prices : {});
          var cloudAdded = 0;
          var cloudDuplicates = 0;

          Object.keys(additions).forEach(function (key) {
            var bucket = additions[key];
            var list = Array.isArray(prices[key]) ? prices[key] : [];
            var known = Object.create(null);
            list.forEach(function (it) {
              known[String(Number(it.price))] = true;
            });

            bucket.prices.forEach(function (price) {
              if (known[String(price)]) {
                cloudDuplicates++;
                return;
              }
              known[String(price)] = true;
              list.push({ date: bucket.date, price: price });
              cloudAdded++;
            });

            if (list.length > 0) {
              prices[key] = sortPriceEntriesNewestFirst(list);
            }
          });

          if (cloudAdded === 0) {
            return {
              write: false,
              result: {
                prices: (currentData && currentData.prices) ? currentData.prices : {},
                added: 0,
                duplicates: cloudDuplicates
              }
            };
          }

          return {
            write: true,
            data: { prices: prices, lastUpdated: new Date().toISOString() },
            result: { prices: prices, added: cloudAdded, duplicates: cloudDuplicates }
          };
        });

        if (txResult && txResult.prices) {
          priceHistory = txResult.prices;
          saveLocalPriceHistory();
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
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(priceHistory, null, 2));
  var a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "fishao_prices_" + getTodayISO() + ".json");
  document.body.appendChild(a);
  a.click();
  a.remove();
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

/**
 * Updates visibility of the floating Bulk Import button in the Fish Market view
 * when the user scrolls past the top Market action bar.
 */
function updateMarketFloatingImportBtn() {
  var btn = document.getElementById("marketFloatingImportBtn");
  if (!btn) return;

  if (currentView !== "market") {
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
}

window.addEventListener("scroll", updateMarketFloatingImportBtn, { passive: true });



