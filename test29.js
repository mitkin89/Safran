// „Talmud & Midrasch“ im Überblick: Gliederung nach Werkgruppen
const assert = require('assert');
const P = require('./passage.js');
const g = (other, cat) => P.rabbinicGroup({ other, cat });
assert.strictEqual(g('Mishnah Shabbat 19:3', 'Mishnah'), 'Mischna');
assert.strictEqual(g('Pirkei Avot 5:21', 'Mishnah'), 'Mischna');
assert.strictEqual(g('Shabbat 86a:2', 'Talmud'), 'Babylonischer Talmud');
assert.strictEqual(g('Jerusalem Talmud Shabbat 19:3:5', 'Talmud'), 'Jerusalemer Talmud');
assert.strictEqual(g('Tosefta Shabbat 9:3', 'Tosefta'), 'Tosefta');
assert.strictEqual(g('Genesis Rabbah 1:1', 'Midrash'), 'Midrasch Rabba');
assert.strictEqual(g('Sifra, Kedoshim 1:1', 'Midrash'), 'Halachische Midraschim');
assert.strictEqual(g('Mekhilta d\'Rabbi Yishmael 12:1', 'Midrash'), 'Halachische Midraschim');
assert.strictEqual(g('Pesikta DeRav Kahanna 1:1', 'Midrash'), 'Weitere Midraschim');
assert.strictEqual(g('Avot DeRabbi Natan 37:4', 'Midrash'), 'Kleine Traktate');
assert.strictEqual(g('Tractate Soferim 21:9', 'Talmud'), 'Kleine Traktate');
assert.strictEqual(g('Tractate Kallah Rabbati 1:13', 'Talmud'), 'Kleine Traktate');
assert.ok(P.RGROUPS.includes(g('Etwas 1:1', 'x')));
console.log('Werkgruppen ok');
