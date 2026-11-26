"""Conservative consensus alignment for all source tokens of Berakhot.
Only edges shared by every minimum-cost path become word/group links.
Ambiguous, damaged, and unrelated replacement tokens remain unassigned.
"""
from functools import lru_cache
import re,json
HE=re.compile('[^א-ת]')
def rawkey(w):return HE.sub('',w['text'])
def unsafe(w):return '□' in w['text'] or bool(set(w['flags'])&{'damage','gap','unclear'})
def keys(w):return {k for k in [w['key'],rawkey(w)] if k} if not unsafe(w) else set()
@lru_cache(None)
def distance(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        new=[i]
        for j,y in enumerate(b,1):new.append(min(new[-1]+1,row[j]+1,row[j-1]+(x!=y)))
        row=new
    return row[-1]
def align(a,b):
    n,m=len(a),len(b);ak=[keys(w) for w in a];bk=[keys(w) for w in b]
    def combined(ks):
        out={}
        for i in range(len(ks)):
            p={''}
            for size in range(1,min(3,len(ks)-i)+1):
                p={x+y for x in p for y in ks[i+size-1]};out[i,size]=p
        return out
    ac,bc=combined(ak),combined(bk)
    costs=[]
    for i in range(n):
        r=[]
        for j in range(m):
            if ak[i]&bk[j]:r.append((0,'exact'))
            elif ak[i] and bk[j] and any(min(len(x),len(y))>=3 and distance(x,y)<=2 and distance(x,y)/max(len(x),len(y))<=.35 for x in ak[i] for y in bk[j]):r.append((2,'form'))
            else:r.append((6,'unresolved'))
        costs.append(r)
    def edges(i,j):
        if i<n:yield 1,0,3,'absent'
        if j<m:yield 0,1,3,'insertion'
        if i<n and j<m:
            c,k=costs[i][j];yield 1,1,c,k
            for p,q in [(1,2),(2,1),(1,3),(3,1),(2,2),(2,3),(3,2)]:
                if i+p<=n and j+q<=m and ac[i,p]&bc[j,q]:yield p,q,1,'joined'
    inf=10**9;f=[[inf]*(m+1) for _ in range(n+1)];back=[[inf]*(m+1) for _ in range(n+1)];f[0][0]=0;back[n][m]=0
    for i in range(n+1):
        for j in range(m+1):
            for p,q,c,k in edges(i,j):f[i+p][j+q]=min(f[i+p][j+q],f[i][j]+c)
    for i in range(n,-1,-1):
        for j in range(m,-1,-1):
            for p,q,c,k in edges(i,j):back[i][j]=min(back[i][j],c+back[i+p][j+q])
    ba=[set() for _ in a];bb=[set() for _ in b];candidates=[]
    for i in range(n+1):
        for j in range(m+1):
            for p,q,c,k in edges(i,j):
                if f[i][j]+c+back[i+p][j+q]!=f[n][m]:continue
                edge=(i,p,j,q,k)
                for x in range(i,i+p):ba[x].add(edge)
                for x in range(j,j+q):bb[x].add(edge)
                candidates.append(edge)
    links=[]
    for e in candidates:
        i,p,j,q,k=e
        if k=='unresolved' or any(len(ba[x])!=1 for x in range(i,i+p)) or any(len(bb[x])!=1 for x in range(j,j+q)):continue
        if any(unsafe(w) for w in a[i:i+p]+b[j:j+q]):continue
        # Never infer an omission from damage immediately beside that gap.
        if not q and any(unsafe(w) for w in b[max(0,j-1):j+1]):continue
        if not p and any(unsafe(w) for w in a[max(0,i-1):i+1]):continue
        links.append({'a':list(range(i,i+p)),'b':list(range(j,j+q)),'boundary':i-1,'kind':k})
    return links

def build(data,reviews,chapters=None,aligner=None):
    for sig,sha in reviews.get('sourceSha256',{}).items():assert data['witnesses'][sig]['sha256']==sha,'Review source changed: '+sig
    result={'version':1,'method':'consensus of all minimum-cost paths; chapter scope','chapters':{},'reviews':reviews.get('groups',[])}
    counts={}
    chapters=chapters or range(1,10)
    aligner=aligner or align
    for sig in ['P','C']:
        totals={'words':0,'aligned':0,'insertions':0,'open':0,'reviewed':0}
        for ch in chapters:
            def stream(s):return [(r,i,w) for r,u in data['witnesses'][s]['units'].items() if r.startswith(str(ch)+':') for i,w in enumerate(u['words'])]
            a,b=stream('K'),stream(sig);links=aligner([w for _,_,w in a],[w for _,_,w in b]) if a else [];mapped=[];used=set()
            for link in links:
                base=[[a[i][0],a[i][1]] for i in link['a']];reading=[[b[i][0],b[i][1]] for i in link['b']]
                # A source group must not be split/duplicated across reference units.
                if len({r for r,i in base})>1:continue
                boundary=a[link['boundary']] if link['boundary']>=0 else None
                ref=base[0][0] if base else boundary[0] if boundary else a[0][0]
                mapped.append({'ref':ref,'base':base,'reading':reading,'after':[boundary[0],boundary[1]] if boundary else None,'kind':link['kind'],'checked':False})
                used.update(link['b'])
            # Overrides are explicit, hash-bound editorial decisions, not edits to source text.
            for review in reviews.get('groups',[]):
                if review['witness']!=sig or not review['base'][0][0].startswith(str(ch)+':'):continue
                for s,field in [('K','base'),(sig,'reading')]:
                    actual=[data['witnesses'][s]['units'][r]['words'][i]['text'] for r,i in review[field]]
                    assert actual==review['expected'+field.title()],review
                bp={tuple(x) for x in review['base']};rp={tuple(x) for x in review['reading']}
                mapped=[l for l in mapped if not(bp&{tuple(x) for x in l['base']} or rp&{tuple(x) for x in l['reading']})]
                mapped.append({'ref':review['base'][0][0],'base':review['base'],'reading':review['reading'],'after':None,'kind':'reviewed','checked':True,'reason':review['reason']})
            positions={(r,i):j for j,(r,i,w) in enumerate(b)};used={positions[tuple(pair)] for l in mapped for pair in l['reading']}
            opened=[]
            for j,(r,i,w) in enumerate(b):
                if j in used:continue
                previous=[l for l in mapped if l['reading'] and positions[tuple(l['reading'][-1])]<j]
                nexts=[l for l in mapped if l['reading'] and positions[tuple(l['reading'][0])]>j]
                before=max(previous,key=lambda l:positions[tuple(l['reading'][-1])],default=None);after=min(nexts,key=lambda l:positions[tuple(l['reading'][0])],default=None)
                near=(before or after or {}).get('ref',str(ch)+':1')
                opened.append({'nearRef':near,'reading':[r,i],'reason':'damaged' if unsafe(w) else 'ambiguous'})
            entry=result['chapters'].setdefault(str(ch),{});entry[sig]={'links':mapped,'open':opened}
            totals['words']+=len(b);totals['aligned']+=sum(len(l['reading']) for l in mapped if l['base']);totals['insertions']+=sum(len(l['reading']) for l in mapped if not l['base']);totals['open']+=len(opened);totals['reviewed']+=sum(len(l['reading']) for l in mapped if l['checked'])
        assert totals['words']==totals['aligned']+totals['insertions']+totals['open'];counts[sig]=totals
    result['counts']=counts;return result
