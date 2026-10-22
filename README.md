# Sefaria Mac

An offline library for [Sefaria](https://www.sefaria.org) texts on macOS (Electron). On launch it opens the **Offline Library** directly; a **Werkzeuge** (Tools) menu adds book download and upload-preparation helpers.

> **Not affiliated with Sefaria.** This is an independent, unofficial project. The app contains **no texts**: they are downloaded to your computer from the public Sefaria export. The app never uploads anything to Sefaria.

> The user interface is currently in German.

![Annotated reading view](screenshots/reading-and-commentary-annotated.jpg)

*Sanhedrin 14a: Hebrew, English and German side by side, with the commentary panel on the right.*

| # | What it does |
| --- | --- |
| 1 | Main sections: **Lesen** (read), **Suche** (full-text search), **Notizen** (notes and bookmarks), **Herunterladen** (download books, links and updates). Also: book list, import your own text, storage location. |
| 2 | Back / forward through the history of the current tab. |
| 3 | Current book (Hebrew title next to it) and ◀ section selector ▶ (chapter or Talmud page). |
| 4 | Jump field: type `14 2`, `2:5`, `Daf 3a` or `gen. 1:1` and press Enter. |
| 5 | Versions: switch individual text versions (Hebrew, English, German, your own) on and off. |
| 6 | Commentary panel (Cmd+K) – commentaries on the selected verse, one below the other. |
| 7 | Links (Verknüpfungen) for the whole section, grouped by category and book. |
| 8 | Footnote mode: open on click, always show, or hide. |
| 9 | Export the section (or a range) as PDF or Word, with footnotes and your notes. |
| 10 | Display options: font sizes per language, hide vowels and cantillation marks. |
| 11 | Larger / smaller text. |
| 12 | Column headers show which version is displayed in each column. |
| 13 | Verse number (click it to choose the verse for the commentary panel; ☆ on hover adds a bookmark) and the number of links to that verse. |
| 14 | Footnote marker: click it to open the footnote inline; click the number again to close it, so text stays selectable. |
| 15 | Language of the commentaries (Hebrew, English or German). |
| 16 | Previous / next verse in the commentary panel. |
| 17 | Commentator selection (collapsible). With none selected, all locally available commentators are shown. |
| 18 | Commentary text. |
| 19 | Commentator name: click to open the book in a new tab. |

## Features

- **Download:** load the catalog once (~22 MB), tick categories or single books, choose languages (Hebrew, English, German) and download. By default the merged version per language is used; German translations are downloaded in full. Interrupted downloads can be resumed; existing files are skipped.
- **Reading:** Hebrew, English and German side by side, aligned verse by verse. Chapters / Talmud pages (2a, 2b …) via drop-down or arrow keys. Footnotes open inline in the text (click the small marker). Individual versions can be switched on and off.
- **Tabs, history and sessions:** multiple tabs with back/forward per tab, a "recently opened" list, and open tabs are restored on the next start.
- **Jump field:** type a location (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abbreviated book names work.
- **Search:** full-text search across all downloaded texts (including footnotes and your own texts), Hebrew vowels and cantillation ignored, optional "whole words with prefixes", category filter. In-page search with Cmd+F.
- **Links (Verknüpfungen):** download Sefaria's link data once (~680 MB), then see links per verse, grouped by category and book, with text preview.
- **Commentary panel (Cmd+K):** shows commentaries on the selected verse (e.g. Rashi and Ibn Ezra one below the other) in the chosen language. If no commentator is selected, all locally available ones are shown.
- **Your own texts:** import TXT, Word (.docx), CSV, JSON or Sefaria upload CSV files, several at once (drag & drop works). Your text appears as an extra column next to the original and is compared line by line with it.
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
