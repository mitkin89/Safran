'use strict';
// German working translations for source contexts 5001–7500. No corpus text is changed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'../../..');
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f׳״'"’]/g,'').replace(/\s+/g,' ').trim();
const cons=s=>String(s||'').replace(/[^א-ת]/g,'');
const normalizeWord=s=>/^[י]{2,3}$/.test(cons(s))?'יהוה':cons(s);
const words=s=>String(s||'').replace(/<[^>]*>/g,'').split(/[\s־\-–.,;:!?()[\]{}<>]+/).map(normalizeWord).filter(Boolean);
const DICT={
 'וחברו':'Und die entsprechende Parallelstelle.','וחברו דדברי הימים':'Und die entsprechende Parallelstelle in den Chronikbüchern.',
 'ושלאחריו':'Und die darauf folgende Stelle.','ודין':'Und diese Stelle hier.','ודן':'Und diese Stelle hier.',
 'סימן':'Merkzeichen:','סימ':'Merkzeichen:','וסימן':'Und die Merkzeichen:','וסימ':'Und die Merkzeichen:',
 'סימן חלוף':'Merkzeichen für die Umstellung:','אנך':'In der Tora, den Propheten und den Schriften.',
 'מל':'Voll geschrieben.','מלא':'Voll geschrieben.','חס':'Defektiv geschrieben.','חסר':'Defektiv geschrieben.',
 'כל חס':'Alle Vorkommen sind defektiv geschrieben.','כל מל':'Alle Vorkommen sind voll geschrieben.',
 'כל כת כן':'Alle Vorkommen sind so geschrieben.','בתראה מל':'Das letzte Vorkommen ist voll geschrieben.',
 'בתרא מל':'Das letzte Vorkommen ist voll geschrieben.','מציעאה מל':'Das mittlere Vorkommen ist voll geschrieben.',
 'בתרא פת':'Das letzte Vorkommen hat Patach.','ב בתראי פת':'Die beiden letzten Vorkommen haben Patach.',
 'כל סחופי קמ':'Alle umgestellten Formen haben Qamets.',
 'א באורית א בנביאי א בכתובי אנך':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften: Tora – Propheten – Schriften.',
 'א בתו א בנבי א בכתו אנך':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften: Tora – Propheten – Schriften.',
 'א בתור א בנביאי א בכתוב אנך':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften: Tora – Propheten – Schriften.',
 'א בתור א בנביאי א בכתובי אנך':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften: Tora – Propheten – Schriften.',
 'א בתו א בנבי א בכתו אנך סימ':'Einmal in der Tora, einmal in den Propheten und einmal in den Schriften. Merkzeichen: Tora – Propheten – Schriften.',
 'כל אתנחת וסופי פסוקי דכותהון קמצין':'Alle entsprechenden Formen bei Atnach und an Versenden haben Qamets.',
 'אנך וכל אתנחתא וסוף פסוק דכות':'In der Tora, den Propheten und den Schriften; ebenso alle entsprechenden Formen bei Atnach und am Versende.',
 'וכל אורית דכות':'Und alle entsprechenden Vorkommen in der Tora.',
 'וכל יחזקאל דכות':'Und alle entsprechenden Vorkommen in Ezechiel.',
 'ב בתרי ליש':'Zweimal, in zwei verschiedenen Ausdrucksformen.',
 'ב בתרין לישני':'Zweimal, in zwei verschiedenen Ausdrucksformen.',
 'חס ו':'Ohne Waw geschrieben.','חס י':'Ohne Jod geschrieben.',
 'ל לא מפיק':'Einmalig; ohne Mappiq.',
 'כל שאר קריא דכות':'Alle übrigen entsprechenden Vorkommen in der Schrift.',
 'ראשי פסוקי':'Versanfänge.','סופי פסוקי':'Versenden.'
};
Object.assign(DICT,{
  "ובשר זבח תודת": "Und das Fleisch des Dankopfers.",
  "תשלחו ל": "„תשלחו“: einmalig.",
  "ועתה יוסיפו לחטא": "Und nun fahren sie fort zu sündigen.",
  "יהודה תנינא ששה ושבעים אלף וחמש מאות": "Juda, das zweite Vorkommen: sechsundsiebzigtausendfünfhundert.",
  "מנשה תנינא שנים וחמשים אלף ושבע מאות": "Manasse, das zweite Vorkommen: zweiundfünfzigtausendsiebenhundert.",
  "מלה חדה": "Ein einziges Wort.",
  "כל חס בר מן ט": "Alle Vorkommen sind defektiv geschrieben, mit Ausnahme von neun.",
  "כל אור חס במא מל": "Alle Vorkommen in der Tora sind defektiv geschrieben, mit einer voll geschriebenen Ausnahme.",
  "כל אור חס במד מל": "Alle Vorkommen in der Tora sind defektiv geschrieben, mit vier voll geschriebenen Ausnahmen.",
  "כל ליש מל במב חס": "Alle Vorkommen dieser Ausdrucksform sind voll geschrieben, mit zwei defektiv geschriebenen Ausnahmen.",
  "כל מל במג חס": "Alle Vorkommen sind voll geschrieben, mit drei defektiv geschriebenen Ausnahmen.",
  "כל חס במט מל": "Alle Vorkommen sind defektiv geschrieben, mit neun voll geschriebenen Ausnahmen.",
  "כל אור כת כן במב חס דחס": "Alle Vorkommen in der Tora sind so geschrieben, mit zwei Ausnahmen mit doppelter defektiver Schreibung.",
  "וחברו דתהלות": "Und die entsprechende Parallelstelle in den Psalmen.",
  "וחברו דדה": "Und die entsprechende Parallelstelle in den Chronikbüchern.",
  "הבו לייי בני אלים": "Gebt dem HERRN, ihr Gottessöhne.",
  "כי מי בשחק יערך לייי": "Denn wer im Himmel ist mit dem HERRN vergleichbar?",
  "וישחטו אלים": "Und sie schlachteten Widder.",
  "קדמא חס": "Das erste Vorkommen ist defektiv geschrieben.",
  "מקשה תיעשה המנורה ירכה וקנה": "In getriebener Arbeit soll der Leuchter gefertigt werden, sein Fuß und sein Schaft.",
  "כל הפקדים למחנה יהודה מאת אלף": "Alle Gemusterten im Lager Judas: hunderttausend …",
  "למאה ולקחנו עשרה אנשים": "Für je hundert wollen wir zehn Männer nehmen.",
  "ולא יראה כי יבא חם": "Und er wird es nicht bemerken, wenn Hitze kommt.",
  "אל יבושו בי קויך": "Lass durch mich nicht beschämt werden, die auf dich hoffen.",
  "כל ימי נזרו קדש הוא לייי": "Alle Tage seiner Weihe ist er dem HERRN heilig.",
  "ופקדת אלעזר בן אהרן הכהן פקדת": "Und die Aufsicht Eleasars, des Sohnes des Priesters Aaron, umfasst die Aufsicht …",
  "וביום פקדי ופקדתי עלהם חטאתם": "Und am Tag meiner Heimsuchung werde ich ihre Sünde an ihnen heimsuchen.",
  "ושעיר עזים דראש חדש": "Und der Ziegenbock: die Stelle über den Neumond.",
  "ולא יכול משה לבא אל": "Und Mose konnte nicht hineingehen zu …",
  "ולא ישמע אליכם פרעה": "Und der Pharao wird nicht auf euch hören.",
  "ולא שמעו אל משה ויותירו": "Und sie hörten nicht auf Mose und ließen davon übrig.",
  "ולא תעלה במעלות על מזבחי": "Und du sollst nicht auf Stufen zu meinem Altar hinaufsteigen.",
  "לא יסור שבט מיהודה ומחוקק מבין": "Das Zepter soll von Juda nicht weichen und der Herrscherstab nicht zwischen …",
  "צלי אש ומצות על מרורים": "Am Feuer gebraten und mit ungesäuerten Broten, auf bitteren Kräutern.",
  "ויחנו בני ישר בגלגל": "Und die Israeliten lagerten in Gilgal.",
  "שבעת ימים תאכל מצת דוהיה כי יביאך": "Sieben Tage sollst du ungesäuerte Brote essen: die Stelle „Und wenn er dich bringen wird“.",
  "ולחם מצת וחלת מצת תנינא דפסוק": "Und ungesäuertes Brot und ungesäuerte Kuchen: das zweite Vorkommen im Vers.",
  "וקדמ דוכי תקריב קרבן מנחה": "Und das erste Vorkommen: die Stelle „Und wenn du eine Speiseopfergabe darbringst“.",
  "ולקחת את כסף הכפורים מאת": "Und du sollst das Sühnegeld nehmen von …",
  "ונשא אהרן את שמות בני יש ישראל": "Und Aaron soll die Namen der Söhne Israels tragen.",
  "והעטרות תהיה לחלם ולטוביה": "Und die Kronen sollen für Chelem und Tobija sein.",
  "בהכותי את ארץ מצרים מל": "„Wenn ich das Land Ägypten schlage“: voll geschrieben.",
  "בהכתי בארץ מצרים חס": "„Wenn ich im Land Ägypten schlage“: defektiv geschrieben.",
  "אך ביום השבעי תשביתו שאר": "Doch am siebten Tag sollt ihr den Sauerteig beseitigen.",
  "אצם הששי דוד השבעי": "Ozem als sechster, David als siebter.",
  "בירח האיתנים בחג פלוג דספר": "„Im Monat Etanim, am Fest“: die Hälfte des Buches.",
  "וראיתי לבית גבה סביב": "Und ich sah rings um das Haus eine Erhöhung.",
  "וראיתי והנה עליהם גידים": "Und ich sah: Siehe, Sehnen waren auf ihnen.",
  "וראיתי שיש יתרון לחכמה": "Und ich sah, dass die Weisheit einen Vorzug hat.",
  "וראיתי את כל המעשה": "Und ich sah das ganze Werk.",
  "כי איככה אוכל וראיתי ב בפסוק": "„Denn wie könnte ich es ertragen und ansehen“: zweimal im Vers.",
  "וראיתי אני דניאל שנים אחרים": "Und ich, Daniel, sah zwei andere.",
  "ו זוג": "Sechs Paare.",
  "ה זוג מתחל": "Fünf Paare mit vertauschter Reihenfolge.",
  "ד זוג מתחל": "Vier Paare mit vertauschter Reihenfolge.",
  "ל וכל אתנ וספ דכו": "Einmalig; ebenso alle entsprechenden Vorkommen bei Atnach und am Versende.",
  "ויסעו בני ישר מרעמסס": "Und die Israeliten brachen von Ramses auf.",
  "כל עדת ישראל יעשו אתו": "Die ganze Gemeinde Israels soll es begehen.",
  "ומחר אל כל עדת ישראל ושלאחריו": "„Und morgen gegen die ganze Gemeinde Israels“ und die darauf folgende Stelle.",
  "והמלך שלמה וכל עדת ישראל": "Und König Salomo und die ganze Gemeinde Israels.",
  "וחברו והמלך שלמה": "Und die entsprechende Parallelstelle „Und König Salomo“.",
  "וכל עדת ישר דדברי הימי": "Und „die ganze Gemeinde Israels“ in den Chronikbüchern.",
  "אני והאשה הזאת יושבות": "Ich und diese Frau wohnen zusammen.",
  "כי לא ישבתי בבית": "Denn ich habe nicht in einem Haus gewohnt.",
  "וחברו כי לא ישבתי בבית דדברי הימי": "Und die entsprechende Parallelstelle „Denn ich habe nicht in einem Haus gewohnt“ in den Chronikbüchern.",
  "יבאך תנינא ל חסר יוד": "„יבאך“, das zweite Vorkommen: einmalig, ohne Jod geschrieben.",
  "כל זכר בכהנים יאכלנו דאשם": "„Jeder männliche Angehörige der Priester soll es essen“: die Stelle über das Schuldopfer.",
  "ואם נדר או נדבה ב בפסו": "„Und wenn es ein Gelübde oder eine freiwillige Gabe ist“: zweimal im Vers.",
  "ואם האכל יאכל מבשר וחברו": "„Und wenn vom Fleisch gegessen wird“ und die entsprechende Parallelstelle.",
  "שבעת ימים מצת יאכל דיחזק": "„Sieben Tage soll ungesäuertes Brot gegessen werden“ in Ezechiel.",
  "ב וידבר העם ודין": "Zweimal: „Und das Volk redete“ und diese Stelle hier.",
  "ב דג": "Zweimal mit Dagesch.",
  "ד דג": "Viermal mit Dagesch.",
  "ב בתראי פת": "Die beiden letzten Vorkommen haben Patach.",
  "וממהר האלהים": "Und Gott wird es bald tun.",
  "כי לא יוכלו לע": "Denn sie konnten es nicht tun.",
  "חפץ בך המלך": "Der König hat Gefallen an dir.",
  "וכל עבדיו נצבים עליו": "Und alle seine Diener stehen bei ihm.",
  "נצבים קרעי בגדים": "Sie stehen mit zerrissenen Kleidern da.",
  "בכו בכי גדול": "Sie weinten bitterlich.",
  "עברים על ידו": "Sie ziehen an seiner Seite vorüber.",
  "כאלה תעשו ליום": "Solches sollt ihr täglich darbringen.",
  "קדמ מל וג חסרי וא ויולך": "Das erste Vorkommen ist voll geschrieben und drei sind defektiv; und einmal „ויולך“.",
  "וכל חמשת חקה מדה שנה תורה דכותהו": "Und alle entsprechenden Fälle: „חמשת“, „חקה“, „מדה“, „שנה“, „תורה“.",
  "ואכבדה": "Und ich will mich verherrlichen.",
  "וכל מלכי דכות במב מל וסימנהון": "Ebenso alle Vorkommen von „מלכי“, mit zwei voll geschriebenen Ausnahmen; und ihre Erkennungszitate:",
  "וילונו ק": "„וילונו“: Qere.",
  "אחת פתחין בר מן חד קמץ": "Die Formen von „אחת“ haben Patach, mit einer Ausnahme mit Qamets.",
  "ויעשון": "Und sie sollen tun.",
  "וחברו אש אלהים נפלה מן": "Und die entsprechende Parallelstelle „Feuer Gottes fiel von …“."
});
Object.assign(DICT,{
  "ויאמרו הנה חג ייי בשילו": "Und sie sagten: Siehe, ein Fest des HERRN ist in Schilo.",
  "ועלה האיש ההוא מעירו דשמואל": "„Und jener Mann zog aus seiner Stadt hinauf“ in Samuel.",
  "ומעיל קטן תעשה לו אמו דשמואל": "„Und seine Mutter machte ihm ein kleines Obergewand“ in Samuel.",
  "שלחנו ל": "„שלחנו“: einmalig.",
  "ובשלח ל": "„ובשלח“: einmalig.",
  "משלח ל": "„משלח“: einmalig.",
  "שלחתו ל": "„שלחתו“: einmalig.",
  "בשלח ל": "„בשלח“: einmalig.",
  "שלחתי ל": "„שלחתי“: einmalig.",
  "וכל ערי המישור וכל ממלכות סיחון": "Und alle Städte der Ebene und das ganze Königreich Sihons.",
  "וכל כלי משקה המלך שלמה וחברו": "„Und alle Trinkgefäße des Königs Salomo“ und die entsprechende Parallelstelle.",
  "וכל אשר סביבותיו עזרה": "Und alle, die rings um ihn sind, als Hilfe.",
  "וחד פסוק וכל כל וכל וכל כל כל": "Und ein Vers mit den sechs Wörtern „וכל“, „כל“, „וכל“, „וכל“, „כל“, „כל“.",
  "ואם נכלמו מכל אשר עשו צורת הבית ותכונתו ומוצאיו ומובאיו דיחזקאל": "„Und wenn sie sich wegen allem schämen, was sie getan haben: die Gestalt des Hauses, seine Einrichtung, seine Ausgänge und seine Eingänge“ in Ezechiel.",
  "אולי תפל תחינתם": "Vielleicht fällt ihr Flehen vor ihm nieder.",
  "וישבו לערב יהמו ככלב": "Sie kehren am Abend zurück und heulen wie Hunde.",
  "יזכרו וישובו אל ייי כל": "Es werden sich erinnern und zum HERRN umkehren alle …",
  "ולילה לא דומיה לי": "Und bei Nacht finde ich keine Ruhe.",
  "את מלך העי ואת": "Den König von Ai und …",
  "אז עלה הורם מלך גזר לעזר": "Da zog Horam, der König von Geser, hinauf, um zu helfen.",
  "ויצעקו אל ייי בצר להם דיאמרו גאולי ייי קדמא ובתרא": "„Und sie schrien zum HERRN in ihrer Bedrängnis“: das erste und das letzte Vorkommen im Psalm „So sollen die Erlösten des HERRN sagen“.",
  "וממחרת הפסח יצאו בני ישראל": "Und am Tag nach dem Passah zogen die Israeliten aus.",
  "ויפל כל מחנה מצרים": "Und das ganze Lager Ägyptens fiel.",
  "ויולך אתם שמרונה": "Und er führte sie nach Samaria.",
  "וילך אתם על מלך בבל דמל": "„Und er führte sie zum König von Babel“ in den Königsbüchern.",
  "אתי נהג ויולך חשך ולא": "Mich führte und brachte er in Finsternis und nicht …",
  "ויהי באשמורת הבקר": "Und es geschah zur Morgenwache.",
  "אשירה לייי כי גאה גאה": "Ich will dem HERRN singen, denn hoch erhaben ist er.",
  "ותען להם מרי": "Und Mirjam antwortete ihnen.",
  "ובני ישר הלכו ביבשה": "Und die Israeliten gingen auf trockenem Boden.",
  "אשר בעיר אשר לא חמה": "Welches in einer Stadt liegt, die keine Mauer hat.",
  "הנה בניות ברמה": "Siehe, in Najot bei Rama.",
  "נעבד קדמא": "„Wir werden dienen“, das erste Vorkommen.",
  "צללו כעפרת במים אדירם": "Sie versanken wie Blei in gewaltigen Wassern.",
  "מרכבות פרעה וחילו": "Die Wagen des Pharao und sein Heer.",
  "מרכבות עמינדיב": "Die Wagen Amminadibs.",
  "וישפכם על פני וחברו": "„Und er schüttet sie auf die Fläche“ und die entsprechende Parallelstelle.",
  "תשלח את האם": "Du sollst die Mutter freilassen.",
  "תשלח קציריה עד ים": "Sie streckt ihre Zweige bis zum Meer aus.",
  "וא ותשלח פאור": "Und einmal: „Und sie streckte ihre Äste aus“.",
  "עזי וזמרת יה דויושע": "„Meine Stärke und mein Gesang ist Jah“ in dem Abschnitt „Und er rettete“.",
  "הנה אל ישועתי דישעיה": "„Siehe, Gott ist mein Heil“ in Jesaja.",
  "ודהלל": "Und im Hallel.",
  "וא יסע": "Und einmal „Er ließ aufbrechen“.",
  "ויסע משה את בני ישראל": "Und Mose ließ die Israeliten aufbrechen.",
  "ויסע כצאן עמו וינהגם בעזו תימן": "„Er ließ sein Volk wie Schafe aufbrechen“; „und durch seine Macht führte er den Südwind herbei“.",
  "וא יסע קדים בשמים דתהילים": "Und einmal „Er ließ den Ostwind am Himmel aufbrechen“ in den Psalmen.",
  "בנה בניתי בית זבול לך וחברו דדברי הימים": "„Ich habe dir ein Haus zur Wohnung gebaut“ und die entsprechende Parallelstelle in den Chronikbüchern.",
  "ויאמר אם שמע תשמע": "Und er sagte: Wenn du wirklich hören wirst.",
  "ויעמד המלך על דדה": "„Und der König trat auf …“ in den Chronikbüchern.",
  "רעב כי יהיה בארץ דמלכי": "„Wenn Hungersnot im Land ist“ in den Königsbüchern.",
  "ויעד ייי בישר": "Und der HERR ermahnte Israel.",
  "הנה טפחות נתת ימי": "Siehe, nur handbreit hast du meine Tage gemacht.",
  "ולהביא את כל בכורי כל": "Und zu bringen alle Erstgeborenen von allem …",
  "אל ישיא אתכם דדברי הימי": "„Er täusche euch nicht“ in den Chronikbüchern.",
  "ראית כל נקמתם כל מחשבתם": "Du hast all ihre Rache, all ihre Gedanken gesehen.",
  "וללמד בישר חק ומשפט": "Und in Israel Satzung und Recht zu lehren.",
  "הכתנת בנך היא": "Ist es das Gewand deines Sohnes?",
  "התשמר מצותיו": "Ob du seine Gebote halten wirst.",
  "ונחנו מה כי תלונו עלינו": "Und was sind wir, dass ihr gegen uns murrt?",
  "למען אשר יביאו את בני ישראל": "Damit die Israeliten bringen …",
  "או הנסה אלהים לבא": "Oder hat je ein Gott versucht zu kommen?",
  "ואלישע יושב בביתו": "Und Elischa saß in seinem Haus.",
  "ויבאו המצורעים": "Und die Aussätzigen kamen.",
  "הלא כגעת": "Wird er nicht, sobald ihn berührt …",
  "מלטיה הגבענני": "Melatja, der Gibeoniter. [Unklar: Schreibung „הגבענני“ in der Vorlage.]",
  "על כן הוא נתן לכם לחם יומים": "Darum hat er euch Brot für zwei Tage gegeben.",
  "או ימים או חדש או ימים חס": "„Oder zwei Tage oder einen Monat oder Tage“: defektiv geschrieben.",
  "יחיינו מימים חס": "„Er wird uns nach zwei Tagen beleben“: defektiv geschrieben.",
  "מדוע דל ככה בן המלך": "Warum bist du so elend, Königssohn?",
  "ומנחה תעשה עליו בבק בבקר": "Und als Speiseopfer sollst du dazu Morgen für Morgen darbringen.",
  "ועשו את הכבש ואת המנחה": "Und sie sollen das Lamm und das Speiseopfer darbringen.",
  "ומקטירים לייי": "Und sie bringen dem HERRN Rauchopfer dar.",
  "ואדיריהם שלחו": "Und ihre Vornehmen sandten aus.",
  "מה תריבון עמדי ומה תנסון": "Warum streitet ihr mit mir, und warum versucht ihr …",
  "וכל אתנחת וסופי פסוקי דכותהון קמצין": "Und alle entsprechenden Formen bei Atnach und an Versenden haben Qamets.",
  "דבר אל בני ישר וקח מאתם": "Rede zu den Israeliten und nimm von ihnen.",
  "ויאמר לגחזי חגור מתניך": "Und er sagte zu Gehasi: Gürte deine Hüften.",
  "וידו אדם מתחת כנפיהם": "Und Menschenhände waren unter ihren Flügeln.",
  "בא בצור והטמן": "Geh in den Felsen und verbirg dich.",
  "וצא השדה וצודה לי צודה": "Und geh aufs Feld und jage mir Wild.",
  "∅": "[Keine Lesung in der Vorlage.]",
  "וביום עשרים וארבעה": "Und am vierundzwanzigsten Tag.",
  "כי יד על כס יה פלוגת": "„Denn eine Hand ist am Thron Jahs“; [Unklar: פלוגת].",
  "אין זה כי אם רע לב דעזרא": "„Das ist nichts anderes als ein trauriges Herz“ in Esra/Nehemia.",
  "וא ומן בקר": "Und einmal „Und vom Morgen“.",
  "ולא יכל דוד ללכת לפניו": "Und David konnte nicht vor ihn treten.",
  "ויחרד אבימלך": "Und Abimelech erschrak.",
  "ושפטו את העם בכל עת והיה כל הדבר הגדול": "Und sie sollen dem Volk jederzeit Recht sprechen; und jede große Sache …",
  "כל הדבר הקשה יביאון": "Jede schwierige Sache sollen sie bringen.",
  "והזהרת אתהם את החקים": "Und du sollst sie über die Satzungen unterweisen.",
  "ויתנו בגורל ממטה דדברי הימים": "„Und sie gaben durch das Los vom Stamm …“ in den Chronikbüchern.",
  "והזהרת אתהם החקים": "Und du sollst sie über die Satzungen unterweisen.",
  "ותשלח איזבל מ מלאך אל אליהו לאמר כה יעשון": "Und Isebel sandte [Unklar: מ] einen Boten zu Elija und ließ sagen: So mögen sie tun …",
  "וא איעצך": "Und einmal „Ich will dir raten“.",
  "לך איעצך אשר יעשה העם הזה לעמך": "Komm, ich will dir raten, was dieses Volk deinem Volk tun wird.",
  "וחד איעצך נא עיצה ומלטי את נפשך": "Und ein Vorkommen: „Ich will dir doch einen Rat geben; rette dein Leben“.",
  "ואם שור נגח הוא מתמול": "Und wenn ein Rind schon seit gestern stößig ist.",
  "וא וזרחה לכם יראי שמי שמש צדקה": "Und einmal „Und euch, die ihr meinen Namen fürchtet, wird die Sonne der Gerechtigkeit aufgehen“.",
  "ועשית מנורת זהב טהור תיעשה כת": "„Und du sollst einen Leuchter aus reinem Gold machen“; „תיעשה“ ist so geschrieben.",
  "ששת ימים תעשה מלאכה וביום השביעי דויקרא": "„Sechs Tage soll Arbeit getan werden, und am siebten Tag …“ in Levitikus.",
  "כל המנחה אשר תקריבו לייי": "Jedes Speiseopfer, das ihr dem HERRN darbringt.",
  "ואל הארן תתן את העדות": "Und in die Lade sollst du das Zeugnis legen.",
  "ונתת על החשן": "Und du sollst auf das Brustschild legen.",
  "את הארים": "Die Urim.",
  "ונתת על סל אחד": "Und du sollst sie in einen Korb legen.",
  "ונתת על עבדת": "Und du sollst es für den Dienst geben.",
  "אשר נתתה ביד עבדיך": "Die du in die Hand deines Dieners gegeben hast.",
  "והשבותם": "Und du sollst sie zurückführen.",
  "נתת ירושת יראי שמך": "Du hast das Erbe derer gegeben, die deinen Namen fürchten.",
  "אשר נתת את לבך דדניא": "„Dass du dein Herz darauf gerichtet hast“ in Daniel.",
  "כל או חס": "Alle Vorkommen in der Tora sind defektiv geschrieben.",
  "וחד למסך": "Und ein Vorkommen „Zum Schutz“.",
  "למים ויכו מהם אנשי העם": "„למים“: Und sie schlugen von ihnen Männer des Volkes.",
  "למים ויאמר אלהים יהי רקיע": "„למים“: Und Gott sprach: Es werde eine Ausdehnung.",
  "למבול וזכרתי את בריתי אשר": "„למבול“: Und ich werde meines Bundes gedenken, den …",
  "למסך פרש ענן למסך": "„למסך“: Er breitete eine Wolke zum Schutz aus.",
  "למסך ועשית למסך חמשה": "„למסך“: Und du sollst für den Vorhang fünf machen.",
  "למשפחות ואעמיד מתחתיו": "„למשפחות“: Und ich stellte unten auf.",
  "למשפחות ונקרבתם בבקר": "„למשפחות“: Und ihr sollt am Morgen herantreten.",
  "למחות ולא דבר ייי למחות": "„למחות“: Und der HERR hatte nicht gesagt, auszutilgen.",
  "למחות אל תתן לנשים חילך": "„למחות“: Gib deine Kraft nicht Frauen.",
  "למחרת ויזבחו לייי זבחים ויעלו": "„למחרת“: Und sie schlachteten dem HERRN Opfer und brachten Brandopfer dar.",
  "למחרת וימן אלהים תולעת": "„למחרת“: Und Gott bestellte einen Wurm.",
  "לבאים נפשי בתוך לבאים": "„לבאים“: Meine Seele ist mitten unter Löwen.",
  "לבאים למאחרים על היין": "„לבאים“: Denen, die lange beim Wein sitzen.",
  "לזר גרי ביתי ואמהותי": "„לזר“: Die Beisassen meines Hauses und meine Mägde.",
  "לזר בני אם ערבת לרעך תקעת": "„לזר“: Mein Sohn, wenn du für deinen Nächsten gebürgt und die Hand eingeschlagen hast.",
  "לחץ וישם פי כחרב חדה": "„לחץ“: Und er machte meinen Mund wie ein scharfes Schwert.",
  "לחץ דרך קשתו ויציבני": "„לחץ“: Er spannte seinen Bogen und stellte mich hin.",
  "לכלב כי מי אשר יחבר": "„לכלב“: Denn wer mit allen Lebenden verbunden ist …",
  "ועמדיו ק": "„ועמדיו“: Qere.",
  "וא לפאה": "Und ein Vorkommen „Für den Bereich“.",
  "ווי העמדים קדמא": "„Die Haken der Säulen“, das erste Vorkommen.",
  "והימשני את העמדים": "Und lass mich die Säulen betasten.",
  "ארך האולם עשרים אמה ורחב עשתי עשרה אמה": "Die Länge der Vorhalle beträgt zwanzig Ellen und die Breite elf Ellen.",
  "ויעש שרשרת דה": "„Und er machte Ketten“ in den Chronikbüchern.",
  "לנגע אדם כי יהיה בעור": "„לנגע“: Wenn bei einem Menschen auf der Haut …",
  "לנגע כי יפלא ממך דבר": "„לנגע“: Wenn dir eine Sache zu schwierig ist.",
  "לנכרי לא תאכלו כל נבלה": "„לנכרי“: Ihr sollt kein verendetes Tier essen.",
  "לנטרים כרמי שלי": "„לנטרים“: Mein eigener Weinberg.",
  "לנטרים כרם היה לשלמה": "„לנטרים“: Salomo hatte einen Weinberg.",
  "לנביאים ואקים מבניכם לנביאים": "„לנביאים“: Und ich erweckte von euren Söhnen Propheten.",
  "לנביאים נשבר לבי": "„לנביאים“: Mein Herz ist zerbrochen.",
  "ליבשה הפך ים ליבשה": "„ליבשה“: Er verwandelte das Meer in trockenes Land.",
  "ליבשה ויקרא אלהים ליב": "„ליבשה“: Und Gott nannte das trockene Land …",
  "לפאה ותתן להם ממלכות ותחלקם לפאה": "„לפאה“: Und du gabst ihnen Königreiche und teiltest sie ihnen nach Gebieten zu.",
  "לצמיתות והארץ לא תמכר לצמיתות": "„לצמיתות“: Und das Land soll nicht endgültig verkauft werden.",
  "לצמיתות ואם לא יגאל עד": "„לצמיתות“: Und wenn es nicht eingelöst wird bis …",
  "לתורה וישוע ובני ושרביה": "„לתורה“: Und Jeschua und Bani und Scherebja.",
  "וא בחרט": "Und ein Vorkommen „Mit dem Griffel“.",
  "ויאמר הא האיש אל עלי": "Und der Mann sagte zu Eli.",
  "וידבר אליהם מה משפט": "Und er sprach zu ihnen: Wie war die Art …",
  "הובישו חכמים חתו": "Die Weisen sind beschämt, sind erschrocken.",
  "בני איש עד מה כבדי": "Ihr Menschenkinder, wie lange soll meine Ehre …",
  "זכור ייי מה היה לנו": "Gedenke, HERR, was uns geschehen ist.",
  "ויחד ליעקב וירב בלבן": "Und Jakob wurde zornig und stritt mit Laban.",
  "ויאמר חזאל כי מה עבדך": "Und Hasaël sagte: Denn was ist dein Diener …",
  "וכל דארי ארעא דדניאל": "„Und alle Bewohner der Erde“ in Daniel.",
  "ומה חשחן ובני תורין דעזרא": "„Und was benötigt wird, auch junge Stiere“ in Esra.",
  "אדם כי יקריב מכם לייי": "Wenn ein Mensch von euch dem HERRN eine Opfergabe darbringt.",
  "ויקח משה ממחצית בני ישר": "Und Mose nahm von der Hälfte der Israeliten.",
  "ואחרי כן נאם ייי אתן את צדקי": "„Und danach, spricht der HERR, werde ich …“ [Unklar: „את צדקי“ stimmt nicht mit dem zitierten Vers überein.]",
  "ואם בהמה אשר יקריבו ממנה קרבן לייי": "Und wenn es ein Tier ist, von dem man dem HERRN eine Opfergabe darbringt.",
  "ואם כל בהמה טמאה אשר לא יקריב ממנה קרבן לייי": "Und wenn es ein unreines Tier ist, von dem man dem HERRN keine Opfergabe darbringt.",
  "כמנחת הבקר כמנחת הבקר וכנסכו תעשה": "Wie das Speiseopfer am Morgen, wie das Speiseopfer am Morgen und sein Trankopfer sollst du es darbringen.",
  "כאלה תעשו ליום שבעת ימים לחם אשה ריח ניחח לייי": "Solches sollt ihr täglich sieben Tage lang darbringen: Brot als Feueropfer von lieblichem Duft für den HERRN."
});
const VALUE={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
function number(s){const clean=fold(s);if(!/^ת{0,2}[שרק]?(?:[צפעסנמלכ][אבגדהוזחט]?|י[אבגדהוזחט]?|ט[וז]|[אבגדהוזחט])?$/.test(clean)||!clean)return null;const n=[...clean].reduce((sum,c)=>sum+VALUE[c],0);return n<1000?n:null;}
const countWord=n=>n===1?'Einmal':n===2?'Zweimal':n===3?'Dreimal':n+'-mal';
const Q={
 'מל':'voll geschrieben','מלא':'voll geschrieben','ומל':'und voll geschrieben','ומלא':'und voll geschrieben',
 'חס':'defektiv geschrieben','חסר':'defektiv geschrieben','וחס':'und defektiv geschrieben','וחסר':'und defektiv geschrieben',
 'רפ':'ohne Dagesch','רפי':'ohne Dagesch','רפה':'ohne Dagesch','רפיי':'ohne Dagesch','רפיין':'ohne Dagesch',
 'דג':'mit Dagesch','דגש':'mit Dagesch','דגוש':'mit Dagesch',
 'בתו':'in der Tora','בתור':'in der Tora','בתורה':'in der Tora','באוריתא':'in der Tora','באורית':'in der Tora',
 'בספ':'in diesem Buch','בספר':'in diesem Buch','בקריה':'in der Schrift','בקרי':'in der Schrift','בקריאה':'in der Schrift',
 'בליש':'in dieser Ausdrucksform','בלישן':'in dieser Ausdrucksform','בלישנא':'in dieser Ausdrucksform','בלישנ':'in dieser Ausdrucksform','בלי':'in dieser Ausdrucksform',
 'בק':'im Qere','בקרי':'im Qere','בכתיב':'im Ketiv','בכתי':'im Ketiv','בכת':'im Ketiv',
 'כת':'geschrieben','כתי':'geschrieben','כתיב':'geschrieben','כתיבי':'geschrieben','כן':'so',
 'יוד':'Jod','י':'Jod','ו':'Waw',
 'בטעמ':'mit diesem Akzent','בטעם':'mit diesem Akzent','בט':'mit diesem Akzent',
 'קמ':'mit Qamets','קמץ':'mit Qamets','פת':'mit Patach','פתח':'mit Patach','פתחי':'mit Patach','פתחין':'mit Patach',
 'זקף':'Zaqef','בזקף':'bei Zaqef','בתביר':'bei Tevir','במרכא':'bei Mercha',
 'וסימנהון':'und ihre Erkennungszitate:','וסימניהון':'und ihre Erkennungszitate:','וסימנהו':'und ihre Erkennungszitate:','וסימנה':'und die Erkennungszitate:','וסימ':'und die Erkennungszitate:','וסימן':'und die Erkennungszitate:','סימן':'Merkzeichen:',
 'פסוקי':'Verse','פסוקין':'Verse','פסוקים':'Verse','פסו':'Verse','פס':'Verse',
 'רא פסו':'am Versanfang','רא פס':'am Versanfang','רא פסוק':'am Versanfang','ראשי פסוקי':'am Versanfang','רישי פסוקי':'am Versanfang','סו פסו':'am Versende','סופי פסו':'am Versende','סופי פסוקי':'am Versende',
 'ובפסו':'und innerhalb eines Verses','בפסוקא':'innerhalb eines Verses','בפסו':'innerhalb eines Verses',
 'חס דחס':'mit doppelter defektiver Schreibung','מל דמל':'mit doppelter voller Schreibung',
 'בתראי':'die letzten','מציעאה':'das mittlere','קדמאה':'das erste','קדמ':'das erste','בתרא':'das letzte',
 'א חס וא מל':'einmal defektiv und einmal voll geschrieben','א חס ואחד מל':'einmal defektiv und einmal voll geschrieben',
 'ב חס וא מל':'zweimal defektiv und einmal voll geschrieben','ב חס א מל':'zweimal defektiv und einmal voll geschrieben',
 'ב מל וא חס':'zweimal voll und einmal defektiv geschrieben','ג מל וא חס':'dreimal voll und einmal defektiv geschrieben',
 'א חס וא מל':'einmal defektiv und einmal voll geschrieben',
 'א':'ein Vorkommen','וא':'und ein Vorkommen','ב':'zwei Vorkommen','וב':'und zwei Vorkommen','ג':'drei Vorkommen','ד':'vier Vorkommen',
 'חד':'ein Vorkommen','ואחד':'und ein Vorkommen','וחד':'und ein Vorkommen','מנהון':'davon',
 'בתו ובנביאי':'in der Tora und den Propheten','בתרי ליש':'in zwei verschiedenen Ausdrucksformen','בתרין לישני':'in zwei verschiedenen Ausdrucksformen',
 'לישנא':'Ausdrucksform','לישני':'Ausdrucksformen','דכות':'ebenso','דכו':'ebenso','דכותה':'ebenso','דכותהון':'ebenso',
 'לא':'nicht','וכל':'und alle','כל':'alle','מלין':'Wörter','מלין רצופין':'aufeinanderfolgende Wörter','תיבותא':'Wort','פסוקא':'Vers',
 'אלף בית':'das ganze Alphabet','אלפא ביתא':'das ganze Alphabet','אלפ בית':'das ganze Alphabet'
};
Object.assign(Q,{'חס י':'ohne Jod geschrieben','חסר יוד':'ohne Jod geschrieben','חס יוד':'ohne Jod geschrieben','חס ו':'ohne Waw geschrieben','חסר ו':'ohne Waw geschrieben','מל י':'mit Jod geschrieben','מל ו':'mit Waw geschrieben','כת כן':'so geschrieben','כתי כן':'so geschrieben','כתיב כן':'so geschrieben','כתיבי כן':'so geschrieben','לא דג':'ohne Dagesch','ובכתו':'und in den Schriften','שין':'Schin','דין':'dieses Vorkommen','זוג':'Paare','זוגין':'Paare','מתחל':'mit vertauschter Reihenfolge','דמין':'einander entsprechende','אנך':'in der Tora, den Propheten und den Schriften','ובפסוק':'und innerhalb eines Verses','בפסוק':'innerhalb eines Verses','לא לא ולא':'dreimal die Negation: „לא“, „לא“ und „ולא“','ומש אנך':'und das Merkzeichen: Tora, Propheten und Schriften'});
// These manuscript abbreviations have multiple possible expansions; leave them open.
delete Q['בק'];delete Q['בקרי'];delete Q['ומש אנך'];
const qKeys=Object.keys(Q).sort((a,b)=>b.split(' ').length-a.split(' ').length||b.length-a.length);
function qualifiers(s){const parts=fold(s).split(' ').filter(Boolean),out=[],uncertain=[];while(parts.length){let key=qKeys.find(k=>k.split(' ').every((x,i)=>parts[i]===x));if(key){out.push(Q[key]);parts.splice(0,key.split(' ').length);}else{const x=parts.shift();out.push('[Unklar: '+x+']');uncertain.push(x);}}return {de:out.join('; ').replace(/; (?=und )/g,' '),uncertain};}
function dictionaryResult(de){const uncertain=[...de.matchAll(/\[Unklar: ([^\]]+)\]/g)].map(m=>m[1]);return {de,status:uncertain.length?'partial':'draft',uncertain,method:'manual-working-translation'};}
function formula(text,label){
 const raw=String(text||'').trim(),s=fold(raw),l=fold(label);if(DICT[s])return dictionaryResult(DICT[s]);
 let source=s,lemma='';if(l&&source.startsWith(l+' ')){lemma=l;source=source.slice(l.length).trim();}
 const rawTokens=raw.split(/\s+/);if(lemma)rawTokens.splice(0,lemma.split(' ').length);const tokens=source.split(' ');let first=tokens.shift(),n;
 const canNumber=(/[\u05c4\u05c5\u0307׳״]/.test(rawTokens[0]||'')||(first.length===1&&/[\u0591-\u05c7]/.test(rawTokens[0]||'')))||(tokens.length===0&&first.length===1)||(/וסימנ/.test(source)&&first.length===1);
 if(first==='ל'||first==='לית')n=1;else if(canNumber&&!['מל','מלא','חס','חסר','ק'].includes(first))n=number(first);
 if(n!==null&&n!==undefined){const rest=qualifiers(tokens.join(' ')),prefix=(first==='ל'||first==='לית')?'Einmalig':countWord(n);return {de:(lemma?'„'+lemma+'“: ':'')+prefix+(rest.de?'; '+rest.de:'.'),status:rest.uncertain.length?'partial':'draft',uncertain:rest.uncertain,method:'formula'};}
 // A marked numeral following a quoted lemma starts an ordinary masoretic heading.
 const at=rawTokens.findIndex((tok,i)=>i>0&&/[\u05c4\u05c5\u0307׳״]/.test(tok)&&(fold(tok)==='ל'||number(tok)!==null));
 if(at>0){const prefix=fold(rawTokens.slice(0,at).join(' ')),tail=formula(rawTokens.slice(at).join(' '),'');if(tail){if(prefix!==l&&/(?:^|\s)(?:ואינון|אינון|אית|ואית|כל|לית|דכל|מן|מנהון|לישנא|לישני|אמרין|דכותהון)(?:\s|$)/.test(prefix))return {...tail,de:'[Unklar: '+prefix+']; '+tail.de,status:'partial',uncertain:[prefix,...tail.uncertain]};return {...tail,de:'„'+prefix+'“: '+tail.de};}}
 return null;
}
let prepared;
function corpus(){if(prepared)return prepared;const manifest=require(path.join(ROOT,'bundled/manifest.json')).items,verseByRef=new Map(),firstIndex=new Map();
 const aliases={'Gen':'Genesis','Ge':'Genesis','Ex':'Exodus','Exod':'Exodus','Lev':'Leviticus','Lv':'Leviticus','Num':'Numbers','Nu':'Numbers','Deut':'Deuteronomy','Dt':'Deuteronomy','Dtn':'Deuteronomy','Josh':'Joshua','Jos':'Joshua','Judg':'Judges','Jdg':'Judges','Ruth':'Ruth','Rt':'Ruth','1 Sam':'I Samuel','2 Sam':'II Samuel','1Sam':'I Samuel','2Sam':'II Samuel','1 Kgs':'I Kings','2 Kgs':'II Kings','1Kgs':'I Kings','2Kgs':'II Kings','1 Kings':'I Kings','2 Kings':'II Kings','1 Chr':'I Chronicles','2 Chr':'II Chronicles','1Chr':'I Chronicles','2Chr':'II Chronicles','Ezra':'Ezra','Neh':'Nehemiah','Esth':'Esther','Est':'Esther','Job':'Job','Ps':'Psalms','Prov':'Proverbs','Pr':'Proverbs','Eccl':'Ecclesiastes','Qoh':'Ecclesiastes','Song':'Song of Songs','Cant':'Song of Songs','Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations','Ezek':'Ezekiel','Ez':'Ezekiel','Dan':'Daniel','Hos':'Hosea','Joel':'Joel','Amos':'Amos','Am':'Amos','Ob':'Obadiah','Obad':'Obadiah','Am':'Amos','Jon':'Jonah','Jonah':'Jonah','Jon':'Jonah','Mic':'Micah','Mi':'Micah','Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai','Zech':'Zechariah','Mal':'Malachi'};
 for(const item of manifest.filter(e=>e.kind==='he'&&/^Westminster/.test(e.versionTitle))){const book=item.title,ilFile=path.join(ROOT,'interlin',book.replace(/ /g,'_')+'.js');if(!fs.existsSync(ilFile))continue;const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(ilFile,'utf8'),sandbox);const allIL=sandbox.window.INTERLIN_PARTS?.[book];const il=allIL?.Zunz;if(!il)continue;const data=require(path.join(ROOT,'bundled',item.rel));for(let c=0;c<data.text.length;c++)for(let v=0;v<(data.text[c]?.length||0);v++){const html=data.text[c][v];if(typeof html!=='string')continue;const hw=[...html.matchAll(/<span class="w"[^>]*>([\s\S]*?)<\/span>/g)].map(m=>normalizeWord(m[1].replace(/<[^>]*>/g,''))),segs=il[(c+1)+':'+(v+1)];if(!hw.length||!segs)continue;const verse={book,chapter:c+1,verse:v+1,words:hw,segs,editions:Object.fromEntries(['Philippson','Zunz','Goldschmidt','Hirsch','Mendelssohn'].map(n=>[n,allIL[n]?.[(c+1)+':'+(v+1)]]).filter(x=>x[1]))};verseByRef.set(book+' '+(c+1)+':'+(v+1),verse);hw.forEach((word,start)=>{const a=firstIndex.get(word)||[];a.push({verse,start});firstIndex.set(word,a);});}}
 function ref(label){const m=/^(.+?)\.?\s+(\d+):(\d+)(?:[-–].*)?$/.exec(label);return m?verseByRef.get((aliases[m[1]]||m[1])+' '+m[2]+':'+m[3]):null;}
 return prepared={verseByRef,firstIndex,ref};}
