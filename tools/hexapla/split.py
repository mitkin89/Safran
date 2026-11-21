#!/usr/bin/env python3
"""Sort Field's page transcriptions (one file per leaf, whole volume) into per-book folders.

The book is read from the running head (Kolumnentitel) in the first line of each page and carried
forward to pages whose head does not name it. The Appendix ad Pentateuchum is skipped.
Usage: python3 tools/hexapla/split.py <ocr-dir> <ocr-en-dir>
       -> tools/hexapla/field/<book>/ocr/NNNN.txt and …/ocr-en/NNNN.txt; prints the books found.
"""
import pathlib,re,sys
HERE=pathlib.Path(__file__).resolve().parent
src,en=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])
HEADS=[  # most specific first
  (r'\bIV\.?\s*REGUM','II Kings'),(r'\bIII\.?\s*REGUM','I Kings'),(r'\bII\.?\s*REGUM','II Samuel'),(r'\bI\.?\s*REGUM','I Samuel'),
  (r'\bII\.?\s*PARALIPOMEN','II Chronicles'),(r'\bI\.?\s*PARALIPOMEN','I Chronicles'),
  (r'APPENDIX AD PENTATEUCHUM',None),(r'\bGENESIS','Genesis'),(r'\bEXODUS','Exodus'),(r'\bLEVITICUS','Leviticus'),
  (r'\bNUMERI','Numbers'),(r'\bDEUTERONOMIUM','Deuteronomy'),(r'\bJOSUA','Joshua'),(r'\bJUDICES','Judges'),
  (r'\bRUTH','Ruth'),(r'\bESDRAS','Ezra'),(r'\bNEHEMIAS','Nehemiah'),(r'\bESTHER','Esther'),
]
slug=lambda b:b.lower().replace(' ','-')
book='?';seen={}
for p in sorted(src.glob('[0-9][0-9][0-9][0-9].txt')):
  head=p.read_text().split('\n',1)[0].split(' · ',2)[-1].upper()
  for rx,b in HEADS:
    if re.search(rx,head):book=b;break
  if book in (None,'?'):continue
  for d,f in (('ocr',p),('ocr-en',en/p.name)):
    if not f.exists():continue
    out=HERE/'field'/slug(book)/d/p.name;out.parent.mkdir(parents=True,exist_ok=True)
    t=f.read_text()
    if not out.exists() or out.read_text()!=t:out.write_text(t)
  seen.setdefault(book,[]).append(p.stem)
for b,l in seen.items():print(f'{b}\t{l[0]}–{l[-1]}\t{len(l)}')
