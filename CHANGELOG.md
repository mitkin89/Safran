# Changelog

### New in 1.8
- **Maps:** Bible map of Israel and detailed Jerusalem map; the places of a chapter, with a back button to the outline.
- **Topics** and **outlines** for 39 books (Hebrew/German/English), Torah outlines with a **613 Mitzvot** switch.
- **Audio:** Hebrew reading with verse markers; download per book from the GitHub release.
- **Pinning:** six windows can be pinned beside the text; unpinned ones close on an outside click; a click on a verse number opens the commentary.
- **Labelled buttons** with counts, the open tab always visible, more English interface strings.
- BDB: verses linked, Greek in SBL Greek; Gesenius ✡; hover preview in dictionaries.

### New in 1.4
- **DSL dictionaries:** ⋯ → "📖 Wörterbuch …". Add ABBYY-Lingvo `.dsl` / `.dsl.dz` files, look up words (vowel points, final letters and Hebrew prefixes are handled), and right-click any Hebrew word in the text → *Im Wörterbuch nachschlagen*. The panel opens on the right like the commentary panel and shares the column with it. Cross-references are clickable; dictionaries can be removed again.
- **Search results:** right-click for *Open*, *Open in new tab*, *Open in second window*.
- **Bundled texts:** Rashi (Bamberger), Kitzur Shulchan Arukh, Mendelssohn (Taitsch and Biur) and Hirsch's Psalms added; Devarim Rabbah and the Guide of the Perplexed are now included once; version names unified (212 versions). Bundled texts that disappear from the package are removed on the next start.
- **First start on macOS/Windows:** a new README section, plus *Zuerst lesen.txt* and *Safran freischalten.command* inside the `.dmg` that explain and perform the one-time unlock for the unsigned app.
- **Dialogs and menus:** every dialog has a ✕; clicking outside closes the *Versionen* list and the ⋯ menu.

### New in 1.3

**Name and look**
- The app is now called **Safran** (סַפְרָן, "scribe / librarian"). The data folder is unchanged, so your library, notes and settings carry over.
- The talmud.de logo is the app icon and appears on the empty start page and in the ⋯ menu.

**Own texts and commentaries**
- **Bundled texts:** the new `bundled/` folder ships texts with the app. The app imports new or changed texts on start; texts a user removes do not come back; a user's own version of the same text is never overwritten. ⋯ → "Eigene Texte für GitHub exportieren …" writes all your own texts into such a folder. The repository now contains 212 bundled versions (Zunz 1838, Philippson, Mendelssohn, Herxheimer, Hertz, Rashi and Kitzur Shulchan Arukh (Bamberger), Mendelssohn (Netivot ha-Shalom, Biur), Midrash Rabbah, More Nevuchim and others).
- **Import dialog:** choose *Text* or *Kommentar* per file. For a commentary you enter commentator and book (with suggestions); the title `Commentator on Book` is built for you and a warning appears if the book is not in your library.
- **Own commentaries in the commentary panel**, also for files in Sefaria upload format (`Title chapter:verse<TAB>text`, also as `.txt`), including gaps.
- **Remove own texts:** ✕ on hover in the book list, or right-click → *Eigenen Text entfernen …*. Original files stay untouched.
- **Embedded images:** inline Base64 images (PNG, JPEG, GIF, WebP) in own texts and commentaries are displayed; all other tags and external images are still stripped.
- File names with umlauts are matched on macOS and Windows alike.
- **Dictionaries (DSL):** ⋯ → "📖 Wörterbuch …" opens a lookup panel on the right (below the commentary panel if that is open); add ABBYY-Lingvo `.dsl` / `.dsl.dz` dictionaries under "Wörterbücher verwalten" (UTF-16/UTF-8, tags like `[b]`, `[i]`, `[c]`, `[ref]` are rendered; images and sound are skipped). Lookup ignores vowel points and final-letter forms, tries to strip the prefixes ו ה ב כ ל מ ש, and also lists entries that start with your word. Right-click a Hebrew word (or a selection) in the text → *Im Wörterbuch nachschlagen*. Cross-references in an entry are clickable.
- **Dictionary button:** 📖 next to the commentary button toggles the panel; double-click any word in the text or commentary to look it up. The panel has back/forward arrows and A−/A+ text size (remembered). Right-click (like GoldenDict) for *Select current article*, *Select all* and a list of the dictionaries that have an entry for the current word, to jump to that article.
- **Clickable sources:** dictionaries may mark citations (`{{ref:Shabbat 105a}}Schabb. 105ᵃ{{/ref}}` – an ordinary DSL comment for other programs); in Safran a click opens that place in the reader (Cmd/Ctrl-click: new tab), provided the text is in your library.
- **Bundled dictionaries:** dictionaries in `bundled/dict/` (gzip-compressed, with a manifest) are installed on first start and updated when they change; a dictionary a user removes stays removed.
- Dialogs have a ✕; clicking outside closes the *Versionen* list and the ⋯ menu.
- **Search results:** right-click a result for *Open*, *Open in new tab* or *Open in second window* (the exact version and passage are kept).

