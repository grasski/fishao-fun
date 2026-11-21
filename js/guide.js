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

var GUIDE_DECORATION_COLLECTIONS = [
  { id: 17, key: "simple", rewardFishId: null },
  { id: 18, key: "ice", rewardFishId: null },
  { id: 19, key: "princess", rewardFishId: null },
  { id: 20, key: "classic", rewardFishId: null },
  { id: 21, key: "designer", rewardFishId: null },
  { id: 22, key: "gold", rewardFishId: null },
  { id: 23, key: "christmas", rewardFishId: null },
  { id: 24, key: "paintings", rewardFishId: null },
  { id: 25, key: "plants", rewardFishId: null },
  { id: 26, key: "spooky", rewardFishId: null },
  { id: 27, key: "pirate", rewardFishId: null },
  { id: 79, key: "balloon", rewardFishId: 1100 },
  { id: 80, key: "candy", rewardFishId: 1101 },
  { id: 81, key: "soccer", rewardFishId: 1102 },
  { id: 82, key: "space", rewardFishId: 1103 },
  { id: 83, key: "gorgeous", rewardFishId: 1104 }
];

var GUIDE_DECORATIONS_DATA = [
  { id: 1, type: "wall", fb: 100, fc: -1, rarity: 1, source: "EIIS_START", collectionId: 17 },
  { id: 2, type: "wall", fb: 65, fc: -1, rarity: 1, source: "EIIS_START", collectionId: 17 },
  { id: 3, type: "furniture", fb: 430, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 4, type: "furniture", fb: 150, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 5, type: "floor", fb: 395, fc: -1, rarity: 1, source: "EIIS_START", collectionId: 17 },
  { id: 7, type: "floor", fb: 265, fc: -1, rarity: 1, source: "EIIS_START", collectionId: 17 },
  { id: 8, type: "furniture", fb: 215, fc: -1, rarity: 1, source: "EIIS_START", collectionId: 17 },
  { id: 9, type: "furniture", fb: 2400, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 10, type: "furniture", fb: 245, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 11, type: "furniture", fb: 185, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 12, type: "furniture", fb: 115, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: [17, 25] },
  { id: 13, type: "furniture", fb: 130, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 14, type: "furniture", fb: 495, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 15, type: "furniture", fb: 230, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 16, type: "furniture", fb: 160, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 17 },
  { id: 17, type: "wall", fb: 540, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 18, type: "floor", fb: 810, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 19, type: "furniture", fb: 720, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 20, type: "furniture", fb: 1440, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 21, type: "furniture", fb: 450, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 22, type: "furniture", fb: 1260, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 23, type: "furniture", fb: 585, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 24, type: "furniture", fb: 900, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 25, type: "furniture", fb: 1800, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 26, type: "furniture", fb: 495, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 27, type: "furniture", fb: 765, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 28, type: "furniture", fb: 900, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 19 },
  { id: 29, type: "wall", fb: 720, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 30, type: "floor", fb: 1120, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 31, type: "furniture", fb: 640, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 32, type: "furniture", fb: 2600, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 33, type: "furniture", fb: 1440, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 34, type: "furniture", fb: 1280, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 35, type: "furniture", fb: 2560, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 36, type: "furniture", fb: 1600, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 37, type: "furniture", fb: 3280, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 38, type: "furniture", fb: 400, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: [20, 25] },
  { id: 39, type: "furniture", fb: 2320, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 40, type: "furniture", fb: 2800, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 20 },
  { id: 41, type: "furniture", fb: 2120, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 42, type: "furniture", fb: 1150, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 43, type: "furniture", fb: 1800, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 44, type: "furniture", fb: 2240, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 45, type: "furniture", fb: 2100, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 46, type: "furniture", fb: 400, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 47, type: "furniture", fb: 950, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 48, type: "furniture", fb: 1240, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 49, type: "furniture", fb: 1600, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 50, type: "furniture", fb: 1060, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 51, type: "furniture", fb: 15000, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 52, type: "furniture", fb: 6300, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 53, type: "furniture", fb: 8700, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 54, type: "furniture", fb: 9600, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 55, type: "furniture", fb: 13200, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 56, type: "furniture", fb: 6600, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 57, type: "furniture", fb: 9000, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 58, type: "furniture", fb: 15900, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 59, type: "furniture", fb: 14000, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 60, type: "furniture", fb: 27000, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 61, type: "furniture", fb: 7500, fc: -1, rarity: 5, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 62, type: "wall", fb: 5400, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 63, type: "floor", fb: 16900, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 22 },
  { id: 64, type: "wall", fb: 560, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 65, type: "floor", fb: 1400, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 21 },
  { id: 66, type: "furniture", fb: 670, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 67, type: "furniture", fb: 1400, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 68, type: "furniture", fb: 450, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 69, type: "furniture", fb: 840, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 70, type: "furniture", fb: 1395, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 71, type: "furniture", fb: 1650, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 72, type: "furniture", fb: 300, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 73, type: "furniture", fb: 800, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: [23, 25] },
  { id: 74, type: "furniture", fb: 375, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 75, type: "furniture", fb: 1650, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 76, type: "furniture", fb: 980, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 77, type: "furniture", fb: 420, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 78, type: "furniture", fb: 1700, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 79, type: "furniture", fb: 1100, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 80, type: "furniture", fb: 1950, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 81, type: "furniture", fb: 500, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 82, type: "furniture", fb: 1700, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 83, type: "floor", fb: 1350, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 84, type: "wall", fb: 1700, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 18 },
  { id: 85, type: "wall", fb: 625, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 86, type: "wall", fb: 300, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 87, type: "wall", fb: 850, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 88, type: "wall", fb: 275, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 89, type: "wall", fb: 350, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 90, type: "wall", fb: 1575, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 91, type: "floor", fb: 940, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 23 },
  { id: 92, type: "furniture", fb: 12000, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 93, type: "furniture", fb: 1450, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 94, type: "furniture", fb: 2200, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 95, type: "furniture", fb: 550, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 96, type: "furniture", fb: 1725, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 97, type: "furniture", fb: 2300, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 98, type: "furniture", fb: 380, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 99, type: "furniture", fb: 740, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 100, type: "furniture", fb: 1400, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 101, type: "furniture", fb: 1150, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 102, type: "furniture", fb: 25000, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 103, type: "furniture", fb: 1400, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 104, type: "furniture", fb: 975, fc: -1, rarity: 2, source: "EIIS_MISSION_REWARD", collectionId: 25 },
  { id: 105, type: "furniture", fb: 605, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 106, type: "furniture", fb: 720, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 107, type: "furniture", fb: 475, fc: -1, rarity: 1, source: "EIIS_MISSION_REWARD", collectionId: 25 },
  { id: 108, type: "furniture", fb: 740, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 109, type: "furniture", fb: 740, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 110, type: "furniture", fb: 1000, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 111, type: "furniture", fb: 550, fc: -1, rarity: 1, source: "EIIS_MISSION_REWARD", collectionId: 25 },
  { id: 112, type: "furniture", fb: 625, fc: -1, rarity: 2, source: "EIIS_MISSION_REWARD", collectionId: 25 },
  { id: 113, type: "furniture", fb: 780, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 114, type: "furniture", fb: 695, fc: -1, rarity: 1, source: "EIIS_MISSION_REWARD", collectionId: 25 },
  { id: 115, type: "furniture", fb: 990, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 116, type: "furniture", fb: 735, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 25 },
  { id: 117, type: "furniture", fb: 3000, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 118, type: "furniture", fb: 4000, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: [20, 24] },
  { id: 119, type: "furniture", fb: 6000, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 120, type: "furniture", fb: 8000, fc: -1, rarity: 4, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 121, type: "furniture", fb: 10000, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 24 },
  { id: 122, type: "furniture", fb: 12000, fc: -1, rarity: 4, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 123, type: "furniture", fb: 14000, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 24 },
  { id: 124, type: "furniture", fb: 16000, fc: -1, rarity: 5, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 125, type: "furniture", fb: 18000, fc: -1, rarity: 5, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 126, type: "furniture", fb: 500, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 24 },
  { id: 127, type: "furniture", fb: 1600, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 24 },
  { id: 128, type: "furniture", fb: 2000, fc: -1, rarity: 2, source: "EIIS_MISSION_REWARD", collectionId: 24 },
  { id: 129, type: "furniture", fb: 2400, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 24 },
  { id: 130, type: "furniture", fb: 0, fc: -1, rarity: 1, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 131, type: "wall", fb: 2100, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 132, type: "floor", fb: 1200, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 133, type: "floor", fb: 2400, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 134, type: "floor", fb: 815, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 135, type: "floor", fb: 650, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 136, type: "floor", fb: 1150, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 137, type: "floor", fb: 2800, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 138, type: "floor", fb: 2000, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 139, type: "floor", fb: 1600, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 140, type: "floor", fb: 1400, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 141, type: "floor", fb: 800, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 142, type: "floor", fb: 600, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: null },
  { id: 143, type: "furniture", fb: 275, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 144, type: "furniture", fb: 165, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 145, type: "furniture", fb: 7000, fc: -1, rarity: 5, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 146, type: "furniture", fb: 350, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 147, type: "furniture", fb: 1200, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 148, type: "furniture", fb: 900, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 149, type: "furniture", fb: 200, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 150, type: "furniture", fb: 750, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 151, type: "furniture", fb: 900, fc: -1, rarity: 3, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 152, type: "furniture", fb: 800, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 153, type: "furniture", fb: 120, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 154, type: "furniture", fb: 800, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 155, type: "furniture", fb: 320, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 156, type: "furniture", fb: 1100, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 157, type: "furniture", fb: 540, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 158, type: "furniture", fb: 1330, fc: -1, rarity: 4, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 159, type: "furniture", fb: 230, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 160, type: "furniture", fb: 520, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 161, type: "furniture", fb: 770, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 162, type: "furniture", fb: 180, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 170, type: "wall", fb: 400, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 171, type: "floor", fb: 550, fc: -1, rarity: 1, source: "EIIS_DECORATION_SHOP", collectionId: 26 },
  { id: 172, type: "wall", fb: 350, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 173, type: "floor", fb: 720, fc: -1, rarity: 2, source: "EIIS_DECORATION_SHOP", collectionId: 27 },
  { id: 174, type: "furniture", fb: 400, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 175, type: "furniture", fb: 800, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 176, type: "furniture", fb: 1200, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 177, type: "furniture", fb: 1600, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 178, type: "furniture", fb: 2000, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 179, type: "furniture", fb: 1300, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 180, type: "furniture", fb: 450, fc: -1, rarity: 3, source: "EIIS_MISSION_REWARD", collectionId: null },
  { id: 181, type: "wall", fb: 550, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 182, type: "floor", fb: 100, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 183, type: "furniture", fb: 920, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 184, type: "furniture", fb: 200, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 185, type: "furniture", fb: 1420, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 186, type: "furniture", fb: 700, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 187, type: "furniture", fb: 350, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 188, type: "furniture", fb: 220, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 189, type: "furniture", fb: 1100, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 190, type: "furniture", fb: 400, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 191, type: "furniture", fb: 1700, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 192, type: "furniture", fb: 840, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 79 },
  { id: 193, type: "wall", fb: 980, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 194, type: "floor", fb: 220, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 195, type: "furniture", fb: 1250, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 196, type: "furniture", fb: 440, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 197, type: "furniture", fb: 1950, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 198, type: "furniture", fb: 150, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 199, type: "furniture", fb: 160, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 200, type: "furniture", fb: 620, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 201, type: "furniture", fb: 850, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 202, type: "furniture", fb: 250, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 203, type: "furniture", fb: 4400, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 204, type: "furniture", fb: 1290, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 80 },
  { id: 205, type: "wall", fb: 490, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 206, type: "floor", fb: 3050, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 207, type: "furniture", fb: 770, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 208, type: "furniture", fb: 100, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 209, type: "furniture", fb: 110, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 210, type: "furniture", fb: 130, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 211, type: "furniture", fb: 150, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 212, type: "furniture", fb: 980, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 213, type: "furniture", fb: 2900, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 214, type: "furniture", fb: 300, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 215, type: "furniture", fb: 750, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 216, type: "furniture", fb: 1330, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 81 },
  { id: 217, type: "wall", fb: 3000, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 218, type: "floor", fb: 900, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 219, type: "furniture", fb: 12000, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 220, type: "furniture", fb: 2950, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 221, type: "furniture", fb: 500, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 222, type: "furniture", fb: 900, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 223, type: "furniture", fb: 880, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 224, type: "furniture", fb: 1400, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 225, type: "furniture", fb: 20000, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 226, type: "furniture", fb: 3000, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 227, type: "furniture", fb: 2970, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 228, type: "furniture", fb: 2950, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 82 },
  { id: 229, type: "wall", fb: 1250, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 230, type: "floor", fb: 1350, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 231, type: "furniture", fb: 11000, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 232, type: "furniture", fb: 620, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 233, type: "furniture", fb: 890, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 234, type: "furniture", fb: 3100, fc: -1, rarity: 4, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 235, type: "furniture", fb: 720, fc: -1, rarity: 1, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 236, type: "furniture", fb: 2250, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 237, type: "furniture", fb: 1105, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 238, type: "furniture", fb: 1440, fc: -1, rarity: 2, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 239, type: "furniture", fb: 2950, fc: -1, rarity: 3, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 },
  { id: 240, type: "furniture", fb: 18000, fc: -1, rarity: 5, source: "EIIS_FURNITURE_FACTORY", collectionId: 83 }
];

