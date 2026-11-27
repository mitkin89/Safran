"""Bind unchanged Digital Mishnah words to source locations and explicit visual readings.

The TEI location is not a visual verification. Review readings never replace
the diplomatic text, existing pointing, morphology or lexical glosses.
"""
from pathlib import Path
import copy,gzip,hashlib,json,re,subprocess,xml.etree.ElementTree as ET

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REVIEWS=HERE/'kaufmann-image-review'
XMLID='{http://www.w3.org/XML/1998/namespace}id'
WORD=re.compile(r"[א-ת□][א-ת\u0591-\u05c7□'’׳\"]*")
POINTS=re.compile('[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]')

def sha(data):return hashlib.sha256(data).hexdigest()
def tag(e):return e.tag.rsplit('}',1)[-1]
def letters(s):return re.sub('[^א-ת]','',s or '')

def locations(xml,units):
    state={'folio':None,'column':None,'sourceLine':None}
    result={}
    def mark(e):
        t=tag(e)
        if t=='pb':
            m=re.search(r'(\d+)([rv])',e.get('n',''))
            if m:state.update(folio=m[1].zfill(3)+m[2],column=None,sourceLine=None)
        if t=='cb':
            m=re.search(r'(\d+)([rv])([AB])',e.get('n',''))
            if m:state.update(folio=m[1].zfill(3)+m[2],column='right' if m[3]=='A' else 'left',sourceLine=None)
        if t=='lb':
            if e.get('n') is not None:
                state['sourceLine']=e.get('n');state.pop('unnumberedLine',None)
            else:state['unnumberedLine']=True
    def unit(ab,ref):
        chars=[];positions=[]
        def emit(s):chars.extend(s);positions.extend([copy.copy(state) for _ in s])
        def walk(e):
            t=tag(e)
            if t in ['label','fw','note','surplus','del']:return
            if t=='choice':
                chosen=next((c for name in ['abbr','orig','sic'] for c in e if tag(c)==name),None)
                if chosen is None:raise ValueError('Unclassified choice')
                walk(chosen);return
            if t=='gap':emit('□');return
            if t in ['lb','cb','pb']:
                mark(e)
                if e.get('break')!='no':emit(' ')
                return
            if t=='space':return
            marginal=t=='add' and 'margin' in e.get('place','')
            prior=copy.copy(state) if marginal else None
            if marginal:state['placement']=e.get('place')
            emit(e.text or '')
            for c in e:walk(c);emit(c.tail or '')
            if marginal:state.clear();state.update(prior)
        walk(ab)
        text=''.join(chars);u=units[ref]
        if text!=u['originalOffsetText']:raise ValueError('Source extraction drift '+ref)
        matches=list(WORD.finditer(text))
        if len(matches)!=len(u['words']):raise ValueError('Word count drift '+ref)
        for i,(m,w) in enumerate(zip(matches,u['words'])):
            if m.group()!=w['originalWord']:raise ValueError('Word drift '+ref)
            spans=[]
            for p in positions[m.start():m.end()]:
                if p not in spans:spans.append(p)
            if any(not p['folio'] or not p['column'] or p['sourceLine'] is None for p in spans):raise ValueError('Missing source location '+ref+' '+repr(spans)+' '+m.group())
            result[u['id']+'/word/'+str(i)]={'ref':ref,'wordIndex':i,'originalWord':w['originalWord'],'locations':spans}
    def walk(e):
        mark(e)
        ref=next((r for r,u in units.items() if tag(e)=='ab' and e.get(XMLID)==u['id']),None)
        if ref:unit(e,ref);return
        for c in e:walk(c)
    walk(ET.fromstring(xml))
    return result

