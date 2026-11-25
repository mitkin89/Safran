"""Exact projection through source-verified OSHB reading paths; no approximate matching."""
import gzip,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(book,doc,span):
 data=json.loads(gzip.decompress((ROOT/'bundled/syntax-alignment.json.gz').read_bytes()));proof=data['books'][book];tokens=[];signatures={}
 for c,ch in enumerate(doc['text'],1):
  for v,h in enumerate(ch,1):
   ref=f'{c}:{v}';ws=[re.sub('[^א-ת]','',w) for w in span.findall(h)];signatures[ref]=' '.join(ws)
   tokens.extend((ref,i,w)for i,w in enumerate(ws))
 digest=hashlib.sha256('\n'.join(f'{r}\t{i}\t{w}'for r,i,w in tokens).encode()).hexdigest()
 if digest!=proof['tokenHash']:raise ValueError('Stale OSHB alignment proof: '+book)
 return data,proof,tokens,signatures

def project(rows,tokens,proof,basis='qere'):
 variant={i:kind for i,kind,_ in proof['variants']};keep=lambda i:variant.get(i)!=('ketiv' if basis=='qere' else 'qere')
 selected=[(i,*t)for i,t in enumerate(tokens)if keep(i)];result={};verified=set()
 def exact(source,target):
  if ''.join(w for _,w in source)!=''.join(t[3] for t in target):return False
  bounds={0:0};pos=0
  for i,t in enumerate(target,1):pos+=len(t[3]);bounds[pos]=i
  pos=0
  for key,w in source:
   end=pos+len(w)
   if pos in bounds and end in bounds and w:
    grouped={}
    for _,ref,at,_ in target[bounds[pos]:bounds[end]]:grouped.setdefault(ref,[]).append(at)
    result[key]=[[r,ids]for r,ids in grouped.items()]
   pos=end
  return True
 if exact([(key,w)for ref,words in rows for key,w in words],selected):verified.update(ref for ref,_ in rows)
 else:
  for ref,words in rows:
   span=proof['sourceVerses'].get(ref)
   if span and exact(words,[t for t in selected if span[0]<=t[0]<span[1]]):verified.add(ref)
 return result,verified
