#!/usr/bin/env python3
"""Short English glosses from LSJ (Perseus, CC BY-SA, github.com/PerseusDL/lexica) for Hexapla lemmas that
have none in the LXX lemma list. Writes tools/hexapla/lsj-glosses.json: {lemma (folded): gloss}, only for lemmas that need one.
Run after morph.py, then run morph.py again.
The gloss is the first one or two <tr> renderings of the entry, as LSJ prints them.
Usage: LSJ=/path/to/lexica/CTS_XML_TEI/perseus/pdllex/grc/lsj python3 tools/hexapla/lsj_glosses.py"""
import json,os,pathlib,re,unicodedata,html
ROOT=pathlib.Path(__file__).resolve().parents[2]
LSJ=pathlib.Path(os.environ.get('LSJ','/home/claude/src2/lexica/CTS_XML_TEI/perseus/pdllex/grc/lsj'))
B={'a':'α','b':'β','g':'γ','d':'δ','e':'ε','z':'ζ','h':'η','q':'θ','i':'ι','k':'κ','l':'λ','m':'μ','n':'ν','c':'ξ','o':'ο','p':'π','r':'ρ','s':'σ','t':'τ','u':'υ','f':'φ','x':'χ','y':'ψ','w':'ω','v':'ϝ'}
def fold_beta(k):
  k=re.sub(r'[^a-z]','',k.lower())
  return ''.join(B.get(c,'') for c in k)
def fold(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)[0]=='L').lower().replace('ς','σ')
out={}
for f in sorted(LSJ.glob('*.xml')):
  s=f.read_text(encoding='utf-8')
  for m in re.finditer(r'<entryFree\b[^>]*?key="([^"]+)"[^>]*>(.*?)</entryFree>',s,re.S):
    k=fold_beta(m.group(1))
    if not k or k in out:continue
    trs=[html.unescape(re.sub(r'\s+',' ',t)).strip(' ,;:') for t in re.findall(r'<tr\b[^>]*>([^<]*)</tr>',m.group(2))]
    trs=[t for t in dict.fromkeys(trs) if t and len(t)<60 and t not in ('or','and')][:3]
    if trs:out[k]=', '.join(trs)
# keep only lemmas of hexapla-morph.js that have no gloss from the LXX
t=(ROOT/'hexapla-morph.js').read_text(encoding='utf-8');F=json.loads(t[t.index('{'):t.rstrip().rstrip(';').rindex('}')+1])['F']
want={fold(l) for a in F.values() for l,k,g in a if not g and k[0] not in 'EY'}
out={k:', '.join(v.split(', ')[:2]) for k,v in out.items() if k in want}
(ROOT/'tools/hexapla/lsj-glosses.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'),sort_keys=True),encoding='utf-8')
print(len(out),'LSJ-Glossen')
