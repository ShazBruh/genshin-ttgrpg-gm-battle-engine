/* ============================================================
   modals.js  —  Import modal + GM Players panel
   ============================================================ */

export function modalsHTML() {
  return `
    <!-- ============================ IMPORT MODAL ============================ -->
    <div id="importModal" class="modal hidden">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-panel">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-300">Import Combatants (JSON)</h3>
          <button data-close-modal class="text-slate-500 hover:text-rose-400 transition text-lg leading-none px-1">✕</button>
        </div>

        <div class="p-5 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
        <select id="exampleSelect" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 focus:outline-none focus:border-amber-500 transition cursor-pointer">
        <option value="">Load Example...</option>
        <option value="player">Example Player</option>
        <option value="enemy">Example Enemy</option>
        <option value="minion">Example Minion</option>
        <option value="boss">Example Boss</option>
        </select>
        <div class="ml-auto flex items-center gap-2">
              <button id="browseFileBtn" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-200 transition">📁 Choose JSON File</button>
              <span id="fileNameLabel" class="text-[10px] text-slate-500 truncate max-w-[10rem]"></span>
            </div>
            <input type="file" id="importFile" accept=".json,application/json" class="hidden" />
          </div>

          <textarea id="importTextarea" rows="12" spellcheck="false"
            placeholder='[ { "name": "Keqing", "type": "player", "vision": "Electro", ... } ]'
            class="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[11px] font-mono text-slate-300 resize-y scroll-thin"></textarea>

          <p class="text-[11px] text-slate-500 leading-relaxed">
            Accepts a single object or an array. Required fields:
            <code class="text-slate-400">name</code>, <code class="text-slate-400">type</code>,
            <code class="text-slate-400">hp_max</code>, <code class="text-slate-400">atk</code>,
            <code class="text-slate-400">def</code>, <code class="text-slate-400">spd</code>,
            <code class="text-slate-400">vision</code>.
          </p>

          <p id="importMsg" class="text-[11px] min-h-[1rem]"></p>
        </div>

        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button data-close-modal class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wide text-slate-300 transition">Cancel</button>
          <button id="doImportBtn" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase tracking-wide text-white transition">Import</button>
        </div>
      </div>
    </div>

    <!-- ============================ GM PLAYERS PANEL ============================ -->
    <div id="gmPlayersPanel" class="modal hidden">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-panel">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-300">Player Codes</h3>
          <button data-close-modal class="text-slate-500 hover:text-rose-400 transition text-lg leading-none px-1">✕</button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Add new code -->
          <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Add Player Code</div>
            <div class="flex items-center gap-2 flex-wrap">
              <input id="newCodeInput" type="text" placeholder="Code (e.g., MARISOL-01)"
                class="flex-1 min-w-[10rem] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono uppercase" />
              <input id="newNameInput" type="text" placeholder="Player name"
                class="w-36 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              <button id="addCodeBtn"
                class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase tracking-wider text-white transition">
                + Add
              </button>
            </div>
            <p id="newCodeMsg" class="text-[11px] min-h-[1rem]"></p>
          </div>

          <!-- Code list (populated by gm-players.js) -->
          <div id="gmPlayersList" class="space-y-2 max-h-[55vh] overflow-y-auto scroll-thin"></div>
        </div>

        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button data-close-modal class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wide text-slate-300 transition">Close</button>
        </div>
      </div>
    </div>
  `;
}
