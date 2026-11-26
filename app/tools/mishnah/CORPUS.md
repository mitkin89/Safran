# Digital Mishnah: Vergleich aller 63 Standardtraktate

Stand: 26. November 2026. Alle Traktate verwenden jetzt die Wortaufbereitung
von Digital Mishnah und CollateX Java 1.7.1 (Needleman–Wunsch). Verglichen werden
vollständige Kapitel. Gleiche Mischnanummern begründen keine Wortgleichheit.
Der Vergleich ist automatisch und keine vollständig philologisch geprüfte Edition.

## Unveränderte Quellen

Datenstand: `39389be30e93032d722e8dd3b7bcdfe15e76a421`,
https://github.com/umd-mith/mishnah-data . Die einzelnen TEI-Header der drei
Quellen nennen CC BY 4.0. Alle Originaldateien bleiben in `sources/*.xml.gz`.

| Quelle | Datei | Wort-/Lückenpositionen |
| --- | --- | ---: |
| Kaufmann A50 | S07326.xml | 188.096 |
| Parma, de Rossi 138 | S00483.xml | 190.836 |
| Cambridge Add. 470.1 | S01520.xml | 185.619 |

Alle **564.551 Positionen** und alle **12.372 Originalabschnitte** bleiben erhalten,
einschließlich Text, Original-TEI, Annotationen und Zeichenpositionen. Die
Darstellung zeigt sie als zugeordnete Wörter, Zusätze, positionierte Lücken,
aufklappbare Quellenkommentare oder ausdrücklich offenes Material. Gegenüber dem
vorherigen Bestand wurden sämtliche Abschnittsinhalte anhand ihrer ursprünglichen
IDs und Inhalts-Fingerprints geprüft.

## Quellenbehandlung

- Verschachtelte `orig`-Auszeichnungen werden rekursiv gelesen. Eine leere
  Abkürzungsauflösung fällt auf den tatsächlich überlieferten Text zurück.
- Wiederholte Wort-IDs in vier Cambridge-Kapiteln erhalten eindeutige interne
  Vergleichskennungen. `sourceId` bewahrt die ursprüngliche Projektkennung.
- Parma Bikkurim 2:8–11 enthält verschobene/doppelte XML-IDs. Die Abschnittsposition
  folgt dort dem physischen Kapitel und den expliziten `MSMishnah`-Markierungen
  8–11. `id`, `raw` und `referenceCorrection.encodedRef` erhalten die ursprünglichen
  Angaben. Kein Handschriftentext wird verändert oder ausgelassen.
- `add type="comm"` bleibt als Quellenkommentar unter dem Abschnitt verfügbar.
  Solche Wörter werden nicht als lexikalische Varianten der Mischna ausgegeben.
- Beschädigte Fragmente bleiben mit ihren Lücken erhalten. Eine automatische
  Trennung über eine Wortgrenze erfordert eindeutige Fragmente, passende
  Nachbarzellen und die ausdrücklich kodierte Lückenlänge. Unsichere Fälle
  bleiben offen. Fehlende Buchstaben werden nicht ergänzt.
- Fehlende Zeugen oder Kapitel sind Abdeckungslücken, keine belegten Auslassungen.
  Zusatztexte außerhalb der 63 Standardtraktate bleiben im bestehenden
  Ausschlussverzeichnis dokumentiert.

`project-corpus-audit.json` enthält Summen und noch offene Positionen. Der
hauptsächlich verwendete Vergleich gegen die vokalisierte Ausgabe wird in
[VOCALIZED.md](VOCALIZED.md) beschrieben. Der diplomatische Vergleich umfasst
524 Referenzkapitel und bleibt für Quellenansicht und Apparat erhalten.

## Reproduktion

Die abgeleiteten Vergleichsdaten sind gepinnt und offline gespeichert. Der
normale Neubau benötigt Python und Node, keinen Java- oder C++-Laufzeitbestand:

```
python3 app/tools/mishnah/build.py
python3 app/tools/mishnah/build_all.py
python3 app/tools/mishnah/build_vocalized.py
```

Zum vollständigen Neuberechnen der Projektaufbereitung und Kollation:

```
python3 app/tools/mishnah/collate_corpus.py --upstream-dir /path/to/pinned-inputs --prepared-dir /tmp/mishnah-project --collate
```

Die gepinnten Wortdateien und Java-Werkzeuge sind in [README.md](README.md)
aufgeführt. Das Werkzeug lädt nichts herunter und verwendet keinen externen
Kollationsserver. Prüfungen zählen alle Quellpositionen genau einmal,
prüfen Quellfingerprints, Annotationen und Offsets und öffnen alle 63 Traktate
im tatsächlichen App-Fenster. Die bisherige native Vergleichsimplentierung
bleibt als separat geprüfter Referenzcode erhalten.
