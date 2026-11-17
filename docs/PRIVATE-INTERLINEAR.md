# Lokale Interlinear-Zuordnungen

Safran kann eine private Wortzuordnung für Buber/Rosenzweig laden. Im Repository
stehen nur Programmcode und Registrierung. Übersetzung und Zuordnungen mit
deutschem Wortlaut gehören nicht in das öffentliche Repository.

## In der App

1. Eine Safran-Version mit dieser Funktion starten. Ältere Versionen ohne
   Westminster-Interlinear-Unterstützung müssen aktualisiert werden.
2. Den Westminster-Text und die eigene Buber/Rosenzweig-Fassung in die Bibliothek
   aufnehmen. Bei vorhandener Fassung muss die zur Zuordnung passende Datei mit
   identischen Versgrenzen verwendet werden. Über **⋯ → ＋ Eigener Text…** lässt
   sich eine korrigierte Textdatei importieren und die vorhandene Version ersetzen.
3. **⋯ → Interlinear-Zuordnung importieren …** wählen und die private
   `interlin-buber-genesis.json` auswählen. Die `.js`-Datei wird nicht importiert.
4. Genesis mit dem hebräischen Westminster-Text öffnen. Im Interlinear-Menü
   **Buber/Rosenzweig** aktivieren. Im aktuellen Fenster wird die Fassung nach
   erfolgreichem Import bereits ausgewählt.

Die App prüft vor dem Speichern die deutschen Verse und die Westminster-
Wortnummern. Bei abweichendem Textstand nennt sie die erste betroffene Stelle;
vorhandene Zuordnungen bleiben dann erhalten. Ein fehlender deutscher Vers muss
nicht erfunden oder mit einer falschen Zuordnung gefüllt werden.

Der Import speichert ausschließlich im Benutzerordner
`private/interlinear.json`, außerhalb des App-Pakets. Die Daten bleiben nach
einem App-Update erhalten. Beim Start werden sie erneut gegen die Bibliothek
geprüft. Nicht mehr passende Bücher werden ausgeblendet und gemeldet.
Ein importiertes Buch ersetzt dessen bisherige Zuordnung vollständig;
Zuordnungen zu anderen Büchern bleiben erhalten. Andere offene Fenster laden
die privaten Zuordnungen nach einem Import neu.

## JSON-Format

Wurzel: `BuberRosenzweig`, darunter englischer Sefaria-Buchtitel, darunter
`Kapitel:Vers`. Jeder Vers enthält Segmente `[Wortnummern, deutscher Text]`.
Wortnummern sind die bei 1 beginnenden `span.w`-Wörter des Westminster-Verses.
Mehrere Nummern für eine Wortgruppe sowie leere Nummernlisten für deutsche
Ergänzungen sind möglich. Die deutsche Segmentfolge muss den Vers in seiner
deutschen Reihenfolge rekonstruieren. Fußnoten werden bei diesem Vergleich
ausgenommen. Die Textversion muss Buber und Rosenzweig im Versionstitel nennen.

Es werden nur JSON-Daten gelesen, keine importierten Skripte ausgeführt.
Eine einzelne Datei darf höchstens 50 MiB groß sein. Für einen anderen privaten
Übersetzer wäre zunächst eine zusätzliche Registrierung im Programm nötig.

Die lokale Zuordnung ermöglicht Interlinear-Zeilen und Wortverknüpfungen in
geöffneten Übersetzungsspalten. Daraus werden noch keine zusätzlichen
Wiedergabestatistiken für Wortkarten in `interlin-ren.js` erzeugt.

## Entwicklung und Veröffentlichung

`npm test` umfasst künstliche Testtexte für Formatprüfung, Textabgleich,
Wortnummern, Neustart und fehlgeschlagene Importe. Private Übersetzungstexte
oder daraus gewonnene Segmente dürfen nicht als Testdaten eingecheckt werden.

Die private Fassung wird nicht in den öffentlichen `interlin.js`-Build gemischt.
Auch ein lokaler Build mit privaten Daten soll diese nicht versehentlich
weitergeben: `private/`, `interlin.private*` und `interlin-buber*` sind vom
App-Paket ausgeschlossen und in `.gitignore` eingetragen.
