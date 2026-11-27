# Berakhot: separate Kaufmann edition with additive Be’eri pointing

The edition **Kaufmann A50 (Digital Mishnah), vocalized after Be'eri** uses the
Digital Mishnah Kaufmann transcription (S07326) as its character base. Be’eri is
only the pointing donor. This is an editorial, partially pointed edition, not a
transcription of the Kaufmann manuscript’s own verified pointing.

All 9 chapters / 57 units are included. Of 2,170 diplomatic word positions,
1,621 receive pointing and 549 remain open. The lexical reader has 2,171 tokens:
the diplomatic abbreviation `ע'ע'ז'` at 8:6 is two lexical tokens under the
existing reader tokenizer. The source abbreviation is retained unchanged.

## Preservation and transfer policy

The original Digital Mishnah and Be’eri files remain separate and unchanged.
Only explicitly recorded Hebrew pointing characters are inserted into the
Digital Mishnah `offsetText`. Removing those recorded insertions recovers the
exact original character sequence, including punctuation, abbreviations and
whitespace. Original raw TEI, word indices and manuscript collation links remain
available. Source input hashes are recorded in the generated dataset and audit.

Transfer requires a unique, certain 1:1 alignment with exactly identical
characters after removing the permitted pointing marks only. Matres lectionis,
abbreviations, word splits/joins and source annotations are not rewritten to
force a match. Words with source flags remain open. Units with damage, unclear
or gap annotations are conservatively left unpointed, including 7:5.

Morphological analyses transfer only at the accepted individual source
positions, as candidates rather than reviewed analyses. No spelling-wide
propagation is performed. Mishnah dictionary actions remain restricted to
Jastrow, Levy and Krauss; biblical dictionaries are not used.

## Independent Accordance comparison

The user's pasted vocalized Accordance text covers all 57 units. Its module
version is not embedded in the paste. The unlabeled opening is identified as
1:1 from its opening words. Raw text and complete comparison details remain
outside the repository; public aggregate reports contain hashes, positions and
counts. The reference is never a pointing donor.

The surface comparator chooses mandatory unique 1:1 anchors by consonants and
reference position only. Vowels cannot select an alignment. It compares the
canonical sets of pointing marks on each Hebrew letter. Annotation-touched
tokens, suspect exported pointing and uncertain alignments remain open. A
surface difference is evidence to review, not proof that either edition is
wrong. The aggregate report is
`../mishnah-morph/kaufmann-berakhot-accordance-pointing.json`.

The completed surface pass records 1,468 matches, 115 differences, 3 cases
left open because of reference annotation and 35 without a secure anchor.
The 549 untransferred target words are excluded from vowel comparison. Among
the 115 differences, 89 involve vowels, 34 dagesh and 4 shin/sin dots; these
categories overlap. All 115 positions are listed in the aggregate. The full
reference also contains 7 tokens with suspect pointing, outside the accepted
comparisons. An accepted match does not certify the entire exported reference.

The separate morphology feature comparator uses the older private Accordance
grammar reference. That reference's word field was copied from our Be’eri
edition, so it cannot independently validate surface vocalization. Its report
must not be presented as a vowel comparison.

## Reproduction

From the repository root:

```sh
node app/tools/mishnah/build_kaufmann_pointing.cjs
node --test app/tests/kaufmann-pointing.test.js app/tests/kaufmann-berakhot.test.js
node app/tools/mishnah-morph/compare-kaufmann-pointing.cjs /private/reference.txt /tmp/aggregate.json --private-details /private/details.json
```

The production Electron reader integration test is
`app/tests/electron/kaufmann-berakhot-flows.cjs`, selected by
`SAFRAN_SMOKE_KAUFMANN_BERAKHOT=1` in the regular Electron smoke harness. It
checks both editions together, chapter-wide source words and cards, preserved
D/P/C comparisons, open-pointing markers and edition-specific hash rejection.

The pointing audit is `kaufmann-berakhot-pointing-audit.json`. The derived
edition credits Digital Mishnah (CC BY 4.0) and Dan Be’eri/Sefaria (CC BY-SA 3.0)
and is distributed as CC BY-SA 4.0. Neither the independent pasted Accordance
text nor its full private comparison is bundled in Safran.
