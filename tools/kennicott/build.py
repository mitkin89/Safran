#!/usr/bin/env python3
"""Digital Kennicott, licensed TEI -> independent lazy apparatus.
python3 -I tools/kennicott/build.py [downloaded 001_gen.xml]
"""
import gzip,hashlib,html,json,re,sys,xml.etree.ElementTree as E
from collections import Counter
from pathlib import Path
import importlib.util
_spec=importlib.util.spec_from_file_location('kennicott_reference_map',Path(__file__).with_name('reference_map.py'))
_reference_map=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_reference_map)
map_references=_reference_map.build
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
def build(filename='001_gen.xml',book='Genesis',input_path=None):
    FILE=HERE/(filename+'.gz')
    URL='https://www.edition-digitalkennicott.unito.it/exist/apps/dike/api/document/'+filename+'/'
    prefix=filename.split('_',1)[1].removesuffix('.xml')
    if input_path:FILE.write_bytes(gzip.compress(Path(input_path).read_bytes(),mtime=0))
    raw=gzip.decompress(FILE.read_bytes())
    if b'<!DOCTYPE' in raw or b'<!ENTITY' in raw:raise ValueError('External/inline entity declarations are not accepted')
    root=E.fromstring(raw)
    title=text(root.find('.//t:titleStmt/t:title',NS))
    aliases={'I Samuel':'1 Samuel','II Samuel':'2 Samuel','I Kings':'1 Kings','II Kings':'2 Kings','I Chronicles':'1 Chronicles','II Chronicles':'2 Chronicles'}
    if title!=aliases.get(book,book):raise ValueError(f'Book title mismatch: {book}: {title}')
    apps=root.findall('.//t:text[@type="apparatus"]//t:app',NS)
    first_loc=(apps[0].get('loc') or apps[0].get('from') or '') if apps else ''
    prefix_match=re.fullmatch(r'(.+) \d+:\d+',first_loc)
    reference_prefix=prefix_match[1] if prefix_match else None
    reference_pattern=re.escape(reference_prefix)+r' (\d+):(\d+)' if reference_prefix else r'(?!)'
    license_el=root.find('.//t:publicationStmt/t:availability/t:licence',NS)
    if license_el is None or license_el.get('target')!='https://creativecommons.org/licenses/by-nc-sa/4.0/':raise ValueError('Unexpected or missing source licence')
    out={'schema':1,'source':{'url':URL,'book':book,'sha256':hashlib.sha256(raw).hexdigest(),
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
        for verse in chapter.findall('t:ab',NS):out['base'][f'{book} {chapter.get("n")}:{verse.get("n")}']=words(verse)
    manifest=json.loads((ROOT/'bundled/manifest.json').read_text())['items']
    mt_item=next(i for i in manifest if i['title']==book and i['versionTitle'].startswith('Westminster'))
    mt_raw=(ROOT/'bundled'/mt_item['rel']).read_bytes();mt=json.loads(mt_raw)['text']
    out['source']['mt']={'rel':mt_item['rel'],'sha256':hashlib.sha256(mt_raw).hexdigest(),'license':'CC BY 4.0'}
    for ch,verses in enumerate(mt,1):
        for vs,verse in enumerate(verses,1):out['mt'][f'{book} {ch}:{vs}']=[html.unescape(re.sub('<[^>]*>','',w)) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',verse)]
    apparatus=root.find('.//t:text[@type="apparatus"]/t:body',NS)
    page=None;count=0;unknown=[]
    for element in apparatus.iter():
        if local(element)=='pb':page=element.get('n')
        if local(element)!='app':continue
        app=element;count+=1;key=f'{prefix}-app-{count}'
        loc=app.get('loc') or app.get('from') or ''
        m=re.fullmatch(reference_pattern,loc)
        if not m:unknown.append({'id':key,'attrs':app.attrib});refs=[]
        else:
            first=(int(m[1]),int(m[2]));last=re.fullmatch(reference_pattern,app.get('to',''))
            end=(int(last[1]),int(last[2])) if last else first
            refs=[f'{book} {first[0]}:{first[1]}'] if not last else [r for r in out['base'] if first<=tuple(map(int,r.rsplit(' ',1)[1].split(':')))<=end]
            if not refs:unknown.append({'id':key,'attrs':app.attrib})
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
    out['referenceMap']=map_references(out['base'],out['mt'])
    out['index']={}
    for entry in out['entries'].values():
        entry['mtRefs']=list(dict.fromkeys(t for r in entry['refs'] for t in out['referenceMap'].get(r,{}).get('refs',[])))
        display=entry['mtRefs'] or [r for r in entry['refs'] if r in out['mt']]
        for ref in display:out['index'].setdefault(ref,[]).append(entry['id'])
    indexed={ident for ids in out['index'].values() for ident in ids}
    out['unindexed']=[ident for ident in out['entries'] if ident not in indexed]
    output=ROOT/('kennicott-data.js' if book=='Genesis' else 'kennicott/'+filename.replace('.xml','.js'))
    output.parent.mkdir(exist_ok=True)
    output.write_text('/* Digital Kennicott '+book+' · CC BY-NC-SA 4.0; tools/kennicott/build.py; OSHB CC BY 4.0 */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.KENNICOTT_BOOKS=Object.assign(window.KENNICOTT_BOOKS||{},'+json.dumps({book:None}).replace('null','d')+');})('+json.dumps(out,ensure_ascii=False,separators=(',',':'))+');\n' if book!='Genesis' else '/* Digital Kennicott Genesis · CC BY-NC-SA 4.0; tools/kennicott/build.py; OSHB CC BY 4.0 */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.KENNICOTT_DATA=d;})('+json.dumps(out,ensure_ascii=False,separators=(',',':'))+');\n')

    missing=sorted({w[1:] for e in out['entries'].values() for r in e['readings'] for w in r['witnesses'] if w[1:] not in out['witnesses']})
    audit={'source':out['source'],'counts':{'entries':count,'readings':sum(len(e['readings'])for e in out['entries'].values()),'verses':len(out['index']),'witnesses':len(out['witnesses']),'baseVerses':len(out['base'])},'unlocated':unknown,'unidentifiedWitnesses':missing,
        'apparatusRefsWithoutBase':[r for r in out['index'] if not out['base'].get(r)],
        'baseRefsOutsideMT':[r for r in out['base'] if r not in out['mt']],
        'unindexedEntries':out['unindexed'],'mappedSourceVerses':len(out['referenceMap']),'unmappedSourceVerses':[r for r in out['base'] if r not in out['referenceMap']],
        'shiftedSourceVerses':{r:m for r,m in out['referenceMap'].items() if m['refs']!=[r]}}
    audit_file=HERE/('audit.json' if book=='Genesis' else 'audit/'+book+'.json')
    audit_file.parent.mkdir(exist_ok=True)
    audit_file.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(book,json.dumps(audit['counts']), 'unknown witness IDs:',len(missing),flush=True)
    return {'file':str(output.relative_to(ROOT)),'source':out['source'],'counts':audit['counts'],'unlocated':len(unknown)}
if __name__=='__main__':
    if '--all' in sys.argv:
        catalog=json.loads((HERE/'catalog.json').read_text());index={'source':catalog['source'],'books':{}}
        folder=Path(sys.argv[sys.argv.index('--all')+1]) if len(sys.argv)>sys.argv.index('--all')+1 else None
        for item in catalog['books']:
            incoming=folder/item['file'] if folder else None
            index['books'][item['book']]=build(item['file'],item['book'],incoming if incoming and incoming.exists() else None)
        (ROOT/'kennicott-index.js').write_text('// Public Digital Kennicott book inventory; lazy source-preserving data.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.KENNICOTT_INDEX=d;})('+json.dumps(index,ensure_ascii=False,separators=(',',':'))+');\n')
    else:build(input_path=sys.argv[1] if len(sys.argv)>1 else None)
