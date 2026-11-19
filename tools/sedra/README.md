# SEDRA offline dictionary

Rebuild: `python3 tools/sedra/build.py`.
To obtain missing source files: `python3 tools/sedra/build.py --download` (requires curl).

Source release: SEDRA 5.0, 2026-10-24, Beth Mardutho.
The selected official tables and their checksums are pinned in `source.json`;
original compressed tables, README and CITATION are in `source/`. Every published
checksum and row count is checked before building. Runtime access never calls the
SEDRA website or API.

Output: one dictionary in Safran's existing bundled dictionary format, registered
in `bundled/dict/manifest.json`. `report.json` records counts and output/source
hashes. The fixed dictionary id is derived from `Safran:SEDRA:lexicon` so updates
respect the existing dictionary-management, selection and removal semantics.

`heads` contains displayed vocalized lexemes; `keys` contains exact lexeme and
recorded non-theoretical word-form aliases. This separation prevents long lists
of inflections from appearing as article titles. The existing dictionary engine
normalizes Syriac vowel and pronunciation marks, and keeps lexical homonyms as
separate entries. Historical `is_merged` flags without a redirect do not remove
entries. No crosswalk from ETCBC lexeme ids is guessed.

English glosses come first, followed by the other supplied languages. No German
translations are invented. All glosses retain source credits and references;
root links use only upstream root ids. The compact popup shows ETCBC's contextual meanings and grammar, with source
ids and transliterations in a collapsed details section. A single dictionary
action searches the attested content morpheme in the selected dictionaries,
including SEDRA when selected. Full lexical entries and roots appear only in
the Dictionary pane. No ETCBC-to-SEDRA lemma identity is inferred.

The data is CC BY-NC 4.0; see `LICENSE-SEDRA.md` for attribution, partner credits
and the documented changes. This import includes no library texts, scans or
generated paradigms.
