// Formentabelle: Formen-Index (oshb-forms.js), Zerlegung der Wörter, Tabellen-Modell und Belegstellen
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('./forms.js');

// Wort einordnen: Vorsilben abtrennen, Akzente entfernen, Wortanfang vereinheitlichen
let a = F.analyze('בְּרֵאשִׁ֖ית', 'HR/Ncfsa', 'b/7225');
assert.deepStrictEqual([a.lemma, a.key, a.form], ['7225', 'HNcfsa', 'רֵאשִׁית']);
a = F.analyze('וְהָאָ֗רֶץ', 'HC/Td/Ncbsa', 'c/d/776'); // der Artikel bleibt, das ו davor nicht
assert.deepStrictEqual([a.key, a.form], ['HNcbsa*', 'הָאָרֶץ']);
a = F.analyze('וַיֹּ֥אמֶר', 'HC/Vqw3ms', 'c/559'); // wajjiqtol steht wie belegt
assert.deepStrictEqual([a.key, a.form], ['HVqw3ms', 'וַיֹּאמֶר']);
a = F.analyze('וְכָתַ֥ב', 'HC/Vqp3ms', 'c/3789'); // Perfekt mit ו (von der OSHB nicht als wᵉqatal bestimmt): wie belegt, als „mit ו“ gekennzeichnet
assert.deepStrictEqual([a.key, a.form, a.raw], ['HVqp3ms', 'וְכָתַב', '+וְכָתַב']);
a = F.analyze('וּבְכֹ֖ל', 'HC/R/Ncmsc', 'c/b/3605'); // sonst wird das ו abgetrennt; nach der Vorsilbe fehlt das Dagesch, die Form für sich hat es
assert.strictEqual(a.form, 'כֹּל');
a = F.analyze('לִכְתֹּ֛ב', 'HR/Vqc', 'l/3789'); // Infinitiv mit Präposition bleibt zusammen
assert.strictEqual(a.form, 'לִכְתֹּב');
a = F.analyze('לֵֽאלֹהִ֑ים', 'HR/Ncmpa', 'l/430'); // nicht abtrennbar (א ohne Vokal): wie belegt, gekennzeichnet
assert.deepStrictEqual([a.form, a.raw], ['לֵאלֹהִים', '-לֵאלֹהִים']);
a = F.analyze('מַלְכּ֑וֹ', 'HNcmsc/Sp3ms', '4428');
assert.strictEqual(a.key, 'HNcmsc/Sp3ms');
assert.strictEqual(F.analyze('לָ֖הּ', 'HR/Sp3fs', 'l'), null); // ohne Lemma
assert.strictEqual(F.analyze('ענוי', 'HAampc', '6035'), null); // unvokalisiertes Ketiv

// Der mitgelieferte Index
global.window = {}; eval(fs.readFileSync(path.join(__dirname, 'oshb-forms.js'), 'utf8'));
const D = window.OSHB_FORMS;
assert.strictEqual(D.books.length, 39);
assert(Object.keys(D.lem).length > 8000);
const sec = (m, title) => m.sections.find(s => s.title === title);
const blk = (s, title) => s.blocks.find(b => b.title === title);
const row = (t, label) => t.rows.find(r => r.label === label || r.label.startsWith(label + ' – '));
const fs0 = cell => cell.map(x => x.f);

