(function(root){
 'use strict';
 const str=x=>String(x??'').trim();
 function ranges(values){
  const out=[];let start='',last='';
  const number=s=>/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(+s);
  const flush=()=>{if(start!=='')out.push(start===last?start:start+'–'+last);};
  for(const value of values.map(str)){if(!value)continue;if(start!==''&&number(last)&&number(value)&&+value===+last+1)last=value;else{flush();start=last=value;}}flush();return out.join(', ');
 }
 function locator(value){
  const raw=str(value);if(!raw)return '';
  const parts=raw.split(/\s*;\s*/),groups=new Map();
  if(parts.every(p=>/^\d+[ab]?(?::\d+)+$/.test(p))){for(const p of parts){const xs=p.split(':'),last=xs.pop(),prefix=xs.join(':');if(!groups.has(prefix))groups.set(prefix,[]);if(!groups.get(prefix).includes(last))groups.get(prefix).push(last);}return [...groups].map(([prefix,xs])=>prefix+':'+ranges(xs)).join('; ');}
  for(const part of parts){
   const m=/^((?:Kapitel|Chapter|Daf|Folio)\s+\d+[ab]?)(?:\s*›\s*(?:Vers|Verse|Zeile|Line|Kommentar|Comment|Mischna|Mishnah)\s+\d+)*\s*(?:·\s*(.*))?$/i.exec(part);
   if(!m)return raw;
   const section=part.split('·')[0].trim(),heads=[...section.matchAll(/(?:Kapitel|Chapter|Daf|Folio|Vers|Verse|Zeile|Line|Kommentar|Comment|Mischna|Mishnah)\s+(\d+[ab]?)/gi)].map(m=>m[1]);
   if(!groups.has(section))groups.set(section,{heads,labels:[]});
   if(m[2]){const labels=m[2].split(/\s*,\s*/);if(labels.some(l=>!/^\d+(?::\d+)*$/.test(l)))return raw;for(const label of labels)if(!groups.get(section).labels.includes(label))groups.get(section).labels.push(label);}
  }
  return [...groups.values()].map(g=>g.heads[0]+(g.heads.length>1?','+g.heads.slice(1).join(':'):'')+(g.labels.length?(g.heads.length>1?':':', ')+ranges(g.labels):'')).join('; ');
 }
 function section(c={}){const raw=str(c.locator),m=/^(?:(?:Kapitel|Chapter|Daf|Folio)\s+)?(\d+[ab]?)(?=[: ,;·›]|$)/i.exec(raw);return m?m[1]:locator(raw);}
 function edition(c={}){
  const text=str(c.edition),year=str(c.year);
  if(text==='merged')return 'Standardtext'+(/^(he|Hebrew)$/i.test(c.language)?' (Hebräisch)':/^(en|English)$/i.test(c.language)?' (Englisch)':'');
  if(/^Westminster Leningrad Codex\b/.test(text))return 'Westminster (OSHB)';
  if(/^Aleppo-Kodex\b/.test(text))return 'Aleppo-Kodex';
  let m=/^Talmud Bavli\. German trans\. by Lazarus Goldschmidt,\s*(\d{4})/.exec(text);if(m)return 'Goldschmidt ('+m[1]+')';
  if(/Unter der Redaction von Dr\. Zunz/.test(text)){m=/Berlin\s+(\d{4})/.exec(text);return 'Zunz'+(year||m?' ('+(year||m[1])+')':'');}
  if(/Übersetzung von Lazarus Goldschmidt, Berlin 1921/.test(text))return 'Goldschmidt (1921)';
  if(/^Der Pentateuch, übersetzt und erläutert von Samson Raphael Hirsch/.test(text)){m=/(\d{4}(?:[-–]\d{4})?)/.exec(text);return 'S. R. Hirsch'+(year||m?' ('+(year||m[1])+')':'');}
  return text;
 }
 function location(c={}){return [str(c.work),locator(c.locator)].filter(Boolean).join(' ');}
 function full(c={}){const where=[str(c.work),str(c.locator)].filter(Boolean).join(' '),details=[c.edition,c.translator?'Übersetzung: '+c.translator:'',c.editor?'Herausgabe: '+c.editor:'',c.publisher,c.year].filter(Boolean);return [where,details.join('; '),c.url].filter(Boolean).join('. ');}
 function compact(c={}){
  const short=edition(c),details=[short];
  if(c.translator&&!short.toLowerCase().includes(str(c.translator).toLowerCase()))details.push('Übersetzung: '+c.translator);
  if(c.editor&&!short.toLowerCase().includes(str(c.editor).toLowerCase()))details.push('Herausgabe: '+c.editor);
  if(c.publisher)details.push(c.publisher);if(c.year&&!short.includes(c.year))details.push(c.year);
  return [location(c),details.filter(Boolean).join('; ')].filter(Boolean).join(' — ');
 }
 function heading(c={}){return [edition(c),location(c)].filter(Boolean).join(' · ');}
 function identity(c={}){return JSON.stringify(['work','edition','translator','editor','publisher','year','url','language'].map(k=>str(c[k])));}
 const api={ranges,locator,section,edition,location,full,compact,heading,identity};if(typeof module!=='undefined')module.exports=api;else root.ResearchCitations=api;
})(typeof window==='undefined'?globalThis:window);
