/* ============================================================
   gm-players.js
   GM-side management panel for player codes.
   Renders the list from a live Firebase subscription, handles
   add / delete / approve / reject / reset.
   ============================================================ */

import {
  subscribeCodes, writeCode, deleteCode
} from '../js/firebase-codes.js';

import {
  approveUpload, rejectUpload, resetPlayerUpload
} from '../js/firebase-upload.js';

import {
  state, esc, uid, normalizeEntity, getEntity
} from '../js/data.js';

import { pushLog } from '../js/ui.js';

/* ============================================================
   WIRING
   ============================================================ */

let wired = false;
let onApprovedCallback = null;

/**
 * @param {object} opts
 * @param {(entity) => void} opts.onApproved  called after GM approves,
 *                                            so caller can re-render
 */
export function wireGmPlayers(opts = {}) {
  if (wired) return;
  wired = true;
  onApprovedCallback = opts.onApproved || null;

  wireOpenButton();
  wireAddButton();

  // Live-update the list
  subscribeCodes(renderCodeList);
}

function wireOpenButton() {
  const btn = document.getElementById('openPlayersBtn');
  const modal = document.getElementById('gmPlayersPanel');
  if (!btn || !modal) return;

  btn.addEventListener('click', () => modal.classList.remove('hidden'));

  modal.addEventListener('click', ev => {
    if (ev.target.closest('[data-close-modal]')) modal.classList.add('hidden');
  });
}

function wireAddButton() {
  const btn     = document.getElementById('addCodeBtn');
  const keyIn   = document.getElementById('newCodeInput');
  const nameIn  = document.getElementById('newNameInput');
  const msgEl   = document.getElementById('newCodeMsg');
  if (!btn || !keyIn || !nameIn) return;

  const setMsg = (txt, tone) => {
    if (!msgEl) return;
    msgEl.textContent = txt;
    msgEl.style.color =
      tone === 'ok'  ? '#86efac' :
      tone === 'err' ? '#fca5a5' : '#94a3b8';
    if (txt) setTimeout(() => { if (msgEl.textContent === txt) msgEl.textContent = ''; }, 2500);
  };

  btn.addEventListener('click', async () => {
    const rawKey  = keyIn.value.trim();
    const rawName = nameIn.value.trim();

    if (!rawKey)  { setMsg('Enter a code.', 'err');   return; }
    if (!rawName) { setMsg('Enter a name.', 'err');   return; }

    const key = rawKey.toUpperCase();

    if (key === 'SHAZWANS07') {
      setMsg('Cannot override the hardcoded GM code.', 'err');
      return;
    }

    try {
      await writeCode(key, { role: 'player', name: rawName });
      setMsg(`Added ${key}`, 'ok');
      keyIn.value = '';
      nameIn.value = '';
    } catch (err) {
      setMsg('Failed: ' + err.message, 'err');
    }
  });
}

/* ============================================================
   RENDER
   ============================================================ */

