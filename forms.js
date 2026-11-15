// Formentabelle: alle im Tanach belegten Formen eines Lemmas (Westminster Leningrad Codex, OSHB-Morphologie).
// Läuft in Node (Tests, tools/oshb/forms.js baut daraus oshb-forms.js) und als <script> in der Oberfläche (window.Forms).
//  - build(books)        Index aus den Westminster-Dateien bauen  -> { v, books, lem }
//  - analyze(w, m, l)    ein Wort einordnen                        -> { lemma, key, form }
//  - model(data, lemma)  Tabellen-Modell für ein Lemma (Stamm -> Zeitform -> Zeilen Person/Genus/Numerus)
//  - render(model, o)    HTML dazu;  refs(data, model, i)  Belegstellen einer Form
// Es werden nur belegte Formen gezeigt, keine ergänzten Paradigmen.
(function () {
  'use strict';
  const Morph = typeof module !== 'undefined' && module.exports ? require('./morph') : window.Morph;

  const SPAN = /<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g;
  const POINTS = /[ְ-ׇּׁׂ]/;           // Vokalzeichen, Dagesch, Schin-/Sin-Punkt
  const VOWEL = /[ְ-ׇֻ]/;
  const CLUSTER = /[א-ת][ְ-ׇּׁׂ]*/g; // Konsonant mit seinen Zeichen
  const BGDKPT = 'בגדכפת';
  // Akzente, Meteg, Rafe, Paseq usw. entfernen; Vokale, Dagesch und Schin-/Sin-Punkt bleiben
  const clean = w => String(w).replace(/<[^>]*>/g, '').replace(/[^ְ-ׇּׁׂא-ת]/g, '').normalize('NFC');

  // Morph-Code und Lemma in Vorsilben, Hauptwort und Suffix zerlegen (wie Morph.decode, aber mit den Rohcodes)
  function parts(m, l) {
    m = String(m || ''); if (!m) return null;
    const lang = m[0] === 'A' ? 'A' : 'H';
    const ms = m.slice(1).split('/'), ls = String(l || '').split('/');
    let li = 0, main = -1, lemma = '';
    ms.forEach((c, i) => { if (c[0] === 'S') return; const x = ls[li++] || ''; if (/^\d/.test(x) && main < 0) { main = i; lemma = x; } });
    if (main < 0) return null; // nur Vorsilbe + Suffix (לוֹ, בָּהֶם): kein Lemma
    const pre = ms.slice(0, main), post = ms.slice(main + 1);
    return { lang, code: ms[main], pre, suf: post.find(c => c[0] === 'S') || '', lemma };
  }

  // Wie viele Vorsilben lassen sich abtrennen? Der Artikel bleibt (eigene Spalte), ebenso das ו von wajjiqtol/wᵉqatal
  // und die Präposition vor dem Infinitivus constructus (לִכְתֹּב ist nicht ל + כְּתֹב).
  function stripCount(p) {
    const art = p.pre.findIndex(c => c === 'Td' || c === 'Rd');
    if (art >= 0) return art;
    if (p.code[0] === 'V') {
      const t = p.code[2];
      if (t === 'w' || t === 'q') return 0;
      if (t === 'c') { const r = p.pre.findIndex(c => c[0] === 'R'); return r >= 0 ? r : p.pre.length; }
    }
    return p.pre.length;
  }
  // Rest ist als eigenes Wort lesbar: der erste Konsonant trägt einen Vokal (oder es folgt וֹ / וּ wie in אוֹר, יוֹם)
  const readable = cl => cl.length > 0 && (VOWEL.test(cl[0]) || (cl.length > 1 && (cl[1] === 'וֹ' || cl[1] === 'וּ')));
  // Vokalisierte Form ohne abtrennbare Vorsilben; '' bei unvokalisierten Wörtern (Ketiv)
  function strip(word, p) {
    const w = clean(word);
    if (!POINTS.test(w)) return '';
    const cl = w.match(CLUSTER) || [];
    let k = Math.min(stripCount(p), cl.length - 1);
    while (k > 0 && !readable(cl.slice(k))) k--;
    const rest = cl.slice(k);
    // Wortanfang vereinheitlichen: בגדכפת mit Dagesch (כָּתַב, nicht וְ-כָתַב), andere Konsonanten ohne das Dagesch,
    // das nur vom Artikel, von מִן oder vom vorigen Wort herrührt
    const c = rest[0][0];
    if (BGDKPT.includes(c)) { if (!rest[0].includes('\u05BC')) rest[0] += '\u05BC'; }
    else if (c !== 'ו') rest[0] = rest[0].replace('\u05BC', '');
    // '-' vorn: eine Vorsilbe ließ sich nicht abtrennen (לֵאלֹהִים, וִיהִי) – die Form steht wie belegt
    return (k < stripCount(p) ? '-' : '') + rest.join('').normalize('NFC');
  }
  // Schlüssel einer Form: Sprache + Code des Hauptwortes, '*' = mit Artikel, '/S…' = Suffix
  const keyOf = p => p.lang + p.code + (p.pre.some(c => c === 'Td' || c === 'Rd') ? '*' : '') + (p.suf ? '/' + p.suf : '');
  function analyze(word, m, l) {
    const p = parts(m, l); if (!p) return null;
    const form = strip(word, p); if (!form) return null;
    return { lemma: p.lemma, key: keyOf(p), form: form.replace(/^-/, ''), raw: form };
  }

  // ---------- Index bauen ----------
  const b36 = n => { const s = n.toString(36); return s.length >= 3 ? s : '000'.slice(s.length) + s; };
  // books: [{ title, text: [[Vers, …], …] }] in der Reihenfolge des Tanach
  function build(books) {
    const lem = new Map(), meta = [];
    let vi = 0;
    for (const b of books) {
      const counts = [];
      for (const ch of b.text) {
        const vs = Array.isArray(ch) ? ch : [];
        counts.push(vs.length);
        for (const v of vs) {
          if (typeof v === 'string') for (const m of v.matchAll(SPAN)) {
            const a = analyze(m[3], m[2], m[1]); if (!a) continue;
            let L = lem.get(a.lemma); if (!L) lem.set(a.lemma, L = new Map());
            let K = L.get(a.key); if (!K) L.set(a.key, K = new Map());
            K.set(a.raw, (K.get(a.raw) || '') + b36(vi));
          }
          vi++;
        }
      }
      meta.push([b.title, counts]);
    }
    if (vi >= 46656) throw new Error('zu viele Verse für drei Stellen');
    const out = {};
    for (const k of [...lem.keys()].sort()) out[k] = [...lem.get(k)].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([key, F]) => key + '=' + [...F].map(([f, r]) => f + ':' + r).join(',')).join(';');
    return { v: 1, books: meta, lem: out };
  }

  // ---------- Belegstellen ----------
  const cum = new WeakMap();
  function locate(data, idx) {
    let c = cum.get(data);
    if (!c) { c = []; let n = 0; data.books.forEach(([, counts], bi) => counts.forEach((k, ci) => { c.push([n, bi, ci]); n += k; })); cum.set(data, c); }
    let lo = 0, hi = c.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c[mid][0] <= idx) lo = mid; else hi = mid - 1; }
    return { book: data.books[c[lo][1]][0], ch: c[lo][2] + 1, v: idx - c[lo][0] + 1 };
  }
  // Belegstellen einer Form: [{ book, ch, v, n }] (jeder Vers einmal, n = wie oft darin)
  function refs(data, mdl, i) {
    const idx = [];
    for (const k of String(i).split(',')) { const s = (mdl.forms[+k] || { r: '' }).r; for (let j = 0; j < s.length; j += 3) idx.push(parseInt(s.slice(j, j + 3), 36)); }
    idx.sort((a, b) => a - b);
    const out = [];
    let last = -1;
    for (const x of idx) { if (x === last) out[out.length - 1].n++; else { out.push({ ...locate(data, x), n: 1 }); last = x; } }
    return out;
  }

  // ---------- Tabellen-Modell ----------
  const STEM_ORDER = { H: 'qQNpPthHoOrmMkKlLfDjiucvwyz', A: 'qQuicpPMhasebHtvwozrfmlLOG' };
  const TENSE_ORDER = 'pqiwjhvcars';
  const TENSE = { p: 'Perfekt', q: 'Perfekt consecutivum (wᵉqatal)', i: 'Imperfekt', w: 'Imperfekt consecutivum (wajjiqtol)', j: 'Jussiv', h: 'Kohortativ', v: 'Imperativ', c: 'Infinitivus constructus', a: 'Infinitivus absolutus', r: 'Partizip aktiv', s: 'Partizip passiv' };
  const ord = (s, c) => { const i = s.indexOf(c); return i < 0 ? 99 : i; };
  // Person/Genus/Numerus: Reihenfolge Sg. → Du. → Pl., darin 3. → 2. → 1. Person, m. vor f.
  const pgnRank = x => ord('sdpx', x[2] || 'x') * 100 + ord('321x', x[0] || 'x') * 10 + ord('mfcbx', x[1] || 'x');
  const gnRank = x => ord('sdpx', x[1] || 'x') * 10 + ord('mfcbx', x[0] || 'x');
  const G = { m: 'm.', f: 'f.', c: 'c.', b: 'm./f.' }, N = { s: 'Sg.', d: 'Du.', p: 'Pl.' };
  const join = a => a.filter(Boolean).join(' ');
  function mkLabels(t) {
    const pgn = x => join([/[123]/.test(x[0]) ? x[0] + '.' : '', t(G[x[1]] || ''), t(N[x[2]] || '')]) || '–';
    const gn = x => join([t(G[x[0]] || ''), t(N[x[1]] || '')]) || '–';
    return { pgn, gn, suf: s => (s === 'Sd' ? t('He locale') : s === 'Sh' ? t('He paragogicum') : s === 'Sn' ? t('Nun paragogicum') : pgn(s.slice(2))) };
  }

  function model(data, lemma, t = s => s) {
    const raw = data && data.lem && data.lem[lemma];
    if (!raw) return null;
    const L = mkLabels(t);
    const forms = [], items = [];
    for (const grp of raw.split(';')) {
      const eq = grp.indexOf('='), key = grp.slice(0, eq);
      const [head, suf = ''] = key.split('/');
      const art = head.endsWith('*'), lc = art ? head.slice(0, -1) : head;
      for (const fr of grp.slice(eq + 1).split(',')) {
        const c = fr.indexOf(':'), pre = fr[0] === '-', f = fr.slice(pre ? 1 : 0, c), r = fr.slice(c + 1);
        forms.push({ f, r, n: r.length / 3, key, pre });
        items.push({ i: forms.length - 1, f, n: r.length / 3, key, pre, lang: lc[0], code: lc.slice(1), art, suf });
      }
    }
    const sum = a => a.reduce((s, x) => s + x.n, 0);
    // Formen einer Zelle: gleiche Schreibung zusammenfassen (z. B. st. abs. und st. cs. mit He locale), häufigste zuerst, nicht abtrennbare Vorsilben zuletzt
    const byN = a => {
      const m = new Map();
      for (const x of a) { const k = (x.pre ? '-' : '') + x.f, y = m.get(k); if (y) { y.n += x.n; y.i += ',' + x.i; y.keys.push(x.key); } else m.set(k, { f: x.f, n: x.n, i: String(x.i), pre: x.pre, keys: [x.key] }); }
      return [...m.values()].sort((x, y) => x.pre - y.pre || y.n - x.n || (x.f < y.f ? -1 : 1));
    };
    const groupBy = (a, fn) => { const m = new Map(); for (const x of a) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
    // einfache Tabelle: eine Zeile je Schlüssel
    const rowsTable = (a, keyFn, rank, label, title) => {
      const g = groupBy(a, keyFn);
      return { title, n: sum(a), cols: null, rows: [...g.keys()].sort((x, y) => rank(x) - rank(y) || (x < y ? -1 : 1)).map(k => ({ label: label(k), cells: [byN(g.get(k))] })) };
    };
    // Nomen, Adjektive, Partizipien: Genus/Numerus × Status, dazu He locale und Suffixformen
    // gns(x) = [Genus, Numerus, Status]
    const nominal = (a, gns) => {
      const tables = [];
      const plain = a.filter(x => !x.suf || x.suf === 'Sh' || x.suf === 'Sn'), loc = a.filter(x => x.suf === 'Sd'), sx = a.filter(x => x.suf.startsWith('Sp'));
      const col = x => (x.art ? 'art' : gns(x)[2] === 'c' ? 'c' : gns(x)[2] === 'd' ? 'd' : 'a');
      const COLS = [['a', t('st. abs.')], ['art', t('mit Artikel')], ['d', t('st. det.')], ['c', t('st. cs.')]];
      if (plain.length) {
        const cols = COLS.filter(([k]) => plain.some(x => col(x) === k));
        const g = groupBy(plain, x => gns(x)[0] + gns(x)[1]);
        tables.push({ n: sum(plain), cols: cols.map(c => c[1]), rows: [...g.keys()].sort((x, y) => gnRank(x) - gnRank(y)).map(k => ({ label: L.gn(k), cells: cols.map(([ck]) => byN(g.get(k).filter(x => col(x) === ck))) })) });
      }
      if (loc.length) tables.push(rowsTable(loc, x => gns(x)[0] + gns(x)[1], gnRank, L.gn, t('mit He locale (Richtungs-He)')));
      if (sx.length) {
        const cks = [...new Set(sx.map(x => gns(x)[0] + gns(x)[1]))].sort((x, y) => gnRank(x) - gnRank(y));
        const g = groupBy(sx, x => x.suf.slice(2));
        tables.push({ title: t('mit Suffix'), n: sum(sx), cols: cks.map(L.gn), corner: t('Suffix'), rows: [...g.keys()].sort((x, y) => pgnRank(x) - pgnRank(y)).map(k => ({ label: L.pgn(k), cells: cks.map(ck => byN(g.get(k).filter(x => gns(x)[0] + gns(x)[1] === ck))) })) });
      }
      return tables;
    };
    const sections = [];
    // ----- Verben: Stamm → Zeitform → Person/Genus/Numerus -----
    const verbs = items.filter(x => x.code[0] === 'V');
    const stems = groupBy(verbs, x => x.lang + x.code[1]);
    for (const sk of [...stems.keys()].sort((x, y) => (x[0] === y[0] ? ord(STEM_ORDER[x[0]], x[1]) - ord(STEM_ORDER[y[0]], y[1]) : x[0] === 'H' ? -1 : 1))) {
      const sv = stems.get(sk), blocks = [];
      const tg = groupBy(sv, x => x.code[2] || '?');
      for (const tk of [...tg.keys()].sort((x, y) => ord(TENSE_ORDER, x) - ord(TENSE_ORDER, y))) {
        const a = tg.get(tk);
        let tables;
        if (tk === 'r' || tk === 's') tables = nominal(a, x => [x.code[3], x.code[4], x.code[5]]);
        else if (tk === 'c' || tk === 'a') {
          const plain = a.filter(x => !x.suf.startsWith('Sp')), sx = a.filter(x => x.suf.startsWith('Sp'));
          tables = [];
          if (plain.length) tables.push({ n: sum(plain), cols: null, rows: [{ label: sx.length ? t('ohne Suffix') : '', cells: [byN(plain)] }] });
          if (sx.length) tables.push(rowsTable(sx, x => x.suf.slice(2), pgnRank, L.pgn, t('mit Suffix')));
        } else {
          const plain = a.filter(x => !x.suf.startsWith('Sp')), sx = a.filter(x => x.suf.startsWith('Sp'));
          tables = [];
          if (plain.length) tables.push(rowsTable(plain, x => x.code.slice(3, 6), pgnRank, L.pgn));
          if (sx.length) {
            const tb = rowsTable(sx, x => x.code.slice(3, 6) + '+' + x.suf.slice(2), k => pgnRank(k.slice(0, 3)) * 1000 + pgnRank(k.slice(4)), k => L.pgn(k.slice(0, 3)) + ' + ' + L.pgn(k.slice(4)), t('mit Objektsuffix'));
            tb.fold = true; tables.push(tb);
          }
        }
        blocks.push({ title: t(TENSE[tk] || tk), n: sum(a), tables });
      }
      const seg = Morph.segment('V' + sk[1] + 'p3ms', sk[0]);
      sections.push({ title: t(seg.stem) + (sk[0] === 'A' ? ' (' + t('aramäisch') + ')' : ''), kind: 'verb', n: sum(sv), blocks });
    }
    // ----- Nomen, Adjektive, Zahlwörter -----
    const noms = items.filter(x => (x.code[0] === 'N' && x.code[1] !== 'p') || x.code[0] === 'A');
    const ng = groupBy(noms, x => x.lang + x.code.slice(0, 2));
    for (const nk of [...ng.keys()].sort()) {
      const a = ng.get(nk);
      sections.push({ title: t(Morph.segment(nk.slice(1), nk[0]).pos) + (nk[0] === 'A' ? ' (' + t('aramäisch') + ')' : ''), kind: 'nom', n: sum(a), blocks: [{ title: '', n: sum(a), tables: nominal(a, x => [x.code[2], x.code[3], x.code[4]]) }] });
    }
    // ----- alles Übrige (Eigennamen, Pronomen, Partikeln …): Liste je Bestimmung -----
    const rest = items.filter(x => !verbs.includes(x) && !noms.includes(x));
    const rg = groupBy(rest, x => x.lang + x.code.slice(0, 2));
    for (const rk of [...rg.keys()].sort()) {
      const a = rg.get(rk);
      const lab = k => {
        const [code, art, suf] = k.split('|');
        const info = code[0] === 'P' ? L.pgn(code.slice(2)) : code[0] === 'N' ? L.gn(code.slice(2)) : '';
        return [info === '–' ? '' : info, art ? t('mit Artikel') : '', suf ? '+ ' + (suf.startsWith('Sp') ? t('Suffix') + ' ' : '') + L.suf(suf) : ''].filter(Boolean).join(', ') || t('Form');
      };
      const rank = k => { const [code, art, suf] = k.split('|'); return (suf ? 20000 + pgnRank(suf.slice(2)) * 10 : 0) + (art ? 5000 : 0) + (code[0] === 'P' ? pgnRank(code.slice(2)) : 0); };
      const tb = rowsTable(a, x => x.code + '|' + (x.art ? '*' : '') + '|' + x.suf, rank, lab);
      sections.push({ title: t(Morph.segment(a[0].code, rk[0]).pos) + (rk[0] === 'A' ? ' (' + t('aramäisch') + ')' : ''), kind: 'other', n: sum(a), blocks: [{ title: '', n: sum(a), tables: [tb] }] });
    }
    return { lemma, forms, total: sum(items), sections };
  }

  // ---------- HTML ----------
  const CAP = 24; // mehr Formen in einer Zelle klappen auf
  function render(mdl, o = {}) {
    const esc = o.esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    const t = o.t || (s => s);
    const cur = o.current || null; // { key, form }: die angeklickte Form hervorheben
    const chip = x => `<button type="button" class="fmF${x.pre ? ' pre' : ''}${cur && cur.form === x.f && x.keys.includes(cur.key) ? ' cur' : ''}"${x.pre ? ` title="${esc(t('mit Vorsilbe (nicht abtrennbar), wie belegt'))}"` : ''} data-i="${x.i}"><span lang="he" dir="rtl">${esc(x.f)}</span><small>${x.n}</small></button>`;
    const cell = a => {
      if (!a.length) return '<td class="fmE">–</td>';
      const more = a.length > CAP ? `<span class="fmMore" hidden>${a.slice(CAP).map(chip).join('')}</span><button type="button" class="fmMoreB" data-n="${a.length - CAP}">+${a.length - CAP}</button>` : '';
      return `<td dir="rtl">${a.slice(0, CAP).map(chip).join('')}${more}</td>`;
    };
    const table = tb => {
      const head = tb.cols ? `<tr><th class="fmC">${esc(tb.corner || '')}</th>${tb.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>` : '';
      const body = tb.rows.map(r => `<tr>${r.label || tb.cols ? `<th>${esc(r.label)}</th>` : ''}${r.cells.map(cell).join('')}</tr>`).join('');
      const tab = `<table class="fmT">${head}${body}</table>`;
      if (tb.fold) return `<details class="fmFold"><summary>${esc(tb.title)} <small>${tb.n}×</small></summary>${tab}</details>`;
      return (tb.title ? `<div class="fmSub">${esc(tb.title)} <small>${tb.n}×</small></div>` : '') + tab;
    };
    const nav = mdl.sections.length > 1 ? `<div class="fmNav">${mdl.sections.map((s, i) => `<button type="button" data-sec="${i}">${esc(s.title)} <small>${s.n}×</small></button>`).join('')}</div>` : '';
    const secs = mdl.sections.map((s, i) => `<details class="fmSec" data-sec="${i}" open><summary><b>${esc(s.title)}</b> <small>${s.n}×</small></summary><div class="fmGrid${s.kind === 'verb' ? '' : ' one'}">${s.blocks.map(b => `<div class="fmBlk">${b.title ? `<h4>${esc(b.title)} <small>${b.n}×</small></h4>` : ''}${b.tables.map(table).join('')}</div>`).join('')}</div></details>`).join('');
    return nav + secs + `<p class="fmNote">${esc(t('Nur im Tanach belegte Formen (Westminster Leningrad Codex, OSHB), ohne Akzente; die Zahl nennt die Häufigkeit. Vorsilben wie ו, ב, כ, ל, מ, ש sind abgetrennt, wo das Wort dann für sich lesbar bleibt; Artikel, wajjiqtol/wᵉqatal und Infinitiv mit Präposition stehen wie belegt. Unvokalisierte Ketiv-Formen fehlen.'))}</p>`;
  }

  // ---------- Wortkarte: Verteilung auf die Bücher und häufigste Formen ----------
  const allForms = mdl => mdl.forms.map((_, i) => i).join(',');
  // Vorkommen je Buch in der Reihenfolge des Tanach: [{ book, n (Belege), verses (Verse mit Beleg), size (Verse des Buches) }]
  function dist(data, mdl) {
    const out = data.books.map(([book, counts]) => ({ book, n: 0, verses: 0, size: counts.reduce((s, x) => s + x, 0) }));
    const at = new Map(out.map((x, i) => [x.book, i]));
    for (const r of refs(data, mdl, allForms(mdl))) { const o = out[at.get(r.book)]; o.n += r.n; o.verses++; }
    return out;
  }
  // alle Belegstellen des Lemmas in einem Buch: [{ book, ch, v, n }]
  const refsIn = (data, mdl, book) => refs(data, mdl, allForms(mdl)).filter(r => r.book === book);
  // die k häufigsten Formen (gleiche Schreibung zusammengefasst): [{ f, n, i, pre }]
  function topForms(mdl, k = 8) {
    const m = new Map();
    mdl.forms.forEach((x, i) => { const key = (x.pre ? '-' : '') + x.f, y = m.get(key); if (y) { y.n += x.n; y.i += ',' + i; } else m.set(key, { f: x.f, n: x.n, i: String(i), pre: !!x.pre }); });
    const all = [...m.values()].sort((a, b) => b.n - a.n || (a.f < b.f ? -1 : 1));
    return { list: all.slice(0, k), kinds: all.length };
  }

  const api = { build, analyze, model, render, refs, clean, parts, strip, keyOf, dist, refsIn, topForms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Forms = api;
})();
