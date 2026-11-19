# SEDRA lexical data — CC BY-NC 4.0

Copyright © 2011–2026 Beth Mardutho: The Syriac Institute.

Sedra, edited by George A. Kiraz and James Bennett. Beth Mardutho: The Syriac Institute.
Data release 5.0 (2026-10-24): https://sedra.bethmardutho.org/releases/v5.0/

The lexical data is licensed under the **Creative Commons Attribution-NonCommercial
4.0 International licence**, https://creativecommons.org/licenses/by-nc/4.0/ .
The data remains under this licence, independently of Safran's software licence.
The upstream README and CITATION.cff are retained in `tools/sedra/source/`.

## Safran conversion

`tools/sedra/build.py` converts the pinned, verified lexical tables into the bundled
dictionary `bundled/dict/7fab63c14df2.json.gz`. Permanent SEDRA lexical ids, source
names and source references are retained. Gloss markup is converted to plain text
and safely escaped HTML; languages, lexical categories, recorded vocalizations and
explicit root relations are preserved. Recorded non-theoretical word forms become
search aliases, separate from displayed headwords. No word-form morphology is
assigned to a Peshitta token. Homonymous entries remain separate. No theoretical
or generated word forms are added as lookup aliases. No library texts or lexicon
scans are imported.

Only an exact normalized spelling match is shown automatically in a Peshitta
popup. These are dictionary candidates, not a contextual identification of the
lexeme. ETCBC morphology and its source ids remain unchanged.

## Resource partners and source credits

The following upstream source inventory is retained verbatim in the pinned source
file. Individual glosses and entries identify their source and source reference.

- Sedra III
- Gorgias Concise Syriac-English, English-Syriac Dictionary — Brock & Kiraz
- Treasure of the Syriac Language: A Dictionary of Classical Syriac — Audo
- A Compendious Syriac Dictionary — Margoliouth
- Supplement to the Thesaurus Syriacus of R. Payne Smith — Margoliouth Supplement
- <span style="font-style: normal;">كتاب الأصول الجليلة في نحو اللغة الآرامية على مذهبي الشرقيين والغربيين</span> [Kitāb al-ʾuṣūl al-jalīla fī naḥw al-luğa al-ʾārāmiyya ʿalā kilā maḏhabayy al-šarqiyyīn wal-ğarbiyyīn] / Cours de Langue Araméenne selon deux dialects Syriaque et Chaldaique — Manna-Saome
- Thesaurus Syriacus — Smith
- Iranian Loanwords in Syriac — Ciancaglini
- Dictionnaire Syriaque-Français / Syriac-English Dictionary / قاموس سرياني عربي — Costaz
- 'Non-Aramaic Semitic elements in the Arabic dialects of eastern Arabia' in W. Arnold & H. Bobzin (eds.), "Sprich doch mit deinen Knechten aramäisch, wir verstehen es!", 60 Beiträge zur Semitistik Festschrift für Otto Jastrow zum 60. Geburstag — Holes
- Bar Bahlul
- Syriaca.org — Syriaca
- Nöldeke (English) — NoeldekeEN
- Nöldeke (German) — NoeldekeDE
- <span style="font-style: normal;">كتاب الأصول الجليلة في نحو اللغة الآرامية على مذهبي الشرقيين والغربيين</span> [Kitāb al-ʾuṣūl al-jalīla fī naḥw al-luğa al-ʾārāmiyya ʿalā kilā maḏhabayy al-šarqiyyīn wal-ğarbiyyīn] / Cours de Langue Araméenne selon deux dialects Syriaque et Chaldaique — Manna
- Lexicon Syriacum — Brockelmann
- Lexicon Syriacum — BrockelmannSupplement
- MarduLex: the Simtho lexicon (Beth Mardutho) — MarduLex
- Compendious Syriac Grammar — Nöldeke (Eng.) (pages)
- Lexicon to the Syriac New Testament (Peshitta) — Jennings (pages)
- Dictionarium Syriaco-Latinum — Brun (pages)
- Paradigms And Exercises In Syriac Grammer — Robinson (pages)
- Supplement to the Thesaurus Syriacus of R. Payne Smith — Margoliouth Suppl. (pages)
- Thesaurus Syriacus — Payne Smith (pages)
- Lexicon Syriacum, 2nd ed. — Brockelmann (pages)
- Kurzgefasste syrische Grammatik, 1st ed. — Nöldeke 1880 (pages)
- A Compendious Syriac Dictionary — Margoliouth (pages)
- Treasure of the Syriac Language — Audo (pages)
- al-Lobab, seu Dictionarium Syro-Arabicum — Cardahi (pages)
- Vocabulaire chaldéen-arabe (Syriac-Arabic Dictionary) — Manna (pages)
- al-Qutuf al-Daniyah (القطوف الدانية) — Hubayqa (pages)
- Dictionnaire syriaque-français / Syriac-English Dictionary / Qamus siryani-arabi — Costaz (pages)
