// A4A Chart Explorer — creative themes and invitations.
// DRAFT METHOD for Madeleine to replace or approve. Each theme is triggered by named signals in the
// chart, scored by how strong those signals are, and the three strongest themes from different
// families are shown. Every theme says which signals it came from, so the reasoning can be checked.
import { SIGNS, norm } from './chart-core.js';
import { PLANET_INFO, SIGN_INFO, RISING } from './readings.js';

const PLANETS10 = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const PERSONAL = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const ELEMENTS = ['fire', 'earth', 'air', 'water'];
const signOf = lon => Math.floor(norm(lon) / 30);
const fmtOrb = o => `${Math.floor(o)}°${String(Math.round((o % 1) * 60)).padStart(2, '0')}′`;
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
const listNames = arr => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const VERB = { conjunction: 'conjunct', opposition: 'opposite', square: 'square', trine: 'trine', sextile: 'sextile' };
const ASPECT_TITLES = {
  hard: { sun: 'Friction as fuel', moon: 'Restless feeling', mercury: 'The argument in your head', venus: 'Difficult beauty', mars: 'Pressure and push' },
  soft: { sun: 'An easy current', moon: 'Comfort as a resource', mercury: 'Ideas that flow', venus: 'A natural eye', mars: 'Energy that flows' },
  neutral: { sun: 'Two voices, one line', moon: 'Feeling, fused', mercury: 'Thinking with two minds', venus: 'Love, doubled', mars: 'A second engine' },
};
const firstPersonal = (a, b) => PERSONAL.find(k => k === a || k === b);
const personalCount = ks => ks.filter(k => PERSONAL.includes(k)).length;

const HOUSE_THEMES = [
  { title: 'The self as subject', body: 'the 1st house, the house of the body and the face. You are your own nearest material, and self-portraiture, in any medium, is a natural home for your work.',
    prompts: ['Make a self-portrait without showing your face. Twenty minutes, any medium.', 'Describe yourself as a stranger would see you on a train. One page.'] },
  { title: 'Materials and worth', body: 'the 2nd house, which ties your work to what you can touch and what you value. The materials you choose carry meaning, and so does what you ask in return.',
    prompts: ['Make something using only materials you already own and love.', 'List what your work is worth to you that money cannot measure.'] },
  { title: 'Notes, letters, sketches', body: 'the 3rd house, which puts words and small daily observations at the centre. The notebook, the letter and the quick sketch may be your truest forms.',
    prompts: ['Write a letter you will never send.', 'Fill one page with drawings of things within arm’s reach.'] },
  { title: 'The studio at home', body: 'the 4th house, which roots your work in home, family and the past. Your private life is not a distraction from the work; it is the source.',
    prompts: ['Make something from a room you grew up in.', 'Draw or photograph one object you inherited, and write what it remembers.'] },
  { title: 'Play as method', body: 'the 5th house, the house of creativity and pleasure. Play is your method, and you do your best work when it feels like a game.',
    prompts: ['Make something deliberately silly in fifteen minutes. Keep it.', 'Make something for a child, real or imagined.'] },
  { title: 'Craft and daily practice', body: 'the 6th house, which makes your practice a daily one. Small, repeated acts of making will take you further than waiting for inspiration.',
    prompts: ['Make the same small thing every day this week. Notice what changes.', 'Turn a daily chore into a drawing or a short piece of writing.'] },
  { title: 'Making with another', body: 'the 7th house, which says your work comes alive in partnership. Collaborators, muses and the people who mirror you are part of your process.',
    prompts: ['Make a portrait of someone close to you without showing them.', 'Start something and give it to another person to finish.'] },
  { title: 'What lies underneath', body: 'the 8th house, which draws you below the surface. Your work goes where others hesitate: intimacy, loss, power, the things we do not say.',
    prompts: ['Make something about a feeling you have never said aloud.', 'Make something about a loss, using only objects.'] },
  { title: 'The long journey', body: 'the 9th house, which makes your work a search for meaning. Travel, study and other cultures feed you, and your work reaches beyond your own life.',
    prompts: ['Make a map of a place you have never been.', 'Learn one word in a language you do not speak, and make something from it.'] },
  { title: 'Work in public', body: 'the 10th house, the most public part of the chart. What is personal in you wants to be seen in your work; the task may be to let the private become the subject rather than the secret.',
    prompts: ['Make something you would be proud to sign with your full name.', 'Write the sentence you would most like people to say about your work.'] },
  { title: 'Making for many', body: 'the 11th house, which makes your work social. You make best for, and with, a community, and your ideas grow when they are shared.',
    prompts: ['Make something to give away to a group.', 'Invite one friend to make alongside you for an hour.'] },
  { title: 'Work made in private', body: 'the 12th house, which keeps much of your creative life out of sight: in dreams, solitude and retreat. Protect the private studio.',
    prompts: ['Keep a dream notebook for a week, then make something from one entry.', 'Make something you promise never to show anyone.'] },
];

