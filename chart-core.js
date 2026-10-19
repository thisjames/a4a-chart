// A4A Chart Studio — chart engine and wheel renderer.
// Pure module: no DOM access, so the same code runs in the browser and in Node tests.
// Calculations: Swiss Ephemeris (AGPL) via swisseph-wasm. Licence: AGPL-3.0.

export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const ELEMENT = ['fire','earth','air','water'];

export const BODIES = [
  { key: 'sun', name: 'Sun', id: 0 },
  { key: 'moon', name: 'Moon', id: 1 },
  { key: 'mercury', name: 'Mercury', id: 2 },
  { key: 'venus', name: 'Venus', id: 3 },
  { key: 'mars', name: 'Mars', id: 4 },
  { key: 'jupiter', name: 'Jupiter', id: 5 },
  { key: 'saturn', name: 'Saturn', id: 6 },
  { key: 'uranus', name: 'Uranus', id: 7 },
  { key: 'neptune', name: 'Neptune', id: 8 },
  { key: 'pluto', name: 'Pluto', id: 9 },
  { key: 'node', name: 'North Node', id: 11 }, // 11 = true node, 10 = mean node
  { key: 'chiron', name: 'Chiron', id: 15 },
];

export const HOUSE_SYSTEMS = {
  P: 'Placidus', W: 'Whole sign', K: 'Koch', E: 'Equal', O: 'Porphyry', R: 'Regiomontanus',
};

export const ASPECTS = [
  { key: 'conjunction', name: 'Conjunction', angle: 0, orb: 8, tone: 'neutral' },
  { key: 'sextile', name: 'Sextile', angle: 60, orb: 4, tone: 'soft' },
  { key: 'square', name: 'Square', angle: 90, orb: 7, tone: 'hard' },
  { key: 'trine', name: 'Trine', angle: 120, orb: 7, tone: 'soft' },
  { key: 'opposition', name: 'Opposition', angle: 180, orb: 8, tone: 'hard' },
];

const SEFLG_SWIEPH = 2, SEFLG_SPEED = 256;

// ---------- time ----------

// Offset (seconds east of UTC) of an IANA zone at a given UTC instant, read from the
// platform's time zone database (Intl). Works to the second, so LMT eras show up.
function zoneOffsetAt(utcMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', era: 'short',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
  let year = +p.year; if (p.era && /^B/.test(p.era)) year = 1 - year;
  const asUTC = Date.UTC(year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const whole = Math.floor(utcMs / 1000) * 1000;
  return Math.round((asUTC - whole) / 1000);
}

// Places that used a city's mean time as national legal time (so the zone's odd offset is
// correct and must NOT be replaced by the birthplace's own LMT). Years are approximate
// eras from the IANA database notes; a production build would read exact transitions.
const LEGAL_MEAN_TIME = {
  'Europe/Paris': [1891, 1911], 'Europe/Amsterdam': [1835, 1940], 'Europe/Dublin': [1880, 1916],
  'Europe/Moscow': [1880, 1919], 'Europe/Helsinki': [1878, 1921], 'Europe/Warsaw': [1880, 1915],
  'Europe/Zurich': [1853, 1894], 'Europe/Brussels': [1880, 1892], 'Europe/Istanbul': [1880, 1910],
  'Asia/Kolkata': [1854, 1941], 'Africa/Monrovia': [1882, 1972],
};

// Convert a local civil birth time to UT.
// Rule: use the IANA zone's offset; if that offset is a local mean time (not a whole
// number of 15 minutes, i.e. the zone had no standard time yet), replace it with the
// birthplace's own LMT from its longitude, as astrologers' atlases do.
// lmtRounding: 'minute' rounds the LMT offset to whole minutes (this reproduces the published
// reference charts exactly); 'exact' keeps it to the second.
export function localToUT({ year, month, day, hour, minute }, tz, lon, lmtRounding = 'minute') {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = naive;
  let off = 0;
  for (let i = 0; i < 3; i++) { off = zoneOffsetAt(guess, tz); guess = naive - off * 1000; }
  // detect DST gaps / overlaps
  const offBefore = zoneOffsetAt(guess - 3 * 3600e3, tz);
  const offAfter = zoneOffsetAt(guess + 3 * 3600e3, tz);
  let note = '';
  if (offBefore !== offAfter) {
    const back = naive - offBefore * 1000, fwd = naive - offAfter * 1000;
    const okBack = zoneOffsetAt(back, tz) === offBefore, okFwd = zoneOffsetAt(fwd, tz) === offAfter;
    if (okBack && okFwd && back !== fwd) note = 'ambiguous'; // clocks went back: time happened twice
    if (!okBack && !okFwd) note = 'nonexistent'; // clocks went forward: time never happened
  }
  let source = 'zone';
  const legal = LEGAL_MEAN_TIME[tz];
  if (off % 900 !== 0 && legal && year >= legal[0] && year <= legal[1]) source = 'legal-mean';
  else if (off % 900 !== 0) {
    off = Math.round(lon * 240); // LMT: 4 minutes of time per degree of longitude
    if (lmtRounding === 'minute') off = Math.round(off / 60) * 60;
    guess = naive - off * 1000;
    source = 'lmt';
  }
  const d = new Date(guess);
  return {
    utc: d, offsetSeconds: off, source, note,
    ut: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
          hour: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 },
  };
}

