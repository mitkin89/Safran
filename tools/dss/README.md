# Genesis im Textkritik-Apparat

Der neue Apparat ist unabhängig von den vereinfachten DSS-Lesetexten und dem bisherigen maschinellen Interlinear. Er verwendet ausschließlich den Genesis-Auszug aus **ETCBC/dss 2.0.2**, Commit `0b7774a72b6d0e91712aa2156d2a1d354f1f5e6d`.

Quelle: https://github.com/ETCBC/dss/tree/0b7774a72b6d0e91712aa2156d2a1d354f1f5e6d/tf/2.0.2

Daten von Martin G. Abegg Jr., James E. Bowley und Edward M. Cook; Konversion Jarod Jacobs, Martijn Naaijer und Dirk Roorda / ETCBC CACCHT. **CC BY-NC 4.0**, https://creativecommons.org/licenses/by-nc/4.0/. Die OSHB-Bezugstexte behalten ihre Lizenz CC BY 4.0; die vorhandenen OSHB-Lizenzhinweise gelten weiterhin.

## Reproduzierbar bauen

```sh
python3 -I tools/dss/build_apparatus.py
```

Eingabe ist der mitgelieferte, verlustfrei komprimierte Genesis-Auszug `genesis-source.json.gz`. Dieser enthält 7.902 Original-Wort-/Morphemknoten einschließlich Unicode-Transkription, ursprünglicher Transkription, Grammatik, Zeichenknoten, Rekonstruktions-/Unsicherheits-/Korrektur-/Streichungsmerkmalen und physischen Quellenpositionen. Die Zeichenfolge des Wortes stimmt mit den zugehörigen Zeichenknoten überein. Leere implizite Text-Fabric-Zeilen werden als Knoten gezählt; sie dürfen die Zeichenpositionen nicht verschieben.

Für eine erneute Extraktion aus dem festgelegten vollständigen Originalbestand:

```sh
python3 -I tools/dss/build_apparatus.py --extract /pfad/zu/ETCBC-dss
```

Benötigte Merkmale und deren SHA-256 sind in `genesis-apparatus-audit.json` dokumentiert. Der Auszug behält die ursprünglichen Knotennummern. Laufzeitdaten: `qumran-apparatus.js`; Auswertungslogik: `qumran-apparatus-core.js`; Oberfläche: `library-qumran.js`. Vorhandene Lesetexte und deren Manifest-Hashes werden nicht geändert.

## Umfang und Grenzen

- 338 Genesis-Versstellen, 453 Fragment-/Versabschnitte, 5.807 physische Wortgruppen nach Zusammenfügung der Quellmorpheme.
- 26 Siglen des DSS-Korpus, einschließlich Funden außerhalb Qumrans (etwa Masada und Murabbaat); deshalb heißt der Zeuge in der Oberfläche **DSS · Genesis**.
- Lesarten erscheinen unter der passenden MT-Wortposition. Sichere Positionen erfordern eindeutige, durch erhaltene Wörter gestützte Ausrichtungen. Wiederholte Wörter und mehrdeutige Positionen bleiben offen.
- Das Verfahren ist ein **maschineller Vergleich**, kein neuer redaktionell geprüfter kritischer Apparat. Die angezeigten Lesungen selbst sind aus dem ETCBC-Bestand übernommen.
- Rekonstruierte oder unsichere Buchstaben dienen nicht als sichere exakte Wortanker. Gleichlautende vollständig rekonstruierte Wörter werden nicht als erhaltene Übereinstimmung oder künstliche Variante ausgegeben. Ihr Text bleibt über die Siglen in der Kontextvorschau zugänglich.
- Beschädigte Stellen und fehlende Daten werden nicht zu Auslassungen gegenüber dem MT umgedeutet. Es werden keine automatischen Minus-Lesarten erzeugt.
- Ein Zusatz wird nur zwischen zwei erhaltenen, eindeutig benachbarten MT-Ankern angesetzt; sonst bleibt seine Position offen.
- Der Schreibfilter erkennt lediglich wahrscheinliche nominale Schreibvarianten bei gleichem Lemma, Genus/Numerus und inneren ו/י-Unterschieden. Andere Unterschiede bleiben sichtbar; die Einordnung ist ausdrücklich maschinell.
- Hover zeigt die unveränderten Transkriptionszeichen. `[ ]` markiert moderne Rekonstruktion. Die Morphologie stammt aus den ursprünglichen Abegg-Merkmalen; Modelle auf Basis des MT werden nicht als neue Bestimmung eingesetzt.

Prüfung: `node --test tests/qumran-apparatus.test.js`, `npm test`, `npm run test:smoke`.
