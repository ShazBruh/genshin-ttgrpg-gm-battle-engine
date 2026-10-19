/* ============================================================
   gm.js  —  GM main view
   ============================================================ */

export function gmHTML() {
  return `
    <main data-role="gm" class="hidden max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

      <!-- ---------------- LEFT: TURN ORDER + ROSTER ---------------- -->
      <section class="lg:col-span-4">
        <div class="lg:sticky lg:top-[4.75rem] space-y-3">

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center justify-between mb-2 px-1">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Turn Order</h2>
              <span class="text-[10px] text-slate-500 font-mono">sorted by SPD ↓</span>
            </div>
            <div id="turnOrder" class="flex gap-2 overflow-x-auto scroll-thin pb-1"></div>
          </div>

          <div id="fieldPanel"
               class="hidden bg-gradient-to-br from-green-950/60 to-slate-900/70
                      border border-green-800/60 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center justify-between mb-2 px-1">
              <h2 class="text-sm font-bold uppercase tracking-widest text-green-300/80">Field</h2>
              <span class="text-[10px] text-slate-500 font-mono">Active Entities</span>
            </div>
            <div id="fieldContent" class="space-y-2"></div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center justify-between mb-3 px-1">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Combatants</h2>
              <span id="rosterCount" class="text-[11px] text-slate-500 font-mono">0 entities</span>
            </div>
            <div id="roster" class="space-y-2.5 lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto scroll-thin pr-1"></div>
          </div>

        </div>
      </section>

      <!-- ---------------- CENTER: ACTION CONTROLLER ---------------- -->
      <section class="lg:col-span-4">
        <div class="lg:sticky lg:top-[4.75rem] bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur space-y-4">
          <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Action Controller</h2>

          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span class="w-5 h-5 grid place-items-center rounded-md bg-amber-500/20 text-amber-300 text-[10px]">1</span>
              Attacker
            </label>
            <select id="attackerSelect"
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100"></select>
          </div>

          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span class="w-5 h-5 grid place-items-center rounded-md bg-rose-500/20 text-rose-300 text-[10px]">2</span>
              Target
            </label>
            <select id="targetSelect"
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100"></select>
            
            <div id="randomAmountWrapper" class="hidden mt-2">
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Number of Random Targets (Min 1)</label>
              <input id="randomAmountInput" type="number" value="1" min="1" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span class="w-5 h-5 grid place-items-center rounded-md bg-violet-500/20 text-violet-300 text-[10px]">3</span>
              Action
            </label>

            <div id="actionGrid" class="grid grid-cols-2 gap-2"></div>
            
            <button id="applyStatusBtn"
                    class="w-full mt-2 py-2.5 rounded-xl border border-fuchsia-700 bg-fuchsia-900/40 hover:bg-fuchsia-800 text-fuchsia-200 text-[11px] font-bold uppercase tracking-wide transition">
              ✨ Apply Custom Status to Target
            </button>
          </div>

          <div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-3">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Modifiers</div>

            <label class="flex items-center gap-2.5 cursor-pointer select-none">
              <input id="critChk" type="checkbox" class="w-4 h-4 accent-amber-500 rounded" />
              <span class="text-sm text-slate-300">Critical Hit? <span class="text-slate-500 text-xs">(+ Crit DMG)</span></span>
            </label>

            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Applied Element (after hit)</label>
              <select id="appliedElementSelect"
                      class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm">
                <option value="">Auto (attacker's vision)</option>
                <option value="None">None (physical)</option>
                <option value="Pyro">Pyro</option>
                <option value="Hydro">Hydro</option>
                <option value="Cryo">Cryo</option>
                <option value="Electro">Electro</option>
                <option value="Anemo">Anemo</option>
                <option value="Geo">Geo</option>
                <option value="Dendro">Dendro</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Bonus / Penalty DMG</label>
                <input id="bonusInput" type="number" value="0"
                       class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Heal / Shield Amt</label>
                <input id="amountInput" type="number" value="5"
                       class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm" />
              </div>
            </div>
          </div>

          <button id="executeBtn"
                  class="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm
                         bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950
                         hover:from-amber-400 hover:via-orange-400 hover:to-rose-400
                         active:scale-[.98] transition shadow-xl shadow-orange-900/30">
            ▶ Execute Action
          </button>
        </div>
      </section>

      <!-- ---------------- RIGHT: LOG / HISTORY / PRESETS ---------------- -->
      <section class="lg:col-span-4 space-y-3">
        <div class="lg:sticky lg:top-[4.75rem] space-y-3">

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center gap-2 mb-3">
              <button data-tab="log"
                      class="tab-btn active px-3 py-1.5 rounded-lg border border-slate-700
                             text-[11px] font-bold uppercase tracking-wider text-slate-400 transition">
                Live Log
              </button>
              <button data-tab="history"
                      class="tab-btn px-3 py-1.5 rounded-lg border border-slate-700
                             text-[11px] font-bold uppercase tracking-wider text-slate-400 transition">
                Combat History
              </button>
              <button id="clearLogBtn"
                      class="ml-auto text-[10px] uppercase tracking-wider text-slate-500 hover:text-rose-400 transition">
                Clear
              </button>
            </div>

            <div id="tabPanel-log">
            <div id="logFeed"
            class="log-feed h-72 lg:h-[calc(100vh-26rem)] lg:min-h-[16rem] overflow-y-auto scroll-thin"></div>
            </div>

            <div id="tabPanel-history" class="hidden">
            <div class="max-h-[calc(100vh-26rem)] min-h-[16rem] overflow-auto scroll-thin
            rounded-lg border border-slate-800">
                <table class="w-full text-left border-collapse">
                  <thead class="sticky top-0 bg-slate-900 z-10">
                    <tr class="border-b border-slate-700">
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">#</th>
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Rnd</th>
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Attacker</th>
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Target</th>
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Action</th>
                      <th class="px-2 py-2 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody id="historyBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
          <div class="flex items-center justify-between mb-2.5 px-1">
          <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Operator Menu</h2>
          <button id="openImportBtn"
          class="text-[10px] uppercase tracking-wider font-bold text-violet-400 hover:text-violet-300 transition">
          + Import JSON
          </button>
          </div>
          <div id="operatorGrid" class="grid grid-cols-2 gap-2"></div>
          </div>

          </div>
          </section>
          </main>
          `;
}
