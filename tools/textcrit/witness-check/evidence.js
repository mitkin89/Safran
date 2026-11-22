// Prüfblätter für Zeugenangaben in den Notizen der LXX- und Peschitta-Lesarten.
// Je Notiz mit Zeugennennung: Notiz, Eintrag, und die Daten der genannten Zeugen aus Safran (LXX/CATSS, SMR/Tal, DSS, Kennicott, Peschitta).
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const S='/home/claude/safran',W=__dirname,L='/home/claude/lxx-readings';
const TC=require(S+'/textcrit-core.js');
const cons=s=>String(s||'').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
const rel=(book,re)=>JSON.parse(fs.readFileSync(S+'/bundled/manifest.json','utf8')).items.find(e=>e.title===book&&re.test(e.versionTitle||''))?.rel;
const mtCache={};function mt(book,c,v){if(!mtCache[book])mtCache[book]=JSON.parse(fs.readFileSync(S+'/bundled/'+rel(book,/^Westminster/),'utf8')).text;return TC.words((mtCache[book][c-1]?.[v-1]||'').replace(/<[^>]+>/g,' '));}
// Zeugen-Erkennung
const WIT=/(SMR|Samaritan\w*|Peschitta|Targum\w*|Onq?elos|Onkelos|Vulgata|Qumran|\b\d*Q[A-Z][a-zA-Z]*\S*|1QpHab|11QT\S*|5\/6Ḥev\w*|Papyrus \w+|Hss\.|Handschrift\w*|Theodotion|Aquila|Symmachus|\bApg\b|\bRöm\b|\bHebr\b|\bMt \d|\bSir\b|1 ?Esdr|Josephus|LXX|Septuaginta)/;
const self={LXX:/^(LXX|Septuaginta)$/,Syr:/^(Peschitta)$/};
function witnesses(note,work){const out=new Set();for(const m of note.matchAll(new RegExp(WIT.source,'g'))){const w=m[1];if(!self[work].test(w))out.add(w);}return [...out];}
// Daten laden
const LX={};for(const f of fs.readdirSync(L+'/data')){const d=JSON.parse(fs.readFileSync(L+'/data/'+f));LX[f.replace('.json','')]=d;}
const LR={};for(const f of fs.readdirSync(S+'/tools/lxx/readings'))if(f.endsWith('.json')){const d=JSON.parse(fs.readFileSync(S+'/tools/lxx/readings/'+f));LR[d.code]=d;}
const PR={};for(const f of fs.readdirSync(S+'/tools/peshitta/readings'))if(f.endsWith('.json')){const d=JSON.parse(fs.readFileSync(S+'/tools/peshitta/readings/'+f));PR[d.book]=d;}
const T=require(S+'/textcrit-data.js');
const qcache={};function dss(book,ref){if(!(book in qcache)){try{qcache[book]=book==='Genesis'?require(S+'/qumran-apparatus.js'):require(S+'/qumran-apparatus/'+book+'.js');}catch{qcache[book]=null;}}return qcache[book]?.verses[book+' '+ref]||[];}
const KF={Genesis:'kennicott-data.js'};for(const f of fs.readdirSync(S+'/kennicott')){}
const kidx=(()=>{try{return require(S+'/kennicott-index.js').books;}catch{return {};}})();
const kcache={};function ken(book,ref){if(!(book in kcache)){try{kcache[book]=require(S+'/'+kidx[book].file);}catch{kcache[book]=null;}}const K=kcache[book];if(!K)return [];return (K.index[book+' '+ref]||[]).map(id=>K.entries[id]).filter(Boolean);}
function lxxEv(book,ref,he){
  const out=[];
  for(const [code,d] of Object.entries(LX)){if(d.book!==book)continue;const v=d.verses[ref];if(!v)continue;
    const lab=code==='Jdga'?'LXX A':code==='Jdgb'?'LXX B':code==='DanTh'?'LXX Th':code==='Dan'?'LXX OG':'LXX';
    out.push(lab+' Griechisch: '+v.G.map(u=>(he.length&&u.mt.some(m=>he.includes(m))?'»':'')+u.g+'→'+(u.mt.length?u.mt.join(','):'+')).join(' | ')+(v.minus.length?' · ohne Griechisch: H'+v.minus.flatMap(u=>u.mt).join(','):''));
    const r=LR[code]?.verses[ref];if(r&&r.r.length)out.push(lab+' Lesarten: '+r.r.map(x=>'['+x.type+' he='+x.he.join(',')+(x.vorlage?' Vorlage='+x.vorlage:'')+'] '+x.note).join(' ‖ '));
    else if(r)out.push(lab+' Lesarten: keine bedeutsame Abweichung erfasst');
  }
  return out.length?out:['LXX: keine CATSS-Daten für diesen Vers'];
}
function smrEv(book,ref){
  const refs=T.mtIndex[book+' '+ref]||[];if(!refs.length)return ['SMR: '+(['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'].includes(book)?'kein zugeordneter Vers':'nur Tora')];
  return refs.map(r=>'SMR ('+r+'): '+T.verses[r].words.map(w=>(w[1]?'*':'')+w[0]).join(' ')+'   (* = weicht vom MT ab)');
}
function dssEv(book,ref){const s=dss(book,ref);if(!s.length)return ['DSS: kein Qumran-Text für diesen Vers'];return s.map(x=>'DSS '+x.scroll+' '+x.fragment+': '+x.tokens.map(t=>t.text).join(' '));}
function kenEv(book,ref){const e=ken(book,ref);if(!e.length)return ['Kennicott: keine Einträge'];return ['Kennicott: '+e.slice(0,25).map(x=>(x.lemma||[]).join(' ')+' ] '+x.readings.map(r=>(r.words||[]).join(' ')+' ('+r.witnesses.length+' Hss.)').join('; ')).join(' ‖ ')];}
function syrEv(book,ref,he){
  const d=PR[book];const v=d?.verses[ref];if(!v)return ['Peschitta: kein Vers'];
  return ['Peschitta (Wortzuordnung): '+v.sy.map((w,j)=>w+'→'+((v.links?.[j]||[]).join(',')||'+')).join(' | '),'Peschitta Lesarten: '+(v.readings.length?v.readings.map(x=>'['+x.type+' he='+x.he.join(',')+(x.vorlage?' Vorlage='+x.vorlage:'')+'] '+x.note).join(' ‖ '):'keine')];
}
// Peschitta-Daten enthalten keine links; aus der Zuordnung holen
const PA=require(S+'/peshitta-alignment.js');
const items=[];
for(const [work,src] of [['LXX',LR],['Syr',PR]]){
  for(const d of Object.values(src)){
    const book=d.book;
    for(const [ref,v] of Object.entries(d.verses)){
      const R=v.r||v.readings;
      R.forEach((r,k)=>{const w=witnesses(r.note,work);if(!w.length)return;
        items.push({id:work+'|'+(d.code||book)+'|'+ref+'|'+k,work,book,ref,r,w});});
    }
  }
}
// Peschitta-Zuordnung (links) nachladen
function pesh(book){const pent=PA.PENTATEUCH.includes(book);const f=S+'/'+PA.file(book);const box={window:{}};vm.runInNewContext(fs.readFileSync(f,'utf8'),box);const raw=pent?box.window.PESHITTA_ALIGNMENT_DATA:{version:2,books:{[book]:box.window.PESHITTA_ALIGNMENT_BOOKS[book]}};return PA.book(raw,book);}
const pcache={};
fs.mkdirSync(W+'/sheets',{recursive:true});fs.mkdirSync(W+'/out',{recursive:true});
const blocks=items.map(it=>{
  const [c,v]=it.ref.split(':').map(Number),H=mt(it.book,c,v),he=it.r.he||[];
  const ev=[];const ws=it.w.join(' ');
  if(it.work==='Syr'||/LXX|Septuaginta|Theodotion|Aquila|Symmachus/.test(ws))ev.push(...lxxEv(it.book,it.ref,he));
  if(/SMR|Samarit/.test(ws))ev.push(...smrEv(it.book,it.ref));
  if(/Q|Qumran|Ḥev|Mas/.test(ws))ev.push(...dssEv(it.book,it.ref));
  if(/Hss|Handschrift/.test(ws))ev.push(...kenEv(it.book,it.ref));
  if(it.work==='LXX'&&/Peschitta/.test(ws)){if(!pcache[it.book])try{pcache[it.book]=pesh(it.book);}catch{pcache[it.book]=null;}const pv=pcache[it.book]?.verses[it.ref];const pr=PR[it.book]?.verses[it.ref];
    ev.push(pv?'Peschitta (Wortzuordnung): '+pv.sy.map((w,j)=>w+'→'+(pv.links[j].join(',')||'+')).join(' | '):'Peschitta: kein Vers');if(pr)ev.push('Peschitta Lesarten: '+(pr.readings.length?pr.readings.map(x=>'['+x.type+' he='+x.he.join(',')+(x.vorlage?' Vorlage='+x.vorlage:'')+'] '+x.note).join(' ‖ '):'keine'));}
  return '### '+it.id+'\nZeuge des Eintrags: '+(it.work==='LXX'?'LXX':'Peschitta')+' · '+it.book+' '+it.ref+'\nMT: '+H.map((w,j)=>(j+1)+' '+w).join(' | ')+'\nEintrag: '+JSON.stringify({he:it.r.he,type:it.r.type,vorlage:it.r.vorlage||'',parallel:it.r.parallel||'',sure:it.r.sure})+'\nNotiz: '+it.r.note+'\nGenannte Zeugen: '+it.w.join(', ')+'\n'+ev.map(e=>'  '+e).join('\n')+'\n';
});
const N=Math.ceil(blocks.length/110);for(let i=0;i<N;i++)fs.writeFileSync(W+'/sheets/W-'+(i+1)+'.txt',blocks.slice(i*110,(i+1)*110).join('\n'));
fs.writeFileSync(W+'/items.json',JSON.stringify(items.map(i=>i.id)));
console.log(items.length,'Notizen,',N,'Blätter');
