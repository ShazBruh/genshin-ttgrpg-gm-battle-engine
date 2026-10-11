/* ============================================================
 m ain*.js
 Bootstrap, event wiring, orchestration between modules.
 ============================================================ */

import {
  state, PRESETS, SAMPLE_PLAYERS, SAMPLE_ENEMIES,
  normalizeEntity, uniqueName, sortBySpeed, getEntity,
  parseImport, esc
} from './data.js';

import { executeAction, nextTurn, restRound } from './combat.js';

import {
  els, renderAll, renderRoster, renderTurnOrder, renderSelects,
  renderActions, renderPresets, renderHistory,
  pushLog, pushDivider, clearLog, setTab,
  ensureAvailableAction
} from './ui.js';

/* ============================================================
 H ELP*ERS
 ============================================================ */

function addEntity(ent, logIntro) {
  state.entities.push(ent);
  sortBySpeed();
  state.selectSignature = '';
  renderAll();

  if (logIntro) {
    pushLog(
      `<span class="${ent.type === 'player' ? 'text-sky-300' : 'text-rose-300'}">` +
      `${ent.type === 'player' ? '✦' : '⚔'} <b>${ent.name}</b> enters the fray!</span> ` +
      `<span class="text-slate-500 text-[11px]">(${ent.hp_max} HP · ${ent.atk} ATK · ${ent.def} DEF · SPD ${ent.spd} · ${ent.vision})</span>`
    );
  }
}

function refreshAfterEdit() {
  sortBySpeed();
  state.selectSignature = '';
  renderAll();
  ensureAvailableAction();
}

/* ============================================================
 A CTI*ON GRID
 ============================================================ */

els.actionGrid.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  if (btn.classList.contains('action-disabled')) return;
  state.selectedAction = btn.dataset.action;
  renderActions();
});

/* ============================================================
 A TTA*CKER CHANGE → refresh action availability
 ============================================================ */

els.attackerSel.addEventListener('change', () => {
  ensureAvailableAction();
  renderActions();
});

/* ============================================================
 R OST*ER — click delegation
 ============================================================ */

els.roster.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;

  const e = getEntity(btn.dataset.id);
  if (!e) return;

  const act = btn.dataset.act;

  /* ---- HP quick adjust ---- */
  if (act === 'hp') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.hp_current = Math.max(0, Math.min(e.hp_max, e.hp_current + delta));
    if (delta < 0 && e.hp_current === 0) {
      pushLog(`<span class="text-rose-500 font-bold">☠ ${e.name} has been defeated.</span>`);
    }
    refreshAfterEdit();
    return;
  }

  /* ---- Stat +/- ---- */
  if (act === 'stat') {
    const stat = btn.dataset.stat;
    const delta = parseInt(btn.dataset.delta, 10) || 0;

    if (stat === 'hp_max') {
      e.hp_max = Math.max(1, e.hp_max + delta);
      e.hp_current = Math.min(e.hp_current, e.hp_max);
    } else if (stat === 'atk' || stat === 'def' || stat === 'spd' ||
      stat === 'em'  || stat === 'crit_dmg' || stat === 'er') {
      e[stat] = e[stat] + delta;
      }

      refreshAfterEdit();
    return;
  }

  /* ---- Stat direct edit ---- */
  if (act === 'stat-edit') {
    const stat = btn.dataset.stat;
    const current = e[stat];
    const raw = prompt(`Set ${stat.toUpperCase()} for ${e.name}:`, current);
    if (raw === null) return;

    const n = Number(raw);
    if (!Number.isFinite(n)) return;

    if (stat === 'hp_current')            e.hp_current = Math.max(0, Math.min(e.hp_max, n));
    else if (stat === 'hp_max')         { e.hp_max = Math.max(1, n); e.hp_current = Math.min(e.hp_current, e.hp_max); }
    else if (stat === 'stamina_current')  e.stamina_current = Math.max(0, Math.min(e.stamina_max, n));
    else if (stat === 'stamina_max')    { e.stamina_max = Math.max(0, n); e.stamina_current = Math.min(e.stamina_current, e.stamina_max); }
    else if (stat === 'energy_current')   e.energy_current = Math.max(0, Math.min(e.energy_max, n));
    else if (stat === 'energy_max')     { e.energy_max = Math.max(0, n); e.energy_current = Math.min(e.energy_current, e.energy_max); }
    else if (stat === 'shield')           e.shield = Math.max(0, n);
    else                                  e[stat] = n;

    refreshAfterEdit();
    return;
  }

  /* ---- Stamina +/- ---- */
  if (act === 'stamina') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.stamina_current = Math.max(0, Math.min(e.stamina_max, e.stamina_current + delta));
    renderRoster();
    ensureAvailableAction();
    renderActions();
    return;
  }

  /* ---- Energy +/- ---- */
  if (act === 'energy') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.energy_current = Math.max(0, Math.min(e.energy_max, e.energy_current + delta));
    renderRoster();
    ensureAvailableAction();
    renderActions();
    return;
  }

  /* ---- Reset skill cooldown ---- */
  if (act === 'resetcd') {
    e.skill_last_round = 0;
    pushLog(`<span class="text-emerald-300 text-[11px]">✨ ${esc(e.name)}'s skill cooldown was reset.</span>`);
    refreshAfterEdit();
    return;
  }

  /* ---- Remove status ---- */
  if (act === 'rmstatus') {
    e.status = e.status.filter(s => s.name !== btn.dataset.status);
    renderRoster();
    return;
  }

  /* ---- Delete entity ---- */
  if (act === 'del') {
    state.entities = state.entities.filter(x => x.id !== e.id);
    if (state.turnIndex >= state.entities.length) state.turnIndex = 0;
    state.selectSignature = '';
    renderRoster();
    renderTurnOrder();
    renderSelects(true);
    ensureAvailableAction();
    renderActions();
    return;
  }
});

