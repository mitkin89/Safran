# S. R. Hirsch: vollständige Tora – Prüfstand

Aktualisierung vom 17. November 2026: Auf ausdrücklichen Nutzerauftrag mit dem aktuellen `main` und den vollständigen Arbeiten Wolf/Samuel, Breuer/Richter/Esra und Hirsch/Tora zusammengeführt. Die folgenden Branch- und Veröffentlichungsangaben dokumentieren den früheren Arbeitsstand. Die gemeinsamen Interlinear- und Wortkartendaten wurden aus allen Zuordnungen neu gebaut; Wolf verwendet nun Quellenfarbe 15, während Aussprache 14 und Buber/Rosenzweig 13 behalten.

Abgeschlossen am 17. November 2026: Genesis 1:1 bis Deuteronomy 34:12. Alle 5846 Verse wurden einzeln am tatsächlichen nummerierten Westminster-Text (OSHB) gelesen und manuell zugeordnet. Die fünf deutschen Bücher stammen unmittelbar aus Sefaria. Die anschließend freigegebenen 123 eindeutigen Berichtigungen in 122 Versen sind ausgeführt; Druckfälle bleiben unverändert.

## Arbeitsumgebung

Eigener Checkout `work/safran-hirsch-torah`, Branch `codex/hirsch-torah`, Ausgangspunkt `origin/main`/`413ad927a48d778829e6aa04166eaa351ee0748b`. Die nach ausdrücklicher Freigabe parallel geprüften Abschnitte sind zusammengeführt. Eingabehilfen übernahmen ausschließlich vorher ausdrücklich festgelegte deutsche Wortbereiche und hebräische Indizes; keine ungeprüften maschinellen Vorfassungen.

Die separat veröffentlichten Arbeiten Wolf/Samuel (`codex/wolf-samuel`) und Breuer/Richter/Esra (`codex/breuer-ezra`) sind auf diesem Main-Ausgangspunkt noch nicht integriert. Ihre Branches wurden nicht verändert. Bei späterer Zusammenführung sind gemeinsame Dateien zu vereinigen und `interlin.js`/`interlin-ren.js` aus sämtlichen Zuordnungen neu zu bauen.

## Quelle und Wortlaut

Sefaria-Version: „Der Pentateuch, übersetzt und erläutert von Samson Raphael Hirsch. Frankfurt am Main, 1867-1878 [de]“. Alle fünf Bücher am 17. November 2026 über die öffentliche Text-API mit ausdrücklich ausgewählter Version geladen. Herkunft laut Metadaten: talmud.de; digitalisiert von Marina Struse. Die API-Lizenzangabe lautet für Genesis/Exodus „Public Domain“, für Leviticus/Numbers/Deuteronomy „unknown“ und wurde unverändert übernommen.

`TORAH-QUELLEN.json` dokumentiert Versionstitel, Herkunft, Datum und SHA1-Prüfsummen der Rohantworten und gebündelten Dateien. Der Erstimport aller 5846 Textfelder wurde exakt mit den gespeicherten Sefaria-Antworten verglichen. Nach der Benutzerfreigabe wurden ausschließlich die in KORREKTUREN-TORAH.json aufgeführten 123 Berichtigungen vorgenommen. Die übrigen 5724 Versfelder sind unverändert. JSONs sind kompakt gespeichert (`ensure_ascii=False, separators=(',',':')`); sämtliche fünf Manifest-SHA1-Hashes stimmen. Keine Namensnormalisierung, Löschung doppelter Texte, Ergänzung fehlender Textblöcke oder Verschiebung zwischen Versfeldern. importedBundledSHA1 hält die unveränderten Importprüfsummen fest, bundledSHA1 die aktuellen berichtigten Dateien; die Rohantwort-Prüfsummen bleiben erhalten.

## Vollständige Abdeckung

