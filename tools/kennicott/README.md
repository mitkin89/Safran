# Digital Kennicott · Genesis

Original TEI from the Digital Kennicott project (Universities of Turin and Florence):
https://www.edition-digitalkennicott.unito.it/exist/apps/dike/api/document/001_gen.xml/

Editors: Sebastiano Crestani and Alberto Legnaioli. Luigi Bambaci contributed segmentation, recognition, encoding and reconstruction; see the full TEI header for contributor details.

The TEI explicitly licenses this digital edition under **CC BY-NC-SA 4.0**:
https://creativecommons.org/licenses/by-nc-sa/4.0/

`001_gen.xml.gz` contains the unmodified original XML in reproducible gzip storage. `audit.json` records hashes, counts and witness sigla without catalogue entries. Rebuild with:

```
python3 -I tools/kennicott/build.py
```

Safran's derivative `kennicott-data.js` preserves all 9,129 entries, 13,016 readings, original reading groups, terms, TEI nodes and raw apparatus entries. The full witness metadata and the source glossary remain available offline. This derivative edition data is also CC BY-NC-SA 4.0. Westminster data is separately CC BY 4.0 (see OSHB licence).

The UI uses Kennicott's own reference text before mapping to Westminster/OSHB. Explicit repeated-word ordinals are respected. When the edition has no lemma, a unique consonantal/ו־י spelling match is only a machine positional aid, not a spelling classification or manuscript reconstruction. Ambiguous scopes and cross-verse entries stay unlocated. No morphology is assigned to manuscript variants. Earlier/current/conjectured readings remain distinct. Typographic/erasure notes preserve their source scope, including individual letters; a partial word is not expanded to a complete manuscript reading. Witness lists are never inherited from adjacent groups.

Source diagnostics: the TEI reference text lacks Genesis 24:67 and has an empty Genesis 30:37 followed by shifted base verse numbers (through 30:44); apparatus references are retained verbatim. No missing base text is filled from OSHB, and insufficiently matching positions remain unresolved.
