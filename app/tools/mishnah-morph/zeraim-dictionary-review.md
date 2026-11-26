# Seraim: Abgleich mit den rabbinischen Wörterbüchern

Stand: 26. November 2026. Die nachfolgenden Zahlen halten den Wörterbuchdurchgang fest. Der anschließende Kontextdurchgang und die aktuellen Gesamtzahlen stehen in `zeraim-context-review-1.md`. Dieser Durchgang unterscheidet eine vollständige
Stichwortsuche von der redaktionellen Auswertung einzelner Artikel. Ein Treffer
ist kein Nachweis für die Wortart, die Bedeutung im Satz oder eine vollständige
Flexionsbestimmung.

## Vollständige Stichwortsuche des Ausgangsbestands

Alle **3.835 offenen oder mehrdeutigen Formgruppen** (11.395 laufende
Wortpositionen) wurden gegen alle Stichwörter und Aliasformen der drei lokal
gebündelten Wörterbücher durchsucht:

| Wörterbuch | Gruppen mit mindestens einem Treffer |
|---|---:|
| Jastrow | 2.078 |
| Levy, Wörterbuch Bd. 1–4 | 1.877 |
| Krauss, Griechische und lateinische Lehnwörter II | 277 |

Die Mengen überschneiden sich. Insgesamt hatten **2.114 Gruppen** einen
Treffer, **1.721** keinen. `zeraim-dictionary-initial-summary.json` hält diesen
Ausgangsstand und die SHA-256-Fingerprints der Wörterbuchdateien fest.

Gesucht wurde nach der ganzen Quellform, bereits vorgeschlagenen Lemmata und
klar als Suchziele bezeichneten möglichen Restformen nach Proklitika. Die Suche
unterscheidet gleiche Vokalisierung, genaue unvokalisierte Stichwörter und bloße
Konsonantengleichheit. Sie errät keine Wurzel aus einem vermeintlichen Verbstamm,
weist keine Wortart aus einer Genusangabe zu und wählt nicht einfach das erste
Homonym aus. Ohne Stichworttreffer kann das Lexem trotzdem im Artikeltext oder
unter einer anderen Grundform vorhanden sein.

`dictionary-audit.cjs` erzeugt den vollständigen aktuellen Positions-/Trefferbericht
`zeraim-dictionary-audit.json` und den kleineren Laufzeitbestand
`mishnah-dictionary-data.js`. Der Bericht ist reproduzierbar:

```
node app/tools/mishnah-morph/build-zeraim.cjs
node app/tools/mishnah-morph/dictionary-audit.cjs
```

## Redaktionell ausgewertete Artikel

`zeraim-dictionary-decisions.json` enthält 14 explizite Formentscheidungen
(13 Lexemgruppen), konkrete lokale Artikelindizes, die Begründung, die
Analysekandidaten und redaktionelle Kurzglossen. Es werden keine vollständigen
Artikel in den Morphologiebestand kopiert.

- **רבעי**: Jastrow 6842 und Levy 17207 beziehen sich ausdrücklich auf Früchte
  im vierten Pflanzjahr. Nominale und adjektivische Kandidaten bleiben sichtbar.
- **עריס**: Jastrow 20848/20850 und Levy 14195/14196 unterscheiden Weinspalier
  und Pächter. Die Kilayim-Belege betreffen das Spalier; die gemeinsame Wortform
  darf die lexikalische Homonymie nicht verschwinden lassen.
- **כרשני**: Jastrow 8585 verweist auf den Pflanzenartikel; Jastrow 8597 und
  Levy 9005 stützen das feminine Pflanzenlemma כרשינה. Die untersuchten
  Konstruktusformen vor תרומה bzw. מעשר sind feminine Plurale trotz ־ים/־ין.
- **פרוזבול**: Jastrow 31218, Levy 15101 und Krauss 5217 stützen das maskuline
  Prosbul-Lemma. Zwei vokalisierte Quellvarianten werden unverändert zugeordnet.
