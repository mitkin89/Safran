# Passage statistics

`python3 tools/oshb/statistics-roots.py` rebuilds the explicit root map from the
compressed LexicalIndex.xml / AugIndex.xml snapshots. Upstream HebrewLexicon
commit: `21c9add13bc727d3a951361778e97e3ff7afd1ce`.
`node tools/oshb/statistics.cjs` then rebuilds `passage-stats-data.js` offline.

The index counts every OSHB span with a decoded main lemma, including unpointed
forms. Its 300,730 recognized tokens and 9,518 lemma keys come from all 39 bundled
Westminster books; JSON text SHA-256 is retained for each book. Prefix segments
are not extra word tokens. Function words are included in the denominator and
excluded from content-word lists. Names have their own list.

The comparison selector retains both the current book and the entire Tanakh.
For a passage count n / size C and corpus count T / size N, ranking uses
`n * log(((n+.5)/(C+1)) / ((T-n+.5)/(N-C+1)))`. This compares normalized frequency
with the rest of the selected corpus using half-count smoothing. Candidates need
at least three local occurrences, or two when the selected corpus has at most
five. This is an exploratory ranking, not a significance test or determination
of subject/theme. A whole-book selection cannot be compared with the rest of
that same book. Displayed counts remain original integers, not smoothed values.

Rare means 1–19 total lemma occurrences in the Tanakh; book and Tanakh counts are
both displayed. Vocabulary tiers and the existing under-100 vocabulary export
remain available. All frequencies are tied to OSHB, not a translation.

Roots are taken only from explicit `etym root=... type=main` entries, or an
unambiguous chain of `type=sub` references to such an entry. Augmented Strong IDs
are mapped through AugIndex. Root identity includes the lexical entry ID and
language; identical consonants do not merge homonyms. Missing/ambiguous root
references stay absent. No consonant-stripping root guesses are made.

Verb forms are grouped by language and the main OSHB morphology code. The table
shows one labelled example per morphology type; its number counts all words of
that type, not just the example lemma. Stem, tense/form and person/gender/number
are retained. Consecutive forms remain distinct. The example opens the existing
word card.

Repeated combinations are consecutive 2–3-lemma sequences within individual
verses. Inflections may differ; function words remain in these sequences.
Unknown tokens break a sequence, verse boundaries are never crossed, overlapping
occurrences count separately, and every displayed combination links its verses.

Source coverage is compact metadata derived from existing apparatus payloads:
Tal note groups mapped to MT references; CATSS remarks; DSS transcription
coverage; indexed Kennicott entries. It records which verses have source
material, not the number of established textual variants or agreement with MT.
The source datasets and their own licences remain authoritative.

Tests: `node --test tests/passage-statistics.test.js` validates all corpus counts,
source hashes, separate comparison baselines, whole-book handling, rare words,
root homonyms, missing-root behavior, morphology, and n-gram boundaries.
`SAFRAN_SMOKE_STATS=1 npm run test:smoke` checks both comparison choices, all new
panes, verse navigation, scope separation and restart persistence.
