// node build.js <datei.dsl> <Projektordner>: Krauss, Lehnwörter Teil II als mitgeliefertes Wörterbuch eintragen
// (Abkürzungen -> <abbr class="gab" data-t>, Bibel-/Talmud-/Midrasch-Zitate -> <a class="dsrc" data-sref>). Vorhandene Wörterbücher bleiben unberührt.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const P = path.resolve(process.argv[3]), DSL = require(path.join(P, 'dsl.js'));
const NAME = 'Krauss, Griechische und lateinische Lehnwörter (Teil II)';
const ABK = JSON.parse(fs.readFileSync(path.join(__dirname, 'abk.json'), 'utf8')); delete ABK._quelle;
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const onText = (html, fn) => html.split(/(<a\b[^>]*>.*?<\/a>|<abbr\b[^>]*>.*?<\/abbr>|<[^>]+>)/s).map((s, i) => i % 2 ? s : fn(s)).join('');
const stats = { bibel: 0, bavli: 0, jeru: 0, mischna: 0, tosefta: 0, midrasch: 0, abk: 0 };
const A = (ref, t, k) => { stats[k]++; return `<a class="dsrc" data-sref="${ref}">${t}</a>`; };
const AB = (t, text) => `<abbr class="gab" data-t="${esc(t)}">${text}</abbr>`;
const ROM = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const rom = s => /^\d+$/.test(s) ? +s : [...s].reduce((n, c, i, a) => (ROM[c] < (ROM[a[i + 1]] || 0) ? n - ROM[c] : n + ROM[c]), 0);
const SUP = { 'ᵃ': 'a', 'ᵇ': 'b' };

