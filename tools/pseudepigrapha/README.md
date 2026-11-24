# Griechische frühjüdische Literatur

| Werk / Textzeuge | Quellabschnitte | Griechische Leserwörter | Stanza | OGA | Ohne Analyse |
| --- | ---: | ---: | ---: | ---: | ---: |
| Zwölf Testamente (alle zwölf) | 993 | 20.008 | 19.994 | 0 | 14 |
| Pseudo-Phokylides (230 Verse) | 230 | 1.565 | 1.559 | 0 | 6 |
| 3 Baruch (Prolog und 17 Kapitel) | 128 | 3.139 | 3.136 | 0 | 3 |
| Henoch: 7QEnoch (OCP-Zuordnung) | 2 | 20 | 10 | 0 | 10 |
| Henoch: POxy2069 | 10 | 95 | 69 | 0 | 26 |
| Henoch: CB185 | 114 | 2.736 | 2.537 | 0 | 199 |
| Henoch: V1809 | 8 | 199 | 198 | 0 | 1 |
| Henoch: Gizeh | 232 | 5.354 | 3.733 | 1.615 | 6 |
| Henoch: Gizeh2 | 16 | 267 | 267 | 0 | 0 |
| Henoch: Syncellus | 18 | 565 | 563 | 0 | 2 |
| Henoch: Judas-Zitat | 1 | 35 | 35 | 0 | 0 |
| **Gesamt** | **1.752** | **33.983** | **32.101** | **1.615** | **267** |

Die Zahlen bezeichnen technische Zuordnungsabdeckung, keine Genauigkeit der automatischen Morphologie. Keine redaktionelle Wort-für-Wort-Prüfung und kein neuer Druckabgleich. Bei den Testamenten kennzeichnet bereits OCP den Wikisource-Text als vorläufig und noch nicht am Charles-Druck kollationiert; dieser Hinweis steht auch in Versionsname und Wortfenster.

## Anzeige und Gliederung

Die zwölf Testamente stehen als griechische Fassung im vorhandenen Kautzsch-Werk, mit denselben zwölf Testament-Knoten. Deutsche Texte und bestehende deutsche Zusatzknoten werden nicht geändert. Kapitel- und Versnummern der griechischen Quelle bleiben erhalten. Der Wortklick zeigt Lemma, Grammatik, automatische Herkunft, Originalstelle und Wörterbuchzugang.

**Pseudo-Phokylides** ist ein eigenes Werk mit allen 230 Quellversen, nicht der archaische Phokylides. **3 Baruch** bleibt ein eigenes Werk mit seiner ursprünglichen Zählung und Prolog; es wird nicht mit dem syrischen 2 Baruch vermischt. Kautzschs vorhandene Sammlung *Die Baruch-Apokalypsen* bleibt unverändert.

Die acht griechischen Henoch-Zeugen sind getrennte Fassungen unter *Das Buch Henoch*. Leere Kapitel sind Überlieferungslücken und werden nicht aus äthiopischen, aramäischen oder anderen griechischen Zeugen aufgefüllt. Die Bezeichnung 7QEnoch wird als OCP-Zuordnung übernommen, nicht eigenständig bestätigt. 106:17b bleibt mit sichtbarer Originalbezeichnung im Leser-Vers 106:17; seine Morphologie behält den eigenen Schlüssel. In den fünf Fällen mehrfacher Lesarten desselben Zeugen wird OCPs `option=0` im Lesetext verwendet, die Alternativen bleiben im Wortfenster separat zugänglich. Die originalen Titel stehen in `sourceTitles`.

## Quellen und Analysen

Text: OCP-XML, festgelegter Commit `954a1f057c2426ad2f049b135600712812516242`. Alle vier Dateien werden per SHA256 geprüft. Es werden ausschließlich die griechischen Schichten und ausdrücklich zugehörige Zeugen gelesen. Die XML-Texte werden NFC-normalisiert und escaped; Wortlaut und historische Namensformen werden nicht korrigiert.

Wo keine offene fertige Morphologie vorlag, wird **Stanza 1.11.0 (Perseus-Formtags, PROIEL-Lemmata)** verwendet. Die Generierung ist vom Lesetext und vom normalen Build getrennt. Die ursprünglichen Formen, Lemmata, XPOS, UPOS und UFeats sowie Quelltext-Hashes werden aufbewahrt. Das Programm prüft unveränderte Token- und Abschnittsfolgen. Beschädigte Wörter, mit eckigen/Spitzklammern gekennzeichnete Ergänzungen, Unterpunktierungen und abgebrochene Bindestrichformen erhalten keine Analyse. Einzelne nicht sicher verwertbare Modellanalysen bleiben ebenfalls leer.

