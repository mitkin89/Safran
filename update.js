// Versionsvergleich für den Update-Hinweis (reine Funktionen, läuft in Node und in der Oberfläche)
function parse(v) { return String(v || '').replace(/^v/i, '').split('-')[0].split('.').map(x => parseInt(x, 10) || 0); }
// true, wenn a neuer ist als b ("1.10.0" > "1.9.2")
function newer(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
}
const updateExports = { newer, parse };
if (typeof module !== 'undefined' && module.exports) module.exports = updateExports; else window.Update = updateExports;
