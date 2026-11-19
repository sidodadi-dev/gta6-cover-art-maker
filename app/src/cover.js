// Vice Panels — the cover engine.
//
// Pure drawing: given a state (layout, per-panel photos with zoom/focal point, a colour grade,
// caption lettering and a star motif) it paints a GTA-style multi-panel cover onto any 2D
// canvas, at whatever size that canvas is. The editor (main.js) owns the state and the
// interaction; the screenshot scenes (shots.js) drive this same engine with fixed states.
// Nothing here touches the DOM beyond the canvas context it is handed, and nothing is loaded
// from the network: photos arrive as already-decoded image elements.

/** Poster layouts as fractional panel rectangles (x, y, w, h in 0..1 of the canvas). */
export const LAYOUTS = {
  grid6: {
    label: 'Collage Grid',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 2 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 2 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 3, h: 1 / 2 }, { x: 1 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 }, { x: 2 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
    ],
  },
  hero: {
    label: 'Hero + Strips',
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 1 / 3 },
      { x: 0.58, y: 1 / 3, w: 0.42, h: 1 / 3 },
      { x: 0.58, y: 2 / 3, w: 0.42, h: 1 / 3 },
    ],
  },
  duo: {
    label: 'Duo / Trio Split',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.55 },
      { x: 0, y: 0.55, w: 0.5, h: 0.45 },
      { x: 0.5, y: 0.55, w: 0.5, h: 0.45 },
    ],
  },
  single: {
    label: 'Single Hero',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

/**
 * Colour grades: a canvas filter applied while each photo is drawn, gradient overlays laid
 * over the whole collage, and a vignette strength. Overlays are vertical gradients given as
 * [position, colour] stops.
 */
export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.09) brightness(1.03) hue-rotate(-8deg)',
    overlays: [
      [[0, 'rgba(46, 10, 84, 0.30)'], [0.45, 'rgba(46, 10, 84, 0)'], [0.78, 'rgba(255, 84, 60, 0)'], [1, 'rgba(255, 84, 60, 0.34)']],
      [[0, 'rgba(255, 166, 66, 0.13)'], [0.4, 'rgba(255, 166, 66, 0)']],
    ],
    vignette: 0.22,
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.95) hue-rotate(10deg)',
    overlays: [
      [[0, 'rgba(0, 64, 86, 0.34)'], [0.5, 'rgba(0, 64, 86, 0)'], [1, 'rgba(214, 0, 127, 0.30)']],
    ],
    vignette: 0.3,
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.28) contrast(1.06) brightness(1.07) sepia(0.28)',
    overlays: [
      [[0, 'rgba(120, 60, 0, 0.10)'], [0.55, 'rgba(120, 60, 0, 0)'], [1, 'rgba(255, 158, 32, 0.32)']],
    ],
    vignette: 0.18,
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(0.99)',
    overlays: [
      [[0, 'rgba(0, 0, 0, 0.18)'], [0.5, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.28)']],
    ],
    vignette: 0.42,
  },
  none: {
    label: 'None',
    filter: 'none',
    overlays: [],
    vignette: 0.08,
  },
};

export const CAPTION_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffb52e', label: 'Amber' },
  { value: '#ff5da2', label: 'Pink' },
  { value: '#2ee6c8', label: 'Teal' },
  { value: '#ff5252', label: 'Red' },
];

const FONT_STACK = '"Vice Display", "Liberation Sans", Arial, sans-serif';
const KEYLINE = '#f6f1e7';
const STAR_FILL_TOP = '#ffd34d';
const STAR_FILL_BOTTOM = '#ff9a1f';

/** The white keyline thickness for a canvas of this size. */
export function keyline(w, h) {
  return Math.max(5, Math.round(Math.min(w, h) * 0.011));
}

