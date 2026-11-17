# Joseph Breuer: Ezechiel – vollständig bis 48:35

Eigener Checkout `work/safran-breuer-ezekiel`, Branch `codex/breuer-ezekiel`,
Basis `5d84c01` (fertige Megillot). Stand: 17.11.2026.

Die vollständige Sefaria-Ausgabe umfasst 48 Kapitel und 1273 Versfelder.
Alle Verse wurden einzeln am tatsächlich nummerierten Westminster-Text gelesen
und zugeordnet. 1236 Felder enthalten deutschen Übersetzungstext; 37 bestehen
nur aus den vorhandenen Auslassungszeichen `— —`, die mit `-` erhalten sind.
Keine offenen Kapitel und keine maschinelle Vorfassung.

Die 654 Versfelder der Kapitel 25–48 ergänzen den früheren Stand 1–24.
Deutsche Reihenfolge und Wortlaut bleiben erhalten, einschließlich Schreibfehlern,
zusammengeschriebener Wörter, Übersetzungsdeutungen und Klammern. Zusätze ohne
eigenes hebräisches Gegenstück stehen bei `-`; Klammerwörter wurden einzeln geprüft.
Bei untrennbar zusammengeschriebenen deutschen Wörtern können mehrere hebräische
Nummern gemeinsam nötig sein. Ketiv und Qere stehen in jedem berührenden Segment
zusammen, auch bei mehrwortigen Gruppen und zusammengesetzten Zahlen.

Quelllücken: vollständig 1:5–27, 3:13 sowie 10:5,8–17,21–22; Teilauslassungen
unter anderem 1:28, 8:2, 10:1–2,6,19 und 40:3. Diese Stellen sind ausdrücklich
keine Zuordnung der ausgelassenen hebräischen Wörter.

`test30.js` verlangt jeden der 1273 Verse, prüft den genauen deutschen Wortlaut,
Nummerngrenzen, Gesamtzahl, Quellplatzhalter und 133 übersetzte Ketiv-/Qere-Gruppen
(45 in 1–24, weitere 88 in 25–48). Die Ketiv-/Qere-Stelle in 1:8 ist wegen der
vollständigen deutschen Quelllücke keine übersetzte Gruppe. Fehlende Verse werden
nicht übersprungen. Bei der Zusammenführung mit main bleiben die dort bereits vollständigen
Goldschmidt-Zuordnungen für Genesis und Exodus samt Tests erhalten.

Quellgeschichte: Originaler Versionstitel, Herkunft, Lizenz, Fußnoten und Bilder
sind im kompakten JSON erhalten. Die freigegebene Versaufteilung 5:8–10 sowie
38 freigegebene kleine Schreib-/Wortgrenzenkorrekturen in 35 Versen wurden schon
im vorherigen Stand umgesetzt; siehe `KORREKTUREN-EZEKIEL.md`.
Nach Abschluss aller Kapitel wurden weitere 38 ausdrücklich freigegebene
Korrekturen in 36 Versen umgesetzt, einschließlich der Dopplung in 41:24,
Dan in 48:1–2 und 10000 in 48:18. Zuordnungen und Manifest wurden angepasst.
SHA1 der Breuer-Übersetzung: `456d4b3c18308d130e6da48ede5e74cea3c2a880`.
Rohantwort-SHA256: `2e86ed9859d1b31112c2ef55079f7d0a9442ae80f1fad99768d3d13c94df918a`.
7:4 und 14:11 bleiben für den Druckabgleich unverändert. Die freigegebenen Korrekturen in 25–48 stehen in `KORREKTUREN-EZEKIEL.md`;
die übrigen Auffälligkeiten aus `PRUEFLISTE-EZEKIEL.md` bleiben unverändert.
Der vorhandene Kommentar und alle anderen Zuordnungsdateien bleiben unverändert.

Technik: Builder und Kreuzhervorhebung erkennen den originalen Versionstitel;
Ezechiel zeigt Joseph Breuer als Autor und Porträt im Interlinear-Auswahldialog.
`interlin.js` und `interlin-ren.js` wurden aus den Zuordnungen neu gebaut.

Prüfungen über den vollständigen Umfang bestanden:
- `python3 tools/interlinear/build.py`
- `python3 -I tools/interlinear/renderings.py`
- `node test.js`
- `node test30.js`

Zusätzlich: Negativprobe mit entferntem Vers 48:35 abgewiesen; exakte Beschränkung der Quell-/Manifest-Änderungen auf die Freigabe und
Erhalt aller anderen Zuordnungen geprüft. Technische Tests
prüfen Struktur und Wortlaut; die semantische Prüfung erfolgte beim manuellen
Versvergleich. Keine visuelle App-Prüfung.

Gemeinsame Dateien (`test30.js`, `CHANGELOG.md`, `interlin.js`, `interlin-ren.js`)
nach Zusammenführung paralleler Arbeit aus dem vereinigten Zuordnungsbestand
neu bauen und prüfen. Genesis.txt und Exodus.txt wurden nicht geändert.
Push des vollständigen Stands einschließlich der weiteren Korrekturen
am 17.11.2026 ausdrücklich freigegeben, anschließend auch Übernahme auf main.
Zusammengeführt auf Basis 0db5f9f: bestehende Zuordnungen von main bytegleich
erhalten, Breuer-Bestand ergänzt, gemeinsame Dateien aus allen Quellen neu gebaut.
