/* ============================================================
   overlay-fx.js
   Screen-wide visual effects. Extracted into its own module
   so it can be called from BOTH the GM side (via ui.js) and
   the player side (via boot.js) without pulling in ui.js's
   DOM element cache.

   Each function queries its DOM target lazily by ID and is
   safe to call if the overlay markup is missing.
   ============================================================ */

import { elementColor, elemIcon } from './icons.js';

let roundTimer = null;
let turnTimer  = null;
let reactTimer = null;
let downTimer  = null;

/* ---- ROUND BANNER ---- */

export function showRoundBanner(roundNumber, firstName) {
  const el      = document.getElementById('roundBanner');
  const numEl   = document.getElementById('roundBannerNumber');
  const firstEl = document.getElementById('roundBannerFirst');
  if (!el || !numEl || !firstEl) return;

  numEl.textContent   = roundNumber;
  firstEl.textContent = firstName || '—';

  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';

  clearTimeout(roundTimer);
  roundTimer = setTimeout(() => el.classList.add('hidden'), 2300);
}

/* ---- TURN BANNER ---- */

export function showTurnBanner(name, spd) {
  const el     = document.getElementById('turnBanner');
  const nameEl = document.getElementById('turnBannerName');
  const spdEl  = document.getElementById('turnBannerSpd');
  if (!el || !nameEl || !spdEl) return;

  nameEl.textContent = name || '—';
  spdEl.textContent  = (spd != null) ? spd : '—';

  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';

  clearTimeout(turnTimer);
  turnTimer = setTimeout(() => el.classList.add('hidden'), 1700);
}

/* ---- REACTION OVERLAY ---- */

export function showReactionOverlay(reactionName, elemA, elemB) {
  const overlay = document.getElementById('reactionOverlay');
  const boxA    = document.getElementById('reactionElemA');
  const boxB    = document.getElementById('reactionElemB');
  const title   = document.getElementById('reactionTitle');
  if (!overlay || !boxA || !boxB || !title) return;

  boxA.style.color = elementColor(elemA);
  boxB.style.color = elementColor(elemB);

  boxA.innerHTML = elemIcon(elemA, 96);
  boxB.innerHTML = elemIcon(elemB, 96);

  title.textContent = String(reactionName || '').toUpperCase();

  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  clearTimeout(reactTimer);
  reactTimer = setTimeout(() => overlay.classList.add('hidden'), 2600);
}

/* ---- PLAYER DOWN BANNER ---- */

export function showDownBanner(name) {
  const el     = document.getElementById('downBanner');
  const nameEl = document.getElementById('downName');
  if (!el || !nameEl) return;

  nameEl.textContent = name || '—';

  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';

  clearTimeout(downTimer);
  downTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}