"""Index the bundled Peshitta analyses, preserving lexeme identities and references."""
import json
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
books=[]; lex={}
for p in sorted((root/'app/bundled/own').glob('*/other/ETCBC Peshitta*.json')):
 d=json.loads(p.read_text()); m=d.get('syriacMorphology')
 if not m: continue
 bi=len(books);books.append([d['title'],d['versionTitle']])
 for word in m['words'].values():
  for ai in word[1]:
   a=dict(zip(m['fields'],m['analyses'][ai])); key=a.get('lex')
   if not key: continue
   x=lex.setdefault(key,{'gloss':a.get('gloss',''),'forms':{}})
   grammar=tuple(a.get(f,'') for f in ['sp','vs','vt','ps','gn','nu','vo','st'])
   fk=(a['form'],grammar)
   x['forms'].setdefault(fk,Counter())[(bi,word[2],word[3])]+=1
out={'books':books,'lex':{k:{'gloss':v['gloss'],'forms':[[f,list(g),[list(r)+[n] for r,n in refs.items()]] for (f,g),refs in v['forms'].items()]} for k,v in lex.items()}}
(root/'app/peshitta-word-index.js').write_text('window.PESHITTA_WORD_INDEX='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(books),'books,',len(lex),'lexemes')
