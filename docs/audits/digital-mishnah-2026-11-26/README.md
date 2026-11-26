# Digital Mishnah: Prüfung der Wortzuordnung

Geprüft am 26. November 2026, exemplarisch Berakhot 1,1 (`1.1.1.1`).

## Ergebnis

Digital Mishnah hat bereits Wortgrenzen, Normalisierungsregeln und eine
maschinelle Kollationsverarbeitung. Safrans derzeitige offenen Stellen bedeuten
deshalb nicht, dass das Projekt keine Zuordnung ermöglicht. Unser Import und
unsere strengeren Vergleichsregeln erklären einen Teil der offenen Stellen.

Die lokale Reproduktion der Projektaufbereitung mit CollateX ordnet zu:

| Kaufmann | Parma | Cambridge | Befund |
| --- | --- | --- | --- |
| כל | וכל | כל | Dieselbe Spalte; die Normalisierung entfernt ו. |
| בתרומתן | בתרומתן | בתרוד | Cambridge enthält im Original eine Lücke von fünf Zeichen innerhalb eines TEI-Wortes. |
| מבית | מבית | מבה | Cambridge enthält eine Lücke von sieben Zeichen und ein hochgestelltes ה innerhalb eines TEI-Wortes. |
| חכמ' | חכמים | חכמים | Beide späteren Vorkommen werden jeweils gemeinsam angeordnet. |
| העבירה | העבירה | העב | Das erhaltene Cambridge-Fragment wird an der erwarteten Stelle angeordnet. |

Die Vergleichsformen `בתרוד` und `מבה` sind keine vollständigen Lesungen:
Der Projekt-Tokenizer lässt Lücken und Beschädigungsmarkierungen im
Vergleichstext weg. Safran muss die überlieferten Fragmente und Lücken weiterhin
sichtbar halten. Die Zuordnung einer Spalte ist außerdem keine manuelle
Bestätigung einer Lesart.

## Was tatsächlich geprüft wurde

