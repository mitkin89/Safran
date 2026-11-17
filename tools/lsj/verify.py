# Sichtbaren Text sämtlicher Quellartikel unabhängig vom JavaScript-Renderer prüfen.
# python3 tools/lsj/verify.py <Projektordner> <Quelldatei.dsl>
import gzip, hashlib, json, html, re, sys
from pathlib import Path
root=Path(sys.argv[1]); source=Path(sys.argv[2])
meta=json.loads((root/'tools/lsj/source.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest() == meta['sha256'], 'Andere Quelldatei'
with gzip.open(root/'bundled/dict'/f"{meta['dictionaryId']}.json.gz", 'rt') as f: data=json.load(f)
def flat(s): return re.sub(r'\s+', ' ', s).strip()
# Ohne zwischen Inline-Tags zusätzliche Leerzeichen einzufügen.
def displayed(s): return flat(html.unescape(re.sub(r'<[^>]*>', '', s.replace('</div>', '</div> '))))
index={h: displayed(body) for hs,body in zip(data['heads'],data['html']) for h in hs}
def visible_dsl(s):
 saved=[]
 def escape(m):
  saved.append(m[1]);return chr(0xe000+len(saved)-1)
 s=re.sub(r'\\([\[\]{}()~@\\<>])',escape,s)
 s=re.sub(r'\{\{[\s\S]*?\}\}', '', s)
 s=re.sub(r'<<([^>]*)>>',r'\1',s)
 s=re.sub(r'\[/?[a-z*]+\d?[^\]]*\]', '', s, flags=re.I)
 for i,text in enumerate(saved): s=s.replace(chr(0xe000+i),text)
 return flat(s)
heads=[]; body=[]; count=0; errors=[]; used=set()
def flush():
 global count
 if not heads or not body:return
 expected=visible_dsl(' '.join(body))
 for head in heads:
  h=re.sub(r'\{\{.*?\}\}|\{[^}]*\}', '', head)
  h=re.sub(r'\\([()\[\]{}~@\\])',r'\1',h);h=flat(h)
  count+=1;used.add(h)
  if index.get(h)!=expected:
   errors.append((h, expected[:160],index.get(h,'MISSING')[:160]))
with source.open(encoding='utf-16') as f:
 for raw in f:
  line=raw.rstrip('\r\n')
  if not line.strip() or line.startswith('#'):continue
  if line[0].isspace():body.append(line)
  else:
   if body:flush();heads=[];body=[]
   heads.append(line.strip())
flush()
print('Verglichene Quell-Stichwörter:',count,'Paket-Stichwörter:',len(index),'Textabweichungen:',len(errors))
for e in errors[:10]:print(repr(e))
assert not errors
assert count==115628 and used==set(index)
