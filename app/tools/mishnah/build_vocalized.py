"""Align the actual vocalized reading edition directly to Parma and Cambridge.
The diplomatic corpus remains unmodified; no inherited links or review claims.
"""
from pathlib import Path
import json,subprocess,concurrent.futures,gzip
import project_align
import build as pilot,align,native
ROOT=pilot.ROOT;HERE=pilot.HERE
OUT=ROOT/'mishnah-vocalized';OUT.mkdir(exist_ok=True)
def task(job):
    book,item=job
    raw=(ROOT/item['file']).read_text();original=json.loads(raw[raw.index('=')+1:].strip().rstrip(';')) if item['file']=='mishnah-textcrit-data.js' else json.loads(raw.split(']=',1)[1].strip().rstrip(';'))
    data={'title':book['title'],'source':{k:book[k] for k in ['rel','textHash','versionTitle']},'witnesses':{'K':{'name':'Kaufmann · vokalisierte Lesefassung','units':book['units']},**{s:original['witnesses'][s] for s in ['P','C']}},'verses':{r:{} for r in book['units']}}
    chapters=range(1,book['chapters']+1)
    if book['title']=='Mishnah Berakhot':
        cache=json.loads(gzip.decompress((HERE/'sources/project-vocalized-collation.json.gz').read_bytes()))
        for key in ['rel','textHash','versionTitle']:
            assert cache['provenance']['reference'][key]==book[key], 'Vocalized project cache source changed: '+key
        data['witnesses']['K']['id']='V00001'
        result=project_align.build(data,{},cache)
    else:
        result=align.build(data,{},chapters=chapters,aligner=native.align)
    for ch in chapters:
        for s in ['P','C']:
            if not any(r.startswith(str(ch)+':') for r in data['witnesses'][s]['units']):result['chapters'][str(ch)][s]={'links':[],'open':[],'unavailable':True}
    # Keep all original source positions, including chapters absent from the reader.
    extras={s:[r for r in original['witnesses'][s]['units'] if int(r.split(':')[0])>book['chapters']] for s in ['P','C']}
    output={'title':book['title'],'source':data['source'],'base':book['units'],'witnessSha256':{s:original['witnesses'][s]['sha256'] for s in ['P','C']},'interlinear':result,'outsideReadingChapters':extras}
    file='mishnah-vocalized/'+item['slug']+'.js'
    (ROOT/file).write_text('window.MISHNAH_VOCALIZED=window.MISHNAH_VOCALIZED||{};window.MISHNAH_VOCALIZED['+json.dumps(book['title'])+']='+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n')
    return book['title'],{'file':file,'rel':book['rel'],'textHash':book['textHash'],'chapters':book['chapters'],'words':sum(len(u['words']) for u in book['units'].values()),'alignment':result['counts'],'outsideReadingChapters':extras}
def main():
    subprocess.run(['g++','-O3','-std=c++17',str(HERE/'align_native.cpp'),'-o',str(native.BIN)],check=True)
    books=json.loads(subprocess.check_output(['node',str(HERE/'export_vocalized.cjs')],text=True))
    catraw=(ROOT/'mishnah-textcrit-catalog.js').read_text();catalog=json.loads(catraw.split('=',1)[1].strip().rstrip(';'))
    jobs=[(b,catalog[b['title']]) for b in books];out={}
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool:
        for title,item in pool.map(task,jobs):out[title]=item;print('Aligned',title,flush=True)
    (ROOT/'mishnah-vocalized-catalog.js').write_text('window.MISHNAH_VOCALIZED_CATALOG='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
    (HERE/'vocalized-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
