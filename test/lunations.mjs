// Next lunations against the dates in the pre-launch plan (checked there against
// Cafe Astrology and CHANI's 2026 list). Times in UTC.
import SwissEph from '../lib/src/swisseph.js';
import { nextLunations, jdToDate, SIGNS } from '../chart-core.js';
const swe = new SwissEph(); await swe.initSwissEph();
const expected = [
  ['full', 'Taurus', '2026-10-26T04:11'], ['new', 'Scorpio', '2026-11-09T07:02'],
  ['full', 'Gemini', '2026-11-24T14:53'], ['new', 'Sagittarius', '2026-12-09T00:52'],
];
const got = nextLunations(swe, swe.julday(2026, 10, 19, 12), 4);
got.forEach((l, i) => {
  const t = jdToDate(l.jd).toISOString().slice(0, 16), [ty, sg, et] = expected[i];
  const mins = Math.abs(jdToDate(l.jd) - new Date(et + ':00Z')) / 60000;
  console.log(ty === l.type && sg === SIGNS[l.sign] && mins <= 1 ? 'PASS' : 'FAIL', l.type.padEnd(4), SIGNS[l.sign].padEnd(12), t, 'expected', et, `(${mins.toFixed(1)} min)`);
});
