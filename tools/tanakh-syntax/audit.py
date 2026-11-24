#!/usr/bin/env python3
"""Reproduce the alignment audit against the pre-projection Safran commit."""
import argparse,collections,gzip,hashlib,json,subprocess
from pathlib import Path
from projection import load
from build import SPAN,VERSION
ROOT=Path(__file__).resolve().parents[2]
def original(ref,file,binary=False):
 data=subprocess.check_output(['git','show',ref+':'+file],cwd=ROOT)
 return json.loads(gzip.decompress(data) if binary else data)
def audit(baseline):
 proof_data=json.loads(gzip.decompress((ROOT/'bundled/syntax-alignment.json.gz').read_bytes()))
 old_b=original(baseline,'bundled/bhsa/index.json.gz',True)
 new_b=json.loads(gzip.decompress((ROOT/'bundled/bhsa/index.json.gz').read_bytes()))
 rejects={(x['book'],x['ref']):x for x in new_b['alignment']['rejected']}
 rows=[];before=after=targets=source_count=0;categories=collections.Counter()
 for book in proof_data['books']:
  doc=json.loads((ROOT/'bundled/own'/book/'he'/(VERSION+'.json')).read_text())
  _,proof,tokens,signatures=load(book,doc,SPAN);source_count+=len(proof['sourceVerses']);targets+=len(signatures)
  old_m=original(baseline,'bundled/syntax/'+book+'.json');new_m=json.loads((ROOT/'bundled/syntax'/(book+'.json')).read_text())
  if new_m['coverage']['unalignedVerses']:raise ValueError('Audit requires an explicit MACULA rejection list for this source revision')
  for ref,sig in signatures.items():
   entry=old_b['books'].get(book,{}).get(ref);before+=bool(old_m['text'].get(ref)==sig and entry and entry[0]==sig and entry[1])
   entry=new_b['books'].get(book,{}).get(ref);after+=bool(new_m['text'].get(ref)==sig and entry and entry[0]==sig and entry[1])
  contributors=collections.defaultdict(set)
  for ref,(start,end)in proof['sourceVerses'].items():
   for target,_,_ in tokens[start:end]:contributors[target].add(ref)
  variants={i for i,_,_ in proof['variants']}
  for ref,(start,end) in proof['sourceVerses'].items():
   old=old_b['books'].get(book,{}).get(ref)
   if old_m['text'].get(ref) and old and old_m['text'][ref]==old[0] and old[1]:continue
   mapped=sorted({r for r,_,_ in tokens[start:end]});causes=[]
   if mapped!=[ref] or any(len(contributors[r])>1 for r in mapped):causes.append('verse_boundaries')
   if any(i in variants for i in range(start,end)):causes.append('ketiv_qere')
   residual=rejects.get((book,ref))
   if residual:causes.append('different_bhsa_consonants')
   if not causes:causes.append('source_index_gap')
   categories[causes[0]]+=1
   rows.append(dict(book=book,sourceRef=ref,targetRefs=mapped,causes=causes,maculaVerified=True,bhsaVerified=residual is None,**({'remaining':residual}if residual else {})))
 return dict(version=1,baseline=baseline,source=proof_data['source'],summary=dict(sourceReferences=source_count,readingTextVerses=targets,beforeJointTargetVerses=before,afterJointTargetVerses=after,recoveredTargetVerses=after-before,auditedSourceReferences=len(rows),remainingSourceReferences=len(rejects),primaryCauses=dict(categories)),records=rows,remaining=list(rejects.values()))
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--baseline',default='a882277');a=p.parse_args();data=audit(a.baseline)
 (Path(__file__).parent/'alignment-audit.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(data['summary'],ensure_ascii=False))
if __name__=='__main__':main()
