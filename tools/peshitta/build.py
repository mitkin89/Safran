"""Pinned Peshitta text; exact-verse binding of separately segmented Syriac analyses."""
import collections,hashlib,html,json,pathlib,sys,unicodedata
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parent.parent;CACHE=pathlib.Path(sys.argv[1]);C=json.loads((HERE/'sources.json').read_text())
def compact(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def expand(s):
 for part in s.split(','):
  if '-'in part:
   a,b=map(int,part.split('-'));yield from range(a,b+1)
  else:yield int(part)
def feature(repo,name,edge=False):
 lines=(CACHE/repo/(name+'.tf')).read_text().splitlines();start=lines.index('')+1;out={};node=0
 for line in lines[start:]:
  if '\t'in line:
   ns,val=line.split('\t',1);nodes=list(expand(ns))
  else:nodes=[node+1];val=line
  value=list(expand(val))if edge else val.replace('\\n','\n').replace('\\t','\t').replace('\\\\','\\')
  for node in nodes:out[node]=value
 return out
def corpus(repo):
 D={p.stem:feature(repo,p.stem,p.stem=='oslots')for p in (CACHE/repo).glob('*.tf')}
 typ=D['otype'];slots=D['oslots'];book={};chapter={}
 for n,t in typ.items():
  if t=='book':
   for w in slots[n]:book[w]=D.get('book@en',D['book'])[n]
  elif t=='chapter':
   for w in slots[n]:chapter[w]=int(D['chapter'][n])
 verses={}
 for n,t in typ.items():
  if t!='verse':continue
  ws=slots[n];key=(book[ws[0]],chapter[ws[0]],int(D['verse'][n]))
  if key in verses:raise ValueError('duplicate verse '+str(key))
  verses[key]=ws
 return D,verses
for s in C['sources']:
 for f in s['files']:
  b=(CACHE/s['repo'].split('/')[1]/pathlib.Path(f['path']).name).read_bytes()
  if hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()!=f['blob']:raise ValueError(f['path'])
P,PV=corpus('peshitta');M,MV=corpus('syriac')
norm=lambda s:''.join(c for c in unicodedata.normalize('NFC',s)if '\u0710'<=c<='\u072f')
manifest=json.loads((ROOT/'bundled/manifest.json').read_text());manifest['items']=[e for e in manifest['items']if not(e.get('language')=='Syriac'and 'ETCBC Peshitta' in e.get('versionTitle',''))]
canonical={e['title']:e for e in manifest['items']if e['versionTitle'].startswith('Westminster')}
alias={'Samuel_1':'I Samuel','Samuel_2':'II Samuel','Kings_1':'I Kings','Kings_2':'II Kings','Chronicles_1':'I Chronicles','Chronicles_2':'II Chronicles','Song_of_Songs':'Song of Songs','Nehemia':'Nehemiah'}
ma={'I Kings':'1_Kings','II Kings':'2_Kings'}
features=['lex','gloss','sp','vs','vt','ps','gn','nu','vo','st'];bybook=collections.defaultdict(dict);report={'books':[]}
for(book,ch,v),ws in PV.items():
 title=alias.get(book,book)
 if title in canonical:bybook[title][(ch,v)]=ws
assert len(bybook)==39
for title,verses in bybook.items():
 text=[];records={};analyses=[];ai={};matched=0;total=0;unresolved=[];zero={ch for ch,v in verses if v==0}
 for(ch,v),ws in sorted(verses.items()):
  while len(text)<ch:text.append({}if len(text)+1 in zero else[])
  if isinstance(text[ch-1],list):
   while len(text[ch-1])<v:text[ch-1].append('')
  ms=[n for n in MV.get((ma.get(title,title),ch,v),[])if M['g_cons_utf8'].get(n)];base=[P['word'][w]for w in ws];target=[M['g_cons_utf8'][w]for w in ms]
  valid=bool(ms)and ''.join(map(norm,base))==''.join(map(norm,target));spans=[];offset=0
  if valid:
   for w,f in zip(ms,target):
    size=len(norm(f));spans.append((offset,offset+size,w));offset+=size
  offset=0;out=[];count=0
  for w,form in zip(ws,base):
   size=len(norm(form));parts=[];source_ids=[]
   if valid:
    fits=[(a,b,n)for a,b,n in spans if a>=offset and b<=offset+size]
    if fits and fits[0][0]==offset and fits[-1][1]==offset+size:
     for a,b,n in fits:
      data=[M['g_cons_utf8'][n]]+[M[f].get(n,'')for f in features];key=tuple(data)
      if key not in ai:ai[key]=len(analyses);analyses.append(data)
      parts.append(ai[key]);source_ids.append(n)
   count+=bool(parts);records[str(w)]=[form,parts,ch,v,source_ids];offset+=size
   out.append('<span class="syw" data-si="'+str(w)+'">'+html.escape(form)+'</span>'+html.escape(P['trailer'].get(w,'')))
  text[ch-1][str(v)if isinstance(text[ch-1],dict)else v-1]=''.join(out);matched+=count;total+=len(ws)
  if ms and count<len(ws):unresolved.append([ch,v,len(ws)-count])
 h=hashlib.sha256(compact(text).encode()).hexdigest();version='ETCBC Peshitta (Syriac, TF 0.2)'
 source='Peshitta Institute / ETCBC; Vetus Testamentum Syriace. https://github.com/ETCBC/peshitta; https://github.com/ETCBC/syriac. CC BY-NC 4.0. Source references: bundled/peshitta-sources.json. Original Peshitta numbering; critical apparatus not included. Morphology only for matching passages.'
 data={'title':title,'heTitle':canonical[title].get('heTitle',''),'language':'Syriac','versionTitle':version,'versionSource':source,'sectionNames':['Chapter','Verse'],'text':text,'syriacMorphology':{'version':1,'textHash':h,'source':'ETCBC Syriac Corpus 0.92','fields':['form']+features,'analyses':analyses,'words':records,'ownNumbering':True}}
 rel='own/'+title+'/other/'+version+'.json';p=ROOT/'bundled'/rel;p.parent.mkdir(parents=True,exist_ok=True);payload=compact(data);p.write_text(payload)
 manifest['items'].append(dict(rel=rel,title=title,heTitle=data['heTitle'],language='Syriac',versionTitle=version,categories=canonical[title]['categories'],kind='other',hash=hashlib.sha1(payload.encode()).hexdigest()))
 report['books'].append({'title':title,'rel':rel,'verses':len(verses),'words':total,'annotated':matched,'unresolvedAnnotatedPassages':unresolved});print(title,total,matched,flush=True)
(ROOT/'bundled/manifest.json').write_text(compact(manifest));(ROOT/'bundled/peshitta-sources.json').write_text(json.dumps(C,indent=2)+'\n');(HERE/'coverage.json').write_text(json.dumps(report,indent=2)+'\n')
for f in features[2:]:print(f,sorted(set(M[f].values())))