| Buch | Quellverse | Einzeln geprüft und zugeordnet | Ungeprüft |
|---|---:|---:|---:|
| Genesis 1–50 |1533|1533|0|
| Exodus 1–40 |1210|1210|0|
| Leviticus 1–27 |859|859|0|
| Numbers 1–36 |1288|1288|0|
| Deuteronomy 1–34 |956|956|0|
| Gesamt |5846|5846|0|

Alle erwarteten Versschlüssel sind in Reihenfolge vorhanden, ohne Lücken oder Duplikate. Jeder deutsche Vers wird aus seinen Segmenten wortlauttreu wiederhergestellt. Alle Indizes liegen innerhalb der jeweiligen Westminster-Wortzahl. Die Kapitelzählung folgt dem tatsächlichen Westminster-/Sefaria-Quelltext.

## Ketiv/Qere, Zusätze und Quellenlücken

Alle 67 separat gezählten Ketiv-/Qere-Gruppen sind geprüft: Genesis 16, Exodus 12, Leviticus 5, Numbers 9, Deuteronomy 25. Jede berührte Gruppe besitzt sämtliche gemeinsamen Indizes, einschließlich der dreiteiligen Gruppen Genesis 30:11, Exodus 4:2 und Deuteronomy 33:2.

Eine Gruppe besitzt im aktuellen deutschen Versfeld überhaupt kein Gegenstück: Genesis 14:2(16/17). Der zugehörige Namensblock steht in Sefaria bereits in 14:1 und ist dort ohne hebräischen Bezug mit `-` markiert. In 14:2 wurden keine Ersatzwörter oder falschen Gegenstücke erfunden. `test30.js` prüft genau diese Ausnahme ausdrücklich; die übrigen 66 Gruppen müssen tatsächlich referenziert sein.

Klammerwörter sind einzeln geprüft. „Adam (Stellvertreter)“ in Genesis 1:26 bezieht sich beispielsweise auf אדם; Zusätze ohne Gegenstück stehen mit `-`. Quellenauslassungen und fremde/doppelte Blöcke sind in den Prüflisten benannt. Schwierige poetische Stellen in Genesis 49 und Deuteronomy 33 erhielten eine zusätzliche unabhängige Gegenprüfung; dabei wurden zwei Zuordnungen präzisiert, ohne den deutschen Text zu ändern.

## Bestandene Gesamtprüfungen

Auf dem vollständig zusammengeführten Stand:

- `python3 tools/interlinear/build.py`: bestanden; Hirsch 8373 Verse insgesamt (5846 Tora + 2527 bestehende Psalmen).
- `python3 -I tools/interlinear/renderings.py`: bestanden; Hirsch 4252 Lemmata.
- `node test.js`: bestanden.
- `node test30.js`: bestanden; lückenlose Prüfung aller fünf vollständigen Bücher auf Quellwortlaut und Indexgrenzen, alle 67 Ketiv-/Qere-Gruppen, Quellumfänge und Manifest-SHA1. Keine Teilstands-Sonderbehandlung und keine pauschal übersprungenen Verse; Ausgabe pro Buch ausdrücklich 0 ungeprüfte Verse.

Die bestehenden Zuordnungen sämtlicher anderer Übersetzer und der Hirsch-Psalmen bleiben erhalten. Goldschmidt-Genesis und Goldschmidt-Exodus wurden nicht bearbeitet.

## Prüflisten und Veröffentlichung

`PRUEFLISTE-TORAH.md` ist der Einstieg zu sämtlichen Quellbefunden. Die Listen unterscheiden mögliche Übertragungsfehler, echte Auslassungen und vorhandene Übersetzerdeutungen. Die freigegebenen eindeutigen Berichtigungen sind in KORREKTUREN-TORAH.md einzeln als Vorher/Nachher mit hebräischer Begründung dokumentiert. Alle Druckfälle bleiben offen. Die vier vollständigen Gesamtprüfungen sind nach den Berichtigungen erneut bestanden.

Arbeit lokal auf dem eigenen Branch gespeichert. Kein Push und keine Zusammenführung nach main für diesen Hirsch-Auftrag; eine ausdrückliche Push-Freigabe liegt dafür noch nicht vor.
