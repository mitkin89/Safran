# English Maccabees passage-boundary review

Reviewed 2026-11-25. These maps describe passage correspondence, not equivalence of every word. Runtime data contain only boundaries and fingerprints; attributed English export fixtures are retained for regression tests.

## Sources and scope

- `english-i-groups.json`: merged English from the Sefaria native Maccabees I response (Sefaria API, `The Book of Maccabees I`), against native German Kautzsch indices (family 0), all 16 chapters.
- `english-ii-groups.json`: Sefaria Community Translation, CC0 (Sefaria API, `The Book of Maccabees II`), against native German Kautzsch indices (family 0), all 15 chapters.
- `english-kahana-i-groups.json`: Sefaria Community Translation, CC0 (Sefaria API, `The Book of Maccabees I (Kahana Translation)`), against Kahana Hebrew indices (family 2), all 16 chapters. Kahana Hebrew's API license is unknown; no source text is copied into this repository by this review.

Every available English/native-base boundary was reviewed by content, using beginnings/endings and reading the full local passage where boundaries appeared different. Equal chapter counts alone were not used as evidence. The maps retain original indices and empty slots. Coverage validation expands both axes and requires each actual English slot and every base slot exactly once in order.

## Maccabees I

All 16 chapters have English. Chapter lengths: 62, 73, 60, 59, 65, 67, 47, 37, 75, 96, 82, 55, 56, 52, 43, 25.

Most native English and German passage boundaries correspond. Three regions require coarser groups:

- 1:47–48: English already includes the altar/grove/idol and unclean-sacrifice commands in 47; German puts these in 48. Both rejoin before 49.
- 7:15–16: the introduction of the scriptural quotation is at the end of German 15 and beginning of English 16.
- 15:21–22: Rhodes and Aradus occur in English 21 but German 22; the city lists also have different order and wording. Grouping the two indices preserves the complete list without implying word-for-word identity.

The German source's 13:19 slot is empty while English 13:19 is present. Preserve its native index; do not shift English 20 onward. The separate Hebrew bridge's larger 13:18–21 grouping also spans this source gap.

Lexical, spelling and historical-detail differences inside corresponding passages are not corrected by the alignment.

## Maccabees II

English is incomplete: chapter 1 has 41 slots, chapter 2 has 35, chapter 7 has only 1–23, and chapter 10 has only 1–11. Chapters 3–6, 8–9 and 11–15 have no English text in the response. Missing content is represented by one empty-English group per base slot, so an unselected or unavailable translation cannot merge an entire chapter.

- 1:14–15: the Persian setting appears in English 14, but German introduces it in 15; these form a common passage group.
- 10:11: available English ends after the annual-festival decree. German 11 also includes the concluding sentence about Antiochus's death. The shared passage is aligned at 11, with this partial English omission explicitly recorded here; no English continuation is fabricated.
- German 4:24 is an empty native slot. This English response has no chapter 4 and cannot supply the missing German wording.
- The known displaced prayer continuation in German 8:26 cannot be checked against this English response, because English chapter 8 is absent.

Several Community Translation lines explicitly mark uncertain translations; matching passage indices do not endorse those renderings. For example, personal names or dates may differ from Kautzsch. This review does not silently correct them.

## Kahana Maccabees I

Only English 1:1–14 exists. Each of these fourteen complete English entries was checked against the corresponding full Kahana Hebrew entry. Their passage boundaries correspond one to one. Hebrew 1:15 onward and chapters 2–16 have no corresponding English in the response. Maps explicitly retain every such base slot with an empty English axis.

The English text contains rough or incorrect renderings (including literal future-tense renderings of Hebrew narrative forms); passage correspondence does not certify translation quality.

## Loaded export verification

The runtime fingerprints use the actual `English/merged.json` exports from
`https://storage.googleapis.com/sefaria-export/json/Second%20Temple/Apocrypha/`,
with the native book title as the next path component. II and Kahana English
match the API text arrays exactly. I differs only in capitalization of “He”
at 3:5; this does not change its passage boundary. Fixtures preserve the export
wording, source version list and attribution (I: CC-BY-SA; II/Kahana: CC0).