- Datenstand: `39389be30e93032d722e8dd3b7bcdfe15e76a421` aus
  [mishnah-data](https://github.com/umd-mith/mishnah-data).
- Programmstand: `60792f6078128ba15a741d2ec3ac013784d07e0c` aus
  [mishnah](https://github.com/umd-mith/mishnah).
- Die Projektfunktion `ws2j:getTokenData("1.1.1.1", ("S07326", "S00483", "S01520"), "nw")`
  wurde lokal auf den drei projektseitigen `w-sep`-Dateien ausgeführt.
- Saxon HE 10.9 führte die XQuery-Aufbereitung aus; CollateX Java 1.7.1
  berechnete Needleman–Wunsch mit getrennten Tokens (`-t`). Nashorn 15.4 mit
  ASM 7.3.1 stellt die unter Java 18 fehlende JavaScript-Engine bereit.
- Ergebnis: 95 Kaufmann-, 95 Parma- und 90 Cambridge-Tokens in 96 Spalten.
  Alle 280 Eingabetokens sind genau einmal und in ihrer ursprünglichen
  Reihenfolge im Ergebnis enthalten.

Das ist eine lokale Reproduktion, keine abgerufene Antwort der Live-Demo.
Die damals eingesetzte CollateX-Serverversion ist damit nicht bewiesen. Die
offizielle Live-Demo war während der Prüfung mit HTTP 502 nicht erreichbar.
Der alte im Quelltext genannte externe CollateX-Endpunkt wurde nicht benutzt.

## Anpassungen für die lokale Ausführung

Der ursprüngliche eXist-XQuery-Modultext wurde nur temporär angepasst:
Moduldeklaration in eine Hauptabfrage umwandeln, eXist-Imports entfernen,
lokalen Datenpfad und die dort vorgegebenen map/array-Namensräume deklarieren,
`boundary-space` in den Saxon-Prolog verschieben, zwei mehrteilige Textfolgen
vor `matches` mit `string-join` verbinden, JSON-Ausgabeeinstellung anpassen
und die Witness-Folge explizit als JSON-Array serialisieren. Die
Normalisierungs- und Kollationsregeln wurden nicht verändert.

Die JSON-Dateien daneben enthalten den erzeugten Vergleichseingang und das
CollateX-Ergebnis. `provenance.json` hält Quellstände und SHA-256 fest.
Die temporären Java-Bibliotheken und der Projektprogrammtext werden nicht
mit Safran ausgeliefert.

## Grenzen und Konsequenzen für Safran

1. **Wortgrenzen übernehmen:** Die projektseitigen TEI-`w`-IDs sind die geeignete
   Grundlage. Unser Regex-Tokenizer zerlegt beispielsweise `בתרו … ד` und
   `מב … ה`; diese Teile gehören im Projekt zu je einem Wort. Lücken außerhalb
   von `w` brauchen weiterhin eine eigene Position in der Darstellung.
2. **Normalisierung vorsichtig nutzen:** Das Projekt entfernt sämtliche י und ו,
   wandelt finales א in ה und ם in ן um und verwendet weitere Wortgruppenregeln.
   Das erklärt zusätzliche Treffer, kann aber unterschiedliche Formen
   zusammenfallen lassen. Es ersetzt keine philologische Prüfung.
3. **Korrekturschichten abgleichen:** Die Eingabe enthält h1/h2-Tokens
   (Kaufmann 2/1, Parma 2/0, Cambridge 0/1). Safran zeigt bislang den korrigierten
   Textstand. Die Tokenzahlen und Positionen sind daher nicht direkt austauschbar.
4. **Referenzen abgleichen:** Eine erfolgreiche Kollation von Berakhot 1,1
   beweist keine sichere kapitelweite Zuordnung. Cambridge hat zusätzliche
   Einheiten; identische Einheitennummern reichen nicht als Nachweis.
5. **Keine pauschale Übernahme:** Der geprüfte veröffentlichte Baum enthält
   gespeicherte Kollationen anderer Stellen, aber keine `1.1.*`-Kollation für
   Berakhot. Der Programmcode verwendet andernfalls CollateX. Hier liegt
   daher kein nachgewiesener, vollständig redaktionell geprüfter Berakhot-
   Wortapparat vor.

Der nächste sinnvolle Implementierungsschritt ist eine Brücke zwischen
Originaltranskription und projektseitigen Wort-IDs, mit erhaltenen Lücken und
Korrekturschichten. Erst danach lassen sich die automatischen Vorschläge
sauber mit Safrans konservativen Zuordnungen vergleichen. Die Laufzeitdaten
wurden durch diese Prüfung nicht verändert.

## Quellen und Attribution

Nach dieser Prüfung umgesetzt: Safran verwendet die Projekt-Aufbereitung mit
CollateX für ganze Kapitel und eine Brücke zu den unveränderten Originalfragmenten.
Die erste Umstellung verringerte die offenen Tokens bei Parma von 137 auf 0 und
bei Cambridge von 259 auf 38.

Die anschließende Einzelprüfung klärte die 38 verbleibenden Fälle:

- 36 gap-only Tokens werden zwischen den unmittelbar benachbarten Quellwörtern
  positioniert. Sie erhalten keine erfundenen Buchstaben und kein behauptetes
  lexikalisches Gegenstück. Lücken innerhalb eines Projektworts bleiben im
  betreffenden Wortverband; externe Lücken erhalten eine eigene gedämpfte Spalte.
- Die zwei scheinbaren Quellunterschiede waren ein Aufbereitungsfehler:
  `choice/orig/orig` beim Namen `לַעְזַר` in Cambridge 1:5 wurde vom Projekt-
  Dispatcher verworfen. Das ursprüngliche XML und die Wortdatei enthalten den
  Namen übereinstimmend. Die fehlende Vergleichsform störte zusätzlich die
  Zeichenbrücke für das vorausgehende `ר׳`.
- Die lokale Aufbereitung steigt jetzt rekursiv in `orig` hinab. Die neue
  Cache-Provenienz benennt diese Abweichung ausdrücklich; Vergleichsalgorithmus
  und Normalisierungsregeln bleiben erhalten. Die historischen JSON-Beispiele
  dieses Berichts dokumentieren weiterhin die ursprünglich reproduzierte
  Projektverarbeitung ohne diesen Fix.

Aktueller Stand: Parma 2.124 verknüpfte Tokens und 47 Zusätze; Cambridge 2.116
verknüpfte Tokens, 49 Zusätze und 36 gesondert positionierte Lücken. In beiden
Zeugen bleiben keine Quelltokens ohne Anzeigeplatz. Alle Originaltokens werden
in ihrer ursprünglichen Reihenfolge genau einmal dargestellt; automatische
Platzierungen werden nicht als manuell geprüft ausgewiesen.
Siehe `app/tools/mishnah/README.md` für den reproduzierbaren Build.

- [Kollationsaufruf und Auswahl gespeicherter Ergebnisse](https://github.com/umd-mith/mishnah/blob/60792f6078128ba15a741d2ec3ac013784d07e0c/modules/compare.xql)
- [Tokenisierung und Normalisierung](https://github.com/umd-mith/mishnah/blob/60792f6078128ba15a741d2ec3ac013784d07e0c/modules/w-sep-to-json-new.xqm)
- [Veröffentlichte gespeicherte Kollationen](https://github.com/umd-mith/mishnah-data/tree/39389be30e93032d722e8dd3b7bcdfe15e76a421/mishnah/collations)
- [Projektseitige Wortdateien](https://github.com/umd-mith/mishnah-data/tree/39389be30e93032d722e8dd3b7bcdfe15e76a421/mishnah/w-sep)
- [CollateX](https://collatex.net/)

Transkriptionen: Digital Mishnah, Kaufmann A50 (`S07326`), Parma de Rossi 138
(`S00483`), Cambridge Add. 470.1 (`S01520`). Die drei individuellen TEI-Header
nennen [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Die beigefügten JSON-Daten sind daraus abgeleitete, normalisierte und
kollationierte Ausschnitte; sie enthalten nicht alle Originalauszeichnungen.
Für vollständige Transkriptionsdetails bleibt das jeweilige TEI maßgeblich.