if (typeof window !== 'undefined') {
  window.FISHAO_GUIDE_DATA = {
    tree: GUIDE_TREE_DATA,
    line: GUIDE_LINE_DATA,
    shop: GUIDE_SHOP_DATA,
    decorations: GUIDE_DECORATIONS_DATA,
    decorationCollections: GUIDE_DECORATION_COLLECTIONS
  };
}

var currentGuideSubTab = 'tree'; // 'tree' | 'line' | 'shop' | 'decorations'
var guideShopCategory = 'baits'; // 'baits' | 'rods' | 'bobbers' | 'resources'
var guideShopSearchQuery = '';
var guideShopFbOnly = false;
var guideShopBaitCategoryFilter = '';
var guideShopBestValueOnly = false;
var guideDecTypeFilter = 'all'; // 'all' | 'furniture' | 'floor' | 'wall'
var guideDecCollectionFilter = ''; // '' | 'none' | '17'..'83'
var guideDecSearchQuery = '';
var guideDecRarityFilter = ''; // '' | '1' | '2' | '3' | '4' | '5'
var guideDecSourceFilter = ''; // '' | 'EIIS_DECORATION_SHOP' | 'EIIS_FURNITURE_FACTORY' | 'EIIS_MISSION_REWARD' | 'EIIS_START'
var guideDecSortBy = 'id_asc'; // 'id_asc' | 'name_asc' | 'price_asc' | 'price_desc' | 'rarity_desc' | 'rarity_asc'
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
  return fallback !== undefined ? fallback : key;
}

