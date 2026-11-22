# LXX-Lesarten gegenüber dem MT

Klassifizierte Abweichungen der Septuaginta vom masoretischen Text für den Apparat (Zeuge „LXX“), analog zu `tools/peshitta/readings`.

- **Grundlage:** CATSS-Ausrichtung (Tov/Kraft, CC BY-NC-SA 3.0) aus den gebündelten CATSS-Lesetexten, Hosea aus den Oxford-Dateien; MT = Westminster Leningrad Codex. Tovs Spalte b (erschlossene Lesarten) lag den Bearbeitern vor.
- **Einordnung:** Claude, 2026, Vers für Vers in 96 Arbeitsblättern. Typen wie bei der Peschitta (`lesart`, `deutung`, `zusatz`, `auslassung`, `harmonisierung`, `technik`, `doublette`, `umstellung`, `zahl`, `name`), dazu `grfehler` (innergriechischer Fehler). `technik` ist im Apparat ausblendbar („LXX · auch Übersetzungstechnik“).
- **Umfang:** 40 Fassungen (Richter A/B, Daniel Old Greek/Theodotion getrennt); Ester fehlt (kein CATSS-Text). In Büchern mit Tov-Daten wurden Verse mit Plus/Minus, CATSS-Merkmal, Tov-Notiz oder unzugeordnetem Wort bearbeitet, in Psalmen, Sprüchen und Ijob alle Verse.
- **Format** `<Kürzel>.json`: `{code, book, verses:{"c:v":{H:[MT-Konsonanten], G:[griechische Gruppen], Gmt:[MT-Nummern je Gruppe], r:[{he, gr, type, vorlage, note, sure, parallel}]}}}`; `he`/`gr` 1-basiert.
- **Bau:** `python3 tools/lxx/readings/build.py` schreibt `lxx-readings/<Kürzel>.js` (kompakt: Verse ohne Eintrag als 0) und `lxx-readings/index.js`.

Ketiv/Qere: Die CATSS-Zeilen mit `*`/`**` wurden anfangs beim Einlesen übergangen; nach der Korrektur von `tools/catss/catss.py` wurden die 916 betroffenen Verse eigens nachgearbeitet. Folgt die LXX dem Ketiv mit Sinnunterschied, steht ein Eintrag „folgt dem Ketiv“; folgt sie dem Qere, gilt das als Übereinstimmung mit dem MT. Psalmen, Sprüche und Ijob stammen aus dem gebündelten Lesetext (keine Oxford-Quelle); dort fehlen die Ketiv/Qere-Wörter weiterhin.

Zeugenhinweise in `note` („so auch SMR/4Q…“): siehe `tools/textcrit/witness-check` (Abgleich mit den Daten in Safran).
