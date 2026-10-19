/* ============================================================
   firebase-config.js
   Defensive Firebase initialization.
   If Firebase fails to load (network, wrong CDN, etc.), the
   exports become null and all Firebase calls no-op safely.
   The app still works — it just won't sync across devices.
   ============================================================ */

const firebaseConfig = {
  apiKey:            "AIzaSyBRPbAl49B6RKFXFhVYY6RE136aUfXLXUs",
  authDomain:        "altered-teyvat.firebaseapp.com",
  databaseURL:       "https://altered-teyvat-default-rtdb.asia-southeast1.firebasedatabase.app/",   // ← see below
  projectId:         "altered-teyvat",
  storageBucket:     "altered-teyvat.firebasestorage.app",
  messagingSenderId: "616439174110",
  appId:             "1:616439174110:web:371bb855aad7e93edb034f"
};

export const PATHS = {
  state:      'teyvat/state',
  codes:      'teyvat/codes',
  background: 'teyvat/background'
};

/* ---- Initialization happens LAZILY in an async function so that
        a network failure doesn't kill the whole app ---- */

let firebaseApp = null;
let firebaseDB  = null;
let initPromise = null;
let initFailed  = false;

const SDK_VERSION = '10.12.0';
const SDK_BASE    = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

async function doInit() {
  if (firebaseApp && firebaseDB) return true;
  if (initFailed) return false;

  try {
    const appMod = await import(`${SDK_BASE}/firebase-app.js`);
    const dbMod  = await import(`${SDK_BASE}/firebase-database.js`);

    firebaseApp = appMod.initializeApp(firebaseConfig);
    firebaseDB  = dbMod.getDatabase(firebaseApp);

    window.__firebaseSDK = {
      ref:         dbMod.ref,
      set:         dbMod.set,
      get:         dbMod.get,
      update:      dbMod.update,
      remove:      dbMod.remove,
      onValue:     dbMod.onValue,
      getDatabase: dbMod.getDatabase
    };

    console.info(
      '%c[Firebase]%c Initialized — project %caltered-teyvat%c.',
      'color:#fbbf24;font-weight:bold',
      'color:#94a3b8',
      'color:#86efac;font-family:monospace',
      'color:#94a3b8'
    );
    return true;
  } catch (err) {
    initFailed = true;
    console.warn('[Firebase] Could not initialize — running in offline mode.', err);
    return false;
  }
}

export function ensureFirebase() {
  if (firebaseApp && firebaseDB) return Promise.resolve(true);
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

export function getDB()   { return firebaseDB; }
export function getApp()  { return firebaseApp; }
export function isReady() { return !!(firebaseApp && firebaseDB); }
