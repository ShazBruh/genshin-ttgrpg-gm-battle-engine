/* ============================================================
   player-render.js  —  All player-view renderers
   ============================================================ */
import {
  state, esc, nameColor, isCore, isField, skillCooldownInfo,
  effectiveSpd, ACTIONS, WEAPONS,
  renderLogEntriesHTML, flashRosterCard
} from '../js/data.js';

import { elemChip, elemIcon, weaponIcon } from '../js/icons.js';

export function renderPlayerAll({ myCharId = null } = {}) {
  renderTurnOrder();
  renderField();
  renderRoster();
  renderLog();
  renderHistory();
  renderMyChar(myCharId);
  renderBossBar();
}

function renderField() {
  const panel = document.getElementById('playerFieldPanel');
  const content = document.getElementById('playerFieldContent');
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
      <div class="text-[10px] text-slate-500 mt-0.5">Expires: Round ${c.expires_round}</div>
      </div>
      </div>`;
    }
    return `
    <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
    <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">✦</div>
    <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2 flex-wrap">
    <span class="font-bold text-xs text-slate-300">${esc(c.name)}</span>
    </div>
    <div class="text-[10px] text-slate-500 mt-0.5">Field Entity</div>
    </div>
    </div>`;
  }).join('');
}

function weaponBadgeHTML(e, iconSize = 20) {
  const key = e.weapon && WEAPONS[e.weapon] ? e.weapon : 'None';
  if (key === 'None') return '';
  const label = WEAPONS[key].label;
  const r = Math.max(0, Math.min(5, Number(e.weapon_rarity) || 0));
  const stars = r > 0 ? '<span class="text-amber-300">' + '★'.repeat(r) + '</span>' : '';
  return `<span class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">` +
         weaponIcon(key, iconSize) +
         `<span>${esc(label)}</span>` + stars + `</span>`;
}

