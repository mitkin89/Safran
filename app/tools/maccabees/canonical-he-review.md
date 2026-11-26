# Frankel Hebrew canonical verse boundaries

Reviewed against actual Hebrew content, with the checked Hebrew→Kautzsch→Rahlfs bridge used to locate exceptional ranges. Greek/Kahana Hebrew passage wording was consulted for I, actual Greek and the reviewed per-Greek German fragments for II.

`canonical-i-he.json` contains 94 overrides; `canonical-ii-he.json` contains 56. Each `parts` entry belongs to one successive Rahlfs verse. Triples identify native slot and raw JavaScript UTF-16 start/end offsets (end exclusive). These public-domain Hebrew fixtures contain BMP text; offsets were computed directly using JavaScript string indices, not byte positions. Original spelling, punctuation and whitespace are retained exactly once. No proportional splitting is used.

Two I overrides extend into adjacent initially automatic groups because content straddles the earlier coarse bridge:

- 2:42–44: the fugitives joining Mattathias belong to verse43, inside native Hebrew45; Hebrew46 describes the army's action in44.
- 14:26–28: engraving the bronze tablets belongs to26 (native Hebrew28); native29–30 and the beginning of31 supply27; the assembly belongs to28.

Some native sentences change clause order. Their exact fragments are assigned by content, including I1:36–37, I10:80–81, and II13:19–20. In II8:14–20 the misplaced native Hebrew26 prayer continuation is assigned to canonical15, while native17–25 form16–20. This changes display placement without altering the source wording or indices.

Every referenced native Hebrew slot was checked for exact once-only character coverage across the corresponding override. Overrides only resolve exceptional multi-verse ranges; the canonical engine retains its reviewed automatic mapping for single-verse groups.
