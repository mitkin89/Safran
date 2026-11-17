# Breuer: Esra – Arbeitsstand

Aktualisierung vom 17. November 2026: Auf ausdrücklichen Nutzerauftrag mit dem aktuellen `main` und den vollständigen Arbeiten Wolf/Samuel, Breuer/Richter/Esra und Hirsch/Tora zusammengeführt. Die folgenden Branch- und Veröffentlichungsangaben dokumentieren den früheren Arbeitsstand. Die gemeinsamen Interlinear- und Wortkartendaten wurden aus allen Zuordnungen neu gebaut; Wolf verwendet nun Quellenfarbe 15, während Aussprache 14 und Buber/Rosenzweig 13 behalten.

Eigener Checkout `work/safran-breuer-ezra`, Branch `codex/breuer-ezra`, auf dem lokal abgeschlossenen Richter-Stand `bc72a06`. Gemeinsamer Ausgangspunkt ist `origin/main` / `c707779e89614a1ac2218fa1176ae816de7d32a5`. Die Richter-Arbeit bleibt im eigenen Branch `codex/breuer-judges` und ist auch hier enthalten; Wolf/Samuel liegt separat auf `codex/wolf-samuel`.

Quelle: gebündelte Übersetzung `Raphael Breuer, Die Bücher Esra und Nehemia, Teil I: Esra. Frankfurt a. M. 1933 — Übersetzung`. Referenz: gebündelter Westminster-Text (OSHB), einschließlich aller separat gezählten Ketiv-/Qere-Formen. Gesamtumfang: 10 Kapitel, 280 Verse, kein leeres Quellfeld. Kapitelumfänge: 11, 70, 13, 24, 17, 22, 28, 36, 15, 44.

Abgeschlossen: sämtliche 280 Verse einzeln am tatsächlichen hebräischen beziehungsweise aramäischen Wortlaut geprüft, einschließlich 4:8–6:18 und 7:12–26. Keine fehlenden oder doppelten Versschlüssel. Die Eingabehilfe übernimmt nur ausdrücklich festgelegte deutsche Wortbereiche und Westminster-Indizes; sie weist keine Wörter automatisch zu. Deutsche Reihenfolge, Wortlaut, Klammern, Namen und übernommene Worttrennungen bleiben erhalten. Klammerwörter wurden einzeln geprüft. Die 37 separat gezählten Ketiv-/Qere-Gruppen werden jeweils gemeinsam referenziert und geprüft.

Nicht referenzierte hebräische/aramäische Wörter wurden zusätzlich geprüft. Tatsächliche Auslassungen und besondere Wiedergaben stehen in `PRUEFLISTE-EZRA.md`, insbesondere das fehlende Glied בן צדוק in 7:2. Diese Auslassung ist weder automatisch ergänzt noch falsch mit Achitub verbunden worden. Die Prüfliste ist keine Freigabe zur Textkorrektur.

Vollständiger Testlauf am 17. November 2026:

- `python3 tools/interlinear/build.py`: bestanden; alle aktuellen Zuordnungen mitgebaut, Breuer insgesamt 3154 Versfelder.
- `python3 -I tools/interlinear/renderings.py`: bestanden; Breuer-Statistik einschließlich Esra mit 3593 Lemmata.
- `node test.js`: bestanden.
- `node test30.js`: bestanden; alle 280 Esra-Verse zwingend auf Vollständigkeit, Quellwortlaut und Wortnummern geprüft, ohne Teilstand-Ausnahmen. Sämtliche bestehenden Prüfungen einschließlich Richter und Nehemia erhalten. Alle 37 Ketiv-/Qere-Gruppen sowie ausgewählte Ergänzungen und die Auslassung 7:2 gesondert abgesichert.
- `node --check library.js`, `git diff --check`: bestanden.
- Exakte Schlüsselprüfung: 280 eindeutige Verse in Quellenreihenfolge. Alle zuvor vorhandenen Buch-Zuordnungen im neu gebauten `interlin.js` gegenüber dem Richter-Ausgangsstand inhaltlich unverändert.

Keine Quell-JSONs, Manifest-Hashes, Genesis-/Exodus-Zuordnungen oder eScriptorium-Daten geändert. Interlinear und Wortkarten-/Paradigmenstatistik aus sämtlichen im Checkout vorhandenen Zuordnungen neu gebaut. Gemeinsam geänderte Dateien müssen mit paralleler Arbeit zusammengeführt und anschließend neu gebaut werden. Eine visuelle Browserprüfung wurde nicht durchgeführt. Technische Tests ersetzen nicht die erfolgte Einzelprüfung am Quellwortlaut.

Keine Veröffentlichung für die neue Richter-/Esra-Arbeit beauftragt; beide Stände werden lokal gespeichert. Für einen späteren Main-Abgleich die separat veröffentlichte Wolf-Arbeit und zwischenzeitliche Änderungen anderer Chats berücksichtigen.

## Aktualisierung nach Freigabe

Am 17. November 2026 wurden die in der Prüfliste unter „Freigegebene Bereinigungen“ genannten kleinen Änderungen genehmigt und angewandt. Die vorstehenden Aussagen zu unveränderten JSONs/Hashes beschreiben den Stand vor dieser Freigabe. Nun sind die betroffenen Quell-JSONs kompakt gespeichert und die SHA1-Hashes im Manifest sowie die Zuordnungen synchronisiert. Die übrigen Textbefunde bleiben offen. Der anschließende vollständige Neubau und die vier vorgeschriebenen Tests bestanden erneut. Der Nutzer hat den Push des Richter-/Esra-Stands ausdrücklich beauftragt.
