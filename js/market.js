/**
 * FISHAO - Market & Price Management (js/market.js)
 * -------------------------------------------------------------
 * Fish Market price history, today price calculations,
 * single price submission/deletion, bulk text import with fuzzy search,
 * and JSON price export.
 */

async function persistPriceHistory() {
  localStorage.setItem('fishao_price_history_v1', JSON.stringify(priceHistory));

  if (db && firebaseDocRef && currentUser) {
    try {
      var fsModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await fsModule.setDoc(firebaseDocRef, {
        prices: priceHistory,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to persist prices to Firestore:", err);
    }
  }
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
  var lang = (typeof getLang === 'function') ? getLang() : 'cs';
  var isCz = (lang === 'cz' || lang === 'cs');

  if (typeof userTimezone === 'undefined' || userTimezone === 'utc') {
    return isCz ? 'neděle 00:00 – 24:00 UTC' : 'Sunday 00:00 – 24:00 UTC';
  }

  // Calculate Sunday 00:00 UTC to Monday 00:00 UTC converted to user local timezone
  var now = new Date();
  var curUtcDay = now.getUTCDay(); // 0 = Sunday
  var sunUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - curUtcDay, 0, 0, 0, 0));
  var monUtc = new Date(sunUtc.getTime() + 24 * 60 * 60 * 1000);

  var dayNamesCs = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var days = isCz ? dayNamesCs : dayNamesEn;

  var startDay = days[sunUtc.getDay()];
  var startH = String(sunUtc.getHours()).padStart(2, '0');
  var startM = String(sunUtc.getMinutes()).padStart(2, '0');
  var startTime = startH + ':' + startM;

  var endDay = days[monUtc.getDay()];
  var endH = String(monUtc.getHours()).padStart(2, '0');
  var endM = String(monUtc.getMinutes()).padStart(2, '0');
  var endTime = endH + ':' + endM;

  var localRange;
  if (startDay === endDay) {
    localRange = startDay + ' ' + startTime + ' – ' + endTime;
  } else {
    localRange = startDay + ' ' + startTime + ' – ' + endDay + ' ' + endTime;
  }

  var gameUtcRef = isCz ? 'herní čas: neděle 00:00 – 24:00 UTC' : 'game server: Sunday 00:00 – 24:00 UTC';
  return localRange + ' (' + gameUtcRef + ')';
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

  var isEn = (typeof getLang === 'function' && getLang() === 'en');
  var city = (typeof getLocalizedTzCity === 'function') ? getLocalizedTzCity() : 'Praha';

  var localH = String(monUtc.getHours()).padStart(2, '0');
  var localM = String(monUtc.getMinutes()).padStart(2, '0');
  var localTimeStr = localH + ":" + localM;

  var tzOffset = -now.getTimezoneOffset();
  var tzSign = tzOffset >= 0 ? "+" : "-";
  var tzHours = Math.floor(Math.abs(tzOffset) / 60);
  var tzOffsetStr = "UTC" + tzSign + tzHours;

  if (openTimeEl) {
    if (userTimezone === "utc") {
      openTimeEl.innerText = isEn ? "Opens: Monday 00:00 UTC" : "Otevírá: pondělí 00:00 UTC";
    } else {
      var dayName = isEn ? "Monday" : "pondělí";
      openTimeEl.innerText = (isEn ? "Opens: " : "Otevírá: ") + dayName + " " + localTimeStr + " (" + city + ", " + tzOffsetStr + ")";
    }
  }

  if (utcWarningEl && utcWarningTextEl) {
    if (userTimezone === "utc") {
      utcWarningEl.style.display = "flex";
      utcWarningTextEl.innerText = isEn
        ? "You have game server UTC time active. In your local time (" + city + "), the market opens on Monday at " + localTimeStr + "."
        : "Máš aktivní herní čas UTC. Ve tvém místním čase (" + city + ") se trh otevře v pondělí v " + localTimeStr + ".";
    } else {
      utcWarningEl.style.display = "none";
    }
  }
}

function getTodayPrice(fid) {
  if (isMarketClosedToday()) return null;
  var list = getFishPrices(fid);
  if (!list || list.length === 0) return null;
  var tIso = getTodayISO();
  return list.find(function (x) { return x.date === tIso; }) || null;
}

function formatPriceDate(isoDate) {
  if (!isoDate) return "";
  var parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  if (getLang() === "cz" || getLang() === "cs") {
    return parseInt(parts[2], 10) + ". " + parseInt(parts[1], 10) + ". " + parts[0];
  } else {
    return isoDate;
  }
}