// ---- Traktate: Krauss-Abk. -> [deutscher Name, Sefaria-Titel, Bavli, Yerushalmi]
const T = {
  Berach: ['Berachoth', 'Berakhot', 1, 1], Pea: ['Pea', 'Peah', 0, 1], Demai: ['Demai', 'Demai', 0, 1], Kilaim: ['Kilajim', 'Kilayim', 0, 1], Kil: ['Kilajim', 'Kilayim', 0, 1],
  Schebiith: ['Schebiith', 'Sheviit', 0, 1], Terum: ['Terumoth', 'Terumot', 0, 1], Maas: ['Maaseroth', 'Maasrot', 0, 1], Maasch: ['Maaser scheni', 'Maaser Sheni', 0, 1], Challa: ['Challa', 'Challah', 0, 1],
  Orla: ['Orla', 'Orlah', 0, 1], Bikk: ['Bikkurim', 'Bikkurim', 0, 1], Biccur: ['Bikkurim', 'Bikkurim', 0, 1],
  Sabb: ['Sabbath (Schabbat)', 'Shabbat', 1, 1], Schabb: ['Sabbath (Schabbat)', 'Shabbat', 1, 1], Erub: ['Erubin', 'Eruvin', 1, 1], Pesach: ['Pesachim', 'Pesachim', 1, 1], Schekal: ['Schekalim', 'Shekalim', 0, 1], Schek: ['Schekalim', 'Shekalim', 0, 1],
  Joma: ['Joma', 'Yoma', 1, 1], Sukka: ['Sukka', 'Sukkah', 1, 1], Succa: ['Sukka', 'Sukkah', 1, 1], Beza: ['Beza', 'Beitzah', 1, 1], Rh: ['Rosch haschana', 'Rosh Hashanah', 1, 1], Taan: ['Taanith', 'Taanit', 1, 1],
  Meg: ['Megilla', 'Megillah', 1, 1], Mk: ['Moed katan', 'Moed Katan', 1, 1], Chag: ['Chagiga', 'Chagigah', 1, 1], Jebam: ['Jebamoth', 'Yevamot', 1, 1], Kethub: ['Kethuboth', 'Ketubot', 1, 1],
  Nedar: ['Nedarim', 'Nedarim', 1, 1], Nazir: ['Nazir', 'Nazir', 1, 1], Nasir: ['Nazir', 'Nazir', 1, 1], Sota: ['Sota', 'Sotah', 1, 1], Gitt: ['Gittin', 'Gittin', 1, 1], Kidd: ['Kidduschin', 'Kiddushin', 1, 1],
  Bk: ['Baba kamma', 'Bava Kamma', 1, 1], Bm: ['Baba mezia', 'Bava Metzia', 1, 1], Bb: ['Baba bathra', 'Bava Batra', 1, 1], Sanh: ['Sanhedrin', 'Sanhedrin', 1, 1], Makk: ['Makkoth', 'Makkot', 1, 1], Mak: ['Makkoth', 'Makkot', 1, 1],
  Schebuoth: ['Schebuoth', 'Shevuot', 1, 1], Eduj: ['Edujjoth', 'Eduyot', 0, 0], Az: ['Aboda Zara', 'Avodah Zarah', 1, 1], Ab: ['Aboda Zara', 'Avodah Zarah', 1, 1], Aboth: ['Aboth', 'Avot', 0, 0],
  Horaj: ['Horajoth', 'Horayot', 1, 1], Zebach: ['Sebachim', 'Zevachim', 1, 0], Sebach: ['Sebachim', 'Zevachim', 1, 0], Menach: ['Menachoth', 'Menachot', 1, 0], Chull: ['Chullin', 'Chullin', 1, 0],
  Bechor: ['Bechoroth', 'Bekhorot', 1, 0], Arach: ['Arachin', 'Arakhin', 1, 0], Temura: ['Temura', 'Temurah', 1, 0], Kerith: ['Kerithoth', 'Keritot', 1, 0], Meil: ['Meila', 'Meilah', 1, 0], Tamid: ['Tamid', 'Tamid', 1, 0],
  Midd: ['Middoth', 'Middot', 0, 0], Kinn: ['Kinnim', 'Kinnim', 0, 0], Kelim: ['Kelim', 'Kelim', 0, 0], Ohol: ['Oholoth', 'Oholot', 0, 0], Neg: ['Negaim', 'Negaim', 0, 0], Negaim: ['Negaim', 'Negaim', 0, 0],
  Para: ['Para', 'Parah', 0, 0], Par: ['Para', 'Parah', 0, 0], Tohar: ['Tohoroth', 'Tohorot', 0, 0], Toh: ['Tohoroth', 'Tohorot', 0, 0], Mikw: ['Mikwaoth', 'Mikvaot', 0, 0], Nidda: ['Nidda', 'Niddah', 1, 1],
  Machsch: ['Machschirin', 'Makhshirin', 0, 0], Sabim: ['Sabim', 'Zavim', 0, 0], Jad: ['Jadajim', 'Yadayim', 0, 0], Okz: ['Okazin', 'Oktzin', 0, 0], Ukz: ['Okazin', 'Oktzin', 0, 0], Tebul: ['Tebul jom', 'Tevul Yom', 0, 0],
  Edujoth: ['Edujjoth', 'Eduyot', 0, 0], Tohor: ['Tohoroth', 'Tohorot', 0, 0], Ukzin: ['Okazin', 'Oktzin', 0, 0], Zabim: ['Sabim', 'Zavim', 0, 0], Zab: ['Sabim', 'Zavim', 0, 0],
  Jadaj: ['Jadajim', 'Yadayim', 0, 0], Maaser: ['Maaseroth', 'Maasrot', 0, 1], Maaseroth: ['Maaseroth', 'Maasrot', 0, 1], Pes: ['Pesachim', 'Pesachim', 1, 1], Ter: ['Terumoth', 'Terumot', 0, 1],
  Meila: ['Meila', 'Meilah', 1, 0], Tam: ['Tamid', 'Tamid', 1, 0], Kid: ['Kidduschin', 'Kiddushin', 1, 1], Dem: ['Demai', 'Demai', 0, 1], Kelim_: null };
delete T.Kelim_;
const SHORT = { P: 'Pesach', B: 'Berach', Ch: 'Chull', K: 'Kelim', Sch: 'Schabb' }; // nur im Kontext bP. / TK.
const names = Object.keys(T).sort((a, b) => b.length - a.length).join('|');
const KELIM_SUB = { bk: 'Bava Kamma', bm: 'Bava Metzia', bb: 'Bava Batra' };
const NB = '(?<![\\p{L}\\p{N}.])';
const SUBN = '[₀-₉·]*';

