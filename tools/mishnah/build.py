"""Pilot: source-preserving Digital Mishnah Berakhot extraction and comparison.
Run with a directory containing the three upstream TEI XML files.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import re,json,hashlib,gzip,difflib,sys
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
NS={'t':'http://www.tei-c.org/ns/1.0'};XI='{http://www.w3.org/XML/1998/namespace}id'
COMMIT='39389be30e93032d722e8dd3b7bcdfe15e76a421'
SOURCES=[('K','S07326','Kaufmann A50'),('P','S00483','Parma, de Rossi 138'),('C','S01520','Cambridge Add. 470.1')]
def plain(e):return re.sub(r'\s+',' ',''.join(e.itertext())).strip()
def tag(e):return e.tag.rsplit('}',1)[-1]
def extract(ab):
    chunks=[];annotations=[];offset=0
    def emit(s):
        nonlocal offset
        chunks.append(s);offset+=len(s)
    def walk(e):
        t=tag(e);start=offset
        if t in ['label','fw','note','surplus','del']:
            if t in ['del','surplus']:annotations.append({'tag':t,'attrs':dict(e.attrib),'text':plain(e),'start':start,'end':start})
            return
        if t=='choice':
            chosen=next((e.find('t:'+n,NS) for n in ['abbr','orig','sic'] if e.find('t:'+n,NS) is not None),None)
            if chosen is None:raise ValueError('Unclassified choice')
            walk(chosen);annotations.append({'tag':'choice','attrs':{},'text':plain(chosen),'expansion':plain(e.find('t:expan',NS)) if e.find('t:expan',NS) is not None else '', 'start':start,'end':offset});return
        if t=='gap':
            emit('□');annotations.append({'tag':t,'attrs':dict(e.attrib),'text':'','start':start,'end':offset});return
        if t in ['lb','cb','pb']:
            if e.get('break')!='no':emit(' ')
            return
        if t=='space':return
        emit(e.text or '')
        for c in e:walk(c);emit(c.tail or '')
        if t in ['add','unclear','damage']:annotations.append({'tag':t,'attrs':dict(e.attrib),'text':plain(e),'start':start,'end':offset})
    walk(ab);text=''.join(chunks)
    words=[]
    for m in re.finditer(r"[א-ת□][א-ת\u0591-\u05c7□'’׳\"]*",text):
        flags=[a['tag'] for a in annotations if a['start']<m.end() and a['end']>m.start()]
        w={'text':m.group(),'key':re.sub('[^א-ת]','',m.group()),'flags':sorted(set(flags))}
        for a in annotations:
            if a['tag']=='choice' and a['start']<=m.start() and a['end']>=m.end() and a.get('expansion'):w['key']=re.sub('[^א-ת]','',a['expansion'])
        words.append(w)
    # Character offsets refer to the uncollapsed extract, retained verbatim.
    return {'text':re.sub(r'\s+',' ',text).strip(),'offsetText':text,'words':words,'annotations':annotations,'raw':ET.tostring(ab,encoding='unicode')}
def build(folder=None):
    out={'source':{'project':'Digital Mishnah','commit':COMMIT,'url':'https://github.com/umd-mith/mishnah-data','basis':'corrected diplomatic transcription; abbreviations retained; source expansions used only for comparison'},'witnesses':{},'verses':{},'records':[]}
    for sig,key,name in SOURCES:
        path=Path(folder)/(key+'.xml') if folder else None
        raw=path.read_bytes() if path else gzip.decompress((HERE/'sources'/(key+'.xml.gz')).read_bytes())
        root=ET.fromstring(raw);availability=plain(root.find('.//t:availability',NS));assert 'Creative Commons Attribution International 4.0 License' in availability
        (HERE/'sources'/(key+'.xml.gz')).write_bytes(gzip.compress(raw,mtime=0))
        meta={'id':key,'name':name,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','availability':availability,'sha256':hashlib.sha256(raw).hexdigest(),'url':f'https://github.com/umd-mith/mishnah-data/blob/{COMMIT}/mishnah/{key}.xml','units':{}}
        for ab in root.findall('.//t:body//t:ab',NS):
            ident=ab.get(XI,'');match=re.fullmatch(key+r'\.1\.1\.(\d+)\.(\d+)',ident)
            if not match:continue
            ref=':'.join(match.groups());meta['units'][ref]={'id':ident,**extract(ab)}
        out['witnesses'][sig]=meta
    k=out['witnesses']['K']['units'];out['verses']={ref:{'words':[w['text'] for w in u['words']],'witnessRefs':{}} for ref,u in k.items()}
    # Compare full chapters, not coordinate numbers: Cambridge has two additional units.
    for ch in range(1,10):
        def stream(sig):
            return [(ref,i,w) for ref,u in out['witnesses'][sig]['units'].items() if ref.startswith(str(ch)+':') for i,w in enumerate(u['words'])]
        base=stream('K')
        for sig in ['P','C']:
            other=stream(sig)
            for op,a,b,c,d in difflib.SequenceMatcher(None,[w['key'] for _,_,w in base],[w['key'] for _,_,w in other],autojunk=False).get_opcodes():
                if op=='equal':
                    for ka,pa in zip(base[a:b],other[c:d]):
                        refs=out['verses'][ka[0]]['witnessRefs'].setdefault(sig,[])
                        if pa[0] not in refs:refs.append(pa[0])
                    continue
                left=base[a:b];right=other[c:d];previous=base[a-1] if a else None;following=base[a] if a<len(base) else None
                anchor=left[0][0] if left else (previous or following)[0]
                sourceRefs=list(dict.fromkeys(r for r,_,_ in right))
                if not sourceRefs and c<len(other):sourceRefs=[other[c][0]]
                elif not sourceRefs and c:sourceRefs=[other[c-1][0]]
                known=out['verses'][anchor]['witnessRefs'].setdefault(sig,[])
                for sr in sourceRefs:
                    if sr not in known:known.append(sr)
                unsafe=any('□' in w['text'] or any(f in w['flags'] for f in ['gap','unclear','damage']) for _,_,w in left+right)
                # A blank/damaged witness is never promoted to a lexical omission.
                for nearby in [other[c-1] if c else None,other[d] if d<len(other) else None]:
                    if nearby and ('□' in nearby[2]['text'] or set(nearby[2]['flags'])&{'damage','unclear','gap'}):unsafe=True
                out['records'].append({'ref':anchor,'witness':sig,'operation':op,'base':[[r,i] for r,i,_ in left],'reading':[[r,i] for r,i,_ in right],'sourceRefs':sourceRefs,'after':previous[1] if previous and previous[0]==anchor else -1,'uncertain':unsafe,'method':'chapter sequence comparison (automated)'})
    js='// Digital Mishnah Berakhot pilot. Original TEI and source annotations retained.\nwindow.MISHNAH_TEXTCRIT='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
    (ROOT/'mishnah-textcrit-data.js').write_text(js)
    audit={'commit':COMMIT,'units':{s:len(m['units']) for s,m in out['witnesses'].items()},'records':len(out['records']),'uncertain':sum(r['uncertain'] for r in out['records']),'annotations':{s:sum(len(u['annotations']) for u in m['units'].values()) for s,m in out['witnesses'].items()}}
    (HERE/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n');print(json.dumps(audit))
if __name__=='__main__':build(sys.argv[1] if len(sys.argv)>1 else None)
