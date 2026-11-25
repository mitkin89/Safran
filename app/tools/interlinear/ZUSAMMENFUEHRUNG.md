# Zusammenführung der vollständigen Interlinear-Arbeiten

Am 17. November 2026 auf ausdrücklichen Nutzerauftrag mit main (3fb6a54293959bdf9838f1282423e31314b45082) zusammengeführt:

- codex/wolf-samuel, e57fb2003093016d00ec962d826bed77c997a28b: I/II Samuel, 811 + 695 Verse.
- codex/breuer-ezra, 886474bca38ce8a77741093a5ce04c155c8c8563: Richter und Esra, 618 + 280 Verse.
- codex/hirsch-torah, fee95b4b3e0dd7c8d2bc05194db57cf4cbe466eb: die fünf Bücher Mose, 5846 Verse.

Die Quelltexte samt zuvor freigegebenen Berichtigungen und alle 8250 neuen Zuordnungen entsprechen exakt den veröffentlichten Branches. Alle 83331 bisherigen Verszuordnungen bleiben unverändert, einschließlich Philippson, Breuer/Josua und Aussprache. Das Manifest enthält sämtliche bisherigen Einträge, vier aktualisierte Quellprüfsummen und fünf neue Hirsch-Tora-Dateien; alle 717 SHA1-Prüfsummen wurden geprüft.

Gemeinsame Auswahl, Quellmuster, Porträts, Tests und Dokumentation vereinigt. Aussprache behält Farbe 14, Buber/Rosenzweig 13; Wolf erhält Farbe 15. Der private Import und die Qumran-Wortkarte bleiben erhalten. Keine privaten Übersetzungen sind Bestandteil dieser Zusammenführung.

Bestanden auf dem Gesamtstand:

- python3 tools/interlinear/build.py
- python3 -I tools/interlinear/renderings.py
- npm test (gesamte Testsuite, einschließlich aller Quellverse, Ketiv/Qere-Gruppen, Manifestprüfung, privatem Import und LSJ)
- Syntaxprüfung von library.js und tests/integration/interlinear-corpus.cjs sowie git diff --check
- Zusätzlicher vollständiger Vergleich: bisherige Zuordnungen unverändert, neue Zuordnungen und Quell-JSONs identisch zu den drei Branches.

Der Interlinear-Test prüft zusätzlich, dass die neu gebauten Wortkartenstatistiken Belege aus jedem der neun neuen Buch-/Übersetzungspaare enthalten und sämtliche darin gespeicherten Referenzen auf vorhandene Zuordnungen zeigen.

Die Sprachprüfung der einzelnen Branches ist in deren Prüflisten dokumentiert. Die Zusammenführungsprüfung ist technisch; es wurde keine neue menschliche Fachprüfung oder visuelle Electron-Prüfung vorgenommen. Erzeugte Statistikgruppen können sich gegenüber den getrennten Branches durch die bestehende gemeinsame Namenserkennung verändern; sie wurden aus dem vereinigten Gesamtbestand neu erzeugt.
