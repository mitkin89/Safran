# Safran – all features

The short version is in the [README](../README.md). This page lists everything, grouped by area. Menu and button labels are given as they appear in the German interface, which is the original; the English and Hebrew interfaces translate them.

## Library and download

- **Catalog and download:** load the catalog once (~22 MB), tick categories or single books, choose languages (Hebrew, English, German) and download. By default the merged version per language is used; German translations are downloaded in full. Interrupted downloads can be resumed; existing files are skipped.
- **Storage location:** ⋯ → *Speicherort…* moves the library, e.g. to an external drive. *Im Finder zeigen* opens the folder.
- **Links:** download Sefaria's link data once (~680 MB), then see links per verse, grouped by category and book, with text preview. Bible cross-references from OpenBible.info (Tanakh) are shown among them.
- **Audio:** Hebrew reading of the Tanakh (Abraham Schmueloff), chapter by chapter with verse markers, downloaded per book in the *Download* window from the GitHub release `audio` (≈ 3 GB in total). Playback follows the verses and highlights the one being read.
- **Update check:** ⋯ → *Nach Updates suchen* asks GitHub for a newer release; *Beim Start nach Updates suchen* does it automatically. A separate check compares your texts against the Sefaria export.
- **Bundled texts and dictionaries:** everything in `bundled/` (texts) and `bundled/dict/` (dictionaries, gzip with manifest) is imported on first start and updated when it changes; what you remove stays removed, and your own version of the same text is never overwritten. The bundle holds 238 German text files (Zunz, Philippson, Herxheimer, Kautzsch's Apocrypha and Pseudepigrapha, Mendelssohn, Rashi and Kitzur Shulchan Arukh after Bamberger, Hertz, Hirsch's Psalms, Midrash Bemidbar and Devarim Rabbah, More Nevuchim), 124 Hebrew versions (OSHB, Aleppo Codex, Qumran scrolls, Mendelssohn's Taitsch) and the Septuagint and Targumim, see the [README](../README.md#german-texts-that-are-not-on-sefaria) and [SOURCES.md](../SOURCES.md).

## Reading

- **Three languages side by side:** Hebrew, English and German, aligned verse by verse. Individual versions can be switched on and off (*Versionen*); each column shows its version in the header.
- **Navigation:** chapters or Talmud pages (2a, 2b …) via drop-down or arrow keys; the window title follows the current chapter or page.
- **Jump field:** type a location (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abbreviated book names work and suggestions appear while typing. A book name alone opens the first chapter.
- **Footnotes** open inline in the text (click the small marker); display can be set to *click*, *always* or *hidden*.
- **Tabs, history and sessions:** multiple tabs with back/forward per tab, a *Zuletzt geöffnet* list, and open tabs restored on the next start. Right-click on books, history entries and commentator names: *Open*, *Open in new tab*, *Open in second window*.
- **Second reading window** (*⧉ Zweites Fenster*) with its own tabs, history, commentary panel and book list; Alt-click a book to open it on the right; *⇅ Gleichlauf* pages both windows together.
- **Pinnable windows:** links, topics, outline, map, commentary and dictionary can be pinned beside the text with the pin next to ✕. The pin is remembered per window; a second pinned window replaces the first (commentary and dictionary may be pinned together). Unpinned windows float and close on an outside click.
- **Display options** (⚙): font sizes, hide vowels or cantillation, overall UI size (⋯ → *Größe*), light/dark/automatic theme, interface language German/English/Hebrew. Hebrew is set in SBL Hebrew if installed.
- **Verse context menu:** copy the reference or open the verse on sefaria.org. Clicking a verse number selects it for the commentary panel.
- **Export** the displayed section as PDF or Word.

## Commentary panel (Cmd+K)

- Shows commentaries on the selected verse (e.g. Rashi and Ibn Ezra one below the other) in the chosen language (Hebrew, English, German). If no commentator is selected, all locally available ones are shown; grey chips mark commentators that are not in your library.
- Previous/next verse inside the panel; the commentator's name opens the book in a new tab.
- Resizable (drag the edge, double-click resets) with A−/A+ text size, both remembered. Cmd+F also searches inside the panel.

## Dictionaries

- **Opening:** the *Wörterbuch* tab, the 📖 button next to the commentary button, double-click on any word in the text or commentary, or right-click a Hebrew word (or selection) → *Im Wörterbuch nachschlagen*.
- **Bundled:** BDB (unabridged, with Strong and BDB numbers, verses linked, Greek in SBL Greek), Gesenius (1915), Jastrow, Levy's Talmud dictionary (vols. 1–4), Levy's Targumim dictionary (vols. 1–2) and Krauss, *Griechische und lateinische Lehnwörter* part II. In Levy and Krauss, abbreviations are explained in a tooltip on hover; Bible, Talmud and Midrash citations are linked to the passage; Krauss's cross-references (*s. X*, *vgl. X*) jump to the headword.
- **Lookup rules:** vowel points and final-letter forms are ignored, the prefixes ו ה ב כ ל מ ש are tried, entries that start with the word are also listed. *⌫ 1. Buchstabe* removes the first letter and looks up again. Suggestions appear while typing. Results are grouped per dictionary with a coloured title bar and hit count.
- **Full-text search:** *auch im Text* searches the article bodies, not only the headwords; matches are highlighted.
- **Dictionary selection:** 📚 opens a checklist (*alle* / *keins*) of the installed dictionaries; the button shows e.g. *3 von 6*; the selection is remembered.
- **Headword list:** *☰ Stichwörter* in a dictionary's title bar opens its complete, sorted headword list in a filterable pop-up; a click looks the word up in that dictionary only.
- **Recent searches and favourites:** the last 30 own queries and starred words (☆) are shown as chips under the search field, shared by both reading windows, and included in the notes export/import.
- **Navigation inside the panel:** back/forward, A−/A+ text size, hover preview of linked entries. Right-click (as in GoldenDict): *Select current article*, *Select all*, and the list of dictionaries that have an entry for the current word.
- **Linked sources:** a citation opens the passage in the reader; Cmd/Ctrl-click opens a new tab, Shift-click the second window. Citations to texts not in your library are marked.
- **Your own dictionaries:** *Wörterbücher verwalten* → *DSL-Datei hinzufügen …* accepts ABBYY-Lingvo `.dsl` and `.dsl.dz` (UTF-16/UTF-8). Tags such as `[b]`, `[i]`, `[c]`, `[ref]` are rendered; images and sound are skipped. Citations marked `{{ref:Shabbat 105a}}…{{/ref}}` (an ordinary DSL comment for other programs) become clickable in Safran. Dictionaries can be removed again.

## Morphology and manuscripts

- **OSHB Tanakh** (Westminster Leningrad Codex with morphology): every word carries a lemma (Strong number) and a morphology code; a click shows stem, tense/form, person, gender and number and looks the lemma up in the dictionary.
- **Aleppo Codex** (all 39 books, Qere in the reading text), **Qumran scrolls** (36 books, all scrolls per verse with sigla), **Targum Pseudo-Jonathan and Neofiti** (Torah, with word morphology), **Septuagint (CATSS)** with the Hebrew counterpart per word group (interlinear switchable; Judges as Codex A and B, Daniel also after Theodotion), **parallel passages** (ETCBC). Sources in [SOURCES.md](../SOURCES.md).

## Search

- **Full-text search** across all downloaded texts, including footnotes and your own texts. Hebrew vowels and cantillation are ignored; optional *whole words with prefixes*; a permanent, searchable category checklist on the right; results and book chips in Sefaria order.
- **Advanced search:** up to three words near each other (adjustable distance, optional word order), wildcards (`anf*`, `m?er`) and fuzzy matching for variant spellings (Raschi/Rashi, avraham/Abraham). A help box with examples sits below the inputs.
- **Results:** per-book hit chips, *Alle als Lesetext öffnen* (all hits as a reading text in a new tab, ordered by book and chapter, with the chosen versions side by side), *Treffer als CSV*, right-click to open a hit in a new tab or the second window. Searches run in a background thread.
- **Recent searches and favourites** (☆) under the search field.
- **In this book** (🔎) searches only the open book; **Cmd+F** searches the displayed page, also in the commentary panel.

## Map, topics, outlines

- **Bible map** (🗺, button shows the number of places): places of the current chapter on a map of Israel with borders, relief, rivers and routes; distance measurement, elevation profile, notes on places. Places from Josephus and the books of the Maccabees are included.
- **Jerusalem** (🏛 inside the map at high zoom): Wilson's Ordnance Survey of 1864/65 with hillshade and today's streets and wall.
- **Topics** (🏷): topic view that maps topics to passages; the button shows the count.
- **Outlines** for 39 books of the Tanakh in Hebrew, German and English; for the Torah the switch **613 Mitzvot** shows only the commandments. A click on the map leads back to the outline.

## Your own texts and commentaries

- Import TXT, Word (.docx), CSV, JSON or Sefaria upload CSV, several at once (drag & drop), as a *Text* or as a *Commentary* (`Commentator on Book`, shown in the commentary panel, with suggestions and a warning if the book is not in your library).
- Your text appears as an extra column next to the original and is compared line by line (word-level diff against an existing version). ⟳ re-reads the source file; re-importing asks before overwriting; *CSV* saves an own text as a Sefaria upload CSV. Inline Base64 images are displayed; other tags and external images are stripped.
- Remove with ✕ in the book list or right-click → *Eigenen Text entfernen …*; original files stay untouched.
- ⋯ → *Eigene Texte für GitHub exportieren …* writes all your texts into a `bundled/`-style folder for sharing.

## Notes and bookmarks

- Star a verse (☆) for a bookmark, optionally with a note; notes without a passage (*＋ Neue Notiz*); favourites for verse blocks and search results.
- The *Notizen* tab filters by text and kind (rows, verse blocks, free notes), sorts manually, by date or by book, and shows the chosen versions per favourite.
- Backup and export: JSON (including dictionary and search favourites and recent lists), Markdown, Word, PDF; import from JSON.

## Tools menu

| Entry | What it does |
| --- | --- |
| *Offline-Bibliothek…* (Cmd+Shift+O) | opens the library window |
| *Buch herunterladen…* | saves a book or chapter range as CSV, TXT or JSON |
| *Upload-Vorbereitung (CSV prüfen)…* | prepares and checks CSV files for a Sefaria upload: duplicates, gaps, order, HTML, control characters, segment counts compared with an existing Sefaria text |

## Keyboard shortcuts

On Windows use Ctrl instead of Cmd.

| Shortcut | Action |
| --- | --- |
| ← / → | previous / next section |
| Cmd+T / Cmd+W | new tab / close tab (Cmd+Shift+W closes the window) |
| Cmd+1…9 | select tab (9 = last); Cmd+Alt+←/→ tab left/right |
| Cmd+[ / Cmd+] | back / forward |
| Cmd+F | search in the displayed text (also in the commentary panel) |
| Cmd+K | commentary panel |
| Cmd+B | show / hide book list |
| Cmd+Shift+O | open the Offline Library |
| Cmd+click | open a book, link or citation in a new tab |
| Shift+click | open a citation in the second window |
| Alt+click | open a book in the second window |
| Double-click a word | look it up in the dictionary |
| Esc | close the headword list |