function renderShopItemImage(kind, id, altText) {
  if (kind === 'decoration') {
    var decSrc = 'https://play.fishao.net/data/image/private_house/graphics_128x128_' + id + '.png';
    return '<div class="shop-img-box is-decoration">' +
      '<img src="' + escapeHtml(decSrc) + '" alt="' + escapeHtml(altText) + '" class="shop-img" loading="lazy" decoding="async" onerror="this.style.display=\'none\';">' +
    '</div>';
  }
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

function getDecorationTypeLabel(type) {
  if (type === 'floor') return t('guide_dec_cat_floor');
  if (type === 'wall') return t('guide_dec_cat_wall');
  return t('guide_dec_cat_furniture');
}

function renderDecorationTypeBadge(type) {
  var cls = (type === 'floor' || type === 'wall') ? ('type-' + type) : 'type-furniture';
  return '<span class="dec-type-badge ' + cls + '">' + escapeHtml(getDecorationTypeLabel(type)) + '</span>';
}

function getDecorationRarityLabel(rarity) {
  var r = parseInt(rarity, 10);
  if (r >= 1 && r <= 5) return t('guide_dec_rarity_' + r);
  return t('guide_dec_rarity_1');
}

function renderDecorationRarityBadge(rarity) {
  var r = Math.max(1, Math.min(5, parseInt(rarity, 10) || 1));
  var stars = '★★★★★'.slice(0, r);
  return '<span class="dec-rarity-badge rarity-' + r + '">' +
    '<span class="dec-rarity-stars">' + stars + '</span>' +
    '<span>' + escapeHtml(getDecorationRarityLabel(r)) + '</span>' +
  '</span>';
}

function getDecorationSourceMeta(source) {
  var map = {
    EIIS_DECORATION_SHOP: { key: 'guide_dec_src_shop', cls: 'src-shop' },
    EIIS_FURNITURE_FACTORY: { key: 'guide_dec_src_factory', cls: 'src-factory' },
    EIIS_MISSION_REWARD: { key: 'guide_dec_src_mission', cls: 'src-mission' },
    EIIS_START: { key: 'guide_dec_src_start', cls: 'src-start' }
  };
  return map[source] || { key: 'guide_dec_src_shop', cls: 'src-shop' };
}

function renderDecorationSourceBadge(source) {
  var meta = getDecorationSourceMeta(source);
  return '<span class="dec-source-badge ' + meta.cls + '">' + escapeHtml(t(meta.key)) + '</span>';
}

function formatDecorationPriceFbHtml(fbVal) {
  var fb = Number(fbVal);
  if (isFinite(fb) && fb === 0) {
    return '<span class="shop-free-badge">' + escapeHtml(t('guide_shop_free')) + '</span>';
  }
  return formatShopPriceFbHtml(fbVal);
}

var _decCollectionById = null;
var _decCollectionOrder = null;

function ensureDecorationCollectionMaps() {
  if (_decCollectionById && _decCollectionOrder) return;
  _decCollectionById = Object.create(null);
  _decCollectionOrder = Object.create(null);
  GUIDE_DECORATION_COLLECTIONS.forEach(function (col, idx) {
    _decCollectionById[String(col.id)] = col;
    _decCollectionOrder[String(col.id)] = idx;
  });
}

function getDecorationCollectionById(cid) {
  if (!cid) return null;
  ensureDecorationCollectionMaps();
  return _decCollectionById[String(cid)] || null;
}

function getDecorationCollectionOrderIndex(cid) {
  if (!cid) return 9999;
  ensureDecorationCollectionMaps();
  var idx = _decCollectionOrder[String(cid)];
  return typeof idx === 'number' ? idx : 9999;
}

function getDecorationCollectionName(cid) {
  if (!cid) return '';
  return getShopItemTextSafe('collection_title_' + cid, '#' + cid);
}

function getDecorationCollectionBadgeName(cid) {
  if (!cid) return '';
  return getShopItemTextSafe('collection_badge_' + cid, '');
}

function getItemCollectionIds(item) {
  if (!item || !item.collectionId) return [];
  if (Array.isArray(item.collectionId)) {
    return item.collectionId.filter(Boolean);
  }
  return [item.collectionId];
}

function getItemMinCollectionOrderIndex(item) {
  var cids = getItemCollectionIds(item);
  if (!cids.length) return 9999;
  var best = 9999;
  for (var i = 0; i < cids.length; i++) {
    var idx = getDecorationCollectionOrderIndex(cids[i]);
    if (idx < best) best = idx;
  }
  return best;
}

function renderDecorationCollectionBadge(cid) {
  if (!cid) {
    return '<span class="dec-collection-badge is-none">' + escapeHtml(t('guide_dec_no_collection')) + '</span>';
  }
  var col = getDecorationCollectionById(cid);
  var keyCls = col ? (' col-key-' + escapeHtml(col.key)) : '';
  return '<span class="dec-collection-badge' + keyCls + '">' + escapeHtml(getDecorationCollectionName(cid)) + '</span>';
}

function renderDecorationCollectionBadges(collectionIdOrList) {
  var list = Array.isArray(collectionIdOrList)
    ? collectionIdOrList.filter(Boolean)
    : (collectionIdOrList ? [collectionIdOrList] : []);
  if (!list.length) {
    return renderDecorationCollectionBadge(null);
  }
  if (list.length === 1) {
    return renderDecorationCollectionBadge(list[0]);
  }
  return '<div class="dec-collection-badges-list">' +
    list.map(function (cid) { return renderDecorationCollectionBadge(cid); }).join('') +
  '</div>';
}

function matchesDecorationSearch(item, qNorm) {
  var mainName = getShopItemTextSafe('decoration_' + item.id, '#' + item.id);
  if (normStr(mainName).indexOf(qNorm) !== -1) return true;
  var i18n = typeof window !== 'undefined' ? window.FISHAO_I18N : null;
  var entry = i18n && i18n.shop && i18n.shop['decoration_' + item.id];
  if (entry && typeof entry === 'object') {
    var keys = Object.keys(entry);
    for (var i = 0; i < keys.length; i++) {
      if (normStr(entry[keys[i]]).indexOf(qNorm) !== -1) return true;
    }
  }
  var cids = getItemCollectionIds(item);
  if (cids.length > 0) {
    for (var k = 0; k < cids.length; k++) {
      var cid = cids[k];
      var colName = getDecorationCollectionName(cid);
      if (colName && normStr(colName).indexOf(qNorm) !== -1) return true;
      var colEntry = i18n && i18n.shop && i18n.shop['collection_title_' + cid];
      if (colEntry && typeof colEntry === 'object') {
        var cKeys = Object.keys(colEntry);
        for (var ci = 0; ci < cKeys.length; ci++) {
          if (normStr(colEntry[cKeys[ci]]).indexOf(qNorm) !== -1) return true;
        }
      }
      var badgeName = getDecorationCollectionBadgeName(cid);
      if (badgeName && normStr(badgeName).indexOf(qNorm) !== -1) return true;
      var badgeEntry = i18n && i18n.shop && i18n.shop['collection_badge_' + cid];
      if (badgeEntry && typeof badgeEntry === 'object') {
        var bKeys = Object.keys(badgeEntry);
        for (var bi = 0; bi < bKeys.length; bi++) {
          if (normStr(badgeEntry[bKeys[bi]]).indexOf(qNorm) !== -1) return true;
        }
      }
    }
  } else if (normStr(t('guide_dec_no_collection')).indexOf(qNorm) !== -1) {
    return true;
  }
  if (normStr(getDecorationTypeLabel(item.type)).indexOf(qNorm) !== -1) return true;
  if (normStr(getDecorationRarityLabel(item.rarity)).indexOf(qNorm) !== -1) return true;
  var srcMeta = getDecorationSourceMeta(item.source);
  if (normStr(t(srcMeta.key)).indexOf(qNorm) !== -1) return true;
  return false;
}

function getFilteredDecorations() {
  var qNorm = normStr(guideDecSearchQuery || '');
  var curLang = typeof getLang === 'function' ? getLang() : 'cs';
  var filtered = GUIDE_DECORATIONS_DATA.filter(function (item) {
    if (guideDecTypeFilter !== 'all' && item.type !== guideDecTypeFilter) return false;
    if (guideDecCollectionFilter === 'none') {
      if (getItemCollectionIds(item).length > 0) return false;
    } else if (guideDecCollectionFilter) {
      var cids = getItemCollectionIds(item);
      var hasMatch = cids.some(function (cid) { return String(cid) === String(guideDecCollectionFilter); });
      if (!hasMatch) return false;
    }
    if (guideDecRarityFilter && String(item.rarity) !== String(guideDecRarityFilter)) return false;
    if (guideDecSourceFilter && item.source !== guideDecSourceFilter) return false;
    if (qNorm && !matchesDecorationSearch(item, qNorm)) return false;
    return true;
  });
  filtered.sort(function (a, b) {
    if (guideDecSortBy === 'collection_asc') {
      var oa = getItemMinCollectionOrderIndex(a);
      var ob = getItemMinCollectionOrderIndex(b);
      return oa !== ob ? (oa - ob) : (a.id - b.id);
    }
    if (guideDecSortBy === 'name_asc') {
      var na = getShopItemTextSafe('decoration_' + a.id, '#' + a.id);
      var nb = getShopItemTextSafe('decoration_' + b.id, '#' + b.id);
      var cmp = String(na).localeCompare(String(nb), curLang);
      return cmp !== 0 ? cmp : (a.id - b.id);
    }
    if (guideDecSortBy === 'price_asc') {
      return a.fb !== b.fb ? (a.fb - b.fb) : (a.id - b.id);
    }
    if (guideDecSortBy === 'price_desc') {
      return a.fb !== b.fb ? (b.fb - a.fb) : (a.id - b.id);
    }
    if (guideDecSortBy === 'rarity_desc') {
      return a.rarity !== b.rarity ? (b.rarity - a.rarity) : (a.fb !== b.fb ? (b.fb - a.fb) : (a.id - b.id));
    }
    if (guideDecSortBy === 'rarity_asc') {
      return a.rarity !== b.rarity ? (a.rarity - b.rarity) : (a.fb !== b.fb ? (a.fb - b.fb) : (a.id - b.id));
    }
    return a.id - b.id;
  });
  return filtered;
}

function setGuideDecType(type) {
  var allowed = ['all', 'furniture', 'floor', 'wall'];
  guideDecTypeFilter = allowed.indexOf(type) !== -1 ? type : 'all';
  renderGuideView('decorations');
}

function onGuideDecSearchInput(val) {
  guideDecSearchQuery = val || '';
  renderGuideDecorationsTable();
}

function onGuideDecCollectionChange(val) {
  guideDecCollectionFilter = val || '';
  renderGuideDecorationsTable();
}

function onGuideDecRarityChange(val) {
  guideDecRarityFilter = val || '';
  renderGuideDecorationsTable();
}

function onGuideDecSourceChange(val) {
  guideDecSourceFilter = val || '';
  renderGuideDecorationsTable();
}

function onGuideDecSortChange(val) {
  guideDecSortBy = val || 'id_asc';
  renderGuideDecorationsTable();
}

function resetGuideDecFilters() {
  guideDecTypeFilter = 'all';
  guideDecCollectionFilter = '';
  guideDecSearchQuery = '';
  guideDecRarityFilter = '';
  guideDecSourceFilter = '';
  guideDecSortBy = 'id_asc';
  renderGuideView('decorations');
}

function renderGuideDecorationsToolbar() {
  var box = document.getElementById('guideCalcBox');
  if (!box) return;

  var counts = { all: GUIDE_DECORATIONS_DATA.length, furniture: 0, floor: 0, wall: 0 };
  var colCounts = Object.create(null);
  var unassignedCount = 0;
  GUIDE_DECORATIONS_DATA.forEach(function (d) {
    if (counts[d.type] !== undefined) counts[d.type]++;
    var cids = getItemCollectionIds(d);
    if (cids.length > 0) {
      cids.forEach(function (cid) {
        var cKey = String(cid);
        colCounts[cKey] = (colCounts[cKey] || 0) + 1;
      });
    } else {
      unassignedCount++;
    }
  });

  var types = [
    { key: 'all', label: t('guide_dec_type_all', { count: counts.all }) },
    { key: 'furniture', label: t('guide_dec_type_furniture', { count: counts.furniture }) },
    { key: 'floor', label: t('guide_dec_type_floor', { count: counts.floor }) },
    { key: 'wall', label: t('guide_dec_type_wall', { count: counts.wall }) }
  ];

  var pillsHtml = types.map(function (tp) {
    var cls = 'pill-btn' + (guideDecTypeFilter === tp.key ? ' active' : '');
    return '<button type="button" class="' + cls + '" onclick="window.fishaoApp.setGuideDecType(\'' + tp.key + '\')">' + escapeHtml(tp.label) + '</button>';
  }).join('');

  var colOpts = '<option value="">' + escapeHtml(t('guide_dec_all_collections')) + '</option>' +
    '<option value="none"' + (guideDecCollectionFilter === 'none' ? ' selected' : '') + '>' +
      escapeHtml(t('guide_dec_unassigned_option', { count: unassignedCount })) +
    '</option>' +
    GUIDE_DECORATION_COLLECTIONS.map(function (col) {
      var cSel = (String(guideDecCollectionFilter) === String(col.id)) ? ' selected' : '';
      var cLabel = getDecorationCollectionName(col.id) + ' (' + (colCounts[String(col.id)] || 0) + ')';
      return '<option value="' + col.id + '"' + cSel + '>' + escapeHtml(cLabel) + '</option>';
    }).join('');

  var rarityOpts = '<option value="">' + escapeHtml(t('guide_dec_all_rarities')) + '</option>';
  for (var r = 1; r <= 5; r++) {
    var rSel = (String(guideDecRarityFilter) === String(r)) ? ' selected' : '';
    rarityOpts += '<option value="' + r + '"' + rSel + '>' + '★★★★★'.slice(0, r) + ' ' + escapeHtml(t('guide_dec_rarity_' + r)) + '</option>';
  }

  var sources = [
    { val: 'EIIS_DECORATION_SHOP', key: 'guide_dec_src_shop' },
    { val: 'EIIS_FURNITURE_FACTORY', key: 'guide_dec_src_factory' },
    { val: 'EIIS_MISSION_REWARD', key: 'guide_dec_src_mission' },
    { val: 'EIIS_START', key: 'guide_dec_src_start' }
  ];
  var sourceOpts = '<option value="">' + escapeHtml(t('guide_dec_all_sources')) + '</option>' +
    sources.map(function (s) {
      var sSel = (guideDecSourceFilter === s.val) ? ' selected' : '';
      return '<option value="' + escapeHtml(s.val) + '"' + sSel + '>' + escapeHtml(t(s.key)) + '</option>';
    }).join('');

  var sortModes = [
    { val: 'id_asc', key: 'guide_dec_sort_id' },
    { val: 'collection_asc', key: 'guide_dec_sort_collection' },
    { val: 'name_asc', key: 'guide_dec_sort_name' },
    { val: 'price_asc', key: 'guide_dec_sort_price_asc' },
    { val: 'price_desc', key: 'guide_dec_sort_price_desc' },
    { val: 'rarity_desc', key: 'guide_dec_sort_rarity_desc' },
    { val: 'rarity_asc', key: 'guide_dec_sort_rarity_asc' }
  ];
  var sortOpts = sortModes.map(function (sm) {
    var smSel = (guideDecSortBy === sm.val) ? ' selected' : '';
    return '<option value="' + escapeHtml(sm.val) + '"' + smSel + '>' + escapeHtml(t(sm.key)) + '</option>';
  }).join('');

  box.innerHTML =
    '<div class="shop-filter-bar">' +
      '<div class="shop-cat-pills">' + pillsHtml + '</div>' +
      '<div class="shop-controls-row">' +
        '<div class="search-input-wrapper">' +
          '<span class="search-icon">🔍</span>' +
          '<input type="text" id="guideDecSearchInput" class="filter-control search-input" ' +
            'value="' + escapeHtml(guideDecSearchQuery) + '" ' +
            'placeholder="' + escapeHtml(t('guide_dec_search_ph')) + '" ' +
            'oninput="window.fishaoApp.onGuideDecSearchInput(this.value)">' +
        '</div>' +
        '<select id="guideDecCollectionSelect" class="filter-control dec-select-control" aria-label="' + escapeHtml(t('guide_dec_col_collection')) + '" onchange="window.fishaoApp.onGuideDecCollectionChange(this.value)">' +
          colOpts +
        '</select>' +
        '<select id="guideDecRaritySelect" class="filter-control dec-select-control" aria-label="' + escapeHtml(t('guide_dec_col_rarity')) + '" onchange="window.fishaoApp.onGuideDecRarityChange(this.value)">' +
          rarityOpts +
        '</select>' +
        '<select id="guideDecSourceSelect" class="filter-control dec-select-control" aria-label="' + escapeHtml(t('guide_dec_col_source')) + '" onchange="window.fishaoApp.onGuideDecSourceChange(this.value)">' +
          sourceOpts +
        '</select>' +
        '<select id="guideDecSortSelect" class="filter-control dec-select-control" onchange="window.fishaoApp.onGuideDecSortChange(this.value)">' +
          sortOpts +
        '</select>' +
        '<button type="button" class="btn-reset sm" onclick="window.fishaoApp.resetGuideDecFilters()">' +
          escapeHtml(t('filter_btn_reset')) +
        '</button>' +
      '</div>' +
    '</div>';
}

function renderGuideDecorationsTable() {
  var thead = document.getElementById('guideTableHead');
  var tbody = document.getElementById('guideTableBody');
  var hintEl = document.getElementById('guideTableHint');
  var tableCard = document.querySelector('.guide-table-card');
  if (!thead || !tbody) return;

  if (tableCard) tableCard.classList.add('is-shop');

  var filtered = getFilteredDecorations();
  if (hintEl) {
    hintEl.textContent = t('guide_dec_showing', { shown: filtered.length, total: GUIDE_DECORATIONS_DATA.length });
  }

  thead.innerHTML = '<tr>' +
    '<th style="width:82px;">' + escapeHtml(t('guide_shop_col_img')) + '</th>' +
    '<th>' + escapeHtml(t('guide_dec_col_name')) + '</th>' +
    '<th>' + escapeHtml(t('guide_shop_col_cat')) + '</th>' +
    '<th>' + escapeHtml(t('guide_dec_col_collection')) + '</th>' +
    '<th>' + escapeHtml(t('guide_dec_col_rarity')) + '</th>' +
    '<th>' + escapeHtml(t('guide_dec_col_source')) + '</th>' +
    '<th>' + escapeHtml(t('guide_shop_col_price_fb')) + '</th>' +
  '</tr>';

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 28px 14px; color: var(--text-muted);">' +
      escapeHtml(t('guide_dec_empty')) + '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (item) {
    var name = getShopItemTextSafe('decoration_' + item.id, '#' + item.id);
    var imgHtml = renderShopItemImage('decoration', item.id, name);
    return '<tr onclick="window.fishaoApp.openGuideShopItemModal(\'decoration\', ' + item.id + ')">' +
      '<td>' + imgHtml + '</td>' +
      '<td><div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span></div></td>' +
      '<td>' + renderDecorationTypeBadge(item.type) + '</td>' +
      '<td>' + renderDecorationCollectionBadges(item.collectionId) + '</td>' +
      '<td>' + renderDecorationRarityBadge(item.rarity) + '</td>' +
      '<td>' + renderDecorationSourceBadge(item.source) + '</td>' +
      '<td>' + formatDecorationPriceFbHtml(item.fb) + '</td>' +
    '</tr>';
  }).join('');
}

