# Changelog

### New in 2.3.6
- **New tab shows the Jewish calendar:** the weekly Torah portion (with the Shabbat date), the haftarah, the Daf Yomi (Bavli) and the Yerushalmi Yomi of the day, in English and Hebrew. A click opens the passage in Safran. The data come from hebcal.com (diaspora readings) and are stored for 13 months, so it also works offline; with internet they are renewed monthly.
- **Commentary ▲/▼ Verse (and j/k):** if the commentary's verse is no longer on screen because you scrolled on, they now step from the verse you are reading, not from the start of the chapter.
- **Opening a commentary from the commentary bar** (↗ or right-click → Open): references like "Rav Hirsch on Torah, Genesis 27:45" were read as two passages and opened the start of the work; they now open the right chapter and line.
- **Version menu at a column label:** removing or adding a version keeps your reading position instead of jumping to a marked verse or the start of the chapter.
- **New tab calendar:** browse to other days (‹ › one day, « » one week, or pick a date; "Today" returns). Past dates and dates further ahead are fetched from hebcal.com when needed. The logo is centred, and the new tab keeps a moderate font size independent of the reading text size.
- **Outline as headings in the text** (on by default, can be switched off under *Display*): weekly portions, topics, chapters and sub-sections of a book's outline appear as centred headings between the verses. If a chapter begins in the middle of a section, its heading is shown at the top as "(continued)".
- **Linux:** the app icon is now included in the package, so the window and taskbar show it (X11).

### New in 2.3.5
- **Commentary and dictionary together:** when both are open they appear as **tabs** (default, full height; Esc returns from the dictionary to the commentary at the same place) or **stacked** with a draggable divider (height is remembered; double-click resets). In wide windows they stand **side by side**, but only if the reading text keeps enough room. ⇅ switches between the modes.
- **Buttons become icons** when the commentary or dictionary column gets narrow, as in the book bar.
- **Commentary:**
  - **"⇣ Follow":** while you scroll the text, the commentary shows the verse you are reading.
  - When you move to another verse, the list opens at the **same commentator** you were reading (if there is one for the new verse).
  - A commentator with several passages on a verse (×3) shows **which passage you are in** ("2/3"); the passages are separated by a dashed line.
  - The row of commentator links at the top is gone; **right-click** in the commentary opens the jump list, which now scrolls when it is long.
- **Dictionary:**
  - The **dictionary name and headword stay visible** while scrolling an entry.
  - A word looked up from the text shows **where it came from** ("from Genesis 25:8", click to go back) and stays highlighted in the text.
  - Look up with **Enter**; the separate button is gone. Calmer typography: links underlined only on hover, Hebrew slightly larger, shorter lines.
- **Reading text** becomes slightly smaller while a sidebar is pinned, so fewer lines wrap (can be switched off under *Display*). The pinned column is set off slightly from the text.
- **Safran reopens as you left it:** window size and position (also maximised or full screen), the main tab, the exact reading position, the open commentary (verse and commentator) and the dictionary with its last word.
- **Fixes:**
  - The section list of works with several versions is in the order of the work ("Preface" first, then books 1–20), not with missing parts appended at the end (e.g. Josephus).
  - Parts of larger works (e.g. Philo, "Allegorical Interpretation of Genesis, Book III") are no longer marked "not local" in the connections.
  - "Follow" and the key **n** (new note) now work right after the start, not only after switching tabs.
  - Ginzberg, *Legenden* 1:2:119, note 134: two uncertain readings resolved from the manuscript.

