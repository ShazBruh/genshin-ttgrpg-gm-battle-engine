/* ============================================================
   main.js
   Bootstrap, event wiring, orchestration between modules.
   ============================================================ */

import {
  state, PRESETS,
  normalizeEntity, uniqueName, sortBySpeed, getEntity,
  parseImport, esc, addStatus, isField, nameColor,
  normalizeCore
} from './data.js';

import { executeAction, nextTurn, restRound } from './combat.js';

import {
  els, renderAll, renderRoster, renderTurnOrder, renderSelects,
  renderActions, renderOperatorMenu, renderHistory,
  pushLog, pushDivider, clearLog, setTab,
  ensureAvailableAction, updateAutoDim,
  flashRosterCard
} from './ui.js';

import { publishBackground, publishState } from './firebase-state.js';

import { isPreviewActive } from '../views/role.js';
import { renderPlayerAll } from '../views/player-render.js';

function refreshPreviewIfActive() {
  if (!isPreviewActive()) return;
  try { renderPlayerAll({ myCharId: null }); } catch { /* ignore */ }
}

function addEntity(ent, logIntro) {
  state.entities.push(ent);
  sortBySpeed();
  state.selectSignature = '';
  renderAll();

  if (logIntro) {
    const wLabel = ent.weapon && ent.weapon !== 'None' ? ` · ${ent.weapon}${ent.weapon_rarity ? ' ' + '★'.repeat(ent.weapon_rarity) : ''}` : '';
    pushLog(
      `<span class="${ent.type === 'player' ? 'text-sky-300' : 'text-rose-300'}">` +
      `${ent.type === 'player' ? '✦' : '⚔'} <b>${ent.name}</b> enters the fray!</span> ` +
      `<span class="text-slate-500 text-[11px]">(${ent.hp_max} HP · ${ent.atk} ATK · ${ent.def} DEF · SPD ${ent.spd} · ${ent.vision}${wLabel})</span>`
    );
  }
  refreshPreviewIfActive();
}

function refreshAfterEdit() {
  sortBySpeed();
  state.selectSignature = '';
  renderAll();
  ensureAvailableAction();
  updateAutoDim();
  refreshPreviewIfActive();
}

els.actionGrid.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  if (btn.classList.contains('action-disabled')) return;
  state.selectedAction = btn.dataset.action;
  renderActions();
});

els.turnOrder.addEventListener('click', ev => {
  const chip = ev.target.closest('[data-id]');
  if (!chip) return;
  flashRosterCard(els.roster, chip.dataset.id);
});

els.attackerSel.addEventListener('change', () => {
  ensureAvailableAction();
  renderActions();
});

els.targetSel.addEventListener('change', () => {
  const isRandom = els.targetSel.value.startsWith('random_');
  document.getElementById('randomAmountWrapper').classList.toggle('hidden', !isRandom);
});

document.getElementById('fieldPanel').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-act="del-core"]');
  if (!btn) return;
  state.entities = state.entities.filter(e => e.id !== btn.dataset.id);
  pushLog(`<span class="text-slate-500 text-[11px]">Removed field entity.</span>`);
  refreshAfterEdit();
});