function talmud(t) {
  // Bavli: bSabb 29ᵇ
  t = t.replace(new RegExp(NB + '(b(' + names + ')\\.?) (\\d{1,3})([ᵃᵇ])(' + SUBN + ')', 'gu'), (m, pre, n, p, s, sub) => {
    const X = T[n]; if (!X[2]) return m; stats.bavli++;
    return AB('Babylonischer Talmud, Traktat ' + X[0], pre) + ' ' + `<a class="dsrc" data-sref="${X[1]} ${p}${SUP[s]}">${p}${s}${sub}</a>`;
  });
  // Jeruschalmi: jSabb 5ᵈ₈ (Seite der Krotoschiner Ausgabe -> Traktat)
  t = t.replace(new RegExp(NB + '(j(' + names + ')\\.?) (\\d{1,3})([ᵃᵇᶜᵈ])(' + SUBN + ')', 'gu'), (m, pre, n, p, s, sub) => {
    const X = T[n]; if (!X[3]) return m; stats.jeru++;
    return AB('Jerusalemer Talmud (Jeruschalmi), Traktat ' + X[0], pre) + ' ' + `<a class="dsrc" data-sref="Jerusalem Talmud ${X[1]}">${p}${s}${sub}</a>`;
  });
  // Mischna: MKelim XVII, 16 (. 17 / u. 18)
  t = t.replace(new RegExp(NB + '(M(' + names + ')\\.?) ([IVXLC]{1,6}|\\d{1,2}), (\\d{1,2})((?:(?:\\. | u\\. )\\d{1,2}(?![\\d,]|\\s+[A-Za-zÄÖÜäöüß]{2}))*)', 'gu'), (m, pre, n, c, v, rest) => {
    const X = T[n]; const ti = X[1] === 'Avot' ? 'Pirkei Avot' : X[1]; const ch = rom(c); if (!ch || ch > 30) return m; stats.mischna++;
    let out = AB('Mischna, Traktat ' + X[0], pre) + ' ' + A(`Mishnah ${ti} ${ch}:${v}`, `${c}, ${v}`, 'mischna');
    out += rest.replace(/(\. | u\. )(\d+)/g, (s, sep, x) => sep + A(`Mishnah ${ti} ${ch}:${x}`, x, 'mischna'));
    return out;
  });
  // Tosefta: TSabb XIII, 11 / TKelim bm VII, 9 / TK. bb IV, 10
  t = t.replace(new RegExp(NB + '(T(' + names + '|K)\\.?(?: (bk|bm|bb))?) ([IVXLC]{1,6}|\\d{1,2})(?: \\([^)]*\\))?, (\\d{1,2})', 'gu'), (m, pre, n, sub, c, v) => {
    const X = n === 'K' ? T.Kelim : T[n]; if (!X) return m; const ch = rom(c); if (!ch || ch > 30) return m;
    let title = 'Tosefta ' + X[1]; if (sub) { if (X[1] !== 'Kelim') return m; title += ' ' + KELIM_SUB[sub]; }
    stats.tosefta++;
    const k = m.indexOf(c, pre.length);
    return AB('Tosefta, Traktat ' + X[0] + (sub ? ' ' + sub : ''), pre) + m.slice(pre.length, k) + `<a class="dsrc" data-sref="${title} ${ch}">${m.slice(k)}</a>`;
  });
  return t;
}
// ---- Midrasch Rabba und Midrasch Tehillim
const RAB = { Gen: ['Bereshit Rabbah', 'Genesis rabba'], Ex: ['Shemot Rabbah', 'Exodus rabba'], Exod: ['Shemot Rabbah', 'Exodus rabba'], Lev: ['Vayikra Rabbah', 'Leviticus rabba'], Num: ['Bamidbar Rabbah', 'Numeri rabba'],
  Deut: ['Devarim Rabbah', 'Deuteronomium rabba'], Dt: ['Devarim Rabbah', 'Deuteronomium rabba'], Cant: ['Shir HaShirim Rabbah', 'Canticum rabba'], Koh: ['Kohelet Rabbah', 'Koheleth rabba'],
  Thr: ['Eichah Rabbah', 'Threni rabba'], Esth: ['Esther Rabbah', 'Esther rabba'], Ruth: ['Ruth Rabbah', 'Ruth rabba'] };
