// A4A Chart Explorer — the v2 wheel.
// Drawn with presentation attributes only (no stylesheet needed), so the same SVG works on the
// page, in the print layouts and in exported files. Layers are grouped (.w-signs, .w-houses,
// .w-aspects, .w-planets, .w-angles) so the guided reading can bring one forward at a time.
// Fills inside the wheel are translucent so the page background shows through.
import { SIGNS, GLYPHS, norm } from './chart-core.js';

const ELC = ['#EBCDC6', '#D5DAC8', '#EEE7D3', '#D8D4E2']; // fire, earth, air, water: a muted data palette, not brand accents
const INK = '#1D1D1B', INK2C = '#5C4A4D', MUTED = '#9A8A86', RULE = '#D9C4C8', REDC = '#C32414', SLATEC = '#5E6B78';
const FONT = "CrimsonPro, 'Crimson Pro', Georgia, serif";
const C = 450;
const R = { zOut: 410, zIn: 356, tick: 356, planet: 306, hIn: 150, hOut: 186, asp: 150 };
const f = n => n.toFixed(1);
const dm = lon => { const x = norm(lon) % 30; const deg = Math.floor(x); return { deg, min: Math.floor((x - deg) * 60) }; };

function spread(items, gap) {
  // Unroll the circle at its widest empty gap, then lay out clusters in a line: each group of
  // glyphs closer than `gap` is centred on its mean and spaced evenly.
  const arr = items.map(o => ({ o, d: norm(o.lon) })).sort((a, b) => a.d - b.d);
  if (!arr.length) return;
  let cut = 0, widest = -1;
  for (let i = 0; i < arr.length; i++) { const g = norm(arr[(i + 1) % arr.length].d - arr[i].d) || 360; if (g > widest) { widest = g; cut = (i + 1) % arr.length; } }
  const line = arr.slice(cut).concat(arr.slice(0, cut).map(x => ({ ...x, d: x.d + 360 })));
  const groups = line.map(x => ({ m: [x], c: x.d }));
  for (let it = 0; it < 100; it++) {
    let merged = false;
    for (let i = 0; i < groups.length - 1; i++) {
      const A = groups[i], B = groups[i + 1];
      if ((B.c - (B.m.length - 1) * gap / 2) - (A.c + (A.m.length - 1) * gap / 2) < gap) {
        const m = A.m.concat(B.m); groups.splice(i, 2, { m, c: m.reduce((t, x) => t + x.d, 0) / m.length }); merged = true; break;
      }
    }
    if (!merged) break;
  }
  for (const g of groups) { const start = g.c - (g.m.length - 1) * gap / 2; g.m.forEach((x, i) => { x.o.disp = norm(start + i * gap); }); }
}

