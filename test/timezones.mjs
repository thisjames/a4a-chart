// Historical time-zone cases with known answers.
import { localToUT, formatOffset } from '../chart-core.js';
const cases = [
  ['London, wartime double summer time', { year: 1941, month: 6, day: 1, hour: 12, minute: 0 }, 'Europe/London', -0.13, 7200],
  ['London, British Standard Time experiment', { year: 1969, month: 1, day: 15, hour: 12, minute: 0 }, 'Europe/London', -0.13, 3600],
  ['Rome, Italian summer time', { year: 1972, month: 7, day: 1, hour: 12, minute: 0 }, 'Europe/Rome', 12.5, 7200],
  ['New York, before standard time (LMT)', { year: 1880, month: 5, day: 1, hour: 12, minute: 0 }, 'America/New_York', -74.0, -17760],
  ['Paris, Paris Mean Time as legal time', { year: 1900, month: 5, day: 1, hour: 12, minute: 0 }, 'Europe/Paris', 2.35, 561],
  ['Kolkata, wartime +6:30', { year: 1943, month: 5, day: 1, hour: 12, minute: 0 }, 'Asia/Kolkata', 88.36, 23400],
  ['Madrid, UK-aligned until 1940', { year: 1935, month: 1, day: 1, hour: 12, minute: 0 }, 'Europe/Madrid', -3.7, 0],
];
for (const [label, t, tz, lon, expect] of cases) {
  const r = localToUT(t, tz, lon);
  console.log((r.offsetSeconds === expect ? 'PASS' : 'FAIL'), label.padEnd(44), formatOffset(r.offsetSeconds), r.source, r.note);
}
const gap = localToUT({ year: 2026, month: 3, day: 29, hour: 1, minute: 30 }, 'Europe/London', 0);
const amb = localToUT({ year: 2026, month: 10, day: 25, hour: 1, minute: 30 }, 'Europe/London', 0);
console.log(gap.note === 'nonexistent' ? 'PASS' : 'FAIL', 'Clocks-forward gap flagged'.padEnd(44), gap.note);
console.log(amb.note === 'ambiguous' ? 'PASS' : 'FAIL', 'Clocks-back hour flagged'.padEnd(44), amb.note);
