"""Greek pseudepigrapha: preserve OCP witnesses and separate automatic analyses.

python3 tools/pseudepigrapha/build.py CACHE [--fetch] [--check]
Generate analyses separately with annotate.py; no NLP dependency at build/runtime.
"""
import argparse
import collections
import gzip
import hashlib
import html
import importlib.util
import json
import pathlib
import re
import subprocess
import unicodedata as U
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CONFIG = json.loads((HERE / 'sources.json').read_text())
spec = importlib.util.spec_from_file_location('aristeas_build', HERE.parent / 'aristeas/build.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
js, digest, words = shared.js, shared.digest, shared.words


def checked(cache, fetch=False):
    roots = {}
    for name, source in CONFIG['ocp'].items():
        path = cache / (name + '.xml')
        if fetch and not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['curl', '-fsSL', '--max-time', '60', source['url'], '-o', str(path)], check=True)
        raw = path.read_bytes()
        if digest(raw) != source['sha256']:
            raise ValueError('OCP checksum: ' + name)
        roots[name] = ET.fromstring(raw)
    return roots


def leaves(node, path=()):
    """All source units are retained, in original document order."""
    if node.findall('unit'):
        yield path, node.findall('unit')
    for child in node.findall('div'):
        yield from leaves(child, path + (child.get('number').strip(),))


def read_units(units, witness, alternatives=None):
    selected = []
    for unit in units:
        choices = [r for r in unit.findall('reading') if witness in r.get('mss', '').split()]
        if len(choices) > 1:
            primary = [r for r in choices if r.get('option') == '0']
            if len(primary) != 1:
                raise ValueError('Ambiguous primary witness reading: ' + witness + ' ' + str(unit.attrib))
            if alternatives is not None:
                alternatives.extend(dict(unit=unit.get('id'), option=r.get('option'), text=U.normalize('NFC',''.join(r.itertext()).strip())) for r in choices if r is not primary[0])
            choices = primary
        if choices:
            selected.append(U.normalize('NFC', ''.join(choices[0].itertext()).strip()))
    return ' '.join(selected).strip()


def insert(tree, path, value, append=False):
    cur = tree
    for depth, n in enumerate(path):
        i = int(n) - 1
        if i < 0:
            raise ValueError('Invalid source number')
        while len(cur) <= i:
            cur.append('' if depth == len(path) - 1 else [])
        if depth == len(path) - 1:
            if cur[i] and not append:
                raise ValueError('Duplicate source locus')
            cur[i] = (cur[i] + '<br>' if cur[i] else '') + value if append else value
        else:
            cur = cur[i]


def editions(roots):
    manifest = json.loads((ROOT / 'bundled/manifest.json').read_text())
    parent = next(e for e in manifest['items'] if e['title'] == 'The Testaments of the Twelve Patriarchs' and e['kind'] == 'de')
    german = json.loads((ROOT / 'bundled' / parent['rel']).read_text())
    patriarchs = list(german['text'])
    result = []
    for name, root in roots.items():
        version = next(v for v in root.findall('version') if v.get('language') == 'Greek')
        mss = version.findall('./manuscripts/ms')
        for ms in mss:
            witness = ms.get('abbrev')
            key = name + '-' + witness
            title = {'T12P': parent['title'], 'PsPhoc': 'Pseudo-Phokylides', '3Bar': '3 Baruch', '1En': 'Das Buch Henoch'}[name]
            text = {} if name in ('T12P', '3Bar') else []
            paths, passages, headings, alternatives = {}, {}, {}, {}
            parts = [d.get('number').strip() for d in version.find('text').findall('div')]
            if name == 'T12P' and len(parts) != 12:
                raise ValueError('Expected twelve testaments')
            for path, units in leaves(version.find('text')):
                variants = []
                value = read_units(units, witness, variants)
                if not value:
                    continue
                if path[-1] == 'Title':
                    headings['.'.join(path[:-1])] = value
                    continue
                locus = '.'.join(path)
                if variants:
                    alternatives[locus] = variants
                if locus in passages:
                    raise ValueError('Duplicate locus: ' + locus)
                passages[locus] = value
                suffix = re.fullmatch(r'([1-9][0-9]*)([a-z])', path[-1])
                if suffix:
                    path = path[:-1] + (suffix[1],)
                rendered = ('<small>[' + locus + ']</small> ' if suffix else '') + html.escape(value, quote=False)
                if name == 'T12P':
                    branch = patriarchs[parts.index(path[0])]
                    target = text.setdefault(branch, [])
                    insert(target, path[1:], rendered, bool(suffix))
                    address = [branch] + [int(p) - 1 for p in path[1:-1]] + [path[-1]]
                elif name == '3Bar':
                    branch = 'Prologue' if path[0] == 'Prologue' else ''
                    target = text.setdefault(branch, [])
                    numeric = path[1:] if branch else path
                    insert(target, numeric, rendered, bool(suffix))
                    address = [branch] + [int(p) - 1 for p in numeric[:-1]] + [numeric[-1]]
                else:
                    insert(text, path, rendered, bool(suffix))
                    address = [int(p) - 1 for p in path[:-1]] + [path[-1]]
                address_key = js(address)
                paths[address_key] = ([paths[address_key]] if isinstance(paths.get(address_key), str) else paths.get(address_key, [])) + [locus] if suffix else locus
            # Match the existing German Henoch numbering, including all missing chapters.
            if name == '1En':
                while len(text) < 108:
                    text.append([])
            result.append(dict(key=key, name=name, title=title, witness=witness,
                               edition=' '.join(ms.findtext('bibliography', '').split()),
                               witnessName=ms.findtext('name', witness), text=text, passages=passages,
                               locator=paths, headings=headings, alternatives=alternatives))
    return result


