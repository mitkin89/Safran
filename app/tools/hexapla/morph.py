#!/usr/bin/env python3
"""Greek morphology for the Hexapla readings (Field): form -> [[lemma, key, gloss], …] -> hexapla-morph.js

Sources, in this order:
  1. the Septuagint morphology already in Safran (lxx-morph.js; Kushniryk, CC BY 4.0): every analysis of a form
     attested in the LXX;
  2. Perseus Morpheus (CC BY-SA 3.0 US; the 64-bit-safe build of github.com/perseids-tools/morpheus) for the
     remaining forms; the gloss is taken from the LXX lemma list when the lemma is the same;
  3. a second pass for forms still open: movable ν, Field's joined spellings (καίγε, ἀναμέσον), Koine/itacist
     spellings (λήψομαι/λήμψομαι, ει/ι), capitalised names (E), transliterated Hebrew words (Y);
  4. tools/hexapla/manual-morph.json: the rest, analysed by Claude (2026); null marks fragments that are not
     words (line-break halves, Field's Latin notes on codex spellings).
Forms still open are listed in tools/hexapla/open-forms.json.
Keys use the LXX scheme ("V aor ind act 3rd sg", "N fem acc pl"), so gmorph.js describe() can render them.

Usage: MORPHEUS=/path/to/morpheus python3 tools/hexapla/morph.py
       (MORPHEUS is the checkout with bin/cruncher and a built stemlib/Greek; see tools/hexapla/README.md)
"""
import json,os,pathlib,re,subprocess,unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[2]
MORPHEUS=pathlib.Path(os.environ.get('MORPHEUS','/home/claude/src2/morpheus-perseids'))
GREEK=re.compile(r'[\u0370-\u03FF\u1F00-\u1FFF]')
WORD=re.compile(r'[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]+[᾿’\'ʼ]?')

def form(s):
  """display/lookup form like gmorph.form(): grave -> acute, second accent before an enclitic dropped, apostrophe ’"""
  d=unicodedata.normalize('NFD',s).replace('\u0300','\u0301')
  d=re.sub(r'[᾿’\'ʼ]','’',d);d=''.join(c for c in d if unicodedata.category(c)[0] in 'LM' or c=='’')
  acc=[i for i,c in enumerate(d) if c in '\u0301\u0342']
  if len(acc)>1:i=d.rfind('\u0301');d=d[:i]+d[i+1:] if i>=0 else d
  return unicodedata.normalize('NFC',d)

# ---------- forms in the Hexapla data ----------
forms={}
for f in sorted((ROOT/'hexapla-data').glob('*.js')):
  t=f.read_text();d=json.loads(t[t.index('=',t.index('HEXAPLA_DATA['))+1:].strip().rstrip(';'))
  for L in d['verses'].values():
    for u in L:
      txt=re.sub(r'\^\d+','',u['t'])
      for m in WORD.finditer(txt):
        w=m.group(0)
        if not GREEK.search(w):continue
        nxt=txt[m.end():m.end()+1]
        if nxt in '΄ʹ\'' or len(w.rstrip('’'))<2:continue     # sigla Ο΄, Σ., Θ., single letters
        k=form(w)
        if k:forms[k]=forms.get(k,0)+1

# ---------- LXX ----------
t=(ROOT/'lxx-morph.js').read_text();LX=json.loads(t[t.index('window.LXX_MORPH=')+17:].strip().rstrip(';'))
P=LX['P'];lxx={};gloss={}
for e in LX['L']:
  lemma,gl,rest=(e.split('\t')+['',''])[:3]
  if gl and lemma not in gloss:gloss[lemma]=gl
  for part in rest.split(';'):
    if '=' not in part:continue
    k,fs=part.split('=',1);key=P[int(k,36)]
    for fm in fs.split(','):
      a=lxx.setdefault(form(fm),[])
      if [lemma,key] not in [x[:2] for x in a]:a.append([lemma,key,gl])
