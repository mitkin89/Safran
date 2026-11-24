# Prüfung der Syntax-Datenabdeckung

Die Prüfung bezieht sich auf den Safran-Stand `a882277` vor der Verbesserung der Zuordnung. Der maschinenlesbare, reproduzierbare Bericht liegt unter `tools/tanakh-syntax/alignment-audit.json` und enthält alle 1.142 damals nicht gemeinsam zugeordneten Quellreferenzen einzeln.

| Messgröße | Vorher | Nachher |
|---|---:|---:|
| Gemeinsam zugeordnete Verse im Safran-Lesetext | 22.071 | 23.196 |
| Verse im Safran-Lesetext insgesamt | 23.206 | 23.206 |
| MACULA-Quellreferenzen mit bestätigter Lesefolge | 22.081 / 23.213 | 23.213 / 23.213 |
| BHSA-Quellreferenzen mit bestätigter Lesefolge | 22.077 / 23.213 | 23.203 / 23.213 |

**1.125 zusätzliche Verse** erhalten damit eine gemeinsam verifizierte Textzuordnung. Das sind rund **99,96 % der 23.206 Verse des Lesetexts**. Diese Quote misst die Textzuordnung und das Vorhandensein von BHSA-Klauseldaten, nicht die Vollständigkeit sämtlicher Wortmerkmale, Satzglieder oder Referenzketten.

## Ursachen

Die Hauptursache sind ausdrücklich markierte Ketiv-/Qere-Varianten. Der importierte Safran-Text enthält beide Formen nacheinander; MACULA folgt dem Qere, BHSA dem Ketiv. Beim bisherigen Vergleich mit der vollständigen Zeichenfolge erschien die jeweils andere Form deshalb als zusätzliches Wort. Die Prüfung weist 1.108 der früheren Lücken primär dieser Ursache zu, 33 den Versgrenzen und eine einer anderen BHSA-Konsonantenfolge. Bei einzelnen Stellen überschneiden sich Ursachen; der Bericht hält sie getrennt fest.

Die bisher verwendete Zahl 23.213 zählt Quellreferenzen. Safrans umgestellter Lesetext hat 23.206 Verse. Beispielsweise entsprechen die Quellverse Exodus 20:13–16 gemeinsam dem Lesevers 20:13. Die folgenden Quellreferenzen werden entsprechend verschoben. Entsprechende Zusammenfassungen betreffen Deuteronomium 5; Numeri 25:19 steht im Lesetext am Anfang von 26:1. Die Differenz von sieben Referenzen ist kein Verlust von Text.

## Nachweis und Schutzregeln

Die ursprünglichen OSHB-Dateien stammen aus `openscriptures/morphhb`, Revision `db6c5c9b46b8f39346f10915ddb1a70dcd429901`. Alle 39 Dateien werden anhand ihrer SHA-256-Prüfsummen geprüft. Ihre vollständige Wortfolge einschließlich beider Varianten stimmt exakt mit den unveränderten Safran-Wörtern überein. Erst danach werden originale `x-ketiv`- und `x-qere`-Markierungen den bestehenden Wortpositionen zugeordnet. Die kompakte Nachweisdatei `bundled/syntax-alignment.json.gz` enthält Dateiprüfsummen, Wortfolgen-Hashes, Quellversgrenzen und Varianten-IDs.

Die Syntax-Builder vergleichen ausschließlich exakte Konsonantenfolgen auf der jeweiligen belegten Lesefolge. Wortteilung und Versgrenzen werden über Zeichenpositionen projiziert. MACULA darf nur vollständige Lesewörter beanspruchen; BHSA-Slots dürfen Teile eines Leseworts beitragen, dessen Klauselzuordnung erst bei vollständiger Abdeckung entsteht. Bei unterschiedlicher Zeichenfolge wird die betreffende Quelle nicht übertragen. Ein geänderter lokaler Text macht einen alten Nachweis ungültig.

Ketiv und Qere behalten **verschiedene Wortpositionen**. Eine BHSA-Klauselzugehörigkeit des Ketivs wird nicht auf das Qere kopiert. Deshalb bleiben kombinierte Abfragen an Variantenstellen teilweise unbekannt, selbst wenn beide Lesungen auf denselben Vers verweisen. Wortabstände zählen die ausgewählte Lesefolge und behandeln die andere Variante nicht als zusätzliches aufeinanderfolgendes Wort. Treffererklärungen nennen an Variantenstellen die Lesebasis; Satzbäume zeigen abweichende Quellversnummern.

Die bereits mitgelieferten Texte und ihre Morphologie werden durch diese Maßnahme nicht geändert. Die 20 semantischen Arbeitszuordnungen werden nicht erweitert und bleiben ausdrücklich nicht unabhängig geprüft.

## Bewusst nicht übertragene BHSA-Stellen

| Buch | Quellreferenz | Unterschied |
|---|---|---|
| Jesaja | 9:6 | Offenes/geschlossenes Mem in למרבה / לםרבה |
| Jeremia | 18:3 | Unterschied in der Folge הן / הנה |
| Ezechiel | 4:6 | הימוני / הימיני |
| Ezechiel | 43:11 | צורתו / צורתיו |
| Hiob | 38:1 | Nun-Schlussform bei der Worttrennung מן / מנ… |
| Hiob | 40:6 | Nun-Schlussform bei der Worttrennung מן / מנ… |
| Daniel | 10:19 | וכדברו / ובדברו |
| Esra | 10:44 | נשאו / נשאי |
| Nehemia | 2:13 | Mem-Schlussform bei der Worttrennung הם / המ… |
| 1. Chronik | 27:12 | Nun-Schlussform bei der Worttrennung בן / בנ… |

Auch wahrscheinlich erklärbare Schreib- oder Schlussformunterschiede werden derzeit nicht pauschal normalisiert. Ihre Prüfung ist der verbleibende Arbeitsschritt. Die Abdeckungsanzeige nennt die jeweils ausgewählten betroffenen Bücher und zeigt die vollständigen unterschiedlichen Konsonantenfolgen.

## Reproduzieren

```sh
python tools/tanakh-syntax/alignment-proof.py /path/to/verified/oshb-source --fetch
python tools/tanakh-syntax/build.py /path/to/pinned/macula/WLC/lowfat
node tools/bhsa/build.js /path/to/pinned/bhsa/tf/2021
python tools/tanakh-syntax/audit.py --baseline a882277
python tools/tanakh-syntax/test_projection.py
node --test tests/syntax-alignment.test.js tests/bhsa-index.test.js
```

Mit `--fetch` lädt das Werkzeug ausschließlich die festgelegte Revision herunter und prüft ihre Dateiprüfsummen. Ohne diesen Schalter werden vorhandene lokale Quellen verwendet. Der OSHB-Quellordner enthält die 39 XML-Dateien und optional `sources.json` mit der festgehaltenen Revision, Buchzuordnung und den Prüfsummen aus der Nachweisdatei. Die übrigen Quellenrevisionen bleiben unverändert: MACULA `47db250bd55d0d8577f2a94fba114ef16c35b23c`, BHSA `4db00e2157915495e1a4d3d57e41223df24775da`.
