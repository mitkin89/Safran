// Erkennt Bibelstellen im Fließtext (Hebräisch „שמות לא יח“, Englisch „Exodus 24:10“, Deutsch „Ex. 24, 10“, „ibid. 31:18“) und macht sie anklickbar.
// Reine Textfunktion ohne Oberfläche; läuft in Node (Tests: test15.js) und als <script> (window.AutoRef).
(function () {
'use strict';
// Versumrechnung (versemap.js): Stellen aus Texten, die nicht hebräisch zählen, kommen in Sefarias Zählung; fehlt die Tabelle, bleibt alles wie angegeben
let VM = null;
try { VM = typeof module !== 'undefined' && module.exports ? require('./versemap.js') : window.VerseMap; } catch { VM = null; }
// Seitenregister zu Graetz, Geschichte der Juden (graetz-pages.js, erzeugt von tools/graetz/pages.py)
let GP = null;
try { GP = typeof module !== 'undefined' && module.exports ? require('./graetz-pages.js') : window.GraetzPages; } catch { GP = null; }
// Schreibweisen -> Sefaria-Titel (Kleinbuchstaben, ohne Punkt)
const EN = {
  'Genesis': 'gen genesis gn', 'Exodus': 'ex exod exodus', 'Leviticus': 'lev leviticus lv', 'Numbers': 'num numbers nu', 'Deuteronomy': 'deut deuteronomy dt dtn',
  'Joshua': 'josh joshua jos', 'Judges': 'judg judges ri', 'I Samuel': '1 sam|1 samuel|i sam|i samuel', 'II Samuel': '2 sam|2 samuel|ii sam|ii samuel',
  'I Kings': '1 kings|1 kgs|1 kg|i kings|1 kön|1 könige', 'II Kings': '2 kings|2 kgs|2 kg|ii kings|2 kön|2 könige',
  'Isaiah': 'isa isaiah jes jesaja', 'Jeremiah': 'jer jeremiah jeremia', 'Ezekiel': 'ezek ezekiel ez hes hesekiel ezechiel', 'Hosea': 'hos hosea', 'Joel': 'joel', 'Amos': 'amos',
  'Obadiah': 'obad obadiah ob obadja', 'Jonah': 'jonah jon jona', 'Micah': 'mic micah mi micha', 'Nahum': 'nah nahum', 'Habakkuk': 'hab habakkuk habakuk',
  'Zephaniah': 'zeph zephaniah zef zefanja', 'Haggai': 'hag haggai', 'Zechariah': 'zech zechariah sach sacharja', 'Malachi': 'mal malachi maleachi',
  'Psalms': 'ps psalm psalms psalmen pss', 'Proverbs': 'prov proverbs spr sprüche', 'Job': 'job hiob ijob hi', 'Song of Songs': 'song of songs|cant|hohelied|hld',
  'Ruth': 'ruth rut', 'Lamentations': 'lam lamentations klgl klagelieder', 'Ecclesiastes': 'eccl ecclesiastes koh kohelet prediger qoh', 'Esther': 'esth esther est ester',
  'Daniel': 'dan daniel dn', 'Ezra': 'ezra esr esra', 'Nehemiah': 'neh nehemiah nehemia',
  'I Chronicles': '1 chron|1 chr|1 chronicles|i chron|i chronicles|1 chronik', 'II Chronicles': '2 chron|2 chr|2 chronicles|ii chron|ii chronicles|2 chronik'
};
const ALIAS = new Map();
for (const [title, s] of Object.entries(EN)) {
  const parts = s.includes('|') ? s.split('|') : s.split(' ');
  for (const a of parts) ALIAS.set(a, title);
  ALIAS.set(title.toLowerCase(), title);
}
// deutsche Nummern „1 Mose“ usw.
// ältere Kürzel (z. B. in Ginzbergs Noten): „Genes.“, „Jerem.“, „Ezech.“, „Jud.“ …
Object.entries({ 'genes': 'Genesis', 'numb': 'Numbers', 'jerem': 'Jeremiah', 'ezech': 'Ezekiel', 'jud': 'Judges', 'habak': 'Habakkuk', 'eccles': 'Ecclesiastes', 'lament': 'Lamentations', 'nehem': 'Nehemiah', 'is': 'Isaiah' }).forEach(([k, v]) => ALIAS.set(k, v));
Object.entries({ '1 mose': 'Genesis', '2 mose': 'Exodus', '3 mose': 'Leviticus', '4 mose': 'Numbers', '5 mose': 'Deuteronomy', 'gen': 'Genesis',
  '1 mos': 'Genesis', '2 mos': 'Exodus', '3 mos': 'Leviticus', '4 mos': 'Numbers', '5 mos': 'Deuteronomy', 'b mos': '' }).forEach(([k, v]) => { if (v) ALIAS.set(k, v); });
// Schreibweisen des 19. Jahrhunderts (Pinner, Sammter, Rawicz, Kautzsch …)
Object.entries({ 'jesaia': 'Isaiah', 'jesaias': 'Isaiah', 'jesai': 'Isaiah', 'jeremias': 'Jeremiah', 'ezechiel': 'Ezekiel', 'zacharia': 'Zechariah', 'zachar': 'Zechariah', 'zach': 'Zechariah',
  'secharja': 'Zechariah', 'zephania': 'Zephaniah', 'zeph': 'Zephaniah', 'klagel': 'Lamentations', 'klagl': 'Lamentations', 'klagelied': 'Lamentations', 'klag': 'Lamentations', 'threni': 'Lamentations',
  'hohel': 'Song of Songs', 'hoheslied': 'Song of Songs', 'hl': 'Song of Songs', 'kohel': 'Ecclesiastes', 'pred': 'Ecclesiastes', 'richt': 'Judges', 'richter': 'Judges', 'jos': 'Joshua', 'josua': 'Joshua',
  'exod': 'Exodus', 'levit': 'Leviticus', 'numer': 'Numbers', 'deuter': 'Deuteronomy', 'iob': 'Job', 'esth': 'Esther', 'nehem': 'Nehemiah', 'chron': '', 'spr': 'Proverbs', 'sprüch': 'Proverbs',
  'obadja': 'Obadiah', 'habakuk': 'Habakkuk', 'jona': 'Jonah', 'maleachi': 'Malachi', 'mich': 'Micah', 'psalm': 'Psalms', 'psalmen': 'Psalms', 'psal': 'Psalms',
  'jirm': 'Jeremiah', 'jir': 'Jeremiah', 'jirmeja': 'Jeremiah', 'jesch': 'Isaiah', 'jeschaja': 'Isaiah', 'josch': 'Joshua', 'jech': 'Ezekiel', 'jechesk': 'Ezekiel', 'jecheskel': 'Ezekiel',
  'sech': 'Zechariah', 'hosch': 'Hosea', 'nech': 'Nehemiah', 'chab': 'Habakkuk', 'am': 'Amos', '1 schem': 'I Samuel', '2 schem': 'II Samuel', 'i kön': 'I Kings', 'ii kön': 'II Kings',
  'i chronik': 'I Chronicles', 'ii chronik': 'II Chronicles', 'i chr': 'I Chronicles', 'ii chr': 'II Chronicles', 'i könige': 'I Kings', 'ii könige': 'II Kings', 'i könig': 'I Kings', 'ii könig': 'II Kings', 'i samuel': 'I Samuel', 'ii samuel': 'II Samuel', 'i chronica': 'I Chronicles', 'ii chronica': 'II Chronicles',
  '1 m': 'Genesis', '2 m': 'Exodus', '3 m': 'Leviticus', '4 m': 'Numbers', '5 m': 'Deuteronomy',
  '1 sam': 'I Samuel', '2 sam': 'II Samuel', '1 kön': 'I Kings', '2 kön': 'II Kings', '1 könige': 'I Kings', '2 könige': 'II Kings', '1 chron': 'I Chronicles', '2 chron': 'II Chronicles', '1 chronik': 'I Chronicles', '2 chronik': 'II Chronicles' }).forEach(([k, v]) => { if (v && !ALIAS.has(k)) ALIAS.set(k, v); });
// hebräische Namen
const HE = {
  'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'יהושע': 'Joshua', 'שופטים': 'Judges',
  'ישעיהו': 'Isaiah', 'ישעיה': 'Isaiah', 'ירמיהו': 'Jeremiah', 'ירמיה': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'הושע': 'Hosea', 'יואל': 'Joel', 'עמוס': 'Amos',
  'עובדיה': 'Obadiah', 'יונה': 'Jonah', 'מיכה': 'Micah', 'נחום': 'Nahum', 'חבקוק': 'Habakkuk', 'צפניה': 'Zephaniah', 'חגי': 'Haggai', 'זכריה': 'Zechariah', 'מלאכי': 'Malachi',
  'תהלים': 'Psalms', 'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs', 'רות': 'Ruth', 'איכה': 'Lamentations', 'קהלת': 'Ecclesiastes', 'אסתר': 'Esther',
  'דניאל': 'Daniel', 'עזרא': 'Ezra', 'נחמיה': 'Nehemiah'
};
const HE2 = { 'שמואל': ['I Samuel', 'II Samuel'], 'מלכים': ['I Kings', 'II Kings'], 'דברי הימים': ['I Chronicles', 'II Chronicles'] };
const GEM = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
function gem(s) { // „לא“ -> 31, „כ״ד“ -> 24, „קמ“ -> 140
  const t = s.replace(/[׳״'"’”]/g, '');
  if (!/^[א-ת]{1,4}$/.test(t)) return 0;
  let n = 0; for (const c of t) n += GEM[c] || 0;
  return n;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Alle lateinischen Namen/Kürzel, längste zuerst (damit „1 Kings“ vor „Kings“ gewinnt)
const LAT = [...ALIAS.keys()].sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^([1-5]|i{1,3}|iv|v) /, '$1\\.?\\s?').replace(/ /g, '\\s?'));
const CHVS = '(\\d{1,3})\\s*(?::|,\\s?)\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?';
const LAT_RE = new RegExp('(?<![\\p{L}\\d])(' + LAT.join('|') + ')\\.?,?\\s*' + CHVS + '(?![\\d])', 'giu');
// römische Kapitelzahl: „Jerem. XXIII, 24“, „Ps. CXLV, 15“, „I Sam. XIV, 24-25“
const ROM_RE = new RegExp('(?<![\\p{L}\\d])(' + LAT.join('|') + ')\\.?\\s*([IVXLC]{1,8}),\\s?(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?(?![\\d\\p{L}])', 'giu');
function roman(r) { const v = { I: 1, V: 5, X: 10, L: 50, C: 100 }; let n = 0; for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; n += a < b ? -a : a; } return n; }
const IBID_RE = new RegExp('(?<![\\p{L}\\d])(ibid|ib|ebd|ebenda|idem)\\.?\\s*' + CHVS + '(?![\\d])', 'giu');
const HEBK = Object.keys(HE).concat(Object.keys(HE2)).sort((a, b) => b.length - a.length).join('|');
const HE_RE = new RegExp('(?<=[(\\[])(' + HEBK + ')(?:\\s+([אב])(?![\\u05D0-\\u05EA]))?\\s+([א-ת][א-ת׳״\'"]{0,4})[,:]?\\s*([א-ת][א-ת׳״\'"]{0,4})(?![א-ת])', 'g');
function norm(name) { return name.toLowerCase().replace(/\.$/, '').replace(/^([1-5]|i{1,3}|iv|v)\.\s*/, '$1 ').replace(/\s+/g, ' ').trim(); }
function titleOf(name) {
  let n = norm(name); if (ALIAS.has(n)) return ALIAS.get(n);
  n = n.replace(/\s/g, ''); for (const [k, v] of ALIAS) if (k.replace(/\s/g, '') === n) return v;
  return '';
}
// Rabbinische Stellen in der Schreibweise von S. Krauss (Talmudische Archäologie): bSabb 109ᵇ, jBerakh 1,2, MKel 2,3, TSabb 2,4, Gen R 14,6
const nk = s => String(s).normalize('NFD').replace(/[̀-ͯʾʿ'’`]/g, '').toLowerCase();
const TRK = {}; // normalisiertes Kürzel -> [Sefaria-Titel, Bavli?, Jeruschalmi?]
const tr = (t, keys, b, j) => keys.split(' ').forEach(k => { TRK[k] = [t, b, j]; });
tr('Berakhot', 'berakh berakhoth berakhot', 1, 1); tr('Peah', 'pea peah', 0, 1); tr('Demai', 'demai', 0, 1); tr('Kilayim', 'kil kilaim', 0, 1);
tr('Sheviit', 'sebiith schebiith seb sebiith sebith', 0, 1); tr('Terumot', 'terum terumoth ter', 0, 1); tr('Maasrot', 'maas maaser maaseroth', 0, 1);
tr('Maaser Sheni', 'ms', 0, 1); tr('Challah', 'challa challah', 0, 1); tr('Orlah', 'orla', 0, 1); tr('Bikkurim', 'bikk bikkurim', 0, 1);
tr('Shabbat', 'sabb sab saab sabbat sabbath', 1, 1); tr('Eruvin', 'erub erubin', 1, 1); tr('Pesachim', 'pesach pes pesakh pesachim', 1, 1);
tr('Shekalim', 'sekal sekalim', 0, 1); tr('Yoma', 'joma yoma', 1, 1); tr('Sukkah', 'sukka sukkah', 1, 1); tr('Beitzah', 'beza beitzah', 1, 1);
tr('Rosh Hashanah', 'rh', 1, 1); tr('Taanit', 'taan taanith thaanith', 1, 1); tr('Megillah', 'meg megilla megillah', 1, 1);
tr('Moed Katan', 'mk', 1, 1); tr('Chagigah', 'chag chagiga chagigah', 1, 1); tr('Yevamot', 'jebam jeban jebamoth', 1, 1);
tr('Ketubot', 'keth kethub kethuboth', 1, 1); tr('Nedarim', 'nedar nedarim ned', 1, 1); tr('Nazir', 'nazir', 1, 1); tr('Sotah', 'sota sotah', 1, 1);
tr('Gittin', 'gitt gittin', 1, 1); tr('Kiddushin', 'kidd kiddushin', 1, 1); tr('Bava Kamma', 'bk', 1, 1); tr('Bava Metzia', 'bm', 1, 1);
tr('Bava Batra', 'bb babb', 1, 1); tr('Sanhedrin', 'sanh', 1, 1); tr('Makkot', 'makk makkoth', 1, 1); tr('Shevuot', 'sebuoth', 1, 1);
tr('Avodah Zarah', 'az', 1, 1); tr('Horayot', 'horaj horajoth', 1, 1); tr('Zevachim', 'zebach zeb zebakh zabach', 1, 0); tr('Menachot', 'menach', 1, 0);
tr('Chullin', 'chull chullin', 1, 0); tr('Bekhorot', 'bekhor', 1, 0); tr('Arakhin', 'arach', 1, 0); tr('Temurah', 'temura', 1, 0); tr('Keritot', 'kerith', 1, 0);
tr('Meilah', 'meila', 1, 0); tr('Tamid', 'tamid', 1, 0); tr('Niddah', 'nidda niddah', 1, 1); tr('Middot', 'midd', 0, 0);
tr('Kelim', 'kel kelim', 0, 0); tr('Oholot', 'ohal ohaloth', 0, 0); tr('Negaim', 'neg negaim', 0, 0); tr('Parah', 'para', 0, 0); tr('Tahorot', 'tohar toh toharoth', 0, 0);
tr('Eduyot', 'eduj eduyot', 0, 0); tr('Oktzin', 'ukz uk ukzin', 0, 0); tr('Avot', 'aboth abot', 0, 0); tr('Kinnim', 'kinnim', 0, 0); tr('Mikvaot', 'mikw mkw', 0, 0); tr('Makhshirin', 'makhs', 0, 0); tr('Zavim', 'zab zabim', 0, 0); tr('Tevul Yom', 'tj', 0, 0); tr('Yadayim', 'jad', 0, 0);
const RABBA = { 'gen': 'Bereshit', 'ex': 'Shemot', 'lev': 'Vayikra', 'num': 'Bamidbar', 'dt': 'Devarim', 'deut': 'Devarim', 'koh': 'Kohelet', 'thr': 'Eikhah', 'cant': 'Shir HaShirim', 'esth': 'Esther' };
const RN = '([ʾʿ]?[A-ZŠḤṢḲ][A-Za-zʾʿ’šṣḳḥŠḤṢḲ]{1,11})';
const FOLIO = '[abᵃᵇª]';
const BAV_RE = new RegExp('(?<![\\p{L}\\d])b' + RN + '\\.?\\s*(\\d{1,3})\\s*(' + FOLIO + ')(?![\\p{L}])', 'gu');
const YER_RE = new RegExp('(?<![\\p{L}\\d])j' + RN + '\\.?\\s*(\\d{1,2})\\s*,\\s*(\\d{1,3})\\s*([ᵃᵇᶜᵈª])?', 'gu');
const MIS_RE = new RegExp('(?<![\\p{L}\\d])([MT])' + RN + '\\.?\\s*(?:(bḳ|bk|bm|bb)\\.?\\s*)?(\\d{1,2})\\s*,\\s*(\\d{1,2})(?![\\d])', 'gu');
const RAB_RE = new RegExp('(?<![\\p{L}\\d])(Gen|Ex|Lev|Num|Dt|Deut|Ḳoh|Koh|Thr|Cant|Esth)\\.? R\\.?\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})(?![\\d])', 'gu');
function rabbinic(text, matches) {
  let m;
  BAV_RE.lastIndex = 0;
  while ((m = BAV_RE.exec(text))) {
    const t = TRK[nk(m[1])]; if (!t || !t[1]) continue;
    const d = +m[2]; if (!d || d > 176) continue;
    const side = /[aᵃª]/.test(m[3]) ? 'a' : 'b';
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t[0]} ${d}${side}`, book: t[0], nolast: true });
  }
  YER_RE.lastIndex = 0;
  while ((m = YER_RE.exec(text))) {
    const t = TRK[nk(m[1])]; if (!t || !t[2]) continue;
    const ch = +m[2], h = +m[3]; if (!ch || !h) continue;
    const page = !!m[4]; // „jSabb 6,8ᵇ“: Kapitel und Blatt (Halacha fehlt)
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `Jerusalem Talmud ${t[0]} ${page ? ch : ch + ':' + h}`, book: 'Jerusalem Talmud ' + t[0], nolast: true });
  }
  MIS_RE.lastIndex = 0;
  while ((m = MIS_RE.exec(text))) {
    const t = TRK[nk(m[2])]; if (!t) continue;
    const ch = +m[4], v = +m[5]; if (!ch || !v) continue;
    let name = t[0];
    if (m[1] === 'T') { if (name === 'Kelim' && m[3]) name += ' ' + { bk: 'Bava Kamma', 'bḳ': 'Bava Kamma', bm: 'Bava Metzia', bb: 'Bava Batra' }[m[3]]; name = 'Tosefta ' + name; } else name = 'Mishnah ' + name;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${name} ${ch}:${v}`, book: name, nolast: true });
  }
  RAB_RE.lastIndex = 0;
  while ((m = RAB_RE.exec(text))) {
    const b = RABBA[nk(m[1])]; if (!b) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${b} Rabbah ${+m[2]}:${+m[3]}`, book: b + ' Rabbah' });
  }
}

// Maimonides in Krauss' Schreibweise: „Maim. zu MKel 5,1“ (Mischna-Kommentar), „Maim. Kel 5,1“ und „Maim. הל׳ כלים 5,1“ (Mischne Tora)
const HIL = {
  'יסודי התורה': 'Foundations of the Torah', 'דעות': 'Human Dispositions', 'תלמוד תורה': 'Torah Study', 'עבודה זרה': 'Foreign Worship and Customs of the Nations', 'ע״ז': 'Foreign Worship and Customs of the Nations', 'תשובה': 'Repentance',
  'קריאת שמע': 'Reading the Shema', 'תפילה': 'Prayer and the Priestly Blessing', 'תפילין': 'Tefillin, Mezuzah and the Torah Scroll', 'ציצית': 'Fringes', 'ברכות': 'Blessings', 'מילה': 'Circumcision',
  'שבת': 'Sabbath', 'עירובין': 'Eruvin', 'שביתת עשור': 'Rest on the Tenth of Tishrei', 'שביתת יום טוב': 'Rest on a Holiday', 'חמץ ומצה': 'Leavened and Unleavened Bread', 'שופר': 'Shofar, Sukkah and Lulav', 'סוכה': 'Shofar, Sukkah and Lulav',
  'שקלים': 'Shekalim', 'קידוש החודש': 'Sanctification of the New Month', 'תעניות': 'Fasts', 'מגילה': 'Scroll of Esther and Hanukkah', 'חנוכה': 'Scroll of Esther and Hanukkah',
  'אישות': 'Marriage', 'גירושין': 'Divorce', 'יבום': 'Levirate Marriage and Release', 'נערה בתולה': 'Virgin Maiden', 'סוטה': 'Woman Suspected of Infidelity',
  'איסורי ביאה': 'Forbidden Intercourse', 'מאכלות אסורות': 'Forbidden Foods', 'שחיטה': 'Ritual Slaughter',
  'שבועות': 'Oaths', 'נדרים': 'Vows', 'נזירות': 'Nazariteship', 'ערכין': 'Appraisals and Devoted Property',
  'כלאים': 'Diverse Species', 'מתנות עניים': 'Gifts to the Poor', 'תרומות': 'Heave Offerings', 'מעשרות': 'Tithes', 'מעשר שני': 'Second Tithes and Fourth Year\'s Fruit', 'בכורים': 'First Fruits and other Gifts to Priests Outside the Sanctuary', 'שמיטה': 'Sabbatical Year and the Jubilee',
  'בית הבחירה': 'Chosen Temple', 'כלי המקדש': 'Vessels of the Sanctuary and Those Who Serve Therein', 'ביאת המקדש': 'Admission into the Sanctuary', 'איסורי מזבח': 'Things Forbidden on the Altar', 'מעשה הקרבנות': 'Sacrificial Procedure', 'תמידין': 'Daily Offerings and Additional Offerings', 'פסולי המוקדשין': 'Sacrifices Rendered Unfit', 'עבודת יום הכפורים': 'Service on the Day of Atonement', 'מעילה': 'Trespass',
  'קרבן פסח': 'Paschal Offering', 'חגיגה': 'Festival Offering', 'בכורות': 'Firstlings', 'שגגות': 'Offerings for Unintentional Transgressions', 'מחוסרי כפרה': 'Offerings for Those with Incomplete Atonement', 'תמורה': 'Substitution',
  'טומאת מת': 'Defilement by a Corpse', 'פרה אדומה': 'Red Heifer', 'טומאת צרעת': 'Defilement by Leprosy', 'משכב ומושב': 'Those Who Defile Bed and Seat', 'שאר אבות הטומאות': 'Other Sources of Defilement', 'טומאת אוכלין': 'Defilement of Foodstuffs', 'כלים': 'Vessels', 'מקוואות': 'Mikvaot',
  'נזקי ממון': 'Damages to Property', 'גניבה': 'Theft', 'גזילה': 'Robbery and Lost Property', 'חובל': 'One Who Injures a Person or Property', 'רוצח': 'Murderer and the Preservation of Life',
  'מכירה': 'Sales', 'זכייה': 'Ownerless Property and Gifts', 'שכנים': 'Neighbors', 'שלוחין': 'Agents and Partners', 'עבדים': 'Slaves',
  'שכירות': 'Hiring', 'שאלה': 'Borrowing and Deposit', 'מלווה': 'Creditor and Debtor', 'טוען': 'Plaintiff and Defendant', 'נחלות': 'Inheritances',
  'סנהדרין': 'Sanhedrin and the Penalties Within Their Jurisdiction', 'עדות': 'Testimony', 'ממרים': 'Rebels', 'אבל': 'Mourning', 'מלכים': 'Kings and Wars'
};
const HIL_LAT = { kel: 'Vessels', kelim: 'Vessels', sabb: 'Sabbath', erub: 'Eruvin', mikw: 'Mikvaot', mkw: 'Mikvaot' };
const MAIM = '(?<![\\p{L}\\d])Maim(?:onides|ûnis)?\\.?,?\\s*';
const MAIM_MIS_RE = new RegExp(MAIM + '(?:zu\\s+|erklärt\\s+)?M' + RN + '\\.?\\s*(\\d{1,2})\\s*,\\s*(\\d{1,2})(?![\\d])', 'gu');
const MAIM_LAT_RE = new RegExp(MAIM + RN + '\\.?\\s*(\\d{1,2})\\s*,\\s*(\\d{1,3})(?![\\d])', 'gu');
const MAIM_HE_RE = new RegExp(MAIM + '\\(?הל[׳\'’]\\s*((?:[א-ת״׳\']+\\s*){1,3}?)\\s*(\\d{1,2})\\s*,\\s*(\\d{1,2})(?![\\d])', 'gu');
function hilTitle(words) { // längste passende Wortfolge (bis 3 Wörter)
  const w = words.trim().split(/\s+/);
  for (let n = Math.min(3, w.length); n >= 1; n--) { const k = w.slice(0, n).join(' ').replace(/["״]/g, '״'); if (HIL[k]) return HIL[k]; }
  return '';
}
function maimonides(text, matches) {
  let m;
  MAIM_MIS_RE.lastIndex = 0;
  while ((m = MAIM_MIS_RE.exec(text))) {
    const t = TRK[nk(m[1])]; if (!t) continue; const ch = +m[2], v = +m[3]; if (!ch || !v) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `Rambam on Mishnah ${t[0]} ${ch}:${v}`, book: 'Rambam on Mishnah ' + t[0], nolast: true });
  }
  MAIM_LAT_RE.lastIndex = 0;
  while ((m = MAIM_LAT_RE.exec(text))) {
    const h = HIL_LAT[nk(m[1])]; if (!h) continue; const ch = +m[2], v = +m[3]; if (!ch || !v) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `Mishneh Torah, ${h} ${ch}:${v}`, book: 'Mishneh Torah, ' + h, nolast: true });
  }
  MAIM_HE_RE.lastIndex = 0;
  while ((m = MAIM_HE_RE.exec(text))) {
    const h = hilTitle(m[1]); if (!h) continue; const ch = +m[2], v = +m[3]; if (!ch || !v) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `Mishneh Torah, ${h} ${ch}:${v}`, book: 'Mishneh Torah, ' + h, nolast: true });
  }
}
// text: reiner Text (nach dem Entfernen der Tags); st.last: zuletzt genannte Schrift (für „ibid.“); st.trad: Zähltradition der Stellenangaben
// ('heb' | 'eng' | 'lat' | 'grk', siehe versemap.js); st.vers === false schaltet die Umrechnung ab; st.note(Angabe, hebräische Stelle, Tradition): eigener Hinweistext
function linkText(text, st) {
  const out = [];
  let i = 0;
  const matches = [];
  let m;
  LAT_RE.lastIndex = 0;
  while ((m = LAT_RE.exec(text))) {
    if (/^[a-zäöü]/.test(m[1])) continue; // „Ex. 24:10“, nicht „ex 24:10“ mitten im Satz
    const t = titleOf(m[1]); if (!t) continue;
    const ch = +m[2], v = +m[3]; if (!ch || !v || ch > 150) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t} ${ch}:${v}` + (m[4] ? '-' + m[4] : ''), book: t });
  }
  ROM_RE.lastIndex = 0;
  while ((m = ROM_RE.exec(text))) {
    if (/^[a-zäöü]/.test(m[1])) continue;
    const t = titleOf(m[1]); if (!t) continue;
    if (!/^[IVXLC]+$/.test(m[2])) continue;
    const ch = roman(m[2]), v = +m[3]; if (!ch || !v || ch > 150) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t} ${ch}:${v}` + (m[4] ? '-' + m[4] : ''), book: t });
  }
  IBID_RE.lastIndex = 0;
  while ((m = IBID_RE.exec(text))) {
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${+m[2]}:${+m[3]}` + (m[4] ? '-' + m[4] : ''), ibid: true }); // Buch wird erst beim Zusammensetzen eingesetzt
  }
  HE_RE.lastIndex = 0;
  while ((m = HE_RE.exec(text))) {
    let t = HE[m[1]];
    if (!t) { const p = HE2[m[1]]; t = p && p[m[2] === 'ב' ? 1 : 0]; }
    const ch = gem(m[3]), v = gem(m[4]); if (!t || !ch || !v || ch > 150 || v > 176) continue;
    matches.push({ s: m.index, e: m.index + m[0].length, ref: `${t} ${ch}:${v}`, book: t });
  }
  rabbinic(text, matches);
  maimonides(text, matches);
  matches.sort((a, b) => a.s - b.s || b.e - a.e);
  for (const x of matches) {
    if (x.s < i) continue; // Überlappung: erste gewinnt
    if (x.ibid) { if (!st.last) continue; x.book = st.last; x.ref = st.last + ' ' + x.ref; }
    out.push(esc2(text.slice(i, x.s)));
    // Zählung: st.trad = Tradition, nach der dieser Text zitiert (Standard hebräisch); umgerechnete Stellen behalten die Angabe des Textes in data-oref
    const r = VM && !x.nolast && st.vers !== false ? VM.resolve(x.ref, st.trad || 'heb') : null;
    if (r && r.from) out.push(`<a class="aref" data-sref="${esc(r.ref)}" data-oref="${esc(x.ref)}" data-vt="${r.from}" title="${esc((st.note || VM.note)(x.ref, r.ref, r.from))}">${esc2(text.slice(x.s, x.e))}</a>`);
    else out.push(`<a class="aref" data-sref="${esc(x.ref)}" title="${esc(x.ref)}">${esc2(text.slice(x.s, x.e))}</a>`);
    st.last = x.nolast ? '' : x.book; i = x.e;
  }
  out.push(esc2(text.slice(i)));
  return out.join('');
}
// bereits maskierte Textstücke (HTML-Entitäten) bleiben unverändert, deshalb nur sehr sparsam maskieren
const esc2 = s => s;
// Zitate von Graetz, Geschichte der Juden („GRAETZ, Gesch. 4³ 172“, „Grätz, Gesch. d. J. IV. B. S. 244“, „Grätz III² S. 473“,
// „Grätz, Gesch. II, 1 S. 38“, „Grätz, Geschichte der Juden Band 4, Note 31“) -> Stelle im mitgelieferten Text nach Band und Seite.
// Die Seiten sind die der Ausgabe auf zeno.org; zitiert ein Text eine andere Auflage, trifft der Sprung nur ungefähr.
// Band II (zwei Hälften, beide ab S. 1) nur mit Angabe der Hälfte oder bei Seiten, die es nur in II/1 gibt; Band III läuft durch (III/2 ab S. 369).
const GR_SUP = '(?:[⁰¹²³⁴⁵⁶⁷⁸⁹]+|<sup>\\d</sup>|<sub>\\d</sub>)';
const GR_RE = new RegExp('(?<![-\\p{L}])(?:GRAETZ|GRÄTZ|Graetz|Grätz)(?:</(?:i|b|abbr|em)>)?' +
  '(?:,?\\s*Gesch(?:ichte|\\.)?(?:\\s*d(?:er|\\.)\\s*J(?:uden|\\.))?(?:</abbr>)?' + GR_SUP + '?)?[,.]?\\s*' +
  '(?:Band|Bd\\.|B\\.)?\\s*(XI|X|IX|VIII|VII|VI|V|IV|III|II|I|1[01]|[1-9])(?![\\dA-Za-z])' + // Band
  '(?:\\s*\\.?\\s*(?:Band|Bd\\.|B\\.))?' +
  '(?:' + GR_SUP + '|\\.?\\s*,?\\s*\\d\\.\\s*Aufl\\.,?)?' + // Auflage
  '(?:(?<=II|2)[\\s.,]+([12])(?=[\\s.,]+(?:S\\.\\s*)?\\d))?' + // Hälfte von Band II
  '\\.?(?:' + GR_SUP + ')?[\\s,.]*(?:(?:Note|Nota)\\s*(\\d{1,2})(?!\\d)|(?:S[.,]|Seite|p\\.)?\\s*(\\d{1,3})(?![\\d,]\\d)(?:\\s*(?:Note|Nota)\\s*(\\d{1,2})(?!\\d))?)', 'gu');
