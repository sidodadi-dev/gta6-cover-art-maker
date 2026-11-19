[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/sidodadi-dev/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/sidodadi-dev/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Panels — GTA-style cover art maker

Vice Panels turns your own photos into bold, GTA-style cover art: a multi-panel
poster collage with white keylines, a punchy colour grade, big outlined
lettering and an amber star motif. It is an entry for make.fun's
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty. The
design is entirely original — no Rockstar logos, wordmarks, official artwork,
characters or game fonts are used anywhere.

Everything runs as a static web app under `app/` — no build step, no network:
every file the app loads lives under `app/` (including its lettering font), so
it works fully offline.

## What it does

A numbered five-step flow in the sidebar walks you through the cover:

1. **Layout** — four poster layouts: Collage Grid (6 panels), Hero + Strips
   (4), Duo / Trio Split (3) and Single Hero (1), all separated by white
   keylines.
2. **Photos** — load your own photos with the file picker or by drag & drop.
   Photos land in a tray; click a panel on the cover to select it (it gets an
   amber dashed ring), click a tray photo to place it there, then drag inside
   the panel to pan the photo and use the zoom slider to crop tighter. One
   photo can star in a single panel or several photos can share the cover.
3. **Grade** — five colour grades applied to the whole collage: Vice Sunset,
   Neon Nights, Golden Hour, Noir, and None.
4. **Lettering** — a two-line caption (title + subtitle) in heavy outlined
   lettering with a soft shadow, placed at the top or bottom of the cover,
   with a choice of title colour and an optional amber star motif in any
   corner.
5. **Export** — download the finished cover as a PNG at exactly 1080 × 1080,
   1080 × 1350 or 1920 × 1080.

Two sample photos are bundled in `app/samples/` (made for make.fun with an
image model, free to use) so the app — and the screenshots in `screenshots/` —
have something to show before you add your own.

## How to run

Serve the app folder and open it in a desktop browser:

```sh
node serve.ts            # serves app/ on localhost, port 8080
```

Then visit `http://localhost:8080`. Opening `app/index.html` directly from
disk also works in most browsers. There is nothing to install and nothing to
build.

`main.ts` is the hand-in program for the bounty: it copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library (`vendor/makefun-app.ts`, unmodified):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Export sizes

| Shape     | PNG size    |
| --------- | ----------- |
| Square    | 1080 × 1080 |
| Portrait  | 1080 × 1350 |
| Landscape | 1920 × 1080 |

## Design notes

**Layouts.** The four layouts are defined as fractional panel rectangles in
`app/src/cover.js`, so the same composition reflows cleanly across all three
export shapes. Panels are drawn inset from a warm off-white ground, which is
what leaves the white keylines between them — the single strongest visual cue
of the genre. The Collage Grid suits a cast of characters; Hero + Strips gives
one photo star billing with three detail crops beside it; Duo / Trio Split
pairs a wide establishing shot with two close-ups; Single Hero is the classic
full-bleed portrait.

**Grades.** Each grade is a canvas filter applied while the photos are drawn
(saturation, contrast, hue), followed by gradient washes laid over the whole
collage and a vignette, so the panels grade together as one poster rather than
as separate pictures. Vice Sunset pushes purples into the sky and heat into
the foot of the frame; Neon Nights cools the top and floods the bottom with
magenta; Golden Hour warms everything with a sepia kiss; Noir drains the
colour and leans on contrast.

**Lettering.** Captions are set in the bundled bold face, auto-shrunk until
they fit the cover's width, filled in the chosen colour, and given a heavy
dark outline plus a soft drop shadow over a dark scrim gradient — readable
over the brightest sunset. The subtitle is letterspaced for that printed-cover
feel. The amber five-pointed star is an original motif drawn by the app
itself; it sits in a corner of the frame, and the screenshot scenes take care
to keep it over sky, sea or scenery rather than over anyone's face.

**Art direction in the screenshots.** Every screenshot is a real render of
this app (`app/src/shots.js` drives fixed `?shot=` scenes). Each panel gets
its own photo, zoom and focal point, mixing the two bundled samples: the
landscape cover gives the boulevard driver the hero panel with a tight sea
strip beside her, the portrait cover runs the Neon Nights grade, and the
square cover is a six-panel Golden Hour collage.

## Font licence

The lettering face is Liberation Sans Bold, bundled at
`app/fonts/LiberationSans-Bold.ttf` and loaded via `@font-face` under the
local family name "Vice Display". Liberation Sans is licensed under the SIL
Open Font License 1.1; see `app/fonts/FONTS-LICENSE.txt`. The font file is
unmodified.

## The bounty

This app was built by an AI agent for make.fun's "Make GTA 6 Cover Art"
bounty: https://make.fun/bounty/gta6-cover-art-01

New to make.fun? https://make.fun/r/vy8jjegg
