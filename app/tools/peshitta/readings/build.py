#!/usr/bin/env python3
"""Classified Peshitta readings against the MT for the apparatus (witness „Syr“).

Input: tools/peshitta/readings/<Book>.json – per MT verse the exact MT and Syriac word
forms of the alignment and a list of readings:
  {"he":[MT word numbers], "sy":[Syriac word numbers], "type":…, "vorlage":"unpointed Hebrew",
   "note":"German explanation", "sure":bool, "parallel":"…"}
Types: lesart, deutung, zusatz, auslassung, harmonisierung, technik, doublette, umstellung,
zahl, name, syrfehler. Reconstructed Vorlagen are conjectures, not manuscript evidence.
Output: peshitta-readings/<Book>.js and the book list in peshitta-alignment.js.
"""
import json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[3];HERE=pathlib.Path(__file__).resolve().parent
TYPES={'lesart','deutung','zusatz','auslassung','harmonisierung','technik','doublette','umstellung','zahl','name','syrfehler'}
def js(path,key):
  s=(ROOT/path).read_text();return json.loads(s.split('window.'+key+'=',1)[1].rsplit(';',1)[0]) if '=' in key or True else None
def alignment(book):
  if book in ('Genesis','Exodus','Leviticus','Numbers','Deuteronomy'):
    s=(ROOT/'peshitta-alignment-data.js').read_text();return json.loads(s.split('window.PESHITTA_ALIGNMENT_DATA=',1)[1].rsplit(';',1)[0])['books'][book]
  s=(ROOT/'peshitta-alignment'/(book.replace(' ','_')+'.js')).read_text()
  return json.loads(s.split(']=',1)[1].rsplit(';',1)[0])
out=ROOT/'peshitta-readings';out.mkdir(exist_ok=True);books=[];stats={}
for f in sorted(HERE.glob('*.json')):
  src=json.loads(f.read_text());book=src['book'];A=alignment(book)['verses'];res={};n=0
  for ref,v in src['verses'].items():
    a=A.get(ref)
    if not a or a['he']!=v['he'] or a['sy']!=v['sy']:sys.exit(f'{book} {ref}: alignment changed')
    for r in v['readings']:
      if r['type'] not in TYPES or not (r['he'] or r['sy']):sys.exit(f'{book} {ref}: bad reading')
      if any(i<1 or i>len(a['he']) for i in r['he']) or any(i<1 or i>len(a['sy']) for i in r['sy']):sys.exit(f'{book} {ref}: index')
      if r['vorlage'] and re.search(r'[^א-ת ]',r['vorlage']):sys.exit(f'{book} {ref}: vorlage')
    if v['readings']:res[ref]=[{k:r[k] for k in ('he','sy','type','vorlage','note','sure','parallel')} for r in v['readings']];n+=len(v['readings'])
  (out/(book.replace(' ','_')+'.js')).write_text('// Peschitta-Lesarten gegenüber dem MT (Apparat, Zeuge „Syr“) – erzeugt von tools/peshitta/readings/build.py\nwindow.PESHITTA_READINGS=window.PESHITTA_READINGS||{};window.PESHITTA_READINGS['+json.dumps(book)+']='+json.dumps(res,ensure_ascii=False,separators=(',',':'))+';\n')
  books.append(book);stats[book]=n
p=ROOT/'peshitta-alignment.js';s=p.read_text()
s=re.sub(r'/\*READINGS\*/.*?/\*END\*/','/*READINGS*/'+json.dumps(books,ensure_ascii=False)+'/*END*/',s);p.write_text(s)
print(stats)
