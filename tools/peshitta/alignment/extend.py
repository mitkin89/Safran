#!/usr/bin/env python3
"""Conservative MT–Peshitta proposals through the existing Onkelos alignment.
No positional gap filling. Original PaTraCoSy verses are retained unchanged.
"""
import collections,hashlib,html,json,pathlib,re,unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[3];HERE=pathlib.Path(__file__).resolve().parent
BOOKS=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def sha(x):return hashlib.sha256(x).hexdigest()
def js(f,key):
 s=(ROOT/f).read_text();return json.loads(s.split('window.'+key+'=',1)[1].rsplit(';',1)[0])
base=js('peshitta-alignment-data.js','PESHITTA_ALIGNMENT_DATA');gen=base if base['version']==1 else base['books']['Genesis']
old={ref:r for ref,r in gen['verses'].items() if r.get('origin','patracosy')=='patracosy'}
TG=js('targum-il.js','TARGUM_IL')['Onkelos'];TL=js('targum-lex.js','TARGUM_LEX');HL=js('oshb-lemmas.js','OSHB_LEMMAS')
manifest=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
FIN=str.maketrans('ךםןףץ','כמנפצ');SY=dict(zip('ܐܒܓܕܗܘܙܚܛܝܟܠܡܢܣܥܦܨܩܪܫܬ','אבגדהוזחטיכלמנסעפצקרשת'))
def cons(s):return ''.join(SY.get(c,c)for c in unicodedata.normalize('NFC',s)if c in SY or 'א'<=c<='ת').translate(FIN)
def stem(s):
 s=cons(s)
 if len(s)>2 and s[-1]in'אה':s=s[:-1]
 return s
STOP=set('the a an of be in on at by for with and or is as from into that this who which upon up out off make made do give something someone thing one to'.split())
def gloss(s):return {w for w in re.findall('[a-z]+',s.lower())if w not in STOP and len(w)>2}
def load(book,test):
 e=next(e for e in manifest if e['title']==book and test(e));p=ROOT/'bundled'/e['rel'];d=json.loads(p.read_text());return e,d,{'rel':e['rel'],'sha256':sha(p.read_bytes()),'versionTitle':e['versionTitle'],'textHash':sha(compact(d['text']).encode())}
def heb(html0):
 out=[]
 for l,m,t in re.findall(r'<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>(.*?)</span>',html0):
  ids=re.findall(r'\d+(?: [a-z])?',l);sn=ids[-1]if ids else'';rec=HL.get(sn,HL.get(sn.split(' ')[0],['','']))
  at=next((i for i,x in enumerate(l.split('/'))if re.search(r'\d',x)),0);mc=m[1:].split('/');tag=mc[at]if at<len(mc)else'';sp={'V':'verb','N':'subs','A':'adjv','P':'pron','R':'prep','D':'advb'}.get(tag[:1],'function')
  out.append({'form':html.unescape(t),'sn':sn,'stem':stem(rec[0]),'lex':cons(rec[0]),'gl':gloss(rec[1]),'morph':m,'sp':sp,'number':tag.startswith('Ac')or sn.split(' ')[0]in('3967','505','7233','7239'),'prefix':l.split('/')[:-1]})
 return out
def onkelos(s):
 out=[];cur=[]
 for match in re.finditer(r'(<span class="wt" data-l="([^"]*)" data-m="([^"]*)">(.*?)</span>)|(\s+)|([^<\s]+)',s):
  full,lid,m,t,space,other=match.groups()
  if space:
   if cur:out.append(cur);cur=[]
  elif full:
   r=TL.get(lid,['','','']);cur.append({'form':cons(html.unescape(t)),'lex':cons(r[0]),'stem':stem(r[1]or r[0]),'gl':gloss(r[2]),'pos':m.split('.')[0]})
 if cur:out.append(cur)
 return out
def syr(doc,c,v):
 out=[];D=doc['syriacMorphology']
 for id,t in re.findall(r'<span class="syw" data-si="(\d+)">(.*?)</span>',doc['text'][c-1][v-1]):
  r=D['words'][id];parts=[]
  for n in r[1]:
   p=dict(zip(D['fields'],D['analyses'][n]));p.update(gl=gloss(p['gloss']))
   # ETCBC lexical consonants, excluding its homonym/punctuation markers.
   ascii_letters=dict(zip('>BGDHWZXVJKLMNS<PYQRCT','אבגדהוזחטיכלמנסעפצקרשת'))
   p['lex']=''.join(ascii_letters.get(x,'')for x in D['analyses'][n][1]);p['stem']=stem(p['lex']);p['surface']=cons(p['form']);parts.append(p)
  main=next((p for p in parts if p['sp']not in('conj','prep','art','pron','prps')),next((p for p in parts if p['sp']=='prep'),next((p for p in parts if p['sp']in('pron','prps')),parts[-1]if parts else None)))
  out.append({'id':id,'form':html.unescape(t),'ref':f'{c}:{v}','parts':parts,'main':main,'surface':cons(html.unescape(t))})
 return out
