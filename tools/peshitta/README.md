# Peshitta for Safran

39 Tanakh books from ETCBC/peshitta, TF 0.2. Extra books and Christian texts are excluded. The source word and after-word material are preserved in original order, with numeric Text-Fabric word IDs. Verse 0 is retained using numbered verse dictionaries; subsequent verse numbers are not shifted. Source numbering is explicitly labelled and is not silently remapped to Hebrew, Greek, English or Latin numbering.

Morphology is taken separately from ETCBC/syriac, TF 0.92, only for the same book/chapter/verse with exactly identical complete consonantal word streams. The annotation corpus splits some reader words into morphemes. Only complete character spans inside the reader word are attached, retaining all its separate parts and their original source fields. Annotation gaps and textual differences receive no guessed analysis. Runtime checks the exact text SHA256, word form, original ID and verse location. English source glosses are lexical aids, not translations of passages. Script lemma display is a transliteration of the original ETCBC lexeme; the original lexeme is also displayed.

## Sources, attribution and licenses

Text: Willem Th. van Peursen, Geert Jan Veldman, Constantijn Sikkel, Hannes Vlaardingerbroek and Dirk Roorda / Eep Talstra Centre for Bible and Computer, Peshitta Institute. Electronic Peshitta based on *Vetus Testamentum Syriace* and, for remaining books, Codex Ambrosianus. https://github.com/ETCBC/peshitta ; https://doi.org/10.5281/zenodo.1464757 . The critical apparatus is not included in the GitHub source or this conversion.

Morphology: ETCBC Syriac Corpus, compiled by Martijn Naaijer, with the contributors credited at https://github.com/ETCBC/syriac . The data includes selected Peshitta books only; source versions and immutable file hashes are recorded in `sources.json` and distributed in `bundled/peshitta-sources.json`.

Both text and annotation datasets: CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . This conversion preserves that license. Safran changes: selection of the 39 Tanakh books, HTML word wrappers, compact annotation tables, exact text matching and reader UI.

Offline font: Noto Sans Syriac Eastern, SIL Open Font License 1.1. Original copyright and complete license accompany the font at `assets/fonts/NotoSansSyriacEastern-OFL.txt`.

## Reproduce

```
python3 tools/peshitta/fetch.py /tmp/safran-peshitta
python3 tools/peshitta/build.py /tmp/safran-peshitta
node --test tests/peshitta.test.js
```

The fetcher and builder verify Git blob SHA1 for every input. Build coverage is recorded in `coverage.json`. No Text-Fabric installation is required.
