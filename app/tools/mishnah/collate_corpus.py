"""Reproduce project token preparation/collation for all licensed Mishnah witnesses.
Input binaries/source are pinned and kept outside the repo; only derived caches
are bundled for offline rebuilds. No external collation service is contacted.
"""
import argparse, gzip, hashlib, json, re, subprocess, tempfile
from pathlib import Path
from collate_project import HERE, prepare_query, SIGS


def prepare_units(upstream, target, witnesses=None):
    expected=json.loads((HERE.parents[2]/'docs/audits/digital-mishnah-2026-11-26/provenance.json').read_text())['sourceHashes']
    for file,sha in expected.items():
        assert hashlib.sha256((upstream/file).read_bytes()).hexdigest()==sha,file
    target.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='safran-mishnah-corpus-') as td:
        td=Path(td);data=td/'data/mishnah/w-sep';data.mkdir(parents=True)
        for sig in SIGS:(data/(sig+'-w-sep.xml')).symlink_to(upstream/(sig+'-w-sep.xml'))
        # Parma Bikkurim 2:8-11: the diplomatic TEI mislabels the first
        # unit as 4:8 and shifts the following numeric IDs. The w-sep copy
        # corrects the first chapter but duplicates 2:8. Use the explicitly
        # encoded MSMishnah milestones 8-11 in the temporary comparison copy.
        parma=(upstream/'S00483-w-sep.xml').read_text()
        pattern=r'<ab\b[^>]*xml:id="S00483\.1\.11\.2\.(?:8|9|10)"[^>]*>.*?</ab>'
        matches=list(re.finditer(pattern,parma,re.S));assert len(matches)==4
        for block in reversed(matches):
            old=re.search(r'xml:id="([^"]+)"',block[0])[1]
            milestone=re.search(r'<milestone\b[^>]*unit="MSMishnah"[^>]*n="([0-9]+)"',block[0])[1]
            assert milestone in ['8','9','10','11']
            new='S00483.1.11.2.'+milestone
            parma=parma[:block.start()]+block[0].replace(old,new)+parma[block.end():]
        copy=data/'S00483-w-sep.xml';copy.unlink();copy.write_text(parma)
        module=prepare_query((upstream/'w-sep-to-json-new.xqm').read_text(),(td/'data').as_uri()+'/').split('\nserialize(map:merge(',1)[0]
        for sig in (witnesses or SIGS):
            output=target/(sig+'-tokens.json')
            query=module+'''\nserialize(array {
for $ab in doc(concat($config:data-root,"mishnah/w-sep/","SIG","-w-sep.xml"))//tei:ab
let $id := string($ab/@xml:id)
where matches($id,"^SIG\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$")
let $parts := tokenize(substring-after($id,"SIG."),"\\.")
return try { map {"coordinate":array {xs:integer($parts[1]),xs:integer($parts[2])},
"ref":concat(xs:integer($parts[3]),":",xs:integer($parts[4])),
"originalId":$id,
"payload":parse-json(ws2j:getTokenData(substring-after($id,"SIG."),("SIG"),"nw"))}}
catch * {map {"originalId":$id,"error":string($err:code),"description":$err:description}}
},map {"method":"json"})'''.replace('SIG',sig)
            q=td/'query.xq';q.write_text(query)
            subprocess.run(['java','-Xmx1600m','-cp',str(upstream/'saxon-he-10.9.jar'),'net.sf.saxon.Query','-q:'+str(q),'-o:'+str(output),'!method=text'],check=True)
            rows=json.loads(output.read_text());errors=[r for r in rows if 'error'in r]
            print(sig,len(rows),'units',len(errors),'errors',flush=True)
            (target/(sig+'-errors.json')).write_text(json.dumps(errors,ensure_ascii=False,indent=2)+'\n')

def cache_path(slug, vocalized=False):
    stem='project-vocalized-collation' if vocalized else 'project-collation'
    return HERE/'sources'/(stem+'.json.gz') if slug=='berakhot' else HERE/'sources'/stem/(slug+'.json.gz')


