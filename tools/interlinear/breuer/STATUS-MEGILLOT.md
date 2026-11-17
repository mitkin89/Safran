# Breuer: übrige Arba Megillot – vollständig

Eigener Checkout `work/safran-breuer`, Branch `codex/breuer-megillot`.
Ausgangsstand: lokaler Goldschmidt-Commit `395dd61` (Baum entspricht dem
veröffentlichten Goldschmidt-Stand `e8259cc2d3035b6f840138d12a77eb90eb9cb4f6`).

| Buch | Geprüft und zugeordnet | Neue Verse | Offen |
| --- | --- | ---: | ---: |
| Song of Songs | 1:1–8:14 vollständig | 117 | 0 |
| Ecclesiastes | 1:1–12:14 vollständig | 222 | 0 |
| Lamentations | 1:1–5:22 vollständig | 154 | 0 |
| Summe neuer Auftrag | | 493 | 0 |

Ruth (85 vorhandene Verse) bleibt unverändert. Die gebündelte Ausgabe heißt
„Arba Megillot“ und enthält diese vier Bücher; eine Breuer-Übersetzung von
Esther ist im Bestand nicht vorhanden.

Jeder neue Vers wurde anhand der tatsächlich nummerierten Wörter im
Westminster-JSON gelesen und zugeordnet. Deutscher Wortlaut und Reihenfolge
bleiben erhalten, Zusätze stehen bei `-`; alle 37 separat gezählten
Ketiv-/Qere-Stellen der drei neuen Bücher sind gemeinsam zugeordnet.
Keine Quell-JSONs oder Manifest-Hashes geändert. Auffälligkeiten stehen in
PRUEFLISTE-MEGILLOT.md; keine stillschweigenden Textkorrekturen.
Druckabgleich nicht durchgeführt. Übersetzungsentscheidungen sind keine
festgestellten Transkriptionsfehler.

Validierung des vollständigen Standes:

- `python3 tools/interlinear/build.py`: Wortlaut und Nummerngrenzen aller Zuordnungen.
- `python3 -I tools/interlinear/renderings.py`: Wortkarten aus den Zuordnungen neu gebaut.
- `node test.js`: bestehende Bibliothekstests.
- `node test30.js`: jeder Vers der drei neuen Bücher erforderlich, exakte Gesamtzahlen,
  deutscher Wortlaut, Wortnummerngrenzen und alle 37 Ketiv-/Qere-Stellen.
  Ruth und die anderen vorhandenen Übersetzungen werden mitgeprüft.

Alle vier Prüfungen bestanden. Keine offenen oder übersprungenen Verse in
Breuer. Der bereits vorhandene Goldschmidt-Teilstand Genesis 1 bleibt im Test
ausdrücklich auf 31 Verse begrenzt; dessen 1502 offene Verse werden ausgewiesen.
Die Skripte beweisen keine semantische Richtigkeit; die Prüfung am Hebräischen
wurde separat versweise vorgenommen. Keine visuelle App-Prüfung.

Gemeinsame Dateien (CHANGELOG.md, test30.js, interlin.js, interlin-ren.js) nach
Zusammenführen mit paralleler Arbeit aus dem vereinigten Bestand neu prüfen
bzw. erzeugen; die erzeugten Dateien dieses Checkouts nicht über neuere
Gesamtbestände kopieren. Goldschmidt sowie Genesis und Exodus bleiben unverändert.