function getLatestPrice(fid) {
  var list = getFishPrices(fid);
  if (!list || list.length === 0) return null;
  return list[0];
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

function openPriceModal(fid) {
  selectedModalFishId = fid;
  var clubFishObj = clubFishes.find(function (x) { return x.id === fid; });
  var allFishObj = allFishes.find(function (x) { return x.id === fid; });
  if (!clubFishObj && !allFishObj) return;

  var f = Object.assign({}, allFishObj || {}, clubFishObj || {});

  var nameEl = document.getElementById("modalFishName");
  var fishName = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name;
  if (nameEl) nameEl.innerText = fishName;

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

  // Locations and water
  var locEl = document.getElementById("modalFishLocations");
  if (locEl) {
    var waterBadge = f.water ? (f.water === 'Slaná' ? '🌊 ' + t('water_salt_full') : '🌿 ' + t('water_fresh_full')) : '';
    var locs = f.locations && f.locations.length
      ? f.locations.map(function (l) { return window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l; }).join(', ')
      : (f.is_club ? (window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName('Klubový revír') : 'Klubový revír') : t('loc_unspecified'));
    locEl.innerHTML = (waterBadge ? '<strong>' + waterBadge + '</strong> • ' : '') + locs;
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

function closePriceModal() {
  document.getElementById("priceModalOverlay").classList.remove("active");
  selectedModalFishId = null;
}

function renderModalHistory(fid) {
  var list = getFishPrices(fid);
  var tbody = document.getElementById("modalPriceHistoryTbody");
  var locale = getLocale();

  var todayPriceEl = document.getElementById("statTodayPrice");
  var minPriceEl = document.getElementById("statMinPrice");
  var maxPriceEl = document.getElementById("statMaxPrice");

  var isSunday = isMarketClosedToday();
  var curTodayIso = getTodayISO();
  var todayEntry = isSunday ? null : list.find(function (x) { return x.date === curTodayIso; });

  if (isSunday) {
    if (todayPriceEl) {
      todayPriceEl.innerHTML = '<span style="color: #f59e0b; font-size: 13px; font-weight: 700;">🔒 ' + t('market_closed_sunday_short') + '</span>';
    }
  } else if (todayEntry) {
    if (todayPriceEl) {
      todayPriceEl.innerText = todayEntry.price.toLocaleString(locale) + " FB";
      todayPriceEl.style.color = "#34d399";
    }
  } else {
    if (todayPriceEl) {
      todayPriceEl.innerText = "--";
      todayPriceEl.style.color = "var(--text-muted)";
    }
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

  tbody.innerHTML = list.map(function (item, idx) {
    var actionHtml = isAdmin
      ? '<button class="btn-delete-price" title="' + t('price_delete_admin_title') + '" onclick="window.fishaoApp.deletePriceEntry(' + fid + ', ' + idx + ')">🗑️</button>'
      : '<span title="' + t('price_delete_locked_title') + '" style="color: var(--text-muted); font-size: 13px; cursor: default;">🔒</span>';

    var isToday = (!isSunday && item.date === curTodayIso);
    var rowStyle = isToday ? 'background: rgba(56, 189, 248, 0.08);' : '';
    var todayTag = isToday ? ' <span style="font-size: 10px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 4px; font-weight: 700;">' + t('price_today_tag') + '</span>' : '';

    return '<tr style="' + rowStyle + '">' +
      '<td style="color: #cbd5e1; font-weight: 600;">' + formatPriceDate(item.date) + todayTag + '</td>' +
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

async function submitNewPrice() {
  if (!selectedModalFishId) return;

  if (!currentUser) {
    showAuthNotice(t('auth_notice_price'));
    return;
  }

  var d = document.getElementById("newPriceDate").value;
  var p = parseInt(document.getElementById("newPriceValue").value);

  if (isDateSunday(d)) {
    alert(t('price_sunday_blocked'));
    return;
  }

  if (!d || isNaN(p) || p <= 0) {
    alert(t('price_invalid_input'));
    return;
  }

  var fidStr = selectedModalFishId.toString();
  if (!priceHistory[fidStr]) priceHistory[fidStr] = [];

  var existingIdx = priceHistory[fidStr].findIndex(function (it) { return it.date === d; });
  if (existingIdx !== -1) {
    var existingPrice = priceHistory[fidStr][existingIdx].price;
    if (!isAdmin) {
      alert(t('price_exists_non_admin', { date: d, price: existingPrice }));
      return;
    }
    if (!confirm(t('price_exists_admin_confirm', { date: d, price: existingPrice, newPrice: p }))) {
      return;
    }
    priceHistory[fidStr][existingIdx].price = p;
  } else {
    priceHistory[fidStr].unshift({ date: d, price: p });
  }

  priceHistory[fidStr].sort(function (a, b) { return b.date.localeCompare(a.date); });

  await persistPriceHistory();
  renderModalHistory(selectedModalFishId);
  applyFilters();
  document.getElementById("newPriceValue").value = "";
}

async function deletePriceEntry(fid, index) {
  if (!isAdmin) {
    alert(t('price_delete_non_admin'));
    return;
  }

  var fidStr = fid.toString();
  if (!priceHistory[fidStr]) return;
  if (!confirm(t('price_delete_confirm'))) return;

  priceHistory[fidStr].splice(index, 1);
  if (priceHistory[fidStr].length === 0) {
    delete priceHistory[fidStr];
  }
  await persistPriceHistory();
  renderModalHistory(fid);
  applyFilters();
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
  var drop = document.getElementById("bulkFishSuggestions");
  if (fishInp) fishInp.value = "";
  if (priceInp) priceInp.value = "";
  if (drop) { drop.style.display = "none"; drop.innerHTML = ""; }
  setTimeout(function () {
    if (fishInp) fishInp.focus();
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
    var nameCz = f.name || "";
    var nameEn = (window.FISHAO_I18N && window.FISHAO_I18N.translations && window.FISHAO_I18N.translations.en && window.FISHAO_I18N.translations.en.fish_names && window.FISHAO_I18N.translations.en.fish_names[f.id]) || "";
    var curName = (window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(f) : f.name) || "";

    var normCz = normStr(nameCz);
    var normEn = normStr(nameEn);

    if (normCz.includes(nq) || (normEn && normEn.includes(nq))) {
      if (!seenNames.has(curName)) {
        seenNames.add(curName);
        var latestPr = getLatestPrice(f.id);
        matches.push({
          id: f.id,
          name: curName,
          altName: (getLang() === 'cz' ? nameEn : nameCz),
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
    html += '<div class="bulk-suggestion-item" data-index="' + idx + '" onclick="window.fishaoApp.selectBulkFishSuggestion(\'' + escapeHtml(m.name).replace(/'/g, "\\'") + '\')">' +
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
    priceInput.focus();
    priceInput.select();
  }
}

function onBulkInputKeyDown(e) {
  var drop = document.getElementById("bulkFishSuggestions");
  if (!drop || drop.style.display === "none" || currentBulkSuggestions.length === 0) {
    if (e.key === "Enter") {
      e.preventDefault();
      var priceInput = document.getElementById("bulkFishPrice");
      if (priceInput) priceInput.focus();
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
  var dateVal = document.getElementById("bulkImportDate").value || todayISO;
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
    showToast("Zadej nebo vyber název ryby.", "error");
    nameInput.focus();
    return;
  }
  if (!priceVal || isNaN(Number(priceVal)) || Number(priceVal) < 0) {
    showToast("Zadej platnou cenu ryby.", "error");
    priceInput.focus();
    return;
  }

  var newLine = nameVal + ": " + priceVal;
  if (textArea.value.trim().length > 0) {
    textArea.value = textArea.value.trimEnd() + "\n" + newLine + "\n";
  } else {
    textArea.value = newLine + "\n";
  }

  showToast("Přidáno: " + newLine, "success");
  nameInput.value = "";
  priceInput.value = "";
  var drop = document.getElementById("bulkFishSuggestions");
  if (drop) drop.style.display = "none";
  nameInput.focus();
}

async function processBulkImport() {
  if (!currentUser) {
    showAuthNotice(t('auth_notice_bulk'));
    return;
  }
  var dateVal = document.getElementById("bulkImportDate").value || todayISO;
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
    if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function') {
      var prevLang = window.FISHAO_I18N.currentLang;
      window.FISHAO_I18N.currentLang = 'en';
      var enName = window.FISHAO_I18N.getFishName(f);
      window.FISHAO_I18N.currentLang = 'cs';
      var csName = window.FISHAO_I18N.getFishName(f);
      window.FISHAO_I18N.currentLang = prevLang;
      if (enName) nameToFish.set(normStr(enName), f);
      if (csName) nameToFish.set(normStr(csName), f);
    }
  }

  var matched = 0;
  var skipped = 0;
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
    if (targetFish) {
      var fidStr = targetFish.id.toString();
      if (!priceHistory[fidStr]) priceHistory[fidStr] = [];

      var existingDateIdx = priceHistory[fidStr].findIndex(function (x) { return x.date === dateVal; });
      if (existingDateIdx !== -1) {
        if (isAdmin) {
          priceHistory[fidStr][existingDateIdx].price = priceNum;
          matched++;
        } else {
          skipped++;
        }
      } else {
        priceHistory[fidStr].unshift({ date: dateVal, price: priceNum });
        priceHistory[fidStr].sort(function (a, b) { return b.date.localeCompare(a.date); });
        matched++;
      }
    } else {
      skipped++;
    }
  }

  await persistPriceHistory();
  applyFilters();

  resEl.style.display = "block";
  resEl.style.background = "rgba(16,185,129,0.2)";
  resEl.style.color = "#34d399";
  var skippedPart = skipped > 0 ? t('bulk_result_skipped', { skipped: skipped }) : "";
  resEl.innerText = t('bulk_result_msg', { matched: matched, date: dateVal, skippedPart: skippedPart });
}

function exportPricesJson() {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(priceHistory, null, 2));
  var a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "fishao_prices_" + todayISO + ".json");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function resetPriceHistoryToDefault() {
  if (!isAdmin) {
    alert(t('reset_prices_non_admin'));
    return;
  }
  if (!confirm(t('reset_prices_confirm'))) return;
  priceHistory = JSON.parse(JSON.stringify(initialPrices));
  await persistPriceHistory();
  applyFilters();
  var resEl = document.getElementById("bulkResultMsg");
  if (resEl) {
    resEl.style.display = "block";
    resEl.style.background = "rgba(56,189,248,0.2)";
    resEl.style.color = "#38bdf8";
    resEl.innerText = t('reset_prices_done');
  }
}