def prepare_reading(upstream, target, books, catalog):
    import xml.etree.ElementTree as ET
    tree=ET.Element('reading')
    for book in books:
        order,tract=catalog[book['title']]['coordinate']
        for ref,u in book['units'].items():
            ch,m=ref.split(':');prefix=f'V00001.{order}.{tract}.{ch}.{m}'
            ab=ET.SubElement(tree,'ab',{'{http://www.w3.org/XML/1998/namespace}id':prefix})
            for i,w in enumerate(u['words']):
                ET.SubElement(ab,'w',{'{http://www.w3.org/XML/1998/namespace}id':f'{prefix}.{(i+1)*10:05}'}).text=w['key']
    xml=target/'reading.xml';ET.ElementTree(tree).write(xml,encoding='utf-8')
    module=prepare_query((upstream/'w-sep-to-json-new.xqm').read_text(),target.as_uri()+'/').split('\nserialize(map:merge(',1)[0]
    query=module+'''\nserialize(array { for $ab in doc("READING")//ab
let $p := tokenize(substring-after(string($ab/@xml:id),"V00001."),"\\.")
return map {"coordinate":array {xs:integer($p[1]),xs:integer($p[2])},
"ref":concat(xs:integer($p[3]),":",xs:integer($p[4])),"payload":ws2j:buildJSON($ab,"nw")}
},map {"method":"json"})'''.replace('READING',xml.as_uri())
    q=target/'reading.xq';q.write_text(query)
    subprocess.run(['java','-Xmx1600m','-cp',str(upstream/'saxon-he-10.9.jar'),'net.sf.saxon.Query','-q:'+str(q),'-o:'+str(target/'reading-tokens.json'),'!method=text'],check=True)


def unique_comparison_ids(tokens):
    counts={};out=[];last_root=None;last_occurrence=1
    for original in tokens:
        t=dict(original);id=t['id'];root=re.match(r'^([SV][0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)',id)
        assert root,id
        counts[id]=counts.get(id,0)+1
        if t['t']=='--' and root[0]==last_root:
            occurrence=last_occurrence
        else:
            occurrence=counts[id];last_root=root[0];last_occurrence=occurrence
        if occurrence>1:
            t['sourceId']=id;t['id']=id+'-occurrence'+str(occurrence)
        out.append(t)
    assert len({t['id'] for t in out})==len(out)
    return out


