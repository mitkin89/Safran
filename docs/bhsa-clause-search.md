# BHSA in Safran

Open **Search → Advanced → Clause search (Tanakh) → Download BHSA data**. Safran downloads the pinned Text-Fabric features from the ETCBC repository, checks their hashes, and builds a local index. The index is available offline after installation. The source data is [ETCBC BHSA 2021](https://github.com/ETCBC/bhsa/tree/4db00e2157915495e1a4d3d57e41223df24775da), licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

- **Text domain** uses the innermost [BHSA text domain](https://etcbc.github.io/bhsa/features/txt/). Choose narrative, narrator’s aside, or direct speech. These filters also work without a lemma.
- **Resumptions only** uses the BHSA clause relation [`Resu`](https://etcbc.github.io/bhsa/features/rela/) and shows a link to the earlier passage in the word card when the parent reference is available.
- **Combined search** with a subject or object requires a MACULA predicate and a single BHSA clause with the same aligned predicate and all explicit matching constituents. The lemma of an implied subject comes from MACULA’s own reference.

The two databases can segment the same text differently. Verses with different consonant sequences, ambiguous word positions, or incompatible clause boundaries are omitted from combined results. The installed index status shows how many BHSA source verses aligned with the bundled Westminster edition.
