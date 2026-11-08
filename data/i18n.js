/**
 * FISHAO – Internationalization (i18n) Core Module
 * Orchestrates localized strings (UI CS/EN, game taxonomies, fish names).
 * Maintains backwards-compatible FISHAO_I18N API.
 */
(function () {
  'use strict';

  var storageKey = 'fishao_lang';
  var supportedLanguages = ['cs', 'en'];

  // In Node.js or if modules not attached to window yet, support CommonJS require
  var ui_cs = (typeof window !== 'undefined' && window.FISHAO_I18N_UI_CS) || null;
  var ui_en = (typeof window !== 'undefined' && window.FISHAO_I18N_UI_EN) || null;
  var taxonomies = (typeof window !== 'undefined' && window.FISHAO_I18N_TAXONOMIES) || null;
  var fishNames = (typeof window !== 'undefined' && window.FISHAO_I18N_FISH_NAMES) || null;

  if (typeof require !== 'undefined') {
    try {
      if (!ui_cs) ui_cs = require('./i18n/ui_cs.js');
      if (!ui_en) ui_en = require('./i18n/ui_en.js');
      if (!taxonomies) taxonomies = require('./i18n/taxonomies.js');
      if (!fishNames) fishNames = require('./i18n/fish_names.js');
    } catch (e) {
      // Ignore if require not available
    }
  }

  var FISHAO_I18N = {
    currentLang: (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) || 'cs',

    ui: {
      cs: ui_cs || {},
      en: ui_en || {}
    },

    baits: (taxonomies && taxonomies.baits) || {},
    waters: (taxonomies && taxonomies.waters) || {},
    locations: (taxonomies && taxonomies.locations) || {},
    fishes: fishNames || {},

    t: function (key, params, fallback) {
      if (!key) return '';
      var lang = FISHAO_I18N.currentLang || 'cs';
      var dict = (FISHAO_I18N.ui && FISHAO_I18N.ui[lang]) || (FISHAO_I18N.ui && FISHAO_I18N.ui.cs) || {};
      var val = dict[key];

      // Fallback to CS if missing in active language
      if (val === undefined && FISHAO_I18N.ui && FISHAO_I18N.ui.cs) {
        val = FISHAO_I18N.ui.cs[key];
      }

      // If still missing, check fallback or params as string
      if (val === undefined) {
        if (typeof params === 'string') {
          val = params;
        } else if (typeof fallback === 'string') {
          val = fallback;
        } else {
          val = key;
        }
      }

      // Parameter interpolation e.g. {count}, {caught}, {total}, {date}
      var actualParams = (params && typeof params === 'object') ? params : (fallback && typeof fallback === 'object' ? fallback : null);
      if (actualParams && typeof val === 'string') {
        Object.keys(actualParams).forEach(function (p) {
          var re = new RegExp('\{' + p + '\}', 'g');
          val = val.replace(re, actualParams[p]);
        });
      }
      return val;
    },

    getFishName: function (fish, lang) {
      if (!fish) return '';
      var id = (typeof fish === 'object') ? fish.id : fish;
      var fallback = (typeof fish === 'object' && fish.name) ? fish.name : ('Ryba #' + id);
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.fishes && FISHAO_I18N.fishes[id] && FISHAO_I18N.fishes[id][lang]) {
        return FISHAO_I18N.fishes[id][lang];
      }
      return fallback;
    },

    getLocationName: function (loc, lang) {
      if (!loc) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.locations && FISHAO_I18N.locations[loc] && FISHAO_I18N.locations[loc][lang]) {
        return FISHAO_I18N.locations[loc][lang];
      }
      return loc;
    },

    getBaitName: function (bait, lang) {
      if (!bait) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.baits && FISHAO_I18N.baits[bait] && FISHAO_I18N.baits[bait][lang]) {
        return FISHAO_I18N.baits[bait][lang];
      }
      return bait;
    },

    getWaterName: function (water, lang) {
      if (!water) return '';
      lang = lang || FISHAO_I18N.currentLang || 'cs';
      if (FISHAO_I18N.waters && FISHAO_I18N.waters[water] && FISHAO_I18N.waters[water][lang]) {
        return FISHAO_I18N.waters[water][lang];
      }
      return water;
    }
  };

  if (supportedLanguages.indexOf(FISHAO_I18N.currentLang) === -1) {
    FISHAO_I18N.currentLang = 'cs';
  }

  if (typeof window !== 'undefined') {
    window.FISHAO_I18N = FISHAO_I18N;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FISHAO_I18N;
  }
})();
