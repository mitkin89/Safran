"""Source bridge invariants; run with python3 tools/mishnah/test_project_align.py."""
import unittest
import project_align as align


def w(text, flags=()):
    return {'text': text, 'flags': list(flags)}


def t(number, text, suffix=''):
    return {'id': 'S01520.1.1.1.1.' + str(number).zfill(5) + suffix, 't': text}


class SourceBridgeTests(unittest.TestCase):
    def bridge(self, words, tokens):
        return align.bridge({'1:1': {'words': words}}, tokens)

    def test_damaged_word_keeps_all_fragments_and_internal_gap(self):
        token = t(10, 'בתרוד')
        result = self.bridge([w('בתרו'), w('□', ['gap']), w('ד')], [token])
        self.assertEqual(result[token['id']], [['1:1', 0], ['1:1', 1], ['1:1', 2]])

    def test_gap_between_project_words_is_not_silently_absorbed(self):
        a, b = t(10, 'אמר'), t(20, 'משה')
        result = self.bridge([w('אמר'), w('□', ['gap']), w('משה')], [a, b])
        self.assertEqual(result[a['id']], [['1:1', 0]])
        self.assertEqual(result[b['id']], [['1:1', 2]])

    def test_expansion_pseudotoken_references_the_same_source_word(self):
        a, b = t(10, 'ר'), t(10, '--', '-2')
        result = self.bridge([w('ר')], [a, b])
        self.assertEqual(result[a['id']], result[b['id']])

    def test_split_project_word_can_share_a_display_token(self):
        a, b = t(10, 'דבר'), t(20, 'י', '-h2')
        result = self.bridge([w('דברי')], [a, b])
        self.assertEqual(result[a['id']], [['1:1', 0]])
        self.assertEqual(result[b['id']], [['1:1', 0]])

    def test_unmatched_letters_do_not_become_a_complete_word_bridge(self):
        a = t(10, 'אמר')
        self.assertFalse(self.bridge([w('ויאמר')], [a]).get(a['id']))

    def test_repeated_words_keep_their_source_order(self):
        a, b = t(10, 'אמר'), t(20, 'אמר')
        result = self.bridge([w('אמר'), w('אמר')], [a, b])
        self.assertEqual(result[a['id']], [['1:1', 0]])
        self.assertEqual(result[b['id']], [['1:1', 1]])

    def test_other_tractate_and_zero_padded_references_are_supported(self):
        token = {'id': 'S00483.02.08.004.004.00010', 't': 'אמר'}
        result = align.bridge({'4:4': {'words': [w('אמר')]}}, [token])
        self.assertEqual(result[token['id']], [['4:4', 0]])

    def test_repeated_project_ids_keep_independent_source_positions(self):
        from collate_corpus import unique_comparison_ids
        tokens = unique_comparison_ids([t(10, 'אמר'), t(10, 'אמר')])
        self.assertEqual(tokens[1]['sourceId'], tokens[0]['id'])
        self.assertNotEqual(tokens[1]['id'], tokens[0]['id'])
        result = self.bridge([w('אמר'), w('אמר')], tokens)
        self.assertEqual(result[tokens[0]['id']], [['1:1', 0]])
        self.assertEqual(result[tokens[1]['id']], [['1:1', 1]])

    def test_source_comment_cannot_match_an_identical_mishnah_word(self):
        words = [dict(w('משה'), start=0, end=3), dict(w('משה'), start=4, end=7),
                 dict(w('אמר'), start=8, end=11)]
        units = {'1:1': {'words': words, 'annotations': [
            {'tag': 'add', 'attrs': {'type': 'comm'}, 'start': 4, 'end': 7}]}}
        a, b = t(10, 'משה'), t(20, 'אמר')
        result = align.bridge(units, [a, b])
        self.assertEqual(result[a['id']], [['1:1', 0]])
        self.assertEqual(result[b['id']], [['1:1', 2]])
        self.assertEqual(align.source_notes(units)[0]['reading'], [['1:1', 1]])


