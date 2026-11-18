#!/usr/bin/env python3
"""Extract Tal–Florentin's apparatus from the licensed publisher PDF.
Requires PyMuPDF and fonttools. No OCR or spelling corrections. Input PDF is external.
Usage: python3 tools/samaritan/tal_notes.py book.pdf output-directory
"""
import collections, hashlib, html, io, json, pathlib, re, sys, unicodedata
import pymupdf
import fontTools
from fontTools.ttLib import TTFont
from fontTools.agl import toUnicode

BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']

def logical_glyphs(chars):
    # The PDF paints these runs in visual order. Reverse RTL glyphs but retain
    # embedded Latin/Greek words and numbers as LTR runs (e.g. MT, not TM).
    chunks=[]; pending=''
    for value in chars:
        if all(unicodedata.bidirectional(c) in {'L','EN','AN','NSM'} for c in value) and not any('\u0590'<=c<='\u05ff' for c in value):
            pending+=value;continue
        if pending:
            chunks.append(pending);pending=''
        chunks.append(value.translate(str.maketrans({'(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<'})))
    if pending:chunks.append(pending)
    return unicodedata.normalize('NFKC',''.join(reversed(chunks)))

class Extractor:
    def __init__(self, pdf):
        self.doc = pymupdf.open(pdf)
        self.fonts = {}; self.repairs = collections.Counter(); self.unresolved = collections.Counter()

    def font(self, xref):
        if xref not in self.fonts:
            f = TTFont(io.BytesIO(self.doc.extract_font(xref)[3]))
            self.fonts[xref] = (f, {f.getGlyphID(name): chr(cp) for cp,name in f.getBestCmap().items()})
        return self.fonts[xref]

    def spans(self, page):
        # Text traces expose actual glyph IDs, unlike the defective PDF ToUnicode
        # mappings (small capitals, fi/fl ligatures, Arabic contextual forms).
        fonts = {}
        for f in page.get_fonts():
            name = f[3].split('+')[-1].replace(',', '-')
            fonts[name] = self.font(f[0])
        corrected = {}; rtl = []
        for s in page.get_texttrace():
            name = s['font'].replace(',', '-')
            if name not in fonts: raise ValueError(('font', name))
            f, cm = fonts[name]
            for cp,gid,origin,bbox in s['chars']:
                glyph = f.getGlyphName(gid)
                value = cm.get(gid) or toUnicode(glyph)
                if glyph.endswith('.sc'):
                    value = toUnicode(glyph[:-3]).upper()
                if glyph == 'absAutoKashida': value = 'ـ'
                if not value:
                    self.unresolved[(name,glyph,cp)] += 1
                    value = chr(cp)
                if value != chr(cp): self.repairs[(name,glyph,value)] += 1
                if 'Scheherazade' in name or 'SBLHebrew' in name:
                    rtl.append((origin, value if cp==65533 else chr(cp), gid, name))
                if cp == 65533:
                    corrected[(name, round(origin[0],2),round(origin[1],2))] = value
        out=[]
        for b in page.get_text('rawdict')['blocks']:
            for line in b.get('lines',[]):
                for s in line['spans']:
                    name=s['font'].replace(',', '-')
                    def decode(c):
                        x,y=c['origin']; key=(name,round(x,2),round(y,2))
                        if unicodedata.combining(c['c']) and ('SBLHebrew' in name or 'Scheherazade' in name):return c['c']
                        if c['c'].isspace(): return c['c']
                        if key in corrected:return corrected[key]
                        # MuPDF treats a wrongly encoded small-cap J as a Telugu
                        # combining mark and slightly shifts its reported origin.
                        if '\u0900'<=c['c']<='\u0dff' and name.startswith('CharisSIL'):
                            nearby=[(abs(xx-x),value) for (font,xx,yy),value in corrected.items() if font==name and abs(yy-y)<.1 and abs(xx-x)<1]
                            if nearby:return min(nearby)[1]
                        return c['c']
                    text=''.join(decode(c) for c in s['chars'])
                    # get_text restores letters in each Hebrew word but leaves the
                    # sequence of words in visual order. Reverse this sequence.
                    if 'SBLHebrew' in name and re.search('[א-ת]',text):
                        text=' '.join(reversed(text.split(' ')))
                    out.append(dict(text=unicodedata.normalize('NFKC',text),font=name,size=s['size'],bbox=s['bbox'],baseline=s['chars'][0]['origin'][1]))
        merged=[]
        for span in out:
            if ('Scheherazade' in span['font'] or 'SBLHebrew' in span['font']) and merged and merged[-1]['font']==span['font'] and abs(merged[-1]['baseline']-span['baseline'])<5:
                prev=merged[-1]; prev['text']+=span['text']; prev['bbox']=(min(prev['bbox'][0],span['bbox'][0]),min(prev['bbox'][1],span['bbox'][1]),max(prev['bbox'][2],span['bbox'][2]),max(prev['bbox'][3],span['bbox'][3]))
            else: merged.append(span)
        output=[]
        for span in merged:
            if 'Scheherazade' not in span['font'] and not ('SBLHebrew' in span['font'] and re.search('[א-תﬠ-תּ]',span['text'])):
                output.append(span);continue
            chars=[v for o,v,g,name in rtl if name==span['font'] and abs(o[1]-span['baseline'])<5 and span['bbox'][0]-.1<=o[0]<span['bbox'][2]]
            visual=''.join(chars)
            # Some Latin delimiters are painted in SBL Hebrew too. Keep them
            # between their Hebrew runs rather than reversing the whole line.
            breaks=[m for m in re.finditer(r'[^\u0590-\u05ff\ufb1d-\ufb4f]+',visual) if 'SBLHebrew' in span['font'] and any(unicodedata.bidirectional(c)=='L' for c in m[0])]
            if not breaks:
                output.append(span|{'text':logical_glyphs(chars)});continue
            pos=0
            for m in breaks:
                if m.start()>pos:output.append(span|{'text':logical_glyphs(list(visual[pos:m.start()]))})
                output.append(span|{'font':'CharisSIL','text':m[0]});pos=m.end()
            if pos<len(visual):output.append(span|{'text':logical_glyphs(list(visual[pos:]))})
        return output

    def extract(self):
        notes=[]; current=None; book=None; chapter=None; kind=None
        for pi,page in enumerate(self.doc):
            if pi<103: continue
            raw=page.get_text()
            if re.search(r'Endnotes Genesis',raw): kind='endnote'
            if re.search(r'Indexes|INDEXES|Index of', raw[:200]) and kind=='endnote': break
            if pi<913: kind='footnote'
            elif kind!='endnote': continue
            spans=self.spans(page)
            pn=next((s['text'] for s in spans if s['font']=='CharisSIL' and abs(s['size']-10)<.1 and s['text'].isdigit() and s['bbox'][1]>640),None)
            if not pn: continue
            if int(pn)>1032: break
            # The English running header carries the book even on odd pages
            # whose visible running header is Hebrew (look for the main title).
            eng=' '.join(s['text'] for s in spans if (s['bbox'][1]<60 or abs(s['size']-18)<.1))
            detected=next((b for b in BOOKS if re.search(r'\b'+b+r'\b',eng,re.I)),None)
            if detected and detected!=book: book=detected; chapter=None
            he_book={'בראשית':'Genesis','שמות':'Exodus','ויקרא':'Leviticus','במדבר':'Numbers','דברים':'Deuteronomy'}
            for s in spans:
                if s['bbox'][1]<60 or abs(s['size']-18)<.1:
                    for he,b in he_book.items():
                        if he in s['text'] and b!=book: book=b; chapter=None
            if kind=='footnote':
                selected=[s for s in spans if s['bbox'][1]<640 and s['bbox'][1]>80 and abs(s['size']-13.5)>.1 and abs(s['size']-18)>.1
                          and (s['size']<9.6) and (s['size']>6)]
                # Only apparatus lines contain 9.5pt material: exclude 9pt verse
                # numbers and 6.3pt superscripts in the running Hebrew column.
                ys=[s['bbox'][1] for s in selected if abs(s['size']-9.5)<.1]
                selected=[s for s in selected if any(abs(s['bbox'][1]-y)<6 for y in ys)]
            else:
                selected=[s for s in spans if 70<s['bbox'][1]<640]
            if not selected: continue
            # Preserve PDF content-stream line order; the publisher stores each
            # apparatus line left to right with Hebrew word runs within it.
            for s in selected:
                text=s['text']; bold=s['font']=='CharisSIL-Bold'
                if kind=='endnote' and bold:
                    m=re.fullmatch(r'(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Chapter) (\d+)',text.strip())
                    if m:
                        if m[1]!='Chapter': book=m[1]
                        chapter=int(m[2]); current=None; continue
                marker=bold and bool(re.match(r'^\s*\[?\d',text))
                if marker:
                    label=text.strip()
                    m=re.match(r'^\[?(?:(\d+)\.)?(\d+)',label)
                    if m[1]: chapter=int(m[1])
                    if not book or not chapter: raise ValueError(('unlocated',pi+1,label,book,chapter))
                    current={'kind':kind,'ref':f'{book} {chapter}:{int(m[2])}','label':label,'pages':[int(pn)],'pdfPages':[pi+1],'spans':[]}
                    notes.append(current)
                elif current is None:
                    # A new apparatus page may continue an earlier note.
                    prior=next((n for n in reversed(notes) if n['kind']==kind),None)
                    if not prior: raise ValueError(('orphan',pi+1,text))
                    current=prior
                if int(pn) not in current['pages']:
                    current['pages'].append(int(pn));current['pdfPages'].append(pi+1)
                current['spans'].append({'text':text,'font':s['font'],'size':round(s['size'],2),'y':round(s['bbox'][1],1),'page':pi+1})
        return notes


def main(pdf,out):
    ex=Extractor(pdf); notes=ex.extract(); out.mkdir(parents=True,exist_ok=True)
    result={'source':{'doi':'https://doi.org/10.11647/OBP.0415','license':'CC BY-NC 4.0','pdfSha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pymupdf':pymupdf.VersionBind,'fonttools':fontTools.__version__},'notes':notes,
            'repairs':[[*k,v] for k,v in ex.repairs.items()], 'unresolved':[[*k,v] for k,v in ex.unresolved.items()]}
    (out/'extracted.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    print(collections.Counter(n['kind'] for n in notes));print('unresolved',list(ex.unresolved.items())[:50])

if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
