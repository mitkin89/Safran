# Wortbezogene Morphologie für den Bavli

Dieser erste Bestand umfasst ausschließlich **Berakhot 2a–10b**. Er ist eine eigene Safran-Annotation, kein OSHB-Talmudkorpus. Die ursprüngliche William-Davidson-Ausgabe bleibt unverändert; eine zusätzliche Ausgabe mit dem Namen **William Davidson Edition – Safran-Morphologie (Berakhot 2a–10b)** enthält die Wortmarkierungen.

## Quellen und Arbeitsweise

- **Elitzur A. Bar-Asher Siegal (2013), Introduction to the Grammar of Jewish Babylonian Aramaic**: insbesondere §§1.1.6, 2.2, 3.3, 4.2–4.7, 5.3, 6, 7.2 und 9.1. Die betreffenden Abschnitte wurden gelesen, wichtige Tabellen zusätzlich visuell geprüft. Keine Behauptung, beide Bücher vollständig Seite für Seite gelesen zu haben.
- **Yitzhak Frank (2003), Grammar for Gemara and Targum Onkelos**: Kapitel 1 (hebräische Textschicht), 3 (Verbformen), 4 (Bavli-Paradigmen), die weiteren einschlägigen Wortarten- und Syntaxabschnitte. Die lokal bereitgestellten Paradigmentafeln bilden gedruckte S.47–142 ab. Targum-Onkelos-Formen werden nicht ungeprüft auf den Bavli übertragen.
- **Michael Sokoloff (2002), A Dictionary of Jewish Babylonian Aramaic of the Talmudic and Geonic Periods**: gezielte Nachschläge, darunter נשר (S.780), קום (S.993), רמי (S.1086–1087) und שחל (S.1127). Gedruckte Seitenzahlen; das bereitgestellte PDF liegt um drei Seiten versetzt.
- **Melamed**, vom Nutzer bereitgestellte hebräisch-hebräische DSL: Einzelwörter und Wendungen als lexikalische Gegenprüfung. Mindestens ein Eintrag enthält eine irrtümlich angehängte moderne hebräische Konjugationstabelle; solche Tabellen wurden nicht als Bavli-Paradigmen verwendet.
- **Jastrow** sowie **Levy, Wörterbuch Bd.1–4**, wie in Safran vorhanden: gezielte Bedeutungs- und Belegvergleiche, etwa נשר, שחל, תיקו und die Formel כך מקובלני. Levys Targum-Wörterbuch dient zusätzlich dem Vergleich, nicht als Beweis gleicher Bavli-Flexion.
- **The Practical Talmud Dictionary (PTD), über AlHaTorah**: Einträge אקרא und איתימא gelesen. אקרא unterscheidet unter anderem Präposition plus קרא von anderen gleich geschriebenen Formen; איתימא nennt mehrere konkurrierende Ableitungen. Dies bestätigt die vorsichtige Kontextanalyse und rechtfertigt keine eindeutige Verbkodierung für die fünf offenen Überlieferungsformeln. [Online-Eintrag](https://shas.alhatorah.org/Dictionaries?w=ואיתימא&d=ptd).
- **Übersetzungen**: William Davidson (Englisch), Lazarus Goldschmidt (Deutsch,1929) und M.Pinner (Deutsch,1842), Berakhot2a–10b, zur gezielten Gegenprüfung aller47 bisherigen Formenalternativen und8 offenen/partiellen Positionen. Entscheidungen und Umfang: `UEBERSETZUNGSPRUEFUNG.json`; Übersetzungsbedeutung ersetzt keine grammatische Formenprüfung.
- **OSHB/Westminster**: Merkmalsinventar und konkrete zusammenhängende Bibelzitate. Ein isolierter gleichgeschriebener OSHB-Treffer belegt keine Analyse eines aramäischen Wortes.

Die Bücher und vollständigen Wörterbuchartikel werden nicht in dieses Verzeichnis kopiert. Die Annotationen enthalten eigene Analysen und kurze Quellenverweise. Buch-OCR und Arbeitskopien liegen außerhalb des Repositorys.

## Daten

- `berakhot/source.json`: die 18 angeforderten Seiten der vokalisierten William-Davidson-Ausgabe, mit Herkunft und Lizenzangabe. Der hebräisch-aramäische Originalwortlaut samt HTML und Vokalisation ist die Vergleichsbasis.
- `berakhot/annotations-*.json`: lexikalische Analysen und **positionsbezogene** Referenzen, ein Eintrag für jeden ursprünglichen Whitespace-Token. Identische Schreibungen können im Kontext unterschiedliche Analyse-IDs haben.
- `bavli-morph.js`: erzeugter Index für Wort-Popups und belegte Formen.
- `bundled/own/Berakhot/he/*Safran-Morphologie*.json`: erzeugte Lesefassung mit `<span class="w" data-l="bavli:…" data-m="…">` wie bei der OSHB-Fassung. Die IDs sind eigene Talmud-Lemmata und keine Strong-Nummern.

`H` bezeichnet Hebräisch, `A` jüdisch-babylonisches Aramäisch. Präfixe und Suffixe werden mit `/` getrennt. Die Kodierung folgt dem OSHB-Inventar mit zwei ausdrücklich begrenzten Erweiterungen: generisches `T` für eine Partikel ohne passenden OSHB-Untertyp (insbesondere aspektuelles קא) und ein Verbcode nur bis zum Stamm (z.B. `AVq`), wenn die Flexion ungesichert bleibt. Person-, Genus-, Numerus- und Statusmerkmale werden nicht erfunden.

Bei aramäischen Nomina bezeichnet `d` die lange Form/Emphaticus, **nicht automatisch semantische Bestimmtheit** (Siegal §2.2.3.2.1). Das eigene Popup nennt Präfix-/Suffixkonjugation und Infinitiv entsprechend dem aramäischen System. Personklitika an Partizipien besitzen ein zusätzliches `subject`-Feld, damit Subjekt- und Objektrollen nicht verwechselt werden.

## Unsicherheit

- `reviewed`: eine im Arbeitsstand kontextuell gewählte Analyse; keine Garantie gegen weitere wissenschaftliche Korrekturen.
- `ambiguous`: mehrere ausdrücklich aufgeführte Analysen. Nur gemeinsame, tatsächlich feststehende Informationen werden als einzelner Code exportiert.
- `partial`: bestimmte Merkmale sind gesichert, andere bleiben offen.
- `unresolved`: keine hinreichend abgesicherte vollständige Formenbildung; der Text bleibt dennoch wortweise adressierbar.

Mehrdeutige, partielle und unbestimmte Fälle sind im Wort-Popup sichtbar. Die Grammatik-Suche verwendet ausschließlich den exportierten feststehenden Code; sie wählt keine Alternative heimlich aus. Die Lemmasuche darf ein gemeinsames feststehendes Lemma nutzen. Eine Formtabelle zeigt ausschließlich Vorkommen in **2a–10b**, keine ergänzten Musterzellen und keine Behauptung über den übrigen Talmud.

## Bauen und Prüfen

```sh
python3 tools/bavli/build.py --validate-only
python3 tools/bavli/build.py
node tests/integration/bavli-morphology.cjs
npm test
```

Der Builder prüft Referenzumfang, Tokenpositionen, H/A-Merkmalscodes und die Rückgewinnung des ursprünglichen Textes. Er aktualisiert nur den Manifest-Eintrag der eigenen Ausgabe. `tests/integration/bavli-morphology.cjs` vergleicht den gesamten Original-HTML-Wortlaut, den SHA1 des erzeugten Textes, schwierige Kontextfälle, Formenverweise sowie echte Grammatik- und Lemmasuchen.

Siehe [Prüfbericht](PRUEFBERICHT.md) für Umfang, Quellenkonflikte und offene Stellen.

## Deutsche Wortzuordnung im Test

Goldschmidt und Pinner für 2a–10b: [Prüfstand und Testansicht](interlinear/README.md). Geprüfte Zuordnungen und maschinelle/offene Vorschläge sind ausdrücklich getrennt. Die weitere Bearbeitung ist auf Nutzerwunsch angehalten.

Die Morphologiekarte öffnet sich auch beim Klick auf passende Wörter in der normalen hebräischen Berachot-Ausgabe sowie in **Wortzuordnung · Test**. Bei anderen Textfassungen wird die Zuordnung nur übernommen, wenn der gesamte Segmentwortlaut zur geprüften Quelle passt. HTML-Bereinigung und vollständige Klickwege sind durch `tests/integration/bavli-morphology.cjs` und `tests/integration/bavli-ui.cjs` abgesichert.
