# Bedeutungsfelder / semantic fields

In **Suche → Bedeutungsfelder**, enter e.g. `Angst`, `Gnade` or `Familie`, select a field, then search. The input filters the catalogue, not the verse text. The included Hebrew identifiers and Greek headwords are visible before running. Choose Hebrew, Greek or both, and optionally a book. Existing book summaries, distribution, CSV export and opening results as reader text work with this mode.

## Scope and evidence

This is an explicit **lemma-set search**, entirely offline. It is not an embedding model, automatic contextual word-sense disambiguation or exhaustive topic search. It searches locally installed Westminster/OSHB texts and Septuagint editions supported by the shipped `lxx-morph.js`. Other Hebrew editions, Bavli, Mishnah, modern Greek corpora and Syriac are not searched by this first implementation.

The ten editorial starter sets are:

- Angst und Furcht / fear and dread
- Freude und Jubel / joy and rejoicing
- Mitgefühl und Gnade / compassion and grace
- Recht und Gerechtigkeit / justice and judgment
- Liebe / love
- Verwandtschaft / kinship
- Opfer und Verehrung / sacrifice and worship
- Gehen, Kommen und Fliehen / going, coming and fleeing
- Leben / life
- Tod und Sterben / death and dying

These sets were assembled for Safran and checked against the existing lexical identifiers. They are **not an imported scholarly semantic ontology or a verse-by-verse expert review**. They deliberately expose broad lexical relationships: e.g. fear can include reverence, חסד includes loyalty/goodness, משפט has several judicial senses, and bowing can be directed towards people. Users must assess each occurrence in context. A Hebrew field and its Greek counterpart are independent lexical sets, not an assertion that every member translates every other member.

Hebrew names and glosses come from Safran's `oshb-lemmas.js` (Open Scriptures Hebrew Bible lexicon; see the repository source/license documentation). Matches use the **full main-lemma identifier**, including OSHB homonym suffixes. For example, `7356 b` (compassion) does not match `7356 a` (womb), nor does `2617 a` (goodness) match `2617 b` (shame). Inflected forms and attached prefixes are resolved through their morphology, not a consonantal substring.