// mode: 'discover' | 'explore' | 'study' | 'print'. sel: a point key to highlight.
// mono: a monotone rendering for black-only print — greys for the sign band, black lines.
export function renderWheelV2(chart, { mode = 'explore', sel = null, title = 'Birth chart', mono = false } = {}) {
  const study = mode === 'study', discover = mode === 'discover', print = mode === 'print';
  const EL = mono ? ['#E4E4E1', '#EFEFEC', '#E4E4E1', '#EFEFEC'] : ELC;
  const RED = mono ? INK : REDC, SLATE = mono ? '#55554F' : SLATEC, HOUSEFILL = mono ? '#E4E4E1' : '#F1D5DB', INK2 = mono ? '#3A3A37' : INK2C;
  const STYLE = { opposition: [RED, ''], square: [RED, ''], trine: [SLATE, '5 4'], sextile: [SLATE, '1.5 4'] };
  const asc = chart.houses ? chart.houses.asc : 0;
  const th = lon => 180 + norm(lon - asc);
  const pt = (r, t) => { const a = t * Math.PI / 180; return [C + r * Math.cos(a), C - r * Math.sin(a)]; };
  const glyph = (key, x, y, sc, color, w = 1.5) => `<path d="${GLYPHS[key]}" fill="none" stroke="${color}" stroke-width="${f(w / sc)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(x)} ${f(y)}) scale(${sc})"/>`;
  const text = (x, y, size, body, color, extra = '') => `<text x="${f(x)}" y="${f(y)}" dy="0.35em" text-anchor="middle" font-family="${FONT}" font-size="${size}" fill="${color}"${extra}>${body}</text>`;
  const arc = (r0, r1, a0, a1, fill) => {
    const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
    return `<path d="M${f(x0)},${f(y0)} A${r1},${r1} 0 0,0 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${r0},${r0} 0 0,1 ${f(x3)},${f(y3)} Z" fill="${fill}"/>`;
  };
  const lonOf = Object.fromEntries(chart.points.map(p => [p.key, p.lon]));
  const related = new Set(sel ? chart.aspects.filter(a => a.a.key === sel || a.b.key === sel).flatMap(a => [a.a.key, a.b.key]) : []);
  const s = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${print ? '-14 -14 928 928' : '-30 -30 960 960'}" class="wheel2" role="img" aria-label="${title}">`);
  s.push(`<title>${title}</title>`);
  s.push(`<circle cx="${C}" cy="${C}" r="${R.zIn}" fill="#FFFFFF" fill-opacity="0.55"/>`);

  // signs
  s.push('<g class="w-layer w-signs">');
  for (let i = 0; i < 12; i++) s.push(arc(R.zIn, R.zOut, th(i * 30), th(i * 30 + 30), EL[i % 4]));
  for (let i = 0; i < 12; i++) {
    const [a, b] = pt(R.zIn, th(i * 30)), [c, e] = pt(R.zOut, th(i * 30));
    s.push(`<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}" stroke="#FFFFFF" stroke-width="2"/>`);
    const [gx, gy] = pt((R.zIn + R.zOut) / 2, th(i * 30 + 15));
    s.push(`<g class="w-sign" data-sign="${i}"><title>${SIGNS[i]}</title>${glyph(SIGNS[i], gx, gy, 1.25, INK2, 1.4)}</g>`);
  }
  s.push(`<circle cx="${C}" cy="${C}" r="${R.zOut}" fill="none" stroke="${INK}" stroke-width="1"/>`);
  s.push(`<circle cx="${C}" cy="${C}" r="${R.zIn}" fill="none" stroke="${INK}" stroke-width="0.8"/>`);
  if (!discover) for (let i = 0; i < 360; i++) {
    const len = i % 10 === 0 ? 10 : i % 5 === 0 ? 7 : 3.5;
    const [a, b] = pt(R.tick, th(i)), [c, e] = pt(R.tick - len, th(i));
    s.push(`<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}" stroke="${MUTED}" stroke-width="0.6"/>`);
  }
  s.push('</g>');

  // houses
  if (chart.houses && !discover) {
    const cusps = chart.houses.cusps;
    s.push('<g class="w-layer w-houses">');
    s.push(`<circle cx="${C}" cy="${C}" r="${R.hOut}" fill="${HOUSEFILL}" fill-opacity="0.35" stroke="${RULE}" stroke-width="0.8"/>`);
    s.push(`<circle cx="${C}" cy="${C}" r="${R.hIn}" fill="#FFFFFF" fill-opacity="0.6" stroke="${RULE}" stroke-width="0.8"/>`);
    cusps.forEach((cu, i) => {
      if (i % 3 !== 0) { const [a, b] = pt(R.hIn, th(cu)), [c, e] = pt(R.zIn, th(cu)); s.push(`<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}" stroke="${RULE}" stroke-width="0.8"/>`); }
      const mid = cu + norm(cusps[(i + 1) % 12] - cu) / 2; const [nx, ny] = pt((R.hIn + R.hOut) / 2, th(mid));
      s.push(`<g class="w-house" data-house="${i + 1}">${text(nx, ny, 15, i + 1, INK2)}</g>`);
      if (study) { const { deg, min } = dm(cu); const [tx, ty] = pt(R.hOut + 13, th(cu + (i % 3 === 0 ? -3.2 : 3.2))); s.push(text(tx, ty, 10.5, `${deg}°${String(min).padStart(2, '0')}′`, MUTED)); }
    });
    s.push('</g>');
  } else {
    s.push(`<circle cx="${C}" cy="${C}" r="${R.asp}" fill="none" stroke="${RULE}" stroke-width="0.8"/>`);
  }

  // angles
  if (chart.houses) {
    s.push('<g class="w-layer w-angles">');
    for (const [lab, lon] of [['AC', chart.houses.asc], ['DC', chart.houses.asc + 180], ['MC', chart.houses.mc], ['IC', chart.houses.mc + 180]]) {
      const [a, b] = pt(discover ? R.asp : R.hIn, th(lon)), [c, e] = pt(R.zOut + 14, th(lon));
      s.push(`<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}" stroke="${INK}" stroke-width="1.3"/>`);
      const [lx, ly] = pt(R.zOut + 30, th(lon));
      s.push(text(lx, ly, 15, lab, INK, ' letter-spacing="2"'));
    }
    s.push('</g>');
  }

  // aspects
  s.push('<g class="w-layer w-aspects">');
  if (!discover) for (const a of chart.aspects) {
    if (a.type.key === 'conjunction') continue;
    if (!study && (a.a.key === 'chiron' || a.b.key === 'chiron')) continue;
    const [col, dash] = STYLE[a.type.key]; const on = !sel || a.a.key === sel || a.b.key === sel;
    const [x1, y1] = pt(R.asp, th(lonOf[a.a.key])), [x2, y2] = pt(R.asp, th(lonOf[a.b.key]));
    s.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="${on && sel ? 1.8 : 1.1}"${dash ? ` stroke-dasharray="${dash}"` : ''}${dash === '1.5 4' ? ' stroke-linecap="round"' : ''} opacity="${on ? 0.9 : 0.15}"/>`);
  }
  s.push('</g>');

  // planets
  const shown = chart.points.filter(p => study || print ? true : discover ? !['node', 'chiron'].includes(p.key) : p.key !== 'chiron').map(p => ({ ...p }));
  spread(shown, study || print ? 10 : 8);
  s.push('<g class="w-layer w-planets">');
  for (const p of shown) {
    const big = ['sun', 'moon'].includes(p.key);
    const dim = (discover && !big) || (sel && p.key !== sel && !related.has(p.key));
    const col = dim ? MUTED : INK;
    const [mx, my] = pt(R.tick - 1, th(p.lon)), [nx, ny] = pt(R.tick - 14, th(p.lon));
    const [gx, gy] = pt(R.planet, th(p.disp)), [lx, ly] = pt(R.planet + 20, th(p.disp));
    const label = `${p.name}, ${dm(p.lon).deg}° ${SIGNS[Math.floor(norm(p.lon) / 30)]}${p.house ? ', ' + p.house + ' house' : ''}`;
    s.push(`<g class="w-planet${p.key === sel ? ' is-sel' : ''}" data-key="${p.key}"${print ? '' : ` tabindex="0" role="button" aria-label="${label}" aria-pressed="${p.key === sel}"`}>`);
    s.push(`<line x1="${f(mx)}" y1="${f(my)}" x2="${f(nx)}" y2="${f(ny)}" stroke="${col}" stroke-width="1.2"/>`);
    s.push(`<line x1="${f(nx)}" y1="${f(ny)}" x2="${f(lx)}" y2="${f(ly)}" stroke="${RULE}" stroke-width="0.8"/>`);
    if (!print) s.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="22" fill="#FFFFFF" fill-opacity="0" class="w-hit"/>`);
    if (p.key === sel) s.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="22" fill="#FFFFFF" stroke="${RED}" stroke-width="1.6"/>`);
    else if (discover && big) s.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="21" fill="#FFFFFF" stroke="${INK}" stroke-width="1"/>`);
    s.push(glyph(p.key, gx, gy, discover && big ? 1.35 : 1.15, p.key === sel ? RED : col, 1.5));
    if (!discover) {
      const { deg, min } = dm(p.lon);
      const [tx, ty] = pt(R.planet - 34, th(p.disp));
      s.push(text(tx, ty, 13, `${deg}°`, dim ? MUTED : INK2));
      if (study || print) {
        const [rx, ry] = pt(R.planet - 56, th(p.disp)); s.push(glyph(SIGNS[Math.floor(norm(p.lon) / 30)], rx, ry, 0.6, MUTED, 1.1));
        const [qx, qy] = pt(R.planet - 77, th(p.disp)); s.push(text(qx, qy, 11, `${String(min).padStart(2, '0')}′${p.retro ? 'r' : ''}`, MUTED));
      }
    }
    s.push('</g>');
  }
  s.push('</g>');
  s.push('</svg>');
  return s.join('');
}
