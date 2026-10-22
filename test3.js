const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const R = require('./reader');
const O = require('./offline');

(async () => {
  // ---------- Fußnoten ----------
  const fn = R.splitFootnotes('When God began<sup class="footnote-marker">a</sup><i class="footnote"><b>When</b> In <i>contrast</i> to others.</i> heaven<sup class="footnote-marker">b</sup><i class="footnote">Zweite</i> end.');
  assert.strictEqual(fn.main, 'When God began<sup data-fn="0">a</sup> heaven<sup data-fn="1">b</sup> end.');
  // Das Fußnotenzeichen übersteht die Bereinigung, beliebige andere Attribute nicht
  assert.strictEqual(R.cleanHtml(fn.main), fn.main);
  assert.strictEqual(R.cleanHtml('<sup data-fn="3">a</sup><sup class="x" onclick="evil()">b</sup><sup data-fn="1;x">c</sup>'), '<sup data-fn="3">a</sup><sup>b</sup><sup>c</sup>');
  assert.strictEqual(fn.notes.length, 2);
  assert.strictEqual(fn.notes[0].marker, 'a');
  assert.strictEqual(fn.notes[0].html, '<b>When</b> In <i>contrast</i> to others.');
  assert.strictEqual(fn.notes[1].html, 'Zweite');
  assert.deepStrictEqual(R.splitFootnotes('ohne Fußnote'), { main: 'ohne Fußnote', notes: [] });
  assert.strictEqual(R.cleanHtml('<span class="x">a</span><b style="y">b</b><script>x</script>'), 'a<b>b</b>x');

  // ---------- Abschnitte ----------
  // Talmud: Index 2 = 2a
  const talmud = [[], [], ['l1', 'l2'], ['m1']];
  const ts = R.sectionsOf(talmud, ['Daf', 'Line']);
  assert.deepStrictEqual(ts.map(s => s.label), ['Daf 2a', 'Daf 2b']);
  assert.strictEqual(R.dafLabel(126), '64a');
  // Kapitel/Vers
  const gen = [['a', 'b'], ['c']];
  assert.deepStrictEqual(R.sectionsOf(gen, ['Chapter', 'Verse']).map(s => s.label), ['Kapitel 1', 'Kapitel 2']);
  // Komplexer Text mit Objekten (Haggadah/Siddur-Stil)
  const cx = { Kadesh: ['a', 'b'], Urchatz: ['c'], Teil: { Unter: ['d'] }, Leer: [] };
  assert.deepStrictEqual(R.sectionsOf(cx, null).map(s => s.label), ['Kadesh', 'Urchatz', 'Teil › Unter']);
  // Flacher Text (nur Strings) = ein Abschnitt
  assert.deepStrictEqual(R.sectionsOf(['x', 'y'], null).map(s => s.label), ['Text']);
  // Tiefer verschachtelt (Kapitel > Vers > Kommentar)
  const deep = [[['k1', 'k2'], ['k3']]];
  const secs = R.sectionsOf(deep, ['Chapter', 'Verse', 'Comment']);
  assert.deepStrictEqual(secs.map(s => s.label), ['Kapitel 1 › Vers 1', 'Kapitel 1 › Vers 2']);

  // Zeilen glätten und ausrichten
  const rows = R.flattenNode(R.getByPath(gen, [0]));
  assert.deepStrictEqual(rows, [{ label: '1', html: 'a' }, { label: '2', html: 'b' }]);
  const aligned = R.alignRows([[{ label: '1', html: 'he1' }, { label: '2', html: 'he2' }], [{ label: '2', html: 'en2' }, { label: '3', html: 'en3' }]]);
  assert.deepStrictEqual(aligned.map(r => [r.label, r.cells]), [['1', ['he1', null]], ['2', ['he2', 'en2']], ['3', [null, 'en3']]]);

  // Fundstelle auffinden
  assert.deepStrictEqual(R.locate(talmud, [2, 1], ['Daf', 'Line']), { path: [2], label: '2' });
  assert.deepStrictEqual(R.locate(cx, ['Kadesh', 1], null), { path: ['Kadesh'], label: '2' });
  assert.deepStrictEqual(R.locate(['x', 'y'], [1], null), { path: [], label: '2' });

  // Suche normalisieren (Vokalzeichen, Tags)
  assert.strictEqual(R.normalize('<b>בְּרֵאשִׁ֖ית</b>  Bara'), 'בראשית bara');
  // Tag mitten im Wort darf das Wort nicht zerteilen (Genesis 1:1: <big>ב</big>)
  assert.strictEqual(R.normalize('<big>ב</big>ְּרֵאשִׁ֖ית בָּרָ֣א'), 'בראשית ברא');
  // Maqaf trennt Wörter, Fußnotenzeichen werden nicht Teil des Textes
  assert.strictEqual(R.normalize('אֵ֥ת־הָאָֽרֶץ'), 'את הארץ');
  assert.strictEqual(R.normalize('create<sup class="footnote-marker">a</sup><i class="footnote">Note</i> heaven'), 'create note heaven');
  assert.strictEqual(R.normalize('eins<br>zwei'), 'eins zwei');

  // ---------- Katalog / Plan ----------
  const mk = (title, cats, language, versionTitle) => ({
    title, categories: cats, language, versionTitle,
    json_url: `https://storage.googleapis.com/sefaria-export/json/${cats.map(encodeURIComponent).join('/')}/${encodeURIComponent(title)}/${language}/${encodeURIComponent(versionTitle)}.json`,
  });
  const catalog = { books: [
    mk('Genesis', ['Tanakh', 'Torah'], 'Hebrew', 'merged'),
    mk('Genesis', ['Tanakh', 'Torah'], 'Hebrew', 'Miqra'),
    mk('Genesis', ['Tanakh', 'Torah'], 'English', 'merged'),
    mk('Genesis', ['Tanakh', 'Torah'], 'English', 'JPS 1985'),
    mk('Genesis', ['Tanakh', 'Torah'], 'English', 'Die Bücher Moses [de]'),
    mk('Genesis', ['Tanakh', 'Torah'], 'English', 'Livre [fr]'),
    mk('Berakhot', ['Talmud', 'Bavli'], 'Hebrew', 'merged'),
    mk('Berakhot', ['Talmud', 'Bavli'], 'English', 'Nur eine Version'),
  ] };
  const groups = O.buildGroups(catalog);
  assert.strictEqual(groups.length, 2);
  const sum = O.summarize(groups);
  assert.deepStrictEqual(sum.map(s => [s.title, s.he, s.en, s.de]), [['Genesis', true, true, 1], ['Berakhot', true, true, 0]]);
  assert.strictEqual(O.kindOf(catalog.books[4]), 'de');
  assert.strictEqual(O.kindOf(catalog.books[5]), 'other');

  const p1 = O.planEntries(groups, { cats: ['Tanakh'] }, { he: true, en: true, de: false });
  assert.deepStrictEqual(p1.entries.map(e => e.versionTitle), ['merged', 'merged']); // nur zusammengeführte Fassungen
  const p2 = O.planEntries(groups, { cats: ['Tanakh/Torah'] }, { he: false, en: false, de: true });
  assert.deepStrictEqual(p2.entries.map(e => e.versionTitle), ['Die Bücher Moses [de]']);
  const p3 = O.planEntries(groups, { ids: [groups[1].id] }, { he: true, en: true, de: false });
  assert.deepStrictEqual(p3.entries.map(e => e.versionTitle), ['merged', 'Nur eine Version']); // ohne merged: vorhandene Version
  const p4 = O.planEntries(groups, { cats: ['Tanakh'] }, { he: true, en: true, de: true, allVersions: true });
  assert.strictEqual(p4.files, 6);
  assert.strictEqual(O.planEntries(groups, { cats: ['Tanak'] }, { he: true }).files, 0); // Präfix nur an Pfadgrenzen
  assert.strictEqual(O.relPathOf(catalog.books[4]), 'json/Tanakh/Torah/Genesis/English/Die Bücher Moses [de].json');
  assert.strictEqual(O.relPathOf({ json_url: 'https://storage.googleapis.com/sefaria-export/json/A/B%3AC/D%20/English/x%3F.json' }), 'json/A/B_C/D/English/x_.json');

  // ---------- Bibliothek (mit gefälschtem Netzwerk) ----------
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sefaria-lib-'));
  const files = {
    [catalog.books[0].json_url]: { title: 'Genesis', heTitle: 'בראשית', language: 'Hebrew', versionTitle: 'merged', sectionNames: ['Chapter', 'Verse'], text: [['בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים', 'ב'], ['ג']] },
    [catalog.books[2].json_url]: { title: 'Genesis', language: 'English', versionTitle: 'merged', sectionNames: ['Chapter', 'Verse'], text: [['In the beginning<sup class="footnote-marker">a</sup><i class="footnote">Note</i>', 'two'], ['three']] },
  };
  let calls = 0;
  const lib = new O.Library(dir, async url => { calls++; if (!files[url]) throw new Error('HTTP 404'); return Buffer.from(JSON.stringify(files[url])); });
  await lib.load();
  const progress = [];
  const r1 = await lib.downloadEntries([catalog.books[0], catalog.books[2], catalog.books[3]], { concurrency: 2, onProgress: p => progress.push(p.done) });
  assert.strictEqual(r1.done, 3);
  assert.strictEqual(r1.failed.length, 1); // JPS 1985 gibt es im Test-Netzwerk nicht
  assert.strictEqual(lib.stats().files, 2);
  const callsAfter = calls;
  await lib.downloadEntries([catalog.books[0], catalog.books[2]]);
  assert.strictEqual(calls, callsAfter); // bereits vorhandene Dateien werden nicht erneut geladen

  // Index übersteht Neustart
  const lib2 = await new O.Library(dir, null).load();
  assert.strictEqual(lib2.stats().files, 2);
  const rd = await lib2.read(O.relPathOf(catalog.books[0]));
  assert.strictEqual(rd.heTitle, 'בראשית');
  await assert.rejects(() => lib2.read('../../etc/passwd'));

  // Suche: unabhängig von Vokalzeichen, mit Fundstelle
  const sr = await lib2.search({ query: 'ברא', kinds: ['he'] });
  assert.strictEqual(sr.results.length, 1);
  assert.deepStrictEqual(sr.results[0].path, [0, 0]);
  assert.strictEqual(sr.results[0].where, 'Kapitel 1 · 1');
  assert.deepStrictEqual(sr.results[0].loc, { path: [0], label: '1' });
  const sr2 = await lib2.search({ query: 'beginning', kinds: ['he', 'en'] });
  assert.strictEqual(sr2.results.length, 1);
  assert.strictEqual(sr2.results[0].kind, 'en');
  const sr3 = await lib2.search({ query: 'e', kinds: ['en'], limit: 1 });
  assert.strictEqual(sr3.truncated, true);

  // Datei im Finder gelöscht -> Index bereinigen
  fs.unlinkSync(path.join(dir, O.relPathOf(catalog.books[2])));
  assert.strictEqual(await lib2.pruneMissing(), 1);
  assert.strictEqual(lib2.stats().files, 1);


  // Aktualisieren: geänderte und neue Dateien erkennen
  {
    const du = fs.mkdtempSync(path.join(os.tmpdir(), 'sefaria-upd-'));
    const lu = await new O.Library(du, async url => Buffer.from(JSON.stringify(files[url]))).load();
    await lu.downloadEntries([catalog.books[0], catalog.books[2]]);
    const sizes = { [catalog.books[0].json_url]: lu.index.entries[O.relPathOf(catalog.books[0])].bytes + 5, [catalog.books[2].json_url]: lu.index.entries[O.relPathOf(catalog.books[2])].bytes };
    const up = await lu.checkUpdates(catalog.books, async u => sizes[u] ?? null);
    assert.deepStrictEqual(up.changed.map(e => e.language), ['Hebrew']);
    assert.deepStrictEqual(up.added.map(e => e.versionTitle), ['Die Bücher Moses [de]'].slice(0, 0)); // keine deutsche Fassung lokal -> nichts neu
    const ap = await lu.applyUpdates(up.changed, up.added, {});
    assert.strictEqual(ap.done, 1);
    assert.strictEqual(lu.stats().files, 2);
    await lu.addOwn({ title: 'Genesis', kind: 'de', versionTitle: 'x', categories: ['Tanakh', 'Torah'], text: [['a']], sectionNames: null });
    const up2 = await lu.checkUpdates(catalog.books, async () => null);
    assert.strictEqual(up2.changed.length, 0);
    fs.rmSync(du, { recursive: true, force: true });
  }

  // Suche: Kategorie-Filter und hebräische Präfixe
  const srp = await lib2.search({ query: 'ארץ', kinds: ['he'], prefix: true });
  // (leere Prüfung entfernt)
  assert.strictEqual((await lib2.search({ query: 'ברא', kinds: ['he'], category: 'Talmud' })).results.length, 0);
  assert.strictEqual((await lib2.search({ query: 'ברא', kinds: ['he'], category: 'Tanakh/Torah' })).results.length, 1);
  assert.strictEqual((await lib2.search({ query: 'ברא', kinds: ['he'], category: 'Tanak' })).results.length, 0);
  const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'sefaria-pre-'));
  const lp = await new O.Library(dir3, null).load();
  await lp.addOwn({ title: 'T', kind: 'he', versionTitle: 'v', text: [['וברא אלהים', 'הארץ היתה']], sectionNames: ['Chapter', 'Verse'] });
  assert.strictEqual((await lp.search({ query: 'ברא', kinds: ['he'] })).results.length, 1);   // enthalten
  assert.strictEqual((await lp.search({ query: 'ארץ', kinds: ['he'] })).results.length, 1);   // enthalten (Teilwort)
  assert.strictEqual((await lp.search({ query: 'ארץ', kinds: ['he'], prefix: true })).results.length, 1);
  assert.strictEqual((await lp.search({ query: 'לארץ', kinds: ['he'], prefix: true })).results.length, 0);
  assert.strictEqual((await lp.search({ query: 'אלה', kinds: ['he'] })).results.length, 1);              // Teilwort ohne Option
  assert.strictEqual((await lp.search({ query: 'אלה', kinds: ['he'], prefix: true })).results.length, 0); // kein ganzes Wort
  fs.rmSync(dir3, { recursive: true, force: true });

  // ---------- Eigene Texte ----------
  const po = O.parseOwn('Kapitel 1\nEins\nZwei\nKapitel 2\nDrei', 'x.txt');
  assert.deepStrictEqual(po.text, [['Eins', 'Zwei'], ['Drei']]);
  assert.strictEqual(po.chapters, 2);
  const pc = O.parseOwn('Ref,Text\n"Genesis 1:2","zwei, mit Komma"\nGenesis 1:1,eins\nmüll,x', 'a.csv');
  assert.deepStrictEqual(pc.text, [['eins', 'zwei, mit Komma']]);
  assert.strictEqual(pc.warnings.length, 1);
  assert.deepStrictEqual(O.parseOwn('{"text":[["a"],["b"]],"sectionNames":["Chapter","Verse"]}', 'a.json').text, [['a'], ['b']]);
  assert.throws(() => O.parseOwn('   ', 'a.txt'));
  const od = fs.mkdtempSync(path.join(os.tmpdir(), 'sefaria-own-'));
  const ol = await new O.Library(od, null).load();
  const oe = await ol.addOwn({ title: 'Genesis', kind: 'de', versionTitle: 'Mein Test', categories: ['Tanakh', 'Torah'], text: po.text, sectionNames: po.sectionNames });
  assert.strictEqual(oe.own, true);
  assert.strictEqual((await ol.read(oe.rel)).text[1][0], 'Drei');
  assert.strictEqual((await ol.search({ query: 'drei', kinds: ['de'] })).results.length, 1);
  await ol.removeOwn(oe.rel);
  assert.strictEqual(ol.stats().files, 0);
  await assert.rejects(() => ol.removeOwn('json/x.json'));
  fs.rmSync(od, { recursive: true, force: true });

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Offline-Tests bestanden.');
})().catch(e => { console.error(e); process.exit(1); });
