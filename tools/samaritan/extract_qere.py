#!/usr/bin/env python3
"""Extract OSHB Ketiv/Qere word bundles, validating each full verse against bundled MT.
python3 -I tools/samaritan/extract_qere.py /path/to/xml
Rebuild offline from the archived XML: python3 -I tools/samaritan/extract_qere.py
"""
import gzip,hashlib,json,re,sys,unicodedata,xml.etree.ElementTree as E
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FOLDER=HERE/'mt-qere-source';FOLDER.mkdir(exist_ok=True)
COMMIT='db6c5c9b46b8f39346f10915ddb1a70dcd429901'
BOOKS={'Gen':'Genesis','Exod':'Exodus','Lev':'Leviticus','Num':'Numbers','Deut':'Deuteronomy'}
NS={'t':'http://www.bibletechnologies.net/2003/OSIS/namespace'}
def cons(s):return ''.join(re.findall('[א-ת]',unicodedata.normalize('NFKD',s)))
M=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
out={'source':{'repository':'https://github.com/openscriptures/morphhb','commit':COMMIT,'license':'CC BY 4.0','sha256':{}},'groups':{},'sourceRefs':{},'excluded':[]}
for code,book in BOOKS.items():
 p=FOLDER/(code+'.xml.gz')
 if len(sys.argv)>1:p.write_bytes(gzip.compress((Path(sys.argv[1])/(code+'.xml')).read_bytes(),mtime=0))
 raw=gzip.decompress(p.read_bytes());out['source']['sha256'][p.name]=hashlib.sha256(raw).hexdigest()
 tree=E.fromstring(raw)
 item=next(i for i in M if i['title']==book and i['versionTitle'].startswith('Westminster'))
 mt=json.loads((ROOT/'bundled'/item['rel']).read_text())['text']
 mt_index={}
 for ci,ch in enumerate(mt,1):
  for vi,txt in enumerate(ch,1):
   key=tuple(cons(w) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',txt));mt_index.setdefault(key,[]).append(f'{book} {ci}:{vi}')
 for verse in tree.findall('.//t:verse',NS):
  if not verse.findall('.//t:rdg[@type="x-qere"]',NS):continue
  _,c,v=verse.get('osisID').split('.');c=int(c);v=int(v);ref=f'{book} {c}:{v}'
  words=verse.findall('.//t:w',NS);positions={id(w):i+1 for i,w in enumerate(words)}
  source=[cons(''.join(w.itertext())) for w in words]
  target=[cons(w) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',mt[c-1][v-1])] if c<=len(mt) and v<=len(mt[c-1]) else []
  if source!=target:
   matches=mt_index.get(tuple(source),[])
   if len(matches)!=1:out['excluded'].append(ref);continue
   ref=matches[0]
  out['sourceRefs'][ref]=verse.get('osisID')
  children=list(verse)
  for at,note in enumerate(children):
   qere=note.findall('.//t:rdg[@type="x-qere"]//t:w',NS)
   if not qere:continue
   ketiv=[];j=at-1
   while j>=0 and children[j].get('type')=='x-ketiv':ketiv.insert(0,children[j]);j-=1
   if not ketiv:continue
   group=[positions[id(w)] for w in ketiv+qere]
   if group!=list(range(min(group),max(group)+1)):raise ValueError('Noncontiguous reading group '+ref)
   out['groups'].setdefault(ref,[]).append(group)
(HERE/'mt-qere.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(sum(len(g) for g in out['groups'].values()),'Ketiv/Qere groups;',len(out['excluded']),'source verses not identical to bundled MT (never reused)')
