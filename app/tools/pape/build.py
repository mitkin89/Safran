#!/usr/bin/env python3
"""Lokales Pape-StarDict für Safran und als bereinigtes StarDict aufbereiten.
python3 -I tools/pape/build.py /Pfad/pape_gr-de.dict [--stardict-out /Ziel]
"""
import argparse, base64, gzip, hashlib, html, json, re, struct, unicodedata
from html.parser import HTMLParser
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
DASH = re.compile('[-\u00ad\u2010\u2011]')
NAME = 'Pape, Griechisch-deutsches Handwörterbuch (1880/1914)'
def greek(s):
    return any('GREEK' in unicodedata.name(c, '') and unicodedata.category(c).startswith('L') for c in s)
def clean_head(s): return DASH.sub('', s)
def digest(b, kind='sha256'): return hashlib.new(kind, b).hexdigest()
def idx_records(data):
    pos = 0
    while pos < len(data):
        end = data.index(0, pos)
        head = data[pos:end].decode('utf-8')
        offset, size = struct.unpack('>II', data[end+1:end+9]); pos = end+9
        yield head, offset, size
    assert pos == len(data)
def synonyms(data):
    pos = 0
    while pos < len(data):
        end = data.index(0, pos)
        word = data[pos:end].decode('utf-8')
        target = struct.unpack('>I', data[end+1:end+5])[0]; pos = end+5
        yield word, target
    assert pos == len(data)
def heading(body):
    # Nur die erste Stichwortüberschrift bereinigen, niemals Bindestriche im Erklärungstext.
    return re.sub(r'(<b>)(.*?)(</b>)', lambda m: m[1]+clean_head(m[2])+m[3], body, count=1, flags=re.S)
class Plain(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.text=[]
    def handle_data(self, s): self.text.append(s)
    def handle_starttag(self, tag, attrs):
        if tag in ['br','div','p']: self.text.append(' ')
    def handle_endtag(self, tag):
        if tag in ['div','p']: self.text.append(' ')
def plain(s):
    p=Plain();p.feed(s);p.close();return re.sub(r'\s+', ' ', ''.join(p.text)).strip()
def fold(s): return ''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)!='Mn').replace('ς','σ').lower()
class Article(HTMLParser):
    def __init__(self, resources, known):
        super().__init__(convert_charrefs=True); self.out=[];self.tags=[];self.resources=resources;self.known=known;self.recent='';self.links=0;self.images=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='br':self.out.append('<br>');self.recent+=' ';return
        if tag=='img':
            name=Path(a.get('src','')).name
            content=self.resources[name];kind='image/jpeg' if name.lower().endswith(('.jpg','.jpeg')) else 'image/png'
            self.out.append('<img src="data:'+kind+';base64,'+base64.b64encode(content).decode()+'" alt="'+html.escape(a.get('alt',''),quote=True)+'">');self.images+=1;return
        mapped='b' if tag=='span' and a.get('class')=='zenoTXSpaced' else tag if tag in ['span','b','i','sup','sub'] else None
        self.tags.append((tag,mapped))
        if mapped:self.out.append('<'+mapped+'>')
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in ['img','br']:self.handle_endtag(tag)
    def handle_endtag(self, tag):
        if tag in ['br','img']:return
        assert self.tags and self.tags[-1][0]==tag, ('Unbalancierte Quelle',tag,self.tags[-2:])
        _,mapped=self.tags.pop()
        if mapped:self.out.append('</'+mapped+'>')
    def handle_data(self, text):
        # Eindeutige gedruckte Verweise: s./vgl./= unmittelbar vor einem bekannten griechischen Stichwort.
        pos=0
        for m in re.finditer(r'[\u0370-\u03ff\u1f00-\u1fff][\u0370-\u03ff\u1f00-\u1fff\u0300-\u036f\-]*',text):
            context=(self.recent+text[:m.start()])[-50:]
            word=m[0];target=clean_head(word)
            if re.search(r'(?:\bs\.|\bvgl\.|=)\s*$',context) and fold(target) in self.known:
                self.out.append(html.escape(text[pos:m.start()],quote=False))
                self.out.append('<a class="dref" data-q="'+html.escape(target,quote=True)+'">'+html.escape(word,quote=False)+'</a>');pos=m.end();self.links+=1
        self.out.append(html.escape(text[pos:],quote=False));self.recent=(self.recent+text)[-80:]
    def finish(self):
        self.close();assert not self.tags
        return '<div class="dl">'+''.join(self.out)+'</div>'
