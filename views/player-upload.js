/* ============================================================
   player-upload.js  (Phase 4: Firebase)
   Player submits a character to Firebase. GM approves.
   ============================================================ */

import { parseImport } from '../js/data.js';
import { submitUpload } from '../js/firebase-upload.js';

/* ============================================================
   EXTERNAL STATE TOGGLE
   Called by boot.js when the code's status changes.
   ============================================================ */

export function setUploadState(stateName) {
  const panel  = document.getElementById('uploadPanel');
  const btn    = document.getElementById('uploadBtn');
  const status = document.getElementById('uploadStatus');
  if (!panel || !btn || !status) return;

  panel.classList.remove('upload-available', 'upload-pending', 'upload-locked');
  status.classList.remove('ok', 'warn', 'error');

  if (stateName === 'pending') {
    panel.classList.add('upload-pending');
    btn.textContent = '🔒 Pending GM Approval';
    status.textContent = 'Waiting for the GM to accept your character…';
    status.classList.add('warn');
  } else if (stateName === 'locked') {
    panel.classList.add('upload-locked');
    btn.textContent = '🔒 Uploaded';
    status.textContent = 'Character locked. See My Character panel.';
    status.classList.add('ok');
  } else {
    panel.classList.add('upload-available');
    btn.textContent = '📁 Choose JSON File';
    status.textContent = '';
  }
}

/* ============================================================
   WIRING
   ============================================================ */

let wired = false;

export function wirePlayerUpload({ code, getOwnerId, onSubmitted }) {
  if (wired) return;
  wired = true;

  const fileInput = document.getElementById('uploadFileInput');
  const btn       = document.getElementById('uploadBtn');
  const status    = document.getElementById('uploadStatus');
  if (!fileInput || !btn) {
    console.warn('[player-upload] Upload DOM missing.');
    return;
  }

  btn.addEventListener('click', () => {
    if (typeof getOwnerId === 'function' && getOwnerId()) return; // locked
    fileInput.click();
  });

  fileInput.addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    handleFile(file);
  });

  async function handleFile(file) {
    const setErr = (msg) => {
      if (!status) return;
      status.classList.remove('ok', 'warn', 'error');
      status.classList.add('error');
      status.textContent = msg;
    };

    const reader = new FileReader();

    reader.onload = async () => {
      const text = String(reader.result || '');

      let list;
      try { list = parseImport(text); }
      catch (err) { setErr('Invalid JSON: ' + err.message); return; }

      if (!list.length) { setErr('No valid character found.'); return; }

      const ent = list[0];
      ent.type = 'player';

      setUploadState('pending');

      try {
        await submitUpload(code, ent);
        if (typeof onSubmitted === 'function') onSubmitted(ent);
      } catch (err) {
        setErr('Upload failed: ' + err.message);
        setUploadState('available');
      }
    };

    reader.onerror = () => setErr('Could not read file.');
    reader.readAsText(file);
  }
}
