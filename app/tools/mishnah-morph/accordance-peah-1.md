# Accordance: erster Peah-Abgleich

## Ergebnis und geprüfter Umfang

19 ausgewählte Wortpositionen in Peah 1:2–6 wurden anhand von vier tatsächlich
visuell geprüften Nutzer-Screenshots aus „Mishna-Tagged (Kaufmann)“ geprüft:
16 bisher unbestimmte Positionen erhalten einen Kandidaten, zwei zuvor
mehrdeutige Positionen werden geklärt und ein bereits vorhandener Kandidat wird
korrigiert. Das ist **kein vollständiger Vergleich aller Wörter von Peah 1:2–6**.

| Referenz | Wortnummern | Gegenstand |
| --- | --- | --- |
| Peah 1:2 | 2, 8, 17 | פוחתין, שאמרו, רוב |
| Peah 1:3 | 5, 17, 18 | ומאמצעה, שייר, קלח |
| Peah 1:4 | 7, 8, 11, 13, 14, 18 | ונשמר, וגידוליו, ולקיטתו, ומכניסו, לקיום, והקטניות |
| Peah 1:5 | 2, 4 | האוג, והאגוזים |
| Peah 1:6 | 22, 40, 42, 48, 50 | ולעופות, כהן, שלקח, שימרחו, ופודה |

Alle Entscheidungen stehen in `accordance-peah-1.json`, mit genauer
vokalisierter Safran-Wortform, Kaufmann-Text-Fingerprint, vorherigem
Analysebestand, Dateiname, Google-Drive-Datei-ID, SHA-256 des Originalbildes,
sichtbarem Accordance-Lexem und Tag-Zeile. Die Fotos selbst werden nicht ins
Git-Repository aufgenommen. Die Ausgangsbilder liegen im Arbeitsbestand unter
`/workspace/mishnah-drive`.

## Quellenkritische Unterscheidungen

- כהן ist hier „Priester“, keine Verbindung aus כ־ und הן. שלקח ist eine
  Relativpartikel mit Qal-Perfekt, keine zusätzliche Präposition mit Imperativ.
- ונשמר ist im Screenshot ein Nifʿal-Partizip. Die vorherige Bestimmung als
  Perfekt wird nur an dieser konkret geprüften Position ersetzt.
- Bei ומאמצעה, וגידוליו, ולקיטתו und ומכניסו sind Suffixmerkmale aus unserer
  vokalisierten Form und dem Satzkontext ergänzt. Die Tag-Zeile zeigt diese
  Merkmale nicht gesondert; die Wortkarte macht diese Grenze sichtbar.
- לקיום hat im Screenshot nur einen Präpositions-Tag. Der verschmolzene Artikel
  in unserer Form לַקִּיּוּם wird redaktionell ergänzt, nicht Accordance zugeschrieben.
- Die nominalen Grundformen רוב und גידול sowie die rabbinische Piʿel-Grundform
  שייר werden redaktionell normalisiert; die abweichenden sichtbaren
  Accordance-Lemmata רב, גדול und שאר bleiben unverändert im Nachweis stehen.
- Die Kurzübertragungen ins Deutsche und Englische sind redaktionell erstellt,
  keine in den Screenshots vorhandenen Accordance-Übersetzungen.
- Wortkarten behalten den Status „Kandidat“. Die konkrete Bildprüfung und ihre
  Grenzen stehen zusätzlich unter „Accordance-Bildbeleg“. Keine Übertragung auf
  gleich geschriebene Wörter anderer Stellen oder auf Handschriftenzeilen.

## Bildinventar und offene Arbeit

`accordance-peah-inventory.json` erfasst die ersten 50 über die öffentliche
Drive-Ordnerseite aufgelisteten Dateien mit Originalnamen und Fingerprints.
Die dortigen Referenzlisten wurden per OCR aus dem rechten Bildrand gewonnen.
Sie sind **Suchhinweise**, kein Beweis vollständig erfasster Mischnajot. Sie
reichen ungefähr von Peah 1:2 bis 6:9; Bild 0 enthält Peah 1:3–4. Teilweise
angeschnittene Abschnitte, Überlappungen und weitere Ordnerdateien bleiben zu
prüfen. Nur vier Bilder sind als Belege der 19 Entscheidungen markiert.

Nach diesem Satz bleiben in Seraim 3.971 Wortpositionen unbestimmt. Die
vorausgehenden Berakhot-Entscheidungen und die ursprünglichen Be’eri-Texte sind
unverändert. Die nachfolgenden Durchgänge stehen in `accordance-peah-2.json` und
`accordance-peah-3.json`; der aktuelle Gesamtstand und die offenen weiteren
Traktate sind in `accordance-zeraim-progress.md` dokumentiert.

## Validierung

Die Node-Tests prüfen Quellbindung, unveränderte Berakhot-Daten, gültige
Morphologie-Segmente, Bild-Fingerprints im Inventar, das ausdrückliche
Suffixmerkmal und den nicht übertragenen Bestand von Peah 1:1. Der
Electron-Test öffnet jede der 19 neuen Karten und kontrolliert Kurzbedeutung
sowie die originale Tag-Zeile im Belegabschnitt; der bestehende Durchlauf über
alle 23.447 Seraim-Wortpositionen bleibt erhalten.
