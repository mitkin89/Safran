'use strict';
// Nachtrag: „Sam“-Angaben und Targum-Angaben in der Tora (Targum Onkelos, Pseudo-Jonathan, Neofiti liegen in Safran vor)
const fs=require('fs'),S='/home/claude/safran',W=__dirname;
const TC=require(S+'/textcrit-core.js'),T=require(S+'/textcrit-data.js');
const man=JSON.parse(fs.readFileSync(S+'/bundled/manifest.json','utf8')).items;
const rel=(b,re)=>man.find(e=>e.title===b&&re.test(e.versionTitle||''))?.rel;
const cache={};const text=(b,re,c,v)=>{const k=b+re;if(!cache[k]){const r=rel(b,re);cache[k]=r?JSON.parse(fs.readFileSync(S+'/bundled/'+r,'utf8')).text:null;}const t=cache[k]?.[c-1]?.[v-1];return t?String(t).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim():null;};
const TORA=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
const out={};for(const f of fs.readdirSync(W+'/out'))Object.assign(out,JSON.parse(fs.readFileSync(W+'/out/'+f)));
const items=[];
for(const [id,e] of Object.entries(out)){const [work,code,ref]=id.split('|');const book=work==='Syr'?code:null;
  const bk=work==='Syr'?code:({Gen:'Genesis',Exod:'Exodus',Lev:'Leviticus',Num:'Numbers',Dt:'Deuteronomy'})[code];
  if(TORA.includes(bk)&&Object.entries(e.status||{}).some(([k,v])=>/Targum|Onq?elos|Onkelos/.test(k)&&v==='ungeprüft'))items.push({id,bk,ref,note:e.note,status:e.status});}
// „Sam“
for(const [id,bk,ref] of [['Syr|Genesis|24:55|1','Genesis','24:55'],['Syr|Genesis|46:16|0','Genesis','46:16'],['Syr|Genesis|46:28|0','Genesis','46:28']]){
  const d=JSON.parse(fs.readFileSync(S+'/tools/peshitta/readings/Genesis.json'));const [r,k]=[d.verses[ref].readings[+id.split('|')[3]]];items.push({id,bk,ref,note:r.note,status:{},sam:true});}
const blocks=items.map(it=>{const [c,v]=it.ref.split(':').map(Number);
  const mt=TC.words((text(it.bk,/^Westminster/,c,v)||''));const ev=[];
  for(const [lab,re] of [['Targum Onkelos',/Onkelos/],['Targum Pseudo-Jonathan',/Pseudo-Jonathan/],['Targum Neofiti',/Neofiti/]]){const t=text(it.bk,re,c,v);ev.push(lab+': '+(t||'kein Text'));}
  if(it.sam)for(const r of T.mtIndex[it.bk+' '+it.ref]||[])ev.push('SMR ('+r+'): '+T.verses[r].words.map(w=>(w[1]?'*':'')+w[0]).join(' '));
  return '### '+it.id+'\nMT: '+mt.map((w,j)=>(j+1)+' '+w).join(' | ')+'\nNotiz: '+it.note+'\nBisheriger Status: '+JSON.stringify(it.status)+'\n'+ev.map(e=>'  '+e).join('\n')+'\n';});
fs.writeFileSync(W+'/sheets/W-13.txt',blocks.join('\n'));console.log(items.length);
