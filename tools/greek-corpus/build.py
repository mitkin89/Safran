"""Build checked OGA editions; keep Gorman's NC-SA layer in a separate asset."""
import collections, gzip, hashlib, html, json, pathlib, re, sys, unicodedata
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parent.parent
C=json.loads((HERE/'sources.json').read_text());CACHE=pathlib.Path(sys.argv[1])
def js(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def words(text):
    out=[];i=0
    while i<len(text):
        if unicodedata.category(text[i])[0]not in 'LM':i+=1;continue
        start=i
        while i<len(text)and unicodedata.category(text[i])[0]in 'LM':i+=1
        if i<len(text)and text[i]in "᾿’'ʼ":i+=1
        s=text[start:i]
        if any('\u0370'<=c<='\u03ff'or'\u1f00'<=c<='\u1fff'for c in s):out.append(s)
    return out
def norm(s):return ''.join(c for c in unicodedata.normalize('NFC',s).lower().replace('ς','σ')if unicodedata.category(c)[0]in'LM'and c not in "᾿’'ʼ")
def records(path):return [json.loads(l)for l in gzip.decompress(path.read_bytes()).splitlines()if l]
def aligned(base,rs):
    seq=[]
    for r in rs:
        if r.get('artificial'):continue
        for f in words(r.get('form','')):seq.append((f,r))
    if ''.join(map(norm,base))!=''.join(norm(f)for f,r in seq):return [None]*len(base)
    spans={};offset=0
    for f,r in seq:
        size=len(norm(f));spans[(offset,offset+size)]=r if len(words(r['form']))==1 else None;offset+=size
    offset=0;out=[]
    for f in base:
        size=len(norm(f));r=spans.get((offset,offset+size));out.append(r);offset+=size
    return out
class Table:
    def __init__(self):self.F=[];self.L=[];self.T=[];self.E=[];self.P={};self.maps=[{},{},{},{}]
    def intern(self,i,v):
        a=[self.F,self.L,self.T,self.E][i];key=tuple(v)if isinstance(v,list)else v
        if key not in self.maps[i]:self.maps[i][key]=len(a);a.append(v)
        return self.maps[i][key]
    def add(self,locus,base,rs):
        ids=[];count=0
        for f,r in zip(base,rs):
            valid=r and r.get('lemma')and re.fullmatch(r'[a-z0-9-]{9}',r.get('morph',''))
            entry=[self.intern(0,f),self.intern(1,r['lemma'])if valid else -1,self.intern(2,r['morph'])if valid else -1]
            ids.append(self.intern(3,entry));count+=bool(valid)
        self.P[locus]='.'.join(base36(i)for i in ids);return count
    def data(self):return dict(F=self.F,L=self.L,T=self.T,E=self.E,P=self.P)
def base36(n):
    s='';chars='0123456789abcdefghijklmnopqrstuvwxyz'
    while True:
        s=chars[n%36]+s;n//=36
        if not n:return s
def insert(tree,parts,value):
    cur=tree
    for depth,n in enumerate(parts):
        i=int(n)-1
        while len(cur)<=i:cur.append(''if depth==len(parts)-1 else [])
        if depth==len(parts)-1:
            if cur[i]:raise ValueError('Repeated locus '+'.'.join(parts))
            cur[i]=value
        else:cur=cur[i]
MAPPING=json.loads((ROOT/'tools/josephus/niese_whiston.json').read_text())
def references(work,loci):
    key={'tlg0526.tlg001':'ant','tlg0526.tlg004':'bell'}.get(work)
    if not key:return {}
    title='The Antiquities of the Jews'if key=='ant'else'The War of the Jews'
    shape=MAPPING['shape'][title];out={}
    for locus in loci:
        pair=MAPPING['niese'][key].get(locus)
        if not pair or not all(pair):continue
        book=int(locus.split('.')[0]);chapter,section=pair
        if chapter=='pr.':
            if book==1 and 1<=int(section)<=shape['preface']:out[locus]=title+', Preface '+section
        elif chapter.isdigit()and section.isdigit():
            c,n=int(chapter),int(section)
            if book<=len(shape['books'])and 1<=c<=len(shape['books'][book-1])and 1<=n<=shape['books'][book-1][c-1]:out[locus]=f'{title} {book}:{c}:{n}'
    return out
JOSEPHUS_TITLES={'tlg0526.tlg001':'The Antiquities of the Jews','tlg0526.tlg002':'The Life of Flavius Josephus','tlg0526.tlg003':'Against Apion','tlg0526.tlg004':'The War of the Jews'}
def blank_shape(node):
    if isinstance(node,list):return [blank_shape(n)for n in node]
    if isinstance(node,dict):return {k:blank_shape(v)for k,v in node.items()}
    return ''
def josephus_layout(w,source,original,locator,refs):
    title=JOSEPHUS_TITLES.get(w['id'])
    if not title:return w['title'],original,locator,refs,None
    edition=next((e for e in manifest['items']if e['title']==title and '/de/'in e['rel']),None)
    if not edition:return title,original,locator,refs,None
    raw=(ROOT/'bundled'/edition['rel']).read_bytes();translated=json.loads(raw);layout=blank_shape(translated['text']);dest={};groups=collections.defaultdict(list);remaining=[]
    if w['id']=='tlg0526.tlg003':
        # Each printed superscript is the explicit Niese section at this German paragraph.
        numbered=collections.defaultdict(list)
        for b,book in enumerate(translated['text']):
            for c,chapter in enumerate(book):
                for p,paragraph in enumerate(chapter):
                    for n in re.findall(r'<sup>([0-9]+)</sup>',paragraph):numbered[f'{b+1}.{n}'].append([b,c,str(p+1)])
        for r in source:
            paths=numbered.get(r['locus'],[])
            if len(paths)==1:dest[r['locus']]=paths[0];refs[r['locus']]=title+' '+':'.join(str(n+1)if isinstance(n,int)else n for n in paths[0])
    else:
        for locus,ref in refs.items():
            if ', Preface 'in ref:dest[locus]=['Preface',ref.rsplit(' ',1)[1]]
            else:
                b,c,p=map(int,ref.rsplit(' ',1)[1].split(':'));dest[locus]=['',b-1,c-1,str(p)]
    for r in source:
        if r['locus']in dest:groups[js(dest[r['locus']])].append(r)
        else:remaining.append(r)
    out={}
    for key,rs in groups.items():
        path=json.loads(key);node=layout
        for part in path[:-1]:node=node[part]
        i=int(path[-1])-1
        if not 0<=i<len(node):raise ValueError('Out-of-range Josephus mapping '+key)
        node[i]='<br>'.join('<small>§ '+r['locus']+'</small> '+html.escape(r['text'],quote=False)for r in rs)
        out[key]=[r['locus']for r in rs]
    if remaining:
        # Keep all source material lacking an explicit target, including book argumenta.
        if not isinstance(layout,dict):layout={'':layout};out={js(['']+json.loads(k)):v for k,v in out.items()}
        layout['Niese §§']=['<small>§ '+r['locus']+'</small> '+html.escape(r['text'],quote=False)for r in remaining]
        for i,r in enumerate(remaining):out[js(['Niese §§',str(i+1)])]=[r['locus']]
    return title,layout,out,refs,dict(rel=edition['rel'],sha256=hashlib.sha256(raw).hexdigest(),mapped=len(source)-len(remaining),unmapped=len(remaining))
manifest=json.loads((ROOT/'bundled/manifest.json').read_text());manifest['items']=[x for x in manifest['items']if not x['rel'].startswith('own/GreekCorpus-')]
report={'works':[]};all_texts={}
for w in C['works']:
    raw=(CACHE/(w['id']+'.text.jsonl')).read_bytes()
    if hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()!=w['textBlob']:raise ValueError('Text checksum '+w['id'])
    annraw=gzip.decompress((CACHE/(w['id']+'.oga.jsonl.gz')).read_bytes())
    if hashlib.sha256(annraw).hexdigest()!=w['annotationSha256']:raise ValueError('OGA checksum '+w['id'])
    ann=collections.defaultdict(list)
    for line in annraw.splitlines():
        r=json.loads(line);ann[r['locus']].append(r)
    source=[json.loads(l)for l in raw.splitlines()if l];numeric=[];extra=[];table=Table();paths={};total=0;matched=0;unresolved=[];bylocus={};depth=1
    for r in source:
        locus=r['locus'];text=r['text'];base=words(text);bylocus[locus]=base;total+=len(base)
        count=table.add(locus,base,aligned(base,ann.get(locus,[])));matched+=count
        if count<len(base):unresolved.append({'locus':locus,'words':len(base),'unresolved':len(base)-count})
        if re.fullmatch(r'[1-9][0-9]*(\.[1-9][0-9]*)*',locus):
            parts=locus.split('.');depth=max(depth,len(parts));insert(numeric,parts,html.escape(text,quote=False));paths[locus]=[int(x)-1 for x in parts[:-1]]+[parts[-1]]
        else:extra.append(r)
    text=numeric
    if extra:
        text={'Text':numeric,'Argumenta':[html.escape(r['text'],quote=False)for r in extra]}
        paths={locus:['Text']+path for locus,path in paths.items()}
        for i,r in enumerate(extra):paths[r['locus']]=['Argumenta',str(i+1)]
    locator={js(path):locus for locus,path in paths.items()}
    title,text,locator,refs,layoutSource=josephus_layout(w,source,text,locator,references(w['id'],paths))
    version='Open Greek Corpus - OGA ('+('Niese; 'if w['author']=='Josephus'else'')+w['edition']+')'
    data=dict(title=title,heTitle='',language='Greek',versionTitle=version,versionSource='Open Greek Corpus / '+w['edition']+'; '+C['corpusCommit']+'. Morphology: Opera Graeca Adnotata 0.2.0, oga-v1; '+w['annotationSha256']+'. CC BY-SA 4.0. https://github.com/open-greek/open-greek-corpus; https://huggingface.co/datasets/ciscoriordan/open-greek-corpus-annotation-exports',sectionNames=['Book','Chapter','Section']if layoutSource else(['Book','Section']if depth==2 else['Section']),text=text,greekMorphology=dict(version=1,work=w['id'],textHash=hashlib.sha256(js(text).encode()).hexdigest(),locator=locator,references=refs,layoutSource=layoutSource,**table.data()))
    if layoutSource is None:data['greekMorphology'].pop('layoutSource',None)
    rel='own/GreekCorpus-'+w['id']+'/other/Open Greek Corpus - OGA.json';out=ROOT/'bundled'/rel;out.parent.mkdir(parents=True,exist_ok=True);payload=js(data);out.write_text(payload)
    manifest['items'].append(dict(rel=rel,title=title,heTitle='',language='Greek',versionTitle=version,categories=['Second Temple',w['author']],kind='other',hash=hashlib.sha1(payload.encode()).hexdigest()))
    report['works'].append(dict(id=w['id'],title=title,rel=rel,words=total,annotated=matched,passages=len(source),unresolved=unresolved,**({'layoutSource':layoutSource}if layoutSource else{})));all_texts[w['id']]=bylocus
    print(w['id'],total,matched,'unresolved',total-matched,flush=True)
# Publish manual annotations independently, under their original NC-SA terms.
manualraw=gzip.decompress((CACHE/'war.manual.jsonl.gz').read_bytes())
if hashlib.sha256(manualraw).hexdigest()!=C['manual']['sha256']:raise ValueError('Manual checksum')
groups=collections.defaultdict(list)
for line in manualraw.splitlines():
    r=json.loads(line)
    if not r.get('artificial')and words(r.get('form','')):groups[r['locus']].append(r)
manual=Table();eligible=0;prefer=0;passages=0
for locus,rs in groups.items():
    if not rs or any(r.get('analysis')!='manual'or r.get('provenance_tag')!='gorman'for r in rs):continue
    base=[];analyses=[]
    for r in rs:
        fs=words(r['form']);base.extend(fs);analyses.extend([r if len(fs)==1 else None]*len(fs))
    manual.add(locus,base,analyses);eligible+=len(base)
    target=all_texts[C['manual']['work']].get(locus,[]);valid=aligned(target,rs)
    mapped=sum(bool(x)for x in valid)
    if mapped:prefer+=mapped;passages+=1
md=dict(version=1,work=C['manual']['work'],source=C['manual'],**manual.data())
(ROOT/'greek-corpus-manual.js').write_text('// Gorman manual annotations via GLAUx; CC BY-NC-SA 4.0, separately licensed.\nwindow.GREEK_CORPUS_MANUAL='+js(md)+';\n')
report['manual']=dict(words=eligible,preferred=prefer,matchedPassages=passages)
(HERE/'coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(ROOT/'bundled/manifest.json').write_text(js(manifest))
(ROOT/'bundled/greek-corpus-sources.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print('Manual',report['manual'])