def spans(text):
    """Original reader words with character offsets and conservative fragment flags."""
    result = []
    i, depth = 0, 0
    while i < len(text):
        c = text[i]
        if c in '[<⟦':
            depth += 1
        elif c in ']>⟧':
            depth = max(0, depth - 1)
        if U.category(c)[0] not in 'LM':
            i += 1
            continue
        start = i
        while i < len(text) and U.category(text[i])[0] in 'LM':
            i += 1
        if i < len(text) and text[i] in "᾿’'ʼ":
            i += 1
        form = text[start:i]
        if not words(form):
            continue
        uncertain = bool(depth or '\u0323' in U.normalize('NFD', form)
                         or (start and text[start-1] in '-‐') or (i < len(text) and text[i] in '-‐'))
        result.append(dict(form=form, start=start, end=i, uncertain=uncertain))
    return result


def oga(cache, fetch=False):
    path = cache / 'enoch.oga.jsonl.gz'
    if fetch and not path.exists():
        subprocess.run(['curl','-fsSL','--max-time','60',CONFIG['oga']['url'],'-o',str(path)],check=True)
    raw = gzip.decompress(path.read_bytes())
    if digest(raw) != CONFIG['oga']['sha256Uncompressed']:
        raise ValueError('OGA checksum')
    out = collections.defaultdict(list)
    for line in raw.splitlines():
        r = json.loads(line)
        if not r.get('artificial'):
            fs = words(r['form'])
            for f in fs:
                out[r['locus']].append(dict(form=f, lemma=r.get('lemma') if len(fs) == 1 else None, tag=r.get('morph')))
    return out


