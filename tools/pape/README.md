# Pape für Safran

Eingabe sind die vom Nutzer gelieferten StarDict-Dateien `pape_gr-de.dict`,
`.idx`, `.ifo`, `.syn` und das zugehörige `res`-Verzeichnis. Es werden keine
Artikel von Zeno nachgeladen oder ergänzt.

```sh
python3 -I tools/pape/build.py '/Pfad/pape_gr-de.dict' --stardict-out '/Ziel/pape-gr-de-bereinigt'
node test39.js '/Pfad/pape_gr-de.dict' '/Ziel/pape-gr-de-bereinigt/pape_gr-de.dict'
```

Die Aufbereitung erfüllt den ausdrücklichen Bereinigungsauftrag:

- 60 rein lateinische Artikel entfernt; 98.833 griechische Artikel bleiben.
- 164.642 lateinische beziehungsweise fremde Suchaliasse entfernt. Nach der
  Trennstrichbereinigung und dem Entfernen doppelter Alias-Zugänge bleiben
  99.224 griechische Alias-Zugänge.
- Trennstriche in 65.753 griechischen Stichwörtern entfernt, etwa
  `εὐρυ-έδης` → `εὐρυέδης`. Die erste fett gedruckte Artikelüberschrift wird
  ebenso bereinigt. Bindestriche in Erklärungen, Zitaten und Verweistexten
  bleiben unverändert. Durch die Bereinigung gleich geschriebene Stichwörter
  bleiben getrennte Artikel.
- Fünf griechische Stichwörter enthalten einzelne lateinische OCR-Zeichen.
  Sie sind keine lateinischen Lexikoneinträge und bleiben ohne ungefragte
  Textkorrektur erhalten; die vollständige Liste steht in `source.json`.

Die Liste aller entfernten lateinischen Artikel, Eingabe-Hashes, Artikelzahl
und Prüfsummen stehen in `source.json`. Die Quelle bleibt unverändert.
Die ausgewählten Aufbereitungsregeln ersetzen keine redaktionelle Prüfung
der historischen Erläuterungen und Schreibweisen.

Safrans Paket enthält die Artikel mit ihrem vollständigen Erklärungstext,
17 eingebetteten Abbildungen und 17.802 eindeutig erkannten Verweisen nach
`s.`, `vgl.` oder `=`. Farben aus der StarDict-Aufbereitung werden entfernt,
damit die Artikel auch im dunklen App-Design lesbar sind; Fettdruck, Kursiv,
Hoch- und Tiefstellung bleiben erhalten. Die vorhandene Suche, Volltextsuche,
Stichwortliste und Verbindung zu griechischen Wortkarten werden genutzt.

Zusätzlich schreibt `--stardict-out` einen neuen, sortierten StarDict-Index,
die passend neu nummerierten griechischen Alias-Zugänge, das bereinigte
Artikelarchiv und die aktualisierte `.ifo`-Datei. Die Original-Abbildungen
werden unverändert in dessen `res`-Verzeichnis kopiert. Die große
StarDict-Ausgabe liegt als Arbeitsartefakt außerhalb des Git-Checkouts;
im App-Paket wird nur das komprimierte Safran-Wörterbuch gespeichert.

Prüfung: Bei der Konvertierung wird der sichtbare Text jedes Artikels vor
und nach der HTML-Aufbereitung verglichen. `test39.js` prüft offline den
vollständigen Artikeltext-Hash, alle Stichwort-/Alias-Zugänge, Bilder und
Querverweise sowie Import, Suche, Volltext und griechische Wortkarten.
Mit den optionalen Dateipfaden vergleicht der Test zusätzlich sämtliche
98.833 Artikel einzeln mit dem Original und der bereinigten StarDict-Ausgabe.
