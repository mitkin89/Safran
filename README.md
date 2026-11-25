<p align="center"><img src="app/logo.png" alt="Safran logo" width="100"></p>

<h1 align="center">Safran <span dir="rtl">סַפְרָן</span></h1>

<p align="center"><b>A Jewish library for reading, comparing and taking notes — offline.</b><br>Tanakh, Talmud, Midrash and commentaries, with German interlinear translations, dictionaries and source sheets.</p>

<p align="center">
  <a href="https://github.com/mitkin89/Safran/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mitkin89/Safran?label=release&color=7b4b1f"></a>
  <a href="https://www.sefaria.org"><img src="screenshots/powered-by-sefaria.png" alt="Powered by Sefaria" height="24"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/code-MIT-blue"></a>
  <a href="https://github.com/mitkin89/Safran/releases/latest"><b>Download for macOS, Windows or Linux</b></a>
</p>

<p align="center"><b>English</b> · <a href="README.de.md">Deutsch</a> · <a href="#install">Install</a> · <a href="#notebooks-and-source-sheets">Notebooks & source sheets</a> · <a href="#masora">Masora</a> · <a href="#development">Development</a></p>

![Genesis 1 in Safran: Westminster Hebrew, S. R. Hirsch’s German translation and an interlinear line, with corresponding words highlighted.](screenshots/current/reading.png)

*Reading Genesis 1 with Hebrew, German and interlinear text*

Safran is a free, open-source desktop app. Read texts side by side, follow a Hebrew word into its grammar and translations, and collect your findings in notebooks and source sheets. Texts, dictionaries and your work stay on your computer. Safran is an independent project and is not affiliated with Sefaria.

