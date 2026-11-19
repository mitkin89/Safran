// „Alles zu dieser Stelle“: stellt aus den schon vorhandenen Daten eines Abschnitts (Verknüpfungen, Themen, Orte, Gliederung, Notizen,
// Westminster-Wörter) die Fächer für einen Vers bzw. ein Segment zusammen. Reine Logik ohne Oberfläche –
// läuft in Node (Tests) und als <script> (window.Passage). Daten werden hier nicht geladen, nur sortiert und gezählt.
(function () {
  'use strict';
  const Morph = typeof module !== 'undefined' && module.exports ? require('./morph') : window.Morph;

  // feste Reihenfolge der Fächer
  const BOXES = ['stats', 'commentary', 'parallels', 'legends', 'krauss', 'rabbinic', 'halakhah', 'words', 'dicts', 'places', 'topics', 'mishtal', 'outline', 'notes', 'other'];
  const LEG = 'Legends of the Jews';
  const KRAUSS = 'Talmudische Archäologie'; // Krauss: eigenes Fach wie Ginzbergs Legenden
  const JOSEPHUS = ['The Antiquities of the Jews', 'The War of the Jews', 'Against Apion', 'The Life of Flavius Josephus'];
  const CAT = {
    parallels: new Set(['tanakh', 'parallelstellen', 'second temple', 'targum', 'apocrypha']),
    rabbinic: new Set(['talmud', 'midrash', 'mishnah', 'tosefta']),
    halakhah: new Set(['halakhah', 'responsa']),
  };
  const bookOf = ref => { const m = String(ref).match(/^(.*?)\s+\d+[ab]?(?::\d+)*(?:-.*)?$/i); return m ? m[1] : String(ref); };
  const start = ref => String(ref).replace(/-.*$/, '');

  // In welches Fach gehört eine Verknüpfung { v1, v2, other, type, cat }?
  function boxOf(x) {
    const cat = String(x.cat || '').toLowerCase(), type = String(x.type || '').toLowerCase();
    if (type === 'commentary') return 'commentary';
    if (type === 'mishnah in talmud') return 'mishtal';
    if (String(x.other).startsWith(LEG + ' ')) return 'legends';
    if (bookOf(x.other) === KRAUSS) return 'krauss';
    if (JOSEPHUS.includes(bookOf(x.other))) return 'parallels';
    if (CAT.parallels.has(cat)) return 'parallels';
    if (CAT.rabbinic.has(cat)) return 'rabbinic';
    if (CAT.halakhah.has(cat)) return 'halakhah';
    return 'other';
  }
  // Herkunft einer Parallelstelle (kleine Kennzeichnung hinter dem Eintrag)
  function sourceOf(x) {
    if (String(x.cat) === 'Parallelstellen') return { k: 'etcbc', sim: String(x.type || '') };
    if (JOSEPHUS.includes(bookOf(x.other))) return { k: 'josephus' };
    const cat = String(x.cat || '').toLowerCase();
    if (cat === 'second temple' || cat === 'apocrypha') return { k: 'second' };
    if (cat === 'targum') return { k: 'targum' };
    return { k: 'bible' };
  }

  // Verknüpfungen eines Abschnitts auf den Vers einschränken (wie das Verknüpfungs-Fenster: Verweise auf den ganzen Abschnitt zählen mit)
  // und auf die Fächer verteilen; dieselbe Zielstelle erscheint je Fach nur einmal.
  // all = true (ganzes Kapitel, v = null): auch die Kommentare zu den einzelnen Versen
  function classify(rows, v, all) {
    const out = { commentary: [], parallels: [], legends: [], krauss: [], rabbinic: [], halakhah: [], mishtal: [], other: [] };
    const seen = new Set();
    for (const x of rows || []) {
      if (!x || !x.other) continue;
      const whole = !(x.v1 > 0);
      if (v != null && !whole && !(v >= x.v1 && v <= x.v2)) continue;
      const b = boxOf(x);
      if (b === 'commentary' && (whole || (v == null && !all))) continue; // Kommentare gelten nur zum Vers (wie im Kommentar-Bereich)
      const k = b + '\u0001' + start(x.other);
      if (seen.has(k)) continue;
      seen.add(k);
      out[b].push(x);
    }
    return out;
  }
  // Kommentare nach Kommentator zusammenfassen: [{ name, book, refs }]
  function commentators(list) {
    const m = new Map();
    for (const x of list || []) {
      const book = bookOf(x.other), name = book.replace(/ on .*$/i, '');
      if (!m.has(name)) m.set(name, { name, book, refs: [] });
      m.get(name).refs.push(x.other);
    }
    return [...m.values()];
  }

  // ----- Wörter des Verses (Westminster-Text mit Morphologie) -----
  const SPAN = /<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)<\/span>/g;
  const bare = w => String(w).replace(/<[^>]*>/g, '').replace(/[^ְ-ׇא-ת]/g, '').normalize('NFC'); // ohne Akzente
  // -> [{ word, lemma, l, m, n }] in der Reihenfolge des Verses; jedes Lemma einmal (n = wie oft im Vers)
  function words(html) {
    const out = [], by = new Map();
    for (const m of String(html || '').matchAll(SPAN)) {
      let d = null; try { d = Morph.decode(m[2], m[1]); } catch { d = null; }
      const seg = d && d.segs[d.main];
      if (!seg || !seg.lemma) continue;
      const have = by.get(seg.lemma);
      if (have) { have.n++; if (seg.stem) have.stems[seg.stem] = (have.stems[seg.stem] || 0) + 1; continue; }
      const w = { word: bare(m[3]), raw: m[3].replace(/<[^>]*>/g, ''), lemma: seg.lemma, l: m[1], m: m[2], pos: seg.pos || '', n: 1, stems: seg.stem ? { [seg.stem]: 1 } : {} };
      by.set(seg.lemma, w); out.push(w);
    }
    return out;
  }

  // ----- „Talmud & Midrasch“ nach Werkgruppen gliedern (Überschriften im Überblick) -----
  const RGROUPS = ['Mischna', 'Babylonischer Talmud', 'Jerusalemer Talmud', 'Tosefta', 'Midrasch Rabba', 'Halachische Midraschim', 'Weitere Midraschim', 'Kleine Traktate', 'Weitere Werke'];
  function rabbinicGroup(x) {
    const b = bookOf(x.other), cat = String(x.cat || '').toLowerCase();
    if (/^Mishnah |^Pirkei Avot$/.test(b) || cat === 'mishnah') return 'Mischna';
    if (/^Jerusalem Talmud /.test(b)) return 'Jerusalemer Talmud';
    if (/^Tosefta /.test(b) || cat === 'tosefta') return 'Tosefta';
    if (/^Tractate |^Avot DeRabbi Natan|^Derekh Eretz|^Masekhet |^Kallah/.test(b)) return 'Kleine Traktate';
    if (/Rabbah/.test(b)) return 'Midrasch Rabba';
    if (/^Mekhilta|^Sifra|^Sifre|^Sifrei/.test(b)) return 'Halachische Midraschim';
    if (cat === 'midrash') return 'Weitere Midraschim';
    if (cat === 'talmud') return 'Babylonischer Talmud';
    return 'Weitere Werke';
  }

  // ----- Statistik eines Kapitels: ws = Ergebnis von words() über das ganze Kapitel; o = { tot(lemma): Belege im Tanach, N: Wörter im Tanach, verses, bookTot(lemma): Belege im selben Buch } -----
  const FUNC = /^(Präposition|Konjunktion|Artikel|Akkusativ|Relativ|Negation|Bejahung|Aufforder|Frage|Interjektion|Demonstrativ|Partikel|Pronominal|Suffix|Richtungs|He paragog|Nun parag)|pronomen$/i;
  const TIERS = [['>500', t => t > 500], ['100–500', t => t >= 100 && t <= 500], ['20–99', t => t >= 20 && t < 100], ['2–19', t => t >= 2 && t < 20], ['1', t => t === 1]];
  function stats(ws, o) {
    const { tot, N, verses, bookTot } = o;
    const rows = (ws || []).map(w => ({ w, n: w.n, T: Math.max(w.n, tot(w.lemma) || w.n), fn: FUNC.test(w.pos || ''), name: /^Eigenname$/.test(w.pos || '') }));
    const C = rows.reduce((a, r) => a + r.n, 0);
    if (!C) return null;
    const words = rows.filter(r => !r.fn && !r.name);
    // Leitwörter: im Kapitel viel häufiger als im übrigen Tanach (Log-Likelihood); Zufallstreffer durch Mindestzahl ausgeschlossen
    const lead = words.filter(r => r.n >= 3 || (r.n >= 2 && r.T <= 5)).map(r => ({ ...r, k: r.n * Math.log(r.n * N / (r.T * C)) })).filter(r => r.k > 0).sort((x, y) => y.k - x.k || y.n - x.n);
    const names = rows.filter(r => r.name).sort((x, y) => y.n - x.n || x.T - y.T);
    const tiers = TIERS.map(([key, f]) => ({ key, items: words.filter(r => f(r.T)).sort((x, y) => y.n - x.n || x.T - y.T) })).filter(t => t.items.length);
    const vocab = words.filter(r => r.T < 100).sort((x, y) => x.T - y.T || y.n - x.n);
    const only = bookTot ? words.filter(r => r.T >= 2 && bookTot(r.w.lemma) === r.T).sort((x, y) => y.n - x.n) : [];
    const stems = {}; let verbN = 0;
    for (const r of rows) for (const [k, v] of Object.entries(r.w.stems || {})) { stems[k] = (stems[k] || 0) + v; verbN += v; }
    const stemList = Object.entries(stems).map(([stem, n]) => ({ stem, n, pct: Math.round(1000 * n / verbN) / 10 })).sort((a, b) => b.n - a.n);
    const verbs = words.filter(r => /^Verb$/.test(r.w.pos || '')).sort((x, y) => y.n - x.n || x.T - y.T);
    const common = rows.filter(r => r.T >= 100).reduce((a, r) => a + r.n, 0);
    return { words: C, lemmas: rows.length, verses: verses || 0, lead, names, tiers, vocab, only, stems: stemList, verbs, common: Math.round(100 * common / C) };
  }

  // ----- Gliederung / Mizwa an dieser Stelle -----
  // „3“ -> 3, „2a“ -> Blattseite als Zahl (2a = 4, 2b = 5), damit Bereiche über Seiten hinweg vergleichbar sind
  const secNo = s => { const m = String(s).trim().match(/^(\d+)([ab])?$/i); return m ? (m[2] ? +m[1] * 2 + (m[2].toLowerCase() === 'b' ? 1 : 0) : +m[1]) : null; };
  function spans(ref) { // „1:27-2:5“, „4-5“, „3“, „15:32-37, 16:14-19“, „2a:1-5“, „2a:6-2b:3“ -> [[von, bis]] als Abschnitt*10000+Vers
    const out = [];
    for (const part of String(ref).split(/[;,]/)) {
      const m = part.trim().match(/^(\d+[ab]?)(?::(\d+))?(?:\s*[-–]\s*(\d+[ab]?)(?::(\d+))?)?$/i);
      if (!m) continue;
      const c1 = secNo(m[1]); let a, b;
      if (m[2]) { a = c1 * 10000 + +m[2]; b = m[4] ? secNo(m[3]) * 10000 + +m[4] : m[3] ? (/[ab]$/i.test(m[3]) ? secNo(m[3]) * 10000 + 9999 : c1 * 10000 + +m[3]) : a; }
      else { a = c1 * 10000; b = (m[3] ? secNo(m[3]) : c1) * 10000 + 9999; }
      out.push([a, b]);
    }
    return out;
  }
  const width = ref => spans(ref).reduce((s, [a, b]) => s + (b - a), 0);
  // Punkte der Gliederung, in denen die Stelle liegt: [{ ref, it, head, mz, depth }] – Überpunkt vor Unterpunkt, Mizwot zuletzt;
  // unter mehreren überlappenden Unterpunkten nur der genaueste
  function outlineAt(ol, ch, v) {
    const c = secNo(ch); if (!ol || !Array.isArray(ol.sections) || c == null || !(v > 0)) return [];
    const pos = c * 10000 + v, hit = ref => spans(ref).some(([a, b]) => pos >= a && pos <= b);
    const tops = [], mzs = [];
    for (const s of ol.sections) for (const it of s.items || []) {
      if (!hit(it.ref)) continue;
      if (it.mz) { mzs.push({ ref: it.ref, it, sec: s, mz: it.mz, depth: 0 }); continue; }
      tops.push({ ref: it.ref, it, sec: s, mz: 0, depth: 0 });
      const subs = (it.sub || []).filter(x => hit(x.ref));
      if (subs.length) { const best = subs.reduce((p, x) => (width(x.ref) < width(p.ref) ? x : p)); tops.push({ ref: best.ref, it: best, sec: s, mz: 0, depth: 1 }); }
    }
    return tops.concat(mzs);
  }

  // ----- Notizen an dieser Stelle -----
  // notes: alle Notizen; key = Buch, sk = Abschnitt, label = Zeilenbeschriftung, v = Versnummer (oder null)
  function notesAt(notes, key, sk, label, v) {
    return (notes || []).filter(n => {
      if (n.key !== key || n.sk !== sk) return false;
      const kind = n.kind || 'row';
      if (kind === 'row') return n.row === label;
      if (kind === 'block') return v != null && Array.isArray(n.set) && n.set.includes(v);
      return false;
    });
  }

  // ----- Orte und Themen des Verses -----
  const placesAt = (cur, v) => (cur || []).filter(c => (c.vs || []).includes(v)).map(c => c.i);
  const topicsAt = (rows, v) => (rows || []).filter(r => !r.verses || r.verses.includes(v));

  // Zusammenfassung der Zähler: { Fach: Anzahl }, dazu die Reihenfolge der nicht leeren Fächer
  function summary(boxes) {
    const n = {}; for (const b of BOXES) n[b] = Array.isArray(boxes[b]) ? boxes[b].length : 0;
    return { n, shown: BOXES.filter(b => n[b] > 0), total: BOXES.reduce((s, b) => s + n[b], 0) };
  }

  const api = { isFunction:pos=>FUNC.test(pos||''), BOXES, KRAUSS, stats, rabbinicGroup, RGROUPS, boxOf, sourceOf, classify, commentators, words, bare, outlineAt, spans, secNo, notesAt, placesAt, topicsAt, summary, bookOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Passage = api;
})();
