import unittest
from projection import project
class ProjectionTests(unittest.TestCase):
 def test_variant_paths_and_exact_whole_words(self):
  ts=[('1:1',0,'אב'),('1:1',1,'הוצא'),('1:1',2,'היצא'),('1:2',0,'ג')]
  proof={'variants':[[1,'ketiv','k'],[2,'qere','q']],'sourceVerses':{'1:1':[0,4]}}
  source=[('1:1',[(1,'אב'),(2,'היצא'),(3,'ג')])]
  mapping,verified=project(source,ts,proof,'qere')
  self.assertEqual(mapping[2],[['1:1',[2]]]);self.assertEqual(mapping[3],[['1:2',[0]]]);self.assertEqual(verified,{'1:1'})
  mapping,verified=project([('1:1',[(1,'אב'),(2,'אחר'),(3,'ג')])],ts,proof,'qere')
  self.assertFalse(mapping);self.assertFalse(verified)
 def test_partial_source_word_cannot_claim_a_whole_reading_word(self):
  mapping,verified=project([('1:1',[(1,'א'),(2,'ב')])],[('1:1',0,'אב')],{'variants':[],'sourceVerses':{'1:1':[0,1]}})
  self.assertEqual(verified,{'1:1'});self.assertFalse(mapping)
if __name__=='__main__':unittest.main()
