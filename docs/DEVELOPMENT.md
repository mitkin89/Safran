# Development
## Repository layout

The repository root contains the npm workspace, project documentation and screenshots. Application code, bundled data, build resources, conversion tools and tests live in `app/`. Paths in the implementation sections below are relative to `app/` unless stated otherwise.

Run `npm ci`, `npm start`, `npm test`, `npm run test:smoke` and `npm run dist` from the repository root; the npm workspace forwards these commands to Safran. For direct tool commands, first run `cd app` (for example `node tools/masora/build-translations.js`). Release builds still write to the root `dist/` directory. The shipped application version is defined in `app/package.json`; keep the workspace metadata in sync when preparing releases. The build config resolves the installed Electron version through Node so npm-hoisted dependencies work on all three platforms.

The 43 formerly numbered root test scripts now have descriptive names in `app/tests/integration/`. `app/tests/run.cjs` discovers these corpus checks and runs each in a separate process, then invokes Node's test runner for `app/tests/*.test.js`. Tests and conversion tools remain excluded from packaged applications.


Private Buber/Rosenzweig interlinear alignments can be imported locally; see
[PRIVATE-INTERLINEAR.md](PRIVATE-INTERLINEAR.md). No private texts or alignments
are included in the repository or public interlinear build.

## Run from source

1. Install Node.js 22 LTS.
2. In the project folder:

```bash
npm ci
npm start
```

## Build

```bash
npm run dist        # macOS: .dmg in dist/ (ad-hoc signed)
npm run dist:win    # Windows: installer and portable exe
```

GitHub Actions (`.github/workflows/build.yml`) builds macOS, Windows and Linux.

## Tests

```bash
npm test
npm run test:smoke  # actual Electron renderer, temporary profile, no network
SAFRAN_SMOKE_SEARCH=1 npm run test:smoke  # focused search/download/syntax flows
```

New isolated regressions live in `tests/*.test.js` and are discovered by Node’s test runner. The corpus integration checks run in isolated processes before the focused regression suite. The Electron smoke test loads the production HTML, renderer scripts and preload against public fixture texts; it covers Tanakh/Bavli cards, modal visibility, forms/navigation, a retained modified translation and the second reading pane. On Linux run it under `xvfb-run --auto-servernum`. The Linux CI job explicitly installs the Electron binary, then sets its `node_modules/electron/dist/chrome-sandbox` helper to root ownership and mode 4755 before launching Electron; the workflow verifies those permissions and keeps sandboxing enabled. Normal pushes and pull requests run `.github/workflows/check.yml`; release builds use the same committed lockfile without falling back to an unpinned install.

The Electron suite also runs `tests/electron/library-flows.cjs`: actual search workers feed results through the production preload to the renderer, and downloads use `Library.downloadEntries()` with an injected local transport. It covers opening a highlighted verse, independent pane cancellation, search failure/retry, escaped catalog errors, canceled downloads, rejected non-JSON responses and retries that skip valid existing files. Controlled gates make cancellation deterministic. IPC fixture handlers replace the application's main-process wiring; these tests do not cover real network access, credentials or native system dialogs. All files and indexes live in the temporary profile. The runner explicitly handles the last window closing so a failed assertion cannot silently become exit code zero.

## Reader modules

`library-export.js` provides pure `selectSections()`/`buildHtml()` helpers plus `LibraryExport.create()` for the export dialog. It captures the selected versions and section list before asynchronous work, supports current section/whole book/contiguous section range, aligns all selected versions with `Reader.alignRows()`, and uses each section's own note IDs and optional link data. Verse limits apply only to the current-section mode. Footnote numbers continue across chapters. `tests/book-export.test.js` checks range validation, gaps, notes/links/footnotes and all 1,533 Genesis verses. The Electron suite exercises the dialog and generates a real whole-Genesis PDF through Chromium. Set `SAFRAN_EXPORT_QA_DIR` when running `npm run test:smoke` to retain its HTML/PDF outside the temporary test profile for visual review; these are test fixtures, not release text editions.

Each export also snapshots the reader's computed base and per-version font sizes before asynchronous work. Unrendered versions fall back to the current base font and language factors. CSS pixels are converted to points at 72/96 and applied inline to text cells, including Word HTML. Supporting headings and metadata retain their print styles. The Electron test changes both base and language settings between exports and checks the resulting column sizes against the live reader in both Word and actual PDF output.

The remaining reader controllers use explicit `create(host)` adapters. Mutable state stays within its controller; only the values consumed by other reader features are exposed, with live accessors where updates must be shared. Callbacks used before a controller is initialized are deferred, so the original reader startup order is preserved. Each iframe constructs separate controller instances.

