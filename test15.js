const A = require('./autoref.js'); let bad = 0;
const t = (inp, want) => { const out = A.link(inp, { last: '' }); const refs = [...out.matchAll(/data-sref="([^"]+)"/g)].map(x => x[1]); if (JSON.stringify(refs) !== JSON.stringify(want)) { bad++; console.log('FEHLER', inp, '→', refs, 'erwartet', want); } };
t('"Below His feet" [Exodus 24:10], "Written by the finger of God" [ibid. 31:18], "God\'s ears" [Numbers 11:1]', ['Exodus 24:10', 'Exodus 31:18', 'Numbers 11:1']);
t('heißt es: »Unter Seinen Füßen« (Ex. 24:10), »Finger Gottes« (Ex. 31:18) und (Deut. 32:41)', ['Exodus 24:10', 'Exodus 31:18', 'Deuteronomy 32:41']);
t('s. Ps. 23, 4 und Jes. 6, 3 und 1 Kön. 8:27', ['Psalms 23:4', 'Isaiah 6:3', 'I Kings 8:27']);
t('ובתחת רגליו (שמות לא יח) ו(דברים לב מא) וגם [בראשית ב, ז]', ['Exodus 31:18', 'Deuteronomy 32:41', 'Genesis 2:7']);
t('(שמואל ב ז יד) (תהלים כד א)', ['II Samuel 7:14', 'Psalms 24:1']);
t('בראשית ברא אלהים שמות בני ישראל (דברים אלו אמר)', []);
t('um 3:4 Uhr, zwei mal 3, 4 und mi 3:4', []);
t('<a href="x">Exodus 3:4</a> und Exodus 5:6', ['Exodus 5:6']);
t('Genesis 1:1-5 und Psalms 23', ['Genesis 1:1-5']);
if (A.gem('לא') !== 31 || A.gem('כ״ד') !== 24 || A.gem('קמ') !== 140) { bad++; console.log('gem'); }
console.log(bad ? 'FEHLER' : 'Stellenerkennung ok'); process.exit(bad ? 1 : 0);
