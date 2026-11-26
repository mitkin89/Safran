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


if __name__ == '__main__':
    unittest.main()
