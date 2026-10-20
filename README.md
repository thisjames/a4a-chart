# Chart Studio (prototype)

A birth chart generator for Astrology for Artists and Becoming Cosmic. Everything is calculated in the visitor's browser, so the site is a folder of static files with no server.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page: form, wheel, tables, styles, fonts and logo |
| `chart-core.js` | Chart engine (time zones, positions, houses, aspects, lunations) and wheel drawing |
| `studio-export.js` | Print-ready PDF/PNG and introduction card |
| `fonts/`, `sigil.png`, `sigil-black.png` | Brand typefaces and the AfA sigil (licensed to Astrology for Artists, not covered by the AGPL) |
| `cities.json` | About 7,300 towns and cities with coordinates and time zones |
| `lib/` | Swiss Ephemeris compiled to WebAssembly (swisseph-wasm), with the ephemeris data |
| `test/` | Accuracy and time-zone checks (run with Node 18+) |
| `squarespace-snippets.html` | Code to paste into Squarespace code blocks |
| `src/page.src.html`, `src/logotype-paths.json` | The page's editable source, with placeholders for the font, logotype and accuracy table |
| `tools/build.py` | Builds `index.html` from `src/`: edit the source, then run `python3 tools/build.py` |

## Page addresses

- `explorer/` is the Chart Explorer (version 2), copied from the `v2` branch with `python3 tools/build-explorer.py explorer` (run on `v2`). It shares the engine, ephemeris, places, fonts and sigils with version 1.

- `index.html` shows the full prototype with its notes.
- `index.html?embed=1` hides the prototype notes, for embedding on the website. Add `&header=0` to hide the header too.
- `index.html?embed=1&mode=free` fixes the free version.
- `index.html?embed=1&mode=member` fixes the member version.

## Branches

- `main` is what GitHub Pages serves, so it is the live site on astrologyforartists.com.
- `v1` holds version 1 exactly as launched for testing (20 Oct 2026).
- Develop new versions on their own branch (for example `v2`) and merge into `main` only to go live.

## Running the checks

```
node test/accuracy.mjs
node test/timezones.mjs
node test/lunations.mjs
```

## Licence

This project uses the Swiss Ephemeris under the GNU Affero General Public License v3 (AGPL-3.0), so the whole project is released under the AGPL-3.0. Swiss Ephemeris is by Astrodienst AG (Dieter Koch and Alois Treindl). The WebAssembly build is swisseph-wasm by prolaxu (GPL-3.0-or-later). The 1790 Royal Printing typeface (in `fonts/` and embedded in `index.html`), the AfA sigil and the Astrology for Artists logotype belong to Astrology for Artists and are not covered by the AGPL. Crimson Pro is under the SIL Open Font License.