- `library-word-cards.js`: full Hebrew/Greek/Targum cards and form tables, dictionaries, translation statistics, reference lists, in-card search/history and lazy shared indexes.
- `library-navigation.js`: per-tab back/forward history, recent readings, debounced session storage, immediate unload snapshots and separate `session`/`session2` restoration. Book loading and text rendering stay in the reader.
- `library-links.js`: link download/status, section links, Mishnah/Talmud jumps, dictionary citations and the shared passage preview/highlighting service.
- `library-outline.js`: cached book outlines, inline headings, selected-section navigation, topic loading/filtering and topic panels.
- `library-map.js`: map places, routes, terrain/detail layers, measuring, selection and place notes through the shared notes service.
- `library-notes.js`: row/block/free notes and bookmarks, editor, tags/filtering/order, undo, text excerpts, note import/export and annotation rendering.

`tests/reader-source.cjs` reconstructs module bodies in their former source positions for legacy function-extraction regressions; those fixtures supply live `host` dependencies. The actual production script order and adapters are exercised by Electron. The additional reader flow uses a temporary notes store, the shipped Genesis outline and local link/topic fixtures, covering saved notes after reload, filtering, deletion/undo, outline navigation, link jumps, topics and a rendered map.

`library-word-popup.js` exposes `LibraryWordPopup.create()` for Hebrew/Greek/Targum/Qumran/Bavli morphology popups, selection highlights, pronunciation and Bavli forms. The reader supplies live view/dictionary-selection getters and lazy callbacks for indexes, navigation and full word cards. Popup state and cancellation tokens belong to each reading frame; closing a popup invalidates pending work. Greek index loading and word-range selection remain available to other reader consumers through the controller. Existing production-function regressions read the new module, while Electron verifies normal reader, modal Bavli viewer and second-pane entry points.

`library-tabs.js` exposes `LibraryTabs.create()` for reading-tab rendering and lifecycle, including background insertion order and the recently closed stack. Each frame owns its controller; live accessors share the tab list, active index and current view with book loading and session persistence in `library.js`. Completed loads restore scroll/jump targets only while their tab remains active. Electron tests exercise closing/reopening at the selected chapter, book history and separate main/second-pane sessions across reloads; deterministic tests cover late responses and independent background-tab insertion.

`library-display.js` exposes `LibraryDisplay.create()` for language-specific font sizes, vowel/cantillation visibility, reading-layout options, hover sizing and preview-edition choices. The reader provides live book/view getters, rerender and outline/anchor callbacks. The module owns the stored settings object; existing reader/preview consumers use its shared `state` view and `stripHe()`/`apply()` methods. The Electron suite verifies immediate CSS and text changes, original Hebrew marks after restoring visibility, and persisted options after explicitly waiting for a renderer reload to finish.

`library-commentary.js` exposes `LibraryCommentary.create()` for commentary text loading/rendering, missing-language notices, grouping, footnotes, collapse controls, context menus and scroll restoration. It owns the response token and closed-comment set. The reader supplies live accessors for its current position and links, selection state, formatting and navigation callbacks; session restoration uses the module's `topName`/`keepName` interface. The Electron test shows comments for individual verses and a whole chapter, then deliberately resolves an old verse request after a newer one and checks that the current text remains. The suite also fails on unhandled renderer errors; synthetic link-status responses include the complete expected status shape.

`library-comment-selection.js` exposes `LibraryCommentSelection.create()` for saved per-language commentator choices, initial/classical selection, all/none controls, selector visibility and name filtering. The reader passes the commentator priority list and a render callback. It reads selection properties and updates the available/previously chosen names through explicit setters. Commentary text loading/rendering, verse navigation, docking and collapsed-comment state remain in `library.js`. `tests/electron/comment-flows.cjs` provides local English/German comment fixtures and controlled link/text responses to cover selection, filtering, missing-local indicators, separate language preferences and closing/reopening collapsed comments.

`library-downloads.js` exposes `LibraryDownloads.create()` for catalog loading, category/title selection, filtered matches, language/version options, download planning/progress/cancellation and text updates. It receives DOM/formatting helpers and callbacks to refresh the library statistics and reader book list. Its `refreshCatalog()` method is also used during startup. Network access, validation, replacement and index persistence remain in the existing main-process service. The Electron tests use the real `Library.downloadEntries()` with local transport for downloading and replacement; catalog/update-check responses are controlled fixtures. Tests include filtered selection, cancellation, invalid JSON, retry, escaped update errors, successful replacement and the following up-to-date state.

