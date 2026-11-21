/**
 * FISHAO - Guide & Upgrades Calculator (js/guide.js)
 * -------------------------------------------------------------
 * Renders the Guide views (Money Tree & Fishing Line upgrades),
 * interactive From -> To upgrade calculators, and FC payback (ROI)
 * tables across all 20 levels.
 */

var GUIDE_TREE_DATA = [
  { id: 1, level: 1, price: 0, fc: 0, fb: 100, time_hours: "0 h", time_days: "-" },
  { id: 2, level: 2, price: 7, fc: 1, fb: 200, time_hours: "30 min", time_days: "-" },
  { id: 3, level: 3, price: 18, fc: 1, fb: 300, time_hours: "2 h", time_days: "-" },
  { id: 4, level: 4, price: 29, fc: 2, fb: 400, time_hours: "4 h", time_days: "-" },
  { id: 5, level: 5, price: 40, fc: 2, fb: 500, time_hours: "6 h", time_days: "-" },
  { id: 6, level: 6, price: 51, fc: 3, fb: 600, time_hours: "8 h", time_days: "-" },
  { id: 7, level: 7, price: 62, fc: 3, fb: 700, time_hours: "12 h", time_days: "-" },
  { id: 8, level: 8, price: 73, fc: 4, fb: 800, time_hours: "16 h", time_days: "-" },
  { id: 9, level: 9, price: 84, fc: 4, fb: 900, time_hours: "24 h", time_days: "1 day" },
  { id: 10, level: 10, price: 95, fc: 5, fb: 1000, time_hours: "48 h", time_days: "2 days" },
  { id: 11, level: 11, price: 106, fc: 5, fb: 1100, time_hours: "72 h", time_days: "3 days" },
  { id: 12, level: 12, price: 117, fc: 6, fb: 1200, time_hours: "96 h", time_days: "4 days" },
  { id: 13, level: 13, price: 128, fc: 6, fb: 1300, time_hours: "120 h", time_days: "5 days" },
  { id: 14, level: 14, price: 139, fc: 7, fb: 1400, time_hours: "144 h", time_days: "6 days" },
  { id: 15, level: 15, price: 150, fc: 7, fb: 1500, time_hours: "168 h", time_days: "7 days" },
  { id: 16, level: 16, price: 161, fc: 8, fb: 1600, time_hours: "192 h", time_days: "8 days" },
  { id: 17, level: 17, price: 172, fc: 8, fb: 1700, time_hours: "216 h", time_days: "9 days" },
  { id: 18, level: 18, price: 183, fc: 9, fb: 1800, time_hours: "264 h", time_days: "11 days" },
  { id: 19, level: 19, price: 194, fc: 9, fb: 1900, time_hours: "312 h", time_days: "13 days" },
  { id: 20, level: 20, price: 205, fc: 10, fb: 2000, time_hours: "360 h", time_days: "15 days" }
];

var GUIDE_LINE_DATA = [
  { id: 1, level: 1, price: 0, length_cm: 40, time_hours: "0 h", time_days: "-", colors: "White" },
  { id: 2, level: 2, price: 3, length_cm: 50, time_hours: "5 min", time_days: "-", colors: "White" },
  { id: 3, level: 3, price: 8, length_cm: 60, time_hours: "15 min", time_days: "-", colors: "White" },
  { id: 4, level: 4, price: 15, length_cm: 70, time_hours: "30 min", time_days: "-", colors: "White" },
  { id: 5, level: 5, price: 24, length_cm: 80, time_hours: "1 h", time_days: "-", colors: "White, blue" },
  { id: 6, level: 6, price: 35, length_cm: 90, time_hours: "2 h", time_days: "-", colors: "White, blue" },
  { id: 7, level: 7, price: 48, length_cm: 100, time_hours: "4 h", time_days: "-", colors: "White, blue" },
  { id: 8, level: 8, price: 63, length_cm: 125, time_hours: "6 h", time_days: "-", colors: "White, blue" },
  { id: 9, level: 9, price: 80, length_cm: 150, time_hours: "8 h", time_days: "-", colors: "White, blue, green" },
  { id: 10, level: 10, price: 99, length_cm: 175, time_hours: "12 h", time_days: "-", colors: "White, blue, green" },
  { id: 11, level: 11, price: 120, length_cm: 200, time_hours: "16 h", time_days: "-", colors: "White, blue, green" },
  { id: 12, level: 12, price: 143, length_cm: 250, time_hours: "24 h", time_days: "1 day", colors: "White, blue, green" },
  { id: 13, level: 13, price: 168, length_cm: 300, time_hours: "48 h", time_days: "2 days", colors: "White, blue, green, grey" },
  { id: 14, level: 14, price: 195, length_cm: 400, time_hours: "72 h", time_days: "3 days", colors: "White, blue, green, grey" },
  { id: 15, level: 15, price: 224, length_cm: 500, time_hours: "96 h", time_days: "4 days", colors: "White, blue, green, grey" },
  { id: 16, level: 16, price: 255, length_cm: 750, time_hours: "120 h", time_days: "5 days", colors: "White, blue, green, grey" },
  { id: 17, level: 17, price: 288, length_cm: 1000, time_hours: "144 h", time_days: "6 days", colors: "White, blue, green, grey, golden" },
  { id: 18, level: 18, price: 323, length_cm: 1250, time_hours: "168 h", time_days: "7 days", colors: "White, blue, green, grey, golden" },
  { id: 19, level: 19, price: 360, length_cm: 1500, time_hours: "192 h", time_days: "8 days", colors: "White, blue, green, grey, golden" },
  { id: 20, level: 20, price: 399, length_cm: 1750, time_hours: "216 h", time_days: "9 days", colors: "White, blue, green, grey, golden" }
];

