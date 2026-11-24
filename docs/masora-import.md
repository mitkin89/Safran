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
word or phrase in the page's verse-referenced BibleText readings. A note is shown
at every matching verse, including repeated headings such as Psalm 3:1 and 4:1.
Matching ignores pointing and word separators, preserves consonants, and rejects
labels containing editorial prose or unrecognized Latin disambiguators. Explicit
`(M1)`-style manuscript suffixes and `Gins.1, gimel #72`-style citations are
recognized without changing the displayed label. A Hebrew parenthetical context
is used only if it contains the head exactly once and matches the source BibleText;
for example, `גדל (כי גדל) (M1)` resolves to Job 2:13 and highlights `גדל`.
Multiple context occurrences remain ambiguous. Readings carrying a
verse range or multiple references do not supply a precise word location.

`node tools/masora/audit-locations.js` audits every transcribed Masorah context,
counting unique, ambiguous and unmatched word references and newly supported
labels compared with hand-suffix-only matching. Unmatched notes remain available
on their source pages; this audit does not reconstruct missing Bible text or
promote citations into manuscript anchors.

Earlier source-only audit before the complete MT/label extension below: 26,969 transcribed notes,
18,310 with a unique spelling match, 2,664 with multiple candidate occurrences,
and 5,995 without a match. Compared with hand-suffix-only matching, this adds
3,036 unique and 448 ambiguous references. Of the unmatched notes, 1,539 lack
verse-referenced source Bible text, 2,373 have unsupported labels, and 2,083 have
no exact spelling match. These are browsing diagnostics, not verified coverage
of the manuscript's Masora.

These are **automatically derived word references**, not publisher-confirmed
note-to-word anchors. A unique spelling match is useful for browsing but cannot
establish which occurrence an editor intended. The UI states the automatic basis.
Unmatched labels and notes concerning another verse remain in
**Weitere Notizen der Handschriftenseite**, collapsed by default. No source
transcription or published target metadata is rewritten.

Clicking a Hebrew label with one match opens its verse and highlights the matching
word/phrase in the actual Westminster reader text. In chapter scope, multiple matching verses are offered for navigation; in a
selected verse the label marks its occurrences in that verse directly. Word matching is repeated
against the displayed reading, never an imported token index or translation. All
matching occurrences in a user-selected verse are highlighted if the spelling
repeats. If the displayed reading lacks that spelling, Safran reports this rather
than highlighting another word. Page-wide notes remain available in the chapter view and full collection search;
the selected-verse view shows notes with at least one exact match in that verse. Manuscript/type filters are under **Weitere Filter**.

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

## German working translations across the transcribed corpus

The overlay covers all 26,969 transcribed `mp`/`mm`/`mf` contexts in the stable
manuscript/page/context order of `masora-index.js`. The initial 10,000 ordinals are
preserved. Completely empty contexts are skipped; all source readings within a
selected context are retained in order, including individual empty or damaged
readings. The selected contexts contain 92,315 readings; the corpus index also counts
two readings in otherwise untranscribed contexts, which are not translation records.
Published source files remain unchanged.

This is a working-translation project, **not a claim that every note is fully
translated or critically verified**. Every reading is labelled `draft` or `partial`.
Uncertain/untranslated material stays visible in brackets, and the disclosure says
**teilweise offen** whenever any reading is partial. A wholly unparsed reading is
explicitly untranslated and counted as partial, never a completed translation.
The current coverage totals are stored in `masora-translations/index.js` and tested
against every record. The first 10,000 contexts are also revisited using the expanded
manual dictionaries and bounded source-verified formula refinements.

The reproducible translators under `tools/masora/translations/` combine recurring
Masorah formulas, inspected exact-source German drafts, and anchored biblical quote
extraction. Existing German interlinear mappings are attributed per reading.
Extraction requires exact Hebrew source-word matches, full coverage of those words,
and no intersecting German segment extending outside the selected source span.
Lacunae and orthographic variants are not silently repaired. A broken word spacing
may receive an explicitly partial alternative rendering only when its concatenated
consonants match an exact sequence of whole words in an explicitly cited verse;
no letter is added or changed, and the original spacing remains visible. Juxtaposed lemma and
incipit quotations can be rendered as separate exact spans, retaining every source
word; independently translatable fragments remain partial when unresolved words
remain. Literal Hebrew wordforms may be quoted when a note discusses their spelling.
A translation never changes source text, word anchoring, or verse assignment.

