/* ============================================================
 *  ui.js
 *  ============================================================ */

import {
  state, ELEM_STYLE, AURA_OPTIONS, ACTIONS, PRESETS, WEAPONS,
  esc, nameColor, getEntity, isCore, isField, skillCooldownInfo,
  computePartyDimPct, effectiveSpd,
  renderLogEntriesHTML, flashRosterCard
} from './data.js';

import { elemChip, elemIcon, elementColor, weaponIcon } from './icons.js';

export {
  showRoundBanner,
  showTurnBanner,
  showReactionOverlay,
  showDownBanner
} from './overlay-fx.js';

export { renderLogEntriesHTML, flashRosterCard };

const $ = id => document.getElementById(id);

export const els = {
  roster:        $('roster'),
  rosterCount:   $('rosterCount'),
  roundBadge:    $('roundBadge'),
  turnOrder:     $('turnOrder'),
  attackerSel:   $('attackerSelect'),
  targetSel:     $('targetSelect'),
  actionGrid:    $('actionGrid'),
  presetGrid:    $('presetGrid'),
  logFeed:       $('logFeed'),
  historyBody:   $('historyBody'),
  tabPanelLog:   $('tabPanel-log'),
  tabPanelHist:  $('tabPanel-history'),
  clearLogBtn:   $('clearLogBtn'),
  importModal:   $('importModal'),
  importArea:    $('importTextarea'),
  importMsg:     $('importMsg')
};

export function updateAutoDim() {
  const dimEl = document.getElementById('bgDim');
  if (!dimEl) return;
  const imgEl = document.getElementById('bgImage');
  if (!imgEl || imgEl.style.display === 'none' || !imgEl.style.backgroundImage) return;
  const pct = computePartyDimPct();
  dimEl.style.opacity = (pct / 100).toFixed(3);
}

export function pushLog(html) {
  state.logEntries.push({ kind: 'log', html });
  if (state.logEntries.length > 250) state.logEntries.shift();

  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = html;
  els.logFeed.appendChild(div);
  while (els.logFeed.children.length > 250) els.logFeed.removeChild(els.logFeed.firstChild);
  els.logFeed.scrollTop = els.logFeed.scrollHeight;
}

export function pushDivider(text) {
  state.logEntries.push({ kind: 'divider', text });
  if (state.logEntries.length > 250) state.logEntries.shift();

  const div = document.createElement('div');
  div.className = 'log-divider';
  div.innerHTML = `<span>${esc(text)}</span>`;
  els.logFeed.appendChild(div);
  els.logFeed.scrollTop = els.logFeed.scrollHeight;
}

export function clearLog() {
  state.logEntries = [];
  els.logFeed.innerHTML = '';
}

export function pushHistory(entry) {
  state.history.push(entry);
  renderHistory();
}

export function renderHistory() {
  if (!state.history.length) {
    els.historyBody.innerHTML =
      '<tr><td colspan="6" class="text-center text-slate-600 py-6 text-xs">No actions recorded yet.</td></tr>';
    return;
  }

  els.historyBody.innerHTML = state.history.slice().reverse().map(h => `
    <tr class="border-b border-slate-800/70 hover:bg-slate-800/40">
      <td class="px-2 py-1.5 text-[11px] font-mono text-slate-500">${h.n}</td>
      <td class="px-2 py-1.5 text-[11px] font-mono text-slate-500">R${h.round}</td>
      <td class="px-2 py-1.5 text-[11px] font-bold text-slate-200">${esc(h.attacker)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-300">${esc(h.target)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-300">${esc(h.action)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-400">${esc(h.result)}</td>
    </tr>`).join('');
}

export function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  els.tabPanelLog.classList.toggle('hidden', tab !== 'log');
  els.tabPanelHist.classList.toggle('hidden', tab !== 'history');
}

