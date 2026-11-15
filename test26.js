// Krauss, Talmudische Archäologie: Kurzzitate tragen den vollen Titel (abbr.gab.kbib, tools/krauss_ta),
// Vollzitate bleiben unmarkiert, der Lesetext-Filter (cleanHtml) lässt nur die erlaubte abbr-Form durch, Manifest-Hash stimmt
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./reader.js');

const REL = 'own/Talmudische Archäologie/de/Samuel Krauss, Talmudische Archäologie, Bände I–III (Leipzig 1910–1912) – Transkription mit Claude.json';
const buf = fs.readFileSync(path.join(__dirname, 'bundled', REL));
const book = JSON.parse(buf.toString('utf8'));
const BIB = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools', 'krauss_ta', 'bibliographie.json'), 'utf8'));
const all = book.text.flat().join('\n');
const abbr = [...all.matchAll(/<abbr class="gab kbib" data-t="([^"]*)">([\s\S]*?)<\/abbr>/g)].map(m => ({ t: m[1], s: m[2] }));

// Bibliographie
assert.ok(/Haus und Hof/.test(BIB['HELLWALD']));
assert.ok(/Haus und Hof/.test(BIB['HELLWALD, Haus und Hof']));
assert.ok(/Technologie und Terminologie/.test(BIB['BLÜMNER, Technol.']));
assert.ok(/Privatleben der Römer/.test(BIB['MARQ., Pl.']));
assert.ok(/Lehnwörter/.test(BIB['Lwr']));
assert.ok(/Palästina-Vereins/.test(BIB['ZDPV']));
assert.ok(BIB['L. LÖW'].includes('; oder: '));               // mehrdeutig: alle Kandidaten
assert.ok(/Pflanzennamen/.test(BIB['I. LÖW']));
for (const v of Object.values(BIB)) assert.ok(!/["<>&]/.test(v) && v.length <= 600);

// HELLWALD-Stellen: Kurzzitat mit „Haus und Hof“, das Vollzitat in der Literaturliste nicht
const hw = abbr.filter(a => a.s.startsWith('HELLWALD'));
assert.ok(hw.length >= 5);
assert.ok(hw.every(a => /Haus und Hof/.test(a.t)));
assert.ok(hw.some(a => a.s === 'HELLWALD, Haus und Hof'));     // „HELLWALD, Haus und Hof S. 46“
assert.ok(/<abbr class="gab kbib" data-t="[^"]*Haus und Hof[^"]*">HELLWALD<\/abbr> S\. 147/.test(all));
assert.ok(book.text[0][1].includes('FR. HELLWALD, Haus und Hof in ihrer Entwickelung'));
assert.ok(!/kbib[^>]*>[^<]*<\/abbr>, Haus und Hof in ihrer/.test(book.text[0][1]));
// weitere Kurzformen
assert.ok(abbr.some(a => a.s === 'MARQ., Pl.' && /Privatleben/.test(a.t)));
assert.ok(abbr.some(a => /^BLÜMNER, Techn/.test(a.s) && /Technologie/.test(a.t)));
assert.ok(abbr.some(a => a.s === 'RICH' && /Illustriertes Wörterbuch/.test(a.t)));
assert.ok(abbr.some(a => a.s === 'ZDPV'));
assert.ok(abbr.filter(a => a.s === 'Lwr').length > 1000);
assert.ok(!/<abbr[^>]*>[^<]*<abbr/.test(all));                  // nicht verschachtelt
assert.ok(!/I <abbr class="gab kbib"[^>]*>K<\/abbr> \d/.test(all)); // „I K 4,24“ = I Könige, kein Kohut

// Lesetext-Filter
const ok = '<abbr class="gab kbib" data-t="FR. HELLWALD, Haus und Hof, Leipz. 1888">HELLWALD</abbr> S. 147';
assert.strictEqual(R.cleanHtml(ok), ok);
assert.strictEqual(R.cleanHtml('<abbr class="gab kbib" data-t="x" onmouseover="evil()">y</abbr>'), 'y');
assert.strictEqual(R.cleanHtml('<abbr title="x">y</abbr>'), 'y');
assert.strictEqual(R.cleanHtml('a</abbr>b'), 'ab');
const par = book.text.flat().find(p => /footnote">[^<]*<abbr class="gab kbib"[^>]*>HELLWALD<\/abbr> S\. 147/.test(p));
const fn = R.splitFootnotes(par);                               // Fußnote mit Kurzzitat bleibt markiert
assert.ok(fn.notes.some(n => /<abbr class="gab kbib" data-t="[^"]*Haus und Hof[^"]*">HELLWALD<\/abbr>/.test(R.cleanHtml(n.html))));

// Manifest
const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundled', 'manifest.json'), 'utf8'));
assert.strictEqual(man.items.find(x => x.rel === REL).hash, crypto.createHash('sha1').update(buf).digest('hex'));
console.log('test25 ok:', abbr.length, 'Kurzzitate');
