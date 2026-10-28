// Wochenabschnitte: 54 Stück, lückenlose Folge, Suche nach Name/Schreibweise/Hebräisch
const assert = require('assert'), P = require('./parashot');
assert.strictEqual(P.PARASHOT.length, 54);
assert.strictEqual(P.find('Parascha Noach').from, '6:9');
assert.strictEqual(P.find('פרשת לך לך').name, 'Lech Lecha');
assert.strictEqual(P.find('Bereschit').name, 'Bereshit');
assert.strictEqual(P.find('Genesis'), null);
assert.ok(P.suggest('vay').length >= 4);
// jede Parascha beginnt im selben Buch direkt nach dem Ende der vorigen (Kapitel nicht kleiner)
for (let i = 1; i < P.PARASHOT.length; i++) {
  const a = P.PARASHOT[i - 1], b = P.PARASHOT[i];
  if (a.book === b.book) assert.ok(+b.from.split(':')[0] >= +a.to.split(':')[0], a.name + ' → ' + b.name);
}
console.log('Parascha-Tests ok');
