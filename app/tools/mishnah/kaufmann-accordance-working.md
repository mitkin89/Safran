# Berakhot: vorläufige Accordance-Arbeitsfassung

Die zusätzliche Ausgabe **Kaufmann A50 (Digital Mishnah), provisional Accordance
pointing** umfasst alle neun Kapitel und 57 Einheiten bis zum Ende von Berakhot.
Sie wird als Arbeitsauswahl angeboten; vorhandene andere Ausgaben bleiben
erhalten. Die Konsonantenbasis ist unverändert die Digital-Mishnah-Transkription
von Kaufmann A50 (S07326).

## Punktierung

Von 2.170 diplomatischen Wortpositionen erhalten 1.844 Punkte aus der vom Nutzer
kopierten Accordance-Abschrift. 326 Positionen bleiben offen. Dort bleibt der
ursprüngliche unpunktierte Quelltext stehen; es gibt keine verdeckte
Be’eri-Ersatzpunktierung. Auch die übertragenen Wörter sind keine abschließend
am Manuskript geprüfte Vokalisation.

Übertragen wird nur bei einem eindeutigen Konsonantenanker innerhalb derselben
Einheit und exakter Übereinstimmung sämtlicher Nichtpunkt-Zeichen. Die
Originalschreibung, Satzzeichen, Abkürzungen, Quellkorrekturen und Roh-TEI
werden nicht umgeschrieben. Entfernt man ausschließlich die protokollierten
Ergänzungen, erhält man die exakte ursprüngliche Zeichenfolge zurück.

Die 326 offenen Positionen teilen sich nach dem ersten zutreffenden Sperrgrund
wie folgt auf (exklusive Kategorien im unabhängigen Feasibility-Audit):

| Grund | Positionen |
|---|---:|
| Quellenannotation am Zielwort | 89 |
| Keine sichere eindeutige Wortzuordnung | 67 |
| Referenzwort mit redaktionellem Quellenzeichen | 9 |
| Fragwürdige exportierte Punktierung | 6 |
| Nicht identische Abkürzungszeichen, insbesondere ASCII-Apostroph/Geresch | 151 |
| Geeignetes Referenzwort ohne Punktierung | 4 |

Die ausführlichen Gründe im Arbeitsaudit können sich dagegen überschneiden.
Keine ganze Mischna-Einheit wird wegen einer einzelnen Beschädigungsannotation
pauschal ausgelassen. Unsichere Quellzeichen bleiben als solche erhalten.

## Wortkarten und Belege

Die 2.170 diplomatischen Positionen ergeben wie zuvor 2.171 lexikalische Karten:
eine Quellabkürzung wird vom Leser in zwei Tokens zerlegt. Jede Karte behält ihre
positionsgenaue Quellzuordnung und ihre Bildfundstelle. Bildlesungen, ihr
Unsicherheitsstatus und sämtliche D/P/C-Zuordnungen wurden nicht geändert.

Die Herkunftsangaben trennen:

- **Punktierung:** Accordance-Abschrift, vorläufig bzw. offen.
- **Analyse:** vorhandener positionsgebundener Vorschlag aus der Be’eri-Vorarbeit.
  Eine andere Punktierung bestätigt diesen Vorschlag nicht. Betroffene Karten
  sind ausdrücklich nur teilweise bestimmt und zeigen gegebenenfalls die
  bisherige Analysewortform.
- **Kurzbedeutung:** vorhandene redaktionelle Bedeutung zur vorgeschlagenen
  Analyse; nicht erneut für die neue Lesung bestätigt. Die Wörterbuchauswahl
  bleibt auf Jastrow, Levy und Krauss beschränkt.

344 der ursprünglich 550 leeren Karten erhalten nun vorhandene Analysevorschläge
aus eindeutigen Einzelwortverknüpfungen des Interlinears. Die übrigen **206**
bleiben ohne Analyse. Übertragen wird nur bei einmalig verknüpften, nicht
annotierten Wortpositionen, identischen Konsonanten, einer zugeordneten
Abkürzung oder der ausdrücklich belegten Schreibvariante רשיי / רשי. Die
Punktierung bleibt davon unabhängig. Es gibt keine globale Normalisierung
der Kaufmann-Schreibung und keine neue Analyse allein aufgrund einer Vokalform.

