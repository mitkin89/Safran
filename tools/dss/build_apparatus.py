#!/usr/bin/env python3
"""Lossless Genesis extract for the apparatus. Existing reading editions stay untouched.
python3 -I tools/dss/build_apparatus.py --extract /path/to/ETCBC-dss
python3 -I tools/dss/build_apparatus.py
"""
import bisect, gzip, hashlib, html, json, re, sys
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
COMMIT='0b7774a72b6d0e91712aa2156d2a1d354f1f5e6d'
VERSION='2.0.2'
SOURCE=HERE/'genesis-source.json.gz'
FIELDS='full fullo glyph after rec unc cor rem type vac alt glex lex sp vs vt ps gn nu st morpho lang punc biblical srcLn ps2 gn2 nu2'.split()
FLAGS=['rec','unc','cor','rem','alt','vac','type']

def rows(path):
    started=False;node=0
    for line in path.read_text().splitlines():
        if not started:
            if not line.strip():started=True
            continue
        # An empty data line is an implicit node with an empty value, not a
        # separator. Skipping it shifts every subsequent sign annotation.
        if '\t' in line:
            spec,value=line.split('\t',1)
            if re.fullmatch(r'[\d,-]+',spec):
                for part in spec.split(','):
                    lo,_,hi=part.partition('-')
                    for node in range(int(lo),int(hi or lo)+1):yield node,value
                continue
        node+=1;yield node,line

def load(path,wanted=None,value=None):
    return {n:v for n,v in rows(path) if (wanted is None or n in wanted) and (value is None or v==value)}

def ranges(value):
    out=[]
    for part in value.split(','):
        lo,_,hi=part.partition('-');out.append([int(lo),int(hi or lo)])
    return out

def slots(rs):return [n for lo,hi in rs for n in range(lo,hi+1)]

