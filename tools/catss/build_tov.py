#!/usr/bin/env python3
"""Build the separate Tov/CATSS apparatus; never rewrite bundled source editions."""
import gzip
import hashlib
import html
import json
import re
import runpy
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name('tov-source')
URL = 'https://llds.ling-phil.ox.ac.uk/llds/xmlui/handle/20.500.14106/1111'
# Labels translate the source key; they are explanations, not new textual judgements.
CODES = {
 '--+': 'Plus der LXX gegenüber dem ausgerichteten MT; kein Nachweis einer anderen hebräischen Vorlage',
 '---': 'Minus der LXX: kein griechisches Gegenstück zum ausgerichteten hebräischen Text',
 '{x}': 'Scheinbares Plus/Minus bei längeren nicht äquivalenten Textabschnitten',
 '{d}': 'Doublette', '{!}': 'Hebräischer Infinitivus absolutus',
 '{t}': 'Transliteriertes hebräisches Wort',
 '{p}': 'Griechisches Präverb für eine hebräische Präposition',
 '{s}': 'Griechischer Komparativ/Superlativ für hebräisches מן',
 '{v}': 'Haupttext der LXX möglicherweise sekundär; ursprüngliche Lesart in einer Variante',
 '{*}': 'Übereinstimmung mit Ketiv', '{**}': 'Übereinstimmung mit Qere',
 '{g}': 'Unterschied zwischen Rahlfs und der betreffenden Göttinger Ausgabe',
 '{#}': 'Mit Asterisk gekennzeichnete Passage (Hiob)',
 '{...}': 'Gegenstück steht an anderer Stelle; vom Quellindex übergangen',
 '{..d}': 'Eine griechische Wiedergabe bezieht sich auf mehrere hebräische Wörter',
 '{..r}': 'Hebräisches Element in der Übersetzung wiederholt',
 '{..p}': 'Im Griechischen aus sprachlichen oder übersetzungstechnischen Gründen ergänzte Präposition',
 '{..~}': 'Stilistische oder grammatische Umstellung',
 '~~~': 'Umstellung: Gegenstück an anderer Stelle im Vers oder Kontext',
 '~': 'Unterschiedliche Wortfolge zwischen MT und LXX',
 "''": 'Längeres Plus oder Minus (mindestens vier Quellzeilen)',
 '=': 'Spalte b: Auswahl erschlossener hebräischer Lesarten und übersetzungstechnischer Hinweise',
 '=;': 'Rückübersetzung aufgrund eines Gegenstücks im näheren oder ferneren Kontext',
 '=@': 'Etymologische Auslegung', '=:': 'Rekonstruierter Eigenname',
 '=v': 'Unterschiedliche Vokalisierung / Lesung', '=r': 'Unvollständige Rückübersetzung',
 '=+': 'Unterschied in Zahlenangaben', '=%': 'Übersetzungstechnik',
 '=%vap': 'Wechsel von Aktiv zu Passiv', '=%vpa': 'Wechsel von Passiv zu Aktiv',
 '=%p': 'Unterschied in Präposition oder Partikel', '=%p+': 'Ergänzung von Präposition oder Partikel',
 '=p%-': 'Auslassung von Präposition oder Partikel (Schreibung des Quellschlüssels)',
 '.m': 'Metathese von Konsonanten', '.z': 'Mögliche Abkürzung',
 '.s': 'Ein MT-Wort entspricht mehreren Wörtern der vermuteten Vorlage',
 '.j': 'Mehrere MT-Wörter entsprechen einem Wort der vermuteten Vorlage',
 '.w': 'Andere Worttrennung in der vermuteten Vorlage',
 '.rd': 'Austausch von ר und ד zwischen MT und vermuteter Vorlage',
 '?': 'Unsichere Angabe oder Zuordnung; Unsicherheit der Quelle bleibt erhalten',
 '[n]': 'Abweichende Versnummer der LXX', '[[n]]': 'Abweichende Versnummer des MT',
 'G': 'Hebräische Variante, für die keine plausible Rückübersetzung vorgeschlagen wird',
}

