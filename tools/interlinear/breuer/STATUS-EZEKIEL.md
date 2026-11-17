# Joseph Breuer: Ezechiel – Teilstand

Eigener Checkout `work/safran-breuer-ezekiel`, Branch `codex/breuer-ezekiel`,
Basis `5d84c01` (fertige Megillot). Keine Änderung an vorhandenen Zuordnungsdateien.

Sefaria-Quelle vollständig abgerufen: 48 Kapitel, 1273 Versfelder.
Originale Version samt Versionstitel, Herkunft, Lizenz, Fußnoten und Bildern
als neues kompaktes JSON eingebunden; SHA1 im Manifest. Die ausdrücklich freigegebene Versaufteilung 5:8–10 wurde berichtigt; Wortlaut
der verschobenen Sätze unverändert. Am 17.11.2026 zusätzlich 38 freigegebene
kleine Schreib-/Wortgrenzenkorrekturen in 35 Versen umgesetzt, samt Anpassung
der Zuordnungen und Manifest-SHA1; siehe KORREKTUREN-EZEKIEL.md. Der bereits vorhandene Kommentar bleibt unverändert.

Rohantwort-SHA256: 2e86ed9859d1b31112c2ef55079f7d0a9442ae80f1fad99768d3d13c94df918a

Geprüfter Interlinear-Umfang: Kapitel 1–24, 619 Versfelder. Davon 582 mit deutschem
Text zugeordnet, 37 nur mit den vorhandenen Auslassungszeichen `— —` bei `-`.
Teilauslassungen u. a. in 1:28, 8:2 und 10:1–2,6,19. Solche Lücken sind ausdrücklich keine
Wortzuordnungen des ausgelassenen hebräischen Textes. Noch offen: Kapitel 25–48,
654 Versfelder. Keine maschinelle Vorfassung für offene Verse.

`test30.js` verlangt jeden Vers in Kapitel 1–24 und prüft Wortlaut, Nummerngrenzen,
Versanzahl, Quellplatzhalter und alle 45 tatsächlich zugeordneten Ketiv-/Qere-
Stellen. 1:8 hat eine Ketiv-/Qere-Stelle, aber ausschließlich Quellplatzhalter;
sie ist daher nicht als deutsche Wortzuordnung gezählt. Die offenen Kapitel
werden im Testergebnis ausdrücklich ausgewiesen.

Technische Einbindung: Builder und deutsche Kreuzhervorhebung erkennen den
originalen Versionstitel; Ezechiel zeigt Joseph Breuer statt Raphael Breuer als
Autor und Porträt im Interlinear-Auswahldialog.

Alle vier Prüfungen für diesen Teilumfang bestanden: build.py, renderings.py, test.js und test30.js.
Keine visuelle App-Prüfung. Gemeinsame Dateien nach Zusammenführung paralleler
Arbeit aus dem vereinigten Zuordnungsbestand erneut bauen und prüfen.

Die ausdrücklich freigegebene Versaufteilung 5:8–10 ist umgesetzt und geprüft;
siehe PRUEFLISTE-EZEKIEL.md. 7:4 und 14:11 bleiben für den Druckabgleich unverändert. Keine weiteren
Quellenkorrekturen über die einzeln dokumentierte Freigabe hinaus.

Fortsetzung dieses Stands: Kapitel 25, Vers 1. Kapitel 25–48 ist noch nicht zugeordnet
oder semantisch geprüft. Keine Prüfung dieser Kapitel durch Teilstand-Erfolg impliziert.

Zusatzprüfungen: Alle vor diesem Teilstand vorhandenen Zuordnungen sind identisch
geblieben. Bis `36ed57d` waren Quell-JSONs und Manifest gegenüber `4f6faff` unverändert;
der folgende Korrekturstand ändert ausschließlich die 35 dokumentierten Verse
der Breuer-Übersetzung und deren einen Manifest-SHA1. Eine
Negativprobe mit entferntem Vers 24:27 wurde vom Vollständigkeitstest abgewiesen.
