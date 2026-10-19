/* ============================================================
   data.js
   Constants, shared state, entity normalization, JSON I/O,
   and turn-order sorting.
   ============================================================ */

export const LINGER = ['Pyro', 'Hydro', 'Cryo', 'Electro', 'Dendro'];

export const AURA_OPTIONS = [
  'None', 'Pyro', 'Hydro', 'Cryo', 'Electro', 'Anemo', 'Geo', 'Dendro',
  'Frozen', 'Electro-Charged', 'Quicken'
];

export const ELEM_STYLE = {
  Pyro:       { name: 'text-red-400'    },
  Hydro:      { name: 'text-blue-400'   },
  Cryo:       { name: 'text-cyan-300'   },
  Electro:    { name: 'text-purple-400' },
  Anemo:      { name: 'text-teal-300'   },
  Geo:        { name: 'text-amber-300'  },
  Dendro:     { name: 'text-green-400'  },
  DendroCore: { name: 'text-green-300'  },
  Physical:   { name: 'text-slate-300'  },
  None:       { name: 'text-slate-400'  }
};

export const AURA_COMPONENTS = {
  Pyro: ['Pyro'],
  Hydro: ['Hydro'],
  Cryo: ['Cryo'],
  Electro: ['Electro'],
  Dendro: ['Dendro'],
  Frozen: ['Cryo', 'Hydro'],
  'Electro-Charged': ['Electro', 'Hydro'],
  Quicken: ['Dendro', 'Electro']
};

export const REACTIONS = [
  { a: 'Pyro',   b: 'Hydro',   name: 'Vaporize',        mult: 2, clear: true },
  { a: 'Pyro',   b: 'Cryo',    name: 'Melt',            mult: 2, clear: true },
  { a: 'Pyro',   b: 'Electro', name: 'Overloaded',      mult: 1, clear: true, status: 'Knocked Back', statusDur: 1 },
  { a: 'Cryo',   b: 'Electro', name: 'Superconduct',    mult: 1, clear: true, status: 'DEF Down',     statusDur: 2 },
  { a: 'Cryo',   b: 'Hydro',   name: 'Frozen',          mult: 1, newAura: 'Frozen', status: 'Frozen', statusDur: 2 },
  { a: 'Hydro',  b: 'Electro', name: 'Electro-Charged', mult: 1, newAura: 'Electro-Charged' },
  { a: 'Anemo',  b: 'Pyro',    name: 'Swirl',           mult: 1, clear: true, swirl: true },
  { a: 'Anemo',  b: 'Hydro',   name: 'Swirl',           mult: 1, clear: true, swirl: true },
  { a: 'Anemo',  b: 'Cryo',    name: 'Swirl',           mult: 1, clear: true, swirl: true },
  { a: 'Anemo',  b: 'Electro', name: 'Swirl',           mult: 1, clear: true, swirl: true },
  { a: 'Geo',    b: 'Pyro',    name: 'Crystallize',     mult: 1, clear: true, crystallize: true },
  { a: 'Geo',    b: 'Hydro',   name: 'Crystallize',     mult: 1, clear: true, crystallize: true },
  { a: 'Geo',    b: 'Cryo',    name: 'Crystallize',     mult: 1, clear: true, crystallize: true },
  { a: 'Geo',    b: 'Electro', name: 'Crystallize',     mult: 1, clear: true, crystallize: true },
  { a: 'Dendro', b: 'Hydro',   name: 'Bloom',           mult: 1, clear: true, bloom: true },
  { a: 'Pyro',   b: 'Dendro',  name: 'Burning',         mult: 1, clear: true, status: 'Burning', statusDur: 2 },
  { a: 'Dendro', b: 'Electro', name: 'Quicken',         mult: 0, newAura: 'Quicken' },
  // --- NEW REACTIONS ---
  { a: 'Electro', b: 'Quicken', name: 'Aggravate',      mult: 1.15, aggravate: true },
  { a: 'Dendro', b: 'Quicken', name: 'Spread',          mult: 1.25, spread: true },
  { a: 'Physical', b: 'Frozen', name: 'Shattered',      mult: 1.5, clear: true, shatter: true },
  { a: 'Geo',    b: 'Frozen',  name: 'Shattered',      mult: 1.5, clear: true, shatter: true }
];

