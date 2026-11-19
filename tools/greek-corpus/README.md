# Josephus and Philo: Greek text and morphology

35 Greek reading editions: four Josephus works and 31 Philo works. Josephus Greek versions share the existing work entries with Clementz. Antiquities and War use checked Niese-to-Whiston mappings for the reader layout; Against Apion uses the explicit Niese superscripts in Clementz. Original Niese section numbers remain visible and attached to each morphology record. Unmapped source passages are preserved in a separate `Niese §§` branch; no missing reference is clamped to another section. The Life remains its own work.

## Attribution and licenses

- Greek reading texts: Open Greek Corpus, incorporating Perseus Digital Library and Open Greek and Latin / First1KGreek editions. Edition identifiers, exact source paths and pinned Git blob hashes are retained in `sources.json`. Josephus uses the Niese editions; Philo uses the First1KGreek editions. Credit the originating editions and text projects as well as the corpus. Corpus: https://github.com/open-greek/open-greek-corpus (CC BY-SA 4.0).
- Baseline lemma and morphology: Opera Graeca Adnotata (OGA), release 0.2.0, https://doi.org/10.5281/zenodo.14206061, via the Open Greek annotation exports, `oga-v1`: https://huggingface.co/datasets/ciscoriordan/open-greek-corpus-annotation-exports . CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ . These analyses are automatic.
- Optional manual War annotations: Vanessa Gorman, Greek Dependency Trees, https://github.com/vgorman1/Greek-Dependency-Trees , via GLAUx (Alek Keersmaekers and contributors), https://github.com/alekkeersmaekers/glaux , and the Open Greek `glaux-v1` export. Original annotation license: CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/ . This layer is distributed separately in `greek-corpus-manual.js`; it is not relicensed as BY-SA. Only records explicitly marked manual and Gorman are included. Artificial dependency nodes are omitted.

Safran changes: compact dictionary encoding; passage and token matching; morphology display; separate manual override at runtime. Original raw tags and lemmas remain available. No dependency syntax is displayed. Source release identifiers and checksums are recorded in `sources.json` and the manual asset.

## Rebuild

Run from the repository root:

```
python3 tools/greek-corpus/fetch.py /tmp/safran-greek-morphology/full
python3 tools/greek-corpus/build.py /tmp/safran-greek-morphology/full
node --test tests/greek-corpus.test.js
```

Fetcher verifies pinned source Git blob hashes and SHA256 of decompressed annotation exports. Builder verifies them again. `coverage.json` records coverage in actual Greek reader words, excluding punctuation and artificial nodes.

## Matching safeguards

Require an identical normalized passage word stream before aligning character boundaries. Normalize NFC, case, final sigma and apostrophe variants; preserve accents. Only one-token boundary matches receive an analysis. Different words, missing passages and incompatible token boundaries remain unresolved. The display additionally verifies the reading-text SHA256, passage path, word count and every displayed word form. It never borrows morphology from another edition based on spelling alone.

For War, complete passages marked manual/Gorman are checked against the displayed edition before overriding the automatic baseline. Where no safe override exists, OGA remains. Annotation gaps stay visibly unresolved and are not inferred.

Antiquities argumenta are preserved in a separate text branch so their nonnumeric loci do not shift numbered sections. All annotations remain tied to the Greek edition; bundling versions changes the reader layout only. Each reader row lists its original Greek loci, and runtime verifies their complete word stream. The edition file and SHA256 used for the layout are recorded in `layoutSource`.
