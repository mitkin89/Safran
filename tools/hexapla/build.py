#!/usr/bin/env python3
"""Field, Origenis Hexaplorum quae supersunt (Oxford 1875) -> apparatus data (hexapla-data/<Book>.js).

Input: page transcriptions (=== Blatt … / --- Text / --- Fußnoten, see tools/hexapla/README.md),
optional English translations of the footnotes in a parallel directory.
Each Hebrew lemma (H:) is located in the MT (WLC/OSHB words) by its consonants, searching the
given verse and its neighbours, because Field's verse numbers do not always follow the MT.
Usage: python3 tools/hexapla/build.py Genesis <ocr-dir> [<ocr-en-dir>]
"""
import html as H,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
book,src=sys.argv[1],pathlib.Path(sys.argv[2]);en_dir=pathlib.Path(sys.argv[3]) if len(sys.argv)>3 else None
man=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
he=json.loads((ROOT/'bundled'/next(e for e in man if e['title']==book and (e.get('versionTitle')or'').startswith('Westminster'))['rel']).read_text())['text']
FIN=str.maketrans('ךםןףץ','כמנפצ')
cons=lambda s:re.sub(r'[^א-ת]','',s).translate(FIN)
MT={f'{c+1}:{v+1}':[cons(H.unescape(w)) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',t)] for c,ch in enumerate(he) for v,t in enumerate(ch)}
def seq(want,ws):
  """MT word span whose consonants equal the lemma; the first MT word may carry extra prefixes (ו ה ב ל מ כ ש)."""
  flat=''.join(want)
  for i in range(len(ws)):
    for pre in range(0,3):
      if pre and (len(ws[i])<=pre or any(ch not in 'והבלמכש' for ch in ws[i][:pre])):break
      acc=''
      for j in range(i,len(ws)):
        w=ws[j][pre:] if j==i else ws[j]
        if flat.startswith(acc) and len(flat)>len(acc) and w.startswith(flat[len(acc):]) and len(flat)-len(acc)>=2:return i,j   # lemma ends inside a maqqef group
        acc+=w
        if acc==flat:return i,j
        if not flat.startswith(acc):break
  return None
def locate(lemma,cands):
  lemma=re.sub(r'\([^)]*\)','',lemma)                       # (alia exempl. …), (… ק׳)
  if '׃' in lemma:lemma=lemma.split('׃')[0]   # lemma across a verse end: first verse
  parts=[x for x in re.split(r'\s*(?:…|—|\.\s*\.\s*\.+|\.{2,})\s*',lemma) if cons(x)]
  words=lambda x:[w for w in (cons(y) for y in re.split(r'[\s\u05BE]+',x)) if w]
  if not parts:return None
  for ref in cands:
    ws=MT.get(ref)
    if not ws:continue
    a=seq(words(parts[0]),ws)
    if not a:continue
    if len(parts)==1:return ref,a[0],a[1]
    b=seq(words(parts[-1]),ws[a[1]+1:])
    if b:return ref,a[0],a[1]+1+b[1]
    return ref,a[0],a[1]                                     # end lies in another verse: anchor the beginning
  return None
def cands(c,v,alt):
  # the given verse first, then all verses of the chapter and its neighbours by distance
  near=[f'{c}:{v}']+([f'{c}:{alt}'] if alt else [])
  rest=sorted((r for r in MT if abs(int(r.split(':')[0])-c)<=1),key=lambda r:abs((int(r.split(':')[0])-c)*40+int(r.split(':')[1])-v))
  return [r for i,r in enumerate(near+rest) if r not in (near+rest)[:i]]
def footnotes(text):
  """[n] lines (with CAP. separators) -> list of (section, n, text)"""
  out=[];sec=0;cur=None
  for line in text.split('\n'):
    if re.match(r'^\s*CAP\.',line):sec+=1;continue
    m=re.match(r'^\[(\d+)\]\s*(.*)$',line)
    if m:cur=[sec,int(m.group(1)),m.group(2)];out.append(cur)
    elif cur and line.strip() and not line.startswith(('[Bogen','---','TOM.')):cur[2]+=' '+line.strip()
  return out
pages=sorted(p for p in src.glob('[0-9][0-9][0-9][0-9].txt'))
entries={};unresolved=[];notes={};last=None;prev_end=None;unit_global=None
for p in pages:
  t=p.read_text();head=t.split('\n',1)[0];leaf=p.stem;pg=(re.search(r'S\. (\[?\d+\]?)',head) or [None,'?'])[1]
  body=t.split('--- Text',1)[1].split('--- Fußnoten',1)[0] if '--- Text' in t else ''
  fn=footnotes(t.split('--- Fußnoten',1)[1]) if '--- Fußnoten' in t else []
  fen={}
  if en_dir and (en_dir/p.name).exists():
    for s,n,x in footnotes((en_dir/p.name).read_text().split('--- Fußnoten',1)[-1]):fen[(s,n)]=x
  for s,n,x in fn:
    if x.startswith('(Forts.)') and last and last in notes:notes[last]['la']+=' '+x[8:].strip();continue
    key=f'{leaf}.{s}.{n}';notes[key]={'la':x,'en':fen.get((s,n),'')};last=key
  c=v=alt=None;sec=0;unit=None;cont=False
  for line in body.split('\n'):
    line=line.rstrip()
    if not line.strip():continue
    if re.match(r'^\s*CAP\.',line):sec+=1;continue
    m=re.match(r'^@ (\d+):(\d+)(?:[,–-][\d ,]+)?(?: \((\d+)\))?',line)
    if m:
      c,v,alt=int(m.group(1)),int(m.group(2)),(int(m.group(3)) if m.group(3) else None);unit=None
      cont='Forts.' in line
      continue
    if c is None:continue
    if line.startswith('H: '):
      lem=line[3:].strip().rstrip('.');loc=locate(lem,cands(c,v,alt))
      unit={'h':lem,'l':'','t':'','ref':loc[0] if loc else None,'s':loc[1] if loc else None,'e':loc[2] if loc else None,'leaf':leaf,'pg':pg,'sec':sec,'field':f'{c}:{v}'}
      (entries.setdefault(unit['ref'],[]) if loc else unresolved).append(unit);prev_end=unit;continue
    if line.startswith('L: '):
      if unit:unit['l']=line[3:].strip()
      continue
    if unit is None and cont and unit_global is not None:
      # continuation from the previous page: same lemma, own page reference
      base=unit_global
      unit={'h':base['h'],'l':'','t':'','ref':base['ref'],'s':base['s'],'e':base['e'],'leaf':leaf,'pg':pg,'sec':sec,'field':base['field'],'cont':True}
      if base.get('gap'):unit['gap']=True
      (entries.setdefault(unit['ref'],[]) if unit['ref'] else unresolved).append(unit);cont=False
    if unit is None or not unit['t'] or line.startswith('Ο΄. ÷') or line.startswith('Ο΄. ※'):
      # reading without own lemma (e.g. obelised LXX plus): placed after the preceding lemma
      if unit is None or unit['t']:
        base=prev_end
        unit={'h':'','l':'','t':'','ref':base['ref'] if base else None,'s':base['e'] if base else None,'e':base['e'] if base else None,'gap':True,'leaf':leaf,'pg':pg,'sec':sec,'field':f'{c}:{v}'}
        (entries.setdefault(unit['ref'],[]) if unit['ref'] else unresolved).append(unit)
    unit['t']=(unit['t']+' '+line.strip()).strip();unit_global=unit
# footnote refs ^n -> keys
for u in [x for L in entries.values() for x in L]+unresolved:
  u['fn']=[k for k in dict.fromkeys(f"{u['leaf']}.{u['sec']}.{n}" for n in re.findall(r'\^(\d+)',u['t'])) if k in notes]
  if not u['fn']:
    # notes of a page with CAP. only in text/footnotes on one side: fall back to number match on the page
    u['fn']=[k for n in re.findall(r'\^(\d+)',u['t']) for k in notes if k.startswith(u['leaf']+'.') and k.endswith('.'+n)][:3]
used={k for L in list(entries.values())+[unresolved] for u in L for k in u['fn']}
data={'book':book,'source':{'title':'Frederick Field, Origenis Hexaplorum quae supersunt, I (Oxford 1875)','url':'https://archive.org/details/origenhexapla01unknuoft','license':'public domain'},
      'verses':{ref:[{k:u[k] for k in ('s','e','h','l','t','leaf','pg','fn','field','gap','cont') if k in u} for u in L] for ref,L in entries.items() if ref},
      'notes':{k:n for k,n in notes.items() if k in used}}
out=ROOT/'hexapla-data';out.mkdir(exist_ok=True)
(out/(book.replace(' ','_')+'.js')).write_text('// Field, Hexapla (1875) – Lemmata, Lesarten und Fußnoten; erzeugt von tools/hexapla/build.py\nwindow.HEXAPLA_DATA=window.HEXAPLA_DATA||{};window.HEXAPLA_DATA['+json.dumps(book)+']='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(pathlib.Path(__file__).parent/(book.replace(' ','_')+'-unresolved.json')).write_text(json.dumps([{k:u[k] for k in ('leaf','field','h','t')} for u in unresolved],ensure_ascii=False,indent=1)+'\n')
m=ROOT/'library-textcrit-hexapla.js';ms=m.read_text();cur=json.loads(re.search(r'/\*BOOKS\*/(.*?)/\*END\*/',ms).group(1))
if book not in cur:cur.append(book)
m.write_text(re.sub(r'/\*BOOKS\*/.*?/\*END\*/','/*BOOKS*/'+json.dumps(sorted(cur),ensure_ascii=False)+'/*END*/',ms))
n=sum(len(L) for L in entries.values());print(f'{book}: {n} Einträge zugeordnet, {len(unresolved)} offen, {len(data["notes"])} Fußnoten, {sum(1 for x in notes.values() if x["en"])} übersetzt')