### New in 2.3
- **New German text: Louis Ginzberg, *Die Legenden der Juden*** (vols. 1–4), a reading edition from Ginzberg's own German manuscript, aligned paragraph by paragraph with Sefaria's *Legends of the Jews*. Over 4,000 of Ginzberg's notes are footnotes. Abbreviations and source titles in the notes show their meaning on hover (e.g. "BR." → Bereschit Rabba, "Wayyosha" → Midrasch Wajoscha).
- **Ginzberg's sources are linked:** about 2,700 Bible references and 8,900 references to Midrash, Talmud, Josephus, Philo, Enoch and Maccabees open the passage on click. They also appear as **connections in both directions** (10,600 in total): reading e.g. Bereshit Rabbah 12 shows which paragraphs of the *Legends* quote it. These bundled connections work even without downloading Sefaria's links.
- **Outline for the *Legends*:** volumes, chapters and 450 section headings; a click jumps to the paragraph.
- **Bible references with Roman chapter numbers** ("Jerem. XXIII, 24", "Ps. CXLV, 15", "I Sam. XIV, 24-25") are now recognised and linked in all texts.
- **Back after following a link** returns to the paragraph you came from, not to the start of the chapter.
- **Links into parts of larger works** ("Midrash Tanchuma, Vaera 16", "On the Life of Moses, Book I 5") and **three-level references** (volume:chapter:paragraph, book:chapter:section) now open the right place.
- **Connections for texts with three levels** (e.g. volume:chapter:paragraph) are now assigned to the right chapter.
- **Version menu:** "Only this version" closes all other versions if it is the only one of its language; if its language has several versions, only those are reduced and the other languages stay.
- **Faster start without a white window:** the window appears only once the interface is drawn, in the colour of the chosen appearance, and the large lookup tables (Targum lexicon, OSHB lemmas, parallels, map elevations) load after the start. Start-up times are written to `startup.log` in the data folder.

### New in 2.2
- **New German texts:**
  - *Schulchan Aruch* (Ph. Lederer): Orach Chajim (1897), Jore Deah and Ewen haëser (1900), as own texts under the Sefaria titles.
  - *Avot DeRabbi Natan* (Pollak, 1905): German translation with notes, aligned to Sefaria's chapter and segment structure.
  - *Tractate Soferim* (Joel Müller, 1878): German commentary.
  - *Mishneh Torah, Sanctification of the New Month* (Hildesheimer, 1881): free, summarising German rendering of the astronomical chapters, with notes as footnotes.
  - *Samuel* (Wolf), *Job* (Dawidowicz) and the *Arba Megillot* (Breuer; Ruth, Song of Songs, Ecclesiastes, Lamentations): translation and commentary, verse by verse like Sefaria.
- **New dictionary: Hamburger, Real-Encyclopädie für Bibel und Talmud** (vol. 1 and vol. 2, talmudic articles). Footnotes are inline and collapsible, paragraphs and numbering are kept, and references to "Jerus./Jeruschalmi" lead to the Jerusalem Talmud instead of the Bavli.
- **Footnotes everywhere:** the comment bar and the dictionary now show footnotes collapsibly, with the same "Footnotes" setting (click / all / off) as the reading text. They are set apart by colour (accent colour, margin line, bold number).
- **Search:** "Select all categories" ticks all main categories; a click below a selected main category selects only that entry; input with spaces is treated as several words in the extended modes.
- **Version menu:** "Only this version" now applies only within its language.
- **Own commentaries on books with a comma in the title** (e.g. "Mishneh Torah, Sanctification of the New Month") now show their text in the comment bar; the title was wrongly split at the comma.

### New in 2.1.1
- **Linux:** Safran is now also available for Linux (AppImage and .deb), built automatically together with the macOS and Windows versions.
- **Dictionary search:** phrases in quotation marks ("…") and the wildcards `*` and `?`.
- **Levy:** Fleischer's supplements to the letters א–ד (pp. 276–288, 431–444) and ה, ו, ז (pp. 446–556) are now built into the entries. Supplements without a name are now marked "Nachtrag (Goldschmidt)" (previously "Nachtrag des Verfassers"), in Levy vols. 1–4 and in the Targumim dictionary. A Hebrew sentence with an inserted "l." is now shown as its own right-to-left block in the correct order.
- **Dictionary tab:** the header stays in place while scrolling, tabs sit in the input row, tools on the right. "Manage" (order, remove, add) moved into the selection menu. "Recent searches" and "Favourites" are no longer in the sidebar but columns in the wide dictionary tab. The panel reaches the bottom edge of the window.
- **Version number:** the 2.1 installers still carried the number 2.0.0, so the update notice never went away. Fixed with 2.1.1.

