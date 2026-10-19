/* ============================================================
   auth.js
   Code validation + role persistence.

   Codes come from two sources:
     1. Hardcoded CODES below (always available, GM-protected)
     2. Firebase /teyvat/codes (live, editable from the GM panel)
     3. codes.json (local fallback if Firebase is unreachable)

   Precedence: hardcoded > Firebase > codes.json
   ============================================================ */

import { fetchAllCodes, subscribeCodes } from '../js/firebase-codes.js';

export const ROLES = { GM: 'gm', PLAYER: 'player' };

const SAVED_KEY    = 'gm-engine-role-v1';
const ATTEMPTS_KEY = 'gm-engine-attempts-v1';
const MAX_ATTEMPTS = 3;

const CODES_JSON_URL = 'codes.json';

/* ---- Hardcoded codes (always available) ---- */
const CODES = {
  'SHAZWANS07': { role: 'gm', name: 'Game Master' }
};

/* ---- Runtime codes from Firebase + codes.json ---- */
let runtimeCodes = {};
let codesLoaded  = false;

/* ============================================================
   LOADING
   ============================================================ */

export async function loadCodes() {
  if (codesLoaded) return runtimeCodes;
  codesLoaded = true;

  /* --- Source 1: Firebase --- */
  try {
    const remote = await fetchAllCodes();
    for (const [rawKey, val] of Object.entries(remote || {})) {
      const key = String(rawKey || '').trim().toUpperCase();
      if (!key || CODES[key]) continue;
      if (!val || typeof val !== 'object') continue;
      runtimeCodes[key] = {
        role: val.role === 'gm' ? 'gm' : 'player',
        name: String(val.name || key)
      };
    }
  } catch (err) {
    console.warn('[auth] Firebase code load failed — falling back to codes.json.', err);
  }

  /* --- Source 2: codes.json fallback --- */
  try {
    const res = await fetch(CODES_JSON_URL, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const [rawKey, val] of Object.entries(data)) {
          const key = String(rawKey || '').trim().toUpperCase();
          if (!key || CODES[key] || runtimeCodes[key]) continue;
          if (!val || typeof val !== 'object') continue;
          runtimeCodes[key] = {
            role: val.role === 'gm' ? 'gm' : 'player',
            name: String(val.name || key)
          };
        }
      }
    }
  } catch { /* codes.json missing — ignore */ }

  return runtimeCodes;
}

/**
 * Live subscription to Firebase codes so the gate accepts codes
 * the GM adds during a session, without a page reload.
 */
/**
 * Live subscription to Firebase codes so the gate accepts codes
 * the GM adds during a session, without a page reload. Rebuilds
 * the whole runtimeCodes map from the snapshot so deletions
 * propagate immediately.
 */
export function subscribeLiveCodes() {
  subscribeCodes((remote) => {
    const next = {};
    for (const [rawKey, val] of Object.entries(remote || {})) {
      const key = String(rawKey || '').trim().toUpperCase();
      if (!key || CODES[key]) continue;
      if (!val || typeof val !== 'object') continue;
      next[key] = {
        role: val.role === 'gm' ? 'gm' : 'player',
        name: String(val.name || key)
      };
    }
    runtimeCodes = next;
  });
}

export function getRuntimeCodes() {
  return { ...CODES, ...runtimeCodes };
}

/* ============================================================
   PERSISTENCE
   ============================================================ */

export function getSavedRole() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.role) return null;
    return obj;
  } catch { return null; }
}

export function saveRole(role, name, code, extra = {}) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(
      Object.assign({ role, name, code }, extra)
    ));
  } catch { /* ignore */ }
}

export function clearRole() {
  try { localStorage.removeItem(SAVED_KEY); } catch { /* ignore */ }
}

/* ============================================================
   ATTEMPTS
   ============================================================ */

function getAttempts() {
  try { return parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10); }
  catch { return 0; }
}

function setAttempts(n) {
  try { sessionStorage.setItem(ATTEMPTS_KEY, String(n)); } catch { /* ignore */ }
}

export function isLocked() {
  return getAttempts() >= MAX_ATTEMPTS;
}

/* ============================================================
   VALIDATION
   ============================================================ */

export function validateCode(rawCode) {
  const key = String(rawCode || '').trim().toUpperCase();
  const entry = CODES[key] || runtimeCodes[key];
  if (!entry) return null;
  return { code: key, role: entry.role, name: entry.name };
}

/* ============================================================
   GATE WIRING
   ============================================================ */

let gateBusy = false;

export function wireGate({ onSuccess }) {
  const gateEl   = document.getElementById('gateView');
  const input    = document.getElementById('gateCodeInput');
  const btn      = document.getElementById('gateEnterBtn');
  const msgEl    = document.getElementById('gateMsg');
  const attempts = document.getElementById('gateAttempts');

  if (!gateEl || !input || !btn) {
    console.warn('[auth] Gate DOM missing.');
    return;
  }

  if (isLocked()) {
    gateEl.classList.add('gate-locked');
    if (msgEl) msgEl.textContent = 'ACCESS DENIED — Too many failed attempts.';
    if (attempts) attempts.textContent = 'Close this tab to try again.';
    input.disabled = true;
    btn.disabled = true;
    return;
  }

  updateAttemptsLabel(attempts);

  function setMsg(text, tone) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.color =
      tone === 'ok'   ? '#86efac' :
      tone === 'err'  ? '#fca5a5' :
      tone === 'warn' ? '#fcd34d' : '';
  }

  function flash(cls) {
    gateEl.classList.remove('gate-error', 'gate-success');
    void gateEl.offsetWidth;
    gateEl.classList.add(cls);
    setTimeout(() => gateEl.classList.remove(cls), 700);
  }

  async function attempt() {
    if (gateBusy) return;
    const raw = input.value;
    if (!raw || !raw.trim()) { setMsg('Please enter a code.', 'warn'); return; }

    gateBusy = true;
    btn.disabled = true;

    const result = validateCode(raw);

    if (!result) {
      const n = getAttempts() + 1;
      setAttempts(n);
      updateAttemptsLabel(attempts);
      flash('gate-error');
      setMsg('ACCESS DENIED.', 'err');

      if (n >= MAX_ATTEMPTS) {
        setTimeout(() => {
          gateEl.classList.add('gate-locked');
          setMsg('LOCKED OUT. Close the tab to try again.', 'err');
          input.disabled = true;
          btn.disabled = true;
        }, 600);
      } else {
        setTimeout(() => { btn.disabled = false; gateBusy = false; }, 700);
      }
      return;
    }

    setMsg('Welcome.', 'ok');
    flash('gate-success');
    setTimeout(() => onSuccess(result), 550);
  }

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); attempt(); }
  });

  setTimeout(() => input.focus(), 150);
}

function updateAttemptsLabel(el) {
  if (!el) return;
  const n = getAttempts();
  if (n === 0) { el.textContent = ''; return; }
  const left = MAX_ATTEMPTS - n;
  el.textContent = left > 0
    ? `Attempts remaining: ${left}`
    : 'No attempts remaining.';
}