function renderTurnOrder() {
  const el = document.getElementById('pTurnOrder');
  if (!el) return;

  const ordered = state.entities.filter(e => !isField(e));
  if (!ordered.length) {
    el.innerHTML = '<span class="text-xs text-slate-600 px-1">Waiting for the GM…</span>';
    return;
  }

  const curId = state.entities[state.turnIndex] ? state.entities[state.turnIndex].id : null;

  el.innerHTML = ordered.map((e, i) => {
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

function renderRoster() {
  const el      = document.getElementById('pRoster');
  const countEl = document.getElementById('pRosterCount');
  if (!el) return;

  const visible = state.entities.filter(e => !isField(e));

  if (countEl) {
    countEl.textContent = visible.length + (visible.length === 1 ? ' entity' : ' entities');
  }

  if (!visible.length) {
    el.innerHTML =
      '<div class="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 text-slate-600 text-sm">' +
      'Waiting for the GM to begin the encounter…</div>';
    return;
  }

  el.innerHTML = visible.map(cardHTML).join('');
}

function cardHTML(e) {
  const down     = e.hp_current <= 0;
  const isActive = state.entities[state.turnIndex] &&
                   state.entities[state.turnIndex].id === e.id;
  const isBoss   = e.type === 'boss';

  const hideNumbers = (e.type === 'enemy' || isBoss);

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

  const statusChips = (e.status || []).map(s => `
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40">
    ${esc(s.name)}${s.stacks > 1 ? ` ${s.stacks}x` : ''}<span class="text-fuchsia-400/60">·${s.duration}</span>
    </span>`).join('');

  const borderCls = down
    ? 'border-rose-900/70 opacity-60'
    : isActive
      ? 'border-amber-500/70 ring-1 ring-amber-500/30'
      : isBoss
        ? 'border-violet-500/60 shadow-[0_0_24px_-8px_rgba(139,92,246,.75)]'
        : (e.type === 'player' ? 'border-sky-900/60' : 'border-slate-800');

  const cdInfo = skillCooldownInfo(e, state.round);
  const cdBadge = cdInfo.onCd
    ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">⏳ CD ${cdInfo.remaining}</span>`
    : '';

  const hpText = hideNumbers
    ? ''
    : `${e.hp_current} / ${e.hp_max}`;

  const shieldNote = e.shield > 0
    ? ` <span class="text-cyan-300">(+${hideNumbers ? '?' : e.shield})</span>`
    : '';

    return `
    <div data-entity-id="${e.id}" class="rounded-xl border ${borderCls} bg-slate-900/70 p-3 space-y-2 transition">

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
          <span class="font-mono text-slate-300">${hpText}${shieldNote}</span>
        </div>
        <div class="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-gradient-to-r ${hpGrad} transition-all duration-300"
               style="width:${hpPct}%"></div>
        </div>
        ${e.shield > 0 ? `
          <div class="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-400 to-sky-300 transition-all duration-300"
                 style="width:${shieldPct}%"></div>
          </div>` : ''}
      </div>

      ${e.type === 'player' ? `
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-1.5 py-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Stamina</span>
              <span class="text-[10px] font-mono text-lime-400">${e.stamina_current}/${e.stamina_max}</span>
            </div>
            <div class="flex gap-0.5">${staminaPips}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-1.5 py-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Energy</span>
              <span class="text-[10px] font-mono text-amber-400">${e.energy_current}/${e.energy_max}</span>
            </div>
            <div class="flex gap-0.5">${energyPips}</div>
          </div>
        </div>` : ''}

      <div class="flex flex-wrap items-center gap-1">
        <span class="text-[9px] uppercase tracking-wider text-slate-600 mr-0.5">Aura</span>
        ${elemChip(e.aura, e.aura, 22)}
        ${statusChips}
      </div>
    </div>`;
}

let lastLogHash = '';

function renderLog() {
  const el = document.getElementById('pLogFeed');
  if (!el) return;

  const entries = state.logEntries || [];
  const hash = entries.length + '|' + (entries[entries.length - 1]
  ? (entries[entries.length - 1].html || entries[entries.length - 1].text || '').slice(0, 120)
  : '');
  if (hash === lastLogHash) return;
  lastLogHash = hash;

  el.innerHTML = renderLogEntriesHTML(entries);
  el.scrollTop = el.scrollHeight;
}

function renderHistory() {
  const el = document.getElementById('pHistoryBody');
  if (!el) return;

  if (!state.history.length) {
    el.innerHTML = '<tr><td colspan="6" class="text-center text-slate-600 py-6 text-xs">No actions recorded yet.</td></tr>';
    return;
  }

  el.innerHTML = state.history.slice().reverse().map(h => `
    <tr class="border-b border-slate-800/70 hover:bg-slate-800/40">
      <td class="px-2 py-1.5 text-[11px] font-mono text-slate-500">${h.n}</td>
      <td class="px-2 py-1.5 text-[11px] font-mono text-slate-500">R${h.round}</td>
      <td class="px-2 py-1.5 text-[11px] font-bold text-slate-200">${esc(h.attacker)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-300">${esc(h.target)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-300">${esc(h.action)}</td>
      <td class="px-2 py-1.5 text-[11px] text-slate-400">${esc(h.result)}</td>
    </tr>`).join('');
}

function playerActionAvailability(me, key) {
  if (!me) return { ok: false, reason: 'No character' };

  if (key === 'charged' && me.weapon !== 'Bow' && me.stamina_current < 1) {
    return { ok: false, reason: 'Not enough Stamina (needs 1)', note: 'No STA' };
  }
  if (key === 'burst' && me.energy_current < me.energy_max) {
    return {
      ok: false,
      reason: `Energy not full (${me.energy_current}/${me.energy_max})`,
      note: `${me.energy_current}/${me.energy_max} ⚡`
    };
  }
  if (key === 'skill') {
    const info = skillCooldownInfo(me, state.round);
    if (info.onCd) {
      return {
        ok: false,
        reason: `On cooldown — ready Round ${info.availableRound}`,
        note: `CD ${info.remaining}`
      };
    }
  }
  return { ok: true, reason: '' };
}

function renderMyChar(myCharId) {
  const panel   = document.getElementById('myCharPanel');
  const content = document.getElementById('myCharContent');
  const nameEl  = document.getElementById('myCharName');
  if (!panel || !content) return;

  const me = myCharId ? state.entities.find(e => e.id === myCharId) : null;

  if (!me) {
    panel.classList.remove('populated');
    if (nameEl) nameEl.textContent = '—';
    content.innerHTML = `
      <div class="my-char-empty">
        Upload your character to begin.
        <div class="hint">Your stats, actions, and dice will appear here.</div>
      </div>`;
    return;
  }

  panel.classList.add('populated');
  if (nameEl) nameEl.textContent = me.name;

  const hpPct = me.hp_max
    ? Math.max(0, Math.min(100, (me.hp_current / me.hp_max) * 100))
    : 0;
  const down = me.hp_current <= 0;

  const staminaPips = Array.from({ length: me.stamina_max }, (_, i) =>
    `<span class="pip ${i < me.stamina_current ? 'bg-lime-400' : 'bg-slate-700'}"></span>`).join('');
  const energyPips = Array.from({ length: me.energy_max }, (_, i) =>
    `<span class="pip ${i < me.energy_current
      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.85)]'
      : 'bg-slate-700'}"></span>`).join('');

  const weaponBadge = weaponBadgeHTML(me, 24);

  const statusChips = (me.status || []).map(s => `
  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40">
  ${esc(s.name)}${s.stacks > 1 ? ` ${s.stacks}x` : ''}<span class="text-fuchsia-400/60">·${s.duration}</span>
  </span>`).join('');

  const actionKeys = ['normal', 'charged', 'skill', 'burst', 'heal', 'shield'];
  const actionsHTML = actionKeys.map(key => {
    const a = ACTIONS[key];
    const avail = playerActionAvailability(me, key);
    const cls = avail.ok ? '' : 'action-disabled';
    const title = avail.ok ? '' : ` title="${esc(avail.reason)}"`;
    return `
      <div${title} class="rounded-lg border border-slate-700 bg-slate-800/60 px-1.5 py-2 flex flex-col items-center justify-center gap-0.5 ${cls}">
        <span class="text-base leading-none">${a.icon}</span>
        <span class="text-[9px] font-bold uppercase tracking-wide text-slate-400 text-center leading-tight">${esc(a.label)}</span>
        ${avail.note ? `<span class="text-[8px] font-mono text-amber-300/80">${esc(avail.note)}</span>` : ''}
      </div>`;
  }).join('');

  const critDie = me.crit_die || '—';
  const critDmg = me.crit_dmg || 0;

  content.innerHTML = `
    <div class="space-y-4">

      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/70 border border-slate-800">
            ${elemIcon(me.vision, 32)}
          </span>
          <div class="min-w-0">
            <div class="text-lg font-bold truncate ${nameColor(me)}">${esc(me.name)}</div>
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              ${elemChip(me.vision, me.vision, 18)}
              ${weaponBadge}
            </div>
          </div>
        </div>
        ${down ? '<span class="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-black uppercase tracking-wider">☠ Down</span>' : ''}
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">
          <span class="font-bold">Hit Points</span>
          <span class="font-mono text-slate-300">
            ${me.hp_current} / ${me.hp_max}
            ${me.shield > 0 ? ` <span class="text-cyan-300">(+${me.shield} shield)</span>` : ''}
          </span>
        </div>
        <div class="my-char-hp-bar">
          <div class="my-char-hp-fill" style="width:${hpPct}%"></div>
          <div class="my-char-hp-text">${me.hp_current} / ${me.hp_max}</div>
        </div>
      </div>

      <div>
        <div class="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Stats</div>
        <div class="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-slate-500">
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">ATK</div>
            <div class="text-[14px] font-mono font-bold text-slate-200 normal-case">${me.atk}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">DEF</div>
            <div class="text-[14px] font-mono font-bold text-slate-200 normal-case">${me.def}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">SPD</div>
            <div class="text-[14px] font-mono font-bold text-slate-200 normal-case">${me.spd}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">EM</div>
            <div class="text-[14px] font-mono font-bold text-emerald-300 normal-case">${me.em}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">CRIT DMG</div>
            <div class="text-[14px] font-mono font-bold text-amber-300 normal-case">+${me.crit_dmg}</div>
          </div>
          <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5 text-center">
            <div class="text-slate-600">ER</div>
            <div class="text-[14px] font-mono font-bold text-sky-300 normal-case">${me.er}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Stamina</span>
            <span class="text-[11px] font-mono text-lime-400">${me.stamina_current}/${me.stamina_max}</span>
          </div>
          <div class="flex gap-0.5">${staminaPips}</div>
        </div>
        <div class="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Energy</span>
            <span class="text-[11px] font-mono text-amber-400">${me.energy_current}/${me.energy_max}</span>
          </div>
          <div class="flex gap-0.5">${energyPips}</div>
        </div>
      </div>

      <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-center gap-3">
        <span class="text-2xl select-none">🎲</span>
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">Critical Roll</div>
          <div class="text-[12px] text-slate-300">
            Roll <b class="font-mono text-amber-300">${esc(critDie)}</b> — max roll triggers a crit.
            <span class="text-slate-500">Bonus:</span>
            <b class="font-mono text-amber-300">+${critDmg} DMG</b>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <span class="text-[10px] uppercase tracking-wider text-slate-600 mr-0.5">Aura</span>
        ${elemChip(me.aura, me.aura, 20)}
        ${statusChips}
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Actions (View Only)</span>
          <span class="text-[9px] text-slate-600 italic">GM executes on your behalf</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5">
          ${actionsHTML}
        </div>
      </div>

    </div>`;
}

function renderBossBar() {
  const bar    = document.getElementById('bossBar');
  const nameEl = document.getElementById('bossBarName');
  const valEl  = document.getElementById('bossBarValue');
  const fillEl = document.getElementById('bossBarFill');
  if (!bar || !nameEl || !valEl || !fillEl) return;

  const boss = state.entities.find(e => e.type === 'boss' && e.hp_current > 0);

  if (!boss) {
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');

  const pct = boss.hp_max ? Math.max(0, Math.min(100, (boss.hp_current / boss.hp_max) * 100)) : 0;
  nameEl.textContent = boss.name;
  valEl.textContent  = `${Math.round(pct)}%`;
  fillEl.style.width = pct + '%';

  if (pct <= 25) bar.classList.add('boss-critical');
  else bar.classList.remove('boss-critical');
}

let playerTurnOrderWired = false;

export function wirePlayerTurnOrderClicks() {
  if (playerTurnOrderWired) return;
  playerTurnOrderWired = true;

  const order  = document.getElementById('pTurnOrder');
  const roster = document.getElementById('pRoster');
  if (!order || !roster) return;

  order.addEventListener('click', ev => {
    const chip = ev.target.closest('[data-id]');
    if (!chip) return;
    flashRosterCard(roster, chip.dataset.id);
  });
}
