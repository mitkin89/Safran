# Word-card corpus index

Rebuild from the repository root with `node scripts/build-word-card-corpora.cjs`.
The generated `app/word-card-corpora-data.js` adds the 35 bundled Greek Josephus/Philo editions and the 11 indexed Zeraim tractates. Tanakh and Septuagint cards use their existing indexes at runtime.

Greek records use the source-bound lemma and morphology in the reading editions. Manual Gorman overrides use the same word-stream and token-boundary checks as `GreekCorpus.at`. Reading-text hashes are verified before indexing. Attribution and licenses remain those in `tools/greek-corpus/README.md` and `bundled/greek-corpus-LICENSES.md` (automatic OGA data CC BY-SA 4.0; manual Gorman data CC BY-NC-SA 4.0). The combined index includes the separately attributed manual layer and is not relicensed as BY-SA.

Mishnah records come from `mishnah-morph-data.js` and `mishnah-zeraim-data.js`, with source edition paths retained. These are candidate analyses; the UI states their limited coverage and does not assert lexical identity with identically spelled Tanakh entries. Multiple analyses of one token are counted once in totals and once per matching facet. Facet totals can overlap for ambiguous analyses. Each reference retains its source edition, section path, row label and token index.

Tests: `node --test app/tests/word-card-corpora.test.js` and the Electron smoke scenario `SAFRAN_SMOKE_CORPUS_CARDS=1`.
