# Prüfung der deutschen Texte – 25. November 2026

Der technische Prüflauf über alle **419 öffentlichen deutschen Textdateien** ist abgeschlossen. Die gefundenen strukturellen Fehler und eindeutigen OCR-Fehler sind korrigiert; jede verbleibende automatische Fundstelle hat eine dokumentierte Entscheidung. Dies ist **kein vollständiges manuelles Korrektorat sämtlicher 213.000 Absätze gegen ihre Druckvorlagen** und keine Zusicherung völliger Fehlerfreiheit.

## Umfang und Ergebnisse

- Die vier vom Nutzer gelieferten Philippson-Korrekturfassungen wurden eingearbeitet. Alle 27 ursprünglichen Bild- und Beschriftungsblöcke dieser Dateien bleiben erhalten.
- Vermischte Kommentarblöcke in Philippson, 1 Samuel 19, 28 und 31, 2 Samuel 4 sowie Jesaja 19 wurden anhand der Originalscans rekonstruiert. Weitere Einleitungen und erste Kommentare wurden an ihren ausdrücklich erhaltenen Kapitelnummern wieder richtig zugeordnet. Die einzelnen Schritte stehen in `reports/philippson-restored-commentary.json`.
- Herxheimers Kommentare zu Psalm 45–53 wurden mit den Druckseiten 61–73 des Hagiographenbandes verglichen, richtig zugeordnet und ergänzt. Die Korrektur ist sowohl im eigenständigen Kommentar als auch in den Fußnoten der Bibelausgabe enthalten. Der Wortlaut des übersetzten Bibeltextes wurde dabei unverändert gehalten.
- Weitere eindeutige OCR-Dopplungen, beschädigte HTML-Auszeichnungen und eingelesene Drucksignaturen wurden berichtigt. Historische Rechtschreibung wird nicht pauschal modernisiert.
- Die beiden doppelten Graetz-Quellabschnitte sind als `editorialSectionAliases` gekennzeichnet: 279 → 278 und 334 → 332. Ihre Absatzpositionen bleiben für bestehende Verweise erhalten. Der Importer behandelt Fußnotenfragmente künftig nicht mehr als eigene Seiten.
- Alle **589 Bildvorkommen** bleiben mit ihren ursprünglichen Bilddaten erhalten. Abbildungen aus vermischten Blöcken stehen wieder beim zugehörigen Kommentar; dabei werden auch unterschiedliche vorhandene Bildvarianten aufbewahrt.
- Die verbleibenden Wortwiederholungen und Parallelstellen werden mit Begründung in `reports/german-review-decisions.json` aufbewahrt. Grammatische Wiederholungen, biblische Wiederholung und Fußnotengrenzen werden nicht automatisch gelöscht.

## Quellen und Nachvollziehbarkeit

Philippson: [eScriptorium-Projekt](https://ocr-bw.bib.uni-mannheim.de/escriptorium/project/philippson/), Originalscans von Band II und III unter den BSB-IDs `bsb10481773` und `bsb10481774`. Die gedruckten Seiten und Bild-URLs stehen in den Berichten.

Herxheimer: [eScriptorium-Projekt](https://ocr-bw.bib.uni-mannheim.de/escriptorium/project/herxheimer/), Hagiographen, Dokument 6489, Bildfolge `uc1_a0003658481`. Die Berichte enthalten Quellenkennungen und Änderungen, keine API-Zugangsdaten.

`german-audit-before-sweep.json` bewahrt das ursprüngliche Bildinventar und die ursprünglichen Zählwerte nach Übernahme der vier gelieferten Entwürfe. Der aktuelle Bericht ist `german-audit.json`. Änderungen an Fußnotenzahlen sind nachvollziehbare Folgen der Entfernung fremder Wiederholungen und der Gruppierung richtiger Anmerkungen beim tatsächlichen Vers; Fußnotenzahlen allein sind deshalb kein Vollständigkeitsmaß.

## Prüfungen wiederholen

```sh
python3 app/tools/editorial/audit_german.py
python3 app/tools/editorial/check_commentary_structure.py
node --test app/tests/editorial-german-images.test.js
node app/tests/integration/interlinear-corpus.cjs
```

Der Korpustest liest die aktuellen Quellen direkt: Er prüft alle 419 Dateien und ihre Prüfsummen, sämtliche 589 Bildvorkommen, die vollständigen 27 ursprünglichen Bild-/Beschriftungsblöcke der gelieferten Philippson-Bücher, die protokollierten Struktur-/Fußnotenänderungen und konkrete wiederhergestellte Kommentarstellen. Die Integrationsprüfung kontrolliert die deutschen Wortzuordnungen gegen ihre Übersetzungstexte und den hebräischen Grundtext.
