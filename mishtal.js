// Mischna ↔ Talmud: wo eine Mischna im Babylonischen Talmud steht (Sefarias Verknüpfungen vom Typ „mishnah in talmud“).
// Die Tabelle bundled/mishnah_talmud.json wird mitgeliefert (tools/mishnah_talmud/build.js), damit der Sprung auch ohne heruntergeladene Verknüpfungen geht.
// Format: { "~names": { "Taanit": "Mishnah Ta'anit" }, "Berakhot": [["1:1", "2a:1-5"], ["1:2", "9b:4-5"], …] } – Mischna (Kapitel:Mischna, auch „1:2-3“) → Stelle im Traktat (Daf:Segment, auch „2a:3-2b:1“)
(function () {
  const dafIdx = d => { const m = /^(\d+)([ab])$/i.exec(String(d)); return m ? (+m[1] - 1) * 2 + (m[2].toLowerCase() === 'b' ? 1 : 0) : -1; };
  // „2a:1-5“, „2a:3-2b:1“, „2b:7“ → { daf, d1, s1, d2, s2 }
  function parseTalmud(t) {
    const m = /^(\d+[ab]):(\d+)(?:-(?:(\d+[ab]):)?(\d+))?$/i.exec(String(t).trim());
    if (!m) return null;
    const daf = m[1].toLowerCase(), d1 = dafIdx(daf), s1 = +m[2];
    return { daf, d1, s1, d2: m[3] ? dafIdx(m[3]) : d1, s2: m[4] ? +m[4] : s1 };
  }
  // „1:1“, „1:2-3“ → { chap, n1, n2 }
  function parseMishnah(t) {
    const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(String(t).trim());
    return m ? { chap: +m[1], n1: +m[2], n2: m[3] ? +m[3] : +m[2] } : null;
  }
  function index(table) {
    const names = (table && table['~names']) || {}; // Talmud-Traktat -> Titel der Mischna, wo er nicht „Mishnah <Traktat>“ lautet
    const back = new Map(Object.entries(names).map(([t, m]) => [m, t]));
    const tractate = title => back.get(String(title || '')) || String(title || '').replace(/^Mishnah /, '');
    const mTitle = t => names[t] || 'Mishnah ' + t;
    const T = new Map(); // Traktat -> [{ m: 'Kap:Mischna', pm, t: 'Daf:Segment', pt }], nach Stelle im Talmud geordnet
    for (const k of Object.keys(table || {})) {
      if (k === '~names') continue;
      const rows = [];
      for (const [m, t] of table[k] || []) { const pm = parseMishnah(m), pt = parseTalmud(t); if (pm && pt) rows.push({ m, pm, t, pt }); }
      rows.sort((a, b) => a.pt.d1 - b.pt.d1 || a.pt.s1 - b.pt.s1);
      T.set(k, rows);
    }
    const rowsOf = title => T.get(tractate(title)) || [];
    return {
      has: title => T.has(tractate(title)),
      // Mischna X Kap:n → Stellen im Talmud („Berakhot 2a:1-5“), die erste zuerst
      toTalmud(title, chap, n) {
        const k = tractate(title);
        return rowsOf(title).filter(r => r.pm.chap === +chap && +n >= r.pm.n1 && +n <= r.pm.n2).map(r => k + ' ' + r.t);
      },
      // Talmud X Daf:Segment → Mischnajot, in deren Abschnitt das Segment liegt („Mishnah Berakhot 1:1“)
      toMishnah(title, daf, seg) {
        const d = dafIdx(String(daf).toLowerCase()), s = +seg;
        return rowsOf(title).filter(r => (d > r.pt.d1 || (d === r.pt.d1 && s >= r.pt.s1)) && (d < r.pt.d2 || (d === r.pt.d2 && s <= r.pt.s2))).map(r => mTitle(title) + ' ' + r.m);
      },
      // Mischnajot, die auf diesem Daf beginnen: [[Segment, „Mishnah Berakhot 1:1“], …]
      startsOn(title, daf) {
        const d = String(daf).toLowerCase();
        return rowsOf(title).filter(r => r.pt.daf === d).map(r => [r.pt.s1, mTitle(title) + ' ' + r.m]);
      },
    };
  }
  const api = { index, parseTalmud, parseMishnah };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.MishTal = api;
})();
