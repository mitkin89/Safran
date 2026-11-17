// Validiert lokal erzeugte Wortkartenstatistiken; keine privaten Textdaten im Code.
function validateRenderings(raw, alignment, books, key) {
  const obj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const int = (x, min = 0, max = 1000000) => Number.isSafeInteger(x) && x >= min && x <= max;
  const text = x => typeof x === 'string' && x.length <= 20000 && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x);
  const fail = () => { throw new Error('Ungültige private Wortkartenstatistik.'); };
  if (!obj(raw) || Object.keys(raw).some(k => !['books', 'tr'].includes(k)) || !Array.isArray(raw.books) || JSON.stringify(raw.books) !== JSON.stringify(books) || !obj(raw.tr) || Object.keys(raw.tr).length !== 1 || !Object.hasOwn(raw.tr, key) || !obj(raw.tr[key]) || !Object.keys(raw.tr[key]).length || Object.keys(raw.tr[key]).length > 10000) fail();
  let nodes = 0;
  function safeTree(v, depth = 0) {
    // Vollständige Korpora überschreiten eine Million Knoten; Tiefe und Dateigröße bleiben begrenzt.
    if (++nodes > 3000000 || depth > 12) fail();
    if (typeof v === 'string') { if (!text(v)) fail(); }
    else if (typeof v === 'number') { if (!int(v)) fail(); }
    else if (Array.isArray(v)) v.forEach(x => safeTree(x, depth + 1));
    else if (obj(v)) for (const [k, x] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(k) || k.length > 200) fail();
      safeTree(x, depth + 1);
    } else fail();
  }
  safeTree(raw);
  for (const [lemma, entry] of Object.entries(raw.tr[key])) {
    if (!/^[0-9][0-9A-Za-z +.-]{0,39}$/.test(lemma) || !Array.isArray(entry) || entry.length !== 3) fail();
    const [groups, cells, paradigm] = entry;
    if (!Array.isArray(groups) || !groups.length || !Array.isArray(cells) || !cells.length || !obj(paradigm)) fail();
    const gi = x => int(x, 0, groups.length - 1);
    for (const g of groups) if (!Array.isArray(g) || !text(g[0]) || g.slice(1).some(f => !Array.isArray(f) || f.length !== 2 || !text(f[0]) || !int(f[1], 1))) fail();
    for (const c of cells) {
      if (!Array.isArray(c) || c.length !== 5 || !gi(c[0]) || typeof c[1] !== 'string' || !/^[HA][A-Za-z0-9/]{1,79}$/.test(c[1]) || !int(c[2], 1, 30000) || typeof c[3] !== 'string' || !/^[0-9a-z]+(?:\.[0-9a-z]+)*$/.test(c[3]) || !text(c[4])) fail();
      const refs = c[3].split('.'); if (refs.length !== c[2]) fail();
      let num = 0;
      for (const delta of refs) {
        num += parseInt(delta, 36);
        const book = books[Math.floor(num / 1000000)], ch = Math.floor(num % 1000000 / 1000), v = num % 1000;
        if (!int(num, 1, books.length * 1000000) || !ch || !v || !alignment[book]?.[ch + ':' + v]) fail();
      }
    }
    for (const forms of Object.values(paradigm)) {
      if (!obj(forms)) fail();
      for (const row of Object.values(forms)) {
        if (!Array.isArray(row)) fail();
        if (typeof row[0] === 'string') {
          if (row.length < 2 || row.length > 3 || !text(row[0]) || !gi(row[1]) || (row.length === 3 && !text(row[2]))) fail();
          continue;
        }
        if (row.length < 3 || row.length > 5 || !int(row[0], 2) || !int(row[1], 1) || !Array.isArray(row[2]) || !row[2].length || row[2].length > 6) fail();
        for (const top of row[2]) if (!Array.isArray(top) || top.length < 3 || top.length > 5 || !text(top[0]) || !int(top[1], 1, row[0]) || !gi(top[2]) || (top.length >= 4 && !text(top[3])) || (top.length === 5 && !int(top[4], 1, top[1]))) fail();
        if (row.length >= 4 && row[3] !== 0 && (!Array.isArray(row[3]) || row[3].some(g => !Array.isArray(g) || g.length !== 2 || !gi(g[0]) || !int(g[1], 1, row[0])))) fail();
        if (row.length === 5) {
          const c = row[4], pair = x => Array.isArray(x) && x.length === 2 && text(x[0]) && int(x[1], 1, row[0]);
          if (!Array.isArray(c) || c.length !== 4 || !text(c[0]) || !int(c[1], 1, row[0]) || !pair(c[2]) || !Array.isArray(c[3]) || c[3].some(x => !pair(x))) fail();
        }
      }
    }
  }
  return JSON.parse(JSON.stringify(raw));
}
module.exports = { validateRenderings };
