# Peshitta for Safran

39 Tanakh books from ETCBC/peshitta, TF 0.2. Extra books and Christian texts are excluded. The source word and after-word material are preserved in original order, with numeric Text-Fabric word IDs. Verse 0 is retained using numbered verse dictionaries; subsequent verse numbers are not shifted. Source numbering is explicitly labelled and is not silently remapped to Hebrew, Greek, English or Latin numbering.

Morphology is taken separately from ETCBC/syriac, TF 0.92, only for the same book/chapter/verse with exactly identical complete consonantal word streams. The annotation corpus splits some reader words into morphemes. Only complete character spans inside the reader word are attached, retaining all its separate parts and their original source fields. Annotation gaps and textual differences receive no guessed analysis. Runtime checks the exact text SHA256, word form, original ID and verse location. English source glosses are lexical aids, not translations of passages. Script lemma display is a transliteration of the original ETCBC lexeme; the original lexeme is also displayed.

## Sources, attribution and licenses

Text: Willem Th. van Peursen, Geert Jan Veldman, Constantijn Sikkel, Hannes Vlaardingerbroek and Dirk Roorda / Eep Talstra Centre for Bible and Computer, Peshitta Institute. Electronic Peshitta based on *Vetus Testamentum Syriace* and, for remaining books, Codex Ambrosianus. https://github.com/ETCBC/peshitta ; https://doi.org/10.5281/zenodo.1464757 . The critical apparatus is not included in the GitHub source or this conversion.

Morphology: ETCBC Syriac Corpus, compiled by Martijn Naaijer, with the contributors credited at https://github.com/ETCBC/syriac . The data includes selected Peshitta books only; source versions and immutable file hashes are recorded in `sources.json` and distributed in `bundled/peshitta-sources.json`.

Both text and annotation datasets: CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . This conversion preserves that license. Safran changes: selection of the 39 Tanakh books, HTML word wrappers, compact annotation tables, exact text matching and reader UI.

Offline font: Estrangelo Edessa, the unmodified official Meltho Webfont by Beth Mardutho. Copyright, redistribution license and provenance accompany the original fonts at `assets/fonts/Meltho-LICENSE.txt` and `assets/fonts/EstrangeloEdessa-SOURCE.json`.


## Supplemental NT attestations for contextual lemma review

Some supplementary OT lemma decisions cite the MIT-licensed ETCBC Syriac New Testament (syrnt 0.1, commit dae3eb6ff62b9b272fb503646796c25d248175ce), https://github.com/ETCBC/syrnt. This dataset derives from SEDRA. Sources include the Ancient Biblical Manuscript Center, George A. Kiraz, James W. Bennett, Hannes Vlaardingerbroek and Dirk Roorda. See `syrnt-LICENSE.txt` for the original license. The OT contextual decisions and their NT references are retained in `peshitta-nt-context-review.json`.

## UniMorph contextual lemma supplement

`peshitta-lexical-context-review.json` contains Safran AI contextual decisions using UniMorph Syriac by Charbel El-Khaissi, derived from SEDRA. Source https://github.com/unimorph/syc at commit `2e94e69b8c20f57e2593b70ff4c73fe3d5a2066e`. The supplement and associated derived decision data are CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/ . Safran changes include selection of 71 OT positions, contextual acceptance or withholding, edition matching and explanatory notes. UniMorph agreement shares SEDRA provenance and does not constitute independent verification. The underlying Peshitta text retains its separately stated license.

## Corpus and dictionary contextual supplement

`peshitta-corpus-dictionary-review.json` contains Safran AI contextual decisions for 999 additional main lemmas, using the embedded ETCBC Syriac corpus and specific SEDRA entries. It is distributed under CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . ETCBC and SEDRA attribution and source versions remain as stated above and in their bundled source notices. Changes include contextual selection, retention of canonical ETCBC main lemmas, exact native position matching and explanatory notes. The review does not claim independent scholarly verification. UniMorph Syriac / Charbel El-Khaissi helped select the candidates. Its copied form evidence occurs only in the developer audit and retains CC BY-SA 3.0, separately from the quoted ETCBC text and annotations.

## Automatic contextual concordance supplement

`peshitta-automatic-context-review.json` adds 490 main-lemma assignments through automatic comparison of original ETCBC Syriac annotation. Safran changes include selection of matching three-word contexts in two other annotated books, consistency checks across source forms, exact native-position matching and retention of source references. This supplement is CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . ETCBC authors and pinned sources are credited above and in `bundled/peshitta-sources.json`. It has not received individual linguistic review. SEDRA and UniMorph supply supplementary spelling evidence only. The developer audit retains their separate provenance and licenses, including CC BY-SA 3.0 for copied UniMorph evidence, as described in `tools/peshitta/context-batch-10000-summary.json` and `tools/peshitta/lexical-source.json`.

## Bilateral neighboring-word concordance supplement

`peshitta-neighbor-review.json` contains 380 automatically transferred main lemmas using original ETCBC annotation, under CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . Original authors and source versions are credited above and in `bundled/peshitta-sources.json`. Safran changes include matching each adjacent word pair in two other annotated source books, checking repeated and unanimous form analyses, exact native-position matching and source references. These are automatic assignments, without individual linguistic review or full morphology transfer. Lexical corroboration uses the SEDRA-derived UniMorph Syriac data by Charbel El-Khaissi and the SEDRA-derived ETCBC/syrnt data. Developer-audit text and ETCBC annotation retain CC BY-NC 4.0, copied UniMorph evidence retains CC BY-SA 3.0, and copied NT evidence retains MIT. Provenance and immutable hashes are recorded in `tools/peshitta/neighbor-batch-20000-summary.json`. NT attribution and license are retained in `bundled/syrnt-LICENSE.txt`.

## Main-lemma and translation-evidence supplement

`peshitta-main-lemma-review.json` contains 20,000 automatically assigned main lemmas under CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . It uses the original embedded ETCBC Syriac annotations credited above and the existing edition-bound Hebrew/Peshitta alignment data. Hebrew text and OSHB annotations retain their existing bundled licenses and attribution. Safran changes include intersection of exact-form and repeated Hebrew/Syriac lemma-pair evidence, main-lemma selection without choosing affix analyses, source-conflict exclusions and native text-position binding. Alignment metadata includes AI reviews. These assignments are marked as automatic and have not received individual scholarly verification. Source and exclusion hashes, holdout disagreements and known limitations are recorded in `tools/peshitta/main-lemma-20000-summary.json` and `tools/peshitta/README.md`.
