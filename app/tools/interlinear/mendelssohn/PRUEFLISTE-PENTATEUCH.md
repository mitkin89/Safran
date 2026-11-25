# Deutscher Mendelssohn-Pentateuch: Zuordnung und Quellenbefunde

Quelle ist die vorhandene deutsche Übersetzung **Die fünf Bücher Mose**, Moses Mendelssohn, Dessau 1815 (lateinische Schrift), aus `bundled/own/<Buch>/de/*Moses Mendelssohn*.json`. Sie ist von Taitsch und Biur getrennt.

Die Zuordnungen werden Wort für Wort am Westminster-Hebräisch gelesen; deutsche Segmente stehen in deutscher Reihenfolge und ergeben den vorhandenen Verswortlaut. Ketiv und Qere gehören gemeinsam zum deutschen Ausdruck. Auslegende Übersetzungen bleiben erhalten; ausdrücklich hinzugefügte Erläuterungen haben kein hebräisches Wortsegment (`-:`). Mehrfach wiedergegebene hebräische Ausdrücke dürfen mehrmals dieselbe Nummer tragen.

## Umfang

| Buch | Kapitel | Versfelder |
|---|---:|---:|
| Genesis | 50 | 1533 |
| Exodus | 40 | 1210 |
| Leviticus | 27 | 859 |
| Numbers | 36 | 1288 |
| Deuteronomy | 34 | 956 |
| Gesamt | 187 | 5846 |

## Ursprüngliche Prüflisten

- [Genesis 1–43](PRUEFLISTE-GENESIS.md), [Genesis 44–50](PRUEFLISTE-GENESIS-44-50.md)
- [Exodus](PRUEFLISTE-EXODUS.md)
- [Leviticus](PRUEFLISTE-LEVITICUS.md)
- [Numbers](PRUEFLISTE-NUMBERS.md)
- [Deuteronomy 1–14](PRUEFLISTE-DEUTERONOMY-1-14.md), [15–17](PRUEFLISTE-DEUTERONOMY-15-17.md), [18–23](PRUEFLISTE-DEUTERONOMY-18-23.md), [24–34](PRUEFLISTE-DEUTERONOMY-24-34.md)

## Korrigierte Versgrenzen

Die eindeutig verschobenen Satzteile wurden nach erneuter Prüfung am Westminster-Text in den richtigen Vers zurückgestellt und dort Wort für Wort neu zugeordnet. Alle vorhandenen deutschen Wörter einschließlich Großschreibung und Satzzeichen bleiben erhalten. Die Korrekturen sind einzeln dokumentiert:

- [Genesis](KORREKTUREN-GENESIS.md)
- [Exodus](KORREKTUREN-EXODUS.md)
- [Leviticus](KORREKTUREN-LEVITICUS.md)
- [Numbers](KORREKTUREN-NUMBERS.md)
- [Deuteronomy](KORREKTUREN-DEUTERONOMY.md)

Abgeschlossen: **256 Satzteilverschiebungen in 397 geänderten Versfeldern** (einschließlich der Anhangsauslagerung): Genesis 20, Exodus 36, Leviticus 10, Numbers 48, Deuteronomy 142 Verschiebungen. Gegen den ursprünglichen Import wurde pro Buch der vollständige deutsche Wortstrom verglichen: gleiche Wörter in gleicher Reihenfolge, einschließlich Großschreibung und Satzzeichen; bei Deuteronomium zusammen mit dem separat erhaltenen Anhang. Metadaten sowie Kapitel-/Verszählung bleiben gleich. Die fünf Manifest-SHA1 wurden aktualisiert.

Der nichtbiblische [Druckanhang](DRUCKANHANG-DEUTERONOMY.md) ist aus Deuteronomium 34:12 ausgelagert und vollständig erhalten. Die oben verlinkten Prüflisten dokumentieren den ursprünglichen Import; Aussagen zu inzwischen behobenen Versüberhängen sind zusammen mit den Korrekturberichten zu lesen.

## Noch offene Quellenbefunde

OCR-Kandidaten, mögliche Auslassungen, historische Schreibweisen und Übersetzungsentscheidungen wurden nicht verändert. Wo ein Druckvergleich nötig ist, bleibt der Befund offen. Fehlende Wörter wurden nicht aus dem Hebräischen ergänzt. Die vollständige Erfassung aller 5846 Versfelder bedeutet deshalb keine vollständige Reparatur aller Quellfehler.

## Technische Prüfung

`python3 tools/interlinear/mendelssohn/check.py` prüft vollständige Kapitel-/Versumfänge, doppelte oder falsche Referenzen, exakte normalisierte Textrekonstruktion, Wortnummerngrenzen und gemeinsame Ketiv-/Qere-Gruppen. Sie ersetzt die semantische Prüfung nicht. Nicht wiedergegebene Ketiv-/Qere-Ausdrücke werden gesondert gemeldet und in der Prüfliste dokumentiert.

Bauen und Statistik: `python3 tools/interlinear/build.py`, dann `python3 -I tools/interlinear/renderings.py`. Regressionen in `tests/integration/interlinear-corpus.cjs` prüfen Gesamtumfang, schwierige Ketiv-/Qere-Segmente und die reparierten Versgrenzen und den Erhalt unveränderter OCR-Kandidaten.

Unabhängige semantische Stichprobe: 32 schwierige Stellen zusätzlich durchgesehen (Leviticus 1:4,9; 4:7; 5:5; 7:18; 10:6; 11:21; 13:3; 14:5; 16:10,21; 17:11; 18:22; 19:20; 21:8; 25:23,30; Genesis 44:4; 45:8; 48:16; 49:10,24; 50:20; Deuteronomy 18:8,22; 19:6; 20:19; 21:12,17; 22:6,19; 23:5). Dabei keine eindeutigen falschen Wortnummern festgestellt; die Stichprobe ersetzt keine erneute vollständige Durchsicht.
