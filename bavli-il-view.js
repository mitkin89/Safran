// Eigene Bavli-Wortanker: nie mit Westminster-Wortnummern oder Strong-IDs mischen.
(function (g) {
  'use strict';
  const versions = ['goldschmidt', 'pinner'];
  function indexPage(page) {
    const order = new Map(page.he.flat().map(([a], i) => [a, i]));
    const byWord = new Map(), groups = [];
    versions.forEach(version => page[version].forEach((entry, i) => {
      const anchors = [...entry.he].sort((a, b) => order.get(a) - order.get(b));
      const group = { ...entry, version, key: version + ':' + i, anchors, first: anchors[0] };
      groups.push(group);
      anchors.forEach(a => { if (!byWord.has(a)) byWord.set(a, []); byWord.get(a).push(group); });
    }));
    return { groups, byWord };
  }
  const visible = (group, proposals) => group.status === 'reviewed' || proposals;
  const statusLabel = group => group.status === 'reviewed' ? (group.he.length ? 'Im Kontext geprüft' : 'Geprüfter Übersetzerzusatz') : group.status === 'machine' ? 'Maschineller Vorschlag · noch nicht im Kontext geprüft' : 'Zuordnung offen';
  function open(data, initialPage, options = {}) {
    const old = document.getElementById('bavliInterlinear'); if (old) old.remove();
    const dialog = document.createElement('dialog'); dialog.id = 'bavliInterlinear'; dialog.className = 'bil-dialog';
    const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const header = make('header', 'bil-header'), heading = make('h2', '', 'Berachot · Wortzuordnung · Test');
    const select = make('select'); select.setAttribute('aria-label', 'Daf');
    Object.keys(data.pages).forEach(page => { const opt = make('option', '', page); opt.value = page; select.append(opt); });
    select.value = data.pages[initialPage] ? initialPage : Object.keys(data.pages)[0];
    const label = make('label'), check = make('input'); check.type = 'checkbox'; label.append(check, document.createTextNode(' Maschinelle Vorschläge zeigen'));
    const close = make('button', '', 'Schließen'); close.type = 'button'; close.onclick = () => dialog.close();
    header.append(heading, select, label, close);
    const notice = make('p', 'bil-notice', 'Nur im Kontext geprüfte Zuordnungen werden standardmäßig unterlegt. Punktiert: ungeprüfter Vorschlag. Gestrichelt: offen. Ein Klick verbindet die Wörter auch über Segmentgrenzen hinweg.');
    const stats = make('p', 'muted'), body = make('div', 'bil-body'); dialog.append(header, notice, stats, body);
    let current;
    function paint() {
      body.replaceChildren(); current = indexPage(data.pages[select.value]);
      const page = data.pages[select.value], proposals = check.checked;
      const count = status => current.groups.filter(x => x.status === status).reduce((n, x) => n + x.de.split(/\s+/).filter(Boolean).length, 0);
      stats.textContent = `${select.value}: ${count('reviewed')} deutsche Wörter mit geprüfter Zuordnung · ${count('machine')} mit maschinellem Vorschlag · ${count('uncertain')} offen (beide Fassungen zusammen).`;
      const hebrew = make('section', 'bil-he'); hebrew.lang = 'he'; hebrew.dir = 'rtl';
      page.he.forEach((row, ri) => {
        const line = make('div', 'bil-row'), num = make('span', 'bil-num', String(ri + 1)); line.append(num);
        row.forEach(([anchor, word]) => {
          const block = make('span', 'bil-word'), button = make('button', 'bil-heword', word); button.type = 'button'; button.dataset.anchor = anchor; button.title = anchor;
          block.append(button);
          versions.forEach(version => {
            const beneath = make('span', 'bil-under bil-' + version); beneath.lang = 'de'; beneath.dir = 'ltr';
            const matches = (current.byWord.get(anchor) || []).filter(x => x.version === version && visible(x, proposals));
            matches.filter(x => x.first === anchor).forEach((group, i) => {
              if (i) beneath.append(document.createTextNode(' … '));
              const span = make('button', 'bil-piece bil-' + group.status, group.de); span.type = 'button'; span.dataset.group = group.key; span.title = data.versions[version].label + ' · ' + statusLabel(group) + ' · ' + group.anchors.join(', '); beneath.append(span);
            });
            if (!beneath.firstChild && matches.length) { const dot = make('button', 'bil-piece bil-cont', '↖'); dot.type = 'button'; dot.dataset.group = matches[0].key; dot.title = 'Teil derselben Wortgruppe · ' + statusLabel(matches[0]); beneath.append(dot); }
            block.append(beneath);
          });
          line.append(block);
        });
        hebrew.append(line);
      });
      body.append(hebrew);
      const translations = make('div', 'bil-translations');
      versions.forEach(version => {
        const section = make('section'), title = make('h3', 'bil-' + version, data.versions[version].label), text = make('p', 'bil-german'); text.lang = 'de'; text.dir = 'ltr';
        current.groups.filter(x => x.version === version && x.de).forEach((group, i) => {
          if (i) text.append(document.createTextNode(' '));
          const span = make('span', 'bil-piece bil-' + group.status, group.de); span.dataset.group = group.key; span.title = statusLabel(group) + (group.anchors.length ? ' · ' + group.anchors.join(', ') : ' · kein Wortanker');
          if (visible(group, proposals)) { span.tabIndex = 0; span.setAttribute('role', 'button'); } else span.classList.add('bil-inactive');
          text.append(span);
        });
        section.append(title, text); translations.append(section);
      });
      body.append(translations);
    }
    function highlight(target) {
      if (!target || target.classList.contains('bil-inactive')) return;
      const keys = target.dataset.group ? new Set([target.dataset.group]) : new Set((current.byWord.get(target.dataset.anchor) || []).filter(x => visible(x, check.checked)).map(x => x.key));
      const anchors = new Set(current.groups.filter(x => keys.has(x.key)).flatMap(x => x.anchors));
      body.querySelectorAll('[data-anchor]').forEach(n => n.classList.toggle('bil-hit', anchors.has(n.dataset.anchor)));
      body.querySelectorAll('[data-group]').forEach(n => n.classList.toggle('bil-hit', keys.has(n.dataset.group)));
    }
    body.addEventListener('click', e => {
      const target = e.target.closest('[data-anchor], [data-group]');
      highlight(target);
      if (target && target.dataset.anchor && options.onWord) options.onWord(target, target.dataset.anchor);
    });
    body.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.group) { e.preventDefault(); highlight(e.target); } });
    select.onchange = paint; check.onchange = paint;
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog); paint(); dialog.showModal();
  }
  const api = { indexPage, visible, statusLabel, open };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.BavliInterlinear = api;
})(typeof window !== 'undefined' ? window : globalThis);