/** The pixel rectangle of panel `i` (inside its keyline) for a canvas of w x h. */
export function innerRect(w, h, layoutKey, i) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.grid6;
  const p = layout.panels[i];
  if (!p) return null;
  const key = keyline(w, h);
  return { x: p.x * w + key / 2, y: p.y * h + key / 2, w: p.w * w - key, h: p.h * h - key };
}

/**
 * Where a photo lands inside a panel rect: cover-fit scaled by the slot's zoom, positioned so
 * the slot's focal point (fx, fy in 0..1 of the photo) sits at the panel's centre, clamped so
 * the photo always covers the panel. Returns { dw, dh, dx, dy } in canvas pixels.
 */
export function photoGeom(slot, r, iw, ih) {
  const scale = Math.max(r.w / iw, r.h / ih) * (slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = r.x + r.w / 2 - (slot.fx ?? 0.5) * dw;
  let dy = r.y + r.h / 2 - (slot.fy ?? 0.5) * dh;
  dx = Math.min(r.x, Math.max(r.x + r.w - dw, dx));
  dy = Math.min(r.y, Math.max(r.y + r.h - dh, dy));
  return { dw, dh, dx, dy };
}

/** Clamps a slot's focal point so its photo can never be dragged past the panel's edges. */
export function clampSlot(slot, r, iw, ih) {
  const scale = Math.max(r.w / iw, r.h / ih) * (slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  if (dw > r.w) {
    const lo = (r.w / 2) / dw;
    slot.fx = Math.min(1 - lo, Math.max(lo, slot.fx ?? 0.5));
  } else {
    slot.fx = 0.5;
  }
  if (dh > r.h) {
    const lo = (r.h / 2) / dh;
    slot.fy = Math.min(1 - lo, Math.max(lo, slot.fy ?? 0.5));
  } else {
    slot.fy = 0.5;
  }
}

function starPath(ctx, cx, cy, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The amber star motif: a five-pointed star with a dark outline and a soft drop shadow. */
export function drawStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = r * 0.25;
  ctx.shadowOffsetY = r * 0.06;
  starPath(ctx, cx, cy, r, -Math.PI / 2);
  const fill = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  fill.addColorStop(0, STAR_FILL_TOP);
  fill.addColorStop(1, STAR_FILL_BOTTOM);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.strokeStyle = '#2a1503';
  ctx.stroke();
  ctx.restore();
}

function drawPlaceholder(ctx, r, index) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, '#2a1e45');
  g.addColorStop(1, '#0e2c3c');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const sr = Math.min(r.w, r.h) * 0.16;
  ctx.save();
  ctx.globalAlpha = 0.5;
  starPath(ctx, r.x + r.w / 2, r.y + r.h / 2 - sr * 0.7, sr, -Math.PI / 2);
  ctx.lineWidth = Math.max(1.5, sr * 0.1);
  ctx.strokeStyle = '#ffb52e';
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = `700 ${Math.max(11, Math.round(r.h * 0.062))}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 233, 196, 0.6)';
  ctx.fillText(`ADD A PHOTO · ${index + 1}`, r.x + r.w / 2, r.y + r.h / 2 + sr * 1.15);
  ctx.restore();
}

function drawSelection(ctx, r) {
  const lw = Math.max(3, Math.min(r.w, r.h) * 0.012);
  ctx.save();
  ctx.setLineDash([16, 11]);
  ctx.lineWidth = lw + 3;
  ctx.strokeStyle = 'rgba(18, 8, 30, 0.85)';
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#ffb52e';
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
}

function drawCaption(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  if (!title && !sub) return;
  const top = state.captionPos === 'top';
  let size = Math.round(h * 0.104);
  ctx.save();
  ctx.textAlign = 'center';
  const setTitleFont = (s) => { ctx.font = `700 ${s}px ${FONT_STACK}`; };
  setTitleFont(size);
  if (title) {
    while (size > 14 && ctx.measureText(title).width > w * 0.92) {
      size -= 3;
      setTitleFont(size);
    }
  }
  const subSize = Math.max(13, Math.round(size * 0.335));
  const gap = sub ? size * 0.36 : 0;
  const blockH = size + gap + (sub ? subSize : 0);
  const margin = h * 0.045;
  const titleBase = top ? margin + size : h - margin - (sub ? subSize + gap : 0);

  // A dark scrim behind the lettering keeps it readable over bright photos.
  const scrimH = blockH + h * 0.14;
  const sg = top
    ? ctx.createLinearGradient(0, 0, 0, scrimH)
    : ctx.createLinearGradient(0, h, 0, h - scrimH);
  sg.addColorStop(0, 'rgba(9, 4, 18, 0.80)');
  sg.addColorStop(1, 'rgba(9, 4, 18, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, top ? 0 : h - scrimH, w, scrimH);

  if (title) {
    ctx.save();
    setTitleFont(size);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#150820';
    ctx.lineWidth = Math.max(2, size * 0.17);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.045;
    ctx.strokeText(title, w / 2, titleBase);
    ctx.fillStyle = state.captionColor || '#ffffff';
    ctx.fillText(title, w / 2, titleBase);
    ctx.restore();
  }
  if (sub) {
    ctx.save();
    ctx.font = `700 ${subSize}px ${FONT_STACK}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.16)}px`; } catch { /* older engines */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#150820';
    ctx.lineWidth = Math.max(1.5, subSize * 0.15);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = subSize * 0.12;
    const y = top ? titleBase + gap + subSize : h - margin;
    ctx.strokeText(sub, w / 2, y);
    ctx.fillStyle = 'rgba(255, 238, 205, 0.96)';
    ctx.fillText(sub, w / 2, y);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Paints the whole cover. `state` is:
 *   { layout, grade, title, subtitle, captionPos, captionColor, star,
 *     panels: [{ img, zoom, fx, fy }, ...] }
 * `opts.selection` is the panel index to ring in amber (editor only), or -1 for a clean export.
 */
export function drawCoverArt(ctx, w, h, state, opts = {}) {
  const selection = opts.selection ?? -1;
  const grade = GRADES[state.grade] ?? GRADES.vice;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid6;
  const key = keyline(w, h);

  ctx.save();
  ctx.fillStyle = KEYLINE;
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((p, i) => {
    const r = { x: p.x * w + key / 2, y: p.y * h + key / 2, w: p.w * w - key, h: p.h * h - key };
    const slot = state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    if (slot && slot.img) {
      ctx.filter = grade.filter;
      const g = photoGeom(slot, r, slot.img.naturalWidth, slot.img.naturalHeight);
      ctx.drawImage(slot.img, g.dx, g.dy, g.dw, g.dh);
      ctx.filter = 'none';
    } else {
      drawPlaceholder(ctx, r, i);
    }
    ctx.restore();
    if (selection === i) drawSelection(ctx, r);
  });

  // The grade's washes go over the whole collage so the panels grade as one poster.
  for (const stops of grade.overlays) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, colour] of stops) g.addColorStop(at, colour);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (grade.vignette > 0) {
    const rad = Math.hypot(w, h) / 2;
    const vg = ctx.createRadialGradient(w / 2, h / 2, rad * 0.52, w / 2, h / 2, rad);
    vg.addColorStop(0, 'rgba(8, 3, 16, 0)');
    vg.addColorStop(1, `rgba(8, 3, 16, ${grade.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.star && state.star !== 'none') {
    const r = Math.min(w, h) * 0.055;
    const inset = r * 1.14;
    const cx = state.star.endsWith('l') ? inset : w - inset;
    const cy = state.star.startsWith('t') ? inset : h - inset;
    drawStar(ctx, cx, cy, r);
  }

  drawCaption(ctx, w, h, state);
  ctx.restore();
}

/** A fresh, empty panel slot. */
export function emptySlot() {
  return { img: null, zoom: 1, fx: 0.5, fy: 0.5 };
}