Die fünf Singularstellen רשיי in 1:4 und 5:4 sind zusätzlich mit Levy,
Eintrag 17688 (רשיי / רשאי), abgeglichen: prädikatives Adjektiv, männlicher
Singular, „berechtigt; befugt“. Eintrag und Wörterbuchdatei sind durch SHA-256
gebunden. Der Befund ist eine KI-Kontextprüfung, keine menschliche Freigabe
oder Bestätigung der Manuskriptpunktierung. Die Karten öffnen den konkreten
Levy-Beleg. Entscheidungen stehen in `kaufmann-lexical-decisions.json`;
alle automatischen Übernahmen und Ablehnungsgründe im Arbeitsaudit.

Der zweite Durchgang ergänzt 170 dieser 344 Übernahmen über positionsgenau
dokumentierte Schreibvarianten. Die 120 unterschiedlichen Schreibpaare sind
auf 170 konkrete Positionen beschränkt; Jod/Waw werden weder im Text noch
für andere Positionen pauschal entfernt. Entscheidungen und Fundkontext stehen
in `kaufmann-interlinear-spelling-decisions.json`. 150 der 170 Positionen haben
zusätzlich einen Stichwort-/Aliastreffer zum vorgeschlagenen Lemma in Levy.
Diese Treffer werden ausdrücklich als Suchbelege angezeigt; sie bestätigen
weder automatisch die Homographenwahl noch die Morphologie oder Bedeutung.
Die übrigen 20 Übernahmen beruhen auf der dokumentierten Interlinearzuordnung,
nicht auf einem behaupteten Wörterbuchtreffer.

Alle 206 noch leeren Karten werden unter `remainingAnalysis` einzeln erfasst:
90 mit Quellenannotation, 25 mit mehrdeutiger Verknüpfung, 38 ohne sichere
Einzelwortanalyse, zwei mit annotierter/mehrfach verwendeter Quellposition
und 51 mit abweichender Wortform oder fehlender Analyse auf der Quellseite.
Der jeweilige Sperrgrund erscheint auch in der Wortkarte. Die unveränderten
326 offenen **Punktierungen** sind eine davon getrennte Zählung.
153 Karten mit vorhandenen Vorschlägen sind wegen abweichender oder offener
Punktierung als teilweise bestimmt gekennzeichnet; die übrigen Analysen bleiben
ebenfalls Vorschläge.

Der bekannte Einzelzeichenkonflikt **3:1, diplomatischer Index 14** bleibt in der
Karte sichtbar: Accordance liefert אֵת, die KI-Bildablesung erfasst Segol unter
א. Die Arbeitsfassung folgt vorläufig Accordance und überschreibt sie nicht
automatisch mit der unsicheren Bildwortlesung.

## Daten und Prüfungen

- `kaufmann-accordance-working-audit.json`: alle offenen Positionen, Herkunft und
  explizite Bildkonflikte.
- `kaufmann-accordance-feasibility.json`: unabhängiger Audit mit Quell-, Referenz-
  und finalem Datensatzhash.
- `app/mishnah-kaufmann-accordance-data.js`: neue Arbeitsdaten und Wortkarten.
- `app/mishnah-kaufmann-accordance-image-data.js`: separat an diese Ausgabe
  gebundene, inhaltlich unveränderte Bildbelege.

Die Referenzabgabe ist an SHA-256
`47fdd2eb361a960f1c7a42dcb6b8e6091caf1b7665bfb0ecfd90debed64e3f78`
gebunden. Ihre vollständige Rohfassung bleibt außerhalb des Repositories. Die
Arbeitsausgabe schreibt keine offene Lizenz für die gelieferte Accordance-
Punktierung zu; die Digital-Mishnah-Konsonantenbasis behält ihre Attribution.

```sh
node app/tools/mishnah/build_kaufmann_accordance.cjs /private/reference.txt
node --test app/tests/kaufmann-accordance.test.js
```

Der echte Electron-Test läuft mit `SAFRAN_SMOKE_KAUFMANN_ACCORDANCE=1`. Er prüft
alle 57 Einheiten, Quellwörter und Wortkarten zusammen mit den bisherigen
Ausgaben, offene Wörter, Provenienz, Bildbelege und ausgabenspezifische
Hash-Sperren. Ursprüngliche Digital-Mishnah- und Be’eri-Dateien bleiben erhalten.
