/* ============================================================
   combat.js
   Action resolution, turn advancement, round rest.
   ============================================================ */

import {
  state, LINGER, REACTIONS, ELEM_STYLE,
  esc, nameColor, effDef, addStatus, isCore, isField,
  normalizeCore, uniqueName, effectiveSpd,
  skillCooldownInfo, sortBySpeed, currentActor,
  pushGameEvent, weaponAppliesElementOnBasic,
  weaponAppliesElementOnCharged, weaponDmgMult, rarityDmgMult
} from './data.js';

import {
  pushLog, pushHistory, pushDivider,
  showRoundBanner, showTurnBanner,
  showReactionOverlay, showDownBanner
} from './ui.js';

import {
  playNormalSfx, playChargedSfx, playSkillSfx, playBurstSfx,
  playHealSfx, playShieldSfx, playRoundSfx, playTurnSfx,
  playReactionSfx, playDownSfx
} from './audio.js';

/* ============================================================
   HELPERS
   ============================================================ */

function computeBaseDamage(A, T, action, elem) {
  const atk  = Math.max(0, Number(A.atk) || 0);
  const def  = effDef(T);
  const dmgType = elem || 'Physical';
  const wMult = weaponDmgMult(A.weapon, dmgType);
  const rMult = rarityDmgMult(A.weapon_rarity);

  const actionMult =
    action === 'charged' ? 1.4 :
    action === 'skill'   ? 1.6 :
    action === 'burst'   ? 2.4 : 1.0;

  return Math.max(1, Math.round(atk * actionMult * wMult * rMult - def));
}

function applyDamage(T, amount) {
  const dmg = Math.max(0, Math.round(amount));
  let hpLost = 0;
  let absorbed = 0;

  if (T.shield > 0) {
    absorbed = Math.min(T.shield, dmg);
    T.shield -= absorbed;
    const rest = dmg - absorbed;
    hpLost = Math.min(T.hp_current, rest);
    T.hp_current -= hpLost;
  } else {
    hpLost = Math.min(T.hp_current, dmg);
    T.hp_current -= hpLost;
  }

  return { hpLost, absorbed };
}

function checkPlayerDown(T, beforeHP) {
  if (T.type === 'player' && beforeHP > 0 && T.hp_current <= 0) {
    pushGameEvent({ type: 'down', name: T.name });
    showDownBanner(T.name);
    playDownSfx();
  }
}

function findReaction(elem, aura, weapon) {
  if (!aura || aura === 'None') return null;
  const atkElem = elem || 'Physical';

  // Shattered requires a Claymore (Physical) or Geo damage on a Frozen target
  if (aura === 'Frozen' && (atkElem === 'Geo' || (atkElem === 'Physical' && weapon === 'Claymore'))) {
    return REACTIONS.find(r => r.name === 'Shattered');
  }

  if (atkElem === 'Physical' || atkElem === 'None') return null;

  for (const r of REACTIONS) {
    if ((r.a === atkElem && r.b === aura) || (r.b === atkElem && r.a === aura)) return r;
  }
  return null;
}

function regenEnergy(A, amount = 1) {
  if (!A || A.energy_max <= 0) return;
  A.energy_current = Math.min(A.energy_max, (A.energy_current || 0) + amount);
}

function regenStamina(A, amount = 1) {
  if (!A || A.stamina_max <= 0) return;
  A.stamina_current = Math.min(A.stamina_max, (A.stamina_current || 0) + amount);
}

/* ============================================================
   EXECUTE ACTION
   ============================================================ */

