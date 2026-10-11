/* ============================================================
   audio.js
   Lightweight sound-effect manager. Files are optional — if
   they don't exist, the browser rejects .play() and we silently
   ignore it.

   Drop your audio files here:
     audio/action.mp3     → plays after ANY action executes
     audio/reaction.mp3   → plays when an elemental reaction fires
   ============================================================ */

const SFX = {
  action:   'audio/action.mp3',
  reaction: 'audio/reaction.mp3'
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

export function playActionSfx()   { play('action'); }
export function playReactionSfx() { play('reaction'); }
