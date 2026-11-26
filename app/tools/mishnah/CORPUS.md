# Digital Mishnah: Interlinear für alle 63 Standardtraktate

Stand: 26. November 2026. Der bestehende Berakhot-Prüfstand bleibt erhalten;
die übrigen 62 Traktate sind mit demselben konservativen Vergleichsverfahren
hinzugekommen. Es handelt sich um einen **maschinellen Handschriftenvergleich,
keine vollständig philologisch geprüfte kritische Edition**.

## Quellen und Umfang

Unveränderter Digital-Mishnah-Quellstand:
`39389be30e93032d722e8dd3b7bcdfe15e76a421`,
https://github.com/umd-mith/mishnah-data .

Die drei bereits für Berakhot eingebundenen, individuell mit CC BY 4.0
bezeichneten TEI-Dateien enthalten auch die anderen Traktate:

| Zeuge | Quelldatei | Wort-/Lückenpositionen, alle Traktate |
|---|---|---:|
| Kaufmann A50 | S07326.xml | 188.096 |
| Parma, de Rossi 138 | S00483.xml | 190.836 |
| Cambridge Add. 470.1 | S01520.xml | 185.619 |

Alle **564.551 Quellenpositionen** werden im Interlinear genau einmal gezeigt:
als sichere maschinelle Gruppe, Zusatz oder gesondertes offenes Material.
Die 63 Datensätze enthalten zusammen 524 Referenzkapitel einschließlich einer
expliziten Referenzlücke in Keritot. Diese Zählung ist die der Transkriptionen,
keine Behauptung identischer Referenzen zur vokalisierten Be’eri-Lesefassung.

Die Quellenkopien in `sources/*.xml.gz`, ihre Fingerprints, ursprünglichen IDs,
Korrekturen, Abkürzungen, Streichungen, Unsicherheitszeichen, Lücken und Original-TEI
bleiben erhalten. Ganzzahlige Referenzkoordinaten vereinheitlichen nur führende
Nullen in IDs wie `S07326.3.01.12.01`; die Original-ID wird unverändert angezeigt.
`tractates.json` hält die explizite Zuordnung von Seder-/Traktatkoordinaten zu
Safrans Werktiteln fest, einschließlich `Pirkei Avot`.

**Abdeckungslücken:** Cambridge enthält in diesem Datenstand keinen Demai-Text.
Diese Version wird deshalb für Demai nicht angeboten. In Keritot 4 fehlt ein
Kaufmann-Referenztext; Parma und Cambridge werden dort separat und ausdrücklich
ohne Wortzuordnung gezeigt. Das ist keine erfundene Kaufmann-Lesart und keine
belegte Auslassung. Auch sonst werden fehlende Kapitel eines Zeugen als
Abdeckungslücken bezeichnet. Avot 6 ist in keinem der drei eingebundenen Zeugen
enthalten; die App kennzeichnet einen Aufruf dieses Kapitels entsprechend.

Das zusätzliche Kaufmann-Divisionssegment `S07326.3.8` (Arayot) ist kein weiterer
der 63 Standardtraktate und wurde keinem anderen Traktat zugeschlagen. Es bleibt
in der unveränderten Originalquelle und ist im Ausschlussbericht dokumentiert.
„Alle Zeugen“ bedeutet hier die drei genannten eingebundenen Handschriften,
nicht sämtliche weltweit erhaltenen Handschriften und Fragmente.

## Vergleich und Darstellung

- Die drei Zeugen stehen wie in Berakhot wort-/gruppenweise untereinander;
  Parma und Cambridge lassen sich einzeln schalten oder separat als Edition öffnen.
- Vollständige Kapitel werden verglichen. Verschiedene Mischnajot-Zählungen
  werden nicht durch Gleichsetzung gleicher Nummern erzwungen.
- Nur Verbindungen, die in sämtlichen optimalen Vergleichspfaden vorkommen,
  werden als Wort-/Gruppenverbindung übernommen. Wiederholungsmehrdeutigkeit,
  unverbundene Ersetzungen und beschädigtes Material bleiben offen sichtbar.
- Rot bezeichnet maschinell erkannte Form-/Wortlautunterschiede und Zusätze.
  Beschädigung und offene Zuordnung werden nicht als sichere Auslassung ausgegeben.
- Die Wort-/Quellenkarten zeigen die aktuelle Traktatbezeichnung, eigene
  Handschriftenreferenzen, Quellenzeichen und Original-TEI. Daten werden pro
  Traktat geladen (`mishnah-textcrit/*.js`), nicht als ein Gesamtskript beim Start.
- Die zwei früheren redaktionellen Berakhot-Verbindungen bleiben unverändert.
  Die neuen Traktate erhalten dadurch keinen redaktionell geprüften Status.
- Mischna–Tosefta-Passagenverknüpfungen bleiben auf den bisherigen Berakhot-Bestand
  beschränkt. In den neuen Traktaten werden keine Berakhot-Verknüpfungen wiederverwendet.

## Reproduktion und Prüfungen

```
python app/tools/mishnah/build_all.py
python app/tools/mishnah/test_align.py
python app/tools/mishnah/test_native.py
node --test app/tests/mishnah-textcrit.test.js app/tests/mishnah-reader.test.js app/tests/mishnah-textcrit-corpus.test.js
```

Der Offline-Build braucht Python 3 und einen C++17-Compiler (`g++`). Der native
Helfer beschleunigt dasselbe Kapitelverfahren; er ist keine Heuristik und wird
nicht von der fertigen Anwendung benötigt. 220 deterministische Vergleichsfälle
prüfen Gleichheit mit der Python-Implementierung; außerdem muss er den gesamten
bestehenden Berakhot-Prüfstand einschließlich der zwei redaktionellen Eingriffe
identisch reproduzieren. Der Python-Weg bleibt für den bisherigen Pilotbuild bestehen.

`corpus-audit.json` und `mishnah-textcrit-catalog.js` dokumentieren Umfang,
Quellenlücken und Zuordnungszahlen pro Traktat. Die Node-Prüfung rendert sämtliche
Referenzkapitel, zählt alle drei Zeugen vollständig nach, verhindert doppelte
Wortpositionen, prüft Original-IDs und Quellfingerprints sowie Extrakt-Offsets.

Für die Headless-Prüfung wird eine echte Bildschirmgröße gesetzt
(`--ozone-platform=headless --ozone-override-screen-size=1440,1000`);
ein 1-Pixel-Testbildschirm kann keinen Umbruchtest belegen.

36 Node-Tests einschließlich des bestehenden Morphologie-/Wörterbuchstands bestehen.
Der Electron-Durchlauf öffnet alle 63 Traktate im tatsächlichen Hauptfenster,
prüft die Worterhaltung im jeweils ersten Kapitel und testet die Lückenfälle
Demai und Keritot 4 gesondert. Der bisherige Berakhot-Durchlauf prüft zusätzlich
Filter, Quellenkarten, den Apparatus, Tosefta, Navigation, Neustart und Umbruch.

Kein Mischna-Lesetext und keine Morphologiebestimmung wird durch diese
Handschriften-Erweiterung geändert.
