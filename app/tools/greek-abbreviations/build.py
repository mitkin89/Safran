#!/usr/bin/env python3
"""Extract factual abbreviation mappings from Logeion's published LSJ/Pape lists.
Usage: python3 tools/greek-abbreviations/build.py /tmp/logeion-app.js
Requires lxml. Does not modify dictionary packages or article text.
"""
import ast,collections,gzip,hashlib,json,re,sys
from pathlib import Path
from lxml import html
ROOT=Path(__file__).resolve().parents[2]
app=Path(sys.argv[1]).read_text()
canon=lambda s: re.sub(r'\s+','',s.strip()).rstrip('.')
plain=lambda s:' '.join(s.split()).strip(' ,;')
def add(m,k,v):
 k=canon(k);v=plain(v)
 if k and v and re.search(r'[A-Za-zΑ-ω]',k) and len(k)<70:
  if v not in m.setdefault(k,[]):m[k].append(v)
def title(s):
 return re.split(r',?\s+(?:ed\.|Ed\.|edited|cited|v\.\s)|\s*\(ed\.',plain(s))[0].rstrip(' ,;.')[:240]
def extract(n):
 m=re.search(r'a\.put\("views/'+n+r'\.abbreviations\.html",(\'(?:\\.|[^\'\\])*\')',app)
 return ast.literal_eval(m[1])
out={}
for name in ['lsj','pape']:
 source=extract(name);r=html.fromstring(source);terms={};authors={};works={};author=None
 if name=='lsj':
  author_source=source.split('II. Epigraphical Publications')[0]
  for li in html.fromstring(author_source).xpath('//li'):
   t=plain(li.text_content());b=li.find('b')
   if b is not None:
    author=plain(b.text_content());works.setdefault(author,{})
    prefix=t.split(author,1)[1];prefix=re.split(r'\b(?:Ed\.|ed\.)',prefix)[0]
    aliases=re.findall(r'\[([^\]]+)\]',prefix)
    for alias in aliases[:1]:
     for a in re.split(r'\s*=\s*',alias):
      if re.search('[A-Za-z]',a):add(authors,a,author)
    if not aliases and len(author.split())==1:add(authors,author,author)
   elif author and '=' in t:
    k,v=t.split('=',1)
    if len(k)<65:
     for key in k.split(','):add(works[author],key,title(v))
  # Epigraphical, papyrological and journal references are independent of author.
  pos=source.find('II. Epigraphical Publications')
  for li in html.fromstring('<div>'+source[pos:]+'</div>').xpath('//li'):
   t=plain(li.text_content())
   if '=' in t:
    k,v=t.split('=',1)
    if len(k)<65:add(terms,k,title(v))
  # Retain every supplied definition already embedded by the original importer.
  d=json.load(gzip.open(ROOT/'bundled/dict/0c00a5de7c2b.json.gz','rt'))
  for article in d['html']:
   for m in re.finditer(r'<abbr class="gab" data-t="([^"]+)">([^<]+)</abbr>',article):
    import html as html_std
    add(terms,html_std.unescape(m[2]),html_std.unescape(m[1]))
 else:
  for li in r.xpath('//li'):
   t=plain(li.text_content());m=re.match(r'(\S+)\s+(.+)',t)
   if not m:continue
   k,v=m.groups();b=li.find('b')
   if b is not None and re.match(r'^[A-Z]',k) and not k.startswith('Ep'):
    names=[plain(x.text_content()) for x in li.findall('b')]
    for a in names:add(authors,k,a);works.setdefault(a,{})
    author=names[0]
    for i in li.findall('i'):
     txt=plain(i.text_content())
     if '=' not in txt:continue
     keys,val=txt.split('=',1)
     for key in re.split(r',|\s+od\.\s+',keys):add(works[author],key,title(val))
   else:add(terms,k,v)
 out[name]={'terms':terms,'authors':authors,'works':works}
# Pape's front matter omits transparent dialogue titles; cross-register only
# the same named author's documented titles, preserving conflicting expansions.
for author,ws in out['pape']['works'].items():
 for k,values in out['lsj']['works'].get(author,{}).items():
  for value in values:add(ws,k,value)
supp=json.loads((ROOT/'tools/greek-abbreviations/supplement.json').read_text())
for lex,sections in supp.items():
 for section,entries in sections.items():
  if section=='works':
   for author,ws in entries.items():
    target=out[lex]['works'].setdefault(author,{})
    for k,v in ws.items():
     for value in ([v] if isinstance(v,str) else v):add(target,k,value)
  else:
   for k,v in entries.items():
    for value in ([v] if isinstance(v,str) else v):add(out[lex][section],k,value)
metadata={'sources':[{'url':'https://logeion.uchicago.edu/abbreviations/'+n,'templateSha256':hashlib.sha256(extract(n).encode()).hexdigest()} for n in ['lsj','pape']],'description':'Abbreviation, author and work titles extracted from published front-matter lists; contextual ambiguity is preserved.'}
data={'metadata':metadata,**out}
payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
(ROOT/'greek-abbreviations-data.js').write_text('// Published abbreviation lists; see tools/greek-abbreviations/README.md.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.GreekAbbreviationsData=d;})('+payload+');\n')
print({lex:{k:len(v) for k,v in sections.items()} for lex,sections in out.items()})
