"""Explicit HebrewLexicon root families; no root inferred from consonantal spelling."""
from pathlib import Path
import gzip,hashlib,json,re,sys,xml.etree.ElementTree as E
HERE=Path(__file__).parent;ns={'t':'http://openscriptures.github.com/morphhb/namespace'}
commit='21c9add13bc727d3a951361778e97e3ff7afd1ce'
files={}
for name in ['LexicalIndex','AugIndex']:
 p=HERE/'statistics-sources'/(name+'.xml.gz')
 if len(sys.argv)>1:
  raw=(Path(sys.argv[1])/('safran-'+name+'.xml')).read_bytes();p.write_bytes(gzip.compress(raw,mtime=0))
 else:raw=gzip.decompress(p.read_bytes())
 files[name]=(raw,E.fromstring(raw))
entries={};langs={}
for part in files['LexicalIndex'][1].findall('t:part',ns):
 for e in part.findall('t:entry',ns):entries[e.get('id')]=e;langs[e.get('id')]=part.get('{http://www.w3.org/XML/1998/namespace}lang')
def family(key,seen=()):
 if key in seen or key not in entries:return None
 et=entries[key].find('t:etym',ns)
 if et is None:return None
 root=et.get('root')
 if root and et.get('type')=='main':return {'id':key,'root':root,'lang':langs[key]}
 parents=(et.text or '').strip()
 if et.get('type')=='sub' and parents in entries:return family(parents,seen+(key,))
 return None
roots={}
for w in files['AugIndex'][1].findall('t:w',ns):
 f=family((w.text or '').strip())
 if f:roots[w.get('aug')]=f
out={'source':{'repository':'https://github.com/openscriptures/HebrewLexicon','commit':commit,'license':'CC BY 4.0','files':{k:hashlib.sha256(v[0]).hexdigest() for k,v in files.items()}},'roots':roots}
(HERE/'statistics-roots.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n');print('Explicit root mappings:',len(roots))