function getRandom(arr, n) {
  if (n >= arr.length) return [...arr];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function resolveTargets() {
  const val = els.targetSel.value;
  const amountEl = document.getElementById('randomAmountInput');
  const amount = amountEl ? (parseInt(amountEl.value, 10) || 1) : 1;

  if (!val) return [];

  const allEnts = state.entities.filter(e => !isField(e));

  if (val === 'all_enemies')   return allEnts.filter(e => e.type === 'enemy' || e.type === 'boss').map(e => e.id);
  if (val === 'all_players')   return allEnts.filter(e => e.type === 'player').map(e => e.id);
  if (val === 'all_combatants') return allEnts.map(e => e.id);

  if (val === 'random_enemy') {
    const enemies = allEnts.filter(e => e.type === 'enemy' || e.type === 'boss');
    return getRandom(enemies, amount).map(e => e.id);
  }
  if (val === 'random_player') {
    const players = allEnts.filter(e => e.type === 'player');
    return getRandom(players, amount).map(e => e.id);
  }

  return [val];
}

document.getElementById('applyStatusBtn').addEventListener('click', () => {
  const targetIds = resolveTargets();
  if (!targetIds.length) { alert('No valid targets selected.'); return; }

  const attacker = getEntity(els.attackerSel.value);
  const attackerName = attacker ? `<b class="${nameColor(attacker)}">${esc(attacker.name)}</b>` : 'Someone';

  const name = prompt('Enter custom status name (e.g., Crumbling):');
  if (!name) return;
  const durStr = prompt('Enter duration in rounds:', '3');
  if (durStr === null) return;
  const duration = parseInt(durStr, 10);
  if (isNaN(duration) || duration <= 0) return;

  targetIds.forEach(id => {
    const e = getEntity(id);
    if (e) addStatus(e, name, duration);
  });

    // Determine the exact phrasing based on what the player selected
    const targetVal = els.targetSel.value;
    const isAll = targetVal.startsWith('all_');
    const isRandom = targetVal.startsWith('random_');
    let targetLabel = '';

    if (isAll) {
      if (targetVal === 'all_enemies') targetLabel = 'all enemies on the field';
      else if (targetVal === 'all_players') targetLabel = 'all players on the field';
      else targetLabel = 'all combatants on the field';
    } else if (targetIds.length > 1 || isRandom) {
      const targets = targetIds.map(id => getEntity(id)).filter(Boolean);
      const hasEnemies = targets.some(t => t.type === 'enemy' || t.type === 'boss');
      const hasPlayers = targets.some(t => t.type === 'player');

      if (hasEnemies && !hasPlayers) targetLabel = 'multiple enemies';
      else if (hasPlayers && !hasEnemies) targetLabel = 'multiple players';
      else targetLabel = 'multiple targets';
    } else {
      const t = getEntity(targetIds[0]);
      targetLabel = t ? `<b class="${nameColor(t)}">${esc(t.name)}</b>` : 'the target';
    }

    pushLog(`<span class="text-fuchsia-300">✨ ${attackerName} applied the <b>${esc(name)}</b> effect to ${targetLabel}!</span>`);
    refreshAfterEdit();
});
els.roster.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;

  const e = getEntity(btn.dataset.id);
  if (!e) return;

  const act = btn.dataset.act;

  if (act === 'hp') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.hp_current = Math.max(0, Math.min(e.hp_max, e.hp_current + delta));
    if (delta < 0 && e.hp_current === 0) {
      pushLog(`<span class="text-rose-500 font-bold">☠ ${e.name} has been defeated.</span>`);
    }
    refreshAfterEdit();
    return;
  }

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

  if (act === 'stamina') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.stamina_current = Math.max(0, Math.min(e.stamina_max, e.stamina_current + delta));
    renderRoster();
    ensureAvailableAction();
    renderActions();
    refreshPreviewIfActive();
    return;
  }

  if (act === 'energy') {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    e.energy_current = Math.max(0, Math.min(e.energy_max, e.energy_current + delta));
    renderRoster();
    ensureAvailableAction();
    renderActions();
    refreshPreviewIfActive();
    return;
  }

  if (act === 'resetcd') {
    e.skill_last_round = 0;
    pushLog(`<span class="text-emerald-300 text-[11px]">✨ ${esc(e.name)}'s skill cooldown was reset.</span>`);
    refreshAfterEdit();
    return;
  }

  if (act === 'rmstatus') {
    e.status = e.status.filter(s => s.name !== btn.dataset.status);
    renderRoster();
    refreshPreviewIfActive();
    return;
  }

  if (act === 'del') {
    state.entities = state.entities.filter(x => x.id !== e.id);
    if (state.turnIndex >= state.entities.length) state.turnIndex = 0;
    state.selectSignature = '';
    renderRoster();
    renderTurnOrder();
    renderSelects(true);
    ensureAvailableAction();
    renderActions();
    updateAutoDim();
    refreshPreviewIfActive();
    return;
  }

  if (act === 'stat-reset') {
    const stat = btn.dataset.stat;
    if (e['base_' + stat] !== undefined) {
      e[stat] = e['base_' + stat];
      refreshAfterEdit();
    }
    return;
  }

  if (act === 'addstatus') {
    const name = prompt('Enter custom status name (e.g., Crumbling):');
    if (!name) return;
    const durStr = prompt('Enter duration in rounds:', '3');
    if (durStr === null) return;
    const duration = parseInt(durStr, 10);
    if (isNaN(duration) || duration <= 0) return;

    addStatus(e, name, duration);
    pushLog(`<span class="text-fuchsia-300 text-[11px]">✨ Added status <b>${esc(name)}</b> (${duration}r) to ${esc(e.name)}.</span>`);
    refreshAfterEdit();
    return;
  }
});