### New in 2.0
- **Reading layout "one column per language":** ⚙ Anzeige → *Anordnung*. Instead of one column per version, Hebrew, English and German each get their own column and the versions of a language are stacked below each other, each with its version name.
- **Version menu:** a click on a version name (or on a column header) opens a menu: remove this version from the view, show only this version, or add/remove any other version of the same language (✓ = shown).
- **Search – one hit per verse:** the same verse found in several versions appears once, with the version you chose last (otherwise the one in the interface language) on top and "+2 more versions" to unfold the rest. The counter shows verses instead of hits per version. The button **⧉ Fassungen zusammenfassen** switches back to the single list.
- **Commentaries – gaps in Sefaria's links closed:** where Sefaria links a commentary to an empty entry (e.g. Abarbanel on Jeremiah 31:2) or not at all (e.g. Minchat Shai on Jeremiah 31:2), Safran now takes the entry from the commentary text you have downloaded. Only commentators that Sefaria already links as commentary in this book, only "X on the same book", only verses with real text; correct links stay untouched.
- **Private texts survive updates:** texts that are not part of the public repository (`manifest.private*.json`) are never removed automatically any more, are also read from the fixed folder `private` in Safran's data folder (macOS: `~/Library/Application Support/Sefaria/private/`, Windows: `%APPDATA%\Sefaria\private\`) and are backed up there at each start. If a text is missing in the bundled folder, the copy in the data folder is used. A short log of the import is written to `private-import.log` in the data folder.

### New in 1.9.9
- **Torah in German – Lazarus Goldschmidt (Berlin 1921):** the translation of Genesis, Exodus, Leviticus, Numbers and Deuteronomy (5,846 verses, divided verse by verse exactly like Sefaria), added as a further version under each book. Digitized by Chaim Guski.
- **Safran never starts empty:** there is always a tab open – at start, in the second window, and after closing the last tab. As long as no Sefaria texts are downloaded, the new tab shows a short guide (⋯ → Download… → load the catalog → select → download).
- **Second window restores its session:** its tabs and texts come back at the next start, separately from the main window.
- **Sync (⇅) in four steps:** off, both windows lead each other, only the left window leads, only the right window leads. Each click on the button switches to the next step; the choice is remembered.
- **Sync by click:** a click on a verse – also on the empty area of the row or in the German text – takes the other window to that verse. The verse lights up briefly, but only if the other window actually has it (e.g. not when an open commentary has no entry for it).
- **More room for the text:** while the commentary bar is open, the reading area now starts at the left edge instead of being centred.

### New in 1.9.8
- **New German texts – Raphael Breuer:** *Josua* (1915), *Richter (Schofetim)* and *Nehemia*, each translation divided verse by verse like Sefaria (under Joshua, Judges, Nehemiah) and the commentary as a separate text (Breuer on Joshua / Judges / Nehemiah, without the Hebrew Bible text).
- **New German texts – Julius Hirsch, *Trei Asar*:** the twelve minor prophets (Hosea to Malachi) – translation under each book (1,045 of 1,050 verses, divided like Sefaria) and the commentary as a separate text (Hirsch on Hosea … Malachi) with the introductions to the books. Gaps in the scan: Hosea 9:2–3 and Amos 7:15–17 are missing; small Hebrew vowel signs in the commentary are not yet fully proofread.
- **Audio:** no more folder choice – the download always goes to one fixed folder of Safran (on Windows `%APPDATA%\Sefaria\audio`) and is used automatically. Your own audio files can be put into the same folder. A folder chosen in an earlier version keeps working until you download again.
- **Cmd/Ctrl-click opens a background tab – everywhere:** in the search results, library, outlines, notes, commentary and link lists, source links and cross references, a Cmd/Ctrl-click opens the target in a new tab in the background; the current view stays where it is. The tab loads when you switch to it and jumps to the verse.

