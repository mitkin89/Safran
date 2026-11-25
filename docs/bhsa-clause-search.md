# BHSA in Safran

Open **Search → Grammatik & Syntax → Klauseln & Beziehungen**. For morphology alone, use **Wortmerkmale** in the same tab. Enter Hebrew lemmas in the subject, verb or object fields, or choose **Where does God speak?** to fill in an example. Choose a book to narrow the search. Verb morphology and BHSA options are under **More filters**. Safran includes the compressed BHSA clause index and loads it offline when needed.

- **Text domain** uses the innermost [BHSA text domain](https://etcbc.github.io/bhsa/features/txt/). Choose narrative, narrator’s aside, or direct speech. These filters also work without a lemma.
- **Resumptions only** uses the BHSA clause relation [`Resu`](https://etcbc.github.io/bhsa/features/rela/) and shows a link to the earlier passage in the word card when the parent reference is available.
- **Combined search** with a subject or object requires a MACULA predicate and a single BHSA clause with the same aligned predicate and all explicit matching constituents. The lemma of an implied subject comes from MACULA’s own reference.

The two databases can segment the same text differently. Verses with different consonant sequences, ambiguous word positions, or incompatible clause boundaries are omitted from combined results. The index status shows how many BHSA source verses aligned with the bundled Westminster edition.


The index is derived from [ETCBC BHSA 2021](https://doi.org/10.17026/dans-z6y-skyh) under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). See the [bundled attribution](../app/bundled/bhsa/ATTRIBUTION.md). To regenerate the index, run `node tools/bhsa/build.js /path/to/bhsa/tf/2021` with the pinned source files listed in the attribution. The generator verifies their hashes.

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

### Graphical query builder

In the advanced builder, switch between **Formular** and **Grafik**. Both edit the same query, so saved patterns, execution and explanations work in either view. Select a diagram node to edit its lexical, morphological or positional conditions in the inspector below. Group nodes add conditions, groups and linked clauses; the inspector can wrap the selected node in AND, OR or NOT, remove it, or reorder siblings. Reordering diagram siblings does not impose a word-order condition: use **Position gegenüber** for that.

Lines represent the query’s Boolean nesting and clause relationships, not a dependency analysis of a verse. The tree lays out automatically; zoom, fit and scroll accommodate larger queries. Nodes support keyboard focus, arrow-key navigation and Enter/Space to edit. Query limits remain 40 nodes, six levels and twelve children per group. Switching views does not execute a search or change the saved-query format.

### Additional constituents and word bindings

The advanced builder now also exposes **Präpositionalgruppe**, **Adverbial (MACULA adv)**, **Zweites Objekt (MACULA o2)** and **Attribut / Genitiv**. All support lemma or attested root-family conditions, morphology and head-relative positions. A prepositional-phrase condition can additionally require its own **Präposition**. This lets a query specify, for example, a phrase headed by Moses introduced by *ל*; it does not establish that the phrase is semantically a recipient. The pinned MACULA source does not have a separate `io` class. `o2` is a second object, sometimes an object complement, and is deliberately not renamed “indirect object”. Likewise, prepositional phrases are not all classified as adverbials.

Add **Dasselbe Wort** to bind the enclosed Boolean conditions to one lexical head of the chosen role. An AND of two ordinary role conditions may match two different heads, whereas all conditions inside a binding must succeed on one identical, text-verified token. This same-word binding is local to its subtree. Use the separate Wortvariable node described below for cross-clause references. Inside that binding, **Attribut dieses Wortes** checks an attribute attached to that particular head. The attribute has its own Boolean subtree and may be searched by lemma, family and morphology. For example, a subject binding with lemma `רוח` and an attached attribute `אלהים` finds Genesis 1:2 without accepting the other genitive `תהום` in the verse.

Attribute extraction uses MACULA `NpAdjp` and `NPofNP` structures: the modifier or genitive dependent is indexed separately from the modified head. Relative-clause modifiers are still searched through explicit clause relationships, not relabeled as lexical attributes. Extra records include exact source heads, group spans, introducing prepositions and attribute governors. They are independently checked against the current text and BHSA clause spans before matching. Unavailable heads, incompatible spans, source-segment/OSHB lemma mismatches and ambiguous anchors remain unknown under NOT. The established subject/object records are unchanged. These query roles do not add new annotations to the word-card role display.

### Multi-level clause paths

Choose **Übergeordnete Klauselkette** or **Abhängige Klauselkette** on a linked-clause node, then set **Mindestens Klauselstufen** and **Höchstens Klauselstufen** (1–12, default 1–5). The child query must match a clause in that depth range. The path follows the pinned BHSA mother/child graph and is independent of the word order or number of intervening verses. Direct parent/child and same-verse later-clause options remain available. The explanation includes the actual depth of a matching endpoint. Queries do not impose additional conditions on every intermediate clause; explicit nested relationship nodes can express those conditions.

Traversal prevents cycles, deduplicates clause IDs and bounds expansion to 4,096 source nodes per path evaluation. Missing or unaligned links and an exhausted expansion budget cannot establish a negative match. A positive endpoint with verified source links can still match when other branches are unavailable. Saved patterns and JSON exports preserve the new roles, scoped bindings, preposition requirements and depth bounds; older patterns retain their behavior.

### Source sentence trees

Every displayed syntax result now offers **Satzbaum der Quelle**. This is MACULA's original sentence/constituent hierarchy, retained in compressed, revision-pinned files for all 39 Tanakh books. It is not reconstructed from the query tree or inferred from BHSA clause types. Role labels, phrase classes and source rule codes remain visible. The same reading-word positions highlighted in the result are highlighted in the source tree. Multiple source segments can map to one reading word; unmapped segments are shown as source text with an explicit notice and never highlighted as verified. Modified editions cannot reuse stale alignment positions. The display is bounded to three sentence trees and 1,600 nodes per result, with truncation notices. Opening it keeps the result list open.

### Named variables across clauses

Add **Wortvariable**, choose an **Ausgangsrolle**, and give it a name such as `actor`. The node selects one source head and makes that variable available in its entire child subtree, including explicit linked-clause nodes. At a lexical condition, enter the name in **Gleich Variable (optional)**. **Identisches Textwort** requires exactly the same reading-token reference and position. **Gleicher Referent (MACULA)** follows the pinned `participantref` chains and requires an unambiguous canonical source segment; it never treats equal spellings or lemma IDs as equal persons.

For example, bind `actor` to the subject `חנוך`, then require a **Spätere Klausel im selben Vers** whose object has the same MACULA referent. This finds Genesis 5:24, connecting Enoch to the pronominal object in “God took him”. Variables are lexically scoped: a reference outside its binding or a shadowed name is rejected. Names start with a Latin letter and allow up to 24 letters, digits and underscores. Renaming a variable updates its bound references. Local **Dasselbe Wort** groups remain available independently.

Canonical source IDs distinguish source segments even when they share an OSHB token. An absent chain cannot prove two different mentions refer to different entities: unequal unlinked roots remain unknown under negation. Negative identity evidence requires two explicit, different source reference chains. Ambiguous, cyclic, missing or unaligned reference targets remain unknown. This is annotation identity, not automatic entity resolution across books.

### Semantic working annotations

The role selector includes **Empfänger (Arbeitszuordnung)**, **Nutznießer (Arbeitszuordnung)** and **Ort (Arbeitszuordnung)**. The pinned MACULA source does not provide a comprehensive recipient/beneficiary/location taxonomy: its numbered frame arguments do not justify automatically assigning those meanings. Safran therefore includes a deliberately small, separate starting set of 20 individual editorial working assignments, each with the exact verse signature, predicate anchor, selected token positions, full source quotation and contextual rationale in `bundled/syntax-semantic.json`.

These assignments are explicitly marked **not independently reviewed**, in both the editor and result explanations. They are not presented as MACULA annotations. They support lexical, family, morphological, positional and variable conditions at the selected reading word. They provide positive evidence only: no role is inferred from a preposition, and an unlisted role or a negative query remains unknown rather than claiming exhaustive annotation. Current examples include Genesis 12:7 (the descendants as recipient), Genesis 30:30 (Jacob's household as beneficiary), and Genesis 1:17 (the firmament as location). Expanding reliable semantic coverage still requires additional documented review.

### Coverage and additional word heads

**Datenabdeckung dieser Suche** is displayed even for zero results and in the inline reading-search tab. Per book it separates original/aligned MACULA verse counts, verses actually examined, missing text alignment, missing clause contexts, evaluated predicate/clause contexts, and whole-query unknown results. A context is not a distinct verse. A false AND branch can determine the query's result despite another branch being unknown; the unknown counter is explicitly not a count of every missing field. Cancelled/global-limit searches report partial coverage; a per-book display cap alone does not stop counting. Unreadable books are listed separately. The simple search reports verse-level coverage and leaves advanced context counters unavailable.

The index now retains independently aligned nominal-clause role groups. They are joined to BHSA only when the entire source clause span, including every verse part, matches exactly. Nominal subjects and additional constituents can thus be searched without inventing a verb. Existing subject/object pair records remain unchanged.

The additional source-head records also preserve segment morphology and source IDs. When a source head has the same lexical identity as the OSHB main word, its original whole-word morphology (including articles and suffixes) remains authoritative. When a pronominal head is a separate suffix segment, syntax uses that source segment's features while highlighting the complete reading token. Source personal suffixes are recognized as pronominal heads with suffix features. Missing head mappings and uncertain segment/reference chains remain excluded from positive conclusions and cannot satisfy NOT.

### Audited variant and verse-boundary alignment

The [alignment audit](syntax-alignment-audit.md) documents the 1,142 previously excluded source references and the 1,125 recovered reading-text verses. Current joint text/clause availability is 23,196 of 23,206 reading-text verses. Original source counts are 23,213 references and are shown separately from reading-text verse counts.

An original OSHB source-marker proof identifies Ketiv and Qere tokens without modifying the bundled text. MACULA follows the Qere path; BHSA follows the Ketiv path. These paths must match exactly, globally or at the original proven source-verse boundary. Changed target text invalidates its proof. Different verse divisions are projected through exact character offsets; partial MACULA source words cannot claim whole reading words, and partial BHSA slot coverage cannot claim a complete word's clause membership. Unmatched source consonants remain excluded.

The coverage panel explains the distinct readings and lists the ten remaining BHSA differences for the selected books. Result explanations show reading provenance where variants occur. Source trees retain original sentence IDs and additionally show differing source numbering at their words. Word-distance constraints count the selected reading path and exclude the other alternative. Combined MACULA/BHSA role conditions can remain unknown where their variant word positions differ: no clause membership is copied across readings.
## Clickable examples

The right sidebar in **Grammar & Syntax → Clauses & relations** offers seven simple examples. With **Advanced query builder** enabled, it switches to twelve examples covering AND/OR/NOT, word positions, dependent attributes, linked clauses and referent variables. Each card explains the conditions and names a verified Genesis passage. Clicking fills the fields/tree and resets the applicable filters and book selector to all books, without starting a search. The query remains editable; press **Search** when ready. Examples use the same validated loading path as saved patterns, but select a new save slot so an existing saved pattern is not overwritten.

The sidebar stays beside long forms on wide windows and moves above the form on narrow windows or the split reading view. Its example list can be collapsed; on initially narrow windows it starts collapsed. Examples are in `syntax-examples.js`; `tests/syntax-examples.test.js` checks every advertised passage against the actual Westminster/MACULA/BHSA data. Run `SAFRAN_SMOKE_EXAMPLES=1 npm run test:smoke` for the production-renderer flow. Optional `SAFRAN_EXAMPLES_QA_DIR` retains screenshots from the temporary test profile.

Complex examples appear first. Three simple presets combine subject/verb/object with eight finite-verb features, narrative domain and referent-aware subjects. Six advanced presets combine clause kind/type/domain, noun and verb morphology, article/suffix constraints, word distance, dependent genitives, clause depth, cross-clause referent variables and root-family/NOT conditions. Each fills only applicable features: finite verbs have person, participles and nouns have state. Every advertised passage is checked through the production search IPC and real worker.
