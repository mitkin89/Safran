# Digital Mishnah: corpus interlinear and Berakhot review

Pinned source commit: `39389be30e93032d722e8dd3b7bcdfe15e76a421`,
https://github.com/umd-mith/mishnah-data .

Kaufmann `S07326`, Parma `S00483`, Cambridge `S01520` explicitly name
CC BY 4.0 in their individual TEI headers. Full original XML snapshots are in
`sources/*.xml.gz`, with SHA-256 recorded in the runtime data. All 63 standard tractates are exposed in Safran; see `CORPUS.md` for
coverage, gaps, the corpus build, and validation. The following detailed pilot
figures describe the preserved Berakhot review. `python3 tools/mishnah/build.py` rebuilds offline.

The reference uses the source's encoded `ab` references (57 Kaufmann, 57 Parma,
59 Cambridge), not the manuscripts' internal `MSMishnah` milestones and not a
verified mapping to every reader edition. It does not replace the reading text.
No reader word highlighting or manuscript morphology is inferred.

The extract shows the corrected reading state: `add` is retained, `del` is
excluded from the running extract, and original `abbr` is preferred to `expan`.
`choice` expansions are matching aids only. All annotations (including implied
editorial additions, deletions, filling material, damage, uncertainty and gaps)
remain individually accessible with exact source attributes and original TEI.
Whitespace/tokenization is mechanical; original XML remains authoritative.

Chapter-wide sequence comparison avoids forcing Cambridge's extra units onto
identically numbered Kaufmann units. Hints retain all participating source
references. They are automated comparison candidates, not a manually reviewed
apparatus or a classification of genealogical/semantic significance. Damaged
and uncertain material is never displayed as a secure omission. This is a pilot:
complete reference mapping and philological review are still required.

## Word/group alignment

`collate_project.py` executes Digital Mishnah's pinned XQuery word preparation
and CollateX Java 1.7.1 (Needleman–Wunsch, unjoined tokens). It concatenates
prepared units in chapter order before collation, so Cambridge's additional
units do not force incorrect same-number pairs. h1 and original transposition
copies are excluded to compare the corrected reading state. This reproduces
the project's preprocessing and algorithm, adapted to Safran's chapter scope;
it is not a downloaded or manually reviewed project apparatus.

`sources/project-collation.json.gz` contains the build-time result, normalized
project tokens, stable word IDs, input SHA-256 and provenance. The normal
`python3 tools/mishnah/build.py` rebuild remains offline and needs no Java.
`project_align.py` bridges complete surviving letter sequences to the original extract,
groups fragments by project word/expansion columns, and retains all original
text, offsets and annotations. Internal gap tokens stay in the same word group;
gap-only tokens outside project words are positioned at boundaries between
their actual source neighbours. They have no lexical counterpart and are not
classified as additions. Missing or reversed anchors still leave material open. No normalized comparison string replaces the diplomatic reading.

All 2,171 Parma tokens and 2,201 Cambridge tokens occur exactly once in linked
or unresolved material. Parma: 2,124 linked to base words, 47 insertions, 0 open.
Cambridge: 2,116 linked, 49 insertions, 36 positioned gap tokens, 0 open.
A positioned gap is not a reconstructed reading or a manually verified word
match. These counts describe automatic placement, not
philological certainty. Two hash-bound, previously reviewed Parma pairs retain
their reviewed status; new automatic placements do not acquire it.

Damaged/uncertain words and words adjacent to gaps stay muted even when placed
in a column. An uncertain empty counterpart is shown as an ellipsis rather
than a secure omission. Original gap extents, additions and deletions remain
available in the source context. All 57 Kaufmann reference units remain visible.

To regenerate the project cache, run:

```
python3 tools/mishnah/collate_project.py --upstream-dir /path/to/build-inputs
```

