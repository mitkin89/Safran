# Berakhot: grammar and dictionary adjudication

Review date: 2026-11-26. Rules, lexical facts and occurrence readings are
separate kinds of evidence. Ma’agarim is an additional witness, not the sole
authority. The original 276 Accordance differences were not 276 proven errors.
The current strict comparison has 268 differences and 1,885 positions with a
compatible candidate. These are compatibility counts, not accuracy figures.

The separate `convention-assessment.json` accounts for 47 strict differences
through narrow, documented class/headword conventions. At the intermediate
273-difference stage it left 226 positions for the subsequent complete review.
That review is now in `full-review-226.json` and `full-review-226.md`: all 226
positions were checked, with 167 conventions, 42 analyses retained with support,
seven corrected positions and ten unresolved positions. Five corrections now
pass strict comparison. The remaining strict differences are assessed outcomes,
not automatically unexamined problems. Missing features were not inferred.

## Decisions supported by the local sources

| Source positions | Evidence | Decision |
| --- | --- | --- |
| 3:1 token 9; 3:3 token 8, התפילין | Local Jastrow, entry 24302, head תְּפִלֵּי / תְּפִלִּין, explicitly `f. pl.`. Pérez Fernández 10.5A–C, pp.63–64, distinguishes plural endings from grammatical gender. | Correct the previous masculine plural candidate to feminine plural. Keep the source spelling and lemma תפילין. This does not settle the reference's different citation spelling תפלין. |
| 4:6 tokens 5,7, בקרון / באסדא | Local Krauss, Lehnwörter Teil II, entries 5947 (קרון I) and 1048 (אסדא), explicitly feminine; the latter directly cites Mishnah Berakhot 4:6. | Correct masculine/unspecified gender to feminine singular. Preserve the source's article-less בְ and its lemma spelling. |
| 6:1 token 39; 9:5 token 122, לחם | Jastrow entry 5467 and Levy entry 9327 agree on masculine לֶחֶם, food/bread. | Replace common-gender candidate with masculine. Keep the pointed noun separate from the homonymous verbs and Aramaic entries. |
| 2:7 tokens 6,14, תנחומים / תנחומין | Levy entry 19255 gives תנחום with both plurals and cites the Tabi passage; Pérez Fernández 10.5A explains ־ים/־ין alternation. | Use תנחום consistently as citation lemma while keeping both original plural wordforms. This resolves the token-14 comparison but creates a documented citation-lemma difference at token 6, where the reference uses the plural lemma. |
| 4:4 token 9, תחנונים | Jastrow entry 745 lists תחנון / תחנונים together. | Use singular citation lemma תחנון; the occurrence remains masculine plural. Editorial short glosses were added for the two new citation lemmas. |
| 3:1 token 3, מוטל; 3:5 token 41, שיטיל | Ma’agarim identifies טול, respectively Hofal participle and Hifil future. | Retain טול; the Accordance root נטל is not forced into the candidate. Only the supplied stem/form features are externally supported. |
| 7:4 token 6, לחלק | Ma’agarim: חלק, Nifal infinitive. | Retain the source-bound Nifal infinitive rather than adopting Accordance's Piʿel. |
| 3:5 token 15; 4:5 tokens 8,15, יכול | Ma’agarim: יכל, Qal participle. | Retain the participial candidate. The reference's bare gender/number does not disprove its verbal analysis. |
| 5:5 token 15, כמותו | Ma’agarim explicitly treats כמות as a preposition. | Retain the prepositional analysis; do not substitute an unrelated death noun. |
| 5:3 token 26, באותה; 8:8 token 9, אותו | Segal §75, p.42 (PDF85), explicitly allows את, including suffixed forms, as a demonstrative. Ma’agarim indexes both under את. | Retain the contextually demonstrative function. A historical/dictionary headword את is not evidence that these occurrences are verbal objects. Record the different segmentation policy. |
| 2:3 token 15, דקדק; 3:4 token 3, מהרהר; 9:5 token 95, משקלקלו | Segal §195, p.88, identifies reduplicated Pilpel. Ma’agarim labels these with its broader Piʿel category. | Retain Pilpel in Safran's finer stem inventory; classify the external difference as a stem-system convention. |

