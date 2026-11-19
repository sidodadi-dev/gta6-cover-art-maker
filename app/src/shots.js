// Fixed scenes for screenshots, driven by ?shot=<name>.
//
// Each scene loads the two bundled sample photos (made for make.fun with an image model and
// free to use), art-directs them panel by panel — its own photo, zoom and focal point per
// panel, mixing both samples across every cover — picks a grade and lettering, and sets
// window.__shotReady once the cover is painted and the lettering font has loaded.
//
//   ?shot=cover    the exported landscape cover (1920x1080), Vice Sunset, "SUNSET HEIST"
//   ?shot=editor   the editor itself, samples loaded, first panel selected
//   ?shot=portrait the exported portrait cover (1080x1350), Neon Nights, "NEON TIDE"
//   ?shot=square   the exported square cover (1080x1080), Golden Hour, "GOLDEN HOUR"

function slot(img, zoom, fx, fy) {
  return { img, zoom, fx, fy };
}

export async function runShot(name, query, kit) {
  const { state, canvas, loadImage } = kit;
  const boulevard = await loadImage('samples/boulevard.jpg');
  const pier = await loadImage('samples/pier.jpg');
  kit.addToTray(boulevard, 'Sample — Boulevard');
  kit.addToTray(pier, 'Sample — Pier');

  const setSize = (w, h) => {
    canvas.width = w;
    canvas.height = h;
  };

  if (name === 'cover') {
    document.body.classList.add('shot-cover');
    kit.setSelectionVisible(false);
    setSize(1920, 1080);
    state.layout = 'hero';
    state.grade = 'vice';
    state.title = 'SUNSET HEIST';
    state.subtitle = 'ONE LAST RIDE';
    state.captionPos = 'bottom';
    state.captionColor = '#ffffff';
    state.star = 'tl';
    state.panels[0] = slot(boulevard, 1.0, 0.55, 0.37); // hero: the driver, face high, car low
    state.panels[1] = slot(pier, 1.6, 0.37, 0.3); // strip: the fisherman, close
    state.panels[2] = slot(boulevard, 1.5, 0.42, 0.78); // strip: the red convertible band
    state.panels[3] = slot(pier, 2.1, 0.85, 0.5); // strip: turquoise sea and the rod, tight
  } else if (name === 'portrait') {
    document.body.classList.add('shot-cover');
    kit.setSelectionVisible(false);
    setSize(1080, 1350);
    state.layout = 'duo';
    state.grade = 'neon';
    state.title = 'NEON TIDE';
    state.subtitle = 'AFTER DARK';
    state.captionPos = 'bottom';
    state.captionColor = '#ffffff';
    state.star = 'bl';
    state.panels[0] = slot(boulevard, 1.05, 0.64, 0.29); // wide top: the driver over the bay
    state.panels[1] = slot(pier, 1.15, 0.37, 0.24); // the fisherman
    state.panels[2] = slot(boulevard, 1.45, 0.22, 0.6); // sunset and the car's nose
  } else if (name === 'square') {
    document.body.classList.add('shot-cover');
    kit.setSelectionVisible(false);
    setSize(1080, 1080);
    state.layout = 'grid6';
    state.grade = 'golden';
    state.title = 'GOLDEN HOUR';
    state.subtitle = 'ONE PERFECT EVENING';
    state.captionPos = 'bottom';
    state.captionColor = '#ffffff';
    state.star = 'br';
    state.panels[0] = slot(boulevard, 1.1, 0.64, 0.2); // the driver
    state.panels[1] = slot(pier, 1.25, 0.37, 0.24); // the fisherman
    state.panels[2] = slot(boulevard, 1.7, 0.18, 0.15); // palms and sunset
    state.panels[3] = slot(pier, 1.55, 0.88, 0.5); // sea and rod
    state.panels[4] = slot(boulevard, 1.35, 0.35, 0.8); // the red convertible
    state.panels[5] = slot(pier, 1.5, 0.1, 0.85); // the pier deck
  } else {
    // editor: the app as a user sees it, samples loaded, a panel selected and ringed.
    setSize(1080, 1080);
    state.layout = 'grid6';
    state.grade = 'vice';
    state.title = 'SUNSET HEIST';
    state.subtitle = 'ONE LAST RIDE';
    state.captionPos = 'bottom';
    state.captionColor = '#ffffff';
    state.star = 'tr';
    state.panels[0] = slot(boulevard, 1.1, 0.64, 0.2);
    state.panels[1] = slot(pier, 1.25, 0.37, 0.24);
    state.panels[2] = slot(boulevard, 1.7, 0.18, 0.15);
    state.panels[3] = slot(pier, 1.55, 0.88, 0.5);
    state.panels[4] = slot(boulevard, 1.35, 0.35, 0.8);
    state.panels[5] = slot(pier, 1.5, 0.1, 0.85);
    kit.select(0);
  }

  kit.syncControls();
  try {
    await document.fonts.load('700 100px "Vice Display"');
    await document.fonts.ready;
  } catch { /* the fallback stack still paints */ }
  kit.redraw();
  kit.fitCanvas();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