els.roster.addEventListener('change', ev => {
  const sel = ev.target.closest('select[data-act="aura"]');
  if (!sel) return;
  const e = getEntity(sel.dataset.id);
  if (!e) return;
  e.aura = sel.value;
  renderRoster();
  refreshPreviewIfActive();
});

document.getElementById('operatorGrid').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-op]');
  if (!btn) return;
  const op = btn.dataset.op;

  if (op === 'dummy_enemy' || op === 'dummy_player' || op === 'dummy_boss') {
    const isPlayer = op === 'dummy_player';
    const isBoss = op === 'dummy_boss';

    const ent = normalizeEntity({
      name: uniqueName(isPlayer ? 'Dummy Player' : isBoss ? 'Dummy Boss' : 'Dummy Enemy'),
                                type: isPlayer ? 'player' : isBoss ? 'boss' : 'enemy',
                                vision: 'Physical',
                                hp_max: 999999, hp_current: 999999,
                                atk: isPlayer ? 1 : 10, def: 0, spd: 10, em: 0,
                                stamina_max: 2, stamina_current: 2, energy_max: 2, energy_current: 0,
                                crit_die: 'd4', crit_dmg: 0, er: 0, shield: 0, aura: 'None', status: [],
                                weapon: isPlayer ? 'Sword' : 'Physical', weapon_rarity: 0
    });
    addEntity(ent, true);
  }
  else if (op === 'spawn_core') {
    let core = state.entities.find(e => e.type === 'core');
    if (core) {
      core.stacks = (core.stacks || 1) + 1;
      core.expires_round = state.round + 2;
      pushLog(`<span class="text-green-300">🌱 <b>${esc(core.name)}</b> stacked to x${core.stacks}! (Expires Round ${core.expires_round})</span>`);
    } else {
      const coreName = uniqueName('Dendro Core');
      core = normalizeCore(state.round, coreName);
      state.entities.push(core);
      pushLog(`<span class="text-green-300">🌱 <b>${esc(core.name)}</b> drops on the field! (Expires Round ${core.expires_round})</span>`);
    }
    refreshAfterEdit();
  }
  else if (op === 'heal_all') {
    state.entities.forEach(e => {
      if (e.type === 'player') {
        e.hp_current = e.hp_max;
        e.stamina_current = e.stamina_max;
        e.energy_current = e.energy_max;
      }
    });
    pushLog('<span class="text-emerald-300">✨ All players fully restored!</span>');
    refreshAfterEdit();
  }
  else if (op === 'kill_enemies') {
    state.entities.forEach(e => {
      if (e.type === 'enemy' || e.type === 'boss') {
        e.hp_current = 0;
      }
    });
    pushLog('<span class="text-rose-500 font-bold">☠ All enemies eliminated.</span>');
    refreshAfterEdit();
  }
});

document.getElementById('executeBtn').addEventListener('click', () => {
  const attackerId = els.attackerSel.value;
  const targetIds = resolveTargets();
  
  if (!targetIds.length) { pushLog('<span class="text-rose-400">⚠ No valid targets selected.</span>'); return; }

  const action         = state.selectedAction;
  const isCrit         = document.getElementById('critChk').checked;
  const appliedElement = document.getElementById('appliedElementSelect')
    ? document.getElementById('appliedElementSelect').value
    : '';
  const bonus          = parseInt(document.getElementById('bonusInput').value, 10) || 0;
  const amount         = parseInt(document.getElementById('amountInput').value, 10) || 0;

  executeAction({
    attackerId, targetIds, action,
    isCrit, bonus, amount,
    appliedElement
  });

  document.getElementById('critChk').checked = false;
  document.getElementById('bonusInput').value = 0;
  if (document.getElementById('appliedElementSelect')) {
    document.getElementById('appliedElementSelect').value = '';
  }
  refreshAfterEdit();
});

