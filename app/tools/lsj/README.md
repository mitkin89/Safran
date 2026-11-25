# Liddell & Scott (Greek–English)

Die vom Nutzer bereitgestellte UTF-16-DSL-Datei wird mit Safrans DSL-Renderer
eingelesen. Nur die angegebene Datei wird importiert, nicht die alternative
`_or_2`-Fassung. Die gleichnamige `.ann`-Begleitdatei liefert, wenn vorhanden,
die allgemeine Abkürzungsliste für Safrans vorhandene Hover-Erklärungen.

```sh
node --max-old-space-size=4096 tools/lsj/build.js '/Pfad/Grc-Eng_L&S_Greek-English Lexicon_or_1.dsl'
node tests/integration/lsj-import.cjs
python3 tools/lsj/verify.py . '/Pfad/Grc-Eng_L&S_Greek-English Lexicon_or_1.dsl'
```

Ergebnis: ein zusätzliches `bundled/dict/<id>.json.gz`, der zugehörige Eintrag
in `bundled/dict/manifest.json` und die Herkunftsdaten in `source.json`.
Bestehende Wörterbuchpakete und Manifest-Einträge bleiben unverändert.
Die Rohdatei wird nicht mitgeliefert. Für einen bytegleichen Neubau wird auch
die in `source.json` verzeichnete Begleitdatei benötigt.

Die Quelldatei enthält 115.628 Stichwort-/Artikelblöcke. Elf davon wiederholen
einen Artikel wortgleich: zusammen ergeben sie 115.617 Artikel mit 115.628
Stichwörtern, entsprechend der Angabe in der Begleitdatei. Alle Stichwörter
bleiben erhalten. Auch die ursprüngliche Schreibweise und die sichtbaren
Kennzeichnungen wie `[dialect]` werden beibehalten; es erfolgen keine
inhaltlichen Textkorrekturen. Werkbezogene Abkürzungen werden nicht geraten;
nur passende, vollständig ausgezeichnete Kürzel aus der allgemeinen Liste
bekommen eine Erklärung.

Das Paket nutzt Safrans normalen Offline-Import, Wörterbuchauswahl, Suche,
Volltextsuche, Stichwortliste und anklickbare DSL-Querverweise. Akzente und
Spiritus werden bei der Suche entfernt; Schluss-Sigma und Sigma sowie Groß-
und Kleinschreibung sind gleichwertig. Klassische Literaturzitate werden
nicht ohne belegte Zuordnung in Bibelverweise umgewandelt.

Prüfstand: `npm test` vollständig bestanden. Der unabhängige Textvergleich mit
`verify.py` hat alle 115.628 Quell-Stichwörter erfasst: keine fehlenden
Stichwörter und keine Abweichungen im sichtbaren Artikeltext. `tests/integration/lsj-import.cjs` prüft
das vollständige Paket, Import und Entfernen, Schreibvarianten, Vorschläge,
Stichwortliste, interne Verweise, Abkürzungen und englische Volltextphrasen.
