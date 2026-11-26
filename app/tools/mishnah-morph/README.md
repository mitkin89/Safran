# Mischna-Morphologie: Seder Seraim und Berakhot-Prüfstand

Die Wortkarten sind für alle elf Traktate von Seder Seraim in der ausdrücklich
benannten, vokalisierten Be’eri-Ausgabe nach Kaufmann A50 verfügbar.
`zeraim-context-review-1.md` dokumentiert den anschließenden Satzkontextdurchgang
mit 262 beleggebundenen Entscheidungen und den damaligen Gesamtzahlen.
[`krauss-cards-1.md`](krauss-cards-1.md) dokumentiert den ersten ergänzenden
Satz von acht Krauss-Lemmata an 16 konkreten Textstellen mit Kurzbedeutungen,
Artikelverweisen und ausdrücklich Krauss zugeschriebenen Herkunftsangaben.
`zeraim-dictionary-review.md` dokumentiert den systematischen Stichwortabgleich
mit Jastrow, Levy und Krauss sowie die redaktionellen Einzelentscheidungen.
`zeraim-review.md` dokumentiert Abdeckung und Grenzen des neuen Kandidatenbestands;
`zeraim-maagarim-review.json` hält die gezielten Ma’agarim-Prüfungen fest.
Andere Seder und andere Editionen erhalten daraus keine Bestimmungen.

Der folgende ausführliche Prüfstand betrifft weiterhin ausschließlich die
**neun Kapitel / 57 Mischnajot von Mischna Berakhot**. Seine kontextbezogenen
Korrekturen werden nicht auf gleich geschriebene Wörter anderer Traktate übertragen.

2.159 laufende Wortpositionen sind an 941 normalisierte Wortformen gebunden.
1.643 Positionen haben einen Analysekandidaten, 516 mehrere Alternativen.
Die 941 Schriftformen verweisen auf 968 mögliche Analysebestände, da einzelne
Vorkommen inzwischen kontextbezogen unterschieden werden.
Diese Zahlen bezeichnen **Abdeckung, keine Genauigkeit**. Kein Datensatz wird
als vollständig kontextuell geprüft oder als Accordance-validiert ausgegeben.
Die Grammatikregeln allein können syntaktische und lexikalische Mehrdeutigkeit
nicht auflösen.

## Grundlage

- M. H. Segal, *A Grammar of Mishnaic Hebrew*, Oxford 1927, hochgeladener Nachdruck.
- Miguel Pérez Fernández, *An Introductory Grammar of Rabbinic Hebrew*, übers.
  John Elwolde, Brill 1997.

`nominal-sources.md` und `verbal-sources.md` dokumentieren die an den beiden
PDFs geprüften Regeln mit gedruckten Seiten, Abschnitten und PDF-Seiten.
`grammar-sources.json` hält die Buchidentitäten und Dateifingerprints fest.
Die Bücher und ihre Texte werden nicht mitgeliefert. Regeln und lexikalische
Analysen sind eigene Implementierungen grammatischer Fakten.

`lexical-review-a.json` und `lexical-review-b.json` ergänzen eigene Vorschläge
für die anfangs offenen Wortformen anhand des vokalisierten Berakhot-Kontexts.
Sie sind Formkandidaten; wenn eine Form verschiedene Funktionen haben kann,
bleiben Alternativen erhalten. Die Ausgangsformen aus Safrans hebräischem
Bavli-Lexikon dienen zusätzlich als lexikalische Hinweise. Dessen Status
`reviewed`, aramäische Bestimmungen, syntaktische Rollen und kontextuelle
Anmerkungen werden **nicht** als geprüfte Mischna-Tags übernommen.

## Verfahren

1. Die ursprünglichen Textdateien bleiben unverändert. Auch die Vokalzeichen,
   Formatierung, Korrekturen, Verweislinks und Fußnoten bleiben bestehen.
2. Redaktionelle `<small>`-Zählungen, Fußnoten und erkannte Bibelverweise werden
   nicht als Wörter analysiert. Die Originalpositionen der laufenden Wörter
   werden bewahrt, auch über Formatierungsgrenzen hinweg.
3. Ein Wortformenlexikon liefert Kandidaten. Präfixzerlegung und ־ים/־ין-Varianten
   werden nur mit einer belegten Restform verbunden. Aus einer Endung allein
   wird kein Lexem und aus einem sichtbaren Präfix kein sicherer Binyan erfunden.
4. Mehrere passende Analysen bleiben mehrere. Partizip bezeichnet eine Form,
   nicht automatisch die syntaktische Gegenwart. Schwache Wurzeln werden aus
   konkreten Lexemformen gewonnen, nicht aus einer beliebigen Dreier-Restfolge.
5. Das Wortfenster kennzeichnet die Bestimmung als maschinellen Vorschlag,
   erklärt Alternativen und zeigt auf Wunsch die Grammatikstellen. Die Tabelle
   belegter Formen zählt tatsächliche Vorkommen mit möglicher Lemmazuordnung,
   keine erzeugten Paradigmen und keine gesicherte Lemmafrequenz.