document.getElementById('nextTurnBtn').addEventListener('click', () => {
  nextTurn();

  // QoL: Snap the Attacker dropdown to the current actor
  const actor = state.entities[state.turnIndex];
  if (actor && !isField(actor)) {
    els.attackerSel.value = actor.id;
  }

  state.selectSignature = '';
  renderAll();
  updateAutoDim();
  refreshPreviewIfActive();
});

document.getElementById('restRoundBtn').addEventListener('click', () => {
  restRound();

  // QoL: Snap the Attacker dropdown to the first actor of the new round
  const actor = state.entities[state.turnIndex];
  if (actor && !isField(actor)) {
    els.attackerSel.value = actor.id;
  }

  state.selectSignature = '';
  renderAll();
  updateAutoDim();
  refreshPreviewIfActive();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (state.entities.length && !confirm('Reset the battle? All combatants and the combat log will be cleared.')) return;

  state.entities = [];
  state.history = [];
  state.round = 1;
  state.turnIndex = 0;
  state.selectSignature = '';
  state.lastEvent = null;
  state.eventSeq = 0;
  state.pendingEvents = [];

  clearLog();
  renderAll();
  renderHistory();
  pushDivider('Round 1');
  pushLog('<span class="text-slate-500">Battle reset. Spawn enemies or import JSON to begin.</span>');
  updateAutoDim();
  refreshPreviewIfActive();

  try { publishState(state); } catch { /* ignore */ }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

els.clearLogBtn.addEventListener('click', () => {
  clearLog();
  refreshPreviewIfActive();
});

const importModal = els.importModal;
const importArea  = els.importArea;
const importMsgEl = els.importMsg;

const importFileInput = document.getElementById('importFile');
const fileNameLabel   = document.getElementById('fileNameLabel');

function openModal() {
  importModal.classList.remove('hidden');
  importMsgEl.textContent   = '';
  fileNameLabel.textContent = '';
  importArea.value = '';

  const sel = document.getElementById('exampleSelect');
  if (sel) sel.value = '';
}

function closeModal() {
  importModal.classList.add('hidden');
}

document.getElementById('openImportBtn').addEventListener('click', () => openModal());

importModal.addEventListener('click', ev => {
  if (ev.target.closest('[data-close-modal]')) closeModal();
});

document.getElementById('exampleSelect').addEventListener('change', (ev) => {
  const val = ev.target.value;
  if (!val) return;

  let data = null;
  if (val === 'player') {
    data = [{
      name: "Example Player", type: "player", vision: "Anemo",
      hp_max: 50, atk: 8, def: 3, spd: 12, em: 2,
      weapon: "Sword", weapon_rarity: 3, crit_die: "d8", crit_dmg: 4
    }];
  } else if (val === 'enemy') {
    data = [{
      name: "Example Enemy", type: "enemy", vision: "Physical",
      hp_max: 30, atk: 5, def: 1, spd: 8, em: 0,
      weapon: "Physical", weapon_rarity: 0
    }];
  } else if (val === 'boss') {
    data = [{
      name: "Example Boss", type: "boss", vision: "Electro",
      hp_max: 200, atk: 15, def: 5, spd: 10, em: 0,
      weapon: "Polearm", weapon_rarity: 5, crit_die: "d12", crit_dmg: 8
    }];
  } else if (val === 'minion') {
    data = []; // Empty for now as requested
  }

  if (data) {
    importArea.value = JSON.stringify(data, null, 2);
  }
});

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

const BG_STORAGE_KEY = 'gm-engine-bg-v1';
const BG_MAX_DIM     = 1920;
const BG_QUALITY     = 0.82;

const bgImage     = document.getElementById('bgImage');
const bgDim       = document.getElementById('bgDim');
const bgPickBtn   = document.getElementById('bgPickBtn');
const bgFileInput = document.getElementById('bgFileInput');
const bgControls  = document.getElementById('bgControls');
const bgChangeBtn = document.getElementById('bgChangeBtn');
const bgRemoveBtn = document.getElementById('bgRemoveBtn');

function applyBackground(dataUrl) {
  if (dataUrl) {
    bgImage.style.backgroundImage = `url("${dataUrl}")`;
    bgImage.style.display = 'block';
    bgDim.style.display = 'block';
    bgControls.classList.remove('hidden');
    updateAutoDim();
  } else {
    bgImage.style.backgroundImage = '';
    bgImage.style.display = 'none';
    bgDim.style.display = 'none';
    bgControls.classList.add('hidden');
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          const ratio = Math.min(1, BG_MAX_DIM / Math.max(width, height));
          width  = Math.max(1, Math.round(width  * ratio));
          height = Math.max(1, Math.round(height * ratio));

          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', BG_QUALITY));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function persistBackground(dataUrl) {
  try {
    if (!dataUrl) {
      localStorage.removeItem(BG_STORAGE_KEY);
      return true;
    }
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify({ dataUrl, dim: 65 }));
    return true;
  } catch (err) {
    console.warn('[GM Engine] Background too large to persist (localStorage quota).', err);
    return false;
  }
}

function loadSavedBackground() {
  try {
    const raw = localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && obj.dataUrl) {
      applyBackground(obj.dataUrl);
      publishBackground({ dataUrl: obj.dataUrl, dim: 65 });
    }
  } catch (err) {
    console.warn('[GM Engine] Could not read saved background:', err);
  }
}

async function handleBackgroundFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file (PNG, JPG, WebP, GIF…).');
    return;
  }

  try {
    const dataUrl = await compressImage(file);
    applyBackground(dataUrl);
    const ok = persistBackground(dataUrl);
    if (!ok) {
      pushLog('<span class="text-amber-400 text-[11px]">⚠ Background applied but too large to save locally.</span>');
    }
    const synced = await publishBackground({ dataUrl, dim: 65 });
    if (!synced) {
      pushLog('<span class="text-amber-400 text-[11px]">⚠ Background applied but could not sync to players.</span>');
    }
  } catch (err) {
    console.warn('[GM Engine] Could not process background image:', err);
    alert('Could not process that image file.');
  }
}

