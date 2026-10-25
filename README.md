# Safran סַפְרָן – Mac and Windows offline reader

**Why "Safran"?** The name is the Hebrew word **סַפְרָן** (*safran*): a scribe, and in modern Hebrew a librarian. It comes from the same root as *sefer* (book) and *sefarim* (books), which fits an app that is a library of texts. The app is built by [talmud.de](https://talmud.de) and is not affiliated with Sefaria.

An offline library for [Sefaria](https://www.sefaria.org) texts on macOS and Windows (Electron). On launch it opens the **Offline Library** directly; a **Werkzeuge** (Tools) menu adds book download and upload-preparation helpers.

> **Not affiliated with Sefaria.** This is an independent, unofficial project. Sefaria's texts are not part of the app: they are downloaded to your computer from the public Sefaria export. The app never uploads anything to Sefaria. Safran additionally ships texts that are **not yet available on Sefaria**: German translations and commentaries (Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Rashi and Kitzur Shulchan Arukh (Bamberger), Mendelssohn (Netivot ha-Shalom, Biur), Midrash Rabbah, More Nevuchim and others) in the `bundled/` folder, which are imported automatically on first start and appear under *Eigene Texte* (see *Bundled texts* below).

> The user interface is currently in German.

![Annotated reading view](screenshots/reading-and-commentary-annotated.jpg)

*Zephaniah 1: Hebrew, English and German side by side, with the book list and history on the left and the commentary panel on the right.*

![Annotated split view](screenshots/split-view-commentary-annotated.jpg)

*Two reading windows side by side (Genesis with commentary panel on the left, Sanhedrin on the right), with the compact toolbar.*

## Features

- **Download:** load the catalog once (~22 MB), tick categories or single books, choose languages (Hebrew, English, German) and download. By default the merged version per language is used; German translations are downloaded in full. Interrupted downloads can be resumed; existing files are skipped.
- **Reading:** Hebrew, English and German side by side, aligned verse by verse. Chapters / Talmud pages (2a, 2b …) via drop-down or arrow keys. Footnotes open inline in the text (click the small marker). Individual versions can be switched on and off.
- **Tabs, history and sessions:** multiple tabs with back/forward per tab, a "recently opened" list, and open tabs are restored on the next start.
- **Jump field:** type a location (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abbreviated book names work.
- **Search:** full-text search across all downloaded texts (including footnotes and your own texts), Hebrew vowels and cantillation ignored, optional "whole words with prefixes", category filter. Advanced search: up to three words near each other (adjustable distance, optional word order), wildcards (`anf*`, `m?er`) and fuzzy matching for variant spellings (Raschi/Rashi). In-page search with Cmd+F, also in the commentary panel.
- **Links (Verknüpfungen):** download Sefaria's link data once (~680 MB), then see links per verse, grouped by category and book, with text preview.
- **Commentary panel (Cmd+K):** shows commentaries on the selected verse (e.g. Rashi and Ibn Ezra one below the other) in the chosen language. If no commentator is selected, all locally available ones are shown.
- **Your own texts and commentaries:** import TXT, Word (.docx), CSV, JSON or Sefaria upload CSV files, several at once (drag & drop works), as a *Text* or as a *Commentary* (`Commentator on Book`, shown in the commentary panel). Your text appears as an extra column next to the original, is compared line by line with it, and can be removed again. Inline Base64 images are displayed.
- **Additional texts not on Sefaria (yet):** besides the Sefaria texts, Safran includes its own collection of German translations and commentaries that Sefaria does not offer so far. They are shown as extra versions and commentators next to the Sefaria texts.
- **Bundled texts:** texts in the project's `bundled/` folder are imported automatically on start (new or changed ones also after updates); export your own texts into that folder via ⋯ → "Eigene Texte für GitHub exportieren …".
- **Two reading windows** side by side with their own tabs, history and commentary panel; **resizable commentary panel** with adjustable text size.
- **Notes and bookmarks**, **display options** (font sizes, hide vowels/cantillation), **export** to PDF or Word, **update check** against the Sefaria export.
- **Tools menu:** download a book or chapter range as CSV/TXT/JSON; prepare and check CSV files for Sefaria upload (duplicates, gaps, order, HTML, control characters, segment counts compared to an existing Sefaria text).
- Hebrew text is set in **SBL Hebrew** if it is installed (free from the Society of Biblical Literature), otherwise a fallback font is used.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| ← / → | previous / next section |
| Cmd+T / Cmd+W | new tab / close tab (Cmd+Shift+W closes the window) |
| Cmd+1…9 | select tab (9 = last), Cmd+Alt+←/→ tab left/right |
| Cmd+[ / Cmd+] | back / forward |
| Cmd+F | search in the displayed text |
| Cmd+K | commentary panel |
| Cmd+B | show/hide book list |
| Cmd+Shift+O | open the Offline Library |

## Data size (rough figures)

All merged Hebrew texts ≈ 2.8 GB, English ≈ 0.5 GB, German translations (288 versions, mostly Tanakh, Talmud, Mishnah) ≈ 0.13 GB. All JSON texts including every single version ≈ 7 GB. The storage location can be changed ("Speicherort…"), e.g. to an external drive.

## First start on macOS and Windows

The app is **not code-signed** (Apple's and Microsoft's certificates cost money), so the first start needs one extra step. The app is not broken.

**macOS** – if you see *"Safran is damaged and can't be opened"* or *"the developer cannot be verified"*:

1. Drag **Safran** into the **Applications** folder.
2. Easiest: open the `.dmg` again and right-click **Safran freischalten.command** → *Open* → *Open*. Or run in the Terminal: `xattr -cr /Applications/Safran.app`
3. For the message *"developer cannot be verified"* you can also right-click the app → *Open* → *Open*, or use *System Settings → Privacy & Security → Open Anyway*.

**Windows** – SmartScreen may show *"Windows protected your PC"*: click **More info** → **Run anyway**.

## Getting started

1. Install Node.js 22 LTS.
2. In the project folder:

```bash
npm install
npm start
```

## Build a normal Mac app

```bash
npm run dist
```

The `.dmg` ends up in `dist/`. The app is not code-signed: on first launch, right-click the app and choose "Open".

## Tests (logic only, no UI)

```bash
npm test
```

## Sefaria source and licenses

All texts, the catalog and the link data come from the public **Sefaria export** ([Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export), files hosted in Google Cloud Storage). Sefaria itself is an open-source project: <https://github.com/Sefaria/Sefaria-Project> · <https://www.sefaria.org>.

The texts are **not** covered by this project's license. Each text version has its own license (mostly Creative Commons, some public domain, some restricted); it is listed in the version information on Sefaria and in the exported files. If you reuse or redistribute texts, please follow those licenses and credit Sefaria and the original sources. Texts you import yourself stay on your computer.

## License

The source code of this app is released under the [MIT License](LICENSE).

## Changelog

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
