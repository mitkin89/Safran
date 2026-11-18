# Samaritan Pentateuch: Tal–Florentin, Hebrew and English

Safran supplies the five books in **Samaritanischer Pentateuch (Tal–Florentin)**
and **The Samaritan Pentateuch, Florentin and Tal (2024)**. The Hebrew main text
applies all **1,074** `var_ft_*` readings in pinned CACCHT / DT-UCPH 7.5.0 and is
checked chapter by chapter against the independent extraction of the printed
Tal–Florentin edition. Red letters/words in Hebrew, English and notes reproduce
**the edition’s differences from MT**, not the differences between CACCHT and
Tal–Florentin. Original italics, 3,459 footnote blocks and 790 endnotes are kept.

The text follows Tal–Florentin (principally MS Nablus 6). The edition’s numbering
is retained in both languages, including combined/split verses, the passage
moved from Exodus 29:21 to 29:28a, the inserted material at 26:35 and the empty
30:1–10 range. Notes use their original verse labels and printed page numbers.
The printed Hebrew book-end colophons are retained, without inferred morphology.

## Morphology and provenance

The underlying lexical/morphological inventory remains the Text-Fabric corpus
by Christian Canu Højgaard, Martijn Naaijer and Stefan Schorch, version **7.5.0**,
pinned in `source.json`: <https://doi.org/10.5281/zenodo.7734632>;
<https://github.com/DT-UCPH/sp>. Its base is Dublin CBL 751, supplemented by
Garizim 1. Source analyses survive on **81,328 unchanged graphic words**; **1,118**
changed/new words receive no transferred analysis. Word divisions inside a
single source lexical unit (e.g. Tubal Cain) share one clickable word group.
Missing stems and other source limitations remain explicit. No OSHB analyses
are invented or copied. The general OSHB grammar search does not cover this
edition. The morphology inventory and its source variant records are retained
in the lazy `samaritan-data.js`.

Main text, English translation, red markings and apparatus: Moshe Florentin and
Abraham Tal, *The Samaritan Pentateuch: An English Translation with a Parallel
Annotated Hebrew Text*, Open Book Publishers, 2024,
<https://doi.org/10.11647/OBP.0415>. All these materials are **CC BY-NC 4.0**;
see the shipped license and attribution under `licenses/`. Safran’s MIT code
license does not replace the source licenses.

## Rebuild

The ordinary offline build requires Python 3 standard library only:

```sh
python3 -I tools/samaritan/fetch.py /tmp/safran-sp-source
python3 -I tools/samaritan/build.py /tmp/safran-sp-source
node --test tests/samaritan.test.js
```

`build.py` verifies the pinned Text-Fabric files, rebuilds the source morphology,
then calls `build_parallel.py`. That stage applies the variant features in
**physical node order**, verifies all 187 Hebrew chapter streams against the
PDF-derived text, partitions them into Tal’s verses, and writes both languages
with their notes, colors and manifest SHA-1 hashes. Final-form letter shapes
are normalized only for this comparison; displayed text follows the PDF.
The old Hebrew file paths deliberately remain stable for installed-library
updates; their edition metadata now identifies Tal–Florentin.

To regenerate the committed PDF-derived input, use a separate environment with
**PyMuPDF 2.1** and **fonttools 4.68.0**:

1. Download the PDF to an external directory as `book.pdf`. Its SHA-256 must be
   `db109c6b620965c36f7b818ad16846ec7b13b8f8e79ebbbb63131bb2665f8d7a`.
   Publisher: <https://books.openbookpublishers.com/10.11647/obp.0415.pdf>;
   archive URL is recorded in `tal-notes.json`.
2. From `scripts/tal_florentin/results` at the DT-UCPH commit in `source.json`,
   download `tf_verses.json`, `tf_verses_meta.json` and
   `tf_verses_pages.json` (save the last as `pages.json`) into that directory.
3. Run `python tools/samaritan/tal_notes.py /path/to/tal/book.pdf /path/to/tal`.
   This writes the extracted notes and cached PDF spans. Embedded glyph names
   repair defective small-cap, ligature and Arabic ToUnicode mappings.
