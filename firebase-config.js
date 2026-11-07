/**
 * FISHAO - Firebase Configuration (firebase-config.js)
 * ----------------------------------------------------
 * Connects the web application to Google Firebase Firestore and Authentication.
 * When config values are missing, the app automatically falls back to local storage.
 */

window.FISHAO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDs2oM6fkWA7ZfQ-PxqO2LGA9Ag1F9aWmI",
  authDomain: "fishao-fun.firebaseapp.com",
  projectId: "fishao-fun",
  storageBucket: "fishao-fun.firebasestorage.app",
  messagingSenderId: "296328872199",
  appId: "1:296328872199:web:536fd056974653812845a2",
  measurementId: "G-5H57J3WS9V"
};

/**
 * Checks whether valid Firebase credentials have been configured.
 * @returns {boolean}
 */
window.isFirebaseConfigured = function() {
  var cfg = window.FISHAO_FIREBASE_CONFIG;
  return Boolean(
    cfg &&
    cfg.apiKey &&
    cfg.projectId &&
    cfg.apiKey !== "" &&
    cfg.apiKey !== "SEM_VLOZ_API_KEY"
  );
};
