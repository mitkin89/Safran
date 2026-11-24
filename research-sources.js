'use strict';
// Reference resolution uses native reader sections/rows, never another edition's numbering.
const R=require('./reader'),Refs=require('./refs');
const norm=s=>String(s||'').normalize('NFC').toLocaleLowerCase().replace(/[.\s]+/g,' ').trim();
function parse(query,entries){
 if(typeof query!=='string'||query.length>500)throw Error('Bitte eine kurze Stellenangabe eingeben.');
 const m=query.trim().replace(/[—–]/g,'-').match(/^(.*?\D)\s*(\d+[ab]?)(?:\s*[:,]\s*([\d\s,:;ab-]+))?$/i);
 if(!m||!m[1].trim())throw Error('Bitte eine Stelle wie „Hiob 7,1–3“ oder „Genesis 1:1“ eingeben.');
 const book=m[1].trim(),canonical=Refs.canonBook(book)||({gen:'Genesis',exod:'Exodus',lev:'Leviticus',num:'Numbers',deut:'Deuteronomy'})[norm(book)],titles=[...new Set(entries.filter(e=>norm(e.title)===norm(book)||norm(e.heTitle)===norm(book)||canonical&&e.title===canonical).map(e=>e.title))];
 if(titles.length!==1)throw Error(titles.length?'Die Buchangabe ist nicht eindeutig. Bitte den vollständigen Titel eingeben.':'Dieses Werk ist nicht in deiner lokalen Bibliothek.');
 return {title:titles[0],chapter:m[2].toLowerCase(),selection:(m[3]||'').replace(/\s+/g,'')};
}
function selectAddresses(selection,addresses){
 if(!selection)return new Set(addresses.map(x=>x.address));
 const chosen=new Set();
 for(const token of selection.split(/[,;]/)){
  const exact=addresses.filter(x=>x.address===token||x.address.startsWith(token+':'));if(exact.length){exact.forEach(x=>chosen.add(x.address));continue;}
  const parts=token.split('-');if(parts.length>2||parts.some(p=>!/^\d+(?::\d+)*$/.test(p)))throw Error('Ungültige Versauswahl. Zum Beispiel: 1–3, 7.');
  const a=parts[0].split(':').map(Number),b=(parts[1]||parts[0]).split(':').map(Number);
  if([...a,...b].some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Ungültige Versnummer.');
  if(b.length===1&&a.length>1)b.unshift(...a.slice(0,-1));
  if(a.length!==b.length||a.slice(0,-1).some((v,i)=>v!==b[i])||b.at(-1)<a.at(-1)||b.at(-1)-a.at(-1)>500)throw Error('Bitte Bereiche innerhalb eines Abschnitts wählen; weitere Stellen getrennt hinzufügen.');
  for(let n=a.at(-1);n<=b.at(-1);n++){
   const key=[...a.slice(0,-1),n].join(':'),found=addresses.filter(x=>x.address===key||x.address.startsWith(key+':'));
   if(!found.length)throw Error('Die gewählte Zeile '+key+' fehlt in dieser Edition.');
   found.forEach(x=>chosen.add(x.address));
  }
 }
 return chosen;
}
function plans(doc,ref){
 const sections=R.sectionsOf(doc.text,doc.sectionNames);
 const root=doc.text&&!Array.isArray(doc.text)&&typeof doc.text==='object'&&Object.hasOwn(doc.text,'')?['']:[];
 const flat=sections.length===1&&JSON.stringify(sections[0].path)===JSON.stringify(root);
 const m=/^(\d+)([ab]?)$/.exec(ref.chapter),n=+m[1];
 if(!Number.isSafeInteger(n)||n>10000)throw Error('Ungültiger Abschnitt.');
 const daf=doc.sectionNames?.[0]==='Daf';
 if(m[2]&&!daf)throw Error('Diese Edition verwendet keine Daf-Zählung.');
 const base=flat?root:[...root,daf?(n-1)*2+(m[2]==='b'?1:0):n-1];
 const eligible=sections.filter(s=>base.every((p,i)=>s.path[i]===p));
 if(!eligible.length)throw Error('Dieser Abschnitt fehlt in der gewählten Edition.');
 const addresses=[];
 for(const s of eligible){
  const prefix=s.path.slice(base.length).map(x=>typeof x==='number'?String(x+1):String(x));
  for(const row of R.flattenNode(R.getByPath(doc.text,s.path)))addresses.push({address:[...prefix,...(row.label?[row.label]:[])].join(':'),section:s.path,label:row.label});
 }
 const selection=flat?[ref.chapter,ref.selection].filter(Boolean).join(':'):ref.selection;
 const selected=selectAddresses(selection,addresses),out=[];
 for(const s of eligible){const labels=addresses.filter(a=>JSON.stringify(a.section)===JSON.stringify(s.path)&&selected.has(a.address)).map(a=>a.label);if(labels.length)out.push({sectionPath:s.path,labels});}
 if(!out.length)throw Error('Keine vorhandenen Zeilen ausgewählt.');
 if(out.length>50||out.reduce((n,x)=>n+x.labels.length,0)>500)throw Error('Bitte höchstens 500 Zeilen auf einmal hinzufügen.');
 return out;
}
function editions(entries,title){return entries.filter(e=>e.title===title).map(e=>({rel:e.rel,title:e.title,versionTitle:e.versionTitle||'',language:e.language||'',kind:e.kind||''})).sort((a,b)=>a.versionTitle.localeCompare(b.versionTitle));}
module.exports={parse,plans,editions};