export function renderTurnOrder() {
  const ordered = state.entities.filter(e => !isField(e));

  if (!ordered.length) {
    els.turnOrder.innerHTML = '<span class="text-xs text-slate-600 px-1">No combatants yet.</span>';
    return;
  }

  const curId = state.entities[state.turnIndex] ? state.entities[state.turnIndex].id : null;

  els.turnOrder.innerHTML = ordered.map((e, i) => {
    const active = e.id === curId;
    const bossBadge = e.type === 'boss'
      ? '<span class="text-[9px] font-black uppercase text-violet-300 ml-0.5">★</span>'
      : '';
      return `
      <div class="turn-chip ${active ? 'active' : ''} flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 shrink-0" data-id="${e.id}">
      <span class="text-[9px] font-mono text-slate-500">${i + 1}</span>
      <span class="inline-flex items-center gap-1 text-[11px] font-bold ${nameColor(e)}">
      ${elemIcon(e.vision, 11)}${esc(e.name)}${bossBadge}
      </span>
      <span class="text-[9px] font-mono text-slate-500">SPD ${effectiveSpd(e)}</span>
      </div>`;
  }).join('');
}

export function updateRoundBadge() {
  const total = state.entities.filter(e => !isField(e)).length;
  const actor = state.entities[state.turnIndex];
  const turnLabel = total ? `Turn ${Math.min(state.turnIndex + 1, total)}/${total}` : 'No turns';
  const actorLabel = actor && !isField(actor) ? ` · ${actor.name}` : '';
  els.roundBadge.textContent = `Round ${state.round} · ${turnLabel}${actorLabel}`;
}

export function renderFieldPanel() {
  const panel   = document.getElementById('fieldPanel');
  const content = document.getElementById('fieldContent');
  if (!panel || !content) return;

  const fields = state.entities.filter(isField);

  if (!fields.length) {
    panel.classList.add('hidden');
    content.innerHTML = '';
    return;
  }

  panel.classList.remove('hidden');

  content.innerHTML = fields.map(c => {
    if (c.type === 'core') {
      return `
      <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
      <span class="elem-icon-wrap" style="width:32px;height:32px;background-image:url('icons/dendro_core.png');background-size:contain;background-position:center;background-repeat:no-repeat">
      <img src="icons/dendro_core.png" alt="Dendro Core" class="w-full h-full object-contain" draggable="false" />
      </span>
      <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
      <span class="font-bold text-xs text-green-300">${esc(c.name)}</span>
      <span class="text-[9px] font-mono bg-green-500/20 text-green-300 border border-green-500/40 px-1 rounded">x${c.stacks || 1}</span>
      </div>
      <div class="text-[10px] text-slate-500 mt-0.5">Expires: R${c.expires_round}</div>
      </div>
      <button data-act="del-core" data-id="${c.id}" class="text-rose-400 hover:text-rose-300 transition ml-auto px-1" title="Remove Core">✕</button>
      </div>`;
    }
    return `
    <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
    <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">✦</div>
    <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2 flex-wrap">
    <span class="font-bold text-xs text-slate-300">${esc(c.name)}</span>
    </div>
    <div class="text-[10px] text-slate-500 mt-0.5">Active field entity</div>
    </div>
    </div>`;
  }).join('');
}

export function renderRoster() {
  const visible = state.entities.filter(e => !isField(e));
  els.rosterCount.textContent =
    visible.length + (visible.length === 1 ? ' entity' : ' entities');

  if (!visible.length) {
    els.roster.innerHTML =
      '<div class="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 text-slate-600 text-sm">' +
      'No combatants yet.<br><span class="text-xs">Spawn a preset or import JSON.</span></div>';
  } else {
    els.roster.innerHTML = visible.map(cardHTML).join('');
  }
  updateAutoDim();
}

function statBox(e, stat, label, color = 'text-slate-200') {
  const isModified = e['base_' + stat] !== undefined && e[stat] !== e['base_' + stat];
  const resetBtn = isModified 
    ? `<button data-act="stat-reset" data-id="${e.id}" data-stat="${stat}" class="text-amber-400 hover:text-amber-300 ml-0.5" title="Reset to base (${e['base_' + stat]})">⟲</button>` 
    : '';
  return `
    <div class="flex items-center justify-between gap-1 rounded-md bg-slate-950/70 border border-slate-800 px-1.5 py-1">
      <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">${label}</span>
      <div class="flex items-center gap-0.5">
        <button data-act="stat" data-id="${e.id}" data-stat="${stat}" data-delta="-1" class="stat-btn" title="Decrease">−</button>
        <button data-act="stat-edit" data-id="${e.id}" data-stat="${stat}"
          class="w-7 text-center text-[11px] font-mono font-bold ${color} hover:text-amber-300 transition"
          title="Click to set value">${e[stat]}</button>
        <button data-act="stat" data-id="${e.id}" data-stat="${stat}" data-delta="1" class="stat-btn" title="Increase">+</button>
        ${resetBtn}
      </div>
    </div>`;
}