Die Codes nutzen das vorhandene H/OSHB-Merkmalsinventar als technische
Darstellung; dies ist **keine kontextuelle OSHB-Annotation der Mischna**. Der separate
Seraim-Bestand verwendet zusätzlich exakt gleich vokalisierte OSHB-Wörter als
ausdrücklich gekennzeichnete Kandidaten, siehe `zeraim-review.md`.

## Bindung an den Text

Die vollständige `SHA-256(JSON.stringify(doc.text))` muss zum Quellstand passen.
Zusätzlich werden alle Wortpositionen einschließlich ihrer Vokalzeichen mit
dem jeweiligen Mischna-Abschnitt verglichen. Veränderte Fassungen, zusätzliche
Wörter, ausgelassene Wörter oder andere Vokalisierungen erhalten keine bloße
Positionszuordnung. Dies gilt auch für die andere, diplomatische Transkription
des Digital-Mishnah-Berakhot-Piloten.

## Lokaler Accordance-Abgleich

Die vom Nutzer genannte Referenz ist MISH-T 4.3 (Kaufmann A50). Ihr Textstand
und ihre getrennten Präfix-/Suffixeinheiten unterscheiden sich von der
Be’eri-Lesefassung. Eine gemeinsame Stellenzahl allein genügt daher nicht.

Die lesbaren Screenshots decken **Berakhot Kapitel 1–9 vollständig** ab:
57 Mischnajot und alle 2.159 Quellwortpositionen sind untersucht. Ein בין
steht nur bei Be’eri, fünf Stellen haben abweichenden Wortlaut. Von den 2.153
grammatisch vergleichbaren Positionen besitzen 1.885 einen Kandidaten, der zu
den sichtbaren Referenzmerkmalen passt. 268 strenge Unterschiede sind
verzeichnet. Dies sind weder eine Genauigkeitsquote noch 268 nachgewiesene
Fehler: Lemma-, Wurzel-, Wortart- und Segmentierungskonventionen sowie
widersprechende Vokalisationen müssen gesondert bewertet werden.

Vier Suffixpositionen sind durch zusätzliche Wortdetails bestätigt.
205 Positionen haben keinen separat sichtbaren Suffix-Tag; diese Suffixe
sind nicht einzeln extern bestätigt. Wie vereinbart bleiben die drei
מצותן-Vorkommen nur auf Formebene bestätigt. Wiederholte Abbildungen von
8:8 zählen einmal. `comparison-summary.json` dokumentiert alle 57 Einheiten
und die offenen Unterschiede; der kommerzielle Referenzexport bleibt privat.

Die eigenen Review-Dateien erklären die Änderungen. Es gibt 149 genau
positions- und quellwortgebundene Kontextverfeinerungen. Lexikalische Regeln
korrigieren Pilpel דקדק, das Plurallemma מים und die bekannte Zahl שִׁשָּׁה
(statt falscher ש/ש/יהוה-Zerlegung). Bei gleichen Vokalen und eindeutigen
Formen sollen geprüfte geschlossene Zahlwörter nicht erneut als relative
Präfixketten zerlegt werden. Das ist keine pauschale Übertragung aller
Berakhot-Korrekturen auf andere Traktate.

Demonstratives אותו/אותה vor einem Nomen wird in den entsprechenden
Kontexten vom Akkusativzeichen mit Objektsuffix getrennt. Bei שגרה,
נזכר und זקנה bestimmen Quellvokalisation und Satzkontext die eigene
Analyse; abweichende Referenztags werden nicht blind übernommen.
Die übrigen offenen Genus-, Wurzel- und Segmentierungsfragen bleiben sichtbar.

`lexical-adjudication.md` führt die anschließende Bewertung durch Grammatiken,
die lokalen Jastrow-/Levy-Artikel und Ma’agarim zusammen. Jastrows ausdrücklicher
femininer Plural korrigiert התפילין an zwei Positionen; konkurrierende Angaben
bei פת und verschiedene Vokalisierungen von שגרה bleiben ausdrücklich erfasst.
`maagarim-review.md` dokumentiert auch abweichende Abschnittsreihenfolge und
Grenzen der dort sichtbaren Merkmale. Der ursprüngliche Accordance-Vergleich
bleibt als eigener Prüfstand erhalten.

## Bewertung von Konventionsunterschieden

`convention-assessment.json` bewertet **47 der 268 aktuellen strengen Unterschiede**
gesondert: 33 Negationspartikel-/Adverb-Tags bei אין, sechs ausgewählte
Adjektiv-/Substantiv-Klassifikationen und acht belegte Lemma-/Schreibvarianten.
Dieser begrenzte Konventionstest erklärt 221 der aktuellen strengen Unterschiede
nicht. Deren vollständige Prüfung ist im folgenden Reststellen-Review dokumentiert.
Die Bewertung ändert weder die strenge Vergleichszahl noch die Wortanalyse.
Sie bestätigt nur die angegebenen lesbaren Merkmale: fehlende Suffix-Tags
bleiben unbestätigt, und ein passender Kandidat macht Alternativen nicht falsch.