Two bounded refinements have source support: simple count/uniqueness plus `דס`
refers to the exact adjacent word combination, as illustrated on p.163 of
[The Small Masorah](https://api.repository.cam.ac.uk/server/api/core/bitstreams/12148888-592a-4476-be6e-e34782394311/content).
Individually marked `רׄפׄ` or `ר״פ` denotes verse beginning, as in the glossary of
[Kelley, Mynatt and Crawford, The Masorah of Biblia Hebraica Stuttgartensia](https://www.devinpeterson.com/uploads/6/4/9/5/6495937/335294020-the-masorah-of-biblia-hebraica-stuttgartensia-page-h-kelley-timothy-g-crawf.pdf).
This is distinguished from explicit `רפי`/`רפה` (Rafe); ambiguous unmarked shortforms
are not expanded wholesale. There is no separate abbreviation-glossary UI.

Run `node tools/masora/build-translations.js` to regenerate the full manifest and
11 runtime chunks of at most 2,500 notes. The translator `build(rows)` functions are
deterministic and need no network or API. Optional staging `part-*.json` files are
not shipped; `--from-staged-json` can assemble available editorial staging files.
Only needed chunks are loaded by the app. Before showing an overlay, the app checks
exact source label, type, reading UUIDs, transcription and reference labels. Changed
originals therefore cannot receive obsolete overlays. Translation-loading failures
do not hide original notes.

The current generated corpus contains 26,969 contexts /92,315 readings. Coverage
and remaining untranslated content are reported by the manifest, not inferred from
the existence of a translation record. Original BIMA/Corpus Masoreticum attribution
and licensing remain attached to the overlays.

Current generated coverage: 17,454 contexts have no reading marked open; 9,515
contexts retain partial or wholly untranslated passages. Of 92,315 readings, 58,737
are draft translations and 33,578 partial. Reprocessing the initial package reduced
its open contexts from 3,521 to 2,866, resolving 655 additional contexts as working
translations. The open figures are retained explicitly and are not counted as
completed critical translations.

## Complete offline MT word-reference audit

`node tools/masora/build-word-links.js` checks all 26,969 transcribed Masorah
contexts against the 39 bundled Westminster books. It rebuilds
`masora-word-links.js` and `tools/masora/word-links-audit.json` deterministically.
The report records every context UUID, original label, result category, source
matches and MT matches. The link artifact pins the source index, manuscript and
Westminster file hashes. Source transcriptions and published anchors are unchanged.

The label parser recognizes an explicit bibliography vocabulary (Ginsburg,
Okhla/Ognibeni, Weil and their citation syntax), manuscript suffixes, Hebrew
parenthetical context and hyphen-separated words. Unknown editorial prose and alternative readings stay unresolved. Explicit
chapter/verse references before, after or in parentheses restrict matches to
that verse and still require the word to occur in the source or covered MT
text. Numeric parenthetical identifiers such as `(2)` stay visible and are
recorded in the audit. Their meaning is not guessed: all exact occurrences
are offered as browsing targets, without asserting that `(2)` means the second
occurrence. Bibliography matching folds Latin diacritics such as `Ḥet` only in
the citation suffix; Hebrew consonants and original source labels stay unchanged. Existing source readings are never overridden by an MT guess. Every exact
source occurrence is retained as a browsing target, also across several verses. Exact MT search examines the chapters named
by the page's BibleText references, and accepts candidates only within those
references' verse coverage. References inside Masorah lists never enlarge this
search domain. Pointing and word separators are ignored; manuscript `יי`/`ייי`
divine-name abbreviations, also with common prefixes, match `יהוה`. No general
spelling correction, stemming or fuzzy matching is used.

Current results: 18,737 unique source-BibleText matches, 474 additional unique
MT matches, 2,738 multiple source matches, 130 multiple MT matches, 3,115 labels
without an MT match and 1,775 labels outside the recognized syntax. Thus 19,211
contexts have one exact occurrence, 2,868 have multiple exact occurrences, and
4,890 have no recognized word reference. All 22,079 linked contexts are displayed
at each matched verse. Multiple matches do not establish which occurrence an
editor intended; they provide all applicable navigation targets. The MT check
confirms 17,987 of the unique source matches; 750 source matches are not confirmed
in Westminster and retain their explicitly source-based status. This may reflect
spelling or transcription differences; it is not an automatic correction of
those manuscripts. A unique browsing link is not a verified scholarly anchor.

The UI loads the MT links with the Masora index. A fallback is used only if no
source-BibleText match exists and the page ID, complete label, Bible coverage and
BibleText snapshot still agree. The reader then matches the displayed Hebrew
text again before highlighting. Unit tests reproduce the entire audit and verify
its hashes; native Electron tests cover Job 2:13, the long bibliography label for
`עדיך` in Job 4:5, the divine-name fallback in Psalm 2:2, shared headings
in Psalms 3:1/4:1, explicit references in Psalms 8:10/37:26 and numbered
labels in Psalm 12:7. Numbered labels remain separate displayed word groups.

## MT-checked cited word evidence

The word-link builder additionally checks explicitly cited single verses against
Westminster. `citations` in `masora-word-links.js` contains separately typed,
source-bound evidence links for 10,042 notes. These comparisons never become
manuscript-page coverage or a cross-book manuscript anchor. In the UI a check mark
and the tooltip **Am MT geprüfter Vergleichsbeleg** identify verified references;
clicking them marks the actual matched spelling. Unverified references still open
the cited verse without asserting a word match.

An exact comparison uses the parsed Hebrew head/context. A different plene or
defective spelling is accepted only for a single-word head when (1) the note
explicitly records a full/defective marker, (2) the same cited reading quotes at
least two consecutive MT words including the target, and (3) the head and target
differ only by waw/yod. The actual MT spelling is retained for highlighting.
This is not a general fuzzy search. Each link binds the original reading UUID,
complete quote and literal reference; spelling-variant links also bind the
qualifying reading and its text. Altered quotes or qualifiers invalidate the link.
A checked comparison can supply a local browsing link only within the unchanged
BibleText coverage and any explicit label reference.

For `ארוץ Ginsburg II Resh #285, p. 574`, the checked comparisons are II Samuel
18:23, II Samuel 22:30 and Psalms 119:32 (`ארוץ`), plus Psalms 18:30 (`ארץ`).
The last spelling is supported by the cited `כי בך ארץ` quote and the note's
`חס` marker. This also supplies the local Psalm 18:30 word link. Across the whole
snapshot, 2,435 notes without a local word reference nevertheless have checked
cited-word evidence. These counts are separate from local coverage.

## Per-reference completeness report

`tools/masora/citation-audit.json` records every one of the 66,678 reference
occurrences in transcribed Masorah contexts, with source context/reading UUIDs,
original reference label, result and matched word positions. Rebuilding word
links also rebuilds this report. Counts: 35,510 references with checked word
evidence, 12,529 with no matching word under the current rules, 18,607 whose
source labels remain unsupported, 31 without an available corresponding MT verse,
and one reference outside the supported single-verse format. A failed match does
not establish that no scholarly correspondence exists.

Known bibliography prefixes such as `cf.` and letter suffixes in entry numbers
are recognized explicitly. Repeated headings such as `נתת ונתת` and `רגלי לרגלי`
are treated as listed forms for cited-word comparisons rather than demanded as
adjacent MT words. The same applies to explicit slash/backslash/`or` alternatives
when every alternative has a valid Hebrew head and recognized bibliography.
Each form must independently match the cited MT verse. These comparison forms
never silently replace an unsupported manuscript lemma. Where several forms are
confirmed in one cited verse, the UI offers a separate checked mark action for
each form. Uncertain readings, unknown editorial prose and missing words retain
their unresolved status.

Regression examples include `רגלי` in Psalm 26:12, `נתת` in Psalm 61:6,
`ואתנה` in Psalm 51:18 and both `משכנתה` and `ומגרת` in Exodus 3:22.


### Anzeige von Belegzitaten

Die deutsche Masora-Erläuterung zeigt die Regel (z. B. Anzahl, Schreibung oder
Versposition). Übersetzungen der zitierten Bibelverse werden ausgelassen;
hebräischer Wortlaut und die anklickbaren Stellenangaben bleiben sichtbar.
Die gespeicherten Arbeitsübersetzungen und BIMA-Quellen bleiben unverändert.

`tools/masora/quotation-display.js` erzeugt dafür
`masora-quotation-display.js`. Automatisch zugeordnete Zitate erkennt bereits
der Renderer an ihrer Methodenangabe. Für handverfasste Zitate vergleicht der
Generator den hebräischen Quelltext mit dem mitgelieferten Westminster-Text.
Nur an ausdrücklich zitierten Stellen erlaubt er eine begrenzte Abweichung
(75 % passende Wörter, mindestens drei Wörter; Plene-Schreibungen und gekürzte
Wortenden werden berücksichtigt). Das bestimmt ausschließlich die Rolle als
Zitat, keine Textvariante oder Wortzuordnung. Zählzeichen und unsichere
Quellzeichen verhindern diese Klassifikation. Die Anzeigezuordnung ist an
UUID und exakten Quelltext gebunden und wird beim Übersetzungsaufbau erneuert.

```sh
node tools/masora/quotation-display.js
node --test tests/masora-translations.test.js
SAFRAN_SMOKE_MASORA_CONTROLS=1 electron tests/electron/smoke.cjs
```

„Handschriften“ öffnet eine eigene Auswahl; das Zahnrad enthält Suchbereich
und Notizart. Escape schließt zuerst das offene Auswahlmenü.
