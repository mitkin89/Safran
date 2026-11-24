# Corpus Masoreticum in Safran

The Masora tool reads published BIMA transcriptions offline. The source and licence
are documented in `LICENSE-MASORA.md`. Its source catalogue is
`https://api.dev.corpusmasoreticum.de/v1/manuscript/published`, the endpoint used by
the public BIMA application. Despite the endpoint name, it returns catalogue
metadata for unpublished material too. Selection therefore explicitly requires:

1. Project UUID `7b8ef15f-4ef5-40e6-98cf-bbd5ad401839` (Corpus Masoreticum).
2. The manuscript is not explicitly marked unpublished (`published: 0`).
3. The page's `published` flag is exactly `1`.
4. The public manuscript/folio response confirms the expected manuscript/page IDs
   and the page's published status.

The catalogue retrieved on 24 November 2026 supplies 1,550 publicly retrievable
structured pages from 18 manuscripts. This includes eight individually published
pages in Berlin.Ms.or.fol.1213 and Vat.ebr.468, whose manuscript-level publication
flag is unset; their public folio responses explicitly confirm publication.
Other BIMA projects and unpublished pages are excluded. These are pages, not
complete critical editions or books.

Thirty further published-page records in Wrocław.M.1106 are excluded from this
structured snapshot. The public folio resolver names the page, but its folio view
returns HTTP 404 (checked with folio 095). The public IIIF export does return
individual textual annotations, but omits context types, note grouping and Bible
references. These fragments are not silently substituted for structured Masora
notes. The excluded page UUIDs and this limitation are recorded in the import
report. “Complete” below means the selected structured snapshot, not all catalogue
records or all material held by the project.

## Retrieval and reproduction

```sh
python3 tools/masora/fetch.py --cache /absolute/path/to/cache
python3 tools/masora/build.py --cache /absolute/path/to/cache
node --test tests/masora.test.js
```

The fetcher makes read-only public requests. It caches compressed original JSON
outside the repository, spaces requests, waits on HTTP 429, and does not retry
401/403/404 responses with alternate credentials or endpoints. The viewer's public
manuscript/folio address is used; BIMA's UUID editor address requires authorization
and is not used. Retrieval resumes the catalogue already pinned in its cache. Use a new cache
directory for a new source snapshot. `--catalogue` can pin the exact
catalogue response for reproduction. Preserve `catalogue.json.gz`, `provenance.json`, `selection.json`
and all page caches to rebuild the same source snapshot.

The default builder refuses incomplete caches. During development `--partial` can
produce an explicitly labelled partial import; production tests reject partial
imports by default. `tools/masora/import-report.json` records coverage, original
response hashes, original context/reading counts and unparsed BibleText references.
`masora-index.js` records generated file hashes and counts. A failed fetch or
unparseable reference must not silently count as complete coverage.

## What a location means

BIMA groups readings into contexts: BibleText, Masora parva (`mp`), Masora magna
(`mm`), Masora finalis (`mf`), glosses and other note types. These original groups,
Hebrew text, reading alternatives, ordering and source notes are preserved. SVG
geometry, images and editor-account metadata are omitted. This is a projection of
the published source, not a new edition or an independent verification of its text.

The chapter index is derived **only** from references of `BibleText` readings. A
Masora note's references often enumerate other occurrences: they must not be turned
into the note's target verse. Likewise a note label matching a word is not sufficient
to determine an exact verse. No geometric alignment is performed. Safran separately derives candidate word references as described below.

The **Aktuelles Kapitel** scope shows **notes on manuscript pages containing Bible
text from the current chapter**. A page may contain neighbouring chapters and its
notes may concern those verses. The interface states this explicitly and lists the
source page's Bible references. In chapter scope, the header names the chapter without implying a precise verse anchor
for every note; selecting another verse retains the same chapter results.

Notes on standalone Masorah lists or pages without recognized BibleText references
remain available through **Gesamter Bestand** and the manuscript/text/type filters.
Empty coverage is displayed as empty; no replacement notes or inferred readings are
created. Source abbreviations remain as transcribed. Search disregards pointing and
cantillation for matching, but display preserves them and uses the chosen Hebrew
font. Only explicit source links open the network; reading and searching the imported
collection use bundled files.

The source can contain empty context frames. The report distinguishes all source
Masorah contexts/readings from contexts with transcription or source notes. The
visible collection count uses `transcribedMasoraContexts`; empty frames are not
presented as transcribed notes. All original frames are retained for provenance.

A separate scope, **Stellenzitate zum Kapitel**, indexes explicit references in
non-BibleText readings, including standalone Masorah collections. It shows them as
citations, not word anchors. This index never changes default chapter/page scope;
a reference in a list does not make its page a manuscript witness of that verse.

Public folio lookups can return multiple pages with the same label (notably
Vat. Urb. ebr. 1, fols. 1r and 2v). The importer selects exactly the catalogue UUID
whose published flag is `1`; it never takes the first result or includes unpublished
siblings. Response hashes cover the original public response, while only the selected
published page contributes to the offline text projection.

## Imported snapshot, 24 November 2026

The complete selected public snapshot contains:

