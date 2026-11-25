#!/usr/bin/env python3
"""Leningrad (Westminster/OSHB, „ML“) against the Aleppo text („MA“: Miqra according to the Masorah, CACCHT) ->
aleppo-diff/<Book>.js, one entry per differing word, indexed like the MT words of the apparatus (OSHB spans,
the unvocalized Ketiv span included).

Kinds:  k  consonants (other letters)      p  plene/defective (only ו/י differ)
        v  vowels (accents and meteg ignored)  a  accents only (incl. meteg)
        w  words do not pair up (more, fewer or other words)
Not counted: the Ketiv span of the OSHB (MAM prints only the Qere), qamats qatan (MAM ׇ) as qamats, the
vocalization of the divine name, paseq, sof pasuq, maqaf, MAM's ס/פ section marks.
Note: MAM is an edition; where the Aleppo Codex is lost (Torah up to Deut 28:17 and other gaps) it follows other
Tiberian manuscripts. Usage: python3 tools/aleppo/compare.py"""
import json,re,pathlib,difflib,unicodedata,collections
ROOT=pathlib.Path(__file__).resolve().parents[2]
man=json.loads((ROOT/'bundled/manifest.json').read_text(encoding='utf-8'))['items']
def doc(t,vt):return json.loads((ROOT/'bundled'/next(e['rel'] for e in man if e['title']==t and (e.get('versionTitle') or '').startswith(vt))).read_text(encoding='utf-8'))['text']
books=[e['title'] for e in man if (e.get('versionTitle') or '').startswith('Aleppo')]
VOW=re.compile('[ְ-ׇּׁׂ]')
ACC=re.compile('[֑-ֽ֯]')
TAAM=re.compile('[\u0591-\u05AF]')
def norm(w):
  # MAM marks: CGJ (keeps patah before hiriq in ירושלים), varika (pronunciation help), qamats qatan
  w=re.sub('[\u034F\uFB1E\u05C0\u05C3\u05BE\u05C0]','',w).replace('\u05C7','\u05B8')
  return unicodedata.normalize('NFC',unicodedata.normalize('NFD',w))
cons=lambda w:re.sub('[^א-ת]','',w)
skel=lambda w:cons(w)[:1]+re.sub('[וי]','',cons(w)[1:])
def kind(a,b):
  if a==b:return None
  if cons(a)!=cons(b):return 'p' if skel(a)==skel(b) else 'k'
  if cons(a)=='יהוה' or cons(a).endswith('יהוה'):return None
  if ACC.sub('',a)!=ACC.sub('',b):return 'v'
  # meteg/ga'ya alone is left out: the two editions mark secondary stress by different conventions
  # accents as a set: postpositive/prepositive accents are written twice in MAM, and the second pashta is
  # qadma (U+05A8) in the OSHB but pashta (U+0599) in MAM; zarqa has two code points
  acc=lambda w:{ {'\u05A8':'\u0599','\u0598':'\u05AE','\u05A2':'\u05AA'}.get(c,c) for c in TAAM.findall(w)}
  x,y=acc(a),acc(b)
  # a ga'ya written as meteg in one edition and as merkha in the other is the same mark
  if '\u05BD' in a:y.discard('\u05A5')
  if '\u05BD' in b:x.discard('\u05A5')
  if x!=y:return 'a'
  return None
total=collections.Counter()
for book in sorted(books):
  W=doc(book,'Westminster');A=doc(book,'Aleppo');out={};cnt=collections.Counter()
  for ci,ch in enumerate(W):
    # align the whole chapter: verse divisions differ between the editions (Decalogue, 1 Sam 24, Jer 31 …)
    mlw=[];maw=[]
    for vi,v in enumerate(ch):
      for wi,x in enumerate(re.findall(r'<span class="w"[^>]*>(.*?)</span>',v)):
        w=norm(re.sub('<[^>]*>','',x))
        if VOW.search(w) or len(cons(w))<2:mlw.append((vi,wi,w))      # Ketiv spans carry no vowels; MAM has the Qere only
    for a in (A[ci] if ci<len(A) else []):
      maw+=[norm(x) for x in re.split(r'[\s\u05BE]+',a.replace('\u05C0',' ')) if x and x not in ('ס','פ') and cons(norm(x))]
    if not mlw or not maw:continue
    sm=difflib.SequenceMatcher(None,[cons(w) for _,_,w in mlw],[cons(x) for x in maw],autojunk=False)
    def add(vi,rec):out.setdefault(f'{ci+1}:{vi+1}',[]).append(rec);cnt[rec[2]]+=1
    for op,i1,i2,j1,j2 in sm.get_opcodes():
      if op=='equal' or (op=='replace' and i2-i1==j2-j1):
        for x,y in zip(range(i1,i2),range(j1,j2)):
          vi,wi,w=mlw[x];k=kind(w,maw[y])
          if k:add(vi,[wi,wi,k,w,maw[y]])
      elif i2>i1:
        first=True
        for vi in sorted({mlw[x][0] for x in range(i1,i2)}):
          xs=[x for x in range(i1,i2) if mlw[x][0]==vi]
          add(vi,[mlw[xs[0]][1],mlw[xs[-1]][1],'w',' '.join(mlw[x][2] for x in xs),' '.join(maw[j1:j2]) if first else ''])
          first=False
      else:
        vi,wi,_=mlw[i1-1] if i1>0 else mlw[0]
        add(vi,[wi if i1>0 else -1,-1,'w','',' '.join(maw[j1:j2])])
  (ROOT/'aleppo-diff'/(book.replace(' ','_')+'.js')).write_text(
    '// Leningrad (OSHB) gegen Aleppo-Text (MAM, CACCHT): Unterschiede je Wort; tools/aleppo/compare.py\n'
    'window.ALEPPO_DIFF=window.ALEPPO_DIFF||{};window.ALEPPO_DIFF['+json.dumps(book)+']='+json.dumps({'book':book,'verses':out},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
  total.update(cnt);print(book,dict(cnt))
print('gesamt',dict(total))