const ROMV = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11 };
const RNUM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
function graetzRef(vol, half, note, page) {
  if (!GP) return null;
  const n = ROMV[vol] || +vol, r = RNUM[n]; if (!r) return null;
  const parts = r === 'II' ? (half ? ['II/' + half] : ['II/1', 'II/2']) : r === 'III' ? ['III/1', 'III/2'] : [r];
  if (note) { for (const v of parts) { const s = GP.notes[v] && GP.notes[v][note]; if (s) return { ref: `${GP.title} ${s}:1`, label: `Bd. ${v}, Note ${note}` }; } return null; }
  const hits = [];
  for (const v of parts) {
    const d = GP.vols[v]; if (!d) continue;
    const a = d.refs.split(' '), i = page - d.from;
    if (i >= 0 && i < a.length && a[i]) hits.push({ ref: `${GP.title} ${a[i]}`, label: `Bd. ${v}, S. ${page}` });
  }
  return hits.length === 1 ? hits[0] : null; // Band II ohne Hälfte und Seite in beiden: offen lassen
}
function graetz(html) {
  if (!GP || !/GRAETZ|GRÄTZ|Graetz|Grätz/.test(html)) return html;
  let out = '', i = 0, m;
  GR_RE.lastIndex = 0;
  while ((m = GR_RE.exec(html))) {
    const before = html.slice(0, m.index);
    if (before.lastIndexOf('<') > before.lastIndexOf('>')) continue; // in einem Attribut (z. B. abbr data-t)
    if ((before.match(/<a[\s>]/gi) || []).length > (before.match(/<\/a>/gi) || []).length) continue; // schon verlinkt
    const note = m[3] || m[5], page = note ? 0 : +m[4];
    const g = graetzRef(m[1], m[2], note, page); if (!g) continue;
    let s = m.index + m[0].search(/(?:Band|Bd\.|B\.)?\s*(?:XI|X|IX|VIII|VII|VI|V|IV|III|II|I|1[01]|[1-9])(?![\dA-Za-z])/), e = m.index + m[0].length;
    const span = html.slice(s, e); if (span.includes('>')) s += span.lastIndexOf('>') + 1;
    while (s < e && /\s/.test(html[s])) s++;
    const tip = `Graetz, Geschichte der Juden, ${g.label} – Seitenzählung der Ausgabe auf zeno.org; die zitierte Auflage kann abweichen`;
    out += html.slice(i, s) + `<a class="aref" data-sref="${esc(g.ref)}" title="${esc(tip)}">` + html.slice(s, e) + '</a>';
    i = e;
  }
  return i ? out + html.slice(i) : html;
}
// html: Zellen-HTML. Tags bleiben unverändert; in Textstücken außerhalb von <a> werden Stellenangaben verlinkt.
function link(html, st) {
  st = st || { last: '' };
  if (!html || !/[\d׳״א-ת]/.test(html)) return html;
  html = graetz(String(html));
  const parts = String(html).split(/(<[^>]*>)/);
  let inA = 0, out = '';
  for (const p of parts) {
    if (p.startsWith('<')) {
      if (/^<a[\s>]/i.test(p)) inA++; else if (/^<\/a>/i.test(p)) inA = Math.max(0, inA - 1);
      out += p;
    } else out += inA ? p : linkText(p, st);
  }
  return out;
}
const api = { link, gem, titleOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.AutoRef = api;
})();