| Item | Count |
| --- | ---: |
| Manuscripts | 18 |
| Published pages fetched and matched by UUID | 1,550 |
| Pages with transcribed Masorah contexts | 1,522 |
| Masorah contexts (`mp`, `mm`, `mf`), including empty source frames | 26,985 |
| Masorah contexts with transcription/source notes | 26,969 |
| Readings within those Masorah contexts | 92,317 |
| All source contexts, including BibleText and other annotations | 29,845 |
| All source readings | 112,990 |
| Pages with recognized BibleText references | 1,264 |
| Chapters represented by those BibleText page references | 402 |
| Chapters cited explicitly within source annotations | 929 |
| Missing selected pages | 0 |
| Unparsed BibleText references | 0 |

A context can be a list with several readings/lines. These counts do not represent
26,969 independently verified interpretations or word-aligned verse annotations.
The other imported contexts include glosses, scribal notes, commentary and
unclassified source material. Their types remain as supplied. `mf` denotes
**Masora finalis**, not a layout classification as Masora figurata. Physical layout
can be consulted through the linked facsimile in BIMA.

## Verse browsing and reader word navigation

The default **Ausgewählter Vers** view follows the selected reader verse (or the
visible reading position on opening). It first restricts pages to explicit
BibleText references covering that verse. Citation references in the notes never
supply page coverage. It then shows source note labels matching a whole Hebrew
word or phrase exactly once in the page's verse-referenced BibleText readings.
Matching ignores pointing and word separators, preserves consonants, and rejects
labels containing editorial prose or Latin disambiguators. Readings carrying a
verse range or multiple references do not supply a precise word location.

These are **automatically derived word references**, not publisher-confirmed
note-to-word anchors. A unique spelling match is useful for browsing but cannot
establish which occurrence an editor intended. The UI states the automatic basis.
Ambiguous labels, unmatched notes and notes concerning another verse remain in
**Weitere Notizen der Handschriftenseite**, collapsed by default. No source
transcription or published target metadata is rewritten.

Clicking a Hebrew label with one match opens its verse and highlights the matching
word/phrase in the actual Westminster reader text. With multiple matches, the
label offers the source verses for the user to choose. Word matching is repeated
against the displayed reading, never an imported token index or translation. All
matching occurrences in a user-selected verse are highlighted if the spelling
repeats. If the displayed reading lacks that spelling, Safran reports this rather
than highlighting another word. Page-wide notes remain available in the chapter view and full collection search;
the selected-verse view only shows uniquely anchored notes. Manuscript/type filters are under **Weitere Filter**.

## Word overview and German reading aids

The panel groups notes with a unique source-word anchor across manuscript witnesses,
ordered by verse and source word position. Word buttons navigate the overview;
the word appears once in a left lemma column, with flat apparatus rows on the right.
Original readings and their references are always visible together. Only the German
reading aid and manuscript provenance use small disclosures. References next to
each reading can open the cited verse.
These citations are not promoted to word anchors. Navigation centers the reader row
and highlights only an explicitly matching source phrase in the displayed Westminster
reading.

The German “Erklärung” is a labelled, rule-based reading aid, not a supplied critical
commentary. It handles uniqueness formulas, separately marked Hebrew numeral tokens
(including longer standard numeral groups), explicit list headings, and common
spelling/reading formulas. It distinguishes count information from unresolved
qualifiers: a note such as `בׄ דסׄ` yields the explicit count two while leaving the
condition unresolved. A lone `ק` is not assumed to mean 100, and common lexical
formulas such as מלא are not parsed as numbers. Number-like unmarked multi-letter
words are not guessed as counts. An exact source lemma prefix may be removed from
the heading for interpreting the following formula; the displayed text is unchanged.

There is no separate abbreviation glossary. Unknown clauses remain explicitly
untranslated. No rule output claims to be a verified individual scholarly translation.
`node tools/masora/audit-explanations.js` scans every transcribed source note and
reports recognition and unresolved-content coverage. The original corpus and hashes
remain unchanged. Standard formula interpretation is informed by the
[Deutsche Bibelgesellschaft introduction](https://www.die-bibel.de/masora) and
[Daniel Mynatt’s introduction to the Leningrad Masorah](https://www.ancientjewreview.com/read/2020/9/11/introduction-to-the-masorah-the-masorah-of-the-leningrad-codex-in-the-biblia-hebraica-stuttgartensia-bhs-edition).
These references describe general conventions, not critical translations of the BIMA
manuscript notes.

## Shared apparatus controls and continuation

The Masorah header provides search, settings (scope, manuscript and note type),
chapter/verse switching, previous/next displayed verse, scroll following, and font
size controls. Following is opt-in and stored independently from the apparatus. It
uses the reader's existing upper-quarter reading-position heuristic; in chapter mode
it also marks and follows the corresponding word groups. Scrolling inside tool panes
or dialogs does not move the reading selection. Escape closes an open settings menu
before dismissing the tool.

Continuation is calculated from the notes actually displayed in the chosen scope,
not all notes found on the source pages. For example Genesis 1:2 has 16 uniquely
anchored notes among 283 page notes; it therefore has no false continuation button.
The chapter view can still load real additional page notes in batches of 100.