function midrasch(t) {
  t = t.replace(new RegExp(NB + '(' + Object.keys(RAB).sort((a, b) => b.length - a.length).join('|') + ')(\\.?) (r)\\.?(?: (c\\.|cap\\.))? ([IVXLC]{1,6}|\\d{1,3})(?:, (\\d{1,3}))?', 'gu'), (m, b, d, r, cc, c, v) => {
    const ch = rom(c); if (!ch || ch > 200) return m; stats.midrasch++;
    const k = m.lastIndexOf(c); const pre = m.slice(0, k);
    return AB(RAB[b][1] + ' (Midrasch Rabba)', pre.trimEnd()) + pre.slice(pre.trimEnd().length) + `<a class="dsrc" data-sref="${RAB[b][0]} ${ch}">${m.slice(k)}</a>`;
  });
  t = t.replace(new RegExp(NB + '(Midr\\.? ψ|Midrasch ψ) ([IVXLC]{1,6}|\\d{1,3})(?:, (\\d{1,3}))?', 'gu'), (m, pre, c) => {
    const ch = rom(c); if (!ch || ch > 150) return m; stats.midrasch++;
    return AB('Midrasch Psalmen (Tehillim), ed. Buber, Wilna 1891', pre) + ' ' + `<a class="dsrc" data-sref="Midrash Tehillim ${ch}">${m.slice(pre.length + 1)}</a>`;
  });
  return t;
}
// ---- Bibel
const BOOK = { Gen: 'Genesis', Ex: 'Exodus', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy', Dt: 'Deuteronomy', Jos: 'Joshua', Ri: 'Judges', Jes: 'Isaiah', Jer: 'Jeremiah', Jerem: 'Jeremiah',
  Ez: 'Ezekiel', Ezech: 'Ezekiel', Hos: 'Hosea', Joel: 'Joel', Am: 'Amos', Ob: 'Obadiah', Jon: 'Jonah', Mi: 'Micah', Micha: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai',
  Sach: 'Zechariah', Mal: 'Malachi', Ps: 'Psalms', 'ψ': 'Psalms', Hiob: 'Job', Prov: 'Proverbs', Spr: 'Proverbs', Ruth: 'Ruth', Cant: 'Song of Songs', Hhl: 'Song of Songs', Koh: 'Ecclesiastes', Thr: 'Lamentations',
  Esth: 'Esther', Dan: 'Daniel', Esra: 'Ezra', Neh: 'Nehemiah', Jes_: '' };
