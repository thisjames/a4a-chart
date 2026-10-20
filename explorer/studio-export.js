// A4A Chart Studio — print-ready chart and introduction card.
// Builds each layout as an SVG in millimetres (print) or pixels (card), then turns it into a
// vector PDF (jsPDF + svg2pdf.js) or a PNG (canvas), entirely in the visitor's browser.
import { renderWheelV2 } from './wheel-v2.js';
import { fmtPos, degInSign, GLYPHS, SIGNS, BODIES, formatOffset, norm } from '../chart-core.js';

export const PAPER = { A5: [148, 210], A4: [210, 297], A3: [297, 420] };
const FONT_FILES = { royal: '../fonts/RoyalPrinting.ttf', crimson: '../fonts/CrimsonPro-400.ttf', crimsonBold: '../fonts/CrimsonPro-600.ttf' };
const DISPLAY = "RoyalPrinting, '1790 Royal Printing', serif";
const TEXT = "CrimsonPro, 'Crimson Pro', Georgia, serif";
const INK = { red: { accent: '#c32414', ink: '#1d1d1b', grey: '#55554f', sigil: 'sigil' }, black: { accent: '#1d1d1b', ink: '#1d1d1b', grey: '#55554f', sigil: 'sigilBlack' } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = x => +x.toFixed(3);

// ---------- shared loaders ----------
let fontCache = null;
async function b64(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export async function loadFonts() {
  if (!fontCache) fontCache = Object.fromEntries(await Promise.all(Object.entries(FONT_FILES).map(async ([k, u]) => [k, await b64(u)])));
  return fontCache;
}
let libs = null;
function script(src) { return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
export function loadPdfLibs() {
  if (!libs) libs = script('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js')
    .then(() => script('https://cdn.jsdelivr.net/npm/svg2pdf.js@2.5.0/dist/svg2pdf.umd.min.js'));
  return libs;
}

// ---------- pieces ----------
function wheelGroup(chart, x, y, size, mono = false) {
  const svg = renderWheelV2(chart, { mode: 'print', mono });
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title>[^<]*<\/title>/g, '');
  const k = size / vb[2];
  return `<g class="wheel-print" transform="translate(${n(x)} ${n(y)}) scale(${n(k)}) translate(${-vb[0]} ${-vb[1]})">${inner}</g>`;
}
function glyphAt(key, x, y, size, color, width) {
  const k = size / 20;
  return `<path d="${GLYPHS[key]}" fill="none" stroke="${color}" stroke-width="${n(width / k)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${n(x)} ${n(y)}) scale(${n(k)})"/>`;
}
function logotype(assets, x, y, w, color) {
  const vb = assets.logotypeViewBox, k = w / vb[2];
  return `<g fill="${color}" transform="translate(${n(x)} ${n(y)}) scale(${n(k)})">${assets.logotypePaths}</g>`;
}
function sigil(assets, which, x, y, w) {
  const h = w * assets.sigilRatio;
  return `<image href="${assets[which]}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="xMidYMid meet"/>`;
}
const t = (x, y, size, body, { family = TEXT, color = '#1d1d1b', anchor = 'start', weight = 'normal', spacing = 0, style = 'normal' } = {}) =>
  `<text x="${n(x)}" y="${n(y)}" font-family="${family}" font-size="${n(size)}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}" font-style="${style}"${spacing ? ` letter-spacing="${n(spacing)}"` : ''}>${esc(body)}</text>`;

export function chartLines(chart, name) {
  const i = chart.input, known = chart.opts.timeKnown;
  const date = new Date(Date.UTC(i.year, i.month - 1, i.day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const time = known ? `, ${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}` : ', time unknown';
  const src = { zone: 'standard time', lmt: 'local mean time', 'legal-mean': 'legal mean time' }[chart.conv.source];
  const P = Object.fromEntries(chart.points.map(p => [p.key, p]));
  const big3 = [`Sun ${SIGNS[Math.floor(norm(P.sun.lon) / 30)]}`, `Moon ${SIGNS[Math.floor(norm(P.moon.lon) / 30)]}`];
  if (chart.houses) big3.push(`Rising ${SIGNS[Math.floor(norm(chart.houses.asc) / 30)]}`);
  return {
    name: name || 'Untitled chart',
    when: `${date}${time}`,
    where: i.placeName || '',
    tech: `${known ? formatOffset(chart.conv.offsetSeconds) + ' (' + src + ')' : 'Set for noon, no houses'}${chart.houses ? ' · ' + ({ P: 'Placidus', W: 'Whole sign', K: 'Koch', E: 'Equal', O: 'Porphyry', R: 'Regiomontanus' }[chart.houses.system]) + ' houses' : ''}`,
    big3: big3.join(' · '),
  };
}

function positionsRows(chart) {
  const rows = chart.points.map(p => ({ key: p.key, name: p.name, pos: fmtPos(p.lon) + (p.retro ? ' R' : ''), house: p.house }));
  if (chart.houses) {
    rows.push({ key: null, name: 'Ascendant', pos: fmtPos(chart.houses.asc) });
    rows.push({ key: null, name: 'Midheaven', pos: fmtPos(chart.houses.mc) });
  }
  return rows;
}
function positionsTable(chart, x, y, w, cols, size, pal) {
  const rows = positionsRows(chart), per = Math.ceil(rows.length / cols), colW = w / cols, lh = size * 1.75, out = [];
  rows.forEach((r, i) => {
    const c = Math.floor(i / per), rI = i % per, cx = x + c * colW, cy = y + rI * lh;
    if (r.key) out.push(glyphAt(r.key, cx + size * 0.55, cy - size * 0.33, size * 1.05, pal.ink, size * 0.075));
    out.push(t(cx + size * 1.5, cy, size, r.name, { color: pal.grey }));
    out.push(t(cx + colW - size * 0.8, cy, size, r.pos, { color: pal.ink, anchor: 'end' }));
  });
  for (let c = 1; c < cols; c++) out.push(`<line x1="${n(x + c * colW - size * 0.4)}" y1="${n(y - size)}" x2="${n(x + c * colW - size * 0.4)}" y2="${n(y + (per - 1) * lh + size * 0.4)}" stroke="#ccccc4" stroke-width="${n(size * 0.03)}"/>`);
  return { svg: out.join(''), height: (per - 1) * lh + size };
}

// ---------- the print layout (units: mm) ----------
export function posterSVG(chart, name, o, assets) {
  const [pw, ph] = PAPER[o.size];
  const [W, H] = o.orientation === 'landscape' ? [ph, pw] : [pw, ph];
  const pal = INK[o.ink], m = Math.min(W, H) * 0.075, L = chartLines(chart, name), out = [];
  const withTable = o.content === 'positions';
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" data-ink="${o.ink}">`);
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
  const logoW = W - 2 * m;
  const showLogo = o.logo !== false, showSigil = o.sigil !== false;
  if (showLogo) out.push(logotype(assets, m, m, logoW, pal.ink));
  const s = Math.min(W, H); // type scales with the short side
  const logoH = showLogo ? logoW * assets.logotypeViewBox[3] / assets.logotypeViewBox[2] : -s * 0.04;
  // footer: credit line bottom left, sigil bottom right, centred on the credit line
  const footY = H - m, footSize = s * 0.016, footMid = footY - footSize * 0.33, sigW = s * 0.09, sigH = sigW * assets.sigilRatio;
  if (showSigil) out.push(sigil(assets, pal.sigil, W - m - sigW, footMid - sigH / 2, sigW));
  out.push(t(m, footY, footSize, 'Astrology for Artists · Chart Studio · astrologyforartists.com', { color: pal.grey }));
  const footTop = Math.min(footY - footSize, showSigil ? footMid - sigH / 2 : footY - footSize);

  if (o.orientation === 'portrait') {
    let y = m + logoH + s * 0.11;
    out.push(t(W / 2, y, s * 0.07, L.name, { family: DISPLAY, anchor: 'middle' }));
    y += s * 0.045;
    out.push(t(W / 2, y, s * 0.024, `${L.when} · ${L.where}`, { anchor: 'middle', color: pal.ink }));
    y += s * 0.032;
    out.push(t(W / 2, y, s * 0.018, L.big3.toUpperCase(), { family: DISPLAY, anchor: 'middle', color: pal.accent, spacing: s * 0.004 }));
    y += s * 0.035;
    const tableSize = s * 0.021;
    const table = withTable ? positionsTable(chart, m, 0, W - 2 * m, 3, tableSize, pal) : null;
    const reserveBottom = (H - footTop) + s * 0.07 + (table ? table.height + s * 0.06 : 0);
    const size = Math.min(W - 2 * m, H - y - reserveBottom);
    out.push(wheelGroup(chart, (W - size) / 2, y, size, o.ink === 'black'));
    if (table) {
      const ty = y + size + s * 0.06;
      out.push(positionsTable(chart, m, ty, W - 2 * m, 3, tableSize, pal).svg);
    }
    out.push(t(W / 2, footTop - s * 0.025, s * 0.015, L.tech, { anchor: 'middle', color: pal.grey }));
  } else {
    const top = m + logoH + s * 0.06;
    const size = Math.min(footTop - top - s * 0.04, W * 0.46);
    out.push(wheelGroup(chart, m, top, size, o.ink === 'black'));
    const x = m + size + s * 0.07, cw = W - x - m;
    let y = top + s * 0.07;
    out.push(t(x, y, s * 0.075, L.name, { family: DISPLAY }));
    y += s * 0.05; out.push(t(x, y, s * 0.025, L.when, { color: pal.ink }));
    y += s * 0.035; out.push(t(x, y, s * 0.025, L.where, { color: pal.ink }));
    y += s * 0.035; out.push(t(x, y, s * 0.018, L.tech, { color: pal.grey }));
    y += s * 0.025;
    for (const part of L.big3.split(' · ')) { y += s * 0.03; out.push(t(x, y, s * 0.018, part.toUpperCase(), { family: DISPLAY, color: pal.accent, spacing: s * 0.004 })); }
    if (withTable) { y += s * 0.07; out.push(positionsTable(chart, x, y, cw, 2, s * 0.018, pal).svg); }
  }
  out.push('</svg>');
  return { svg: out.join(''), W, H };
}

// ---------- the introduction card (units: px, 1080 square) ----------
export function cardSVG(chart, name, assets) {
  const S = 1080, L = chartLines(chart, name), out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" data-ink="red">`);
  out.push(`<rect x="0" y="0" width="${S}" height="${S}" fill="#FAF3EE"/>`);
  out.push(wheelGroup(chart, 210, 50, 660));
  out.push(t(S / 2, 800, 68, L.name, { family: DISPLAY, anchor: 'middle' }));
  out.push(t(S / 2, 856, 24, L.big3.toUpperCase(), { family: DISPLAY, anchor: 'middle', color: '#c32414', spacing: 5 }));
  out.push(t(S / 2, 900, 26, `${L.when} · ${L.where}`, { anchor: 'middle', color: '#55554f' }));
  const cw = 100, ch = cw * assets.sigilRatio, mid = S - 62 - 22 * 0.33;
  out.push(sigil(assets, 'sigil', S - 70 - cw, mid - ch / 2, cw));
  out.push(t(70, S - 62, 22, 'Chart Studio · astrologyforartists.com', { color: '#55554f' }));
  out.push('</svg>');
  return out.join('');
}

// ---------- turning a layout into a file ----------
// The wheel inside a layout is styled by the page's stylesheet; before export, every
// computed colour, line and type setting is written onto the element itself.
const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-weight', 'font-style'];
const SVGNS = 'http://www.w3.org/2000/svg';
function inline(live, copy) {
  const cs = getComputedStyle(live);
  const inWheel = live.closest && live.closest('.wheel-print');
  if (inWheel) {
    for (const p of PROPS) {
      let v = cs.getPropertyValue(p);
      if (!v) continue;
      if (p === 'font-weight') v = parseInt(v, 10) >= 600 ? 'bold' : 'normal';
      if (p === 'font-size' || p === 'stroke-width') v = parseFloat(v);
      copy.setAttribute(p, v);
    }
    if (live.tagName === 'text') copy.setAttribute('font-family', /Royal/.test(cs.fontFamily) ? DISPLAY : TEXT);
    copy.removeAttribute('class');
  }
  if (live.tagName === 'text' && live.getNumberOfChars && live.getNumberOfChars() > 0) {
    // Print engines vary in how they handle centring, end alignment and letter-spacing, so
    // each text is pinned to the positions the browser has already laid out.
    const spacing = parseFloat(cs.letterSpacing) || 0;
    const anchor = cs.textAnchor || live.getAttribute('text-anchor') || 'start';
    if (spacing > 0) {
      const txt = live.textContent.replace(/\s+/g, ' ').trim();
      const count = live.getNumberOfChars();
      if (count !== txt.length) { // cannot map characters safely: keep the text whole, pinned at its start
        const p = live.getStartPositionOfChar(0);
        copy.setAttribute('x', p.x); copy.setAttribute('y', p.y); copy.removeAttribute('dy'); copy.setAttribute('text-anchor', 'start');
        return;
      }
      const g = document.createElementNS(SVGNS, 'g');
      for (let i = 0; i < count; i++) {
        if (txt[i] === ' ') continue;
        const p = live.getStartPositionOfChar(i), c = copy.cloneNode(false);
        c.textContent = txt[i]; c.setAttribute('x', p.x); c.setAttribute('y', p.y);
        c.removeAttribute('dy'); c.removeAttribute('letter-spacing'); c.setAttribute('text-anchor', 'start');
        g.appendChild(c);
      }
      copy.replaceWith(g);
      return;
    }
    if (anchor !== 'start' || copy.getAttribute('dy')) {
      const p = live.getStartPositionOfChar(0);
      copy.setAttribute('x', p.x); copy.setAttribute('y', p.y);
      copy.removeAttribute('dy'); copy.setAttribute('text-anchor', 'start');
    }
    return;
  }
  const kids = [...copy.children];
  for (let i = 0; i < live.children.length; i++) inline(live.children[i], kids[i]);
}
export function inlineCopy(liveSvg) {
  const copy = liveSvg.cloneNode(true);
  inline(liveSvg, copy);
  copy.querySelectorAll('title').forEach(el => el.remove());
  return copy;
}
export async function toPDF(svgEl, W, H, orientation) {
  await loadPdfLibs();
  const fonts = await loadFonts();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: [Math.min(W, H), Math.max(W, H)], orientation: orientation === 'landscape' ? 'l' : 'p', compress: true });
  doc.addFileToVFS('RoyalPrinting.ttf', fonts.royal); doc.addFont('RoyalPrinting.ttf', 'RoyalPrinting', 'normal');
  doc.addFileToVFS('CrimsonPro-400.ttf', fonts.crimson); doc.addFont('CrimsonPro-400.ttf', 'CrimsonPro', 'normal');
  doc.addFileToVFS('CrimsonPro-600.ttf', fonts.crimsonBold); doc.addFont('CrimsonPro-600.ttf', 'CrimsonPro', 'bold');
  await doc.svg(svgEl, { x: 0, y: 0, width: W, height: H });
  return doc.output('blob');
}

export async function toPNG(svgEl, pxW, pxH) {
  const fonts = await loadFonts();
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@font-face{font-family:RoyalPrinting;src:url(data:font/ttf;base64,${fonts.royal}) format("truetype")}
@font-face{font-family:CrimsonPro;font-weight:400;src:url(data:font/ttf;base64,${fonts.crimson}) format("truetype")}
@font-face{font-family:CrimsonPro;font-weight:700;src:url(data:font/ttf;base64,${fonts.crimsonBold}) format("truetype")}`;
  const el = svgEl.cloneNode(true);
  el.insertBefore(style, el.firstChild);
  el.setAttribute('width', pxW); el.setAttribute('height', pxH);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('The image could not be drawn.')); img.src = url; });
    await new Promise(r => setTimeout(r, 60)); // let embedded fonts settle
    const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
    c.getContext('2d').drawImage(img, 0, 0, pxW, pxH);
    return await new Promise(ok => c.toBlob(ok, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function slug(s) { return (s || 'chart').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'chart'; }
