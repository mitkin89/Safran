import concurrent.futures,hashlib,json,pathlib,subprocess,sys
C=json.loads(pathlib.Path(__file__).with_name('sources.json').read_text());dest=pathlib.Path(sys.argv[1])
def fetch(job):
 s,f=job;p=dest/s['repo'].split('/')[1]/pathlib.Path(f['path']).name;p.parent.mkdir(parents=True,exist_ok=True)
 def valid():
  if not p.exists():return False
  b=p.read_bytes();return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==f['blob']
 if not valid():subprocess.run(['curl','-fsSL','--retry','2','--max-time','90','https://raw.githubusercontent.com/'+s['repo']+'/'+s['commit']+'/'+f['path'],'-o',str(p)],check=True)
 if not valid():raise ValueError(str(p))
 return str(p)
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:
 for p in pool.map(fetch,[(s,f)for s in C['sources']for f in s['files']]):print(p,flush=True)