export const ACTIONS = {
  normal:  { label: 'Normal Attack',   icon: '⚔',  cls: 'hover:border-slate-500' },
  charged: { label: 'Charged Attack',  icon: '🌀', cls: 'hover:border-slate-500', needsStamina: 1 },
  skill:   { label: 'Elemental Skill', icon: '✦',  cls: 'hover:border-violet-500' },
  burst:   { label: 'Elemental Burst', icon: '✹',  cls: 'hover:border-amber-500', needsFullEnergy: true },
  heal:    { label: 'Heal',            icon: '✚',  cls: 'hover:border-emerald-500' },
  shield:  { label: 'Grant Shield',    icon: '⛨',  cls: 'hover:border-sky-500' }
};

export const PRESETS = [
  { name: 'Hydro Slime',     vision: 'Hydro',    hp_max: 10, atk: 3,  def: 0, spd: 6,  em: 0, stamina_max: 2, energy_max: 2 },
  { name: 'Hilichurl',       vision: 'Physical', hp_max: 15, atk: 5,  def: 1, spd: 8,  em: 0, stamina_max: 2, energy_max: 2 },
  { name: 'Mitachurl',       vision: 'Physical', hp_max: 35, atk: 8,  def: 3, spd: 7,  em: 0, stamina_max: 2, energy_max: 3 },
  { name: 'Ruin Guard',      vision: 'Physical', hp_max: 60, atk: 11, def: 5, spd: 9,  em: 0, stamina_max: 2, energy_max: 4 },
  { name: 'Pyro Abyss Mage', vision: 'Pyro',     hp_max: 22, atk: 6,  def: 2, spd: 11, em: 3, stamina_max: 2, energy_max: 3 },
  { name: 'Cryo Cicin Mage', vision: 'Cryo',     hp_max: 26, atk: 6,  def: 2, spd: 12, em: 3, stamina_max: 2, energy_max: 3 }
];

export const WEAPONS = {
  None:      { label: 'None',      dmgMult: 1.0,  dmgApplies: 'none',      defMult: 1.0,  spdMult: 1.0,  appliesElementOnBasic: false, appliesElementOnCharged: false },
  Sword:     { label: 'Sword',     dmgMult: 1.0,  dmgApplies: 'all',       defMult: 1.0,  spdMult: 1.0,  appliesElementOnBasic: false, appliesElementOnCharged: false },
  Catalyst:  { label: 'Catalyst',  dmgMult: 0.75, dmgApplies: 'elemental', defMult: 0.5,  spdMult: 1.0,  appliesElementOnBasic: true,  appliesElementOnCharged: true  },
  Claymore:  { label: 'Claymore',  dmgMult: 1.5,  dmgApplies: 'physical',  defMult: 1.25, spdMult: 0.75, appliesElementOnBasic: false, appliesElementOnCharged: false },
  Polearm:   { label: 'Polearm',   dmgMult: 0.75, dmgApplies: 'all',       defMult: 1.0,  spdMult: 1.25, appliesElementOnBasic: false, appliesElementOnCharged: false },
  Bow:       { label: 'Bow',       dmgMult: 1.0,  dmgApplies: 'all',       defMult: 0.5,  spdMult: 1.0,  appliesElementOnBasic: false, appliesElementOnCharged: true  },
  Elemental: { label: 'Elemental', dmgMult: 1.0,  dmgApplies: 'none',      defMult: 1.0,  spdMult: 1.0,  appliesElementOnBasic: true,  appliesElementOnCharged: true  },
  Physical:  { label: 'Physical',  dmgMult: 1.0,  dmgApplies: 'none',      defMult: 1.0,  spdMult: 1.0,  appliesElementOnBasic: false, appliesElementOnCharged: false }
};

export const WEAPON_OPTIONS = ['None', 'Sword', 'Catalyst', 'Claymore', 'Polearm', 'Bow', 'Elemental', 'Physical'];

