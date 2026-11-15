# zeno.org: Graetz, Geschichte der Juden – Baum ablaufen und Seiten speichern (höflich, 0,5 s Pause)
import re,html,urllib.request,urllib.parse,os,json,time,hashlib
BASE='http://www.zeno.org';ROOT='/Geschichte/M/Graetz,+Heinrich/Geschichte+der+Juden'
os.makedirs('raw',exist_ok=True)
def get(p):
    fn='raw/'+hashlib.md5(p.encode()).hexdigest()+'.html'
    if os.path.exists(fn): return open(fn,encoding='utf-8').read()
    for i in range(3):
        try:
            raw=urllib.request.urlopen(urllib.request.Request(BASE+p,headers={'User-Agent':'Mozilla/5.0 (Safran-Graetz-Import)'}),timeout=60).read();break
        except Exception as e: err=e;time.sleep(3)
    else: raise err
    m=re.search(rb'charset=([\w-]+)',raw);s=raw.decode(m.group(1).decode() if m else 'iso-8859-1','replace')
    open(fn,'w',encoding='utf-8').write(s);time.sleep(0.5);return s
seen={};order=[]
def children(p,s):
    # Unterseiten: Links, die mit p+'/' beginnen und genau eine Ebene tiefer liegen
    out=[]
    for href,txt in re.findall(r'href="([^"]+)"[^>]*>([^<]*)',s):
        h=html.unescape(href)
        if h.startswith(p+'/') and '/' not in h[len(p)+1:] and h not in out: out.append(h)
    return out
def walk(p,depth=0):
    if p in seen: return
    s=get(p);kids=children(p,s);seen[p]=kids;order.append(p)
    for k in kids: walk(k,depth+1)
walk(ROOT)
json.dump({'order':order,'tree':seen},open('tree.json','w'),ensure_ascii=False)
print(len(order))
