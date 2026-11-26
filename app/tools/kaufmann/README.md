# Vokalisierte Mischna nach Kaufmann (Dan Be’eri)

Enthalten sind alle 63 Traktate der ausdrücklich benannten Sefaria-Ausgabe
`Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri`:
525 Kapitel, 4.192 nichtleere Mischna-Abschnitte. Alle Abschnitte enthalten
Vokalzeichen. Dieser Befund sagt nicht, dass jedes einzelne Wort vokalisiert ist.

Dies ist Dan Be’eris bearbeitete Lesefassung nach Kaufmann A50 mit Korrekturen,
Ergänzungen und konventioneller Zählung, keine diplomatische Transkription.
Auch Avot 6 gehört zum ergänzten Ausgabenbestand. Der Digital-Mishnah-Pilot für
Berakhot verwendet eine andere Transkription und wird nicht durch diese Ausgabe
ersetzt oder automatisch mit ihr gleichgesetzt.

## Quellen und Rechte

- Katalog: <https://www.sefaria.org/api/index>, die sechs Mischna-Ordnungen.
- Export: `https://storage.googleapis.com/sefaria-export/json/Mishnah/<Seder>/<Traktat>/Hebrew/<Versionsname>.json`.
- Originalausgabe: <https://archive.org/details/MishnaCorrectedKaufman00WHOLE>.
- Metadaten der Originalausgabe:
  <https://archive.org/metadata/MishnaCorrectedKaufman00WHOLE>.
- Rechte: **CC BY-SA 3.0**, Namensnennung Rabbi Dan Be’eri und Sefaria;
  <https://creativecommons.org/licenses/by-sa/3.0/>.

`source-rights.json` hält die Lizenzangabe der Originalausgabe fest. Sefaria
führt 61 Exportdateien als PD, Ta’anit und Avot als `unknown`. Safran normalisiert
die Lizenzmetadaten der gesamten Ausgabe auf die ausdrückliche Lizenz der
Vorlage; die Exportangabe bleibt unter `sefariaExportLicense` erhalten.

## Import und Nachweis

```sh
python3 tools/kaufmann/build.py --cache /tmp/safran-kaufmann-export
python3 tools/kaufmann/build.py --cache /tmp/safran-kaufmann-export --offline
node --test tests/kaufmann.test.js
SAFRAN_SMOKE_KAUFMANN=1 electron tests/electron/smoke.cjs
```

Der Import akzeptiert nur die benannte Ausgabe, niemals `merged`. Vor dem
Schreiben müssen alle 63 Traktate einschließlich Vokalisation und Quellenangaben
validiert sein. Quelldateien werden unverändert im angegebenen Cache bewahrt.
Die App erhält denselben Text samt Vokalzeichen, HTML, editorischen Markierungen
und Anmerkungen; nur Metadaten und JSON-Formatierung werden angepasst.

`tractates.json` enthält die 63 Katalogidentitäten, `provenance.json` je Datei
Downloadadresse, ursprüngliche SHA-256, gebündelte SHA-256, Text-SHA-256,
Kapitelumfänge und Vokalisationserhebung. Die Manifest-SHA-1 wird aus den
gebündelten Bytes berechnet. Leere oder unvokalisierte Abschnitte würden im
Bericht stehen; beim vorliegenden Stand gibt es keine.

Die Tests prüfen sämtliche Traktate und Quellpositionen, Textprüfsummen,
Offline-Import und wiederholtes Einbinden. Der Oberflächentest öffnet alle 525
Kapitel, prüft sichtbare Vokalzeichen, parallele deutsche Übersetzung und das
Wiederherstellen der ausgewählten Fassung nach einem Neustart.
