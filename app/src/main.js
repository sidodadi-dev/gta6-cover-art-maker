// Vice Panels — the editor.
//
// Owns the cover state and every control on the page: the five steps (Layout, Photos, Grade,
// Lettering, Export), the photo tray, click-to-select panels, drag-to-pan, the zoom slider,
// and PNG export at the three cover sizes. All drawing is delegated to the engine in
// ./cover.js. A `?shot=` query hands control to ./shots.js, which sets up a fixed scene for
// screenshots instead of the default first-run state.
import { CAPTION_COLORS, GRADES, LAYOUTS, clampSlot, drawCoverArt, emptySlot, innerRect } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const status = $('status');

/** Loads an image from a URL (object URL or same-folder path), resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const state = {
  layout: 'grid6',
  grade: 'vice',
  title: 'SUNSET HEIST',
  subtitle: 'ONE LAST RIDE',
  captionPos: 'bottom',
  captionColor: '#ffffff',
  star: 'tr',
  panels: Array.from({ length: 6 }, emptySlot),
};

let selected = 0;
let selectionVisible = true;
const tray = []; // { img, name }

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function redraw() {
  if (selected >= panelCount()) selected = 0;
  drawCoverArt(ctx, canvas.width, canvas.height, state, {
    selection: selectionVisible ? selected : -1,
  });
}

/** Fits the canvas element into the stage, keeping the cover's aspect ratio. */
function fitCanvas() {
  if (document.body.classList.contains('shot-cover')) {
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    return;
  }
  const stage = canvas.parentElement.getBoundingClientRect();
  const availW = Math.max(220, stage.width - 36);
  const availH = Math.max(220, stage.height - 64);
  const aspect = canvas.width / canvas.height;
  let w = availW;
  let h = w / aspect;
  if (h > availH) {
    h = availH;
    w = h * aspect;
  }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}

window.addEventListener('resize', fitCanvas);

/* ------------------------------------------------------------ controls */

function markSeg(container, value) {
  for (const btn of container.querySelectorAll('button')) {
    btn.classList.toggle('on', btn.dataset.value === value);
  }
}

function buildSeg(container, entries, onPick) {
  for (const [value, label] of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.value = value;
    btn.textContent = label;
    btn.addEventListener('click', () => onPick(value));
    container.appendChild(btn);
  }
}

const layoutSeg = $('layoutSeg');
buildSeg(layoutSeg, Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]), (v) => {
  state.layout = v;
  markSeg(layoutSeg, v);
  syncZoom();
  redraw();
});

const gradeSeg = $('gradeSeg');
buildSeg(gradeSeg, Object.entries(GRADES).map(([k, v]) => [k, v.label]), (v) => {
  state.grade = v;
  markSeg(gradeSeg, v);
  redraw();
});

const posSeg = $('posSeg');
buildSeg(posSeg, [['bottom', 'Caption at bottom'], ['top', 'Caption at top']], (v) => {
  state.captionPos = v;
  markSeg(posSeg, v);
  redraw();
});

const swatches = $('swatches');
for (const c of CAPTION_COLORS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = c.label;
  btn.dataset.value = c.value;
  btn.style.background = c.value;
  btn.addEventListener('click', () => {
    state.captionColor = c.value;
    markSwatches();
    redraw();
  });
  swatches.appendChild(btn);
}
function markSwatches() {
  for (const btn of swatches.querySelectorAll('button')) {
    btn.classList.toggle('on', btn.dataset.value === state.captionColor);
  }
}

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('starPos').addEventListener('change', (e) => { state.star = e.target.value; redraw(); });

const zoom = $('zoom');
function syncZoom() {
  const slot = state.panels[selected];
  zoom.value = slot ? String(slot.zoom || 1) : '1';
}
zoom.addEventListener('input', () => {
  const slot = state.panels[selected];
  if (!slot) return;
  slot.zoom = parseFloat(zoom.value);
  const r = innerRect(canvas.width, canvas.height, state.layout, selected);
  if (r && slot.img) clampSlot(slot, r, slot.img.naturalWidth, slot.img.naturalHeight);
  redraw();
});

