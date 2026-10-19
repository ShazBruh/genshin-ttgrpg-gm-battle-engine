/* ============================================================
   gate.js  —  Code-entry screen
   Shown before any role is decided. Phase 3 wires the actual
   validation; for now this is a static skeleton.
   ============================================================ */

export function gateHTML() {
  return `
    <div id="gateView"
         class="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">

      <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

        <!-- Emblem + title -->
        <div class="text-center mb-8">
          <div class="text-5xl mb-3 select-none">⚔</div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-amber-300 via-rose-400 to-violet-400 bg-clip-text text-transparent mb-1">
            Genshin TTRPG
          </h1>
          <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Teyvat Altered Campaign
          </p>
        </div>

        <!-- Code input -->
        <label for="gateCodeInput"
               class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Access Code
        </label>
        <input
          id="gateCodeInput"
          type="text"
          placeholder="ENTER ACCESS CODE"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-center
                 font-mono text-sm text-amber-300 tracking-widest
                 focus:outline-none focus:border-amber-500 transition" />

        <!-- Submit -->
        <button id="gateEnterBtn"
                class="w-full mt-4 py-3 rounded-lg font-bold uppercase tracking-widest text-sm
                       bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950
                       hover:from-amber-400 hover:to-rose-400
                       active:scale-[.98] transition">
          Enter
        </button>

        <!-- Feedback -->
        <p id="gateMsg" class="mt-4 text-center text-xs min-h-[1rem]"></p>
        <p id="gateAttempts" class="mt-1 text-center text-[10px] text-slate-600"></p>

      </div>
    </div>
  `;
}