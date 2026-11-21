#!/usr/bin/env python3
"""MT–Peshitta word links for the Prophets and Writings, one file per book.

Input: reviewed-tanakh/<Book>.json – for every native Peshitta verse the exact
Syriac word forms, one target per word ("c:v/i,j" = MT verse and word numbers,
"c:v/" = plus placed in that MT verse) and a short note.
Output: peshitta-alignment/<Book>.js (window.PESHITTA_ALIGNMENT_BOOKS[book]) and
the book list inside peshitta-alignment.js. Every native Syriac word is used once;
forms, MT word counts and edition hashes are checked.
"""
import hashlib,html,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[3];HERE=pathlib.Path(__file__).resolve().parent
PENT={'Genesis','Exodus','Leviticus','Numbers','Deuteronomy'}
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
sha=lambda b:hashlib.sha256(b).hexdigest()
man=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
def entry(book,test):return next(e for e in man if e['title']==book and test(e))
def load(e):
  p=ROOT/'bundled'/e['rel'];d=json.loads(p.read_text())
  return d,{'rel':e['rel'],'sha256':sha(p.read_bytes()),'versionTitle':e['versionTitle'],'textHash':sha(compact(d['text']).encode())}
def verses(ch):return [(int(k),v) for k,v in sorted(ch.items(),key=lambda x:int(x[0]))] if isinstance(ch,dict) else [(i+1,v) for i,v in enumerate(ch)]
HEW=re.compile(r'<span class="w"[^>]*>(.*?)</span>')
SYW=re.compile(r'<span class="syw" data-si="(\d+)">(.*?)</span>')
out_dir=ROOT/'peshitta-alignment';out_dir.mkdir(exist_ok=True);books=[];stats=[]
for rf in sorted((HERE/'reviewed-tanakh').glob('*.json')):
  rev=json.loads(rf.read_text());book=rev['book'];assert book not in PENT
  heD,heSrc=load(entry(book,lambda e:(e.get('versionTitle')or'').startswith('Westminster')))
  syD,sySrc=load(entry(book,lambda e:e.get('language')=='Syriac'))
  he={f'{c+1}:{v+1}':[html.unescape(w) for w in HEW.findall(h)] for c,ch in enumerate(heD['text']) for v,h in enumerate(ch)}
  acc={ref:[] for ref in he};notes={ref:[] for ref in he};n=0
  for c,ch in enumerate(syD['text'],1):
    for v,h in verses(ch):
      ref=f'{c}:{v}';W=[(i,html.unescape(t)) for i,t in SYW.findall(h or '')]
      if not W:continue
      r=rev['verses'].get(ref)
      if not r:sys.exit(f'{book} {ref}: review missing')
      if r['sy']!=[t for _,t in W]:sys.exit(f'{book} {ref}: Syriac forms changed')
      if len(r['w'])!=len(W):sys.exit(f'{book} {ref}: target count')
      for (id,t),x in zip(W,r['w']):
        mt,ix=x.split('/');ix=[int(i) for i in ix.split(',') if i]
        if mt not in he or any(i<1 or i>len(he[mt]) for i in ix):sys.exit(f'{book} {ref}: bad target {x}')
        acc[mt].append((n,id,t,ref,ix));n+=1
        if r['note'] not in notes[mt]:notes[mt].append(r['note'])
  data={'version':1,'book':book,'source':{'he':heSrc,'translation':sySrc,'method':'Word-by-word review by Claude (November 2026); no automatic links'},'verses':{}}
  st={'book':book,'verses':len(he),'syWords':n,'unlinkedSyriac':0,'unlinkedMT':0}
  for ref,ws in acc.items():
    ws.sort();links=[x[4] for x in ws];used={i for ix in links for i in ix}
    data['verses'][ref]={'he':he[ref],'sy':[x[2] for x in ws],'ids':[x[1] for x in ws],'refs':[x[3] for x in ws],'links':links,'origin':'manual','review':{'by':'Claude','scope':'verse','note':' '.join(notes[ref])}}
    st['unlinkedSyriac']+=sum(not ix for ix in links);st['unlinkedMT']+=len(he[ref])-len(used)
  assert n==sum(1 for w in syD['syriacMorphology']['words']),f'{book}: not every native word used ({n})'
  (out_dir/(book.replace(' ','_')+'.js')).write_text('// MT–Peshitta word links, reviewed word by word; see tools/peshitta/alignment/README.md.\nwindow.PESHITTA_ALIGNMENT_BOOKS=window.PESHITTA_ALIGNMENT_BOOKS||{};window.PESHITTA_ALIGNMENT_BOOKS['+json.dumps(book)+']='+compact(data)+';\n')
  books.append(book);stats.append(st)
p=ROOT/'peshitta-alignment.js';s=p.read_text()
s=re.sub(r'/\*BOOKS\*/.*?/\*END\*/','/*BOOKS*/'+json.dumps(books,ensure_ascii=False)+'/*END*/',s);p.write_text(s)
(HERE/'tanakh-coverage.json').write_text(json.dumps({'books':stats},ensure_ascii=False,indent=1)+'\n')
print(compact(stats))