def extract(directory):
    folder=Path(directory)/'tf'/VERSION
    hashes={}
    def feature(name,wanted=None,value=None):
        p=folder/(name+'.tf');hashes[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
        return load(p,wanted,value)
    candidates=feature('book',value='Gen')
    types=feature('otype',wanted=set(candidates))
    selected={n for n in candidates if types[n]=='word'}
    structures={n:t for n,t in rows(folder/'otype.tf') if t in ('scroll','fragment','line')}
    wanted=selected|set(structures)
    word_slots={};structure_slots={}
    p=folder/'oslots.tf';hashes[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
    for n,v in rows(p):
        if n not in wanted:continue
        (word_slots if n in selected else structure_slots)[n]=ranges(v)
    sign_ids=sorted({s for rs in word_slots.values() for s in slots(rs)})
    sign_set=set(sign_ids)
    ancestry=defaultdict(dict)
    labels={t:feature(t,wanted=set(structures)) for t in ('scroll','fragment','line')}
    for n,rs in structure_slots.items():
        t=structures[n]
        for lo,hi in rs:
            for s in sign_ids[bisect.bisect_left(sign_ids,lo):bisect.bisect_right(sign_ids,hi)]:
                ancestry[s][t]=[n,labels[t].get(n,'')]
    all_ids=selected|sign_set
    features={f:feature(f,wanted=all_ids) for f in FIELDS}
    ch=feature('chapter',wanted=selected);vs=feature('verse',wanted=selected)
    records=[];excluded=[]
    for n in sorted(selected,key=lambda n:word_slots[n][0][0]):
        if not(ch.get(n,'').isdigit() and vs.get(n,'').isdigit()) or min(int(ch.get(n,'0')),int(vs.get(n,'0')))<=0:
            excluded.append({'node':n,'chapter':ch.get(n),'verse':vs.get(n)});continue
        ss=slots(word_slots[n]);locations=[]
        for s in ss:
            loc={k:v for k,v in ancestry[s].items()}
            if loc not in locations:locations.append(loc)
        records.append({'node':n,'ref':f'Genesis {int(ch[n])}:{int(vs[n])}',
            'features':{f:d[n] for f,d in features.items() if n in d},'slots':word_slots[n],
            'locations':locations,'signs':[{'node':s,**{f:features[f][s] for f in ['glyph']+FLAGS if s in features[f]}} for s in ss]})
    source={'schema':1,'source':{'repository':'https://github.com/ETCBC/dss','commit':COMMIT,'version':VERSION,
        'license':'CC BY-NC 4.0','authors':'Abegg, Bowley, Cook; Jacobs, Naaijer, Roorda / ETCBC CACCHT',
        'featureSha256':hashes},'words':records,'excluded':excluded}
    SOURCE.write_bytes(gzip.compress(json.dumps(source,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
    print('Extracted',len(records),'Genesis source word/morpheme nodes;',len(excluded),'without numeric Bible reference')

def cons(s):return ''.join(re.findall('[א-ת]',s))

def build():
    source=json.loads(gzip.decompress(SOURCE.read_bytes()))
    item=next(i for i in json.loads((ROOT/'bundled/manifest.json').read_text())['items'] if i['title']=='Genesis' and i['versionTitle'].startswith('Westminster'))
    raw=(ROOT/'bundled'/item['rel']).read_bytes();mt=json.loads(raw)['text']
    lem_text=(ROOT/'oshb-lemmas.js').read_text();lemmas=json.loads(lem_text.split('window.OSHB_LEMMAS=',1)[1].strip().rstrip(';'))
    grouped=defaultdict(list);omitted=[]
    for w in source['words']:
        loc=w['locations'][0] if w['locations'] else {}
        if not loc.get('scroll') or not loc.get('fragment'):
            omitted.append({'node':w['node'],'reason':'missing physical coordinates'});continue
        c,v=map(int,w['ref'].split(' ')[1].split(':'))
        if c>len(mt) or v>len(mt[c-1]):omitted.append({'node':w['node'],'reason':'Bible reference outside OSHB'});continue
        grouped[(w['ref'],loc['scroll'][1],loc['fragment'][1],loc['fragment'][0])].append(w)
    data={'schema':1,'source':{**source['source'],'extractSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()},'mt':{},'mtMeta':{},'verses':{}}
    il_raw=(ROOT/'qumran-il.js').read_bytes()
    il=json.loads(il_raw.decode().split('window.QUMRAN_IL=',1)[1].strip().rstrip(';'))
    data['interlinear']=il.get('Genesis',{})
    data['source']['interlinear']={'file':'qumran-il.js','sha256':hashlib.sha256(il_raw).hexdigest(),'method':'Existing machine alignment; original verse/witness/consonant stream validated before reuse'}
    counts={'segments':0,'tokens':0,'reconstructed':0,'uncertain':0,'damaged':0,'corrected':0};scrolls=set()
    for (ref,scroll,fragment,fragment_id),ww in grouped.items():
        c,v=map(int,ref.split(' ')[1].split(':'))
        data['mt'][ref]=[html.unescape(re.sub('<[^>]*>','',m)) for m in re.findall(r'<span class="w"[^>]*>(.*?)</span>',mt[c-1][v-1])]
        data['mtMeta'][ref]=[]
        for attrs,surface in re.findall(r'<span class="w"([^>]*)>(.*?)</span>',mt[c-1][v-1]):
            ids=re.search(r'data-l="([^"]*)"',attrs);morph=re.search(r'data-m="([^"]*)"',attrs)
            ls=[cons(lemmas[n][0]) for n in re.findall(r'\d+(?: [a-z])?',ids[1] if ids else '') if n in lemmas]
            data['mtMeta'][ref].append({'lemmas':ls,'morph':morph[1] if morph else ''})
        tokens=[];parts=[]
        def flush():
            nonlocal parts
            if not parts:return
            flags={f:sorted({s[f] for p in parts for s in [p['features']]+p['signs'] if f in s and s[f]}) for f in FLAGS[:-1]}
            if any(s.get('type')=='missing' for p in parts for s in p['signs']):flags['missing']=['1']
            text=''.join(p['features'].get('full','')+(p['features'].get('punc','') if p['features'].get('punc') and not p['features'].get('full','').endswith(p['features']['punc']) else '') for p in parts)
            locations=[]
            for p in parts:
                for loc in p['locations']:
                    if loc not in locations:locations.append(loc)
            toks=[]
            for p in parts:
                f=p['features'];sp=f.get('sp') or '-';sp='-' if sp=='unknown' else sp
                if sp=='suff':sp={'n':'subs','v':'verb','P':'ptcl','a':'adjv','u':'numr','p':'pron'}.get(f.get('morpho','')[:1],'-')
                morph='.'.join([sp]+[(f.get(k) if f.get(k) not in (None,'','unknown') else '-') for k in ['vs','vt','ps','gn','nu','st']])
                sx=''.join(f.get(k,'') for k in ['ps2','gn2','nu2']) if f.get('sp')=='suff' else ''
                if sx:morph+='.'+sx
                toks.append({'node':p['node'],'signs':p['signs'],'text':f.get('full','')+(f.get('punc','') if f.get('punc') and not f.get('full','').endswith(f['punc']) else ''),'lemma':cons(f.get('glex') or f.get('lex','')),'morph':morph})
            flags={k:v for k,v in flags.items() if v}
            letter_signs=[s for p in parts for s in p['signs'] if cons(s.get('glyph',''))]
            tokens.append({'letters':len(letter_signs),'reconstructedLetters':sum(bool(s.get('rec')) for s in letter_signs),'text':text,'parts':toks,'flags':flags,'locations':locations})
            counts['tokens']+=1
            for flag,name in [('rec','reconstructed'),('unc','uncertain'),('missing','damaged'),('cor','corrected')]:counts[name]+=bool(flags.get(flag))
            parts=[]
        for p in ww:
            parts.append(p)
            if p['features'].get('after'):flush()
        flush()
        entry={'scroll':scroll,'fragment':fragment,'fragmentNode':fragment_id,'tokens':tokens}
        data['verses'].setdefault(ref,[]).append(entry);counts['segments']+=1;scrolls.add(scroll)
    data['source']['mt']={'rel':item['rel'],'sha256':hashlib.sha256(raw).hexdigest(),'license':'CC BY 4.0','title':'OSHB / Westminster Leningrad Codex'}
    audit={'source':data['source'],'counts':{**counts,'verses':len(data['verses']),'scrolls':sorted(scrolls),'sourceWords':len(source['words'])},'excluded':source['excluded']+omitted}
    (HERE/'genesis-apparatus-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (ROOT/'qumran-apparatus.js').write_text('/* Genesis: ETCBC DSS / Abegg CC BY-NC 4.0; OSHB CC BY 4.0; tools/dss/build_apparatus.py */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.QUMRAN_APPARATUS=d;})('+payload+');\n')
    print(json.dumps(audit['counts'],ensure_ascii=False))

if __name__=='__main__':
    if len(sys.argv)>1:
        if len(sys.argv)!=3 or sys.argv[1]!='--extract':raise SystemExit(__doc__)
        extract(sys.argv[2])
    build()
