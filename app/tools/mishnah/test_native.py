"""Native implementation must preserve the Python algorithm, including ties."""
import unittest,random,subprocess,json
from pathlib import Path
import align,native
HERE=Path(__file__).resolve().parent
class NativeTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):subprocess.run(['g++','-O2','-std=c++17',str(HERE/'align_native.cpp'),'-o',str(native.BIN)],check=True)
 def test_generated_consensus_cases(self):
  rng=random.Random(127)
  def token():
   text=rng.choice(['אבגד','אבגה','אב','גד','אבגדאב','גדאב','□'])
   return {'text':text,'key':rng.choice([text,'אבגד']) if text!='□' else '', 'flags':['unclear'] if rng.randrange(20)==0 else []}
  for case in range(220):
   a=[token() for _ in range(rng.randrange(15))];b=[token() for _ in range(rng.randrange(15))]
   self.assertEqual(align.align(a,b),native.align(a,b),case)
 def test_entire_berakhot_golden_alignment(self):
  text=(HERE.parents[1]/'mishnah-textcrit-data.js').read_text();d=json.loads(text.split('window.MISHNAH_TEXTCRIT=',1)[1].strip().removesuffix(';'))
  reviews=json.loads((HERE/'alignment-review.json').read_text())
  self.assertEqual(align.build(d,reviews,aligner=native.align),d['interlinear'])
if __name__=='__main__':unittest.main()
