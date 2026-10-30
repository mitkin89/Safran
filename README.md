<p align="center"><img src="logo.png" alt="Safran" width="110"></p>
<h1 align="center">Safran סַפְרָן</h1>
<p align="center"><b>Offline library for Tanakh, Talmud, Midrash and commentaries, with German translations that are hard to find anywhere else.</b><br>For macOS and Windows.</p>

<p align="center">
  <a href="https://github.com/mitkin89/Safran/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mitkin89/Safran?label=release"></a>
  <a href="https://github.com/mitkin89/Safran/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/mitkin89/Safran/total"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <img alt="Platforms" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey">
  <a href="https://github.com/mitkin89/Safran/actions"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/mitkin89/Safran/build.yml"></a>
</p>

<p align="center"><b>English</b> · <a href="README.de.md">Deutsch</a></p>

<p align="center"><a href="https://github.com/mitkin89/Safran/releases/latest"><img alt="Download Safran" src="https://img.shields.io/badge/%E2%AC%87%20Download%20Safran-latest%20release-2ea44f?style=for-the-badge"></a></p>

<p align="center"><img src="screenshots/reading-and-commentary-annotated.jpg" alt="Safran reading view: Hebrew, English and German with the commentary panel" width="900"><br><i>Zephaniah 1: Hebrew, English and German side by side, book list and history on the left, commentary on the right.</i></p>

> **First start:** the app is not signed with a paid certificate. On macOS right-click → *Open*; on Windows *More info → Run anyway* ([details below](#first-start-on-macos-and-windows)).
> Texts are downloaded from the public Sefaria export, only what you choose (Hebrew ≈ 2.8 GB in total). Safran is an independent project and **not affiliated with Sefaria**.

## What Safran can do

<table>
<tr>
<td width="50%" valign="top"><b>📖 Verse by verse, in three languages</b><br>Hebrew, English and German side by side, aligned verse by verse, with footnotes inline and chapters via arrow keys.</td>
<td width="50%" valign="top"><b>🇩🇪 German texts you won't find elsewhere</b><br>290+ versions, many not on Sefaria: Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Rashi (Bamberger), Midrash Rabbah, More Nevuchim …</td>
</tr>
<tr>
<td width="50%" valign="top"><b>💬 Commentary panel</b><br>Rashi, Ibn Ezra and more under the selected verse. Pin it beside the text, together with the dictionary.</td>
<td width="50%" valign="top"><b>🔎 Full-text search</b><br>Ignores vowels and cantillation; words near each other, wildcards and fuzzy matching for variant spellings.</td>
</tr>
<tr>
<td width="50%" valign="top"><b>🗺 Bible map</b><br>Places of each chapter on a map of Israel, distances, elevation profile, and a detailed 1865 map of Jerusalem.</td>
<td width="50%" valign="top"><b>🎧 Hebrew audio</b><br>Reading of the Tanakh with verse markers; the verse being read is highlighted.</td>
</tr>
<tr>
<td width="50%" valign="top"><b>📚 Dictionaries and morphology</b><br>BDB, Gesenius and your own DSL dictionaries; click a word for lemma and morphology.</td>
<td width="50%" valign="top"><b>📜 Manuscripts and versions</b><br>Aleppo Codex, Dead Sea Scrolls, Septuagint with Hebrew counterpart, Targumim, parallel passages.</td>
</tr>
</table>

<details>
<summary><b>All features</b></summary>

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


</details>

## Texts that are not on Sefaria

Besides the Sefaria texts, Safran ships its own collection of German translations and commentaries (Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Rashi and Kitzur Shulchan Arukh (Bamberger), Mendelssohn (Netivot ha-Shalom, Biur), Midrash Rabbah, More Nevuchim and others) in the `bundled/` folder. They are imported on first start and appear under *Eigene Texte*, as extra versions and commentators next to the Sefaria texts.

## Install

1. Download the installer for your system from the [latest release](https://github.com/mitkin89/Safran/releases/latest).
2. Start Safran and open **Download** to choose books and languages. The storage location can be changed (e.g. to an external drive).
3. Optional: download the Hebrew audio per book in the same window.

### First start on macOS and Windows

The app has no paid developer certificate (Apple's and Microsoft's certificates cost money), so the first start needs one extra step. The app is not broken. On macOS it is signed locally (ad-hoc), so you normally get the *"developer cannot be verified"* message with an **Open Anyway** button.

**macOS** – if you see *"Safran is damaged and can't be opened"* or *"the developer cannot be verified"*:

1. Drag **Safran** into the **Applications** folder.
2. Easiest: open the `.dmg` again and right-click **Safran freischalten.command** → *Open* → *Open*. Or run in the Terminal: `xattr -cr /Applications/Safran.app`
3. For the message *"developer cannot be verified"* use *System Settings → Privacy & Security → Open Anyway* (scroll down), or right-click the app → *Open* → *Open*.

**Windows** – SmartScreen may show *"Windows protected your PC"*: click **More info** → **Run anyway**.



### Data size (rough figures)

All merged Hebrew texts ≈ 2.8 GB, English ≈ 0.5 GB, German translations (288 versions, mostly Tanakh, Talmud, Mishnah) ≈ 0.13 GB. All JSON texts including every single version ≈ 7 GB. The storage location can be changed ("Speicherort…"), e.g. to an external drive.


## Interface

![Annotated split view](screenshots/split-view-commentary-annotated.jpg)

*Two reading windows side by side (Genesis with commentary panel on the left, Sanhedrin on the right) with the compact toolbar.*

## About

The name is the Hebrew word **סַפְרָן** (*safran*): a scribe, in modern Hebrew a librarian, from the same root as *sefer* (book). The app is built by [talmud.de](https://talmud.de). It never uploads anything to Sefaria; Sefaria's texts are not part of the app.

## More

- [Development, build and tests](docs/DEVELOPMENT.md)
- [Sources and licenses](SOURCES.md): Sefaria, OSHB, ETCBC, CATSS, maps, audio, outlines
- [Changelog](CHANGELOG.md)

## License

The source code of this app is released under the [MIT License](LICENSE). Texts have their own licenses, see [SOURCES.md](SOURCES.md).

## What's new in 1.8

Bible map and Jerusalem map · topics · outlines for 39 books with a 613 Mitzvot switch · Hebrew audio with verse markers · pinnable windows · labelled toolbar buttons. Full list in the [changelog](CHANGELOG.md).
