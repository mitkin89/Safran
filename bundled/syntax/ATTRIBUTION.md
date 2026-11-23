# Tanakh clause annotations

Source: MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/. The [dataset and Westminster syntax source](https://github.com/Clear-Bible/macula-hebrew/blob/47db250bd55d0d8577f2a94fba114ef16c35b23c/LICENSE.md) are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Safran extracts clauses, word-group roles and annotated subject referents from the 39 books in WLC/lowfat at commit `47db250bd55d0d8577f2a94fba114ef16c35b23c`. Locations are aligned to the bundled OSHB Westminster edition by verse and consonant sequence. The display and search verify the verse signature before using positions. Incompatible passages and referents without an aligned target in the book are omitted.

The clause search matches the verb and its own subject or direct object. Searches by lemma use the lexical heads; construct dependents and relative clauses are excluded from head matching. With resolved subjects enabled, MACULA's `subjref` and `participantref` can contribute the lemma at the annotated referent. The index does not infer missing links or identify persons from name spellings.

To regenerate the indexes, run `python tools/tanakh-syntax/build.py /path/to/macula-hebrew/WLC/lowfat` with the pinned source checkout. The builder prints the aligned verse and predicate counts per book.
