'use strict';
// Additive Berakhot pilot. Neither input edition nor any diplomatic character is rewritten.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),M=require('../../mishnah-morph'),B=require('../mishnah-morph/build.cjs'),P=require('../../kaufmann-pointing'),old=require('../../mishnah-morph-data');
const TITLE='Mishnah Berakhot',VERSION="Kaufmann A50 (Digital Mishnah), vocalized after Be'eri",REL='own/'+TITLE+'/he/'+VERSION+'.json';
const sha=(s,algorithm='sha256')=>crypto.createHash(algorithm).update(s).digest('hex'),hash=x=>sha(JSON.stringify(x)),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawFile=path.join(root,'mishnah-textcrit-data.js'),alignmentFile=path.join(root,'mishnah-vocalized/berakhot.js'),context={window:{}};
vm.runInNewContext(fs.readFileSync(rawFile,'utf8'),context);vm.runInNewContext(fs.readFileSync(alignmentFile,'utf8'),context);
const original=context.window.MISHNAH_TEXTCRIT,source=original.witnesses.K,v=context.window.MISHNAH_VOCALIZED[TITLE],donor=old.sources[TITLE];
if(v.source.textHash!==donor.textHash||v.witnessSha256.D!==source.sha256)throw Error('Input editions or collation no longer match');
const units={},transfers=[],originalFiles={diplomatic:sha(fs.readFileSync(rawFile)),alignment:sha(fs.readFileSync(alignmentFile)),donor:sha(fs.readFileSync(path.join(root,'bundled',donor.rel)))};
const byTarget=new Map(),sourceMultiplicity=new Map();
for(const chapter of Object.values(v.interlinear.chapters))for(const link of chapter.D.links){
 for(const[r,i]of link.reading){const k=r+'/'+i,a=byTarget.get(k)||[];a.push(link);byTarget.set(k,a);}
 for(const[r,i]of link.base)sourceMultiplicity.set(r+'/'+i,(sourceMultiplicity.get(r+'/'+i)||0)+1);
}
function reverseInsertions(text,insertions){let delta=0;const mapped=insertions.map(x=>{const out={offset:x.offset+delta,text:x.text};delta+=x.text.length;return out;});for(const x of mapped.reverse()){if(text.slice(x.offset,x.offset+x.text.length)!==x.text)throw Error('Lost insertion provenance');text=text.slice(0,x.offset)+text.slice(x.offset+x.text.length);}return text;}
function shift(pos,insertions){return pos+insertions.filter(x=>x.offset<=pos).reduce((n,x)=>n+x.text.length,0);}
const sorted=Object.keys(source.units).sort((a,b)=>{const x=a.split(':').map(Number),y=b.split(':').map(Number);return x[0]-y[0]||x[1]-y[1];});
for(const ref of sorted){
 const u=source.units[ref],edits=[],records=[],unresolvedSource=u.annotations.some(a=>['damage','unclear','gap'].includes(a.tag));
 u.words.forEach((word,i)=>{
  if(u.offsetText.slice(word.start,word.end)!==word.text)throw Error('Diplomatic word offsets changed '+ref+'/'+i);
  const links=byTarget.get(ref+'/'+i)||[],r={id:u.id+'/word/'+i,targetRef:ref,targetWordIndex:i,originalWord:word.text,pointedWord:word.text,status:'open',reasons:[],targetFlags:[...word.flags],sourceRef:null,sourceToken:null};
  if(links.length!==1)r.reasons.push(links.length?'multiple-alignment-links':'no-alignment-link');
  const link=links[0];
  if(link&&links.length===1){
   if(link.base.length!==1||link.reading.length!==1)r.reasons.push('word-group-or-missing-counterpart');
   if(link.uncertain)r.reasons.push('uncertain-alignment');
   if(link.base.length===1){const[donorRef,index]=link.base[0],wordInDonor=v.base[donorRef]?.words[index];r.sourceRef=donorRef;r.sourceToken=index+1;r.donorWord=wordInDonor?.text;
    const[c,m]=donorRef.split(':').map(Number),form=old.forms[donor.chapters[c-1]?.[m-1]?.[index]];
    if(!wordInDonor||!form||M.normalize(form.word)!==M.normalize(wordInDonor.text))throw Error('Donor word/morphology no longer matches '+donorRef+'/'+index);
    if(sourceMultiplicity.get(donorRef+'/'+index)!==1)r.reasons.push('nonunique-donor-link');
    if(wordInDonor.flags?.length)r.reasons.push('donor-source-annotation');
    r.projectWordIds=link.projectWords||null;
   }
  }
  if(word.flags.length)r.reasons.push('diplomatic-annotation:'+word.flags.join(','));
  if(unresolvedSource)r.reasons.push('unit-has-source-damage-or-uncertainty');
  if(!r.reasons.length){const result=P.transferWord(word.text,r.donorWord);if(result.status==='transferred'){r.status='transferred';r.pointedWord=result.text;r.insertions=result.insertions;edits.push({start:word.start,end:word.end,target:word.text,donor:r.donorWord});}else r.reasons.push(result.reason||'donor-adds-no-pointing');}
  transfers.push(r);records.push(r);
 });
 const applied=P.applyWordTransfers(u.offsetText,edits);
 if(reverseInsertions(applied.text,applied.insertions)!==u.offsetText)throw Error('Diplomatic character sequence changed '+ref);
 const words=u.words.map((w,i)=>({...w,start:shift(w.start,applied.insertions),end:shift(w.end,applied.insertions),text:records[i].pointedWord,originalWord:w.text,originalStart:w.start,originalEnd:w.end,pointingStatus:records[i].status,pointingReasons:records[i].reasons,transferId:records[i].id}));
 for(const w of words)if(applied.text.slice(w.start,w.end)!==w.text)throw Error('Derived word offset mismatch '+ref);
 units[ref]={...u,originalOffsetText:u.offsetText,offsetText:applied.text,text:applied.text.replace(/\s+/g,' ').trim(),words,annotations:u.annotations.map(a=>({...a,originalStart:a.start,originalEnd:a.end,start:shift(a.start,applied.insertions),end:shift(a.end,applied.insertions)})),pointingInsertions:applied.insertions};
}
const text=[],sourceTokens=new Map();
for(const ref of sorted){const[c,m]=ref.split(':').map(Number),u=units[ref];let html='',at=0;for(const w of u.words){html+=esc(u.offsetText.slice(at,w.start));html+='<span class="kpt-word'+(w.pointingStatus==='open'?' kpt-open':'')+'" data-kpt-word="'+esc(w.transferId)+'" title="'+esc(w.pointingStatus==='open'?'Punktierung offen; Digital-Mishnah-Zeichen unverändert':'Be’eri-Punktierung redaktionell übertragen; nicht am Manuskript geprüft')+'">'+esc(w.text)+'</span>';at=w.end;}html+=esc(u.offsetText.slice(at));text[c-1]||=[];text[c-1][m-1]='<div class="kpt-text" dir="rtl" lang="he">'+html+'</div>';
 // Running lexical tokens are separately mapped; diplomatic source tokens and gaps keep their own IDs.
 sourceTokens.set(ref,M.tokens(u.offsetText).map(t=>({token:t,words:u.words.map((w,i)=>({w,i})).filter(x=>x.w.start<=t.start&&x.w.end>=t.end)})));
}
const summary={totalWords:transfers.length,transferredWords:transfers.filter(r=>r.status==='transferred').length,openWords:transfers.filter(r=>r.status==='open').length,chapters:text.length,mishnayot:sorted.length,meaning:'Technical candidate transfer; no philological validation and no Accordance vowel approval implied'};
const reasons={};for(const r of transfers)for(const reason of r.reasons)reasons[reason]=(reasons[reason]||0)+1;
const meta={rel:REL,textHash:hash(text),versionTitle:VERSION,donorTextHash:donor.textHash,donorRel:donor.rel,diplomaticSha256:source.sha256,alignmentSha256:originalFiles.alignment,witnessSha256:{D:source.sha256,P:original.witnesses.P.sha256,C:original.witnesses.C.sha256},vocalized:true,transferred:true};
const document={language:'he',actualLanguage:'he',title:TITLE,heTitle:'משנה ברכות',versionTitle:VERSION,versionSource:source.url,license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',attribution:'Kaufmann transcription: Digital Mishnah / Hayim Lapin and the Joseph and Rebecca Meyerhoff Center, CC BY 4.0. Pointing donor: Rabbi Dan Be’eri, digital edition by Sefaria, CC BY-SA 3.0. Additive editorial transfer by Safran; not the manuscript’s verified original pointing.',categories:['Mishnah','Seder Zeraim'],sectionNames:['Chapter','Mishnah'],direction:'rtl',isSource:true,isPrimary:false,sourcePreservation:'All diplomatic characters and source annotations retained; only separately recorded pointing signs inserted.',pointingStatus:'Partial editorial transfer; open words remain unpointed',derivedFrom:{digitalMishnah:source.url,digitalMishnahSha256:source.sha256,beeriVersion:B.version,beeriTextHash:donor.textHash},text};
const output=path.join(root,'bundled',REL);fs.mkdirSync(path.dirname(output),{recursive:true});const bytes=JSON.stringify(document,null,2)+'\n';fs.writeFileSync(output,bytes);
const manifestFile=path.join(root,'bundled/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile)),entry={rel:REL,title:TITLE,heTitle:document.heTitle,language:'Hebrew',versionTitle:VERSION,categories:document.categories,kind:'he',hash:sha(bytes,'sha1')},index=manifest.items.findIndex(e=>e.rel===REL);if(index<0)manifest.items.push(entry);else manifest.items[index]=entry;fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,1)+'\n');
const interlinear=structuredClone(original.interlinear);for(const[ch,value]of Object.entries(interlinear.chapters)){value.D={links:[],open:[],notes:[]};for(const ref of sorted.filter(r=>r.startsWith(ch+':')))units[ref].words.forEach((_,i)=>value.D.links.push({ref,base:[[ref,i]],reading:[[ref,i]],after:i?[ref,i-1]:null,kind:'exact',uncertain:false,checked:false,method:'Identity to unchanged Digital Mishnah word index'}));}
const forms=[],chapters=[],rules={...old.rules,'kaufmann-pointing-transfer':{label:'Punktierung und Wortkarten redaktionell aus Be’eri übertragen',refs:['Digital Mishnah Kaufmann S07326: unveränderte Konsonanten, Abkürzungen und Quellzeichen','Nur eindeutige identische Einzelwörter ohne Quellenflags; offene Fälle unverändert belassen','Keine Freigabe als Originalvokalisierung der Handschrift.']}};
for(const ref of sorted){const[c,m]=ref.split(':').map(Number);chapters[c-1]||=[];const tokens=sourceTokens.get(ref),ids=[];tokens.forEach(({token,words:anchors},t)=>{let analyses=[],record=null;if(anchors.length===1){record=transfers.find(r=>r.targetRef===ref&&r.targetWordIndex===anchors[0].i);if(record.status==='transferred'&&M.normalize(token.word)===M.normalize(record.pointedWord)){const[dc,dm]=record.sourceRef.split(':').map(Number),f=old.forms[donor.chapters[dc-1][dm-1][record.sourceToken-1]];analyses=f.analyses.map(a=>({...a,rules:[...new Set([...(a.rules||[]),'kaufmann-pointing-transfer'])],method:'kaufmann-pointing-transfer-candidate',note:(a.note?a.note+' ':'')+'Aus Be’eri '+record.sourceRef+' Wort '+record.sourceToken+' an diese Digital-Mishnah-Wortposition übertragen; weiterhin Analysekandidat.'}));record.lexicalToken=t+1;}}
 const id=forms.length;forms.push({word:token.word,key:token.key,status:analyses.length>1?'ambiguous':analyses.length?'candidate':'unresolved',analyses,hints:analyses.length?[]:['Punktierung oder sichere Wortzuordnung offen; keine Analyse aus abweichenden Zeichen übernommen.'],count:1});ids.push(id);});chapters[c-1][m-1]=ids;}
const D={version:1,title:TITLE,edition:VERSION,source:meta,sources:{[TITLE]:{rel:REL,textHash:meta.textHash,chapters}},sourceSummary:summary,originalFiles,witnessSha256:meta.witnessSha256,units,base:units,interlinear,forms,rules,transfers,provenance:{method:'Additive strict identical-word pointing transfer; candidates only',lexicalPolicy:'No biblical dictionaries; existing rabbinic/editorial analyses retained only at accepted anchors',accordance:'Independent surface comparison is a separate audit; not a donor and not an automatic correction'},coverage:{chapters:text.length,mishnayot:sorted.length,words:forms.length,sourceWords:transfers.length,statuses:forms.reduce((n,f)=>{n[f.status]=(n[f.status]||0)+1;return n;},{})}};
fs.writeFileSync(path.join(root,'mishnah-kaufmann-berakhot-data.js'),'// Derived, partial pointing overlay. Original Digital Mishnah and Be’eri sources remain unchanged.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_KAUFMANN_BERAKHOT_DATA=D;})('+JSON.stringify(D)+');\n');
const report={edition:VERSION,source:meta,sourceSummary:summary,originalFiles,openReasons:reasons,open:transfers.filter(r=>r.status==='open').map(({id,targetRef,targetWordIndex,originalWord,donorWord,reasons})=>({id,targetRef,targetWordIndex,originalWord,donorWord,reasons})),note:'No consonants, punctuation, abbreviations, deletions or raw XML have been repaired or replaced. Clearing the recorded insertions recovers the exact original offset text.'};
fs.writeFileSync(path.join(__dirname,'kaufmann-berakhot-pointing-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary));
