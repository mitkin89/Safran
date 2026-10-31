// node build.js <datei.dsl> <Projektordner>: Levy, Targumim-Wörterbuch als mitgeliefertes Wörterbuch eintragen
// (Abkürzungen -> <abbr class="gab" data-t>, Bibel-/Talmud-Zitate -> <a class="dsrc" data-sref>). Vorhandene Wörterbücher bleiben unberührt.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const P = path.resolve(process.argv[3]), DSL = require(path.join(P, 'dsl.js'));
const NAME = 'Levy, Targumim-Wörterbuch (Bd. 1–2)';
const ABK = JSON.parse(fs.readFileSync(path.join(__dirname, 'abk.json'), 'utf8')); delete ABK._quelle;
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const onText = (html, fn) => html.split(/(<a\b[^>]*>.*?<\/a>|<abbr\b[^>]*>.*?<\/abbr>|<[^>]+>)/s).map((s, i) => i % 2 ? s : fn(s)).join('');
const stats = { bibel: 0, bavli: 0, mischna: 0, jeru: 0, abk: 0 };
const A = (ref, t, k) => { stats[k]++; return `<a class="dsrc" data-sref="${ref}">${t}</a>`; };

// ---- Bibel
const BOOK = { 'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy', 'Jos': 'Joshua', 'Ri': 'Judges', 'Jes': 'Isaiah', 'Jer': 'Jeremiah', 'Ez': 'Ezekiel',
  'Hos': 'Hosea', 'Joel': 'Joel', 'Am': 'Amos', 'Ob': 'Obadiah', 'Obad': 'Obadiah', 'Jona': 'Jonah', 'Micha': 'Micah', 'Mi': 'Micah', 'Nah': 'Nahum', 'Hbk': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai',
  'Sach': 'Zechariah', 'Mal': 'Malachi', 'Ps': 'Psalms', 'Hiob': 'Job', 'Spr': 'Proverbs', 'Ruth': 'Ruth', 'Hhl': 'Song of Songs', 'Khl': 'Ecclesiastes', 'Klgl': 'Lamentations', 'Esth': 'Esther',
  'Dan': 'Daniel', 'Esra': 'Ezra', 'Neh': 'Nehemiah' };
