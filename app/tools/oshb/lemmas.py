import re,json,glob,html
ns='{http://openscriptures.github.com/morphhb/namespace}'
import xml.etree.ElementTree as ET
li={}
for e in ET.parse('lex/LexicalIndex.xml').getroot().iter(ns+'entry'):
    w=e.find(ns+'w'); d=e.find(ns+'def')
    li[e.get('id')]=(w.text if w is not None else '', d.text if d is not None and d.text else '')
aug={w.get('aug'):w.text for w in ET.parse('lex/AugIndex.xml').getroot().iter(ns+'w')}
st={}
for e in ET.parse('lex/HebrewStrong.xml').getroot().iter(ns+'entry'):
    w=e.find(ns+'w'); m=e.find(ns+'meaning')
    st[e.get('id')[1:]]=(w.text if w is not None else '','')
used=set()
for f in glob.glob('src/wlc/*.xml'):
    for l in re.findall(r'lemma="([^"]*)"',open(f,encoding='utf-8').read()):
        for p in l.split('/'):
            if re.match(r'\d',p): used.add(p)
out={};miss=[]
for u in used:
    k=u.replace(' ','').rstrip('+')
    if k in aug and aug[k] in li: out[u]=list(li[aug[k]])
    elif re.sub(r'\D.*','',k) in st: out[u]=list(st[re.sub(r'\D.*','',k)])
    else: miss.append(u)
print(len(used),len(out),miss[:10],len(miss))
json.dump(out,open('out/lemmas.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