4. Run `python tools/samaritan/extract_parallel.py /path/to/tal`. Every Hebrew
   letter and its red state is read at its actual page position, checked against
   the upstream verse text and packed with the complete English translation.
   English chapter/verse labels are verified; printed discretionary hyphens are
   resolved from the edition’s own vocabulary plus the audited exceptions in
   the extractor. Word spelling and names are not corrected.
5. Copy the generated `parallel.json` to `tools/samaritan/tal-parallel.json`.
   Run `python3 -I tools/samaritan/build_tal_notes.py /path/to/tal`, then the
   ordinary build above.

`tal-source.json` records applied variants, morphology coverage, every Hebrew
verse text/color hash and the packed input hash. In `tal-parallel.json`, Hebrew
words are `[text, red-bit-mask]` (first letter = highest bit); English spans are
`[text, flags]` (`1` red, `2` italic). The narrowly allowed `mt-diff` class survives
HTML cleaning and is red in the reader and PDF/Word exports. RTL isolates keep
mixed-language notes readable. Corpus and Electron tests cover the actual
Hebrew/English selection, notes, colors and unchanged-word morphology.

Tal remarks are split at the printed apparatus bars and linked to their quoted
Hebrew word or phrase. Ambiguous anchors keep a small verse-context trigger.
The reader opens the remark in the morphology card, with a small source citation;
complete source blocks remain available in exports. Changed forms receive no
invented grammatical analysis. Neutral word remarks use a discreet dotted mark.

`tal_glossary.py` supplies German hover explanations from Symbols and
Abbreviations (printed pp. 81–84) and References (pp. 71–78), with grammatical
notation and sigla used in the notes. Generation annotates plain text before HTML
wrapping, preserving source characters, italics, bidi isolates and red differences.
The existing dictionary `ab` markup is sanitized into native `title` tooltips.

`build_textcrit.py` also writes the lazy-loaded `textcrit-data.js` witness adapter.
It retains the complete Tal words/red masks, English context and existing note
IDs grouped by their word anchors. Westminster files are SHA-256 locked. Verse
correspondence uses exact consonantal word matches within a chapter, reinforced
by exact full verses at the same coordinate to avoid drift in repeated formulas
(Numbers 7). It is a navigation aid, not a reconstructed reading or manually
verified textual apparatus. Poorly anchored/displaced passages remain unresolved;
the UI preserves Tal references and labels that status. `textcrit-core.js` keeps
reference resolution and source-sign-based filtering independent of the pane.

## MT interlinear and apparatus anchors

`node tools/samaritan/build_interlinear.cjs` creates `samaritan-il.js` and
`interlinear-audit.json`. It retains all 82,446 source words, IDs and red masks.
The all-optimal-path alignment maps 80,811 words or their insertion boundaries;
1,635 words remain in explicit open-position blocks. These are machine positions,
not a new critical edition. Context substitutions do not establish a textual
reading. No morphology transfers between editions or onto changed Tal forms.

The runtime verifies the bundled Westminster text hash and the displayed verse
word stream. Reuse in the apparatus additionally verifies the complete Tal source
word tuples and Westminster source SHA. `node tools/samaritan/audit_apparatus.cjs`
rebuilds `apparatus-alignment-audit.json`: 358 previously unlocated remark groups
obtain positions; 27 anchors expand to a source-marked Ketiv/Qere group. Conflicting
alignments remain open. This is a reproducible machine audit, not manual review of
every reading.

Adjacent transpositions require unique source/target tokens. Repeated conjunctions
must not manufacture transpositions. Merged/split graphic words retain all actual
Westminster word indices. The documented Tal Exodus 26:35/MT 30:1–10 and Tal
29:28/MT 29:21 displacements are explicit alignment scopes, not source edits.

`mt-qere.json` derives 67 Ketiv/Qere groups from the pinned Open Scriptures
morphhb commit `db6c5c9b46b8f39346f10915ddb1a70dcd429901`, CC BY 4.0,
<https://github.com/openscriptures/morphhb>. Exact XML is archived in
`mt-qere-source/` with SHA hashes. `python3 tools/samaritan/extract_qere.py`
extracts these markers (see script for input directory). Indices are accepted only
when the entire verse consonant stream exactly matches bundled Westminster;
unique whole-verse matching accommodates existing numbering differences.
Tal–Florentin alignment data remain CC BY-NC 4.0, DOI 10.11647/OBP.0415.
