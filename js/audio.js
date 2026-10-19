/* ============================================================
   audio.js
   Lightweight sound-effect manager. Files are optional — if
   they don't exist, the browser rejects .play() and we silently
   ignore it.

   Drop your audio files here (all optional):
     audio/normal.mp3       → Normal Attack
     audio/charged.mp3      → Charged Attack
     audio/skill.mp3        → Elemental Skill
     audio/burst.mp3        → Elemental Burst
     audio/heal.mp3         → Heal action
     audio/shield.mp3       → Grant Shield action
     audio/turn.mp3         → Turn advances to next actor
     audio/round.mp3        → New round starts
     audio/down.mp3         → A player drops to 0 HP
     audio/reaction.mp3     → An elemental reaction fires
     audio/action.mp3       → (legacy fallback)
   ============================================================ */

const SFX = {
  normal:   'audio/normal.mp3',
  charged:  'audio/charged.mp3',
  skill:    'audio/skill.mp3',
  burst:    'audio/burst.mp3',
  heal:     'audio/heal.mp3',
  shield:   'audio/shield.mp3',
  turn:     'audio/turn.mp3',
  round:    'audio/round.mp3',
  down:     'audio/down.mp3',
  reaction: 'audio/reaction.mp3',
  action:   'audio/action.mp3'
};

const cache = {};

function getAudio(key) {
  if (cache[key]) return cache[key];
  const src = SFX[key];
  if (!src) return null;
  try {
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume  = 0.55;
    cache[key] = a;
    return a;
  } catch (e) {
    return null;
  }
}

function play(key) {
  const a = getAudio(key);
  if (!a) return;
  try {
    a.currentTime = 0;
  } catch (e) { /* may throw before metadata loads — ignore */ }
  try {
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) { /* ignore */ }
}

/* ---- Per-action SFX ---- */

export function playNormalSfx()  { play('normal'); }
export function playChargedSfx() { play('charged'); }
export function playSkillSfx()   { play('skill'); }
export function playBurstSfx()   { play('burst'); }
export function playHealSfx()    { play('heal'); }
export function playShieldSfx()  { play('shield'); }

/* ---- Turn / round SFX ---- */
export function playTurnSfx()    { play('turn'); }
export function playRoundSfx()   { play('round'); }

/* ---- Player down ---- */
export function playDownSfx()    { play('down'); }

/* ---- Reaction ---- */
export function playReactionSfx() { play('reaction'); }

/* ---- Legacy ---- */
export function playActionSfx()  { play('action'); }

/* ---- Per-action dispatcher (used by player-side replay) ---- */

export function playActionForKey(key) {
  switch (key) {
    case 'normal':  play('normal');  break;
    case 'charged': play('charged'); break;
    case 'skill':   play('skill');   break;
    case 'burst':   play('burst');   break;
    case 'heal':    play('heal');    break;
    case 'shield':  play('shield');  break;
    /* dodge has no dedicated sound */
  }
}