function weaponBadgeHTML(e) {
  const key = e.weapon && WEAPONS[e.weapon] ? e.weapon : 'None';
  if (key === 'None') return '';
  const label = WEAPONS[key].label;
  const r = Math.max(0, Math.min(5, Number(e.weapon_rarity) || 0));
  const stars = r > 0 ? '<span class="text-amber-300">' + '★'.repeat(r) + '</span>' : '';
  return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">` +
  weaponIcon(key, 20) + `<span>${esc(label)}</span>` + stars + `</span>`;
}

function cardHTML(e) {
  const down     = e.hp_current <= 0;
  const isActive = state.entities[state.turnIndex] && state.entities[state.turnIndex].id === e.id;
  const isBoss   = e.type === 'boss';

  const hpPct     = e.hp_max ? Math.max(0, Math.min(100, (e.hp_current / e.hp_max) * 100)) : 0;
  const shieldPct = e.hp_max ? Math.max(0, Math.min(100, (e.shield    / e.hp_max) * 100)) : 0;

  const hpGrad = isBoss
    ? 'from-violet-600 via-fuchsia-500 to-rose-500'
    : hpPct > 50 ? 'from-emerald-500 to-green-400'
    : hpPct > 25 ? 'from-amber-500 to-yellow-400'
    : 'from-rose-600 to-red-500';

  const staminaPips = Array.from({ length: e.stamina_max }, (_, i) =>
    `<span class="pip ${i < e.stamina_current ? 'bg-lime-400' : 'bg-slate-700'}"></span>`).join('');

  const energyPips = Array.from({ length: e.energy_max }, (_, i) =>
    `<span class="pip ${i < e.energy_current
      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.85)]'
      : 'bg-slate-700'}"></span>`).join('');

  const typeBadge = e.type === 'player'
    ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">Player</span>'
    : isBoss
    ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-500/30 text-violet-100 border border-violet-400/70 shadow-[0_0_12px_-2px_rgba(139,92,246,.7)]">★ Boss</span>'
    : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">Enemy</span>';

  const statusList   = Array.isArray(e.status) ? e.status : [];
  const statusChips = statusList.map(s => `
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40">
    ${esc(s.name)}${s.stacks > 1 ? ` ${s.stacks}x` : ''}<span class="text-fuchsia-400/60">·${s.duration}</span>
    <button data-act="rmstatus" data-id="${e.id}" data-status="${esc(s.name)}"
    class="text-fuchsia-300/60 hover:text-white leading-none px-0.5">×</button>
    </span>`).join('');

  const auraOpts     = Array.isArray(AURA_OPTIONS) ? AURA_OPTIONS : [];
  const auraOptions  = auraOpts.map(a =>
    `<option value="${a}"${a === e.aura ? ' selected' : ''}>${a}</option>`).join('');

  const borderCls = down
    ? 'border-rose-900/70 opacity-60'
    : isActive
      ? 'border-amber-500/70 ring-1 ring-amber-500/30'
      : isBoss
        ? 'border-violet-500/60 shadow-[0_0_24px_-8px_rgba(139,92,246,.75)]'
        : (e.type === 'player' ? 'border-sky-900/60' : 'border-slate-800');

  const cdInfo = skillCooldownInfo(e, state.round);
  const cdBadge = cdInfo.onCd
    ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
             title="Elemental Skill ready on Round ${cdInfo.availableRound}">⏳ CD ${cdInfo.remaining}</span>`
    : '';

  const resetCdBtn = cdInfo.onCd
    ? `<button data-act="resetcd" data-id="${e.id}" title="Clear cooldown"
         class="px-2 h-7 rounded-md bg-amber-900/40 hover:bg-amber-700 text-amber-200 text-[10px] font-bold transition">⟲ CD</button>`
    : '';

    return `
    <div data-entity-id="${e.id}" class="rounded-xl border ${borderCls} bg-slate-900/80 p-3 space-y-2.5 transition hover:border-slate-600">

    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-bold text-sm truncate ${nameColor(e)}">${esc(e.name)}</span>
          ${typeBadge}
          ${weaponBadgeHTML(e)}
          ${down ? '<span class="text-[9px] font-black uppercase text-rose-500">☠ Down</span>' : ''}
          ${isActive ? '<span class="text-[9px] font-black uppercase text-amber-400">◀ Active</span>' : ''}
          ${cdBadge}
        </div>
      </div>
      ${elemChip(e.vision, e.vision, 28)}
    </div>

    <div>
      <div class="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        <span>HP</span>
        <span class="font-mono text-slate-300">
          ${e.hp_current} / ${e.hp_max}
          ${e.shield > 0 ? ` <span class="text-cyan-300">(+${e.shield})</span>` : ''}
        </span>
      </div>
      <div class="h-3 rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full bg-gradient-to-r ${hpGrad} transition-all duration-300" style="width:${hpPct}%"></div>
      </div>
      ${e.shield > 0 ? `
        <div class="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-cyan-400 to-sky-300 transition-all duration-300" style="width:${shieldPct}%"></div>
        </div>` : ''}

      <div class="flex items-center gap-1 mt-1.5">
        <button data-act="hp" data-id="${e.id}" data-delta="-5" class="w-8 h-6 rounded-md bg-slate-800 hover:bg-rose-800 text-[10px] font-bold transition">−5</button>
        <button data-act="hp" data-id="${e.id}" data-delta="-1" class="w-8 h-6 rounded-md bg-slate-800 hover:bg-rose-800 text-[10px] font-bold transition">−1</button>
        <button data-act="hp" data-id="${e.id}" data-delta="1"  class="w-8 h-6 rounded-md bg-slate-800 hover:bg-emerald-800 text-[10px] font-bold transition">+1</button>
        <button data-act="hp" data-id="${e.id}" data-delta="5"  class="w-8 h-6 rounded-md bg-slate-800 hover:bg-emerald-800 text-[10px] font-bold transition">+5</button>
        <button data-act="stat-edit" data-id="${e.id}" data-stat="hp_current"
          class="ml-auto text-[10px] uppercase tracking-wider text-slate-500 hover:text-amber-300 transition">Set HP</button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-1.5">
      ${statBox(e, 'atk',      'ATK')}
      ${statBox(e, 'def',      'DEF')}
      ${statBox(e, 'spd',      'SPD')}
      ${statBox(e, 'em',       'EM',   'text-emerald-300')}
      ${statBox(e, 'crit_dmg', 'CRIT', 'text-amber-300')}
      ${statBox(e, 'er',       'ER',   'text-sky-300')}
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-md bg-slate-950/70 border border-slate-800 px-1.5 py-1">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Stamina</span>
          <span class="text-[10px] font-mono text-lime-400">${e.stamina_current}/${e.stamina_max}</span>
        </div>
        <div class="flex items-center gap-1">
          <button data-act="stamina" data-id="${e.id}" data-delta="-1" class="stat-btn">−</button>
          <div class="flex gap-0.5 flex-1">${staminaPips}</div>
          <button data-act="stamina" data-id="${e.id}" data-delta="1" class="stat-btn">+</button>
        </div>
      </div>

      <div class="rounded-md bg-slate-950/70 border border-slate-800 px-1.5 py-1">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Energy</span>
          <span class="text-[10px] font-mono text-amber-400">${e.energy_current}/${e.energy_max}</span>
        </div>
        <div class="flex items-center gap-1">
          <button data-act="energy" data-id="${e.id}" data-delta="-1" class="stat-btn">−</button>
          <div class="flex gap-0.5 flex-1">${energyPips}</div>
          <button data-act="energy" data-id="${e.id}" data-delta="1" class="stat-btn">+</button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-1">
      <span class="text-[9px] uppercase tracking-wider text-slate-600 mr-0.5">Aura</span>
      ${elemChip(e.aura, e.aura, 28)}
      ${statusChips}
    </div>

    <div class="flex items-center gap-1.5 pt-2 border-t border-slate-800">
      <select data-act="aura" data-id="${e.id}" title="Override aura"
        class="flex-1 bg-slate-800 border border-slate-700 rounded-md px-1.5 py-1 text-[10px] text-slate-300">
        ${auraOptions}
      </select>
      <button data-act="addstatus" data-id="${e.id}" title="Add Custom Status"
        class="px-2 h-7 rounded-md bg-fuchsia-900/40 hover:bg-fuchsia-700 text-fuchsia-200 text-[10px] font-bold transition">+ Status</button>
      ${resetCdBtn}
      <button data-act="del" data-id="${e.id}" title="Remove combatant"
        class="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-700 text-rose-400 hover:text-white text-[11px] font-bold transition">✕</button>
    </div>
  </div>`;
}

export function renderSelects(force) {
  const sig =
  state.entities.map(e => e.id + ':' + e.hp_current + '/' + e.hp_max + ':' + effectiveSpd(e)).join(',') +
  '|' + state.entities.length + '|R' + state.round;
  if (!force && sig === state.selectSignature) return;
  state.selectSignature = sig;

  const prevAttacker = els.attackerSel.value;
  const prevTarget   = els.targetSel.value;

  if (!state.entities.length) {
    els.attackerSel.innerHTML = '<option value="">— no combatants —</option>';
    els.targetSel.innerHTML   = '<option value="">— no combatants —</option>';
    return;
  }

  // Element Emoji Map for Native Dropdowns
  const ELEM_EMOJI = {
    Pyro: '🔥', Hydro: '💧', Cryo: '❄️', Electro: '⚡',
    Anemo: '🌪️', Geo: '🪨', Dendro: '🌿', Physical: '⚔️', None: '🔘'
  };

  const getTypeEmoji = (e) => {
    if (e.type === 'player') return '🧑';
    if (e.type === 'boss') return '🐉';
    return '👹';
  };

  const formatEntity = (e) => {
    const elem = ELEM_EMOJI[e.vision] || '🔘';
    const wp = e.weapon && e.weapon !== 'None' ? e.weapon : 'Unarmed';
    return `${getTypeEmoji(e)} ${esc(e.name)} — ${elem} ${esc(e.vision)} [${esc(wp)}]`;
  };

  const attackerOpts = state.entities
  .filter(e => !isField(e))
  .map(e => `<option value="${e.id}">${formatEntity(e)}</option>`)
  .join('');

  const targetOpts = `
  <optgroup label="Special Targets">
  <option value="all_enemies" ${prevTarget === 'all_enemies' ? 'selected' : ''}>⚔ All Enemies</option>
  <option value="all_players" ${prevTarget === 'all_players' ? 'selected' : ''}>🛡 All Players</option>
  <option value="all_combatants" ${prevTarget === 'all_combatants' ? 'selected' : ''}>🌐 All in Combatant</option>
  <option value="random_enemy" ${prevTarget === 'random_enemy' ? 'selected' : ''}>🎲 Random Enemy</option>
  <option value="random_player" ${prevTarget === 'random_player' ? 'selected' : ''}>🎲 Random Player</option>
  </optgroup>
  <optgroup label="Specific Targets">
  ${(() => {
    const core = state.entities.find(isCore);
    return core ? `<option value="${core.id}" ${prevTarget === core.id ? 'selected' : ''}>🌱 ${esc(core.name)} (x${core.stacks || 1})</option>` : '';
  })()}
  ${state.entities.filter(e => !isField(e)).map(e => {
    return `<option value="${e.id}" ${prevTarget === e.id ? 'selected' : ''}>${formatEntity(e)}</option>`;
  }).join('')}
  </optgroup>
  `;

  els.attackerSel.innerHTML = attackerOpts || '<option value="">— no combatants —</option>';
  els.targetSel.innerHTML   = targetOpts   || '<option value="">— no combatants —</option>';

  const attackerExists = state.entities.some(e => e.id === prevAttacker && !isField(e));
  els.attackerSel.value = attackerExists
  ? prevAttacker
  : (state.entities.find(e => e.type === 'player' && !isField(e)) ||
  state.entities.find(e => !isField(e)) || { id: '' }).id;

  const targetExists = state.entities.some(e => e.id === prevTarget) || prevTarget.startsWith('all_') || prevTarget.startsWith('random_');
  els.targetSel.value = targetExists
  ? prevTarget
  : (state.entities.find(e => e.type === 'enemy' && !isField(e)) || state.entities.find(e => !isField(e)) || { id: '' }).id;
}

export function actionAvailability(actionKey, attacker) {
  if (!attacker || isField(attacker)) return { ok: true, reason: '' };

  if (actionKey === 'charged' && attacker.weapon !== 'Bow' && attacker.stamina_current < 1) {
    return { ok: false, reason: 'No Stamina (needs 1)' };
  }
  if (actionKey === 'burst' && attacker.energy_current < attacker.energy_max) {
    return { ok: false, reason: `Energy not full (${attacker.energy_current}/${attacker.energy_max})` };
  }
  if (actionKey === 'skill') {
    const info = skillCooldownInfo(attacker, state.round);
    if (info.onCd) {
      return {
        ok: false,
        reason: `Skill on cooldown — ready Round ${info.availableRound}`,
        cdRemaining: info.remaining
      };
    }
  }
  return { ok: true, reason: '' };
}

export function renderActions() {
  const attacker = getEntity(els.attackerSel.value);

  els.actionGrid.innerHTML = Object.keys(ACTIONS).map(key => {
    const a = ACTIONS[key];
    const active = state.selectedAction === key;
    const avail  = actionAvailability(key, attacker);
    const dimCls = avail.ok ? '' : 'action-disabled';
    const title  = avail.ok ? '' : ` title="${esc(avail.reason)}"`;

    let label = a.label;
    if (key === 'skill' && avail.cdRemaining) {
      label = `${a.label} (CD ${avail.cdRemaining})`;
    }

    const baseBorder = active
      ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-lg shadow-amber-900/20'
      : 'border-slate-700 bg-slate-800/60 text-slate-400 ' + a.cls + ' hover:text-slate-200';

    return `
      <button data-action="${key}"${title}
        class="group flex flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-3 text-[11px] font-bold uppercase tracking-wide transition active:scale-95 ${baseBorder} ${dimCls}">
        <span class="text-base leading-none">${a.icon}</span>
        <span class="leading-tight text-center">${label}</span>
      </button>`;
  }).join('');
}

export function ensureAvailableAction() {
  const attacker = getEntity(els.attackerSel.value);
  const avail = actionAvailability(state.selectedAction, attacker);
  if (!avail.ok) state.selectedAction = 'normal';
}

export function renderOperatorMenu() {
  const el = document.getElementById('operatorGrid');
  if (!el) return;

  const buttons = [
    { id: 'dummy_enemy', label: 'Dummy Enemy', icon: '👹', desc: '999,999 HP' },
    { id: 'dummy_player', label: 'Dummy Player', icon: '🧑', desc: '999,999 HP' },
    { id: 'dummy_boss', label: 'Dummy Boss', icon: '🐉', desc: '999,999 HP' },
    { id: 'spawn_core', label: 'Spawn Core', icon: '🌱', desc: 'Adds Dendro Core' },
    { id: 'heal_all', label: 'Heal All', icon: '💖', desc: 'Restores HP/Res' },
    { id: 'kill_enemies', label: 'Kill Enemies', icon: '💀', desc: 'Defeats all foes' }
  ];

  el.innerHTML = buttons.map(b => `
  <button data-op="${b.id}"
  class="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/70 hover:border-slate-500 active:scale-95 transition px-2.5 py-2">
  <div class="flex items-center gap-1.5">
  <span>${b.icon}</span>
  <span class="text-[11px] font-bold text-slate-200 truncate">${b.label}</span>
  </div>
  <div class="text-[9px] text-slate-500 font-mono mt-0.5">${b.desc}</div>
  </button>`).join('');
}

export function renderAll() {
  renderRoster();
  renderTurnOrder();
  renderSelects(true);
  renderActions();
  updateRoundBadge();
  renderFieldPanel();
  updateAutoDim();
}
