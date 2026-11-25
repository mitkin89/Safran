# Mischna-Morphologie: Berakhot-Pilot

Der Pilot gilt ausschließlich für die **neun Kapitel / 57 Mischnajot von
Mischna Berakhot** in der ausdrücklich benannten, vokalisierten Be’eri-Ausgabe
nach Kaufmann A50. Die übrigen Kaufmann-Traktate erhalten keine Morphologie.

2.159 laufende Wortpositionen sind an 941 normalisierte Wortformen gebunden.
1.573 Positionen haben einen Analysekandidaten, 586 mehrere Alternativen.
Die 941 Schriftformen verweisen auf 952 mögliche Analysebestände, da einzelne
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
Darstellung; dies ist **keine Übernahme der OSHB-Annotation für die Mischna**.

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

Die bereitgestellten Screenshots von **Berakhot 1:1–3** wurden
vollständig nach ihren lesbaren Angaben abgeglichen: 95 + 40 + 67 = **202
Wortpositionen**. Bei 197 Positionen ist ein mit den gelieferten Merkmalen
vereinbarer Kandidat vorhanden. Fünf Unterschiede bleiben ausdrücklich als
Konventionen dokumentiert: אשמרת/אשמורה (Lemmatisierung), בלבד
(lexikalisiertes Adverb gegenüber Segmentzerlegung) und שלוש/שלש
(Lemmaschreibung), לסטים/ליסטים (Lemmaschreibung) sowie כדי
(Adjektiv gegenüber funktionaler Adverbbestimmung). Das ist keine Genauigkeitsquote.

Die sieben zunächst nicht angezeigten Suffix-Tags wurden teilweise durch
Detailausschnitte ergänzt: בתרומתן (3mp), בניו (3ms), לו (3ms) und להם (3mp)
sind wortbezogen bestätigt und mit Safran vereinbar. Für מצותן zeigt ein weiterer
Ausschnitt 3mp; welches der drei Vorkommen ausgewählt war, ist nicht sichtbar.
Daher sind diese drei Positionen noch nicht einzeln bestätigt. Die vorhandene
3mp-Analyse ist mit dem Formnachweis vereinbar; andere Vorkommen werden nicht
allein durch identische Endung als extern geprüft bezeichnet.
Die Ziffern (1)–(6) im ersten Screenshot sind interne Gruppen derselben
Mischna 1:1. Vokalisierungs-, Abkürzungs- und Segmentierungsunterschiede zwischen
MISH-T und der Be’eri-Ausgabe wurden von der Tag-Prüfung getrennt.

`comparison-summary.json` bewahrt nur den zusammengefassten Befund, nicht den
kommerziellen Referenzexport. `berakhot-1-1-review.md` begründet die eigenen
Korrekturen unabhängig nach den Grammatiken. In `context-corrections.json`
stehen 20 verortete Anpassungen, u.a. der Titel רבן, der Gebetsname שמע,
Hofal נתר, das Handlungsnomen הקטר, absolute Zeitangaben nach עד sowie der
verschmolzene Artikel in בתורה, ובבקר und בדרך sowie בא als Partizip
nach הייתי. Neun Suffixangaben in 1:3 sind in der Übersicht nicht angezeigt
und bleiben extern unbestätigt. Sie werden nur bei exakt passendem Quellwort
angewandt. Die übrigen 54 Mischnajot sind nicht gegen Accordance validiert.

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
