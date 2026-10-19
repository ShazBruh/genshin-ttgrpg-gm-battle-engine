/* ============================================================
   boot.js  —  Orchestrator
   ============================================================ */

import { overlaysHTML } from './overlays.js';
import { gateHTML }     from './gate.js';
import { headerHTML }   from './header.js';
import { gmHTML }       from './gm.js';
import { playerHTML }   from './player.js';
import { modalsHTML }   from './modals.js';

import {
  getSavedRole, saveRole, ROLES, wireGate,
  loadCodes, subscribeLiveCodes
} from './auth.js';

import {
  applyRole, wireLogout,
  enterPreviewMode, exitPreviewMode, isPreviewActive
} from './role.js';

import {
  subscribeState, subscribeBackground, applyIncomingState,
  publishState, fetchStateOnce, nukeRemoteState
} from '../js/firebase-state.js';

import { subscribeCode } from '../js/firebase-codes.js';

import { renderPlayerAll, wirePlayerTurnOrderClicks } from './player-render.js';
import { wirePlayerUpload, setUploadState }            from './player-upload.js';

import {
  showRoundBanner, showTurnBanner, showReactionOverlay, showDownBanner
} from '../js/overlay-fx.js';

import {
  state, computePartyDimPct, renderLogEntriesHTML
} from '../js/data.js';

import {
  playTurnSfx, playRoundSfx, playReactionSfx, playDownSfx,
  playActionForKey
} from '../js/audio.js';

/* ============================================================
   CONSTANTS
   ============================================================ */

const GM_PUBLISH_INTERVAL_MS = 400;

let gmEngineLoaded = false;
let myOwnerEntityId = null;
let myCode = null;

let playerInitialSyncDone = false;
let lastSeenSeq = 0;

/* ============================================================
   AUTO-DIM (player-side)
   ============================================================ */

function applyPlayerDim() {
  const dimEl = document.getElementById('bgDim');
  const imgEl = document.getElementById('bgImage');
  if (!dimEl || !imgEl) return;
  if (imgEl.style.display === 'none' || !imgEl.style.backgroundImage) return;
  const pct = computePartyDimPct();
  dimEl.style.opacity = (pct / 100).toFixed(3);
}

/* ============================================================
   1. MOUNT
   ============================================================ */

function mountViews() {
  const root = document.getElementById('app');
  if (!root) { console.error('[boot] #app missing.'); return; }
  root.innerHTML = [
    overlaysHTML(),
    gateHTML(),
    headerHTML(),
    gmHTML(),
    playerHTML(),
    modalsHTML()
  ].join('\n');
}

/* ============================================================
   2. ROLE RESOLUTION
   ============================================================ */

async function resolveRole() {
  const params = new URLSearchParams(location.search);
  const previewParam = params.get('preview');
  const saved = getSavedRole();

  if (previewParam === 'gm') {
    if (!saved || saved.role !== ROLES.GM) {
      history.replaceState(null, '', location.pathname);
      showGate();
      return;
    }
    await startGM({ name: 'Game Master', code: saved.code || 'PREVIEW' }, { persist: false });
    return;
  }
  if (previewParam === 'player') {
    if (!saved) {
      history.replaceState(null, '', location.pathname);
      showGate();
      return;
    }
    await startPlayer({ name: saved.name || 'Preview', code: saved.code || 'PREVIEW' }, { persist: false });
    return;
  }

  if (saved && saved.role) {
    const gateEl = document.getElementById('gateView');
    if (gateEl) gateEl.classList.add('hidden');
    if (saved.role === ROLES.GM) {
      await startGM(saved, { persist: false });
    } else {
      myOwnerEntityId = saved.myOwnerEntityId || null;
      await startPlayer(saved, { persist: false });
    }
    return;
  }

  showGate();
}

function showGate() {
  const header = document.querySelector('header.site-header');
  if (header) header.classList.add('hidden');
  const gmMain     = document.querySelector('main[data-role="gm"]');
  const playerMain = document.querySelector('main[data-role="player"]');
  if (gmMain)     gmMain.classList.add('hidden');
  if (playerMain) playerMain.classList.add('hidden');

  wireGate({
    onSuccess: async (result) => {
      saveRole(result.role, result.name, result.code);
      if (result.role === ROLES.GM) {
        await startGM(result, { persist: false });
      } else {
        await startPlayer(result, { persist: false });
      }
    }
  });
}

