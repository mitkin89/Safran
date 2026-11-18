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