var GUIDE_SHOP_DATA = {
  baits: [
    { id: 1, category: "hook", fc: 0, fb: -1, uses: -1, reqLvl: 0 },
    { id: 2, category: "vegetal", fc: 1, fb: 79, uses: 40, reqLvl: 7 },
    { id: 3, category: "dough", fc: 0, fb: -1, uses: 75, reqLvl: 1 },
    { id: 4, category: "insects", fc: 2, fb: -1, uses: 40, reqLvl: 4 },
    { id: 5, category: "fish", fc: 2, fb: -1, uses: 15, reqLvl: 5 },
    { id: 6, category: "vegetal", fc: 1, fb: 89, uses: 40, reqLvl: 9 },
    { id: 7, category: "vegetal", fc: 5, fb: -1, uses: 200, reqLvl: 3 },
    { id: 8, category: "insects", fc: 5, fb: -1, uses: 100, reqLvl: 6 },
    { id: 9, category: "insects", fc: 2, fb: -1, uses: 40, reqLvl: 2 },
    { id: 10, category: "insects", fc: 1, fb: 150, uses: 20, reqLvl: 1 },
    { id: 11, category: "meat", fc: 1, fb: -1, uses: 10, reqLvl: 50 },
    { id: 12, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 24 },
    { id: 13, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 12 },
    { id: 14, category: "lures", fc: 8, fb: -1, uses: 200, reqLvl: 54 },
    { id: 15, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 48 },
    { id: 16, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 15 },
    { id: 17, category: "lures", fc: 7, fb: -1, uses: 175, reqLvl: 60 },
    { id: 18, category: "lures", fc: 5, fb: -1, uses: 125, reqLvl: 57 },
    { id: 19, category: "lures", fc: 3, fb: -1, uses: 75, reqLvl: 27 },
    { id: 20, category: "lures", fc: 6, fb: -1, uses: 150, reqLvl: 63 },
    { id: 21, category: "lures", fc: 8, fb: -1, uses: 200, reqLvl: 51 },
    { id: 22, category: "lures", fc: 1, fb: 150, uses: 25, reqLvl: 33 },
    { id: 23, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 4 },
    { id: 24, category: "lures", fc: 8, fb: -1, uses: 200, reqLvl: 66 },
    { id: 25, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 30 },
    { id: 26, category: "lures", fc: 5, fb: -1, uses: 125, reqLvl: 1 },
    { id: 27, category: "lures", fc: 5, fb: -1, uses: 125, reqLvl: 45 },
    { id: 28, category: "lures", fc: 10, fb: -1, uses: 250, reqLvl: 9 },
    { id: 29, category: "lures", fc: 6, fb: -1, uses: 150, reqLvl: 78 },
    { id: 30, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 75 },
    { id: 31, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 87 },
    { id: 32, category: "lures", fc: 5, fb: -1, uses: 125, reqLvl: 81 },
    { id: 33, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 84 },
    { id: 34, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 18 },
    { id: 35, category: "lures", fc: 3, fb: -1, uses: 75, reqLvl: 39 },
    { id: 36, category: "lures", fc: 3, fb: -1, uses: 75, reqLvl: 16 },
    { id: 37, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 21 },
    { id: 38, category: "lures", fc: 3, fb: -1, uses: 75, reqLvl: 42 },
    { id: 39, category: "lures", fc: 8, fb: -1, uses: 200, reqLvl: 58 },
    { id: 40, category: "lures", fc: 10, fb: -1, uses: 500, reqLvl: 72 },
    { id: 41, category: "lures", fc: 2, fb: -1, uses: 50, reqLvl: 69 },
    { id: 42, category: "lures", fc: 4, fb: -1, uses: 100, reqLvl: 36 },
    { id: 43, category: "lures", fc: 20, fb: -1, uses: 500, reqLvl: 90 },
    { id: 44, category: "shark", fc: 5, fb: -1, uses: 25, reqLvl: 29 },
    { id: 45, category: "prehistoric", fc: 5, fb: -1, uses: 25, reqLvl: 0 },
    { id: 46, category: "pelican", fc: 199, fb: -1, uses: -1, reqLvl: 0, reqPirateCave: true },
    { id: 47, category: "monkfish", fc: 49, fb: -1, uses: -1, reqLvl: 0, reqPirateCave: true },
    { id: 48, category: "star", fc: 129, fb: -1, uses: -1, reqLvl: 0, reqPirateCave: true },
    { id: 49, category: "tuna", fc: -1, fb: -1, uses: 20, reqLvl: 0 },
    { id: 50, category: "marlin", fc: -1, fb: -1, uses: 20, reqLvl: 0 },
    { id: 51, category: "barracuda", fc: -1, fb: -1, uses: 20, reqLvl: 0 },
    { id: 52, category: "monster", fc: -1, fb: -1, uses: 20, reqLvl: 0 }
  ],
  rods: [
    { id: 1, length: 65, power: 40, uses: -1, fc: 0, fb: -1, reqLvl: 1, colors: null, inShop: false },
    { id: 2, length: 65, power: 60, uses: 100, fc: 1, fb: 99, reqLvl: 1, colors: "brown,black,gray,beige,darkgreen,darkblue,red", inShop: true },
    { id: 3, length: 105, power: 100, uses: 100, fc: 5, fb: 500, reqLvl: 2, colors: "brown,black,gray,beige,darkgreen,darkblue,red", inShop: true },
    { id: 4, length: 85, power: 200, uses: 150, fc: 12, fb: -1, reqLvl: 10, colors: "brown,black,gray,beige,darkgreen,darkblue,red", inShop: true },
    { id: 5, length: 85, power: 150, uses: 200, fc: 12, fb: -1, reqLvl: 8, colors: "brown,black,gray,beige,darkgreen,darkblue,red", inShop: true },
    { id: 6, length: 65, power: 250, uses: 125, fc: 15, fb: -1, reqLvl: 25, colors: null, inShop: true },
    { id: 7, length: 85, power: 350, uses: 250, fc: 30, fb: -1, reqLvl: 50, colors: null, inShop: true },
    { id: 8, length: 105, power: 450, uses: 375, fc: 45, fb: -1, reqLvl: 75, colors: null, inShop: true },
    { id: 9, length: 105, power: 650, uses: 1000, fc: 199, fb: -1, reqLvl: 7, colors: null, inShop: true },
    { id: 10, length: 105, power: 1000, uses: -1, fc: 1500, fb: -1, reqLvl: 15, colors: null, inShop: true },
    { id: 11, length: 65, power: 300, uses: 150, fc: 18, fb: -1, reqLvl: 4, colors: null, inShop: true },
    { id: 12, length: 105, power: 450, uses: 500, fc: 75, fb: -1, reqLvl: 1, colors: null, inShop: true },
    { id: 13, length: 85, power: 400, uses: 50, fc: 10, fb: -1, reqLvl: 1, colors: null, inShop: false },
    { id: 14, length: 105, power: 1200, uses: 10000, fc: 999, fb: -1, reqLvl: 22, colors: null, inShop: true },
    { id: 15, length: 85, power: 175, uses: 1000, fc: 79, fb: -1, reqLvl: 13, colors: null, inShop: true },
    { id: 16, length: 105, power: 1250, uses: 20000, fc: 1400, fb: -1, reqLvl: 200, colors: null, inShop: true }
  ],
  bobbers: [
    { id: 6, fc: 99, fb: -1 },
    { id: 7, fc: 25, fb: -1 },
    { id: 8, fc: 495, fb: -1 },
    { id: 9, fc: 12, fb: 990 }
  ],
  resources: [
    { id: 7, typeId: 8, param: { duration_min: 7, desc_type: 1 }, fc: 2, fb: -1, reqLvl: 0 },
    { id: 8, typeId: 8, param: { duration_min: 15, desc_type: 2 }, fc: 5, fb: -1, reqLvl: 0 },
    { id: 9, typeId: 9, param: { duration_min: 15, percent: 50 }, fc: 4, fb: -1, reqLvl: 0 },
    { id: 10, typeId: 10, param: { accuracy: 1, duration_min: 5 }, fc: 1, fb: 100, reqLvl: 2 },
    { id: 11, typeId: 10, param: { accuracy: 2, duration_min: 10 }, fc: 4, fb: -1, reqLvl: 8 },
    { id: 12, typeId: 10, param: { accuracy: 3, duration_min: 15 }, fc: 5, fb: -1, reqLvl: 13 },
    { id: 13, typeId: 15, param: { duration_min: 10, exp_multiple: 2 }, fc: 5, fb: -1, reqLvl: 0 },
    { id: 14, typeId: 15, param: { duration_min: 15, exp_multiple: 4 }, fc: 12, fb: -1, reqLvl: 0 },
    { id: 15, typeId: 18, param: { duration_min: 15, chance_multiply: 2 }, fc: 3, fb: -1, reqLvl: 0 },
    { id: 16, typeId: 18, param: { duration_min: 15, chance_multiply: 4 }, fc: 5, fb: -1, reqLvl: 0 },
    { id: 17, typeId: 23, param: { duration_min: 10, power_multiply: 1.25 }, fc: 7, fb: -1, reqLvl: 0 },
    { id: 18, typeId: 23, param: { duration_min: 15, power_multiply: 1.5 }, fc: 12, fb: -1, reqLvl: 0 }
  ]
};

if (typeof window !== 'undefined') {
  window.FISHAO_GUIDE_DATA = {
    tree: GUIDE_TREE_DATA,
    line: GUIDE_LINE_DATA,
    shop: GUIDE_SHOP_DATA
  };
}

var currentGuideSubTab = 'tree'; // 'tree' | 'line' | 'shop'
var guideShopCategory = 'baits'; // 'baits' | 'rods' | 'bobbers' | 'resources'
var guideShopSearchQuery = '';
var guideShopFbOnly = false;
var guideShopBaitCategoryFilter = '';
var guideShopBestValueOnly = false;
var guideTreeFromLevel = 1;
var guideTreeToLevel = 20;
var guideLineFromLevel = 1;
var guideLineToLevel = 20;
var _guideCloudSyncAttempted = false;

function sanitizeGuideLevel(val) {
  var num = parseInt(val, 10);
  return (isFinite(num) && num >= 1 && num <= 20) ? num : null;
}

(function restoreGuideCalcState() {
  var tf = sanitizeGuideLevel(safeStorageGet('fishao_guide_tree_from'));
  var tt = sanitizeGuideLevel(safeStorageGet('fishao_guide_tree_to'));
  var lf = sanitizeGuideLevel(safeStorageGet('fishao_guide_line_from'));
  var lt = sanitizeGuideLevel(safeStorageGet('fishao_guide_line_to'));

  if (tf !== null) guideTreeFromLevel = tf;
  if (guideTreeFromLevel === 20) {
    guideTreeToLevel = 20;
  } else if (tt !== null && tt > guideTreeFromLevel) {
    guideTreeToLevel = tt;
  } else if (guideTreeToLevel <= guideTreeFromLevel) {
    guideTreeToLevel = 20;
  }

  if (lf !== null) guideLineFromLevel = lf;
  if (guideLineFromLevel === 20) {
    guideLineToLevel = 20;
  } else if (lt !== null && lt > guideLineFromLevel) {
    guideLineToLevel = lt;
  } else if (guideLineToLevel <= guideLineFromLevel) {
    guideLineToLevel = 20;
  }
})();

function parseUpgradeHours(timeHoursStr) {
  var raw = String(timeHoursStr || '').trim().toLowerCase();
  if (!raw) return 0;
  var minMatch = /^([\d.,]+)\s*min/.exec(raw);
  if (minMatch) {
    var mins = parseFloat(minMatch[1].replace(',', '.'));
    return isFinite(mins) ? (mins / 60) : 0;
  }
  var hourMatch = /^([\d.,]+)\s*h/.exec(raw);
  if (hourMatch) {
    var hrs = parseFloat(hourMatch[1].replace(',', '.'));
    return isFinite(hrs) ? hrs : 0;
  }
  return 0;
}

function formatGuideInt(n) {
  var val = Math.round(Number(n) || 0);
  try {
    return val.toLocaleString(getLocale());
  } catch (e) {
    return String(val);
  }
}

