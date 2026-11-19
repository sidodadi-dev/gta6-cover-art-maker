// Vice Panels — a GTA-style cover art maker, entered in make.fun's gta6-cover-art-01 bounty.
//
// The app is this directory's app/ folder: plain static files a desktop browser loads fully
// offline (app/index.html and its ES modules; no library, no build step, no network request —
// even the lettering font is bundled under app/fonts/, Liberation Sans Bold under the SIL Open
// Font License 1.1, drawn under the local name "Vice Display"). In the app a person loads their
// own photos, lays them across the panels of four poster layouts, crops each panel by dragging
// and zooming, applies one of five colour grades, letters a two-line caption, and exports a PNG
// at 1080 x 1080, 1080 x 1350 or 1920 x 1080. The design is original — multi-panel collage,
// white keylines, an amber star motif — and uses no Rockstar artwork, logos or fonts.
//
// This program is only the hand-in plumbing (Node 22, standard library only): it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library (vendor/makefun-app.ts, left
// byte-identical). The screenshots in screenshots/ are real renders of the app: the exported
// landscape cover first, then the editor with photos loaded, then the portrait and square
// covers, all art-directed from the two sample photos bundled in app/samples/ (made for
// make.fun with an image model and free to use).
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