Die Negationspartikel ist bei Pérez Fernández 1.6, S.19, ausdrücklich belegt;
Segal §374(viii), S.181, erklärt substantivierte Adjektive/Partizipien.
Lemma-Aliasse gelten nur an den einzeln benannten, lexikalisch geprüften
Positionen. Es gibt keine pauschale Gleichsetzung aller Nomina und Adjektive
und keine globale Entfernung von Matres lectionis. Genus, Numerus, Status,
Stamm und lesbare Suffixmerkmale müssen nach der begrenzten Zuordnung
weiterhin passen. Die Regressionstests prüfen auch widersprechende Merkmale.

Reproduzieren mit der privaten, ausgerichteten Referenz:

```sh
node tools/mishnah-morph/adjudicate-conventions.cjs /path/to/private-aligned-reference.json
```

Die Wortkarten zeigen zusätzliche kurze Bedeutungen. Eigene Glossen sind
redaktionell gekennzeichnet; weitere Bedeutungen stammen aus den vorhandenen
OSHB-Lemmaglossen und sind sichtbar als biblisches Wörterbuch bezeichnet.
Mehrere gleich geschriebene Wörterbuchlemmata werden nicht willkürlich auf
eine Bedeutung reduziert. Fehlende Einträge erhalten keine erfundene
Übersetzung. Diese Bedeutungen sind keine geprüfte Kontextübersetzung.

Das Vergleichswerkzeug akzeptiert eine **private**, zuvor ausdrücklich
zugeordnete Referenzdatei:

```sh
node tools/mishnah-morph/compare.cjs /path/to/private-aligned-reference.json
```

Schema: `module: "MISH-T"`, `version: "4.3"`, `title: "Mishnah Berakhot"`,
`rows: [{ref, word, lemma, morph, token?}]`. `ref` ist z.B. `1:1`, `token` eine
1-basierte Position nach der Pilot-Wortdefinition. Bei ausdrücklich geprüftem
Schriftunterschied kann `sourceWord` den zugehörigen Be’eri-Wortlaut benennen.
Die Referenzcodes sind zuvor in das verwendete Merkmalsinventar zu übertragen.
Alternativ akzeptiert `parts` einzeln gelesene Merkmale pro Morphem.
`unreadable: true` markiert nicht geprüfte Tags. Expliziter Artikel hinter einer
Präposition und verschmolzener Präpositionsartikel gelten dabei als äquivalent;
fehlende Artikel werden nicht hinzugedichtet. Lemma-Vokalzeichen werden für
diesen Merkmalsvergleich entfernt, Wortvokalzeichen für die Textzuordnung
bleiben hingegen streng bindend.

Das Werkzeug vergleicht ausschließlich gelieferte Merkmale; fehlende
nachgestellte Merkmale eines Teilcodes werden nicht ergänzt. Ein kompatibler
Kandidat ist keine bestätigte eindeutige Bestimmung. Fehlende Tags, doppelte
Wortformen ohne Position und nicht zugeordnete Texte werden gesondert gemeldet;
es findet keine proportionale oder stille Konsonantenangleichung statt.

Kommerzielle Exporte bleiben außerhalb des Repositorys. Sie werden weder in
den Generator eingelesen noch mit Safran verteilt.

## Erzeugen und prüfen

```sh
node tools/mishnah-morph/build.cjs
node --test tests/mishnah-morph.test.js
SAFRAN_SMOKE_MISHNAH_MORPH=1 electron tests/electron/smoke.cjs
```

Die Tests prüfen Textfingerprint, alle 57 Abschnitte und 2.159 Positionen,
Vokalisation, unveränderte Quelltexte, Wörterbuch-Lemmata, beobachtete Formen,
Alternativen, den offenen Analysefall, Verweislinks und Quellenabweichungen.
Diese technischen Prüfungen ersetzen keine philologische Tag-für-Tag-Prüfung.

## Vollständige Prüfung der 226 Reststellen

`full-review-226.json` und `full-review-226.md` dokumentieren jede der 226
Ausgangspositionen nach dem vorherigen 47-Stellen-Durchgang, gruppiert in
135 explizit begründete Fälle: 167 Konventionsunterschiede, 42 beleggestützt
beibehaltene Analysen, sieben korrigierte Positionen und zehn unentscheidbare
Positionen. Kein Eintrag bekommt eine pauschale Standardentscheidung.

Korrigiert sind fünf חיים-Lemmata, בראשית als lexikalisiertes Schöpfungsnomen
und die nominale/adjektivische Constructus-Alternative bei גיבור החיל.
Fünf Positionen passen dadurch zusätzlich zum strengen Referenzvergleich;
dieser steht jetzt bei 1.885 kompatiblen Kandidaten und 268 Unterschieden.
Die restlichen strengen Unterschiede sind damit geprüft, aber nicht automatisch
Fehler oder vollständig extern bestätigte Wörter. Besonders die zehn offenen
Lesarten-/Genus-/Statusfragen und fehlende Suffixangaben bleiben sichtbar.

Die Regressionstests prüfen alle 226 eindeutigen Stellen, den Textfingerprint,
die Vorher-/Nachher-Zuordnung und die Vollständigkeit der Entscheidungen.