def build(source, output=None):
    source=Path(source).resolve(); folder=source.parent; stem=source.stem
    raw=source.read_bytes(); index=source.with_suffix('.idx').read_bytes(); syn=source.with_suffix('.syn').read_bytes()
    records=list(idx_records(index)); aliases=list(synonyms(syn))
    info=dict(l.split('=',1) for l in source.with_suffix('.ifo').read_text().splitlines() if '=' in l)
    assert int(info['wordcount'])==len(records) and int(info['idxfilesize'])==len(index)
    assert int(info['synwordcount'])==len(aliases) and info['sametypesequence']=='h'
    removed=[h for h,_,_ in records if not greek(h)]
    kept=[]
    for old,(head,offset,size) in enumerate(records):
        assert offset+size<=len(raw)
        if greek(head):kept.append({'old':old,'head':clean_head(head),'original':head,'body':heading(raw[offset:offset+size].decode('utf-8'))})
    # StarDict benötigt einen nach UTF-8/ASCII-Kleinschreibung sortierten Index.
    kept.sort(key=lambda r:(r['head'].encode().lower(),r['head'].encode(),r['old']))
    new_id={r['old']:i for i,r in enumerate(kept)}
    cleaned_syn=set()
    dropped_aliases=0
    for word,old in aliases:
        assert 0<=old<len(records)
        if old not in new_id or not greek(word):dropped_aliases+=1;continue
        word=clean_head(word);target=new_id[old]
        if word!=kept[target]['head']:cleaned_syn.add((word,target))
    cleaned_syn=sorted(cleaned_syn,key=lambda x:(x[0].encode().lower(),x[0].encode(),x[1]))
    resources={p.name:p.read_bytes() for p in (folder/'res').iterdir() if p.is_file()}
    known={fold(r['head']) for r in kept};heads=[];rendered=[];keys=[];source_text=hashlib.sha256();images=links=0
    by_id={}
    for word,target in cleaned_syn:by_id.setdefault(target,[]).append(word)
    for i,r in enumerate(kept):
        parser=Article(resources,known);parser.feed(r['body']);body=parser.finish()
        expected=plain(r['body']);assert plain(body)==expected, r['original']
        source_text.update((r['head']+'\0'+expected+'\n').encode())
        heads.append([r['head']]);rendered.append(body)
        # Nummerierte Homonyme bleiben getrennte Artikel, die Grundform findet sie gemeinsam.
        base=re.sub(r'\(\d+\)$','',r['head'])
        keys.append(list(dict.fromkeys([r['head'],base,*by_id.get(i,[])])))
        images+=parser.images;links+=parser.links
    data={'name':NAME,'indexLang':'Greek','contentsLang':'German','heads':heads,'html':rendered,'keys':keys}
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode();identifier=digest((NAME+'\0'+str(len(kept))).encode(),'sha1')[:12]
    bundle=ROOT/'bundled/dict';file=bundle/(identifier+'.json.gz');file.write_bytes(gzip.compress(encoded,compresslevel=9,mtime=0))
    manifest_path=bundle/'manifest.json';manifest=json.loads(manifest_path.read_text());item={'id':identifier,'name':NAME,'count':len(kept),'hash':digest(encoded,'sha1')}
    assert not any(x['name']==NAME and x['id']!=identifier for x in manifest['items']), 'Alte Pape-Kennung prüfen'
    manifest['items']=[x for x in manifest['items'] if x['id']!=identifier]+[item]
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=1)+'\n')
    meta={'sourceFile':source.name,'sourceSha256':digest(raw),'indexSha256':digest(index),'synonymsSha256':digest(syn),
        'sourceEntries':len(records),'entries':len(kept),'removedLatinEntries':removed,
        'mixedScriptGreekHeadwordsPreserved':[r['original'] for r in kept if any('LATIN' in unicodedata.name(c,'') for c in r['original'])],'headwordsWithHyphensRemoved':sum(r['original']!=r['head'] for r in kept),
        'sourceAliases':len(aliases),'removedLatinOrForeignAliases':dropped_aliases,'retainedGreekAliases':len(cleaned_syn),
        'images':images,'crossReferences':links,'dictionaryId':identifier,'jsonSha1':item['hash'],'articleTextSha256':source_text.hexdigest(),
        'sourceUrl':'http://www.zeno.org/Pape-1880','offlineUrl':'https://tovotu.de/data/stardict/pape_gr-de.zip',
        'policy':'User-supplied offline edition only; remove Latin entries/aliases and headword hyphens; no missing entries added from Zeno.'}
    (ROOT/'tools/pape/source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    if output:
        output=Path(output).resolve();assert output!=folder,'Originaldateien nicht überschreiben'
        output.mkdir(parents=True,exist_ok=True)
        data_bytes=bytearray();idx_bytes=bytearray();syn_bytes=bytearray()
        for r in kept:
            body=r['body'].encode();idx_bytes+=r['head'].encode()+b'\0'+struct.pack('>II',len(data_bytes),len(body));data_bytes+=body
        for word,target in cleaned_syn:syn_bytes+=word.encode()+b'\0'+struct.pack('>I',target)
        (output/(stem+'.dict')).write_bytes(data_bytes);(output/(stem+'.idx')).write_bytes(idx_bytes);(output/(stem+'.syn')).write_bytes(syn_bytes)
        (output/(stem+'.ifo')).write_text("StarDict's dict ifo file\nversion=3.0.0\nbookname="+NAME+'\nwordcount='+str(len(kept))+'\nidxfilesize='+str(len(idx_bytes))+'\nsametypesequence=h\nsynwordcount='+str(len(cleaned_syn))+'\ndescription=Latin entries and aliases removed; headword hyphens removed; explanations preserved.\n')
        for name,content in resources.items():
            (output/'res').mkdir(exist_ok=True);(output/'res'/name).write_bytes(content)
    print(json.dumps({k:v for k,v in meta.items() if k!='removedLatinEntries'},ensure_ascii=False,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--stardict-out');args=p.parse_args();build(args.source,args.stardict_out)
