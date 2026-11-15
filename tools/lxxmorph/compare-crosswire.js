#!/usr/bin/env node
// Abgleich der lxx-morph-Bestimmungen mit dem CrossWire-SWORD-Modul „LXX“ (CATSS-LXXM, von Tyndale House überarbeitet; Packard-Codes).
// Das Modul hat eine nicht-kommerzielle Lizenz: es wird hier NUR gelesen und gezählt – nichts daraus geht in Safran ein, und die Datei
// gehört nicht ins Projekt. Aufruf:
//   node tools/lxxmorph/compare-crosswire.js <lxx-morph> <crosswire_lxx.json> [<STEPBible-Data>] [--examples]
// crosswire_lxx.json: { "Gen.1.1": [["strong:G1722", "packard:P", "ἐν"], …], … } (aus dem Modul mit einem SWORD-Werkzeug ausgelesen).
// Verglichen werden Verse mit derselben Kapitel- und Verszahl, die Wörter über die längste gemeinsame Folge (ohne Akzente).
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const G = require(path.join(root, 'gmorph.js'));
const B = require('./build.js');

const BOOKS = { Gen: 'genesis', Exod: 'exodus', Lev: 'leviticus', Num: 'numbers', Deut: 'deuteronomy', Josh: 'joshua-vaticanus-b', Judg: 'judges', Ruth: 'ruth', '1Sam': '1-samuel', '2Sam': '2-samuel', '1Kgs': '1-kings', '2Kgs': '2-kings',
  '1Chr': '1-chronicles', '2Chr': '2-chronicles', '1Esd': '1-esdras', Ezra: '2-esdras', Neh: '2-esdras', Esth: 'esther-greek', Jdt: 'judith', Tob: 'tobit', '1Macc': '1-maccabees', '2Macc': '2-maccabees', '3Macc': '3-maccabees', '4Macc': '4-maccabees',
  Ps: 'psalms-lxx', Prov: 'proverbs', Eccl: 'ecclesiastes', Song: 'song-of-solomon', Job: 'job-lxx', Wis: 'wisdom', Sir: 'sirach', PssSol: 'psalms-of-solomon', Hos: 'hosea', Amos: 'amos', Mic: 'micah', Joel: 'joel', Obad: 'obadiah', Jonah: 'jonah',
  Nah: 'nahum', Hab: 'habakkuk', Zeph: 'zephaniah', Hag: 'haggai', Zech: 'zechariah', Mal: 'malachi', Isa: 'isaiah', Jer: 'jeremiah-lxx', Bar: 'baruch', Lam: 'lamentations', EpJer: 'letter-of-jeremiah', Ezek: 'ezekiel',
  Sus: 'susanna-theodotion', Dan: 'daniel-theodotion', Bel: 'bel-and-the-dragon-theodotion', Odes: 'odes' };
