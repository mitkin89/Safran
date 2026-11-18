#!/usr/bin/env python3
"""Digital Kennicott Genesis, licensed TEI -> independent lazy apparatus.
python3 -I tools/kennicott/build.py [downloaded 001_gen.xml]
"""
import gzip,hashlib,html,json,re,sys,xml.etree.ElementTree as E
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FILE=HERE/'001_gen.xml.gz'
NS={'t':'http://www.tei-c.org/ns/1.0'};XML='{http://www.w3.org/XML/1998/namespace}'
URL='https://www.edition-digitalkennicott.unito.it/exist/apps/dike/api/document/001_gen.xml/'
def text(e):return re.sub(r'\s+',' ',''.join(e.itertext())).strip() if e is not None else ''
def local(e):return e.tag.rsplit('}',1)[-1]
def tree(e):
    return {'tag':local(e),'attrs':dict(e.attrib),'text':e.text or '',
            'children':[tree(c) for c in e],'tail':e.tail or ''}
def words(e):return [text(w) for w in e.findall('.//t:w',NS)] if e is not None else []
def heb(s):return ''.join(re.findall('[א-ת]',s))
def build():
    if len(sys.argv)>1:FILE.write_bytes(gzip.compress(Path(sys.argv[1]).read_bytes(),mtime=0))
    raw=gzip.decompress(FILE.read_bytes())
    if b'<!DOCTYPE' in raw or b'<!ENTITY' in raw:raise ValueError('External/inline entity declarations are not accepted')
    root=E.fromstring(raw)
    license_el=root.find('.//t:publicationStmt/t:availability/t:licence',NS)
    if license_el is None or license_el.get('target')!='https://creativecommons.org/licenses/by-nc-sa/4.0/':raise ValueError('Unexpected or missing source licence')
    out={'schema':1,'source':{'url':URL,'sha256':hashlib.sha256(raw).hexdigest(),
        'license':'CC BY-NC-SA 4.0','licenseUrl':license_el.get('target'),
        'title':text(root.find('.//t:title[@type="edition"]',NS)),
        'editors':text(root.find('.//t:titleStmt/t:editor',NS)),
        'base':'Kennicott / Van der Hooght reference text; distinct from OSHB'},
        'glossary':{},'witnesses':{},'base':{},'mt':{},'entries':{},'index':{}}
    for c in root.findall('.//t:charDecl/t:char',NS):out['glossary'][c.get(XML+'id')]=text(c.find('t:desc',NS))
    for c in root.findall('.//t:gloss',NS):out['glossary'][c.get(XML+'id')]=text(c)
    for w in root.findall('.//t:witness',NS):
        ident=w.get(XML+'id');descs=[]
        for desc in w:
            d={'type':'manuscript' if local(desc)=='msDesc' else 'printed edition','description':text(desc),'links':[]}
            for tag in ['settlement','repository','idno','origDate','title','date']:
                values=[text(e) for e in desc.findall('.//t:'+tag,NS)]
                if values:d[tag]=values
            for e in desc.iter():
                if e.get('target') and e.get('target').startswith(('https://','http://')):d['links'].append({'label':text(e) or e.get('type','Quelle'),'url':e.get('target')})
            descs.append(d)
        out['witnesses'][ident]=descs
    source=root.find('.//t:text[@type="source"]/t:body',NS)
    for chapter in source.findall('.//t:div[@type="chap"]',NS):
        for verse in chapter.findall('t:ab',NS):out['base'][f'Genesis {chapter.get("n")}:{verse.get("n")}']=words(verse)
    manifest=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
    mt_item=next(i for i in manifest if i['title']=='Genesis' and i['versionTitle'].startswith('Westminster'))
    mt_raw=(ROOT/'bundled'/mt_item['rel']).read_bytes();mt=json.loads(mt_raw)['text']
    out['source']['mt']={'rel':mt_item['rel'],'sha256':hashlib.sha256(mt_raw).hexdigest(),'license':'CC BY 4.0'}
    for ch,verses in enumerate(mt,1):
        for vs,verse in enumerate(verses,1):out['mt'][f'Genesis {ch}:{vs}']=[html.unescape(re.sub('<[^>]*>','',w)) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',verse)]
    apparatus=root.find('.//t:text[@type="apparatus"]/t:body',NS)
    page=None;count=0;unknown=[]
    for element in apparatus.iter():
        if local(element)=='pb':page=element.get('n')
        if local(element)!='app':continue
        app=element;count+=1;key=f'gen-app-{count}'
        loc=app.get('loc') or app.get('from') or ''
        m=re.fullmatch(r'Gen (\d+):(\d+)',loc)
        if not m:unknown.append({'id':key,'attrs':app.attrib});refs=[]
        else:
            first=(int(m[1]),int(m[2]));last=re.fullmatch(r'Gen (\d+):(\d+)',app.get('to',''))
            end=(int(last[1]),int(last[2])) if last else first
            refs=[f'Genesis {c}:{v}' for c in range(first[0],end[0]+1) for v in range(1,len(mt[c-1])+1) if first<=(c,v)<=end]
        lemma=app.find('t:lem',NS)
        rdgs=[]
        for gi,group in enumerate(app.findall('t:rdgGrp',NS)):
            for ri,rdg in enumerate(group.findall('t:rdg',NS)):
                rdgs.append({'group':gi,'reading':ri,'words':words(rdg),'witnesses':rdg.get('wit','').split(),
                    'terms':[{'text':text(t),'ref':t.get('ref','')} for t in rdg.findall('.//t:term',NS)],
                    'nodes':tree(rdg)})
        entry={'id':key,'refs':refs,'location':dict(app.attrib),'page':page,
               'lemma':words(lemma),'lemmaNode':tree(lemma) if lemma is not None else None,
               'ordinal':[text(t) for t in lemma.findall('.//t:term[@ref="#ord-num"]',NS)] if lemma is not None else [],
               'readings':rdgs,'raw':E.tostring(app,encoding='unicode')}
        out['entries'][key]=entry
        for ref in refs:out['index'].setdefault(ref,[]).append(key)
    out['unlocated']=unknown
    (ROOT/'kennicott-data.js').write_text('/* Digital Kennicott Genesis · CC BY-NC-SA 4.0; tools/kennicott/build.py; OSHB CC BY 4.0 */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.KENNICOTT_DATA=d;})('+json.dumps(out,ensure_ascii=False,separators=(',',':'))+');\n')
    missing=sorted({w[1:] for e in out['entries'].values() for r in e['readings'] for w in r['witnesses'] if w[1:] not in out['witnesses']})
    audit={'source':out['source'],'counts':{'entries':count,'readings':sum(len(e['readings'])for e in out['entries'].values()),'verses':len(out['index']),'witnesses':len(out['witnesses']),'baseVerses':len(out['base'])},'unlocated':unknown,'unidentifiedWitnesses':missing,
        'apparatusRefsWithoutBase':[r for r in out['index'] if not out['base'].get(r)],
        'baseRefsOutsideMT':[r for r in out['base'] if r not in out['mt']]}
    (HERE/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(audit['counts']), 'unknown witness IDs:',len(missing))
if __name__=='__main__':build()
