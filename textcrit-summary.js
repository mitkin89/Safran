// Consolidated reading line per apparatus locus ("Lesartenzeile"): groups the individual
// witness entries of one MT position by their reading, BHS-style.
// Every record may carry lz:{f,w,rd,op,ret,n,title} (f = witness family: SMR DSS LXX Hex Syr Ken); records without lz stay in the detail list only.
//   op: 'var' (different Hebrew wording rd) · 'om' (MT text missing) · 'add' (plus; rd = Hebrew if known)
//       'note' (differs, no Hebrew wording) · 'interp' (same consonants, other interpretation)
//       'orth' (spelling only) · 'cite' (citation such as hexaplaric translators, no judgement)
// Witnesses that are silent are never counted as agreeing with the MT.
(function(){
'use strict';
const ORDER=['SMR','DSS','LXX','Hex','Syr','Ken'];
const OPS=['var','add','om','note','interp','orth','cite'];
const cons=s=>String(s||'').normalize('NFKD').replace(/[^א-ת ]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]).replace(/\s+/g,' ').trim();
const rank=f=>{const i=ORDER.indexOf(f);return i<0?ORDER.length:i;};
// records of one locus -> [{kind,start,end,parts:[{op,rd,ws:[{w,ret,n,title}]}]}]
const skeleton=s=>s.replace(/ /g,'').replace(/(?!^)[וי](?!$)/g,'');
function build(entries,mtWords=null){
  const subs=new Map();
  for(const e of entries)for(const z0 of [].concat(e.lz||[])){
    let a=e.anchor,z=z0;if(!z||!z.w||!a||!OPS.includes(z.op))continue;
    // trim words the reading shares with the MT at either end, so that e.g. „ביום הששי“ for „ביום השביעי“ sits on „השביעי“
    if(z.op==='var'&&mtWords&&a.kind==='word'){
      const r=cons(z.rd).split(' ').filter(Boolean),m=mtWords.slice(a.start,a.end+1).map(cons);let s=a.start,e2=a.end;
      while(r.length>1&&s<e2&&r[0]===m[s-a.start]){r.shift();s++;}
      while(r.length>1&&e2>s&&r.at(-1)===m[e2-a.start]){r.pop();e2--;}
      if(s!==a.start||e2!==a.end){a={...a,start:s,end:e2};z={...z,rd:r.join(' ')};}
    }
    // a wording identical with the MT is no variant; one differing only in ו/י inside the word is spelling
    if(z.op==='var'&&mtWords&&a.kind==='word'){const m=cons(mtWords.slice(a.start,a.end+1).join(' ')),r=cons(z.rd);if(r.replace(/ /g,'')===m.replace(/ /g,''))continue;if(skeleton(r)===skeleton(m))z={...z,op:'orth'};}
    const k=a.kind+'|'+a.start+'|'+a.end;
    if(!subs.has(k))subs.set(k,{kind:a.kind,start:a.start,end:a.end,parts:new Map()});
    const rd=z.op==='var'||z.op==='add'?cons(z.rd):'';
    if(z.op==='var'&&!rd)continue;
    const pk=z.op+'|'+rd,parts=subs.get(k).parts;
    if(!parts.has(pk))parts.set(pk,{op:z.op,rd:rd?String(z.rd).trim():'',ws:[]});
    const ws=parts.get(pk).ws,prev=ws.find(x=>x.w===z.w);
    if(prev){prev.n=(prev.n||0)+(z.n||0);prev.ret=prev.ret&&!!z.ret;}
    else ws.push({f:z.f||z.w,w:z.w,ret:!!z.ret,n:z.n||0,title:z.title||''});
  }
  return [...subs.values()].map(s=>({...s,parts:[...s.parts.values()].map(p=>({...p,ws:p.ws.sort((x,y)=>rank(x.f)-rank(y.f)||x.w.localeCompare(y.w))}))
    .sort((x,y)=>OPS.indexOf(x.op)-OPS.indexOf(y.op)||rank(x.ws[0].f)-rank(y.ws[0].f))}))
    .sort((x,y)=>x.start-y.start||(x.kind==='word'?-1:1)||x.end-y.end);
}
function render(entries,mtWords,locus,esc,t=s=>s){
  const subs=build(entries,mtWords);if(!subs.length)return '';
  const he=s=>'<bdi lang="he" dir="rtl">'+esc(s)+'</bdi>';
  const wit=x=>'<span class="tc-lz-w'+(x.ret?' tc-lz-ret':'')+'"'+(x.title||x.ret?' title="'+esc(x.ret?t('erschlossene Vorlage')+(x.title?' · '+x.title:''):x.title)+'"':'')+'>'+esc(x.w)+(x.n>1||(x.f==='Ken'&&x.n)?'<sup>'+x.n+'</sup>':'')+'</span>';
  const label={om:'om.',note:'≠',interp:t('vgl.'),orth:t('orth.'),cite:''};
  const ttl={om:t('fehlt in'),note:t('weicht ab, ohne erschließbaren hebräischen Wortlaut'),interp:t('gleiche Konsonanten, andere Deutung oder Wiedergabe'),orth:t('nur Schreibweise'),add:t('Zusatz')};
  const lines=subs.map(s=>{
    const own=s.kind===locus.kind&&s.start===locus.start&&s.end===locus.end;
    const lemma=own?'':(s.kind==='word'?he(mtWords.slice(s.start,s.end+1).join(' '))+' ] ':s.start<0?t('vor dem ersten Wort')+' ] ':t('nach')+' '+he(mtWords[s.start]||'')+' ] ');
    const parts=s.parts.map(p=>{
      const ws=p.ws.map(wit).join(' ');
      const cls=' class="tc-lz-part tc-lz-'+p.op+'"';
      if(p.op==='var')return '<span'+cls+'>'+he(p.rd)+' '+ws+'</span>';
      if(p.op==='add')return '<span'+cls+' title="'+esc(ttl.add)+'">+ '+(p.rd?he(p.rd)+' ':'')+ws+'</span>';
      return '<span'+cls+' title="'+esc(ttl[p.op]||'')+'">'+(label[p.op]?'<i>'+esc(label[p.op])+'</i> ':'')+ws+'</span>';
    });
    return '<div class="tc-lz-line">'+lemma+parts.join(' <span class="tc-lz-sep">|</span> ')+'</div>';
  });
  return '<div class="tc-lz" title="'+esc(t('Lesartenzeile: abweichende Zeugen nach Lesart gruppiert; Schweigen eines Zeugen bedeutet keine Übereinstimmung mit dem MT.'))+'">'+lines.join('')+'</div>';
}
const api={build,render,cons};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.TextCritSummary=api;
})();