export function weaponDmgMult(weapon, damageType) {
  const w = WEAPONS[weapon];
  if (!w || w.dmgApplies === 'none') return 1.0;
  const isElem = damageType && damageType !== 'Physical';
  if (w.dmgApplies === 'all') return w.dmgMult;
  if (w.dmgApplies === 'elemental' && isElem) return w.dmgMult;
  if (w.dmgApplies === 'physical' && !isElem) return w.dmgMult;
  return 1.0;
}

export function weaponDefMult(weapon) {
  const w = WEAPONS[weapon];
  return (w && w.defMult) || 1.0;
}

export function weaponSpdMult(weapon) {
  const w = WEAPONS[weapon];
  return (w && w.spdMult) || 1.0;
}

export function weaponAppliesElementOnBasic(weapon) {
  const w = WEAPONS[weapon];
  return !!(w && w.appliesElementOnBasic);
}

export function weaponAppliesElementOnCharged(weapon) {
  const w = WEAPONS[weapon];
  return !!(w && w.appliesElementOnCharged);
}

export function rarityDmgMult(rarity) {
  const r = Math.max(0, Math.min(5, Number(rarity) || 0));
  return 1 + 0.1 * r;
}

export const SAMPLE_PLAYERS = [
  {
    id: 'player_1', name: 'Keqing', type: 'player', vision: 'Electro',
    hp_max: 25, hp_current: 25, atk: 6, def: 2, spd: 15, em: 3,
    stamina_max: 3, stamina_current: 3, crit_die: 'd8', crit_dmg: 4,
    er: 1, energy_max: 3, energy_current: 0, shield: 0,
    aura: 'None', status: [], skill_cd_max: 2, skill_last_round: 0,
    weapon: 'Sword', weapon_rarity: 4, ec_turns_remaining: 0
  },
  {
    id: 'player_2', name: 'Diluc', type: 'player', vision: 'Pyro',
    hp_max: 30, hp_current: 30, atk: 7, def: 2, spd: 12, em: 4,
    stamina_max: 3, stamina_current: 3, crit_die: 'd10', crit_dmg: 5,
    er: 1, energy_max: 3, energy_current: 0, shield: 0,
    aura: 'None', status: [], skill_cd_max: 2, skill_last_round: 0,
    weapon: 'Claymore', weapon_rarity: 5, ec_turns_remaining: 0
  }
];

export const SAMPLE_ENEMIES = [
  {
    id: 'enemy_1', name: 'Ruin Guard', type: 'enemy', vision: 'Physical',
    hp_max: 60, hp_current: 60, atk: 11, def: 5, spd: 9, em: 0,
    stamina_max: 2, stamina_current: 2, crit_die: 'd4', crit_dmg: 0,
    er: 0, energy_max: 4, energy_current: 0, shield: 0,
    aura: 'None', status: [], skill_cd_max: 2, skill_last_round: 0,
    weapon: 'Physical', weapon_rarity: 0, ec_turns_remaining: 0
  },
  {
    id: 'enemy_2', name: 'Pyro Abyss Mage', type: 'enemy', vision: 'Pyro',
    hp_max: 22, hp_current: 22, atk: 6, def: 2, spd: 11, em: 3,
    stamina_max: 2, stamina_current: 2, crit_die: 'd4', crit_dmg: 0,
    er: 0, energy_max: 3, energy_current: 0, shield: 0,
    aura: 'None', status: [], skill_cd_max: 2, skill_last_round: 0,
    weapon: 'Elemental', weapon_rarity: 0, ec_turns_remaining: 0
  }
];

export const STALE_SAMPLE_IDS = {
  'player_1': 'Keqing',
  'player_2': 'Diluc'
};

export function isStaleSampleEntity(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const id   = String(raw.id   || '');
  const name = String(raw.name || '');
  const expected = STALE_SAMPLE_IDS[id];
  return expected && expected === name;
}

