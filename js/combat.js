/* ============================================================
 *  combat.js
 *  Damage formulas, elemental reaction matrix, action execution,
 *  and turn advancement. Now with Dendro Core spawning/detonation
 *  and Elemental Skill cooldowns.
 *  ============================================================ */

import {
  state, getEntity, effDef, addStatus, currentActor, sortBySpeed,
  LINGER, REACTIONS, AURA_COMPONENTS, ELEM_STYLE, ACTIONS,
  esc, nameColor, isCore, skillCooldownInfo,
  normalizeCore, uniqueName
} from './data.js';

import {
  pushLog, pushDivider, pushHistory,
  renderRoster, renderTurnOrder, renderSelects, updateRoundBadge,
  showRoundBanner, showReactionOverlay, showTurnBanner,
  renderActions, ensureAvailableAction, renderCorePanel, els
} from './ui.js';

import { playActionSfx, playReactionSfx } from './audio.js';

/* ============================================================
 *  REACTION LOOKUP
 *  ============================================================ */

export function findReaction(elem, aura) {
  if (!aura || aura === 'None') return null;

  if (aura === 'Quicken') {
    if (elem === 'Electro') {
      return { name: 'Aggravate', mult: 1, clear: false, aggravate: true, a: 'Electro', b: 'Dendro' };
    }
    if (elem === 'Dendro') {
      return { name: 'Spread', mult: 1, clear: false, spread: true, a: 'Dendro', b: 'Electro' };
    }
  }

  const comps = AURA_COMPONENTS[aura] || [aura];
  for (const r of REACTIONS) {
    const aMatch = comps.includes(r.a) && elem === r.b;
    const bMatch = comps.includes(r.b) && elem === r.a;
    if (aMatch || bMatch) return r;
  }
  return null;
}

/* ============================================================
 *  DAMAGE APPLICATION
 *  ============================================================ */

export function applyDamage(target, amount) {
  let remaining = Math.max(0, amount);
  let absorbed = 0;

  if (target.shield > 0) {
    absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }

  const before = target.hp_current;
  target.hp_current = Math.max(0, target.hp_current - remaining);

  return { absorbed, hpLost: before - target.hp_current };
}

/* ============================================================
 *  INTERNAL HELPERS
 *  ============================================================ */

function refreshAfterAction() {
  sortBySpeed();
  state.selectSignature = '';
  renderRoster();
  renderTurnOrder();
  renderSelects(true);
  updateRoundBadge();
  renderActions();
  renderCorePanel();
}

/**
 * Handle an attack against a Dendro Core.
 * Only Pyro / Electro detonate. Everything else is absorbed.
 */
