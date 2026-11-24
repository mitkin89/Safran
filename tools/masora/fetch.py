#!/usr/bin/env python3
"""Read the public BIMA catalogue and explicitly published CM pages; no credentials or writes to BIMA.
Raw responses are cached outside the repository. Pass --cache and optionally --limit for a pilot.
"""
import argparse, datetime, gzip, hashlib, json, pathlib, subprocess, time, urllib.parse
API='https://api.dev.corpusmasoreticum.de/v1'
PROJECT='7b8ef15f-4ef5-40e6-98cf-bbd5ad401839'
class HttpError(Exception):
    def __init__(self,status):self.status=status;super().__init__('HTTP '+str(status))
def request(url):
    result=subprocess.run(['curl','--silent','--show-error','--location','--max-time','45','--write-out','\n%{http_code}',url],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
    raw,code=result.stdout.rsplit(b'\n',1)
    if int(code)!=200:raise HttpError(int(code))
    return raw
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);parser.add_argument('--catalogue');parser.add_argument('--limit',type=int);parser.add_argument('--pause',type=float,default=1.1);parser.add_argument('--initial-wait',type=float,default=0);args=parser.parse_args()
    cache=pathlib.Path(args.cache);cache.mkdir(parents=True,exist_ok=True)
    catalogue_file=cache/'catalogue.json.gz'
    catalogue=pathlib.Path(args.catalogue).read_bytes() if args.catalogue else gzip.decompress(catalogue_file.read_bytes()) if catalogue_file.exists() else request(API+'/manuscript/published')
    data=json.loads(catalogue)
    assert data.get('success') is True
    provenance_file=cache/'provenance.json'
    provenance=json.loads(provenance_file.read_text(encoding='utf-8')) if provenance_file.exists() else {'retrieved':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'catalogueSha256':hashlib.sha256(catalogue).hexdigest()}
    assert provenance['catalogueSha256']==hashlib.sha256(catalogue).hexdigest(),'A cache must keep its original catalogue; use a new cache for a changed source snapshot'
    catalogue_file.write_bytes(gzip.compress(catalogue,mtime=0))
    provenance_file.write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8',newline='\n')
    selected=[]; unavailable=[]
    for manuscript in data['data']:
        if manuscript.get('published')==0 or not any(p.get('uuid')==PROJECT for p in manuscript.get('projects') or []):continue
        for page in manuscript.get('pages') or []:
            if page.get('published')!=1:continue
            if manuscript['label']=='Wrocław.M.1106':
                unavailable.append({'uuid':page['uuid'],'manuscript':manuscript['label'],'page':page['label'],'reason':'Public structured folio route returns HTTP 404 for sampled folio 095. Public IIIF transcription is token-level without context types or Bible references; not substituted for structured notes.'})
                continue
            selected.append({'manuscript':manuscript['label'],'manuscriptUuid':manuscript['uuid'],'page':page['label'],'uuid':page['uuid']})
    (cache/'unavailable.json').write_text(json.dumps(unavailable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    assert len({p['uuid'] for p in selected})==len(selected)
    if args.limit:selected=selected[:args.limit]
    print('Selected',len(selected),'explicitly published CM pages from',len({p['manuscriptUuid'] for p in selected}),'manuscripts',flush=True)
    (cache/'selection.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    if args.initial_wait:time.sleep(args.initial_wait)
    def fetch(p):
        dest=cache/(p['uuid']+'.json.gz')
        if dest.exists():return {'uuid':p['uuid'],'cached':True}
        # BIMA’s public viewer uses manuscript/page labels; its UUID editor route requires login.
        url=API+'/manuscript-page/'+urllib.parse.quote(p['manuscript'],safe='')+'/'+urllib.parse.quote(p['page'],safe='')
        for attempt in range(4):
            try:
                time.sleep(args.pause)
                raw=request(url);d=json.loads(raw)
                if not d.get('success')and d.get('status')in(401,403,404,429):raise HttpError(d['status'])
                matches=[page for page in d['data']if page.get('uuid')==p['uuid']]
                assert len(matches)==1,'Public viewer did not uniquely resolve the requested page UUID'
                page=matches[0]
                assert d.get('success') is True and page['uuid']==p['uuid'] and page.get('published')==1
                assert page['manuscript']['uuid']==p['manuscriptUuid']
                tmp=dest.with_suffix('.tmp');tmp.write_bytes(gzip.compress(raw,mtime=0));tmp.replace(dest)
                return {'uuid':p['uuid'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
            except Exception as e:
                if isinstance(e,HttpError) and e.status==429:
                    print('Rate limited; waiting',60*(attempt+1),'seconds',flush=True)
                    time.sleep(60*(attempt+1))
                    if attempt==3:raise
                    continue
                if attempt==3 or (isinstance(e,HttpError) and e.status in (401,403,404)):return {'uuid':p['uuid'],'error':str(e)}
                time.sleep(2*(attempt+1))
    results=[]
    for page in selected:
        result=fetch(page);results.append(result)
        if len(results)%50==0 or result.get('error'):print(len(results),'/',len(selected),'errors',sum('error'in r for r in results),flush=True)
    report={'catalogueUrl':API+'/manuscript/published','catalogueSha256':hashlib.sha256(catalogue).hexdigest(),'selection':len(selected),'results':results}
    (cache/'fetch-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');errors=[r for r in results if 'error'in r]
    print('Finished',len(results),'pages;',len(errors),'errors',flush=True)
    if errors:raise SystemExit(1)
if __name__=='__main__':main()
