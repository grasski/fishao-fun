/**
 * FISHAO - Filtering, Search & Sorting Logic (js/filters.js)
 * -------------------------------------------------------------
 * Dynamic filtering of fish records by name, water, location,
 * rarity/rating, active time, mission sizes, and market prices.
 */

function onRangeSizeInput() {
  document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });
  applyFilters();
}

function onExactSizeInput() {
  applyFilters();
}

function setSizeFilter(min, exact, max, btn) {
  var minEl = document.getElementById("minSizeInput");
  var maxEl = document.getElementById("maxSizeInput");

  var isAlreadyActive = btn && btn.classList.contains("active");

  document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });

  if (isAlreadyActive) {
    if (minEl) minEl.value = "";
    if (maxEl) maxEl.value = "";
  } else {
    if (minEl) minEl.value = (min !== null && min !== undefined) ? min : "";
    if (maxEl) maxEl.value = (max !== null && max !== undefined) ? max : "";
    if (btn) btn.classList.add("active");
  }

  applyFilters();
}

function toggleOnlyPrice() {
  filterOnlyPrice = !filterOnlyPrice;
  document.getElementById("btnOnlyPrice").classList.toggle("active", filterOnlyPrice);
  applyFilters();
}

function toggleNowActive() {
  filterNowActive = !filterNowActive;
  document.getElementById("btnNow").classList.toggle("active", filterNowActive);
  document.getElementById("timeFilter").value = filterNowActive ? "now" : "";
  applyFilters();
}

