"""Match independent verse boundaries by complete consonantal streams.
No source text is changed. Repeated streams require neighboring verse anchors.
"""
import re
from collections import defaultdict

def cons(s):return ''.join(re.findall('[א-ת]',s)).translate(str.maketrans('ךםןףץ','כמנפצ'))
def build(base,mt):
    src=list(base);dst=list(mt);pos={r:i for i,r in enumerate(dst)}
    a=[cons(''.join(base[r])) for r in src];b=[cons(''.join(mt[r])) for r in dst]
    target=defaultdict(list)
    for j in range(len(dst)):
        for n in range(1,5):
            if j+n<=len(dst) and all(b[j:j+n]):target[''.join(b[j:j+n])].append(tuple(dst[j:j+n]))
    candidates=[set(target.get(s,[])) if s else set() for s in a]
    joined=set()
    single=defaultdict(list)
    for j,s in enumerate(b):
        if s:single[s].append(dst[j])
    for i in range(len(src)):
        for n in range(2,5):
            if i+n>len(src) or not all(a[i:i+n]):continue
            refs=single.get(''.join(a[i:i+n]),[])
            if len(refs)==1:
                for k in range(i,i+n):candidates[k].add((refs[0],));joined.add(k)
    out={src[i]:{'refs':list(next(iter(c))),'method':'complete consecutive verse text' if i in joined else 'complete verse text'} for i,c in enumerate(candidates) if len(c)==1}
    for _ in range(4):
        changed=False
        for i,c in enumerate(candidates):
            if src[i] in out or not c:continue
            prev=out.get(src[i-1]) if i else None;nxt=out.get(src[i+1]) if i+1<len(src) else None
            if not prev and not nxt:continue
            valid=[r for r in c if (not prev or pos[r[0]] in (pos[prev['refs'][-1]],pos[prev['refs'][-1]]+1)) and (not nxt or pos[r[-1]] in (pos[nxt['refs'][0]],pos[nxt['refs'][0]]-1))]
            if len(valid)==1:out[src[i]]={'refs':list(valid[0]),'method':'complete repeated verse text with adjacent anchors'};changed=True
        if not changed:break
    # Different reference-text spellings may keep the same coordinate only
    # when a verified neighboring verse and a strong whole-verse match agree.
    for i,r in enumerate(src):
        if r in out or r not in mt:continue
        aa=[cons(w) for w in base[r] if cons(w)];bb=[cons(w) for w in mt[r] if cons(w)]
        if min(len(aa),len(bb))<4:continue
        prev=out.get(src[i-1]) if i else None;nxt=out.get(src[i+1]) if i+1<len(src) else None
        neighbor=(prev and pos[prev['refs'][-1]]==pos[r]-1) or (nxt and pos[nxt['refs'][0]]==pos[r]+1)
        if not neighbor:continue
        row=[0]*(len(bb)+1)
        for w in aa:
            old=row;row=[0]+[0]*len(bb)
            for j,v in enumerate(bb,1):row[j]=old[j-1]+1 if w==v else max(old[j],row[j-1])
        if row[-1]/max(len(aa),len(bb))>=.8:out[r]={'refs':[r],'method':'same coordinate, adjacent verse anchor and >=80% complete-verse word match'}
    for i,r in enumerate(src):
        mapping=out.get(r)
        if not mapping or not a[i]:continue
        target_text=''.join(cons(''.join(mt[t])) for t in mapping['refs'])
        start=target_text.find(a[i])
        if start>=0 and target_text.find(a[i],start+1)<0:
            mapping['sourceStart']=start
            mapping['sourceEnd']=start+len(a[i])
    return out
