// Zweites Lesefenster: Dieselbe Seite läuft ein zweites Mal in einem Rahmen (?pane=2). Hier werden die Einstellungen getrennt gespeichert.
(function () {
  if (!/[?&]pane=2\b/.test(location.search)) return;
  document.documentElement.classList.add('pane2');
  const SEP = new Set(['session', 'history', 'recentOpen', 'panel']);
  const gi = Storage.prototype.getItem, si = Storage.prototype.setItem, ri = Storage.prototype.removeItem;
  const k = key => (SEP.has(key) ? 'p2:' + key : key);
  Storage.prototype.getItem = function (key) { return gi.call(this, k(key)); };
  Storage.prototype.setItem = function (key, v) { return si.call(this, k(key), v); };
  Storage.prototype.removeItem = function (key) { return ri.call(this, k(key)); };
  try { if (gi.call(localStorage, 'p2:panel') === null) si.call(localStorage, 'p2:panel', '0'); } catch { /* egal */ }
})();
