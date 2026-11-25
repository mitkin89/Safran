# Breuer: Richter – Arbeitsstand

Aktualisierung vom 17. November 2026: Auf ausdrücklichen Nutzerauftrag mit dem aktuellen `main` und den vollständigen Arbeiten Wolf/Samuel, Breuer/Richter/Esra und Hirsch/Tora zusammengeführt. Die folgenden Branch- und Veröffentlichungsangaben dokumentieren den früheren Arbeitsstand. Die gemeinsamen Interlinear- und Wortkartendaten wurden aus allen Zuordnungen neu gebaut; Wolf verwendet nun Quellenfarbe 15, während Aussprache 14 und Buber/Rosenzweig 13 behalten.

Eigener Checkout `work/safran-breuer-judges`, Branch `codex/breuer-judges`, Ausgangspunkt `origin/main` / `c707779e89614a1ac2218fa1176ae816de7d32a5`.

Quelle: gebündelte Übersetzung von Raphael Breuer, `Das Buch Richter (Schofetim)`. Referenz: gebündelter Westminster-Text (OSHB), einschließlich aller separat gezählten Ketiv-/Qere-Formen. Gesamtumfang: 21 Kapitel, 618 Verse, kein leeres Quellfeld.

Die TXT-Datei enthält nur einzeln am tatsächlichen Hebräisch geprüfte Zuordnungen. Die Eingabehilfe übernimmt explizit festgelegte deutsche Wortbereiche und hebräische Indizes; sie weist keine Wörter automatisch zu. Deutsche Reihenfolge, Wortlaut, Klammern und Namen bleiben erhalten. Mögliche Korrekturen stehen separat in `PRUEFLISTE-JUDGES.md`.

Abgeschlossen: alle 21 Kapitel, 618 Verse. Keine fehlenden oder doppelten Versschlüssel. Nicht zugeordnete hebräische Inhaltswörter wurden zusätzlich geprüft; tatsächliche Auslassungen sind in der Prüfliste dokumentiert. Alle 19 separat gezählten Ketiv-/Qere-Gruppen sind gemeinsam referenziert und getestet, einschließlich der mehrteiligen Variante 16:25.

Vollständiger Testlauf am 17. November 2026:

- `python3 tools/interlinear/build.py`: bestanden; alle aktuellen Zuordnungen mitgebaut.
- `python3 -I tools/interlinear/renderings.py`: bestanden; Breuer-Statistik mit Richter: 3186 Lemmata.
- `node tests/integration/library-core.cjs`: bestanden.
- `node tests/integration/interlinear-corpus.cjs`: bestanden; alle 618 Richter-Verse zwingend auf Vollständigkeit, Quellwortlaut und Wortnummern geprüft, ohne Teilstand-Ausnahmen. Die bestehenden Prüfungen einschließlich Nehemia bleiben erhalten.
- `node --check library.js`, `git diff --check`: bestanden.
- Exakte Schlüsselprüfung: 618 eindeutige Verse. Quell-JSONs, Manifest sowie Genesis-/Exodus-Zuordnungen gegenüber `origin/main` unverändert.

Vorherige Zwischenstände wurden nicht als vollständiger Testlauf ausgegeben. Eine visuelle Browserprüfung wurde nicht durchgeführt. Die technischen Tests ersetzen nicht die erfolgte Einzelprüfung am Hebräischen.

Die Interlinear-Auswahl erkennt die gebündelte Raphael-Breuer-Fassung bereits über den vorhandenen Versionstitel-Abgleich; Wortkarte und Paradigmen verwenden die vollständig neu gebaute Breuer-Statistik. Gemeinsam geänderte Dateien müssen mit paralleler Arbeit zusammengeführt und danach aus allen Zuordnungen neu gebaut werden.

Keine Quell-JSONs, Hashes, Genesis-/Exodus-Zuordnungen oder eScriptorium-Daten geändert. Keine Veröffentlichung für diese neue Arbeit beauftragt. Die Wolf-Arbeit liegt separat auf `codex/wolf-samuel`.

Anschließend ausdrücklich beauftragt: Breuers Esra (Ezra), nach vollständigem Abschluss von Richter.

## Aktualisierung nach Freigabe

Am 17. November 2026 wurden die in der Prüfliste unter „Freigegebene Bereinigungen“ genannten kleinen Änderungen genehmigt und angewandt. Die vorstehenden Aussagen zu unveränderten JSONs/Hashes beschreiben den Stand vor dieser Freigabe. Nun sind die betroffenen Quell-JSONs kompakt gespeichert und die SHA1-Hashes im Manifest sowie die Zuordnungen synchronisiert. Die übrigen Textbefunde bleiben offen. Der anschließende vollständige Neubau und die vier vorgeschriebenen Tests bestanden erneut. Der Nutzer hat den Push des Richter-/Esra-Stands ausdrücklich beauftragt.
