#!/usr/bin/env python3
"""Tal–Florentin running Hebrew/English, preserving the PDF's red markings.
Reads pages-spans.json (tal_notes.py) and pinned upstream tf_verses.json.
Writes parallel.json in the external source directory; requires PyMuPDF.
"""
import collections, hashlib, html, json, pathlib, re, sys, unicodedata
import pymupdf
BOOKS=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']
HEBOOKS={'בראשית':'Genesis','שמות':'Exodus','ויקרא':'Leviticus','במדבר':'Numbers','דברים':'Deuteronomy'}
FINAL=str.maketrans('ךםןףץ','כמנפצ')
letters=lambda s: ''.join(re.findall('[א-ת]',unicodedata.normalize('NFKC',s)))

def lines(spans):
    result=[]
    for s in sorted(spans,key=lambda s:(s['bbox'][1]+s['bbox'][3])/2):
        y=(s['bbox'][1]+s['bbox'][3])/2
        if result and abs(result[-1][0]-y)<4:result[-1][1].append(s)
        else:result.append((y,[s]))
    return result

def gematria(text):
    vals=dict(zip('אבגדהוזחטיכלמנסעפצקרשת',[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]))
    return sum(vals.get(c,0) for c in text)

def main(src):
    assert hashlib.sha256((src/'book.pdf').read_bytes()).hexdigest()=='db109c6b620965c36f7b818ad16846ec7b13b8f8e79ebbbb63131bb2665f8d7a'
    pdf=pymupdf.open(str(src/'book.pdf'))
    pages=json.loads((src/'pages-spans.json').read_text()); tal=json.loads((src/'tf_verses.json').read_text())
    starts=sorted((min(int(p) for r,(p,_) in json.loads((src/'pages.json').read_text()).items() if r.startswith(b+' ')),b) for b in BOOKS)
    he=collections.OrderedDict();en=collections.OrderedDict(); book=None;ch=0;eh=0;hv=None;ev=None; hyphens=[]; anomalies=[]
    for pi,spans in sorted(pages.items(),key=lambda x:int(x[0])):
        pi=int(pi)
        if pi>913:break
        current=next(b for p,b in reversed(starts) if p<=pi)
        if current!=book:book=current;ch=0;eh=0;hv=None;ev=None
        foot_y=min((s['bbox'][1] for s in spans if abs(s['size']-9.5)<.1),default=640)
        # Hebrew: logical reading order is right to left within each printed line.
        hs=[]; seen={}
        for block in pdf[pi-1].get_text('rawdict')['blocks']:
            for line in block.get('lines',[]):
                for s in line['spans']:
                    if 'SBLHebrew' not in s['font'] or s['bbox'][0]<260 or not 70<s['bbox'][1]<foot_y-2:continue
                    text=''.join(c['c'] for c in s['chars'])
                    if abs(s['size']-9)<.1 or ('Bold' in s['font'] and abs(s['size']-13.5)<.1):
                        hs.append(s|{'text':text,'red':(((s['color']>>16)&255)>127 and ((s['color']>>8)&255)<51 and (s['color']&255)<51)});continue
                    if abs(s['size']-13.5)>.1:continue
                    for c in s['chars']:
                        value=letters(c['c'])
                        if not value:continue
                        x=c['origin'][0];y=c['origin'][1];key=(round(x,2),round(y,2),value)
                        event=s|{'text':value,'red':(((s['color']>>16)&255)>127 and ((s['color']>>8)&255)<51 and (s['color']&255)<51),'bbox':(x,s['bbox'][1],x+1,s['bbox'][3])}
                        if key not in seen or event['red']:seen[key]=event
        hs.extend(seen.values())
        for y,line in lines(hs):
            for s in sorted(line,key=lambda s:-s['bbox'][0]):
                text=s['text']
                if 'Bold' in s['font'] and abs(s['size']-13.5)<.1 and gematria(text)==ch+1:
                    ch+=1;hv=None;continue
                if abs(s['size']-9)<.1:
                    if re.search(r'\d\s*[–‒-]\s*\d',text):continue
                    m=re.search(r'\d+',text)
                    if m:
                        hv=f'{book} {ch}:{int(m[0])}';he.setdefault(hv,[])
                    continue
                if not letters(text):continue
                assert hv,(pi,text,ch)
                he[hv].extend((c,bool(s['red'])) for c in text if 'א'<=c<='ת')
        # English: chapter heads are full-size bold, verse labels are superscript.
        es=[s for s in spans if s['bbox'][2]<300 and s['bbox'][1]>70 and s['bbox'][1]<foot_y-2 and (abs(s['size']-11)<.1 or abs(s['size']-7.34)<.1 or (s['font'].startswith('CharisSIL') and 10.9<s['size']<12.1) or (s['font']=='CharisSIL-Bold' and 10.9<s['size']<13.1))]
        selected={id(s) for s in es}
        omitted=[s['text'] for s in spans if s['bbox'][2]<300 and 70<s['bbox'][1]<foot_y-2 and s['text'].strip() and id(s) not in selected and s['text'].strip() not in {b.upper() for b in BOOKS}]
        assert not omitted,('unhandled English body font',pi,omitted)
        for y,line in lines(es):
            for s in sorted(line,key=lambda s:s['bbox'][0]):
                text=s['text'];text=unicodedata.normalize('NFKC',text)
                if s['font']=='CharisSIL-Bold' and text.strip().isdigit() and int(text.strip())==eh+1:
                    eh+=1;ev=None;continue
                if abs(s['size']-7.34)<.1:
                    m=re.match(r'^\s*\[?(\d+)(?:[‒–-](\d+))?\]?\s*',text)
                    if m:
                        ev=f'{book} {eh}:{int(m[1])}';en.setdefault(ev,[])
                        if m[2]:
                            for v in range(int(m[1])+1,int(m[2])+1):en.setdefault(f'{book} {eh}:{v}',[])
                        text=text[m.end():]
                    # A–J and a–i are editorial subverse labels, not translated words.
                    elif re.fullmatch(r'\s*[A-Ja-j]\s*',text):continue
                if not text:continue
                if not ev:
                    anomalies.append([pi,'unlocated English',text]);continue
                en[ev].append({'text':text,'red':bool(s['red']),'italic':'Italic' in s['font'],'line':[pi,round(y,1)]})
    # Assert the complete Hebrew character stream against the independent upstream extraction.
    failures=[]
    for ref,words in tal.items():
        want=''.join(words);got=''.join(c for c,red in he.get(ref,[]))
        if got!=want:failures.append([ref,want[:100],got[:100],len(want),len(got)])
    unknown=set(he)-set(tal)
    assert not failures,failures[:30]
    assert not unknown,unknown
    # Reinsert graphic word boundaries from the pinned Hebrew text, keeping per-letter red.
    he_words={}
    for ref,words in tal.items():
        chars=he.get(ref,[]);i=0;result=[]
        for word in words:
            part=chars[i:i+len(word)];assert ''.join(c for c,r in part)==word
            result.append(part);i+=len(word)
        assert i==len(chars);he_words[ref]=result
    # Join printed English lines. Resolve discretionary line-end hyphens using
    # an inventory of unbroken words/compounds from this edition itself.
    unbroken=' '.join(''.join((' ' if i and p['line']!=ps[i-1]['line'] else '')+p['text'] for i,p in enumerate(ps)) for ps in en.values())
    vocab=collections.Counter(w.lower() for w in re.findall(r'[A-Za-z]+(?:-[A-Za-z]+)*',unbroken))
    keep=set('seventy-seven eighty-five sixty-seven in-law sea-shore hundred-fold he-asses El-eluwwi dwelling-cities dwelling-house sun-images palm-trees cedar-wood Bet-ayyashimot Ashadot-a mountain-sheep forty-nine fifty-one eye-brows'.split())
    join=set('supplant-ed offen-ded interpreta-tions upper-most cove-nants empti-ness bride-groom whatso-ever sor-cerers ur-gent desig-nated sur-vives instruc-tion cinna-mon fash-ioned reach-ing materi-als soli-tary au-gury wrath-ful stum-ble scrap-ping an-cestors pedi-grees wretched-ness proph-esying par-doned Arbad-dites Amuw-welites Bala-ites bi-lites Yam-nites Yash-bites Bary-ites Abar-ites kil-ites or-dained mis-sing Zam-zamem upright-ness stubborn-ness pos-ess en-chanter uninten-tionally Edom-ite excre-ments perse-cuted recom-pense'.split())
    out_en={}; unresolved=[]
    for ref,parts in en.items():
        out=[];last_line=None
        for p in parts:
            text=p['text'];new_line=last_line is not None and last_line!=p['line']
            if new_line and out:
                left=out[-1]['text'];a=re.search(r'([A-Za-z]+)-$',''.join(x['text'] for x in out)[-100:]);b=re.match(r'^([A-Za-z]+)',text)
                if a and b:
                    joined=(a[1]+b[1]).lower();compound=(a[1]+'-'+b[1]).lower()
                    fragment=a[1]+'-'+b[1]
                    remove=(vocab[joined]>0 and not vocab[compound]) or fragment in join
                    if fragment in keep:remove=False
                    if remove:out[-1]['text']=left[:-1]
                    elif not vocab[compound] and fragment not in keep:unresolved.append([ref,fragment])
                    hyphens.append([ref,a[1]+'-'+b[1],remove])
                elif not left.endswith((' ','\n')) and not text.startswith(' '):out.append({'text':' ','red':False,'italic':False})
            out.append({k:p[k] for k in ['text','red','italic']});last_line=p['line']
        out_en[ref]=out
    assert not unresolved,unresolved
    assert not anomalies,anomalies
    assert set(tal)<=set(out_en),set(tal)-set(out_en)
    assert set(out_en)-set(tal)=={f'Exodus 30:{v}' for v in range(1,11)}
    packed_he={}
    for ref,words in he_words.items():
        packed_he[ref]=[]
        for word in words:
            text=''.join(c for c,r in word);assert len(text)<48
            mask=int(''.join('1' if red else '0' for c,red in word),2)
            packed_he[ref].append([text,mask])
    packed_en={}
    for ref,parts in out_en.items():
        packed=[]
        for p in parts:
            text=re.sub(r'\s+',' ',p['text']);flags=int(p['red'])+2*int(p['italic'])
            if packed and packed[-1][0].endswith(' ') and text.startswith(' '):text=text.lstrip(' ')
            if not text:continue
            if packed and packed[-1][1]==flags:packed[-1][0]+=text
            else:packed.append([text,flags])
        packed_en[ref]=packed
    counts={'heVerses':len(packed_he),'enVerses':len(packed_en),'heWords':sum(map(len,packed_he.values())),
            'heRedCharacters':sum(mask.bit_count() for words in packed_he.values() for text,mask in words),
            'enRedCharacters':sum(len(text.strip()) for parts in packed_en.values() for text,flags in parts if flags&1)}
    data={'source':json.loads((src/'extracted.json').read_text())['source'],'he':packed_he,'en':packed_en,'hyphens':hyphens,'hyphenReview':unresolved,'anomalies':anomalies,'counts':counts}
    (src/'parallel.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    print('Hebrew',len(he_words),'English',len(out_en),'hyphen review',len(unresolved),'anomalies',anomalies[:15])

if __name__=='__main__':main(pathlib.Path(sys.argv[1]))