const NUM = { 'Sm': ['I Samuel', 'II Samuel'], 'Kn': ['I Kings', 'II Kings'], 'Chr': ['I Chronicles', 'II Chronicles'] };
const bk = '(?:([12]|I{1,2}) (Sm|Kn|Chr)|(' + Object.keys(BOOK).sort((a, b) => b.length - a.length).join('|') + '))';
const BIB = new RegExp('(?<![\\p{L}\\p{N}])' + bk + '\\.?(?: II)? (\\d{1,3}), (\\d{1,3})((?:(?:\\. | u\\. |, )\\d{1,3}(?:, \\d{1,3})?(?:[-—–]\\d{1,3})?(?![\\d]|\\s+[A-Za-zÄÖÜäöüß]{2}))*)(?:[-—–]\\d{1,3})?', 'gu');
function bible(t) {
  return t.replace(BIB, (m, n, nb, b, c, v, rest, off, all) => {
    let title = nb ? NUM[nb][/^(1|I)$/.test(n) ? 0 : 1] : BOOK[b];
    if (nb && !/^(1|2|I|II)$/.test(n)) return m;
    if (/^Esth/.test(b || '') && /Esth\.? II/.test(m)) title = 'Esther';
    if (/^\s?r\b/.test(all.slice(off + m.length)) && /^(Gen|Exod|Lev|Num|Deut|Esth|Ruth)$/.test(b || '')) return m; // Midrasch rabba
    if (/^\.? ?r\./.test(all.slice(off + m.length - 0, off + m.length + 3))) return m;
    const head = m.slice(0, m.length - rest.length), headTxt = head;
    const cv = `${c}, ${v}`; const k = head.lastIndexOf(cv);
    let out = `${head.slice(0, k)}${A(`${title} ${c}:${v}`, cv, 'bibel')}${head.slice(k + cv.length)}`;
    let ch = c;
    out += rest.replace(/(\. | u\. |, )(\d{1,3})(?:, (\d{1,3}))?/g, (s, sep, x, y) => { if (y) { ch = x; return `${sep}${A(`${title} ${x}:${y}`, `${x}, ${y}`, 'bibel')}`; } return `${sep}${A(`${title} ${ch}:${x}`, x, 'bibel')}`; });
    return out;
  });
}
// ---- Talmud
const TR = { // Levy-Abkürzung -> [Sefaria-Titel, hat Bavli, hat Yerushalmi]
  Schabb: ['Shabbat', 1, 1], Schab: ['Shabbat', 1, 1], Berach: ['Berakhot', 1, 1], Ber: ['Berakhot', 1, 1], Pes: ['Pesachim', 1, 1], Pesach: ['Pesachim', 1, 1], Snhdr: ['Sanhedrin', 1, 1], Sanh: ['Sanhedrin', 1, 1],
  Chull: ['Chullin', 1, 0], Chullin: ['Chullin', 1, 0], Kethub: ['Ketubot', 1, 1], Joma: ['Yoma', 1, 1], Gittin: ['Gittin', 1, 1], Git: ['Gittin', 1, 1], Jebam: ['Yevamot', 1, 1], Kam: ['Bava Kamma', 1, 1], Kama: ['Bava Kamma', 1, 1], Kamma: ['Bava Kamma', 1, 1],
  Meg: ['Megillah', 1, 1], Megilla: ['Megillah', 1, 1], Taan: ['Taanit', 1, 1], Sota: ['Sotah', 1, 1], Kiddusch: ['Kiddushin', 1, 1], Erub: ['Eruvin', 1, 1], Succa: ['Sukkah', 1, 1], Nidda: ['Niddah', 1, 1], Chag: ['Chagigah', 1, 1],
  Nedar: ['Nedarim', 1, 1], Beza: ['Beitzah', 1, 1], Minach: ['Menachot', 1, 0], Minech: ['Menachot', 1, 0], Bechor: ['Bekhorot', 1, 0], Schebuoth: ['Shevuot', 1, 1], Maccoth: ['Makkot', 1, 1], Arach: ['Arakhin', 1, 0], Kerith: ['Keritot', 1, 0], Kerithoth: ['Keritot', 1, 0],
  Nasir: ['Nazir', 1, 1], Sebach: ['Zevachim', 1, 0], Horaj: ['Horayot', 1, 1], Temura: ['Temurah', 1, 0], Tamid: ['Tamid', 1, 0], Schek: ['Shekalim', 0, 1], Schekal: ['Shekalim', 0, 1],
  Pea: ['Peah', 0, 1], Demai: ['Demai', 0, 1], Kilaim: ['Kilayim', 0, 1], Schebiith: ['Sheviit', 0, 1], Terum: ['Terumot', 0, 1], Maasr: ['Maasrot', 0, 1], Maas: ['Maasrot', 0, 1], Challa: ['Challah', 0, 1], Orla: ['Orlah', 0, 1], Biccur: ['Bikkurim', 0, 1],
  Kelim: ['Kelim', 0, 0], Aboth: ['Avot', 0, 0], Ohol: ['Oholot', 0, 0], Neg: ['Negaim', 0, 0], Negaim: ['Negaim', 0, 0], Para: ['Parah', 0, 0], Tohar: ['Tohorot', 0, 0], Mikw: ['Mikvaot', 0, 0], Middoth: ['Middot', 0, 0],
  Eduj: ['Eduyot', 0, 0], Edujoth: ['Eduyot', 0, 0], Machsch: ['Makhshirin', 0, 0], Machschir: ['Makhshirin', 0, 0], Sabim: ['Zavim', 0, 0], Okz: ['Oktzin', 0, 0], Ukz: ['Oktzin', 0, 0], Maccoth_: [], Ab: ['Avodah Zarah', 1, 1], Abod: ['Avodah Zarah', 1, 1] };
