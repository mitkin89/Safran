# Aramäische Wortkarten

Der Index `targum-forms.js` wird ausschließlich aus den mitgelieferten
ETCBC-Targum-Fassungen erzeugt: Onkelos, Neofiti 1 und Pseudo-Jonathan,
je Genesis bis Deuteronomy. Text und Morphologie bleiben unverändert.

```sh
python3 -I tools/targum/forms.py
node test37.js
```

Erfasst sind 379.419 Wörter mit benanntem Lexem, verteilt auf 5.429 Corpus-Lemmata
und 15 Buchfassungen. Wörter ohne benanntes Lexem erhalten keine Karte.
`forms-source.json` hält die SHA1-Hashes aller 15 Eingabedateien fest. Der Test
vergleicht sämtliche Indexvorkommen mit Wortform, Morphologie, Lemma-ID,
Fassung, Kapitel und Vers in den Quelltexten; Wiederholungen im selben Vers
zählen einzeln.

Die Oberfläche nutzt `targum-forms-core.js`. Karten öffnen sich über das
Targum-Wortpopup oder über einen aramäischen Wortkarten-Knopf in Levys
Targumim-Wörterbuch (`9ce7ea6c00f1`). Der Rückweg führt über den
Wörterbuch-Abschnitt der Karte. Es gelten die vorhandenen Wörterbuchfilter.

Die Zuordnung aus dem Wörterbuch erfolgt über gleich geschriebene Lexeme
(Vokalzeichen und hebräische Endbuchstaben werden normalisiert). Fehlt ein
solches Lexem, können tatsächlich im Corpus belegte Wortformen den Zugang
liefern. Es gibt keine automatische Verknüpfung nur aufgrund derselben Wurzel.
Bei mehreren passenden Corpus-Lemmata zeigt der Artikel getrennte Knöpfe
mit Lemma und der vorhandenen Kurzbedeutung; deren Belege werden nicht
zusammengelegt. Dies ist eine morphologische Zugriffshilfe, keine redaktionelle
Zuordnung jedes einzelnen Levy-Wortsinns zu einem Corpus-Lexem.

Die Tabelle zeigt ausschließlich belegte vollständige Wortformen samt den
vorhandenen Angaben zu Wortart, Stamm, Status, Numerus und Genus. Fehlende
Merkmale werden nicht ergänzt; Vorsilben und Suffixe werden nicht aus der
belegten Form entfernt. Die drei Targum-Fassungen zählen getrennt. Die Vorschau
einer Belegstelle verwendet deren genaue Fassung und hebt die Corpus-Lemma-ID
hervor. Verlauf, Formenlisten und Beleglisten nutzen das bestehende Wortkartenfenster.

Quelle: [ETCBC Targum Corpus](https://github.com/ETCBC/targum), bereits in Safran
übernommener Stand 2026-10-28, CC BY-NC 4.0. Siehe `SOURCES.de.md` und
`tools/targum/targum.py`.
