# BHSA in Safran

Open **Search → Clause search (Tanakh)**. Enter Hebrew lemmas in the subject, verb or object fields, or choose **Where does God speak?** to fill in an example. Choose a book to narrow the search. Verb morphology and BHSA options are under **More filters**. Safran includes the compressed BHSA clause index and loads it offline when needed.

- **Text domain** uses the innermost [BHSA text domain](https://etcbc.github.io/bhsa/features/txt/). Choose narrative, narrator’s aside, or direct speech. These filters also work without a lemma.
- **Resumptions only** uses the BHSA clause relation [`Resu`](https://etcbc.github.io/bhsa/features/rela/) and shows a link to the earlier passage in the word card when the parent reference is available.
- **Combined search** with a subject or object requires a MACULA predicate and a single BHSA clause with the same aligned predicate and all explicit matching constituents. The lemma of an implied subject comes from MACULA’s own reference.

The two databases can segment the same text differently. Verses with different consonant sequences, ambiguous word positions, or incompatible clause boundaries are omitted from combined results. The index status shows how many BHSA source verses aligned with the bundled Westminster edition.


The index is derived from [ETCBC BHSA 2021](https://doi.org/10.17026/dans-z6y-skyh) under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). See the [bundled attribution](../bundled/bhsa/ATTRIBUTION.md). To regenerate the index, run `node tools/bhsa/build.js /path/to/bhsa/tf/2021` with the pinned source files listed in the attribution. The generator verifies their hashes.
