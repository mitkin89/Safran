#!/usr/bin/env python3
"""Candidates for "andere Vorlage" in the Hexapla readings (Aquila, Symmachus, Theodotion, …).

A translator row that differs from the LXX row is a candidate when one of its differing content words has
LXX equivalences (oshb-lxx.js, gr: Greek lemma -> Hebrew lemmas) and none of them is a lemma of the MT words
the entry is anchored to. Words without LXX equivalences (Aquila's own vocabulary) are not candidates.
Writes JSON lines to the directory given as first argument (default /home/claude/vorlage/candidates.jsonl)."""
import json,re,sys,pathlib,unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/home/claude/vorlage/candidates.jsonl')
def jsobj(p,start):
  t=(ROOT/p).read_text(encoding='utf-8');i=t.index(start)+len(start);return json.loads(t[i:t.rstrip().rstrip(';').rindex('}')+1])
F=jsobj('hexapla-morph.js','window.HEXAPLA_MORPH=')['F']
GR=jsobj('oshb-lxx.js','=')['gr'] if 'gr' in (ROOT/'oshb-lxx.js').read_text()[:2000] else None
if GR is None:
  t=(ROOT/'oshb-lxx.js').read_text(encoding='utf-8');GR=json.loads(t[t.index('{'):t.rstrip().rstrip(';').rindex('}')+1])['gr']
def form(s):
  d=unicodedata.normalize('NFD',s).replace('́','́').replace('̀','́')
  d=re.sub(r"[᾿’'ʼ]",'’',d);d=''.join(c for c in d if unicodedata.category(c)[0] in 'LM' or c=='’')
  acc=[i for i,c in enumerate(d) if c in '́͂']
  if len(acc)>1:i=d.rfind('́');d=d[:i]+d[i+1:] if i>=0 else d
  return unicodedata.normalize('NFC',d)
norm=lambda t:''.join(c for c in unicodedata.normalize('NFD',t) if unicodedata.category(c)[0]=='L').lower()
SIG=re.compile(r"(Ο΄\.|Οἱ [Γγ]΄\.?|Οἱ λοιποί|Οἱ λ΄\.?|Ὁ Σύρος|Ὁ Ἑβραῖος|Ὁ Σαμαρειτικός|Τὸ Σαμαρειτικόν|Ἄλλος|Ἄλλως|[’'‘]?Α\.|Ἀ\.|Σ\.|Θ\.|Alia exempl\.|Aliter:|Ε΄\.|Ϛ΄\.|Ζ΄\.)")
man=json.loads((ROOT/'bundled/manifest.json').read_text())
WL={e['title']:e['rel'] for e in man['items'] if (e.get('versionTitle') or '').startswith('Westminster')}
def heb(rel):
  d=json.loads((ROOT/'bundled'/rel).read_text(encoding='utf-8'));V={}
  for c,ch in enumerate(d['text']):
    for v,vs in enumerate(ch):
      V[f'{c+1}:{v+1}']=[(re.sub('<[^>]*>','',w),[re.sub(r'\D.*','',x.strip()) for x in l.split('/') if re.search(r'\d',x)]) for l,w in re.findall(r'<span class="w" data-l="([^"]*)"[^>]*>(.*?)</span>',vs)]
  return V
t=(ROOT/'oshb-lemmas.js').read_text(encoding='utf-8');LEM=json.loads(t[t.index('{'):t.rstrip().rstrip(';').rindex('}')+1])
cons=lambda x:re.sub('[ךםןףץ]',lambda m:'כמנפצ'['ךםןףץ'.index(m.group())],re.sub('[^א-ת]','',x))
LC={}
for k,v in LEM.items():
  m=re.match(r'\d+',k)
  if m:LC.setdefault(m.group(),set()).add(cons(v[0]))
# letters that are easily confused in the square script or by sound; one of them, one letter more or less,
# or two neighbours swapped makes a Hebrew word "close" to the MT word – the mark of a different Vorlage
CONF=[set(x) for x in ('דר','בכ','החת','וי','מס','עצ','גנ','זו','כנ','אה','שס','טמ','אע','הח','כק','טת')]
def close(a,b):
  if a==b or len(a)<2 or len(b)<2:return False
  if len(a)==len(b):
    d=[i for i in range(len(a)) if a[i]!=b[i]]
    if len(d)==1:return any({a[d[0]],b[d[0]]}<=c for c in CONF)
    return len(d)==2 and d[1]==d[0]+1 and a[d[0]]==b[d[1]] and a[d[1]]==b[d[0]]
  # one letter more or less is mostly a derivative of the same root (חטא/חטאת), not a different text
  return False
n=0;OUT.parent.mkdir(parents=True,exist_ok=True)
with OUT.open('w',encoding='utf-8') as out:
  for f in sorted((ROOT/'hexapla-data').glob('*.js')):
    t=f.read_text(encoding='utf-8');d=json.loads(t[t.index('=',t.index('HEXAPLA_DATA['))+1:].strip().rstrip(';'))
    if d['book'] not in WL:continue
    H=heb(WL[d['book']])
    for ref,units in d['verses'].items():
      mt=H.get(ref) or []
      for ui,u in enumerate(units):
        if u.get('s') is None or u.get('gap'):continue
        anchor=mt[u['s']:u['e']+1];strong={s for w,ss in anchor for s in ss}
        if not strong:continue
        txt=re.sub(r'\^\d+','',u['t']);marks=[m for m in SIG.finditer(txt)]
        if not marks or txt[:marks[0].start()].strip():continue
        rows=[]
        for m in marks:
          if rows and not txt[rows[-1]['end']:m.start()].strip():rows[-1]['head']+=' '+m.group();rows[-1]['end']=m.end();continue
          if rows:rows[-1]['text']=txt[rows[-1]['end']:m.start()]
          rows.append({'head':m.group(),'end':m.end()})
        rows[-1]['text']=txt[rows[-1]['end']:]
        if not rows[0]['head'].startswith('Ο΄'):continue
        base={norm(w) for w in rows[0]['text'].split()}
        for r in rows[1:]:
          if not re.search(r'Ἀ|Α\.|Σ\.|Θ\.|Οἱ|Ε΄|Ϛ΄',r['head']):continue
          odd=[]
          for w in r['text'].split():
            if norm(w) in base or not norm(w):continue
            a=F.get(form(re.sub(r'[^\w’]','',w)))
            if not a or a[0][1][0] in 'TCXPRYE':continue
            lems={x[0] for x in a}
            known=[l for l in lems if l in GR]
            if not known:continue
            heq={re.match(r'\d+',h).group() for l in known for h in GR[l].split('|')[2].split(',') if re.match(r'\d+',h)}
            if heq&strong:continue
            mtc={c for st in strong for c in LC.get(st,())}
            near=[]
            for l in known:
              for h in GR[l].split('|')[2].split(',')[:6]:
                m=re.match(r'(\d+)\D*:(\d+)$',h)
                if not m or int(m.group(2))<2:continue
                for c in LC.get(m.group(1),()):
                  hit=next((x for x in mtc if close(c,x)),None)
                  if hit:near.append([l,c,hit])
            if near:odd.append([w,near[0]])
          if odd:
            n+=1
            out.write(json.dumps({'id':f"{d['book']} {ref}#{ui} {r['head']}",'ref':f"{d['book']} {ref}",'he':' '.join(w for w,_ in anchor),'lxx':rows[0]['text'].strip(),'sig':r['head'],'tr':r['text'].strip(),'odd':odd},ensure_ascii=False)+'\n')
print(n,'Kandidaten')
