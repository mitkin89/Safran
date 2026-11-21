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
ids and transliterations in an initially expanded details section. A single dictionary
action searches the attested content morpheme in the selected dictionaries,
including SEDRA when selected. Full lexical entries and roots appear only in
the Dictionary pane. No ETCBC-to-SEDRA lemma identity is inferred.

The data is CC BY-NC 4.0; see `LICENSE-SEDRA.md` for attribution, partner credits
and the documented changes. This import includes no library texts, scans or
generated paradigms.

## Syriac word cards

The same converter also writes `sedra-data.js`, loaded only when a Syriac word
card is opened. `report.json` pins its SHA-256. The structured index preserves
lexeme/root/word ids and source references; six additional grammatical lookup
tables are pinned in `source.json`. No live API is needed.

`syriac-cards.js` builds exact spelling and explicit-root indexes. It keeps
homonyms distinct, requires a candidate selection when spelling is ambiguous,
and groups recorded non-theoretical forms by their own SEDRA morphology,
including recorded suffix information. Western and Eastern vocalizations are
shown independently; missing values stay missing. Counts are dictionary records,
never passage occurrences. Entry choices, family navigation and forms tabs use
the existing shared word-card pane, history, pinning and font scaling.

## Etymology and transliteration

The pinned `etymologies` table adds original language, source word, notes and
bracket status to dictionary articles and word cards. Attribution is to the
SEDRA etymology id and release; these records do not provide an individual
bibliographic source id, so no such reference is inferred from the lexeme.
Contributor ids and account-related fields are excluded from runtime output.
Missing origins or explanations remain missing.

Original lexeme transliterations (SEDRA III/IV, CAL, Leiden and Hugoye) are
shown without inventing pronunciation. Recorded Eastern/Western form
transliterations are retained with their tradition label.

`syriac-transliteration-data.js` contains the original five schemes and 335
mapping records; its hash is in `report.json`. The explicit dictionary input
modes SEDRA IV, CAL and Leiden convert Latin input before searching all selected
dictionaries. Case distinctions are preserved. Multiple mapped Syriac letters
remain separate query candidates; results are deduplicated by dictionary/id.
Whitespace variants are canonicalized to ASCII spaces for input. Unsupported
characters and excessive ambiguity report an error rather than silently dropping
input. Dictionary wildcards and phrase quotes are preserved. Hugoye and SEDRA III
remain display-only. This does not generate vocalization.

Input mode and original query are retained in dictionary history, tabs and
saved-query metadata. Programmatic lookups in original script reset to direct
input. Ordinary Latin queries are never auto-detected as Syriac.
