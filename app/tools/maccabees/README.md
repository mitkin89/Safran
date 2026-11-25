# Makkabäer I–IV: Zuordnung der Textabschnitte

Alle **56 Kapitel** der vier Bücher sind nach inhaltlich verglichenen
Abschnitten ausgerichtet. Native Texte, Vers-/Absatznummern, leere Quelleinträge
und Editionszugehörigkeit bleiben erhalten. Es werden keine Verse umnummeriert
oder Wörter zwischen Fassungen ergänzt.

## Abdeckung und Quellen

- **I: 16 Kapitel** – Kautzsch ↔ Rahlfs, Frankel ↔ Kautzsch und Kahana ↔ Rahlfs.
- **II: 15 Kapitel** – Kautzsch ↔ Rahlfs und Frankel ↔ Kautzsch.
- **III: 7 Kapitel**, **IV: 18 Kapitel** – Kautzsch ↔ Rahlfs.

Kautzsch (1900) und Septuaginta (Rahlfs) stammen unverändert aus
`bundled/manifest.json`; Herkunft und Lizenzen siehe `SOURCES.de.md`.
Frankels gemeinfreie hebräische Fassung wurde über die Sefaria-API abgeglichen;
Sefaria nennt die Da'at-Ausgabe als Vorlage. Die beiden öffentlichen
Testquellen `tests/fixtures/maccabees-{i,ii}-he.json` bewahren die Versions-,
Quellen- und Lizenzangaben der API. Die Frankel- und Kahana-Textstände
wurden zusätzlich mit den von Safran geladenen `merged.json`-Dateien des
öffentlichen Sefaria-Export-Buckets verglichen; die Buchtexte stimmen
bytegenau als JSON-Textarrays überein.

Kahanas Fassung wurde ebenfalls am vollständigen Sefaria-Text und am als Quelle
genannten hebräischen Wikisource-Text geprüft. `kahana-source.json` enthält nur
Versionsangaben, Kapitelumfänge und Prüfsummen; der Kahana-Wortlaut wird hier
nicht neu verteilt.

## Grenzen der Zuordnung

Die Tabellen `*-groups.json` enthalten aufsteigende, inklusive Bereiche. Gleiche
Kapitelgrößen wurden nicht als Zuordnungsnachweis verwendet. Satzfortsetzungen,
zusammengezogene bzw. geteilte Verse und übergreifende Grenzen werden zu einem
größeren Textabschnitt gruppiert. Das ist eine Entsprechung von Passagen,
keine Wortzuordnung oder Gleichsetzung der Lesarten.

Einzelprüfungen und Quellenbelege sind dokumentiert in:

- `maccabees-i-notes.json`
- `maccabees-ii-review.md`
- `maccabees-iii-iv-notes.md`
- `hebrew-boundary-review.md`

Besondere Fälle:

- II 1:8–9 (Frankel/Kautzsch) ↔ Rahlfs 1:8.
- II 8:16–26 ↔ Rahlfs 8:14–20: Die versetzte Gebetsfortsetzung verlangt eine
  größere Gruppe; eine engere lineare Gleichsetzung wäre falsch.
- Kautzsch I 13:19 und II 4:24 sowie einzelne griechische Einträge in IV sind
  leer. Die Nummern danach behalten ihre ursprünglichen Werte.
- **IV 7:24 (Deutsch) ↔ 8:1 (Griechisch)** liegt an einer anderen Kapitelgrenze.
  Die Anzeige setzt dort einen Verweis zum entsprechenden Kapitel statt einer
  falschen Zuordnung zu einem Vers desselben Kapitels. `[0,0]` bedeutet in den
  Tabellen ausdrücklich, dass innerhalb dieses Kapitels keine Gegenseite steht.

## Aufbau und Textstandsprüfung

```sh
node tools/maccabees/build-alignment.js
node --test tests/maccabees-alignment.test.js tests/library-works.test.js
SAFRAN_SMOKE_MACC_ALIGNMENT=1 electron tests/electron/smoke.cjs
```

`compose.js` führt die unabhängig geprüften Tabellen über gemeinsame
Quellenachsen zusammen. Überlappende Grenzen ergeben größere Gruppen;
Numerik oder relative Absatzposition werden nicht zur Interpolation benutzt.
Jede Quellenachse wird auf lückenlose, monotone und einmalige Abdeckung geprüft.

Die Laufzeitdaten enthalten die vom Backend ebenfalls ermittelte **SHA-256 des
gesamten Buchtextes** und einen zusätzlichen Rendering-Prüfwert je Kapitel
(Nummern und normalisierte HTML-Spalten). Nur wenn alle gewählten Fassungen
zum geprüften Stand passen, wird die Zuordnung angewandt. Geänderte oder
unbekannte Fassungen bleiben getrennt; gleiche Nummern erzeugen für sie keine
behauptete Entsprechung.

Der Oberflächentest prüft alle 56 deutsch-griechischen und alle 31
Frankel-griechischen Kapitelvergleiche samt Originalnummern und Höhenpositionen.
Mit `SAFRAN_KAHANA_SOURCE=/pfad/zur/sefaria-api-antwort.json` prüft er zusätzlich
alle 16 Kahana-Kapitel, ohne den Text in den Testbestand aufnehmen zu müssen.
Die Antwort muss zum dokumentierten SHA-256 in `kahana-source.json` passen.
