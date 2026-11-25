# Philippson-Tanach: Korrekturstand und verbleibende Prüffälle

Alle 39 Buchdateien mit 23.206 Versfeldern wurden am Westminster-Text (Hebräisch/Aramäisch) geprüft. Nach ausdrücklicher Freigabe wurden alle vier empfohlenen Korrekturbereiche bearbeitet. Historische Schreibungen und interpretative Übersetzungsentscheidungen wurden nicht pauschal vereinheitlicht.

## Ausgeführte Änderungen

1. **Sammelblöcke und Dubletten:** Isaiah 19:10–25, I Samuel 19:24 / 28:10–25 / 31:13 sowie II Samuel 4:4–12 bereinigt. Die richtigen Verse wurden aus bereits vorhandenen Textteilen zurückgeführt und wortweise neu zugeordnet; keine Übersetzung erfunden.
2. **Versgrenzen:** Hosea 7:12–13, Proverbs 24:19–20, Job 10:9–10, Nehemiah 7:53–54 / 7:68–72 / 11:35–36 und Numbers 25:18 / 26:1 korrigiert. Die im Westminster nicht vorhandene Pferde-/Mauleselangabe in Nehemiah bleibt vollständig als unzugeordneter Zusatz erhalten. Kein Wortverlust bei den Verschiebungen.
3. **Fehlende Versschlüsse:** Psalms 1:4 „[verjagt].“ und Deuteronomy 29:10 „[deinem Wasserträger],“ nach den visuell geprüften historischen Druckseiten ergänzt, am Hebräischen geprüft und ausdrücklich gekennzeichnet.
4. **OCR und Worttrennungen:** Einzeln belegte Buchstaben-, Wortabstands- und Namensfehler synchron in Quelle und Zuordnung korrigiert. 849 wortinterne Zeilentrennungen in 761 Versfeldern zusammengezogen; 37 Ergänzungsstriche vor Konjunktionen sowie Begriffstrennzeichen wie Beth-El, Dank-Friedensopfer und weiß-röthlich erhalten.

Die vorherigen fünf leeren und 40 vollständig versfremden Versfelder sind behoben. Alle 23.206 Felder enthalten jetzt sachlich zugeordneten deutschen Text. Das bedeutet nicht, dass jedes hebräische Wort in Philippsons Übersetzung ausdrücklich wiedergegeben wird.

## Änderungsnachweise

- [Samuel: exaktes Vorher/Nachher und Herkunft der Verse](KORREKTUREN-SAMUEL.md)
- [Jesaja: Rückführung aus dem Sammelblock](KORREKTUREN-JESAJA.md)
- [Versgrenzen in fünf Büchern](KORREKTUREN-VERSGRENZEN.md)
- [Ergänzungen mit Druckbelegen](KORREKTUREN-ERGAENZUNGEN.md)
- [OCR: Torah und Hosea](KORREKTUREN-OCR-TORAH.md)
- [OCR: vordere Propheten](KORREKTUREN-OCR-VORDERE-PROPHETEN.md)
- [OCR: hintere Propheten und weitere Bücher](KORREKTUREN-OCR-PROPHETEN.md)
- [OCR: Schriften](KORREKTUREN-OCR-SCHRIFTEN.md)
- [Alle bereinigten Worttrennungen](KORREKTUREN-WORTTRENNUNGEN.md)
- [Zuvor entfernte redaktionelle Überschriften](ENTFERNTE-ABSCHNITTSUEBERSCHRIFTEN.md)

## Bewusst verbleibende Prüffälle

Unklare Lesungen und historische Formen sind in den OCR-Berichten ausdrücklich gebündelt. Dazu gehören etwa Genesis 46:24 „Seelen“, Leviticus 7:33 „rechte Brust“, Hosea 10:4 „Richtige Reden“, einzelne Namensvarianten und nicht eindeutig rekonstruierbare Wörter. Solche Stellen werden nicht allein aufgrund einer abweichenden hebräischen Formulierung umgeschrieben. Weitere Druckvergleiche wären für diese Fälle erforderlich. Die älteren PRUEFLISTE-Dateien dokumentieren den Erstbefund; ihre früheren Aussagen „unverändert“ oder „offen“ sind nur zusammen mit den aktuellen Korrekturberichten zu lesen.

## Wiederholbare Prüfung

`python3 tools/interlinear/philippson/check.py` prüft vollständige Buchdateien, exakte Textrekonstruktion nach der Fußnoten-/HTML-Normalisierung des Builders, Versschlüssel, Wortnummern und gemeinsame Ketiv/Qere-Gruppen. Anschließend `python3 tools/interlinear/build.py`, `python3 -I tools/interlinear/renderings.py` und `npm test`. Die technischen Prüfungen ersetzen keine semantische Prüfung.

Abschlusskontrolle bestanden: alle 39 Bücher / 23.206 Versfelder, Text-/Nummern-/Ketiv-Qere-Prüfung, Interlinear-Build, Wortkartenstatistik, vollständiges `npm test`, JavaScript-Syntax und `git diff --check`. Alle Quellen kompakt gespeichert und sämtliche 39 Philippson-Manifest-Hashes abgeglichen. Kein Commit oder Push im Korrekturdurchgang.
