# Digital Mishnah: Berakhot pilot

Pinned source commit: `39389be30e93032d722e8dd3b7bcdfe15e76a421`,
https://github.com/umd-mith/mishnah-data .

Kaufmann `S07326`, Parma `S00483`, Cambridge `S01520` explicitly name
CC BY 4.0 in their individual TEI headers. Full original XML snapshots are in
`sources/*.xml.gz`, with SHA-256 recorded in the runtime data. Only Berakhot is
exposed in Safran. `python3 tools/mishnah/build.py` rebuilds offline.

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

`align.py` compares whole chapters with dynamic programming. Exact consonantal
forms, explicitly encoded abbreviation expansions, conservative spelling
similarity and concatenations of up to three source tokens are candidates.
Only links shared by every minimum-cost path are accepted. Unrelated
replacements, repeated-word ambiguity and damaged/unclear tokens remain open.
Source whitespace is not silently edited: joined groups handle split source
fragments. Two reviewed abbreviation pairs in `alignment-review.json` are bound
to source SHA-256 and exact token strings. Automatic links remain unreviewed.

All 2,171 Parma tokens and 2,201 Cambridge tokens occur exactly once in linked
or unresolved material. Parma: 2,002 linked to base words, 32 insertions, 137
open. Cambridge: 1,909 linked, 33 insertions, 259 open. The full 57-unit Kaufmann
reference is shown in the interlinear view. The source-context preview highlights
the selected original token and retains corrections, expansions and original TEI.
Red marks differing consonantal readings and additions; damage and unresolved
material remain muted. A dash means no counterpart in the automated comparison,
not an independently established manuscript omission.

Run `python3 tools/mishnah/test_align.py` for ambiguity, group, insertion and
damage invariants; `node --test tests/mishnah-textcrit.test.js` checks complete
source-word conservation, rendering, reviewed pairs and source offsets.

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
