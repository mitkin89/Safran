'use strict';
// Compare only individually observed positive signs with literal private spans.
// Neither absence in the image nor complete word pointing is inferred.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),C=require('../mishnah-morph/compare-kaufmann-pointing.cjs');
const ROOT=path.resolve(__dirname,'../..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const category=c=>/[\u05b0-\u05bb\u05c7]/u.test(c)?'vowel':c==='ּ'?'dot':/[ׁׂ]/u.test(c)?'shin-sin':c;
function main(auditFile,reviewFiles){
 const audit=JSON.parse(fs.readFileSync(auditFile)),files=new Map(audit.files.map(f=>{const raw=fs.readFileSync(f.path,'utf8');if(sha(raw)!==f.sha256)throw Error('Private reference changed');return[f.sha256,raw];})),checks=[],data=new Map(),reports=[];
 const loaded=reviewFiles.map(file=>({file,bytes:fs.readFileSync(file)})).map(r=>({...r,review:JSON.parse(r.bytes)})),counters=loaded.filter(r=>r.review.method==='independent blind AI image countercheck').flatMap(r=>r.review.observations||[]);
 for(const {file,bytes,review}of loaded){reports.push({file:path.basename(file),sha256:sha(bytes)});
  for(const o of review.observations||[]){
   if(!o.observedFeatures?.length)continue;
   const declared=audit.units.find(u=>o.sourceWordId.startsWith(u.sourceUnitId+'/word/')),title=o.title||declared?.title;if(!title||title!==declared?.title)throw Error('Point observation belongs to wrong source title');
   const name=title.slice(8).toLowerCase().replace(/ /g,'-');if(!data.has(name))data.set(name,require(path.join(ROOT,'mishnah-kaufmann-accordance-'+name+'-data.js')));
   const d=data.get(name),t=d.transfers.find(t=>t.id===o.sourceWordId);if(!t)throw Error('Unbound point observation');
   for(const f of o.observedFeatures){const marks=[...new Set(typeof f.marks==='string'?[...f.marks]:f.marks||[])].sort(),check={report:path.basename(file),sourceWordId:o.sourceWordId,title,ref:o.ref||declared.ref,folio:o.folio,letterIndex:f.letterIndex,imageMarks:marks,certainty:f.certainty,targetTransferStatus:t.status,status:null};
    if(!marks.length)continue;if(marks.some(m=>typeof m!=='string'||!/^([\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7])$/u.test(m)))throw Error('Invalid positive point mark');
    const cs=counters.filter(c=>c.sourceWordId===o.sourceWordId).flatMap(c=>c.observedFeatures||[]).filter(c=>c.letterIndex===f.letterIndex);
    if(cs.some(c=>{const ms=typeof c.marks==='string'?[...c.marks]:c.marks||[];if(c.certainty==='uncertain'&&!ms.length)return true;const cats=new Set(ms.map(category)),old=marks.filter(m=>cats.has(category(m)));return c.certainty==='clear'&&old.length&&JSON.stringify(old.sort())!==JSON.stringify([...ms].sort());})){check.initialCertainty=check.certainty;check.certainty='uncertain';check.adjudication='Earlier image interpretation not independently confirmed; countercheck is retained separately.';}
    const s=t.source,raw=s&&files.get(s.originalFileSha256),token=raw?.slice(s.originalRawStart,s.originalRawEnd),signature=token&&C.pointingSignature(token);
    if(!s||!raw)check.status='no-unique-source-reference';
    else if(t.reasons.includes('reference-editorial-annotation')||signature.status!=='valid'||!signature.clusters[f.letterIndex])check.status='reference-not-safely-comparable';
    else{if(sha(token)!==s.originalTokenSha256)throw Error('Original reference token changed');const cats=new Set(marks.map(category));check.referenceMarks=signature.clusters[f.letterIndex].marks.filter(m=>cats.has(category(m))).sort();check.originalTokenSha256=s.originalTokenSha256;
     check.status=check.certainty!=='clear'?'uncertain-image-feature':JSON.stringify(marks)===JSON.stringify(check.referenceMarks)?'agree':check.referenceMarks.length?'different-mark':'reference-mark-not-present';
    }checks.push(check);
   }
  }
 }
 const result={version:1,method:'Positive individual AI image signs against unchanged original private reference tokens; not complete word or corpus vowel validation',policy:'No automatic source correction. Different or absent reference signs remain open observations for review; uncertain image features are never confirmed conflicts.',reports,summary:checks.reduce((s,c)=>(s[c.status]=(s[c.status]||0)+1,s),{}),checks};
 fs.writeFileSync(path.join(__dirname,'accordance-nashim-image-point-comparison.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));return result;
}
module.exports={main};if(require.main===module)main(process.argv[2],process.argv.slice(3));
