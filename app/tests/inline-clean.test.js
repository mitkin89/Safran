'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanInline } = require('../lib');
const Reader = require('../reader');

const payloads = [
  '<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1);//', 'a<svg/onload=alert(1)>',
  '<script>alert(1)</script>', '<a href=javascript:alert(1)>x</a>', '<<img src=x onerror=alert(1)>',
  '<iframe srcdoc=x>', '<b onclick=alert(1)>x</b>',
];
// Wie die Vorlagen in renderer.js/library: Ergebnis steht vor einem eigenen „</p>“
const dangerous = html => /<(?!\/?(?:b|i|em|strong|small|big|sup|sub|br|u|span)>)[a-z!\/]/i.test(html) || /<[a-z][^>]*\s/i.test(html); // unerlaubtes Tag oder Tag mit Attributen

for (const [name, fn] of [['cleanInline', cleanInline], ['Reader.cleanHtml', Reader.cleanHtml]]) {
  test(`${name} neutralises active HTML`, () => {
    for (const p of payloads) assert.ok(!dangerous(fn(p)), `${p} -> ${fn(p)}`);
  });
  test(`${name} keeps legitimate formatting and text`, () => {
    assert.equal(fn('<b>a</b> <i>b</i><sup>1</sup><br>'), '<b>a</b> <i>b</i><sup>1</sup><br>');
    assert.equal(fn('בראשית & more'), 'בראשית & more');
  });
}
test('cleanInline masks a dangling tag', () => {
  assert.equal(cleanInline('x <img src=x onerror=alert(1);//'), 'x &lt;img src=x onerror=alert(1);//');
  assert.equal(cleanInline('a < b'), 'a &lt; b');
});
