'use strict';
// Original private spans are authoritative; supplied numbering is retained.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const core=require('./build_zeraim_accordance.cjs'),donor=require('../../mishnah-nashim-data');
const ROOT=path.resolve(__dirname,'../..'),sha=(s,alg='sha256')=>crypto.createHash(alg).update(s).digest('hex');
function readGlobal(file,name){const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),'utf8'),c);return c.window[name];}
function main(auditFile){
 const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
 if(audit.diagnostics?.errors?.length||audit.approvedForBuild!==true)throw Error('Independent input projection must be finalized and approved');
 if(sha(fs.readFileSync(path.join(ROOT,'mishnah-textcrit-catalog.js')))!==audit.sourceCatalogSha256)throw Error('Diplomatic source catalog changed');
 const files=new Map(audit.files.map(f=>{const raw=fs.readFileSync(f.path,'utf8');if(sha(raw)!==f.sha256||raw.length!==f.utf16Length)throw Error('Original private input changed');return[f.fileIndex,{...f,raw}];}));
 const catalog=readGlobal('mishnah-textcrit-catalog.js','MISHNAH_TEXTCRIT_CATALOG'),out=readGlobal('mishnah-accordance-catalog.js','MISHNAH_ACCORDANCE_CATALOG'),manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'bundled/manifest.json'))),reports=[];
 for(const title of Object.keys(catalog).filter(t=>catalog[t].coordinate[0]===3)){
  const entries=audit.units.filter(u=>u.title===title).sort((a,b)=>{const x=a.ref.split(':').map(Number),y=b.ref.split(':').map(Number);return x[0]-y[0]||x[1]-y[1];});
  let raw='';const segments=[],mapping=new Map();
  for(const u of entries){raw+='Nash. '+u.ref+' ';mapping.set(u.ref,u);for(const [i,s]of u.spans.entries()){
   const file=files.get(s.fileIndex),body=file.raw.slice(s.startUtf16,s.endUtf16);if(sha(body)!==s.sha256Utf8||/[\r\n]/u.test(body))throw Error('Original span changed or multiline '+title+' '+u.ref);
   if(i)raw+=' ';const start=raw.length;raw+=body;segments.push({start,end:raw.length,original:s,file});
  }raw+='\n';}
  const result=core.build([title.slice(8),'Nash.'],raw,donor,catalog),{data,doc,item,report}=result;
  if(data.source.diplomaticSha256!==audit.sourceXmlUncompressedSha256)throw Error('Diplomatic source fingerprint changed');
  const divisionNote=u=>u.spans.length>1||u.spans.some(s=>s.suppliedRef!==u.ref)?'Abweichende Vorlageneinteilung; Originalabschnitt(e) '+[...new Set(u.spans.map(s=>s.suppliedRef||'ohne Beschriftung'))].join(', ')+' positionsgenau dem Kaufmann-Abschnitt '+u.ref+' zugeordnet. Kein ergänzter Quelltext.':null;
  for(const t of data.transfers)if(t.source){const s=segments.find(s=>s.start<=t.source.rawStart&&s.end>=t.source.rawEnd);if(!s)throw Error('Unbound original span '+t.id);const start=s.original.startUtf16+t.source.rawStart-s.start,end=s.original.startUtf16+t.source.rawEnd-s.start;
   if(s.file.raw.slice(start,end)!==raw.slice(t.source.rawStart,t.source.rawEnd))throw Error('Token differs from original paste');
   Object.assign(t.source,{originalRef:s.original.suppliedRef||null,originalFileIndex:s.file.fileIndex,originalFileSha256:s.file.sha256,originalRawStart:start,originalRawEnd:end,originalTokenSha256:sha(s.file.raw.slice(start,end)),refKind:'Kaufmann comparison unit mapped to unchanged supplied source span'});
  }
  for(const[ref,u]of Object.entries(data.units)){const mapped=mapping.get(ref);if(mapped.sourceUnitId!==u.id)throw Error('Wrong source unit ID');u.referenceSpans=mapped.spans;const[c,m]=ref.split(':').map(Number);for(const id of data.sources[title].chapters[c-1][m-1]){const f=data.forms[id];f.provenance.pointing.divisionNote=divisionNote(mapped);f.provenance.pointing.originalRefs=[...new Set(mapped.spans.map(s=>s.suppliedRef||null))];}}
  data.source.inputReferences=audit.files.map(({fileIndex,sha256,bytes})=>({fileIndex,sha256,bytes}));data.provenance.referenceProjection='Unchanged original private body spans; synthetic comparison headings only. Exact original token offsets retained separately.';
  const emit=(file,global,d)=>fs.writeFileSync(path.join(ROOT,file),'// Generated source-preserving candidate edition; manuscript evidence is separate.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.'+global+'=D;})('+JSON.stringify(d)+');\n');emit(item.file,item.global,data);
  const target=path.join(ROOT,'bundled',item.rel),bytes=JSON.stringify(doc,null,2)+'\n';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  const entry={rel:item.rel,title,heTitle:doc.heTitle,language:'Hebrew',versionTitle:data.edition,categories:doc.categories,kind:'he',hash:sha(bytes,'sha1')},i=manifest.items.findIndex(x=>x.rel===entry.rel);if(i<0)manifest.items.push(entry);else manifest.items[i]=entry;out[title]=item;reports.push({...report,originalInputs:data.source.inputReferences,referenceProjection:data.provenance.referenceProjection});
  console.log(JSON.stringify({title,...data.sourceSummary,analyses:data.coverage.statuses}));
 }
 fs.writeFileSync(path.join(ROOT,'bundled/manifest.json'),JSON.stringify(manifest,null,1)+'\n');fs.writeFileSync(path.join(ROOT,'mishnah-accordance-catalog.js'),'// Source-bound provisional editions; not manuscript-certified.\nwindow.MISHNAH_ACCORDANCE_CATALOG='+JSON.stringify(out)+';\n');
 const {files:inputFiles,...publicAudit}=audit;publicAudit.files=inputFiles.map(({path,...f})=>f);fs.writeFileSync(path.join(__dirname,'accordance-nashim-supplied-scope-audit.json'),JSON.stringify(publicAudit,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'accordance-nashim-working-audit.json'),JSON.stringify({version:1,books:reports},null,2)+'\n');
}
module.exports={main};if(require.main===module)main(process.argv[2]);