export function formatOffset(sec) {
  const s = sec < 0 ? '−' : '+'; const a = Math.abs(sec);
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), ss = a % 60;
  return `UT${s}${h}:${String(m).padStart(2, '0')}${ss ? ':' + String(ss).padStart(2, '0') : ''}`;
}

// ---------- chart ----------

export function norm(x) { return ((x % 360) + 360) % 360; }
export function signOf(lon) { return Math.floor(norm(lon) / 30); }
// Rounded to the nearest minute of arc, carrying into the next sign when needed.
export function degInSign(lon) {
  const tot = Math.round(norm(lon) * 60) % 21600; const inSign = tot % 1800;
  return { deg: Math.floor(inSign / 60), min: inSign % 60, sign: Math.floor(tot / 1800) };
}
export function fmtPos(lon) { const { deg, min, sign } = degInSign(lon); return `${deg}°${String(min).padStart(2, '0')}′ ${SIGNS[sign]}`; }

export function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const span = norm(b - a), off = norm(lon - a);
    if (off < span) return i + 1;
  }
  return 12;
}

export function computeChart(swe, input, opts = {}) {
  const { houseSystem = 'P', nodeType = 'true', timeKnown = true, lmtRounding = 'minute' } = opts;
  const t = timeKnown ? input : { ...input, hour: 12, minute: 0 };
  const conv = localToUT(t, input.tz, input.lon, lmtRounding);
  const jd = swe.julday(conv.ut.year, conv.ut.month, conv.ut.day, conv.ut.hour);
  const points = [];
  for (const b of BODIES) {
    const id = b.key === 'node' ? (nodeType === 'mean' ? 10 : 11) : b.id;
    const r = swe.calc_ut(jd, id, SEFLG_SWIEPH | SEFLG_SPEED);
    points.push({ ...b, lon: r[0], lat: r[1], speed: r[3], retro: r[3] < 0 && b.key !== 'node' });
  }
  let houses = null;
  if (timeKnown) {
    const hs = Math.abs(input.lat) > 66 && (houseSystem === 'P' || houseSystem === 'K') ? 'O' : houseSystem;
    const h = swe.houses(jd, input.lat, input.lon, hs);
    const cusps = Array.from(h.cusps).slice(1, 13);
    houses = { system: hs, requested: houseSystem, cusps, asc: h.ascmc[0], mc: h.ascmc[1] };
    for (const p of points) p.house = houseOf(p.lon, cusps);
  }
  const aspects = findAspects(points);
  return { input, opts: { houseSystem, nodeType, timeKnown }, conv, jd, points, houses, aspects };
}

