# Erste Wortkarten aus Krauss

Der erste Satz umfasst acht Lemmata an 16 Wortpositionen der vokalisierten
Be’eri-Ausgabe nach Kaufmann in Seder Seraim. Die Entscheidungen stehen in
`krauss-cards-1.json`; jede Position ist durch Text-Hash, Referenz, Wortnummer
und genaue vokalisierte Wortform an die Quelle gebunden.

| Lemma | Kurzbedeutung im Kontext | Belegstellen | Krauss-Artikelindex |
| --- | --- | --- | --- |
| לסטים | Räuber; Banditen | Peah 2:7 (zweimal), 2:8 | 3636 |
| איסר | As; römische Kupfermünze | Peah 8:1, Plural איסרות | 565 |
| פונדיון | Pondion, Münze | Peah 8:7; Sheviit 8:4 | 4732 |
| אכסניא | einquartierte Truppen | Demai 3:1 | 687 |
| קרון | Wagen | Kilayim 8:3; 8:4 (zweimal) | 5947 |
| אנדרוגינוס | historische rabbinische Rechtskategorie | Bikkurim 1:5; 4:1; 4:5 | 874 |
| אכסדרא | überdachter Gang; Halle | Maasrot 3:6 | 668 |
| אכסרא | in Bausch und Bogen; ohne Einzelbewertung | Demai 2:5; Maaser Sheni 4:2 | 693 |

Die Indizes sind nullbasierte Artikelpositionen im gebündelten Wörterbuch
`d701423861c6` (Krauss, *Griechische und lateinische Lehnwörter*, Teil II),
keine Seitenzahlen. Die Wortkarten zeigen deutsche und englische
Kurzbedeutungen, die kontextbezogene grammatische Analyse, den Wörterbuchzugang
und eine als „Herkunftsangabe bei Krauss“ gekennzeichnete griechische oder
lateinische Form. Diese historischen Herkunftsvorschläge sind damit nicht als
heutiger etymologischer Konsens ausgewiesen.

Die Homonyme werden getrennt: אכסניא bezeichnet hier Truppen, nicht eine
Herberge; das Adverb אכסרא wird nicht mit dem Gebäudenamen אכסדרא gleichgesetzt.
Krauss’ feminines Genus für קרון bleibt in der Analyse erhalten. Der Plural
איסרות wird trotz seiner Endung als maskulin bestimmt. Die unvokalisierte
editorische Alternative באכסרה in Demai 2:5 erhält keine übertragene Analyse.

15 zuvor unbestimmte Positionen erhalten einen kontextbezogenen Kandidaten;
eine weitere Position erhält präzisierte lexikalische Evidenz. Von insgesamt
23.447 Positionen in Seraim haben nun 12.411 einen Analysekandidaten, 7.049
mehrere Alternativen und 3.987 weiterhin keine Bestimmung. Diese Zahlen messen
Abdeckung, nicht Genauigkeit. Die Karten werden nicht automatisch auf andere
Textstellen, andere Editionen oder andere Seder übertragen.

Validierung: 30 Node-Tests bestanden. Der Electron-Test prüft alle 23.447
Wortpositionen in 75 Kapiteln und öffnet für jedes der acht neuen Lemmata eine
Karte mit Kurzbedeutung, Krauss-Herkunftsangabe und Wörterbuchnachweis.
