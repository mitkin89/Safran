"""Reproduce Digital Mishnah preprocessing and cache chapter CollateX results.

Build-only tool; no downloads, server calls or Java dependencies in the app.
See README.md for the pinned inputs required in --upstream-dir.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
DATA_COMMIT = '39389be30e93032d722e8dd3b7bcdfe15e76a421'
APP_COMMIT = '60792f6078128ba15a741d2ec3ac013784d07e0c'
SIGS = ['S07326', 'S00483', 'S01520']


def prepare_query(source, data_uri):
    """eXist/Saxon compatibility and lossless handling of nested orig nodes."""
    edits = [
        ('module namespace ws2j', 'declare namespace ws2j'),
        ('import module namespace config = "http://www.digitalmishnah.org/config" at "config.xqm";',
         'declare namespace config = "http://www.digitalmishnah.org/config";'),
        ('import module namespace console="http://exist-db.org/xquery/console";', ''),
        ('declare boundary-space strip;', ''),
        ('xquery version "3.1";', 'xquery version "3.1";\ndeclare boundary-space strip;'),
        ('declare namespace functx', 'declare namespace map="http://www.w3.org/2005/xpath-functions/map";\n'
         'declare namespace array="http://www.w3.org/2005/xpath-functions/array";\ndeclare namespace functx'),
        ('declare function functx:pad-integer-to-length',
         'declare variable $config:data-root := "' + data_uri + '";\ndeclare function functx:pad-integer-to-length'),
        ('$w/text(),', "string-join($w/text(), ''),"),
        ('matches($this,', "matches(string-join($this, ''),"),
        # Some Parma abbreviations encode an empty expansion. Preserve their
        # actual surface form rather than indexing an empty array.
        ('$rText?1', '(if (array:size($rText) > 0) then $rText?1 else $tText)'),
        # Upstream descends into choice/orig but then discards an inner orig
        # as an unknown element. Retain its actual diplomatic text; no reg
        # reading or reconstructed characters are substituted.
        ('         case element(damageSpan)',
         '         case element(orig)\n'
         '            return ws2j:w-children($n/node(), $id)\n'
         '         case element(damageSpan)'),
        ('<output:method>json</output:method>', '<output:method value="json"/>'),
        ('"witnesses" : for $ab in $wSequence', '"witnesses" : array { for $ab in $wSequence'),
        ('                      )}\n};', '                      )}}\n};'),
    ]
    for before, after in edits:
        if before not in source:
            raise ValueError('Upstream compatibility edit no longer applies: ' + before)
        source = source.replace(before, after)
    return source + r'''
serialize(map:merge(
 for $m in distinct-values(
  for $sig in ("S07326","S00483","S01520")
  for $ab in doc(concat($config:data-root,"mishnah/w-sep/",$sig,"-w-sep.xml"))//tei:ab
  let $id := substring-after(string($ab/@xml:id),concat($sig,"."))
  where matches($id,"^1\.1\.[0-9]+\.[0-9]+$")
  return $id)
 return map:entry($m,parse-json(ws2j:getTokenData($m,("S07326","S00483","S01520"),"nw")))
), map {"method":"json"})
'''


def generate(upstream):
    files = ['w-sep-to-json-new.xqm', *(s + '-w-sep.xml' for s in SIGS),
             'saxon-he-10.9.jar', 'collatex-tools-1.7.1.jar', 'nashorn-core-15.4.jar',
             *('asm' + suffix + '-7.3.1.jar' for suffix in ['', '-commons', '-tree', '-util', '-analysis'])]
    hashes = {f: hashlib.sha256((upstream / f).read_bytes()).hexdigest() for f in files}
    audit = HERE.parents[2] / 'docs/audits/digital-mishnah-2026-11-26/provenance.json'
    # Only execute the audited upstream source and transcriptions.
    expected = json.loads(audit.read_text())['sourceHashes']
    for f, digest in expected.items():
        assert hashes[f] == digest, 'Unpinned input: ' + f
    with tempfile.TemporaryDirectory(prefix='safran-dm-') as tmp:
        tmp = Path(tmp)
        data = tmp / 'data/mishnah/w-sep'
        data.mkdir(parents=True)
        for sig in SIGS:
            (data / (sig + '-w-sep.xml')).symlink_to(upstream / (sig + '-w-sep.xml'))
        query = tmp / 'query.xq'
        query.write_text(prepare_query((upstream / files[0]).read_text(), (tmp / 'data').as_uri() + '/'))
        raw = tmp / 'tokens.json'
        subprocess.run(['java', '-cp', str(upstream / 'saxon-he-10.9.jar'), 'net.sf.saxon.Query',
                        '-q:' + str(query), '-o:' + str(raw), '!method=text'], check=True)
        units = json.loads(raw.read_text())
        chapters = {}
        for ch in range(1, 10):
            witnesses = []
            for sig in SIGS:
                tokens = [t for ref, unit in sorted(units.items(), key=lambda x: tuple(map(int, x[0].split('.'))))
                          if ref.startswith('1.1.' + str(ch) + '.')
                          for w in unit['witnesses'] if w['id'].endswith(sig)
                          for t in w['tokens'] if t.get('resp') != 'h1' and t.get('transp') != 'orig']
                witnesses.append({'id': sig, 'tokens': tokens})
            witness_ids = [str(i + 1).zfill(3) + '-' + s for i, s in enumerate(SIGS)]
            payload = {'algorithm': 'needleman-wunsch', 'joined': False,
                       'witnesses': [{**w, 'id': wid} for w, wid in zip(witnesses, witness_ids)]}
            inp, out = tmp / 'input.json', tmp / 'output.json'
            inp.write_text(json.dumps(payload, ensure_ascii=False))
            out.unlink(missing_ok=True)  # Old CollateX may return exit 0 on error.
            subprocess.run(['java', '-cp', str(upstream / '*'), 'eu.interedition.collatex.tools.CollateX',
                            '-a', 'needleman-wunsch', '-f', 'json', '-t', '-o', str(out), str(inp)], check=True)
            result = json.loads(out.read_text())
            assert set(result['witnesses']) == set(witness_ids)
            permutation = [result['witnesses'].index(s) for s in witness_ids]
            result['table'] = [[row[i] for i in permutation] for row in result['table']]
            for i, w in enumerate(witnesses):
                before = [t['id'] for t in w['tokens']]
                after = [t['id'] for row in result['table'] for t in (row[i] or [])]
                assert before == after and len(set(before)) == len(before), (ch, w['id'])
            # Keep input once; columns need stable token IDs only.
            chapters[str(ch)] = {'witnesses': witnesses,
                                 'columns': [[[t['id'] for t in (cell or [])] for cell in row]
                                             for row in result['table']]}
            print('chapter', ch, 'columns', len(result['table']), flush=True)
    provenance = {'dataCommit': DATA_COMMIT, 'applicationCommit': APP_COMMIT, 'sourceHashes': hashes,
                  'method': 'Digital Mishnah XQuery + CollateX Java 1.7.1 Needleman-Wunsch',
                  'extractionFixes': ['Recursively retain nested orig text (Cambridge Berakhot 1:5, word 00070)'],
                  'scope': 'chapter', 'readingState': 'corrected: exclude h1 and original transposition copies',
                  'license': 'CC BY 4.0', 'source': 'https://github.com/umd-mith/mishnah-data'}
    target = HERE / 'sources/project-collation.json.gz'
    target.write_bytes(gzip.compress(json.dumps({'provenance': provenance, 'chapters': chapters},
                                               ensure_ascii=False, separators=(',', ':')).encode(), mtime=0))
    print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream-dir', required=True, type=Path)
    generate(parser.parse_args().upstream_dir.resolve())