function formatGuideDecimal(num, maxDecimals) {
  var dec = typeof maxDecimals === 'number' ? maxDecimals : 1;
  var rounded = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  try {
    return rounded.toLocaleString(getLocale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: dec
    });
  } catch (e) {
    return String(rounded);
  }
}

function formatUpgradeDuration(hours, compact) {
  var totalMins = Math.round((Number(hours) || 0) * 60);
  if (totalMins <= 0) {
    return '0 ' + t('guide_unit_hour_short');
  }
  var wholeHours = Math.floor(totalMins / 60);
  var remMins = totalMins % 60;
  var primary = '';

  if (wholeHours === 0) {
    primary = remMins + ' ' + t('guide_unit_min_short');
  } else if (remMins === 0) {
    primary = formatGuideInt(wholeHours) + ' ' + t('guide_unit_hour_short');
  } else {
    primary = formatGuideInt(wholeHours) + ' ' + t('guide_unit_hour_short') + ' ' + remMins + ' ' + t('guide_unit_min_short');
  }

  if (totalMins >= 24 * 60) {
    var exactDays = totalMins / (24 * 60);
    var isWholeDays = Math.abs(exactDays - Math.round(exactDays)) < 0.05;
    var daysStr = isWholeDays ? formatGuideInt(Math.round(exactDays)) : formatGuideDecimal(exactDays, 1);
    var pluralDaysCount = isWholeDays ? Math.round(exactDays) : exactDays;
    var daysWord = t('guide_days_count', { count: pluralDaysCount, days: daysStr });
    if (compact) {
      return primary + ' <span class="guide-duration-days">(' + escapeHtml(daysWord) + ')</span>';
    }
    return primary + ' (~' + daysWord + ')';
  }
  return primary;
}

function formatPaybackDays(costFc, dailyFc) {
  var cost = Number(costFc) || 0;
  var daily = Number(dailyFc) || 0;
  if (cost <= 0 || daily <= 0) {
    return {
      exactDays: 0,
      ceilHarvests: 0,
      exactText: '—',
      harvestsText: ''
    };
  }
  var exact = cost / daily;
  var ceilHarvests = Math.ceil(exact - 1e-9);
  var isWhole = Math.abs(exact - Math.round(exact)) < 0.01;
  var daysFormatted = isWhole ? formatGuideInt(Math.round(exact)) : formatGuideDecimal(exact, 1);
  var pluralKeyCount = isWhole ? Math.round(exact) : exact;

  return {
    exactDays: exact,
    ceilHarvests: ceilHarvests,
    exactText: t('guide_days_count', { count: pluralKeyCount, days: daysFormatted }),
    harvestsText: t('guide_harvests_count', { count: ceilHarvests, n: formatGuideInt(ceilHarvests) })
  };
}

function renderLineColorBadges(colorsStr) {
  var items = String(colorsStr || '').split(',').map(function (s) {
    return s.trim().toLowerCase();
  }).filter(Boolean);

  var colorMeta = {
    white: { key: 'guide_color_white', cls: 'color-white' },
    blue: { key: 'guide_color_blue', cls: 'color-blue' },
    green: { key: 'guide_color_green', cls: 'color-green' },
    grey: { key: 'guide_color_grey', cls: 'color-grey' },
    golden: { key: 'guide_color_golden', cls: 'color-golden' }
  };

  return '<div class="line-colors-list">' + items.map(function (c) {
    var meta = colorMeta[c] || { key: c, cls: 'color-white' };
    var label = t(meta.key);
    return '<span class="line-color-chip ' + meta.cls + '">' +
      '<span class="line-color-dot" aria-hidden="true"></span>' +
      '<span>' + escapeHtml(label) + '</span>' +
      '</span>';
  }).join('') + '</div>';
}

function getGuideDataList(type) {
  return type === 'line' ? GUIDE_LINE_DATA : GUIDE_TREE_DATA;
}

function getGuideRangeState(type) {
  if (type === 'line') {
    return { from: guideLineFromLevel, to: guideLineToLevel };
  }
  return { from: guideTreeFromLevel, to: guideTreeToLevel };
}

function setGuideRangeState(type, fromLvl, toLvl) {
  var f = Math.max(1, Math.min(20, parseInt(fromLvl, 10) || 1));
  var to = (f === 20) ? 20 : Math.max(f + 1, Math.min(20, parseInt(toLvl, 10) || 20));
  if (type === 'line') {
    guideLineFromLevel = f;
    guideLineToLevel = to;
    safeStorageSet('fishao_guide_line_from', String(f));
    safeStorageSet('fishao_guide_line_to', String(to));
  } else {
    guideTreeFromLevel = f;
    guideTreeToLevel = to;
    safeStorageSet('fishao_guide_tree_from', String(f));
    safeStorageSet('fishao_guide_tree_to', String(to));
  }
}

async function persistGuideCurrentLevel(type, level) {
  var lvl = sanitizeGuideLevel(level);
  if (lvl === null) return;
  var storageKey = (type === 'line') ? 'fishao_guide_line_from' : 'fishao_guide_tree_from';
  var savedFlagKey = (type === 'line') ? 'fishao_guide_line_saved' : 'fishao_guide_tree_saved';
  safeStorageSet(storageKey, String(lvl));
  safeStorageSet(savedFlagKey, '1');

  if (typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db && typeof savePrivateUserSettings === 'function') {
    try {
      var payload = (type === 'line') ? { lineLevel: lvl } : { treeLevel: lvl };
      await savePrivateUserSettings(payload);
      if (typeof saveProfileToCache === 'function' && typeof userProfile !== 'undefined' && userProfile) {
        saveProfileToCache(currentUser.uid, userProfile, {
          treeLevel: safeStorageGet('fishao_guide_tree_saved') === '1' ? guideTreeFromLevel : null,
          lineLevel: safeStorageGet('fishao_guide_line_saved') === '1' ? guideLineFromLevel : null
        });
      }
      if (typeof showToast === 'function') {
        showToast(t('guide_level_saved_cloud', { level: lvl }), 'success');
      }
    } catch (err) {
      console.warn('Could not save guide level to Firestore:', err);
      if (typeof showToast === 'function') {
        showToast(t('guide_level_saved_local', { level: lvl }), 'info');
      }
    }
  } else if (typeof showToast === 'function') {
    showToast(t('guide_level_saved_local', { level: lvl }), 'info');
  }
}

function syncGuideLevelsFromProfile(privData, skipMigrate) {
  var changed = false;
  var toUpload = {};
  var hasUpload = false;

  if (privData && typeof privData === 'object') {
    var cloudTree = sanitizeGuideLevel(privData.treeLevel);
    var cloudLine = sanitizeGuideLevel(privData.lineLevel);

    if (cloudTree !== null) {
      if (guideTreeFromLevel !== cloudTree) {
        setGuideRangeState('tree', cloudTree, cloudTree === 20 ? 20 : Math.max(cloudTree + 1, guideTreeToLevel));
        changed = true;
      }
      safeStorageSet('fishao_guide_tree_saved', '1');
    } else if (!skipMigrate && safeStorageGet('fishao_guide_tree_saved') === '1') {
      toUpload.treeLevel = guideTreeFromLevel;
      hasUpload = true;
    }

    if (cloudLine !== null) {
      if (guideLineFromLevel !== cloudLine) {
        setGuideRangeState('line', cloudLine, cloudLine === 20 ? 20 : Math.max(cloudLine + 1, guideLineToLevel));
        changed = true;
      }
      safeStorageSet('fishao_guide_line_saved', '1');
    } else if (!skipMigrate && safeStorageGet('fishao_guide_line_saved') === '1') {
      toUpload.lineLevel = guideLineFromLevel;
      hasUpload = true;
    }
  }

  if (hasUpload && !_guideCloudSyncAttempted && typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db && typeof savePrivateUserSettings === 'function') {
    _guideCloudSyncAttempted = true;
    savePrivateUserSettings(toUpload).catch(function (err) {
      console.warn('Could not migrate guide levels to Firestore:', err);
    });
  }

  if (changed && typeof currentView !== 'undefined' && (currentView === 'guide_tree' || currentView === 'guide_line')) {
    renderGuideView(currentView === 'guide_line' ? 'line' : 'tree');
  }
}

function onGuideCalcChange(type, bound, val) {
  var st = getGuideRangeState(type);
  var num = parseInt(val, 10);
  if (isNaN(num)) return;
  if (bound === 'from') {
    var nextFrom = Math.max(1, Math.min(20, num));
    var nextTo = (nextFrom === 20) ? 20 : (st.to <= nextFrom ? Math.min(20, nextFrom + 1) : st.to);
    setGuideRangeState(type, nextFrom, nextTo);
    renderGuideView(type);
    persistGuideCurrentLevel(type, nextFrom);
  } else {
    var targetTo = (st.from === 20) ? 20 : Math.max(st.from + 1, Math.min(20, num));
    setGuideRangeState(type, st.from, targetTo);
    renderGuideView(type);
  }
}