`library-interlinear.js` exposes `LibraryInterlinear.create()` for the selector, fixed translation colors, legend, source compatibility checks, grouped under-word display and cross-version highlighting. It gets the current reading view through a getter and uses an explicit shared-source interface. Alignment loaders and helpers that word cards and previews also need remain in `library.js`; so do private-data revision tracking and rendering-statistics invalidation. The Electron suite tests German/Hebrew highlighting, a second translation, legend hover/hide controls, turning lines off while retaining clickable alignments, and turning Zunz back on before the existing source-mismatch check. Private-import and Greek-preview regression tests continue to exercise the production code.

`library-search.js` is loaded before `library.js` and exposes `LibrarySearch.create()`. Each reading frame creates one instance owning its search form, filters, pending jobs, result cache/list, chart, CSV export, history and favorites. The caller passes DOM/formatting/storage helpers plus getters for the current book groups and preferred versions, so library refreshes do not leave the module holding old arrays. The small returned interface supports running/applying searches, refreshing categories/history, selecting the current book and reading individual results or the last query parameters.

`library.js` retains navigation, reading tabs, result-to-verse jumps and text rendering/highlighting. Search state is no longer shared implicitly with those components through the large reader closure. Both reading frames load the same module but keep separate instances. The Electron suite covers favorites, book selection, returning to a complete cached overview without another backend search, verse navigation and independent pane cancellation. Search semantics, including incomplete results after cancellation, are unchanged.

`library-dictionary.js` similarly exposes `LibraryDictionary.create()`. Its instance owns article lookup and stale-response tokens, per-tab history/content, suggestions, favorites, full-text controls, font size, headword lists and dictionary management. The reader supplies word-card loaders/openers, formatting/storage helpers and accessors for the selection shared with word cards and the current source reference. Docking beside comments, source highlighting and reader navigation remain in `library.js`. Existing Greek/Targum integration tests read the moved production functions from their new module. `tests/electron/dictionary-flows.cjs` uses two temporary DSL dictionaries and the real dictionary service to cover articles, references, back/forward history, favorites, tabs, suggestions, selected dictionaries, full text, word cards in both directions and source navigation.

## Interface language

The interface is available in German and English. The English strings live in `i18n.js`: German original on the left, translation on the right; `{}` and `{#}` (number) are placeholders. New interface strings in the code stay German and get an entry there. `app/tests/integration/interface-languages.cjs` checks the table.

## Bundled texts

Texts in `bundled/` are imported automatically on start. Export your own texts via ⋯ → "Eigene Texte für GitHub exportieren …" into that folder.


## Library recovery and downloads

`library.json` is validated before use and save. Its last valid previous state is kept in `library.json.bak`. A damaged primary index is restored only from a valid backup; the damaged bytes are retained as a unique `.broken-*` file and the app reports the recovery. If neither copy is valid, loading and saving stop rather than creating an empty index. Downloaded JSON is checked for the expected work/edition and a valid text tree before replacing any existing text.

## Public alignment source fingerprints

`python3 tools/interlinear/build.py` emits both `interlin.js` and `interlin-sources.js`. Each public German alignment records SHA-256 fingerprints of the canonical JSON text trees of Hebrew and translation, independent of whitespace in the outer JSON file. `Library.read()` supplies the actual fingerprint to the renderer. A locally modified or retained older version is kept visible; an incompatible alignment is suppressed with an explanation. Private alignments retain their separate word-for-word validation. No translation wording is changed by these checks.

## Dictionary inventory

`Dictionaries.list()` reads small metadata from `dict/_catalog.txt` instead of loading article collections and building search indexes. File size, modification time and change time invalidate individual catalog entries; additions, removals, order and shipping flags are checked on every inventory. The catalog is derived data and can be deleted safely. Missing, damaged or unwritable catalogs fall back to reading dictionary JSON without retaining articles or building search indexes. Existing dictionary files need no migration. Actual lookup still builds the requested dictionary's search index lazily; unrestricted searches and the citation index can still load all dictionaries.

Local measurement on 17 November 2026, using the same ten successfully imported bundled dictionaries in a temporary library, with explicit garbage collection: the previous inventory took 2,154 ms and retained about 589 MiB of additional JavaScript heap. Building the new catalog once took 1,587 ms with no article collections retained; a fresh `Dictionaries` instance with the saved catalog took 3 ms. These measure the inventory operation, not total application startup or peak process memory. `tests/dictionary-metadata.test.js` checks lazy loading, reuse across restarts, selective lookup, changed files, removal/order and recovery from a corrupt catalog.

The sidebar-example flow (`SAFRAN_SMOKE_EXAMPLES=1 npm run test:smoke`) now invokes the actual `off:search` callback extracted from `main.js`, with the library dependency bound to public temporary fixtures. Its IPC validation and normalization, entry filtering and real worker run as in the app. `tests/search-ipc-pattern.test.js` additionally checks every example through that production boundary and rejects invalid trees; this catches query trees dropped before worker execution.
