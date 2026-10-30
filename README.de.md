# Safran סַפְרָן – Offline-Leser für Mac und Windows

[English](README.md) · **Deutsch**

**Warum „Safran"?** Der Name ist das hebräische Wort **סַפְרָן** (*safran*): Schreiber, im modernen Hebräisch auch Bibliothekar. Es stammt von derselben Wurzel wie *sefer* (Buch) und *sefarim* (Bücher) und passt damit zu einer App, die eine Bibliothek von Texten ist. Die App entsteht bei [talmud.de](https://talmud.de) und steht in keiner Verbindung zu Sefaria.

Eine Offline-Bibliothek für [Sefaria](https://www.sefaria.org)-Texte unter macOS und Windows (Electron). Beim Start öffnet sich direkt die **Offline-Bibliothek**; das Menü **Werkzeuge** bietet Buch-Download und Hilfen zur Vorbereitung von Uploads.

> **Keine Verbindung zu Sefaria.** Dies ist ein unabhängiges, inoffizielles Projekt. Die Texte von Sefaria sind nicht Teil der App: Sie werden aus dem öffentlichen Sefaria-Export auf deinen Rechner geladen. Die App lädt nie etwas zu Sefaria hoch. Zusätzlich enthält Safran Texte, die **bei Sefaria noch nicht verfügbar sind**: deutsche Übersetzungen und Kommentare (Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Raschi und Kitzur Schulchan Aruch (Bamberger), Mendelssohn (Netivot ha-Schalom, Biur), Midrasch Rabba, More Nevuchim u. a.) im Ordner `bundled/`. Sie werden beim ersten Start automatisch importiert und erscheinen unter *Eigene Texte*.

> Die Oberfläche gibt es auf Deutsch und Englisch (Menü ⋯ → Sprache).

![Lesansicht mit Anmerkungen](screenshots/reading-and-commentary-annotated.jpg)

*Zefanja 1: Hebräisch, Englisch und Deutsch nebeneinander, links Bücherliste und Verlauf, rechts das Kommentarfenster.*

![Geteilte Ansicht](screenshots/split-view-commentary-annotated.jpg)

*Zwei Lesefenster nebeneinander (Genesis mit Kommentarfenster links, Sanhedrin rechts) mit der kompakten Werkzeugleiste.*

## Funktionen

- **Download:** Katalog einmal laden (~22 MB), Kategorien oder einzelne Bücher ankreuzen, Sprachen wählen (Hebräisch, Englisch, Deutsch) und herunterladen. Standardmäßig wird je Sprache die zusammengeführte Fassung verwendet; deutsche Übersetzungen werden vollständig geladen. Unterbrochene Downloads lassen sich fortsetzen, vorhandene Dateien werden übersprungen.
- **Lesen:** Hebräisch, Englisch und Deutsch nebeneinander, Vers für Vers ausgerichtet. Kapitel bzw. Talmudseiten (2a, 2b …) per Auswahlliste oder Pfeiltasten. Fußnoten öffnen sich direkt im Text (Klick auf die kleine Marke). Einzelne Versionen lassen sich ein- und ausschalten.
- **Tabs, Verlauf und Sitzungen:** mehrere Tabs mit Zurück/Vor je Tab, Liste „zuletzt geöffnet"; offene Tabs werden beim nächsten Start wiederhergestellt.
- **Springen-Feld:** Stelle eintippen (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abgekürzte Buchnamen funktionieren.
- **Suche:** Volltextsuche in allen geladenen Texten (inkl. Fußnoten und eigenen Texten), hebräische Vokale und Kantillation werden ignoriert, optional „ganze Wörter mit Präfixen", Kategoriefilter. Erweiterte Suche: bis zu drei Wörter in der Nähe zueinander (Abstand einstellbar, Reihenfolge optional), Platzhalter (`anf*`, `m?er`) und unscharfe Suche für Schreibvarianten (Raschi/Rashi). Seitensuche mit Cmd+F, auch im Kommentarfenster.
- **Verknüpfungen (🔗):** Sefarias Verknüpfungsdaten einmal laden (~680 MB), dann je Vers nach Kategorie und Buch gruppiert mit Textvorschau ansehen.
- **Bibelkarte (🗺):** Orte des aktuellen Kapitels auf einer Karte von Israel (Grenzen, Relief, Flüsse, Routen), Entfernungsmessung, Höhenprofil, Notizen an Orten; dazu eine detaillierte **Jerusalem**-Karte (Wilson 1864/65 mit heutigen Straßen). Der Knopf zeigt die Anzahl der Orte.
- **Themen (🏷):** Themenansicht, die Themen den Stellen zuordnet. Der Knopf zeigt die Anzahl der Themen.
- **Gliederungen:** Gliederungen für 39 Bücher des Tanach auf Hebräisch, Deutsch und Englisch. Für die Tora gibt es in der Gliederung zusätzlich den Schalter **613 Mizwot**, der statt der Gliederung nur die Gebote zeigt. Von der Karte führt ein Klick zurück zur Gliederung.
- **Audio:** hebräische Lesung des Tanach von Abraham Schmueloff, kapitelweise, mit Versmarken (in der App enthalten). Die Audiodateien (etwa 3 GB) werden im *Download*-Fenster pro Buch geladen (GitHub-Release `audio`); die Wiedergabe folgt den Versen.
- **Fenster anpinnen:** Verknüpfungen, Themen, Gliederung, Karte, Kommentare und Wörterbuch lassen sich mit der Nadel neben dem ✕ anheften und stehen dann neben dem Text. Der Pin wird je Fenster gemerkt; ein zweites angepinntes Fenster ersetzt das erste (Kommentare und Wörterbuch dürfen zusammen angepinnt sein). Nicht angepinnte Fenster schweben und schließen beim Klick außerhalb. Ein Klick auf die Versnummer öffnet die Kommentare.
- **Beschriftete Werkzeugleiste:** Die Knöpfe für Verknüpfungen, Themen und Karte tragen eine Beschriftung und zeigen die Anzahl.
- **Kommentarfenster (Cmd+K):** zeigt Kommentare zum gewählten Vers (z. B. Raschi und Ibn Esra untereinander) in der gewählten Sprache. Ist kein Kommentator gewählt, erscheinen alle lokal vorhandenen.
- **Eigene Texte und Kommentare:** TXT, Word (.docx), CSV, JSON oder Sefaria-Upload-CSV importieren, auch mehrere auf einmal (Drag & Drop), als *Text* oder als *Kommentar* (`Kommentator on Buch`, erscheint im Kommentarfenster). Dein Text erscheint als zusätzliche Spalte neben dem Original, wird Zeile für Zeile verglichen und lässt sich wieder entfernen. Eingebettete Base64-Bilder werden angezeigt.
- **Zusätzliche Texte, die es bei Sefaria (noch) nicht gibt:** Safran enthält eine eigene Sammlung deutscher Übersetzungen und Kommentare, die Sefaria bisher nicht anbietet. Sie erscheinen als zusätzliche Versionen und Kommentatoren neben den Sefaria-Texten.
- **Mitgelieferte Texte:** Texte im Ordner `bundled/` werden beim Start automatisch importiert (neue oder geänderte auch nach Updates); eigene Texte exportierst du mit ⋯ → „Eigene Texte für GitHub exportieren …" in diesen Ordner.
- **Zwei Lesefenster** nebeneinander mit eigenen Tabs, Verlauf und Kommentarfenster; **Kommentarfenster in der Breite verstellbar** mit einstellbarer Schriftgröße.
- **Notizen und Lesezeichen**, **Anzeigeoptionen** (Schriftgrößen, Vokale/Kantillation ausblenden), **Export** als PDF oder Word, **Update-Prüfung** gegen den Sefaria-Export.
- **Menü Werkzeuge:** Buch oder Kapitelbereich als CSV/TXT/JSON herunterladen; CSV-Dateien für den Sefaria-Upload vorbereiten und prüfen (Duplikate, Lücken, Reihenfolge, HTML, Steuerzeichen, Segmentzahlen im Vergleich mit einem vorhandenen Sefaria-Text).
- Hebräischer Text wird in **SBL Hebrew** gesetzt, falls installiert (kostenlos von der Society of Biblical Literature), sonst in einer Ersatzschrift.

### Tastenkürzel

| Kürzel | Aktion |
| --- | --- |
| ← / → | vorheriger / nächster Abschnitt |
| Cmd+T / Cmd+W | neuer Tab / Tab schließen (Cmd+Shift+W schließt das Fenster) |
| Cmd+1…9 | Tab wählen (9 = letzter), Cmd+Alt+←/→ Tab links/rechts |
| Cmd+[ / Cmd+] | zurück / vor |
| Cmd+F | Suche im angezeigten Text |
| Cmd+K | Kommentarfenster |
| Cmd+B | Bücherliste ein-/ausblenden |
| Cmd+Shift+O | Offline-Bibliothek öffnen |

## Datenmenge (grobe Werte)

Alle zusammengeführten hebräischen Texte ≈ 2,8 GB, Englisch ≈ 0,5 GB, deutsche Übersetzungen (288 Versionen, vor allem Tanach, Talmud, Mischna) ≈ 0,13 GB. Alle JSON-Texte mit jeder Einzelversion ≈ 7 GB. Der Speicherort lässt sich ändern („Speicherort …"), z. B. auf eine externe Festplatte.

## Erster Start unter macOS und Windows

Die App hat kein kostenpflichtiges Entwicklerzertifikat (die Zertifikate von Apple und Microsoft kosten Geld), darum ist beim ersten Start ein zusätzlicher Schritt nötig. Die App ist nicht defekt. Unter macOS ist sie lokal (ad hoc) signiert; meist erscheint die Meldung *„Entwickler kann nicht überprüft werden"* mit der Schaltfläche **Trotzdem öffnen**.

**macOS** – bei *„Safran ist beschädigt und kann nicht geöffnet werden"* oder *„Entwickler kann nicht überprüft werden"*:

1. **Safran** in den Ordner **Programme** ziehen.
2. Am einfachsten: die `.dmg` erneut öffnen und mit Rechtsklick **Safran freischalten.command** → *Öffnen* → *Öffnen*. Oder im Terminal: `xattr -cr /Applications/Safran.app`
3. Bei *„Entwickler kann nicht überprüft werden"*: *Systemeinstellungen → Datenschutz & Sicherheit → Trotzdem öffnen* (nach unten scrollen) oder Rechtsklick auf die App → *Öffnen* → *Öffnen*.

**Windows** – SmartScreen zeigt evtl. *„Der Computer wurde durch Windows geschützt"*: **Weitere Informationen** → **Trotzdem ausführen**.

## Erste Schritte (Entwicklung)

1. Node.js 22 LTS installieren.
2. Im Projektordner:

```bash
npm install
npm start
```

## Mac-App bauen

```bash
npm run dist
```

Die `.dmg` liegt danach in `dist/`. Die App ist nicht signiert: Beim ersten Start Rechtsklick auf die App und „Öffnen" wählen.

## Tests (nur Logik, keine Oberfläche)

```bash
npm test
```

## Sefaria-Quelle und Lizenzen

Alle Texte, der Katalog und die Verknüpfungsdaten stammen aus dem öffentlichen **Sefaria-Export** ([Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export), Dateien in Google Cloud Storage). Sefaria selbst ist ein Open-Source-Projekt: <https://github.com/Sefaria/Sefaria-Project> · <https://www.sefaria.org>.

Die Texte fallen **nicht** unter die Lizenz dieses Projekts. Jede Textversion hat ihre eigene Lizenz (meist Creative Commons, manche gemeinfrei, manche eingeschränkt); sie steht in den Versionsinformationen bei Sefaria und in den exportierten Dateien. Wer Texte weiterverwendet oder weitergibt, beachte bitte diese Lizenzen und nenne Sefaria und die Originalquellen. Selbst importierte Texte bleiben auf deinem Rechner.

Die Bibel-Querverweise in `xref.json` (nur Tanach, unter den Sefaria-Verknüpfungen angezeigt) stammen von [OpenBible.info](https://www.openbible.info/labs/cross-references/) (überwiegend Treasury of Scripture Knowledge), Lizenz CC BY 4.0. Konverter: `tools/xref/`.

## Lizenz

Der Quellcode dieser App steht unter der [MIT-Lizenz](LICENSE).

## Änderungen

### Neu in 1.8
- **Karten:** Bibelkarte von Israel und detaillierte Jerusalem-Karte; die Orte eines Kapitels, mit Zurück-Knopf zur Gliederung.
- **Themen** und **Gliederungen** für 39 Bücher (Hebräisch/Deutsch/Englisch), Tora-Gliederungen mit Schalter **613 Mizwot**.
- **Audio:** hebräische Lesung mit Versmarken; Download pro Buch aus dem GitHub-Release.
- **Anpinnen:** sechs Fenster lassen sich neben dem Text anheften; nicht angepinnte schließen beim Klick außerhalb; ein Klick auf die Versnummer öffnet die Kommentare.
- **Beschriftete Knöpfe** mit Anzahl, der geöffnete Tab ist immer sichtbar, weitere englische Oberflächentexte.
- BDB: Verse verlinkt, Griechisch in SBL Greek; Gesenius ✡; Hover-Vorschau in Wörterbüchern.

Ältere Versionen (1.1–1.4) sind im [englischen README](README.md#changelog) beschrieben.

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

## Oberflächensprache

Die Oberfläche gibt es auf Deutsch und Englisch (Menü ⋯ → Sprache). Die englischen Texte stehen in `i18n.js`: links der deutsche Originaltext, rechts die Übersetzung; `{}` und `{#}` (Zahl) sind Platzhalter. Neue Oberflächentexte im Code bleiben deutsch und bekommen dort einen Eintrag. `test10.js` prüft die Tabelle.

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