fold=lambda s:''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)[0]=='L').lower().replace('ς','σ')
GFOLD={}
for lem in gloss:GFOLD.setdefault(fold(lem),lem)
lxx_fold={}
for k,v in lxx.items():lxx_fold.setdefault(fold(k),[]).extend(x for x in v if x not in lxx_fold.get(fold(k),[]))

# ---------- Morpheus ----------
B2G={}
def beta(s):
  """Unicode Greek -> Morpheus beta code (lower case, accents as / \\ =, breathings ) (, iota subscript |, diaeresis +)"""
  out=[]
  base={'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'h','θ':'q','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'c','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'u','φ':'f','χ':'x','ψ':'y','ω':'w'}
  for ch in unicodedata.normalize('NFD',s.lower()):
    if ch in base:out.append(base[ch])
    elif ch=='\u0313':out.append(')')
    elif ch=='\u0314':out.append('(')
    elif ch in '\u0301\u0300':out.append('/')
    elif ch=='\u0342':out.append('=')
    elif ch=='\u0345':out.append('|')
    elif ch=='\u0308':out.append('+')
    elif ch=='’':out.append("'")
  return ''.join(out)
def unbeta(b):
  m={'a':'α','b':'β','g':'γ','d':'δ','e':'ε','z':'ζ','h':'η','q':'θ','i':'ι','k':'κ','l':'λ','m':'μ','n':'ν','c':'ξ','o':'ο','p':'π','r':'ρ','s':'σ','t':'τ','u':'υ','f':'φ','x':'χ','y':'ψ','w':'ω'}
  dia={')':'\u0313','(':'\u0314','/':'\u0301','\\':'\u0300','=':'\u0342','|':'\u0345','+':'\u0308'}
  b=re.sub(r'[_^\d+]','',b.split(',')[-1]);out=''
  cap=False
  for ch in b:
    if ch=='*':cap=True;continue
    if ch in m:out+=m[ch].upper() if cap else m[ch];cap=False
    elif ch in dia:
      # Morpheus writes breathing/accent after the vowel(s) it belongs to
      out+=dia[ch]
  out=unicodedata.normalize('NFC',out)
  return re.sub(r'σ$','ς',out)
ADJ=re.compile(r'^(?:\w+_\w+_\w+|os_on|hs_es|wn_on|ws_wn|us_u)$')
def key_of(pos,lemma,feats,stem):
  f=feats.replace('part','ptc').replace(' mp ',' mid/pass ').replace(' mp',' mid/pass')
  f=re.sub(r'\b(attic|epic|doric|ionic|aeolic|homeric|poetic|epic|parad_form|contr|syncope|unasp)\b','',f)
  f=' '.join(f.split())
  if pos in ('V','P'):                                       # Morpheus: P = participle
    if not re.search(r'\b(pres|imperf|fut|aor|perf|plup|futperf)\b',f):
      m=re.search(r'\b(perf|aor|fut)',stem)
      if m:f=m.group(1)+' '+f
    return 'V '+f
  st=stem.split()
  if 'indeclform' in stem or not f:
    for s,p in (('prep','R'),('conj','C'),('adverb','D'),('particle','X'),('article','T'),('pron','P'),('numeral','M'),('exclam','I')):
      if s in stem:return p+(' '+f if f else '')
    return 'X'+(' '+f if f else '')
  if 'article' in stem:return 'T '+f
  if 'pron' in stem:return 'P '+f
  if any(ADJ.match(s) for s in st):return 'A '+f
  return 'N '+f
def lemma_fix(l):
  """Morpheus lemmas in the LXX spelling: compounds lose the breathing of their second part (ἐνἀντιάω),
  Attic γιγν/ττ become Koine γιν/σσ when that lemma is in the LXX"""
  d=unicodedata.normalize('NFD',l);head,tail=d[:2],d[2:]
  l=unicodedata.normalize('NFC',head+tail.replace('\u0313','').replace('\u0314',''))
  if l not in gloss and fold(l) in GFOLD:return GFOLD[fold(l)]
  for a,b in (('γιγν','γιν'),('ττ','σσ'),('ρρ','ρσ')):
    if a in l and l.replace(a,b) in gloss:return l.replace(a,b)
  return l
def crunch(words):
  """Morpheus analyses for Unicode forms: {form: [[lemma, key, gloss], …]}"""
  res={}
  if not words:return res
  env=dict(os.environ,MORPHLIB=str(MORPHEUS/'stemlib'))
  bet={beta(k):k for k in words}
  out=subprocess.run([str(MORPHEUS/'bin/cruncher')],input='\n'.join(bet)+'\n',capture_output=True,text=True,env=env).stdout
  cur=None
  for line in out.split('\n'):
    if line.startswith('<NL>'):
      k=bet.get(cur)
      if not k:continue
      for a in re.findall(r'<NL>(.*?)</NL>',line):
        cols=a.split('\t');head=cols[0].split();pos,lem=head[0],head[1];feats=' '.join(head[2:]);stem=' '.join(cols[1:])
        lemma=lemma_fix(unbeta(lem));key=key_of(pos,lemma,' '+feats+' ',stem)
        e=[lemma,key,gloss.get(lemma,'')]
        if e[:2] not in [x[:2] for x in res.setdefault(k,[])]:res[k].append(e)
    elif line.strip() and not line.startswith(':'):cur=line.strip()
  return res
# ---------- forms that are not words of a translator ----------
# Field's own words inside the readings: sigla and their abbreviations, "in the Hexapla", "unattributed".
EDITORIAL={'Ἑβρ','Εβρ','Ἑβραῖος','Ἑβραίου','Ἑβραίῳ','Ἑβραϊκόν','Ἑβραϊκῷ','Ἑβραϊκοῦ','Σαμαρειτικόν','Σαμαρειτικός','Σαμαρειτικοῦ','Σαμαρειτικῷ','Σύρος','Σύρου','Σύρῳ','ἑξαπλῷ','ἑξαπλοῖς','τετρασελίδῳ','ἀνεπίγραφος','ἀνεπίγραφον','Ϛ','ς'}
for k in list(forms):
  if k in EDITORIAL:del forms[k]
rest=[k for k in forms if k not in lxx]
morph=crunch(rest)

# Morpheus lists every possible analysis: lemmas known from the LXX first, duals and analyses without mood last
for k,a in morph.items():a.sort(key=lambda e:(e[0] not in gloss,' dual' in e[1],e[1].startswith('V') and not re.search(r'\b(ind|subj|opt|imperat|inf|ptc)\b',e[1])))
# Field writes some words joined (καίγε, ἀναμέσον): one lexical unit each.
JOINED={'καίγε':['καίγε','X','and indeed (καί γε)'],'ἀναμέσον':['ἀναμέσον','R','between (ἀνὰ μέσον)'],'ἱνατί':['ἱνατί','D','why? (ἵνα τί)'],
  'διατί':['διατί','D','why? (διὰ τί)'],'ἐξεναντίας':['ἐξεναντίας','D','opposite (ἐξ ἐναντίας)'],'ἐπέκεινα':['ἐπέκεινα','D','beyond'],
  'καθότι':['καθότι','C','because'],'καθά':['καθά','D','just as'],'καθάπερ':['καθάπερ','D','just as'],'ὑποκάτω':['ὑποκάτω','R','under'],
  'ἀπέναντι':['ἀπέναντι','R','opposite'],'ἐπάνωθεν':['ἐπάνωθεν','D','from above'],'τουτέστι':['τουτέστι','X','that is (τοῦτ’ ἔστι)'],'τουτέστιν':['τουτέστι','X','that is (τοῦτ’ ἔστι)']}
# LSJ glosses (Perseus, CC BY-SA) for lemmas the LXX list does not gloss; tools/hexapla/lsj_glosses.py
lf=ROOT/'tools/hexapla/lsj-glosses.json'
LSJG=json.loads(lf.read_text(encoding='utf-8')) if lf.exists() else {}
F={};src={'lxx':0,'lxx-fold':0,'morpheus':0,'nu':0,'joined':0,'spelling':0,'name':0,'translit':0,'manual':0,'fragment':0,'none':0}
for k,n in forms.items():
  if k in JOINED:F[k]=[JOINED[k]];src['joined']+=n
  elif k in lxx:F[k]=lxx[k];src['lxx']+=n
  elif k in morph:F[k]=morph[k];src['morpheus']+=n
  elif fold(k) in lxx_fold:F[k]=lxx_fold[fold(k)];src['lxx-fold']+=n

# ---------- second pass for the forms still without analysis ----------
def variants(k):
  """spellings of the same word: itacism (ει/ι), λημψ/ληψ of the Koine, movable ν"""
  v=[k+'ν']
  for a,b in (('λήψ','λήμψ'),('ληψ','λημψ'),('ληφθ','λημφθ'),('λήφθ','λήμφθ'),('εῖ','ιεῖ'),('ει','ι'),('εί','ί'),('ι','ει'),('ί','εί'),('ῖ','εῖ')):
    if a in k:
      v.append(k.replace(a,b,1));v.append(k.replace(a,b))
  return [x for x in dict.fromkeys(v) if x!=k]
open_=[k for k in forms if k not in F]
cand={x for k in open_ for x in variants(k)}
vm=crunch([x for x in cand if x not in lxx])
bare=lambda s:''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)[0]=='L')
FUNC={'ἐκ','οὐκ','οὐχ','ἐξ'}
manual={}
mf=ROOT/'tools/hexapla/manual-morph.json'
if mf.exists():manual=json.loads(mf.read_text(encoding='utf-8'))
for k in open_:
  n=forms[k]
  if k in manual:
    # null: no word of a translator (line-break fragment, Field's Latin note on a codex spelling)
    if manual[k] is None:src['fragment']+=n
    else:F[k]=manual[k];src['manual']+=n
    continue
  if k in JOINED:F[k]=[JOINED[k]];src['joined']+=n;continue
  hit=next((x for x in variants(k) if x in lxx or x in vm),None)
  if hit:F[k]=lxx.get(hit) or vm[hit];src['nu' if hit==k+'ν' else 'spelling']+=n;continue
  if k[0].isupper():F[k]=[[bare(k),'E','']];src['name']+=n;continue
  # Greek words end in a vowel or ν ρ ς ξ ψ; other final consonants mark a transliterated Hebrew word (χερουβείμ, δαβείρ)
  if bare(k)[-1] not in 'αεηιουωνρςξψ' and k not in FUNC:F[k]=[[k,'Y','Hebrew transliteration']];src['translit']+=n;continue
  src['none']+=n
