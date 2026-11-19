# MT–Peshitta word groups: Pentateuch

The reader offers Syriac words, consonantal Hebrew transliteration and
reciprocal highlighting for all five books. This is a draft alignment:
most links are automatic, some verses have been inspected and edited by
Codex, and unlinked words remain explicitly unlinked. Coverage is not an
accuracy estimate or evidence for a textual variant.

## Rebuild

1. `node tools/peshitta/alignment/build.cjs /path/to/source-files`
2. `python3 tools/peshitta/alignment/extend.py`

The first step needs `AA3.final`, `Genesis_HE.txt`, `Genesis_SYR.txt` from
[ETCBC/PaTraCoSy](https://github.com/ETCBC/PaTraCoSy), pinned in `sources.json`
at commit `5ae978de615d9287c3bce71b0b971a14dcd9af09`. It transfers 1,161 Genesis
verses only where the complete source streams and word boundaries match.
`coverage.json` describes this original transfer and its rejected verses.

The second step supplies proposals for the remaining 372 Genesis verses
and Exodus–Deuteronomy. It uses the existing Onkelos→MT links to find
candidate words, then requires independent lexical evidence between the
Onkelos/Hebrew and Syriac words: attested lemmas, English glosses,
consonantal stems, or repeatedly observed Genesis lemma correspondences.
Word classes distinguish verbal and nominal readings; pronominal suffixes
are kept separate from the main lemma. A sequence alignment chooses
supported anchors. There is no positional gap filling. Explicit relative
and preposition morphemes and combined numerals can form word groups.

`reviewed.json` records 18 verses inspected by Codex, including the precise
word edits and their reasons. Each edit requires exact Hebrew and Syriac
verse forms. This is not a claim that the whole corpus was manually or
independently reviewed. Other suggestions remain labelled automatic.
Unclear bird names in Deuteronomy 14:16–17 remain entirely unaligned.
`pentateuch-coverage.json` gives structural counts and remaining gaps.

The generated version-2 dataset contains all 5,846 MT verses, each with
full source words, positional links, stable Peshitta word IDs and native
references. Every native Syriac word occurs exactly once. The reader
checks complete edition hashes, MT forms, source IDs and source word
forms before displaying links or morphology.

## Source numbering

The following correspondences were checked against the actual texts:

- MT Exodus 20:13 contains Peshitta 20:13–16; following verses shift by three.
- MT Deuteronomy 5:17 contains Peshitta 5:17–20; following verses shift by three.
- MT Numbers 26:1 begins with Peshitta 25:19, followed by Peshitta 26:1.
- MT Deuteronomy 25:2 `ba-mispar` corresponds to the first word of Peshitta
  25:3 `b-menyana`; the rest of native 25:3 belongs to MT 25:3.

Native references remain on individual Syriac words. Popup morphology
uses these references, including across chapter boundaries. Reciprocal
highlighting targets the MT row rather than assuming equal row numbers.

## Provenance

PaTraCoSy provides automatic GIZA++ links:
[project description](https://etcbc.nl/uncategorized/1119/),
[research paper](https://aclanthology.org/2022.lrec-1.454/).
`AA3.final` contains positional links; `actual.ti.final` is a lexical
translation-probability table, not positional confidence, and is not used.

Hashes identify the original source files, exact MT/Peshitta/Onkelos
editions, Onkelos alignment, lexical resources, review file and generator.
OSHB, ETCBC phono, Peshitta and Onkelos retain their existing notices;
Peshitta and the ETCBC Targum Corpus are CC BY-NC 4.0.
The PaTraCoSy Genesis directory supplies no license. A GPL file elsewhere
in that repository is not assumed to license these links. This derivative
stores factual links with the reader's existing forms and credits the
source; it does not redistribute the raw GIZA files or assign a new license.
