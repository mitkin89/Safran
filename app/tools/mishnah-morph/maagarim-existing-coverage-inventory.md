# Ma’agarim: belegte bestehende Teilprüfungen

Inventarprüfung: 27.11.2026. Der ursprüngliche Abschnitt dokumentiert vorhandene Artefakte. Der neue gezielte Nachgang unten ist davon getrennt. Ein vollständiger Wort-für-Wort-Abgleich der Mischna oder eines ganzen Seders ist damit **nicht** belegt.

| Bereich | Vorhandener Nachweis | Aussagegrenze |
| --- | --- | --- |
| Berakhot | `maagarim-review.md`, `lexical-adjudication.md`, `full-review-226.json` | Gezielte Live-Wortdetailprüfungen über Kapitel 1–9. Die 226 sind die Zahl eines gemischten Grammatik-/Wörterbuch-/Accordance-Prüfdurchgangs, **keine 226 Ma’agarim-Neuabfragen**. 47 Entscheidungsgruppen erwähnen Ma’agarim, vielfach ausdrücklich als Wiederverwendung früherer Prüfungen. |
| Übrige zehn Zeraim-Traktate | `zeraim-maagarim-review.json` | 24 zusammenfassende Stichprobenzeilen, teilweise mit Referenzbereichen und mehreren Wörtern. Keine vollständige Positionszählung oder Seder-Abdeckung. |
| Peah: sechs genaue Einzelbelege | `accordance-maagarim-followup.json` und `.md`; Kandidaten in `accordance-peah-maagarim.json` | Peah 4:1#16 בחליקי; 4:5#2 הבעיות; 4:11#1 חוררי; 5:8#2 לכובעות, #3 ולכומסות, #4 ולחררה. Wort-IDs, Primär-URLs, ausgelesene HTML-Attribute und HTML-SHA dokumentiert. Vor allem Lemmabelege, keine vollständigen Flexionstags. |
| Demai 7:4#19 מחל | `accordance-maagarim-demai-7-4-followup.json` und `.md`; `accordance-demai-maagarim.json` | Wort-ID 991010: חלל 1, ausdrücklich Hifil-Partizip. Keine eigenständige Bestätigung sämtlicher Vokal-/Genus-/Numerusmerkmale. |
| Sheviit 4:8#14 בשאר | `accordance-sheviit-maagarim-followup.json` und `.md`; `accordance-sheviit-maagarim-4-8-evidence.html`; `accordance-sheviit-maagarim.json` | Wort-ID 995424: konkrete Form בשאר und Lemma שאר; Roh-HTML gesichert. Vollständiger Morphologietag ist redaktionelle Ableitung, kein gelieferter Ma’agarim-Tag. |
| Moed und Naschim: ursprünglicher Bestand | Bei der ursprünglichen Bestandsprüfung kein positionsgebundener Ma’agarim-Abgleich gefunden | Der neue Moed-Nachgang unten ergänzt fünf Belege. Naschim weiterhin ohne dokumentierten positionsgebundenen Ma’agarim-Nachgang. |

Alle Pfade oben sind relativ zu diesem Verzeichnis. Die acht detaillierten Nachgangsbelege sind keine acht vollständigen morphologischen Zertifizierungen; Kandidatendateien wiederholen dieselben Belege und dürfen nicht zusätzlich gezählt werden.

## Umfang der 24 Zeraim-Stichprobenzeilen

Peah 1:3, 1:5, 2:5, 2:8, 3:1, 3:2, 3:5; Demai 1:2, 1:3, 2:2 (zwei Wörter); Kilayim 1:1–3; Sheviit 1:1–4 und 1:4; Terumot 1:2 und 1:4–5; Maasrot 1:1; Maaser Sheni 1:1–2; Challah 1:1–4 und 1:3; Orlah 1:1–2; Bikkurim 1:1,3, 1:2–6 und 1:5.

Bei Berakhot konkret dokumentiert sind beispielsweise מתחיל 5:3, שגרה 4:3/5:5, מוטל 3:1, שיטיל 3:5, לחלק 7:4 sowie die יכול-Belege 3:5 und 4:5. Nominales Lemma, Kontextfunktion und vollständige Flexionsanalyse bleiben getrennt. Ma’agarim markiert etwa זקנה in 9:5 nur als Zitat; das entscheidet keine morphologische Alternative. Berakhot 8:3/8:4 sind zwischen den Quellen anders nummeriert; Textabgleich ist erforderlich.

## Quellen und Grenzen

Die dokumentierte Primärquelle ist das Historische Wörterbuchprojekt der Akademie der hebräischen Sprache, Kaufmann A 50, shibbur 31000. Direkte URLs, Wort-IDs und gesicherte Attribute stehen in den genannten Einzelbelegdateien. Das ist keine unabhängige Handschrift gegenüber Kaufmann. Allgemeine Suchtreffer oder künftige Nachprüfungsnotizen zählen nicht als erfolgte Positionsprüfungen; Terumot 9:1 יוֹפַךְ ist beispielsweise in `accordance-terumot-9-open.json` ausdrücklich weiterhin offen.

Die ursprüngliche Bestandsprüfung hat weder neue Ma’agarim-Abfragen durchgeführt noch Text, Punktierung oder Analysekandidaten verändert. Sie bestätigt die Existenz und den deklarierten Umfang der Artefakte, nicht rückwirkend jede darin berichtete Live-Lesung.

## Neuer gezielter Moed-Nachgang am 27.11.2026

`moed-maagarim-priority1-initial-evidence.json` dokumentiert fünf neu abgefragte,
positionsgebundene Kaufmann-Belege aus drei gesicherten Primär-HTML-Seiten:
Beitzah 3:4 יעלה und ניכר, Beitzah 3:5 ששאלו, Chagigah 3:6 נגענו sowie
Eruvin 10:1 המוציא. Word-IDs, konkrete Beleg-URLs, HTML-Auszüge und SHA-256
sind je Beleg gespeichert. Die gespeicherten HTML- und Exzerptbytes wurden
unabhängig gegen die angegebenen Hashes geprüft.

Ma’agarim liefert bei Eruvin 10:1 ausdrücklich zwei alternative Analysen; beide
bleiben erhalten. Chagigah 3:6 hat dort Qal, während das frisch nochmals gelesene
Accordance-Original tatsächlich Hifil druckt. Der Quellenwiderspruch bleibt
sichtbar und wird nicht durch stilles Ändern einer Transkription aufgelöst.
Person, Genus, Numerus und Vokale sind durch diese HTML-Belege nicht separat
bestätigt, soweit solche Angaben nicht ausdrücklich geliefert werden.

Dies ist ein gezielter Anfang, kein vollständiger Moed-Abgleich. Die historische
`moed-maagarim-followup-pending.json` bleibt eine unveränderte Liste des damaligen
Prüfbedarfs; sie ist zusammen mit den neueren Einzelbelegen zu lesen. Keine
Wortkarte, Punktierung oder Kaufmann-Textstelle wurde durch diesen Nachgang geändert.