function findShopEntryByKindAndId(kind, id) {
  var numId = parseInt(id, 10);
  if (kind === 'decoration') {
    for (var di = 0; di < GUIDE_DECORATIONS_DATA.length; di++) {
      if (GUIDE_DECORATIONS_DATA[di].id === numId) {
        return { kind: 'decoration', cat: 'decorations', item: GUIDE_DECORATIONS_DATA[di] };
      }
    }
    return null;
  }
  var catMap = { bait: 'baits', rod: 'rods', float: 'bobbers', resource: 'resources' };
  var cat = catMap[kind];
  if (!cat || !GUIDE_SHOP_DATA[cat]) return null;
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
  var desc = (cat === 'decorations') ? '' : getShopItemTextSafe(kind + '_desc_' + item.id, '');
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
  if (cat === 'decorations') {
    var itemCids = getItemCollectionIds(item);
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_cat'), renderDecorationTypeBadge(item.type)));
    detailsCards.push(renderShopDetailCard(t('guide_dec_col_collection'), renderDecorationCollectionBadges(item.collectionId)));
    detailsCards.push(renderShopDetailCard(t('guide_dec_col_rarity'), renderDecorationRarityBadge(item.rarity)));
    detailsCards.push(renderShopDetailCard(t('guide_dec_col_source'), renderDecorationSourceBadge(item.source)));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fb'), formatDecorationPriceFbHtml(item.fb)));
    if (item.fc >= 0) {
      detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fc'), formatShopPriceFcHtml(item.fc), true));
    }
    if (itemCids.length > 0) {
      var rewardParts = [];
      itemCids.forEach(function (cid) {
        var colBadgeName = getDecorationCollectionBadgeName(cid);
        var colMeta = getDecorationCollectionById(cid);
        if (colBadgeName) {
          rewardParts.push('<span>🏅 ' + escapeHtml(colBadgeName) + '</span>');
        }
        if (colMeta && colMeta.rewardFishId) {
          var rewardFishId = colMeta.rewardFishId;
          var rewardFishName = (window.FISHAO_I18N && typeof window.FISHAO_I18N.getFishName === 'function')
            ? window.FISHAO_I18N.getFishName(rewardFishId)
            : ('#' + rewardFishId);
          rewardParts.push('<button type="button" class="dec-reward-fish-btn" ' +
            'onclick="window.fishaoApp.closeGuideShopItemModal(); window.fishaoApp.openPriceModal(' + rewardFishId + ')">' +
            '<img src="/images/fish_' + rewardFishId + '.webp" alt="" onerror="this.style.display=\'none\';">' +
            '<span>' + escapeHtml(rewardFishName) + '</span>' +
          '</button>');
        }
      });
      if (rewardParts.length > 0) {
        detailsCards.push(renderShopDetailCard(t('guide_dec_col_reward'), '<div class="dec-collection-badges-list">' + rewardParts.join('') + '</div>', true));
      }
    }
  } else if (cat === 'baits') {
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

  if (cat !== 'decorations') {
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fc'), formatShopPriceFcHtml(item.fc)));
    detailsCards.push(renderShopDetailCard(t('guide_shop_col_price_fb'), formatShopPriceFbHtml(item.fb)));
  }

  var overlay = ensureShopItemModalOverlay();
  var titleEl = document.getElementById('shopItemModalTitle');
  var bodyEl = document.getElementById('shopItemModalBody');
  if (titleEl) titleEl.textContent = name;
  if (bodyEl) {
    var heroCls = 'shop-detail-hero' + (cat === 'rods' && item.id === 10 ? ' is-golden' : '');
    var heroMetaHtml = '';
    if (cat === 'decorations') {
      heroMetaHtml = '<div style="margin-top:6px;">' + renderDecorationTypeBadge(item.type) + '</div>';
    } else if (cat === 'baits') {
      heroMetaHtml = '<div style="margin-top:6px;">' + renderBaitTag(item.category) + '</div>';
    } else {
      heroMetaHtml = '<div style="margin-top:6px;"><span class="shop-cat-badge">' + escapeHtml(catBadgeText) + '</span></div>';
    }
    bodyEl.innerHTML =
      '<div class="' + heroCls + '">' +
        imgHtml +
        '<div class="shop-detail-hero-info">' +
          '<div class="shop-item-name-row"><span class="shop-item-title">' + escapeHtml(name) + '</span>' + badgesHtml + '</div>' +
          heroMetaHtml +
        '</div>' +
      '</div>' +
      (desc ? '<div class="shop-detail-desc-box">' + escapeHtml(desc) + '</div>' : '') +
      '<div class="modal-details-grid">' + detailsCards.join('') + '</div>';
  }

  overlay.classList.add('active');
  if (document.documentElement) document.documentElement.classList.add('modal-open');
  if (document.body) document.body.classList.add('modal-open');
}

function setDynamicModalScrollLock(isOpen) {
  if (typeof document === 'undefined') return;
  if (isOpen) {
    if (document.documentElement) document.documentElement.classList.add('modal-open');
    if (document.body) document.body.classList.add('modal-open');
  } else if (!document.querySelector('.modal-overlay.active')) {
    if (document.documentElement) document.documentElement.classList.remove('modal-open');
    if (document.body) document.body.classList.remove('modal-open');
  }
}

function closeGuideShopItemModal() {
  var overlay = document.getElementById('shopItemModalOverlay');
  if (overlay) overlay.classList.remove('active');
  setDynamicModalScrollLock(false);
}

var _lastGuideSnapshotState = { type: 'tree', dataUrl: '', blob: null, canvas: null };

function drawCanvasRoundRect(ctx, x, y, w, h, r) {
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

function fitCanvasText(ctx, text, maxW) {
  var s = String(text || '');
  if (ctx.measureText(s).width <= maxW) return s;
  var ell = '…';
  while (s.length > 1 && ctx.measureText(s + ell).width > maxW) {
    s = s.slice(0, -1);
  }
  return s + ell;
}

function drawCanvasPill(ctx, x, y, text, bgColor, borderColor, textColor, padX, height, fontSpec) {
  ctx.font = fontSpec || '700 11px Inter, "Segoe UI", system-ui, sans-serif';
  var tw = ctx.measureText(text).width;
  var pw = tw + padX * 2;
  drawCanvasRoundRect(ctx, x, y, pw, height, 6);
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

function drawCanvasCoinText(ctx, x, y, text, textColor, fontSpec) {
  ctx.font = fontSpec || '700 12.5px Inter, "Segoe UI", system-ui, sans-serif';
  ctx.beginPath();
  ctx.arc(x + 5, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 15, y + 0.5);
  return 15 + ctx.measureText(text).width;
}

function renderGuideTableSnapshotCanvas(type) {
  var resolvedType = (type === 'line') ? 'line' : 'tree';
  var totals = computeGuideTotals(resolvedType);
  var st = getGuideRangeState(resolvedType);
  var rows = totals.rows;
  var fromRow = rows[st.from - 1];
  var toRow = rows[st.to - 1];
  var isMaxFrom = (st.from === 20);

  var rangeCost = 0;
  var rangeHours = 0;
  for (var i = st.from; i < st.to; i++) {
    rangeCost += rows[i].item.price;
    rangeHours += rows[i].hours;
  }
  var pctOfTotal = totals.totalPrice > 0 ? Math.round((rangeCost / totals.totalPrice) * 100) : 0;

  var W = 1160;
  var PAD = 28;
  var TABLE_W = W - PAD * 2;
  var Y_HDR = 24;
  var HDR_H = 74;
  var Y_CARDS = Y_HDR + HDR_H;
  var CARDS_H = 82;
  var Y_TABLE = Y_CARDS + CARDS_H + 16;
  var TH_H = 40;
  var ROW_H = 44;
  var TABLE_H = TH_H + rows.length * ROW_H;
  var FOOT_H = 38;
  var H = Y_TABLE + TABLE_H + FOOT_H;

  var dpr = 2;
  var canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  var fontFamily = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';

  // Background
  var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0b1120');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top accent stripe
  ctx.fillStyle = resolvedType === 'tree' ? '#10b981' : '#f59e0b';
  ctx.fillRect(0, 0, W, 4);

  // Header left: title & subtitle
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 22px ' + fontFamily;
  var titleStr = t(resolvedType === 'tree' ? 'guide_banner_title_tree' : 'guide_banner_title_line');
  ctx.fillText(fitCanvasText(ctx, titleStr, 760), PAD, Y_HDR + 24);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12.5px ' + fontFamily;
  var descStr = t(resolvedType === 'tree' ? 'guide_calc_desc_tree' : 'guide_calc_desc_line');
  ctx.fillText(fitCanvasText(ctx, descStr, 760), PAD, Y_HDR + 48);

  // Header right: site branding + current date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 13.5px ' + fontFamily;
  ctx.fillText('FISHAO Tracker • fishao-tracker.cz', W - PAD, Y_HDR + 22);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11.5px ' + fontFamily;
  var dateLabel = '';
  try { dateLabel = new Date().toLocaleDateString(getLocale()); } catch (e) { }
  ctx.fillText(dateLabel, W - PAD, Y_HDR + 44);
  ctx.textAlign = 'left';

  // Build 4 summary cards matching live calculator
  var cards;
  if (resolvedType === 'tree') {
    var deltaFc = toRow.item.fc - fromRow.item.fc;
    var deltaFb = toRow.item.fb - fromRow.item.fb;
    var totalYieldPayback = formatPaybackDays(rangeCost, toRow.item.fc);
    var deltaPayback = deltaFc > 0 ? formatPaybackDays(rangeCost, deltaFc) : null;
    var roiValText = isMaxFrom ? t('guide_max_level_reached') : totalYieldPayback.exactText;
    var roiSubText = isMaxFrom
      ? (toRow.item.fc + ' FC + ' + formatGuideInt(toRow.item.fb) + ' FB / ' + t('guide_per_day_short'))
      : (totalYieldPayback.harvestsText + (deltaPayback ? (' • +' + deltaFc + ' FC/d: ' + deltaPayback.exactText) : ''));

    cards = [
      {
        label: t('guide_calc_cost_label', { from: st.from, to: st.to }),
        val: formatGuideInt(rangeCost) + ' FC',
        sub: t('guide_calc_cost_share', { pct: pctOfTotal, total: formatGuideInt(totals.totalPrice) }),
        border: 'rgba(245, 158, 11, 0.45)',
        valColor: '#fbbf24',
        coin: true
      },
      {
        label: t('guide_calc_time_label'),
        val: formatUpgradeDuration(rangeHours, false),
        sub: t('guide_calc_steps_count', { count: st.to - st.from }),
        border: 'rgba(148, 163, 184, 0.3)',
        valColor: '#f8fafc',
        coin: false
      },
      {
        label: t('guide_calc_new_yield', { to: st.to }),
        val: toRow.item.fc + ' FC + ' + formatGuideInt(toRow.item.fb) + ' FB',
        sub: '+' + deltaFc + ' FC / +' + formatGuideInt(deltaFb) + ' FB ' + t('guide_per_day_short'),
        border: 'rgba(16, 185, 129, 0.45)',
        valColor: '#34d399',
        coin: false
      },
      {
        label: t('guide_calc_roi_label'),
        val: roiValText,
        sub: roiSubText,
        border: 'rgba(56, 189, 248, 0.45)',
        valColor: '#38bdf8',
        coin: false
      }
    ];
  } else {
    var deltaCm = toRow.item.length_cm - fromRow.item.length_cm;
    var colorNames = String(toRow.item.colors || '').split(',').map(function (c) {
      var k = c.trim().toLowerCase();
      return k ? t('guide_color_' + k) : '';
    }).filter(Boolean).join(', ');
    cards = [
      {
        label: t('guide_calc_cost_label', { from: st.from, to: st.to }),
        val: formatGuideInt(rangeCost) + ' FC',
        sub: t('guide_calc_cost_share', { pct: pctOfTotal, total: formatGuideInt(totals.totalPrice) }),
        border: 'rgba(245, 158, 11, 0.45)',
        valColor: '#fbbf24',
        coin: true
      },
      {
        label: t('guide_calc_time_label'),
        val: formatUpgradeDuration(rangeHours, false),
        sub: t('guide_calc_steps_count', { count: st.to - st.from }),
        border: 'rgba(148, 163, 184, 0.3)',
        valColor: '#f8fafc',
        coin: false
      },
      {
        label: t('guide_calc_line_len', { to: st.to }),
        val: formatGuideInt(toRow.item.length_cm) + ' cm',
        sub: '+' + formatGuideInt(deltaCm) + ' cm ' + t('guide_calc_vs_lvl', { from: st.from }),
        border: 'rgba(56, 189, 248, 0.45)',
        valColor: '#38bdf8',
        coin: false
      },
      {
        label: t('guide_calc_line_colors', { to: st.to }),
        val: colorNames,
        sub: 'Lvl ' + st.from + ' → Lvl ' + st.to,
        border: 'rgba(168, 85, 247, 0.4)',
        valColor: '#e2e8f0',
        coin: false
      }
    ];
  }

  var cardGap = 12;
  var cardW = (TABLE_W - cardGap * 3) / 4;
  for (var ci = 0; ci < cards.length; ci++) {
    var card = cards[ci];
    var cx = PAD + ci * (cardW + cardGap);
    drawCanvasRoundRect(ctx, cx, Y_CARDS, cardW, CARDS_H, 10);
    ctx.fillStyle = '#111a2e';
    ctx.fill();
    ctx.strokeStyle = card.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 10.5px ' + fontFamily;
    ctx.fillText(fitCanvasText(ctx, card.label.toUpperCase(), cardW - 24), cx + 12, Y_CARDS + 21);

    ctx.font = '800 17px ' + fontFamily;
    if (card.coin) {
      drawCanvasCoinText(ctx, cx + 12, Y_CARDS + 43, fitCanvasText(ctx, card.val, cardW - 40), card.valColor, ctx.font);
    } else {
      ctx.fillStyle = card.valColor;
      ctx.fillText(fitCanvasText(ctx, card.val, cardW - 24), cx + 12, Y_CARDS + 48);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 11px ' + fontFamily;
    ctx.fillText(fitCanvasText(ctx, card.sub, cardW - 24), cx + 12, Y_CARDS + 69);
  }

  // Table Container
  drawCanvasRoundRect(ctx, PAD, Y_TABLE, TABLE_W, TABLE_H, 12);
  ctx.fillStyle = '#101726';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  drawCanvasRoundRect(ctx, PAD, Y_TABLE, TABLE_W, TABLE_H, 12);
  ctx.clip();

  // Table Columns
  var cols = resolvedType === 'tree'
    ? [
        { x: PAD, w: 135, label: t('guide_col_level') },
        { x: PAD + 135, w: 135, label: t('guide_col_price_fc') },
        { x: PAD + 270, w: 140, label: t('guide_col_cum_price') },
        { x: PAD + 410, w: 125, label: t('guide_col_daily_fc') },
        { x: PAD + 535, w: 120, label: t('guide_col_daily_fb') },
        { x: PAD + 655, w: 205, label: t('guide_col_upgrade_time') },
        { x: PAD + 860, w: 244, label: t('guide_col_payback') }
      ]
    : [
        { x: PAD, w: 140, label: t('guide_col_level') },
        { x: PAD + 140, w: 140, label: t('guide_col_price_fc') },
        { x: PAD + 280, w: 145, label: t('guide_col_cum_price') },
        { x: PAD + 425, w: 175, label: t('guide_col_max_length') },
        { x: PAD + 600, w: 210, label: t('guide_col_upgrade_time') },
        { x: PAD + 810, w: 294, label: t('guide_col_colors') }
      ];

  // Table Header Bar
  ctx.fillStyle = '#0c121e';
  ctx.fillRect(PAD, Y_TABLE, TABLE_W, TH_H);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(PAD, Y_TABLE + TH_H);
  ctx.lineTo(PAD + TABLE_W, Y_TABLE + TH_H);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 11px ' + fontFamily;
  for (var hci = 0; hci < cols.length; hci++) {
    ctx.fillText(fitCanvasText(ctx, cols[hci].label.toUpperCase(), cols[hci].w - 16), cols[hci].x + 12, Y_TABLE + TH_H / 2 + 0.5);
  }

  var colorDotMap = {
    white: '#f8fafc',
    blue: '#38bdf8',
    green: '#10b981',
    grey: '#94a3b8',
    golden: '#fbbf24'
  };

  // Table Rows
  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri];
    var item = row.item;
    var prev = row.prev;
    var ry = Y_TABLE + TH_H + ri * ROW_H;
    var midY = ry + ROW_H / 2;

    var isCurrent = (item.level === st.from);
    var isInRange = (item.level > st.from && item.level <= st.to);
    var isTarget = (item.level === st.to);

    if (isCurrent) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.fillRect(PAD, ry, TABLE_W, ROW_H);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(PAD, ry, 4, ROW_H);
    } else if (isTarget) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.17)';
      ctx.fillRect(PAD, ry, TABLE_W, ROW_H);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(PAD, ry, 4, ROW_H);
    } else if (isInRange) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.09)';
      ctx.fillRect(PAD, ry, TABLE_W, ROW_H);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(PAD, ry, 4, ROW_H);
    } else if (ri % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(PAD, ry, TABLE_W, ROW_H);
    }

    if (ri < rows.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(PAD, ry + ROW_H);
      ctx.lineTo(PAD + TABLE_W, ry + ROW_H);
      ctx.stroke();
    }

    // Col 0: Level + tag
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 13px ' + fontFamily;
    var lvlLabel = 'Lvl ' + item.level;
    ctx.fillText(lvlLabel, cols[0].x + 12, midY);
    if (isCurrent) {
      drawCanvasPill(
        ctx,
        cols[0].x + 18 + ctx.measureText(lvlLabel).width,
        midY - 9,
        t('guide_tag_current').toUpperCase(),
        'rgba(16, 185, 129, 0.22)',
        'rgba(16, 185, 129, 0.5)',
        '#34d399',
        6,
        18,
        '800 9.5px ' + fontFamily
      );
    } else if (isTarget) {
      drawCanvasPill(
        ctx,
        cols[0].x + 18 + ctx.measureText(lvlLabel).width,
        midY - 9,
        t('guide_tag_target').toUpperCase(),
        'rgba(245, 158, 11, 0.22)',
        'rgba(245, 158, 11, 0.5)',
        '#fbbf24',
        6,
        18,
        '800 9.5px ' + fontFamily
      );
    }

    // Col 1: Price
    if (item.price === 0) {
      drawCanvasPill(
        ctx,
        cols[1].x + 12,
        midY - 10,
        fitCanvasText(ctx, t('guide_base_free'), cols[1].w - 28),
        'rgba(255, 255, 255, 0.06)',
        'rgba(255, 255, 255, 0.12)',
        '#94a3b8',
        8,
        20,
        '700 11px ' + fontFamily
      );
    } else {
      drawCanvasCoinText(ctx, cols[1].x + 12, midY, formatGuideInt(item.price) + ' FC', '#fbbf24', '800 12.5px ' + fontFamily);
    }

    // Col 2: Cum price
    drawCanvasCoinText(ctx, cols[2].x + 12, midY, formatGuideInt(row.cumPrice) + ' FC', '#cbd5e1', '700 12.5px ' + fontFamily);

    if (resolvedType === 'tree') {
      // Col 3: FC / day + step bump
      var fcTextW = drawCanvasCoinText(ctx, cols[3].x + 12, midY, item.fc + ' FC', '#fbbf24', '800 12.5px ' + fontFamily);
      if (prev && item.fc > prev.fc) {
        drawCanvasPill(
          ctx,
          cols[3].x + 18 + fcTextW,
          midY - 9,
          '+' + (item.fc - prev.fc),
          'rgba(16, 185, 129, 0.2)',
          'rgba(16, 185, 129, 0.35)',
          '#34d399',
          5,
          18,
          '800 10px ' + fontFamily
        );
      }

      // Col 4: FB / day
      ctx.fillStyle = '#34d399';
      ctx.font = '800 12.5px ' + fontFamily;
      ctx.textBaseline = 'middle';
      ctx.fillText(formatGuideInt(item.fb) + ' FB', cols[4].x + 12, midY);

      // Col 5: Upgrade time
      if (item.level === 1) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 12.5px ' + fontFamily;
        ctx.fillText('—', cols[5].x + 12, midY);
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 12px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, formatUpgradeDuration(row.hours, false), cols[5].w - 20), cols[5].x + 12, ry + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10.5px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, t('guide_cum_short') + ': ' + formatUpgradeDuration(row.cumHours, false), cols[5].w - 20), cols[5].x + 12, ry + 31);
      }

      // Col 6: Payback (ROI)
      if (item.level === 1 || item.price === 0 || item.fc <= 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 12.5px ' + fontFamily;
        ctx.fillText('—', cols[6].x + 12, midY);
      } else {
        var singleRoi = formatPaybackDays(item.price, item.fc);
        var cumRoi = formatPaybackDays(row.cumPrice, item.fc);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 12px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, singleRoi.exactText + ' (' + singleRoi.harvestsText + ')', cols[6].w - 20), cols[6].x + 12, ry + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10.5px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, t('guide_roi_from_lvl1', { days: cumRoi.exactText }), cols[6].w - 20), cols[6].x + 12, ry + 31);
      }
    } else {
      // Col 3: Max length
      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 13px ' + fontFamily;
      ctx.textBaseline = 'middle';
      var lenTxt = formatGuideInt(item.length_cm) + ' cm';
      ctx.fillText(lenTxt, cols[3].x + 12, midY);
      var lenDelta = prev ? (item.length_cm - prev.length_cm) : 0;
      if (lenDelta > 0) {
        var lenTw = ctx.measureText(lenTxt).width;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 11px ' + fontFamily;
        ctx.fillText('+' + formatGuideInt(lenDelta) + ' cm', cols[3].x + 18 + lenTw, midY);
      }

      // Col 4: Upgrade time
      if (item.level === 1) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 12.5px ' + fontFamily;
        ctx.fillText('—', cols[4].x + 12, midY);
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 12px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, formatUpgradeDuration(row.hours, false), cols[4].w - 20), cols[4].x + 12, ry + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10.5px ' + fontFamily;
        ctx.fillText(fitCanvasText(ctx, t('guide_cum_short') + ': ' + formatUpgradeDuration(row.cumHours, false), cols[4].w - 20), cols[4].x + 12, ry + 31);
      }

      // Col 5: Colors (dot + label chips)
      var colorTokens = String(item.colors || '').split(',').map(function (c) {
        return c.trim().toLowerCase();
      }).filter(Boolean);
      var cxOff = cols[5].x + 12;
      var maxRight = cols[5].x + cols[5].w - 10;
      ctx.font = '700 11px ' + fontFamily;
      for (var cti = 0; cti < colorTokens.length; cti++) {
        var cCode = colorTokens[cti];
        var cLabel = t('guide_color_' + cCode);
        var chipW = 14 + ctx.measureText(cLabel).width + 10;
        if (cxOff + chipW > maxRight && cti > 0) break;
        ctx.beginPath();
        ctx.arc(cxOff + 4.5, midY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = colorDotMap[cCode] || '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = (cCode === 'golden') ? '#fcd34d' : ((cCode === 'blue') ? '#7dd3fc' : ((cCode === 'green') ? '#6ee7b7' : '#e2e8f0'));
        ctx.fillText(cLabel, cxOff + 13, midY + 0.5);
        cxOff += chipW + 4;
      }
    }
  }

  ctx.restore();

  // Footer summary
  var footY = Y_TABLE + TABLE_H + 21;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11.5px ' + fontFamily;
  ctx.fillText(
    t('guide_stat_total_cost') + ': ' + formatGuideInt(totals.totalPrice) + ' FC  •  ' +
      t('guide_stat_total_time') + ': ' + formatUpgradeDuration(totals.totalHours, false),
    PAD,
    footY
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.fillText('fishao-tracker.cz', W - PAD, footY);
  ctx.textAlign = 'left';

  return canvas;
}

