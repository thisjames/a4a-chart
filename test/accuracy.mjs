// Accuracy harness: compares the in-browser engine (WASM) against published reference charts.
// Run: node test/accuracy.mjs > test/results.json
import SwissEph from '../lib/src/swisseph.js';
import { computeChart, norm, SIGNS } from '../chart-core.js';

const P = (deg, min, sign) => SIGNS.indexOf(sign) * 30 + deg + min / 60;

// Reference positions as published on Astrotheme (Placidus, true node). Birth data AA-rated
// from birth records (Kahlo, Picasso); Bowie from memory/autobiography per Astrotheme.
export const REFS = [
  {
    id: 'kahlo', name: 'Frida Kahlo', source: 'https://www.astrotheme.com/astrology/Frida_Kahlo',
    input: { year: 1907, month: 7, day: 6, hour: 8, minute: 30, place: 'Coyoacán, Mexico', lat: 19 + 21 / 60, lon: -(99 + 10 / 60), tz: 'America/Mexico_City' },
    ref: { sun: P(13, 23, 'Cancer'), moon: P(29, 43, 'Taurus'), mercury: P(6, 20, 'Leo'), venus: P(24, 20, 'Gemini'), mars: P(13, 24, 'Capricorn'),
      jupiter: P(20, 26, 'Cancer'), saturn: P(27, 27, 'Pisces'), uranus: P(10, 37, 'Capricorn'), neptune: P(12, 24, 'Cancer'), pluto: P(23, 45, 'Gemini'),
      node: P(23, 25, 'Cancer'), asc: P(23, 36, 'Leo'), mc: P(23, 25, 'Taurus') },
  },
  {
    id: 'bowie', name: 'David Bowie', source: 'https://www.astrotheme.com/astrology/David_Bowie',
    input: { year: 1947, month: 1, day: 8, hour: 9, minute: 0, place: 'Brixton, London', lat: 51 + 28 / 60, lon: -(7 / 60), tz: 'Europe/London' },
    ref: { sun: P(17, 15, 'Capricorn'), moon: P(3, 50, 'Leo'), mercury: P(8, 11, 'Capricorn'), venus: P(2, 9, 'Sagittarius'), mars: P(16, 44, 'Capricorn'),
      jupiter: P(21, 37, 'Scorpio'), saturn: P(6, 52, 'Leo'), uranus: P(18, 41, 'Gemini'), neptune: P(10, 48, 'Libra'), pluto: P(12, 45, 'Leo'),
      node: P(11, 18, 'Gemini'), asc: P(3, 25, 'Aquarius'), mc: P(3, 58, 'Sagittarius') },
  },
  {
    id: 'picasso', name: 'Pablo Picasso', source: 'https://www.astrotheme.com/Focus-Astro-celebrity-Pablo-Picasso.php',
    input: { year: 1881, month: 10, day: 25, hour: 23, minute: 15, place: 'Málaga, Spain', lat: 36 + 43 / 60, lon: -(4 + 25 / 60), tz: 'Europe/Madrid' },
    ref: { sun: P(2, 43, 'Scorpio'), moon: P(8, 13, 'Sagittarius'), mercury: P(24, 15, 'Scorpio'), venus: P(4, 32, 'Libra'), mars: P(12, 21, 'Cancer'),
      jupiter: P(23, 34, 'Taurus'), saturn: P(9, 27, 'Taurus'), uranus: P(17, 2, 'Virgo'), neptune: P(15, 31, 'Taurus'), pluto: P(28, 47, 'Taurus'),
      node: P(9, 24, 'Sagittarius'), asc: P(5, 42, 'Leo'), mc: P(25, 10, 'Aries') },
  },
];

const swe = new SwissEph();
await swe.initSwissEph();
const diffMin = (a, b) => Math.abs(((a - b + 540) % 360) - 180) * 60; // arcminutes

const out = [];
for (const r of REFS) {
  const ch = computeChart(swe, r.input, { houseSystem: 'P', nodeType: 'true' });
  const ours = Object.fromEntries(ch.points.map(p => [p.key, p.lon]));
  ours.asc = ch.houses.asc; ours.mc = ch.houses.mc;
  const rows = Object.entries(r.ref).map(([k, v]) => ({ key: k, ref: v, ours: norm(ours[k]), diff: diffMin(ours[k], v) }));
  out.push({ id: r.id, name: r.name, source: r.source, place: r.input.place, offset: ch.conv.offsetSeconds, offsetSource: ch.conv.source,
    jd: ch.jd, maxDiff: Math.max(...rows.map(x => x.diff)), rows });
}
console.log(JSON.stringify(out, null, 1));