/* ---- Aura override dropdown ---- */
els.roster.addEventListener('change', ev => {
  const sel = ev.target.closest('select[data-act="aura"]');
  if (!sel) return;
  const e = getEntity(sel.dataset.id);
  if (!e) return;
  e.aura = sel.value;
  renderRoster();
});

/* ============================================================
 P RES*ET SPAWN
 ============================================================ */

els.presetGrid.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-preset]');
  if (!btn) return;

  const p = PRESETS[parseInt(btn.dataset.preset, 10)];
  if (!p) return;

  const ent = normalizeEntity({
    name: uniqueName(p.name),
                              type: 'enemy',
                              vision: p.vision,
                              hp_max: p.hp_max,
                              hp_current: p.hp_max,
                              atk: p.atk,
                              def: p.def,
                              spd: p.spd,
                              em: p.em,
                              stamina_max: p.stamina_max,
                              stamina_current: p.stamina_max,
                              energy_max: p.energy_max,
                              energy_current: 0,
                              crit_die: 'd4',
                              crit_dmg: 0,
                              er: 0,
                              shield: 0,
                              aura: 'None',
                              status: []
  });

  addEntity(ent, true);
});

/* ============================================================
 E XEC*UTE ACTION
 ============================================================ */

document.getElementById('executeBtn').addEventListener('click', () => {
  const attackerId = els.attackerSel.value;
  const targetId   = els.targetSel.value;
  const action     = state.selectedAction;
  const isCrit     = document.getElementById('critChk').checked;
  const catalyst   = document.getElementById('catalystChk').checked;
  const bonus      = parseInt(document.getElementById('bonusInput').value, 10) || 0;
  const amount     = parseInt(document.getElementById('amountInput').value, 10) || 0;

  executeAction({ attackerId, targetId, action, isCrit, bonus, amount, catalyst });

  document.getElementById('critChk').checked = false;
  document.getElementById('bonusInput').value = 0;
});

/* ============================================================
 H EAD*ER BUTTONS
 ============================================================ */

document.getElementById('nextTurnBtn').addEventListener('click', () => nextTurn());
document.getElementById('restRoundBtn').addEventListener('click', () => restRound());

document.getElementById('resetBtn').addEventListener('click', () => {
  if (state.entities.length && !confirm('Reset the battle? All combatants and the combat log will be cleared.')) return;

  state.entities = [];
  state.history = [];
  state.round = 1;
  state.turnIndex = 0;
  state.selectSignature = '';

  clearLog();
  renderAll();
  renderHistory();
  pushDivider('Round 1');
  pushLog('<span class="text-slate-500">Battle reset. Spawn enemies or import JSON to begin.</span>');
});

/* ============================================================
 T ABS*
 ============================================================ */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

els.clearLogBtn.addEventListener('click', clearLog);

/* ============================================================
 I MPO*RT MODAL
 ============================================================ */

const importModal = els.importModal;
const importArea  = els.importArea;
const importMsgEl = els.importMsg;

const importFileInput = document.getElementById('importFile');
const fileNameLabel   = document.getElementById('fileNameLabel');

function openModal(exampleKey) {
  importModal.classList.remove('hidden');
  importMsgEl.textContent   = '';
  fileNameLabel.textContent = '';

  if (exampleKey === 'players') {
    importArea.value = JSON.stringify(SAMPLE_PLAYERS, null, 2);
  } else if (exampleKey === 'enemies') {
    importArea.value = JSON.stringify(SAMPLE_ENEMIES, null, 2);
  }
}

function closeModal() {
  importModal.classList.add('hidden');
}

document.getElementById('openImportBtn').addEventListener('click', () => openModal());

importModal.addEventListener('click', ev => {
  if (ev.target.closest('[data-close-modal]')) closeModal();
});

document.querySelectorAll('.example-tab').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.example));
});

/* ---- File picker ---- */
document.getElementById('browseFileBtn').addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', ev => {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    importArea.value = String(reader.result || '');
    fileNameLabel.textContent = file.name;
    importMsgEl.innerHTML = `<span class="text-sky-400">📄 Loaded "${file.name}" — press Import to add.</span>`;
  };
  reader.onerror = () => {
    importMsgEl.innerHTML = `<span class="text-rose-400">✕ Could not read file.</span>`;
  };
  reader.readAsText(file);
  ev.target.value = '';
});

