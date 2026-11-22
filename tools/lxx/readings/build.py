# tools/lxx/readings/<Kürzel>.json -> lxx-readings/<Kürzel>.js (window.LXX_READINGS[Kürzel]) und Index lxx-readings/index.js
# Klassifizierte LXX-Abweichungen vom MT auf Grundlage der CATSS-Ausrichtung (Tov/Kraft); Einordnung: Claude, 2026.
import json,pathlib
R=pathlib.Path(__file__).resolve().parent;S=R.parents[2];O=S/'lxx-readings';O.mkdir(exist_ok=True)
idx={}
for f in sorted(R.glob('*.json')):
  d=json.loads(f.read_text());code=d['code']
  # kompakt: Verse ohne Eintrag als 0; je Eintrag der griechische Wortlaut (g) und bei Zusätzen das vorangehende MT-Wort (a, 1-basiert, 0 = Versanfang)
  V={}
  for ref,v in d['verses'].items():
    if not v['r']:V[ref]=0;continue
    R=[]
    for r in v['r']:
      x={k:r[k] for k in ('he','type','vorlage','note','sure','parallel') if r.get(k) not in ('',None) or k in ('he','type','sure')}
      if r['gr']:x['g']=' '.join(v['G'][i-1] for i in r['gr'])
      if not r['he']:
        g=min(r['gr'])-1
        while g>0 and not v['Gmt'][g-1]:g-=1
        x['a']=max(v['Gmt'][g-1]) if g>0 else 0
      R.append(x)
    V[ref]={'H':v['H'],'r':R}
  d={'code':code,'book':d['book'],'verses':V}
  (O/f'{code}.js').write_text('/* LXX-Lesarten (CATSS-Ausrichtung Tov/Kraft, CC BY-NC-SA 3.0; Einordnung Claude 2026) */\n(window.LXX_READINGS=window.LXX_READINGS||{})['+json.dumps(code)+']='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')
  idx[code]={'book':d['book'],'verses':len(d['verses']),'readings':sum(len(v['r']) for v in d['verses'].values() if v)}
(O/'index.js').write_text('window.LXX_READINGS_INDEX='+json.dumps(idx,ensure_ascii=False,separators=(',',':'))+';\n')
print({k:v['readings'] for k,v in idx.items()})
