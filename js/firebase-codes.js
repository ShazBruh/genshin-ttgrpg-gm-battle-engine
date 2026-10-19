/* ============================================================
   firebase-codes.js
   CRUD + live subscription for the /teyvat/codes tree.

   All reads and writes are wrapped in a timeout so an
   unreachable RTDB can't hang boot. On timeout, we log a
   warning and fall back to codes.json / local state.
   ============================================================ */

import { ensureFirebase, getDB, PATHS } from './firebase-config.js';

function sdk() { return window.__firebaseSDK || null; }

const FB_TIMEOUT_MS = 2500;

/**
 * Race a promise against a timeout. Rejects with a labelled
 * error if the promise doesn't settle in time.
 */
function withTimeout(promise, ms, label) {
  let timer = null;
  return new Promise((resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out (${ms}ms)`)),
      ms
    );
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

/* ============================================================
   READ
   ============================================================ */

export async function fetchAllCodes() {
  const ok = await ensureFirebase();
  if (!ok) return {};
  const { ref, get } = sdk();
  const db = getDB();
  if (!db) return {};
  try {
    const snap = await withTimeout(
      get(ref(db, PATHS.codes)),
      FB_TIMEOUT_MS,
      '[firebase-codes] fetchAllCodes'
    );
    return snap.val() || {};
  } catch (err) {
    console.warn('[firebase-codes] fetchAllCodes failed:', err.message || err);
    return {};
  }
}

export async function fetchCode(codeKey) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) return null;
  const ok = await ensureFirebase();
  if (!ok) return null;
  const { ref, get } = sdk();
  const db = getDB();
  if (!db) return null;
  try {
    const snap = await withTimeout(
      get(ref(db, `${PATHS.codes}/${key}`)),
      FB_TIMEOUT_MS,
      '[firebase-codes] fetchCode'
    );
    return snap.val();
  } catch (err) {
    console.warn('[firebase-codes] fetchCode failed:', err.message || err);
    return null;
  }
}

/* ============================================================
   WRITE
   ============================================================ */

// firebase-codes.js — replace writeCode
export async function writeCode(codeKey, data) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) throw new Error('Empty code');
  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');
  const { ref, get, set } = sdk();
  const db = getDB();

  // Reject overwrite of existing codes
  const existing = await withTimeout(
    get(ref(db, `${PATHS.codes}/${key}`)),
                                     FB_TIMEOUT_MS, '[firebase-codes] writeCode-check'
  );
  if (existing && existing.val && existing.val()) {
    throw new Error(`Code ${key} already exists.`);
  }

  const payload = {
    role: String(data.role || 'player'),
    name: String(data.name || key)
  };
  await withTimeout(
    set(ref(db, `${PATHS.codes}/${key}`), payload),
                    FB_TIMEOUT_MS, '[firebase-codes] writeCode'
  );
  return true;
}

export async function updateCode(codeKey, patch) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) throw new Error('Empty code');
  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');
  const { ref, update } = sdk();
  const db = getDB();
  await withTimeout(
    update(ref(db, `${PATHS.codes}/${key}`), patch),
    FB_TIMEOUT_MS,
    '[firebase-codes] updateCode'
  );
  return true;
}

export async function deleteCode(codeKey) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) throw new Error('Empty code');
  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');
  const { ref, remove } = sdk();
  const db = getDB();
  await withTimeout(
    remove(ref(db, `${PATHS.codes}/${key}`)),
    FB_TIMEOUT_MS,
    '[firebase-codes] deleteCode'
  );
  return true;
}

/* ============================================================
   SUBSCRIBE — non-blocking; no timeout needed
   ============================================================ */

export async function subscribeCodes(onCodes) {
  const ok = await ensureFirebase();
  if (!ok) { try { onCodes({}); } catch { /* ignore */ } return () => {}; }
  const { ref, onValue } = sdk();
  const db = getDB();
  if (!db) return () => {};
  return onValue(ref(db, PATHS.codes), (snap) => {
    try { onCodes(snap.val() || {}); }
    catch (err) { console.warn('[firebase-codes] onCodes threw:', err); }
  });
}

export async function subscribeCode(codeKey, onCode) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) return () => {};
  const ok = await ensureFirebase();
  if (!ok) return () => {};
  const { ref, onValue } = sdk();
  const db = getDB();
  if (!db) return () => {};
  return onValue(ref(db, `${PATHS.codes}/${key}`), (snap) => {
    try { onCode(snap.val()); }
    catch (err) { console.warn('[firebase-codes] onCode threw:', err); }
  });
}
