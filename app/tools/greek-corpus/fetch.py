"""Fetch only Josephus/Philo payloads; verify immutable content before building."""
import concurrent.futures, gzip, hashlib, json, pathlib, subprocess, sys
C=json.loads(pathlib.Path(__file__).with_name('sources.json').read_text())
DEST=pathlib.Path(sys.argv[1]);DEST.mkdir(parents=True,exist_ok=True)
def fetch(job):
    name,url,kind,expected=job;p=DEST/name
    def valid():
        if not p.exists():return False
        data=p.read_bytes()
        if kind=='annotation':return hashlib.sha256(gzip.decompress(data)).hexdigest()==expected
        return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==expected
    try:
        if valid():return name
    except (OSError,EOFError):pass
    subprocess.run(['curl','-fsSL','--retry','2','--max-time','90',url,'-o',str(p)],check=True)
    if not valid():raise ValueError('Source checksum mismatch: '+name)
    return name
jobs=[]
for w in C['works']:
    jobs.append((w['id']+'.text.jsonl','https://raw.githubusercontent.com/open-greek/open-greek-corpus/'+C['corpusCommit']+'/'+w['textPath'],'text',w['textBlob']))
    jobs.append((w['id']+'.oga.jsonl.gz','https://huggingface.co/datasets/ciscoriordan/open-greek-corpus-annotation-exports/resolve/main/oga-v1/works/'+w['annotationFile'],'annotation',w['annotationSha256']))
m=C['manual'];jobs.append(('war.manual.jsonl.gz','https://huggingface.co/datasets/ciscoriordan/open-greek-corpus-annotation-exports/resolve/main/glaux-v1/works/'+m['file'],'annotation',m['sha256']))
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:
    for name in pool.map(fetch,jobs):print(name,flush=True)
