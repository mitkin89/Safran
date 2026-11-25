# LSJ und Pape: Abkürzungen beim Lesen

`greek-abbreviations.js` ergänzt Erklärungen beim Überfahren der Kürzel in
Wörterbuchartikeln und Wörterbuchauszügen der Wortkarte. Wörterbuchpakete,
Originalwortlaut, Verweise und Formatierung bleiben erhalten. Die bestehende
Tooltip-Oberfläche (`.gab[data-t]`) zeigt die Erklärung.

## Grundlage

- [LSJ: Autoren-, Werk- und Quellenverzeichnis](https://logeion.uchicago.edu/abbreviations/lsj)
- [Pape: Abkürzungsverzeichnis](https://logeion.uchicago.edu/abbreviations/pape)
- Bereits mit dem LSJ-Import gelieferte allgemeine Kürzel
  (`tools/lsj/source.json`, Originalverzeichnis der DSL-Ausgabe).
- `supplement.json`: ergänzende grammatische Kürzel und Schreibweisen in den
  tatsächlich gelieferten Artikeln. Keine Wörterbuchartikel werden neu verfasst.

Die ausgeschriebenen Namen und Titel werden in der Sprache des Verzeichnisses
angezeigt; grammatische Ergänzungen enthalten deutsche Erklärungen. Zuordnungen
zu Werken berücksichtigen den vorangehenden Autor: `Arist.Ath.54.1` verweist auf
Aristoteles' *Ἀθηναίων Πολιτεία*, nicht auf Athenaeus. Bei mehrdeutigen Siglen
bleiben alternative Auflösungen sichtbar. Papes Positionsangaben `A.`, `E.`,
`M.` werden nur nach einer Ziffer als Anfang/Ende/Mitte erklärt.

Das ist kein Nachweis, dass jede denkbare Abkürzung eindeutig aufgelöst ist.
Insbesondere Einbuchstaben-Buchangaben, Herausgebersiglen und abweichende
Schreibweisen können weiteren Quellenkontext benötigen. Der Audit listet
unmarkierte Kandidaten auf; darunter sind auch normale Wörter am Satzende.

## Daten neu erzeugen

Logeion liefert seine Verzeichnisse als öffentliche Angular-Templates.
`build.py` liest ausschließlich die beiden String-Literale aus dem lokal
heruntergeladenen Skript; es führt dessen JavaScript nicht aus. Die zum Aufbau
verwendete Ressource war `https://logeion.uchicago.edu/scripts/scripts.389be11e.js`.

```sh
python3 tools/greek-abbreviations/build.py /tmp/logeion-app.js
node --test tests/greek-abbreviations.test.js
node tools/greek-abbreviations/audit.js /tmp/greek-abbreviations-audit.json
```

Python benötigt `lxml`. `greek-abbreviations-data.js` enthält die extrahierten
Zuordnungen und SHA-256-Prüfsummen der beiden Quellentemplates. Bei geändertem
Logeion-Build muss zunächst die aktuelle Skriptadresse ermittelt werden.

Der Audit prüft den sichtbaren Text **jedes** gebündelten Artikels bytegenau
vor/nach der Anreicherung. Artikelzahlen sind keine Quote vollständig
aufgelöster Abkürzungen. Der Electron-Test verwendet echte Artikelauszüge mit
autorenabhängigen Werkangaben und prüft deren Hover-Erklärungen:

```sh
SAFRAN_SMOKE_GREEK_ABBR=1 electron tests/electron/smoke.cjs
```