function onGuideRowClick(type, clickedLevel) {
  var lvl = parseInt(clickedLevel, 10);
  if (isNaN(lvl) || lvl < 1 || lvl > 20) return;
  var st = getGuideRangeState(type);
  if (lvl > st.from) {
    setGuideRangeState(type, st.from, lvl);
    renderGuideView(type);
  }
}

function computeGuideTotals(type) {
  var data = getGuideDataList(type);
  var cumPrice = 0;
  var cumHours = 0;
  var rows = data.map(function (item, idx) {
    var hrs = parseUpgradeHours(item.time_hours);
    cumPrice += item.price;
    cumHours += hrs;
    var prev = idx > 0 ? data[idx - 1] : null;
    return {
      item: item,
      prev: prev,
      hours: hrs,
      cumPrice: cumPrice,
      cumHours: cumHours
    };
  });
  return {
    rows: rows,
    totalPrice: cumPrice,
    totalHours: cumHours
  };
}

function renderGuideBanner(type, totals) {
  var titleEl = document.getElementById('guideBannerTitle');
  var statsEl = document.getElementById('guideBannerStats');
  var lastRow = totals.rows[totals.rows.length - 1];

  if (titleEl) {
    titleEl.textContent = type === 'line'
      ? t('guide_banner_title_line')
      : t('guide_banner_title_tree');
  }

  if (statsEl) {
    if (type === 'line') {
      statsEl.innerHTML =
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_max_level')) + ': <strong style="color:#fbbf24;">Lvl 20</strong></span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_max_length')) + ': <strong style="color:#38bdf8;">' + formatGuideInt(lastRow.item.length_cm) + ' cm</strong></span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_total_cost')) + ': <strong style="color:#fbbf24;">🪙 ' + formatGuideInt(totals.totalPrice) + ' FC</strong></span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_total_time')) + ': <strong style="color:#cbd5e1;">' + escapeHtml(formatUpgradeDuration(totals.totalHours, false)) + '</strong></span>';
    } else {
      statsEl.innerHTML =
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_max_level')) + ': <strong style="color:#34d399;">Lvl 20</strong></span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_max_yield')) + ': <strong style="color:#fbbf24;">🪙 ' + lastRow.item.fc + ' FC</strong> + <strong style="color:#34d399;">' + formatGuideInt(lastRow.item.fb) + ' FB</strong> / ' + escapeHtml(t('guide_per_day_short')) + '</span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_total_cost')) + ': <strong style="color:#fbbf24;">🪙 ' + formatGuideInt(totals.totalPrice) + ' FC</strong></span>' +
        '<span class="stat-chip">' + escapeHtml(t('guide_stat_total_time')) + ': <strong style="color:#cbd5e1;">' + escapeHtml(formatUpgradeDuration(totals.totalHours, false)) + '</strong></span>';
    }
  }

  var bannerEl = document.getElementById('bannerGuide');
  if (bannerEl) {
    bannerEl.style.display = '';
    bannerEl.classList.remove('cyan');
    bannerEl.classList.toggle('green', type === 'tree');
    bannerEl.classList.toggle('gold', type === 'line');
  }
}

function renderGuideCalculator(type, totals) {
  var box = document.getElementById('guideCalcBox');
  if (!box) return;

  var st = getGuideRangeState(type);
  var rows = totals.rows;
  var fromRow = rows[st.from - 1];
  var toRow = rows[st.to - 1];

  var rangeCost = 0;
  var rangeHours = 0;
  for (var i = st.from; i < st.to; i++) {
    rangeCost += rows[i].item.price;
    rangeHours += rows[i].hours;
  }

  var pctOfTotal = totals.totalPrice > 0 ? Math.round((rangeCost / totals.totalPrice) * 100) : 0;

  var fromOpts = '';
  for (var l1 = 1; l1 <= 20; l1++) {
    var sel1 = l1 === st.from ? ' selected' : '';
    fromOpts += '<option value="' + l1 + '"' + sel1 + '>Lvl ' + l1 + (type === 'tree'
      ? (' (🪙 ' + rows[l1 - 1].item.fc + ' FC / ' + formatGuideInt(rows[l1 - 1].item.fb) + ' FB)')
      : (' (' + formatGuideInt(rows[l1 - 1].item.length_cm) + ' cm)')) + '</option>';
  }

  var toOpts = '';
  var minTarget = (st.from === 20) ? 20 : (st.from + 1);
  for (var l2 = minTarget; l2 <= 20; l2++) {
    var sel2 = l2 === st.to ? ' selected' : '';
    toOpts += '<option value="' + l2 + '"' + sel2 + '>Lvl ' + l2 + (type === 'tree'
      ? (' (🪙 ' + rows[l2 - 1].item.fc + ' FC / ' + formatGuideInt(rows[l2 - 1].item.fb) + ' FB)')
      : (' (' + formatGuideInt(rows[l2 - 1].item.length_cm) + ' cm)')) + '</option>';
  }

  var isMaxFrom = (st.from === 20);
  var isSignedIn = (typeof currentUser !== 'undefined' && !!currentUser);
  var syncHintText = isSignedIn ? t('guide_sync_cloud') : t('guide_sync_local');

  var statsCardsHtml = '';
  if (type === 'tree') {
    var deltaFc = toRow.item.fc - fromRow.item.fc;
    var deltaFb = toRow.item.fb - fromRow.item.fb;
    var totalYieldPayback = formatPaybackDays(rangeCost, toRow.item.fc);
    var deltaPayback = deltaFc > 0 ? formatPaybackDays(rangeCost, deltaFc) : null;

    var roiValHtml;
    var roiSubHtml;
    if (isMaxFrom) {
      roiValHtml = escapeHtml(t('guide_max_level_reached'));
      roiSubHtml = escapeHtml(toRow.item.fc + ' FC + ' + formatGuideInt(toRow.item.fb) + ' FB / ' + t('guide_per_day_short'));
    } else {
      var roiSubText = deltaPayback
        ? t('guide_calc_roi_delta_sub', {
            days: deltaPayback.exactText,
            delta: deltaFc
          })
        : t('guide_calc_roi_same_fc_sub', {
            harvests: totalYieldPayback.harvestsText
          });
      roiValHtml = escapeHtml(totalYieldPayback.exactText);
      roiSubHtml = escapeHtml(totalYieldPayback.harvestsText) + ' • ' + escapeHtml(roiSubText);
    }

    statsCardsHtml =
      '<div class="guide-stat-card accent-fc">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_cost_label', { from: st.from, to: st.to })) + '</div>' +
        '<div class="guide-stat-val">🪙 ' + formatGuideInt(rangeCost) + ' FC</div>' +
        '<div class="guide-stat-sub">' + escapeHtml(t('guide_calc_cost_share', { pct: pctOfTotal, total: '🪙 ' + formatGuideInt(totals.totalPrice) })) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-time">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_time_label')) + '</div>' +
        '<div class="guide-stat-val">' + escapeHtml(formatUpgradeDuration(rangeHours, false)) + '</div>' +
        '<div class="guide-stat-sub">' + escapeHtml(t('guide_calc_steps_count', { count: st.to - st.from })) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-fb">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_new_yield', { to: st.to })) + '</div>' +
        '<div class="guide-stat-val">🪙 ' + toRow.item.fc + ' FC + ' + formatGuideInt(toRow.item.fb) + ' FB</div>' +
        '<div class="guide-stat-sub">🪙 +' + deltaFc + ' FC / +' + formatGuideInt(deltaFb) + ' FB ' + escapeHtml(t('guide_per_day_short')) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-roi">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_roi_label')) + '</div>' +
        '<div class="guide-stat-val">' + roiValHtml + '</div>' +
        '<div class="guide-stat-sub">' + roiSubHtml + '</div>' +
      '</div>';
  } else {
    var deltaCm = toRow.item.length_cm - fromRow.item.length_cm;
    statsCardsHtml =
      '<div class="guide-stat-card accent-fc">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_cost_label', { from: st.from, to: st.to })) + '</div>' +
        '<div class="guide-stat-val">🪙 ' + formatGuideInt(rangeCost) + ' FC</div>' +
        '<div class="guide-stat-sub">' + escapeHtml(t('guide_calc_cost_share', { pct: pctOfTotal, total: '🪙 ' + formatGuideInt(totals.totalPrice) })) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-time">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_time_label')) + '</div>' +
        '<div class="guide-stat-val">' + escapeHtml(formatUpgradeDuration(rangeHours, false)) + '</div>' +
        '<div class="guide-stat-sub">' + escapeHtml(t('guide_calc_steps_count', { count: st.to - st.from })) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-line">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_line_len', { to: st.to })) + '</div>' +
        '<div class="guide-stat-val">' + formatGuideInt(toRow.item.length_cm) + ' cm</div>' +
        '<div class="guide-stat-sub">+' + formatGuideInt(deltaCm) + ' cm ' + escapeHtml(t('guide_calc_vs_lvl', { from: st.from })) + '</div>' +
      '</div>' +
      '<div class="guide-stat-card accent-colors">' +
        '<div class="guide-stat-label">' + escapeHtml(t('guide_calc_line_colors', { to: st.to })) + '</div>' +
        '<div class="guide-stat-colors">' + renderLineColorBadges(toRow.item.colors) + '</div>' +
      '</div>';
  }

  box.innerHTML =
    '<div class="guide-calc-header">' +
      '<div class="guide-calc-title-wrap">' +
        '<h3 class="guide-calc-title">' + escapeHtml(t(type === 'tree' ? 'guide_calc_title_tree' : 'guide_calc_title_line')) + '</h3>' +
        '<p class="guide-calc-desc">' + escapeHtml(t(type === 'tree' ? 'guide_calc_desc_tree' : 'guide_calc_desc_line')) + '</p>' +
      '</div>' +
      '<div class="guide-calc-controls">' +
        '<div class="guide-calc-field">' +
          '<label for="guideFromSelect">' + escapeHtml(t('guide_calc_from_label')) + '</label>' +
          '<select id="guideFromSelect" class="filter-control" onchange="window.fishaoApp.onGuideCalcChange(\'' + type + '\', \'from\', this.value)">' + fromOpts + '</select>' +
        '</div>' +
        '<span class="guide-calc-arrow" aria-hidden="true">→</span>' +
        '<div class="guide-calc-field">' +
          '<label for="guideToSelect">' + escapeHtml(t('guide_calc_to_label')) + '</label>' +
          '<select id="guideToSelect" class="filter-control"' + (isMaxFrom ? ' disabled' : '') + ' onchange="window.fishaoApp.onGuideCalcChange(\'' + type + '\', \'to\', this.value)">' + toOpts + '</select>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="guide-sync-row">' +
      '<span class="guide-sync-badge' + (isSignedIn ? ' is-cloud' : '') + '">' + escapeHtml(syncHintText) + '</span>' +
    '</div>' +
    '<div class="guide-stats-grid">' + statsCardsHtml + '</div>';
}