class GapPositionTests(unittest.TestCase):
    def setUp(self):
        self.units = {'1:1': {'words': [w('אמר'), w('□', ['gap']), w('משה')]}}
        self.stream = [('1:1', i) for i in range(3)]
        self.base_order = {('1:1', i): i for i in range(3)}
        self.links = [{'ref': '1:1', 'base': [['1:1', 0]], 'reading': [['1:1', 0]], 'after': None},
                      {'ref': '1:1', 'base': [['1:1', 2]], 'reading': [['1:1', 2]], 'after': ['1:1', 0]}]

    def position(self):
        align.position_gaps(self.units, self.stream, self.links, self.base_order)

    def test_gap_keeps_a_source_boundary_not_a_lexical_counterpart(self):
        self.position()
        gap = self.links[-1]
        self.assertEqual(gap['kind'], 'source-gap')
        self.assertEqual(gap['base'], [])
        self.assertEqual(gap['reading'], [['1:1', 1]])
        self.assertEqual(gap['after'], ['1:1', 0])
        self.assertEqual(gap['before'], ['1:1', 2])
        self.assertEqual(gap['sourceAnchors'], {'left': ['1:1', 0], 'right': ['1:1', 2]})
        self.assertTrue(gap['uncertain'])
        self.assertFalse(gap['checked'])

    def test_unbridged_surviving_word_is_not_skipped(self):
        self.links.pop()
        self.position()
        self.assertEqual(len(self.links), 1)

    def test_reversed_reference_anchors_leave_gap_open(self):
        self.links[0]['base'], self.links[1]['base'] = self.links[1]['base'], self.links[0]['base']
        self.position()
        self.assertEqual(len(self.links), 2)

    def test_gap_inside_shared_column_stays_in_original_order(self):
        self.links = [{'ref': '1:1', 'base': [['1:1', 0]],
                       'reading': [['1:1', 0], ['1:1', 2]], 'after': None}]
        self.position()
        self.assertEqual(len(self.links), 1)
        self.assertEqual(self.links[0]['reading'], [['1:1', 0], ['1:1', 1], ['1:1', 2]])

    def test_consecutive_gaps_survive_once(self):
        self.units['1:1']['words'].insert(2, w('□', ['gap']))
        self.stream = [('1:1', i) for i in range(4)]
        self.links[1]['reading'] = [['1:1', 3]]
        self.position()
        self.assertEqual(self.links[-1]['reading'], [['1:1', 1], ['1:1', 2]])


class DamageRefinementTests(unittest.TestCase):
    def setUp(self):
        source = [dict(w('מ'), start=0, end=1), dict(w('□', ['gap']), start=1, end=2),
                  dict(w('ראה'), start=2, end=5)]
        self.gap = {'tag': 'gap', 'start': 1, 'end': 2, 'attrs': {'extent': '6', 'unit': 'chars'}}
        self.data = {'witnesses': {'K': {'units': {'1:1': {'words': [w('מפני'), w('היראה')]}}},
                                   'C': {'units': {'1:1': {'words': source, 'annotations': [self.gap]}}}}}
        self.links = [{'ref': '1:1', 'base': [['1:1', 0]], 'reading': [['1:1', i] for i in range(3)],
                       'projectWords': {'K': ['k0'], 'C': ['c0']}},
                      {'ref': '1:1', 'base': [['1:1', 1]], 'reading': [],
                       'projectWords': {'K': ['k1'], 'C': []}}]
        self.base = [('1:1', 0), ('1:1', 1)]

    def refine(self):
        align.refine_damage_boundaries(self.data, 'C', self.links, self.base, {p: i for i, p in enumerate(self.base)})

    def test_matching_fragments_and_physical_gap_allow_a_split(self):
        self.refine()
        self.assertEqual(self.links[0]['reading'], [['1:1', 0]])
        self.assertEqual(self.links[1]['reading'], [['1:1', 2]])
        self.assertEqual(self.links[1]['base'], [['1:1', 1]])
        self.assertFalse(self.links[1]['checked'])
        self.assertEqual(self.data['witnesses']['C']['units']['1:1']['words'][1]['text'], '□')

    def test_incompatible_gap_length_prevents_a_split(self):
        self.gap['attrs']['extent'] = '2'
        self.refine()
        self.assertEqual(len(self.links[0]['reading']), 3)
        self.assertEqual(self.links[1]['reading'], [])

    def test_missing_gap_measurement_prevents_a_split(self):
        self.gap['attrs']['extent'] = 'unknown'
        self.refine()
        self.assertEqual(len(self.links[0]['reading']), 3)

    def test_an_existing_reading_cannot_be_overwritten(self):
        self.links[1]['reading'] = [['1:1', 3]]
        self.refine()
        self.assertEqual(len(self.links[0]['reading']), 3)


if __name__ == '__main__':
    unittest.main()