function handleCoreDetonation(A, T, action, opts) {
  const actionLabel = ACTIONS[action] ? ACTIONS[action].label : action;

  // Determine incoming element (mirrors normal damage rules)
  let incomingElem = null;
  if (action === 'skill' || action === 'burst') {
    incomingElem = A.vision;
  } else if (opts.catalyst && (action === 'normal' || action === 'charged')) {
    incomingElem = A.vision;
  }

  // Consume resources (the action still happened)
  if (action === 'charged') {
    A.stamina_current = Math.max(0, A.stamina_current - 1);
  }
  if (action === 'burst') {
    A.energy_current = 0;
  }
  if (action === 'skill') {
    A.skill_last_round = state.round;
    const gain = 1 + (A.er || 0);
    A.energy_current = Math.min(A.energy_max, A.energy_current + gain);
  }

  // --- No element: physical attacks do nothing ---
  if (!incomingElem) {
    pushLog(
      `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
      `<b class="${nameColor(A)}">${esc(A.name)}</b> struck <b class="text-green-300">${esc(T.name)}</b> with ` +
      `<b class="text-slate-100">${esc(actionLabel)}</b>, but physical force has no effect on the core.`
    );
    pushHistory({
      n: state.history.length + 1, round: state.round,
      attacker: A.name, target: T.name, action: actionLabel,
      result: 'No effect (physical)'
    });
    playActionSfx();
    refreshAfterAction();
    return;
  }

  // --- Only Pyro / Electro detonate ---
  if (incomingElem !== 'Pyro' && incomingElem !== 'Electro') {
    const ec = (ELEM_STYLE[incomingElem] || ELEM_STYLE.None).name;
    pushLog(
      `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
      `<b class="${nameColor(A)}">${esc(A.name)}</b> applied <span class="${ec}">${esc(incomingElem)}</span> to ` +
      `<b class="text-green-300">${esc(T.name)}</b>, but the core repels it — nothing happens.`
    );
    pushHistory({
      n: state.history.length + 1, round: state.round,
      attacker: A.name, target: T.name, action: actionLabel,
      result: `No effect (${incomingElem})`
    });
    playActionSfx();
    refreshAfterAction();
    return;
  }

  // --- DETONATE ---
  const isPyro        = incomingElem === 'Pyro';
  const reactionName  = isPyro ? 'Burgeon' : 'Hyperbloom';
  const perHitDamage  = isPyro
  ? Math.max(1, Math.floor(A.em * 1.5))   // Burgeon: AoE
  : Math.max(1, A.em * 3);                // Hyperbloom: single

  // Remove the core
  state.entities = state.entities.filter(x => x.id !== T.id);

  // Living enemies
  const enemies = state.entities.filter(x => x.type === 'enemy' && x.hp_current > 0);

  let logExtra = '';
  const historyParts = [];

  if (!enemies.length) {
    logExtra = ' <span class="text-slate-400">The blast dissipates — no enemies in range.</span>';
    historyParts.push('No enemies to hit');
  } else if (isPyro) {
    // --- Burgeon: hit every enemy ---
    const hits = enemies.map(enemy => {
      const dealt = applyDamage(enemy, perHitDamage);
      const isDown = enemy.hp_current <= 0;
      return `<b class="${nameColor(enemy)}">${esc(enemy.name)}</b> takes ` +
      `<span class="text-rose-400 font-bold">${dealt.hpLost}</span> ` +
      `(HP: <span class="font-mono ${isDown ? 'text-rose-500' : 'text-emerald-300'}">` +
      `${enemy.hp_current}/${enemy.hp_max}</span>)` +
      (isDown ? ' <span class="text-rose-500 font-black">☠</span>' : '');
    });
    logExtra = ` <span class="text-orange-300 font-semibold">💥 Burgeon — AoE blast!</span> ` + hits.join('; ') + '.';
    historyParts.push(`Burgeon AoE ${perHitDamage} dmg × ${enemies.length} target(s)`);
  } else {
    // --- Hyperbloom: hit one random enemy ---
    const idx    = Math.floor(Math.random() * enemies.length);
    const target = enemies[idx];
    const dealt  = applyDamage(target, perHitDamage);
    const isDown = target.hp_current <= 0;
    logExtra = ` <span class="text-purple-300 font-semibold">⚡ Hyperbloom!</span> Streaks toward ` +
    `<b class="${nameColor(target)}">${esc(target.name)}</b> for ` +
    `<span class="text-rose-400 font-bold">${dealt.hpLost}</span> ` +
    `(HP: <span class="font-mono ${isDown ? 'text-rose-500' : 'text-emerald-300'}">` +
    `${target.hp_current}/${target.hp_max}</span>)` +
    (isDown ? ' <span class="text-rose-500 font-black">☠ DEFEATED!</span>' : '');
    historyParts.push(`Hyperbloom ${perHitDamage} dmg → ${target.name}`);
  }

  // Log line
  const ec = (ELEM_STYLE[incomingElem] || ELEM_STYLE.None).name;
  let msg = `<span class="text-slate-600 font-mono">[R${state.round}]</span> `;
  msg += `<b class="${nameColor(A)}">${esc(A.name)}</b> detonated <b class="text-green-300">${esc(T.name)}</b> with `;
  msg += `<span class="${ec}">${esc(incomingElem)}</span> — `;
  msg += `<span class="inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/50 text-[10px] font-black uppercase tracking-wider">${esc(reactionName)}</span>`;
  msg += ` <span class="text-slate-500 text-[11px]">(EM ${A.em})</span>`;
  msg += logExtra;
  pushLog(msg);

  // History
  historyParts.unshift(`${reactionName} (EM ${A.em})`);
  pushHistory({
    n: state.history.length + 1,
    round: state.round,
    attacker: A.name,
    target: T.name,
    action: actionLabel,
    result: historyParts.join(' · ')
  });

  // FX
  playActionSfx();
  playReactionSfx();
  showReactionOverlay(reactionName, 'Dendro', incomingElem);

  refreshAfterAction();
}

