// Vice Panels editor: wires the page. Pick a layout, drop photos into the tray, click a panel
// to select it, assign a photo, drag on the canvas to pan it, pick a grade, type the lettering,
// choose an export size and download a full-size PNG. A ?shot= query sets up a fixed scene for
// screenshots instead (./shots.js).
import { drawCover, emptyPanel, panelCount, panelRects } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const stage = $('stage');
const tray = $('tray');
const status = $('status');

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  layout: 'collage',
  panels: [],
  grade: 'vice',
  title: 'Sunset Heist',
  subtitle: '',
  titlePos: 'bottom',
  titleSize: 0.6,
  titleColor: '#ffffff',
  star: true,
  starCorner: null,
};

let selected = 0;
let activePhoto = null; // the tray photo waiting to be assigned
const trayPhotos = []; // { img, url, el }

function syncPanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(emptyPanel());
  state.panels.length = n;
  if (selected >= n) selected = 0;
}

function redraw() {
  syncPanels();
  drawCover(canvas, state, document.body.classList.contains('shot-cover') ? -1 : selected);
}

function setCanvasSize(w, h) {
  canvas.width = w;
  canvas.height = h;
  fitStage();
}

function fitStage() {
  // Scale the (full-resolution) canvas to fit the stage box without distorting it.
  const box = stage.getBoundingClientRect();
  const scale = Math.min((box.width - 32) / canvas.width, (box.height - 32) / canvas.height);
  canvas.style.width = `${Math.max(120, Math.floor(canvas.width * scale))}px`;
  canvas.style.height = `${Math.max(120, Math.floor(canvas.height * scale))}px`;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Waits until the display font is usable by canvas, so lettering never falls back mid-shot. */
async function fontsReady() {
  try {
    const face = new FontFace('Vice Display', 'url(./fonts/LiberationSans-Bold.ttf)');
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
  } catch {
    // The @font-face rule in style.css is the fallback path; canvas uses it once loaded.
    try { await document.fonts.ready; } catch { /* draw anyway */ }
  }
}

// --- photo tray ---------------------------------------------------------------

function addToTray(img, url, name) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'thumb';
  el.title = name;
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.alt = name;
  el.appendChild(thumb);
  el.addEventListener('click', () => {
    activePhoto = img;
    for (const t of tray.querySelectorAll('.thumb')) t.classList.remove('active');
    el.classList.add('active');
    state.panels[selected].photo = img;
    status.textContent = `Photo placed in panel ${selected + 1}. Drag on the cover to pan it.`;
    redraw();
  });
  tray.appendChild(el);
  trayPhotos.push({ img, url, el });
  return el;
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const el = addToTray(img, url, file.name);
    if (!activePhoto) el.click();
  }
}

$('photo').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
for (const evt of ['dragover', 'dragenter']) {
  document.addEventListener(evt, (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
}
for (const evt of ['dragleave', 'drop']) {
  document.addEventListener(evt, (e) => { e.preventDefault(); document.body.classList.remove('dragging'); });
}
document.addEventListener('drop', (e) => { addFiles(e.dataTransfer.files); });

// --- canvas interaction: select + pan ----------------------------------------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const rects = panelRects(state.layout, canvas.height > canvas.width);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x * canvas.width && x <= (r.x + r.w) * canvas.width &&
        y >= r.y * canvas.height && y <= (r.y + r.h) * canvas.height) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(p.x, p.y);
  if (idx >= 0) selected = idx;
  const panel = state.panels[selected];
  drag = { x: p.x, y: p.y, panX: panel.panX, panY: panel.panY, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[selected];
  if (!panel.photo) return;
  const rects = panelRects(state.layout, canvas.height > canvas.width);
  const r = rects[selected];
  const pw = r.w * canvas.width;
  const ph = r.h * canvas.height;
  const img = panel.photo;
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * panel.zoom;
  const overflowX = Math.max(1, img.naturalWidth * scale - pw);
  const overflowY = Math.max(1, img.naturalHeight * scale - ph);
  panel.panX = Math.min(1, Math.max(0, drag.panX - (p.x - drag.x) / overflowX));
  panel.panY = Math.min(1, Math.max(0, drag.panY - (p.y - drag.y) / overflowY));
  drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- controls -----------------------------------------------------------------

$('layout').addEventListener('change', (e) => { state.layout = e.target.value; selected = 0; redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('caption').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titlepos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
$('titlesize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); redraw(); });
$('titlecolor').addEventListener('input', (e) => { state.titleColor = e.target.value; redraw(); });
$('zoom').addEventListener('input', (e) => { state.panels[selected].zoom = Number(e.target.value); redraw(); });
$('star').addEventListener('change', (e) => { state.star = e.target.checked; redraw(); });
$('size').addEventListener('change', (e) => {
  const [w, h] = SIZES[e.target.value];
  setCanvasSize(w, h);
  redraw();
});

$('export').addEventListener('click', () => {
  drawCover(canvas, state, -1); // export without the selection ring
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${canvas.width}x${canvas.height}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
    redraw();
  }, 'image/png');
});

window.addEventListener('resize', fitStage);

// --- boot / shot scenes --------------------------------------------------------

const api = {
  canvas,
  state,
  loadImage,
  loadSample: (name) => loadImage(`samples/${name}.jpg`),
  ready: fontsReady,
  redraw,
  selectPanel: (i) => { selected = i; },
  assignPhoto: (i, img) => { state.panels[i].photo = img; },
  setLayout: (v) => { state.layout = v; $('layout').value = v; syncPanels(); },
  setGrade: (v) => { state.grade = v; $('grade').value = v; },
  setTitle: (v) => { state.title = v; $('caption').value = v; },
  setSubtitle: (v) => { state.subtitle = v; $('subtitle').value = v; },
  setTitlePos: (v) => { state.titlePos = v; $('titlepos').value = v; },
  setStar: (v) => { state.star = v; $('star').checked = v; },
  setStarCorner: (v) => { state.starCorner = v; },
  setExportSize: (v) => {
    if (SIZES[v]) { $('size').value = v; setCanvasSize(...SIZES[v]); }
  },
};

(async () => {
  syncPanels();
  setCanvasSize(1080, 1080);
  await fontsReady();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(api, shot, query);
  } else {
    // Start with both free sample photos in the tray so the first cover is one click away.
    for (const name of ['pier', 'boulevard']) {
      const img = await loadImage(`samples/${name}.jpg`);
      addToTray(img, `samples/${name}.jpg`, `${name}.jpg (sample)`);
    }
    redraw();
  }
})();
