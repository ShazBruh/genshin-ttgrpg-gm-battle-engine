/* ============================================================
 *  firebase-state.js
 *  State sync — GM publishes, players subscribe.
 *
 *  Changes in this version:
 *  - Stale sample entities (Keqing/Diluc from old boots) are
 *    stripped the moment they arrive, so the publisher naturally
 *    overwrites Firebase with a clean roster.
 *  - `eventSeq` is a monotonic counter that survives the round
 *    trip, so the player can reliably tell "new event" from
 *    "same event re-sent".
 *  ============================================================ */

import { ensureFirebase, getDB, PATHS } from './firebase-config.js';
import { normalizeEntity, normalizeCore, isCore, isStaleSampleEntity } from './data.js';

function sdk() {
  return window.__firebaseSDK || null;
}

/* ============================================================
 *  PUBLISH
 *  ============================================================ */

let lastPublishedHash = '';

function serializeState(state) {
  return {
    entities:      state.entities,
    round:         state.round,
    turnIndex:     state.turnIndex,
    history:       state.history,
    logEntries:    state.logEntries,
    lastEvent:     state.lastEvent || null,
    pendingEvents: Array.isArray(state.pendingEvents) ? state.pendingEvents : [],
    eventSeq:      state.eventSeq || 0
    // NOTE: lastUpdate intentionally excluded from the dedup hash
  };
}

export async function publishState(state) {
  const ok = await ensureFirebase();
  if (!ok) return false;

  const { ref, set } = sdk();
  const db = getDB();
  if (!db) return false;

  let payload;
  try { payload = serializeState(state); }
  catch { return false; }

  const hash = JSON.stringify(payload);
  if (hash === lastPublishedHash) return false;
  lastPublishedHash = hash;

  try {
    // Stamp the timestamp *after* the dedup check so it never causes a
    // spurious "changed" signal.
    payload.lastUpdate = Date.now();
    await set(ref(db, PATHS.state), payload);
    return true;
  } catch (err) {
    console.warn('[firebase-state] publish failed:', err);
    lastPublishedHash = '';
    return false;
  }
}

export function invalidatePublishCache() {
  lastPublishedHash = '';
}

/* ============================================================
 *  SUBSCRIBE
 *  ============================================================ */

export async function subscribeState(onState) {
  const ok = await ensureFirebase();
  if (!ok) {
    try { onState(null); } catch { /* ignore */ }
    return () => {};
  }

  const { ref, onValue } = sdk();
  const db = getDB();
  if (!db) return () => {};

  return onValue(
    ref(db, PATHS.state),
                 (snap) => { try { onState(snap.val()); } catch (e) { console.warn(e); } },
                 (err) => {
                   console.warn('[firebase-state] subscribe error:', err);
                   try { onState(null); } catch { /* ignore */ }
                 }
  );
}

/* ============================================================
 *  BACKGROUND
 *  ============================================================ */

export async function publishBackground(payload) {
  const ok = await ensureFirebase();
  if (!ok) return false;

  const { ref, set } = sdk();
  const db = getDB();
  if (!db) return false;

  try {
    await set(ref(db, PATHS.background), payload || null);
    console.info('[firebase-state] background published:', payload ? 'image set' : 'cleared');
    return true;
  } catch (err) {
    console.warn('[firebase-state] background publish failed:', err);
    return false;
  }
}

export async function subscribeBackground(onBg) {
  const ok = await ensureFirebase();
  if (!ok) return () => {};

  const { ref, onValue } = sdk();
  const db = getDB();
  if (!db) return () => {};

  return onValue(ref(db, PATHS.background), (snap) => {
    try { onBg(snap.val()); }
    catch (err) { console.warn('[firebase-state] onBg threw:', err); }
  });
}

/* ============================================================
 *  APPLY HELPER — with schema re-normalization + sample cleanup
 *  ============================================================ */

function normalizeIncomingEntity(raw) {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.type === 'core') {
    const c = normalizeCore(
      Number(raw.spawn_round) || 1,
                            String(raw.name || 'Dendro Core')
    );
    if (raw.id) c.id = String(raw.id);
    c.hp_current    = Number(raw.hp_current) || c.hp_current;
    c.expires_round = Number(raw.expires_round) || c.expires_round;
    c.stacks        = Number(raw.stacks) || 1; // <-- ADDED
    return c;
  }

  return normalizeEntity(raw);
}

export function applyIncomingState(state, payload) {
  if (!payload) return false;

  const rawEntities = Array.isArray(payload.entities) ? payload.entities : [];

  // Drop legacy auto-loaded sample entities so they never come back.
  let stripped = 0;
  const filtered = rawEntities.filter(raw => {
    if (isStaleSampleEntity(raw)) { stripped++; return false; }
    return true;
  });
  if (stripped > 0) {
    console.info(`[firebase-state] Purged ${stripped} stale sample entit${stripped === 1 ? 'y' : 'ies'}.`);
  }

  const normalized = filtered.map(normalizeIncomingEntity).filter(Boolean);

  state.entities   = normalized;
  state.round      = Number(payload.round)             || 1;
  state.turnIndex  = Number(payload.turnIndex)         || 0;
  state.history    = Array.isArray(payload.history)    ? payload.history    : [];
  state.logEntries = Array.isArray(payload.logEntries) ? payload.logEntries : [];
  state.lastEvent  = (payload.lastEvent && typeof payload.lastEvent === 'object')
  ? payload.lastEvent
  : null;
  state.pendingEvents = Array.isArray(payload.pendingEvents) ? payload.pendingEvents : [];
  state.eventSeq   = Number(payload.eventSeq) || 0;

  if (state.entities.length > 0) {
    state.turnIndex = Math.max(0, Math.min(state.turnIndex, state.entities.length - 1));
  } else {
    state.turnIndex = 0;
  }

  return true;
}

/* ============================================================
 *  ONE-SHOT READ
 *  ============================================================ */

export async function fetchStateOnce() {
  const ok = await ensureFirebase();
  if (!ok) return null;

  const { ref, get } = sdk();
  const db = getDB();
  if (!db) return null;

  try {
    const snap = await get(ref(db, PATHS.state));
    return snap.val();
  } catch (err) {
    console.warn('[firebase-state] fetchStateOnce failed:', err);
    return null;
  }
}

/* ============================================================
 *  NUKE
 *  ============================================================ */

export async function nukeRemoteState() {
  const ok = await ensureFirebase();
  if (!ok) return false;

  const { ref, remove } = sdk();
  const db = getDB();
  if (!db) return false;

  try {
    await remove(ref(db, PATHS.state));
    lastPublishedHash = '';
    return true;
  } catch (err) {
    console.warn('[firebase-state] nukeRemoteState failed:', err);
    return false;
  }
}