- **אֹרֶז**: Jastrow 7433, Levy 1991 und Krauss 345 betreffen אורז „Reis“.
  Die defektive Be’eri-Schreibung wird nicht zu אֶרֶז „Zeder“ umgedeutet.
- **לוף**: Jastrow 5919 und Levy 9291 behandeln die essbare Pflanze. Das
  gleich geschriebene Verblemma wird nicht übernommen; die botanischen
  Identifikationsunterschiede bleiben im Bedeutungsvermerk kenntlich.
- **הבקר**: Jastrow 30140 verweist auf הפקר (31048); Levy 4809 behandelt die
  palästinische Form direkt. Ein selbständiges Substantiv, kein Artikel + בקר.
- **מָנֶה**: Jastrow 1401 und Levy 10571: maskulines Gewichts-/Geldmaß;
  die anders vokalisierte feminine מָנָה „Portion“ gehört nicht hierher.
- **שקמה**: feminines Baumlemma nach Jastrow 19480 und Levy 18724.
- **סרק**: Jastrow 27609 und Levy 13418 erklären אילן סרק. Krauss 4569
  „färben“ bleibt ein verworfener Homographentreffer für diese Belege.
- **לוכסן**: Jastrow 5829 bezeichnet die Verwendung als adverbial, Levy 9432
  und Krauss 3652 als adjektivisch. Beide Kandidaten bleiben erhalten.
- **כגון**: Verweisartikel Jastrow 26089/Levy 8238 wurden bis Jastrow 12749
  bzw. Levy 3440 verfolgt: „zum Beispiel“; keine Übertragung des Verbs גון.
- **אָדָן**: alle acht Quellkontexte separat gelesen: Variante von אדם
  „Mensch“. Die automatischen Treffer אֻדַן/אֶדֶן „Sockel“ wurden verworfen.
  Diese Zuordnung beruht auf dem Quellkontext, nicht auf jenen Treffern.

Die Artikelnummern sind nullbasierte Indizes der mit Fingerprint bezeichneten
lokalen Datenpakete, keine Druckseiten.

## Ergebnis und verbleibende Arbeit

**102 zuvor unbestimmte Wortpositionen** erhalten durch diese Entscheidungen
Kandidaten; 89 nun einen und 13 mehrere. Der unveränderte Gesamttext enthält
weiterhin 23.447 Wörter: jetzt 12.141 mit einem Kandidaten, 7.042 mit mehreren
und 4.264 ohne Bestimmung. Das sind Abdeckungszahlen, keine Genauigkeitsquote.
Der bereits geprüfte Berakhot-Datensatz und seine Kontextkorrekturen bleiben
unverändert.

Nach Neuberechnung umfasst die aktuelle Unsicherheitsliste 3.813 Gruppen mit
11.306 Positionen; 2.092 Gruppen haben Stichworttreffer. Die 1.721 Gruppen ohne
Treffer bleiben ausdrücklich offen. Auch Treffergruppen sind nicht pauschal
redaktionell oder morphologisch validiert. Eine flächendeckende semantische
Einzelprüfung aller Artikel und Satzkontexte ist damit noch nicht abgeschlossen.

Die Wortkarten zeigen die gefundenen Artikel mit Wörterbuchname und Treffertyp.
Ein Klick öffnet die Stichwortsuche im gewählten Wörterbuch. Für die explizit
ausgewerteten Formen werden nur die dokumentierten Belegartikel als solche
angegeben. Mehrere Homonyme bleiben getrennt erreichbar.

28 Node-Tests prüfen unter anderem die lückenlose Zuordnung aller offenen
Positionen, die Wörterbuchfingerprints, jeden Artikelverweis, die Zurückweisung
falscher Homonyme sowie Genus-/Vokalisierungsunterschiede. Neue nominale
Kurzglossen überschreiben keine gleich geschriebenen Verben oder anders
geschlechtlichen Substantive (מנה, סרק, לוף). Der Electron-Test
prüft zusätzlich alle 75 Kapitel und die tatsächliche Öffnung der
Prosbul-Wortkarte und der auf Levy eingeschränkten Wörterbuchsuche.

Accordance wurde in diesem Arbeitsschritt nicht verwendet.