function renderGuideTable(type, totals) {
  var thead = document.getElementById('guideTableHead');
  var tbody = document.getElementById('guideTableBody');
  var hintEl = document.getElementById('guideTableHint');
  if (!thead || !tbody) return;

  var st = getGuideRangeState(type);

  if (hintEl) {
    hintEl.textContent = t('guide_table_hint');
  }

  if (type === 'tree') {
    thead.innerHTML =
      '<tr>' +
        '<th>' + escapeHtml(t('guide_col_level')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_price_fc')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_cum_price')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_daily_fc')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_daily_fb')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_upgrade_time')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_payback')) + '</th>' +
      '</tr>';

    tbody.innerHTML = totals.rows.map(function (row) {
      var item = row.item;
      var prev = row.prev;
      var isCurrent = (item.level === st.from);
      var isInRange = (item.level > st.from && item.level <= st.to);
      var isTarget = (item.level === st.to);
      var rowCls = isCurrent ? 'guide-row-current' : (isInRange ? ('guide-row-in-range' + (isTarget ? ' guide-row-target' : '')) : '');

      var lvlTag = isCurrent
        ? '<span class="guide-lvl-tag current">' + escapeHtml(t('guide_tag_current')) + '</span>'
        : (isTarget ? '<span class="guide-lvl-tag target">' + escapeHtml(t('guide_tag_target')) + '</span>' : '');

      var priceHtml = item.price === 0
        ? '<span class="guide-base-badge">' + escapeHtml(t('guide_base_free')) + '</span>'
        : '<span class="guide-fc-badge">🪙 ' + formatGuideInt(item.price) + ' FC</span>';

      var fcBump = (prev && item.fc > prev.fc)
        ? ' <span class="guide-step-up-badge">🪙 +' + (item.fc - prev.fc) + ' FC</span>'
        : '';

      var timeHtml = item.level === 1
        ? '<span class="guide-muted-dash">—</span>'
        : '<div>' + formatUpgradeDuration(row.hours, true) + '</div>' +
          '<div class="guide-sub-meta">' + escapeHtml(t('guide_cum_short')) + ': ' + escapeHtml(formatUpgradeDuration(row.cumHours, false)) + '</div>';

      var paybackHtml;
      if (item.level === 1 || item.price === 0 || item.fc <= 0) {
        paybackHtml = '<span class="guide-muted-dash">—</span>';
      } else {
        var singleRoi = formatPaybackDays(item.price, item.fc);
        var cumRoi = formatPaybackDays(row.cumPrice, item.fc);
        paybackHtml =
          '<div class="guide-roi-primary">' + escapeHtml(singleRoi.exactText) + ' <span class="guide-roi-harvests">(' + escapeHtml(singleRoi.harvestsText) + ')</span></div>' +
          '<div class="guide-roi-sub">' + escapeHtml(t('guide_roi_from_lvl1', { days: cumRoi.exactText })) + '</div>';
      }

      return '<tr class="' + rowCls + '" onclick="window.fishaoApp.onGuideRowClick(\'tree\', ' + item.level + ')" title="' + escapeHtml(t('guide_row_click_title', { level: item.level })) + '">' +
        '<td><div class="guide-lvl-cell"><strong>Lvl ' + item.level + '</strong>' + lvlTag + '</div></td>' +
        '<td>' + priceHtml + '</td>' +
        '<td><span class="guide-cum-val">🪙 ' + formatGuideInt(row.cumPrice) + ' FC</span></td>' +
        '<td><span class="guide-yield-fc">🪙 ' + item.fc + ' FC</span>' + fcBump + '</td>' +
        '<td><span class="guide-yield-fb">' + formatGuideInt(item.fb) + ' FB</span></td>' +
        '<td>' + timeHtml + '</td>' +
        '<td>' + paybackHtml + '</td>' +
      '</tr>';
    }).join('');
  } else {
    thead.innerHTML =
      '<tr>' +
        '<th>' + escapeHtml(t('guide_col_level')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_price_fc')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_cum_price')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_max_length')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_upgrade_time')) + '</th>' +
        '<th>' + escapeHtml(t('guide_col_colors')) + '</th>' +
      '</tr>';

    tbody.innerHTML = totals.rows.map(function (row) {
      var item = row.item;
      var prev = row.prev;
      var isCurrent = (item.level === st.from);
      var isInRange = (item.level > st.from && item.level <= st.to);
      var isTarget = (item.level === st.to);
      var rowCls = isCurrent ? 'guide-row-current' : (isInRange ? ('guide-row-in-range' + (isTarget ? ' guide-row-target' : '')) : '');

      var lvlTag = isCurrent
        ? '<span class="guide-lvl-tag current">' + escapeHtml(t('guide_tag_current')) + '</span>'
        : (isTarget ? '<span class="guide-lvl-tag target">' + escapeHtml(t('guide_tag_target')) + '</span>' : '');

      var priceHtml = item.price === 0
        ? '<span class="guide-base-badge">' + escapeHtml(t('guide_base_free')) + '</span>'
        : '<span class="guide-fc-badge">🪙 ' + formatGuideInt(item.price) + ' FC</span>';

      var lenDelta = prev ? (item.length_cm - prev.length_cm) : 0;
      var lenDeltaHtml = lenDelta > 0
        ? ' <span class="guide-len-delta">+' + formatGuideInt(lenDelta) + ' cm</span>'
        : '';

      var timeHtml = item.level === 1
        ? '<span class="guide-muted-dash">—</span>'
        : '<div>' + formatUpgradeDuration(row.hours, true) + '</div>' +
          '<div class="guide-sub-meta">' + escapeHtml(t('guide_cum_short')) + ': ' + escapeHtml(formatUpgradeDuration(row.cumHours, false)) + '</div>';

      return '<tr class="' + rowCls + '" onclick="window.fishaoApp.onGuideRowClick(\'line\', ' + item.level + ')" title="' + escapeHtml(t('guide_row_click_title', { level: item.level })) + '">' +
        '<td><div class="guide-lvl-cell"><strong>Lvl ' + item.level + '</strong>' + lvlTag + '</div></td>' +
        '<td>' + priceHtml + '</td>' +
        '<td><span class="guide-cum-val">🪙 ' + formatGuideInt(row.cumPrice) + ' FC</span></td>' +
        '<td><strong class="guide-line-len">' + formatGuideInt(item.length_cm) + ' cm</strong>' + lenDeltaHtml + '</td>' +
        '<td>' + timeHtml + '</td>' +
        '<td>' + renderLineColorBadges(item.colors) + '</td>' +
      '</tr>';
    }).join('');
  }
}

function getShopItemTextSafe(key, fallback) {
  if (window.FISHAO_I18N && typeof window.FISHAO_I18N.getShopItemText === 'function') {
    var txt = window.FISHAO_I18N.getShopItemText(key);
    if (txt) return txt;
  }
  return fallback || key;
}

