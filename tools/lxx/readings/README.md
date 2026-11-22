# LXX-Lesarten gegenüber dem MT

Klassifizierte Abweichungen der Septuaginta vom masoretischen Text für den Apparat (Zeuge „LXX“), analog zu `tools/peshitta/readings`.

- **Grundlage:** CATSS-Ausrichtung (Tov/Kraft, CC BY-NC-SA 3.0) aus den gebündelten CATSS-Lesetexten, Hosea aus den Oxford-Dateien; MT = Westminster Leningrad Codex. Tovs Spalte b (erschlossene Lesarten) lag den Bearbeitern vor.
- **Einordnung:** Claude, 2026, Vers für Vers in 96 Arbeitsblättern. Typen wie bei der Peschitta (`lesart`, `deutung`, `zusatz`, `auslassung`, `harmonisierung`, `technik`, `doublette`, `umstellung`, `zahl`, `name`), dazu `grfehler` (innergriechischer Fehler). `technik` ist im Apparat ausblendbar („LXX · auch Übersetzungstechnik“).
- **Umfang:** 40 Fassungen (Richter A/B, Daniel Old Greek/Theodotion getrennt); Ester fehlt (kein CATSS-Text). In Büchern mit Tov-Daten wurden Verse mit Plus/Minus, CATSS-Merkmal, Tov-Notiz oder unzugeordnetem Wort bearbeitet, in Psalmen, Sprüchen und Ijob alle Verse.
- **Format** `<Kürzel>.json`: `{code, book, verses:{"c:v":{H:[MT-Konsonanten], G:[griechische Gruppen], Gmt:[MT-Nummern je Gruppe], r:[{he, gr, type, vorlage, note, sure, parallel}]}}}`; `he`/`gr` 1-basiert.
- **Bau:** `python3 tools/lxx/readings/build.py` schreibt `lxx-readings/<Kürzel>.js` (kompakt: Verse ohne Eintrag als 0) und `lxx-readings/index.js`.

Grenzen: Zeugenhinweise in `note` („so auch SMR/4Q…“) stammen aus der Kenntnis der Bearbeiter und sind nicht an Editionen geprüft. An Ketiv/Qere-Stellen fehlen im CATSS-Lesetext griechische Wörter (Zeilen mit `*` werden beim Einlesen übergangen); dort konnten keine Lesarten erfasst werden.