document.getElementById('doImportBtn').addEventListener('click', () => {
  try {
    const list = parseImport(importArea.value);
    list.forEach(ent => addEntity(ent, true));
    importMsgEl.innerHTML = `<span class="text-emerald-400">✔ Imported ${list.length} combatant(s).</span>`;
    importArea.value = '';
    setTimeout(closeModal, 500);
  } catch (err) {
    importMsgEl.innerHTML = `<span class="text-rose-400">✕ ${err.message}</span>`;
  }
});

/* ============================================================
 B ACK*GROUND IMAGE SYSTEM
 ============================================================ */

const BG_STORAGE_KEY = 'gm-engine-bg-v1';

const bgImage     = document.getElementById('bgImage');
const bgDim       = document.getElementById('bgDim');
const bgPickBtn   = document.getElementById('bgPickBtn');
const bgFileInput = document.getElementById('bgFileInput');
const bgControls  = document.getElementById('bgControls');
const bgDimRange  = document.getElementById('bgDimRange');
const bgDimValue  = document.getElementById('bgDimValue');
const bgChangeBtn = document.getElementById('bgChangeBtn');
const bgRemoveBtn = document.getElementById('bgRemoveBtn');

function applyBackground(dataUrl, dim) {
  if (dataUrl) {
    bgImage.style.backgroundImage = `url("${dataUrl}")`;
    bgImage.style.display = 'block';
    bgDim.style.display = 'block';
    const d = (dim != null) ? dim : 65;
    bgDim.style.opacity = d / 100;
    bgControls.classList.remove('hidden');
    bgDimRange.value = d;
    bgDimValue.textContent = d + '%';
  } else {
    bgImage.style.backgroundImage = '';
    bgImage.style.display = 'none';
    bgDim.style.display = 'none';
    bgControls.classList.add('hidden');
  }
}

function persistBackground(dataUrl, dim) {
  try {
    if (!dataUrl) {
      localStorage.removeItem(BG_STORAGE_KEY);
      return true;
    }
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify({ dataUrl, dim }));
    return true;
  } catch (err) {
    console.warn('[GM Engine] Background too large to persist (localStorage quota). ' +
    'It will remain for this session only.', err);
    return false;
  }
}

function loadSavedBackground() {
  try {
    const raw = localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && obj.dataUrl) applyBackground(obj.dataUrl, obj.dim);
  } catch (err) {
    console.warn('[GM Engine] Could not read saved background:', err);
  }
}

function handleBackgroundFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file (PNG, JPG, WebP, GIF…).');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    const dim = parseInt(bgDimRange.value, 10) || 65;
    applyBackground(dataUrl, dim);
    const ok = persistBackground(dataUrl, dim);
    if (!ok) {
      pushLog('<span class="text-amber-400 text-[11px]">⚠ Background applied but too large to save — it will reset when you reload the page.</span>');
    }
  };
  reader.onerror = () => alert('Could not read that image file.');
  reader.readAsDataURL(file);
}

if (bgPickBtn) {
  bgPickBtn.addEventListener('click', () => bgFileInput.click());
}
if (bgChangeBtn) {
  bgChangeBtn.addEventListener('click', () => bgFileInput.click());
}
if (bgFileInput) {
  bgFileInput.addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0];
    handleBackgroundFile(f);
    ev.target.value = '';
  });
}
if (bgDimRange) {
  bgDimRange.addEventListener('input', () => {
    const d = parseInt(bgDimRange.value, 10) || 0;
    bgDimValue.textContent = d + '%';
    bgDim.style.opacity = d / 100;
    try {
      const raw = localStorage.getItem(BG_STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        obj.dim = d;
        localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) { /* ignore quota issues on dim update */ }
  });
}
if (bgRemoveBtn) {
  bgRemoveBtn.addEventListener('click', () => {
    applyBackground(null);
    persistBackground(null);
  });
}

/* ============================================================
 B OOT*
 ============================================================ */

function boot() {
  renderActions();
  renderPresets();
  renderAll();
  renderHistory();

  pushDivider('Round 1');
  pushLog('<span class="text-slate-400">Welcome, GM. Spawn enemies from the presets, or import a party JSON to begin.</span>');
  pushLog('<span class="text-slate-500 text-[11px]">Tip: pick Attacker → Target → Action, tick <b>Critical Hit?</b> if the player rolled their crit die, then hit <b>EXECUTE ACTION</b>.</span>');

  SAMPLE_PLAYERS.forEach(p => addEntity(normalizeEntity(p), false));
  pushLog('<span class="text-slate-500 text-[11px]">A sample party was pre-loaded. Use <b>Reset</b> to clear it.</span>');

  loadSavedBackground();

  console.info(
    '%c[GM Engine]%c Audio files expected at: audio/action.mp3 and audio/reaction.mp3 (optional). ' +
    'Background image can be set via the 🖼 Background button.',
    'color:#fbbf24;font-weight:bold', 'color:#94a3b8'
  );
}

boot();
