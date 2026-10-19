/* ============================================================
 *  icons.js
 *  Elemental icons via <img> with automatic letter-fallback.
 *  Weapon icons via <img> with automatic letter-fallback.
 *  If a file is missing, a colored letter box appears.
 *  ============================================================ */

export const ELEMENT_COLORS = {
  Pyro:       '#f87171',
  Hydro:      '#60a5fa',
  Cryo:       '#67e8f9',
  Electro:    '#c084fc',
  Anemo:      '#5eead4',
  Geo:        '#fbbf24',
  Dendro:     '#86efac',
  DendroCore: '#86efac',
  Physical:   '#cbd5e1',
  None:       '#64748b'
};

const ICON_SRC = {
  Pyro:       'icons/pyro.png',
  Hydro:      'icons/hydro.png',
  Cryo:       'icons/cryo.png',
  Electro:    'icons/electro.png',
  Anemo:      'icons/anemo.png',
  Geo:        'icons/geo.png',
  Dendro:     'icons/dendro.png',
  DendroCore: 'icons/dendro_core.png',
  Physical:   'icons/physical.png',
  None:       'icons/none.png'
};

/* ---- Weapon icons — expect icons/<lowercase-weapon>.png ---- */
const WEAPON_ICON_SRC = {
  Sword:     'icons/sword.png',
  Catalyst:  'icons/catalyst.png',
  Claymore:  'icons/claymore.png',
  Polearm:   'icons/polearm.png',
  Bow:       'icons/bow.png',
  Elemental: 'icons/elemental.png',
  Physical:  'icons/physical.png'
};

/* ---------------------------------------------------------- */

export function hexToRgba(hex, alpha) {
  const h = String(hex || '#64748b').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function elementColor(vision) {
  return ELEMENT_COLORS[vision] || ELEMENT_COLORS.None;
}

/* Fallback SVG — a colored circle with the element's first letter. */
function fallbackDataUri(vision) {
  const color = elementColor(vision);
  const letter = String(vision || '?').charAt(0).toUpperCase();
  const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
  `<circle cx="20" cy="20" r="17" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2.5"/>` +
  `<text x="20" y="28" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="900" fill="${color}">${letter}</text>` +
  `</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/* Fallback for weapon icons — a slate rounded square with the initial. */
function weaponFallbackDataUri(weapon) {
  const color = '#94a3b8';
  const letter = String(weapon || '?').charAt(0).toUpperCase();
  const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
  `<rect x="6" y="6" width="28" height="28" rx="6" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>` +
  `<text x="20" y="27" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="900" fill="${color}">${letter}</text>` +
  `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Element icon. Renders as <img>, with a colored letter-circle drawn
 * behind it — visible only if the file is missing or fails to load.
 */
export function elemIcon(vision, size = 16) {
  const key = ICON_SRC[vision] ? vision : 'None';
  const src = ICON_SRC[key];
  const fb  = fallbackDataUri(key);

  return (
    `<span class="elem-icon-wrap" ` +
    `style="width:${size}px;height:${size}px;` +
    `background-image:${fb};background-size:contain;background-position:center;background-repeat:no-repeat">` +
    `<img src="${src}" alt="${key}" draggable="false" ` +
    `style="width:100%;height:100%;object-fit:contain;display:block" />` +
    `</span>`
  );
}

export function elemChip(vision, label, size = 12) {
  const key   = ELEMENT_COLORS[vision] ? vision : 'None';
  const color = elementColor(key);
  const bg    = hexToRgba(color, 0.14);
  const br    = hexToRgba(color, 0.45);
  return (
    `<span class="elem-chip" style="background:${bg};border-color:${br};color:${color}">` +
    `${elemIcon(key, size)}<span>${label != null ? label : key}</span>` +
    `</span>`
  );
}

export function elemBadge(vision, size = 22) {
  const key   = ELEMENT_COLORS[vision] ? vision : 'None';
  const color = elementColor(key);
  const bg    = hexToRgba(color, 0.14);
  const br    = hexToRgba(color, 0.5);
  const iconSize = Math.round(size * 0.65);
  return (
    `<span class="elem-badge" ` +
    `style="background:${bg};border-color:${br};width:${size}px;height:${size}px;color:${color}">` +
    `${elemIcon(key, iconSize)}</span>`
  );
}

/**
 * Weapon icon. Renders as <img src="icons/<weapon>.png">, with a
 * slate letter-box fallback if the file is missing. Returns an
 * empty string for unknown / 'None' weapons so callers can drop
 * it into a badge unconditionally.
 */
export function weaponIcon(weapon, size = 16) {
  const key = WEAPON_ICON_SRC[weapon] ? weapon : null;
  if (!key) return '';
  const src      = WEAPON_ICON_SRC[key];
  const fallback = weaponFallbackDataUri(key);

  return (
    `<span class="weapon-icon-wrap" ` +
    `style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;flex-shrink:0;line-height:0">` +
    `<img src="${src}" alt="${key}" draggable="false" ` +
    `onerror="this.onerror=null;this.src='${fallback}'" ` +
    `style="width:100%;height:100%;object-fit:contain;display:block" />` +
    `</span>`
  );
}