def labels(h, g):
    raw = h + ' ' + g
    found = []
    for sign in ['--+', '---', "''", '~~~']:
        if sign in raw: found.append(sign)
    if '~' in raw and '~~~' not in raw: found.append('~')
    for m in re.finditer(r'\{([^}]*)\}', raw):
        content = m[1]
        sign = '{' + content.replace('?', '') + '}'
        if sign not in CODES:
            sign = next((k for k in ['{..p}', '{..d}', '{..r}', '{..~}', '{...}'] if content.startswith(k[1:-1])), None)
        found.append(sign or m[0])
    if '=' in h:
        b = h[h.index('='):]
        sign = next((k for k in sorted(CODES, key=len, reverse=True) if k.startswith('=') and b.startswith(k)), '=')
        found.append(sign)
    for m in re.finditer(r'(?<!\S)\.([a-z]+)', h):
        found.append(m[0])
    if '?' in raw: found.append('?')
    return list(dict.fromkeys(found))

def column_text(column, hebrew):
    # Operator + in =+ is the numerical-difference code, not Hebrew tet.
    prefix = next((c for c in sorted(CODES, key=len, reverse=True)
                   if c.startswith('=') and column.startswith(c)), '')
    return prefix + re.sub(r'[A-Z)(&$+/]+',
                           lambda m: hebrew(m[0]) if m[0] != 'G' else m[0],
                           column[len(prefix):])


