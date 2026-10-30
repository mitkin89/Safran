# Quellen und Lizenzen

[English](SOURCES.md) · **Deutsch**

## Sefaria-Quelle und Lizenzen

Alle Texte, der Katalog und die Verknüpfungsdaten stammen aus dem öffentlichen **Sefaria-Export** ([Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export), Dateien in Google Cloud Storage). Sefaria selbst ist ein Open-Source-Projekt: <https://github.com/Sefaria/Sefaria-Project> · <https://www.sefaria.org>.

Die Texte fallen **nicht** unter die Lizenz dieses Projekts. Jede Textversion hat ihre eigene Lizenz (meist Creative Commons, manche gemeinfrei, manche eingeschränkt); sie steht in den Versionsinformationen bei Sefaria und in den exportierten Dateien. Wer Texte weiterverwendet oder weitergibt, beachte bitte diese Lizenzen und nenne Sefaria und die Originalquellen. Selbst importierte Texte bleiben auf deinem Rechner.

Die Bibel-Querverweise in `xref.json` (nur Tanach, unter den Sefaria-Verknüpfungen angezeigt) stammen von [OpenBible.info](https://www.openbible.info/labs/cross-references/) (überwiegend Treasury of Scripture Knowledge), Lizenz CC BY 4.0. Konverter: `tools/xref/`.

## Hebräischer Tanach mit Morphologie (OSHB)

Alle 39 Bücher liegen als zusätzliche hebräische Version „Westminster Leningrad Codex (OSHB, mit Morphologie)" unter `bundled/own/…/he/`. Jedes Wort trägt Lemma (Strong-Nummer) und Morphologiecode; ein Klick im Leser zeigt Stamm, Zeit/Form, Person, Genus und Numerus und schlägt das Lemma im Wörterbuch nach.

Quelle und Lizenz: Original work of the Open Scriptures Hebrew Bible available at <https://github.com/openscriptures/morphhb> – Text (WLC) gemeinfrei, Lemma und Morphologie CC BY 4.0. Lemma-Tabelle aus <https://github.com/openscriptures/HebrewLexicon> (`oshb-lemmas.js`). Konverter: `tools/oshb/`.

## Aleppo-Kodex, Targumim und Parallelstellen (ETCBC / CACCHT)

- **Aleppo-Kodex** – alle 39 Bücher als hebräische Version „Aleppo-Kodex (מקרא על פי המסורה, ETCBC-CACCHT)". Text: „מקרא על פי המסורה", he.wikisource.org, Datensatz von Martijn Naaijer ([MartijnNaaijer/aleppo](https://github.com/MartijnNaaijer/aleppo)), Lizenz **CC BY-SA 4.0** (<https://creativecommons.org/licenses/by-sa/4.0/>). Änderungen: Umwandlung in Kapitel/Verse, im Lesetext steht das Qere statt des Ketiv. Dieser Text bleibt unter CC BY-SA. Konverter: `tools/aleppo/`.
- **Targum Pseudo-Jonathan und Targum Neofiti 1** (Genesis–Deuteronomium) mit Wortmorphologie (`targum-lex.js`) – [ETCBC Targum Corpus](https://github.com/ETCBC/targum), MIT-Lizenz, Version 0.0.1-alpha. Konverter: `tools/targum/`.
- **Qumran-Rollen** – Bibelhandschriften vom Toten Meer als hebräische Version „Qumran-Rollen (ETCBC DSS)" für 36 Bücher; je Vers alle Rollen mit Sigle. Quelle: [ETCBC/dss](https://github.com/ETCBC/dss) (CACCHT Dead Sea Scrolls dataset), Daten von Martin G. Abegg Jr., James E. Bowley und Edward M. Cook, Konversion Jarod Jacobs, Martijn Naaijer und Dirk Roorda; Lizenz **CC BY-NC 4.0** (<https://creativecommons.org/licenses/by-nc/4.0/>) – nur nicht-kommerzielle Nutzung. Änderungen: Gruppierung nach Buch, Kapitel und Vers, vereinfachte Zeichen. Konverter: `tools/dss/`.
- **BDB (Brown-Driver-Briggs, ungekürzt)** – Wörterbuch mit 10.022 Einträgen, auch über Strong-Nummer (H3) und BDB-Nummer auffindbar. Gemeinfrei (1906); Textgrundlage von Tim Morton (Bible Analyzer), Bibelstellen von Stephen Ku u. a., Aufbereitung von Eliran Wong: [eliranwong/unabridged-BDB-Hebrew-lexicon](https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon). Konverter: `tools/bdb/`.
- **Parallelstellen** (`parallels.js`) – [ETCBC/parallels](https://github.com/ETCBC/parallels), MIT-Lizenz, auf Basis der BHSA (CC BY-NC 4.0, nur als Ausgangsdaten der Ähnlichkeitsberechnung). Konverter: `tools/parallels/`.
- **Septuaginta (CATSS)** – griechische Version mit hebräischem Gegenstück je Wortgruppe (Interlinear schaltbar), 40 Fassungen (Tanach; Richter als Codex A und B, Daniel zusätzlich nach Theodotion); Plus, Minus und Tags der Ausrichtung werden gekennzeichnet. Quelle: CATSS (Tov/Kraft), [Oxford Text Archive 1111](https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/1111), **CC BY-NC-SA 3.0**, nur nicht kommerziell – siehe `LICENSE-CATSS.md`. Konverter: `tools/catss/`.

## Bibelkarte

Karte der Orte eines Kapitels (🗺 in der Leseleiste, auch aus der Gliederung), mit Entfernungsmessung, Höhenprofil, Notizen an Orten und Routen. Quellen:
- Orte, Bibelstellen, Lagesicherheit: [OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) (CC BY 4.0).
- Gelände: Copernicus DEM GLO-30 (© DLR/ESA/Copernicus, frei nutzbar mit Quellenangabe); Küsten, Flüsse, Seen und heutige Grenzen: Natural Earth (gemeinfrei). Konverter: `tools/map/`.
- Routen: [UBS Bible Routes](https://github.com/ubsicap/ubs-open-license) (MARBLE, nach Leen Ritmeyer, © United Bible Societies 2023, **CC BY-SA 4.0**) – `map/routes.js` steht daher unter derselben Lizenz; Bibelstellen und deutsche Titel sind unsere Zuordnung.
- Orte bei Josephus (Jüdischer Krieg, Altertümer 11–20) und in den Makkabäerbüchern: [ToposText](https://topostext.org) (Brady Kiesling, Aikaterini Laskaridis Foundation; Open Data Commons Attribution). Die Zuordnung zu den Sefaria-Kapiteln entsteht über den Whiston-Text (`tools/map/extract_topostext.py`, `tools/map/build_josephus.py`) und wird in `map/josephus.js` abgelegt.
- Jerusalem im Detail (Knopf 🏛 in der Karte, ab starkem Zoom): [Ordnance Survey of Jerusalem](https://commons.wikimedia.org/wiki/File:1865_Ordnance_Survey_of_Jerusalem_Old_City_full_map.jpg) (Charles W. Wilson, 1864/65, gemeinfrei, Wikimedia Commons), Schummerung aus Copernicus DEM GLO-30, heutige Straßen und Mauer aus [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap-Mitwirkende, ODbL). Aufbau: `tools/map/build_jerusalem.py`, `tools/map/build_jer_meta.py`.

## Audio und Gliederungen

- **Audio:** hebräische Lesung des Tanach von Abraham Schmueloff, Quelle: [archive.org](https://archive.org/details/HebrewOldTestamentReadByAbrahamSchmueloff) (Talking Bibles International). In Kapitel geteilt; die Versmarken liegen in `audio-markers/`. Die Audiodateien gehören nicht ins Repository, sondern ins GitHub-Release `audio` (pro Buch eine Datei `Audio_<Buch>.zip`). Die Lizenzangabe wird mit Talking Bibles International geklärt.
- **Gliederungen (`outlines/`):** Gliederungen von 39 Büchern, abgeschrieben aus einer gedruckten Ausgabe; die deutschen und englischen Übersetzungen sind maschinell erstellt und nicht durchgesehen. Werkzeuge: `tools/assemble_outline_photos.py`, `tools/merge_outline_tr.py`.

## Oberflächensprache

Die Oberfläche gibt es auf Deutsch und Englisch (Menü ⋯ → Sprache). Die englischen Texte stehen in `i18n.js`: links der deutsche Originaltext, rechts die Übersetzung; `{}` und `{#}` (Zahl) sind Platzhalter. Neue Oberflächentexte im Code bleiben deutsch und bekommen dort einen Eintrag. `test10.js` prüft die Tabelle.

## Lizenz dieses Projekts

Der Quellcode dieser App steht unter der [MIT-Lizenz](LICENSE).
