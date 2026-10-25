import re,sys,json,html
BOOKS={'Gen':('Genesis','בראשית'),'Exod':('Exodus','שמות'),'Lev':('Leviticus','ויקרא'),'Num':('Numbers','במדבר'),'Deut':('Deuteronomy','דברים')}
def conv(path,title,heTitle):
    t=open(path,encoding='utf-8').read()
    chaps=[]
    for cm in re.finditer(r'<chapter osisID="[^.]+\.(\d+)">(.*?)</chapter>',t,re.S):
        c=int(cm.group(1)); verses=[]
        for vm in re.finditer(r'<verse osisID="[^.]+\.\d+\.(\d+)">(.*?)</verse>',cm.group(2),re.S):
            v=int(vm.group(1)); body=vm.group(2)
            out=[];pend_sp=False
            for m in re.finditer(r'<w ([^>]*)>(.*?)</w>|<seg type="([^"]*)">([^<]*)</seg>',body,re.S):
                if m.group(1) is not None:
                    a=dict(re.findall(r'(\w+)="([^"]*)"',m.group(1)))
                    w=re.sub(r'<[^>]+>','',m.group(2)).replace('/','')
                    w=html.unescape(w)
                    if out and pend_sp: out.append(' ')
                    out.append('<span class="w" data-l="%s" data-m="%s">%s</span>'%(a.get('lemma',''),a.get('morph',''),w))
                    pend_sp=True
                else:
                    ty,tx=m.group(3),m.group(4)
                    if ty=='x-maqqef': out.append(tx); pend_sp=False
                    elif ty in('x-sof-pasuq','x-paseq'): out.append(tx); pend_sp=True
            verses.append((v,''.join(out)))
        n=max(v for v,_ in verses); arr=['']*n
        for v,s in verses: arr[v-1]=s
        chaps.append((c,arr))
    n=max(c for c,_ in chaps); text=[[] for _ in range(n)]
    for c,a in chaps: text[c-1]=a
    return {"title":title,"heTitle":heTitle,"language":"Hebrew","versionTitle":"Westminster Leningrad Codex (OSHB, mit Morphologie)","versionSource":"https://github.com/openscriptures/morphhb","sectionNames":["Chapter","Verse"],"text":text}
if __name__=='__main__':
    src,code,out=sys.argv[1:4]
    d=conv(f'{src}/{code}.xml',*BOOKS[code])
    json.dump(d,open(out,'w',encoding='utf-8'),ensure_ascii=False)
