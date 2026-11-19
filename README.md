[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/sidodadi-dev/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/sidodadi-dev/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Panels — a GTA-style cover art maker

My entry to the make.fun bounty **Make GTA 6 Cover Art**:
https://make.fun/bounty/gta6-cover-art-01

Vice Panels turns your own photos into a video-game cover in the classic collage style:
a grid of photo panels with white keylines, a strong colour grade, and big outlined
lettering across the foot (or the top) of the poster. It is a plain static web app —
no build step, no libraries, no network — that runs entirely in the browser, offline.

## What it does

- **Four multi-panel layouts** — Collage Grid (6 panels), Hero + Strips (a tall hero
  panel beside three strips), Duo / Trio Split (3 panels, stacking on portrait covers)
  and Single Hero.
- **Your photos, your crops** — add photos with the file picker or by drag & drop,
  click a panel to select it, click a photo to place it, drag on the cover to pan,
  and use the slider to zoom each panel independently.
- **Five colour grades** — Vice Sunset (warm orange/pink with a gradient sky and
  vignette), Neon Nights (teal/magenta), Golden Hour, Noir (high-contrast mono) and None.
- **Cover lettering** — a two-line bold title with a dark outline and drop shadow, an
  optional spaced subtitle, top or bottom position, size and colour controls, and an
  optional five-point star motif in the corner.
- **Full-size export** — one click renders the cover at the chosen size and downloads
  a PNG.

## Export sizes

- 1080 × 1080 (square)
- 1080 × 1350 (portrait)
- 1920 × 1080 (landscape)

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Then open the page, drop in photos, and export. To hand the entry in the way the
grader runs it:

```sh
node main.ts         # copies app/ + screenshots/ to /output and writes dossier.json
```

## Tips for a stronger cover

- Give the hero panel the sharpest, most expressive photo; the strips read as cutaways.
- Zoom side panels in on details — a hand, a wheel, a skyline — instead of repeating
  the same framing six times.
- Vice Sunset flatters daylight shots; Neon Nights rescues dull or overcast ones.
- Keep the title to two or three words per line: the lettering auto-shrinks to fit,
  but short titles stay huge.
- Export at 1080 × 1350 for feeds that crop square posts, and 1920 × 1080 when the
  cover doubles as a banner or thumbnail.

## Originality

The design, layouts, lettering and star motif are this app's own work — no game
logos, wordmarks, official artwork or game fonts are used. The caption typeface is
Liberation Sans Bold, a free font (SIL Open Font License 1.1) bundled under
`app/fonts/`. The two sample photos in `app/samples/` were made for make.fun with
an image model and are free to use.

## More

New to make.fun? Start with my getting-started guide and referral link:
https://make.fun/r/vy8jjegg