const OUTER_THEMES = {
  saturn: { title: 'Discipline as devotion', line: 'Structure, limits and time are part of your creative character. Mastery comes slowly, and it lasts.',
    prompts: ['Set a fixed time each day this week, even ten minutes, and keep it.', 'Make something within a strict rule you set yourself.'] },
  neptune: { title: 'Dream material', line: 'Imagination, longing and the invisible run through you. Your work may feel received rather than made.',
    prompts: ['Make something from the last dream you remember.', 'Work to music, eyes half-closed, for twenty minutes.'] },
  uranus: { title: 'The experiment', line: 'You are wired for surprise and invention. Your best work may come from breaking your own rules.',
    prompts: ['Make something with a tool or material you have never used.', 'Take a finished piece and change one thing radically.'] },
  pluto: { title: 'Making as transformation', line: 'Your work goes deep and changes you as you make it. Intensity is not a problem to fix.',
    prompts: ['Take apart something you have made and remake it.', 'Make something about a version of yourself that has ended.'] },
  jupiter: { title: 'Bigger than you planned', line: 'Scale, generosity and faith come naturally. Let the work be larger than is sensible.',
    prompts: ['Make something at twice the size you would normally choose.', 'Write the most ambitious version of your next project.'] },
};

const ELEMENT_THEMES = {
  fire: { title: 'Making from heat', body: 'Fire is the strongest element in your chart. You make from enthusiasm, courage and the energy of beginnings. Speed suits you; overthinking does not.',
    prompts: ['Make something in ten minutes, without stopping.', 'Begin three things today. Finish none of them.'] },
  earth: { title: 'Making with your hands', body: 'Earth is the strongest element in your chart. You make through the body, the senses and patient craft. Your ideas become real when you can touch them.',
    prompts: ['Make something with your hands from materials found outside.', 'Spend twenty minutes making one surface as beautiful as you can.'] },
  air: { title: 'Making with ideas', body: 'Air is the strongest element in your chart. You make through ideas, words and connections. Conversation and notes are not preparation; they are part of the work.',
    prompts: ['Write a manifesto for your work in exactly ten lines.', 'Make something that begins as a conversation.'] },
  water: { title: 'Making from feeling', body: 'Water is the strongest element in your chart. You make from feeling, memory and intuition. Mood is your material.',
    prompts: ['Make something that holds one feeling from today.', 'Make a piece using only the colours of a memory.'] },
};
const MISSING_THEMES = {
  fire: { title: 'Borrowing fire', body: 'None of your planets is in a fire sign. Courage and spontaneity may not come by default, so you build them: deadlines, an audience, a friend who says begin.',
    prompts: ['Make something now, before you feel ready.', 'Show someone a piece while it is still unfinished.'] },
  earth: { title: 'Bringing it down to earth', body: 'None of your planets is in an earth sign. Ideas and feelings come easily; finishing them in material form is the practice.',
    prompts: ['Finish one thing this week, however small.', 'Make something you can hold in one hand.'] },
  air: { title: 'Stepping back', body: 'None of your planets is in an air sign. You are inside your work, and distance is what you reach for. Words, notes and other eyes help.',
    prompts: ['Write three sentences about a piece as if a critic had made it.', 'Explain your work to a child.'] },
  water: { title: 'Letting it be felt', body: 'None of your planets is in a water sign. Feeling may arrive late or sideways, so invite it in on purpose.',
    prompts: ['Make something about someone you miss.', 'Work to a piece of music that moves you, and follow it.'] },
};

