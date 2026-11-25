"""Import the OCP Aristeas text and safely matched automatic GLAUx analyses.

python3 tools/aristeas/build.py /tmp/safran-aristeas [--fetch] [--check]
Only pinned, SHA256-verified source files are accepted. No text emendations.
"""
import argparse
import collections
import difflib
import hashlib
import html
import json
import pathlib
import re
import ssl
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TITLE = 'Letter of Aristeas'
VERSION = 'Thackeray 1914 (OCP; GLAUx)'
REL = 'own/Letter of Aristeas/other/' + VERSION + '.json'


def js(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def words(text):
    """Same word boundaries as GMorph.words, including combining marks."""
    result = []
    i = 0
    while i < len(text):
        if unicodedata.category(text[i])[0] not in 'LM':
            i += 1
            continue
        start = i
        while i < len(text) and unicodedata.category(text[i])[0] in 'LM':
            i += 1
        if i < len(text) and text[i] in "᾿’'ʼ":
            i += 1
        form = text[start:i]
        if any('\u0370' <= c <= '\u03ff' or '\u1f00' <= c <= '\u1fff' for c in form):
            result.append(form)
    return result


def norm(form):
    # Keep accents: a different accented word never borrows an analysis.
    return ''.join(c for c in unicodedata.normalize('NFC', form).lower().replace('ς', 'σ')
                   if unicodedata.category(c)[0] in 'LM' and c not in "᾿’'ʼ")


def occurrences(sequence, part):
    return sum(sequence[i:i + len(part)] == part for i in range(len(sequence) - len(part) + 1))


def align(base, source):
    """Match only identical, unique runs in the *same* numbered paragraph.

    Full matching paragraphs are accepted. Otherwise runs need at least three
    consecutive reader words and must occur exactly once in each paragraph.
    Different token boundaries, accent differences and gaps remain unresolved.
    """
    a = list(map(norm, base))
    b = [norm(r['form']) for r in source]
    out = [None] * len(base)
    changes = []
    for kind, i, j, k, l in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if kind != 'equal':
            changes.append(dict(kind=kind, ocp=base[i:j], glaux=[r['form'] for r in source[k:l]]))
            continue
        full = i == k == 0 and j == len(a) and l == len(b)
        if full or (j - i >= 3 and occurrences(a, a[i:j]) == occurrences(b, a[i:j]) == 1):
            out[i:j] = source[k:l]
    return out, changes


def base36(n):
    result = ''
    while True:
        result = '0123456789abcdefghijklmnopqrstuvwxyz'[n % 36] + result
        n //= 36
        if not n:
            return result


def review(report):
    lines = ['# Aristeas: Abgleich OCP / GLAUx', '',
             'Keine Textkorrekturen vorgenommen. Diese Liste stellt die digitalen Quellen gegenüber; '
             'sie entscheidet nicht, welche Lesart dem Druck entspricht.', '',
             f"Alle 322 Abschnitte verglichen: {report['words']} Leserwörter, {report['annotated']} mit "
             f"automatischer GLAUx-Analyse, {report['unresolved']} ohne Analyse.", '',
             'OCP hat alle 322 Abschnitte; die XML-Nummern „43 “ und „271 “ enthalten ein abschließendes '
             'Leerzeichen, das nur für die Zuordnung entfernt wird. GLAUx enthält keinen Abschnitt 43. '
             'Die 42 Wörter dieses Abschnitts stehen vollständig im Lesetext, ohne Morphologie.', '',
             '168 lateinische Navigationsmarker aus GLAUx werden nicht als griechische Wörter importiert. '
             'GLAUx trennt außerdem manche Partikeln mit Bindestrichen; diese Teilanalysen werden nicht '
             'zu einer Analyse des zusammengeschriebenen OCP-Wortes vereinigt.', '',
             'Die Zuordnung akzeptiert identische ganze Abschnitte oder eindeutig verankerte Folgen von '
             'mindestens drei identischen Wörtern im selben Abschnitt. Akzente bleiben beim Vergleich erhalten. '
             'Kurze Restfolgen bleiben gegebenenfalls ebenfalls ohne Analyse. Die morphologische Richtigkeit '
             'der automatischen Quellanalysen wurde nicht Wort für Wort redaktionell geprüft.', '',
             '| § | OCP → GLAUx (Quellenabweichungen) | Leserwörter ohne Analyse (Position: Wort) |',
             '| --- | --- | --- |']
    for row in report['differences']:
        changes = [' '.join(c['ocp']) + ' → ' + (' '.join(c['glaux']) or '∅') for c in row['changes']]
        missing = [str(w['word']) + ': ' + w['form'] for w in row['unresolved']]
        lines.append('| ' + str(row['section']) + ' | ' + ('; '.join(changes) or '—') + ' | ' + ('; '.join(missing) or '—') + ' |')
    return '\n'.join(lines) + '\n'


class Table:
    def __init__(self):
        self.data = dict(F=[], L=[], T=[], E=[], P={})
        self.maps = {key: {} for key in 'FLTE'}

    def intern(self, key, value):
        lookup = tuple(value) if isinstance(value, list) else value
        if lookup not in self.maps[key]:
            self.maps[key][lookup] = len(self.data[key])
            self.data[key].append(value)
        return self.maps[key][lookup]

    def add(self, locus, base, matched):
        ids = []
        for form, row in zip(base, matched):
            valid = row and row['lemma'] and re.fullmatch('[a-z0-9-]{9}', row['tag'])
            entry = [self.intern('F', form), self.intern('L', row['lemma']) if valid else -1,
                     self.intern('T', row['tag']) if valid else -1]
            ids.append(base36(self.intern('E', entry)))
        self.data['P'][locus] = '.'.join(ids)


def build(cache, fetch=False):
    config = json.loads((HERE / 'sources.json').read_text())
    sources = {}
    for name, spec in config.items():
        path = cache / (name + '.xml')
        if fetch and not path.exists():
            cache.mkdir(parents=True, exist_ok=True)
            context = ssl.create_default_context()
            # python.org macOS builds may lack the system CA bundle.
            system_certs = pathlib.Path('/etc/ssl/cert.pem')
            if system_certs.is_file():
                context.load_verify_locations(cafile=str(system_certs))
            data = urllib.request.urlopen(spec['url'], timeout=60, context=context).read()
            if digest(data) != spec['sha256']:
                raise ValueError('Source checksum: ' + name)
            path.write_bytes(data)
        raw = path.read_bytes()
        if digest(raw) != spec['sha256']:
            raise ValueError('Source checksum: ' + name)
        sources[name] = ET.fromstring(raw)

    ocp = {}
    greek = sources['ocp'].find("version[@title='Greek']")
    for div in greek.findall('./text/div'):
        label = div.get('number').strip()  # source labels "43 " and "271 "
        if label == 'Title':
            continue
        if not re.fullmatch('[1-9][0-9]*', label) or label in ocp:
            raise ValueError('Invalid or duplicate OCP section: ' + label)
        ocp[label] = unicodedata.normalize('NFC', ''.join(div.find('unit/reading').itertext()).strip())
    if set(ocp) != {str(n) for n in range(1, 323)}:
        raise ValueError('OCP must contain all 322 sections')

    glaux = collections.defaultdict(list)
    discarded = []
    for sentence in sources['glaux'].findall('sentence'):
        if sentence.get('document_id') != '1183-001' or sentence.get('analysis') != 'auto':
            raise ValueError('Unexpected GLAUx work or analysis type')
        for word in sentence.findall('word'):
            form = unicodedata.normalize('NFC', word.get('form', ''))
            parts = words(form)
            if not parts:
                # Includes punctuation and Latin navigation links (E).
                if re.search('[A-Za-z]', form):
                    discarded.append(dict(id=word.get('id'), section=word.get('div_section'), form=form))
                continue
            # GLAUx marks split enclitics with a leading/trailing hyphen.
            # Keep their separate boundaries; never combine their analyses.
            if parts != [form.strip('-')]:
                raise ValueError('Unexpected GLAUx word boundary: ' + form)
            label = word.get('div_section', '').strip()
            if label not in ocp:
                raise ValueError('Unknown GLAUx section: ' + label)
            glaux[label].append(dict(id=word.get('id'), form=form,
                                    lemma=unicodedata.normalize('NFC', word.get('lemma', '')),
                                    tag=word.get('postag', '')))

    table = Table()
    text = []
    locator = {}
    report = dict(sections=322, words=0, annotated=0, unresolved=0, source='glaux', analysis='auto',
                  missingGlauxSections=[], discardedNavigation=discarded, differences=[], coverage=[])
    for n in range(1, 323):
        locus = str(n)
        base = words(ocp[locus])
        matched, changes = align(base, glaux[locus])
        if not glaux[locus]:
            report['missingGlauxSections'].append(n)
        table.add(locus, base, matched)
        text.append(html.escape(ocp[locus], quote=False))
        locator[js([locus])] = locus
        annotated = sum(bool(r and r['lemma'] and re.fullmatch('[a-z0-9-]{9}', r['tag'])) for r in matched)
        report['words'] += len(base)
        report['annotated'] += annotated
        report['coverage'].append(dict(section=n, words=len(base), annotated=annotated))
        if changes or annotated != len(base):
            report['differences'].append(dict(section=n, changes=changes,
                                              unresolved=[dict(word=i + 1, form=f) for i, (f, r) in enumerate(zip(base, matched)) if not r]))
    report['unresolved'] = report['words'] - report['annotated']
    data = dict(title=TITLE, heTitle='אגרת אריסטיאס', language='Greek', versionTitle=VERSION,
                versionSource='H. St. J. Thackeray, 1914, via Online Critical Pseudepigrapha (OCP, CC BY 4.0); '
                              'automatic morphology: GLAUx, Alek Keersmaekers and contributors (CC BY-SA 4.0; '
                              'Wikisource source text CC BY-SA 3.0). https://pseudepigrapha.org/; '
                              'https://github.com/alekkeersmaekers/glaux. '
                              'Wording preserved; unmatched words have no analysis. See tools/aristeas/sources.json.',
                sectionNames=['Verse'], text=text,
                greekMorphology=dict(version=1, work='tlg1183.tlg001', source='glaux', analysis='auto',
                                     textHash=digest(js(text).encode()), locator=locator, **table.data))
    return data, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('cache', type=pathlib.Path)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data, report = build(args.cache, args.fetch)
    payload = js(data).encode()
    coverage = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    review_text = review(report)
    target = ROOT / 'bundled' / REL
    manifest_path = ROOT / 'bundled/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    item = dict(rel=REL, title=TITLE, heTitle=data['heTitle'], language='Greek', versionTitle=VERSION,
                categories=['Second Temple', 'Apocrypha'], kind='other', hash=hashlib.sha1(payload).hexdigest())
    if args.check:
        if (target.read_bytes() != payload or (HERE / 'coverage.json').read_text() != coverage
                or (HERE / 'REVIEW.md').read_text() != review_text or item not in manifest['items']):
            raise ValueError('Generated Aristeas files are out of date')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        manifest['items'] = [i for i in manifest['items'] if i['rel'] != REL] + [item]
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
        (HERE / 'coverage.json').write_text(coverage)
        (HERE / 'REVIEW.md').write_text(review_text)
    print(f"Aristeas: 322 sections; {report['annotated']}/{report['words']} words annotated; {report['unresolved']} unresolved")


if __name__ == '__main__':
    main()
