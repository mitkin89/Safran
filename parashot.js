'use strict';
// Die 54 Wochenabschnitte (Parschiot) mit Anfang und Ende: [Name, hebräisch, Buch, Anfang K:V, Ende K:V, weitere Schreibweisen…]
(function (root) {
  const P = [
    ['Bereshit', 'בראשית', 'Genesis', '1:1', '6:8', 'Bereishit', 'Breschit', 'Bereschit', 'Berešit'],
    ['Noach', 'נח', 'Genesis', '6:9', '11:32', 'Noah'],
    ['Lech Lecha', 'לך לך', 'Genesis', '12:1', '17:27', 'Lekh Lekha', 'Lech Lecha'],
    ['Vayera', 'וירא', 'Genesis', '18:1', '22:24', 'Wajera', 'Vayeira'],
    ['Chayei Sara', 'חיי שרה', 'Genesis', '23:1', '25:18', 'Chaye Sarah', 'Chaje Sara', 'Hayei Sarah'],
    ['Toldot', 'תולדות', 'Genesis', '25:19', '28:9', 'Toledot', 'Toldos'],
    ['Vayetzei', 'ויצא', 'Genesis', '28:10', '32:3', 'Vayetze', 'Wajeze', 'Vayetzeh'],
    ['Vayishlach', 'וישלח', 'Genesis', '32:4', '36:43', 'Wajischlach'],
    ['Vayeshev', 'וישב', 'Genesis', '37:1', '40:23', 'Wajeschew', 'Vayeshev'],
    ['Miketz', 'מקץ', 'Genesis', '41:1', '44:17', 'Mikez', 'Mikeitz'],
    ['Vayigash', 'ויגש', 'Genesis', '44:18', '47:27', 'Wajigasch'],
    ['Vayechi', 'ויחי', 'Genesis', '47:28', '50:26', 'Wajechi', 'Vayhi'],
    ['Shemot', 'שמות', 'Exodus', '1:1', '6:1', 'Schemot', 'Shemos'],
    ['Vaera', 'וארא', 'Exodus', '6:2', '9:35', 'Waera'],
    ['Bo', 'בא', 'Exodus', '10:1', '13:16'],
    ['Beshalach', 'בשלח', 'Exodus', '13:17', '17:16', 'Beschalach', 'Beshalah'],
    ['Yitro', 'יתרו', 'Exodus', '18:1', '20:23', 'Jitro', 'Jethro'],
    ['Mishpatim', 'משפטים', 'Exodus', '21:1', '24:18', 'Mischpatim'],
    ['Terumah', 'תרומה', 'Exodus', '25:1', '27:19', 'Teruma', 'Trumah'],
    ['Tetzaveh', 'תצוה', 'Exodus', '27:20', '30:10', 'Tezawe', 'Tetzave'],
    ['Ki Tisa', 'כי תשא', 'Exodus', '30:11', '34:35', 'Ki Tissa', 'Ki Thissa'],
    ['Vayakhel', 'ויקהל', 'Exodus', '35:1', '38:20', 'Wajakhel', 'Vayakhel'],
    ['Pekudei', 'פקודי', 'Exodus', '38:21', '40:38', 'Pekude'],
    ['Vayikra', 'ויקרא', 'Leviticus', '1:1', '5:26', 'Wajikra'],
    ['Tzav', 'צו', 'Leviticus', '6:1', '8:36', 'Zaw', 'Tsav'],
    ['Shemini', 'שמיני', 'Leviticus', '9:1', '11:47', 'Schemini'],
    ['Tazria', 'תזריע', 'Leviticus', '12:1', '13:59', 'Tasria'],
    ['Metzora', 'מצורע', 'Leviticus', '14:1', '15:33', 'Mezora', 'Metsora'],
    ['Acharei Mot', 'אחרי מות', 'Leviticus', '16:1', '18:30', 'Acharei Mos', 'Acharej Mot', 'Achrei Mot'],
    ['Kedoshim', 'קדושים', 'Leviticus', '19:1', '20:27', 'Kedoschim', 'Kdoshim'],
    ['Emor', 'אמור', 'Leviticus', '21:1', '24:23'],
    ['Behar', 'בהר', 'Leviticus', '25:1', '26:2'],
    ['Bechukotai', 'בחקתי', 'Leviticus', '26:3', '27:34', 'Bechukkotai', 'Bechukotaj', 'Bechukosai'],
    ['Bamidbar', 'במדבר', 'Numbers', '1:1', '4:20'],
    ['Nasso', 'נשא', 'Numbers', '4:21', '7:89', 'Naso'],
    ['Behaalotecha', 'בהעלתך', 'Numbers', '8:1', '12:16', 'Beha’alotcha', 'Behaalotcha', 'Behaalotekha'],
    ['Shelach', 'שלח', 'Numbers', '13:1', '15:41', 'Schelach', 'Shelach Lecha', 'Schlach'],
    ['Korach', 'קרח', 'Numbers', '16:1', '18:32', 'Korah', 'Qorach'],
    ['Chukat', 'חקת', 'Numbers', '19:1', '22:1', 'Chukkat', 'Chukas', 'Hukkat'],
    ['Balak', 'בלק', 'Numbers', '22:2', '25:9'],
    ['Pinchas', 'פינחס', 'Numbers', '25:10', '30:1', 'Pinhas'],
    ['Matot', 'מטות', 'Numbers', '30:2', '32:42', 'Mattot', 'Matos'],
    ['Masei', 'מסעי', 'Numbers', '33:1', '36:13', 'Massei', 'Masse'],
    ['Devarim', 'דברים', 'Deuteronomy', '1:1', '3:22', 'Dewarim'],
    ['Vaetchanan', 'ואתחנן', 'Deuteronomy', '3:23', '7:11', 'Waetchanan', 'Vaetchanan', 'Va’etchanan'],
    ['Eikev', 'עקב', 'Deuteronomy', '7:12', '11:25', 'Ekev', 'Ekew'],
    ['Reeh', 'ראה', 'Deuteronomy', '11:26', '16:17', 'Re’eh', 'Re’e'],
    ['Shoftim', 'שפטים', 'Deuteronomy', '16:18', '21:9', 'Schoftim'],
    ['Ki Teitzei', 'כי תצא', 'Deuteronomy', '21:10', '25:19', 'Ki Tetze', 'Ki Tezé', 'Ki Teze', 'Ki Tetzei'],
    ['Ki Tavo', 'כי תבוא', 'Deuteronomy', '26:1', '29:8', 'Ki Tawo', 'Ki Tavo', 'Ki Tabo'],
    ['Nitzavim', 'נצבים', 'Deuteronomy', '29:9', '30:20', 'Nizawim', 'Nitsavim'],
    ['Vayelech', 'וילך', 'Deuteronomy', '31:1', '31:30', 'Wajelech', 'Vayelekh'],
    ['Haazinu', 'האזינו', 'Deuteronomy', '32:1', '32:52', 'Haasinu', 'Ha’azinu'],
    ['Vezot Haberakhah', 'וזאת הברכה', 'Deuteronomy', '33:1', '34:12', 'Wesot Haberacha', 'Vezot Haberachah', 'Zot Habracha', 'Vezot Habracha'],
  ].map(a => ({ name: a[0], he: a[1], book: a[2], from: a[3], to: a[4], alt: a.slice(5) }));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[֑-ׇ̀-ͯ]/g, '').replace(/[^\p{L}]/gu, '')
    .replace(/^(parascha|parashat|parasha|paraschat|parschat|sidra|wochenabschnitt|פרשת)/u, '');
  const keys = p => [p.name, p.he, ...p.alt].map(norm).filter(Boolean);
  // exakter Name (oder Schreibweise) -> Parascha; sonst nur bei eindeutigem Anfang (mind. 3 Buchstaben) -> Parascha
  function find(q) {
    const n = norm(q); if (!n) return null;
    const ex = P.find(p => keys(p).includes(n)); if (ex) return ex;
    return null;
  }
  function suggest(q, max = 6) {
    const n = norm(q); if (n.length < 2) return [];
    const starts = P.filter(p => keys(p).some(k => k.startsWith(n)));
    return starts.slice(0, max);
  }
  const api = { PARASHOT: P, find, suggest, norm, ref: p => `${p.book} ${p.from}`, label: p => `${p.book} ${p.from}–${p.to}` };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Parashot = api;
})(typeof window !== 'undefined' ? window : globalThis);