export const state = {
  entities: [],
  round: 1,
  turnIndex: 0,
  selectedAction: 'normal',
  history: [],
  logEntries: [],
  lastEvent: null,
  pendingEvents: [],
  eventSeq: 0,
  uidCounter: 0,
  selectSignature: '',
  activeTab: 'log'
};

export function uid() {
  return 'e' + (++state.uidCounter) + '_' + Math.random().toString(36).slice(2, 7);
}

const MAX_PENDING_EVENTS = 50;

export function pushGameEvent(evt) {
  state.eventSeq = (state.eventSeq || 0) + 1;
  const full = Object.assign({}, evt, {
    seq: state.eventSeq,
    at:  Date.now()
  });

  state.lastEvent = full;

  if (!Array.isArray(state.pendingEvents)) state.pendingEvents = [];
  state.pendingEvents.push(full);
  if (state.pendingEvents.length > MAX_PENDING_EVENTS) {
    state.pendingEvents = state.pendingEvents.slice(-MAX_PENDING_EVENTS);
  }

  if (typeof window !== 'undefined' && typeof window.__gmPulse === 'function') {
    try { window.__gmPulse(); } catch { /* ignore */ }
  }
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function nameColor(e) {
  return (ELEM_STYLE[e.vision] || ELEM_STYLE.Physical).name;
}

export function hasStatus(e, name) {
  return Array.isArray(e.status) && e.status.some(s => s.name === name);
}

export function effDef(e) {
  let d = num(e.def, 0);
  if (hasStatus(e, 'DEF Down')) {
    const reduction = Math.max(1, Math.round(d * 0.25));
    d = Math.max(0, d - reduction);
  }
  const mult = weaponDefMult(e.weapon);
  return Math.max(0, Math.round(d * mult));
}

export function addStatus(e, name, duration) {
  if (!name) return;
  const existing = e.status.find(s => s.name === name);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.stacks = (existing.stacks || 1) + 1;
  } else {
    e.status.push({ name, duration, stacks: 1 });
  }
}

export function getEntity(id) {
  return state.entities.find(e => e.id === id) || null;
}

export function currentActor() {
  return state.entities[state.turnIndex] || null;
}

export function isCore(e) {
  return !!e && e.type === 'core';
}

export function isField(e) {
  return !!e && (e.type === 'core' || e.type === 'field');
}

export function skillCooldownInfo(entity, currentRound) {
  const cd   = num(entity && entity.skill_cd_max, 0);
  const last = num(entity && entity.skill_last_round, 0);
  if (cd <= 0 || last <= 0) {
    return { onCd: false, remaining: 0, availableRound: 0 };
  }
  const availableRound = last + cd + 1;
  const onCd = currentRound < availableRound;
  return {
    onCd,
    remaining: onCd ? availableRound - currentRound : 0,
    availableRound
  };
}

export function effectiveSpd(entity) {
  const base = Number(entity && entity.spd) || 0;
  const mult = weaponSpdMult(entity && entity.weapon);
  let spd = Math.round(base * mult);
  if (hasStatus(entity, 'Knocked Back')) spd -= 1;
  return Math.max(0, spd);
}

export function computePartyDimPct() {
  const players = state.entities.filter(e => e.type === 'player' && !isField(e));
  if (!players.length) return 0;
  let maxHP = 0;
  let currentHP = 0;
  for (const p of players) {
    maxHP += Number(p.hp_max) || 0;
    currentHP += Math.max(0, Number(p.hp_current) || 0);
  }
  if (maxHP <= 0) return 0;
  const dim = 100 * (1 - currentHP / maxHP);
  return Math.min(99, Math.max(0, Math.round(dim)));
}

export function renderLogEntriesHTML(entries) {
  if (!Array.isArray(entries)) return '';
  return entries.map(item => {
    if (!item) return '';

    if (typeof item === 'string') {
      if (item.indexOf('tracking-[0.2em]') !== -1 ||
        item.indexOf('log-divider') !== -1) {
        return '';
        }
        return `<div class="log-entry">${item}</div>`;
    }

    if (item.kind === 'divider') {
      return `<div class="log-divider"><span>${esc(item.text)}</span></div>`;
    }

    return `<div class="log-entry">${item.html || ''}</div>`;
  }).join('');
}