function renderCodeList(codes) {
  const list = document.getElementById('gmPlayersList');
  if (!list) return;

  const entries = Object.entries(codes || {});

  if (!entries.length) {
    list.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        No codes yet. Add one above.
      </div>`;
    return;
  }

  // Sort: GM first, then players alphabetically
  entries.sort(([ka, va], [kb, vb]) => {
    const ra = va.role === 'gm' ? 0 : 1;
    const rb = vb.role === 'gm' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return ka.localeCompare(kb);
  });

  list.innerHTML = entries.map(([key, entry]) => rowHTML(key, entry)).join('');

  // Wire row buttons
  list.querySelectorAll('[data-row-action]').forEach(btn => {
    btn.addEventListener('click', () => handleRowAction(btn));
  });
}

function rowHTML(key, entry) {
  const role       = entry.role === 'gm' ? 'gm' : 'player';
  const name       = entry.name || key;
  const hasPending = !!entry.pendingEntity;
  const hasOwner   = !!entry.ownerEntityId;
  const ownerEnt   = hasOwner ? getEntity(entry.ownerEntityId) : null;
  const isHardcoded = (key === 'SHAZWANS07');

  // Status label + color
  let status;
  if (hasPending) {
    status = `<span class="text-amber-300">⚠ Pending upload: <b>${esc(entry.pendingEntity.name || '?')}</b></span>`;
  } else if (hasOwner && ownerEnt) {
    status = `<span class="text-emerald-300">✓ Playing as <b>${esc(ownerEnt.name)}</b></span>`;
  } else if (hasOwner && !ownerEnt) {
    status = `<span class="text-rose-300">⚠ Orphaned entity reference</span>`;
  } else {
    status = `<span class="text-slate-500">Empty slot — awaiting upload</span>`;
  }

  const roleBadge = role === 'gm'
    ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/40">GM</span>'
    : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">Player</span>';

  const buttons = [];
  if (hasPending) {
    buttons.push(`<button data-row-action="approve" data-key="${esc(key)}" class="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white transition">Approve</button>`);
    buttons.push(`<button data-row-action="reject"  data-key="${esc(key)}" class="px-2 py-1 rounded bg-rose-800 hover:bg-rose-700 text-[10px] font-bold uppercase tracking-wider text-white transition">Reject</button>`);
  }
  if (hasOwner) {
    buttons.push(`<button data-row-action="reset" data-key="${esc(key)}" class="px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-[10px] font-bold uppercase tracking-wider text-white transition">Reset</button>`);
  }
  if (!isHardcoded) {
    buttons.push(`<button data-row-action="delete" data-key="${esc(key)}" class="px-2 py-1 rounded bg-slate-800 hover:bg-rose-700 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition">Delete</button>`);
  }

  return `
    <div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-mono text-xs font-bold text-amber-300 tracking-wider">${esc(key)}</span>
        ${roleBadge}
        <span class="text-xs text-slate-300">${esc(name)}</span>
      </div>
      <div class="text-[11px]">${status}</div>
      ${buttons.length ? `<div class="flex items-center gap-1.5 flex-wrap pt-1">${buttons.join('')}</div>` : ''}
    </div>`;
}

/* ============================================================
   ROW ACTIONS
   ============================================================ */

async function handleRowAction(btn) {
  const action = btn.dataset.rowAction;
  const key    = btn.dataset.key;
  if (!action || !key) return;

  try {
    if (action === 'approve') {
      await doApprove(key);
    } else if (action === 'reject') {
      await rejectUpload(key);
      pushLog(`<span class="text-slate-500 text-[11px]">Rejected upload for <b>${esc(key)}</b>.</span>`);
    } else if (action === 'reset') {
      if (!confirm(`Reset ${key}? They'll be able to upload a new character.`)) return;
      await resetPlayerUpload(key);
      pushLog(`<span class="text-slate-500 text-[11px]">Reset player slot <b>${esc(key)}</b>.</span>`);
    } else if (action === 'delete') {
      if (!confirm(`Delete code ${key} permanently?`)) return;
      await deleteCode(key);
      pushLog(`<span class="text-slate-500 text-[11px]">Deleted code <b>${esc(key)}</b>.</span>`);
    }
  } catch (err) {
    console.warn('[gm-players] action failed:', err);
    alert('Action failed: ' + err.message);
  }
}

async function doApprove(codeKey) {
  const { fetchCode } = await import('../js/firebase-codes.js');
  const entry = await fetchCode(codeKey);

  if (!entry || !entry.pendingEntity) {
    alert('No pending entity found for ' + codeKey);
    return;
  }

  const raw = Object.assign({}, entry.pendingEntity);
  raw.id = uid();
  raw.type = 'player';

  const ent = normalizeEntity(raw);

  state.entities.push(ent);

  // Re-sort so the new player lands in the correct turn position
  // and invalidate the select cache so attacker/target dropdowns
  // refresh.
  const { sortBySpeed } = await import('../js/data.js');
  sortBySpeed();
  state.selectSignature = '';

  if (typeof onApprovedCallback === 'function') {
    onApprovedCallback(ent);
  }

  await approveUpload(codeKey, ent.id);

  pushLog(
    `<span class="text-emerald-300">✦ <b>${esc(ent.name)}</b> joined via code <b>${esc(codeKey)}</b>!</span> ` +
    `<span class="text-slate-500 text-[11px]">(${ent.hp_max} HP · ${ent.atk} ATK · ${ent.vision})</span>`
  );

  // Publish immediately so the new player appears without waiting
  // for the 400 ms poll.
  try {
    const { publishState } = await import('../js/firebase-state.js');
    publishState(state);
  } catch { /* ignore */ }
}