# Explicit source-reference groups, checked against the actual Hebrew/Syriac texts.
def refs(book,c,v):
 if book=='Exodus'and c==20:
  if v==13:return [(20,k)for k in range(13,17)]
  if v>=14:return [(20,v+3)]
 if book=='Deuteronomy'and c==5:
  if v==17:return [(5,k)for k in range(17,21)]
  if v>=18:return [(5,v+3)]
 if book=='Numbers'and c==26 and v==1:return [(25,19),(26,1)]
 if book=='Deuteronomy'and c==25 and v==2:return [(25,2),(25,3)]
 return [(c,v)]
# Strong→Syriac lemma pairs supported by repeated one-to-one PaTraCoSy links.
counts=collections.defaultdict(collections.Counter);totals=collections.Counter()
heE,heD,_=load('Genesis',lambda e:e['versionTitle'].startswith('Westminster'))
syE,syD,_=load('Genesis',lambda e:e.get('language')=='Syriac')
for ref,r in old.items():
 c,v=map(int,ref.split(':'));H=heb(heD['text'][c-1][v-1]);S=syr(syD,c,v)
 for j,ix in enumerate(r['links']):
  if len(ix)!=1 or not S[j]['main']:continue
  sn=H[ix[0]-1]['sn'];lex=S[j]['main']['lex']
  if sn and lex:counts[sn][lex]+=1;totals[sn]+=1
learned={(sn,lex)for sn,cs in counts.items()for lex,n in cs.items()if n>=3 and n/totals[sn]>=.65}
def similarity(h,s,ot):
 main=s['main'];score=0.;why=''
 def coarse(p):return 'nominal'if p in('subs','nmpr','adjv')else'pron'if p in('pron','prps','prde','prin')else p
 if main and h['sp']!='function'and coarse(h['sp'])!=coarse(main['sp']):return 0.,''
 def take(n,w):
  nonlocal score,why
  if n>score:score,why=n,w
 if len(h['lex'])>=2 and main and h['lex']==main['lex']:take(4.2,'lemma')
 if len(cons(h['form']))>=3 and cons(h['form'])==s['surface']:take(4.4,'surface')
 if main:
  if len(h['stem'])>=3 and h['stem']==main['stem']:take(3.5,'stem')
  if h['gl']&main['gl']:take(3.2,'gloss')
  if (h['sn'],main['lex'])in learned:take(3.8,'genesis-lexicon')
 # Full Onkelos word forms support inflected prepositions and suffixes too.
 if any(len(o.get('word',''))>=2 and o['word']==s['surface']for o in ot):take(4.1,'onkelos-form')
 for o in ot:
  # Bridge only through content-bearing morphemes, never isolated prefix similarity.
  for p in s['parts']:
   if len(o['lex'])>=2 and o['lex']==p['lex']:take(4.,'onkelos-lemma')
   if len(o['stem'])>=3 and o['stem']==p['stem']:take(3.4,'onkelos-stem')
   if o['gl']&p['gl']:take(3.1,'onkelos-gloss')
 return score,why
def align(H,S,A,links):
 # Onkelos supplies candidate MT words, but no link is inherited by position alone.
 ot=collections.defaultdict(list)
 if len(A)==len(links):
  for word,ix in zip(A,links):
   for i in ix:
    if 1<=i<=len(H):ot[i-1].extend({**p,'word':''.join(x['form']for x in word)}for p in word)
 scores=[[similarity(h,s,ot[i])for s in S]for i,h in enumerate(H)]
 n,m=len(H),len(S);D=[[0.]*(m+1)for _ in range(n+1)];B=[[0]*(m+1)for _ in range(n+1)]
 for i in range(1,n+1):
  for j in range(1,m+1):
   best,how=(D[i-1][j],1)if D[i-1][j]>=D[i][j-1]else(D[i][j-1],2)
   score=scores[i-1][j-1][0]
   value=D[i-1][j-1]+score-.3*abs((i-.5)/max(n,1)-(j-.5)/max(m,1))
   if score>=3 and value>best:best,how=value,3
   D[i][j],B[i][j]=best,how
 result=[[]for _ in S];evidence=[''for _ in S];i,j=n,m
 while i and j:
  if B[i][j]==3:result[j-1]=[i];evidence[j-1]=scores[i-1][j-1][1];i-=1;j-=1
  elif B[i][j]==1:i-=1
  else:j-=1
 # A Syriac word can contain two number morphemes (e.g. six-hundred),
 # each supported by lexical evidence for a separate adjacent Hebrew numeral.
 used={i for ix in result for i in ix}
 for j,ix in enumerate(result):
  content={p['lex']for p in S[j]['parts']if p['sp']not in('conj','prep','art','pron')}
  if len(content)<2 or not ix or not H[ix[0]-1]['number']:continue
  for h in [ix[0]-2,ix[0]]:
   if 0<=h<n and h+1 not in used and H[h]['number']and scores[h][j][0]>=3.0 and any(H[h]['gl']&p['gl']for p in S[j]['parts']):
    ix.append(h+1);ix.sort();used.add(h+1);evidence[j]+='+number-morpheme'
 # Explicit relative/preposition morphemes may render a separate adjacent MT word.
 used={i for ix in result for i in ix};prefixes={'834':'D','413':'L','4480':'MN'}
 for j,ix in enumerate(result):
  if not ix:continue
  h=ix[0]-1
  if h>0 and h not in used:
   key=H[h-1]['sn'].split(' ')[0];want=prefixes.get(key)
   partlex={p['lex']for p in S[j]['parts'][:-1]}
   want_he={'D':'ד','L':'ל','MN':'מנ'}.get(want)
   if want_he and want_he in partlex:ix.insert(0,h);used.add(h);evidence[j]+='+prefix'
 return result,evidence