function renderShopItemImage(kind, id, altText) {
  var localSrc = '/images/shop_' + kind + '_' + id + '.webp';
  var remoteMap = {
    bait: 'https://play.fishao.net/data/image/baits/bait_56x56_' + id + '.png',
    rod: 'https://play.fishao.net/data/image/rods/rod_128x128_' + id + '.png',
    float: 'https://play.fishao.net/data/image/floats/float_56x56_' + id + '.png',
    resource: 'https://play.fishao.net/data/image/resources/resource_128x128_' + id + '.png'
  };
  var fallbackSrc = remoteMap[kind] || '';
  var boxCls = (kind === 'rod') ? 'shop-img-box is-rod' : 'shop-img-box';
  return '<div class="' + boxCls + '">' +
    '<img src="' + escapeHtml(localSrc) + '" alt="' + escapeHtml(altText) + '" class="shop-img" loading="lazy" decoding="async" ' +
    'data-fb="' + escapeHtml(fallbackSrc) + '" ' +
    'onerror="if(!this.dataset.triedFb&&this.dataset.fb){this.dataset.triedFb=1;this.src=this.dataset.fb;}else{this.style.display=\'none\';}">' +
  '</div>';
}

function formatShopPriceFcHtml(fcVal) {
  var fc = Number(fcVal);
  if (!isFinite(fc) || fc < 0) {
    return '<span class="shop-not-buyable-badge">' + escapeHtml(t('guide_shop_not_buyable')) + '</span>';
  }
  if (fc === 0) return '<span class="shop-free-badge">' + escapeHtml(t('guide_shop_free')) + '</span>';
  return '<span class="guide-fc-badge">🪙 ' + formatGuideInt(fc) + ' FC</span>';
}

function formatShopPriceFbHtml(fbVal) {
  var fb = Number(fbVal);
  if (!isFinite(fb) || fb <= 0) return '<span class="guide-muted-dash">—</span>';
  return '<span class="shop-fb-badge">' + formatGuideInt(fb) + ' FB</span>';
}

function formatShopUsesHtml(usesVal, itemForEff) {
  var u = Number(usesVal);
  var mainChip;
  if (u === -1) mainChip = '<span class="shop-param-chip">' + escapeHtml(t('guide_shop_unlimited')) + '</span>';
  else if (!isFinite(u) || u <= 0) mainChip = '<span class="guide-muted-dash">—</span>';
  else mainChip = '<span class="shop-param-chip">' + formatGuideInt(u) + '×</span>';

  if (itemForEff && itemForEff.fc > 0 && u > 0) {
    var perFcStr = formatGuideDecimal(u / itemForEff.fc, 1);
    var subTxt = t('guide_shop_uses_per_fc', { n: perFcStr });
    if (itemForEff.fb > 0) {
      subTxt += ' • ' + t('guide_shop_fb_per_use', { fb: formatGuideDecimal(itemForEff.fb / u, 2) });
    }
    return mainChip + '<div class="guide-sub-meta">' + escapeHtml(subTxt) + '</div>';
  }
  return mainChip;
}

function getBaitValueScore(b) {
  if (!b || b.fc < 0) return null;
  var isFree = (b.fc === 0);
  var isUnlimited = (b.uses === -1);
  var usesPerFc = (isFree || isUnlimited) ? Infinity : (b.uses > 0 ? (b.uses / b.fc) : 0);
  var hasFb = (b.fb > 0);
  var fbPerUse = (hasFb && b.uses > 0) ? (b.fb / b.uses) : Infinity;
  return {
    isFree: isFree,
    isUnlimited: isUnlimited,
    usesPerFc: usesPerFc,
    hasFb: hasFb,
    fbPerUse: fbPerUse,
    fc: b.fc
  };
}

function compareBaitValueScores(a, b) {
  if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
  if (a.isUnlimited !== b.isUnlimited) return a.isUnlimited ? -1 : 1;
  if (Math.abs(a.usesPerFc - b.usesPerFc) > 1e-9) return b.usesPerFc - a.usesPerFc;
  if (a.hasFb !== b.hasFb) return a.hasFb ? -1 : 1;
  if (a.hasFb && b.hasFb && Math.abs(a.fbPerUse - b.fbPerUse) > 1e-9) return a.fbPerUse - b.fbPerUse;
  return a.fc - b.fc;
}

function getBestValueBaitIds(fbOnlyFilter) {
  var bestByCat = Object.create(null);
  GUIDE_SHOP_DATA.baits.forEach(function (b) {
    if (fbOnlyFilter && !(b.fb > 0 || b.fc === 0)) return;
    var score = getBaitValueScore(b);
    if (!score) return;
    var prev = bestByCat[b.category];
    if (!prev || compareBaitValueScores(score, prev.score) < 0) {
      bestByCat[b.category] = { id: b.id, score: score };
    }
  });
  var ids = new Set();
  Object.keys(bestByCat).forEach(function (catKey) {
    ids.add(bestByCat[catKey].id);
  });
  return ids;
}

function formatShopReqLvlHtml(lvlVal, item) {
  if (item && item.reqPirateCave) {
    return '<span class="shop-pirate-badge" title="' + escapeHtml(t('guide_shop_req_pirate_cave_title')) + '">' +
      escapeHtml(t('guide_shop_req_pirate_cave')) + '</span>';
  }
  var lvl = parseInt(lvlVal, 10) || 0;
  if (lvl <= 0) return '<span class="guide-muted-dash">—</span>';
  return '<span class="shop-param-chip">Lvl ' + formatGuideInt(lvl) + '</span>';
}

function formatResourceEffectText(item) {
  var p = (item && item.param) || {};
  if (p.desc_type === 1) return t('guide_shop_eff_luck1');
  if (p.desc_type === 2) return t('guide_shop_eff_luck2');
  if (p.percent) return t('guide_shop_eff_wait', { pct: p.percent });
  if (p.accuracy) return t('guide_shop_eff_radar', { acc: p.accuracy });
  if (p.exp_multiple) return t('guide_shop_eff_xp', { mul: p.exp_multiple });
  if (p.chance_multiply) return t('guide_shop_eff_shiny', { mul: p.chance_multiply });
  if (p.power_multiply) return t('guide_shop_eff_power', { pct: Math.round((p.power_multiply - 1) * 100) });
  return '—';
}

function getShopEntriesForCategory(cat) {
  var entries = [];
  if (cat === 'baits') {
    GUIDE_SHOP_DATA.baits.forEach(function (it) { entries.push({ kind: 'bait', cat: 'baits', item: it }); });
  } else if (cat === 'rods') {
    GUIDE_SHOP_DATA.rods.forEach(function (it) { entries.push({ kind: 'rod', cat: 'rods', item: it }); });
  } else if (cat === 'bobbers') {
    GUIDE_SHOP_DATA.bobbers.forEach(function (it) { entries.push({ kind: 'float', cat: 'bobbers', item: it }); });
  } else if (cat === 'resources') {
    GUIDE_SHOP_DATA.resources.forEach(function (it) { entries.push({ kind: 'resource', cat: 'resources', item: it }); });
  }
  return entries;
}

function matchesShopSearch(entry, qNorm) {
  var item = entry.item;
  var kind = entry.kind;
  var name = getShopItemTextSafe(kind + '_' + item.id, '#' + item.id);
  var desc = getShopItemTextSafe(kind + '_desc_' + item.id, '');
  if (normStr(name).indexOf(qNorm) !== -1) return true;
  if (desc && normStr(desc).indexOf(qNorm) !== -1) return true;
  if (kind === 'bait' && item.category) {
    var bCatName = (window.FISHAO_I18N && window.FISHAO_I18N.getBaitName) ? window.FISHAO_I18N.getBaitName(item.category) : item.category;
    if (normStr(bCatName).indexOf(qNorm) !== -1 || normStr(item.category).indexOf(qNorm) !== -1) return true;
  }
  return false;
}

function getFilteredShopEntries() {
  var all = getShopEntriesForCategory(guideShopCategory);
  var qNorm = normStr(guideShopSearchQuery || '');
  var bestIds = (guideShopCategory === 'baits' && guideShopBestValueOnly)
    ? getBestValueBaitIds(guideShopFbOnly)
    : null;
  return all.filter(function (entry) {
    if (guideShopFbOnly && !(entry.item.fb > 0 || entry.item.fc === 0)) return false;
    if (guideShopCategory === 'baits' && guideShopBaitCategoryFilter && entry.item.category !== guideShopBaitCategoryFilter) return false;
    if (bestIds && !bestIds.has(entry.item.id)) return false;
    if (qNorm && !matchesShopSearch(entry, qNorm)) return false;
    return true;
  });
}

function setGuideShopCategory(cat) {
  var allowed = ['baits', 'rods', 'bobbers', 'resources'];
  guideShopCategory = allowed.indexOf(cat) !== -1 ? cat : 'baits';
  renderGuideView('shop');
}