### New in 1.9.7
- **Audio on Windows:** the play button now works – paths with backslashes and a drive letter (`C:\Users\…`) were turned into an invalid file address, so the player opened but stayed silent.

### New in 1.9.6
- **Download tab:** entries that no longer exist in Sefaria's catalog (HTTP 404, e.g. a renamed version) are listed as outdated and skipped instead of being reported as errors.
- **Download tab:** new button **Alles auswählen** selects every category and title with one click.
- **Audio download:** a book that fails no longer aborts the whole download – each download is checked against its size in the release and retried once, the other books are still loaded, the failed ones are named in the message, and books that are already loaded are usable right away (the audio folder is remembered even after a partial download).

### New in 1.9.5
- **Hebrew in commentaries:** Hebrew words inside German/English commentary and text columns are now set in SBL Hebrew, like everywhere else.
- **Hirsch on Isaiah (German):** Julius Hirsch's *Jesaia* – the translation (under Isaiah, 1291 verses, divided verse by verse exactly like Sefaria) and the commentary as a separate text (without the Hebrew Bible text).
- **Breuer on Ezekiel and Breuer on Ezra (German):** Joseph Breuer's commentary on Ezekiel (1921; commentary only, 876 verses, with the four plans/figures embedded) and Raphael Breuer's *Esra* (1933): the translation sits under Ezra, divided verse by verse like Sefaria, the commentary is a separate text (introduction and foreword left out).
- **Wünsche's midrash translations (German):** Pesikta de-Rav Kahana, Midrash Shmuel, and the Rabbah volumes on Song of Songs, Ruth, Ecclesiastes, Esther and Lamentations – transcribed from the prints and divided segment by segment like Sefaria (parts without a Sefaria counterpart, e.g. editors' introductions and appendices, are left out).
- **Mishneh Torah (Mandelstamm), 12 more volumes in German:** Leavened and Unleavened Bread, Blessings, Eruvin, Rest on a Holiday, Gifts to the Poor, Scroll of Esther and Hanukkah, Sabbath, Shofar/Sukkah/Lulav, Rest on the Tenth of Tishrei, Fasts, Tefillin/Mezuzah/Torah Scroll, Theft – transcribed from the 1851 print, printing errors fixed, divided chapter by chapter and halakhah by halakhah like Sefaria.
- **Mishneh Torah (Mandelstamm), 15 more volumes in German:** Borrowing and Deposit, Hiring, Creditor and Debtor, Plaintiff and Defendant, Inheritances, Slaves (only 4 of 9 chapters in the German edition), Agents and Partners, Sales, Mourning, Neighbors, Ownerless Property and Gifts, Robbery and Lost Property, Rebels, One Who Injures a Person or Property, Damages to Property – transcribed from the 1851 print, printing errors fixed, divided halakhah by halakhah like Sefaria; halakhot omitted in the print stay empty.

### New in 1.9
- **Dictionaries – full text:** tick *auch im Text* to search the article text, not only the headwords; hits are highlighted. The 📚 button chooses which dictionaries are searched.
- **Headword list:** every dictionary bar has a **≡ Stichwörter** button; a click on a headword searches all selected dictionaries.
- **Dictionary tab:** recent searches on the left, favourites on the right.
- **New dictionaries:** Krauss, *Griechische und lateinische Lehnwörter* (part II) with abbreviation tooltips, source links and clickable cross references ("s. X"); Levy, *Targumim-Wörterbuch* (vols. 1–2); abbreviations added to Levy's Talmud dictionary.
- **New texts:** Apocrypha and Pseudepigrapha (Kautzsch, 1900), Mishneh Torah (Mandelstamm), Testaments of the Twelve Patriarchs as one book with twelve parts.
- **Outlines:** the whole Mishnah (63 tractates), Ketuvim sub-points, *Guide for the Perplexed*, Da'at Mikra sub-points; search (Cmd+F), keyboard control, marker follows the clicked verse.
- JSON import keeps title, version and language; unpinned commentary and dictionary open one at a time; the window title follows the chapter.
- Windows build: long paths allowed when checking out the bundled texts.

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
