// Reihenfolge wie auf Sefaria (statt alphabetisch): Hauptkategorien, Tanach, Mischna, Talmud-Traktate
const TOP = ['Eigene Texte', 'Tanakh', 'Mishnah', 'Talmud', 'Midrash', 'Halakhah', 'Kabbalah', 'Liturgy', 'Jewish Thought', 'Tosefta', 'Chasidut', 'Musar', 'Responsa', 'Second Temple', 'Reference', 'Targum', 'Tanakh Commentary', 'Mishnah Commentary', 'Talmud Commentary', 'Quoting Commentary'];
const SUB = {
  Tanakh: ['Torah', 'Prophets', 'Writings', 'Targum', 'Rishonim on Tanakh', 'Acharonim on Tanakh', 'Modern Commentary on Tanakh', 'Quoting Commentary'],
  Talmud: ['Bavli', 'Yerushalmi'],
  Mishnah: ['Seder Zeraim', 'Seder Moed', 'Seder Nashim', 'Seder Nezikin', 'Seder Kodashim', 'Seder Tahorot'],
};
const SEDER = ['Seder Zeraim', 'Seder Moed', 'Seder Nashim', 'Seder Nezikin', 'Seder Kodashim', 'Seder Tahorot'];
const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles',
  'Berakhot', 'Peah', 'Demai', 'Kilayim', 'Sheviit', 'Terumot', 'Maasrot', 'Maaser Sheni', 'Challah', 'Orlah', 'Bikkurim',
  'Shabbat', 'Eruvin', 'Pesachim', 'Shekalim', 'Yoma', 'Sukkah', 'Beitzah', 'Rosh Hashanah', 'Taanit', 'Megillah', 'Moed Katan', 'Chagigah',
  'Yevamot', 'Ketubot', 'Nedarim', 'Nazir', 'Sotah', 'Gittin', 'Kiddushin',
  'Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin', 'Makkot', 'Shevuot', 'Eduyot', 'Avodah Zarah', 'Avot', 'Horayot',
  'Zevachim', 'Menachot', 'Chullin', 'Bekhorot', 'Arakhin', 'Temurah', 'Keritot', 'Meilah', 'Tamid', 'Middot', 'Kinnim',
  'Kelim', 'Oholot', 'Negaim', 'Parah', 'Tahorot', 'Mikvaot', 'Niddah', 'Makhshirin', 'Zavim', 'Tevul Yom', 'Yadayim', 'Oktzin',
];
const BOOK_RANK = new Map(BOOKS.map((b, i) => [b, i]));
const bookKey = title => {
  let t = String(title || '').replace(/^(Mishnah|Jerusalem Talmud|Tosefta|Babylonian Talmud|Talmud)\s+/, '');
  const i = t.lastIndexOf(' on ');
  if (i >= 0) t = t.slice(i + 4);
  return t.replace(/,.*$/, '').trim();
};
function catRank(name, parent) {
  if (!parent) { const i = TOP.indexOf(name); return i < 0 ? 1000 : i; }
  const list = SUB[parent];
  if (list) { const i = list.indexOf(name); if (i >= 0) return i; }
  if (/^Seder /.test(name)) { const i = SEDER.indexOf(name); if (i >= 0) return i; }
  return 1000;
}
const byName = (a, b) => String(a).localeCompare(String(b));
// Kategorie-Namen sortieren (parent = Name der übergeordneten Kategorie oder '')
function sortCats(names, parent) {
  return [...names].sort((a, b) => (catRank(a, parent) - catRank(b, parent)) || byName(a, b));
}
// Buchtitel sortieren: bekannte Bücher in biblischer bzw. Traktat-Reihenfolge, Rest alphabetisch
function sortTitles(items, getTitle = x => x.title) {
  const r = x => { const k = BOOK_RANK.get(bookKey(getTitle(x))); return k === undefined ? 1e6 : k; };
  return [...items].sort((a, b) => (r(a) - r(b)) || byName(getTitle(a), getTitle(b)));
}
const SefOrder = { sortCats, sortTitles, bookKey };
if (typeof module !== 'undefined' && module.exports) module.exports = SefOrder;
else window.SefOrder = SefOrder;