reviews=json.loads((HERE/'reviewed.json').read_text()) if (HERE/'reviewed.json').exists() else {}
out={'version':2,'books':{}};report={'books':[],'method':'Automatic proposals; no gap filling or manual-review claim'}
inputs={f:sha((ROOT/f).read_bytes())for f in ['targum-il.js','targum-lex.js','oshb-lemmas.js','tools/peshitta/alignment/reviewed.json','tools/peshitta/alignment/extend.py']}
for book in BOOKS:
 heE,heD,heSrc=load(book,lambda e:e['versionTitle'].startswith('Westminster'))
 syE,syD,sySrc=load(book,lambda e:e.get('language')=='Syriac')
 otE,otD,otSrc=load(book,lambda e:e['versionTitle'].startswith('Targum Onkelos'))
 data={'version':1,'book':book,'source':{'he':heSrc,'translation':sySrc,'onkelos':otSrc,'inputs':inputs,'method':'Onkelos-supported lexical anchors; automatic, unreviewed'},'verses':{}}
 stat={'book':book,'verses':0,'patracosy':0,'proposals':0,'syWords':0,'linkedSyriac':0,'unlinkedSyriac':0,'unlinkedMT':0,'emptyVerses':[],'referenceGroups':[]}
 for ci,chapter in enumerate(heD['text']):
  for vi,html0 in enumerate(chapter):
   c,v=ci+1,vi+1;ref=f'{c}:{v}';H=heb(html0);native=refs(book,c,v);S=[]
   for a,b in native:
    part=syr(syD,a,b)
    # Syriac 'number' is in 25:3, but corresponds to MT 25:2 ba-mispar.
    if book=='Deuteronomy'and c==25 and v==2 and b==3:part=part[:1]
    elif book=='Deuteronomy'and c==25 and v==3:part=part[1:]
    S.extend(part)
   if book=='Genesis'and ref in old:
    r={**old[ref],'origin':'patracosy','ids':[s['id']for s in S],'refs':[s['ref']for s in S]};stat['patracosy']+=1
   else:
    A=onkelos(otD['text'][ci][vi]);raw=TG[book][ci][vi].split();links=[[]if x=='-'else list(map(int,x.split(',')))for x in raw]
    mapped,evidence=align(H,S,A,links)
    r={'he':[h['form']for h in H],'sy':[s['form']for s in S],'ids':[s['id']for s in S],'refs':[s['ref']for s in S],'links':mapped,'origin':'onkelos-assisted','evidence':evidence};stat['proposals']+=1
   review=reviews.get(book,{}).get(ref)
   if review:
    if review['he']!=r['he']or review['sy']!=r['sy']:raise ValueError('Reviewed verse changed: '+book+' '+ref)
    for j,ix in review['edits'].items():
     j=int(j)-1
     if j<0 or j>=len(r['sy'])or any(i<1 or i>len(H)for i in ix):raise ValueError('Review index out of range')
     r['links'][j]=ix
    r['review']={'by':'Codex','scope':'verse','note':review['note']}
   if native!=[(c,v)]:stat['referenceGroups'].append({'mt':ref,'peshitta':[f'{a}:{b}'for a,b in native]})
   data['verses'][ref]=r;stat['verses']+=1;stat['syWords']+=len(r['sy']);stat['linkedSyriac']+=sum(bool(ix)for ix in r['links']);stat['unlinkedSyriac']+=sum(not ix for ix in r['links']);stat['unlinkedMT']+=len(H)-len({i for ix in r['links']for i in ix})
   if not any(r['links']):stat['emptyVerses'].append(ref)
 if book=='Genesis':data['source']['patracosy']={k:v for k,v in gen['source'].get('patracosy',gen['source']).items()if k in('repo','commit','files','method')}
 out['books'][book]=data;report['books'].append(stat)
(ROOT/'peshitta-alignment-data.js').write_text('// Automatic word-group proposals; see tools/peshitta/alignment/README.md.\nwindow.PESHITTA_ALIGNMENT_DATA='+compact(out)+';\n')
(HERE/'pentateuch-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(compact([{k:v for k,v in s.items()if k not in('referenceGroups','emptyVerses')}for s in report['books']]))