export function flashRosterCard(rosterEl, entityId) {
  if (!rosterEl || !entityId) return;
  const card = rosterEl.querySelector(`[data-entity-id="${entityId}"]`);
  if (!card) return;

  card.classList.remove('roster-flash');
  void card.offsetWidth;
  card.classList.add('roster-flash');

  try {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    card.scrollIntoView();
  }

  setTimeout(() => card.classList.remove('roster-flash'), 1500);
}

export function normalizeEntity(raw) {
  const base = {
    id: null, name: 'Unnamed', type: 'enemy', vision: 'Physical',
    hp_max: 10, hp_current: 10,
    atk: 3, def: 0, spd: 10, em: 0,
    stamina_max: 3, stamina_current: 3,
    crit_die: 'd6', crit_dmg: 0, er: 0,
    energy_max: 3, energy_current: 0,
    shield: 0, aura: 'None', status: [],
    skill_cd_max: 2, skill_last_round: 0,
    weapon: 'None', weapon_rarity: 0,
    ec_turns_remaining: 0
  };

  const e = Object.assign({}, base, raw || {});

  if (!e.id) e.id = uid();
  e.id   = String(e.id);
  e.name = String(e.name || 'Unnamed');
  if (e.type !== 'core' && e.type !== 'boss' && e.type !== 'field') {
    e.type = e.type === 'player' ? 'player' : 'enemy';
  }
  if (!ELEM_STYLE[e.vision]) e.vision = 'Physical';

  e.hp_max          = Math.max(1, num(e.hp_max, 10));
  e.hp_current      = Math.max(0, Math.min(e.hp_max, num(e.hp_current, e.hp_max)));
  e.atk             = num(e.atk, 0);
  e.def             = num(e.def, 0);
  e.spd             = num(e.spd, 10);
  e.em              = num(e.em, 0);
  e.stamina_max     = Math.max(0, num(e.stamina_max, 3));
  e.stamina_current = Math.max(0, Math.min(e.stamina_max, num(e.stamina_current, e.stamina_max)));
  e.crit_die        = String(e.crit_die || 'd6');
  e.crit_dmg        = num(e.crit_dmg, 0);
  e.er              = num(e.er, 0);
  e.energy_max      = Math.max(0, num(e.energy_max, 3));
  e.energy_current  = Math.max(0, Math.min(e.energy_max, num(e.energy_current, 0)));
  e.shield          = Math.max(0, num(e.shield, 0));
  e.aura            = e.aura && String(e.aura) !== '' ? String(e.aura) : 'None';

  e.skill_cd_max    = Math.max(0, num(e.skill_cd_max, 2));
  e.skill_last_round = Math.max(0, num(e.skill_last_round, 0));

  e.ec_turns_remaining = Math.max(0, Math.min(3, num(e.ec_turns_remaining, 0)));

  const wp = String(e.weapon || '');
  const defaultWeapon =
    e.type === 'player' ? 'Sword' :
    (e.vision === 'Physical' ? 'Physical' : 'Elemental');
  e.weapon = WEAPONS[wp] ? wp : defaultWeapon;
  e.weapon_rarity = Math.max(0, Math.min(5, num(e.weapon_rarity, 0)));

  if (e.type === 'enemy' || e.type === 'boss') {
    if (e.weapon !== 'Physical' && e.weapon !== 'Elemental') {
      e.weapon = (e.vision === 'Physical') ? 'Physical' : 'Elemental';
    }
    e.weapon_rarity = 0;
  }

  if (e.type === 'core') {
    e.spawn_round   = Math.max(0, num(e.spawn_round, state.round));
    e.expires_round = Math.max(e.spawn_round + 1, num(e.expires_round, state.round + 2));
    e.weapon = 'None';
    e.weapon_rarity = 0;
  }

  const rawStatus = Array.isArray(e.status) ? e.status : [];
  e.status = rawStatus.map(s => {
    if (typeof s === 'string') return { name: s, duration: 2, stacks: 1 };
    if (s && typeof s === 'object') {
      return { name: String(s.name || 'Effect'), duration: Math.max(1, num(s.duration, 2)), stacks: Math.max(1, num(s.stacks, 1)) };
    }
    return null;
  }).filter(Boolean);

  if (e.base_hp_max  === undefined) e.base_hp_max  = e.hp_max;
  if (e.base_atk     === undefined) e.base_atk     = e.atk;
  if (e.base_def     === undefined) e.base_def     = e.def;
  if (e.base_spd     === undefined) e.base_spd     = e.spd;
  if (e.base_em      === undefined) e.base_em      = e.em;
  if (e.base_crit_dmg === undefined) e.base_crit_dmg = e.crit_dmg;
  if (e.base_er      === undefined) e.base_er      = e.er;

  return e;
}

