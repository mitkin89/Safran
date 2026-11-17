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
   `interlin-buber-genesis-mit-wortkarte.json` auswählen, wenn Wortkartenstatistiken
   enthalten sein sollen. Eine reine Zuordnungsdatei bleibt ebenfalls gültig.
   Die `.js`-Datei wird nicht importiert.
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
geöffneten Übersetzungsspalten. Die optionale Eigenschaft `renderings` enthält
Wiedergabestatistiken im Format `{books, tr: {BuberRosenzweig: …}}` von
`tools/interlinear/renderings.py`. `books` muss dieselbe Reihenfolge wie die
öffentlichen Statistiken haben; alle kodierten Belegstellen müssen in der
mitgelieferten Zuordnung vorkommen. Gruppen, Formen und Indizes werden geprüft.

Ein kombiniertes Paket lädt zusätzlich die Buber-Quelle in Wortkarte und
Formentabelle. Nach dem Import eine bereits offene Wortkarte erneut öffnen.
Die übliche Mindestzahl von zwei Belegen für ein Lemma gilt auch für Buber.
Ein erneuter Import ohne `renderings` entfernt die alten privaten Statistiken,
damit keine Wiedergaben aus einem früheren Zuordnungsstand angezeigt werden.
Die Statistiken bleiben im selben privaten Benutzerspeicher. Sie werden aus der
geprüften Zuordnung maschinell gruppiert; die deutschen Grundform-Gruppen sind
heuristisch, wie bei den mitgelieferten Fassungen.

## Entwicklung und Veröffentlichung

`npm test` umfasst künstliche Testtexte für Formatprüfung, Textabgleich,
Wortnummern, Neustart und fehlgeschlagene Importe. Private Übersetzungstexte
oder daraus gewonnene Segmente dürfen nicht als Testdaten eingecheckt werden.

Die private Fassung wird nicht in den öffentlichen `interlin.js`-Build gemischt.
Auch ein lokaler Build mit privaten Daten soll diese nicht versehentlich
weitergeben: `private/`, `interlin.private*`, `interlin-buber*`,
`interlin-ren.private*` und `interlin-ren-buber*` sind vom
App-Paket ausgeschlossen und in `.gitignore` eingetragen.