function setCollectionFilter(mode, btn) {
  if (mode !== 'all' && !currentUser) {
    showAuthNotice(t('coll_gate_title', 'Sbírka úlovků vyžaduje přihlášení.'));
    return;
  }
  collectionFilterMode = mode;
  document.querySelectorAll("#bannerCollection .pill-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  if (btn) btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  updateClubStats();

  var q = document.getElementById("search").value.trim().toLowerCase();
  var bait = document.getElementById("baitFilter").value;
  var rating = document.getElementById("ratingFilter").value;
  var water = document.getElementById("waterFilter").value;
  var location = document.getElementById("locationFilter").value;
  var timeVal = document.getElementById("timeFilter").value;
  var sortBy = document.getElementById("sortBy").value;
  var hideLockedCheckbox = document.getElementById("hideLockedCheckbox");
  var hideLocked = hideLockedCheckbox ? hideLockedCheckbox.checked : false;
  var filterUncaught = document.getElementById("filterUncaughtCheckbox") ? document.getElementById("filterUncaughtCheckbox").checked : false;

  var minEl = document.getElementById("minSizeInput");
  var maxEl = document.getElementById("maxSizeInput");
  var minSize = minEl && minEl.value !== "" ? parseFloat(minEl.value) : NaN;
  var maxSize = maxEl && maxEl.value !== "" ? parseFloat(maxEl.value) : NaN;

  filterNowActive = (timeVal === "now");
  var btnNow = document.getElementById("btnNow");
  if (btnNow) btnNow.classList.toggle("active", filterNowActive);

  var dataset = currentView === "club" ? clubFishes : allFishes;

  var filtered = dataset.filter(function (f) {
    if (currentView === "club") {
      if (hideLocked) {
        var status = getUnlockStatus(f, currentClubPoints);
        if (!status.isUnlocked) return false;
      }
    }

    var localizedName = (window.FISHAO_I18N && window.FISHAO_I18N.getFishName) ? window.FISHAO_I18N.getFishName(f).toLowerCase() : '';
    if (q && !f.name.toLowerCase().includes(q) && !localizedName.includes(q)) return false;

    if (bait && !f.baits.includes(bait)) return false;

    if (rating) {
      if (rating === "min3" && f.rating < 3) return false;
      if (rating === "min4" && f.rating < 4) return false;
      if (rating.match(/^\d$/) && f.rating !== parseInt(rating)) return false;
    }

    if (currentView === "club" && water && getFishWater(f) !== water) return false;
    if (location && currentView !== "club" &&
        !((f.locations && f.locations.includes(location)) ||
          (f.places && f.places.includes(location)))) return false;

    if (!isNaN(minSize) && f.max_l < minSize) return false;
    if (!isNaN(maxSize) && f.min_l > maxSize) return false;

    if (timeVal === "now") {
      if (!isFishActiveNow(f.raw_times, f.raw_dates)) return false;
    } else if (timeVal === "seasonal") {
      if (!f.raw_dates || f.raw_dates.length === 0) return false;
    } else if (timeVal === "night") {
      if (!f.is_night) return false;
    } else if (timeVal === "day") {
      if (f.is_night) return false;
    } else if (timeVal === "morning") {
      if (!isFishActiveAtLocalHour(f.raw_times, 9)) return false;
    } else if (timeVal === "afternoon") {
      if (!isFishActiveAtLocalHour(f.raw_times, 15)) return false;
    } else if (timeVal === "evening") {
      if (!isFishActiveAtLocalHour(f.raw_times, 21)) return false;
    } else if (timeVal === "deepnight") {
      if (!isFishActiveAtLocalHour(f.raw_times, 3)) return false;
    }

    if (filterOnlyPrice) {
      var latest = getLatestPrice(f.id);
      if (!latest) return false;
    }

    if (filterUncaught && caughtFishIds.has(f.id)) return false;

    if (currentView === "collection" || currentView === "all" || currentView === "market") {
      if (collectionFilterMode === "caught" && !caughtFishIds.has(f.id)) return false;
      if (collectionFilterMode === "missing" && caughtFishIds.has(f.id)) return false;
    }

    return true;
  });

  // Sorting
  var curLang = getLang();
  if (sortBy === "today_price_desc") {
    filtered.sort(function (a, b) {
      var pa = (getTodayPrice(a.id) || {}).price || 0;
      var pb = (getTodayPrice(b.id) || {}).price || 0;
      return pb - pa || b.rating - a.rating;
    });
  } else if (sortBy === "price_desc") {
    filtered.sort(function (a, b) {
      var pa = (getLatestPrice(a.id) || {}).price || 0;
      var pb = (getLatestPrice(b.id) || {}).price || 0;
      return pb - pa || b.rating - a.rating;
    });
  } else if (sortBy === "price_asc") {
    filtered.sort(function (a, b) {
      var pa = (getLatestPrice(a.id) || {}).price || 999999;
      var pb = (getLatestPrice(b.id) || {}).price || 999999;
      return pa - pb || b.rating - a.rating;
    });
  } else if (sortBy === "name_asc") {
    filtered.sort(function (a, b) {
      var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
      var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
      return nameA.localeCompare(nameB, curLang);
    });
  } else if (sortBy === "name_desc") {
    filtered.sort(function (a, b) {
      var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
      var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
      return nameB.localeCompare(nameA, curLang);
    });
  } else if (sortBy === "rating_desc") {
    filtered.sort(function (a, b) { return b.rating - a.rating || b.avg_l - a.avg_l; });
  } else if (sortBy === "rating_asc") {
    filtered.sort(function (a, b) { return a.rating - b.rating || a.avg_l - b.avg_l; });
  } else if (sortBy === "avg_desc") {
    filtered.sort(function (a, b) { return b.avg_l - a.avg_l; });
  } else if (sortBy === "avg_asc") {
    filtered.sort(function (a, b) { return a.avg_l - b.avg_l; });
  } else if (sortBy === "max_desc" || sortBy === "length_desc") {
    filtered.sort(function (a, b) { return b.max_l - a.max_l; });
  } else if (sortBy === "max_asc" || sortBy === "length_asc") {
    filtered.sort(function (a, b) { return a.max_l - b.max_l; });
  } else if (sortBy === "points_desc" && currentView === "club") {
    filtered.sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
  } else if (sortBy === "points_asc" && currentView === "club") {
    filtered.sort(function (a, b) { return (a.points || 999999) - (b.points || 999999); });
  } else {
    filtered.sort(function (a, b) {
      var nameA = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(a) : a.name;
      var nameB = window.FISHAO_I18N ? window.FISHAO_I18N.getFishName(b) : b.name;
      return nameA.localeCompare(nameB, curLang);
    });
  }

  // Localized active filter summary
  var filterNotes = [];
  if (currentView === "club" && hideLocked) filterNotes.push(t('filter_note_unlocked'));
  if (filterOnlyPrice) {
    if (isMarketClosedToday()) {
      filterNotes.push(t('filter_note_priced_sunday'));
    } else {
      filterNotes.push(t('filter_note_priced'));
    }
  }
  if (location && currentView !== "club") {
    var locName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(location) : location;
    filterNotes.push(t('filter_note_location', { name: locName }));
  }
  if (bait) {
    var baitName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(bait) : bait;
    filterNotes.push(t('filter_note_bait', { name: baitName }));
  }
  if (currentView === "club" && water) {
    var waterName = window.FISHAO_I18N ? window.FISHAO_I18N.getWaterName(water) : water;
    filterNotes.push(t('filter_note_water', { name: waterName }));
  }
  if (rating) {
    var starStr = rating;
    if (rating === "min3") starStr = "3★+";
    else if (rating === "min4") starStr = "4★+";
    else if (rating.match(/^\d$/)) starStr = rating + "★";
    filterNotes.push(t('filter_note_rating', { stars: starStr }));
  }
  if (filterUncaught) filterNotes.push(t('filter_note_uncaught'));

  if (!isNaN(minSize) && !isNaN(maxSize)) {
    filterNotes.push(t('filter_note_size_range', { min: minSize, max: maxSize }));
  } else {
    if (!isNaN(minSize)) filterNotes.push(t('filter_note_size_min', { min: minSize }));
    if (!isNaN(maxSize)) filterNotes.push(t('filter_note_size_max', { max: maxSize }));
  }

  if (timeVal) {
    if (timeVal === "now") {
      var now = new Date();
      var timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
      filterNotes.push(t('filter_note_now', { time: timeStr }));
    } else if (timeVal === "seasonal") {
      filterNotes.push(t('filter_note_time_seasonal'));
    } else if (timeVal === "day") {
      filterNotes.push(t('filter_note_time_day'));
    } else if (timeVal === "night") {
      filterNotes.push(t('filter_note_time_night'));
    } else if (timeVal === "morning") {
      filterNotes.push(t('filter_note_time_morning'));
    } else if (timeVal === "afternoon") {
      filterNotes.push(t('filter_note_time_afternoon'));
    } else if (timeVal === "evening") {
      filterNotes.push(t('filter_note_time_evening'));
    } else if (timeVal === "deepnight") {
      filterNotes.push(t('filter_note_time_deepnight'));
    }
  }

  var activeDescEl = document.getElementById("activeFilterDesc");
  if (activeDescEl) {
    activeDescEl.innerText = filterNotes.length ? t('filter_active_wrapper', { notes: filterNotes.join(', ') }) : "";
  }

  renderTableBody(filtered);
}

function resetFilters() {
  var searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  var baitEl = document.getElementById("baitFilter");
  if (baitEl) baitEl.value = "";
  var ratingEl = document.getElementById("ratingFilter");
  if (ratingEl) ratingEl.value = "";
  var waterEl = document.getElementById("waterFilter");
  if (waterEl) waterEl.value = "";
  var loc = document.getElementById("locationFilter");
  if (loc) loc.value = "";
  var timeEl = document.getElementById("timeFilter");
  if (timeEl) timeEl.value = "";

  var sortEl = document.getElementById("sortBy");
  if (sortEl) {
    sortEl.value = (currentView === "market") ? "price_desc" : "name_asc";
  }

  var minEl = document.getElementById("minSizeInput");
  if (minEl) minEl.value = "";
  var maxEl = document.getElementById("maxSizeInput");
  if (maxEl) maxEl.value = "";

  filterNowActive = false;
  var btnNow = document.getElementById("btnNow");
  if (btnNow) btnNow.classList.remove("active");

  if (currentView === "market") {
    filterOnlyPrice = true;
    var btnOnlyPrice = document.getElementById("btnOnlyPrice");
    if (btnOnlyPrice) btnOnlyPrice.classList.add("active");
  } else {
    filterOnlyPrice = false;
    var btnOnlyPrice2 = document.getElementById("btnOnlyPrice");
    if (btnOnlyPrice2) btnOnlyPrice2.classList.remove("active");
  }

  var uncaughtCb = document.getElementById("filterUncaughtCheckbox");
  if (uncaughtCb) uncaughtCb.checked = false;

  var hideLockedCb = document.getElementById("hideLockedCheckbox");
  if (hideLockedCb) hideLockedCb.checked = false;

  collectionFilterMode = "all";
  var collAll = document.getElementById("collFilterAll");
  var collCaught = document.getElementById("collFilterCaught");
  var collMissing = document.getElementById("collFilterMissing");
  if (collAll) collAll.classList.add("active");
  if (collCaught) collCaught.classList.remove("active");
  if (collMissing) collMissing.classList.remove("active");

  document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });

  var activeDesc = document.getElementById("activeFilterDesc");
  if (activeDesc) activeDesc.innerText = "";

  renderTableHead();
  applyFilters();
}

