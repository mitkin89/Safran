"""Algorithm invariants; run with python3 tools/mishnah/test_align.py."""
import unittest
import align

def w(text,flags=()):return {'text':text,'key':text,'flags':list(flags)}
class AlignmentTests(unittest.TestCase):
    def test_repeated_word_does_not_receive_an_arbitrary_anchor(self):
        self.assertEqual(align.align([w('אמר'),w('אמר')],[w('אמר')]),[])
    def test_split_source_tokens_form_a_group(self):
        links=align.align([w('בראשית')],[w('ברא'),w('שית')])
        self.assertEqual(links,[{'a':[0],'b':[0,1],'boundary':-1,'kind':'joined'}])
    def test_damage_is_not_a_secure_omission(self):
        links=align.align([w('אמר'),w('משה'),w('לישראל')],[w('אמר'),w('□',['gap']),w('לישראל')])
        self.assertTrue(all(l['kind']!='absent' for l in links))
        self.assertTrue(all(1 not in l['b'] for l in links))
    def test_unrelated_replacement_stays_open(self):
        self.assertEqual(align.align([w('שמים')],[w('ארץ')]),[])
    def test_context_anchors_an_insertion(self):
        links=align.align([w('אמר'),w('משה')],[w('אמר'),w('אל'),w('משה')])
        self.assertEqual([l for l in links if l['kind']=='insertion'],[{'a':[],'b':[1],'boundary':0,'kind':'insertion'}])
if __name__=='__main__':unittest.main()
