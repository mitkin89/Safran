(function(global){
'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
function create(D,{GM,Forms,Morph}){
 function features(key,greek){
  if(greek){const f=GM.feat(key);return Object.fromEntries(Object.entries(f).filter(([,v])=>Array.isArray(v)?v.length:v).map(([k,v])=>[k,Array.isArray(v)?v:[String(v)]]));}
  const clean=key.split('/')[0].replace('*',''),d=Morph.decode(clean,'1'),s=d.segs[d.main]||{};
  const f={pos:[s.pos||''],stem:s.stem?[s.stem]:[],tense:s.tense?[s.tense]:[]};
  const info=s.info||'';for(const [k,re]of [['person',/[123]\. Pers\./],['gender',/m\.|f\.|gemeinsam/],['number',/Sg\.|Pl\.|Du\./],['state',/absolut|constructus|determiniert/]]){const m=info.match(re);if(m)f[k]=[m[0]];}
  return f;
 }
 function extra(lemma,greek){
  const source=greek?D.greek:D.hebrew,key=fold(lemma),out=[];
  for(const [head,rows]of Object.entries(source))if(greek?head.normalize('NFC')===String(lemma).normalize('NFC'):fold(head)===key)for(const [form,morph,packed,status]of rows){
   const hits=[];for(let i=0;i<packed.length;i+=2){const loc=packed[i],p=D.places[loc],w=D.works[p[0]];hits.push({id:'x'+loc+':'+packed[i+1],title:w[0],version:w[1],rel:w[2],corpus:w[3],path:p[1],label:p[2],n:1});}
   for(const corpus of new Set(hits.map(h=>h.corpus)))out.push({form,features:features(morph,greek),hits:hits.filter(h=>h.corpus===corpus),status,corpus});
  }return out;
 }
 function base(ctx){
  if(!ctx.mdl)return [];
  return ctx.mdl.forms.map((f,i)=>({form:f.f,features:features(f.key,ctx.greek),corpus:ctx.greek?'LXX':'Tanach',status:'indexed',hits:ctx.F.refs(ctx.D,ctx.mdl,String(i)).map((r,j)=>({id:'b'+i+':'+j,title:r.title||r.book,version:r.vt||'Westminster',path:[r.ch-1],label:String(r.v),n:r.n,corpus:ctx.greek?'LXX':'Tanach'}))}));
 }
 function unique(rows){const hits=new Map();for(const row of rows)for(const h of row.hits)if(!hits.has(h.id))hits.set(h.id,h);return [...hits.values()];}
 const count=rows=>unique(rows).reduce((n,h)=>n+h.n,0);
 function filter(rows,scope,filters,except){return rows.filter(r=>(scope==='all'||r.corpus===scope)&&Object.entries(filters).every(([k,v])=>k===except||r.features[k]?.includes(v)));}
 function facets(rows,scope,filters){const keys=[...new Set(rows.flatMap(r=>Object.keys(r.features)))],out={};for(const k of keys){const pool=filter(rows,scope,filters,k),values=[...new Set(pool.flatMap(r=>r.features[k]||[]))].filter(Boolean);if(values.length)out[k]=values.map(v=>[v,count(pool.filter(r=>r.features[k]?.includes(v)))]);}return out;}
 function suggest(q,greek,live){const key=fold(q);if(!key)return [];const heads=Object.keys(greek?D.greek:D.hebrew).filter(s=>live?fold(s).startsWith(key):fold(s)===key);const seen=new Set();return heads.filter(s=>{const k=greek?s:fold(s);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,60).map(label=>({key:'corpus:'+label,id:label,label,kind:'corpus',greek,count:count(extra(label,greek)),language:greek?'Griechisch':'Hebräisch',source:greek?'Josephus / Philo':'Mischna'}));}
 return {features,extra,base,unique,count,filter,facets,suggest,coverage:D.coverage};
}
const api={create,fold};if(typeof module==='object'&&module.exports)module.exports=api;else global.WordCardCorpora=api;
})(typeof window==='object'?window:globalThis);
