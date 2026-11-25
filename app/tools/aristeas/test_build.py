"""Safety tests for source matching; run python3 -I tools/aristeas/test_build.py."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('aristeas_build', pathlib.Path(__file__).with_name('build.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Matching(unittest.TestCase):
    def match(self, base, forms):
        return build.align(base.split(), [dict(form=f, lemma='lemma', tag='n-s---mn-') for f in forms.split()])[0]

    def test_full_and_unicode(self):
        self.assertTrue(all(self.match('Ἀξιολόγου διηγήσεως', 'ἀξιολόγου διηγήσεως')))
        self.assertEqual(build.norm('ἀξιολόγου'), build.norm('ἀξιολόγου'))
        self.assertNotEqual(build.norm('ὅρος'), build.norm('ὄρος'))

    def test_unmatched_word_and_short_runs(self):
        out = self.match('καὶ τὸν νόμον ὠφέλεισαν καὶ τὴν πόλιν', 'καὶ τὸν νόμον ὠφέλειαν καὶ τὴν πόλιν')
        self.assertTrue(all(out[:3]) and all(out[4:]));self.assertIsNone(out[3])
        self.assertEqual(self.match('ὠφέλεισαν καὶ τὸν', 'ὠφέλειαν καὶ τὸν'), [None, None, None])

    def test_no_guess_for_combined_or_repeated_words(self):
        out = self.match('οὐδὲ καὶ τὸν νόμον', 'οὐ δὲ καὶ τὸν νόμον')
        self.assertIsNone(out[0]);self.assertTrue(all(out[1:]))
        out = self.match('καὶ τὸν νόμον λάθος καὶ τὸν νόμον', 'καὶ τὸν νόμον ἄλλος')
        self.assertTrue(all(r is None for r in out))
        self.assertEqual(self.match('καὶ τὸν νόμον', ''), [None] * 3)


if __name__ == '__main__':
    unittest.main()