**Reading**
- **Suggestions while typing** in the jump field, the new-tab field (e.g. "ge" → Genesis).
- Typing only a book name and pressing Enter opens the first chapter.
- The language selection is remembered across books (English only as a fallback when no German text exists).
- **Resizable commentary panel** (drag the edge, double-click resets) and A−/A+ text size, both remembered.
- The commentator list only shows commentaries that exist locally in the chosen language.
- Links panel: fixed category order (Tanakh, Mishnah, Tosefta, Talmud, Responsa, then the rest).
- Only the star itself creates a bookmark; clicking next to it selects the verse for the commentary panel.

**Menus and layout**
- Right-click menu (*Open*, *Open in new tab*, *Open in second window*) on books, history entries and commentator names; a new tab opens automatically if the second window already has one.
- Second window: layout fixed (right text no longer covered, jump field stays visible).
- "Herunterladen" moved into the ⋯ menu for more room in the header.

**Fixes**
- The link badge next to a verse number is no longer shown twice.
- Several layout and language-selection bugs (see commit history).

### New in 1.2
- **Compact toolbar:** the header and book bar shrank from about 175 px to about 90 px: app tabs and open books share one row, a ⋯ menu holds rarely used items (own text, storage location, show in file manager, statistics), and a ⚙ panel holds footnotes, font and export.
- Code review fixes: security hardening, bug fixes, Windows support.

### New in 1.1
- **Search:** results and book chips follow the Sefaria order (Tanakh, Mishnah, Talmud, …); larger result text; search inside categories *and* single books; per-book hit chips and CSV export; searches run in a background thread.
- **Advanced search:** up to three words near each other (adjustable distance, optional fixed order), wildcards `*` and `?`, and **fuzzy** matching for similar spellings (Raschi/Rashi). A help box with examples sits below the inputs.
- **Categories in search:** a permanent, searchable checklist on the right (like the book list).
- **Sefaria order** of categories, books and tractates everywhere (book list, download tab, search).
- **Second reading window:** "⧉ Zweites Fenster" splits the window; the right side has its own tabs, history, commentary panel and book list. Alt+click on a book opens it on the right; "⇅ Gleichlauf" syncs paging.
- **Reader:** "🔎 In diesem Buch" searches only the open book; right-click a verse to copy its reference or open it on sefaria.org; Cmd/Ctrl+F also searches the open commentary panel.
- **Own texts:** re-importing asks before overwriting; ⟳ re-reads the source file; word-level diff against an existing version; "CSV" saves an own text as a Sefaria upload CSV.
- **Security:** navigation locked to local files, stricter CSP, allow-listed drag-and-drop paths, PDF export via temp file.
- **Windows:** `npm run dist:win` builds an installer and a portable exe; a GitHub Actions workflow builds macOS and Windows.