for (const [lemma, form] of [['559', 'אָמַר'], ['3789', 'כָּתַב']]) {
  const m = F.model(D, lemma);
  const pf = blk(sec(m, 'Qal'), 'Perfekt');
  assert(fs0(row(pf.tables[0], '3. m. Sg.').cells[0]).includes(form), lemma);
  assert.strictEqual(row(pf.tables[0], '3. m. Sg.').cells[0][0].f, form); // häufigste Form zuerst
  assert.strictEqual(m.total, m.forms.reduce((s, x) => s + x.n, 0));
  assert.strictEqual(m.total, m.sections.reduce((s, x) => s + x.n, 0));
}
{ // אמר: Stämme und Zeitformen in der üblichen Reihenfolge, 1. c. Sg., wajjiqtol, Partizip
  const m = F.model(D, '559'), q = sec(m, 'Qal');
  assert.deepStrictEqual(m.sections.map(s => s.title).slice(0, 2), ['Qal', 'Nif‘al']);
  assert.deepStrictEqual(q.blocks.map(b => b.title).slice(0, 4), ['Perfekt', 'Perfekt consecutivum (wᵉqatal)', 'Imperfekt', 'Imperfekt consecutivum (wajjiqtol)']);
  assert(fs0(row(blk(q, 'Perfekt').tables[0], '1. c. Sg.').cells[0]).includes('אָמַרְתִּי'));
  assert.deepStrictEqual(blk(q, 'Perfekt').tables[0].rows.map(r => r.label).slice(0, 5), ['1. c. Sg. – ich', '2. m. Sg. – du', '2. f. Sg. – du', '3. m. Sg. – er', '3. f. Sg. – sie']);
  assert.strictEqual(row(blk(q, 'Imperfekt consecutivum (wajjiqtol)').tables[0], '3. m. Sg.').cells[0][0].f, 'וַיֹּאמֶר');
  const pt = blk(q, 'Partizip aktiv').tables[0];
  assert(pt.cols.includes('st. abs.')); assert(fs0(row(pt, 'm. Sg.').cells[0]).includes('אֹמֵר'));
  assert(blk(q, 'Infinitivus constructus').tables[0].rows[0].cells[0].some(x => x.f === 'לֵאמֹר'));
}
{ // Perfekt mit ו steht nicht unter dem einfachen Perfekt: אָמַרְתָּ „du hast gesagt“ 19×, וְאָמַרְתָּ „und sprich“ (Ex 9,13 u. a.) 7× als „mit ו“ dahinter
  const m = F.model(D, '559'), c = row(blk(sec(m, 'Qal'), 'Perfekt').tables[0], '2. m. Sg.').cells[0];
  assert.deepStrictEqual(c.map(x => [x.f, x.n, x.waw]), [['אָמַרְתָּ', 19, false], ['וְאָמַרְתָּ', 7, true]]);
  assert(F.refs(D, m, c[1].i).some(r => r.book === 'Exodus' && r.ch === 9 && r.v === 13));
  const html = F.render(m);
  assert(html.includes('<span class="fmWL" dir="auto">mit <span lang="he">ו</span></span><button type="button" class="fmF waw"'));
  assert(F.topForms(m, 500).list.some(x => x.f === 'וְאָמַרְתָּ' && x.n === 7));
}
{ // Nomen: Genus/Numerus × Status, Suffixformen nach Person
  const m = F.model(D, '4428'), t = sec(m, 'Nomen').blocks[0].tables;
  assert.deepStrictEqual(t[0].cols, ['st. abs.', 'mit Artikel', 'st. cs.']);
  assert.strictEqual(row(t[0], 'm. Sg.').cells[1][0].f, 'הַמֶּלֶךְ');
  assert.strictEqual(row(t[0], 'm. Pl.').cells[2][0].f, 'מַלְכֵי');
  const sx = t.find(x => x.title === 'mit Suffix');
  assert.strictEqual(row(sx, '3. m. Sg.').cells[0][0].f, 'מַלְכּוֹ');
  assert(fs0(row(sx, '1. c. Pl.').cells[1]).includes('מְלָכֵינוּ'));
}
{ // Belegstellen: stimmen mit dem Text überein
  const m = F.model(D, '3789');
  const c = row(blk(sec(m, 'Qal'), 'Perfekt').tables[0], '3. m. Sg.').cells[0][0];
  const rs = F.refs(D, m, c.i);
  assert.strictEqual(rs.reduce((s, r) => s + r.n, 0), c.n);
  const r = rs[0];
  const txt = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled/own', r.book, 'he/Westminster Leningrad Codex (OSHB, mit Morphologie).json'), 'utf8')).text[r.ch - 1][r.v - 1];
  assert(F.clean(txt).includes(F.clean('כָתַב').replace('ּ', '')) || F.clean(txt).includes('כָּתַב'), `${r.book} ${r.ch}:${r.v}`);
  const html = F.render(m, { current: { key: 'HVqp3ms', form: 'כָּתַב' } });
  assert(html.includes('class="fmF cur"') && html.includes('כָּתַב') && html.includes('<table class="fmT">'));
}
{ // Aramäisch getrennt vom Hebräischen; Pronomen als einfache Liste
  assert(sec(F.model(D, '560'), 'Pe‘al (aramäisch)'));
  assert(F.model(D, '1931').sections[0].blocks[0].tables[0].rows.some(r => r.label.startsWith('3. m. Sg.')));
  assert.strictEqual(F.model(D, 'gibt es nicht'), null);
}
// Der Index ist auf dem Stand der mitgelieferten Westminster-Texte (sonst: node tools/oshb/forms.js)
assert.strictEqual(require('./tools/oshb/forms.js').make(), fs.readFileSync(path.join(__dirname, 'oshb-forms.js'), 'utf8'), 'oshb-forms.js ist veraltet: node tools/oshb/forms.js');
console.log('Formentabelle ok');