function onGuideShopSearchInput(val) {
  guideShopSearchQuery = val || '';
  renderGuideShopTable();
}

function toggleGuideShopFbOnly() {
  guideShopFbOnly = !guideShopFbOnly;
  renderGuideView('shop');
}

function onGuideShopBaitCatChange(val) {
  guideShopBaitCategoryFilter = val || '';
  renderGuideView('shop');
}

function toggleGuideShopBestValue() {
  guideShopBestValueOnly = !guideShopBestValueOnly;
  renderGuideView('shop');
}

function renderGuideShopBanner() {
  var bannerEl = document.getElementById('bannerGuide');
  if (bannerEl) {
    bannerEl.style.display = 'none';
    bannerEl.classList.remove('green', 'gold', 'cyan');
  }
}

function renderGuideShopToolbar() {
  var box = document.getElementById('guideCalcBox');
  if (!box) return;

  var cats = [
    { key: 'baits', label: t('guide_shop_cat_baits', { count: GUIDE_SHOP_DATA.baits.length }) },
    { key: 'rods', label: t('guide_shop_cat_rods', { count: GUIDE_SHOP_DATA.rods.length }) },
    { key: 'bobbers', label: t('guide_shop_cat_bobbers', { count: GUIDE_SHOP_DATA.bobbers.length }) },
    { key: 'resources', label: t('guide_shop_cat_resources', { count: GUIDE_SHOP_DATA.resources.length }) }
  ];

  var pillsHtml = cats.map(function (c) {
    var cls = 'pill-btn' + (guideShopCategory === c.key ? ' active' : '');
    return '<button type="button" class="' + cls + '" onclick="window.fishaoApp.setGuideShopCategory(\'' + c.key + '\')">' + escapeHtml(c.label) + '</button>';
  }).join('');

  var baitExtrasHtml = '';
  if (guideShopCategory === 'baits') {
    var seenCats = [];
    GUIDE_SHOP_DATA.baits.forEach(function (b) {
      if (seenCats.indexOf(b.category) === -1) seenCats.push(b.category);
    });
    var baitCatOpts = '<option value="">' + escapeHtml(t('guide_shop_all_bait_cats')) + '</option>' +
      seenCats.map(function (cKey) {
        var cLabel = (window.FISHAO_I18N && window.FISHAO_I18N.getBaitName) ? window.FISHAO_I18N.getBaitName(cKey) : cKey;
        var sel = (guideShopBaitCategoryFilter === cKey) ? ' selected' : '';
        return '<option value="' + escapeHtml(cKey) + '"' + sel + '>' + escapeHtml(cLabel) + '</option>';
      }).join('');

    var bestBtnCls = 'pill-btn' + (guideShopBestValueOnly ? ' amber active' : '');
    baitExtrasHtml =
      '<div class="bait-select-wrapper shop-bait-select-wrapper">' +
        '<select id="guideShopBaitCatSelect" class="filter-control shop-bait-cat-select" aria-label="' + escapeHtml(t('guide_shop_col_cat')) + '" onchange="window.fishaoApp.onGuideShopBaitCatChange(this.value)">' +
          baitCatOpts +
        '</select>' +
      '</div>' +
      '<button type="button" id="guideShopBestValueBtn" class="' + bestBtnCls + '" onclick="window.fishaoApp.toggleGuideShopBestValue()">' +
        escapeHtml(t('guide_shop_best_value_btn')) +
      '</button>';
  }

  var fbBtnCls = 'pill-btn' + (guideShopFbOnly ? ' green active' : '');
  box.innerHTML =
    '<div class="shop-filter-bar">' +
      '<div class="shop-cat-pills">' + pillsHtml + '</div>' +
      '<div class="shop-controls-row">' +
        '<div class="search-input-wrapper">' +
          '<span class="search-icon">🔍</span>' +
          '<input type="text" id="guideShopSearchInput" class="filter-control search-input" ' +
            'value="' + escapeHtml(guideShopSearchQuery) + '" ' +
            'placeholder="' + escapeHtml(t('guide_shop_search_ph')) + '" ' +
            'oninput="window.fishaoApp.onGuideShopSearchInput(this.value)">' +
        '</div>' +
        baitExtrasHtml +
        '<button type="button" id="guideShopFbOnlyBtn" class="' + fbBtnCls + '" onclick="window.fishaoApp.toggleGuideShopFbOnly()">' +
          escapeHtml(t('guide_shop_fb_only')) +
        '</button>' +
      '</div>' +
    '</div>';

  if (guideShopCategory === 'baits' && typeof syncBaitSelectIcon === 'function') {
    syncBaitSelectIcon('guideShopBaitCatSelect');
  }
}

function renderGuideShopTable() {
  var thead = document.getElementById('guideTableHead');
  var tbody = document.getElementById('guideTableBody');
  var hintEl = document.getElementById('guideTableHint');
  var tableCard = document.querySelector('.guide-table-card');
  if (!thead || !tbody) return;

  if (tableCard) tableCard.classList.add('is-shop');

  var totalInCat = getShopEntriesForCategory(guideShopCategory).length;
  var filtered = getFilteredShopEntries();
  if (hintEl) {
    hintEl.textContent = t('guide_shop_showing', { shown: filtered.length, total: totalInCat });
  }

  var cat = guideShopCategory;
  var colCount = 7;

  if (cat === 'baits') {
    colCount = 7;
    thead.innerHTML = '<tr>' +
      '<th style="width:74px;">' + escapeHtml(t('guide_shop_col_img')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_name')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_cat')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_uses')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_req_lvl')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fc')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fb')) + '</th>' +
    '</tr>';
  } else if (cat === 'rods') {
    colCount = 8;
    thead.innerHTML = '<tr>' +
      '<th style="width:88px;">' + escapeHtml(t('guide_shop_col_img')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_name')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_rod_len')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_rod_power')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_uses')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_req_lvl')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fc')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fb')) + '</th>' +
    '</tr>';
  } else if (cat === 'bobbers') {
    colCount = 4;
    thead.innerHTML = '<tr>' +
      '<th style="width:74px;">' + escapeHtml(t('guide_shop_col_img')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_name')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fc')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fb')) + '</th>' +
    '</tr>';
  } else {
    colCount = 7;
    thead.innerHTML = '<tr>' +
      '<th style="width:74px;">' + escapeHtml(t('guide_shop_col_img')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_name')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_duration')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_effect')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_req_lvl')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fc')) + '</th>' +
      '<th>' + escapeHtml(t('guide_shop_col_price_fb')) + '</th>' +
    '</tr>';
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center; padding: 28px 14px; color: var(--text-muted);">' +
      escapeHtml(t('guide_shop_empty')) + '</td></tr>';
    return;
  }

  var bestBaitIds = (cat === 'baits') ? getBestValueBaitIds(guideShopFbOnly) : null;

  tbody.innerHTML = filtered.map(function (entry) {
    var item = entry.item;
    var kind = entry.kind;
    var name = getShopItemTextSafe(kind + '_' + item.id, '#' + item.id);
    var desc = getShopItemTextSafe(kind + '_desc_' + item.id, '');
    var imgHtml = renderShopItemImage(kind, item.id, name);

    if (cat === 'baits') {
      var bestBadge = (bestBaitIds && bestBaitIds.has(item.id))
        ? ' <span class="shop-best-value-badge">' + escapeHtml(t('guide_shop_best_value_badge')) + '</span>'
        : '';
      return '<tr onclick="window.fishaoApp.openGuideShopItemModal(\'' + kind + '\', ' + item.id + ')">' +
        '<td>' + imgHtml + '</td>' +
        '<td><div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span>' + bestBadge + '</div>' +
          (desc ? '<div class="shop-item-desc">' + escapeHtml(desc) + '</div>' : '') + '</td>' +
        '<td>' + renderBaitTag(item.category) + '</td>' +
        '<td>' + formatShopUsesHtml(item.uses, item) + '</td>' +
        '<td>' + formatShopReqLvlHtml(item.reqLvl, item) + '</td>' +
        '<td>' + formatShopPriceFcHtml(item.fc) + '</td>' +
        '<td>' + formatShopPriceFbHtml(item.fb) + '</td>' +
      '</tr>';
    }

    if (cat === 'rods') {
      var shopBadge = (!item.inShop && item.id !== 1)
        ? ' <span class="shop-not-in-shop-badge">' + escapeHtml(t('guide_shop_not_in_shop')) + '</span>'
        : '';
      var rodRowCls = (item.id === 10) ? 'shop-row-golden' : '';
      return '<tr class="' + rodRowCls + '" onclick="window.fishaoApp.openGuideShopItemModal(\'' + kind + '\', ' + item.id + ')">' +
        '<td>' + imgHtml + '</td>' +
        '<td><div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span>' + shopBadge + '</div>' +
          (desc ? '<div class="shop-item-desc">' + escapeHtml(desc) + '</div>' : '') + '</td>' +
        '<td><span class="shop-param-chip">' + formatGuideInt(item.length) + ' cm</span></td>' +
        '<td><strong class="guide-line-len">' + escapeHtml(t('guide_shop_up_to_cm', { cm: formatGuideInt(item.power) })) + '</strong></td>' +
        '<td>' + formatShopUsesHtml(item.uses) + '</td>' +
        '<td>' + formatShopReqLvlHtml(item.reqLvl) + '</td>' +
        '<td>' + formatShopPriceFcHtml(item.fc) + '</td>' +
        '<td>' + formatShopPriceFbHtml(item.fb) + '</td>' +
      '</tr>';
    }

    if (cat === 'bobbers') {
      return '<tr onclick="window.fishaoApp.openGuideShopItemModal(\'' + kind + '\', ' + item.id + ')">' +
        '<td>' + imgHtml + '</td>' +
        '<td><div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span></div>' +
          (desc ? '<div class="shop-item-desc">' + escapeHtml(desc) + '</div>' : '') + '</td>' +
        '<td>' + formatShopPriceFcHtml(item.fc) + '</td>' +
        '<td>' + formatShopPriceFbHtml(item.fb) + '</td>' +
      '</tr>';
    }

    var durMin = item.param && item.param.duration_min ? (item.param.duration_min + ' ' + t('guide_unit_min_short')) : '—';
    return '<tr onclick="window.fishaoApp.openGuideShopItemModal(\'' + kind + '\', ' + item.id + ')">' +
      '<td>' + imgHtml + '</td>' +
      '<td><div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span></div>' +
        (desc ? '<div class="shop-item-desc">' + escapeHtml(desc) + '</div>' : '') + '</td>' +
      '<td><span class="shop-param-chip">' + escapeHtml(durMin) + '</span></td>' +
      '<td><span class="shop-cat-badge">' + escapeHtml(formatResourceEffectText(item)) + '</span></td>' +
      '<td>' + formatShopReqLvlHtml(item.reqLvl) + '</td>' +
      '<td>' + formatShopPriceFcHtml(item.fc) + '</td>' +
      '<td>' + formatShopPriceFbHtml(item.fb) + '</td>' +
    '</tr>';
  }).join('');
}

