# Safran – all features

The short version is in the [README](../README.md). This page lists everything, grouped by area. Menu and button labels are given as they appear in the German interface, which is the original; the English and Hebrew interfaces translate them.

## Library and download

- **Catalog and download:** load the catalog once (~22 MB), tick categories or single books, choose languages (Hebrew, English, German) and download. By default the merged version per language is used; German translations are downloaded in full. Interrupted downloads can be resumed; existing files are skipped.
- **Storage location:** ⋯ → *Speicherort…* moves the library, e.g. to an external drive. *Im Finder zeigen* opens the folder.
- **Links:** download Sefaria's link data once (~680 MB), then see links per verse, grouped by category and book, with text preview. Bible cross-references from OpenBible.info (Tanakh) are shown among them.
- **Audio:** Hebrew reading of the Tanakh (Abraham Schmueloff), chapter by chapter with verse markers, downloaded per book in the *Download* window from the GitHub release `audio` (≈ 3 GB in total) into a fixed folder of Safran; your own audio files can be put into the same folder. Every verse has its own ▶: a click plays exactly that verse and the reading carries on from there, also into the next chapter. The verse being read is highlighted.
- **Topics:** Sefaria's topic data (about 60 MB) are an optional download of their own.
- **Update check:** ⋯ → *Nach Updates suchen* asks GitHub for a newer release; *Beim Start nach Updates suchen* does it automatically. A separate check compares your texts against the Sefaria export.
- **Bundled connections:** the sources Ginzberg quotes in the *Legenden* (about 10,600) ship as link data in `bundled/links/` and are shown as connections in both directions, even without Sefaria's link download.
- **Legends (Ginzberg):** links to Ginzberg's *Legenden der Juden* form their own group right after the Tanakh group in their own colour, sorted by volume and chapter and labelled with the headings of the German outline; preview and jump as for any other link.
- **Mishnah ↔ Talmud:** a small *→ Talmud* under each mishnah number opens the place in the Bavli, and *→ Mischna 1:1* in the Talmud leads back to the Mishnah tractate – offline from a bundled table (37 tractates), plus Sefaria's *mishnah in talmud* links when downloaded. The usual version choice applies (German versions where available).
- **Bundled texts and dictionaries:** everything in `bundled/` (texts) and `bundled/dict/` (dictionaries, gzip with manifest) is imported on first start and updated when it changes; what you remove stays removed, and your own version of the same text is never overwritten. The bundle holds 345 German text files (Zunz, Philippson, Herxheimer, Kautzsch's Apocrypha and Pseudepigrapha, Mendelssohn, Goldschmidt's Torah, Rashi and Kitzur Shulchan Arukh after Bamberger, Hertz, the Hirsch and Breuer commentaries, Wünsche's Midrash translations, Mandelstamm's Mishneh Torah, More Nevuchim, Lederer's Schulchan Aruch, Ginzberg's *Legenden der Juden* and more), 124 Hebrew versions (OSHB, Aleppo Codex, Qumran scrolls, Mendelssohn's Taitsch and Biur), 50 Septuagint and Targum files, and seven dictionaries, see the [README](../README.md#german-texts-that-are-not-on-sefaria) and [SOURCES.md](../SOURCES.md).

## Reading

- **Three languages side by side:** Hebrew, English and German, aligned verse by verse. Individual versions can be switched on and off (*Versionen*); each column shows its version in the header (one line; the full title appears on hover). ⚙ *Anzeige* → *Anordnung* chooses between one column per version and one column per language with its versions stacked.
- **Version menu:** a click on a version name or column header removes that version, shows only this version, or adds/removes other versions of the same language, keeping your reading position.
- **Hebrew default text:** the Westminster Leningrad Codex wherever a book has it, otherwise a real edition (e.g. the vocalized William Davidson text in the Talmud); Sefaria's merged text is only used when there is nothing else.
- **Navigation:** chapters or Talmud pages (2a, 2b …) via drop-down or arrow keys; the window title follows the current chapter or page.
- **Jump field:** type a location (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abbreviated book names work and suggestions appear while typing. A book name alone opens the first chapter.
- **Interlinear:** the *Interlinear* button above the text puts a translation word by word under the Hebrew words of the Westminster text. A small panel with checkboxes chooses the works for the chapter; several stand one below the other, each with its colour and a legend. Available: Zunz (whole Tanakh, all 39 books, including Ketiv/Qere and the Aramaic parts), Goldschmidt (Torah, all five books), S. R. Hirsch (Psalms), Julius Hirsch (Isaiah), Breuer, Philippson and Herxheimer (Ruth), the Septuagint (CATSS), Targum Onkelos, Pseudo-Jonathan and Neofiti 1, and the biblical Qumran scrolls (one line per scroll with its siglum; spelling, different reading, editors' reconstruction and plus are marked). A click on a word highlights the matching words in all versions.
- **Footnotes** open inline in the text (click the small marker); display can be set to *click*, *always* or *hidden*. The commentary panel and the dictionary show footnotes the same way.
- **References in the text:** Bible references in any text, also with Roman chapter numbers (*Jerem. XXIII, 24*), open on click; *back* returns to the paragraph you came from.
- **New tab with the Jewish calendar:** weekly Torah portion (with the Shabbat date), haftarah, Daf Yomi (Bavli) and Yerushalmi Yomi of the day; a click opens the passage. ‹ › step one day, « » one week, or pick a date; *Heute* returns. The data come from hebcal.com (diaspora readings) and are stored for 13 months, so the calendar also works offline. As long as no Sefaria texts are downloaded, the new tab shows a short guide.
- **Tabs, history and sessions:** multiple tabs with back/forward per tab and a *Zuletzt geöffnet* list (100 entries). Safran reopens as you left it: window size and position, tabs (also those of the second window), the exact reading position, the open commentary and the dictionary with its last word. The tab bar hides while you scroll down and returns when you scroll up (*Tabs beim Scrollen ausblenden* under ⚙ *Anzeige*). Right-click on books, history entries and commentator names: *Open*, *Open in new tab*, *Open in second window*.
- **Second reading window** (*⧉ Zweites Fenster*) with its own tabs, history, commentary panel and book list; Alt-click a book to open it on the right. *⇅ Gleichlauf* has four steps: off, both windows lead each other, only the left leads, only the right leads; a click on a verse takes the other window to that verse.
- **Pinnable windows:** links, topics, outline, map, commentary, dictionary and *Alles zu dieser Stelle* can be pinned beside the text with the pin next to ✕. The pin is remembered per window; a second pinned window replaces the first. Commentary and dictionary may be pinned together: as tabs (Esc returns from the dictionary to the commentary), stacked with a draggable divider, or side by side in wide windows; ⇅ switches between the modes. Unpinned windows float and close on an outside click.
- **Display options** (⚙ *Anzeige*): font sizes per language, hide vowels or cantillation, smaller reading text while a panel is pinned, outline headings in the text, Septuagint interlinear, column layout, hiding the tab bar while scrolling, keeping the column headers in place, page margin *normal* or *schmal* (narrow uses the full window width with several columns), footnotes. In the ⋯ menu: overall UI size (*Größe*), light/dark/automatic theme (*Darstellung*), interface language German/English/Hebrew. Hebrew is set in SBL Hebrew if installed.
- **Portraits:** small pictures of translators, commentators and lexicographers (Zunz, Mendelssohn, S. R. Hirsch, Goldschmidt, Hoffmann, Malbim, Levy, Jastrow and others) and of the Aleppo and Leningrad codices next to versions, commentator names and dictionaries; hovering shows a large view.
- **Verse context menu:** *Alles zu dieser Stelle*, copy the reference or open the verse on sefaria.org. Clicking a verse number selects it for the commentary panel (or, while *Alles zu dieser Stelle* is open, for that panel).
- **Export** the displayed section as PDF or Word (⚙ *Anzeige* → *⤓ Exportieren …*).

## Resizable study panels

- Word card, overview, textual criticism, commentaries, dictionary, outline, links, topics and map support resizing. Drag the left separator of a pinned panel; drag any edge or corner of a floating panel. Sizes are saved per floating panel; pinned panels share their chosen width. Arrow keys resize a focused grip (Shift: larger step), Home or double-click restores the default. Sizes remain within the reading window.
- Frequency comparisons use labeled blue/gold bars for passage/remainder frequencies per 1,000 words, on one common linear scale across rows. Absolute counts stay visible, and the book/Tanakh selector recalculates the comparison.

## MT word highlights

- In the overview statistics, *MT markieren* highlights either rare words (gold) or unusually frequent words (blue) in the visible Westminster text, using the selected verse/chapter and book/Tanakh comparison. Matching uses the annotated main lemma, including prefixed forms. Translation and witness columns retain their own formatting.
- Click the active mode again or the reader’s clear button to turn highlighting off. A status chip names the mode/corpus and counts visible marked MT words. Word popups and morphology remain available; marks survive layout refreshes and clear when changing chapters.

## Everything on this passage (Cmd+I)

- **Opening:** right-click a verse or segment → *Alles zu dieser Stelle*, the ✦ *Überblick* button in the toolbar, or Cmd/Ctrl+I. The button and the shortcut take the selected verse, otherwise the highlighted one, otherwise the first verse on screen.
- **Fixed compartments, each with a count:** *Kommentare* · *Parallelstellen* (Sefaria links, OpenBible cross-references, ETCBC parallels with their similarity, Josephus and other Second Temple texts) · *Legenden (Ginzberg)* · *Talmud & Midrasch* (also Mishnah and Tosefta) · *Halacha* · *Wörter* (the Hebrew words of the verse with lemma and short meaning; Tanakh only) · *Orte* · *Themen* · *Mischna ↔ Talmud* · *Gliederung / Mizwa* (the outline points and the mitzvot of the 613 that cover the verse) · *Notizen* · *Weitere Verknüpfungen* (everything else). The row of chips at the top shows all compartments; empty ones are greyed out there and hidden below. A chip scrolls to its compartment.
- **Entries** work as in the links panel: a click jumps (Cmd/Ctrl-click: new tab), ▸ unfolds a preview, hovering shows the preview bubble; texts that are not in your library are grey. Each compartment shows its first six entries, *+ n weitere* unfolds the rest, and *alle anzeigen* opens the panel the data come from (commentary panel, links panel at the matching group, map with the places of the verse, topics, outline, *Notizen* tab). A word opens its word card, a place the map, a topic the topics panel, a note the note window.
- **Return from a word card:** the overview retains its selected statistics tab, expanded lists and scroll position for the current passage.
- **Follows the verse:** clicking another verse number, `j`/`k`, changing chapter or jumping elsewhere updates the panel. It is pinned beside the text by default (pin next to ✕; unpinned it floats and closes with Esc).
- Nothing is fetched twice: the panel is assembled from what the chapter has already loaded (links of the section, topics, places, outline, notes); only the Westminster verse is read from the library when that version is not on screen.

## Commentary panel (Cmd+K)

- Shows commentaries on the selected verse (e.g. Rashi and Ibn Ezra one below the other) in the chosen language (Hebrew, English, German). If no commentator is selected, all locally available ones are shown; grey chips mark commentators that are not in your library.
- **Whole chapter:** without a selected verse the panel shows the commentaries on the whole chapter, per commentator, verse by verse; a click on a verse number narrows it to that verse.
- ▲/▼ *Vers* (or the keys `j`/`k`) step to the next or previous verse and keep the commentator you were reading. *⇣ Folgen* makes the panel follow the verse you are reading while you scroll.
- A click on a commentator's heading folds the commentary; ↗ opens the book in a new tab; right-click opens a jump list and further options. A commentator with several passages on a verse shows which passage you are in ("2/3").
- Where Sefaria's links have a gap, the entry is taken from the commentary text you downloaded.
- Resizable (drag the edge, double-click resets) with A−/A+ text size, both remembered. Cmd+F also searches inside the panel.

## Dictionaries

- **Opening:** the *Wörterbuch* tab, the 📖 button next to the commentary button, double-click on any word in the text or commentary, or right-click a Hebrew word (or selection) → *Im Wörterbuch nachschlagen*.
- **Bundled:** BDB (unabridged, with Strong and BDB numbers, verses linked, Greek in SBL Greek), Gesenius (1915), Jastrow, Levy's Talmud dictionary (vols. 1–4), Levy's Targumim dictionary (vols. 1–2), Krauss, *Griechische und lateinische Lehnwörter* part II, the register of Krauss's *Talmudische Archäologie* (vol. III; 11,727 entries whose page numbers lead into the three volumes, which are part of the library as a text), and Hamburger's *Real-Encyclopädie für Bibel und Talmud* (vol. 1, the talmudic articles of vol. 2 and the supplement volumes I–VI; footnotes inline). Together more than 100,000 entries. In Levy and Krauss, abbreviations are explained in a tooltip on hover; Bible, Talmud and Midrash citations are linked to the passage; Krauss's cross-references (*s. X*, *vgl. X*) jump to the headword.
- **Lookup rules:** vowel points and final-letter forms are ignored, the prefixes ו ה ב כ ל מ ש are tried, entries that start with the word are also listed. *⌫ 1. Buchstabe* removes the first letter and looks up again. Suggestions appear while typing; Enter looks the word up. Results are grouped per dictionary with a coloured title bar and hit count; the dictionary name and headword stay visible while you scroll an entry.
- **From the text and back:** a word looked up from the text shows where it came from (*aus Genesis 25:8*) and stays highlighted in the text; a click returns to the verse.
- **Full-text search:** *auch im Text* searches the article bodies, not only the headwords; matches are highlighted. Phrases in quotation marks and the wildcards `*` and `?` work too.
- **Dictionary selection:** 📚 opens a checklist (*alle* / *keins*) of the installed dictionaries; the button shows e.g. *3 von 10* (the three Hamburger parts count separately); the selection is remembered.
- **Headword list:** *☰ Stichwörter* in a dictionary's title bar opens its complete, sorted headword list in a filterable pop-up; a click looks the word up in that dictionary only.
- **Recent searches and favourites:** the last 30 own queries and starred words (☆) are shown as chips (in the wide *Wörterbuch* tab as two columns), shared by both reading windows, and included in the notes export/import.
- **Navigation inside the panel:** back/forward, A−/A+ text size, hover preview of linked entries. Right-click (as in GoldenDict): *Select current article*, *Select all*, and the list of dictionaries that have an entry for the current word.
- **Linked sources:** a citation opens the passage in the reader; Cmd/Ctrl-click opens a new tab, Shift-click the second window. Citations to texts not in your library are marked.
- **Your own dictionaries:** 📚 → *DSL-Datei hinzufügen …* accepts ABBYY-Lingvo `.dsl` and `.dsl.dz` (UTF-16/UTF-8). Tags such as `[b]`, `[i]`, `[c]`, `[ref]` are rendered; images and sound are skipped. Citations marked `{{ref:Shabbat 105a}}…{{/ref}}` (an ordinary DSL comment for other programs) become clickable in Safran. Dictionaries can be removed again.

## Morphology and manuscripts

- **OSHB Tanakh** (Westminster Leningrad Codex with morphology): every word carries a lemma (Strong number) and a morphology code; a click shows stem, tense/form, person, gender and number and looks the lemma up in the dictionary.
- **Same rendering:** in a Hebrew word card, click a German rendering to list all indexed Hebrew lemmas with the same grouped German base form in that translation. Expand an entry for translation forms, references and a link to its word card. Long reference lists load 60 at a time; Back restores the rendering search. This searches the aligned rendering index, not contextual semantic equivalence, and ignores the original card’s morphology filters.
- **Word card:** *Wortkarte* in the word popup (and every word in *Alles zu dieser Stelle*) opens a panel on the lemma with two tabs, *Überblick* and *Alle Formen (Tabelle)*. The head shows lemma, short meaning, number of occurrences and forms and the Strong number. Entries with the same consonants appear beside the lemma; their counts are overall Tanakh totals, independently of translation alignment coverage. Selecting an entry switches the entire card, retaining the chosen translation. The overview has: *Alle Stellen dieses Wortes* (starts the lemma search in the search tab: Hebrew, match *Alle Formen*) · **Wörterbücher** – the entries for the lemma from the installed dictionaries in your order and selection (BDB, Gesenius, Jastrow, Levy …), headword and first lines, unfolding to the full article with clickable citations, *↗ Wörterbuch* opens the entry in the dictionary tab · **Verteilung im Tanach** – one bar per book in the order of the Tanakh (Torah, Prophets, Writings); hovering shows occurrences, verses and the rate per 1000 verses, a click lists the verses of that book with preview and jump · **Häufigste Formen** – the eight most frequent forms with their verses, and a link to the full table · **Wiedergabe in der Septuaginta** – the most frequent Greek words for the lemma from the CATSS word-by-word alignment, reduced to their lemma (θεός, not θεός and θεοῦ separately; articles and, where the Hebrew word has a prefix or suffix, prepositions and pronouns are dropped), each opening the Greek word card. Targum renderings are not shown: the Targum texts carry their own morphology but no word alignment with the Hebrew.
- **Forms table:** *Alle Formen (Tabelle)* in the word popup lists every form of the lemma attested in the Tanakh: verbs by stem and tense/form with rows for person, gender and number; nouns and adjectives by gender, number and state, with suffixed forms by suffix person. Each form carries its frequency and its verses (preview on hover, click to jump). Built from the bundled OSHB data (`forms.js`, index `oshb-forms.js`), offline.
- **Septuagint morphology:** a click on any Greek word of the Septuagint versions shows lemma, part of speech and parsing (*Verb · Aorist Indikativ Aktiv · 3. Sg.*), a short English meaning (STEPBible) and the Hebrew counterpart of its word group from CATSS; in a group every word has its line, a click on another line selects that word. *unsicher* marks parsings the source rates as low confidence, *nach der Wortform* the few words that could not be aligned in their verse. Buttons: *Im Wörterbuch nachschlagen* (only if an installed dictionary knows the lemma), *Wortkarte*, *Alle Formen (Tabelle)*, *Alle Stellen dieses Wortes*. The **Greek word card** has the same parts as the Hebrew one – dictionaries, distribution per book (Torah, Prophets, Writings, Apocrypha; Judges A/B, Daniel/Theodotion and the two versions of Tobit, Susanna and Bel as separate bars), most frequent forms – and *Hebräische Vorlage*: the Hebrew lemmas this word renders according to CATSS, each opening its Hebrew word card. The **Greek forms table** lists the attested forms by tense, mood and voice with rows for person and number, participles and nominal forms by case, number and gender; forms whose parsing allows several cases or genders (nom./acc. neuter) appear in each matching cell and are marked with *. In the Hebrew word card *Wiedergabe in der Septuaginta* counts Greek lemmas, each a link to the Greek card. Data: lxx-morph (Seth Kushniryk, CC BY 4.0) in `lxx-morph.js`, logic in `gmorph.js`, built with `tools/lxxmorph/build.js`; offline.
- **Verse numbering traditions:** Safran counts like Sefaria (Hebrew). `versemap.js` converts references between the Hebrew, English (KJV), Latin (Vulgate) and Greek (Septuagint after Rahlfs) numbering of the Tanakh (table from TVTMS, STEPBible.org / Tyndale House, CC BY 4.0; `tools/tvtms/build.js`). Per version two settings – how the version itself counts and which numbering its citations follow – from `bundled/versification.json`, a `versification` field in the file, or a right-click on the column head. Recognised references from texts with another numbering are converted before the jump and in the links built from the bundled texts (`tools/ownlinks/build.js`); the hover preview notes *englische Zählung … = hebr. …*, the reference carries a small ⇄. References that do not exist in the Hebrew numbering are read as English numbering where that gives an existing verse. A version of a biblical book that counts differently (Rahlfs) is rearranged to the Hebrew verse in the column view and in synchronised scrolling, with its own number in small print in front.
- **Aleppo Codex** (all 39 books, Qere in the reading text), **Qumran scrolls** (36 biblical books, all scrolls per verse with sigla, every word clickable; plus all 735 non-biblical scrolls – the 40 largest as separate books, the rest per cave – with lemma and morphology), **Targum Onkelos (Sperber), Pseudo-Jonathan and Neofiti** (Torah, with word morphology), **Septuagint (CATSS)** with the Hebrew counterpart per word group (interlinear switchable; Judges as Codex A and B, Daniel also after Theodotion), the **Septuagint after Rahlfs** for Hosea, Esther with its additions and the deuterocanonical books (next to the existing versions where chapters and verses match, otherwise as titles *… (Septuaginta)*), **parallel passages** (ETCBC). Sources in [SOURCES.md](../SOURCES.md).

## Search

- **Full-text search** across all downloaded texts, including footnotes and your own texts. Hebrew vowels and cantillation are ignored; one search field with two selectors: *Sprache* (automatic by script, Hebrew, German, English, other, all) and *Treffer* (all forms, word with prefixes, exactly this word, parts of words too), and a line that says what the current settings do; a permanent, searchable category checklist on the right; results and book chips in Sefaria order.
- **Hebrew Tanakh:** *Alle Formen* finds all forms of a word through the lemma of the Westminster morphology; *Grammatik (Tanach)* searches by part of speech, stem, tense, person, gender, number, state, suffix and article, with or without a search word. By default only the Westminster text is searched in the Tanakh, so every verse is found once.
- **Septuagint:** Greek input searches the Greek texts; *Alle Formen* finds all forms of a word through the lemma of the Septuagint morphology (accents may be omitted: ποιεω finds ἐποίησεν).
- **Several words and phrases:** any number of words in the search field must all occur near each other (distance and word order under *Erweitert*); quotation marks (`"Himmel und Erde"`) search an exact phrase. Wildcards (`anf*`, `m?er`) and fuzzy matching for variant spellings (Raschi/Rashi, avraham/Abraham). *Erweitert* also holds *Tanach: nur Westminster*, the grammar search and a help box with examples.
- **Results:** the same verse found in several versions appears once, with the other versions folding out below (*⧉ Fassungen zusammenfassen* switches this off); a chart of the hits per book; per-book hit chips, *Alle als Lesetext öffnen* (all hits as a reading text in a new tab, ordered by book and chapter, with the chosen versions side by side), *Treffer als CSV*, right-click to open a hit in a new tab or the second window. Searches run in a background thread.
- **Recent searches and favourites** (☆) under the search field.
- **In this book** (🔎) searches only the open book; **Cmd+F** searches the displayed page, also in the commentary panel; *ganzes Wort* finds only complete words (the setting is remembered).

## Map, topics, outlines

- **Bible map** (🗺, button shows the number of places): places of the current chapter on a map of Israel with borders, relief, rivers and routes; distance measurement, elevation profile, notes on places. Places from Josephus and the books of the Maccabees are included.
- **Jerusalem** (🏛 inside the map at high zoom): Wilson's Ordnance Survey of 1864/65 with hillshade and today's streets and wall.
- **Topics** (🏷): topic view that maps topics to passages; the button shows the count.
- **Outlines** (☰ *Gliederung*) for the 39 books of the Tanakh, the 63 tractates of the Mishnah, the Apocrypha and Pseudepigrapha, Josephus (*Antiquities*, *War*), the *Guide for the Perplexed* and Ginzberg's *Legends of the Jews*; for the Torah the switch **613 Mizwot** shows only the commandments. A click jumps to the passage (in the *Legends* also into another volume); in the map, *☰ Gliederung* leads back to the outline.
- **Outline headings in the text:** weekly portions, topics, chapters and sub-sections appear as headings between the verses; can be switched off under ⚙ *Anzeige* (*Gliederung als Überschriften im Text*).

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

On Windows and Linux use Ctrl instead of Cmd.

| Shortcut | Action |
| --- | --- |
| ← / → | previous / next section |
| Cmd+T / Cmd+W | new tab / close tab (Cmd+Shift+W closes the window) |
| Cmd+1…9 | select tab (9 = last); Cmd+Alt+←/→ tab left/right; Ctrl+Tab / Ctrl+Shift+Tab next / previous tab |
| Cmd+[ / Cmd+] | back / forward |
| Cmd+F | search in the displayed text (also in the commentary panel); Enter / Shift+Enter next / previous hit |
| Cmd+K | commentary panel |
| Cmd+I | *Alles zu dieser Stelle* (everything on the selected verse) |
| `j` / `k` | commentary panel or *Alles zu dieser Stelle* open: next / previous verse |
| `n` | bookmark or note on the current verse (*Lesen* tab) |
| Cmd+B | show / hide book list |
| Cmd+Shift+O | open the Offline Library |
| Cmd+click | open a book, link or citation in a new tab |
| Shift+click | open a citation in the second window |
| Alt+click | open a book in the second window |
| Double-click a word | look it up in the dictionary |
| Esc | close the topmost open panel, the find bar or the headword list; with commentary and dictionary as tabs: back from the dictionary to the commentary |
