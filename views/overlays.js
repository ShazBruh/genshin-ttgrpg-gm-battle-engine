/* ============================================================
   overlays.js  —  Full-screen overlays & background layer
   Dim slider removed (auto-dim driven by party HP in ui.js).
   Down banner added.
   ============================================================ */

export function overlaysHTML() {
  return `
    <!-- ============================ BACKGROUND LAYER ============================ -->
    <div id="bgLayer" aria-hidden="true">
      <div id="bgImage"></div>
      <div id="bgDim"></div>
    </div>

    <!-- ============================ ROUND BANNER ============================ -->
    <div id="roundBanner" class="round-banner hidden">
      <div class="text-center select-none">
        <div class="text-[11px] uppercase tracking-[0.5em] text-amber-300/80 mb-1">Round</div>
        <div id="roundBannerNumber"
             class="text-8xl font-black leading-none
                    bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500
                    bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,.35)]">
          2
        </div>
        <div class="mt-3 text-sm text-slate-300">
          Begins with <b id="roundBannerFirst" class="text-amber-300">—</b>
        </div>
      </div>
    </div>

    <!-- ============================ TURN BANNER ============================ -->
    <div id="turnBanner" class="turn-banner hidden">
      <div class="text-center select-none">
        <div class="text-[11px] uppercase tracking-[0.5em] text-emerald-300/80 mb-2">Now Acting</div>
        <div id="turnBannerName"
             class="text-7xl font-black leading-none text-emerald-200
                    drop-shadow-[0_0_30px_rgba(16,185,129,.55)]">
          —
        </div>
        <div class="mt-3 text-sm text-slate-300">
          Speed <b id="turnBannerSpd" class="text-emerald-300">—</b>
        </div>
      </div>
    </div>

    <!-- ============================ REACTION OVERLAY ============================ -->
    <div id="reactionOverlay" class="reaction-overlay hidden">
      <div class="reaction-inner">
        <div class="reaction-pair">
          <div class="reaction-elem" id="reactionElemA"></div>
          <div class="reaction-plus">+</div>
          <div class="reaction-elem" id="reactionElemB"></div>
        </div>
        <div class="reaction-title" id="reactionTitle">VAPORIZE</div>
      </div>
    </div>

    <!-- ============================ PLAYER DOWN BANNER ============================ -->
    <div id="downBanner" class="down-banner hidden">
      <div class="down-inner">
        <div class="down-icon">☠</div>
        <div class="down-label">Player Down</div>
        <div id="downName" class="down-name">—</div>
      </div>
    </div>

    <!-- ============================ BACKGROUND CONTROLS (GM only) ============================ -->
    <div id="bgControls" data-role="gm"
         class="hidden fixed bottom-4 right-4 z-40 bg-slate-900/95 border border-slate-700
                rounded-xl shadow-2xl backdrop-blur px-3 py-2 flex items-center gap-2">
      <button id="bgChangeBtn"
              class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700
                     text-[10px] font-bold uppercase tracking-wider text-slate-200 transition">
        Change
      </button>
      <button id="bgRemoveBtn"
              class="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-700
                     text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:text-white transition">
        Remove
      </button>
    </div>
  `;
}