# Makkabäer I–IV: gemeinsame Verszählung

Alle **56 Kapitel** werden in der Verszählung der mitgelieferten Septuaginta
(Rahlfs) dargestellt. Jede sichtbare Zeile entspricht genau einem dieser
Verse, unabhängig von der Auswahl der Fassungen. Anders geteilte Quelleinträge
werden dafür verbunden oder an geprüften inhaltlichen Grenzen geteilt.
Die Quelldateien bleiben unverändert. Originalstellen und Textintervalle bleiben
an jeder Zelle hinterlegt; ihre Zählung erscheint beim Überfahren.

## Abdeckung und Quellen

- **I: 16 Kapitel** – Kautzsch, Rahlfs, Frankel, Kahana, englischer Brenton-Export
  und die vorhandenen englischen Kahana-Einträge.
- **II: 15 Kapitel** – Kautzsch, Rahlfs, Frankel und die vorhandenen englischen
  Einträge der Sefaria Community Translation.
- **III: 7 Kapitel**, **IV: 18 Kapitel** – Kautzsch und Rahlfs.

Kautzsch (1900) und Rahlfs stammen unverändert aus `bundled/manifest.json`;
Herkunft und Lizenzen stehen in `SOURCES.de.md`. Die gemeinfreien Frankel-Texte
liegen mit Quellenangaben in `tests/fixtures/maccabees-{i,ii}-he.json`.
Kahana wurde am vollständigen Sefaria-Text und hebräischen Wikisource-Text
geprüft. `kahana-source.json` bewahrt nur Metadaten und Prüfsummen.
Die englischen Testdateien enthalten die tatsächlich geladenen, attribuierten
Sefaria-Exporte; deren Lücken werden nicht ergänzt. Einzelheiten zu diesen
Textständen stehen in `english-boundary-review.md`.

## Geprüfte Versgrenzen

Die ursprünglichen `*-groups.json`-Tabellen belegen die Zusammengehörigkeit
von Passagen. Sie genügen allein nicht für eine Darstellung einzelner Verse.
`canonical-*.json` ergänzt deshalb genaue, inhaltlich geprüfte Schnitte für
mehrversige Gruppen. Die Dateien enthalten Arrays von:

```json
{"chapter": 1, "greek": [12, 13], "parts": [[[16, 0, 100]], [[16, 100, 180]]]}
```

`parts` enthält je griechischem Zielvers eine Liste von Quellintervallen:
`[nativerEintrag, Start, Ende, optionalesQuellkapitel]`. Einträge und Kapitel
sind 1-basiert, Offsets entsprechen JavaScript-UTF-16; das Ende ist exklusiv.
Die Zahlen im Beispiel illustrieren nur das Format.

Erweiterte Korrekturen dürfen benachbarte ursprünglich einversige Gruppen
ersetzen. Das verhindert, dass etwa eine einleitende Redewendung beim falschen
Vers bleibt. Tatsächlich umgestellte Teilsätze werden nach ihrem Inhalt
zugeordnet; Wortlaut und Quellprovenienz bleiben erhalten. Die Anzeige ergänzt
keine fehlenden Wörter und behauptet keine Wort-für-Wort-Gleichheit.

Prüfhinweise stehen in `canonical-i-de-review.md`, `canonical-ii-de-review.md`,
`canonical-iv-de-notes.md` und `canonical-he-review.md`.

Besondere Fälle:

- II 8:26 enthält eine versetzte Gebetsfortsetzung. Sie wird beim passenden
  griechischen Vers dargestellt, nicht durch proportionale Aufteilung angenähert.
- IV 7:24 (Deutsch) entspricht griechisch 8:1 und erscheint deshalb dort mit
  der ursprünglichen Quellenstelle 7:24.
- Leere Quelleinträge bleiben leer. Es werden weder griechische Wörter noch
  englische Kapitel ergänzt, um Lücken zu verdecken.

## Aufbau und Prüfung

```sh
node tools/maccabees/build-alignment.js
node --test tests/maccabees-canonical.test.js tests/maccabees-alignment.test.js tests/library-works.test.js
SAFRAN_SMOKE_MACC_ALIGNMENT=1 electron tests/electron/smoke.cjs
```

Die Laufzeit prüft die vollständige Buch-SHA-256 und zusätzlich die nativen
Kapitelnummern samt HTML-Prüfwerten. Nur bekannte Textstände erhalten die
geprüften Versgrenzen. Unbekannte oder geänderte Fassungen erhalten keine
unbelegte Zuordnung.

`maccabees-canonical.test.js` prüft alle Zielversnummern sowie jeden originalen
Quelltextcharakter auf vollständige und genau einmalige Verwendung über das
gesamte Buch. Das schließt Umstellungen über Kapitelgrenzen ein. HTML-Formatierung
wird beim Teilen ausgeglichen; Fußnoten bleiben beim zugehörigen Textintervall.

Die Oberflächentests prüfen die tatsächlichen Fassungswahlen, gemeinsame
Versnummern, Spaltenpositionen und Quellintervalle. Mit
`SAFRAN_KAHANA_SOURCE=/pfad/zur/sefaria-api-antwort.json` werden zusätzlich die
vollständigen Kahana-Quellen geprüft, ohne ihren Wortlaut mitzuliefern.
