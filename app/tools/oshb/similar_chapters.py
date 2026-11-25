#!/usr/bin/env python3
"""Similar chapters in the Tanakh (Westminster Leningrad Codex, OSHB) -> similar-chapters.js

Three measures, each for the whole Tanakh and within the same book:
  w  vocabulary: cosine of TF-IDF vectors over the lemmas of nouns, verbs, adjectives and names
     (prepositions, conjunctions, particles, pronouns and the article are left out); the four lemmas that
     contribute most are listed with every hit.
  r  roots: TF-IDF cosine over explicitly assigned lexical root families; language and lexicon ID
     keep homonymous roots distinct. Unmapped lemmas are excluded.
  p  phrases: shared sequences of three lemmas inside a verse, weighted by how rare the sequence is in the
     Tanakh (sequences in more than 40 chapters do not count); the rarest shared phrase are listed.
Output per chapter (key "Book c"): {w:[[key,score,[lemma ids]],…], wb:[…],
  r:[[key,score,[family ids]],…], rb:[…], p:[[key,score,[phrase]],…], pb:[…]},
six hits each, neighbouring chapters included (the app can hide them).
Usage: python3 tools/oshb/similar_chapters.py"""
import json,math,re,pathlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[2]
man=json.loads((ROOT/'bundled/manifest.json').read_text(encoding='utf-8'))
items=[e for e in man['items'] if (e.get('versionTitle') or '').startswith('Westminster')]
order=[e['title'] for e in items]
CONTENT=re.compile(r'^(N|V|A)')                    # OSHB part of speech: noun (incl. Np), verb, adjective
W=re.compile(r'<span class="w" data-l="([^"]*)" data-m="([^"]*)">(.*?)</span>')
phr={};surface={}
chap={}
for e in items:
  d=json.loads((ROOT/'bundled'/e['rel']).read_text(encoding='utf-8'))
  for c,ch in enumerate(d['text']):
    key=f"{e['title']} {c+1}";cnt=collections.Counter();tri=collections.Counter()
    for verse in ch:
      seq=[]
      for l,m,w in W.findall(verse):
        ls=[x.strip() for x in l.split('/')];ms=m[1:].split('/')
        main=next((x for x in ls if re.match(r'\d',x)),None)
        base_ms=[x for x in ms if not x.startswith('S')]
        mm=base_ms[ls.index(main)] if main and ls.index(main)<len(base_ms) else ''
        if not main:continue
        lem=re.match(r'\d+(?: [a-z])?',main).group()
        seq.append((lem,re.sub('<[^>]*>','',w)))
        if CONTENT.match(mm):cnt[lem]+=1
      for i in range(len(seq)-2):
        g=tuple(x[0] for x in seq[i:i+3])
        tri[g]+=1
        surface.setdefault((key,g),re.sub('[\u0591-\u05AF\u05BD\u05C0]','',' '.join(x[1] for x in seq[i:i+3])))
    chap[key]=cnt;phr[key]=tri
root_data=json.loads((ROOT/'tools/oshb/statistics-roots.json').read_text(encoding='utf-8'))
root_map=root_data['roots']
root_labels={f["lang"]+'|'+f["id"]:f["root"] for f in root_map.values()}
root_chap={}
for k,c in chap.items():
  counts=collections.Counter()
  for lemma,n in c.items():
    f=root_map.get(lemma)
    if f:counts[f['lang']+'|'+f['id']]+=n
  root_chap[k]=counts
N=len(chap)
df=collections.Counter(l for c in chap.values() for l in c)
dfp=collections.Counter(g for t in phr.values() for g in t)
idf={l:math.log(N/n) for l,n in df.items()}
vec={}
for k,c in chap.items():
  v={l:(1+math.log(n))*idf[l] for l,n in c.items() if idf[l]>0}
  s=math.sqrt(sum(x*x for x in v.values())) or 1
  vec[k]={l:x/s for l,x in v.items()}
pidf={g:math.log(N/n) for g,n in dfp.items() if n<=40}
pv={k:{g:pidf[g] for g in t if g in pidf} for k,t in phr.items()}
rdf=collections.Counter(r for c in root_chap.values() for r in c)
rv={}
for k,c in root_chap.items():
  v={r:(1+math.log(n))*math.log(N/rdf[r]) for r,n in c.items() if rdf[r]<N}
  norm=math.sqrt(sum(x*x for x in v.values())) or 1
  rv[k]={r:x/norm for r,x in v.items()}
rinv=collections.defaultdict(list)
for k,v in rv.items():
  for r,x in v.items():rinv[r].append((k,x))
book=lambda k:k.rsplit(' ',1)[0]
# inverted index for speed
inv=collections.defaultdict(list)
for k,v in vec.items():
  for l,x in v.items():inv[l].append((k,x))
pinv=collections.defaultdict(list)
for k,v in pv.items():
  for g in v:pinv[g].append(k)
out={}
for k in chap:
  sc=collections.Counter()
  for l,x in vec[k].items():
    for o,y in inv[l]:
      if o!=k:sc[o]+=x*y
  rs=collections.Counter()
  for r,x in rv[k].items():
    for o,y in rinv[r]:
      if o!=k:rs[o]+=x*y
  ps=collections.Counter()
  for g,x in pv[k].items():
    for o in pinv[g]:
      if o!=k:ps[o]+=x
  def top(c,same,n=6):return [o for o,_ in c.most_common() if (book(o)==book(k))==same or not same][:n] if not same else [o for o,_ in c.most_common() if book(o)==book(k)][:n]
  def words(o):return [l for l,_ in sorted(((l,vec[k][l]*vec[o].get(l,0)) for l in vec[k]),key=lambda x:-x[1])[:4] if vec[o].get(l)]
  def phrases(o):
    shared=sorted((g for g in pv[k] if g in pv[o]),key=lambda g:-pidf[g])[:1]
    return [surface[(k,g)] for g in shared]
  pmax=max(ps.values()) if ps else 1
  rec={}
  for name,c,same in (('w',sc,False),('wb',sc,True)):
    rec[name]=[[o,round(c[o],3),words(o)] for o in ([o for o,_ in c.most_common(6)] if not same else top(c,True))]
  for name,c,same in (('p',ps,False),('pb',ps,True)):
    rec[name]=[[o,round(c[o],1),phrases(o)] for o in ([o for o,_ in c.most_common(6)] if not same else top(c,True)) if c[o]>0]
  for name,same in (('r',False),('rb',True)):
    hits=top(rs,same)
    rec[name]=[[o,round(rs[o],3),sorted((r for r in rv[k] if r in rv[o]),key=lambda r:-rv[k][r]*rv[o][r])[:4]] for o in hits if round(rs[o],3)>0]
  out[k]=rec
(ROOT/'similar-chapters.js').write_text('// Ähnliche Kapitel im Tanach: Wortschatz und explizite Lexikonwurzeln (TF-IDF, Kosinus) sowie gemeinsame Wendungen (drei Lemmata); Westminster Leningrad Codex (OSHB, CC BY 4.0). Erzeugt mit tools/oshb/similar_chapters.py\nwindow.SIMILAR_CHAPTERS='+json.dumps({'v':2,'rootSource':root_data['source'],'roots':root_labels,'c':out},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(N,'Kapitel')
