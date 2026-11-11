/**
 * FISHAO - Generic Firestore transaction helpers (js/firestore-tx.js)
 * -------------------------------------------------------------
 * Small, application-agnostic helpers around Firestore transactions.
 * This file intentionally knows nothing about fish, prices, collections,
 * documents or field names. Callers provide the db, the document reference
 * and the data/modifier callback they need.
 *
 * Exposed API (window.FISHAO_FS_TX):
 *   readModifyWrite(db, docRef, modifier) -> Promise<result>
 *   setDocument(db, docRef, data)         -> Promise<data>
 */

(function () {
  "use strict";

  var FIRESTORE_MODULE_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  var firestoreModulePromise = null;

  function loadFirestoreModule() {
    if (!firestoreModulePromise) {
      firestoreModulePromise = import(FIRESTORE_MODULE_URL);
    }
    return firestoreModulePromise;
  }

  /**
   * Reads a document, lets the caller compute the next state, and writes it
   * atomically when the caller asks for a write.
   *
   * modifier(currentData) must return one of:
   *   { write: false, result: <any> }
   *   { write: true, data: <object>, result: <any> }
   *
   * currentData is null when the document does not exist.
   * The returned promise resolves to modifier's `result`.
   */
  async function readModifyWrite(db, docRef, modifier) {
    if (!db || !docRef) {
      throw new Error("readModifyWrite requires a Firestore db and a document reference.");
    }
    if (typeof modifier !== "function") {
      throw new Error("readModifyWrite requires a modifier function.");
    }

    var fs = await loadFirestoreModule();

    return fs.runTransaction(db, async function (tx) {
      var snap = await tx.get(docRef);
      var currentData = snap.exists() ? snap.data() : null;
      var outcome = await modifier(currentData);

      if (outcome && outcome.write) {
        if (!outcome.data || typeof outcome.data !== "object") {
          throw new Error("readModifyWrite modifier requested a write without a data object.");
        }
        tx.set(docRef, outcome.data);
      }

      return outcome ? outcome.result : null;
    });
  }

  /**
   * Atomically overwrites a document with the supplied data.
   */
  async function setDocument(db, docRef, data) {
    if (!db || !docRef) {
      throw new Error("setDocument requires a Firestore db and a document reference.");
    }
    if (!data || typeof data !== "object") {
      throw new Error("setDocument requires a data object.");
    }

    var fs = await loadFirestoreModule();
    var payload = data;

    return fs.runTransaction(db, async function (tx) {
      tx.set(docRef, payload);
      return payload;
    });
  }

  window.FISHAO_FS_TX = {
    loadFirestoreModule: loadFirestoreModule,
    readModifyWrite: readModifyWrite,
    setDocument: setDocument
  };
})();
