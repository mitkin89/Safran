#!/usr/bin/env python3
"""Greek morphology for the Hexapla readings (Field): form -> [[lemma, key, gloss], …] -> hexapla-morph.js

Sources, in this order:
  1. the Septuagint morphology already in Safran (lxx-morph.js; Kushniryk, CC BY 4.0): every analysis of a form
     attested in the LXX;
  2. Perseus Morpheus (CC BY-SA 3.0 US, https://github.com/PerseusDL/morpheus) for the remaining forms; the
     gloss is taken from the LXX lemma list when the lemma is the same.
Keys use the LXX scheme ("V aor ind act 3rd sg", "N fem acc pl"), so gmorph.js describe() can render them.

Usage: MORPHEUS=/path/to/morpheus python3 tools/hexapla/morph.py
       (MORPHEUS is the checkout with bin/cruncher and a built stemlib/Greek; see tools/hexapla/README.md)
"""
import json,os,pathlib,re,subprocess,unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[2]
MORPHEUS=pathlib.Path(os.environ.get('MORPHEUS','/home/claude/greekmorph/src/morpheus'))
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
rest=[k for k in forms if k not in lxx]
morph={}
if rest:
  env=dict(os.environ,MORPHLIB=str(MORPHEUS/'stemlib'))
  bet={beta(k):k for k in rest}
  out=subprocess.run([str(MORPHEUS/'bin/cruncher')],input='\n'.join(bet)+'\n',capture_output=True,text=True,env=env).stdout
  cur=None
  for line in out.split('\n'):
    if line.startswith('<NL>'):
      k=bet.get(cur)
      if not k:continue
      for a in re.findall(r'<NL>(.*?)</NL>',line):
        cols=a.split('\t');head=cols[0].split();pos,lem=head[0],head[1];feats=' '.join(head[2:]);stem=' '.join(cols[1:])
        lemma=unbeta(lem);key=key_of(pos,lemma,' '+feats+' ',stem)
        e=[lemma,key,gloss.get(lemma,'')]
        if e[:2] not in [x[:2] for x in morph.setdefault(k,[])]:morph[k].append(e)
    elif line.strip() and not line.startswith(':'):cur=line.strip()

# Morpheus lists every possible analysis: lemmas known from the LXX first, duals and analyses without mood last
for k,a in morph.items():a.sort(key=lambda e:(e[0] not in gloss,' dual' in e[1],e[1].startswith('V') and not re.search(r'\b(ind|subj|opt|imperat|inf|ptc)\b',e[1])))
F={};src={'lxx':0,'lxx-fold':0,'morpheus':0,'none':0}
for k,n in forms.items():
  if k in lxx:F[k]=lxx[k];src['lxx']+=n
  elif k in morph:F[k]=morph[k];src['morpheus']+=n
  elif fold(k) in lxx_fold:F[k]=lxx_fold[fold(k)];src['lxx-fold']+=n
  else:src['none']+=n
data={'v':1,'src':{'lxx':'LXX morphology, Seth Kushniryk, CC BY 4.0 (lxx-morph.js)','morpheus':'Perseus Morpheus, CC BY-SA 3.0 US (github.com/PerseusDL/morpheus)'},'F':F}
(ROOT/'hexapla-morph.js').write_text('// Griechische Morphologie der Hexapla-Lesarten (Field): Form -> [[Lemma, Schlüssel, Kurzbedeutung], …]; Schlüssel wie in lxx-morph.js.\n'
  '// Quellen: LXX-Morphologie (Seth Kushniryk, CC BY 4.0), für übrige Formen Perseus Morpheus (CC BY-SA 3.0 US). Erzeugt mit tools/hexapla/morph.py.\n'
  'window.HEXAPLA_MORPH='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
N=sum(forms.values())
print(f'{len(forms)} Formen, {N} Belege: '+', '.join(f'{k} {100*v/N:.1f} %' for k,v in src.items()))