const names = Object.keys(TR).filter(k => TR[k].length).sort((a, b) => b.length - a.length).join('|');
const JER = new RegExp('(?<![\\p{L}\\p{N}])jer\\. (' + names + ')\\.?( (?:zu |cap\\. ?)?)(\\d{1,2})(?:, (\\d{1,2}))?', 'gu');
const jeru = t => t.replace(JER, (m, n, mid, c, h) => {
  const T = TR[n]; if (!T[2]) return m;
  const num = h ? `${c}, ${h}` : c, ref = `Jerusalem Talmud ${T[0]} ${c}${h ? ':' + h : ''}`;
  return m.slice(0, m.length - num.length) + A(ref, num, 'jeru');
});
const BAV = new RegExp('(?<![\\p{L}\\p{N}.])(' + names + ')\\.? (\\d{1,3}) ?([ab])(?![\\p{L}\\p{N}])', 'gu');
const MIS = new RegExp('(?<![\\p{L}\\p{N}.])(' + names + ')\\.? (\\d{1,2}), (\\d{1,2})((?:(?:\\. | u\\. )\\d{1,2}(?![\\d,]|\\s+[A-Za-zÄÖÜäöüß]{2}))*)', 'gu');
function talmud(t) {
  t = t.replace(BAV, (m, n, p, s) => { const T = TR[n]; if (!T[1]) return m; return m.slice(0, m.length - (p.length + s.length + (/ /.test(m.slice(-s.length - 1, -s.length)) ? 1 : 0))) + A(`${T[0]} ${p}${s}`, m.slice(m.length - p.length - s.length - (/ /.test(m.slice(-s.length - 1, -s.length)) ? 1 : 0)), 'bavli'); });
  t = t.replace(MIS, (m, n, c, v, rest) => {
    const T = TR[n]; const ti = T[0] === 'Avot' ? 'Pirkei Avot' : T[0];
    const head = m.slice(0, m.length - rest.length), cv = `${c}, ${v}`;
    let out = head.slice(0, head.length - cv.length) + A(`Mishnah ${ti} ${c}:${v}`, cv, 'mischna');
    out += rest.replace(/(\. | u\. )(\d+)/g, (s, sep, x) => sep + A(`Mishnah ${ti} ${c}:${x}`, x, 'mischna'));
    return out;
  });
  return t;
}
// ---- Abkürzungen
const keys = Object.keys(ABK).filter(k => k !== '*').sort((a, b) => b.length - a.length);
const ABR = new RegExp('(?<![\\p{L}\\p{N}.])(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\u00A0]')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
const SINGLE = /^[A-ZÄÖÜa-z]\.$/;
function abk(t) {
  return t.replace(ABR, (m, k, off, all) => {
    const key = k.replace(/\u00A0/g, ' '); const e = ABK[key]; if (!e) return m;
    const next = all.slice(off + m.length, off + m.length + 3);
    if (SINGLE.test(key)) { if (/^\s*\d/.test(next) && key !== 'T.') return m; if (/^\s*[a-zäöü]/.test(next)) return m; }
    if (key === 'Z.' || key === 'f.' || key === 'm.') { if (/^\s*[a-zäöüß]/.test(next)) return m; }
    stats.abk++; return `<abbr class="gab" data-t="${esc(e[0])}">${m}</abbr>`;
  });
}
function proc(html) { html = onText(html, jeru); html = onText(html, talmud); html = onText(html, bible); return onText(html, abk); }

const p = DSL.parseDsl(fs.readFileSync(process.argv[2]), path.basename(process.argv[2]));
const data = { name: NAME, indexLang: p.indexLang, contentsLang: p.contentsLang, heads: p.entries.map(e => e.heads), html: p.entries.map(e => proc(e.html)) };
const id = crypto.createHash('sha1').update(NAME + '\u0000' + p.entries.length).digest('hex').slice(0, 12);
const buf = Buffer.from(JSON.stringify(data), 'utf8'), dir = path.join(P, 'bundled', 'dict');
fs.writeFileSync(path.join(dir, id + '.json.gz'), zlib.gzipSync(buf, { level: 9 }));
const mf = path.join(dir, 'manifest.json'), man = JSON.parse(fs.readFileSync(mf, 'utf8'));
man.items = man.items.filter(x => x.id !== id && x.name !== NAME);
man.items.push({ id, name: NAME, count: data.heads.length, hash: crypto.createHash('sha1').update(buf).digest('hex') });
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
console.log(id, data.heads.length, stats);
