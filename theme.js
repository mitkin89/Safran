// Erscheinungsbild: automatisch (System), hell oder dunkel. Wird vor dem Aufbau der Seite gesetzt, damit nichts aufblitzt.
(function () {
  const get = () => { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } };
  const apply = t => { if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  apply(get());
  window.Theme = { get, set(t) { try { localStorage.setItem('theme', t); } catch { /* egal */ } apply(t); } };
  window.addEventListener('storage', e => { if (e.key === 'theme') apply(get()); }); // das zweite Fenster folgt
})();
