# BHSA in Safran

Open **Search → Grammatik & Syntax → Klauseln & Beziehungen**. For morphology alone, use **Wortmerkmale** in the same tab. Enter Hebrew lemmas in the subject, verb or object fields, or choose **Where does God speak?** to fill in an example. Choose a book to narrow the search. Verb morphology and BHSA options are under **More filters**. Safran includes the compressed BHSA clause index and loads it offline when needed.

- **Text domain** uses the innermost [BHSA text domain](https://etcbc.github.io/bhsa/features/txt/). Choose narrative, narrator’s aside, or direct speech. These filters also work without a lemma.
- **Resumptions only** uses the BHSA clause relation [`Resu`](https://etcbc.github.io/bhsa/features/rela/) and shows a link to the earlier passage in the word card when the parent reference is available.
- **Combined search** with a subject or object requires a MACULA predicate and a single BHSA clause with the same aligned predicate and all explicit matching constituents. The lemma of an implied subject comes from MACULA’s own reference.

The two databases can segment the same text differently. Verses with different consonant sequences, ambiguous word positions, or incompatible clause boundaries are omitted from combined results. The index status shows how many BHSA source verses aligned with the bundled Westminster edition.


The index is derived from [ETCBC BHSA 2021](https://doi.org/10.17026/dans-z6y-skyh) under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). See the [bundled attribution](../bundled/bhsa/ATTRIBUTION.md). To regenerate the index, run `node tools/bhsa/build.js /path/to/bhsa/tf/2021` with the pinned source files listed in the attribution. The generator verifies their hashes.

## Advanced query builder

Enable **Erweiterter Suchaufbau (UND / ODER / NICHT)**. The simple search remains available. Add conditions or nested groups; each group uses AND, OR or NOT. Empty lemma fields mean any annotated instance of the role; comma-separated lemmas are alternatives. All lexical roles can add word features (part of speech, person, gender, number, state, suffix and article, plus stem and tense/form where applicable). Verb conditions always require a verb. The advanced book selector is independent of the simple form; simple-form grammar filters do not affect advanced queries.

Conditions apply to one predicate and its clause, preventing a subject of one verb from satisfying a condition on another verb in the same verse. Roles distinguish explicit subjects, direct objects and MACULA referents. Missing role annotation is unknown, and remains unknown under NOT. A negative subject condition therefore does not infer a subject from missing data.

**Related clause** introduces another context: a BHSA child or parent, or a later clause within the same verse. Parent/child links can cross verse boundaries. The BHSA mother feature may point to a word or phrase; Safran resolves that anchor only if all its slots belong to one unambiguous clause. The original relation code is shown in results; Attr is attributive, not a universal classification of every relative clause. Missing aligned targets cannot satisfy an exclusion.

Example: an AND group containing a verb condition plus a related child clause whose AND group contains relation Attr and a Hifil verb. This searches source-annotated dependency structures. The editor supports up to 40 query nodes and six levels; it is not a complete Logos/Accordance syntax engine. Clause kinds and clause types are available as described below.

Matched predicates and explicit constituents are highlighted. Evidence lists identify clause references, including related verses. Existing alignment exclusions still apply; zero matches are not proof that a construction is absent from the source corpus.

### Role morphology and word position

Expand **Wortmerkmale am Kernwort** on a subject, object, verb or referent condition. For example, combine a feminine plural subject with a Hifil verb. The lemma and morphology must match the same head token. A modifier or possessor inside the constituent cannot satisfy the head condition. Safran identifies a head token only when the MACULA head lemma maps uniquely to a source-verified OSHB token in that constituent. Ambiguous repeated head lemmas and missing analyses remain unknown, including under NOT.

Subject, verb and object conditions can add **Position gegenüber** another role, **davor/danach**, and a maximum count of intervening OSHB words (0 = adjacent, blank = unlimited, maximum 200). Prefixes within a source word do not count separately. Positions compare unambiguously identified heads in the same verse; they do not flatten phrases or count across verses. A referent’s morphology is read at its source antecedent, but antecedents do not receive positional constraints against the current predicate. Relative-role position checks range over that role’s source heads, without binding a named variable to a different query condition.

### Root and word-family conditions

In an advanced lexical condition, choose **Suchbasis → Wortfamilie / Wurzel**, enter the Hebrew root, and select the attested family. The list distinguishes Hebrew and Aramaic and shows Strong identifiers of member lemmas. A single matching family is selected automatically; homonymous families require an explicit choice. Use OR groups to combine multiple families.

Matching uses the annotated OSHB lemma ID and the explicit Open Scriptures HebrewLexicon family assignments already used by Safran’s word cards. It never infers a family from matching consonants. Verb, subject, object and referent conditions use the family of their own source head word, including nominal derivatives. Morphological and positional conditions must match that same head. Missing root assignments stay unknown under NOT; unrecognized family IDs are rejected. Roots do not imply identical meanings across derivatives.

### Named saved queries

Under **Grammatik & Syntax → Gespeicherte Suchmuster**, name the current query and choose **Speichern**. The snapshot includes the selected mode (word features, simple clause search or advanced tree), book scope, morphology, root-family IDs, Boolean groups, clause links and positional constraints. Select a saved query and choose **Laden** to restore the editable form. Loading does not execute a search. **Aktualisieren** replaces the selected snapshot; **Neu** allows saving the current form under a new name; **Löschen** removes the selected saved query.

Templates are stored locally and survive app restarts. Use **Auswahl exportieren** or **Alle exportieren** for a portable versioned JSON file, and **Importieren** to merge such a file. Imports are validated before writing; identical templates are skipped, conflicting names receive a numerical suffix, and existing queries are not overwritten. Re-importing the same file also recognizes templates renamed during a previous import. Unsupported formats and over-limit imports leave the saved collection unchanged. The collection supports up to 200 templates and a bounded JSON size.

A missing local book or unavailable root-family ID blocks loading with a message instead of silently broadening the query. No text editions or search results are embedded in the file. These templates have their own JSON export; they are not currently included in the notes backup.

### Clause kinds and types

Add **Klauselart (BHSA)** or **Klauseltyp (BHSA)** in the advanced builder. Kind distinguishes VC (verbal), NC (nominal), and WP (without predication). Type offers all 42 values found on clause nodes in the pinned BHSA 2021 dataset, including nominal, adjective, participle, infinitive, ellipsis and verb-pattern types. Verbal-pattern codes remain visible as source codes. Definitions: [kind](https://etcbc.github.io/bhsa/features/kind/) and [typ](https://etcbc.github.io/bhsa/features/typ/).

The bundled index derives these values from checksum-verified source files in the same revision as the existing clause links. Phrase and phrase-atom types are not imported as clause types. A pure kind/type query highlights the matched clause’s source words; nominal clauses can be returned without inventing a verb. A nominal BHSA classification may still contain OSHB verb forms such as nominally used participles: these are separate annotations and are shown as such. These classifications do not provide a general main/subordinate/conditional-clause taxonomy. Unaligned verses and ambiguous source positions remain excluded; unavailable features remain unknown under NOT.

### Match explanations

Expand **Warum dieser Treffer?** under a syntax result. The advanced search explains AND/OR/NOT, clause links, lexical and root-family conditions, morphology, and measured word gaps. It shows the relevant source words, verse references and clause excerpts. OR shows the successful alternatives; NOT shows its failed child condition. A missing or ambiguous head position is labeled as a constituent rather than an exact head. Related clauses display their own source references and excerpts.

Simple clause searches also show their selected conditions and corresponding source groups or predicate words. Explanations are limited to five primary contexts per verse, three examples of each matching related-clause context, and a bounded explanation tree. Truncation is explicitly shown; match computation and total verse counts are unchanged by these display limits. Opening the explanation does not navigate away from the search.