function updateWaterFilterOptions() {
  var select = document.getElementById("waterFilter");
  if (!select) return;
  var curVal = select.value;
  select.innerHTML =
    '<option value="">' + t('opt_water_all') + '</option>' +
    '<option value="Slaná">' + t('opt_water_salt') + '</option>' +
    '<option value="Sladká">' + t('opt_water_fresh') + '</option>';
  select.value = curVal;
}

function initLocationOptions() {
  var locSet = new Set();
  allFishes.forEach(function (f) {
    if (f.locations && Array.isArray(f.locations)) {
      f.locations.forEach(function (l) { if (l) locSet.add(l); });
    }
    if (f.places && Array.isArray(f.places)) {
      f.places.forEach(function (p) { if (p) locSet.add(p); });
    }
  });
  var select = document.getElementById("locationFilter");
  if (!select) return;
  var currentVal = select.value;
  var sortedLocs = Array.from(locSet).map(function (l) {
    return {
      value: l,
      label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l
    };
  }).sort(function (a, b) {
    return a.label.localeCompare(b.label);
  });
  select.innerHTML = '<option value="">' + t('opt_loc_all', { count: sortedLocs.length }) + '</option>' +
    sortedLocs.map(function (l) {
      return '<option value="' + l.value + '">' + l.label + '</option>';
    }).join('');
  select.value = currentVal;
}

