#!/usr/bin/env python3
"""Import the named, pointed Kaufmann-based Sefaria edition, never merged text.
Downloads are cached byte-for-byte. --offline rebuilds from that cache only.
"""
import argparse, concurrent.futures, hashlib, json, re, time
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
VERSION = "Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri"
SOURCE = 'https://archive.org/details/MishnaCorrectedKaufman00WHOLE'
VOWELS = re.compile('[\u05b0-\u05bb\u05c7]')

def inspect(doc, tractate):
    assert doc['title'] == tractate['title'], 'Wrong tractate'
    assert doc['versionTitle'] == VERSION, 'Wrong edition (merged text is not accepted)'
    assert doc['language'] in ('he', 'Hebrew')
    assert doc.get('license') in ('PD', 'Public Domain') or (doc.get('license') == 'unknown' and tractate['title'] in ("Mishnah Ta'anit", 'Pirkei Avot')), 'Unexpected export rights metadata'
    rights = json.loads((HERE/'source-rights.json').read_text())
    assert rights['licenseUrl'].rstrip('/') == 'http://creativecommons.org/licenses/by-sa/3.0', 'Unverified edition rights'
    assert doc['versionSource'] == SOURCE
    assert doc['categories'] == tractate['categories']
    text = doc['text']
    assert isinstance(text, list) and text and all(isinstance(c,list) for c in text)
    assert all(isinstance(s,str) for c in text for s in c)
    empty, unpointed, segments, pointed, vowels = [], [], 0, 0, 0
    for c,ch in enumerate(text,1):
        for v,s in enumerate(ch,1):
            plain = re.sub('<[^>]*>','',s)
            if not plain.strip(): empty.append(f'{c}:{v}'); continue
            segments += 1
            n = len(VOWELS.findall(plain)); vowels += n
            if n: pointed += 1
            else: unpointed.append(f'{c}:{v}')
    assert pointed and vowels > 100, 'Missing vocalization'
    return {'chapters':len(text),'chapterLengths':[len(c) for c in text],
            'segments':segments,'pointedSegments':pointed,'vowelSigns':vowels,
            'emptyRefs':empty,'unpointedRefs':unpointed}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--offline',action='store_true')
    args=parser.parse_args(); args.cache.mkdir(parents=True,exist_ok=True)
    tractates=json.loads((HERE/'tractates.json').read_text())
    assert len(tractates)==63 and len({t['title'] for t in tractates})==63
    def fetch(t):
        rel='own/'+t['title']+'/he/'+VERSION+'.json'
        url='https://storage.googleapis.com/sefaria-export/'+quote('json/'+'/'.join(t['categories'])+'/'+t['title']+'/Hebrew/'+VERSION+'.json',safe='/')
        cached=args.cache/(t['title']+'.json')
        if cached.exists(): raw=cached.read_bytes()
        else:
            if args.offline: raise FileNotFoundError(cached)
            for attempt in range(3):
                try:
                    with urlopen(url,timeout=45) as response: raw=response.read()
                    break
                except Exception:
                    if attempt==2: raise
                    time.sleep(attempt+1)
            # Validate before retaining a response or touching a bundled edition.
            inspect(json.loads(raw),t); cached.write_bytes(raw)
        doc=json.loads(raw); stats=inspect(doc,t)
        export_license=doc.get('license')
        doc['sefariaExportLicense']=export_license
        doc['license']='CC BY-SA 3.0'
        doc['licenseUrl']='https://creativecommons.org/licenses/by-sa/3.0/'
        doc['attribution']="Rabbi Dan Be'eri, Kaufmann-based Mishnah; digital text by Sefaria."
        bundled=(json.dumps(doc,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
        item={'rel':rel,'title':t['title'],'heTitle':doc['heTitle'],'language':'Hebrew',
              'versionTitle':VERSION,'categories':t['categories'],'kind':'he',
              'hash':hashlib.sha1(bundled).hexdigest()}
        report={'title':t['title'],'rel':rel,'url':url,'sha256':hashlib.sha256(raw).hexdigest(),
                'bytes':len(bundled),'license':doc['license'],'exportLicense':export_license,
                'bundledSha256':hashlib.sha256(bundled).hexdigest(),
                'textSha256':hashlib.sha256(json.dumps(doc['text'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest(),**stats}
        return bundled,item,report
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(fetch,tractates))
    # All 63 must validate before any application file changes.
    manifest_path=ROOT/'bundled/manifest.json'; manifest=json.loads(manifest_path.read_text())
    own_rels={item['rel'] for _,item,_ in results}
    manifest['items']=[it for it in manifest['items'] if it['rel'] not in own_rels]
    for raw,item,_ in results:
        dest=ROOT/'bundled'/item['rel']; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(raw)
        manifest['items'].append(item)
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n')
    report={'edition':VERSION,'versionSource':SOURCE,'catalogueSource':'https://www.sefaria.org/api/index',
            'license':'CC BY-SA 3.0 (original edition)','tractates':len(results),
            'chapters':sum(r['chapters'] for _,_,r in results),
            'segments':sum(r['segments'] for _,_,r in results),
            'pointedSegments':sum(r['pointedSegments'] for _,_,r in results),
            'sources':[r for _,_,r in results]}
    (HERE/'provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='sources'},ensure_ascii=False))
    print('Empty source slots:',sum(len(r['emptyRefs'])for _,_,r in results))
    print('Unpointed source slots:',sum(len(r['unpointedRefs'])for _,_,r in results))
if __name__=='__main__': main()