function findShopEntryByKindAndId(kind, id) {
  var catMap = { bait: 'baits', rod: 'rods', float: 'bobbers', resource: 'resources' };
  var cat = catMap[kind];
  if (!cat || !GUIDE_SHOP_DATA[cat]) return null;
  var numId = parseInt(id, 10);
  var arr = GUIDE_SHOP_DATA[cat];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === numId) {
      return { kind: kind, cat: cat, item: arr[i] };
    }
  }
  return null;
}

function renderShopDetailCard(label, valHtml, fullWidth) {
  return '<div class="modal-detail-item"' + (fullWidth ? ' style="grid-column: 1 / -1;"' : '') + '>' +
    '<span class="detail-label">' + escapeHtml(label) + '</span>' +
    '<div class="detail-val">' + valHtml + '</div>' +
  '</div>';
}

function ensureShopItemModalOverlay() {
  var overlay = document.getElementById('shopItemModalOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'shopItemModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'shopItemModalTitle');
  overlay.onclick = function (e) {
    if (e.target === overlay) closeGuideShopItemModal();
  };
  overlay.innerHTML =
    '<div class="modal-box shop-detail-modal-box">' +
      '<div class="modal-header">' +
        '<span class="modal-title" id="shopItemModalTitle"></span>' +
        '<button type="button" class="modal-close" aria-label="Close" onclick="window.fishaoApp.closeGuideShopItemModal()">×</button>' +
      '</div>' +
      '<div class="modal-body" id="shopItemModalBody"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function openGuideShopItemModal(kind, id) {
  var entry = findShopEntryByKindAndId(kind, id);
  if (!entry || typeof document === 'undefined') return;

  var item = entry.item;
  var cat = entry.cat;
  var name = getShopItemTextSafe(kind + '_' + item.id, '#' + item.id);
  var desc = getShopItemTextSafe(kind + '_desc_' + item.id, '');
  var imgHtml = renderShopItemImage(kind, item.id, name);

  var badgesHtml = '';
  if (cat === 'baits') {
    var bestIds = getBestValueBaitIds(guideShopFbOnly);
    if (bestIds && bestIds.has(item.id)) {
      badgesHtml += '<span class="shop-best-value-badge">' + escapeHtml(t('guide_shop_best_value_badge')) + '</span>';
    }
  } else if (cat === 'rods' && !item.inShop && item.id !== 1) {
    badgesHtml += '<span class="shop-not-in-shop-badge">' + escapeHtml(t('guide_shop_not_in_shop')) + '</span>';
  }

  var catBadgeText = '';
  if (cat === 'rods') catBadgeText = t('guide_shop_cat_label_rods');
  else if (cat === 'bobbers') catBadgeText = t('guide_shop_cat_label_bobbers');
  else if (cat === 'resources') catBadgeText = t('guide_shop_cat_label_resources');

  var detailsCards = [];
  if (cat === 'baits') {
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_cat'), renderBaitTag(item.category)));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_uses'), formatShopUsesHtml(item.uses, item)));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_req_lvl'), formatShopReqLvlHtml(item.reqLvl, item)));
  } else if (cat === 'rods') {
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_cat'), '<span class="shop-cat-badge">' + escapeHtml(catBadgeText) + '</span>'));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_rod_len'), '<span class="shop-param-chip">' + formatGuideInt(item.length) + ' cm</span>'));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_rod_power'), '<strong class="guide-line-len">' + escapeHtml(t('guide_shop_up_to_cm', { cm: formatGuideInt(item.power) })) + '</strong>'));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_uses'), formatShopUsesHtml(item.uses)));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_req_lvl'), formatShopReqLvlHtml(item.reqLvl)));
  } else if (cat === 'bobbers') {
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_cat'), '<span class="shop-cat-badge">' + escapeHtml(catBadgeText) + '</span>', true));
  } else {
    var durMin = item.param && item.param.duration_min ? (item.param.duration_min + ' ' + t('guide_unit_min_short')) : '—';
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_cat'), '<span class="shop-cat-badge">' + escapeHtml(catBadgeText) + '</span>'));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_duration'), '<span class="shop-param-chip">' + escapeHtml(durMin) + '</span>'));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_effect'), '<span class="shop-cat-badge">' + escapeHtml(formatResourceEffectText(item)) + '</span>', true));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_req_lvl'), formatShopReqLvlHtml(item.reqLvl)));
  }

  detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fc'), formatShopPriceFcHtml(item.fc)));
  detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fb'), formatShopPriceFbHtml(item.fb)));

  var overlay = ensureShopItemModalOverlay();
  var titleEl = document.getElementById('shopItemModalTitle');
  var bodyEl = document.getElementById('shopItemModalBody');
  if (titleEl) titleEl.textContent = name;
  if (bodyEl) {
    var heroCls = 'shop-detail-hero' + (cat === 'rods' && item.id === 10 ? ' is-golden' : '');
    bodyEl.innerHTML =
      '<div class="' + heroCls + '">' +
        imgHtml +
        '<div class="shop-detail-hero-info">' +
          '<div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span>' + badgesHtml + '</div>' +
          (cat === 'baits' ? '<div style="margin-top:6px;">' + renderBaitTag(item.category) + '</div>' : '<div style="margin-top:6px;"><span class="shop-cat-badge">' + escapeHtml(catBadgeText) + '</span></div>') +
        '</div>' +
      '</div>' +
      (desc ? '<div class="shop-detail-desc-box">' + escapeHtml(desc) + '</div>' : '') +
      '<div class="modal-details-grid">' + detailsCards.join('') + '</div>';
  }

  overlay.classList.add('active');
  if (document.documentElement) document.documentElement.classList.add('modal-open');
  if (document.body) document.body.classList.add('modal-open');
}

function closeGuideShopItemModal() {
  var overlay = document.getElementById('shopItemModalOverlay');
  if (overlay) overlay.classList.remove('active');
  if (typeof document !== 'undefined' && !document.querySelector('.modal-overlay.active')) {
    if (document.documentElement) document.documentElement.classList.remove('modal-open');
    if (document.body) document.body.classList.remove('modal-open');
  }
}

function renderGuideView(subType) {
  if (subType === 'shop') {
    currentGuideSubTab = 'shop';
    renderGuideShopBanner();
    renderGuideShopToolbar();
    renderGuideShopTable();
    return;
  }
  var tableCard = document.querySelector('.guide-table-card');
  if (tableCard) tableCard.classList.remove('is-shop');
  var bannerEl = document.getElementById('bannerGuide');
  if (bannerEl) bannerEl.classList.remove('cyan');

  var type = (subType === 'line') ? 'line' : 'tree';
  currentGuideSubTab = type;
  var totals = computeGuideTotals(type);
  renderGuideBanner(type, totals);
  renderGuideCalculator(type, totals);
  renderGuideTable(type, totals);
}
