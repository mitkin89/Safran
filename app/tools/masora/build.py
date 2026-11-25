#!/usr/bin/env python3
"""Build offline, source-preserving text projections of explicitly published BIMA CM pages.
SVG geometry, image data and user-account metadata are excluded. Biblical references identify
BibleText on a page; references in masoretic lists are NOT treated as the note's target verse.
"""
import argparse,collections,gzip,hashlib,json,pathlib,re,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[2]
PROJECT='7b8ef15f-4ef5-40e6-98cf-bbd5ad401839'
LICENSE='CC BY-SA 4.0'
BOOKS={'Gen':'Genesis','Ge':'Genesis','Ex':'Exodus','Exod':'Exodus','Lev':'Leviticus','Lv':'Leviticus','Num':'Numbers','Nu':'Numbers','Deut':'Deuteronomy','Dt':'Deuteronomy','Dtn':'Deuteronomy','Jos':'Joshua','Josh':'Joshua','Jdg':'Judges','Judg':'Judges','Jud':'Judges','Ruth':'Ruth','Rt':'Ruth','1Sam':'I Samuel','1 Sam':'I Samuel','I Sam':'I Samuel','2Sam':'II Samuel','2 Sam':'II Samuel','II Sam':'II Samuel','1 Kings':'I Kings','2 Kings':'II Kings','1 Chronicles':'I Chronicles','2 Chronicles':'II Chronicles','1 Samuel':'I Samuel','2 Samuel':'II Samuel','1Kgs':'I Kings','1 Kgs':'I Kings','I Kings':'I Kings','2Kgs':'II Kings','2 Kgs':'II Kings','II Kings':'II Kings','1Chr':'I Chronicles','1 Chr':'I Chronicles','2Chr':'II Chronicles','2 Chr':'II Chronicles','Ezra':'Ezra','Esr':'Ezra','Neh':'Nehemiah','Esth':'Esther','Est':'Esther','Job':'Job','Hi':'Job','Ps':'Psalms','Psa':'Psalms','Prov':'Proverbs','Pr':'Proverbs','Prv':'Proverbs','Eccl':'Ecclesiastes','Qoh':'Ecclesiastes','Song':'Song of Songs','Cant':'Song of Songs','Isa':'Isaiah','Is':'Isaiah','Jes':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations','Ezek':'Ezekiel','Ez':'Ezekiel','Dan':'Daniel','Dn':'Daniel','Hos':'Hosea','Joel':'Joel','Amos':'Amos','Am':'Amos','Obad':'Obadiah','Ob':'Obadiah','Jonah':'Jonah','Jon':'Jonah','Mic':'Micah','Mi':'Micah','Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Zech':'Zechariah','Hag':'Haggai','Mal':'Malachi'}
for book in list(BOOKS.values()):BOOKS[book]=book

def chapter_keys(label):
    # Only explicit source references; no word matching, page-range interpolation or inferred verse anchors.
    m=re.fullmatch(r'\s*(.+?)\.?\s+(\d+):\d+(?:\s*[-–]\s*(?:(\d+):)?\d+)?\s*',label)
    if not m:return []
    book=BOOKS.get(m[1]);start=int(m[2]);end=int(m[3]or m[2])
    if not book or not 1<=start<=end<=150:return []
    return [book+' '+str(n) for n in range(start,end+1)]

def references(reading):
    return [r['label'] for r in reading.get('references')or[] if isinstance(r,dict) and isinstance(r.get('label'),str)]

def has_transcription(context):
    for r in context.get('readings')or[]:
        if isinstance(r.get('text'),str) and r['text'].strip():return True
        if r.get('notes'):return True
        if any(f.get('status')!=-1 and str(f.get('pathText',f.get('text',''))).strip()for f in r.get('features')or[]):return True
    return bool(context.get('notes'))

def project_context(context):
    # Preserve editorial notes, references, translations, ordering and text as supplied, including empty readings.
    c={k:v for k,v in context.items() if k not in ('readings','children','parent','group','color')}
    c['readings']=[]
    for reading in context.get('readings')or[]:
        r={k:v for k,v in reading.items() if k not in ('features','tokens','bookmark','bimaEditorDraftId','bimaEditorDraftHash')}
        r['features']=[{k:f[k] for k in ('uuid','n','text','pathText','dir','status') if k in f}for f in reading.get('features')or[]]
        c['readings'].append(r)
    return c

def content_fingerprint(contexts):
    values=[[c.get('uuid'),c.get('type'),c.get('label'),[[r.get('uuid'),r.get('text'),references(r),r.get('notes')or[]]for r in c.get('readings')or[]],c.get('notes')or[]]for c in contexts]
    return hashlib.sha256(json.dumps(values,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def hierarchy(nodes):
    return [{k:n[k]for k in ('uuid','parent','group')if k in n}|{'children':hierarchy(n.get('children')or[])}for n in nodes]

def dumps(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def write_js(file,global_name,key,data):
    target='window.'+global_name+'=d;' if key is None else 'window.'+global_name+'=window.'+global_name+'||{};window.'+global_name+'['+dumps(key)+']=d;'
    script='// Corpus Masoreticum / BIMA · '+LICENSE+' · see docs/masora-import.md. Text projection; images excluded.\n'
    script+='(function(d){if(typeof module!=="undefined"&&module.exports){module.exports=d;}else{'+target+'}})('+dumps(data)+');\n'
    file.parent.mkdir(exist_ok=True,parents=True);file.write_text(script,encoding='utf-8',newline='\n')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);parser.add_argument('--partial',action='store_true');args=parser.parse_args()
    cache=pathlib.Path(args.cache);provenance=json.loads((cache/'provenance.json').read_text(encoding='utf-8'));selection=json.loads((cache/'selection.json').read_text(encoding='utf-8'));rawcat=gzip.decompress((cache/'catalogue.json.gz').read_bytes());cat=json.loads(rawcat)['data'];assert provenance['catalogueSha256']==hashlib.sha256(rawcat).hexdigest();byms={m['uuid']:m for m in cat}
    available={p['uuid']for p in selection if (cache/(p['uuid']+'.json.gz')).exists()}
    missing=[p['uuid']for p in selection if p['uuid']not in available]
    if missing and not args.partial:raise SystemExit(str(len(missing))+' selected pages missing; fetch first, or use --partial for development')
    out=ROOT/'masora-data';manuscripts=[];chapters=collections.defaultdict(list);citations=collections.defaultdict(list);audit=[];unparsed=collections.Counter();counts=collections.Counter();types=collections.Counter();indexpages={}
    for msid in dict.fromkeys(p['manuscriptUuid']for p in selection):
        ms=byms[msid];assert ms.get('published')!=0 and any(p.get('uuid')==PROJECT for p in ms.get('projects')or[])
        pages=[]
        for pick in selection:
            if pick['manuscriptUuid']!=msid:continue
            file=cache/(pick['uuid']+'.json.gz')
            if pick['uuid']not in available:continue
            raw=gzip.decompress(file.read_bytes());d=json.loads(raw);matches=[page for page in d['data']if page.get('uuid')==pick['uuid']]
            assert len(matches)==1,'Source page must match the selected UUID exactly'
            page=matches[0]
            assert d.get('success')is True and page['uuid']==pick['uuid'] and page.get('published')==1
            assert page['manuscript']['uuid']==msid
            contexts=[project_context(c)for c in page.get('texts')or[]]
            refs=list(dict.fromkeys(ref for c in contexts if c.get('type')=='BibleText' for r in c['readings']for ref in references(r)))
            keys=list(dict.fromkeys(key for ref in refs for key in chapter_keys(ref)))
            for ref in refs:
                if not chapter_keys(ref):unparsed[ref]+=1
            url='https://bima2.corpusmasoreticum.de/manuscript/'+urllib.parse.quote(ms['label'],safe='')+'/'+urllib.parse.quote(page['label'],safe='')
            normalized={'id':page['uuid'],'label':page['label'],'folio':page.get('folio'),'url':url,'published':1,'progress':page.get('progress'),'updatedAt':page.get('updated_at'),'bibleRefs':refs,'chapters':keys,'contexts':contexts,'hierarchy':hierarchy(page.get('textTree')or[])}
            pages.append(normalized)
            for key in keys:chapters[key].append([msid,page['uuid']])
            counts['pages']+=1;counts['contexts']+=len(contexts)
            if any(c.get('type')in('mp','mm','mf')and has_transcription(c)for c in contexts):counts['pagesWithMasora']+=1
            for c in contexts:
                if c.get('type')!='BibleText':
                    for citation in dict.fromkeys(key for reading in c['readings']for ref in references(reading)for key in chapter_keys(ref)):
                        citations[citation].append([msid,page['uuid'],c['uuid']])
                types[c.get('type','uncategorized')]+=1;counts['readings']+=len(c['readings'])
                if c.get('type')in('mp','mm','mf'):
                    counts['masoraContexts']+=1;counts['masoraReadings']+=len(c['readings'])
                    if has_transcription(c):counts['transcribedMasoraContexts']+=1
            indexpages[page['uuid']]={'manuscript':msid,'label':page['label'],'chapters':keys}
            audit.append({'page':page['uuid'],'manuscript':msid,'published':1,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceBytes':len(raw),'textSha256':content_fingerprint(page.get('texts')or[]),'contexts':len(contexts),'readings':sum(len(c['readings'])for c in contexts),'chapters':keys})
        if not pages:continue
        file='masora-data/'+msid+'.js';write_js(ROOT/file,'MASORA_DATA',msid,{'schema':1,'id':msid,'label':ms['label'],'shelfmark':ms.get('shelfmark'),'attribution':ms.get('attribution'),'pages':pages})
        manuscripts.append({'id':msid,'label':ms['label'],'file':file,'pages':len(pages),'contexts':sum(len(p['contexts'])for p in pages),'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest()})
    counts['manuscripts']=len(manuscripts);counts['pagesWithBibleReferences']=sum(bool(p['chapters'])for p in indexpages.values())
    source={'title':'Corpus Masoreticum / BIMA','url':'https://corpusmasoreticum.de/','catalogueUrl':'https://api.dev.corpusmasoreticum.de/v1/manuscript/published','catalogueSha256':hashlib.sha256(rawcat).hexdigest(),'project':PROJECT,'license':LICENSE,'licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'Corpus Masoreticum, Heidelberg Center for Jewish Studies; linked BIMA manuscript editions','retrieved':provenance['retrieved'],'modifications':'Offline text projection and chapter/page index by Codex. No new transcription, translation or verse-level attribution. Images and SVG geometry excluded.'}
    index={'schema':1,'source':source,'complete':not missing,'requestedPages':len(selection),'counts':dict(counts),'types':dict(types),'manuscripts':manuscripts,'chapters':dict(chapters),'citations':dict(citations),'pages':indexpages}
    write_js(ROOT/'masora-index.js','MASORA_INDEX',None,index)
    unavailable_file=cache/'unavailable.json'
    unavailable=json.loads(unavailable_file.read_text(encoding='utf-8'))if unavailable_file.exists()else[]
    report={'unavailableStructuredPages':unavailable,'schema':1,'source':source,'counts':dict(counts),'types':dict(types),'complete':not missing,'missing':missing,'unparsedBibleReferences':dict(sorted(unparsed.items())),'pages':audit}
    (ROOT/'tools/masora/import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'counts':counts,'types':types,'missing':len(missing),'unparsedReferences':sum(unparsed.values())},ensure_ascii=False))
if __name__=='__main__':main()
