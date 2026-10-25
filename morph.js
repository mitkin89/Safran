// Entschlüsselt die Morphologie-Codes der Open Scriptures Hebrew Bible (OSHB, z. B. "HVqp3ms") ins Deutsche.
// Läuft in Node (Tests) und als <script> in der Oberfläche (window.Morph).
const G = { m: 'm.', f: 'f.', c: 'c.', b: 'm./f.', x: '' };
const N = { s: 'Sg.', p: 'Pl.', d: 'Du.', x: '' };
const ST = { a: 'absolut', c: 'Status constructus', d: 'bestimmt' };
const PERS = { 1: '1. Pers.', 2: '2. Pers.', 3: '3. Pers.', x: '' };
const STEM_H = { q: 'Qal', N: 'Nif‘al', p: 'Pi‘el', P: 'Pu‘al', h: 'Hif‘il', H: 'Hof‘al', t: 'Hitpa‘el', o: 'Polel', O: 'Polal', r: 'Hitpolel', m: 'Po‘el', M: 'Po‘al', k: 'Palel', K: 'Pulal', Q: 'Qal passiv', l: 'Pilpel', L: 'Polpal', f: 'Hitpalpel', D: 'Nitpa‘el', j: 'Pe‘al‘al', i: 'Pilel', u: 'Hotpa‘al', c: 'Tif‘il', v: 'Hischtaf‘el', w: 'Nitpalel', y: 'Nitpo‘el', z: 'Hitpo‘el' };
const STEM_A = { q: 'Pe‘al', Q: 'Pe‘il', u: 'Hitpe‘el', p: 'Pa‘el', P: 'Itpa‘al', M: 'Hitpa‘al', a: 'Af‘el', h: 'Haf‘el', s: 'Saf‘el', e: 'Schaf‘el', H: 'Hof‘al', i: 'Itpe‘el', t: 'Hischtaf‘al', v: 'Ischtaf‘al', w: 'Hitaf‘al', o: 'Polel', z: 'Itpo‘el', r: 'Hitpolel', f: 'Hitpalpal', b: 'Hef‘al', c: 'Hitpe‘el', m: 'Po‘el', l: 'Palpel', L: 'Itpalpel', O: 'Itpolel', G: 'Itaf‘al' };
const VT = { p: 'Perfekt', q: 'Perfekt consecutivum (wᵉqatal)', i: 'Imperfekt', w: 'Imperfekt consecutivum (wajjiqtol)', h: 'Kohortativ', j: 'Jussiv', v: 'Imperativ', r: 'Partizip aktiv', s: 'Partizip passiv', a: 'Infinitivus absolutus', c: 'Infinitivus constructus' };
const PRON = { d: 'Demonstrativpronomen', f: 'Indefinitpronomen', i: 'Interrogativpronomen', p: 'Personalpronomen', r: 'Relativpronomen' };
const PART = { a: 'Bejahungspartikel', d: 'Artikel', e: 'Aufforderungspartikel', i: 'Fragepartikel', j: 'Interjektion', m: 'Demonstrativpartikel', n: 'Negation', o: 'Akkusativzeichen (את)', r: 'Relativpartikel (אשר)' };
const SUF = { d: 'Richtungs-He', h: 'He paragogicum', n: 'Nun paragogicum', p: 'Pronominalsuffix' };
const ADJ = { a: 'Adjektiv', c: 'Kardinalzahl', g: 'Gentilizium', o: 'Ordinalzahl' };
const NOUN = { c: 'Nomen', g: 'Gentilizium', p: 'Eigenname' };
// Hebräische Präfixe der Lemma-Teile (b/c/d/…)
const PREFIX = { b: 'in, mit (בְּ)', c: 'und (וְ)', d: 'der/die/das (הַ)', k: 'wie, gemäß (כְּ)', l: 'zu, für (לְ)', m: 'von, aus (מִן)', s: 'welcher (שֶׁ)', i: 'Fragepartikel (הֲ)' };
const join = a => a.filter(Boolean).join(', ');
function gnn(g, n, s) { return join([G[g], N[n], s && ST[s]]); }

// Ein Segment (ohne Sprachkennzeichen vorn), lang = 'H' | 'A'
function segment(code, lang) {
  const pos = code[0], r = code.slice(1);
  switch (pos) {
    case 'A': return { pos: ADJ[r[0]] || 'Adjektiv', info: gnn(r[1], r[2], r[3]) };
    case 'C': return { pos: 'Konjunktion', info: '' };
    case 'D': return { pos: 'Adverb', info: '' };
    case 'N': return { pos: NOUN[r[0]] || 'Nomen', info: r[0] === 'p' ? '' : gnn(r[1], r[2], r[3]) };
    case 'P': return { pos: PRON[r[0]] || 'Pronomen', info: join([PERS[r[1]], G[r[2]], N[r[3]]]) };
    case 'R': return { pos: 'Präposition', info: r[0] === 'd' ? 'mit Artikel' : '' };
    case 'S': return { pos: r[0] === 'p' ? 'Pronominalsuffix' : (SUF[r[0]] || 'Suffix'), info: r[0] === 'p' ? join([PERS[r[1]], G[r[2]], N[r[3]]]) : '' };
    case 'T': return { pos: PART[r[0]] || 'Partikel', info: '' };
    case 'V': {
      const stem = (lang === 'A' ? STEM_A : STEM_H)[r[0]] || r[0];
      const t = r[1], type = VT[t] || t;
      let info;
      if (t === 'r' || t === 's') info = gnn(r[2], r[3], r[4]);
      else if (t === 'a' || t === 'c') info = '';
      else info = join([PERS[r[2]], G[r[3]], N[r[4]]]);
      return { pos: 'Verb', stem, tense: type, info };
    }
    default: return { pos: code, info: '' };
  }
}

// morph: "HR/Ncfsa", lemma: "b/7225" → { segs:[{lemma?, prefix?, pos, stem?, tense?, info}], main: Index des Hauptwortes }
function decode(morph, lemma) {
  morph = String(morph || ''); lemma = String(lemma || '');
  if (!morph) return null;
  const lang = morph[0] === 'A' ? 'A' : 'H';
  const ms = morph.slice(1).split('/'), ls = lemma.split('/');
  const segs = [];
  let main = -1, li = 0;
  ms.forEach(code => {
    const s = segment(code, lang);
    const isSuffix = code[0] === 'S';
    if (!isSuffix) {
      const l = ls[li++] || '';
      if (/^\d/.test(l)) { s.lemma = l; if (main < 0) main = segs.length; }
      else if (l) s.prefix = PREFIX[l] || l;
    }
    if (isSuffix) s.suffix = true;
    segs.push(s);
  });
  // Falls kein Lemma-Teil numerisch war (z. B. nur Präfix + Suffix), das erste Nicht-Suffix-Segment als Hauptwort nehmen
  if (main < 0) main = Math.max(0, segs.findIndex(s => !s.suffix));
  return { lang, segs, main };
}

const exp = { decode, segment, PREFIX };
if (typeof module !== 'undefined' && module.exports) module.exports = exp; else window.Morph = exp;
