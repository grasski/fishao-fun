/**
 * FISHAO - Filtering, Search & Sorting Logic (js/filters.js)
 * -------------------------------------------------------------
 * Dynamic filtering of fish records by name, location, specific area,
 * rarity/rating, active time, mission sizes, and market prices.
 */

function onRangeSizeInput() {
  document.querySelectorAll(".pill-btn-size").forEach(function (p) { p.classList.remove("active"); });
  applyFilters();
}

function setSizeFilter(min, max, btn) {
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
  // "Only priced" and "needs price" are mutually exclusive.
  if (filterOnlyPrice && filterNeedsPrice) {
    filterNeedsPrice = false;
    syncNeedsPriceButton();
  }
  applyFilters();
}

/** Number of distinct known prices for a fish (display-normalized). */
function getKnownPriceCount(fid) {
  return normalizePriceEntries(getFishPrices(fid)).length;
}

/** A fish "needs a price" when the community has no known price entry yet. */
function fishNeedsPrice(fid) {
  return getKnownPriceCount(fid) === 0;
}

function syncNeedsPriceButton() {
  var btn = document.getElementById("btnNeedsPrice");
  if (btn) btn.classList.toggle("active", filterNeedsPrice);
}

function updateNeedsPriceCount() {
  var el = document.getElementById("needsPriceCount");
  if (!el) return;
  var count = 0;
  allFishes.forEach(function (f) { if (fishNeedsPrice(f.id)) count++; });
  el.textContent = count.toLocaleString(getLocale());
}

function toggleNeedsPrice() {
  filterNeedsPrice = !filterNeedsPrice;
  if (filterNeedsPrice && filterOnlyPrice) {
    filterOnlyPrice = false;
    var btnOnlyPrice = document.getElementById("btnOnlyPrice");
    if (btnOnlyPrice) btnOnlyPrice.classList.remove("active");
  }
  syncNeedsPriceButton();
  applyFilters();
}

function toggleNowActive() {
  filterNowActive = !filterNowActive;
  document.getElementById("btnNow").classList.toggle("active", filterNowActive);
  document.getElementById("timeFilter").value = filterNowActive ? "now" : "";
  applyFilters();
}

function toggleBestChanceSort() {
  var sortEl = document.getElementById("sortBy");
  if (!sortEl) return;
  if (sortEl.value === "chance_desc") {
    sortEl.value = (currentView === "market") ? "price_desc" : "name_asc";
  } else {
    sortEl.value = "chance_desc";
  }
  applyFilters();
}