**Current release: [2.8.6](https://github.com/mitkin89/Safran/releases/tag/2.8.6)** — verse-aligned Maccabees editions, source-sheet footnotes and improved PDF exports. [Release notes](docs/releases/2.8.6.md).

![Genesis 1 chapter overview: unusually frequent words compared with the rest of Genesis and highlighted in the Hebrew text.](screenshots/current/chapter-overview.png)

*Chapter overview with highlighted word frequencies*

![Genesis 1 with interlinear lines for ancient textual witnesses and an open Syriac Peshitta word analysis.](screenshots/current/ancient-versions.png)

*Ancient versions and Syriac word analysis*

![Word card for אֶרֶץ beside Genesis: distribution in the Tanakh, frequent forms and German renderings in Mendelssohn’s translation.](screenshots/current/word-study.png)

*Hebrew word study with translation examples*

![Search results in Hebrew and Aramaic, with highlighted matches, distribution across books and category filters.](screenshots/current/search.png)

*Full-text search in Hebrew and Aramaic*

![Notes workspace with notebook navigation, a note list and two linked sources: Hoffmann on Deuteronomy and Job 1:1.](screenshots/current/notebooks.png)

*Notebooks with linked passages*

![Source-sheet editor for Bava Metzia 20a: Hebrew and Aramaic main text, Sammter and Goldschmidt translations in the margins, source navigation and undo/redo controls.](screenshots/current/source-sheet.png)

*Source-sheet editor with parallel translations*

![Source-sheet page preview with the Hebrew and Aramaic text between two German translations.](screenshots/current/source-sheet-preview.png)

*Print preview of a source sheet*

![Genesis 1:2 with Field’s Hexapla readings for Aquila, Symmachus and Theodotion and English explanations beside the Hebrew text.](screenshots/current/apparatus.png)

*Textual apparatus with readings from Field’s Hexapla*

![Masorah notes on Genesis 1:2 beside the Hebrew text, with cited passages and visible German working translations.](screenshots/current/masora.png)

*Masorah notes with German working translations*

## Install

Choose a download from the [latest release](https://github.com/mitkin89/Safran/releases/latest):

| System | Download | Start |
| --- | --- | --- |
| macOS, Apple Silicon | `.dmg` | Open and drag Safran into Applications. |
| Windows | Setup `.exe` or portable `.exe` | Run the installer, or open the portable app. |
| Linux | `.AppImage` or `.deb` | Make the AppImage executable, or install the Debian package. |

Safran has no paid developer certificate. On macOS, if Gatekeeper blocks the app, use **System Settings → Privacy & Security → Open Anyway**. The DMG also includes **Safran freischalten.command**; right-click it and choose **Open**. On Windows, SmartScreen may offer **More info → Run anyway**. Only use these steps for a download you trust from this repository.

### First steps

1. **Start reading.** Bundled texts and dictionaries are available on first launch. Pick a book and chapter; **Versions** selects the editions shown alongside one another.
2. **Add your library.** Under **⋯ → Download…**, load the Sefaria catalog, then choose books and languages. Once downloaded, they work offline.
3. **Study a word.** Turn on **Interlinear**, click a Hebrew word for grammar and its word card, or double-click a word for a dictionary lookup.
4. **Keep what you find.** Open **Notes** to create a notebook, or use **＋ Source sheet** in the reader to collect an excerpt and its edition.

The interface supports German, English and Hebrew; change it under **⋯ → Language**. The screenshots show the current desktop app with Hebrew sources, German translations and its reading and research tools.

## Read and compare

- **Parallel editions:** Hebrew, English, German and ancient versions in columns, with tabs, passage navigation and a second reading pane.
- **German interlinear:** Zunz and Philippson cover all 39 books of the Tanakh. Further translations cover individual books or groups, including Mendelssohn, Goldschmidt, Hirsch and Breuer. Ancient-version alignments can be added where available.
- **Follow the text:** select a word to highlight its counterparts, open footnotes in place and follow linked references into other books.
- **Commentaries and context:** a verse or chapter can bring together commentaries, parallels, Talmud and Midrash links, halakhah, places and dictionary citations.
- **Reading tools:** adjustable fonts, light/dark themes, outlines, Bible maps, a Jewish calendar and optional Hebrew audio.

New Hebrew Bible sources default to **Westminster (OSHB)** until you choose another edition. Interlinear depends on a matching word alignment; the presence of a translation does not guarantee interlinear support. Differing verse numbering remains edition-specific.

The chapter overview compares unusually frequent and rare words, roots, verb forms, word combinations and names. Compare a chapter with its book or the whole Tanakh, highlight the results in the reader and explore similar chapters.

### Ancient versions word by word

Compare the Septuagint, Onkelos, Qumran scrolls, Samaritan Pentateuch and Peshitta beneath the Westminster text where word alignments are available. Click an annotated word for its analysis, source and dictionary links.

## Words, dictionaries and search

A word card connects morphology, attested forms, translation choices and occurrences. Compare how an aligned translation renders a lemma, then open the passages behind that rendering.

The dictionary shelf includes BDB, Gesenius, Jastrow, Levy, Liddell & Scott, Pape, Krauss and Hamburger. Search headwords or article text, explain supported abbreviations on hover, and open linked citations in the reader. You can also add DSL dictionaries.

Full-text search supports phrases, wildcards, nearby words, language and book filters. Hebrew and Greek lemma searches find inflected forms; morphology and clause tools offer more structured searches. [Concordance](docs/concordance.md) · [Tanakh clause search](docs/bhsa-clause-search.md).

## Notebooks and source sheets

The **Notes** workspace brings your notebooks and project source sheets together. Notes can hold formatted text, tags and several linked excerpts from specific editions. Drafts stay available while you move between notes.

Use a source sheet to prepare a lesson, a comparison or a reading session:

1. Capture a passage from the reader or add it by reference inside the sheet. Choose the edition and preview its text. You can also import the reader’s display, including compatible interlinear lines.
2. Select a range such as `Deuteronomy 1:1–10`, or separate verses such as `Deuteronomy 1:2,5,10`. Changing the source selection preserves compatible word mappings; rewriting the excerpt by hand can disable them.
3. Add headings, your own text, commentary and linked notes. Jump through the source outline, arrange sources in the main text or margins, remove items, and undo/redo edits.
4. Preview the page and export PDF, DOCX or HTML. Reuse collections or share a project JSON package; CSV and JSON-LD exports support research workflows.

[Detailed source-sheet workflow, formats and limits](docs/RESEARCH.md) (German).

## Textual apparatus

The apparatus compares the Westminster text with manuscripts and ancient versions. Read a verse or chapter, choose witnesses, follow the reading position and inspect the source behind a variant.

| Witness | Comparison | Coverage |
| --- | --- | --- |
| **MA** | Aleppo text against Leningrad: consonants, vowels and word division | 39 books; losses in the Aleppo codex marked |
| **SMR** | Samaritan Pentateuch, Tal–Florentin, with original notes | Torah |
| **DSS** | Biblical Qumran scrolls, manuscript sigla and reconstruction marks | 36 books |
| **LXX** | CATSS notes, retroversions and classified Septuagint readings | 38 books; Esther has a Rahlfs reading text |
| **Hex** | Field’s Hexapla and the Greek revisers | 39 books |
| **Syr** | Peshitta word alignments and Safran’s classified readings | 39 books |
| **Ken** | Kennicott’s medieval manuscript readings | 39 books |

Classifications, inferred Hebrew Vorlagen and automated explanations are study aids. They do not replace a critical edition; uncertain readings remain marked. Source text and provenance stay available. [Apparatus traditions](docs/apparatus-traditions.md).

## Masora

Browse **26,969 transcribed notes** from **1,550 published pages of 18 manuscripts**, imported from Corpus Masoreticum / BIMA. Filter manuscripts, follow verses and preview cited passages.

The compact view keeps the Hebrew note and **German working translation** together. Explanations remain visible; manuscript and source details expand when needed. Supported word links highlight the relevant text.

Translations are working versions: damaged, ambiguous and incomplete passages remain identified. Verse and word links are derived from the available evidence. The import covers a published-page snapshot, not complete editions of every manuscript. [Method and coverage](docs/masora-import.md) · [Source license](app/LICENSE-MASORA.md).

## What is in the library?

Safran bundles more than 50 German works, including translations and commentaries by Zunz, Philippson, Herxheimer, Mendelssohn, Hirsch and Breuer; Rashi after Bamberger; Kautzsch’s Apocrypha; Midrash translations; Josephus; Graetz; and Ginzberg’s *Legenden der Juden*. Further books and editions can be downloaded from Sefaria. Import your own TXT, DOCX, CSV or JSON texts as well.

Also bundled are Westminster with OSHB morphology, Aleppo, Qumran texts, the Septuagint, Targumim, the Peshitta and apparatus data. Coverage and permissions differ by source; see [sources and licenses](app/SOURCES.md).

<details>
<summary><b>The full list of bundled German texts</b></summary>

| Work | Scope |
| --- | --- |
| Zunz, *Die vier und zwanzig Bücher der Heiligen Schrift* (1838) | whole Tanakh |
| Philippson, *Die Israelitische Bibel*, translation **and** commentary | whole Tanakh |
| Herxheimer, *Die vier und zwanzig Bücher der Bibel* (1843), translation **and** commentary | whole Tanakh |
| Kautzsch, *Die Apokryphen und Pseudepigraphen des Alten Testaments* (1900) | Ben Sira, Jubilees, Enoch, Tobit, Judith, Maccabees, Wisdom of Solomon and more |
| Mendelssohn, *Die fünf Bücher Mose*, German translation (Dessau 1815) | Torah; interlinear |
| Mendelssohn, *Netivot ha-Shalom* (translation, Taitsch and Biur) | Torah |
| Rashi after Bamberger · Hertz, Pentateuch commentary | Rashi: Exodus to Deuteronomy · Hertz: Exodus, Numbers, Deuteronomy |
| Goldschmidt, translation of the Torah (1921) | Torah |
| S. R. Hirsch, Torah and Psalms · Julius Hirsch, Isaiah and the Twelve Prophets · Joseph and Raphael Breuer: Joshua, Judges, Jeremiah, Ezekiel, Ezra, Nehemiah | translation and commentary |
| Wünsche's Midrash translations | Bemidbar and Devarim Rabbah, the Rabbah volumes on the five Megillot, Pesikta de-Rav Kahana, Midrash Shmuel, *Mechiltha* (Mekhilta de-Rabbi Yishmael, with Jakob Winter, 1909) |
| *Mischne Tora* (Mandelstamm, 1851) | 39 sections |
| *Führer der Unschlüssigen* (More Nevuchim) · *Kizzur Schulchan Aruch* (Bamberger) | |
| Ginzberg, *Die Legenden der Juden*, reading edition from his German manuscript, aligned with Sefaria's *Legends of the Jews* | vols. 1–4, with over 4,000 of Ginzberg's notes as footnotes; abbreviations explained on hover; 10,600 sources (Bible, Midrash, Talmud, Josephus, Philo …) linked and shown as connections in both directions; outline |
| *Schulchan Aruch* (Lederer): Orach Chajim, Jore Deah, Ewen haëser · *Avot DeRabbi Natan* (Pollak) · Tractate *Soferim* (Müller) · *Sanctification of the New Month* (Hildesheimer) | |
| Talmud: Rawicz (Megillah, Rosh Hashanah, Ketubot, Sanhedrin, Chullin I) · Straschun (Taanit) · Sammter (Bava Metzia, 1876) · Pinner (Berakhot, 1842, with notes, plus his *Einleitung in den Talmud* and preface; his translation of Maimonides’ Introduction to the Mishnah, segmented like Sefaria) | 19th-century German translations, by daf and segment |
| Mishnah from the Talmud: the mishnayot of all 37 tractates in Goldschmidt's translation, plus those of Pinner, Sammter, Rawicz and Straschun, as separate Mishnah versions | by chapter and mishnah, with the translator's footnotes |
| Josephus, *Antiquities*, *Jewish War* and *Against Apion* (German by Clementz, 1899/1900) | segmented like Sefaria (Whiston), with Niese's section numbers |
| H. Graetz, *Geschichte der Juden* (11 volumes, from zeno.org) | chapters and notes with footnotes, page marks of the print edition, outline; the Hebrew that zeno stores reversed is turned around |
| D. Hoffmann, *Das Buch Leviticus* and *Das Buch Deuteronomium* | translation and commentary |
| Samuel (Wolf) · Job (Dawidowicz) · the *Arba Megillot* (Breuer) | translation and commentary |
| S. Krauss, *Talmudische Archäologie* (vols. I–III, 1910–1912) | full text with endnotes, figures and outline; the register is a dictionary of its own |

Goldschmidt's complete Talmud and the 19th-century Talmud translations are also published as an open dataset: [german-talmud-translations](https://github.com/mitkin89/german-talmud-translations), DOI [10.5281/zenodo.24466136](https://doi.org/10.5281/zenodo.24466136).

</details>

App updates ask before replacing changed library texts. Existing versions can be kept; replaced files are backed up under `backups/text-updates` in the library folder.

## Offline use and your data

Reading, local search, dictionaries, notebooks and source sheets work without an account or an internet connection. Downloading additional books, refreshing calendar data and checking for updates require a connection. Notes, projects and imported files are stored locally.

Back up your library folder and use note/project exports before moving your work to another computer. Texts and dictionaries retain their own source licenses.

## Development

Run from the repository root:

```sh
npm ci
npm start
npm test
```

| Location | Contents |
| --- | --- |
| [`app/`](app/) | Application code and bundled data |
| [`app/tests/`](app/tests/) | Integration, regression and Electron UI tests |
| [`app/tools/`](app/tools/) | Import, build and corpus review tools |
| [`docs/`](docs/) | Development guides, methods and release notes |

Build on the target system with `npm run dist` (macOS), `npm run dist:win` or `npm run dist:linux`. [Development guide](docs/DEVELOPMENT.md) · [All features and shortcuts](docs/FEATURES.md) · [Changelog](CHANGELOG.md).

Found a problem? [Open an issue](https://github.com/mitkin89/Safran/issues) with your OS, Safran version, book, edition and passage. Contributions of texts should identify their source and license.

## Sources and license

Safran’s source code is [MIT-licensed](LICENSE). **That license does not cover the bundled texts and datasets.** Some are public domain or CC BY/CC BY-SA; others permit only non-commercial use, including CATSS, Kennicott and several ETCBC/Tal–Florentin datasets. See the complete [source and license list](app/SOURCES.md) before redistributing or reusing data.

Corpus Masoreticum / BIMA transcriptions are [CC BY-SA 4.0](app/LICENSE-MASORA.md). Sefaria downloads keep each edition’s own license. Safran is not affiliated with Sefaria.

<p align="center"><sub><b>סַפְרָן</b> means librarian in modern Hebrew, from the same root as <i>sefer</i>, book. Safran is built by <a href="https://talmud.de">talmud.de</a>.</sub></p>