export function findAspects(points, others = null) {
  const out = [];
  const A = points, B = others || points;
  for (let i = 0; i < A.length; i++) {
    for (let j = others ? 0 : i + 1; j < B.length; j++) {
      const p = A[i], q = B[j];
      if (!others && ((p.key === 'node' && q.key === 'chiron') || (p.key === 'chiron' && q.key === 'node'))) continue;
      const sep = Math.abs(((p.lon - q.lon + 540) % 360) - 180);
      for (const a of ASPECTS) {
        let orb = a.orb;
        if (['node', 'chiron'].includes(p.key) || ['node', 'chiron'].includes(q.key)) orb = Math.min(orb, 3);
        if (others) orb = Math.min(orb, 2);
        const d = Math.abs(sep - a.angle);
        if (d <= orb) { out.push({ a: p, b: q, type: a, orb: d }); break; }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// ---------- glyphs (drawn for A4A, on a 20 x 20 grid centred on 0,0) ----------
// Stroke-only paths so line weight is controlled by the stylesheet.

const C = (cx, cy, r) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;

export const GLYPHS = {
  sun: C(0, 0, 7.5) + ' ' + C(0, 0, 1),
  moon: 'M3,-8.5 A8.5,8.5 0 1,0 3,8.5 A7,7.6 0 1,1 3,-8.5 Z',
  mercury: C(0, -1, 4) + ' M0,3 L0,9.5 M-3,6.5 L3,6.5 M-4.5,-9.5 A4.5,4 0 0,0 4.5,-9.5',
  venus: C(0, -3.5, 5) + ' M0,1.5 L0,9.5 M-3.5,5.8 L3.5,5.8',
  mars: C(-2.5, 2.5, 5.2) + ' M1.2,-1.2 L7.5,-7.5 M2.5,-7.5 L7.5,-7.5 L7.5,-2.5',
  jupiter: 'M-6.5,-5.5 C-5.5,-9.5 0,-9.5 -0.5,-5 C-1,-1 -5,1.5 -7,3.5 L7.5,3.5 M3.5,-9 L3.5,9.5',
  saturn: 'M-4,-9.5 L-4,4 M-7,-6.5 L-1,-6.5 M-4,-0.5 C-2,-4.5 4,-4.5 4,0 C4,3.5 0.5,4.5 0.5,7 C0.5,9 3,9.5 4.5,8',
  uranus: 'M-6,-8.5 L-6,1 M6,-8.5 L6,1 M-6,-3.8 L6,-3.8 M0,-9 L0,3.3 ' + C(0, 6, 2.6),
  neptune: 'M-6.5,-8 C-6.5,-1.5 -3.5,0.5 0,0.5 C3.5,0.5 6.5,-1.5 6.5,-8 M0,-9.5 L0,9.5 M-3.5,5.5 L3.5,5.5 M-8,-6 L-6.5,-8.5 L-5,-6 M5,-6 L6.5,-8.5 L8,-6 M-1.5,-7.5 L0,-9.8 L1.5,-7.5',
  pluto: C(0, -6.2, 2.6) + ' M-6,-7.5 A6,6 0 0,0 6,-7.5 M0,-1.5 L0,9.5 M-3.5,5.5 L3.5,5.5',
  chiron: C(0, 5.5, 3.3) + ' M0,2.2 L0,-9.5 M0,-4 L5,-9 M0,-4 L5,1',
  node: 'M-4,4 C-9.5,-1.5 -7,-9 0,-9 C7,-9 9.5,-1.5 4,4 ' + C(-4, 6.2, 2.2) + ' ' + C(4, 6.2, 2.2),
  // signs
  Aries: 'M0,9 L0,-1.5 M0,-1.5 C-0.5,-9.5 -9,-10.5 -8.5,-3.5 M0,-1.5 C0.5,-9.5 9,-10.5 8.5,-3.5',
  Taurus: C(0, 3, 5.2) + ' M-8.5,-8.5 C-7,-3.5 -4,-2.2 0,-2.2 C4,-2.2 7,-3.5 8.5,-8.5',
  Gemini: 'M-7,-8 Q0,-5.5 7,-8 M-7,8 Q0,5.5 7,8 M-3.2,-6.6 L-3.2,6.6 M3.2,-6.6 L3.2,6.6',
  Cancer: C(-4.5, -2.8, 2.6) + ' M-4.5,-5.4 C1,-9.5 8.5,-7 8.5,-2.5 ' + C(4.5, 2.8, 2.6) + ' M4.5,5.4 C-1,9.5 -8.5,7 -8.5,2.5',
  Leo: C(-4.5, 3, 3.2) + ' M-1.6,1.8 C-2.5,-5.5 1.5,-9 4.5,-8.5 C8.5,-8 8.5,-3 6.5,0 C4.5,3 3.5,5 4.5,7.5 C5.5,9.5 8,9 8.5,7.5',
  Virgo: 'M-8.5,-6 L-8.5,7 M-8.5,-3.5 C-7.5,-7.5 -3.5,-7.5 -3.5,-3.5 L-3.5,7 M-3.5,-3.5 C-2.5,-7.5 1.5,-7.5 1.5,-3.5 L1.5,5 C1.5,9 6,9.5 7.5,6 M1.5,1.5 C4,-1.5 8.5,-1 8,2.5 C7.5,6 3.5,8 0.5,9.5',
  Libra: 'M-8.5,7.5 L8.5,7.5 M-8.5,3 L-3.5,3 C-6.5,0.5 -5.5,-6.5 0,-6.5 C5.5,-6.5 6.5,0.5 3.5,3 L8.5,3',
  Scorpio: 'M-8.5,-6 L-8.5,6.5 M-8.5,-3.5 C-7.5,-7.5 -3.5,-7.5 -3.5,-3.5 L-3.5,6.5 M-3.5,-3.5 C-2.5,-7.5 1.5,-7.5 1.5,-3.5 L1.5,5.5 C1.5,8 3,8.5 7.5,8.5 M5,6 L7.8,8.5 L5,11',
  Sagittarius: 'M-7.5,8.5 L7.5,-7.5 M1,-7.5 L7.5,-7.5 L7.5,-1 M-5.5,-0.5 L0.5,5.5',
  Capricorn: 'M-8.5,-6 C-7,-8 -5.5,-7 -5.5,-4.5 L-5.5,6 M-5.5,-4.5 C-4,-9 1,-9 1,-4 L1,4.5 C1,8.5 6.5,9 7.5,5.5 C8.5,2 4.5,0.5 2.5,3.5 C1,5.5 -1,8 -3.5,9.5',
  Aquarius: 'M-8.5,-1.5 L-5.5,-4.5 L-2.5,-1.5 L0.5,-4.5 L3.5,-1.5 L6.5,-4.5 L8.5,-2.5 M-8.5,5 L-5.5,2 L-2.5,5 L0.5,2 L3.5,5 L6.5,2 L8.5,4',
  Pisces: 'M-7,-8.5 C-2,-4 -2,4 -7,8.5 M7,-8.5 C2,-4 2,4 7,8.5 M-5,0 L5,0',
};

// ---------- wheel renderer ----------

const R = { size: 900, c: 450, zOut: 382, zIn: 328, ticks: 328, planet: 286, deg: 254, houseIn: 118, aspect: 118, transit: 428, angle: 403 };

function pt(r, theta) { // theta in degrees, counter-clockwise from +x (screen y flipped)
  const t = theta * Math.PI / 180;
  return [R.c + r * Math.cos(t), R.c - r * Math.sin(t)];
}
const f = n => n.toFixed(2);

function spread(items, minGap) {
  // items: [{lon}] -> adds .disp (display longitude) so glyphs don't collide
  const arr = items.map(o => ({ o, d: norm(o.lon) })).sort((a, b) => a.d - b.d);
  const n = arr.length; if (!n) return;
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const a = arr[i], b = arr[(i + 1) % n];
      let gap = norm(b.d - a.d); if (n === 1) break;
      if (gap < minGap) {
        const push = (minGap - gap) / 2 + 0.01;
        a.d = norm(a.d - push); b.d = norm(b.d + push); moved = true;
      }
    }
    if (!moved) break;
  }
  for (const x of arr) x.o.disp = x.d;
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

function glyph(key, x, y, scale, cls) {
  return `<path class="${cls}" fill="none" d="${GLYPHS[key]}" transform="translate(${f(x)} ${f(y)}) scale(${scale})"/>`;
}

// Text is centred with dy rather than dominant-baseline, and labels sit on small discs
// rather than paint-order strokes, so the same SVG prints cleanly through PDF and PNG export.
// opts.transits: today's planets (outer ring). opts.ghost: draw that ring faintly, unlabelled
// (the free version's preview). opts.lunation: {lon, type} marked with a ray to the hub.
export function renderWheel(chart, { transits = null, ghost = false, lunation = null, title = '', frame = 'auto' } = {}) {
  const asc = chart.houses ? chart.houses.asc : 0; // unknown time: Aries at the left
  const th = lon => 180 + norm(lon - asc);
  const s = [];
  const wide = frame === 'wide' || (frame === 'auto' && (transits || lunation));
  const vb = wide ? `0 0 ${R.size} ${R.size}` : `${R.c - 392} ${R.c - 392} 784 784`;
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="wheel" role="img" aria-label="${title || 'Birth chart wheel'}">`);
  s.push(`<title>${title || 'Birth chart'}</title>`);
  const text = (cls, x, y, body, extra = '') => `<text class="${cls}" x="${f(x)}" y="${f(y)}" dy="0.35em" text-anchor="middle"${extra}>${body}</text>`;

  // zodiac band
  s.push(`<circle class="w-band" cx="${R.c}" cy="${R.c}" r="${(R.zOut + R.zIn) / 2}" stroke-width="${R.zOut - R.zIn}" fill="none"/>`);
  for (let i = 0; i < 12; i++) {
    const a0 = th(i * 30);
    const [x0, y0] = pt(R.zOut, a0), [x1, y1] = pt(R.zIn, a0);
    s.push(`<line class="w-rule" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`);
    const [gx, gy] = pt((R.zOut + R.zIn) / 2, th(i * 30 + 15));
    s.push(glyph(SIGNS[i], gx, gy, 1.12, 'w-sign'));
  }
  s.push(`<circle class="w-rule-strong" cx="${R.c}" cy="${R.c}" r="${R.zOut}" fill="none"/>`);
  s.push(`<circle class="w-rule-strong" cx="${R.c}" cy="${R.c}" r="${R.zIn}" fill="none"/>`);
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 9 : d % 5 === 0 ? 6 : 3;
    const [x0, y0] = pt(R.ticks, th(d)), [x1, y1] = pt(R.ticks - len, th(d));
    s.push(`<line class="w-tick" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`);
  }
  s.push(`<circle class="w-hub" cx="${R.c}" cy="${R.c}" r="${R.houseIn - 1}"/>`);
  s.push(`<circle class="w-rule" cx="${R.c}" cy="${R.c}" r="${R.houseIn}" fill="none"/>`);

  // houses
  if (chart.houses) {
    const cs = chart.houses.cusps;
    for (let i = 0; i < 12; i++) {
      const angular = i % 3 === 0;
      const [x0, y0] = pt(R.houseIn, th(cs[i])), [x1, y1] = pt(angular ? R.zOut + 12 : R.ticks - 10, th(cs[i]));
      s.push(`<line class="${angular ? 'w-axis' : 'w-cusp'}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`);
      const mid = cs[i] + norm(cs[(i + 1) % 12] - cs[i]) / 2;
      const [hx, hy] = pt(R.houseIn + 15, th(mid));
      s.push(text('w-house', hx, hy, ROMAN[i]));
    }
    const lab = [['AC', chart.houses.asc], ['MC', chart.houses.mc], ['DC', chart.houses.asc + 180], ['IC', chart.houses.mc + 180]];
    for (const [t, lon] of lab) {
      const [x, y] = pt(R.angle, th(lon));
      s.push(`<rect class="w-angle-bg" x="${f(x - 15)}" y="${f(y - 9)}" width="30" height="18"/>`);
      s.push(text('w-angle', x, y, t));
    }
  }

  // aspects
  for (const a of chart.aspects) {
    if (a.type.key === 'conjunction') continue;
    const [x0, y0] = pt(R.aspect, th(a.a.lon)), [x1, y1] = pt(R.aspect, th(a.b.lon));
    const w = Math.max(0.5, 1.6 - a.orb * 0.15);
    s.push(`<line class="w-asp asp-${a.type.tone}" stroke-width="${f(w)}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"><title>${a.a.name} ${a.type.name.toLowerCase()} ${a.b.name} (orb ${a.orb.toFixed(1)}°)</title></line>`);
  }
  for (const p of chart.points) {
    const [x, y] = pt(R.aspect, th(p.lon));
    s.push(`<circle class="w-aspdot" cx="${f(x)}" cy="${f(y)}" r="2"/>`);
  }

  // lunation ray: from the hub through the house it lands in, out past the zodiac
  if (lunation) {
    const t = th(lunation.lon);
    const [x0, y0] = pt(R.houseIn, t), [x1, y1] = pt(R.zOut + 4, t), [mx, my] = pt(R.zOut + 20, t);
    s.push(`<g class="w-lun"><title>${lunation.type === 'new' ? 'New' : 'Full'} Moon ${fmtPos(lunation.lon)}</title>`);
    s.push(`<line class="w-lun-ray" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`);
    s.push(`<circle class="${lunation.type === 'new' ? 'w-lun-new' : 'w-lun-full'}" cx="${f(mx)}" cy="${f(my)}" r="9"/>`);
    s.push('</g>');
  }

  // planets
  spread(chart.points, 7.6);
  for (const p of chart.points) {
    const t = th(p.lon), td = th(p.disp);
    const [ax, ay] = pt(R.ticks, t), [bx, by] = pt(R.ticks - 13, t), [cx2, cy2] = pt(R.planet + 16, td);
    s.push(`<polyline class="w-leader" fill="none" points="${f(ax)},${f(ay)} ${f(bx)},${f(by)} ${f(cx2)},${f(cy2)}"/>`);
    const [gx, gy] = pt(R.planet, td);
    s.push(`<g class="w-planet" data-key="${p.key}"><title>${p.name} ${fmtPos(p.lon)}${p.retro ? ' (retrograde)' : ''}</title>`);
    s.push(`<circle class="w-planet-bg" cx="${f(gx)}" cy="${f(gy)}" r="13"/>`);
    s.push(glyph(p.key, gx, gy, 1.05, 'w-pglyph'));
    s.push('</g>');
    const { deg, min } = degInSign(p.lon);
    const [dx, dy] = pt(R.deg, td), [mx, my] = pt(R.deg - 17, td);
    s.push(text('w-deg', dx, dy, `${deg}°`));
    s.push(text('w-min', mx, my, `${String(min).padStart(2, '0')}′${p.retro ? ' R' : ''}`));
  }

  // today's sky (outer ring)
  if (transits) {
    s.push(`<g class="${ghost ? 'w-ghost' : ''}">`);
    s.push(`<circle class="w-transit-ring" cx="${R.c}" cy="${R.c}" r="${R.transit}" fill="none"/>`);
    spread(transits.points, 6);
    for (const p of transits.points) {
      const t = th(p.lon), td = th(p.disp);
      const [ax, ay] = pt(R.zOut, t), [bx, by] = pt(R.zOut + 9, t), [cx2, cy2] = pt(R.transit - 13, td);
      s.push(`<polyline class="w-tleader" fill="none" points="${f(ax)},${f(ay)} ${f(bx)},${f(by)} ${f(cx2)},${f(cy2)}"/>`);
      const [gx, gy] = pt(R.transit, td);
      s.push(`<g class="w-transit">${ghost ? '' : `<title>Today: ${p.name} ${fmtPos(p.lon)}${p.retro ? ' (retrograde)' : ''}</title>`}<circle class="w-transit-bg" cx="${f(gx)}" cy="${f(gy)}" r="11"/>${glyph(p.key, gx, gy, 0.85, 'w-tglyph')}</g>`);
    }
    s.push('</g>');
  }
  s.push('</svg>');
  return s.join('');
}

// ---------- lunations ----------
// Next New and Full Moons after a given moment: the Moon–Sun elongation crosses 0° (new)
// or 180° (full). Stepped in half-days, then bisected to under a second.
export function nextLunations(swe, fromJd, count = 2) {
  const elong = jd => norm(swe.calc_ut(jd, 1, SEFLG_SWIEPH)[0] - swe.calc_ut(jd, 0, SEFLG_SWIEPH)[0]);
  const out = [];
  let a = fromJd, ea = elong(a);
  while (out.length < count) {
    const b = a + 0.5, eb = elong(b);
    let type = null;
    if (ea > 300 && eb < 60) type = 'new';
    else if (ea < 180 && eb >= 180) type = 'full';
    if (type) {
      const target = type === 'new' ? 0 : 180;
      let lo = a, hi = b;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const d = ((elong(mid) - target + 540) % 360) - 180; // signed distance to target
        if (d < 0) lo = mid; else hi = mid;
      }
      const jd = (lo + hi) / 2;
      const lon = swe.calc_ut(jd, 1, SEFLG_SWIEPH)[0];
      out.push({ type, jd, lon, sign: signOf(lon) });
    }
    a = b; ea = eb;
  }
  return out;
}

export function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }
