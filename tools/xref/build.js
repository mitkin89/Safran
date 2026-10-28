// Wandelt OpenBible-Querverweise (CC BY 4.0, openbible.info/labs/cross-references) in xref.json um.
// Nur Tanach (kein Neues Testament), beide Richtungen, Schwelle: Stimmen >= MIN.
// Aufruf: node tools/xref/build.js [MIN]
const fs = require('fs'), path = require('path');
const MIN = +(process.argv.slice(2).find(a => /^\d+$/.test(a)) || 2);
const N = { Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy', Josh: 'Joshua', Judg: 'Judges', '1Sam': 'I Samuel', '2Sam': 'II Samuel', '1Kgs': 'I Kings', '2Kgs': 'II Kings', Isa: 'Isaiah', Jer: 'Jeremiah', Ezek: 'Ezekiel', Hos: 'Hosea', Joel: 'Joel', Amos: 'Amos', Obad: 'Obadiah', Jonah: 'Jonah', Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi', Ps: 'Psalms', Prov: 'Proverbs', Job: 'Job', Song: 'Song of Songs', Ruth: 'Ruth', Lam: 'Lamentations', Eccl: 'Ecclesiastes', Esth: 'Esther', Dan: 'Daniel', Ezra: 'Ezra', Neh: 'Nehemiah', '1Chr': 'I Chronicles', '2Chr': 'II Chronicles' };
const pr = s => { const m = /^(\w+)\.(\d+)\.(\d+)$/.exec(s); return m && N[m[1]] ? { b: N[m[1]], c: +m[2], v: +m[3] } : null; };
const out = {}, seen = new Set();
const add = (a1, a2, other, votes) => {
  const key = a1.b + a1.c + ':' + a1.v + '>' + other; if (seen.has(key)) return; seen.add(key);
  const bk = out[a1.b] || (out[a1.b] = {}), ch = bk[a1.c] || (bk[a1.c] = []);
  ch.push([a1.v, a2 ? (a2.c === a1.c ? a2.v : 99999) : a1.v, other, votes]);
};
const fmt = (x, y) => !y ? `${x.b} ${x.c}:${x.v}` : x.c === y.c ? `${x.b} ${x.c}:${x.v}-${y.v}` : `${x.b} ${x.c}:${x.v}-${y.c}:${y.v}`;
let n = 0;
for (const l of fs.readFileSync(path.join(__dirname, 'cross_references.txt'), 'utf8').split('\n').slice(1)) {
  const [f, t, vs] = l.split('\t'); const votes = +vs;
  if (!f || !(votes >= MIN)) continue;
  const [t1, t2] = t.split('-'), a = pr(f), b1 = pr(t1), b2 = t2 ? pr(t2) : null;
  if (!a || !b1 || (t2 && !b2) || a.b === b1.b && a.c === b1.c && a.v === b1.v) continue; // Neues Testament oder unbekannt: überspringen
  add(a, null, fmt(b1, b2), votes);
  add(b1, b2, fmt(a, null), votes);
  n++;
}
// Querverweis-Fußnoten (℘) aus Bibelausgaben, von tools/bibeln/build.py erzeugt: [Quellbuch, Kap, v1, v2, Zielbuch, Kap, v1, Kap2, v2]; v1 = 0: ganzes Kapitel
try {
  if (process.argv.includes('--no-bibeln')) throw new Error('übersprungen (--no-bibeln: Verweise aus geschützten Bibelausgaben nicht in xref.json)');
  let m = 0;
  for (const [sb, sc, sv1, sv2, tb, tc, tv1, tc2, tv2] of JSON.parse(fs.readFileSync(path.join(__dirname, 'bibeln-xref.json'), 'utf8'))) {
    if (!N[sb] || !N[tb]) continue;
    const a = { b: N[sb], c: sc, v: sv1 }, a2 = sv2 > sv1 ? { b: a.b, c: sc, v: sv2 } : null;
    if (tv1 === 0) { add(a, a2, `${N[tb]} ${tc}`, 3); m++; continue; }
    const t1 = { b: N[tb], c: tc, v: tv1 }, t2 = tc2 !== tc || tv2 !== tv1 ? { b: N[tb], c: tc2, v: tv2 } : null;
    if (a.b === t1.b && a.c === t1.c && a.v === t1.v) continue;
    add(a, a2, fmt(t1, t2), 3);
    add(t1, t2, fmt(a, a2), 3);
    m++;
  }
  console.log(m, 'Verweise aus Bibelausgaben');
} catch (e) { console.log('keine Bibelausgaben-Verweise:', e.message); }
fs.writeFileSync(path.join(__dirname, '..', '..', 'xref.json'), JSON.stringify(out));
console.log(MIN, n, 'Verweise;', fs.statSync(path.join(__dirname, '..', '..', 'xref.json')).size, 'Bytes');
