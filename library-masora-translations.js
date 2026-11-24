// Translation overlays are separate from the published Masorah source corpus.
(function(root){
 'use strict';
 function index(manifest){
  if(manifest?.schema!==1||manifest.status!=='working-draft'||!Array.isArray(manifest.batches))throw Error('Invalid Masorah translation index');
  const map=new Map();for(const batch of manifest.batches)for(const uuid of batch.ids){if(map.has(uuid))throw Error('Duplicate Masorah translation');map.set(uuid,batch);}
  if(map.size!==manifest.count)throw Error('Incomplete Masorah translation index');return map;
 }
 function match(entry,record,data){
  if(!record||!Array.isArray(record.readings)||!Array.isArray(entry.readings)||record.uuid!==entry.uuid||record.label!==entry.label||record.type!==entry.type||record.readings.length!==entry.readings.length)return null;
  for(let i=0;i<entry.readings.length;i++){
   const src=entry.readings[i],tr=record.readings[i],refs=(src.references||[]).map(x=>x.label);
   if(tr.uuid!==src.uuid||tr.source!==data.text(src)||JSON.stringify(tr.sourceReferences)!==JSON.stringify(refs))return null;
  }
  return record;
 }
 function html(record,safe,t=x=>x){
  if(!record)return '';
  const partial=record.readings.some(r=>r.status==='partial'),label=t('Übersetzung')+' · '+t(partial?'teilweise offen':'Arbeitsfassung');
  return '<details class="masora-translation"><summary title="'+safe(t('Deutsche Arbeitsübersetzung, nicht fachlich abschließend geprüft.'))+'">'+safe(label)+'</summary>'+(partial?'<p class="muted">'+safe(t('[ … ] = nicht sicher übersetzt.'))+'</p>':'')+record.readings.map(r=>{
   const source=r.attribution||[r.edition,r.reference||r.ref||(r.sourceReferences||[]).join(' · ')].filter(Boolean).join(' · ');
   return '<p class="masora-de" lang="de" dir="ltr" data-status="'+safe(r.status)+'">'+safe(r.de)+(source?'<small class="muted">'+safe(source)+'</small>':'')+'</p>';
  }).join('')+'</details>';
 }
 const api={index,match,html};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasoraTranslations=api;
})(typeof window!=='undefined'?window:globalThis);
