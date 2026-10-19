/* ============================================================
   player.js  —  Player main view.
   Center column now allocates a big My Character panel.
   ============================================================ */

export function playerHTML() {
  return `
    <main data-role="player" class="hidden max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

      <!-- BOSS BAR -->
      <div id="bossBar"
           class="hidden lg:col-span-12 bg-gradient-to-r from-rose-950/70 via-slate-900/70 to-rose-950/70
                  border border-rose-800/60 rounded-2xl px-5 py-3 backdrop-blur
                  shadow-[0_0_40px_-10px_rgba(244,63,94,.45)]">
        <div class="flex items-center justify-between mb-2">
          <span id="bossBarName" class="text-sm font-bold uppercase tracking-widest text-rose-200">—</span>
          <span id="bossBarValue" class="text-[11px] font-mono text-rose-300/70">—</span>
        </div>
        <div class="h-4 rounded-full bg-slate-950/80 overflow-hidden border border-rose-900/50">
          <div id="bossBarFill"
               class="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400
                      transition-all duration-500"
               style="width:0%"></div>
        </div>
      </div>

      <!-- LEFT -->
      <section class="lg:col-span-4">
      <!-- FIELD ENTITIES -->
      <div id="playerFieldPanel"
      class="hidden bg-gradient-to-br from-green-950/60 to-slate-900/70
      border border-green-800/60 rounded-2xl p-3 backdrop-blur">
      <div class="flex items-center justify-between mb-2 px-1">
      <h2 class="text-sm font-bold uppercase tracking-widest text-green-300/80">Field</h2>
      <span class="text-[10px] text-slate-500 font-mono">Active Entities</span>
      </div>
      <div id="playerFieldContent" class="space-y-2"></div>
      </div>
        <div class="lg:sticky lg:top-[4.75rem] space-y-3">

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center justify-between mb-2 px-1">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Turn Order</h2>
              <span class="text-[10px] text-slate-500 font-mono">sorted by SPD ↓</span>
            </div>
            <div id="pTurnOrder" class="flex gap-2 overflow-x-auto scroll-thin pb-1"></div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center justify-between mb-3 px-1">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Combatants</h2>
              <span id="pRosterCount" class="text-[11px] text-slate-500 font-mono">0 entities</span>
            </div>
            <div id="pRoster"
                 class="space-y-2.5 lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto scroll-thin pr-1"></div>
          </div>

        </div>
      </section>

      <!-- CENTER: My Character -->
      <section class="lg:col-span-4">
        <div class="lg:sticky lg:top-[4.75rem] space-y-3">

          <div id="myCharPanel"
               class="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur
                      min-h-[28rem]">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">My Character</h2>
              <span id="myCharName" class="text-xs font-semibold text-amber-300">—</span>
            </div>
            <div id="myCharContent" class="min-h-[24rem]"></div>
          </div>

        </div>
      </section>

      <!-- RIGHT -->
      <section class="lg:col-span-4 space-y-3">
        <div class="lg:sticky lg:top-[4.75rem] space-y-3">

          <div id="uploadPanel"
               class="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400">Character Upload</h2>
            </div>

            <p class="text-[11px] text-slate-500 leading-relaxed mb-3">
              Select the JSON file exported from the
              <b class="text-slate-400">Teyvat Altered Campaign Sheet Maker</b>.
            </p>

            <input type="file" id="uploadFileInput" accept=".json,application/json" class="hidden" />
            <button id="uploadBtn"
                    class="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm
                           bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500
                           text-slate-200 active:scale-[.98] transition">
              📁 Choose JSON File
            </button>

            <p id="uploadStatus" class="mt-3 text-[11px] text-slate-500 min-h-[1rem] text-center"></p>
          </div>

          <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 backdrop-blur">
            <div class="flex items-center gap-2 mb-3">
              <button data-tab="log" id="pTabBtnLog"
                      class="tab-btn active px-2.5 py-1.5 rounded-lg border border-slate-700
                             text-[10px] font-bold uppercase tracking-wider text-slate-400 transition">
                Log
              </button>
              <button data-tab="history" id="pTabBtnHistory"
                      class="tab-btn px-2.5 py-1.5 rounded-lg border border-slate-700
                             text-[10px] font-bold uppercase tracking-wider text-slate-400 transition">
                History
              </button>
              <button id="pClearLogBtn"
                      class="ml-auto text-[10px] uppercase tracking-wider text-slate-500 hover:text-rose-400 transition">
                Clear
              </button>
            </div>

            <div id="pTabPanelLog">
            <div id="pLogFeed"
            class="log-feed h-72 lg:h-[calc(100vh-30rem)] lg:min-h-[16rem] overflow-y-auto scroll-thin"></div>
            </div>

            <div id="pTabPanelHistory" class="hidden">
            <div class="max-h-[calc(100vh-30rem)] min-h-[16rem] overflow-auto scroll-thin
            rounded-lg border border-slate-800">
                <table class="w-full text-left border-collapse">
                  <thead class="sticky top-0 bg-slate-900 z-10">
                    <tr class="border-b border-slate-700">
                      <th class="px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">#</th>
                      <th class="px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Rnd</th>
                      <th class="px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Atk</th>
                      <th class="px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Tgt</th>
                      <th class="px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody id="pHistoryBody"></tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  `;
}
