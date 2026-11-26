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
 *   runTx(db, fn)                         -> Promise<result>
 *   commitBatch(db, fn)                   -> Promise<result>
 */

(function () {
  "use strict";

  var FIRESTORE_MODULE_URL = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  var rawModulePromise = null;
  var firestoreModulePromise = null;

  // Firestore exports that return a Promise and whose rejection must be
  // checked for quota ("resource-exhausted") and availability errors.
  var PROMISE_FNS = {
    getDoc: true,
    getDocs: true,
    getDocFromCache: true,
    getDocsFromCache: true,
    getDocFromServer: true,
    getDocsFromServer: true,
    runTransaction: true,
    setDoc: true,
    updateDoc: true,
    deleteDoc: true,
    addDoc: true
  };

  function reportFirestoreAvailabilityError(err) {
    try {
      if (typeof window === "undefined") return;
      var matcher = (typeof window.isFirestoreAvailabilityError === "function")
        ? window.isFirestoreAvailabilityError
        : window.isFirestoreQuotaError;
      if (typeof matcher === "function" && matcher(err) &&
          typeof window.showHeavyLoadBanner === "function") {
        window.showHeavyLoadBanner();
      }
    } catch (e) { /* never let the banner break data loading */ }
  }

  function wrapPromiseCall(original, thisArg, args) {
    var result;
    try {
      result = original.apply(thisArg, args);
    } catch (err) {
      reportFirestoreAvailabilityError(err);
      throw err;
    }
    if (result && typeof result.then === "function") {
      return result.then(function (value) { return value; }, function (err) {
        reportFirestoreAvailabilityError(err);
        throw err;
      });
    }
    return result;
  }

  function wrapSnapshotCall(original, thisArg, args) {
    var nextArgs = Array.prototype.slice.call(args);

    // onSnapshot(ref, { next, error, complete })
    if (nextArgs[1] && typeof nextArgs[1] === "object" && typeof nextArgs[1].next === "function") {
      var observer = nextArgs[1];
      nextArgs[1] = {
        next: function (snap) { return observer.next.call(observer, snap); },
        error: function (err) {
          reportFirestoreAvailabilityError(err);
          if (typeof observer.error === "function") return observer.error.call(observer, err);
        },
        complete: function () {
          if (typeof observer.complete === "function") return observer.complete.call(observer);
        }
      };
    } else if (typeof nextArgs[2] === "function") {
      // onSnapshot(ref, next, error, complete)
      var originalError = nextArgs[2];
      nextArgs[2] = function (err) {
        reportFirestoreAvailabilityError(err);
        return originalError.apply(this, arguments);
      };
    }

    return original.apply(thisArg, nextArgs);
  }

  /**
   * Wraps the Firestore module so quota / availability errors surface to the
   * UI banner. A Proxy keeps the module fully transparent for every consumer.
   */
  function wrapFirestoreModule(mod) {
    if (!mod || typeof Proxy === "undefined") return mod;
    return new Proxy(mod, {
      get: function (target, prop, receiver) {
        var value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value;
        if (prop === "onSnapshot") {
          return function () { return wrapSnapshotCall(value, target, arguments); };
        }
        if (PROMISE_FNS[prop]) {
          return function () { return wrapPromiseCall(value, target, arguments); };
        }
        // Return classes (e.g. Timestamp with static Timestamp.fromMillis) and
        // standalone ES module helpers directly; .bind() would strip static methods.
        return value;
      }
    });
  }

  function loadFirestoreModule() {
    if (!firestoreModulePromise) {
      if (!rawModulePromise) {
        rawModulePromise = import(FIRESTORE_MODULE_URL);
      }
      firestoreModulePromise = rawModulePromise.then(wrapFirestoreModule);
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

  /**
   * Executes an arbitrary multi-document Firestore transaction callback(tx, fsModule).
   */
  async function runTx(db, fn) {
    if (!db) {
      throw new Error("runTx requires a Firestore db.");
    }
    if (typeof fn !== "function") {
      throw new Error("runTx requires a callback function.");
    }
    var fs = await loadFirestoreModule();
    return fs.runTransaction(db, function (tx) {
      return fn(tx, fs);
    });
  }

  /**
   * Executes an atomic Firestore writeBatch callback(batch, fsModule) and commits it.
   */
  async function commitBatch(db, fn) {
    if (!db) {
      throw new Error("commitBatch requires a Firestore db.");
    }
    if (typeof fn !== "function") {
      throw new Error("commitBatch requires a callback function.");
    }
    var fs = await loadFirestoreModule();
    var batch = fs.writeBatch(db);
    var result = await fn(batch, fs);
    try {
      await batch.commit();
    } catch (err) {
      reportFirestoreAvailabilityError(err);
      throw err;
    }
    return result;
  }

  window.FISHAO_FS_TX = {
    loadFirestoreModule: loadFirestoreModule,
    readModifyWrite: readModifyWrite,
    setDocument: setDocument,
    runTx: runTx,
    commitBatch: commitBatch
  };
})();
