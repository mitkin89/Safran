# Samaritan Pentateuch

The five Hebrew editions are built from the CACCHT / DT-UCPH Text-Fabric corpus,
version **7.5.0**, pinned to the revision and SHA-256 input checksums in
`source.json`. Christian Canu Højgaard, Martijn Naaijer and Stefan Schorch,
*Text-Fabric Dataset of the Samaritan Pentateuch*,
<https://doi.org/10.5281/zenodo.7734632>;
<https://github.com/DT-UCPH/sp>.

The text follows Dublin, Chester Beatty Library 751, supplemented by Garizim 1
at Deuteronomy 32:36b–34. It is printed in the Hebrew square script provided by
the corpus. No Westminster morphology is transferred to it.

## Build

From the Safran repository root (Python 3 standard library, curl for downloads):

```sh
python3 -I tools/samaritan/fetch.py /tmp/safran-sp-source
python3 -I tools/samaritan/build.py /tmp/safran-sp-source
node --test tests/samaritan.test.js
```

`build.py` is offline. It verifies the locked inputs, generates the five compact
bundled JSON editions, updates their manifest SHA-1 hashes, and writes the lazy
`samaritan-data.js`. The 5,841 verse text hashes in `source.json` preserve an
independent comparison against the source sign stream. Unicode compatibility
presentation forms are normalized with NFKC; spelling and unknown analyses are
not corrected. All non-contiguous slot mappings or invalid variant spans fail
the build. Prefix morphemes are joined for reading and remain separate in the
popup data. The bundled HTML uses namespaced `sp:` word identifiers; `data-m`
is intentionally empty because these are source annotations, not OSHB codes.
The ordinary OSHB/Bavli grammar-search controls do not apply to this edition.

## Numbering and notes

The source verse numbering is retained, including numbering gaps. For example,
Exodus 30:1–10 is included in the long Exodus 26:35 and is not duplicated in
chapter 30. Genesis 30:36 combines the additions assigned to 36a–c in some
editions. No missing slots are filled from the Masoretic text.

All 1,074 Tal–Florentin comparisons are kept as identified footnotes, with their
actual source spans, omissions, additions and alternate verse labels. Source:
Moshe Florentin and Abraham Tal, *The Samaritan Pentateuch: An English
Translation with a Parallel Annotated Hebrew Text*,
<https://doi.org/10.11647/OBP.0415>. The English translation itself is not included.
The comparison categories are mechanical classifications, not independent
philological judgments. These are differences between Samaritan editions,
not an apparatus of differences from the Masoretic text.

The corpus is work in progress. Verbal stems are only populated where supplied
by the source. `unknown`, unavailable features and unreadable phonetic characters
remain identifiable. `grammar_note` explanations appear in the word popup;
older `textual_issues` notes are attached to their cited verse, with the original
data version, rather than assumed to describe the same current word node.

## License

Text, annotations and Tal–Florentin comparisons: **CC BY-NC 4.0**. The complete
license is shipped in `licenses/samaritan-CC-BY-NC-4.0.txt`. The MIT license of
Safran's program code does not replace the corpus license. Attribution and
source revision are included in the editions and popup data.

## Tal–Florentin apparatus

The original English/Hebrew footnotes and longer endnotes from Moshe Florentin
and Abraham Tal, *The Samaritan Pentateuch* (Open Book Publishers, 2024),
<https://doi.org/10.11647/OBP.0415>, are included as separately labelled notes.
They retain the source verse label and printed page. They concern the editors’
own text (principally Nablus 6), not necessarily the CACCHT reading displayed
above them. Notes attach to verse contexts; they do not assert a word alignment.
Split/combined verses can therefore carry the same source note at several
contexts. The translated running text is not included.

Reproduction (external source directory, PDF not stored in this repository):

1. Download the licensed PDF from the publisher or the archive URL in
   `tal-notes.json`. Its SHA-256 is locked there and must match the DT-UCPH
   extraction metadata.
2. Download `tf_verses.json` and `tf_verses_meta.json` from
   `scripts/tal_florentin/results` at the DT-UCPH revision in `source.json`.
3. Install **PyMuPDF 2.1** and **fonttools 4.68.0** in a dedicated environment
   (use the actual installed versions recorded by the extraction output).
4. Run `python tools/samaritan/tal_notes.py book.pdf /path/to/tal-source`.
5. Run `python3 -I tools/samaritan/build_tal_notes.py /path/to/tal-source`, then
   the ordinary `build.py` command above. The latter now requires the committed
   `tal-notes.json`; a rebuild must not drop the imported apparatus.

The PDF has defective ToUnicode mappings. The extractor uses embedded glyph
names/cmaps for ligatures and small capitals and restores Hebrew/Arabic runs
from the actual glyph sequence. Right-to-left isolates preserve mixed-language
notes through Safran’s existing HTML cleaner, footnote display and export.
Printed separators are removed only at note boundaries. No wording is translated
or corrected. The correspondence is based on matching the Hebrew word streams;
transposed and blank passage references are explicit exceptions in the audit.
The resulting note inventory and all source/target references are validated.