def collate_all(upstream, target, reuse_reading=False):
    root=HERE.parents[1]
    catalog=json.loads((root/'mishnah-textcrit-catalog.js').read_text().split('=',1)[1].strip().rstrip(';'))
    books=json.loads(subprocess.check_output(['node',str(HERE/'export_vocalized.cjs')],text=True))
    by_title={b['title']:b for b in books}
    if reuse_reading:
        by_coord={tuple(catalog[b['title']]['coordinate']):b for b in books}
        rows=json.loads((target/'reading-tokens.json').read_text())
        assert len(rows)==sum(len(b['units']) for b in books)
        for row in rows:
            expected=by_coord[tuple(row['coordinate'])]['units'][row['ref']]['words']
            actual=row['payload']['witnesses'][0]['tokens']
            assert [t['t'] for t in actual if t['t']!='--']==[w['key'] for w in expected]
        print('Reusing verified reading-word projection',flush=True)
    else:
        prepare_reading(upstream,target,books,catalog)
    source={}
    for sig in SIGS:
        rows=json.loads((target/(sig+'-tokens.json')).read_text());errors=[r for r in rows if 'error'in r]
        assert not errors,errors
        by_coord={}
        for r in rows:
            key=tuple(r['coordinate']);ref=r['ref']
            assert ref not in by_coord.setdefault(key,{}),(sig,key,ref)
            by_coord[key][ref]=r['payload']['witnesses'][0]['tokens']
        source[sig]=by_coord
    reading={}
    for row in json.loads((target/'reading-tokens.json').read_text()):
        reading.setdefault(tuple(row['coordinate']),{})[row['ref']]=row['payload']['witnesses'][0]['tokens']
    jobs=[];manifest=[];batch=target/'batch';batch.mkdir(exist_ok=True)
    for title,item in catalog.items():
        coord=tuple(item['coordinate']);slug=item['slug'];book=by_title[title]
        def chapter_tokens(units,ch):
            return unique_comparison_ids([t for ref,ts in sorted(units.items(),key=lambda x:tuple(map(int,x[0].split(':')))) if int(ref.split(':')[0])==ch
                    for t in ts if t.get('resp')!='h1' and t.get('transp')!='orig'])
        chapters=sorted({int(ref.split(':')[0]) for sig in SIGS for ref in source[sig].get(coord,{})})
        for vocalized in [False,True]:
            chapter_range=range(1,book['chapters']+1) if vocalized else chapters
            for ch in chapter_range:
                witnesses=([{'id':'V00001','tokens':chapter_tokens(reading.get(coord,{}),ch)}] if vocalized else [])
                witnesses += [{'id':sig,'tokens':chapter_tokens(source[sig].get(coord,{}),ch)} for sig in SIGS]
                ids=[f'{i+1:03}-'+w['id'] for i,w in enumerate(witnesses)]
                active=[i for i,w in enumerate(witnesses) if w['tokens']]
                inp=batch/f'{slug}-{int(vocalized)}-{ch}.input.json';out=inp.with_suffix('.output.json')
                payload={'algorithm':'needleman-wunsch','joined':False,'witnesses':[{**witnesses[i],'id':ids[i]} for i in active]}
                raw=json.dumps(payload,ensure_ascii=False,separators=(',',':'));sha=hashlib.sha256(raw.encode()).hexdigest();stamp=inp.with_suffix('.sha256')
                reuse=out.exists() and stamp.exists() and stamp.read_text()==sha
                if reuse and len(active)>1:
                    try:
                        cached=json.loads(out.read_text())
                        reuse=set(cached['witnesses'])=={ids[i] for i in active} and isinstance(cached['table'],list)
                    except (ValueError,KeyError,TypeError):
                        reuse=False
                inp.write_text(raw);stamp.write_text(sha)
                if not reuse:out.unlink(missing_ok=True)
                if len(active)>1 and not reuse:manifest.append(str(inp)+'\t'+str(out))
                jobs.append((title,item,vocalized,str(ch),witnesses,ids,active,out))
    plan=target/'batch.tsv';plan.write_text('\n'.join(manifest)+'\n')
    runner=target/'MishnahBatch.java';runner.write_text('''
import java.nio.file.*;
public class MishnahBatch {
 public static void main(String[] args) throws Exception {
  int count=0;
  for(String line:Files.readAllLines(Path.of(args[0]))) {
   if(line.isBlank())continue;
   String[] p=line.split("\\t");
   eu.interedition.collatex.tools.CollateX.main(new String[]{"-a","needleman-wunsch","-f","json","-t","-o",p[1],p[0]});
   if(!Files.exists(Path.of(p[1]))||Files.size(Path.of(p[1]))==0)throw new RuntimeException("Collation failed: "+p[0]);
   if(++count%20==0){System.out.println("Collated "+count+" chapters");System.gc();}
  }
 }
}
''')
    print('Collation jobs',len(manifest),'of',len(jobs),flush=True)
    subprocess.run(['java','-Xmx1600m','-cp',str(upstream/'*'),str(runner),str(plan)],check=True)
    provenance=json.loads(gzip.decompress((HERE/'sources/project-collation.json.gz').read_bytes()))['provenance']
    provenance={**provenance,'extractionFixes':['Recursively retain nested orig text','Use abbreviation surface text when an encoded expansion is empty'],
                'scope':'chapter; all standard tractates','coordinateRepairs':['Parma Bikkurim 2:8-11 use encoded MSMishnah labels and physical chapter; original diplomatic IDs retained in source metadata']}
    assembled={}
    for title,item,vocalized,ch,witnesses,ids,active,out in jobs:
        if len(active)>1:
            result=json.loads(out.read_text());assert set(result['witnesses'])=={ids[i] for i in active},(title,ch)
            rows=[]
            for row in result['table']:
                rows.append([row[result['witnesses'].index(ids[i])] if i in active else [] for i in range(len(witnesses))])
        else:
            rows=[[[t] if i==active[0] else [] for i in range(len(witnesses))] for t in witnesses[active[0]]['tokens']] if active else []
        for i,w in enumerate(witnesses):
            before=[t['id'] for t in w['tokens']];after=[t['id'] for row in rows for t in (row[i] or [])]
            assert before==after and len(set(before))==len(before),(title,ch,w['id'],'token order/conservation')
        key=(title,vocalized)
        if key not in assembled:
            meta={**provenance,'coordinate':item['coordinate']}
            if vocalized:
                book=by_title[title];meta['reference']={**{k:book[k] for k in ['rel','textHash','versionTitle']},'id':'V00001','kind':'existing vocalized reading edition; synthetic comparison IDs'}
                meta['basePreparation']='Consonantal projection; Digital Mishnah buildJSON normalization/grouping'
            assembled[key]={'provenance':meta,'witnessSigs':['K','D','P','C'] if vocalized else ['K','P','C'],'chapters':{}}
        assembled[key]['chapters'][ch]={'witnesses':witnesses,'columns':[[[t['id'] for t in (cell or [])] for cell in row] for row in rows]}
    for (title,vocalized),cache in assembled.items():
        path=cache_path(catalog[title]['slug'],vocalized);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(gzip.compress(json.dumps(cache,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
    print('Wrote',len(assembled),'source-bound caches',flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--upstream-dir',required=True,type=Path);p.add_argument('--prepared-dir',required=True,type=Path)
    p.add_argument('--witness',action='append',choices=SIGS);p.add_argument('--collate',action='store_true');p.add_argument('--skip-prepare',action='store_true');p.add_argument('--reuse-reading',action='store_true');a=p.parse_args()
    upstream,target=a.upstream_dir.resolve(),a.prepared_dir.resolve()
    if not a.skip_prepare:prepare_units(upstream,target,a.witness)
    if a.collate:collate_all(upstream,target,a.reuse_reading)