delete BOOK.Jes_;
const NUMB = { Sam: ['I Samuel', 'II Samuel'], Reg: ['I Kings', 'II Kings'], Kn: ['I Kings', 'II Kings'], Chr: ['I Chronicles', 'II Chronicles'] };
const bk = '(?:(I{1,2}) (Sam|Reg|Kn|Chr)|(' + Object.keys(BOOK).sort((a, b) => b.length - a.length).join('|') + '))';
const BIB = new RegExp(NB + bk + '\\.? ([IVXLC]{1,6}|\\d{1,3}), (\\d{1,3})((?:(?:\\. | u\\. |, )\\d{1,3}(?![\\d]|\\s+[A-Za-zÄÖÜäöüß]{2}))*)(?:[-–]\\d{1,3})?', 'gu');
const BIBP = new RegExp(NB + '(Ps|ψ)\\.? (\\d{1,3})(?![\\d,.]|\\s?[ᵃᵇ])', 'gu');
function bible(t) {
  t = t.replace(BIB, (m, n, nb, b, c, v, rest) => {
    const title = nb ? NUMB[nb][n === 'I' ? 0 : 1] : BOOK[b]; const ch = rom(c); if (!ch || ch > 150) return m;
    const head = m.slice(0, m.length - rest.length), cv = `${c}, ${v}`; const k = head.lastIndexOf(cv);
    stats.bibel++;
    let out = head.slice(0, k) + `<a class="dsrc" data-sref="${title} ${ch}:${v}">${head.slice(k)}</a>`;
    out += rest.replace(/(\. | u\. |, )(\d{1,3})/g, (s, sep, x) => sep + `<a class="dsrc" data-sref="${title} ${ch}:${x}">${x}</a>`);
    return out;
  });
  return t.replace(BIBP, (m, b, c) => { stats.bibel++; const k = m.lastIndexOf(c); return m.slice(0, k) + `<a class="dsrc" data-sref="Psalms ${c}">${c}</a>`; });
}
// ---- Abkürzungen (Quellenverzeichnis)
const keys = Object.keys(ABK).sort((a, b) => b.length - a.length);
const ABR = new RegExp(NB + '(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\u00A0]')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
// mehrdeutige kurze Schlüssel: nur als Quellenangabe lesbar (L. IV, 232ᵇ; Midr ψ; r = rabba)
const AMBIG = /^(?:L|K|r|bb|bk|bm|Ab|Mk|Rh|Kil|Tam|Az|Bb|Bk|Bm|Dt|Ex|Gen|Num|Lev|Dan|Jer|Sam|Reg|Deut|Esth|Koh|Thr|Cant|Ruth|Hal)$/;
function abk(t) {
  t = t.replace(/\[\?\?\]/g, () => { stats.abk++; return AB('unwahrscheinliche Identification (Löw, „Abkürzungen“)', '[??]'); });
  return t.replace(ABR, (m, k, off, all) => {
    const key = k.replace(/\u00A0/g, ' '); const e = ABK[key] || ABK[key.replace(/\.$/, '')]; if (!e) return m;
    const after = all.slice(off + m.length, off + m.length + 5);
    if (AMBIG.test(key.replace(/\.$/, ''))) { if (!/^\.? ?(?:[IVXLC]+\b|\d)/.test(after)) return m; }
    stats.abk++; return AB(e[0], m);
  });
}
// Verweise „s. אפוטני“ / „s. auch …“ / „siehe …“ -> Link auf das Stichwort (öffnet die Suche)
const HW = '[\\u05d0-\\u05ea][\\u05d0-\\u05ea\\u05b0-\\u05c7\\u05f3\\u05f4\'"]*';
const XREF = new RegExp('(?<![\\p{L}])((?:s\\. auch|s\\. a\\.|s\\. d\\.|s\\.|siehe|vgl\\.) )(' + HW + '(?:(?:, | u\\. | und | od\\. | oder )' + HW + ')*)', 'gu');
function xref(t) {
  return t.replace(XREF, (m, pre, list) => pre + list.replace(new RegExp(HW, 'gu'), w => { stats.xref = (stats.xref || 0) + 1; const q = w.replace(/[\u05f3\u05f4'"]/g, ''); return `<a class="dref" data-q="${q}">${w}</a>`; }));
}
function proc(html) { html = onText(html, talmud); html = onText(html, midrasch); html = onText(html, bible); html = onText(html, abk); return onText(html, xref); }

const p = DSL.parseDsl(fs.readFileSync(process.argv[2]), path.basename(process.argv[2]));
const data = { name: NAME, indexLang: p.indexLang, contentsLang: p.contentsLang, heads: p.entries.map(e => e.heads), html: p.entries.map(e => proc(e.html)) };
const id = crypto.createHash('sha1').update(NAME + '\u0000' + p.entries.length).digest('hex').slice(0, 12);
const buf = Buffer.from(JSON.stringify(data), 'utf8'), dir = path.join(P, 'bundled', 'dict');
fs.writeFileSync(path.join(dir, id + '.json.gz'), zlib.gzipSync(buf, { level: 9 }));
const mf = path.join(dir, 'manifest.json'), man = JSON.parse(fs.readFileSync(mf, 'utf8'));
man.items = man.items.filter(x => x.id !== id && x.name !== NAME);
man.items.push({ id, name: NAME, count: data.heads.length, hash: crypto.createHash('sha1').update(buf).digest('hex') });
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(data.html, null, 1));
console.log(id, data.heads.length, stats);