function setCollectionFilter(mode, btn) {
  if (mode !== 'all' && !currentUser) {
    showAuthNotice(t('coll_gate_title'));
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
  syncBaitSelectIcon('baitFilter', 'baitFilterIcon');

  var searchEl = document.getElementById("search");
  var q = searchEl ? searchEl.value.trim() : "";
  var bait = document.getElementById("baitFilter").value;
  var rating = document.getElementById("ratingFilter").value;
  var location = document.getElementById("locationFilter").value;
  var areaEl = document.getElementById("areaFilter");
  var area = areaEl ? areaEl.value : "";
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

  var btnBestChance = document.getElementById("btnBestChance");
  if (btnBestChance) btnBestChance.classList.toggle("active", sortBy === "chance_desc");

  var dataset = currentView === "club" ? clubFishes : allFishes;

  var filtered = dataset.filter(function (f) {
    if (currentView === "club") {
      if (hideLocked) {
        var status = getUnlockStatus(f, currentClubPoints);
        if (!status.isUnlocked) return false;
      }
    }

    if (q) {
      var isMatch = (window.FISHAO_I18N && typeof window.FISHAO_I18N.matchesFishSearch === 'function')
        ? window.FISHAO_I18N.matchesFishSearch(f, q)
        : (normStr(f.name).includes(normStr(q)));
      if (!isMatch) return false;
    }

    if (bait && !f.baits.includes(bait)) return false;

    if (rating) {
      if (rating === "min3" && f.rating < 3) return false;
      if (rating === "min4" && f.rating < 4) return false;
      if (rating.match(/^\d$/) && f.rating !== parseInt(rating)) return false;
    }

    if (location && currentView !== "club" &&
        !((f.locations && f.locations.includes(location)) ||
          (f.places && f.places.includes(location)))) return false;
    if (area && !(f.places && f.places.includes(area))) return false;

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

    if (filterNeedsPrice && currentView === "market" && !fishNeedsPrice(f.id)) return false;

    if (filterUncaught && caughtFishIds.has(f.id)) return false;

    if (currentView === "all" || currentView === "market") {
      if (collectionFilterMode === "caught" && !caughtFishIds.has(f.id)) return false;
      if (collectionFilterMode === "missing" && caughtFishIds.has(f.id)) return false;
    }

    return true;
  });

  // Sorting
  var curLang = getLang();
  if (sortBy === "chance_desc" || sortBy === "chance_asc") {
    var chanceMap = new Map();
    var timeModeForSort = filterNowActive ? 'now' : 'overlap';
    var locForSort = (currentView === "club") ? "location_112" : (location || "");
    var getChanceData = function (f) {
      if (chanceMap.has(f.id)) return chanceMap.get(f.id);
      var rec = (typeof computeFishBaitRecommendations === "function")
        ? computeFishBaitRecommendations(f, {
            timeMode: timeModeForSort,
            filterLoc: locForSort,
            filterArea: area || "",
            onlyUnlockedClub: (currentView === "club" && hideLocked)
          })
        : null;
      var topSpot = (rec && rec.spots && rec.spots.length) ? rec.spots[0] : null;
      var topBait = (topSpot && topSpot.bestBait) ? topSpot.bestBait : null;
      var data = {
        chancePct: topBait ? topBait.chancePct : 0,
        competitorCount: topBait ? topBait.competitorCount : 999,
        competitorWeight: topBait ? topBait.competitorWeight : 999
      };
      chanceMap.set(f.id, data);
      return data;
    };

    if (sortBy === "chance_desc") {
      filtered.sort(function (a, b) {
        var ca = getChanceData(a);
        var cb = getChanceData(b);
        return (cb.chancePct - ca.chancePct) ||
          (ca.competitorCount - cb.competitorCount) ||
          (ca.competitorWeight - cb.competitorWeight) ||
          (b.rating - a.rating) ||
          (b.id - a.id);
      });
    } else {
      filtered.sort(function (a, b) {
        var ca = getChanceData(a);
        var cb = getChanceData(b);
        return (ca.chancePct - cb.chancePct) ||
          (cb.competitorCount - ca.competitorCount) ||
          (cb.competitorWeight - ca.competitorWeight) ||
          (a.rating - b.rating) ||
          (a.id - b.id);
      });
    }
  } else if (sortBy === "price_desc") {
    filtered.sort(function (a, b) {
      var pa = (getMaxPrice(a.id) || {}).price || 0;
      var pb = (getMaxPrice(b.id) || {}).price || 0;
      return pb - pa || b.rating - a.rating;
    });
  } else if (sortBy === "price_asc") {
    filtered.sort(function (a, b) {
      var pa = (getMaxPrice(a.id) || {}).price || 999999;
      var pb = (getMaxPrice(b.id) || {}).price || 999999;
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
  } else if (sortBy === "points_desc") {
    filtered.sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
  } else if (sortBy === "points_asc") {
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
  if (sortBy === "chance_desc") filterNotes.push(t('filter_note_sort_chance'));
  if (filterOnlyPrice) {
    if (isMarketClosedToday()) {
      filterNotes.push(t('filter_note_priced_sunday'));
    } else {
      filterNotes.push(t('filter_note_priced'));
    }
  }
  if (filterNeedsPrice && currentView === "market") filterNotes.push(t('filter_note_needs_price'));
  if (location && currentView !== "club") {
    var locName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(location) : location;
    filterNotes.push(t('filter_note_location', { name: locName }));
  }
  if (area) {
    var areaName = window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(area) : area;
    filterNotes.push(t('filter_note_area', { name: areaName }));
  }
  if (bait) {
    filterNotes.push('__BAIT_INLINE__');
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
      var nowH = userTimezone === "utc" ? now.getUTCHours() : now.getHours();
      var nowM = userTimezone === "utc" ? now.getUTCMinutes() : now.getMinutes();
      var timeStr = nowH.toString().padStart(2, '0') + ":" + nowM.toString().padStart(2, '0') + (userTimezone === "utc" ? " UTC" : "");
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
    if (filterNotes.length) {
      var baitHtml = bait
        ? escapeHtml(t('filter_note_bait', { name: '__B__' })).replace('__B__', renderBaitInline(bait))
        : '';
      activeDescEl.innerHTML = escapeHtml(t('filter_active_wrapper', { notes: filterNotes.join(', ') }))
        .replace('__BAIT_INLINE__', baitHtml);
    } else {
      activeDescEl.innerHTML = "";
    }
  }

  renderTableBody(filtered);
  if (currentView === "market") updateNeedsPriceCount();
}

function resetFilters() {
  var searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  var baitEl = document.getElementById("baitFilter");
  if (baitEl) baitEl.value = "";
  syncBaitSelectIcon('baitFilter', 'baitFilterIcon');
  var ratingEl = document.getElementById("ratingFilter");
  if (ratingEl) ratingEl.value = "";
  var loc = document.getElementById("locationFilter");
  if (loc) loc.value = "";
  var areaSelect = document.getElementById("areaFilter");
  if (areaSelect) areaSelect.value = "";
  updateAreaFilterOptions();
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

  var btnBestChance = document.getElementById("btnBestChance");
  if (btnBestChance) btnBestChance.classList.remove("active");

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

  filterNeedsPrice = false;
  syncNeedsPriceButton();

  var hideLockedCb = document.getElementById("hideLockedCheckbox");
  if (hideLockedCb) {
    try {
      var savedHideLocked = localStorage.getItem('fishao_hide_locked');
      hideLockedCb.checked = (savedHideLocked === 'true');
    } catch (e) {
      hideLockedCb.checked = false;
    }
  }

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

function initLocationOptions() {
  var locSet = new Set();
  allFishes.forEach(function (f) {
    if (f.locations && Array.isArray(f.locations)) {
      f.locations.forEach(function (l) { if (l) locSet.add(l); });
    }
  });
  var select = document.getElementById("locationFilter");
  if (!select) return;
  var currentVal = select.value;
  var curLang = getLang();
  var sortedLocs = Array.from(locSet).map(function (l) {
    return {
      value: l,
      label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(l) : l
    };
  }).sort(function (a, b) {
    return a.label.localeCompare(b.label, curLang);
  });
  select.innerHTML = '<option value="">' + t('opt_loc_all', { count: sortedLocs.length }) + '</option>' +
    sortedLocs.map(function (l) {
      return '<option value="' + l.value + '">' + l.label + '</option>';
    }).join('');
  select.value = currentVal;
}

function onLocationFilterChange() {
  updateAreaFilterOptions();
  applyFilters();
}

function getPalmZoneLetter(place) {
  var match = /^EFPT_PALM_ISLAND_ZONE_([A-H])$/.exec(String(place || ""));
  return match ? match[1] : "";
}

function updateAreaFilterOptions() {
  var select = document.getElementById("areaFilter");
  if (!select) return;

  // Club fishes all share the parent location "Klubový revír", so their areas
  // are derived from the club dataset instead of the hidden location filter.
  var isClubView = currentView === "club";
  var locationEl = document.getElementById("locationFilter");
  var location = locationEl ? locationEl.value : "";
  var areas = isClubView
    ? getClubAreas()
    : (location ? getFishAreasForLocation(location) : []);
  var currentVal = select.value;

  if (!areas.length) {
    select.innerHTML = '<option value="">' + t('opt_area_all') + '</option>';
    select.value = "";
    select.disabled = true;
    return;
  }

  var sortedAreas = areas.map(function (a) {
    return {
      value: a,
      label: window.FISHAO_I18N ? window.FISHAO_I18N.getLocationName(a) : a
    };
  });
  if (!isClubView) {
    var areaLang = getLang();
    sortedAreas.sort(function (a, b) {
      // Palm Island zones stay in A..H order even though their labels no longer
      // carry the letter prefix.
      var zoneA = getPalmZoneLetter(a.value);
      var zoneB = getPalmZoneLetter(b.value);
      if (zoneA && zoneB) return zoneA.localeCompare(zoneB);
      return a.label.localeCompare(b.label, areaLang);
    });
  }

  select.innerHTML = '<option value="">' + t('opt_area_all') + '</option>' +
    sortedAreas.map(function (a) {
      return '<option value="' + a.value + '">' + a.label + '</option>';
    }).join('');

  var keepValue = sortedAreas.some(function (a) { return a.value === currentVal; });
  select.value = keepValue ? currentVal : "";
  select.disabled = false;
}

function initBaitOptions() {
  var select = document.getElementById("baitFilter");
  if (!select) return;
  var curVal = select.value;
  var allBaits = [
    'insects', 'vegetal', 'fish', 'dough', 'lures', 'meat', 'shark',
    'hook', 'monkfish', 'monster', 'pelican', 'prehistoric', 'star',
    'tuna', 'barracuda', 'marlin'
  ];
  select.innerHTML = '<option value="">' + t('opt_bait_all') + '</option>' +
    allBaits.map(function (b) {
      var bName = window.FISHAO_I18N ? window.FISHAO_I18N.getBaitName(b) : b;
      return '<option value="' + b + '">' + bName + '</option>';
    }).join('');
  select.value = curVal;
  syncBaitSelectIcon('baitFilter', 'baitFilterIcon');
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

  select.innerHTML =
    '<option value="name_asc">' + t('opt_sort_name_asc') + '</option>' +
    '<option value="name_desc">' + t('opt_sort_name_desc') + '</option>' +
    '<option value="chance_desc">' + t('opt_sort_chance_desc') + '</option>' +
    '<option value="chance_asc">' + t('opt_sort_chance_asc') + '</option>' +
    '<option value="price_desc">' + t('opt_sort_price_desc') + '</option>' +
    '<option value="price_asc">' + t('opt_sort_price_asc') + '</option>' +
    '<option value="rating_desc">' + t('opt_sort_rating_desc') + '</option>' +
    '<option value="rating_asc">' + t('opt_sort_rating_asc') + '</option>' +
    '<option value="max_desc">' + t('opt_sort_max_desc') + '</option>' +
    '<option value="max_asc">' + t('opt_sort_max_asc') + '</option>' +
    '<option value="avg_desc">' + t('opt_sort_avg_desc') + '</option>' +
    '<option value="avg_asc">' + t('opt_sort_avg_asc') + '</option>' +
    '<option value="points_asc">' + t('opt_sort_points_asc') + '</option>' +
    '<option value="points_desc">' + t('opt_sort_points_desc') + '</option>';
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

