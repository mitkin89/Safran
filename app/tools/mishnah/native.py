"""Optional fast implementation of the unchanged chapter-consensus algorithm."""
from pathlib import Path
import subprocess
from align import keys,unsafe
BIN=Path('/tmp/safran-mishnah-align-native')
def align(a,b):
    def encode(k):return ''.join(chr(ord(c)-ord('א')+97) for c in k)
    rows=[f'{len(a)} {len(b)}']
    for w in a+b:
        ks=sorted(keys(w));rows.append(f'{int(unsafe(w))} {len(ks)} '+ ' '.join(encode(k) for k in ks))
    raw=subprocess.run([str(BIN)],input='\n'.join(rows)+'\n',text=True,capture_output=True,check=True).stdout
    result=[]
    for line in raw.splitlines():
        i,p,j,q,k=line.split();i,p,j,q=map(int,(i,p,j,q));result.append({'a':list(range(i,i+p)),'b':list(range(j,j+q)),'boundary':i-1,'kind':k})
    return result
