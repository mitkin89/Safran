# Aristeasbrief: griechischer Text und Morphologie

Alle 322 Abschnitte stehen als griechische Fassung neben dem vorhandenen deutschen Kautzsch-Text im Werk **Letter of Aristeas**. Ein Wortklick zeigt das belegte Lemma und die automatische GLAUx-Bestimmung mit Herkunftshinweis; der Wörterbuchknopf schlägt das Lemma in den ausgewählten Wörterbüchern nach. Die Lesefassung enthält 12.931 griechische Wörter, davon 12.785 mit zugeordneter Analyse (98,87 %). 146 Wörter bleiben ohne Bestimmung, darunter die 42 Wörter des in GLAUx fehlenden Abschnitts 43.

## Quellen und Rechte

- Lesetext: H. St. J. Thackeray (1914), über **Online Critical Pseudepigrapha**, herausgegeben von Ian W. Scott und Ken M. Penner; Aristeas-Ausgabe David M. Miller, ursprünglicher elektronischer Text Craig A. Evans. Druck gemeinfrei, OCP-Textrepository **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/ . Quelle: https://github.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/blob/master/static/docs/LetAris.xml . Nur der griechische Text wird importiert, nicht die englische oder französische Fassung.
- Automatische Lemmata und Morphologie: **GLAUx**, Alek Keersmaekers und Mitwirkende, https://github.com/alekkeersmaekers/glaux . Allgemeine Korpuslizenz **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/ . GLAUx nennt für seinen Wikisource-Ausgangstext 1183-001 **CC BY-SA 3.0**, https://creativecommons.org/licenses/by-sa/3.0/ . Diese Herkunft bleibt ausdrücklich erhalten. Keine Gorman- oder sonstigen manuellen Treebank-Analysen werden für dieses Werk verwendet.
- Zitierhinweis: Alek Keersmaekers (2021), *The GLAUx corpus: methodological issues in designing a long-term, diverse, multi-layered corpus of Ancient Greek*, https://doi.org/10.18653/v1/2021.lchange-1.6 .

Safrans Änderungen: NFC-Normalisierung, XML-Extraktion, HTML-Escaping, Erhaltung der Abschnittsnummern, konservativer Wortabgleich innerhalb desselben Abschnitts und kompakte Kodierung der zugeordneten Analysen. Keine Textkorrekturen; keine automatische Ergänzung fehlender Analysen. Abhängigkeitssyntax wird nicht importiert. Der bestehende deutsche Text bleibt bytegleich.

Die Versionsinformationen nennen beide Quellen. Festgelegte Quellstände und SHA256-Prüfsummen stehen in `sources.json`. Die Datenlizenzen gelten unabhängig von Safrans MIT-Code-Lizenz.

## Neu bauen

Im Repository-Hauptverzeichnis:

```
python3 tools/aristeas/build.py /tmp/safran-aristeas --fetch
python3 tools/aristeas/build.py /tmp/safran-aristeas --check
python3 -I tools/aristeas/test_build.py
node --test tests/aristeas.test.js tests/greek-corpus.test.js
npm test
SAFRAN_SMOKE_GREEK=1 npm run test:smoke
```

Der Fetch-Modus lädt ausschließlich die festgelegten Quellstände. Vor jeder Verarbeitung werden die Prüfsummen geprüft. Alternativ die beiden Quelldateien als `ocp.xml` und `glaux.xml` in das Cache-Verzeichnis legen. Der Builder aktualisiert nur die neue griechische Fassung, deren Manifest-Eintrag und die zugehörigen Prüfberichte.

## Prüfumfang

`coverage.json` dokumentiert jeden einzelnen der 322 Abschnitte einschließlich der nicht zugeordneten Wörter. `REVIEW.md` listet sämtliche erkannten Quellenabweichungen und offenen Wortpositionen. Die Quellen werden nur bei identischem Wortlaut zugeordnet; unterschiedliche Akzente, abweichende Wörter und nicht passende Wortgrenzen bleiben ohne Analyse. Es gibt keinen Rückgriff auf andere Abschnitte oder häufige Wortformen.

Die Tests prüfen alle angezeigten Wörter, Nummerierung, Manifest- und Text-Hashes, Import/Lesen, automatische Herkunft und Schutz vor verändertem Wortlaut. Die Electron-Prüfung deckt den echten Wortklick, Wortmarkierung, GLAUx-Hinweis, Wörterbuchzugriff und Abschnitt 43 ohne Analyse ab. Das ist eine technische Zuordnungsprüfung; keine manuelle philologische Bestätigung der automatischen GLAUx-Bestimmungen.

Geprüfter Stand vom 24. November 2026: vollständiges `npm test` erfolgreich (alle Legacy-Prüfprogramme und 260 Node-Tests, keine fehlgeschlagenen oder übersprungenen Tests); drei Python-Abgleichstests erfolgreich; Neuabruf mit `--fetch --check` und lokaler `--check` erfolgreich. Der griechische Electron-Ablauf bestand unter Electron 45.3.4, einschließlich Josephus/Philo-Regressionsprüfungen und Aristeas. Die Aufnahme des markierten Wortes mit GLAUx-Fenster wurde visuell kontrolliert. Alle 322 Aristeas-Abschnitte sind im technischen Prüfumfang enthalten; fehlende Analysen werden ausdrücklich mitgezählt.
