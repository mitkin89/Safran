# Genesis: MT–Peshitta word groups

Build with `node tools/peshitta/alignment/build.cjs /path/to/source-files`.
The directory must contain `AA3.final`, `Genesis_HE.txt`, `Genesis_SYR.txt`
from [ETCBC/PaTraCoSy](https://github.com/ETCBC/PaTraCoSy), commit
`5ae978de615d9287c3bce71b0b971a14dcd9af09`. The generated dataset records
SHA-256 checksums of all three inputs and the exact reader text editions.

PaTraCoSy by Mikko Luukko and colleagues provides automatic GIZA++ links:
[project description](https://etcbc.nl/uncategorized/1119/),
[research paper](https://aclanthology.org/2022.lrec-1.454/).
`AA3.final` contains positional links; `actual.ti.final` is a lexical
translation-probability table and is deliberately not used as positional
confidence. The automatic alignment is not a reviewed critical apparatus.

Transfer uses the existing ETCBC phono → OSHB index as an explicit bridge.
Both complete phonetic and Syriac consonantal verse streams and whole-word
boundaries must agree. Maqqef groups can link several MT words. No fuzzy
matching, lexical inference, gap filling or forced one-to-one pairing is
performed. A verse is withheld if either bridge fails. Reader source hashes,
verse forms and word counts are checked again at runtime. Source word IDs
continue to resolve to the existing Syriac morphology.

`coverage.json` lists accepted and withheld verses. The current pilot covers
1,161 of 1,533 Genesis verses. Unlinked words remain unlinked; they are not
classified as additions or omissions. All accepted links are presented as
automatic proposals, not as manually verified semantic equivalences.

The reader offers Peshitta in its Interlinear menu with consonantal Hebrew
transliteration, and reciprocal highlighting when the Peshitta column is
open. Other books have no inferred links. The feature is available offline.

Provenance/licensing: OSHB, phono and Peshitta retain their existing source
notices; Peshitta is ETCBC CC BY-NC 4.0 (see the bundled Peshitta notice).
The PaTraCoSy Genesis directory does not supply a license. The GPL file in
another repository subdirectory is not assumed to license these alignments.
This derivative stores factual word links with the reader's existing text
forms and credits the source; it does not redistribute the raw GIZA files
or assign them a new license.
