"""Generate a retained automatic analysis layer, never a silently corrected text.

Install stanza==1.11.0 in an isolated environment. Models: grc/perseus_nocharlm
for pos, proiel_nocharlm for lemma, resources 1.11.0. Run: python annotate.py CACHE MODELDIR
"""
import gzip
import hashlib
import json
import pathlib
import sys

import stanza
import torch
import build


def tokens(text):
    parts=[];selected=[];last=0
    for word in build.spans(text):
        parts.extend(c for c in text[last:word['start']] if not c.isspace())
        selected.append(len(parts));parts.append(word['form']);last=word['end']
    parts.extend(c for c in text[last:] if not c.isspace())
    return parts,selected


def main(cache,models):
    if stanza.__version__!='1.11.0':raise ValueError('Use pinned Stanza 1.11.0')
    saved=build.HERE/'annotation-source.json'
    if saved.exists():
        expected=json.loads(saved.read_text())
        if torch.__version__!=expected['torch']:raise ValueError('Use pinned Torch '+expected['torch'])
        for name,sha in expected['models'].items():
            if build.digest((models/name).read_bytes())!=sha:raise ValueError('Model checksum: '+name)
    torch.manual_seed(0);torch.set_num_threads(2)
    nlp=stanza.Pipeline(lang='grc',dir=str(models),package=None,
                        processors={'tokenize':'perseus','pos':'perseus_nocharlm','lemma':'proiel_nocharlm'},
                        tokenize_pretokenized=True,use_gpu=False,download_method=None,verbose=False)
    rows=[]
    for edition in build.editions(build.checked(cache)):
        pairs=list(edition['passages'].items())
        for begin in range(0,len(pairs),32):
            batch=pairs[begin:begin+32];prepared=[tokens(text) for locus,text in batch]
            if any(not ts for ts,selected in prepared):raise ValueError('Empty source paragraph')
            predicted=nlp([ts for ts,selected in prepared])
            if len(predicted.sentences)!=len(batch):raise ValueError('Changed paragraph boundaries')
            for (locus,text),(ts,selected),sentence in zip(batch,prepared,predicted.sentences):
                if [w.text for w in sentence.words]!=ts:raise ValueError('Changed source tokens')
                analyses=[];original=[]
                for i in selected:
                    w=sentence.words[i]
                    valid=bool(w.lemma and build.words(w.lemma) and build.re.fullmatch('[a-z0-9-]{9}',w.xpos or ''))
                    analyses.append([build.U.normalize('NFC',w.lemma),w.xpos] if valid else None)
                    original.append(dict(id=w.id,form=w.text,lemma=w.lemma,upos=w.upos,xpos=w.xpos,feats=w.feats))
                rows.append(dict(key=edition['key']+':'+locus,textHash=build.digest(text.encode()),
                                 forms=[ts[i] for i in selected],analyses=analyses,raw=original))
            print(edition['key'],min(begin+32,len(pairs)),'/',len(pairs),flush=True)
    raw=('\n'.join(build.js(r) for r in rows)+'\n').encode()
    (build.HERE/'stanza-annotations.jsonl.gz').write_bytes(gzip.compress(raw,mtime=0))
    meta=dict(stanza=stanza.__version__,torch=torch.__version__,seed=0,device='cpu',
              resources='1.11.0',processors={'pos':'perseus_nocharlm','lemma':'proiel_nocharlm'},pretokenized=True,paragraphs=len(rows),
              sha256Uncompressed=build.digest(raw),models={})
    for name in ['grc/pos/perseus_nocharlm.pt','grc/lemma/proiel_nocharlm.pt','grc/pretrain/conll17.pt']:
        path=models/name
        meta['models'][str(path.relative_to(models))]=build.digest(path.read_bytes())
    (build.HERE/'annotation-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
