# Peshitta for Safran

39 Tanakh books from ETCBC/peshitta, TF 0.2. Extra books and Christian texts are excluded. The source word and after-word material are preserved in original order, with numeric Text-Fabric word IDs. Verse 0 is retained using numbered verse dictionaries; subsequent verse numbers are not shifted. Source numbering is explicitly labelled and is not silently remapped to Hebrew, Greek, English or Latin numbering.

Morphology is taken separately from ETCBC/syriac, TF 0.92, only for the same book/chapter/verse with exactly identical complete consonantal word streams. The annotation corpus splits some reader words into morphemes. Only complete character spans inside the reader word are attached, retaining all its separate parts and their original source fields. Annotation gaps and textual differences receive no guessed analysis. Runtime checks the exact text SHA256, word form, original ID and verse location. English source glosses are lexical aids, not translations of passages. Script lemma display is a transliteration of the original ETCBC lexeme; the original lexeme is also displayed.

## Sources, attribution and licenses

Text: Willem Th. van Peursen, Geert Jan Veldman, Constantijn Sikkel, Hannes Vlaardingerbroek and Dirk Roorda / Eep Talstra Centre for Bible and Computer, Peshitta Institute. Electronic Peshitta based on *Vetus Testamentum Syriace* and, for remaining books, Codex Ambrosianus. https://github.com/ETCBC/peshitta ; https://doi.org/10.5281/zenodo.1464757 . The critical apparatus is not included in the GitHub source or this conversion.

Morphology: ETCBC Syriac Corpus, compiled by Martijn Naaijer, with the contributors credited at https://github.com/ETCBC/syriac . The data includes selected Peshitta books only; source versions and immutable file hashes are recorded in `sources.json` and distributed in `bundled/peshitta-sources.json`.

Both text and annotation datasets: CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . This conversion preserves that license. Safran changes: selection of the 39 Tanakh books, HTML word wrappers, compact annotation tables, exact text matching and reader UI.

Offline font: Estrangelo Edessa, the unmodified official Meltho Webfont by Beth Mardutho. Copyright, redistribution license and provenance accompany the original fonts at `assets/fonts/Meltho-LICENSE.txt` and `assets/fonts/EstrangeloEdessa-SOURCE.json`.

## Reproduce

```
python3 tools/peshitta/fetch.py /tmp/safran-peshitta
python3 tools/peshitta/build.py /tmp/safran-peshitta
node --test tests/peshitta.test.js
```

The fetcher and builder verify Git blob SHA1 for every input. Build coverage is recorded in `coverage.json`. No Text-Fabric installation is required.

## Isaiah concordance review

Run the evidence audit and regenerate the subset used by the concordance from the same bundled editions:

```sh
node tools/peshitta/lemma-pilot.cjs Isaiah > /tmp/safran-isaiah-candidates.json
node tools/peshitta/context-review.cjs /tmp/safran-isaiah-candidates.json tools/peshitta/isaiah-context-sample.json > /tmp/safran-isaiah-review.json
node tools/peshitta/context-review.cjs /tmp/safran-isaiah-candidates.json tools/peshitta/isaiah-context-sample.json --accepted > /tmp/safran-isaiah-accepted.json
```

The audit keeps the native word IDs and verse numbering. The accepted subset contains individual contextual decisions and consonantally identical whole-verse parallels or shorter parallels corroborated by the same one-to-one Hebrew lemma alignment. The audit records other proposals, unresolved positions, and a leave-one-book-out comparison against the annotated ETCBC books. The benchmark measures agreement with existing annotation, and its results do not constitute an individual review of Isaiah.

The `proposalChecks` counts cover each previously unaccepted proposal. The automatic check admits a proposal only when both immediate Syriac neighbors match in at least two source books, the one-to-one Hebrew alignment supports the same analysis, and every annotated occurrence of the same Syriac form agrees. Each admitted entry retains two source locations. Results based only on spelling, a dictionary, or weaker contextual evidence remain in the audit.

## Books without embedded lemma data

```sh
node tools/peshitta/context-review.cjs --assign-missing /tmp/safran-peshitta-audits > /tmp/safran-peshitta-assignments.json
```

The batch excludes Ruth and Isaiah, which have their own reviews. It writes a report per book and a coverage summary. It also accepts a repeated translation alignment if the same Syriac form and one-to-one Hebrew lemma occur at least twelve times across at least four annotated books, with no conflicting same-form corpus analysis. These entries retain two source references and have a separate label in search. The batch never uses its own transferred analyses to generate other assignments.

Use `--include-embedded-gaps` to include books with partial embedded morphology. This adds the individual reviews in `embedded-gap-context.json` and leaves existing source analyses in place. To use the repeated translation alignment for Isaiah, append `--include-repeated-alignment` to the individual-book audit and accepted export commands.

## Additional NT attestations

`nt-source.json` pins the MIT-licensed ETCBC/syrnt source commit and Git blob hashes. With those Text-Fabric files in a local directory, combine the existing open-word audit with NT attestations:

```sh
node tools/peshitta/nt-evidence.cjs /tmp/safran-syrnt /path/to/offene-wortstellen.jsonl /tmp/safran-combined-evidence
```

The output preserves each OT position and its candidate analyses, adding exact-form NT lemmas, parts of speech, occurrence counts and references. It also reports which existing SEDRA candidates have the same headword. The NT lexicon is itself derived from SEDRA, so agreement between these datasets shares provenance. This command prepares evidence for contextual review and does not publish new concordance assignments.