const PHASES = [
  { name: 'New Moon', title: 'Beginning in the dark', body: 'You were born near a New Moon, with the Sun and Moon together. You are a natural beginner, and your work starts from instinct, before you can explain it.',
    prompts: ['Start something with no plan at all.', 'Make something by candlelight.'] },
  { name: 'crescent Moon', title: 'Pushing through', body: 'You were born under a crescent Moon. Your creative energy has to push past the old and familiar, and persistence is part of your gift.',
    prompts: ['Return to something you gave up on and take it one step further.', 'Make something your family would not expect from you.'] },
  { name: 'first-quarter Moon', title: 'Building under pressure', body: 'You were born near a first-quarter Moon. You work well against deadlines and in crisis, and decision is part of your craft.',
    prompts: ['Give yourself one hour and a hard deadline.', 'Make three decisions about a piece and change none of them.'] },
  { name: 'gibbous Moon', title: 'Refining', body: 'You were born under a gibbous Moon, just before full. You are driven to adjust, improve and perfect, and analysis is part of how you make.',
    prompts: ['Take an old piece and make a better version.', 'Edit something until it is half its length.'] },
  { name: 'Full Moon', title: 'Making to be seen', body: 'You were born near a Full Moon, with the Sun and Moon facing each other. Your work wants to be seen and shared; another person completes it.',
    prompts: ['Make something for one specific person to see.', 'Show a piece to someone this week and ask what they see.'] },
  { name: 'disseminating Moon', title: 'Sharing what you know', body: 'You were born under a waning, disseminating Moon. You are a natural teacher, and your work wants to be passed on.',
    prompts: ['Teach someone one thing you know how to make.', 'Write instructions for a piece someone else could make.'] },
  { name: 'last-quarter Moon', title: 'Letting go of the old form', body: 'You were born near a last-quarter Moon. You question forms that no longer fit, and reinvention is part of your path.',
    prompts: ['Take apart something you made and rebuild it differently.', 'List the rules your work follows, then break one.'] },
  { name: 'balsamic Moon', title: 'Endings that seed', body: 'You were born under a balsamic Moon, the dark sliver before the New Moon. You work from vision and memory, often ahead of your time.',
    prompts: ['Make something about a future you cannot quite see.', 'Make something alone, in silence, late in the day.'] },
];

const PLANET_PROMPT = {
  sun: 'Make something only you could have made.', moon: 'Make something that comforts you.', mercury: 'Write for twenty minutes without stopping.',
  venus: 'Make the most beautiful thing you can in one hour.', mars: 'Make something fast and physical.', jupiter: 'Make something too big.',
  saturn: 'Make something within a strict limit.', uranus: 'Make something that breaks a rule you follow.', neptune: 'Make something from a dream.',
  pluto: 'Make something you would hesitate to show.',
};
const ELEMENT_PROMPT = { fire: 'Work standing up, quickly, for ten minutes.', earth: 'Make something with your hands, slowly.', air: 'Start with words, then make the image.', water: 'Start from a feeling, not an idea.' };

// ---------- signals ----------
export function chartSignals(chart) {
  const P = Object.fromEntries(chart.points.map(p => [p.key, p]));
  const name = k => P[k] ? P[k].name : k;
  const asc = chart.houses ? chart.houses.asc : null;
  const sig = { P, name };
  // elements, weighted: Sun, Moon and Ascendant count double, the outer planets half
  const w = { sun: 2, moon: 2, mercury: 1, venus: 1, mars: 1, jupiter: 1, saturn: 1, uranus: 0.5, neptune: 0.5, pluto: 0.5 };
  const el = { fire: 0, earth: 0, air: 0, water: 0 }; let total = 0;
  for (const k of PLANETS10) { el[ELEMENTS[signOf(P[k].lon) % 4]] += w[k]; total += w[k]; }
  if (asc !== null) { el[ELEMENTS[signOf(asc) % 4]] += 2; total += 2; }
  sig.elements = Object.fromEntries(ELEMENTS.map(e => [e, el[e] / total]));
  sig.missing = ELEMENTS.filter(e => !PLANETS10.slice(0, 7).some(k => ELEMENTS[signOf(P[k].lon) % 4] === e) && !(asc !== null && ELEMENTS[signOf(asc) % 4] === e));
  // sign and house groupings
  sig.bySign = {}; sig.byHouse = {};
  for (const k of PLANETS10) {
    (sig.bySign[signOf(P[k].lon)] ||= []).push(k);
    if (P[k].house) (sig.byHouse[P[k].house] ||= []).push(k);
  }
  // moon phase: elongation of the Moon from the Sun, in eighths
  sig.phase = Math.floor(norm(P.moon.lon - P.sun.lon) / 45);
  // planets on the angles
  sig.angular = [];
  if (chart.houses) {
    const angles = [['Ascendant', chart.houses.asc], ['Midheaven', chart.houses.mc], ['Descendant', chart.houses.asc + 180], ['IC', chart.houses.mc + 180]];
    for (const k of PLANETS10) for (const [an, lon] of angles) {
      const d = Math.abs(((P[k].lon - lon + 540) % 360) - 180);
      if (d <= 5) sig.angular.push({ k, angle: an, orb: d });
    }
  }
  sig.aspects = chart.aspects.filter(a => PLANETS10.includes(a.a.key) && PLANETS10.includes(a.b.key));
  return sig;
}

