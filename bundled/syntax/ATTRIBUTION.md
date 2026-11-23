# Pentateuch syntax

Source: MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/. The [dataset and Westminster syntax source](https://github.com/Clear-Bible/macula-hebrew/blob/47db250bd55d0d8577f2a94fba114ef16c35b23c/LICENSE.md) are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Safran extracts verbal predicates and explicit subject groups from the same annotated clause in the WLC/lowfat files at commit `47db250bd55d0d8577f2a94fba114ef16c35b23c`. The result is aligned to the bundled OSHB Westminster edition by verse and consonant sequence. Clauses with mismatched text or word positions are skipped. The subject lemma search covers the lexical heads, including appositions and coordination. A construct dependent or a word inside a relative clause does not count as the subject. Coreference and implicit subjects are outside this index.

To regenerate the indexes, run `python tools/pentateuch-syntax/build.py /path/to/macula-hebrew/WLC/lowfat` with the pinned source checkout. The builder prints the aligned verse and relation counts per book.
