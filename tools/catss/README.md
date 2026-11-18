# Tov/Kraft · CATSS in Safran

`build_tov.py` erzeugt einen separaten Textkritik-Apparat (`tov-data.js`), ohne vorhandene Lesetexte oder deren Manifest-Hashes zu verändern:

```sh
python3 -I tools/catss/build_tov.py
```

Die vier mitgelieferten, unveränderten Oxford-Dateien liegen verlustfrei komprimiert unter `tov-source/`. Ihr SHA-256 steht in `tov-audit.json`. Herkunft und Lizenz: [Oxford Text Archive 1111](https://llds.ling-phil.ox.ac.uk/llds/xmlui/handle/20.500.14106/1111), Tov/Kraft, CC BY-NC-SA 3.0. Die Dateien wurden über die dortigen Bitstream-Links `file01-1111.txt` bis `file04-1111.txt` bezogen. Die mitgelieferte historische `list-1111.txt` beschreibt andere Dateigrenzen; maßgeblich sind die tatsächlich in den Dateien enthaltenen Buchmarken.

Der Konverter verwendet `catss.py` im reinen Lesemodus für dieselbe Unicode-Umsetzung, Gruppierung und Verszählung wie die vorhandenen CATSS-Texte. Vor einer Übernahme müssen **alle Verse einer Fassung** mit der eingebundenen Fassung übereinstimmen. Geprüfte Dateien erhalten ebenfalls SHA-256-Fingerprints. Originalspalten, Quellendatei und Zeilennummer jeder Anmerkung bleiben erhalten. Unbekannte Codes werden nicht eigenmächtig interpretiert.

Umfang: 36 Fassungen, 13.134 Verse mit 61.284 Hinweisen. Richter A/B und Daniel/Theodotion bleiben getrennt. Psalmen, Sprüche und Hiob fehlen in diesen Oxford-Dateien; Hosea enthält keinen verwertbaren Buchabschnitt. Der fälschlich als `Esth` bezeichnete Abschnitt enthält Esra und wird ausdrücklich ausgeschlossen. Es werden weder fehlende Anmerkungen noch Übereinstimmungen ergänzt. Die Ausgabe ist kein vollständiger handschriftenkritischer Apparat.

Die deutschen Code-Erklärungen folgen dem [CATSS-Quellenschlüssel](https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/00.ReadReParallel.txt). Spalte a ist die formale MT/LXX-Ausrichtung; Spalte b enthält eine Auswahl **erschlossener** hebräischer Lesarten und Hinweise zur Übersetzungstechnik. Plus/Minus bezeichnet zunächst das Verhältnis der ausgerichteten Texte und beweist keine abweichende hebräische Handschrift. Fragezeichen bleiben erhalten. Die ursprünglichen Spalten sind beim Überfahren der Quellenzeile sichtbar.

Im Pane lässt sich LXX unabhängig vom Samaritanus einblenden. Der vollständige griechische Vers steht in der Kontextvorschau. Ein Klick auf die griechische Gruppe verwendet den vorhandenen Morphologieindex ausschließlich bei identischer Fassung, Verswortzahl und passender Wortposition; sonst wird keine fremde Bestimmung übernommen. Die englische NETS-Übersetzung wird nicht verwendet.

Prüfung: `node --test tests/tov.test.js`, `npm test`, `npm run test:smoke`.
