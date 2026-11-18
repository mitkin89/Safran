// Tal–Florentin source words aligned to Westminster. No OSHB morphology is transferred.
(function(){
'use strict';
const cons=s=>String(s).normalize('NFKD').replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'})[c]);
function rows(data,ref){
 const result=(data.index[ref]||[]).map(source=>({ref:source,segs:data.verses[source].words.flatMap((w,i)=>w[3]===ref?[[w[4],w[0],null,{id:w[2],mask:w[1],ref:source,position:i+1,kind:w[5],boundary:w[6]}]]:[])}));
 if(data.missing[ref]?.length){if(!result.length)result.push({ref:null,segs:[]});for(const i of data.missing[ref])result[0].segs.push([[i],'—',null,{kind:'missing',ref}]);}
 return result;
}
function wordHtml(text,meta,esc){
 if(meta.kind==='missing')return '<span class="smr-missing" title="Kein Gegenstück im zugeordneten SMR-Abschnitt (maschineller Vergleich)">—</span>';
 let inner='',letters=[...text],mask=BigInt(meta.mask||0);
 letters.forEach((c,i)=>{const red=!!(mask&(1n<<BigInt(letters.length-i-1)));inner+=red?'<span class="mt-diff">'+esc(c)+'</span>':esc(c);});
 const status={exact:'gleicher Konsonantentext',spelling:'ähnliche Schreibung',context:'Kontextzuordnung',division:'abweichende Worttrennung',transposed:'abweichende Wortfolge',addition:'ohne Gegenstück an dieser MT-Stelle',unresolved:'Wortposition offen'}[meta.kind]||'';
 return '<span class="smr-word'+(meta.kind==='addition'?' smr-plus':meta.kind==='transposed'?' smr-transposed':'')+'" data-l="'+esc(meta.id)+'" data-m="" data-smr-ref="'+esc(meta.ref)+'" data-smr-position="'+meta.position+'" tabindex="0" lang="he" dir="rtl" title="Tal–Florentin · '+esc(meta.ref)+' · Wort '+meta.position+' · '+esc(status)+' (maschinelle Zuordnung)">'+inner+'</span>';
}
function openHtml(data,ref,esc){
 return (data.open[ref]||[]).map(group=>'<div class="smr-open"><small>SMR · '+esc(group.ref)+' · Wortposition offen</small><div dir="rtl" lang="he">'+group.words.map(i=>{const w=data.verses[group.ref].words[i];return wordHtml(w[0],{id:w[2],mask:w[1],ref:group.ref,position:i+1,kind:'unresolved'},esc);}).join(' ')+'</div></div>').join('');
}
function matches(data,ref,words){return data.mt[ref]?.length===words.length&&words.every((w,i)=>cons(w)===cons(data.mt[ref][i]));}
function sourceMatches(data,source,ref){
 const book=ref.replace(/ \d+:\d+$/,''),expected=data.source.books[book];
 if(!expected||expected.he.sha256!==source.base.sha256[book])return false;
 const a=data.verses[ref]?.words,b=source.verses[ref]?.words;
 return !!a&&!!b&&a.length===b.length&&a.every((w,i)=>w[0]===b[i][0]&&String(w[1])===String(b[i][1])&&w[2]===b[i][2]);
}
function noteAnchor(data,source,ref,indices){
 if(!sourceMatches(data,source,ref)||!indices.length)return null;
 const words=indices.map(i=>data.verses[ref].words[i]);
 if(words.some(w=>!w||!w[3])||!words.every(w=>w[3]===words[0][3]))return null;
 const target=words[0][3];
 if(words.every(w=>w[5]==='addition'&&w[6]===words[0][6]))return {kind:'gap',ref:target,start:words[0][6]-1,end:words[0][6]-1};
 if(words.some(w=>!w[4].length))return null;
 const positions=[...new Set(words.flatMap(w=>w[4]))].sort((a,b)=>a-b);
 if(positions.some((p,i)=>i&&p!==positions[i-1]+1))return null;
 return {kind:'word',ref:target,start:positions[0]-1,end:positions.at(-1)-1};
}
function targetRefs(data,source,ref){return sourceMatches(data,source,ref)?[...new Set(data.verses[ref].words.map(w=>w[3]).filter(Boolean))]:[];}
function qereExpansion(data,old,updated){
 if(old.kind!=='word'||updated.kind!=='word'||old.ref!==updated.ref||updated.start>old.start||updated.end<old.end)return false;
 const added=Array.from({length:updated.end-updated.start+1},(_,i)=>updated.start+i).filter(i=>i<old.start||i>old.end);
 return added.length>0&&added.every(i=>(data.qere[old.ref]||[]).some(g=>g.includes(i+1)&&g.some(j=>j>=old.start+1&&j<=old.end+1)));
}
const api={rows,wordHtml,openHtml,matches,sourceMatches,noteAnchor,targetRefs,qereExpansion};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SamaritanInterlinear=api;
})();