$('clearPanel').addEventListener('click', () => {
  const slot = state.panels[selected];
  if (slot) slot.img = null;
  redraw();
});

/* ------------------------------------------------------------ photos */

function addToTray(img, name) {
  tray.push({ img, name });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = `${name} — place in the selected panel`;
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = name;
  btn.appendChild(thumb);
  btn.addEventListener('click', () => assignToPanel(img, selected));
  $('tray').appendChild(btn);
}

function assignToPanel(img, index) {
  const slot = state.panels[index];
  if (!slot) return;
  slot.img = img;
  slot.zoom = 1;
  slot.fx = 0.5;
  slot.fy = 0.5;
  selected = index;
  syncZoom();
  redraw();
}

async function addFiles(files, startPanel) {
  let target = startPanel;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    addToTray(img, file.name);
    if (target < panelCount()) {
      assignToPanel(img, target);
      target += 1;
    }
  }
  status.textContent = files.length ? 'Photo added — drag inside its panel to position it.' : '';
}

$('file').addEventListener('change', (e) => {
  addFiles([...e.target.files], selected);
  e.target.value = '';
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files], selected);
});

/* ------------------------------------------------------------ canvas interaction */

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitPanel(x, y) {
  for (let i = 0; i < panelCount(); i++) {
    const r = innerRect(canvas.width, canvas.height, state.layout, i);
    if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = hitPanel(p.x, p.y);
  if (hit === -1) return;
  selected = hit;
  syncZoom();
  const slot = state.panels[hit];
  if (slot?.img) {
    drag = { x: p.x, y: p.y, fx: slot.fx, fy: slot.fy };
    canvas.setPointerCapture(e.pointerId);
  }
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const slot = state.panels[selected];
  const r = innerRect(canvas.width, canvas.height, state.layout, selected);
  if (!slot?.img || !r) return;
  const p = canvasPoint(e);
  const scale = Math.max(r.w / slot.img.naturalWidth, r.h / slot.img.naturalHeight) * (slot.zoom || 1);
  slot.fx = drag.fx - (p.x - drag.x) / (slot.img.naturalWidth * scale);
  slot.fy = drag.fy - (p.y - drag.y) / (slot.img.naturalHeight * scale);
  clampSlot(slot, r, slot.img.naturalWidth, slot.img.naturalHeight);
  redraw();
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ------------------------------------------------------------ export */

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

$('size').addEventListener('change', (e) => {
  const [w, h] = EXPORT_SIZES[e.target.value] ?? EXPORT_SIZES['1080x1080'];
  canvas.width = w;
  canvas.height = h;
  fitCanvas();
  redraw();
});

$('export').addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  drawCoverArt(out.getContext('2d'), out.width, out.height, state, { selection: -1 });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${out.width}x${out.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved vice-panels-${out.width}x${out.height}.png`;
  }, 'image/png');
});

/* ------------------------------------------------------------ control sync (used by shots) */

function syncControls() {
  markSeg(layoutSeg, state.layout);
  markSeg(gradeSeg, state.grade);
  markSeg(posSeg, state.captionPos);
  markSwatches();
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('starPos').value = state.star;
  syncZoom();
}

/* ------------------------------------------------------------ startup */

async function initDefault() {
  syncControls();
  fitCanvas();
  redraw();
  try {
    const boulevard = await loadImage('samples/boulevard.jpg');
    addToTray(boulevard, 'Sample — Boulevard');
    const pier = await loadImage('samples/pier.jpg');
    addToTray(pier, 'Sample — Pier');
    state.panels[0].img = boulevard;
    state.panels[1].img = pier;
  } catch { /* samples are a convenience; the editor works without them */ }
  try { await document.fonts.load('700 80px "Vice Display"'); } catch { /* fallback fonts draw fine */ }
  redraw();
}

const kit = {
  state,
  canvas,
  loadImage,
  addToTray,
  assignToPanel,
  redraw,
  fitCanvas,
  syncControls,
  select(i) { selected = i; syncZoom(); },
  setSelectionVisible(v) { selectionVisible = v; },
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, kit);
} else {
  initDefault();
}