Für **1.615 Wörter** in vollständigen, exakt passenden Gizeh-Versen wird die vorhandene OGA-Analyse verwendet. Abgleich: gleiche Versnummer, gleiche vollständige Folge einschließlich Akzenten (NFC, Groß-/Kleinschreibung, Schluss-Sigma und Elisionszeichen normalisiert); keine Übertragung auf andere Henoch-Zeugen. Unterschiedlicher Wortlaut behält die separat erzeugte Stanza-Analyse.

Lizenzen und Zuschreibung: [LICENSE-PSEUDEPIGRAPHA.md](../../LICENSE-PSEUDEPIGRAPHA.md). Die Stanza-Schicht steht getrennt unter CC BY-NC-SA 4.0, OGA-Einträge unter CC BY-SA 4.0; die jeweiligen Lesetexte behalten ihre OCP-/Wikisource-Lizenzen. Keine Modellgewichte und keine NLP-Abhängigkeiten werden mit der App ausgeliefert. Die Oberfläche lädt die Analyse-Datei erst bei Bedarf; die Konkordanz verwendet dieselben quellgebundenen Positionen. Wörterbücher erschließen die gespeicherten Lemmata, keine neuen deutschen Übersetzungen.

## Reproduzierbarer Build

```
python3 tools/pseudepigrapha/build.py /tmp/safran-pseudepigrapha --fetch
python3 tools/pseudepigrapha/build.py /tmp/safran-pseudepigrapha --check
python3 -I tools/pseudepigrapha/test_build.py
node --test tests/pseudepigrapha.test.js tests/greek-corpus.test.js tests/aristeas.test.js tests/concordance.test.js
npm test
SAFRAN_SMOKE_GREEK=1 npm run test:smoke
```

Für die erneute Modellinferenz zusätzlich eine isolierte Python-Umgebung mit `stanza==1.11.0` verwenden. Griechische Ressourcen 1.11.0, Prozessoren `pos=perseus_nocharlm`, `lemma=proiel_nocharlm`, Pretrain `conll17`; die erwarteten Modell-SHA256 stehen in `annotation-source.json`. Aufruf: `python tools/pseudepigrapha/annotate.py CACHE MODELDIR`. Danach den Builder erneut ausführen. Die gespeicherte Annotation erlaubt den normalen Build ohne Modellinstallation.

## Prüfumfang und offene Stellen

`coverage.json` enthält **jeden** Quellabschnitt aller elf Fassungen, Wortzahlen je Analyseschicht und jede offene Wortposition mit Grund. Keine Verse werden pauschal übersprungen. Die 267 Wörter ohne Analyse sind darin einzeln aufgeführt. Der Bericht ist keine Liste bestätigter Druckfehler; es wurden keine Textkorrekturen vorgenommen.

Die Node-Tests gehen sämtliche Leserwörter durch, prüfen Quellstellen, Hashes, Gruppierung, getrennte Zeugen, Varianten, Buchstabenverse, Fragmentlücken und die Herkunft der Konkordanztreffer. Veränderte Texte oder fremde Analyse-Assets werden abgewiesen. Die Electron-Prüfung verwendet echte Wortklicks in allen vier Werkgruppen und prüft Quellenhinweis, Markierung und Wörterbuchlemma; zusätzlich laufen die bestehenden Josephus-/Philo-/Aristeas-Prüfungen. Fehlende Morphologie und der vorläufige Textstatus bleiben sichtbar.

Die Sichtprüfung ergab zwölf zweifelhafte Stanza-Bestimmungen des einleitenden „Ἀντίγραφον“. Sie bleiben ohne Ersatzanalyse; `review-exclusions.json` bewahrt Position, unveränderte Modellanalyse und Prüfgrund. Diese zwölf Positionen sind in den offenen 267 Wörtern enthalten. Der Text bleibt unverändert.

Lesbare Liste sämtlicher offener Positionen: [REVIEW.md](REVIEW.md). Technischer Abschlussstand vom 24. November 2026: vollständiges `npm test` erfolgreich (Legacy-Prüfprogramme und 271 Node-Tests; keine Fehler oder übersprungenen Tests), drei Python-Quellsicherheitstests erfolgreich, lokaler `--check` und frischer Quellenabruf mit `--fetch --check` bytegleich. Der griechische Electron-Ablauf unter 45.3.4 bestand mit allen vier neuen Werkgruppen sowie Josephus-/Philo-/Aristeas-Regressionen. Die Aufnahme des markierten διαθήκης mit Grundform διαθήκη, Quellenhinweis und Wörterbuchknopf wurde visuell kontrolliert. Diese Prüfungen bestätigen die technische Einbindung; sie ersetzen keine vollständige philologische Prüfung der automatischen Analysen.