/* ============================================================
   3. GM BOOT
   ============================================================ */

async function startGM(meta, { persist = false } = {}) {
  if (persist) saveRole(ROLES.GM, meta.name, meta.code);
  applyRole(ROLES.GM, meta);
  wireLogout();

  try {
    const existing = await fetchStateOnce();
    if (existing && Array.isArray(existing.entities) && existing.entities.length) {
      applyIncomingState(state, existing);
      console.info(
        `%c[boot]%c Restored %c${state.entities.length}%c entities from Firebase (Round ${state.round}).`,
        'color:#fbbf24;font-weight:bold', 'color:#94a3b8',
        'color:#86efac;font-family:monospace', 'color:#94a3b8'
      );
      if (state.entities.length > 0 && state.logEntries.length) {
        const feed = document.getElementById('logFeed');
        if (feed) {
          feed.innerHTML = renderLogEntriesHTML(state.logEntries);
          feed.scrollTop = feed.scrollHeight;
        }
      }
    } else {
      console.info('%c[boot]%c No remote state found — starting fresh.', 'color:#fbbf24;font-weight:bold', 'color:#94a3b8');
    }
  } catch (err) {
    console.warn('[boot] Could not restore session:', err);
  }

  if (!gmEngineLoaded) {
    try {
      await import('../js/main.js');
      gmEngineLoaded = true;
    } catch (err) {
      console.error('[boot] GM engine failed to load:', err);
      return;
    }
  }

  wirePreviewButton();
  wireGmStatePublisher();
  wireHardReset();

  try {
    const { wireGmPlayers } = await import('./gm-players.js');
    wireGmPlayers({
      onApproved: () => {
        const hooks = window.__gmEngineHooks || {};
        if (typeof hooks.renderAll === 'function')     hooks.renderAll();
        if (typeof hooks.renderHistory === 'function') hooks.renderHistory();
      }
    });
  } catch (err) {
    console.warn('[boot] gm-players failed to load:', err);
  }

  window.addEventListener('beforeunload', () => {
    try { publishState(state); } catch { /* ignore */ }
  });

  if (state.entities.length === 0) {
    setTimeout(() => {
      try { publishState(state); } catch { /* ignore */ }
    }, 100);
  }
}

function wirePreviewButton() {
  const btn = document.getElementById('previewToggleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (isPreviewActive()) {
      exitPreviewMode();
    } else {
      enterPreviewMode('Preview');
      wirePlayerTabs();
      wirePlayerTurnOrderClicks();
      renderPlayerAll({ myCharId: null });
    }
  });
}

function wireGmStatePublisher() {
  setInterval(() => {
    try { publishState(state); } catch { /* ignore */ }
  }, GM_PUBLISH_INTERVAL_MS);
}

function wireHardReset() {
  window.addEventListener('keydown', async (ev) => {
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'R') {
      ev.preventDefault();
      if (!confirm('Hard reset? This will DELETE the shared game state from Firebase for everyone.')) return;
      try { await nukeRemoteState(); } catch (err) { console.warn('[boot] nuke failed:', err); }
      location.reload();
    }
  });
}

/* ============================================================
   4. PLAYER BOOT
   ============================================================ */

