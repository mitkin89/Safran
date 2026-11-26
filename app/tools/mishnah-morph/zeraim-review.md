# Seder Seraim: Kandidatenbestand und gezielter Ma’agarim-Abgleich

Stand: 26. November 2026. Nachfolgender Ausgangsstand vor dem Wörterbuchdurchgang; dessen aktualisierte Zahlen und Entscheidungen stehen in `zeraim-dictionary-review.md`. **Erster korpusweiter Kandidatendurchgang, keine abgeschlossene sprachliche Prüfung.**

Alle elf Traktate, 75 Kapitel, 655 Texteinheiten und 23.447 laufende Wortpositionen sind an die unveränderte vokalisierte Be’eri-Ausgabe nach Kaufmann A50 gebunden. Redaktionelle Zählungen und Bibelverweise zählen nicht als laufende Wörter. Bikkurim enthält in dieser Quelle vier Kapitel.

| Traktat | Wörter | ein Kandidat | Alternativen | ohne Bestimmung |
|---|---:|---:|---:|---:|
| Berakhot | 2159 | 1643 | 516 | 0 |
| Peah | 2415 | 1267 | 680 | 468 |
| Demai | 1863 | 981 | 569 | 313 |
| Kilayim | 2902 | 1465 | 841 | 596 |
| Sheviit | 3154 | 1489 | 954 | 711 |
| Terumot | 3566 | 1694 | 1184 | 688 |
| Maasrot | 1530 | 692 | 445 | 393 |
| Maaser Sheni | 2244 | 1088 | 682 | 474 |
| Challah | 1302 | 633 | 383 | 286 |
| Orlah | 1002 | 471 | 326 | 205 |
| Bikkurim | 1310 | 629 | 449 | 232 |

**Gesamt:** 12.052 Positionen mit einem Kandidaten, 7.029 mit Alternativen und 4.366 ohne zugeordnete Bestimmung. Diese Kategorien messen Verfügbarkeit, nicht Genauigkeit. Auch ein einzelner Kandidat kann falsch sein. Die zehn offenen Berakhot-Vergleichspositionen bleiben zusätzlich in `full-review-226.json` dokumentiert; sie werden nicht durch die Kategorie „candidate“ erledigt.

## Daten und Verfahren

- `mishnah-morph-data.js` und seine 149 Berakhot-Korrekturen bleiben unverändert. Der separate Seraim-Bestand enthält eine identische Kopie dieses Prüfstands; er überträgt dessen Kontextkorrekturen nicht nach Schreibgleichheit auf andere Traktate.
- `build.cjs` stellt nur den bestehenden Formanalysator als Modul bereit. `node app/tools/mishnah-morph/build-zeraim.cjs` erzeugt den zusätzlichen Bestand reproduzierbar aus den gebündelten Texten.
- `zeraim-lexicon.json` ergänzt eigene vokalisierte Flexionskandidaten, gestützt auf die bereits dokumentierten Grammatiken und ausgewählte rabbinische Wörterbucheinträge. Das ist keine durchgehend geprüfte Annotation aller Belegstellen.
- Exakt gleich vokalisierte OSHB-Wörter liefern zusätzliche biblische Kandidaten mit vollständiger Segmentierung. Konsekutivformen werden ausgeschlossen. Diese Hinweise sind in der Karte ausdrücklich als biblische Formhinweise gekennzeichnet und bestätigen weder die RH-Bedeutung noch den Satzkontext. Quelle: Open Scriptures Hebrew Bible, CC BY 4.0, https://github.com/openscriptures/morphhb.
- Kurzbedeutungen für landwirtschaftliche Fachwörter und häufige Funktionswörter wurden auf Deutsch und Englisch ergänzt. Wo kein redaktioneller Eintrag besteht, bleibt der vorhandene, ausdrücklich bezeichnete biblische Wörterbuchhinweis bzw. die Meldung einer fehlenden Kurzbedeutung erhalten.
- `zeraim-uncertain.json` gruppiert alle fehlenden und konkurrierenden Bestimmungen nach Form und Analysebestand, zählt ihre Vorkommen und enthält genaue Traktat-/Vers-/Wortpositionen. Die Liste bleibt offen, auch wenn ein Ma’agarim-Beleg nur das Lemma, nicht alle Merkmale bestätigt.