function ensureGuideSnapshotModalOverlay() {
  var overlay = document.getElementById('guideSnapshotModalOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'guideSnapshotModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'guideSnapshotModalTitle');
  overlay.onclick = function (e) {
    if (e.target === overlay) closeGuideSnapshotModal();
  };
  overlay.innerHTML =
    '<div class="modal-box guide-snapshot-modal-box">' +
      '<div class="modal-header">' +
        '<span class="modal-title" id="guideSnapshotModalTitle"></span>' +
        '<button type="button" class="modal-close" aria-label="Close" onclick="window.fishaoApp.closeGuideSnapshotModal()">×</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="guide-snapshot-preview-wrap">' +
          '<img id="guideSnapshotPreviewImg" class="guide-snapshot-preview-img" alt="">' +
        '</div>' +
        '<div class="guide-snapshot-actions">' +
          '<button type="button" id="guideSnapshotCopyBtn" class="pill-btn" onclick="window.fishaoApp.copyGuideSnapshotToClipboard()">' +
            escapeHtml(t('guide_snapshot_copy_btn')) +
          '</button>' +
          '<button type="button" id="guideSnapshotDownloadBtn" class="pill-btn active" onclick="window.fishaoApp.downloadGuideSnapshotPng()">' +
            escapeHtml(t('guide_snapshot_download_btn')) +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function openGuideSnapshotModal(optType) {
  if (typeof document === 'undefined') return;
  var type = (optType === 'line' || optType === 'tree')
    ? optType
    : (currentGuideSubTab === 'line' ? 'line' : 'tree');

  var canvas = renderGuideTableSnapshotCanvas(type);
  var dataUrl = canvas.toDataURL('image/png');
  _lastGuideSnapshotState = { type: type, dataUrl: dataUrl, blob: null, canvas: canvas };
  if (typeof canvas.toBlob === 'function') {
    canvas.toBlob(function (blob) {
      if (_lastGuideSnapshotState.canvas === canvas) {
        _lastGuideSnapshotState.blob = blob;
      }
    }, 'image/png');
  }

  var overlay = ensureGuideSnapshotModalOverlay();
  var titleText = t(type === 'line' ? 'guide_snapshot_modal_title_line' : 'guide_snapshot_modal_title_tree');
  var titleEl = document.getElementById('guideSnapshotModalTitle');
  var imgEl = document.getElementById('guideSnapshotPreviewImg');
  var copyBtn = document.getElementById('guideSnapshotCopyBtn');
  var dlBtn = document.getElementById('guideSnapshotDownloadBtn');

  if (titleEl) titleEl.textContent = titleText;
  if (imgEl) {
    imgEl.src = dataUrl;
    imgEl.alt = titleText;
  }
  if (copyBtn) {
    copyBtn.textContent = t('guide_snapshot_copy_btn');
    copyBtn.style.display = (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem === 'function') ? '' : 'none';
  }
  if (dlBtn) dlBtn.textContent = t('guide_snapshot_download_btn');

  overlay.classList.add('active');
  setDynamicModalScrollLock(true);
}

function closeGuideSnapshotModal() {
  var overlay = document.getElementById('guideSnapshotModalOverlay');
  if (overlay) overlay.classList.remove('active');
  setDynamicModalScrollLock(false);
}

function downloadGuideSnapshotPng() {
  if (!_lastGuideSnapshotState.dataUrl || typeof document === 'undefined') return;
  var fname = _lastGuideSnapshotState.type === 'line'
    ? 'fishao-line-upgrades.png'
    : 'fishao-tree-upgrades.png';
  var a = document.createElement('a');
  a.href = _lastGuideSnapshotState.dataUrl;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof showToast === 'function') {
    showToast(t('guide_snapshot_downloaded_toast'), 'success');
  }
}

