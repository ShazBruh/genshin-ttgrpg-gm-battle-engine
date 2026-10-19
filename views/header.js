/* ============================================================
   header.js  —  Top bar
   Contains the shared round badge, GM-only buttons, player-only
   welcome message, and the logout button.
   ============================================================ */

export function headerHTML() {
  return `
    <header class="site-header sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div class="max-w-[1800px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">

        <h1 class="text-base md:text-xl font-bold tracking-wide
                   bg-gradient-to-r from-amber-300 via-rose-400 to-violet-400
                   bg-clip-text text-transparent select-none">
          ⚔ Genshin TTRPG — GM Battle Engine
        </h1>

        <div id="roundBadge"
             class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300">
          Round 1
        </div>

        <div class="ml-auto flex items-center gap-2 flex-wrap">

          <!-- GM-only actions -->
          <div data-role="gm" class="flex items-center gap-2 flex-wrap">

            <button id="openPlayersBtn"
                    title="Manage player codes"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-700
                           border border-slate-700 hover:border-emerald-500
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-slate-300 hover:text-white">
              👥 Players
            </button>

            <button id="bgPickBtn"
                    title="Pick a background image"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-violet-700
                           border border-slate-700 hover:border-violet-500
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-slate-300 hover:text-white">
              🖼 Background
            </button>
            <input type="file" id="bgFileInput" accept="image/*" class="hidden" />

            <button id="nextTurnBtn"
                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-white shadow-lg shadow-emerald-900/40">
              ▶ Next Turn
            </button>
            <button id="restRoundBtn"
                    class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-white shadow-lg shadow-indigo-900/40">
              ⟳ Rest Round
            </button>
            <button id="resetBtn"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-700
                           border border-slate-700 hover:border-rose-600
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-slate-300 hover:text-white">
              ✕ Reset
            </button>

            <button id="previewToggleBtn"
                    title="Preview as a player"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-violet-700
                           border border-slate-700 hover:border-violet-500
                           active:scale-95 transition text-xs font-bold uppercase tracking-wide
                           text-slate-300 hover:text-white">
              👁 Preview
            </button>
          </div>

          <!-- Player-only welcome -->
          <div data-role="player" class="hidden flex items-center gap-2">
            <span id="playerWelcome"
                  class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700
                         text-xs font-semibold text-slate-300">
              Welcome
            </span>
          </div>

          <!-- Logout (shared) -->
          <button id="logoutBtn"
                  title="Log out"
                  class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-700
                         border border-slate-700 hover:border-rose-600
                         active:scale-95 transition text-xs font-bold uppercase tracking-wide
                         text-slate-300 hover:text-white">
            ↩ Logout
          </button>

        </div>
      </div>
    </header>
  `;
}