The input directory must contain `w-sep-to-json-new.xqm` at application commit
`60792f6078128ba15a741d2ec3ac013784d07e0c`, the three `S*-w-sep.xml` files at
the data commit above, Saxon HE 10.9, CollateX tools 1.7.1, Nashorn core 15.4,
and ASM 7.3.1 (`asm`, `asm-commons`, `asm-tree`, `asm-util`, `asm-analysis`).
The tool checks the source and main dependency hashes against
`docs/audits/digital-mishnah-2026-11-26/provenance.json`. It downloads nothing
and uses no external collation server. Java dependencies are build-only and
not distributed with Safran. The script records its eXist/Saxon compatibility
edits and one extraction fix: recursively retaining nested `orig` text. The
upstream dispatcher skipped Cambridge's `לַעְזַר` in Berakhot 1:5 (project word
`S01520.1.1.1.5.00070`), which also disturbed the neighbouring abbreviation
`ר׳` in our character bridge. No characters were missing from either source;
the fix retains the original text rather than using the normalized `reg`
reading. The project's normalization and word-group rules are retained.

Run `python3 tools/mishnah/test_project_align.py` for gap/word/expansion bridge invariants;
`node --test tests/mishnah-textcrit.test.js tests/mishnah-reader.test.js`
checks complete source-token conservation, rendering, reviewed pairs and source
offsets. Source transcripts are Digital Mishnah, CC BY 4.0; the cache contains
adapted, normalized and collated excerpts with the original witness IDs.

## Mishnah–Tosefta passage links

`tosefta-links.json` retains 53 factual passage relationships from the nine
upstream `standoff/mtalignment/mtalignment-1.1.N.xml` files at the pinned commit.
It preserves original word IDs, file hashes, project references, and unresolved
IDs. Only unambiguous exact/group matches bridge the Mishnah reference to
Kaufmann. The original reference/Vienna transcriptions and alignment XML have no
explicit reuse licence in their headers; their transcription text is not bundled
here and is not labelled CC BY 4.0. These are passage links, not variant readings
or a word-for-word Mishnah–Tosefta collation.

The supplied Tosefta reference is flattened into six chapter units. Of 791 target
ID occurrences in the links, 758 do not resolve in that text version. Replacing
witness prefixes or assuming identical section numbering would invent anchors.
These remain visibly unresolved; original project IDs are available in details.

The separate reading preview uses only the Hebrew Public Domain edition
`Tosefta B'rachot` from Sefaria (version source:
http://mechon-mamre.org/b/f/f11.htm). `sources/tosefta-public-domain.json.gz`
contains only Hebrew and its edition metadata, not the API's English versions.
Its seven chapters/151 units differ from the project's six-chapter reference.
Only the first relation has been checked against reading-edition 1:1; all other
relations deliberately have no inferred reading-edition reference or preview.
No red textual-variant classification is applied to these longer parallels.
The build checks the reading payload hash and Kaufmann bridge source hash.

## Main reader

`library-mishnah-reader.js` exposes the three licensed transcriptions as local
reading versions without modifying the library files or source payload. Kaufmann
is the preferred reference. The normal Interlinear chooser controls Parma and
Cambridge beneath Kaufmann, reusing the apparatus renderer and its original
source-token previews. Independently opened Parma/Cambridge versions retain
their own unit numbering (explicitly labelled), rather than pretending that
equal row numbers imply identical passages. The separate interlinear preference
is saved per reader frame/session; the apparatus filters remain independent.

Main-reader comparison lines repeat their witness names at each visual wrap,
recalculated when the grid is resized. The main-reader hover shows only source
metadata, the mechanical transcription token number, alignment status and
annotations overlapping that token (including explicit source expansions). It
does not repeat the paragraph or invent morphology, manuscript dates, folio
locations or certainty percentages. The apparatus retains its separate full
source-context preview.


## Compatibility with the expanded manuscript and vocalized corpora

Berakhot uses the project CollateX cache through `project_align.py`. The
existing `align.py`/native implementation and the other tractates remain
available without an API change. `build_vocalized.py` uses a separate source-
bound project cache for the existing Be'eri Berakhot reading edition; its
vowels, punctuation, word-card offsets and full text remain untouched.
`V00001` IDs identify synthetic comparison tokens of that edition, never
manuscript word IDs. Its consonantal projection is passed through the same
project `buildJSON` normalization and grouping rules. The other 62 vocalized
comparisons retain their existing data and build path.

Regenerate the additional cache with `python3 tools/mishnah/collate_vocalized.py
--upstream-dir /path/to/build-inputs`, then build the vocalized comparison.
The reference edition path and text hash must match before it can be used.
