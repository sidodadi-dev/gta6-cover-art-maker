// Vice Panels cover renderer: draws a multi-panel, GTA-style cover onto a canvas 2D context.
//
// A cover state looks like:
//   {
//     layout: 'collage' | 'hero-strips' | 'duo' | 'single',
//     panels: [{ photo: HTMLImageElement|null, panX: 0..1, panY: 0..1, zoom: >=1 }, ...],
//     grade: 'vice' | 'neon' | 'golden' | 'noir' | 'none',
//     title: string, subtitle: string,
//     titlePos: 'top' | 'bottom', titleSize: 0..1 (relative), titleColor: css colour,
//     star: boolean,
//     starCorner: null (the top corner away from the lettering) or 'tl' | 'tr' | 'bl' | 'br'
//       to pin the star where a scene knows there is sky or sea rather than a face,
//   }
// Everything drawn here is original: the layout, the keylines, the lettering and the five-point
// star motif are this app's own; no game artwork, logo or font is used.

export const DISPLAY_FONT = '"Vice Display", "Liberation Sans", sans-serif';

export const LAYOUTS = {
  collage: { label: 'Collage Grid', panels: 6 },
  'hero-strips': { label: 'Hero + Strips', panels: 4 },
  duo: { label: 'Duo / Trio Split', panels: 3 },
  single: { label: 'Single Hero', panels: 1 },
};

export const GRADES = {
  vice: { label: 'Vice Sunset' },
  neon: { label: 'Neon Nights' },
  golden: { label: 'Golden Hour' },
  noir: { label: 'Noir' },
  none: { label: 'None' },
};

/** Number of panels a layout uses. */
export function panelCount(layout) {
  return (LAYOUTS[layout] ?? LAYOUTS.collage).panels;
}

/** A fresh, empty panel state. */
export function emptyPanel() {
  return { photo: null, panX: 0.5, panY: 0.5, zoom: 1 };
}

/**
 * Panel rectangles for a layout, as fractions of the canvas (x, y, w, h each 0..1).
 * `vertical` is true when the canvas is taller than wide; the duo layout then stacks
 * its panels instead of splitting them side by side.
 */