/* ============================================================
 *  ACTION EXECUTION
 *  ============================================================ */

export function executeAction(opts) {
  const A = getEntity(opts.attackerId);
  const T = getEntity(opts.targetId);
  const action = opts.action;
  const label  = ACTIONS[action] ? ACTIONS[action].label : action;

  /* ---- Attacker guard ---- */
  if (!A) {
    pushLog('<span class="text-rose-400">⚠ No attacker selected.</span>');
    return;
  }
  if (isCore(A)) {
    pushLog('<span class="text-rose-400">⚠ Dendro Cores cannot act.</span>');
    return;
  }

  /* ---- Elemental Skill cooldown ---- */
  if (action === 'skill') {
    const info = skillCooldownInfo(A, state.round);
    if (info.onCd) {
      pushLog(
        `<span class="text-rose-400">⚠ <b>${esc(A.name)}</b>'s Elemental Skill is on cooldown — ` +
        `ready <b>Round ${info.availableRound}</b>.</span>`
      );
      return;
    }
  }

  /* ---- Charged Attack stamina ---- */
  if (action === 'charged' && A.stamina_current < 1) {
    pushLog(`<span class="text-rose-400">⚠ <b>${esc(A.name)}</b> has no Stamina for a Charged Attack!</span>`);
    return;
  }

  /* ---- Burst energy ---- */
  if (action === 'burst' && A.energy_current < A.energy_max) {
    pushLog(`<span class="text-rose-400">⚠ <b>${esc(A.name)}</b> needs full Energy for a Burst ` +
    `(${A.energy_current}/${A.energy_max}).</span>`);
    return;
  }

  /* -------- HEAL -------- */
  if (action === 'heal') {
    const tgt = T || A;
    const before = tgt.hp_current;
    tgt.hp_current = Math.min(tgt.hp_max, tgt.hp_current + opts.amount);
    const healed = tgt.hp_current - before;

    pushLog(
      `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
      `<b class="${nameColor(A)}">${esc(A.name)}</b> healed <b>${esc(tgt.name)}</b> ` +
      `for <span class="text-emerald-400 font-bold">${healed} HP</span>. ` +
      `<b>${esc(tgt.name)}</b> HP: <span class="font-mono text-emerald-300">${tgt.hp_current}/${tgt.hp_max}</span>` +
      (healed === 0 ? ' <span class="text-slate-500">(already at full)</span>' : '')
    );

    pushHistory({
      n: state.history.length + 1, round: state.round,
      attacker: A.name, target: tgt.name, action: label,
      result: `Healed ${healed} HP`
    });

    playActionSfx();
    refreshAfterAction();
    return;
  }

  /* -------- SHIELD -------- */
  if (action === 'shield') {
    const tgt = T || A;
    const amt = Math.max(0, opts.amount);
    tgt.shield += amt;

    pushLog(
      `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
      `<b class="${nameColor(A)}">${esc(A.name)}</b> granted a ` +
      `<span class="text-cyan-300 font-bold">${amt} HP Shield</span> to <b>${esc(tgt.name)}</b>. ` +
      `Total Shield: <span class="font-mono text-cyan-300">${tgt.shield}</span>`
    );

    pushHistory({
      n: state.history.length + 1, round: state.round,
      attacker: A.name, target: tgt.name, action: label,
      result: `Shield +${amt} (total ${tgt.shield})`
    });

    playActionSfx();
    refreshAfterAction();
    return;
  }

  /* -------- DODGE -------- */
  if (action === 'dodge') {
    const before = A.stamina_current;
    A.stamina_current = Math.max(0, A.stamina_current - 1);

    pushLog(
      `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
      `<b class="${nameColor(A)}">${esc(A.name)}</b> <span class="text-teal-300">dodged</span>. ` +
      `Stamina: <span class="font-mono text-lime-400">${A.stamina_current}/${A.stamina_max}</span>` +
      (before === 0 ? ' <span class="text-rose-400">(no stamina available!)</span>' : '')
    );

    pushHistory({
      n: state.history.length + 1, round: state.round,
      attacker: A.name, target: '—', action: label,
      result: `Stamina ${A.stamina_current}/${A.stamina_max}`
    });

    playActionSfx();
    refreshAfterAction();
    return;
  }

  /* -------- DAMAGE ACTIONS ---- need target ---- */
  if (!T) {
    pushLog('<span class="text-rose-400">⚠ No target selected.</span>');
    return;
  }

  /* -------- Core detonation path -------- */
  if (isCore(T)) {
    handleCoreDetonation(A, T, action, opts);
    return;
  }

  /* -------- Normal damage flow -------- */
  const def = effDef(T);
  let base = 0;
  let elem = null;
  let energyGain = 0;
  let consumeBurst = false;

  switch (action) {
    case 'normal':
      base = Math.max(1, A.atk - def);
      if (opts.catalyst) elem = A.vision;
      break;

    case 'charged':
      base = Math.max(1, (A.atk + 2) - def);
      if (opts.catalyst) elem = A.vision;
      A.stamina_current = Math.max(0, A.stamina_current - 1);
    break;

    case 'skill':
      base = Math.max(1, A.atk - def);
      elem = A.vision;
      energyGain = 1 + (A.er || 0);
      A.skill_last_round = state.round;      // ← start cooldown
      break;

    case 'burst':
      base = Math.max(1, (A.atk * 2) - def);
      elem = A.vision;
      consumeBurst = true;
      break;
  }

  /* ---- Assemble damage ---- */
  let dmg = base;
  const parts = [];
  const historyResult = [];

  if (opts.isCrit) {
    dmg += A.crit_dmg;
    parts.push(`<span class="text-amber-300 font-semibold">CRIT +${A.crit_dmg}</span>`);
    historyResult.push(`CRIT +${A.crit_dmg}`);
  }
  if (opts.bonus !== 0) {
    dmg += opts.bonus;
    parts.push(
      `<span class="${opts.bonus > 0 ? 'text-emerald-300' : 'text-rose-300'} font-semibold">` +
      `${opts.bonus > 0 ? 'BONUS +' : 'PENALTY '}${opts.bonus}</span>`
    );
    historyResult.push(`${opts.bonus > 0 ? 'Bonus' : 'Penalty'} ${opts.bonus}`);
  }

  /* ---- Reaction check ---- */
  let reaction = null;
  if (elem && T.aura && T.aura !== 'None') {
    reaction = findReaction(elem, T.aura);
    if (reaction) {
      if (reaction.mult) {
        const emBonus = reaction.mult * A.em;
        dmg += emBonus;
        parts.push(`<span class="text-fuchsia-300 font-semibold">${reaction.name} +${emBonus} EM</span>`);
        historyResult.push(`${reaction.name} +${emBonus} EM`);
      } else {
        parts.push(`<span class="text-fuchsia-300 font-semibold">${reaction.name}</span>`);
        historyResult.push(reaction.name);
      }
    }
  }

  dmg = Math.max(0, dmg);
  const dealt = applyDamage(T, dmg);

  /* ---- Aura update ---- */
  if (elem) {
    if (reaction) {
      if (reaction.clear) T.aura = 'None';
      else if (reaction.newAura) T.aura = reaction.newAura;
    } else if (LINGER.includes(elem)) {
      T.aura = elem;
    }
  }

  /* ---- Status ---- */
  if (reaction && reaction.status) {
    addStatus(T, reaction.status, reaction.statusDur || 2);
  }

  /* ---- Side effects ---- */
  let sideNote = '';
  if (reaction) {
    if (reaction.swirl) {
      sideNote += ` <span class="text-teal-300">💨 Swirl scatters ${esc(elem)} in an AoE blast!</span>`;
    }
    if (reaction.crystallize) {
      A.shield += A.em;
      sideNote += ` <span class="text-amber-300">💎 Crystallize — ${esc(A.name)} gains a ${A.em} HP Shield.</span>`;
    }
    if (reaction.bloom) {
      // ← Spawn a Dendro Core
      const coreName = uniqueName('Dendro Core');
      const core = normalizeCore(state.round, coreName);
      state.entities.push(core);
      sideNote += ` <span class="text-green-300">🌱 <b>${esc(core.name)}</b> drops on the field! (Expires Round ${core.expires_round})</span>`;
    }
    if (reaction.name === 'Frozen')       sideNote += ` <span class="text-cyan-300">❄ ${esc(T.name)} is Frozen — skips next turn!</span>`;
    if (reaction.name === 'Overloaded')   sideNote += ` <span class="text-orange-300">💥 ${esc(T.name)} is knocked back!</span>`;
    if (reaction.name === 'Superconduct') sideNote += ` <span class="text-purple-300">⚡ ${esc(T.name)} DEF reduced by 2 (2 turns).</span>`;
    if (reaction.aggravate)               sideNote += ' <span class="text-purple-300">⚡ Aggravate empowers the strike!</span>';
    if (reaction.spread)                  sideNote += ' <span class="text-green-300">🌿 Spread empowers the strike!</span>';
    if (reaction.name === 'Electro-Charged') sideNote += ' <span class="text-purple-300">⚡ The charge lingers between foes.</span>';
  }

  /* ---- Energy ---- */
  let energyNote = '';
  if (consumeBurst) {
    const spent = A.energy_current;
    A.energy_current = 0;
    energyNote = ` <span class="text-amber-400/80">(Burst — ${spent} Energy spent)</span>`;
    historyResult.push(`Burst ${spent} Energy`);
  } else if (energyGain > 0) {
    const before = A.energy_current;
    A.energy_current = Math.min(A.energy_max, A.energy_current + energyGain);
    const gained = A.energy_current - before;
    energyNote = ` <span class="text-amber-400/80">(+${gained} Energy${A.energy_current >= A.energy_max ? ' — BURST READY!' : ''})</span>`;
    historyResult.push(`+${gained} Energy`);
  }

  /* ---- Cooldown note ---- */
  let cdNote = '';
  if (action === 'skill' && A.skill_cd_max > 0) {
    cdNote = ` <span class="text-amber-400/60 text-[11px]">(Skill CD ${A.skill_cd_max} rounds — ready R${state.round + A.skill_cd_max + 1})</span>`;
    historyResult.push(`CD ${A.skill_cd_max}R`);
  }

  /* ---- Log line ---- */
  const dmgType = elem || 'Physical';
  const dmgTypeColor = (ELEM_STYLE[dmgType] || ELEM_STYLE.Physical).name;

  let msg = `<span class="text-slate-600 font-mono">[R${state.round}]</span> `;
  msg += `<b class="${nameColor(A)}">${esc(A.name)}</b> used <b class="text-slate-100">${label}</b> on `;
  msg += `<b class="${nameColor(T)}">${esc(T.name)}</b>!`;

  if (reaction) {
    msg += ` <span class="inline-block px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 text-[10px] font-black uppercase tracking-wider">Reaction: ${esc(reaction.name)}</span>`;
  }

  msg += ` Dealt <span class="text-rose-400 font-black text-sm">${dealt.hpLost}</span> `;
  msg += `<span class="${dmgTypeColor} font-semibold">${esc(dmgType)}</span> DMG`;

  if (dealt.absorbed > 0) msg += ` <span class="text-cyan-300">(Shield absorbed ${dealt.absorbed})</span>`;
  if (parts.length) msg += ` <span class="text-slate-500 text-[11px]">[${parts.join(' · ')}]</span>`;

  msg += `. <b>${esc(T.name)}</b> HP: <span class="font-mono ${
    T.hp_current <= 0 ? 'text-rose-500 font-black' : 'text-emerald-300'
  }">${T.hp_current}/${T.hp_max}</span>`;

  if (T.hp_current <= 0) msg += ' <span class="text-rose-500 font-black">☠ DEFEATED!</span>';

  msg += energyNote + cdNote + sideNote;
  pushLog(msg);

  /* ---- History ---- */
  historyResult.unshift(`${dealt.hpLost} ${dmgType} DMG`);
  pushHistory({
    n: state.history.length + 1,
    round: state.round,
    attacker: A.name,
    target: T.name,
    action: label,
    result: historyResult.join(' · ')
  });

  /* ---- Sound + reaction overlay ---- */
  playActionSfx();
  if (reaction) {
    playReactionSfx();
    showReactionOverlay(reaction.name, reaction.a, reaction.b);
  }

  refreshAfterAction();
}

/* ============================================================
 *  TURN / ROUND ADVANCEMENT
 *  ============================================================ */

function advanceToNextNonCore(fromIdx) {
  let i = fromIdx;
  while (i < state.entities.length && isCore(state.entities[i])) i++;
  return i;
}

export function nextTurn() {
  if (!state.entities.length) return;

  const nextIdx = advanceToNextNonCore(state.turnIndex + 1);

  if (nextIdx >= state.entities.length) {
    // Wrap: new round
    state.turnIndex = 0;
    doRoundRest();
    state.turnIndex = advanceToNextNonCore(0);
    if (state.turnIndex >= state.entities.length) state.turnIndex = 0;
  } else {
    state.turnIndex = nextIdx;
    const cur = currentActor();
    if (cur && !isCore(cur)) {
      pushLog(
        `<span class="text-emerald-300">▶ ${esc(cur.name)}'s turn</span> ` +
        `<span class="text-slate-500 text-[11px]">(SPD ${cur.spd})</span>`
      );
      showTurnBanner(cur.name, cur.spd);
    }
  }

  // Auto-select the current actor as attacker for convenience
  const actor = currentActor();
  if (actor && !isCore(actor) && els.attackerSel) {
    els.attackerSel.value = actor.id;
  }
  ensureAvailableAction();

  renderRoster();
  renderTurnOrder();
  renderSelects(true);
  renderActions();
  updateRoundBadge();
  renderCorePanel();
}

export function restRound() {
  state.turnIndex = 0;
  doRoundRest();
  state.turnIndex = advanceToNextNonCore(0);
  if (state.turnIndex >= state.entities.length) state.turnIndex = 0;

  ensureAvailableAction();
  renderRoster();
  renderTurnOrder();
  renderSelects(true);
  renderActions();
  updateRoundBadge();
  renderCorePanel();
}

function doRoundRest() {
  state.round++;

  /* ---- Expire old cores ---- */
  const expiring = state.entities.filter(e => isCore(e) && e.expires_round && e.expires_round <= state.round);
  if (expiring.length) {
    state.entities = state.entities.filter(e => !(isCore(e) && e.expires_round && e.expires_round <= state.round));
    expiring.forEach(c => {
      pushLog(`<span class="text-green-400/60">🌱 ${esc(c.name)} withers and fades.</span>`);
    });
  }

  sortBySpeed();

  /* ---- Stamina / status tick / skill readiness ---- */
  let expired = 0;
  const prevRound = state.round - 1;

  state.entities.forEach(e => {
    if (isCore(e)) return;

    // Recover 1 stamina
    if (e.stamina_current < e.stamina_max) {
      e.stamina_current = Math.min(e.stamina_max, e.stamina_current + 1);
    }

    // Tick statuses
    const before = e.status.length;
    e.status.forEach(s => { s.duration -= 1; });
    e.status = e.status.filter(s => s.duration > 0);
    expired += (before - e.status.length);

    // Electro-Charged aura decays after 1 turn
    if (e.aura === 'Electro-Charged') e.aura = 'None';

    // Skill ready check
    const cd = e.skill_cd_max || 0;
    const last = e.skill_last_round || 0;
    if (cd > 0 && last > 0) {
      const wasOnCd = prevRound <= (last + cd);
      const nowReady = state.round > (last + cd);
      if (wasOnCd && nowReady) {
        pushLog(`<span class="text-amber-300">✦ ${esc(e.name)}'s Elemental Skill is ready again.</span>`);
      }
    }
  });

  pushDivider(`Round ${state.round}`);
  pushLog(
    `<span class="text-indigo-300 font-semibold">⟳ New Round — all combatants recover <b>1 Stamina</b>.</span>` +
    (expired ? ` <span class="text-slate-400">${expired} status effect(s) expired.</span>` : '')
  );

  // First non-core actor
  const first = state.entities.find(x => !isCore(x));
  showRoundBanner(state.round, first ? first.name : '—');
}
