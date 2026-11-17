# Berachot: Goldschmidt und Pinner – Wortzuordnung im Test

Gesicherter Zwischenstand auf ausdrücklichen Wunsch des Nutzers (17.11.2026). Die weitere Erfassung ist angehalten. Beide deutschen Lesetexte für **2a–10b** sind vollständig erhalten; **eine vollständige philologische Wortprüfung aller 18 Blattseiten wird nicht behauptet**.

**2a–3b** sind in beiden Fassungen von Hand in kleine Wort-/Sinngruppen zugeordnet. Weitere gezielt geprüfte Stellen stehen unter anderem in 5a:3/10/16, der Huna-Erzählung 5b:17–20, 7a:30, 8a, 9a:13 und 10a:2–3/26/31. Die Daten enthalten den Prüfstatus je Gruppe. Von insgesamt **38.212 deutschen Wörtern** haben 9.313 eine geprüfte Zuordnung, 17.384 einen maschinellen Vorschlag und 11.515 eine offene Zuordnung. Das sind deutsche Wörter beider Fassungen zusammen, keine Zahl hebräischer Quellwörter.

In Safran bei Berachot 2a–10b: **Wortzuordnung · Test**. Alternativ [preview.html](preview.html) lokal öffnen. Standardmäßig werden nur geprüfte Entsprechungen unterlegt; Vorschläge müssen ausdrücklich eingeblendet werden. Die vollständigen deutschen Lesetexte bleiben daneben sichtbar. Ein Klick verbindet die Wörter auch über abweichende Segmentgrenzen hinweg.

## Quellen und Methode

- Hebräisch/Aramäisch: unveränderte vokalisierte William-Davidson-Ausgabe, wie in `../berakhot/source.json`.
- Deutsch: Goldschmidt (1929), über die öffentliche Sefaria-API, und Pinner (1842), aus Safrans vorhandener Ausgabe. Übersetzungsfußnoten und ihre Marker gehören nicht zum hier zugeordneten Lesetext. Originalschreibung bleibt erhalten.
- `source.json`: vollständige normalisierte deutsche Lesetexte des Bereichs, getrennt nach ursprünglichen Segmenten.
- `alignment-*.json`: deutsche Lesereihenfolge; `he` enthält explizite Wortanker `Blatt:Segment/Token`, z.B. `5b:18/6`. Token zählen ursprüngliche Whitespace-Positionen einschließlich Satzzeichen. Keine Westminster-Nummern und keine Strong-IDs.
- `reviewed`: Wort-/Sinngruppe tatsächlich im Originalkontext geprüft. `machine`: lexikalisch gestützter automatischer Vorschlag, noch nicht kontextgeprüft. `uncertain`: Entsprechung offen; ein leeres `he` ist dabei **kein Nachweis eines Übersetzerzusatzes**. Eine geprüfte Gruppe ohne Anker bezeichnet dagegen tatsächlich einen Zusatz oder ein im Original nicht einzeln ausgedrücktes Hilfswort.
- Automatische Vorschläge nutzen lexikalische Startentsprechungen, Kontext-/Ko-Okkurrenzmodelle und Disambiguierung innerhalb lokaler Blöcke. Sie bleiben Vorschläge; ein formaler Rekonstruktionstest validiert nicht ihre Bedeutung.

## Prüfstand (deutsche Wörter, beide Fassungen)

| Blatt | Geprüft | Vorschlag | Offen |
|---|---:|---:|---:|
| 2a | 932 | 0 | 0 |
| 2b | 1541 | 0 | 0 |
| 3a | 1488 | 0 | 0 |
| 3b | 1770 | 0 | 0 |
| 4a | 0 | 368 | 1110 |
| 4b | 0 | 501 | 1439 |
| 5a | 377 | 1533 | 811 |
| 5b | 376 | 1070 | 633 |
| 6a | 0 | 1238 | 823 |
| 6b | 0 | 1455 | 956 |
| 7a | 92 | 1899 | 1173 |
| 7b | 18 | 1479 | 1015 |
| 8a | 1706 | 447 | 178 |
| 8b | 123 | 1135 | 476 |
| 9a | 174 | 1216 | 539 |
| 9b | 176 | 1511 | 523 |
| 10a | 434 | 1577 | 908 |
| 10b | 106 | 1955 | 931 |

Die Rekonstruktion prüft den vollständigen deutschen Wortlaut beider Fassungen auf jeder Blattseite. Alle Anker müssen innerhalb derselben Blattseite existieren. Auslassungen oder noch nicht zugeordnete hebräische Wörter werden nicht durch erzwungene Paarungen verdeckt.

Die Verschiebungen in 3a, 3b und 5b:17–20 sowie die abweichenden deutschen Deutungen von נשרא in 8a:13 bleiben ausdrücklich erhalten. Die unabhängige Stichprobe in 2a–3a fand eine vertauschte Zahl-/Substantivzuordnung in Goldschmidt 2a:5; sie wurde korrigiert.

## Bauen und Prüfen

```sh
python3 tools/bavli/interlinear/build.py
node test43.js
npm test
```

Erzeugt `bavli-il-data.js` und `coverage.json`; der Viewer `bavli-il-view.js` ist vom Tanach-Interlinear getrennt. Datentreue, Anker und das Ausblenden ungeprüfter Vorschläge werden getestet. Eine visuelle Browserprüfung konnte in dieser Sitzung nicht abgeschlossen werden: Der Browserzugriff auf lokale Datei-URLs wurde gesperrt.
