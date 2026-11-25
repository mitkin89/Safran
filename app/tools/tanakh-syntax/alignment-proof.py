#!/usr/bin/env python3
"""Verify original OSHB variant markers against every bundled token before projecting syntax."""
import argparse, gzip, hashlib, json, re
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
VERSION='Westminster Leningrad Codex (OSHB, mit Morphologie)'
SPAN=re.compile(r'<span class="w" data-l="[^"]*" data-m="[^"]*">(.*?)</span>')
letters=lambda s:re.sub('[^א-ת]','',s)
def digest(tokens):return hashlib.sha256('\n'.join(f'{r}\t{i}\t{w}' for r,i,w in tokens).encode()).hexdigest()
def metadata(source_dir):
 file=source_dir/'sources.json'
 return json.loads(file.read_text()) if file.exists() else json.loads(gzip.decompress((ROOT/'bundled/syntax-alignment.json.gz').read_bytes()))['source']
def build(source_dir):
 meta=metadata(source_dir);books={}
 for code,book in meta['books'].items():
  raw=(source_dir/(code+'.xml')).read_bytes()
  if hashlib.sha256(raw).hexdigest()!=meta['hashes'][code]:raise ValueError('OSHB checksum: '+code)
  tree=ET.fromstring(raw);parent={c:p for p in tree.iter() for c in p};words=[];verses={};variants=[]
  for v in tree.iter():
   if v.tag.rsplit('}',1)[-1]!='verse':continue
   ref=':'.join(v.get('osisID').split('.')[1:]);start=len(words)
   for w in v.iter():
    if w.tag.rsplit('}',1)[-1]!='w':continue
    kind='ketiv' if w.get('type')=='x-ketiv' else None
    n=w
    while n in parent:
     n=parent[n]
     if n.get('type')=='x-qere':kind='qere'
    if kind:variants.append([len(words),kind,w.get('id')])
    words.append(letters(''.join(w.itertext())))
   verses[ref]=[start,len(words)]
  doc=json.loads((ROOT/'bundled/own'/book/'he'/(VERSION+'.json')).read_text());tokens=[]
  for c,ch in enumerate(doc['text'],1):
   for v,h in enumerate(ch,1):tokens.extend((f'{c}:{v}',i,letters(w)) for i,w in enumerate(SPAN.findall(h)))
  if words!=[x[2] for x in tokens]:raise ValueError('OSHB token stream differs from bundled text: '+book)
  books[book]={'tokenHash':digest(tokens),'tokenCount':len(tokens),'sourceVerses':verses,'variants':variants}
 return {'version':1,'source':{'repository':'https://github.com/openscriptures/morphhb','revision':meta['revision'],'hashes':meta['hashes'],'books':meta['books']},'books':books}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source_dir',type=Path);p.add_argument('--fetch',action='store_true',help='download the checksum-pinned OSHB XML files first');a=p.parse_args()
 if a.fetch:
  from concurrent.futures import ThreadPoolExecutor
  from urllib.request import urlopen
  meta=metadata(a.source_dir);a.source_dir.mkdir(parents=True,exist_ok=True)
  def fetch(code):
   file=a.source_dir/(code+'.xml')
   if not file.exists():
    with urlopen(f"https://raw.githubusercontent.com/openscriptures/morphhb/{meta['revision']}/wlc/{code}.xml",timeout=30)as response:raw=response.read()
    if hashlib.sha256(raw).hexdigest()!=meta['hashes'][code]:raise ValueError('OSHB download checksum: '+code)
    file.write_bytes(raw)
  with ThreadPoolExecutor(max_workers=8)as pool:list(pool.map(fetch,meta['books']))
  (a.source_dir/'sources.json').write_text(json.dumps(meta,indent=2)+'\n')
 data=build(a.source_dir)
 (ROOT/'bundled/syntax-alignment.json.gz').write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
 print(f"Verified original variant markers and complete token order in {len(data['books'])} books")
if __name__=='__main__':main()
