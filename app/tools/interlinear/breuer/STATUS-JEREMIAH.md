# Joseph Breuer: vollständiges Jeremia – Prüfstand

Abgeschlossen am 17. November 2026: alle 52 Kapitel / 1364 vorhandenen Verse der gebündelten Übersetzung „Joseph Breuer, Das Buch Jirmejah — Übersetzung“. Quelle: Mannheim eScriptorium, Dokument 6697. Referenz ist die gebündelte Westminster-/OSHB-Fassung. Die bestehende Kapitelgrenze 30/31 folgt Sefaria/Westminster: Druck30,25 entspricht31,1, Druck31,1–39 entspricht31,2–40. Keine Quell-JSONs oder Versgrenzen verändert.

## Sprachliche Bearbeitung

Alle Verse wurden einzeln von KI-Prüfagenten am tatsächlichen nummerierten hebräischen beziehungsweise aramäischen Wortlaut gelesen und explizit zugeordnet, ohne Übernahme einer automatisch erzeugten Erstzuordnung oder fremder Übersetzer-Zuordnungen. Bearbeitungsbereiche:1–9 (255 Verse), 10–13 (92), 14–26 (303), 27–39 (345), 40–52 (369). Die Eingabehilfe setzte ausschließlich explizit festgelegte Indizes in das bestehende Segmentformat um und prüfte die exakte Wiederherstellung des deutschen Wortlauts.

Unabhängige Gegenprüfung: alle 135 Verse in 27–31 vollständig; in1–9 gezielt 17 dokumentierte Schwerstellen, die Lesungsgruppen und eine lexikalische Stichprobe. Dabei wurde in4,18 der Bezug des nachgestellten „es“ vom Konjunktionsindexכי auf das Subjekt des Verbsנגע präzisiert. Der genaue Gegenprüfumfang steht in PRUEFLISTE-JEREMIAH.md. Keine neue menschliche Fachprüfung oder visuelle Electron-Prüfung.

Quellauffälligkeiten und echte Auslassungen bleiben erhalten und sind in PRUEFLISTE-JEREMIAH.md dokumentiert. Beispielsweise steht der zweite „Koreachs“ in41,16 ohne falschen Bezug auf Netanjah;36,9 lässt den neunten Monat aus,50,40 die Nachbarn und den Gottesausspruch. Freie Übersetzungen werden nicht stillschweigend zu wörtlichen Gleichsetzungen umgedeutet.

## Lesungsgruppen aus der Primärquelle

Alle1364 Verse und jedes nummerierte Westminster-Wort wurden exakt mit der öffentlichen OSHB-XML verglichen (nur Morphemtrenner / und Unicode-Normalisierung entfernt). Es besteht vollständige Übereinstimmung.

Primärquelle: https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/Jer.xml
SHA256 der geprüften XML: 1a7ad7bc26a2cae1d3964230e8eb73043bc1f32505cb86cd69a25261dc39f493.

- 136 reguläre Ketiv-/Qere-Gruppen, alle gemeinsam referenziert, einschließlich mehrgliedriger Varianten wie 6,29 und 29,23.
- 3 Ketiv-Wörter mit leerem Qere:38,16(Wort10),39,12(Wort11),51,3(Wort3). Alle drei bleiben unreferenziert, ohne sie fälschlich mit dem Nachbarwort zu paaren.
- 2 reine Qere-Wörter ohne Ketiv:31,38(Wort3)und50,29(Wort13). Beide sind ihrer tatsächlichen deutschen Wiedergabe zugeordnet.

Die maschinenlesbaren Referenzen stehen in KETIV-QERE-JEREMIAH.json und KETIV-QERE-AUSNAHMEN-JEREMIAH.json.

## Einbindung und Validierung

Jeremiah.txt ist die vollständige Eingabe für den bestehenden Interlinear-Generator. Die Auswahl erkennt nun auch Joseph Breuers Jirmejah-Version, zeigt im Jeremiabuch sein Porträt und den passenden Titel. Die Wortkartenstatistik wird zusammen mit den übrigen Breuerbüchern aus dem Gesamtbestand erzeugt.

Bestanden: beide Interlinear-Generatoren, gesamte npm-Testsuite (einschließlich der inzwischen auf main hinzugekommenen griechischen Wörterbuch-/Wortkartenverknüpfung), alle 1364 Jeremia-Verse, die 136 normalen Lesungsgruppen und die Leer-/Nur-Qere. Alle 717 Manifest-Prüfsummen stimmen; Quell-JSONs und sämtliche 91581 bisherigen Verszuordnungen bleiben unverändert. Wortkartendaten enthalten nun 4457 Breuer-Lemmata. Private Buber-Texte oder -Zuordnungen sind nicht Bestandteil dieser Arbeit.