const CLS = c => (c.startsWith('RA') ? 'T' : c[0] === 'R' ? 'P' : c[0] === 'P' ? 'R' : 'NAVCDXIM'.includes(c[0]) ? c[0] : '?');
const OUR = { E: 'N' }; // Eigennamen sind bei Packard Nomen
const CASE = { N: 'nom', G: 'gen', D: 'dat', A: 'acc', V: 'voc' }, NUM = { S: 'sg', P: 'pl', D: 'dual' }, GEN = { M: 'masc', F: 'fem', N: 'neut' };
const TENSE = { P: 'pres', I: 'imperf', F: 'fut', A: 'aor', X: 'perf', Y: 'plup' }, VOICE = { A: 'act', M: 'mid', P: 'pass' }, MOOD = { I: 'ind', D: 'imperat', S: 'subj', O: 'opt', N: 'inf', P: 'ptc' };
// Packard-Code -> Merkmale
function packard(code) {
  const c = String(code || '').replace(/^packard:/, ''); if (!c || c.includes('+')) return null; // Krasis (κἀγώ): nicht vergleichbar
  const [type, p = ''] = c.split('-'), f = { cls: CLS(type) };
  if (f.cls === 'V') {
    f.tense = TENSE[p[0]]; f.voice = VOICE[p[1]]; f.mood = MOOD[p[2]];
    if (f.mood === 'ptc') { f.case = CASE[p[3]]; f.number = NUM[p[4]]; f.gender = GEN[p[5]]; } else if (f.mood !== 'inf') { f.person = p[3]; f.number = NUM[p[4]]; }
  } else if (p) { f.case = CASE[p[0]]; f.number = NUM[p[1]]; f.gender = GEN[p[2]]; }
  return f;
}
function compare(morphDir, cwFile, stepDir) {
  const cw = JSON.parse(fs.readFileSync(cwFile, 'utf8'));
  const strong = new Map(); // Strong-Nummer -> Lemma (nur für den Lemma-Vergleich)
  if (stepDir) for (const f of fs.readdirSync(path.join(stepDir, 'Lexicons')).filter(x => /^(TBESG|TFLSJ)/.test(x))) for (const ln of fs.readFileSync(path.join(stepDir, 'Lexicons', f), 'utf8').split('\n')) {
    const c = ln.split('\t'); if (/^G\d+/.test(c[0]) && c[3]) { const k = c[0].replace(/^G0*(\d+).*$/, '$1'); if (!strong.has(k)) strong.set(k, new Set()); for (const l of c[3].split(/,\s*/)) strong.get(k).add(G.fold(l)); }
  }
  const stem = l => G.fold(l).replace(/(ομαι|υμι|υω|ω|οσ|ουσ|εοσ|ον|η|α)$/, '');
  const cache = new Map(), ours = slug => { // Buch -> Map „Kapitel:Vers“ -> Wörter (Buchstabenverse beim Grundvers)
    if (!cache.has(slug)) { const m = new Map(); for (const v of B.loadBook(morphDir, slug)) { const k = v.ch + ':' + v.v; m.set(k, (m.get(k) || []).concat(v.toks)); } cache.set(slug, m); }
    return cache.get(slug);
  };
  const S = { verses: 0, noVerse: 0, cw: 0, paired: 0, cls: [0, 0], case: [0, 0], number: [0, 0], gender: [0, 0], tense: [0, 0], voice: [0, 0], mood: [0, 0], person: [0, 0], all: [0, 0], lemma: [0, 0] };
  const ex = { cls: new Map(), tense: new Map(), case: new Map(), lemma: new Map() };
  const note = (k, s) => ex[k].set(s, (ex[k].get(s) || 0) + 1);
  const hit = (k, ok) => { S[k][1]++; if (ok) S[k][0]++; return ok; };
  for (const ref of Object.keys(cw)) {
    const [bk, c0, v0] = ref.split('.'), slug = BOOKS[bk]; if (!slug) continue;
    const ch = bk === 'Neh' ? +c0 + 10 : +c0, toks = ours(slug).get(ch + ':' + +v0), cv = cw[ref].filter(t => t[2] && G.GREEK.test(t[2]));
    S.cw += cv.length;
    if (!toks) { S.noVerse++; continue; }
    S.verses++;
    for (const [a, b] of B.lcs(cv.map(t => G.fold(t[2])), toks.map(t => G.fold(t.s)))) {
      const p = packard(cv[a][1]); if (!p || p.cls === '?') continue;
      const t = toks[b], f = G.feat(t.k); S.paired++;
      let all = hit('cls', (OUR[f.pos] || f.pos) === p.cls);
      if (!all) note('cls', `${t.s}: ${t.k} ≠ ${cv[a][1]}`);
      const set = (k, mine, theirs) => { if (theirs == null || mine == null || (Array.isArray(mine) && !mine.length)) return; const ok = hit(k, Array.isArray(mine) ? mine.includes(theirs) : mine === theirs); if (!ok) { all = false; if (ex[k]) note(k, `${t.s}: ${t.k} ≠ ${cv[a][1]}`); } };
      if (all) { // Merkmale nur vergleichen, wenn die Wortart übereinstimmt
        set('case', f.case, p.case); set('number', f.number, p.number); set('gender', f.gender, p.gender);
        set('tense', f.tense, p.tense); set('mood', f.mood, p.mood); set('person', f.person, p.person);
        if (p.voice && f.voice) { const ok = hit('voice', f.voice === p.voice || (f.voice.includes('/') && f.voice.split('/').includes(p.voice))); if (!ok) all = false; }
      }
      hit('all', all);
      const sn = /strong:G0*(\d+)/.exec(cv[a][0] || ''), ls = sn && strong.get(sn[1]);
      if (ls) { const ok = hit('lemma', ls.has(G.fold(t.l)) || [...ls].some(l => stem(l) === stem(t.l))); if (!ok) note('lemma', `${t.l} ≠ ${[...ls].join('/')}`); }
    }
  }
  return { S, ex };
}
module.exports = { compare, packard };
if (require.main === module) {
  const a = process.argv.slice(2).filter(x => !x.startsWith('--'));
  if (a.length < 2) { console.error('Aufruf: node tools/lxxmorph/compare-crosswire.js <lxx-morph> <crosswire_lxx.json> [<STEPBible-Data>] [--examples]'); process.exit(1); }
  const { S, ex } = compare(a[0], a[1], a[2]);
  const pc = ([ok, n]) => `${(ok / n * 100).toFixed(2)} % (${ok.toLocaleString('de-DE')} von ${n.toLocaleString('de-DE')})`;
  console.log(`CrossWire-Wörter: ${S.cw.toLocaleString('de-DE')} · verglichene Verse: ${S.verses} (ohne Gegenstück: ${S.noVerse}) · gepaarte Wörter: ${S.paired.toLocaleString('de-DE')} (${(S.paired / S.cw * 100).toFixed(1)} %)`);
  for (const [k, name] of [['cls', 'Wortart'], ['case', 'Kasus'], ['number', 'Numerus'], ['gender', 'Genus'], ['tense', 'Tempus'], ['mood', 'Modus'], ['voice', 'Genus verbi'], ['person', 'Person'], ['all', 'ganze Bestimmung'], ['lemma', 'Lemma (über Strong-Nummer)']]) console.log(`  ${name.padEnd(28)} ${pc(S[k])}`);
  if (process.argv.includes('--examples')) for (const k of Object.keys(ex)) console.log(`\n${k}: ` + [...ex[k]].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([s, n]) => `${s} ×${n}`).join(' | '));
}