export function normalizeCore(spawnRound, name) {
  const r = num(spawnRound, 1);
  return {
    id: uid(),
    name: name || 'Dendro Core',
    type: 'core',
    vision: 'Dendro',
    hp_max: 1, hp_current: 1,
    atk: 0, def: 0, spd: 0, em: 0,
    stamina_max: 0, stamina_current: 0,
    crit_die: 'd4', crit_dmg: 0, er: 0,
    energy_max: 0, energy_current: 0,
    shield: 0, aura: 'None', status: [],
    skill_cd_max: 0, skill_last_round: 0,
    weapon: 'None', weapon_rarity: 0,
    ec_turns_remaining: 0,
    spawn_round: r,
    expires_round: r + 2,
    stacks: 1 // <-- ADDED
  };
}

export function uniqueName(base) {
  const taken = state.entities.map(e => e.name);
  if (!taken.includes(base)) return base;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    const candidate = base + ' ' + letters[i];
    if (!taken.includes(candidate)) return candidate;
  }
  return base + ' ' + (taken.length + 1);
}

export function sortBySpeed() {
  const currentId = currentActor() ? currentActor().id : null;

  state.entities.sort((a, b) => {
    const aField = isField(a);
    const bField = isField(b);
    if (aField !== bField) return aField ? 1 : -1;
    const aSpd = effectiveSpd(a);
    const bSpd = effectiveSpd(b);
    const d = bSpd - aSpd;
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });

  if (currentId) {
    const idx = state.entities.findIndex(e => e.id === currentId);
    state.turnIndex = idx >= 0 ? idx : 0;
  } else {
    state.turnIndex = 0;
  }
}

export function parseImport(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Nothing to import — paste JSON first.');

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { throw new Error('Invalid JSON syntax: ' + err.message); }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (!list.length) throw new Error('JSON array is empty.');

  const taken = new Set(state.entities.map(e => e.name));

  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const e = normalizeEntity(item);

    let base = e.name;
    if (taken.has(base)) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let found = false;
      for (let i = 0; i < letters.length; i++) {
        const candidate = base + ' ' + letters[i];
        if (!taken.has(candidate)) { base = candidate; found = true; break; }
      }
      if (!found) base = base + ' ' + (taken.size + 1);
    }
    e.name = base;
    taken.add(base);

    out.push(e);
  }

  if (!out.length) throw new Error('No valid entity objects found.');
  return out;
}

export function serializeEntities() {
  const data = state.entities.filter(e => !isField(e)).map(e => ({
    id: e.id, name: e.name, type: e.type, vision: e.vision,
    hp_max: e.hp_max, hp_current: e.hp_current,
    atk: e.atk, def: e.def, spd: e.spd, em: e.em,
    stamina_max: e.stamina_max, stamina_current: e.stamina_current,
    crit_die: e.crit_die, crit_dmg: e.crit_dmg, er: e.er,
    energy_max: e.energy_max, energy_current: e.energy_current,
    shield: e.shield, aura: e.aura,
    skill_cd_max: e.skill_cd_max,
    weapon: e.weapon, weapon_rarity: e.weapon_rarity,
    status: e.status.map(s => s.name)
  }));
  return JSON.stringify(data, null, 2);
}
