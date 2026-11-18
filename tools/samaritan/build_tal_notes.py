#!/usr/bin/env python3
"""Build source-labelled Tal–Florentin notes from tal_notes.py's external output.
Usage: python3 -I tools/samaritan/build_tal_notes.py /path/to/tal-source
Directory: extracted.json, tf_verses.json, tf_verses_meta.json (DT-UCPH pin).
No network access. Rebuild the editions afterwards with tools/samaritan/build.py.
"""
import collections, hashlib, html, json, pathlib, re, sys
import importlib.util
_glossary_spec=importlib.util.spec_from_file_location('tal_glossary',pathlib.Path(__file__).with_name('tal_glossary.py'))
_glossary=importlib.util.module_from_spec(_glossary_spec);_glossary_spec.loader.exec_module(_glossary)

ROOT=pathlib.Path(__file__).resolve().parents[2]
BOOKS=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']
PIN='db109c6b620965c36f7b818ad16846ec7b13b8f8e79ebbbb63131bb2665f8d7a'
letters=lambda s: ''.join(re.findall('[א-ת]',s))

def correspondence(tal):
    # Notes now accompany the Tal–Florentin main text itself. Retain its own
    # verse labels rather than remapping them to the former CACCHT edition.
    result={ref:[ref] for ref in tal}
    for v in range(1,11):result[f'Exodus 30:{v}']=[f'Exodus 30:{v}']
    return result,{}

def source_refs(note):
    book,cv=note['ref'].split();chapter=int(cv.split(':')[0])
    label=re.sub(r'^\[?\d+\.', '', note['label'])
    nums=[int(n) for n in re.findall(r'\d+',label)]
    if not nums: nums=[int(cv.split(':')[1])]
    if '–' in label and len(nums)==2: nums=list(range(nums[0],nums[1]+1))
    return [f'{book} {chapter}:{n}' for n in dict.fromkeys(nums)]

def render(spans):
    spans=[dict(s) for s in spans]
    while spans:
        spans[-1]['text']=re.sub(r'[\s|]+$', '', spans[-1]['text'])
        if spans[-1]['text']:break
        spans.pop()
    merged=[]
    for span in spans:
        if merged and span['font']==merged[-1]['font'] and span.get('red',False)==merged[-1].get('red',False) and ('SBLHebrew' in span['font'] or 'Scheherazade' in span['font']):
            # Rejoin a quotation across a printed line/page break before bidi
            # isolation, so its word order survives reflow at any reader width.
            merged[-1]['text']+=' '+span['text']
        else:merged.append(span)
    out=[];last=None
    for span in merged:
        key=(span['page'],round(span['y']/5))
        if last and key!=last and out and not out[-1].endswith(' '):out.append(' ')
        text=span['text'];assert '\ufffd' not in text,('unreadable glyph',span)
        # Do not translate the source or silently alter historical spelling.
        escaped=_glossary.markup(text)
        if 'SBLHebrew' in span['font'] or 'Scheherazade' in span['font']:
            escaped='\u2067'+escaped+'\u2069'
        if 'Italic' in span['font']:escaped='<em>'+escaped+'</em>'
        elif 'Bold' in span['font']:escaped='<b>'+escaped+'</b>'
        if span.get('red'):escaped='<span class="mt-diff">'+escaped+'</span>'
        out.append(escaped);last=key
    body=''.join(out).strip()
    # A vertical bar separates adjacent apparatus entries on a printed page.
    return '\u2066'+body+'\u2069'

def note_parts(note):
    # Bars separate apparatus remarks; each remark quotes its own Samaritan
    # lemma first. Preserve the complete block separately for search/export.
    spans=[dict(s) for s in note['spans']]
    while spans and (not spans[0]['text'].strip() or (spans[0]['font']=='CharisSIL-Bold' and re.fullmatch(r'[\d.,\[\] a-j–-]+',spans[0]['text']))):spans.pop(0)
    parts=[[]]
    for span in spans:
        for i,text in enumerate(span['text'].split('|')):
            if i:parts.append([])
            if text:parts[-1].append(span|{'text':text})
    result=[]
    for part in parts:
        if not any(s['text'].strip() for s in part):continue
        anchors=[];prefix='';first=True
        for span in part:
            text=span['text']
            if 'SBLHebrew' in span['font'] and re.search('[א-ת]',text):
                primary=first and not re.search('[A-Za-z]',prefix)
                if primary or (span.get('red') and not re.search('[\u0591-\u05c7]',text)):
                    item=[text.strip(),bool(span.get('red'))]
                    if item not in anchors:anchors.append(item)
                first=False
            prefix+=text
        result.append({'html':render(part),'anchors':anchors})
    assert result,note['ref']
    return result

