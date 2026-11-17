# Wolf: Samuel – vollständiger Prüfstand

Stand: 17. November 2026. Arbeitsbranch: `codex/wolf-samuel`, Ausgangspunkt `origin/main` / `6dbeb5342b5a47b651d38f82d9e93a5dd0dc0d87`.

## Quellen und Umfang

Quelle ist die bereits gebündelte Fassung `Wolf, Das Buch Samuel — Übersetzung`; hebräische Referenz ist der gebündelte Westminster-Text (OSHB). Das vorhandene Porträt von Benedikt Pinchas Wolf ist verknüpft.

| Buch | Kapitel | einzeln am Hebräischen zugeordnete Verse | getestete Ketiv-/Qere-Gruppen |
|---|---:|---:|---:|
| I Samuel | 1–31 | 811 | 70 |
| II Samuel | 1–24 | 695 | 87 |
| Gesamt | 55 | 1506 | 157 |

Keine offenen Kapitel oder fehlenden Versschlüssel. Deutsche Reihenfolge und vorhandene Namensvarianten bleiben erhalten. Die 34 ausdrücklich freigegebenen kleinen Änderungen in 31 Versen sind in `KORREKTUREN.md` dokumentiert; der übrige Wortlaut bleibt unverändert. Die Eingabehilfe transkribiert ausdrücklich festgelegte Wortbereiche und erzeugt keine Zuordnungen selbst. Getrennt gezählte Ketiv-/Qere-Formen werden gemeinsam zugeordnet; bei mehrteiligen Varianten sind alle zugehörigen Indizes zusammengeführt. Deutsche Zusätze erhalten `-`. Ausdeutende Übersetzungen können mehrere hebräische Wörter zusammenfassen.

Zusätzlich wurden nicht referenzierte hebräische Inhaltswörter nachgesehen. Die ausdrücklichen Auslassungen (etwa II 6:10, 18:8, 19:7) sind in `PRUEFLISTE.md` dokumentiert; dafür wurden keine deutschen Wörter erfunden.

## Validierung

Abschließender vollständiger Lauf, ohne Teilstand-Ausnahmen:

- `python3 tools/interlinear/build.py`: bestanden; Wolf 1506 Verse, alle übrigen Zuordnungen mitgebaut.
- `python3 -I tools/interlinear/renderings.py`: bestanden; Wolf 1790 Lemmata, gesamte Übersetzungsstatistik neu erzeugt.
- `node test.js`: bestanden.
- `node test30.js`: bestanden; sämtliche 1506 Wolf-Verse werden auf Vollständigkeit, Quellwortlaut und gültige Wortnummern geprüft. Alle 157 Ketiv-/Qere-Gruppen werden auf gemeinsame Referenzen geprüft, einschließlich mehrteiliger Varianten. Bestehende Prüfungen der anderen Übersetzer bleiben erhalten.
- Zusätzliche Syntaxprüfungen von `library.js` und `test30.js`, `git diff --check`: bestanden.
- Exakte Schlüsselprüfung: 811 / 695 Verse, keine Lücken oder Duplikate.
- Wolf-JSONs: 34 freigegebene Änderungen in 31 Versen, kompakte Speicherung und geprüfte Manifest-SHA1. Keine Änderungen an Goldschmidts `Genesis.txt` oder `Exodus.txt`.

Vorherige Teilstandläufe umfassten zunächst I Samuel 1–24 (650 Verse), danach ganz I Samuel und II Samuel 1–7 (998 Verse zusammen). Diese Teilstände sind durch den vollständigen Schlusslauf ersetzt; im aktuellen Test gibt es keine Kapitelbegrenzung und kein pauschales Überspringen fehlender Verse.

Der Vergleich mit dem Ausgangscommit bestätigt: Alle bisherigen Interlinear-Zuordnungen sind exakt unverändert. Beim vollständigen Neubau ändern sich Statistikdaten bei elf bestehenden Lemmata: Der Generator sammelt Eigennamen und Kleinschreibungen über alle Übersetzer gemeinsam. Zehn Fälle betreffen Paradigma-Schreibungen beziehungsweise deren Zusammenfassung (etwa „Vereinigten“ → „vereinigten“); bei Zunz, Lemma `378+`, filtert die gemeinsame Namenserkennung zusätzlich einen Nicht-Namen-Beleg „Isch“ aus. Dies ist eine Folge des bestehenden Generators mit Wolf, keine Änderung der Quelltexte oder Zuordnungen.

Die Prüfprogramme kontrollieren technische Konsistenz; die sprachliche Prüfung erfolgt durch die Einzelzuordnung am Hebräischen. Eine visuelle Browserprüfung wurde nicht durchgeführt.

## Quelltext und Veröffentlichung

Die freigegebenen Änderungen sind umgesetzt, einschließlich deutscher JSONs, Zuordnungen und Manifest-Hashes. Weitere Auffälligkeiten stehen in `PRUEFLISTE.md`; insbesondere II 14:21 und II 17:25 bleiben bis zum Druckvergleich offen. Die parallelen Änderungen aus `origin/main` (`c707779`) wurden zusammengeführt, einschließlich Breuer/Nehemia und privatem Interlinear-Import. Wolfs Quellenfarbe verwendet nun Index 14; Buber/Rosenzweig behält Index 13. Die vier Prüfungen bestehen auf diesem zusammengeführten Stand; zusätzlich besteht `node test32.js` für den privaten Import. Veröffentlichung ist ausdrücklich auf dem Arbeitsbranch `codex/wolf-samuel` freigegeben.

Bei parallelen Änderungen die beiden Wolf-TXT-Dateien übernehmen und die Einträge in `build.py`, `library.js`, `library.css`, `test30.js`, README und CHANGELOG zusammenführen. Danach `interlin.js` und `interlin-ren.js` aus **allen** aktuellen Zuordnungen neu bauen und die vier Prüfungen erneut ausführen; erzeugte Dateien nicht aus einem veralteten Teilstand überschreiben.
