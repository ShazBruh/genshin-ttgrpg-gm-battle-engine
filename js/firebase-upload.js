/* ============================================================
   firebase-upload.js
   Player upload lifecycle (approve / reject / reset).

   Uses set()/remove() on the exact path we care about instead
   of the broader update() call — update() does an incremental
   merge of nested keys which silently drops empty arrays and
   can fail without a clear error if any child value confuses
   the RTDB serializer.
   ============================================================ */

import { ensureFirebase, getDB, PATHS } from './firebase-config.js';

function sdk() { return window.__firebaseSDK || null; }

/**
 * Recursively strip undefined values so the RTDB serializer
 * never rejects the payload. Firebase rejects any object with
 * an `undefined` value at any depth.
 */
function sanitizeForFirebase(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeForFirebase);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[k] = sanitizeForFirebase(v);
  }
  return out;
}

function codePath(codeKey) {
  const key = String(codeKey || '').trim().toUpperCase();
  if (!key) throw new Error('Missing code');
  return key;
}

/* ============================================================
   PLAYER SIDE
   ============================================================ */

export async function submitUpload(codeKey, entity) {
  const key = codePath(codeKey);

  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');

  const { ref, set } = sdk();
  const db = getDB();
  if (!db) throw new Error('No database handle');

  const safe = sanitizeForFirebase(entity);
  console.info('[firebase-upload] submitUpload →', key);

  await set(ref(db, `${PATHS.codes}/${key}/pendingEntity`), safe);
  return true;
}

export async function cancelUpload(codeKey) {
  let key;
  try { key = codePath(codeKey); } catch { return false; }

  const ok = await ensureFirebase();
  if (!ok) return false;

  const { ref, remove } = sdk();
  const db = getDB();
  if (!db) return false;

  try {
    await remove(ref(db, `${PATHS.codes}/${key}/pendingEntity`));
    return true;
  } catch { return false; }
}

/* ============================================================
   GM SIDE
   ============================================================ */

export async function approveUpload(codeKey, newEntityId) {
  const key = codePath(codeKey);

  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');

  const { ref, set, remove } = sdk();
  const db = getDB();
  if (!db) throw new Error('No database handle');

  await set(ref(db, `${PATHS.codes}/${key}/ownerEntityId`), newEntityId);
  await remove(ref(db, `${PATHS.codes}/${key}/pendingEntity`));
  return true;
}

export async function rejectUpload(codeKey) {
  const key = codePath(codeKey);

  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');

  const { ref, remove } = sdk();
  const db = getDB();
  if (!db) throw new Error('No database handle');

  await remove(ref(db, `${PATHS.codes}/${key}/pendingEntity`));
  return true;
}

export async function resetPlayerUpload(codeKey) {
  const key = codePath(codeKey);

  const ok = await ensureFirebase();
  if (!ok) throw new Error('Firebase unavailable');

  const { ref, remove } = sdk();
  const db = getDB();
  if (!db) throw new Error('No database handle');

  await remove(ref(db, `${PATHS.codes}/${key}/ownerEntityId`));
  await remove(ref(db, `${PATHS.codes}/${key}/pendingEntity`));
  return true;
}