// ---------- themes ----------
export function creativeThemes(chart, count = 3) {
  const s = chartSignals(chart), out = [];
  const nm = s.name, timeKnown = !!chart.houses;
  const add = t => out.push(t);

  // 1. Planets gathered in one sign
  for (const [si, ks] of Object.entries(s.bySign)) if (ks.length >= 3) {
    const sign = SIGNS[si], lum = ks.some(k => k === 'sun' || k === 'moon');
    add({ fam: 'sign', score: 0.5 + 0.08 * (ks.length - 3) + (lum ? 0.1 : 0) + (personalCount(ks) ? 0 : -0.2), glyphs: ks.slice(0, 3), title: `Everything in ${sign}`,
      body: `Your ${listNames(ks.map(nm))} gather in ${sign}. Whatever you make tends to come out ${SIGN_INFO[si].how}. That is not a limit; it is your accent.`,
      signals: [`${ks.length} planets in ${sign}`], prompts: [ELEMENT_PROMPT[ELEMENTS[si % 4]], `Make something ${SIGN_INFO[si].how}, on purpose.`] });
  }
  // 2. Planets gathered in one house
  if (timeKnown) for (const [h, ks] of Object.entries(s.byHouse)) {
    const lum = ks.some(k => k === 'sun' || k === 'moon');
    if (ks.length >= 3 || (ks.length >= 2 && lum)) {
      const T = HOUSE_THEMES[h - 1];
      add({ fam: 'house', score: 0.5 + 0.08 * (ks.length - 2) + (lum ? 0.1 : 0) + (personalCount(ks) ? 0 : -0.2), glyphs: ks.slice(0, 3), title: T.title,
        body: `Your ${listNames(ks.map(nm))} ${ks.length > 1 ? 'sit' : 'sits'} in ${T.body}`, signals: [`${listNames(ks.map(nm))} in the ${ord(+h)} house`], prompts: T.prompts });
    }
  }
  // 3. The tightest aspect touching a personal planet
  const used = new Set();
  const tight = s.aspects.filter(a => (PERSONAL.includes(a.a.key) || PERSONAL.includes(a.b.key)) && a.orb <= 3);
  for (const a of tight.slice(0, 3)) {
    const lum = ['sun', 'moon'].includes(a.a.key) || ['sun', 'moon'].includes(a.b.key);
    const A = nm(a.a.key), B = nm(a.b.key), wa = PLANET_INFO[a.a.key].what, wb = PLANET_INFO[a.b.key].what;
    const tone = a.type.tone, base = 0.85 - a.orb * 0.15 + (lum ? 0.05 : 0);
    const sigline = `${A} ${VERB[a.type.key]} ${B}, ${fmtOrb(a.orb)}`;
    const key = [a.a.key, a.b.key].sort().join('-');
    if (tone === 'hard') add({ fam: 'aspect', key, score: base, glyphs: [a.a.key, a.b.key], title: ASPECT_TITLES.hard[firstPersonal(a.a.key, a.b.key)],
      body: `The tightest line of tension in your chart joins your ${A} and your ${B}${a.orb < 0.5 ? ', almost to the minute' : ''}: ${wa}, pulling against ${wb}. Energy arrives as friction rather than ease. Treat the resistance as material, not an obstacle.`,
      signals: [sigline], prompts: ['Choose a limit: one colour, one hour, the other hand.', 'Make two pieces that argue with each other.'] });
    else if (tone === 'soft') add({ fam: 'aspect', key, score: base - 0.1, glyphs: [a.a.key, a.b.key], title: ASPECT_TITLES.soft[firstPersonal(a.a.key, a.b.key)],
      body: `Your ${A} and ${B} work together easily: ${wa}, helped by ${wb}. What comes without effort is easy to undervalue. Use this gift on purpose.`,
      signals: [sigline], prompts: ['Make something in the medium that comes easiest to you, and take it further than usual.', 'Notice one thing you do without effort, and write it down.'] });
    else add({ fam: 'aspect', key, score: base - 0.05, glyphs: [a.a.key, a.b.key], title: ASPECT_TITLES.neutral[firstPersonal(a.a.key, a.b.key)],
      body: `Your ${A} and ${B} sit together and act as one: ${wa}, fused with ${wb}. Your work speaks with both voices at once.`,
      signals: [sigline], prompts: ['Make something that is two things at once.', 'Put two interests that never meet into one piece.'] });
  }
  // 4. Outer planets touching the Sun, Moon, Venus or Mercury
  for (const a of s.aspects) {
    const outer = OUTER_THEMES[a.a.key] ? a.a : OUTER_THEMES[a.b.key] ? a.b : null;
    const inner = outer === a.a ? a.b : a.a;
    if (!outer || !['sun', 'moon', 'venus', 'mercury', 'mars'].includes(inner.key) || a.orb > 4) continue;
    const T = OUTER_THEMES[outer.key], lum = ['sun', 'moon'].includes(inner.key);
    add({ fam: 'outer-' + outer.key, key: [a.a.key, a.b.key].sort().join('-'), score: 0.62 - a.orb * 0.05 + (lum ? 0.1 : 0), glyphs: [outer.key, inner.key], title: T.title,
      body: `${outer.name} meets your ${inner.name} (${a.type.name.toLowerCase()}, ${fmtOrb(a.orb)}). ${T.line}`, signals: [`${inner.name} ${VERB[a.type.key]} ${outer.name}, ${fmtOrb(a.orb)}`], prompts: T.prompts });
  }
  // 5. The strongest and missing elements
  const [topEl, share] = Object.entries(s.elements).sort((x, y) => y[1] - x[1])[0];
  if (share >= 0.38) add({ fam: 'element', score: 0.5 + (share - 0.38), glyphs: [], ...ELEMENT_THEMES[topEl], signals: [`${Math.round(share * 100)}% ${topEl}, weighted`] });
  for (const e of s.missing) add({ fam: 'missing', score: 0.56, glyphs: [], ...MISSING_THEMES[e], signals: [`No planets in ${e} signs`] });
  // 6. Planets on the angles
  for (const g of s.angular) {
    add({ fam: 'angle', score: 0.7 - g.orb * 0.04, glyphs: [g.k], title: `${nm(g.k)} on the threshold`,
      body: `Your ${nm(g.k)} sits close to your ${g.angle}, one of the four strongest points in the chart. ${cap(PLANET_INFO[g.k].what)}: this is turned up loud in you.`,
      signals: [`${nm(g.k)} ${fmtOrb(g.orb)} from the ${g.angle}`], prompts: [PLANET_PROMPT[g.k], ELEMENT_PROMPT[ELEMENTS[signOf(s.P[g.k].lon) % 4]]] });
  }
  // 7. Retrograde personal planets
  for (const k of ['mercury', 'venus', 'mars']) if (s.P[k].retro) add({ fam: 'retro', score: 0.46, glyphs: [k], title: 'Turning back to go forward',
    body: `Your ${nm(k)} was retrograde when you were born, so ${PLANET_INFO[k].what} turns inward first. Revision, return and reworking are your methods.`,
    signals: [`${nm(k)} retrograde`], prompts: ['Return to a piece from years ago and respond to it.', 'Make something, then remake it from memory.'] });
  // 8. Moon phase at birth (always present)
  const ph = PHASES[s.phase];
  add({ fam: 'phase', score: 0.44, glyphs: ['sun', 'moon'], title: ph.title, body: ph.body, signals: [`Born under a ${ph.name}`], prompts: ph.prompts });
  // 9. Rising sign (always present with a birth time)
  if (timeKnown) { const ri = signOf(chart.houses.asc);
    add({ fam: 'rising', score: 0.38, glyphs: [], title: 'The way in', body: `${RISING[ri]} Your rising sign is how your work first meets people.`, signals: [`${SIGNS[ri]} rising`], prompts: [ELEMENT_PROMPT[ELEMENTS[ri % 4]], 'Make the first thing a stranger should see of your work.'] }); }

  // choose: highest scores, one per family, never the same pair of planets twice
  out.sort((x, y) => y.score - x.score);
  const chosen = [], fams = new Set(), keys = new Set();
  for (const t of out) {
    const fam = t.fam.startsWith('outer-') ? 'outer' : t.fam;
    if (fams.has(fam) || (t.key && keys.has(t.key))) continue;
    chosen.push(t); fams.add(fam); if (t.key) keys.add(t.key);
    if (chosen.length === count) break;
  }
  return chosen.map((t, i) => ({ ...t, n: String(i + 1).padStart(2, '0') }));
}

// Invitations: the prompts of the chosen themes, in rotation. The week number picks this week's.
export function invitations(themes) {
  const list = [];
  for (let i = 0; i < 2; i++) for (const t of themes) if (t.prompts[i]) list.push({ text: t.prompts[i], from: t.title });
  return list;
}
export function weekIndex(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return Math.floor((d - Date.UTC(2026, 0, 5)) / (7 * 86400000));
}
