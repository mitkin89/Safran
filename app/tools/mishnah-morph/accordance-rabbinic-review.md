# Seraim: Quellenbeschränkung und zweiter Bilddurchgang

Für die Mischna sind biblische Wörterbücher, OSHB-Wörterbuchglossen und daraus
übernommene Formkandidaten ausgeschlossen. `build-zeraim.cjs` lädt diese Quelle
nicht mehr. Die Wortkarten verwenden ausschließlich eigene redaktionelle
Kurzbedeutungen; ihre Wörterbuchaktionen und Artikelbelege sind auf Jastrow,
Levy und Krauss beschränkt. Ma’agarim bleibt eine ergänzende Belegquelle.
Das technische Morphcodeformat ist keine lexikalische Quelle.

Der zweite Bilddurchgang bearbeitet die durch das Entfernen der biblischen
Kandidaten neu offenen Positionen. `accordance-*-rabbinic-*.json` enthält
beleggebundene Entscheidungen, die entsprechenden `-open.json`-Dateien die
verbleibenden Fälle. Ältere Offenlisten werden separat erhalten. Nur im
Manifest `accordance-reviews.json` registrierte Dateien gehen in den Build ein.
Der aktuelle Umfang steht in `accordance-zeraim-progress.md`.

Unabhängige visuelle Stichproben ergänzten die Eigenkontrollen der Bearbeiter.
Dabei wurden folgende konkrete Fehlerarten korrigiert:

- Roh-Lexeme aus den Bildern dürfen nicht durch normalisierte eigene Lemmata
  ersetzt werden, etwa גבה/גבוה, עמק/עמוק, מלא/מלוא oder קמץ/קומץ.
- Das rabbinische Suffix ־הן kann maskulin referieren. Demai 6:7 כרמיהן,
  Peah 6:6 ובהן und Maasrot 5:1 בהן werden nach ihrem Satzbezug erklärt;
  die Suffixmerkmale bleiben ausdrücklich redaktionell.
- Challah 4:6 חלת דמאי und שחלת דמאי enthalten in unserer Quelle kein
  pronominales Suffix. Das ו der abweichenden Accordance-Lesart wurde nicht
  in die eigenen Formen übertragen.
- Challah 1:2 בהכרת enthält den Nifal-Infinitiv הִכָּרֵת. Dessen ה ist
  Stammanlaut und kein Artikel; der abweichende Roh-Tag bleibt dokumentiert.
- Peah 4:5 אומן bezeichnet im landwirtschaftlichen Kontext einen Ernte- oder
  Arbeitsstreifen; die unpassende Glossalternative „Arbeiter“ wurde entfernt.

Diese Kontrollen bestätigen keine vollständige morphologische Validierung
aller 23.447 Wortpositionen. Vorbestehende Kandidaten und Mehrdeutigkeiten sind
nicht sämtlich einzeln extern geprüft. Fehlende Bildteile, zusätzliche Lesarten
unserer Ausgabe und ungelöste Stammkonflikte bleiben als solche sichtbar.
Historische `before`-Felder dokumentieren den ersetzten Zustand; sie sind keine
aktiven Analysen und keine weiterhin verwendeten lexikalischen Quellen.

Gezielte Ma’agarim-Nachprüfung löste anschließend zwei neue offene Fälle:
Sheviit 4:8#14 בשאר (Wort-ID 995424, Lemma שאר) und Demai 7:4#19 מחל
(Wort-ID 991010, ausdrücklich חלל/Hifil-Partizip). Die exakten Primär-HTML-
Attribute und URLs stehen in separaten Followup-Dateien; akzeptierte Datensätze
sind `accordance-sheviit-maagarim.json` und `accordance-demai-maagarim.json`.
Abweichende Accordance-Rohangaben bleiben erhalten. Die früheren Offenlisten
sind historische Teilprüfungen; der aktuelle generierte Bestand enthält die
beiden nun aufgelösten Positionen.
