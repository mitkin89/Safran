#!/usr/bin/env python3
"""Download the pinned public inputs; requires curl. Usage: fetch.py OUTPUT_DIR."""
import concurrent.futures, hashlib, json, pathlib, subprocess, sys
lock = json.loads((pathlib.Path(__file__).parent/'source.json').read_text())
root = pathlib.Path(sys.argv[1]); root.mkdir(parents=True, exist_ok=True)
def fetch(item):
    relative, expected = item
    url = 'https://raw.githubusercontent.com/DT-UCPH/sp/' + lock['commit'] + '/' + relative
    raw = subprocess.check_output(['curl','--fail','--location','--retry','2','--max-time','60','--silent','--show-error',url])
    if hashlib.sha256(raw).hexdigest() != expected: raise ValueError('Source checksum mismatch: '+relative)
    target = root/relative; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(raw)
    return relative
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for relative in pool.map(fetch, lock['sha256'].items()): print(relative, flush=True)
(root/'upstream.json').write_text(json.dumps({k:lock[k] for k in ['repository','commit','version']}))
