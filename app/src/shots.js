// Fixed scenes for screenshots, driven by the ?shot= query. Deterministic: the sample photo,
// layout, grade, caption and export ratio all come from the query string, and
// window.__shotReady is set only after the display font and the photo have loaded and a
// frame has actually been painted.
//
//   ?shot=cover   renders ONLY the exported cover, full-bleed, at the export size ratio.
//   ?shot=editor  renders the editor with a sample photo loaded into every panel and the
//                 caption typed, exactly as a user would see it mid-edit.
//
// Query params: photo (samples/<photo>.jpg), caption, subtitle, layout, grade,
// size (e.g. 1920x1080), titlepos (top|bottom), scene (a key into SCENES below).
import { panelCount } from './cover.js';

function setReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

// Per-panel art direction for the named scenes. Each panel names its OWN sample photo and
// crop, so a collage mixes both photos with deliberate framing — a face panel, a wide scenic
// panel, a detail panel — instead of every panel showing the same photo at a default crop
// (which produced accidental chin and torso panels). The numbers were picked against the
// actual sample photos: in pier.jpg the fisherman's face sits around (0.31, 0.22) with the
// rod and reel on the right; in boulevard.jpg her face is around (0.50, 0.20), the sunset
// and lifeguard tower on the left, the red car along the bottom. `starCorner` pins the star
// motif to a corner the scene knows is sky or sea, never a face; null keeps the default
// corner (the top one away from the lettering).
const SCENES = {
  // The cover: Collage Grid at 1920x1080, Vice Sunset. Boulevard carries the hero panel,
  // pier supports with the sea, a reel close-up and the fisherman's face.
  'cover-main': {
    starCorner: null,
    panels: [
      { photo: 'boulevard', panX: 0.5, panY: 0.12, zoom: 1.15 }, // hero: her portrait + sunset
      { photo: 'pier', panX: 1, panY: 0.45, zoom: 2.4 }, // wide strip: open sea + rod
      { photo: 'pier', panX: 1, panY: 0.7, zoom: 2.6 }, // thin strip: reel close-up
      { photo: 'boulevard', panX: 0, panY: 0.87, zoom: 1.3 }, // detail: arm resting on the car
      { photo: 'pier', panX: 0, panY: 0.02, zoom: 1.5 }, // face: the fisherman, sea beside him
      { photo: 'boulevard', panX: 0.63, panY: 1, zoom: 1.6 }, // detail: belt, jeans, hand in pocket
    ],
  },
  // The editor mid-edit: the same mixed, well-framed collage, recomposed for the square
  // canvas the editor works on.
  'editor-main': {
    starCorner: null,
    panels: [
      { photo: 'boulevard', panX: 0.5, panY: 0, zoom: 1.1 }, // hero: her portrait, head to belt
      { photo: 'pier', panX: 0.34, panY: 0.3, zoom: 1.15 }, // wide: fisherman + rod + sea, star over the water
      { photo: 'pier', panX: 1, panY: 0.73, zoom: 2.4 }, // strip: reel close-up
      { photo: 'boulevard', panX: 0, panY: 1, zoom: 1.6 }, // detail: arm + mirror + car door
      { photo: 'pier', panX: 0, panY: 0.1, zoom: 1.45 }, // face: the fisherman
      { photo: 'boulevard', panX: 0.61, panY: 1, zoom: 1.8 }, // detail: belt + jeans
    ],
  },
  // Neon Tide: Hero + Strips at 1080x1350, all boulevard. The star moves to the top-left,
  // over the hero panel's palms and sky — at the default top-right it landed on her face
  // in the top strip.
  'cover-neon': {
    starCorner: 'tl',
    panels: [
      { photo: 'boulevard', panX: 0.44, panY: 0.08, zoom: 1.05 }, // hero: full portrait
      { photo: 'boulevard', panX: 0, panY: 0.05, zoom: 2.6 }, // strip: sunset + lifeguard tower
      { photo: 'boulevard', panX: 0.5, panY: 0, zoom: 2.2 }, // strip: her face, deliberate close-up
      { photo: 'boulevard', panX: 0.02, panY: 0.89, zoom: 2 }, // strip: hand + mirror + car door
    ],
  },
  // Golden Hour: Duo / Trio at 1080x1080, all pier — face, full portrait and the rod hand.
  'cover-golden': {
    starCorner: null,
    panels: [
      { photo: 'pier', panX: 0.35, panY: 0.09, zoom: 1.08 }, // tall portrait: face + sea + rod tip
      { photo: 'pier', panX: 0.25, panY: 0.05, zoom: 1.3 }, // face close-up, star over the sky beside his hat
      { photo: 'pier', panX: 1, panY: 0.89, zoom: 2.2 }, // detail: hand on the rod, reel, railing
    ],
  },
};

/**
 * Sets up a shot scene on the editor `api` (see main.js): loads the sample photos, fills the
 * panels (per-panel art direction when the query names a scene in SCENES), applies
 * layout/grade/captions, then flags readiness.
 */
export async function runShot(api, shot, query) {
  const photoName = query.get('photo') ?? 'pier';
  const layout = query.get('layout') ?? 'collage';
  const grade = query.get('grade') ?? 'vice';
  const size = query.get('size') ?? '1080x1080';
  const [sw, sh] = size.split('x').map(Number);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    if (sw > 0 && sh > 0) {
      api.canvas.width = sw;
      api.canvas.height = sh;
    }
  }

  const img = await api.loadSample(photoName);
  await api.ready();

  api.setExportSize(size);
  api.setLayout(layout);
  api.setGrade(grade);
  api.setTitle(query.get('caption') ?? 'Sunset Heist');
  api.setSubtitle(query.get('subtitle') ?? '');
  api.setTitlePos(query.get('titlepos') ?? 'bottom');

  const scene = SCENES[query.get('scene') ?? ''];
  const n = panelCount(layout);
  if (scene) {
    if (scene.star === false) api.setStar(false);
    if (scene.starCorner) api.setStarCorner(scene.starCorner);
    const cache = new Map([[photoName, img]]);
    for (let i = 0; i < Math.min(n, scene.panels.length); i++) {
      const spec = scene.panels[i];
      if (!cache.has(spec.photo)) cache.set(spec.photo, await api.loadSample(spec.photo));
      api.assignPhoto(i, cache.get(spec.photo));
      Object.assign(api.state.panels[i], { panX: spec.panX, panY: spec.panY, zoom: spec.zoom });
    }
  } else {
    // No named scene: fill every panel with the one sample photo, each with its own crop,
    // so the collage still reads as a set of distinct shots. Fixed numbers: deterministic.
    const crops = [
      { panX: 0.5, panY: 0.38, zoom: 1 },
      { panX: 0.22, panY: 0.2, zoom: 1.7 },
      { panX: 0.78, panY: 0.3, zoom: 1.8 },
      { panX: 0.3, panY: 0.85, zoom: 1.6 },
      { panX: 0.62, panY: 0.7, zoom: 1.9 },
      { panX: 0.45, panY: 0.55, zoom: 2.2 },
    ];
    for (let i = 0; i < n; i++) {
      api.assignPhoto(i, img);
      Object.assign(api.state.panels[i], crops[i % crops.length]);
    }
  }
  api.selectPanel(0);
  api.redraw();
  setReady();
}