def build(cache, check=False, fetch=False):
    source_editions = editions(checked(cache, fetch))
    annotation_raw = gzip.decompress((HERE / 'stanza-annotations.jsonl.gz').read_bytes())
    annotation_meta = json.loads((HERE / 'annotation-source.json').read_text())
    if digest(annotation_raw) != annotation_meta['sha256Uncompressed']:
        raise ValueError('Stanza annotation checksum')
    annotations = {r['key']: r for r in map(json.loads, annotation_raw.splitlines())}
    exclusions = collections.defaultdict(list)
    for row in json.loads((HERE/'review-exclusions.json').read_text()):
        exclusions[row['key']].append(row)
    existing = json.loads((ROOT / 'bundled/manifest.json').read_text())
    old_rels = {x['rel'] for x in json.loads((HERE / 'coverage.json').read_text()).get('editions', [])} if (HERE / 'coverage.json').exists() else set()
    existing['items'] = [e for e in existing['items'] if e['rel'] not in old_rels]
    assets, outputs = {}, {}
    report = dict(editions=[], sourceCommit=CONFIG['ocpCommit'], analysis='automatic, not editorially reviewed')
    og = oga(cache, fetch)
    for edition in source_editions:
        key = edition['key']
        table = shared.Table()
        coverage = []
        for locus, value in edition['passages'].items():
            ws = spans(value)
            row = annotations[key + ':' + locus]
            if row['textHash'] != digest(value.encode()) or row['forms'] != [w['form'] for w in ws]:
                raise ValueError('Annotation/source mismatch: ' + key + ':' + locus)
            rs = [dict(form=f, lemma=r[0], tag=r[1], source='stanza') if r else None for f, r in zip(row['forms'], row['analyses'])]
            excluded = set()
            for exclusion in exclusions[key+':'+locus]:
                i=exclusion['word']-1
                if row['forms'][i]!=exclusion['form'] or row['analyses'][i]!=exclusion['modelAnalysis']:
                    raise ValueError('Review exclusion changed: '+key+':'+locus)
                rs[i]=None;excluded.add(i)
            # Only a complete, identical Gizeh verse can inherit OGA; never bridge witnesses.
            old = og.get(locus, []) if edition['name'] == '1En' and edition['witness'] == 'Gizeh' else []
            if old and len(old) == len(ws) and all(shared.norm(w['form']) == shared.norm(r['form']) for w, r in zip(ws, old)):
                rs = [dict(r, source='oga') if r.get('lemma') else rs[i] for i, r in enumerate(old)]
            for i, w in enumerate(ws):
                if w['uncertain']:
                    rs[i] = None
            table.add(locus, [w['form'] for w in ws], rs)
            # Keep provenance per encoded entry, including verses with mixed layers.
            ids = table.data['P'][locus].split('.') if ws else []
            newids = []
            for entry_id, r in zip(ids, rs):
                e = table.data['E'][int(entry_id, 36)][:3] + [(r or {}).get('source', 'stanza')]
                newids.append(shared.base36(table.intern('E', e)))
            table.data['P'][locus] = '.'.join(newids)
            coverage.append(dict(locus=locus, words=len(ws), stanza=sum(bool(r and r.get('lemma') and r['source']=='stanza') for r in rs),
                                 oga=sum(bool(r and r.get('lemma') and r['source']=='oga') for r in rs),
                                 unresolved=[dict(word=i+1, form=w['form'], reason='doubtful model analysis pending review' if i in excluded else 'fragment/restoration' if w['uncertain'] else 'no valid model analysis')
                                             for i, (w, r) in enumerate(zip(ws, rs)) if not r or not r.get('lemma')]))
        text_hash = digest(js(edition['text']).encode())
        work = {'T12P':'ocp:T12P', 'PsPhoc':'tlg1605.tlg001', '3Bar':'ocp:3Bar', '1En':'tlg1463.tlg001'}[edition['name']]
        assets[key] = dict(version=1, work=work, textHash=text_hash, source='stanza', **table.data)
        vt = ('OCP / ' + edition['witnessName'] + (' (vorläufig; automatische Morphologie)' if edition['name']=='T12P' else ' (automatische Morphologie)'))
        parent = next((e for e in existing['items'] if e['title']==edition['title']), {})
        data = dict(title=edition['title'], heTitle=parent.get('heTitle',''), language='Greek', versionTitle=vt,
                    versionSource='https://pseudepigrapha.org/; OCP '+CONFIG['ocpCommit']+'; '+edition['edition']+
                                  '. Text: OCP CC BY 4.0; '+('Wikisource CC BY-SA 4.0; ' if edition['name']=='T12P' else '')+'Automatic Stanza 1.11.0: Perseus POS, PROIEL lemma; '
                                  'identical complete Gizeh verses may use OGA 0.2.0 (CC BY-SA 4.0). No manual linguistic review. '
                                  'See tools/pseudepigrapha/README.md; analysis licenses are separate from text.',
                    sectionNames=['Chapter','Verse'], text=edition['text'],
                    greekMorphology=dict(version=1, work=work, source='stanza', annotationRef=key, textHash=text_hash,
                                         locator=edition['locator'], sourceTitles=edition['headings'],
                                         sourceAlternatives=edition['alternatives'],
                                         provisional=edition['name']=='T12P', witness=edition['witness'],
                                         sourceNotice='OCP / Wikisource: noch nicht am Charles-Druck kollationiert.' if edition['name']=='T12P' else ''))
        # Stable ASCII names remain safe on Windows, independent of the printed witness name.
        rel='own/Pseudepigrapha-'+key+'/other/OCP Greek.json'
        payload=js(data)
        outputs[ROOT/'bundled'/rel]=payload
        existing['items'].append(dict(rel=rel,title=data['title'],heTitle=data['heTitle'],language='Greek',versionTitle=vt,
                                     categories=parent.get('categories',['Second Temple','Apocrypha']),kind='other',hash=hashlib.sha1(payload.encode()).hexdigest()))
        report['editions'].append(dict(key=key,rel=rel,title=data['title'],witness=edition['witness'],edition=edition['edition'],
                                       passages=len(coverage),words=sum(r['words']for r in coverage),
                                       stanza=sum(r['stanza']for r in coverage),oga=sum(r['oga']for r in coverage),
                                       unresolved=sum(len(r['unresolved'])for r in coverage),coverage=coverage))
        if edition['name']=='1En':
            report['editions'][-1]['unattestedChapters']=[i+1 for i,ch in enumerate(edition['text']) if not ch or not any(ch)]
    asset='// Automatic Greek analyses: Stanza (Perseus POS, PROIEL lemma); separately licensed CC BY-NC-SA 4.0. OGA entries: CC BY-SA 4.0.\n// Sources, model checksums and licenses: tools/pseudepigrapha/. No model weights shipped.\nwindow.GREEK_PSEUDEPIGRAPHA_AUTO='+js(assets)+';\n'
    outputs[ROOT/'greek-pseudepigrapha-auto.js']=asset
    outputs[HERE/'coverage.json']=json.dumps(report,ensure_ascii=False,indent=2)+'\n'
    lines=['# Offene griechische Wortanalysen','',
           'Keine Textkorrekturen vorgenommen. Automatische Morphologie, nicht redaktionell Wort für Wort geprüft. '
           'Die Testamente sind laut OCP noch nicht am Charles-Druck kollationiert. '
           'Zwölf zweifelhafte Bestimmungen des einleitenden Ἀντίγραφον werden ohne Ersatzanalyse zurückgehalten '
           '(Originalausgaben des Modells und Positionen in review-exclusions.json).','',
           'Alle 1.752 Quellabschnitte geprüft; 33.983 Leserwörter, 32.101 Stanza-Analysen, '
           '1.615 OGA-Analysen und 267 offene Positionen. Das ist Zuordnungsabdeckung, keine linguistische Genauigkeit. '
           'Die im jeweiligen Henoch-Zeugen nicht überlieferten Kapitel stehen ausdrücklich in coverage.json unter '
           'unattestedChapters; sie werden nicht mit anderen Zeugen aufgefüllt.','',
           '| Fassung | Quellstelle | Wortpositionen ohne Analyse | Grund |','| --- | --- | --- | --- |']
    reasons={'fragment/restoration':'Fragment oder Ergänzung','no valid model analysis':'Keine verwendbare Modellanalyse',
             'doubtful model analysis pending review':'Zweifelhafte Modellanalyse, Prüfung offen'}
    for edition in report['editions']:
        for row in edition['coverage']:
            if row['unresolved']:
                lines.append('| '+edition['key']+' | '+row['locus']+' | '+'; '.join(str(w['word'])+': '+w['form'] for w in row['unresolved'])+' | '+', '.join(dict.fromkeys(reasons[w['reason']]for w in row['unresolved']))+' |')
    outputs[HERE/'REVIEW.md']='\n'.join(lines)+'\n'
    outputs[ROOT/'bundled/manifest.json']=json.dumps(existing,ensure_ascii=False,indent=1)
    for path, payload in outputs.items():
        if check:
            if path.read_text()!=payload:raise ValueError('Outdated output: '+str(path))
        else:
            path.parent.mkdir(parents=True,exist_ok=True);path.write_text(payload)
    for e in report['editions']:
        print(e['key'],e['passages'],'passages;',e['words'],'words;',e['stanza'],'Stanza;',e['oga'],'OGA;',e['unresolved'],'unresolved')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('cache',type=pathlib.Path);p.add_argument('--fetch',action='store_true');p.add_argument('--check',action='store_true');a=p.parse_args();build(a.cache,a.check,a.fetch)