(ROOT/'tools/hexapla/open-forms.json').write_text(json.dumps(sorted(((k,forms[k]) for k in forms if k not in F),key=lambda x:-x[1]),ensure_ascii=False,indent=0),encoding='utf-8')
data={'v':1,'src':{'lxx':'LXX morphology, Seth Kushniryk, CC BY 4.0 (lxx-morph.js)','lsj':'Glosses for lemmas outside the LXX: LSJ, Perseus Digital Library (CC BY-SA, github.com/PerseusDL/lexica)','morpheus':'Perseus Morpheus, CC BY-SA 3.0 US (github.com/PerseusDL/morpheus)'},'F':F}
for a in F.values():
  for e in a:
    if not e[2] and e[1][0] not in 'EY':e[2]=LSJG.get(fold(e[0]),'')
(ROOT/'hexapla-morph.js').write_text('// Griechische Morphologie der Hexapla-Lesarten (Field): Form -> [[Lemma, Schlüssel, Kurzbedeutung], …]; Schlüssel wie in lxx-morph.js.\n'
  '// Quellen: LXX-Morphologie (Seth Kushniryk, CC BY 4.0), für übrige Formen Perseus Morpheus (CC BY-SA 3.0 US). Erzeugt mit tools/hexapla/morph.py.\n'
  'window.HEXAPLA_MORPH='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
N=sum(forms.values())
print(f'{len(forms)} Formen, {N} Belege: '+', '.join(f'{k} {100*v/N:.1f} %' for k,v in src.items()))
