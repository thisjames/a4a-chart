// Cross-check: the browser (WASM) build must match the native C library to rounding.
import SwissEph from '../lib/src/swisseph.js';
const swe = new SwissEph(); await swe.initSwissEph();
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rows = [];
for (let i = 0; i < 300; i++) {
  const jd = 2415020.5 + rnd() * 47500; // 1900 - 2030
  const lat = -60 + rnd() * 120, lon = -180 + rnd() * 360;
  const pl = [0,1,2,3,4,5,6,7,8,9,11,15].map(b => swe.calc_ut(jd, b, 2 | 256)[0]);
  const h = swe.houses(jd, lat, lon, 'P');
  rows.push({ jd, lat, lon, pl, asc: h.ascmc[0], mc: h.ascmc[1] });
}
console.log(JSON.stringify(rows));
