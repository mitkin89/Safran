"""Extend the pinned, individually licensed three witnesses to all 63 tractates.
Original IDs and TEI are retained; numbering coordinates allow leading zeros.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import re,json,hashlib,gzip,difflib,concurrent.futures,subprocess
import build as pilot,align,native
ROOT=pilot.ROOT;HERE=pilot.HERE;OUT=ROOT/'mishnah-textcrit';OUT.mkdir(exist_ok=True)
def task(job):
    title,coord,slug,witnesses=job
    path=OUT/(slug+'.js');data={'title':title,'coordinate':coord,'source':{'project':'Digital Mishnah','commit':pilot.COMMIT,'url':'https://github.com/umd-mith/mishnah-data','basis':'corrected diplomatic transcription; source numbering; not a mapping to Beeri'},'witnesses':witnesses,'verses':{},'records':[]}
    k=witnesses['K']['units'];data['verses']={ref:{'words':[w['text'] for w in u['words']],'witnessRefs':{}} for ref,u in k.items()}
    chapters=sorted({int(ref.split(':')[0]) for w in witnesses.values() for ref in w['units']})
    for ch in chapters:
        def stream(sig):return [(ref,i,w) for ref,u in witnesses[sig]['units'].items() if ref.startswith(str(ch)+':') for i,w in enumerate(u['words'])]
        base=stream('K')
        if not base:
            data['verses'][f'{ch}:1']={'words':[],'witnessRefs':{},'missingBase':True}
            continue
        for sig in ['P','C']:
            other=stream(sig)
            # No source text in this chapter is a coverage gap, not an omission.
            if not other:continue
            for op,a,b,c,d in difflib.SequenceMatcher(None,[w['key'] for _,_,w in base],[w['key'] for _,_,w in other],autojunk=False).get_opcodes():
                if op=='equal':
                    for ka,pa in zip(base[a:b],other[c:d]):
                        refs=data['verses'][ka[0]]['witnessRefs'].setdefault(sig,[])
                        if pa[0] not in refs:refs.append(pa[0])
                    continue
                left,right=base[a:b],other[c:d];previous=base[a-1] if a else None;following=base[a] if a<len(base) else None
                anchor=left[0][0] if left else (previous or following)[0];refs=list(dict.fromkeys(r for r,_,_ in right))
                if not refs and c<len(other):refs=[other[c][0]]
                elif not refs and c:refs=[other[c-1][0]]
                known=data['verses'][anchor]['witnessRefs'].setdefault(sig,[])
                for sr in refs:
                    if sr not in known:known.append(sr)
                unsafe=any(align.unsafe(w) for _,_,w in left+right)
                for near in [other[c-1] if c else None,other[d] if d<len(other) else None]:
                    if near and align.unsafe(near[2]):unsafe=True
                data['records'].append({'ref':anchor,'witness':sig,'operation':op,'base':[[r,i] for r,i,_ in left],'reading':[[r,i] for r,i,_ in right],'sourceRefs':refs,'after':previous[1] if previous and previous[0]==anchor else -1,'uncertain':unsafe,'method':'chapter sequence comparison (automated)'})
    data['interlinear']=align.build(data,{},chapters=chapters,aligner=native.align)
    # An entirely unavailable witness/chapter must not yield apparent omissions.
    for ch in chapters:
        for sig in ['P','C']:
            if not any(r.startswith(str(ch)+':') for r in witnesses[sig]['units']):
                data['interlinear']['chapters'][str(ch)][sig]={'links':[],'open':[],'unavailable':True}
    path.write_text('// Digital Mishnah: source-preserving automated comparison.\nwindow.MISHNAH_TEXTCRIT_BOOKS=window.MISHNAH_TEXTCRIT_BOOKS||{};window.MISHNAH_TEXTCRIT_BOOKS['+json.dumps(title)+']='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
    return {'title':title,'coordinate':coord,'slug':slug,'file':'mishnah-textcrit/'+slug+'.js','chapters':max(chapters),'witnesses':{s:len(w['units']) for s,w in witnesses.items()},'words':{s:sum(len(u['words']) for u in w['units'].values()) for s,w in witnesses.items()},'alignment':data['interlinear']['counts'],'missingBaseChapters':[ch for ch in chapters if data['verses'].get(f'{ch}:1',{}).get('missingBase')]}
def main():
    subprocess.run(['g++','-O3','-std=c++17',str(HERE/'align_native.cpp'),'-o',str(native.BIN)],check=True)
    manifest=json.loads((ROOT/'bundled/manifest.json').read_text());titles=[e['title'] for e in manifest['items'] if e.get('versionTitle')=="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri"]
    assert len(titles)==63 and len(set(titles))==63
    assigned=json.loads((HERE/'tractates.json').read_text());assert len(assigned)==63
    mapping={tuple(r['coordinate']):r['title'] for r in assigned};assert set(mapping.values())==set(titles)
    titles=list(mapping.values())
    allw={coord:{} for coord in mapping};excluded=[]
    for sig,key,name in pilot.SOURCES:
        raw=gzip.decompress((HERE/'sources'/(key+'.xml.gz')).read_bytes());root=ET.fromstring(raw);availability=pilot.plain(root.find('.//t:availability',pilot.NS));assert 'Creative Commons Attribution International 4.0 License' in availability
        common={'id':key,'name':name,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','availability':availability,'sha256':hashlib.sha256(raw).hexdigest(),'url':f'https://github.com/umd-mith/mishnah-data/blob/{pilot.COMMIT}/mishnah/{key}.xml'}
        for coord in mapping:allw[coord][sig]={**common,'units':{}}
        for div in root.findall('.//t:body//t:div2',pilot.NS):
            dm=re.fullmatch(key+r'\.(\d+)\.(\d+)',div.get(pilot.XI,''));coord=tuple(map(int,dm.groups())) if dm else None
            if coord not in mapping:excluded.append({'witness':sig,'container':div.get(pilot.XI),'reason':'No corresponding standard tractate (e.g. additional Arayot)'});continue
            units=allw[coord][sig]['units']
            for ab in div.findall('.//t:ab',pilot.NS):
                ident=ab.get(pilot.XI,'');m=re.fullmatch(key+r'\.(\d+)\.(\d+)\.(\d+)\.(\d+)',ident)
                if not m:excluded.append({'witness':sig,'id':ident,'reason':'Nonstandard source ID'});continue
                order,tract,ch,unit=map(int,m.groups());assert (order,tract)==coord,(ident,coord)
                ref=f'{ch}:{unit}';assert ref not in units,(sig,coord,ref)
                units[ref]={'id':ident,**pilot.extract(ab)}
            allw[coord][sig]['units']=dict(sorted(units.items(),key=lambda x:tuple(map(int,x[0].split(':')))))
    jobs=[];catalog={}
    for coord,title in mapping.items():
        slug=re.sub('[^a-z0-9]+','-',title.lower()).strip('-')
        if coord==(1,1):catalog[title]={'title':title,'coordinate':list(coord),'slug':'berakhot','file':'mishnah-textcrit-data.js','chapters':9,'witnesses':{'K':57,'P':57,'C':59},'words':{sig:sum(len(u['words']) for u in w['units'].values()) for sig,w in allw[coord].items()},'alignment':json.loads((HERE/'audit.json').read_text())['interlinear'],'missingBaseChapters':[]};continue
        assert allw[coord]['K']['units'],title
        jobs.append((title,list(coord),slug,allw[coord]))
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool:
        futures=[pool.submit(task,j) for j in jobs]
        for f in concurrent.futures.as_completed(futures):
            item=f.result();catalog[item['title']]=item;print('Built',item['title'],flush=True)
    catalog=dict((title,catalog[title]) for title in titles)
    (ROOT/'mishnah-textcrit-catalog.js').write_text('// Pinned Digital Mishnah witness coverage.\nwindow.MISHNAH_TEXTCRIT_CATALOG='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
    (HERE/'corpus-audit.json').write_text(json.dumps({'commit':pilot.COMMIT,'tractates':list(catalog.values()),'excludedContainers':excluded},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
