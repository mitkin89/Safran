#!/usr/bin/env python3
"""Apply pinned DT-UCPH Tal–Florentin variants and build the Hebrew/English pair.
Called by build.py after the source corpus is generated. Standard library only.
The Hebrew file's existing rel is intentionally stable for installed-library updates.
"""
import collections, difflib, hashlib, html, json, pathlib, re, unicodedata
import importlib.util
_glossary_spec=importlib.util.spec_from_file_location('tal_glossary',pathlib.Path(__file__).with_name('tal_glossary.py'))
_glossary=importlib.util.module_from_spec(_glossary_spec);_glossary_spec.loader.exec_module(_glossary)

OLD='Samaritanischer Pentateuch (CACCHT, DT-UCPH 7.5.0)'
HE='Samaritanischer Pentateuch (Tal–Florentin)'
EN='The Samaritan Pentateuch, Florentin and Tal (2024)'
COLS={'Exodus 40','Leviticus 27','Numbers 36','Deuteronomy 34'}
FINAL=str.maketrans('ךםןףץ','כמנפצ')
letters=lambda s:''.join(re.findall('[א-ת]',unicodedata.normalize('NFKC',s)))
cons=lambda s:letters(s).translate(FINAL)
sha=lambda b:hashlib.sha256(b).hexdigest()

def red_runs(text,mask):
    result=[];state=None;buf=''
    for i,c in enumerate(text):
        red=bool(mask & (1<<(len(text)-i-1)))
        if red!=state and buf:
            result.append(('<span class="mt-diff">'+html.escape(buf)+'</span>') if state else html.escape(buf));buf=''
        state=red;buf+=c
    if buf:result.append(('<span class="mt-diff">'+html.escape(buf)+'</span>') if state else html.escape(buf))
    return ''.join(result)

def anchor_indices(candidates,words,allow_repeats=False):
    found=set();surfaces=[cons(w) for w,mask in words]
    def keys(text):
        return [cons(w) for w in re.findall('[א-ת]+',re.sub('[\u0591-\u05c7]','',text))]
    def hits(seq):return [i for i in range(len(words)-len(seq)+1) if surfaces[i:i+len(seq)]==seq] if seq else []
    for lemma,red in candidates:
        pieces=unicodedata.normalize('NFKC',lemma).split('...');first=keys(pieces[0]);starts=hits(first)
        if not first:continue
        if len(pieces)>1 and keys(pieces[-1]):
            last=keys(pieces[-1]);ranges=[(i,j+len(last)) for i in starts for j in hits(last) if j>=i+len(first)]
        else:ranges=[(i,i+len(first)) for i in starts]
        same_color=[(i,j) for i,j in ranges if any(mask for w,mask in words[i:j])==red]
        if same_color:ranges=same_color
        if len(ranges)==1 or allow_repeats:
            for i,j in ranges:found.update(range(i,j))
    return found