async function copyGuideSnapshotToClipboard() {
  if (!_lastGuideSnapshotState.dataUrl) return;
  try {
    var blob = _lastGuideSnapshotState.blob;
    if (!blob && _lastGuideSnapshotState.canvas && typeof _lastGuideSnapshotState.canvas.toBlob === 'function') {
      blob = await new Promise(function (resolve) {
        _lastGuideSnapshotState.canvas.toBlob(resolve, 'image/png');
      });
    }
    if (!blob || !navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem !== 'function') {
      downloadGuideSnapshotPng();
      return;
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    if (typeof showToast === 'function') {
      showToast(t('guide_snapshot_copied_toast'), 'success');
    }
  } catch (err) {
    console.warn('Could not copy table snapshot to clipboard:', err);
    downloadGuideSnapshotPng();
  }
}

function renderGuideView(subType) {
  var snapBtn = document.getElementById('guideSnapshotBtn');
  if (subType === 'shop') {
    currentGuideSubTab = 'shop';
    if (snapBtn) snapBtn.style.display = 'none';
    renderGuideShopBanner();
    renderGuideShopToolbar();
    renderGuideShopTable();
    return;
  }
  if (subType === 'decorations') {
    currentGuideSubTab = 'decorations';
    if (snapBtn) snapBtn.style.display = 'none';
    renderGuideShopBanner();
    renderGuideDecorationsToolbar();
    renderGuideDecorationsTable();
    return;
  }
  if (snapBtn) snapBtn.style.display = '';
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