## Cases that need qualified conclusions

- **פת**: Jastrow entry 18202 gives common gender; Levy entry 15412 gives
  masculine; Segal §370, p.179 (PDF222), lists it among feminine nouns and
  cites Berakhot 6:7. Keep the source-compatible feminine candidate for now;
  record the lexical disagreement instead of treating one dictionary label as
  an occurrence-level verdict.
- **כוס**: Jastrow entry 8139 gives common gender. Pérez Fernández 10.9,
  pp.64–65 (PDF84–85), discusses masculine use in RH despite feminine use in BH.
  Safran's common-gender lexical candidate is defensible; selecting an
  occurrence gender requires agreement evidence. Avoid choosing the unrelated
  masculine thorn homonym (Jastrow 8140).
- **שגרה** (4:3 token 20; 5:5 token 41): source שָׁגְרָה and Ma’agarim's
  Qal past classification support Safran's perfect candidate. Levy entry 17891
  quotes the related prayer formula at Bavli Berakhot 34b and Tosefta with
  שְׁגוּרָה, a passive participle. This is evidence for a competing reading,
  not permission to silently replace Kaufmann/Be’eri's vowels. The textual
  question remains open.
- **חסרון**: Levy entry 6681 gives masculine singular, supporting the lexical
  gender. It does not independently determine whether וחסרונן at Berakhot
  6:8 is singular construct plus suffix. The form and context must be checked
  separately from the dictionary's citation form.
- **עצם**: Levy entry 14029 includes the reflexive/self sense under masculine
  עצם. This supports retaining Safran's masculine lexical candidate in לעצמו
  and לעצמן; the reference's feminine classification remains documented.
- **פנים**: Levy entry 14796 explicitly allows masculine plural and feminine
  usage. Segal §367, p.178, also lists feminine body-part usage. This does not
  justify forcing a particular occurrence gender in lexicalized לפני. The
  existing candidate is retained, with the broader lexical evidence noted.
- **אות**: Jastrow entry 18598 gives common gender, whereas Segal §370,
  p.179, includes אות among feminine nouns. Retain the feminine candidate in
  באותותיה rather than replacing it on the strength of a single broad label.
- **סרבן**: Levy entry 13322 explicitly includes adjectival use; Jastrow
  entry 8599 directly cites Berakhot 5:3 for the person who declines an
  invitation. Safran's adjective and the reference's substantivized noun are
  alternative classification levels, not a demonstrated inflection error.
- **חסידים / החולין**: Jastrow 9536 directly cites the pious men of Berakhot
  5:1; entry 8746 gives sick/patient with plural חולים/חולין. These confirm
  lexical senses, but do not alone settle adjective versus nominalized
  participle/noun. No extra candidate is manufactured merely to match a tag.
- **נפש / עם**: Levy entries 12206 and 13842 give feminine נפש and masculine
  עם respectively. These support retaining Safran's lexical genders while
  recording the reference's broader common-gender choices.
- **זקנה** at 9:5: Ma’agarim labels the word only as a quotation, not as a
  finite verb or noun. It therefore cannot settle the disagreement. The
  pointed source and feminine subject support the existing verb candidate.

## Lookup discipline

Local dictionaries inspected: **Jastrow** (`d895bc1c727b`) and **Levy,
Wörterbuch Bd.1–4** (`e8d290b744f6`), in `app/bundled/dict/manifest.json`.
Article numbers above are zero-based indices in those bundled files. They
identify the reviewed entries; abbreviations and homonyms must not be merged
by a consonants-only lookup. The local **Krauss, Lehnwörter** dictionary is the
source consulted for קרון and אסדא; no exact headword for אסטנס/איסטניס was
found in that lookup. Gesenius/BDB are useful for
biblical readings but do not replace the rabbinic lexicons.

No dictionary article or Ma’agarim headword, by itself, promotes a full token
analysis to reviewed status. This pass records selected decisions; it does not
claim that all remaining differences or all 2,159 tokens have been adjudicated.
