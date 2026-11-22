// Griechische Morphologie der Septuaginta (lxx-morph von Seth Kushniryk, CC BY 4.0; Index lxx-morph.js, erzeugt mit tools/lxxmorph/build.js).
// Läuft in Node (Tests, Werkzeuge, Suche) und als <script> in der Oberfläche (window.GMorph).
//  - words(html)            die angezeigten griechischen Wörter eines Verses (so zählen Werkzeug, Suche und Oberfläche gleich)
//  - verse(D, bi, ch, v)    Bestimmungen je Wort eines Verses          -> [{ id, low, guess } | null]
//  - info(D, id)            eine Bestimmung                            -> { lemma, gloss, key, form }
//  - describe(key, t)       Schlüssel („V aor ind act 3rd sg“) deutsch -> { pos, info }
//  - dictionaryLemmas(D, head) belegte Lemmata eines Wörterbuch-Stichworts -> Wortkarten
//  - model / render / refs / dist / refsIn / topForms: Formentabelle und Wortkarte (gleiche Schnittstelle wie forms.js)
// Es werden nur belegte Formen gezeigt, keine ergänzten Paradigmen.
(function () {
  'use strict';

  // ---------- Wörter ----------
  // Vergleichsform: nur Buchstaben, ohne Akzente/Spiritus/Iota subscriptum, klein, σ für ς
  const fold = s => String(s).normalize('NFD').replace(/[^\p{L}]/gu, '').toLowerCase().replace(/ς/g, 'σ');
  // Iota subscriptum/adscriptum sind im CATSS und Morphologieindex teils verschieden geschrieben:
  // z. B. αἴσωμεν im Text und ᾄσωμεν im Index. Nur für den Abgleich der belegten Form.
  const sameForm = (a, b) => fold(a) === fold(b) || fold(String(a).normalize('NFD').replace(/\u0345/g, 'ι')) === fold(String(b).normalize('NFD').replace(/\u0345/g, 'ι'));
  // Anzeigeform einer Wortform: Gravis -> Akut, zweiter Akzent vor Enklitikon weg, Apostroph einheitlich
  function form(s) {
    let d = String(s).normalize('NFD').replace(/̀/g, '́').replace(/[᾿’'ʼ]/g, '’').replace(/[^\p{L}\p{M}’]/gu, '');
    const acc = d.match(/[́͂]/g) || [];
    if (acc.length > 1) { const i = d.lastIndexOf('́'); if (i >= 0) d = d.slice(0, i) + d.slice(i + 1); }
    return d.normalize('NFC');
  }
  const WORD = /[\p{L}\p{M}]+[᾿’'ʼ]?/gu;
  const GREEK = /[Ͱ-Ͽἀ-῿]/;
  // Text eines Verses ohne Auszeichnung; <small>…</small> (Zählungshinweise, Versbuchstaben) zählt nicht mit
  const plain = html => String(html == null ? '' : html).replace(/<small\b[^>]*>.*?<\/small>/g, ' ').replace(/<[^>]+>/g, ' ');
  const wordsOf = text => (String(text).match(WORD) || []).filter(w => GREEK.test(w));
  const words = html => wordsOf(plain(html));

  // ---------- Kodierung der Wortfolgen ----------
  // Je Kapitel eine Zeichenkette, Verse durch Leerzeichen getrennt, je Wort ein Code von 1–3 Zeichen:
  //   1 Zeichen = eine der häufigsten Bestimmungen (hot[0 … A-1]), 2 Zeichen = hot[A … A+B·89-1], 3 Zeichen = Nummer der Bestimmung;
  //   davor „~“ = geringe Sicherheit, „`“ = nur aus der Wortform erschlossen; „!“ = Wort ohne Bestimmung
  const ALPH = (() => { let s = ''; for (let c = 35; c <= 125; c++) if (c !== 92 && c !== 96) s += String.fromCharCode(c); return s; })();
  const BASE = ALPH.length; // 89
  const VAL = new Int16Array(128).fill(-1); for (let i = 0; i < BASE; i++) VAL[ALPH.charCodeAt(i)] = i;
  function encoder(nEntries, hot, A = 40) {
    const lead3 = Math.max(1, Math.ceil(nEntries / (BASE * BASE))), B = BASE - A - lead3;
    if (B < 1) throw new Error('zu viele Bestimmungen für die Kodierung');
    const short = new Map();
    hot.slice(0, A + B * BASE).forEach((id, k) => short.set(id, k < A ? ALPH[k] : ALPH[A + Math.floor((k - A) / BASE)] + ALPH[(k - A) % BASE]));
    const enc = id => short.get(id) || (ALPH[A + B + Math.floor(id / (BASE * BASE))] + ALPH[Math.floor(id / BASE) % BASE] + ALPH[id % BASE]);
    return { A, B, enc, hotLen: A + B * BASE };
  }
  // eine Vers-Zeichenkette -> [{ id, low, guess } | null]
  function decode(D, s) {
    const out = [], A = D.cA, B = D.cB, hot = ix(D).hot;
    for (let i = 0; i < s.length;) {
      let low = false, guess = false, c = s.charCodeAt(i);
      if (c === 33) { out.push(null); i++; continue; }
      if (c === 126) { low = true; c = s.charCodeAt(++i); } else if (c === 96) { guess = true; c = s.charCodeAt(++i); }
      const a = VAL[c];
      let id;
      if (a < A) { id = hot[a]; i++; }
      else if (a < A + B) { id = hot[A + (a - A) * BASE + VAL[s.charCodeAt(i + 1)]]; i += 2; }
      else { id = (a - A - B) * BASE * BASE + VAL[s.charCodeAt(i + 1)] * BASE + VAL[s.charCodeAt(i + 2)]; i += 3; }
      out.push({ id, low, guess });
    }
    return out;
  }

  // ---------- Zugriff ----------
  const IX = new WeakMap();
  // flache Tabellen zu den Bestimmungen (einmal je geladenem Index)
  function ix(D) {
    let x = IX.get(D); if (x) return x;
    const lemma = [], gloss = [], eLem = [], eKey = [], eForm = [], first = [], byLemma = new Map();
    D.L.forEach((rec, li) => {
      const [l, g, rest] = rec.split('\t');
      lemma.push(l); gloss.push(g || ''); byLemma.set(l, li); first.push(eLem.length);
      if (rest) for (const grp of rest.split(';')) {
        const eq = grp.indexOf('='), k = parseInt(grp.slice(0, eq), 36);
        for (const f of grp.slice(eq + 1).split(',')) { eLem.push(li); eKey.push(k); eForm.push(f); }
      }
    });
    first.push(eLem.length);
    x = { lemma, gloss, eLem, eKey, eForm, first, byLemma, hot: D.hot.split(',').map(s => parseInt(s, 36)), books: new Map(D.B.map((b, i) => [b[0] + '\u0000' + b[1], i])), occ: null };
    IX.set(D, x); return x;
  }
  const bookIndex = (D, title, versionTitle) => { const i = ix(D).books.get(title + '\u0000' + versionTitle); return i == null ? -1 : i; };
  const hasBook = (D, title, versionTitle) => bookIndex(D, title, versionTitle) >= 0;
  // Bestimmungen der Wörter eines Verses (ch, v ab 1); null, wenn der Vers nicht verzeichnet ist
  function verse(D, bi, ch, v) {
    const b = D.B[bi], c = b && b[3][ch - 1]; if (c == null) return null;
    const s = c.split(' ')[v - 1]; return s == null ? null : decode(D, s);
  }
  function info(D, id) {
    const x = ix(D), li = x.eLem[id]; if (li == null) return null;
    return { id, lemma: x.lemma[li], gloss: x.gloss[li], key: D.P[x.eKey[id]], form: x.eForm[id] };
  }
  const lemmaInfo = (D, lemma) => { const x = ix(D), li = x.byLemma.get(lemma); return li == null ? null : { lemma, gloss: x.gloss[li], li }; };
  // Lemma zu einer Eingabe finden: genau, sonst ohne Akzente (das häufigste)
  function findLemma(D, q) {
    const x = ix(D); q = String(q || '').trim().normalize('NFC');
    if (x.byLemma.has(q)) return q;
    if (!x.foldLem) { x.foldLem = new Map(); x.lemma.forEach(l => { const f = fold(l); if (!x.foldLem.has(f)) x.foldLem.set(f, []); x.foldLem.get(f).push(l); }); }
    const c = x.foldLem.get(fold(q)); if (!c) return null;
    if (c.length === 1) return c[0];
    const o = occ(D); return c.slice().sort((a, b) => o.lemN[x.byLemma.get(b)] - o.lemN[x.byLemma.get(a)])[0];
  }
  // Wörterbuchartikel -> belegte griechische Lemmata. Mehrere Stichwörter
  // desselben Artikels behalten eigene Zugänge; unbekannte Wörter bleiben ohne Karte.
  function dictionaryLemmas(D, head) {
    const found = new Set();
    for (const h of String(head || '').split(/[·,;/]/)) {
      if (!GREEK.test(h)) continue;
      const lemma = findLemma(D, h.trim());
      if (lemma && occ(D).lemN[ix(D).byLemma.get(lemma)] > 0) found.add(lemma);
    }
    return [...found];
  }
  // Buchname eines Stroms: Titel in Safran, bei zwei Fassungen desselben Buches mit Kennzeichen (A, B, Theodotion, Sinaiticus)
  const bookId = b => b[0] + (b[2] ? ' (' + b[2] + ')' : '');

  // ---------- Vorkommen ----------
  // alle Wörter einmal durchgehen: je Bestimmung die Verse (Versnummer über alle Bücher), als verkettete Felder
  function occ(D) {
    const x = ix(D); if (x.occ) return x.occ;
    const nE = x.eLem.length, cnt = new Int32Array(nE + 1), vb = [], vc = [], vv = [], bStart = [], bSize = [];
    const toks = [], tv = [];
    D.B.forEach((b, bi) => {
      bStart.push(vb.length); let size = 0;
      if (b[4]) { bSize.push(0); return; } // derselbe Text steht schon in einem anderen Buch (Gebet Manasses = Ode 12): nicht doppelt zählen
      b[3].forEach((c, ci) => { if (!c) return; c.split(' ').forEach((s, vi) => {
        if (!s) return;
        const n = vb.length; vb.push(bi); vc.push(ci + 1); vv.push(vi + 1); size++;
        for (const t of decode(D, s)) if (t) { toks.push(t.id); tv.push(n); cnt[t.id + 1]++; }
      }); });
      bSize.push(size);
    });
    for (let i = 0; i < nE; i++) cnt[i + 1] += cnt[i];
    const pos = cnt.slice(), list = new Int32Array(toks.length);
    for (let i = 0; i < toks.length; i++) list[pos[toks[i]]++] = tv[i];
    const lemN = new Int32Array(x.lemma.length);
    for (let li = 0; li < x.lemma.length; li++) lemN[li] = cnt[x.first[li + 1]] - cnt[x.first[li]];
    x.occ = { start: cnt, list, vb, vc, vv, bSize, lemN, total: toks.length };
    return x.occ;
  }
  // Belegstellen einer oder mehrerer Formen (i = Nummern in mdl.forms, mit Komma): [{ book, title, ch, v, n }]
  function refs(D, mdl, i) {
    const o = occ(D), idx = [];
    for (const k of String(i).split(',')) { const f = mdl.forms[+k]; if (f) for (let j = o.start[f.id]; j < o.start[f.id + 1]; j++) idx.push(o.list[j]); }
    idx.sort((a, b) => a - b);
    const out = []; let last = -1;
    for (const n of idx) { if (n === last) out[out.length - 1].n++; else { const b = D.B[o.vb[n]]; out.push({ book: bookId(b), title: b[0], vt: b[1], ch: o.vc[n], v: o.vv[n], n: 1 }); last = n; } }
    return out;
  }
  const allForms = mdl => mdl.forms.map((_, i) => i).join(',');
  // Vorkommen je Buch (Reihenfolge der Ströme): [{ book, title, tag, n, verses, size }]
  function dist(D, mdl) {
    const o = occ(D), out = D.B.map((b, i) => ({ book: bookId(b), title: b[0], tag: b[2] || '', n: 0, verses: 0, size: o.bSize[i], dup: !!b[4] })).filter(x => !x.dup);
    const at = new Map(out.map((x, i) => [x.book, i]));
    for (const r of refs(D, mdl, allForms(mdl))) { const x = out[at.get(r.book)]; x.n += r.n; x.verses++; }
    return out;
  }
  const refsIn = (D, mdl, book) => refs(D, mdl, allForms(mdl)).filter(r => r.book === book);
  function topForms(mdl, k = 8) {
    const m = new Map();
    mdl.forms.forEach((x, i) => { const y = m.get(x.f); if (y) { y.n += x.n; y.i += ',' + i; } else m.set(x.f, { f: x.f, n: x.n, i: String(i), pre: false }); });
    const all = [...m.values()].filter(x => x.n).sort((a, b) => b.n - a.n || (a.f < b.f ? -1 : 1));
    return { list: all.slice(0, k), kinds: all.length };
  }

  // ---------- Bestimmung lesen ----------
  const POS = { V: 'Verb', N: 'Nomen', E: 'Eigenname', A: 'Adjektiv', T: 'Artikel', P: 'Pronomen', R: 'Präposition', C: 'Konjunktion', D: 'Adverb', X: 'Partikel', I: 'Interjektion', M: 'Zahlwort', Y: 'Transkription' };
  const TENSE = { pres: 'Präsens', imperf: 'Imperfekt', fut: 'Futur', aor: 'Aorist', perf: 'Perfekt', plup: 'Plusquamperfekt', futperf: 'Futur II' };
  const MOOD = { ind: 'Indikativ', subj: 'Konjunktiv', opt: 'Optativ', imperat: 'Imperativ', inf: 'Infinitiv', ptc: 'Partizip' };
  const VOICE = { act: 'Aktiv', mid: 'Medium', pass: 'Passiv', 'mid/pass': 'Medium/Passiv', 'act/pass': 'Aktiv/Passiv' };
  const CASE = { nom: 'Nominativ', gen: 'Genitiv', dat: 'Dativ', acc: 'Akkusativ', voc: 'Vokativ' };
  const CASE_S = { nom: 'Nom.', gen: 'Gen.', dat: 'Dat.', acc: 'Akk.', voc: 'Vok.' };
  const GENDER = { masc: 'm.', fem: 'f.', neut: 'n.' };
  const NUMBER = { sg: 'Sg.', pl: 'Pl.', dual: 'Du.' };
  const DEGREE = { comp: 'Komparativ', superl: 'Superlativ' };
  const TENSE_ORDER = ['pres', 'imperf', 'fut', 'aor', 'perf', 'plup', 'futperf'], MOOD_ORDER = ['ind', 'subj', 'opt', 'imperat', 'inf', 'ptc'];
  const VOICE_ORDER = ['act', 'mid', 'mid/pass', 'pass', 'act/pass'], CASE_ORDER = ['nom', 'gen', 'dat', 'acc', 'voc'], GENDER_ORDER = ['masc', 'fem', 'neut'], NUMBER_ORDER = ['sg', 'dual', 'pl'];
  const FEAT = new Map(); // Schlüssel -> Merkmale (zwischengespeichert)
  function feat(key) {
    let f = FEAT.get(key); if (f) return f;
    f = { pos: String(key || '')[0] || '', gender: [], case: [] };
    for (const w of String(key || '').slice(1).trim().split(/\s+/).filter(Boolean)) {
      const p = w.split('/');
      if (TENSE[p[0]]) f.tense = p[0];                       // „aor/imperf“ (einmal): der erste Wert
      else if (MOOD[w]) f.mood = w;
      else if (VOICE[w]) f.voice = w;
      else if (/^[123](st|nd|rd)$/.test(w)) f.person = w[0];
      else if (NUMBER[w]) f.number = w;
      else if (DEGREE[w]) f.degree = w;
      else if (p.every(x => GENDER[x])) f.gender = GENDER_ORDER.filter(x => p.includes(x));
      else if (p.every(x => CASE[x])) f.case = CASE_ORDER.filter(x => p.includes(x));
    }
    FEAT.set(key, f); return f;
  }
  const idt = s => s;
  // Schlüssel deutsch: { pos: 'Verb', info: 'Aorist Indikativ Aktiv · 3. Sg.' } (t übersetzt die einzelnen Bezeichnungen)
  function describe(key, t = idt) {
    const f = feat(key), a = [];
    const cgn = () => [f.case.length === 1 ? t(CASE[f.case[0]]) : f.case.map(c => t(CASE_S[c])).join('/'), f.number ? t(NUMBER[f.number]) : '', f.gender.map(g => t(GENDER[g])).join('/')].filter(Boolean).join(' ');
    if (f.pos === 'V') {
      const tmv = [f.tense && t(TENSE[f.tense]), f.voice && t(VOICE[f.voice])];
      if (f.mood === 'ptc') { a.push([t('Partizip'), ...tmv].filter(Boolean).join(' ')); if (f.case.length) a.push(cgn()); }
      else if (f.mood === 'inf') a.push([t('Infinitiv'), ...tmv].filter(Boolean).join(' '));
      else { a.push([f.tense && t(TENSE[f.tense]), f.mood && t(MOOD[f.mood]), f.voice && t(VOICE[f.voice])].filter(Boolean).join(' ')); if (f.person) a.push(f.person + '. ' + (f.number ? t(NUMBER[f.number]) : '')); }
    } else {
      if (f.degree) a.push(t(DEGREE[f.degree]));
      if (f.person) a.push(f.person + '. ' + t('Pers.'));
      if (f.case.length || f.number || f.gender.length) a.push(cgn());
    }
    return { pos: t(POS[f.pos] || f.pos), info: a.filter(Boolean).join(' · ') };
  }

  // ---------- Tabellen-Modell (gleicher Aufbau wie forms.js: sections -> blocks -> tables -> rows -> cells) ----------
  const ord = (a, x) => { const i = a.indexOf(x); return i < 0 ? 99 : i; };
  function model(D, lemma, t = idt) {
    const x = ix(D), li = x.byLemma.get(lemma); if (li == null) return null;
    const o = occ(D), forms = [], items = [];
    for (let id = x.first[li]; id < x.first[li + 1]; id++) {
      const n = o.start[id + 1] - o.start[id], key = D.P[x.eKey[id]];
      forms.push({ f: x.eForm[id], n, key, id });
      if (n) items.push({ i: forms.length - 1, f: x.eForm[id], n, key, ft: feat(key) });
    }
    const sum = a => a.reduce((s, y) => s + y.n, 0);
    const groupBy = (a, fn) => { const m = new Map(); for (const y of a) { const k = fn(y); if (!m.has(k)) m.set(k, []); m.get(k).push(y); } return m; };
    // Formen einer Zelle: gleiche Schreibung zusammenfassen, häufigste zuerst; amb = die Bestimmung lässt mehrere Zeilen/Spalten zu
    const cell = (a, amb) => {
      const m = new Map();
      for (const y of a) { const z = m.get(y.f); if (z) { z.n += y.n; z.i += ',' + y.i; z.keys.push(y.key); } else m.set(y.f, { f: y.f, n: y.n, i: String(y.i), pre: false, keys: [y.key], amb: !!(amb && amb(y)) }); }
      return [...m.values()].sort((p, q) => q.n - p.n || (p.f < q.f ? -1 : 1));
    };
    const caseLabel = c => t(CASE_S[c]);
    // eine Form steht in jeder Zeile/Spalte, die ihre Bestimmung zulässt (Nom./Akk. n. in beiden); im Vokativ nur, wenn sie eindeutig Vokativ ist
    const inCase = (y, c) => (c === 'voc' ? y.ft.case.length === 1 && y.ft.case[0] === 'voc' : y.ft.case.includes(c));
    const inGender = (y, g) => !y.ft.gender.length || y.ft.gender.includes(g);
    const ambCG = y => y.ft.case.filter(c => c !== 'voc').length > 1 || y.ft.gender.length > 1;
    // Kasus (Zeilen) × Spalten; cols: [[Bezeichnung, Prüfung]]
    const caseTable = (a, cols, title) => {
      const rows = CASE_ORDER.filter(c => a.some(y => inCase(y, c))).map(c => ({ label: caseLabel(c), cells: cols.map(([, test]) => cell(a.filter(y => inCase(y, c) && test(y)), ambCG)) }));
      const rest = a.filter(y => !y.ft.case.length);
      if (rest.length) rows.push({ label: '–', cells: cols.map(([, test]) => cell(rest.filter(test))) });
      return { title, n: sum(a), cols: cols.map(c => c[0]), rows };
    };
    const numbers = a => NUMBER_ORDER.filter(n => a.some(y => y.ft.number === n));
    // Nomen: Kasus × Numerus; Wörter mit Genus-Formen (Adjektiv, Artikel, Pronomen, Partizip): je Numerus Kasus × Genus
    const nominal = (a, byGender) => {
      if (!byGender) return [caseTable(a, numbers(a).map(n => [t(NUMBER[n]), y => y.ft.number === n]))];
      return numbers(a).map(n => { const an = a.filter(y => y.ft.number === n); return caseTable(an, GENDER_ORDER.filter(g => an.some(y => inGender(y, g) && y.ft.gender.length)).map(g => [t(GENDER[g]), y => inGender(y, g)]), t(n === 'sg' ? 'Singular' : n === 'pl' ? 'Plural' : 'Dual')); })
        .concat(a.some(y => !y.ft.number) ? [{ n: sum(a.filter(y => !y.ft.number)), cols: null, rows: [{ label: '', cells: [cell(a.filter(y => !y.ft.number))] }] }] : []);
    };
    const sections = [];
    // ausgeschriebenes Pronomen zur Verbzeile (ich, du, er/sie/es …), Sprache der Oberfläche
    const GPRON = { de: { '1s': 'ich', '2s': 'du', '3s': 'er/sie/es', '1p': 'wir', '2p': 'ihr', '3p': 'sie', '1d': 'wir beide', '2d': 'ihr beide', '3d': 'sie beide' },
      en: { '1s': 'I', '2s': 'you', '3s': 'he/she/it', '1p': 'we', '2p': 'you', '3p': 'they', '1d': 'we two', '2d': 'you two', '3d': 'they two' },
      he: { '1s': 'אני', '2s': 'אתה/את', '3s': 'הוא/היא', '1p': 'אנחנו', '2p': 'אתם/אתן', '3p': 'הם/הן', '1d': 'שנינו', '2d': 'שניכם', '3d': 'שניהם' } };
    const gpron = (pers, num) => { if (!/[123]/.test(pers)) return ''; let L = 'de'; try { L = (typeof I18N !== 'undefined' && I18N.lang) || 'de'; } catch { /* Node */ } const n = /^p/.test(num) ? 'p' : /^d/.test(num) ? 'd' : /^s/.test(num) ? 's' : ''; const w = n && (GPRON[L] || GPRON.de)[pers + n]; return w ? ' – ' + w : ''; };
    // ----- Verben: Tempus -> Modus -> Person/Numerus × Genus verbi -----
    const verbs = items.filter(y => y.ft.pos === 'V');
    const tg = groupBy(verbs, y => y.ft.tense || '?');
    for (const tk of [...tg.keys()].sort((a, b) => ord(TENSE_ORDER, a) - ord(TENSE_ORDER, b))) {
      const tv = tg.get(tk), blocks = [];
      const mg = groupBy(tv, y => y.ft.mood || '?');
      for (const mk of [...mg.keys()].sort((a, b) => ord(MOOD_ORDER, a) - ord(MOOD_ORDER, b))) {
        const a = mg.get(mk), voices = VOICE_ORDER.filter(v => a.some(y => y.ft.voice === v));
        let tables;
        if (mk === 'ptc') tables = voices.flatMap(v => nominal(a.filter(y => y.ft.voice === v), true).map(tb => ({ ...tb, title: [t(VOICE[v]), tb.title].filter(Boolean).join(' · ') })));
        else if (mk === 'inf') tables = [{ n: sum(a), cols: voices.map(v => t(VOICE[v])), rows: [{ label: '', cells: voices.map(v => cell(a.filter(y => y.ft.voice === v))) }] }];
        else {
          const pn = [...new Set(a.map(y => (y.ft.number || 'x') + (y.ft.person || 'x')))].sort((p, q) => ord(NUMBER_ORDER, p.slice(0, -1)) - ord(NUMBER_ORDER, q.slice(0, -1)) || (p.slice(-1) < q.slice(-1) ? -1 : 1));
          tables = [{ n: sum(a), cols: voices.map(v => t(VOICE[v])), rows: pn.map(k => ({ label: ((k.slice(-1) === 'x' ? '' : k.slice(-1) + '. ') + (NUMBER[k.slice(0, -1)] ? t(NUMBER[k.slice(0, -1)]) : '') || '–') + gpron(k.slice(-1), k.slice(0, -1)), cells: voices.map(v => cell(a.filter(y => y.ft.voice === v && (y.ft.number || 'x') + (y.ft.person || 'x') === k))) })) }];
        }
        blocks.push({ title: t(MOOD[mk] || mk), n: sum(a), tables });
      }
      sections.push({ title: t(TENSE[tk] || (tk === '?' ? 'Verb' : tk)), kind: 'verb', n: sum(tv), blocks });
    }
    // ----- alles Übrige nach Wortart (und Steigerung / Person) -----
    const rest = items.filter(y => y.ft.pos !== 'V');
    const rg = groupBy(rest, y => y.ft.pos + '|' + (y.ft.degree || '') + '|' + (y.ft.person ? 'p' : ''));
    const POS_ORDER = 'NEATPMDRCXI';
    for (const rk of [...rg.keys()].sort((a, b) => ord([...POS_ORDER], a[0]) - ord([...POS_ORDER], b[0]) || (a < b ? -1 : 1))) {
      const a = rg.get(rk), [pos, deg, pers] = rk.split('|');
      const title = t(POS[pos] || pos) + (deg ? ' – ' + t(DEGREE[deg]) : '');
      let tables;
      if (pers) { // Personalpronomen: je Person Kasus × Numerus
        tables = [...groupBy(a, y => y.ft.person)].sort((p, q) => (p[0] < q[0] ? -1 : 1)).map(([p, ap]) => ({ ...caseTable(ap, numbers(ap).map(n => [t(NUMBER[n]), y => y.ft.number === n])), title: p + '. ' + t('Pers.') }));
      } else if (a.every(y => !y.ft.case.length && !y.ft.number)) tables = [{ n: sum(a), cols: null, rows: [{ label: '', cells: [cell(a)] }] }];
      else {
        const declined = a.filter(y => y.ft.case.length || y.ft.number), plainF = a.filter(y => !y.ft.case.length && !y.ft.number);
        const byGender = pos !== 'N' && pos !== 'E' && declined.some(y => y.ft.gender.length);
        tables = nominal(declined, byGender);
        if ((pos === 'N' || pos === 'E') && tables[0]) { const gs = GENDER_ORDER.filter(g => declined.some(y => y.ft.gender.includes(g))); if (gs.length) tables[0].title = gs.map(g => t(GENDER[g])).join(' / '); }
        if (plainF.length) tables.push({ title: t('unverändert'), n: sum(plainF), cols: null, rows: [{ label: '', cells: [cell(plainF)] }] });
      }
      sections.push({ title, kind: tables.length > 1 ? 'verb' : 'nom', n: sum(a), blocks: [{ title: '', n: sum(a), tables }] });
    }
    return { lemma, greek: true, forms, total: sum(items), sections };
  }

  // ---------- HTML (Klassen wie in forms.js, damit Aussehen und Bedienung gleich sind) ----------
  const CAP = 24;
  function render(mdl, o = {}) {
    const esc = o.esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    const t = o.t || idt, cur = o.current || null; // { key, form }
    const chip = y => `<button type="button" class="fmF${y.amb ? ' amb' : ''}${cur && cur.form === y.f && y.keys.includes(cur.key) ? ' cur' : ''}"${y.amb ? ` title="${esc(t('Die Bestimmung lässt mehrere Fälle oder Geschlechter zu; die Zahl gilt für alle zusammen'))}"` : ''} data-i="${y.i}"><span lang="grc" dir="ltr">${esc(y.f)}</span><small>${y.n}</small></button>`;
    const cell = a => {
      if (!a.length) return '<td class="fmE">–</td>';
      const more = a.length > CAP ? `<span class="fmMore" hidden>${a.slice(CAP).map(chip).join('')}</span><button type="button" class="fmMoreB" data-n="${a.length - CAP}">+${a.length - CAP}</button>` : '';
      return `<td dir="ltr">${a.slice(0, CAP).map(chip).join('')}${more}</td>`;
    };
    const table = tb => {
      const head = tb.cols ? `<tr><th class="fmC"></th>${tb.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>` : '';
      const body = tb.rows.map(r => `<tr>${r.label || tb.cols ? `<th>${esc(r.label)}</th>` : ''}${r.cells.map(cell).join('')}</tr>`).join('');
      return (tb.title ? `<div class="fmSub">${esc(tb.title)} <small>${tb.n}×</small></div>` : '') + `<table class="fmT fmG">${head}${body}</table>`;
    };
    const nav = mdl.sections.length > 1 ? `<div class="fmNav">${mdl.sections.map((s, i) => `<button type="button" data-sec="${i}">${esc(s.title)} <small>${s.n}×</small></button>`).join('')}</div>` : '';
    const secs = mdl.sections.map((s, i) => `<details class="fmSec" data-sec="${i}" open><summary><b>${esc(s.title)}</b> <small>${s.n}×</small></summary><div class="fmGrid${s.kind === 'verb' ? '' : ' one'}">${s.blocks.map(b => `<div class="fmBlk">${b.title ? `<h4>${esc(b.title)} <small>${b.n}×</small></h4>` : ''}${b.tables.map(table).join('')}</div>`).join('')}</div></details>`).join('');
    return nav + secs + `<p class="fmNote">${esc(t('Nur in der Septuaginta belegte Formen (Rahlfs; Morphologie: lxx-morph), Gravis als Akut; die Zahl nennt die Häufigkeit. Formen, deren Bestimmung mehrere Fälle oder Geschlechter zulässt (z. B. Nom./Akk. Neutrum), stehen in jeder passenden Zeile.'))}</p>`;
  }

  const api = { fold, sameForm, form, words, wordsOf, plain, WORD, GREEK, ALPH, BASE, encoder, decode, ix, bookIndex, hasBook, bookId, verse, info, lemmaInfo, findLemma, dictionaryLemmas, occ, refs, dist, refsIn, topForms, feat, describe, model, render, POS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.GMorph = api;
})();