def build():
    hashes = {}
    # Reuse the exact established parser/Unicode conversion in read-only mode.
    with tempfile.TemporaryDirectory() as tmp:
        for p in sorted(SOURCE.glob('file*-1111.txt.gz')):
            raw = gzip.decompress(p.read_bytes()); hashes[p.name[:-3]] = hashlib.sha256(raw).hexdigest()
            Path(tmp, p.name[:-3]).write_bytes(raw)
        argv = sys.argv
        try:
            sys.argv = ['catss.py', tmp]
            codec = runpy.run_path(str(Path(__file__).with_name('catss.py')), run_name='tov_reader')
        finally: sys.argv = argv
        names, greek, hebrew = codec['NAMES'], codec['greek'], codec['hebrew']
        manifest = json.loads((ROOT/'bundled/manifest.json').read_text())['items']
        variants = codec['VERS']
        data = {'schema': 1, 'source': {'title': 'Tov/Kraft · CATSS', 'url': URL, 'license': 'CC BY-NC-SA 3.0', 'sha256': hashes}, 'codes': CODES, 'editions': {}, 'mt': {}, 'verses': {}}
        mt_docs = {}
        for item in manifest:
            if item['versionTitle'].startswith('Westminster'):
                raw = (ROOT/'bundled'/item['rel']).read_bytes()
                mt_docs[item['title']] = (json.loads(raw),item['rel'],hashlib.sha256(raw).hexdigest())
        audit = {'source': data['source'], 'excluded': {}, 'coverage': {}, 'bundledSha256': {}, 'mtSha256': {}}
        for code, chapters in codec['books'].items():
            if code == 'Esth':
                audit['excluded'][code] = 'Oxford-Abschnitt Esth enthält Esra statt Esther; nicht als Esther-Apparat verwendet'
                continue
            vt = 'Septuaginta (CATSS' + (', ' + variants[code] if code in variants else '') + ')'
            item = next((i for i in manifest if i['title'] == names[code] and i['versionTitle'] == vt), None)
            if not item and code not in ('Hos','Jsha'): audit['excluded'][code] = 'Keine entsprechende eingebundene CATSS-Fassung'; continue
            if not item:
                data['editions'][code]={'book':names[code],'versionTitle':vt+' · Originalapparat','rel':None,'sourceOnly':True}
                audit['coverage'][code]={'verses':sum(len(v) for v in chapters.values()),'remarks':0,'sourceOnly':True}
                continue
            raw = (ROOT/'bundled'/item['rel']).read_bytes()
            doc = json.loads(raw)
            # Never silently assign the source to another edition or verse.
            mismatches = []
            for ch, verses in chapters.items():
                for vs, units in verses.items():
                    old = doc['text'][ch-1][vs-1] if ch <= len(doc['text']) and vs <= len(doc['text'][ch-1]) else None
                    if old != codec['verse_html'](units): mismatches.append(f'{ch}:{vs}')
            if mismatches:
                audit['excluded'][code] = {'reason': 'Quellfassung stimmt nicht vollständig mit der eingebundenen Fassung überein', 'verses': mismatches}
                continue
            audit['bundledSha256'][item['rel']] = hashlib.sha256(raw).hexdigest()
            data['editions'][code] = {'book': names[code], 'versionTitle': vt, 'rel': item['rel']}
            audit['coverage'][code] = {'verses': sum(len(v) for v in chapters.values()), 'remarks': 0}
        for p in sorted(Path(tmp).glob('file*-1111.txt')):
            code = None; ch = vs = 0; positions = {}; h_positions = {}; h_sequences = {}
            for line, text in enumerate(p.read_text('latin1').split('\n'), 1):
                text = text.rstrip('\r')
                if text.startswith('~'):
                    m = re.search(r'c"([^"]+)"', text)
                    if m:
                        code = m[1]; ch = 1 if re.search(r'"y\d*$', text) else 0; vs = 0; continue
                    m = re.match(r'~x(\d*)(?:y(\d+))?', text)
                    if m: ch = int(m[1]) if m[1] else ch+1; vs = int(m[2]) if m[2] else 1; continue
                    m = re.match(r'~y(\d*)', text)
                    if m: vs = int(m[1]) if m[1] else vs+1
                    continue
                if code not in data['editions'] or len(text) <= 30 or not ch or not vs: continue
                h, g = text[:30].rstrip(), text[30:].strip()
                k = f'{code} {ch}:{vs}'
                line_units = []; codec['add_line'](h,g,line_units)
                start = positions.get(k,0)
                positions[k] = start + sum(len(u.get('g',[])) for u in line_units)
                base = h.split('=',1)[0]
                hw = [] if base.lstrip().startswith(('{','--+','^^^')) else [hebrew(w.strip('*')) for w in base.split() if re.fullmatch(r'[A-Z)(&$+/*]+',w)]
                hw = [w for w in hw if w]
                h_start = h_positions.get(k,0)
                h_sequences.setdefault(k,[]).extend(hw); h_positions[k] = h_start+len(hw)
                signs = labels(h,g)
                # Plain aligned words are context, not textual-critical findings.
                if not signs and not any(c in h+g for c in ['{','[']): continue
                ref = f'{names[code]} {ch}:{vs}'
                k = f'{code} {ch}:{vs}'
                if k not in data['verses']:
                    units = codec['books'][code][ch][vs]
                    data['verses'][k] = {'ref': ref, 'edition': code, 'pairs': [[' '.join(greek(w) for w in u['g']), ' '.join(u['h']), u.get('f',''), ' '.join(u.get('r',[]))] for u in units if 'g' in u], 'hWords': h_sequences[k], 'remarks': []}
                    mt_doc,mt_rel,mt_hash = mt_docs[names[code]]
                    mt_verse = mt_doc['text'][ch-1][vs-1] if ch<=len(mt_doc['text']) and vs<=len(mt_doc['text'][ch-1]) else ''
                    data['mt'][ref] = [html.unescape(re.sub('<[^>]*>','',w)) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',mt_verse)]
                    audit['mtSha256'][mt_rel] = mt_hash
                # Keep both original columns verbatim. Unknown codes stay visible;
                # their meaning is never inferred from the translated surface.
                gw = [greek(w) for w in re.sub(r'\{[^}]*\}', ' ', g).split() if re.search('[A-Z]', w) and not re.search(r'[\[\]\d]',w) and greek(w)]
                col_b = h[h.index('='):] if '=' in h else ''
                data['verses'][k]['remarks'].append({'hStart': h_start, 'hCount': len(hw), 'start': start, 'h': ' '.join(hw), 'g': ' '.join(gw), 'b': col_b, 'bText': column_text(col_b, hebrew), 'codes': signs, 'raw': [h,g], 'file': p.name, 'line': line})
                audit['coverage'][code]['remarks'] += 1
        # The already bundled CATSS Psalms/Proverbs/Job retain alignment flags,
        # but not the full original Tov columns. Expose only what survives there,
        # explicitly as a reading-text extract, without manufacturing Tov remarks.
        flag_codes={'z':'--+','m':'---','d':'{d}','i':'{!}','t':'{t}','v':'{p}','s':'{s}','u':'[u]'}
        data['codes']['[u]']='Platzhalter einer nicht äquivalenten CATSS-Ausrichtung im eingebundenen Lesetext; Original-Spaltenhinweis nicht erhalten'
        data['source']['bundled']={}
        for book,code in [('Psalms','Ps'),('Proverbs','Prv'),('Job','Job')]:
            item=next(i for i in manifest if i['title']==book and i['versionTitle']=='Septuaginta (CATSS)')
            raw=(ROOT/'bundled'/item['rel']).read_bytes();doc=json.loads(raw)
            data['source']['bundled'][item['rel']]=hashlib.sha256(raw).hexdigest()
            data['editions'][code]={'book':book,'versionTitle':item['versionTitle'],'rel':item['rel'],'origin':'bundled-CATSS'}
            audit['bundledSha256'][item['rel']]=hashlib.sha256(raw).hexdigest()
            audit['coverage'][code]={'verses':0,'remarks':0,'origin':'bundled-CATSS'}
            mt_doc,mt_rel,mt_hash=mt_docs[book];audit['mtSha256'][mt_rel]=mt_hash
            for ch,verses in enumerate(doc['text'],1):
                for vs,verse in enumerate(verses,1):
                    pairs=[];remarks=[];hWords=[];position=0
                    for group,match in enumerate(re.finditer(r'<span class="wg(?: wm)?"([^>]*)>(.*?)</span>',verse)):
                        attrs=dict(re.findall(r'([a-z-]+)="([^"]*)"',match[1]));h=html.unescape(attrs.get('data-h',''));g=html.unescape(re.sub('<[^>]*>','',match[2]));flags=attrs.get('data-f','');retro=html.unescape(attrs.get('data-r',''))
                        pairs.append([g,h,flags,retro]);hs=len(hWords);hw=h.split();hWords.extend(hw)
                        codes=[v for k,v in flag_codes.items() if k in flags]
                        if retro:codes.append('=;')
                        if codes:
                            remarks.append({'origin':'bundled-CATSS','hStart':hs,'hCount':len(hw),'start':position,'h':h,'g':g,'b':'=;'+retro if retro else '', 'bText':'=;'+retro if retro else '', 'codes':codes,'raw':[match[0]],'file':item['rel'],'line':group+1,'group':group+1})
                        position+=sum(bool(re.search('[\u0370-\u03ff\u1f00-\u1fff]',w)) for w in g.split())
                    if not pairs:continue
                    audit['coverage'][code]['verses']+=1
                    if not remarks:continue
                    ref=f'{book} {ch}:{vs}';key=f'{code} {ch}:{vs}'
                    data['verses'][key]={'ref':ref,'edition':code,'pairs':pairs,'hWords':hWords,'remarks':remarks,'origin':'bundled-CATSS'}
                    mt_verse=mt_doc['text'][ch-1][vs-1] if ch<=len(mt_doc['text']) and vs<=len(mt_doc['text'][ch-1]) else ''
                    data['mt'][ref]=[html.unescape(re.sub('<[^>]*>','',w)) for w in re.findall(r'<span class="w"[^>]*>(.*?)</span>',mt_verse)]
                    audit['coverage'][code]['remarks']+=len(remarks)

        data['coverage'] = audit['coverage']; data['excluded'] = audit['excluded']
        out = json.dumps(data,ensure_ascii=False,separators=(',',':'))
        (ROOT/'tov-data.js').write_text('/* Tov/Kraft CATSS · CC BY-NC-SA 3.0; generated by tools/catss/build_tov.py */\n(function(r){const d='+out+';for(const v of Object.values(d.verses))v.text=v.pairs.map(p=>p[0]).filter(Boolean).join(" " );if(typeof module!=="undefined"&&module.exports)module.exports=d;else r.TOV_DATA=d;})(typeof window!=="undefined"?window:globalThis);\n')
        (SOURCE.parent/'tov-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({'editions': len(data['editions']), 'annotatedVerses': len(data['verses']), 'remarks': sum(v['remarks'] for v in audit['coverage'].values()), 'excluded': {k:(v if isinstance(v,str) else len(v['verses'])) for k,v in audit['excluded'].items()}},ensure_ascii=False))

if __name__ == '__main__': build()
