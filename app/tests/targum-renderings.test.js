'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),window={};
for(const file of ['targum-ren.js','targum-lex.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),{window});
const D=window.TARGUM_REN,L=window.TARGUM_LEX,books=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
const names=['Targum Onkelos','Targum Pseudo-Jonathan','Targum Neofiti 1'],manifest=require('../bundled/manifest.json').items;
test('every Targum rendering retains its exact source word and all original occurrence totals',()=>{
 const docs=new Map(),verses=new Map(),totals=[0,0,0];
 for(const [lemma,[labels,cells]]of Object.entries(D))for(const c of cells)for(let i=0;i<3;i++){
  const metas=c[8+i];assert.equal(metas.length,c[2+i],lemma);totals[i]+=metas.length;
  let number=0;const refs=c[5+i].split('.').filter(Boolean).map(delta=>number+=parseInt(delta,36));
  assert.equal(refs.length,metas.length);
  refs.forEach((ref,j)=>{
   const book=books[Math.floor(ref/1e6)],chapter=Math.floor(ref/1000)%1000,verse=ref%1000,key=i+'|'+book;
   if(!docs.has(key)){const e=manifest.find(e=>e.title===book&&e.versionTitle.startsWith(names[i]+' ('));assert(e);docs.set(key,JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))));}
   const address=key+'|'+chapter+':'+verse;
   if(!verses.has(address))verses.set(address,String(docs.get(key).text[chapter-1][verse-1]||'').replace(/<[^>]+>/g,'').trim().split(/\s+/));
   const [position,form]=metas[j];assert.equal(verses.get(address)[position-1],form,address);
  });
  const id=labels[c[0]][2];if(id)assert(L[id]?.[0]);
 }
 assert.deepEqual(totals,[73059,71257,74465]);
});
test('Exodus 16:31 keeps seed as its own lexical entry and points to the attested whole word',()=>{
 const [labels,cells]=D['2233'],group=labels.findIndex(l=>l[2]==='1c9');assert(group>=0);
 assert.equal(labels[group][0],'זרע');assert.notEqual(labels[group][1],'to sow');
 const found=[];
 for(const c of cells.filter(c=>c[0]===group)){let ref=0;c[5].split('.').filter(Boolean).forEach((delta,j)=>{ref+=parseInt(delta,36);if(ref===1016031)found.push(c[8][j]);});}
 assert.deepEqual(JSON.parse(JSON.stringify(found)),[[8,'כבַר']]);
});
test('the selected Peshitta edition overrides a preferred English preview in the production IPC handler',async()=>{
 const docs=[
  {entry:{rel:'he',title:'Genesis',kind:'he',versionTitle:'Westminster fixture'},text:[['ברא']]},
  {entry:{rel:'sy',title:'Genesis',kind:'other',versionTitle:'ETCBC Peshitta fixture'},text:[['ܒܪܐ']]},
  {entry:{rel:'en',title:'Genesis',kind:'en',versionTitle:'English fixture'},text:[['created']]},
 ].map(d=>({...d,title:'Genesis',versionTitle:d.entry.versionTitle,sectionNames:['Chapter','Verse']}));
 const preview=require('./production-preview-handler.cjs')({getLibrary:async()=>({list:()=>docs.map(d=>d.entry),read:async rel=>docs.find(d=>d.entry.rel===rel)})});
 const result=await preview(null,'Genesis 1:1',['he','en'],{vt:'^ETCBC Peshitta',rtl:true},{de:'English fixture'});
 assert(result.parts.some(p=>p.versionTitle==='ETCBC Peshitta fixture'&&p.items[0]==='ܒܪܐ'));
 assert(!result.parts.some(p=>p.versionTitle==='English fixture'));
});
