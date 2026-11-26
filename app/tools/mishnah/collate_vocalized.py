"""Build Berakhot CollateX cache against the existing vocalized reading edition.
No reading text is edited. V00001 IDs denote synthetic comparison tokens, not
manuscript word IDs. Normalization/grouping uses the same project XQuery.
"""
import argparse, gzip, hashlib, json, subprocess, tempfile
from pathlib import Path
import xml.etree.ElementTree as ET
from collate_project import HERE, prepare_query


def generate(upstream, book):
    source = json.loads(gzip.decompress((HERE/'sources/project-collation.json.gz').read_bytes()))
    for file, sha in source['provenance']['sourceHashes'].items():
        assert hashlib.sha256((upstream/file).read_bytes()).hexdigest() == sha, file
    assert book['title'] == 'Mishnah Berakhot'
    with tempfile.TemporaryDirectory(prefix='safran-dm-reading-') as tmp:
        tmp = Path(tmp); tree = ET.Element('reading')
        for ref, unit in book['units'].items():
            ch, m = ref.split(':'); ab = ET.SubElement(tree, 'ab', {'{http://www.w3.org/XML/1998/namespace}id':f'V00001.1.1.{ch}.{m}'})
            for i, word in enumerate(unit['words']):
                ET.SubElement(ab, 'w', {'{http://www.w3.org/XML/1998/namespace}id':f'V00001.1.1.{ch}.{m}.{(i+1)*10:05}'}).text = word['key']
        xml = tmp/'reading.xml'; ET.ElementTree(tree).write(xml, encoding='utf-8')
        query = prepare_query((upstream/'w-sep-to-json-new.xqm').read_text(), tmp.as_uri()+'/').split('\nserialize(map:merge(',1)[0]
        query += '\nserialize(array { for $ab in doc("'+xml.as_uri()+'")//ab return ws2j:buildJSON($ab,"nw") },map {"method":"json"})'
        q, out = tmp/'query.xq', tmp/'tokens.json'; q.write_text(query)
        subprocess.run(['java','-cp',str(upstream/'saxon-he-10.9.jar'),'net.sf.saxon.Query','-q:'+str(q),'-o:'+str(out),'!method=text'],check=True)
        units=json.loads(out.read_text()); chapters={}
        for ch, original in source['chapters'].items():
            tokens=[t for u in units for w in u['witnesses'] for t in w['tokens'] if t['id'].startswith('V00001.1.1.'+ch+'.')]
            witnesses=[{'id':'V00001','tokens':tokens},*original['witnesses']]
            ids=[f'{i+1:03}-'+w['id'] for i,w in enumerate(witnesses)]
            inp, output=tmp/'input.json',tmp/'output.json'
            inp.write_text(json.dumps({'algorithm':'needleman-wunsch','joined':False,'witnesses':[{**w,'id':id} for w,id in zip(witnesses,ids)]},ensure_ascii=False));output.unlink(missing_ok=True)
            subprocess.run(['java','-cp',str(upstream/'*'),'eu.interedition.collatex.tools.CollateX','-a','needleman-wunsch','-f','json','-t','-o',str(output),str(inp)],check=True)
            result=json.loads(output.read_text());permutation=[result['witnesses'].index(id) for id in ids];rows=[[r[i] for i in permutation] for r in result['table']]
            for i,w in enumerate(witnesses):
                assert [t['id'] for t in w['tokens']]==[t['id'] for row in rows for t in (row[i] or [])]
            chapters[ch]={'witnesses':witnesses,'columns':[[[t['id'] for t in (cell or [])] for cell in row] for row in rows]}
            print('vocalized chapter',ch,flush=True)
    reference={k:book[k] for k in ['rel','textHash','versionTitle']}
    provenance={**source['provenance'],'reference':{**reference,'id':'V00001','kind':'existing vocalized reading edition; synthetic comparison IDs'},'basePreparation':'Consonantal word projection; Digital Mishnah buildJSON normalization and grouping'}
    (HERE/'sources/project-vocalized-collation.json.gz').write_bytes(gzip.compress(json.dumps({'provenance':provenance,'witnessSigs':['K','D','P','C'],'chapters':chapters},ensure_ascii=False,separators=(',',':')).encode(),mtime=0))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--upstream-dir',required=True,type=Path);args=parser.parse_args()
    books=json.loads(subprocess.check_output(['node',str(HERE/'export_vocalized.cjs')],text=True))
    generate(args.upstream_dir.resolve(),next(b for b in books if b['title']=='Mishnah Berakhot'))
