# Sources and licenses

**English** · [Deutsch](SOURCES.de.md)

## Sefaria source and licenses

All texts, the catalog and the link data come from the public **Sefaria export** ([Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export), files hosted in Google Cloud Storage). Sefaria itself is an open-source project: <https://github.com/Sefaria/Sefaria-Project> · <https://www.sefaria.org>.

The texts are **not** covered by this project's license. Each text version has its own license (mostly Creative Commons, some public domain, some restricted); it is listed in the version information on Sefaria and in the exported files. If you reuse or redistribute texts, please follow those licenses and credit Sefaria and the original sources. Texts you import yourself stay on your computer.

The Bible cross-references in `xref.json` (Tanakh only, shown among the Sefaria links) come from [OpenBible.info](https://www.openbible.info/labs/cross-references/) (mostly the Treasury of Scripture Knowledge), licensed CC BY 4.0. Converter: `tools/xref/`.

## Hebrew Tanakh with morphology (OSHB)

All 39 books are included as an additional Hebrew version “Westminster Leningrad Codex (OSHB, with morphology)” under `bundled/own/…/he/`. Every word carries a lemma (Strong number) and a morphology code; a click in the reader shows stem, tense/form, person, gender and number and looks the lemma up in the dictionary.

Source and license: Original work of the Open Scriptures Hebrew Bible, <https://github.com/openscriptures/morphhb> – text (WLC) public domain, lemma and morphology CC BY 4.0. Lemma table from <https://github.com/openscriptures/HebrewLexicon> (`oshb-lemmas.js`). Converter: `tools/oshb/`.

## Aleppo Codex, Targumim and parallels (ETCBC / CACCHT)

- **Aleppo Codex** – all 39 books as the Hebrew version “Aleppo Codex (מקרא על פי המסורה, ETCBC-CACCHT)”. Text: “מקרא על פי המסורה”, he.wikisource.org, dataset by Martijn Naaijer ([MartijnNaaijer/aleppo](https://github.com/MartijnNaaijer/aleppo)), license **CC BY-SA 4.0** (<https://creativecommons.org/licenses/by-sa/4.0/>). Changes: converted to chapters/verses; the reading text shows the Qere instead of the Ketiv. This text stays under CC BY-SA. Converter: `tools/aleppo/`.
- **Targum Pseudo-Jonathan and Targum Neofiti 1** (Genesis–Deuteronomy) with word morphology (`targum-lex.js`) – [ETCBC Targum Corpus](https://github.com/ETCBC/targum), MIT license, version 0.0.1-alpha. Converter: `tools/targum/`.
- **Qumran scrolls** – biblical manuscripts from the Dead Sea as the Hebrew version “Qumran scrolls (ETCBC DSS)” for 36 books; per verse all scrolls with their sigla. Source: [ETCBC/dss](https://github.com/ETCBC/dss) (CACCHT Dead Sea Scrolls dataset), data by Martin G. Abegg Jr., James E. Bowley and Edward M. Cook, conversion by Jarod Jacobs, Martijn Naaijer and Dirk Roorda; license **CC BY-NC 4.0** (<https://creativecommons.org/licenses/by-nc/4.0/>) – non-commercial use only. Changes: grouped by book, chapter and verse, simplified characters. Converter: `tools/dss/`.
- **BDB (Brown-Driver-Briggs, unabridged)** – dictionary with 10,022 entries, also searchable by Strong number (H3) and BDB number. Public domain (1906); text base by Tim Morton (Bible Analyzer), Bible references by Stephen Ku et al., processing by Eliran Wong: [eliranwong/unabridged-BDB-Hebrew-lexicon](https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon). Converter: `tools/bdb/`.
- **Parallel passages** (`parallels.js`) – [ETCBC/parallels](https://github.com/ETCBC/parallels), MIT license, based on the BHSA (CC BY-NC 4.0, only as the starting data of the similarity computation). Converter: `tools/parallels/`.
- **Septuagint (CATSS)** – Greek version with the Hebrew counterpart per word group (interlinear switchable), 40 versions (Tanakh; Judges as Codex A and B, Daniel additionally after Theodotion); plus, minus and alignment tags are marked. Source: CATSS (Tov/Kraft), [Oxford Text Archive 1111](https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/1111), **CC BY-NC-SA 3.0**, non-commercial only – see `LICENSE-CATSS.md`. Converter: `tools/catss/`.

## Bible map

Map of the places of a chapter (🗺 in the reading bar, also from the outline), with distance measurement, elevation profile, notes on places and routes. Sources:
- Places, references, location confidence: [OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) (CC BY 4.0).
- Terrain: Copernicus DEM GLO-30 (© DLR/ESA/Copernicus, free to use with attribution); coasts, rivers, lakes and current borders: Natural Earth (public domain). Converter: `tools/map/`.
- Routes: [UBS Bible Routes](https://github.com/ubsicap/ubs-open-license) (MARBLE, after Leen Ritmeyer, © United Bible Societies 2023, **CC BY-SA 4.0**) – `map/routes.js` is therefore under the same license; Bible references and German titles are our own assignment.
- Places in Josephus (Jewish War, Antiquities 11–20) and in the books of the Maccabees: [ToposText](https://topostext.org) (Brady Kiesling, Aikaterini Laskaridis Foundation; Open Data Commons Attribution). The assignment to Sefaria chapters is derived from the Whiston text (`tools/map/extract_topostext.py`, `tools/map/build_josephus.py`) and stored in `map/josephus.js`.
- Jerusalem in detail (🏛 button in the map, at high zoom): [Ordnance Survey of Jerusalem](https://commons.wikimedia.org/wiki/File:1865_Ordnance_Survey_of_Jerusalem_Old_City_full_map.jpg) (Charles W. Wilson, 1864/65, public domain, Wikimedia Commons), hillshade from Copernicus DEM GLO-30, today's streets and wall from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL). Build: `tools/map/build_jerusalem.py`, `tools/map/build_jer_meta.py`.

## Audio and outlines

- **Audio:** Hebrew reading of the Tanakh by Abraham Schmueloff, source: [archive.org](https://archive.org/details/HebrewOldTestamentReadByAbrahamSchmueloff) (Talking Bibles International). Split into chapters; verse markers in `audio-markers/`. The audio files are not part of the repository but of the GitHub release `audio` (one `Audio_<Book>.zip` per book). The licence information is being clarified with Talking Bibles International.
- **Outlines (`outlines/`):** outlines of 39 books transcribed from a printed edition; German and English translations are machine-generated and not proofread. Tools: `tools/assemble_outline_photos.py`, `tools/merge_outline_tr.py`.

## Interface language

The interface is available in German and English (⋯ menu → Sprache). The English strings live in `i18n.js`: German original on the left, translation on the right; `{}` and `{#}` (number) are placeholders. New interface strings in the code stay German and get an entry there. `test10.js` checks the table.

## License of this project

The source code of this app is released under the [MIT License](LICENSE).