def finish(root,data,g_cons):
    parallel_path=root/'tools/samaritan/tal-parallel.json';source=json.loads(parallel_path.read_text())
    notes=json.loads((root/'tools/samaritan/tal-notes.json').read_text())
    assert source['source']['pdfSha256']==notes['source']['pdfSha256']=='db109c6b620965c36f7b818ad16846ec7b13b8f8e79ebbbb63131bb2665f8d7a'
    manifest_path=root/'bundled/manifest.json';manifest=json.loads(manifest_path.read_text())
    items=[i for i in manifest['items'] if i['versionTitle']==OLD];assert len(items)==5
    variants={int(v['node']):v for v in data['variants']};applied=set();chapters={};original={}
    morphology_count=0;changed_count=0;verse_hashes={};color_hashes={}
    for item in items:
        doc=json.loads((root/'bundled'/item['rel']).read_text());book=item['title'];original[book]=(item,doc)
        for c,chapter in enumerate(doc['text'],1):
            groups=[];which={}
            for verse in chapter:
                for m in re.finditer(r'<span class="w" data-l="sp:(\d+)" data-m="">([^<]*)</span>',verse):
                    sid=int(m[1]);parts=len(data['words'][str(sid)][0]);index=len(groups)
                    surface=' '.join(letters(w) for w in ''.join(g_cons.get(n,'') for n in range(sid,sid+parts)).split())
                    groups.append((surface,sid,parts))
                    for n in range(sid,sid+parts):which[n]=index
            # Text-Fabric node order is physical reading order. In Exodus 29
            # verse 21 occurs after 28; array index order would move it back.
            groups.sort(key=lambda g:g[1])
            which={n:i for i,(w,sid,parts) in enumerate(groups) for n in range(sid,sid+parts)}
            rebuilt=[];i=0
            while i<len(groups):
                word,sid,parts=groups[i]
                vs=[variants[n] for n in range(sid,sid+parts) if n in variants]
                positive=[v for v in vs if v['span']>0]
                if positive:
                    assert len(positive)==1;v=positive[0];assert int(v['node'])==sid
                    end=which[int(v['node'])+v['span']-1]
                    new=[] if v['reading']=='-' else [(letters(w),None) for w in v['reading'].split()]
                    old=[(part,s) for w,s,p in groups[i:end+1] for part in w.split()]
                    for a,b,size in difflib.SequenceMatcher(None,[cons(w) for w,s in old],[cons(w) for w,s in new],autojunk=False).get_matching_blocks():
                        for k in range(size):new[b+k]=(new[b+k][0],old[a+k][1])
                    rebuilt.extend(new);applied.add(int(v['node']));i=end+1
                else:
                    rebuilt.extend((part,sid) for part in word.split());i+=1
                    for v in vs:
                        assert v['span']==0
                        rebuilt.extend((letters(w),None) for w in v['reading'].split());applied.add(int(v['node']))
            chapters[f'{book} {c}']=rebuilt
    assert applied==set(variants),(len(applied),len(variants),set(variants)-applied)
    expected=collections.OrderedDict()
    for ref,words in source['he'].items():expected.setdefault(ref.rsplit(':',1)[0],[]).extend(words)
    assert set(expected)==set(chapters)
    for chapter,words in expected.items():
        got=chapters[chapter];want=[cons(w) for w,mask in words]
        assert [cons(w) for w,sid in got]==want[:len(got)],('variant round trip',chapter,len(got),len(want),[(i,w,words[i][0]) for i,(w,sid) in enumerate(got) if i<len(words) and cons(w)!=want[i]][:12])
        if len(got)<len(want):
            assert chapter in COLS and 'קצימ' in want[len(got):],('unexpected extra words',chapter)
            got.extend((w,None) for w,mask in words[len(got):])
        assert len(got)==len(want)
    context=collections.defaultdict(list)
    for n in notes['notes']:
        for ref in n['targets']:context[ref].append(n)
    data['talNotes']=[];data['talWordNotes']={};data['talWords']={}
    part_ids={}; fallback={}; links=collections.Counter()
    for n in notes['notes']:
        part_ids[n['id']]=[]
        for part in n['parts']:
            i=len(data['talNotes']);part_ids[n['id']].append(i)
            data['talNotes'].append({'noteId':n['id'],'kind':n['kind'],'html':part['html'],'citation':n['citation']})
    def bind(sid,ids):
        dest=data['talWordNotes'].setdefault(sid,[])
        for i in ids:
            if i not in dest:dest.append(i)
    def marker(ref,ids,english=False):
        if not ids:return ''
        sid=('tfe:' if english else 'tf:')+ref.replace(' ',':')+':0'
        data['talWords'][sid]={'ref':ref,'context':True,'language':'English' if english else 'Hebrew'};bind(sid,ids)
        return f'<span class="w tal-note-ref" data-l="{sid}" data-m="">·</span>'
    hs={b:[] for b in original};es={b:[] for b in original};offsets=collections.Counter()
    def set_verse(out,ref,text):
        b,cv=ref.split();c,v=map(int,cv.split(':'));arr=out[b]
        while len(arr)<c:arr.append([])
        while len(arr[c-1])<v:arr[c-1].append('')
        assert not arr[c-1][v-1],ref
        arr[c-1][v-1]=text
    def with_notes(text,ref):
        return text+''.join(f'<sup class="footnote-marker">{i}</sup><i class="footnote">{n["html"]}</i>' for i,n in enumerate(context.get(ref,[]),1))
    for ref,words in source['he'].items():
        chapter=ref.rsplit(':',1)[0];start=offsets[chapter];tokens=chapters[chapter][start:start+len(words)];offsets[chapter]+=len(words)
        word_ids=[]
        for i,((word,mask),(base,sid)) in enumerate(zip(words,tokens),1):
            wid=f'sp:{sid}' if sid is not None else 'tf:'+ref.replace(' ',':')+f':{i}'
            word_ids.append(wid)
            if sid is None:data['talWords'][wid]={'ref':ref,'surface':word,'language':'Hebrew'}
        remaining=[]
        for n in context.get(ref,[]):
            for part,pid in zip(n['parts'],part_ids[n['id']]):
                indices=anchor_indices(part['anchors'],words,bool(re.search(r'\btwice\b|\bboth occurrences\b',part['html'])))
                if indices:
                    for i in indices:bind(word_ids[i],[pid])
                    links['wordRemarks']+=1
                else:remaining.append(pid);links['contextRemarks']+=1
        rendered=[]; pending_id=None; pending=[]
        def flush():
            if pending:
                value=' '.join(pending);cls='w tal-note' if data['talWordNotes'].get(pending_id) else 'w'
                rendered.append(f'<span class="{cls}" data-l="{pending_id}" data-m="">{value}</span>')
        for (word,mask),(base,sid),wid in zip(words,tokens,word_ids):
            assert cons(word)==cons(base)
            value=red_runs(word,mask)
            if sid is not None:morphology_count+=1
            else:changed_count+=1
            if pending and wid!=pending_id:flush();pending=[]
            pending_id=wid;pending.append(value)
        flush()
        set_verse(hs,ref,with_notes(' '.join(rendered)+marker(ref,remaining),ref))
        verse_hashes[ref]=sha(' '.join(w for w,m in words).encode())
        color_hashes[ref]=sha(json.dumps(words,ensure_ascii=False,separators=(',',':')).encode())
    for ref,parts in source['en'].items():
        out=[]
        ids=[i for n in context.get(ref,[]) for i in part_ids[n['id']]]
        trigger=marker(ref,ids,True);csid='tfe:'+ref.replace(' ',':')+':0'
        has_red=False
        for text,flags in parts:
            value=_glossary.markup(text)
            if flags&2:value='<em>'+value+'</em>'
            if flags&1:
                value='<span class="mt-diff">'+value+'</span>'
                if ids:value=f'<span class="w" data-l="{csid}" data-m="">{value}</span>';has_red=True
            out.append(value)
        set_verse(es,ref,with_notes(''.join(out).strip()+('' if has_red else trigger),ref))
    # An apparatus note may describe an explicitly empty range, notably Exod 30:1–10.
    for ref in context:
        b,cv=ref.split();c,v=map(int,cv.split(':'))
        for out,english in [(hs,False),(es,True)]:
            if len(out[b])<c or len(out[b][c-1])<v or not out[b][c-1][v-1]:
                set_verse(out,ref,with_notes(marker(ref,[i for n in context[ref] for i in part_ids[n['id']]],english),ref))
    manifest['items']=[i for i in manifest['items'] if i['versionTitle'] not in {OLD,HE,EN}]
    attribution='Moshe Florentin and Abraham Tal, The Samaritan Pentateuch (Open Book Publishers, 2024), https://doi.org/10.11647/OBP.0415; CC BY-NC 4.0. Red = differences from MT in the printed edition. Original footnotes and endnotes retained.'
    for book,(item,doc) in original.items():
        for kind,version,text,rel in [('he',HE,hs[book],item['rel']),('en',EN,es[book],f'own/{book}/en/{EN}.json')]:
            meta={k:doc[k] for k in ['title','heTitle']};meta.update(language='Hebrew' if kind=='he' else 'English',versionTitle=version,versionSource=attribution,license='CC BY-NC 4.0',licenseUrl='https://creativecommons.org/licenses/by-nc/4.0/',sectionNames=['Chapter','Verse'],versification={'text':'heb','cites':'heb'},talWordNotes=True,text=text)
            if kind=='he':meta['versionSource']+=' Tal readings applied from DT-UCPH/sp 7.5.0 (pinned); CACCHT morphology retained only for unchanged forms. The installed edition path remains stable.'
            raw=json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode();dest=root/'bundled'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
            manifest['items'].append({k:meta[k] for k in ['title','heTitle','language','versionTitle','versionSource']}|{'kind':kind,'categories':item['categories'],'rel':rel,'hash':hashlib.sha1(raw).hexdigest()})
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (root/'samaritan-data.js').write_text('// Generated by tools/samaritan/build.py; source morphology and Tal–Florentin apparatus, CC BY-NC 4.0.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.SAMARITAN_DATA=d;})('+payload+');\n')
    audit={'wordNoteLinks':dict(links),'apparatusParts':len(data['talNotes']),'source':source['source'],'appliedVariants':len(applied),'wordsWithSourceMorphology':morphology_count,'wordsWithoutTransferredMorphology':changed_count,'verseHashes':verse_hashes,'colorHashes':color_hashes,'parallelDataSha256':sha(parallel_path.read_bytes()),'counts':source['counts']}
    (root/'tools/samaritan/tal-source.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print('Tal–Florentin:',len(applied),'applied variants;',morphology_count,'unchanged words with source morphology;',changed_count,'without transferred analysis')