The context check adds a separate finding for each open position. It requires a single NT lemma and part of speech for that form, the same immediate neighbors in at least two NT books, and agreement with a single ETCBC OT analysis. Multiple occurrences of the same form in an OT verse are left for individual resolution. The subset individually reviewed in its OT context is stored in `peshitta-nt-context-review.json` with NT references and explanatory notes. The original NT source license accompanies the app in `bundled/syrnt-LICENSE.txt`.

## UniMorph and current SEDRA lexical evidence

`lexical-source.json` pins the UniMorph Syriac commit and file hash, and records the SEDRA weekly manifest used for comparison. Place `unimorph-syc.tsv`, `sedra-latest.json` and the additional SEDRA tables from that manifest in a source directory. Tables already held under `tools/sedra/source/` are verified against the weekly manifest.

```sh
node tools/peshitta/lexical-evidence.cjs /tmp/safran-lexical-sources /path/to/combined-evidence.jsonl /tmp/safran-lexical-review
```

The command excludes positions already resolved by `peshitta-nt-context-review.json`, preserves the remaining OT context and NT evidence, and adds UniMorph lemmas and grammatical tags for the same normalized form. It reports matches to the existing SEDRA headwords and form evidence absent from SEDRA lookup. UniMorph Syriac derives from SEDRA, and normalization merges vocalized and unvocalized spellings. Multiple homonyms may remain under the same normalized lemma. The result supplies candidates for contextual review.

The 121 additional positions without existing SEDRA lookup hits have been individually read in their supplied OT verse contexts. `lexical-context-decisions.json` preserves all candidates, contexts and decisions, including 50 withheld positions. The 71 accepted positions are exported in `peshitta-lexical-context-review.json`. Each entry retains its native ID, exact spelling, edition hash, candidate grammar and review note. These are AI contextual decisions, not independent scholarly verification. Several same-spelling candidates are incompatible verbs or proper names, so UniMorph form agreement alone must never publish an assignment. The supplement and derived decision data are distributed under CC BY-SA 3.0 with attribution to UniMorph Syriac / Charbel El-Khaissi and its SEDRA provenance.

## Context batch of 1,000 additional positions

`lexical-context-batch-1000.json` records 1,000 further previously unresolved positions selected from six frequent nominal form groups. Each entry preserves its full verse, lexical candidates, exact native ID, individual decision and edition hash. The assistant read the local verse contexts and inspected exceptional constructions in full. Of this deliberately favorable subset, 999 main-lemma assignments were accepted and one construction in Proverbs 21:20 was withheld. This acceptance rate does not estimate the unresolved corpus as a whole and does not represent independent scholarly verification.

The main lemmas retain the canonical ETCBC lemma spelling to join the existing concordance. Exact-form annotated source locations in two different books and a specific SEDRA entry accompany every accepted position. UniMorph was used to select and corroborate candidates. It shares SEDRA provenance. The suffixed house form receives only its main lemma, without choosing between the competing pronoun analyses.

```sh
node tools/peshitta/export-context-batch.cjs tools/peshitta/lexical-context-batch-1000.json peshitta-corpus-dictionary-review.json
node --test tests/peshitta-context-batch.test.js tests/concordance.test.js
```

The exporter validates frozen decisions, exact source IDs and editions, source noun analyses, dictionary agreement and lack of overlap with earlier assignments. It never approves a candidate itself. The regression searches every accepted native word position under the canonical lemma and checks the withheld position as well. Runtime provenance is labelled as an AI context review with ETCBC and SEDRA attestations. Original embedded morphology remains unchanged.

## Automatic evidence audit of 10,000 additional positions

`context-batch-10000.jsonl.gz` preserves 10,000 distinct positions and all outcomes. This batch is an automatic source-evidence audit, with 490 assignments and 9,510 pending positions. It is not an individual linguistic review of 10,000 verses. All earlier review records are excluded, including unresolved positions and explicit exclusions such as the components of Bethlehem in Ruth, along with the 121-position and 1,000-position reviews. The selection prioritizes strong and conflicting multi-book contexts, then single-book contexts and remaining positions in source order. The summary also records the larger candidate pool scanned to select the batch.

An assignment requires the same normalized three-word context in at least two other originally annotated books. The main lemma and part of speech must agree across those contexts and every annotated occurrence of that form in the other books. Any additional conflict known in the target book also blocks transfer. The analysis must already be an ETCBC candidate, with supplementary SEDRA/UniMorph spelling evidence. This spelling evidence shares SEDRA provenance and does not establish the contextual meaning. Only the main lemma is transferred. No full morphology or new suffix analysis is assigned, and no earlier Safran transfers become source evidence.

The runtime subset is `peshitta-automatic-context-review.json`. Its search provenance remains explicitly automatic. The compressed audit contains rejected and pending proposals as well as accepted ones. Each accepted entry retains its exact native ID, edition hash and two original contextual source locations.

```sh
node tools/peshitta/automatic-context-batch.cjs /path/to/lexical-evidence.jsonl /tmp/safran-auto-10000 10000
node --test tests/peshitta-automatic-context.test.js
```

`context-batch-10000-summary.json` pins the input, earlier audit files, all bundled source files and the uncompressed audit by SHA-256. The leave-one-book-out check excludes the complete target book from both context and form evidence. Its structural rule agrees with 4,195 of 4,196 comparable source annotations, with one disagreement retained in the report. This measures agreement with existing annotation before the extra lexical/candidate gates. It does not independently certify the new assignments or all remaining positions. Reproducibility tests check all 10,000 decisions and every new runtime hit, including results beyond display limits.