function extract(verse,start,len,edition='Zunz'){const indices=new Set(Array.from({length:len},(_,i)=>start+i+1)),chosen=[],covered=new Set();for(const seg of verse.editions[edition]||[]){const ix=Array.from(seg[0]||[]);if(!ix.some(i=>indices.has(i)))continue;if(ix.some(i=>!indices.has(i)))return null;ix.forEach(i=>covered.add(i));if(seg[1])chosen.push(String(seg[1]));}if([...indices].some(i=>!covered.has(i)))return null;const de=chosen.join(' ').replace(/\s+/g,' ').trim();return de||null;}
function quote(text,refs=[]){const needle=words(text);if(!needle.length)return null;const C=corpus(),restricted=refs.map(C.ref).filter(Boolean);let candidates=[];if(restricted.length){for(const verse of restricted)for(let start=0;start<=verse.words.length-needle.length;start++)if(needle.every((w,j)=>verse.words[start+j]===w))candidates.push({verse,start});}else candidates=(C.firstIndex.get(needle[0])||[]).filter(({verse,start})=>needle.every((w,j)=>verse.words[start+j]===w));
 let candidate=null;for(const edition of ['Philippson','Zunz','Goldschmidt','Hirsch','Mendelssohn']){
 const matches=candidates.map(({verse,start})=>({de:extract(verse,start,needle.length,edition),ref:verse.book+' '+verse.chapter+':'+verse.verse})).filter(x=>x.de);
 if(!matches.length)continue;const unique=[...new Set(matches.map(m=>m.de.replace(/[.,;:!?]+$/,'').trim()))];if(unique.length!==1)continue;
 const result={de:matches[0].de,status:'draft',uncertain:[],method:'aligned-quotation',edition,ref:matches[0].ref};
 if(matches.length===candidates.length)return result;
 if(!candidate)candidate={...result,de:result.de+' [Zuordnung nicht für alle möglichen Kontexte gesichert.]',status:'partial',uncertain:[text],method:'aligned-quotation-candidate'};
 }return candidate;}

