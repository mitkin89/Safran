// Wortweiser Vergleich zweier Texte (LCS), Ausgabe als HTML mit <ins>/<del>
function words(s) { return String(s || '').split(/\s+/).filter(Boolean); }
function wordDiff(a, b) {
  const x = words(a), y = words(b), n = x.length, m = y.length;
  if (n * m > 4e6) return { same: false, ops: [{ t: 'del', w: x.join(' ') }, { t: 'ins', w: y.join(' ') }] }; // zu lang: nur Gesamtunterschied
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  const push = (t, w) => { const l = ops[ops.length - 1]; if (l && l.t === t) l.w += ' ' + w; else ops.push({ t, w }); };
  while (i < n && j < m) {
    if (x[i] === y[j]) { push('eq', x[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push('del', x[i++]);
    else push('ins', y[j++]);
  }
  while (i < n) push('del', x[i++]);
  while (j < m) push('ins', y[j++]);
  return { same: ops.every(o => o.t === 'eq'), ops };
}
// a = Vorlage, b = eigener Text: Gelöschtes (nur in a) rot, Neues (nur in b) grün
function diffHtml(a, b, esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))) {
  return wordDiff(a, b).ops.map(o => o.t === 'eq' ? esc(o.w) : o.t === 'del' ? `<del class="wd">${esc(o.w)}</del>` : `<ins class="wd">${esc(o.w)}</ins>`).join(' ');
}
const DiffLib = { wordDiff, diffHtml };
if (typeof module !== 'undefined' && module.exports) module.exports = DiffLib;
else window.DiffLib = DiffLib;