Greek entries are validated against `lxx-morph.js` (Seth Kushniryk's lxx-morph, CC BY 4.0; see `gmorph.js` and source documentation). A match requires a compatible verse word count and matching target surface form. Entries flagged as guessed or uncertain are omitted. Absence from the results therefore does not prove absence of the meaning. Diacritics are ignored when comparing lemma queries; inflected forms themselves must agree with the indexed form (including the existing subscript/adscript equivalence).

Every source result lists its selected field, matched lemma, identifier (Hebrew) and morphology source. It represents a verse in a particular source edition; multiple hits in that verse are marked together. Source editions retain separate distribution counts. Read errors and cancellation leave the result incomplete and are reported. Display limits do not stop counting the searched source verses.

## German rendering

For Hebrew source results, installed German translations appear below the original where public interlinear segments exist. Both the complete Hebrew source text and complete German text must match the SHA-256 fingerprints in `interlin-sources.js`. Retained older versions and local edits do not receive an unrelated alignment. Exact source-order segment ranges are highlighted; phrases can span several words. German counterparts **do not add to the occurrence counts** and are included in CSV and results-as-reader. They can be clicked to open their own edition.

This first version does not infer a German rendering for Greek-only hits or load private Buber alignments into the search worker. Those source hits remain visible without a German counterpart. No private text or alignment is included or uploaded.

## Custom sets

Use **Auswahl als eigenes Feld bearbeiten** to copy a starter set, or expand **Eigenes Bedeutungsfeld anlegen**. Enter a title, comma-separated Hebrew Strong identifiers (e.g. `3372, 3374`, or `7356 b` for a homonym) and/or Greek dictionary headwords. Save with **Bedeutungsfeld speichern**. Saving the same custom title replaces that custom set. Remove it with **Eigenes Feld entfernen**. Built-in sets are unaffected.

Custom fields are stored in this device's renderer local storage (`semanticFields`), not in text files or GitHub. Searches send the chosen set only to Safran's local worker, with input limits and identifier validation. Unrecognised identifiers/headwords produce a readable error instead of falling back to substring search.

## Development and verification

`semantic-fields.js` is the shared catalogue and validation layer. `library-semantic.js` owns field selection/editing; `library-search.js` uses its existing job, cancellation and result pipeline. `main.js` sanitises the semantic request; `searchcore.js` dispatches to `semantic-search.js`. Translation projection reuses the shipped source fingerprints and per-book interlinear segments.

```sh
node --test tests/semantic-search.test.js tests/unified-grammar-search.test.js
SAFRAN_SMOKE_SEMANTIC=1 npm run test:smoke
```

The real Electron test uses the production renderer and preload with real local search workers and public fixture texts in a temporary profile. It checks Greek/Hebrew hits, German highlights, creating a custom set, reader highlights and returning to normal text search. It makes no network requests and does not touch the user's library. Set `SAFRAN_SEMANTIC_QA_DIR` to retain a screenshot.

## Context pilot: fear and reverence in Genesis

For the built-in fear field, **Bedeutung im Kontext** filters individual occurrences by fear/threat, reverence/fear of God, ambiguous, other usage, or unassigned. The default includes all of them. The adjective/participle identifier `3373` is now included alongside `3372`, `3374`, `6342`, and `6343`; this includes Genesis 22:12 and 32:12.

The initial contextual dataset (`semantic-context-genesis.json`) covers all **25 occurrences in 24 verses** returned by those identifiers in the shipped Hebrew Westminster Genesis. It contains 18 fear assignments, three reverence assignments, two ambiguous occurrences (both in 28:17), and two other usages (the divine designation “Fear of Isaac”, 31:42 and 31:53). Assignments were made with AI-assisted editorial reading of the source passages and their translation/context. **They have not been independently reviewed by a human specialist.** They are visible, explained and correctable, rather than presented as unquestionable scholarly decisions. Other books, Greek occurrences and other fields have no inferred contextual assignments. This is not a complete classification of all biblical expressions of fear.

Examples:

- Genesis 3:10: fear and hiding because of nakedness.
- Genesis 20:8: fear in reaction to a divine warning; the presence of a divine reference does not mechanically mean reverence.
- Genesis 20:11; 22:12; 42:18: reverence/fear of God as an ethical or obedient attitude.
- Genesis 28:17: fright and religious awe cannot confidently be separated.
- Genesis 31:42, 53: the expression designates the invoked God rather than an immediately experienced emotion.

Negated fear, such as “do not fear”, remains in the fear sense. It does not assert that the person actually experienced fear. Counts above the results show the number of matched source words before the sense filter, distinguishing editorial assignments, local assignments and unassigned occurrences. An override withdrawing an assignment is counted as unassigned while retaining its local provenance. Normal result counts, distributions, exports and German highlighting follow the selected sense **per word**, not merely per verse.

Expand **Zuordnung ändern** at a specific occurrence, choose a sense and provide a reason, then select **Korrektur lokal speichern**. Local corrections take priority over the starter data. The option *Noch nicht zugeordnet* can explicitly withdraw a starter assignment for that occurrence. **Lokale Korrektur zurücksetzen** removes only that local override, revealing the original starter assignment (or unassigned state) again. Overrides survive renderer/app restarts in this device's `semanticCorrections` local storage; they are not sent to GitHub or a cloud service. The limit is 2,000 local assignments. CSV exports include the displayed sense, provenance and reason.

Every assignment binds the book, exact edition, language, verse path, one-based word position, full lemma identifier and SHA-256 of the source verse HTML. A changed verse never reuses the old assignment silently. It becomes unassigned (or uses a matching current starter assignment); a source-change notice accompanies stale records. Another occurrence of the same lemma is unaffected.

Verification:

```sh
node --test tests/semantic-context.test.js
SAFRAN_SMOKE_SENSES=1 npm run test:smoke
```

Tests check every starter fingerprint and word position against the actual public source; the contrast between fear and reverence; explicit ambiguity; changed-source rejection; per-word filtering; local override/reset; German projection; and the real production-renderer workflow including persistence after reload and remaining in search while editing.
