import importlib.util
import pathlib
import unittest
import xml.etree.ElementTree as ET

spec=importlib.util.spec_from_file_location('pseud_build',pathlib.Path(__file__).with_name('build.py'))
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)


class SourceSafety(unittest.TestCase):
    def test_witness_selection_keeps_variants_separate(self):
        unit=ET.fromstring('<unit id="u"><reading option="0" mss="A B">ὃς</reading><reading option="1" mss="A">ὁ</reading><reading option="2" mss="C">ἄλλος</reading></unit>')
        alt=[];self.assertEqual(build.read_units([unit],'A',alt),'ὃς');self.assertEqual(alt[0]['text'],'ὁ')
        self.assertEqual(build.read_units([unit],'B'),'ὃς');self.assertEqual(build.read_units([unit],'C'),'ἄλλος')
        self.assertEqual(build.read_units([unit],'missing'),'')

    def test_fragment_and_restoration_flags(self):
        ws=build.spans('λόγος [θεοῦ] καὶ ἀ̣νήρ -τις δέ')
        self.assertEqual([w['uncertain'] for w in ws],[False,True,False,True,True,False])
        self.assertEqual([w['form'] for w in ws],build.words('λόγος [θεοῦ] καὶ ἀ̣νήρ -τις δέ'))

    def test_lettered_verses_do_not_shift_following_numbers(self):
        tree=[];build.insert(tree,['106','17'],'first');build.insert(tree,['106','17'],'<small>[106.17b]</small> second',True)
        build.insert(tree,['106','18'],'third')
        self.assertEqual(tree[105][16],'first<br><small>[106.17b]</small> second');self.assertEqual(tree[105][17],'third')


if __name__=='__main__':unittest.main()
