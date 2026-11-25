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
 // Verse quotations already appear in Hebrew with their source references above.
 // Keep the German rubric, rather than repeating the quotation in translation.
 function explanation(reading){
  const method=reading.method||'',de=String(reading.de||'');
  if(/^(?:aligned-(?:juxtaposed-)?quotation(?:-resegmented|-candidate)?|exact-referenced-quotation-spans|lemma-plus-quotation)$/.test(method))return '';
  if(method==='aligned-quotation-and-formula')return de.includes(' — ')?de.slice(de.indexOf(' — ')+3).trim():'';
  if(method==='lemma-formula'&&de.includes(':')&&!/[א-ת]/.test(de.split(':')[0]))return de.slice(de.indexOf(':')+1).trim();
  const quotations=typeof module!=='undefined'&&module.exports?require('./masora-quotation-display'):root.MASORA_QUOTATION_DISPLAY;
  const display=quotations?.notes?.[reading.uuid];
  if(display&&display[0]===reading.source)return display[1];
  return de;
 }
 function html(record,safe,t=x=>x){
  if(!record)return '';
  const readings=record.readings.map(r=>({...r,de:explanation(r)})).filter(r=>r.de);
  if(!readings.length)return '';
  const partial=readings.some(r=>r.status==='partial'),label=t('Übersetzung')+' · '+t(partial?'teilweise offen':'Arbeitsfassung');
  return '<section class="masora-translation masora-explanation" role="note" aria-label="'+safe(t('Übersetzung'))+'"><div class="masora-interpretation-label" title="'+safe(t('Deutsche Arbeitsübersetzung, nicht fachlich abschließend geprüft.'))+'">'+safe(label)+(partial?' · '+safe(t('[ … ] = nicht sicher übersetzt.')):'')+'</div>'+readings.map(r=>
   '<p class="masora-de" lang="de" dir="ltr" data-status="'+safe(r.status)+'">'+safe(r.de)+'</p>'
  ).join('')+'</section>';
 }
 const api={index,match,html,explanation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasoraTranslations=api;
})(typeof window!=='undefined'?window:globalThis);
