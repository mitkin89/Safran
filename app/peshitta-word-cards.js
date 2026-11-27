(function(global){
'use strict';
const Chart=typeof module==='object'&&module.exports?require('./word-card-chart'):global.WordCardChart;
const fields=['sp','vs','vt','ps','gn','nu','vo','st'];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0730-\u074a]/g,'').replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]).trim();
function create(D,M){
 const entries=Object.entries(D.lex).map(([id,x])=>({id,label:M.lemma(id),gloss:x.gloss,forms:x.forms,count:x.forms.reduce((n,f)=>n+f[2].reduce((s,r)=>s+r[3],0),0)}));
 const byId=new Map(entries.map(x=>[x.id,x]));
 function suggest(q,prefix){
  q=norm(q);if(!q)return [];
  const fits=s=>prefix?norm(s).startsWith(q):norm(s)===q;
  return entries.filter(x=>fits(x.label)||fits(M.hebrew(x.label))||x.forms.some(f=>fits(f[0])||fits(M.hebrew(f[0])))).map(x=>({key:'ps:'+x.id,id:x.id,label:x.label,gloss:x.gloss,count:x.count,kind:'peshitta',language:'Aramäisch',source:'Peschitta'}));
 }
 function render(id,filters,limit,esc,t){
  const x=byId.get(id);if(!x)return null;
  const matches=(f,except)=>Object.entries(filters).every(([k,v])=>k===except||f[1][fields.indexOf(k)]===v);
  const rows=x.forms.filter(f=>matches(f)),count=rows.reduce((n,f)=>n+f[2].reduce((s,r)=>s+r[3],0),0);
  const label=(k,v)=>{const d=M.describe({[k]:v},t);return d.pos||d.info||v;};
  const names=['Wortart','Binyan','Form','Person','Genus','Numerus','Genus verbi','Status'];
  const grammar=fields.map((k,i)=>{const values=new Map();for(const f of x.forms)if(matches(f,k)&&f[1][i]&&!['NA','unknown','n/a'].includes(f[1][i]))values.set(f[1][i],(values.get(f[1][i])||0)+f[2].reduce((s,r)=>s+r[3],0));return values.size?`<div class="wcPeshFilter"><span>${esc(t(names[i]))}</span>${[...values].map(([v,n])=>`<button type="button" data-pesh-field="${k}" data-value="${esc(v)}" aria-pressed="${filters[k]===v}">${esc(label(k,v))} <small>${n.toLocaleString()}</small></button>`).join('')}</div>`:'';}).join('');
  const dist=new Map(),refs=new Map();for(const f of rows)for(const r of f[2]){dist.set(r[0],(dist.get(r[0])||0)+r[3]);const key=r.slice(0,3).join(':');if(!refs.has(key))refs.set(key,{r,forms:new Set()});refs.get(key).forms.add(f[0]);}
  const list=[...refs.values()].sort((a,b)=>a.r[0]-b.r[0]||a.r[1]-b.r[1]||a.r[2]-b.r[2]);
  const link=(r,forms)=>`<a href="#" data-target-forms="${esc(JSON.stringify([...forms]))}" data-pesh-ref="${esc(D.books[r[0]][0]+' '+r[1]+':'+r[2])}" data-book="${esc(D.books[r[0]][0])}" data-chapter="${r[1]}" data-verse="${r[2]}" data-gvt="${esc(D.books[r[0]][1])}">${esc(D.books[r[0]][0])} ${r[1]}:${r[2]}</a>`;
  const concordance=`<div class="fmRL">${list.slice(0,limit).map(({r,forms})=>`<p data-pesh-book="${r[0]}">${link(r,forms)} · <bdi lang="syr" dir="rtl">${esc([...forms].join(' · '))}</bdi></p>`).join('')}</div>${list.length>limit?`<button type="button" data-pesh-more>${esc(t('Weitere Belege'))}</button>`:''}`;
  const forms=`<table><thead><tr><th>${esc(t('Form'))}</th><th>${esc(t('Grammatik'))}</th><th>${esc(t('Belege'))}</th></tr></thead><tbody>${rows.map(f=>`<tr><td><bdi lang="syr" dir="rtl">${esc(f[0])}</bdi></td><td>${esc(fields.map((k,i)=>f[1][i]?label(k,f[1][i]):'').filter(Boolean).join(' · '))}</td><td>${f[2].reduce((n,r)=>n+r[3],0)}</td></tr>`).join('')}</tbody></table>`;
  return {label:x.label,head:`<span class="fmLem" lang="syr" dir="rtl">${esc(x.label)}</span><span class="fmGloss">${esc(x.gloss)}</span><span class="fmCnt">${esc(t('Aramäisch'))} · ${esc(t('Peschitta'))} · ${count.toLocaleString()} ${esc(t('Belege'))}</span>`,grammar,card:`<p class="muted">${esc(t('Peschitta: 39 alttestamentliche Bücher, belegte Analysen aus ETCBC. Fundstellen in Peschitta-Zählung.'))}</p><section class="wcSec"><h4>${esc(t('Verteilung'))} · ${esc(t('Peschitta'))}</h4>${Chart.render([...dist].map(([b,n])=>({name:D.books[b][0],key:String(b),n,corpus:'Peshitta'})),esc)}</section><section class="wcSec"><h4>${esc(t('Belege'))}</h4>${concordance}</section>`,forms,concordance};
 }
 return {suggest,render};
}
const api={create,norm};if(typeof module==='object'&&module.exports)module.exports=api;else global.PeshittaWordCards=api;
})(typeof window==='object'?window:globalThis);
