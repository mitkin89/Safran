// node links.js <Projektordner>: Bibelstellen im BDB (Ps 27:13, 1Sam 9:3 …) in Quellenlinks umwandeln (<a class="dsrc" data-sref="Psalms 27:13">);
// Klick öffnet den Vers im Reader. Schreibt bundled/dict/<id>.json.gz und das Wörterbuch-Manifest neu (Prüfsumme des unkomprimierten Inhalts).
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const P = path.resolve(process.argv[2]), dir = path.join(P, 'bundled', 'dict');
const BOOK = { Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy', Josh: 'Joshua', Judg: 'Judges', Isa: 'Isaiah', Jer: 'Jeremiah', Ezek: 'Ezekiel', Hos: 'Hosea', Joel: 'Joel', Amos: 'Amos',
  Obad: 'Obadiah', Jonah: 'Jonah', Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi', Ps: 'Psalms', Job: 'Job', Prov: 'Proverbs', Ruth: 'Ruth',
  Song: 'Song of Songs', Eccl: 'Ecclesiastes', Lam: 'Lamentations', Esth: 'Esther', Dan: 'Daniel', Ezra: 'Ezra', Neh: 'Nehemiah' };
const NUM = { Sam: ['I Samuel', 'II Samuel'], Kgs: ['I Kings', 'II Kings'], Chr: ['I Chronicles', 'II Chronicles'] };
const RE = new RegExp('(?<![A-Za-z0-9])(v?)([12]?)(' + [...Object.keys(BOOK), ...Object.keys(NUM)].join('|') + ') (\\d{1,3}):(\\d{1,3})(?:[-–]\\d{1,3})?(?![\\d:])', 'g');
const GR = '\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F';
const GREEK = new RegExp('[' + GR + ']+(?:[ \u00A0][' + GR + ']+)*', 'g');
const clean = h => h.replace(/<span class="grk" lang="grc">(.*?)<\/span>/g, '$1').replace(/«[^»]*»/g, ''); // Marker «JOSEPHUS:…», «GKC:…» sind Rohdaten der Quelle
const greek = h => h.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, t) => tag ? m : t.replace(GREEK, g => `<span class="grk" lang="grc">${g}</span>`));
const link = h => h.replace(/(<a\b[^>]*>.*?<\/a>)|([^<]+)|(<[^>]*>)/gs, (m, a, t, tag) => {
  if (!t) return m; // vorhandene Links und Tags unverändert
  return t.replace(RE, (s, pv, n, b, c, v) => {
    const title = NUM[b] ? (n ? NUM[b][+n - 1] : null) : (n ? null : BOOK[b]);
    return title ? `${pv}<a class="dsrc" data-sref="${title} ${c}:${v}">${s.slice(pv.length)}</a>` : s;
  });
});
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const it = man.items.find(x => /BDB/.test(x.name)); if (!it) throw new Error('BDB nicht im Manifest');
const f = path.join(dir, it.id + '.json.gz'), d = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
let n = 0; d.html = d.html.map(h => { const o = clean(h.replace(/<a class="dsrc"[^>]*>(.*?)<\/a>/g, '$1')); const r = greek(link(o)); n += (r.match(/class="dsrc"/g) || []).length; return r; });
const buf = Buffer.from(JSON.stringify(d), 'utf8');
fs.writeFileSync(f, zlib.gzipSync(buf, { level: 9 }));
it.hash = crypto.createHash('sha1').update(buf).digest('hex');
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
console.log('Bibelstellen verlinkt:', n, it.hash);
