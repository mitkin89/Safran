#!/usr/bin/env python3
"""Read-only corpus-wide technical/OCR screening. Findings require editorial review."""
import collections,hashlib,html,json,pathlib,re
from html.parser import HTMLParser
APP=pathlib.Path(__file__).resolve().parents[2]
DEST=APP/'tools/editorial/reports';DEST.mkdir(parents=True,exist_ok=True)
IMG=re.compile(r'<img\b[^>]*>',re.I)
PAIRS={'abgeschloffen':'abgeschlossen','verschloffenen':'verschlossenen','umschloffen':'umschlossen','gefloffen':'geflossen','orginell':'originell','nähmlich':'nämlich','spezielll':'speziell','Mosaivarbeit':'Mosaikarbeit','Tarteffus':'Tartessus','stattshaft':'statthaft','nacherilische':'nachexilische','nacherilischen':'nachexilischen','firirt':'fixirt','Thronjessel':'Thronsessel','Batersbruder':'Vatersbruder'}
WORDS=re.compile(r'(?<!\w)('+ '|'.join(map(re.escape,PAIRS))+r')(?!\w)')
class Markup(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.problems=[]
 def handle_starttag(self,tag,attrs):
  if tag not in {'br','img','hr','input','meta','link','wbr','source'}:self.stack.append(tag)
 def handle_startendtag(self,tag,attrs):pass
 def handle_endtag(self,tag):
  if tag in {'br','img','hr','input','meta','link','wbr','source'}:return
  if not self.stack or self.stack[-1]!=tag:self.problems.append('unexpected </'+tag+'>')
  else:self.stack.pop()
def leaves(x,p=()):
 if isinstance(x,str):yield ':'.join(map(str,p)),x
 elif isinstance(x,list):
  for i,v in enumerate(x,1):yield from leaves(v,p+(i,))
 elif isinstance(x,dict):
  for k,v in x.items():yield from leaves(v,p+(k,))
 else:raise TypeError(type(x))
def plain(s):return html.unescape(re.sub(r'<[^>]*>',' ',IMG.sub('',s)))
def excerpt(s,pos):return re.sub(r'\s+',' ',s[max(0,pos-65):pos+125])
m=json.loads((APP/'bundled/manifest.json').read_text());items=[i for i in m['items'] if i.get('kind')=='de'];findings=[];inventory=[];images=[]
for item in items:
 p=APP/'bundled'/item['rel'];raw=p.read_bytes();d=json.loads(raw);identifier=hashlib.sha256(item['rel'].encode()).hexdigest()[:16];dup=collections.defaultdict(list);segments=0;nonempty=0;footnotes=0;markers=0
 def issue(ref,kind,detail,context=''):findings.append({'text_id':identifier,'title':item['title'],'ref':ref,'kind':kind,'detail':detail,'context':context})
 if item.get('hash')!=hashlib.sha1(raw).hexdigest():issue('', 'manifest-checksum','Manifest SHA-1 differs from file')
 for ref,text in leaves(d['text']):
  segments+=1;nonempty+=bool(text.strip());footnotes+=text.count('class="footnote"');markers+=text.count('class="footnote-marker"');s=plain(text)
  for tag in IMG.findall(text):images.append({'text_id':identifier,'ref':ref,'tag_sha256':hashlib.sha256(tag.encode()).hexdigest()})
  if '\ufffd' in s:issue(ref,'replacement-character',str(s.count('\ufffd')),excerpt(s,s.find('\ufffd')))
  for hit in WORDS.finditer(s):issue(ref,'known-ocr-candidate',{'before':hit[0],'suggestion':PAIRS[hit[0]]},excerpt(s,hit.start()))
  for hit in re.finditer(r'\b(und|oder|daß|dass|nicht|eine|einen|einem)\s+\1\b',s,re.I):issue(ref,'repeated-word-candidate',hit[0],excerpt(s,hit.start()))
  for hit in re.finditer(r'III\.?\s{2,}\d{2,3}\s+[א-ת]+',s):issue(ref,'print-header-candidate',hit[0],excerpt(s,hit.start()))
  if '<' in text:
   parser=Markup()
   try:parser.feed(IMG.sub('',text));parser.close()
   except Exception as e:parser.problems.append(type(e).__name__)
   if parser.problems or parser.stack:issue(ref,'markup-candidate',{'unexpected':parser.problems[:4],'unclosed':parser.stack[-4:]})
  normalized=re.sub(r'\s+',' ',s).strip()
  if len(normalized)>250:dup[hashlib.sha256(normalized.encode()).hexdigest()].append(ref)
 for digest,refs in dup.items():
  if len(refs)>1:issue(refs[0],'duplicate-paragraph-candidate',{'refs':refs,'plain_sha256':digest})
 inventory.append({'id':identifier,'source':'bundled/'+item['rel'],'title':item['title'],'versionTitle':item['versionTitle'],'sha256':hashlib.sha256(raw).hexdigest(),'segments':segments,'nonempty_segments':nonempty,'footnotes':footnotes,'footnote_markers':markers,'image_count':sum(i['text_id']==identifier for i in images)})
summary={'scope':'All public kind=de bundle entries; automated screening, not complete philological proof-reading. Candidates are not confirmed errors. No text modified.','text_files':len(inventory),'segments':sum(t['segments'] for t in inventory),'nonempty_segments':sum(t['nonempty_segments'] for t in inventory),'images':len(images),'findings_by_kind':dict(collections.Counter(f['kind'] for f in findings))}
report={'summary':summary,'texts':inventory,'images':images,'findings':findings}
(DEST/'german-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
