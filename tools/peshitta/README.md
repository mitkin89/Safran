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
