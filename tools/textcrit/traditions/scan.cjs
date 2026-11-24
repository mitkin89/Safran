// Offline, reproducible candidate screening. A hit is never promoted to an interpretation automatically.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const box={window:{}};
const files=[],candidates=[],counts={};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>{const b=fs.readFileSync(path.join(root,f));files.push({file:f,sha256:hash(b)});return b.toString();};
const load=f=>vm.runInNewContext(read(f),box);
load('textcrit-traditions-data.js');
const known=new Set(box.window.TEXTCRIT_TRADITIONS.map(([k])=>JSON.stringify(k)));
const reviewed=JSON.parse(fs.readFileSync(path.join(__dirname,'reviewed.json'),'utf8'));
const accepted=new Set(reviewed.decisions.map(d=>JSON.stringify(d.key)));
const rx=/halach|halakh|aggad|midra[sš]|rabbin|rabb[iy]|talmud|mischna|mishn|sifra|sifre|mekhil|mechilt|targum|onkelos|jonathan|raschi|rashi|tiqqun|tiḳḳ|soferim|philo|josephus|jüdisch|jewish|hebraeor|iudaeor|judaeor|chaldae|chald\.|synagog|sabbat|sabbath|gesetzesauslegung/iu;
const list=d=>fs.readdirSync(path.join(root,d)).filter(f=>f!=='index.js'&&f.endsWith('.js')).sort();
function candidate(key, text, detail={}) {
  if(!rx.test(text))return;
  const match=rx.exec(text);
  candidates.push({key,...detail,status:accepted.has(JSON.stringify(key))?'source-checked':known.has(JSON.stringify(key))?'existing-tag':'unconfirmed',
    excerpt:text.slice(Math.max(0,match.index-120),match.index+550)});
}
for(const file of list('lxx-readings')){
  load('lxx-readings/'+file);const code=file.slice(0,-3),d=box.window.LXX_READINGS[code];
  for(const [ref,v]of Object.entries(d.verses))for(const r of v?.r||[]){counts.LXX=(counts.LXX||0)+1;
    const key=['LXX',code,ref,r.type,r.he||[],r.sy||[],r.a||0],keyg=[...key,r.g||''];
    candidate(known.has(JSON.stringify(keyg))?keyg:key,[r.note,r.en,r.parallel].join(' '));}
}
for(const file of list('peshitta-readings')){
  load('peshitta-readings/'+file);const book=Object.keys(box.window.PESHITTA_READINGS).find(b=>b.replaceAll(' ','_')===file.slice(0,-3));
  for(const [ref,rs]of Object.entries(box.window.PESHITTA_READINGS[book]))for(const r of rs){counts.Syr=(counts.Syr||0)+1;
    candidate(['Syr',book,ref,r.type,r.he||[],r.sy||[],r.a||0],[r.note,r.en,r.parallel].join(' '));}
}
for(const file of list('hexapla-data')){
  load('hexapla-data/'+file);const book=file.slice(0,-3).replaceAll('_',' '),d=box.window.HEXAPLA_DATA[book];
  for(const [ref,us]of Object.entries(d.verses))us.forEach((u,i)=>{counts.Hex=(counts.Hex||0)+1;
    candidate(['HexSource',book,ref,i,u.t],[u.t,u.l,...(u.fn||[]).flatMap(id=>[d.notes[id]?.la,d.notes[id]?.en])].join(' '),{footnotes:u.fn||[]});});
}
load('hexapla-vorlage.js');
counts.HexClassifications=Object.keys(box.window.HEXAPLA_VORLAGE).length;
for(const [ref,r]of Object.entries(box.window.HEXAPLA_VORLAGE))candidate(['Hex',ref],[r.n,r.en].join(' '));
// Include source-only witnesses in the inventory. Their language strings/TEI also contain names,
// scribal descriptions, and dictionary references; matches below are deliberately unconfirmed.
const supplemental=[];
const payloads=['tov-data.js','textcrit-data.js','samaritan-data.js','kennicott-data.js','qumran-apparatus.js'];
for(const dir of ['kennicott','aleppo-diff'])if(fs.existsSync(path.join(root,dir)))payloads.push(...list(dir).map(f=>dir+'/'+f));
for(const [index,global] of [['qumran-apparatus-index.js','QUMRAN_APPARATUS_INDEX']]){
  load(index);payloads.push(...Object.values(box.window[global].books).map(v=>v.file).filter(Boolean));
}
for(const file of [...new Set(payloads)].sort()){
  const text=read(file);let matches=0;const pattern=new RegExp(rx.source,'giu');
  for(const m of text.matchAll(pattern)){
    matches++;if(matches<=8)supplemental.push({file,term:m[0],excerpt:text.slice(Math.max(0,m.index-120),m.index+400),status:'unconfirmed-source-text-hit'});
  }
  files[files.length-1].screeningHits=matches;
}
// Explicitly withhold disputed or misplaced interpretations rather than converting search hits into facts.
const withheld=[
 ['Exodus','23:19',0,'Field rejects Geiger’s proposed meat/milk interpretation; no positive halakhic classification.'],
 ['Leviticus','23:39',3,'The discussion concerns Leviticus 23:40 but is anchored to 23:39; Aquila attribution is also disputed.'],
 ['Ecclesiastes','12:5',1,'Geiger’s midrashic interpretation depends on a disputed Greek reading rejected by Field.'],
 ['II Chronicles','34:22',1,'Disputed interpretation of במשנה; no unqualified aggadic tag.'],
];
for(const [b,r,i,reason]of withheld)for(const c of candidates)if(c.key[0]==='HexSource'&&c.key[1]===b&&c.key[2]===r&&c.key[3]===i){c.status='withheld';c.reason=reason;}
for(const d of reviewed.withdrawn || [])for(const c of candidates)if(JSON.stringify(c.key)===JSON.stringify(d.key)){c.status='withheld';c.reason=d.reason;}
// Confirmed interpretations can be present without explicit trigger words (e.g. Exodus 12:40).
for(const d of reviewed.decisions)if(!candidates.some(c=>JSON.stringify(c.key)===JSON.stringify(d.key)))candidates.push({key:d.key,status:'source-checked',discovery:'targeted primary-source comparison'});
const report={schema:1,date:reviewed.date,method:'Full-text candidate screening and targeted primary-source comparison. Unconfirmed hits are not individually verified interpretations.',counts,files,candidates,supplemental,
  summary:{screenedClassifiedReadings:counts.LXX+counts.Syr,screenedFieldUnits:counts.Hex,reviewedDecisions:reviewed.decisions.length,statuses:Object.fromEntries([...new Set(candidates.map(c=>c.status))].map(s=>[s,candidates.filter(c=>c.status===s).length]))}};
const out=JSON.stringify(report,null,2)+'\n';const target=path.join(__dirname,'screening.json');
if(process.argv.includes('--check')){if(out!==fs.readFileSync(target,'utf8'))throw new Error('Screening report is stale; run node tools/textcrit/traditions/scan.cjs');}
else fs.writeFileSync(target,out);
console.log(JSON.stringify(report.summary));