def build():
    script="process.stdout.write(JSON.stringify(require('./mishnah-kaufmann-berakhot-data')));"
    D=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT))
    xml=gzip.decompress((HERE/'sources/S07326.xml.gz').read_bytes())
    if sha(xml)!=D['source']['diplomaticSha256']:raise ValueError('Diplomatic XML hash mismatch')
    inventory=json.loads((REVIEWS/'images.json').read_text())
    images={re.search(r'fol\.\s*(\d+[rv])',f['name'])[1].zfill(4):f for f in inventory['images']}
    # Normalize the numeric folio portion independently of r/v.
    images={re.sub(r'^(\d+)([rv])$',lambda m:m[1].zfill(3)+m[2],k):v for k,v in images.items()}
    words=locations(xml,D['units']);reviews={};pages={};unmapped=[]
    for file in sorted(REVIEWS.glob('*.json')):
        if file.name=='images.json':continue
        page=json.loads(file.read_text());folio=page['folio'];image=images.get(folio)
        if not image or page['imageName']!=image['name'] or page['imageSha256']!=image['sha256']:raise ValueError('Review image mismatch '+str(file))
        seen=set();line_keys={(l['column'],l['line']) for l in page['lines']}
        if len(line_keys)!=len(page['lines']):raise ValueError('Duplicate reviewed line '+folio)
        for line in page['lines']:
            x1,y1,x2,y2=line['bbox']
            if not(0<=x1<x2<=image['width'] and 0<=y1<y2<=image['height']):raise ValueError('Invalid source-image bbox '+folio)
        for w in page['words']:
            u=D['units'].get(w['ref']);i=w['wordIndex']
            if not u or not isinstance(i,int) or i<0 or i>=len(u['words']):raise ValueError('Invalid word pointer '+str(file))
            key=u['id']+'/word/'+str(i);source=words[key]
            if key in seen or w['originalWord']!=source['originalWord']:raise ValueError('Duplicate/stale review '+key)
            if w['status'] not in ['clear','uncertain','not-visible']:raise ValueError('Invalid review status '+key)
            if (w['column'],w['line']) not in line_keys:raise ValueError('Unknown reviewed line '+key)
            if not any(p['folio']==folio for p in source['locations']):raise ValueError('Word assigned to wrong folio '+key)
            if w['status']=='clear' and (not w.get('reading') or '□' in w['reading']):raise ValueError('Unreadable clear review '+key)
            seen.add(key)
            reviews.setdefault(key,[]).append({**w,'folio':folio,'sourceFile':file.name,'lettersRelation':'same' if letters(w.get('reading'))==letters(w['originalWord']) else 'different' if w.get('reading') else 'unknown'})
        pages[folio]={'lines':len(page['lines']),'words':len(page['words']),'statuses':{s:sum(w['status']==s for w in page['words']) for s in ['clear','uncertain','not-visible']},'limitations':page.get('limitations',[])}
        unmapped.extend({'folio':folio,**x} for x in page.get('unmapped',[]))
    counts={}
    for key,w in words.items():
        if any(p['folio'] not in images for p in w['locations']):raise ValueError('Source image missing '+key)
        candidates=reviews.get(key,[])
        if len(candidates)>1 and len({(c['status'],c.get('reading')) for c in candidates})>1:status='conflicting'
        else:status=candidates[0]['status'] if candidates else 'not-reviewed'
        w.update(reviewStatus=status,reviews=candidates)
        counts[status]=counts.get(status,0)+1
    out={'version':1,'title':D['title'],'targetTextHash':D['source']['textHash'],'diplomaticSha256':sha(xml),'source':'https://archive.org/details/Mishnah_Kaufman_ms','locationMethod':'Original TEI pb/cb/lb markers; source location alone is not image verification','reviewMethod':'AI visual readings with explicit uncertainty; no automatic textual, pointing or morphological changes','images':images,'words':words,'summary':{'sourceWords':len(words),'sourceUnits':len(D['units']),'imagePages':len(images),'reviewPages':len(pages),'statuses':counts},'pages':pages,'unmapped':unmapped}
    data='// Image locations and explicitly qualified visual observations; not a new text edition.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_KAUFMANN_IMAGE_DATA=D;})('+json.dumps(out,ensure_ascii=False,separators=(',',':'))+');\n'
    (ROOT/'mishnah-kaufmann-image-data.js').write_text(data)
    (REVIEWS/'../kaufmann-image-review-summary.json').write_text(json.dumps({k:out[k] for k in ['source','diplomaticSha256','targetTextHash','locationMethod','reviewMethod','summary','pages']},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(out['summary']))

if __name__=='__main__':build()
