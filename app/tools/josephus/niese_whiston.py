# Niese-§ -> Whiston Kapitel/Abschnitt aus den Perseus-Texten (PerseusDL/canonical-greekLit, data/tlg0526, CC BY-SA); im Ordner data/tlg0526 ausführen.
import re,json,sys
def mapping(path):
    s=open(path,encoding='utf-8').read()
    tok=re.compile(r'<div[^>]*?subtype="(book|section)"[^>]*?\bn="([^"]+)"|<milestone[^>]*?\bn="([^"]+)"[^>]*?unit="(Whiston_chapter|Whiston_section)"|<milestone[^>]*?unit="(Whiston_chapter|Whiston_section)"[^>]*?\bn="([^"]+)"',re.S)
    book=None;wc=None;ws=None;M={};last=None;lastend=0
    for m in tok.finditer(s):
        if m.group(1)=='book': book=m.group(2);wc=None;ws=None;last=None
        elif m.group(1)=='section': last=(book,m.group(2));M[last]=(wc,ws);lastend=m.end()
        else:
            n=m.group(3) or m.group(6);u=m.group(4) or m.group(5)
            if u=='Whiston_chapter': wc=n;ws=None
            else: ws=n
            gap=re.sub(r'<[^>]*>|[/>]','',s[lastend:m.start()]).strip() if last else 'x'
            if last and not gap: M[last]=(wc,ws)
            lastend=m.end() if last and not gap else lastend
    return M
A=mapping('tlg001/tlg0526.tlg001.perseus-grc2.xml');B=mapping('tlg004/tlg0526.tlg004.perseus-grc2.xml')
print(len(A),len(B))
for k in [('1','27'),('1','32'),('18','63'),('20','252'),('1','1')]: print('Ant',k,A.get(k))
for k in [('1','1'),('1','516'),('2','110')]: print('Bell',k,B.get(k))
json.dump({'ant':{f'{b}.{n}':v for (b,n),v in A.items()},'bell':{f'{b}.{n}':v for (b,n),v in B.items()}},open('niese.json','w'))
