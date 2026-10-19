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

## Page addresses

- `index.html` shows the full prototype with its notes.
- `index.html?embed=1` hides the prototype notes, for embedding on the website. Add `&header=0` to hide the header too.
- `index.html?embed=1&mode=free` fixes the free version.
- `index.html?embed=1&mode=member` fixes the member version.

## Running the checks

```
node test/accuracy.mjs
node test/timezones.mjs
node test/lunations.mjs
```

## Licence

This project uses the Swiss Ephemeris under the GNU Affero General Public License v3 (AGPL-3.0), so the whole project is released under the AGPL-3.0. Swiss Ephemeris is by Astrodienst AG (Dieter Koch and Alois Treindl). The WebAssembly build is swisseph-wasm by prolaxu (GPL-3.0-or-later). The 1790 Royal Printing typeface (in `fonts/` and embedded in `index.html`), the AfA sigil and the Astrology for Artists logotype belong to Astrology for Artists and are not covered by the AGPL. Crimson Pro is under the SIL Open Font License.