async function startPlayer(meta, { persist = false } = {}) {
  if (persist) saveRole(ROLES.PLAYER, meta.name, meta.code, { myOwnerEntityId });

  applyRole(ROLES.PLAYER, meta);
  wireLogout();

  myCode = String(meta.code || '').trim().toUpperCase();

  subscribeState((payload) => {
    if (!payload) return;

    applyIncomingState(state, payload);

    if (!playerInitialSyncDone) {
      playerInitialSyncDone = true;
      lastSeenSeq = state.eventSeq || 0;
      console.info('[boot] Player initial sync — baseline seq =', lastSeenSeq);
    } else {
      handlePlayerEvents();
    }

    renderPlayerAll({ myCharId: myOwnerEntityId });
    applyPlayerDim();
  });

  subscribeBackground((bg) => {
    const img = document.getElementById('bgImage');
    const dim = document.getElementById('bgDim');
    if (!img || !dim) return;

    if (!bg || !bg.dataUrl) {
      img.style.backgroundImage = '';
      img.style.display = 'none';
      dim.style.display = 'none';
      return;
    }

    img.style.backgroundImage = `url("${bg.dataUrl}")`;
    img.style.display = 'block';
    dim.style.display = 'block';
    applyPlayerDim();
  });

  if (myCode) {
    subscribeCode(myCode, (entry) => {
      if (!entry) {
        setUploadState('available');
        myOwnerEntityId = null;
        renderPlayerAll({ myCharId: null });
        return;
      }
      myOwnerEntityId = entry.ownerEntityId || null;
      if (myOwnerEntityId) {
        setUploadState('locked');
        renderPlayerAll({ myCharId: myOwnerEntityId });
      } else if (entry.pendingEntity) {
        setUploadState('pending');
        renderPlayerAll({ myCharId: null });
      } else {
        setUploadState('available');
        renderPlayerAll({ myCharId: null });
      }
    });
  }

  wirePlayerUpload({
    code: myCode,
    getOwnerId: () => myOwnerEntityId,
    onSubmitted: () => renderPlayerAll({ myCharId: null })
  });

  wirePlayerTabs();
  wirePlayerTurnOrderClicks();

  renderPlayerAll({ myCharId: myOwnerEntityId });
}

function handlePlayerEvents() {
  const events = Array.isArray(state.pendingEvents) ? state.pendingEvents : [];
  const fresh = events
    .filter(e => e && Number(e.seq) > lastSeenSeq)
    .sort((a, b) => Number(a.seq) - Number(b.seq));

  if (!fresh.length) return;

  for (const evt of fresh) {
    lastSeenSeq = Math.max(lastSeenSeq, Number(evt.seq) || 0);

    try {
      if (evt.type === 'turn') {
        playTurnSfx();
        showTurnBanner(evt.name, evt.spd);
      } else if (evt.type === 'round') {
        playRoundSfx();
        showRoundBanner(evt.roundNumber, evt.firstName);
      } else if (evt.type === 'reaction') {
        playReactionSfx();
        showReactionOverlay(evt.reactionName, evt.elemA, evt.elemB);
      } else if (evt.type === 'down') {
        playDownSfx();
        showDownBanner(evt.name);
      } else if (evt.type === 'action') {
        playActionForKey(evt.actionKey);
      }
    } catch (err) {
      console.warn('[boot] overlay/audio replay failed:', err);
    }
  }
}

function wirePlayerTabs() {
  const logBtn    = document.getElementById('pTabBtnLog');
  const histBtn   = document.getElementById('pTabBtnHistory');
  const logPanel  = document.getElementById('pTabPanelLog');
  const histPanel = document.getElementById('pTabPanelHistory');
  const clearBtn  = document.getElementById('pClearLogBtn');

  if (logBtn && histBtn && logPanel && histPanel) {
    logBtn.addEventListener('click', () => {
      logBtn.classList.add('active');
      histBtn.classList.remove('active');
      logPanel.classList.remove('hidden');
      histPanel.classList.add('hidden');
    });
    histBtn.addEventListener('click', () => {
      histBtn.classList.add('active');
      logBtn.classList.remove('active');
      histPanel.classList.remove('hidden');
      logPanel.classList.add('hidden');
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const el = document.getElementById('pLogFeed');
      if (el) el.innerHTML = '';
    });
  }
}

/* ============================================================
   5. BOOT
   ============================================================ */

console.log('[boot] Starting…');

try {
  mountViews();
  console.log('[boot] Views mounted.');
} catch (err) {
  console.error('[boot] mountViews failed:', err);
}

// Pre-hide the gate for returning users so they don't see it flash
// while codes load from Firebase.
const savedEarly = getSavedRole();
if (savedEarly && savedEarly.role &&
    !new URLSearchParams(location.search).get('preview')) {
  const gateEl = document.getElementById('gateView');
  if (gateEl) gateEl.classList.add('hidden');
}

try {
  await loadCodes();
  subscribeLiveCodes();
  console.log('[boot] Codes loaded.');
} catch (err) {
  console.warn('[boot] Code loading failed (non-fatal):', err);
}

try {
  await resolveRole();
  console.log('[boot] Role resolved.');
} catch (err) {
  console.error('[boot] Role resolution failed:', err);
}

console.info(
  '%c[GM Engine v4.5]%c Boot complete.',
  'color:#fbbf24;font-weight:bold', 'color:#94a3b8'
);