## Wörterbuchkontrollen

Aus Safrans Jastrow (Paket `d895bc1c727b`) wurden unter anderem die Artikel 29047 כלאים (m., Dual), 31468 שורה (f.), 20262 מעה (f.), 31817 תבואה (f.), 31966 סאה (f.), 21852 מעשר (m.), 27188 חלה (f.), 9196 חבית (f.), 22002 גפן (gemeines Genus), 11143 חרדל (m.), 20284 עונה I (f.), 2717 שכחה (f.), 29399 דמאי (m.), 7907 רביעה (f., u. a. Herbstregen), 5345 מותר (m., Rest/Überschuss) und 18969 מקצת (f.; auch adverbial) kontrolliert. Artikelnummern sind lokale nullbasierte Datensatzindizes, keine gedruckten Seiten. Eine Genusangabe allein entscheidet keine mehrdeutige Wortart.

## Ma’agarim

24 dokumentierte Prüfgruppen über die zehn neuen Traktate stehen mit Referenz, beobachtetem Lemma/Stamm, Entscheidung und URL in `zeraim-maagarim-review.json`. Berakhot behält seinen vorherigen gesonderten Abgleich. Dieser Durchgang ist gezielt und stichprobenartig; die 4.366 unbekannten Positionen und sämtliche Alternativen sind damit **nicht vollständig geprüft**.

Wichtige Ergebnisse: נותנין/הלוקח/חורשין/תורמין/הנוטע sind durch entsprechende Qal-Partizipzuordnungen gestützt; מביאין wird Hifil zu בוא zugeordnet. Bei שביעית kam die substantivische Sabbatjahr-Lesart hinzu. Bei פטור und אסור bleiben passive Partizipien neben lexikalischen Adjektivkandidaten sichtbar. ביכורים erhielt den singulären Wörterbuchkopf ביכור.

Bei Challa 1:3 liefert Ma’agarim für unvokalisiertes מותר eine Hofal-Zuordnung zu יתר; die Be’eri-Ausgabe hat ausdrücklich מוֹתַר הָעֹמֶר. Mit Jastrow 5345 wird daher der vokalisierte Konstruktus des Substantivs מותר „Rest“ angesetzt. Das darf nicht mit מֻתָּר „erlaubt“ zu נתר vermengt werden. Unterschiedliche Vokalisierung und Analysetradition werden nicht still angeglichen.

Ma’agarim: Historisches Wörterbuchprojekt der Akademie für die hebräische Sprache; Textzeuge Kaufmann A50. Es wurden gezielte Lemma-/Stamminformationen ausgewertet, kein Ma’agarim-Korpus in Safran importiert. Nicht angezeigte Genus-, Numerus- oder Suffixmerkmale gelten nicht als bestätigt.

## Noch offen und Validierung

Der nächste fachliche Durchgang arbeitet die gruppierte Unsicherheitsliste und die zehn verbliebenen Berakhot-Vergleichsfragen ab. Ein späterer Accordance-Abgleich wurde vom Nutzer ausdrücklich zurückgestellt. Es gibt daher keinen neuen Seraim-weiten Accordance-Prüfstatus.

23 Node-Tests prüfen alle Textfingerprints und Wortpositionen, unveränderte Berakhot-Korrekturen, Editionsgrenzen, Regelverweise, Bedeutungen und die zentralen Ma’agarim-Unterscheidungen. Der Electron-Durchlauf prüft die tatsächliche Darstellung aller 23.447 Wörter in allen 75 Kapiteln, die Wortkarten und die Ablehnung eines veränderten Quellfingerprints. Der bisherige vollständige Berakhot-Kartentest besteht ebenfalls.