if (bgPickBtn)   bgPickBtn.addEventListener('click',   () => bgFileInput.click());
if (bgChangeBtn) bgChangeBtn.addEventListener('click', () => bgFileInput.click());
if (bgFileInput) {
  bgFileInput.addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0];
    handleBackgroundFile(f);
    ev.target.value = '';
  });
}
if (bgRemoveBtn) {
  bgRemoveBtn.addEventListener('click', () => {
    applyBackground(null);
    persistBackground(null);
    publishBackground(null);
  });
}

function boot() {
  renderActions();
  renderOperatorMenu();
  renderAll();
  renderHistory();
  updateAutoDim();

  const restored = state.entities.length > 0;

  if (!restored) {
    pushDivider('Round 1');
    pushLog('<span class="text-slate-400">Welcome, GM. Spawn enemies from the presets, or import a party JSON to begin.</span>');
    pushLog('<span class="text-slate-500 text-[11px]">Tip: pick Attacker → Target → Action, tick <b>Critical Hit?</b> if the player rolled their crit die, then hit <b>EXECUTE ACTION</b>.</span>');
  } else {
    console.info('%c[GM Engine]%c Session restored from Firebase.', 'color:#fbbf24;font-weight:bold', 'color:#94a3b8');
  }

  loadSavedBackground();

  console.info(
    '%c[GM Engine]%c Audio files expected at: audio/{normal,charged,skill,burst,heal,shield,turn,round,down,reaction}.mp3',
    'color:#fbbf24;font-weight:bold', 'color:#94a3b8'
  );
}

window.__gmEngineHooks = {
  renderAll,
  renderHistory,
  renderRoster,
  addEntity
};

window.__gmPulse = () => {
  try { publishState(state); } catch { /* ignore */ }
};

boot();