export function panelRects(layout, vertical) {
  switch (layout) {
    case 'single':
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 'hero-strips':
      return [
        { x: 0, y: 0, w: 0.68, h: 1 },
        { x: 0.68, y: 0, w: 0.32, h: 1 / 3 },
        { x: 0.68, y: 1 / 3, w: 0.32, h: 1 / 3 },
        { x: 0.68, y: 2 / 3, w: 0.32, h: 1 / 3 },
      ];
    case 'duo':
      return vertical
        ? [
            { x: 0, y: 0, w: 1, h: 0.5 },
            { x: 0, y: 0.5, w: 0.5, h: 0.5 },
            { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
          ]
        : [
            { x: 0, y: 0, w: 0.5, h: 1 },
            { x: 0.5, y: 0, w: 0.5, h: 0.52 },
            { x: 0.5, y: 0.52, w: 0.5, h: 0.48 },
          ];
    case 'collage':
    default:
      return [
        { x: 0, y: 0, w: 0.52, h: 0.58 },
        { x: 0.52, y: 0, w: 0.48, h: 0.34 },
        { x: 0.52, y: 0.34, w: 0.48, h: 0.24 },
        { x: 0, y: 0.58, w: 0.34, h: 0.42 },
        { x: 0.34, y: 0.58, w: 0.33, h: 0.42 },
        { x: 0.67, y: 0.58, w: 0.33, h: 0.42 },
      ];
  }
}

// --- colour grades -----------------------------------------------------------

// Each grade is a chain of canvas filters plus overlay passes. Filters are applied to the
// photo draw only; overlays (sky gradients, glows, vignette) are painted over the whole poster.
const GRADE_FILTERS = {
  vice: 'saturate(1.5) contrast(1.1) brightness(1.02) sepia(0.3) hue-rotate(-10deg)',
  neon: 'saturate(1.5) contrast(1.15) brightness(0.98) hue-rotate(-12deg)',
  golden: 'saturate(1.25) contrast(1.05) brightness(1.08) sepia(0.35)',
  noir: 'grayscale(1) contrast(1.35) brightness(1.02)',
  none: 'none',
};

function paintOverlays(ctx, w, h, grade) {
  if (grade === 'vice') {
    // A full-height sunset wash: hot orange at the top through pink to a deep violet at the
    // foot, strong enough that the sunset cast reads at thumbnail size.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, 'rgba(255, 96, 43, 0.46)');
    sky.addColorStop(0.38, 'rgba(255, 45, 120, 0.32)');
    sky.addColorStop(0.72, 'rgba(140, 30, 110, 0.20)');
    sky.addColorStop(1, 'rgba(52, 8, 74, 0.38)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    const glow = ctx.createLinearGradient(0, 0, w, h);
    glow.addColorStop(0, 'rgba(0, 229, 255, 0.20)');
    glow.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    glow.addColorStop(1, 'rgba(255, 0, 128, 0.24)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'golden') {
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.32, h * 0.05, w * 0.5, h * 0.4, h * 0.95);
    glow.addColorStop(0, 'rgba(255, 190, 80, 0.30)');
    glow.addColorStop(1, 'rgba(120, 50, 0, 0.18)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'noir') {
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
  if (grade !== 'none') {
    // Vignette: darken the corners so the lettering and panels sit in a frame of shadow.
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

// --- drawing -----------------------------------------------------------------

/** Draws one photo cover-fitted into rect (x, y, w, h px), honouring pan and zoom. */
function drawPanelPhoto(ctx, photo, x, y, w, h, panel) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, dw - w);
  const maxY = Math.max(0, dh - h);
  const dx = x - maxX * (panel.panX ?? 0.5);
  const dy = y - maxY * (panel.panY ?? 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** A five-point star path centred on (cx, cy) with outer radius r. Original motif. */
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawLettering(ctx, w, h, state) {
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const atBottom = state.titlePos !== 'top';
  const margin = w * 0.055;
  const maxW = w - margin * 2;

  // A soft scrim behind the words keeps them readable over busy photos.
  const scrimH = h * (subtitle ? 0.30 : 0.22);
  const scrim = atBottom
    ? ctx.createLinearGradient(0, h - scrimH, 0, h)
    : ctx.createLinearGradient(0, 0, 0, scrimH);
  // Dark against the edge the words sit on, fading to nothing.
  scrim.addColorStop(atBottom ? 0 : 1, 'rgba(5, 2, 12, 0)');
  scrim.addColorStop(atBottom ? 1 : 0, 'rgba(5, 2, 12, 0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, atBottom ? h - scrimH : 0, w, scrimH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const lines = title.toUpperCase().split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2);
  let size = h * 0.115 * (0.55 + (state.titleSize ?? 0.6) * 0.9);
  const setFont = () => { ctx.font = `${size}px ${DISPLAY_FONT}`; };
  setFont();
  for (const line of lines) {
    while (ctx.measureText(line).width > maxW && size > 10) { size *= 0.94; setFont(); }
  }
  const lineH = size * 1.04;
  const subSize = size * 0.34;
  const blockH = lines.length * lineH + (subtitle ? subSize * 1.9 : 0);
  let baseline = atBottom ? h - margin * 0.8 - blockH + lineH : margin * 0.8 + lineH;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.06;
  ctx.lineJoin = 'round';
  for (const line of lines) {
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.92)';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(line, w / 2, baseline);
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(line, w / 2, baseline);
    baseline += lineH;
  }
  if (subtitle) {
    baseline += subSize * 0.55;
    ctx.font = `${subSize}px ${DISPLAY_FONT}`;
    ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`;
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
    ctx.lineWidth = subSize * 0.18;
    const sub = subtitle.toUpperCase();
    ctx.strokeText(sub, w / 2, baseline);
    ctx.fillStyle = '#ffd9ec';
    ctx.fillText(sub, w / 2, baseline);
    ctx.letterSpacing = '0px';
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Renders the whole cover described by `state` onto the canvas at its own pixel size.
 * `selected` (a panel index, or -1) draws a highlight ring used by the editor only.
 */
export function drawCover(canvas, state, selected = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#17101f';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, h > w);
  const filter = GRADE_FILTERS[state.grade] ?? 'none';
  ctx.save();
  ctx.filter = filter;
  rects.forEach((r, i) => {
    const panel = state.panels[i];
    const x = r.x * w;
    const y = r.y * h;
    const pw = r.w * w;
    const ph = r.h * h;
    if (panel && panel.photo) {
      drawPanelPhoto(ctx, panel.photo, x, y, pw, ph, panel);
    } else {
      const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
      g.addColorStop(0, '#3a2350');
      g.addColorStop(1, '#1c1030');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, pw, ph);
    }
  });
  ctx.restore();

  paintOverlays(ctx, w, h, state.grade);

  // White keylines between panels, plus an outer frame — the classic collage look.
  const key = Math.max(2, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = key;
  for (const r of rects) {
    ctx.strokeRect(r.x * w + key / 2, r.y * h + key / 2, r.w * w - key, r.h * h - key);
  }
  ctx.lineWidth = key * 1.6;
  ctx.strokeRect(key * 0.8, key * 0.8, w - key * 1.6, h - key * 1.6);

  if (state.star) {
    const r = Math.min(w, h) * 0.055;
    // By default the star takes the top corner away from the lettering; a scene can pin it
    // to another corner with state.starCorner when it knows where the sky or sea is.
    const corner = state.starCorner ?? (state.titlePos === 'top' ? 'br' : 'tr');
    const cx = corner[1] === 'l' ? r + w * 0.035 : w - r - w * 0.035;
    const cy = corner[0] === 't' ? r + h * 0.035 : h - r - h * 0.035;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = r * 0.35;
    starPath(ctx, cx, cy, r);
    ctx.fillStyle = '#ffb52e';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
    ctx.stroke();
    ctx.restore();
  }

  drawLettering(ctx, w, h, state);

  if (selected >= 0 && rects[selected]) {
    const r = rects[selected];
    ctx.strokeStyle = '#ffb52e';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(r.x * w + 6, r.y * h + 6, r.w * w - 12, r.h * h - 12);
    ctx.setLineDash([]);
  }
}
