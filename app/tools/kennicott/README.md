# Digital Kennicott · complete Tanakh apparatus

Safran includes all **39 book documents** listed by the public Digital Kennicott
catalogue, retrieved on 2026-11-18:
<https://www.edition-digitalkennicott.unito.it/exist/apps/dike/books.html>.
`catalog.json` records the catalogue filenames and Safran book titles. The four
original catalogue responses and SHA-256 hashes are in `catalog-sources/`.

The original TEI files are archived unchanged as `001_gen.xml.gz` through
`039_2chr.xml.gz`. Every individual TEI header explicitly licenses the digital
edition under **CC BY-NC-SA 4.0**. Editors: Sebastiano Crestani and Alberto
Legnaioli; Luigi Bambaci contributed segmentation, recognition, encoding and
reconstruction (see full TEI headers). No unlicensed older GitHub files are used.

## Rebuild offline

```
python3 -I tools/kennicott/build.py --all
node tools/kennicott/audit_alignment.cjs
```

For a new download directory, pass it after `--all`. The default single-book
command still rebuilds Genesis. `kennicott-index.js` is the small book inventory;
`kennicott-data.js` retains the original Genesis entry point. Other books in
`kennicott/` load individually on demand. Per-book source, licence, MT hashes and
extraction diagnostics are in `audit/` (Genesis: `audit.json`).

All **145,543 apparatus entries and 229,750 readings** survive, including original
reading groups, terms, TEI trees, raw apparatus XML and individual witnesses.
Each source supplies its own witness catalogue; unidentified sigla are retained
and explicitly described as lacking a catalogue record. No morphology is
assigned to manuscript variants. Earlier/current/conjectured readings remain
distinct; typographic notes and partial letters are not expanded into whole-word
manuscript variants. Derived data remain CC BY-NC-SA 4.0; Westminster data are
separately CC BY 4.0.

## Verse and word positions

Kennicott's reference text remains independent of Westminster/OSHB. Source verse
references are never overwritten. `reference_map.py` first matches complete
consonantal verse streams, including exact combinations of up to four adjacent
source/target verses. Repeated complete verses require adjacent verse anchors.
For differing reference-text spellings, an unchanged coordinate requires an
adjacent verified verse anchor and at least 80% whole-verse word agreement.
These are explicitly machine positional aids, not manuscript reconstructions.

Verified complete character spans retain word positions through split/merged
verses, e.g. Kennicott Exodus 20:14 at MT 20:13 and Kennicott 20:24 at MT 20:21.
Otherwise only positions shared by every optimal word alignment survive.
Explicit repeated-word ordinals remain respected. Ambiguous lemmas, verse ranges,
missing reference text and conflicting scopes stay open.

The reproducible `alignment-audit.json` checks every entry: **117,705 located**,
**27,838 unlocated**. This is a machine audit, not a claim of manual philological
review of every reading. Two Numbers 25:19 entries have no verified MT verse;
the full chapter view retains them under their own source reference without an
MT jump or invented base text.

Source diagnostics remain available per book. For example, the Genesis TEI
reference text lacks 24:67 and has an empty 30:37 followed by shifted source base
verse numbers through 30:44. Matching actual reference text handles the verified
shifts; missing text is never filled from OSHB.

Witness sigla open manuscript/print cards with the original catalogue metadata and
external links. These identify manuscripts, not verified verse/folio image positions.
`build.py --all` regenerates `kennicott-links.json`; the main process accepts only
these exact source-provided HTTP(S) catalogue/facsimile URLs through its dedicated
IPC handler. Duplicate links are collapsed within each record; separate manuscript
parts remain separate. No external images are bundled.
