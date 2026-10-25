import json,hashlib,os,sys
sys.path.insert(0,'.')
import conv
S={'Gen':'Genesis','Exod':'Exodus','Lev':'Leviticus','Num':'Numbers','Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges','1Sam':'I Samuel','2Sam':'II Samuel','1Kgs':'I Kings','2Kgs':'II Kings','Isa':'Isaiah','Jer':'Jeremiah','Ezek':'Ezekiel','Hos':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Jonah':'Jonah','Mic':'Micah','Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai','Zech':'Zechariah','Mal':'Malachi','Ps':'Psalms','Prov':'Proverbs','Job':'Job','Song':'Song of Songs','Ruth':'Ruth','Lam':'Lamentations','Eccl':'Ecclesiastes','Esth':'Esther','Dan':'Daniel','Ezra':'Ezra','Neh':'Nehemiah','1Chr':'I Chronicles','2Chr':'II Chronicles'}
B='/home/claude/sefaria-mac/bundled/'
m=json.load(open(B+'manifest.json',encoding='utf-8'))
meta={}
ref={}
for i in m['items']:
    if i['categories'][:1]==['Tanakh'] and not i['title'].startswith('Rashi'):
        meta.setdefault(i['title'],(i['heTitle'],i['categories']))
        if i['kind']=='de' and i['title'] not in ref:
            d=json.load(open(B+i['rel'],encoding='utf-8')); ref[i['title']]=d['text']
vt="Westminster Leningrad Codex (OSHB, mit Morphologie)"
m['items']=[i for i in m['items'] if i.get('versionTitle')!=vt]
for code,title in S.items():
    he,cats=meta[title]
    d=conv.conv(f'src/wlc/{code}.xml',title,he)
    rel=f"own/{title}/he/{vt}.json"
    os.makedirs(os.path.dirname(B+rel),exist_ok=True)
    open(B+rel,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False))
    h=hashlib.sha1(open(B+rel,'rb').read()).hexdigest()
    m['items'].append({"rel":rel,"title":title,"heTitle":he,"language":"Hebrew","versionTitle":vt,"categories":cats,"kind":"he","hash":h})
    r=ref.get(title)
    nc=len(d['text']); words=sum(s.count('<span') for c in d['text'] for s in c)
    flag=''
    if r and len(r)!=nc: flag=f' CHAPTERS-DIFF de={len(r)}'
    elif r:
        diff=[ci+1 for ci,c in enumerate(d['text']) if ci<len(r) and isinstance(r[ci],list) and len(r[ci])!=len(c)]
        if diff: flag=f' VERSEDIFF chapters {diff[:8]}({len(diff)})'
    print(title,nc,words,flag)
json.dump(m,open(B+'manifest.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