function initBaitOptions() {
  var select = document.getElementById("baitFilter");
  if (!select) return;
  var curVal = select.value;
  var allBaits = [
    'Hmyz', 'Rostlinné', 'Ryby', 'Těsta', 'Nástrahy', 'Maso', 'Žraločí',
    'Háčky', 'Ďasí', 'Monstrum', 'Šírotlamčí', 'Prehistorické', 'Svítivčí',
    'Tuňáčí', 'Soltýní', 'Marlíní'
  ];
  select.innerHTML = '<option value="">' + t('opt_bait_all') + '</option>' +
    allBaits.map(function (b) {
      var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
      return '<option value="' + b + '">' + bName + '</option>';
    }).join('');
  select.value = curVal;
}

function updateTimeFilterOptions() {
  var select = document.getElementById("timeFilter");
  if (!select) return;
  var curVal = select.value;
  select.innerHTML =
    '<option value="">' + t('opt_time_all') + '</option>' +
    '<option value="now">' + t('opt_time_now') + '</option>' +
    '<option value="seasonal">' + t('opt_time_seasonal') + '</option>' +
    '<option value="night">' + t('opt_time_night') + '</option>' +
    '<option value="day">' + t('opt_time_day') + '</option>' +
    '<option value="morning">' + t('opt_time_morning') + '</option>' +
    '<option value="afternoon">' + t('opt_time_afternoon') + '</option>' +
    '<option value="evening">' + t('opt_time_evening') + '</option>' +
    '<option value="deepnight">' + t('opt_time_deepnight') + '</option>';
  select.value = curVal;
}

function updateSortByOptions() {
  var select = document.getElementById("sortBy");
  if (!select) return;
  var curVal = select.value;
  var isSunday = isMarketClosedToday();
  var todaySortHtml = !isSunday
    ? '<option value="today_price_desc">' + t('opt_sort_today_price_desc') + '</option>'
    : '';

  select.innerHTML =
    '<option value="name_asc">' + t('opt_sort_name_asc') + '</option>' +
    '<option value="name_desc">' + t('opt_sort_name_desc') + '</option>' +
    todaySortHtml +
    '<option value="price_desc">' + t('opt_sort_price_desc') + '</option>' +
    '<option value="price_asc">' + t('opt_sort_price_asc') + '</option>' +
    '<option value="rating_desc">' + t('opt_sort_rating_desc') + '</option>' +
    '<option value="rating_asc">' + t('opt_sort_rating_asc') + '</option>' +
    '<option value="max_desc">' + t('opt_sort_max_desc') + '</option>' +
    '<option value="max_asc">' + t('opt_sort_max_asc') + '</option>' +
    '<option value="avg_desc">' + t('opt_sort_avg_desc') + '</option>' +
    '<option value="avg_asc">' + t('opt_sort_avg_asc') + '</option>';
  select.value = (curVal && curVal !== "default") ? curVal : "name_asc";
}

function updateRatingFilterOptions() {
  var select = document.getElementById("ratingFilter");
  if (!select) return;
  var curVal = select.value;
  select.innerHTML =
    '<option value="">' + t('opt_rating_all') + '</option>' +
    '<option value="5">★★★★★ (5)</option>' +
    '<option value="4">★★★★☆ (4)</option>' +
    '<option value="3">★★★☆☆ (3)</option>' +
    '<option value="2">★★☆☆☆ (2)</option>' +
    '<option value="1">★☆☆☆☆ (1)</option>' +
    '<option value="min3">' + t('opt_rating_min3') + '</option>' +
    '<option value="min4">' + t('opt_rating_min4') + '</option>';
  select.value = curVal;
}

