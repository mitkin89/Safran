# Samaritan Pentateuch data in Safran

Text and linguistic annotations: Christian Canu Højgaard, Martijn Naaijer,
and Stefan Schorch, *Text-Fabric Dataset of the Samaritan Pentateuch*.
CACCHT / DT-UCPH, version 7.5.0.
https://doi.org/10.5281/zenodo.7734632
https://github.com/DT-UCPH/sp/tree/e8a120f2e92b6558fd39bbe72f830ded871a0a47

Underlying text: MS Dublin Chester Beatty Library 751, supplemented by
MS Garizim 1. Text supplied by the Samaritanus project directed by Stefan Schorch.

Variant readings: Moshe Florentin and Abraham Tal, *The Samaritan Pentateuch:
An English Translation with a Parallel Annotated Hebrew Text*, Open Book
Publishers, https://doi.org/10.11647/OBP.0415. The English translation is not
included in this Safran import. The reading comparison was supplied in DT-UCPH/sp.

License for these materials: Creative Commons Attribution-NonCommercial 4.0
International, https://creativecommons.org/licenses/by-nc/4.0/.
See samaritan-CC-BY-NC-4.0.txt for the full license.

Safran converts Text-Fabric data to compact JSON/HTML, joins morphemes into
reading words, normalizes Unicode presentation forms and adds source-labelled
variant/annotation footnotes. It does not correct source spellings or supply
missing grammatical features. The source sign stream is verified verse by verse.

Tal–Florentin footnotes and endnotes are additionally extracted directly from
Moshe Florentin and Abraham Tal, The Samaritan Pentateuch, Open Book Publishers,
2024, https://doi.org/10.11647/OBP.0415 (CC BY-NC 4.0). Original English, Hebrew,
Arabic and Greek are retained. PDF font encodings and visual RTL word order are
converted to Unicode/HTML; source verse labels and printed pages identify each
note. These are annotations on Tal–Florentin’s text, attached to CACCHT verse
contexts rather than asserted word-level correspondences. The translated running
text is not reproduced. The source hash, complete inventory, changes and mapping
exceptions are recorded in tools/samaritan/tal-notes.json.
