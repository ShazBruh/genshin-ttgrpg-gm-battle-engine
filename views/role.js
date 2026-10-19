/* ============================================================
   role.js  —  Apply role to the DOM
   Shows/hides header buttons, GM main view, player main view,
   and the gate. Also wires the logout button.
   ============================================================ */

import { clearRole, ROLES } from './auth.js';

export function applyRole(role, meta = {}) {
  const body = document.body;

  // Body class (used by CSS hooks)
  body.classList.remove('body-gm', 'body-player');
  body.classList.add(role === ROLES.GM ? 'body-gm' : 'body-player');

  // Hide the gate
  const gate = document.getElementById('gateView');
  if (gate) {
    gate.classList.add('gate-exit');
    setTimeout(() => gate.classList.add('hidden'), 400);
  }

  // Header
  const header = document.querySelector('header.site-header');
  if (header) header.classList.remove('hidden');

  // GM-only header buttons
  document.querySelectorAll('header [data-role="gm"]').forEach(el => {
    el.classList.toggle('hidden', role !== ROLES.GM);
  });

  // Player-only header chips
  document.querySelectorAll('header [data-role="player"]').forEach(el => {
    el.classList.toggle('hidden', role !== ROLES.PLAYER);
  });

  // Welcome chip text for the player
  const welcomeEl = document.getElementById('playerWelcome');
  if (welcomeEl && role === ROLES.PLAYER) {
    welcomeEl.textContent = `Welcome, ${meta.name || 'Player'}`;
  }

  // Mains
  const gmMain     = document.querySelector('main[data-role="gm"]');
  const playerMain = document.querySelector('main[data-role="player"]');
  if (gmMain)     gmMain.classList.toggle('hidden', role !== ROLES.GM);
  if (playerMain) playerMain.classList.toggle('hidden', role !== ROLES.PLAYER);

  // Background controls are GM-only AND only when a background is loaded.
  // The background system in main.js handles showing them when there's
  // an actual image; here we just hide them for players.
  const bgControls = document.getElementById('bgControls');
  if (bgControls && role !== ROLES.GM) {
    bgControls.classList.add('hidden');
  }
}

export function wireLogout(onLogout) {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!confirm('Log out and return to the access code screen?')) return;
    clearRole();
    if (typeof onLogout === 'function') onLogout();
    else location.reload();
  });
}

/* ---- Preview mode (GM only) ---- */

let previewActive = false;
let previewChipEl = null;

export function isPreviewActive() { return previewActive; }

export function enterPreviewMode(playerName = 'Player') {
  if (previewActive) return;

  const gmMain     = document.querySelector('main[data-role="gm"]');
  const playerMain = document.querySelector('main[data-role="player"]');

  if (gmMain)     gmMain.classList.add('hidden');
  if (playerMain) playerMain.classList.remove('hidden');

  document.querySelectorAll('header [data-role="gm"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('header [data-role="player"]').forEach(el => el.classList.remove('hidden'));

  // Hide GM-only floating controls (they live outside the header).
  const bgControls = document.getElementById('bgControls');
  if (bgControls) bgControls.classList.add('hidden');

  const welcomeEl = document.getElementById('playerWelcome');
  if (welcomeEl) welcomeEl.textContent = `Previewing as ${playerName}`;

  if (!previewChipEl) {
    previewChipEl = document.createElement('div');
    previewChipEl.className = 'preview-chip';
    previewChipEl.innerHTML = `
    <span class="preview-chip-label">Preview</span>
    <span class="preview-chip-hint">Viewing as player</span>
    <button class="preview-chip-exit" type="button">Exit</button>
    `;
    document.body.appendChild(previewChipEl);
    previewChipEl.querySelector('.preview-chip-exit').addEventListener('click', exitPreviewMode);
  }
  previewChipEl.classList.remove('hidden');

  previewActive = true;
}

export function exitPreviewMode() {
  if (!previewActive) return;

  const gmMain     = document.querySelector('main[data-role="gm"]');
  const playerMain = document.querySelector('main[data-role="player"]');

  if (gmMain)     gmMain.classList.remove('hidden');
  if (playerMain) playerMain.classList.add('hidden');

  document.querySelectorAll('header [data-role="gm"]').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('header [data-role="player"]').forEach(el => el.classList.add('hidden'));

  // Restore GM-only background controls — but only if a background
  // is actually loaded. The main.js background pipeline also
  // manages this flag; deferring here so a preview toggle doesn't
  // leave the chip floating over an empty canvas.
  const bgControls = document.getElementById('bgControls');
  const bgImage    = document.getElementById('bgImage');
  if (bgControls && bgImage && bgImage.style.display !== 'none') {
    bgControls.classList.remove('hidden');
  }

  if (previewChipEl) previewChipEl.classList.add('hidden');
  previewActive = false;
}