def build(src):
    data=json.loads((src/'extracted.json').read_text()); meta=json.loads((src/'tf_verses_meta.json').read_text())
    assert data['source']['pdfSha256']==meta['sha256']==PIN
    assert hashlib.sha256((src/'tf_verses.json').read_bytes()).hexdigest()=='ca2192d88800343905d320fe275c79a17a5e8a93119e7141beb2093f38854fce', 'Tal verse extraction differs from pinned upstream'
    tal=json.loads((src/'tf_verses.json').read_text()); mapping,evidence=correspondence(tal)
    original=data['notes'];notes=[]
    for n in original:
        # A bold comma-separated reference can be split into two spans in PDF.
        if notes:
            prior=notes[-1];tail=''.join(s['text'] for s in prior['spans'][1:])
            if prior['kind']==n['kind'] and re.fullmatch(r'[\s,–\-\[\]]*',tail) and prior['label'].endswith(','):
                n['label']=prior['label']+' '+n['label'];n['spans']=prior['spans']+n['spans'];notes.pop()
        notes.append(n)
    result=[]
    for i,n in enumerate(notes,1):
        refs=source_refs(n); targets=list(dict.fromkeys(t for ref in refs for t in mapping[ref]))
        if not any(tal.get(ref) for ref in targets):targets=targets[:1]
        body=render(n['spans']);label=n['label'];book=n['ref'].split()[0]
        if len(n['spans'])>1 and re.fullmatch(r'[\d.]+',label):
            suffix=re.match(r'^([a-i])(?:\s|$)',n['spans'][1]['text'])
            if suffix: label+=suffix[1]
        typ='Fußnote' if n['kind']=='footnote' else 'Endnote'
        header=f'Tal–Florentin, {typ} {book} {n["ref"].split()[1].split(":")[0]}:{label.split(".")[-1]} (S. '+', '.join(map(str,n['pages']))+')'
        result.append({'id':i,'kind':n['kind'],'refs':refs,'targets':targets,'pages':n['pages'],'pdfPages':n['pdfPages'],
                       'citation':header,'parts':note_parts(n),
                       'html':'<br>\u2066'+html.escape(header)+'<br>'+body+'\u2069<br>'})
    counts=dict(collections.Counter(n['kind'] for n in result));assert counts=={'footnote':3459,'endnote':790},counts
    lock={'source':data['source']|{'title':'The Samaritan Pentateuch: An English Translation with a Parallel Annotated Hebrew Text',
          'authors':['Moshe Florentin','Abraham Tal'],'download':'https://zenodo.org/records/19850840/files/c626ab74-3df2-4291-a871-030f76c129b5_book.pdf',
          'dtUcphCommit':'e8a120f2e92b6558fd39bbe72f830ded871a0a47','talVersesSha256':hashlib.sha256((src/'tf_verses.json').read_bytes()).hexdigest(),
          'changes':'PDF extraction; repaired glyph encodings using embedded fonts; RTL word order restored; original language and readings retained. Original Tal–Florentin verse references; red markings retained from PDF spans.'},
          'glossary':{'source':'Symbols and Abbreviations, pp. 81–84; References, pp. 71–78','language':'German explanations','sha256':hashlib.sha256(pathlib.Path(_glossary.__file__).read_bytes()).hexdigest()},
          'counts':counts,'sourceBlocks':dict(collections.Counter(n['kind'] for n in original)), 'correspondenceExceptions':evidence,'notes':result}
    dest=ROOT/'tools/samaritan/tal-notes.json';dest.write_text(json.dumps(lock,ensure_ascii=False,separators=(',',':'))+'\n')
    print(counts,'source blocks',lock['sourceBlocks'],'bytes',dest.stat().st_size)

if __name__=='__main__':build(pathlib.Path(sys.argv[1]))