function decoratedQuote(reading,entry){
 const source=String(reading.text||'').trim(),tokens=source.split(/\s+/),prefix=[],suffix=[];let remaining=tokens.slice();
 const p=fold(remaining[0]);if(p==='וחברו'){prefix.push('Und die entsprechende Parallelstelle:');remaining.shift();}else if(['וא','וחד','ואחד'].includes(p)&&/[\u05c4\u05c5׳״]/.test(remaining[0])){prefix.push('Und ein Vorkommen:');remaining.shift();}
 const trailing=[['דדברי הימים','in den Chronikbüchern'],['דדברי הימי','in den Chronikbüchern'],['דדה','in den Chronikbüchern'],['דשמואל','in Samuel'],['דיחזקאל','in Ezechiel'],['דיחזק','in Ezechiel'],['דישעיה','in Jesaja'],['דישעי','in Jesaja'],['דדניא','in Daniel'],['דתהילים','in den Psalmen'],['דתהלים','in den Psalmen'],['דתהלות','in den Psalmen'],['דעזרא','in Esra/Nehemia'],['דמלכי','in den Königsbüchern'],['דמל','in den Königsbüchern'],['דויקרא','in Levitikus'],['קדמא ובתרא','erstes und letztes Vorkommen'],['קדמא','erstes Vorkommen'],['בתרא','letztes Vorkommen'],['תנינא דפסוק','zweites Vorkommen im Vers'],['מל','voll geschrieben'],['חס','defektiv geschrieben']];
 for(const [he,de]of trailing){const parts=he.split(' ');if(parts.every((w,i)=>fold(remaining[remaining.length-parts.length+i])===w)){remaining.splice(-parts.length);suffix.push(de);break;}}
 if(prefix.length||suffix.length){const q=quote(remaining.join(' '),reading.references);if(q)return {...q,de:(prefix.length?prefix.join(' ')+' ':'')+q.de+(suffix.length?' ('+suffix.join('; ')+').':'')};}
 const label=fold(entry.label),labelParts=label.split(' ').filter(Boolean);if(labelParts.length&&labelParts.every((w,i)=>fold(tokens[i])===w)&&tokens.length>labelParts.length+1){const q=quote(tokens.slice(labelParts.length).join(' '),reading.references);if(q)return {...q,de:'„'+label+'“: '+q.de,method:'lemma-plus-quotation'};}
 return null;
}
function rawTranslate(reading,entry){const s=String(reading.text||'').trim();if(!s)return {de:'[Keine transkribierte Lesung.]',status:'partial',uncertain:[],method:'empty-source'};
 const known=DICT[fold(s)];if(known)return dictionaryResult(known);
 // Explicitly marked numeral-only tokens are not biblical words (e.g. טׄלׄ = 39, not "Tau").
 const token=s.split(/\s+/)[0]||'',letters=(token.match(/[א-ת]/g)||[]).length,dots=(token.match(/[\u05c4\u05c5\u0307]/g)||[]).length;
 if(['טל','לי'].includes(fold(token))&&(dots>=letters||/[׳״]/.test(token))){const rest=qualifiers(s.split(/\s+/).slice(1).join(' '));return {de:'[Unklare Zahl-/Wortlesung: '+token+']'+(rest.de?'; '+rest.de:''),status:'partial',uncertain:[token,...rest.uncertain],method:'unresolved-numeral'};}
 if((number(token)!==null||fold(token)==='ל')&&(dots>=letters||/[׳״]/.test(token)||(letters===1&&/[\u0591-\u05c7]/.test(token)))){const f=formula(s,entry.label);if(f)return f;}
 // A cited biblical quotation takes precedence over a resemblance to numeral formulas.
 const q=quote(s,reading.references);if(q)return q;
 const decorated=decoratedQuote(reading,entry);if(decorated)return decorated;
 const f=formula(s,entry.label);if(f)return f;
 return {de:'[Unklar: '+s+']',status:'partial',uncertain:[s],method:'unresolved'};
}
function translate(reading,entry){
 const result=rawTranslate(reading,entry),source=String(reading.text||'');
 if(/[#�\[\]…∅]|\.{2,}/.test(source))return {...result,de:result.de+' [Lücke oder unsichere Zeichen in der Vorlage: „'+source+'“]',status:'partial',uncertain:[...new Set([...(result.uncertain||[]),source])]};
 return result;
}
function build(rows){if(!Array.isArray(rows))throw Error('Expected input rows');return rows.map(e=>({ordinal:e.ordinal,uuid:e.uuid,sourceHash:e.sourceHash,readings:e.readings.map(r=>({uuid:r.uuid,...translate(r,e)}))}));}
if(require.main===module){const input=process.argv[2]||'/tmp/safran-masora-translation-input-2.jsonl',output=process.argv[3]||path.join(ROOT,'masora-translations/part-2.json'),out=build(fs.readFileSync(input,'utf8').trim().split('\n').map(JSON.parse));fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(out.length,out.reduce((a,e)=>{for(const r of e.readings)a[r.method]=(a[r.method]||0)+1;return a;},{}));}
module.exports={build,translate,formula,quote,fold,number,DICT};
