# ETCBC BHSA 2021

**Biblia Hebraica Stuttgartensia Amstelodamensis** by the Eep Talstra Centre for Bible and Computer (ETCBC), Vrije Universiteit Amsterdam. Cite [DOI 10.17026/dans-z6y-skyh](https://doi.org/10.17026/dans-z6y-skyh).

Source: [ETCBC BHSA, Text-Fabric 2021](https://github.com/ETCBC/bhsa/tree/4db00e2157915495e1a4d3d57e41223df24775da/tf/2021). The BHSA data and this derived index are licensed under [Creative Commons Attribution–NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/).

Safran extracts text domains, clause relation codes, resumption links and parent links (including unambiguously resolved word/phrase anchors), aligns them to its OSHB Westminster wording, omits unaligned passages, and compresses the resulting index. The package contains the derived index.

The derived index also includes clause `kind` (VC/NC/WP) and `typ` from the same pinned 2021 revision. Their SHA-256 hashes are recorded and verified in `bhsa-source.js`; the generator uses only clause-node values, never phrase-node types.

Alignment now uses source-verified OSHB variant markers from `openscriptures/morphhb` revision `db6c5c9b46b8f39346f10915ddb1a70dcd429901`. BHSA's Ketiv stream is compared exactly with the corresponding unchanged reading-text token positions. Qere positions are kept distinct and do not inherit Ketiv clause membership. Exact character projection handles original source versus Safran verse boundaries. Ten unequal source consonant streams remain unaligned and are listed in index metadata; no fuzzy or final-form normalization is applied.