export function executeAction(opts) {
  const A = state.entities.find(e => e.id === opts.attackerId);
  if (!A) { pushLog('<span class="text-rose-400">⚠ No attacker selected.</span>'); return; }

  const action    = opts.action || 'normal';
  const targetIds = Array.isArray(opts.targetIds) ? opts.targetIds : [];
  if (!targetIds.length) { pushLog('<span class="text-rose-400">⚠ No targets.</span>'); return; }

  const label = {
    normal:  'Normal Attack',
    charged: 'Charged Attack',
    skill:   'Elemental Skill',
    burst:   'Elemental Burst',
    heal:    'Heal',
    shield:  'Grant Shield'
  }[action] || 'Action';

  /* ---- Resolve elemental type ---- */
  let elem = null;
  const override = opts.appliedElement && opts.appliedElement !== 'Auto'
    ? (opts.appliedElement === 'None' ? null : opts.appliedElement)
    : undefined;

  if (action === 'normal') {
    elem = weaponAppliesElementOnBasic(A.weapon) && A.vision !== 'Physical' ? A.vision : null;
    if (override !== undefined) elem = override;
  } else if (action === 'charged') {
    elem = weaponAppliesElementOnCharged(A.weapon) && A.vision !== 'Physical' ? A.vision : null;
    if (override !== undefined) elem = override;
  } else if (action === 'skill' || action === 'burst') {
    elem = A.vision !== 'Physical' ? A.vision : null;
    if (override !== undefined) elem = override;
  }

  /* ---- Heal ---- */
  if (action === 'heal') {
    const amt = Math.max(0, Number(opts.amount) || 0);
    for (const tid of targetIds) {
      const T = state.entities.find(e => e.id === tid);
      if (!T) continue;
      const before = T.hp_current;
      T.hp_current = Math.min(T.hp_max, T.hp_current + amt);
      const healed = T.hp_current - before;
      pushLog(
        `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
        `<b class="${nameColor(A)}">${esc(A.name)}</b> healed ` +
        `<b class="${nameColor(T)}">${esc(T.name)}</b> for ` +
        `<span class="text-emerald-400 font-black">${healed}</span> HP. ` +
        `HP: <span class="font-mono text-emerald-300">${T.hp_current}/${T.hp_max}</span>`
      );
      pushHistory({
        n: state.history.length + 1, round: state.round,
        attacker: A.name, target: T.name, action: label,
        result: `Healed ${healed} HP`
      });
    }
    playHealSfx();
    pushGameEvent({ type: 'action', actionKey: 'heal' });
    return;
  }

  /* ---- Shield ---- */
  if (action === 'shield') {
    const amt = Math.max(0, Number(opts.amount) || 0);
    for (const tid of targetIds) {
      const T = state.entities.find(e => e.id === tid);
      if (!T) continue;
      T.shield = (T.shield || 0) + amt;
      pushLog(
        `<span class="text-slate-600 font-mono">[R${state.round}]</span> ` +
        `<b class="${nameColor(A)}">${esc(A.name)}</b> granted ` +
        `<b class="${nameColor(T)}">${esc(T.name)}</b> a ` +
        `<span class="text-cyan-300 font-black">${amt}</span> HP shield.`
      );
      pushHistory({
        n: state.history.length + 1, round: state.round,
        attacker: A.name, target: T.name, action: label,
        result: `Shield ${amt}`
      });
    }
    playShieldSfx();
    pushGameEvent({ type: 'action', actionKey: 'shield' });
    return;
  }

  /* ---- Resource costs ---- */
  let burstSpent = 0;
  if (action === 'charged' && A.weapon !== 'Bow') {
    if (A.stamina_current < 1) {
      pushLog(`<span class="text-rose-400">⚠ ${esc(A.name)} has no Stamina for a Charged Attack.</span>`);
      return;
    }
    A.stamina_current -= 1;
  }
  if (action === 'burst') {
    if (A.energy_current < A.energy_max) {
      pushLog(`<span class="text-rose-400">⚠ ${esc(A.name)}'s Energy is not full.</span>`);
      return;
    }
    burstSpent = A.energy_current;
    A.energy_current = 0;
  }
  if (action === 'skill' && A.skill_cd_max > 0) {
    const cd = skillCooldownInfo(A, state.round);
    if (cd.onCd) {
      pushLog(`<span class="text-rose-400">⚠ ${esc(A.name)}'s Skill is on cooldown.</span>`);
      return;
    }
    A.skill_last_round = state.round;
  }

  /* ---- SFX + event ---- */
  if (action === 'normal')  playNormalSfx();
  if (action === 'charged') playChargedSfx();
  if (action === 'skill')   playSkillSfx();
  if (action === 'burst')   playBurstSfx();
  pushGameEvent({ type: 'action', actionKey: action });

  /* ---- Damage per target ---- */
  const nonCores = targetIds
    .map(id => state.entities.find(e => e.id === id))
    .filter(Boolean);

  let anyReaction = false;
  let reactionNameForEvent = null;
  let elemAForEvent = null;
  let elemBForEvent = null;

  nonCores.forEach(T => {
    // --- DENDRO CORE DETONATION LOGIC ---
    if (T.type === 'core') {
      const stacks = T.stacks || 1;
      const isBurgeon = elem === 'Pyro';
      const isHyperbloom = elem === 'Electro';

      if (isBurgeon || isHyperbloom) {
        const baseDmg = Math.max(5, (A.em * 2) + A.atk);
        const dmg = Math.round(baseDmg * Math.pow(1.25, stacks - 1));

        const isPlayerAttacker = A.type === 'player';
        const targetTypes = isPlayerAttacker ? ['enemy', 'boss'] : ['player'];
        const pool = state.entities.filter(x => targetTypes.includes(x.type) && x.hp_current > 0);

        if (pool.length > 0) {
          if (isBurgeon) {
            pool.forEach(target => {
              const beforeHP = target.hp_current;
              const dealt = applyDamage(target, dmg);
              checkPlayerDown(target, beforeHP);

              let msg = `<span class="text-orange-400 font-bold">💥 Burgeon!</span> <b class="${nameColor(A)}">${esc(A.name)}</b> detonated <b>Dendro Core (x${stacks})</b> dealing <b>${dealt.hpLost}</b> Pyro DMG to <b class="${nameColor(target)}">${esc(target.name)}</b>.`;
              if (target.hp_current <= 0) msg += ' <span class="text-rose-500 font-black">☠ DEFEATED!</span>';
              pushLog(msg);

              pushHistory({
                n: state.history.length + 1, round: state.round,
                attacker: A.name, target: target.name, action: 'Burgeon',
                result: `${dealt.hpLost} Pyro DMG (Core x${stacks})`
              });
            });
            showReactionOverlay('Burgeon', 'Dendro', 'Pyro');
          } else {
            const target = pool[Math.floor(Math.random() * pool.length)];
            const beforeHP = target.hp_current;
            const dealt = applyDamage(target, dmg);
            checkPlayerDown(target, beforeHP);

            let msg = `<span class="text-purple-400 font-bold">⚡ Hyperbloom!</span> <b class="${nameColor(A)}">${esc(A.name)}</b> detonated <b>Dendro Core (x${stacks})</b> dealing <b>${dealt.hpLost}</b> Electro DMG to <b class="${nameColor(target)}">${esc(target.name)}</b>.`;
            if (target.hp_current <= 0) msg += ' <span class="text-rose-500 font-black">☠ DEFEATED!</span>';
            pushLog(msg);

            pushHistory({
              n: state.history.length + 1, round: state.round,
              attacker: A.name, target: target.name, action: 'Hyperbloom',
              result: `${dealt.hpLost} Electro DMG (Core x${stacks})`
            });
            showReactionOverlay('Hyperbloom', 'Dendro', 'Electro');
          }
          playReactionSfx();
          pushGameEvent({ type: 'reaction', reactionName: isBurgeon ? 'Burgeon' : 'Hyperbloom', elemA: 'Dendro', elemB: elem });
        } else {
          pushLog(`<span class="text-slate-500">💥 ${esc(A.name)} detonated the Dendro Core, but there were no valid targets!</span>`);
        }

        // Destroy core entirely
        state.entities = state.entities.filter(e => e.id !== T.id);
      } else {
        pushLog(`<span class="text-slate-400">🌱 Dendro Core is unaffected by ${elem || 'Physical'} attacks. It requires Pyro or Electro.</span>`);
      }
      return; // Skip normal processing for this target
    }
    // --- END DENDRO CORE DETONATION LOGIC ---

    let base = computeBaseDamage(A, T, action, elem);
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

    let reaction = null;
    // Changed this condition so Physical attacks can trigger Shattered
    if (T.aura && T.aura !== 'None') {
      reaction = findReaction(elem, T.aura, A.weapon);
      if (reaction) {
        anyReaction = true;
        reactionNameForEvent = reaction.name;
        elemAForEvent = reaction.a;
        elemBForEvent = reaction.b;

        // Geo and Physical both can trigger Shattered, but the event needs valid elements for the overlay
        if (reaction.name === 'Shattered') {
          elemAForEvent = 'Cryo'; // for the visual overlay
          elemBForEvent = 'Physical';
        }

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
    const beforeHP = T.hp_current;
    const dealt = applyDamage(T, dmg);

    checkPlayerDown(T, beforeHP);

    if (reaction) {
      if (reaction.clear) T.aura = 'None';
      else if (reaction.newAura) {
        T.aura = reaction.newAura;
        if (reaction.newAura === 'Electro-Charged') {
          T.ec_turns_remaining = 3;
        }
      }
    } else if (elem && LINGER.includes(elem)) {
      T.aura = elem;
    }

    if (reaction && reaction.status) {
      addStatus(T, reaction.status, reaction.statusDur || 2);
    }

    let sideNote = '';
    if (reaction) {
      if (reaction.swirl) {
        const spreadElem = reaction.a === 'Anemo' ? reaction.b : reaction.a;
        const targetIsPlayer = T.type === 'player';
        const recipients = state.entities.filter(x => {
          if (isField(x) || x.hp_current <= 0) return false;
          return targetIsPlayer ? x.type === 'player' : (x.type === 'enemy' || x.type === 'boss');
        });
        recipients.forEach(r => { r.aura = spreadElem; });
        const sideLabel = targetIsPlayer ? 'player(s)' : 'foe(s)';
        sideNote += ` <span class="text-teal-300">💨 Swirl scatters <b>${esc(spreadElem)}</b> to ${recipients.length} ${sideLabel}!</span>`;
      }
      if (reaction.crystallize) {
        A.shield += A.em;
        sideNote += ` <span class="text-amber-300">💎 Crystallize — ${esc(A.name)} gains a ${A.em} HP Shield.</span>`;
      }
      if (reaction.bloom) {
        let core = state.entities.find(e => e.type === 'core');
        if (core) {
          core.stacks = (core.stacks || 1) + 1;
          core.expires_round = state.round + 2;
          sideNote += ` <span class="text-green-300">🌱 <b>${esc(core.name)}</b> stacked to x${core.stacks}! (Expires Round ${core.expires_round})</span>`;
        } else {
          const coreName = uniqueName('Dendro Core');
          core = normalizeCore(state.round, coreName);
          state.entities.push(core);
          sideNote += ` <span class="text-green-300">🌱 <b>${esc(core.name)}</b> drops on the field! (Expires Round ${core.expires_round})</span>`;
        }
      }
      if (reaction.name === 'Frozen')          sideNote += ` <span class="text-cyan-300">❄ ${esc(T.name)} is Frozen — skips next turn!</span>`;
      if (reaction.name === 'Overloaded')      sideNote += ` <span class="text-orange-300">💥 ${esc(T.name)} is knocked back! (SPD −1)</span>`;
      if (reaction.name === 'Superconduct')    sideNote += ` <span class="text-purple-300">⚡ ${esc(T.name)}'s DEF is reduced by 25% (min 1) for 2 turns.</span>`;
      if (reaction.name === 'Burning')         sideNote += ` <span class="text-orange-400">🔥 ${esc(T.name)} is Burning! (1 DMG per turn)</span>`;
      if (reaction.aggravate)                  sideNote += ' <span class="text-purple-300">⚡ Aggravate empowers the strike!</span>';
      if (reaction.spread)                     sideNote += ' <span class="text-green-300">🌿 Spread empowers the strike!</span>';
      if (reaction.name === 'Shattered')       sideNote += ' <span class="text-slate-300">💥 The ice shatters into pieces!</span>';
      if (reaction.name === 'Electro-Charged') sideNote += ' <span class="text-purple-300">⚡ Electro-Charged lingers — 3 rounds of 1 DMG per turn advance.</span>';
    }

    let localEnergyNote = '';
    if (action === 'burst' && opts.targetIds[0] === T.id) {
      localEnergyNote = ` <span class="text-amber-400/80">(Burst — ${burstSpent} Energy spent)</span>`;
    }

    let localCdNote = '';
    if (action === 'skill' && opts.targetIds[0] === T.id && A.skill_cd_max > 0) {
      localCdNote = ` <span class="text-amber-400/60 text-[11px]">(Skill CD ${A.skill_cd_max} rounds — ready R${state.round + A.skill_cd_max + 1})</span>`;
    }

    let dmgType = elem || 'Physical';
    if (reaction && reaction.shatter) dmgType = 'Physical'; // Force Physical damage for Shattered
    const dmgTypeColor = (ELEM_STYLE[dmgType] || ELEM_STYLE.Physical).name;

    let msg = `<span class="text-slate-600 font-mono">[R${state.round}]</span> `;
    msg += `<b class="${nameColor(A)}">${esc(A.name)}</b> used <b class="text-slate-100">${label}</b> on <b class="${nameColor(T)}">${esc(T.name)}</b>!`;

    if (reaction) {
      msg += ` <span class="inline-block px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 text-[10px] font-black uppercase tracking-wider">Reaction: ${esc(reaction.name)}</span>`;
    }

    msg += ` Dealt <span class="text-rose-400 font-black text-sm">${dealt.hpLost}</span> <span class="${dmgTypeColor} font-semibold">${esc(dmgType)}</span> DMG`;
    if (dealt.absorbed > 0) msg += ` <span class="text-cyan-300">(Shield absorbed ${dealt.absorbed})</span>`;
    if (parts.length) msg += ` <span class="text-slate-500 text-[11px]">[${parts.join(' · ')}]</span>`;
    msg += `. <b>${esc(T.name)}</b> HP: <span class="font-mono ${T.hp_current <= 0 ? 'text-rose-500 font-black' : 'text-emerald-300'}">${T.hp_current}/${T.hp_max}</span>`;
    if (T.hp_current <= 0) msg += ' <span class="text-rose-500 font-black">☠ DEFEATED!</span>';
    msg += localEnergyNote + localCdNote + sideNote;

    pushLog(msg);

    historyResult.unshift(`${dealt.hpLost} ${dmgType} DMG`);
    pushHistory({
      n: state.history.length + 1,
      round: state.round,
      attacker: A.name,
      target: T.name,
      action: label,
      result: historyResult.join(' · ')
    });
  });

  /* ---- Reaction overlay ---- */
  if (anyReaction) {
    pushGameEvent({
      type: 'reaction',
      reactionName: reactionNameForEvent,
      elemA: elemAForEvent,
      elemB: elemBForEvent
    });
    showReactionOverlay(reactionNameForEvent, elemAForEvent, elemBForEvent);
    playReactionSfx();
  }

  /* ---- Passive energy ---- */
  regenEnergy(A, 1);
  sortBySpeed();
}

/* ============================================================
   NEXT TURN
   ============================================================ */

export function nextTurn() {
  if (!state.entities.length) return;

  const prevIndex = state.turnIndex;
  let safety = 0;
  let nextIndex = prevIndex;

  do {
    nextIndex = (nextIndex + 1) % state.entities.length;
    safety++;
    const e = state.entities[nextIndex];
    if (e && e.hp_current > 0 && !isField(e)) {
      break;
    }
  } while (safety < state.entities.length);

  // If we wrapped around to the start, trigger a new round instead of just looping
  if (nextIndex <= prevIndex) {
    return restRound();
  }

  state.turnIndex = nextIndex;

  const actor = state.entities[state.turnIndex];
  if (!actor) return;

  if (Array.isArray(actor.status)) {
    const frozen = actor.status.find(s => s.name === 'Frozen');
    if (frozen) {
      actor.status = actor.status.filter(s => s.name !== 'Frozen');
      pushLog(`<span class="text-cyan-300 text-[11px]">❄ ${esc(actor.name)} is Frozen and skips their turn.</span>`);
      return nextTurn();
    }
  }

  regenEnergy(actor, 1);
  if (actor.type === 'player') regenStamina(actor, 1);

  if (Array.isArray(actor.status)) {
    const burning = actor.status.find(s => s.name === 'Burning');
    if (burning) {
      const before = actor.hp_current;
      actor.hp_current = Math.max(0, actor.hp_current - 1);
      pushLog(`<span class="text-orange-400 text-[11px]">🔥 ${esc(actor.name)} burns for 1 DMG. HP: ${actor.hp_current}/${actor.hp_max}</span>`);
      checkPlayerDown(actor, before);
    }
  }

  if (actor.ec_turns_remaining > 0) {
    const before = actor.hp_current;
    actor.hp_current = Math.max(0, actor.hp_current - 1);
    actor.ec_turns_remaining = Math.max(0, actor.ec_turns_remaining - 1);
    pushLog(`<span class="text-purple-300 text-[11px]">⚡ ${esc(actor.name)} crackles (Electro-Charged) — 1 DMG. HP: ${actor.hp_current}/${actor.hp_max}</span>`);
    checkPlayerDown(actor, before);
    if (actor.ec_turns_remaining === 0 && actor.aura === 'Electro-Charged') actor.aura = 'None';
  }

  if (Array.isArray(actor.status)) {
    actor.status = actor.status
    .map(s => ({ ...s, duration: s.duration - 1 }))
    .filter(s => s.duration > 0);
  }

  const spd = effectiveSpd(actor);
  showTurnBanner(actor.name, spd);
  playTurnSfx();
  pushGameEvent({ type: 'turn', name: actor.name, spd });
}

/* ============================================================
   REST ROUND
   ============================================================ */

export function restRound() {
  if (!state.entities.length) return;

  state.round += 1;
  state.turnIndex = 0;

  // Find the first valid combatant for the new round
  let safety = 0;
  while (safety < state.entities.length) {
    const e = state.entities[state.turnIndex];
    if (e && e.hp_current > 0 && !isField(e)) {
      break;
    }
    state.turnIndex = (state.turnIndex + 1) % state.entities.length;
    safety++;
  }

  state.entities = state.entities.filter(e => {
    if (e.type !== 'core') return true;
    return (e.expires_round || 0) > state.round;
  });

  for (const e of state.entities) {
    if (Array.isArray(e.status)) {
      e.status = e.status
      .map(s => ({ ...s, duration: s.duration - 1 }))
      .filter(s => s.duration > 0);
    }
    if (e.ec_turns_remaining > 0) {
      e.ec_turns_remaining -= 1;
      if (e.ec_turns_remaining <= 0 && e.aura === 'Electro-Charged') e.aura = 'None';
    }
    if (e.type === 'player') {
      regenStamina(e, e.stamina_max);
      regenEnergy(e, 1);
    }
  }

  const first = state.entities[state.turnIndex];
  showRoundBanner(state.round, first ? first.name : '—');
  playRoundSfx();
  pushGameEvent({
    type: 'round',
    roundNumber: state.round,
    firstName: first ? first.name : '—'
  });
  pushDivider(`Round ${state.round}`);
}
