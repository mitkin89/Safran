// Offline SEDRA word cards. Lexical spelling candidates are not passage analyses.
(function(global){
'use strict';
const norm=s=>String(s||'').normalize('NFC').replace(/[\u0300-\u036f\u0730-\u074a\u200c\u200d]/g,'').trim();
function create(D){
 const aliases=new Map(),families=new Map(),fields=D.wordFields;
 const words=id=>(D.words[id]||[]).map(row=>Object.fromEntries(fields.map((f,i)=>[f,row[i]])));
 const add=(q,id)=>{q=norm(q);if(q)(aliases.get(q)||aliases.set(q,new Set()).get(q)).add(String(id));};
 for(const [id,l] of Object.entries(D.lexemes)){add(l.form,id);add(l.vocal,id);for(const w of words(id)){add(w.syriac,id);add(w.syriac_vocalized_west,id);add(w.syriac_vocalized_east,id);}if(l.root!=null)(families.get(String(l.root))||families.set(String(l.root),[]).get(String(l.root))).push(id);}
 function lookup(q){return [...(aliases.get(norm(q))||[])];}
 const family=id=>{const root=D.lexemes[id]?.root;return root==null?[]:[...(families.get(String(root))||[])];};
 // Cross-source lookup preference from an attested form and complete shared grammar.
 // This is not a lexical-ID crosswalk; uncertain or multiply matching records stay unselected.
 function matchAnalysis(query,p){
  if(!p||norm(p.form)!==norm(query))return null;
  const ids=lookup(query);if(ids.length===1)return ids[0];
  const categories={verb:['verb','denominative'],subs:['noun'],adjv:['adjective']}[p.sp];
  if(!categories)return null;
  const gender={m:'masculine',f:'feminine',c:'common'}[p.gn],number={sg:'singular',pl:'plural'}[p.nu];
  if(!gender||!number)return null;
  const checks=[['gender_id','genders',gender],['number_id','numbers',number]];
  if(p.sp==='verb'){
   const stem={pe:'pʿal',pa:'paʿʿel',af:'aphʿel'}[p.vs];
   const tense={pf:'perfect',ipf:'imperfect',imp:'imperative',inf:'infinitive',ptc:p.vo==='act'?'active participle':p.vo==='pas'?'passive participle':null}[p.vt];
   const person={first:'first',second:'second',third:'third'}[p.ps];
   if(!stem||!tense||!person)return null;
   checks.push(['kaylo_id','kaylos',stem],['tense_id','tenses',tense],['person_id','persons',person]);
  }else if(p.st){
   const state={abs:'absolute',cst:'construct',c:'construct',emph:'emphatic',em:'emphatic',st:'emphatic'}[p.st];
   if(!state)return null;checks.push(['state_id','states',state]);
  }
  const matched=ids.filter(id=>categories.includes(D.lexemes[id].category)&&words(id).some(w=>norm(w.syriac)===norm(query)&&checks.every(([field,table,value])=>D.tables[table]?.[w[field]]?.name===value)));
  return matched.length===1?matched[0]:null;
 }
 function morphology(w){return [['stem_id','stems'],['kaylo_id','kaylos'],['tense_id','tenses'],['person_id','persons'],['gender_id','genders'],['number_id','numbers'],['state_id','states']].map(([f,t])=>D.tables[t]?.[w[f]]?.name).filter(Boolean);}
 function groups(id){const out=new Map();for(const w of words(id)){const labels=morphology(w);if(w.suffix_type)labels.push(w.suffix_type);for(const [f,t]of [['suffix_person_id','persons'],['suffix_gender_id','genders'],['suffix_number_id','numbers']]){const label=D.tables[t]?.[w[f]]?.name;if(label)labels.push('suffix: '+label);}const key=labels.join(' · ');(out.get(key)||out.set(key,[]).get(key)).push(w);}return [...out].sort(([a],[b])=>a.localeCompare(b));}
 function render(id,query,esc,t=s=>s){
  const term=x=>t(({adjective:'Adjektiv',noun:'Nomen',verb:'Verb',adverb:'Adverb',pronoun:'Pronomen',preposition:'Präposition',conjunction:'Konjunktion',first:'1. Person',second:'2. Person',third:'3. Person',masculine:'m.',feminine:'f.',common:'gemeinsam',singular:'Sg.',plural:'Pl.',emphatic:'Status emphaticus',construct:'Status constructus',absolute:'Status absolutus','active participle':'Partizip aktiv','passive participle':'Partizip passiv',perfect:'Perfekt',imperfect:'Imperfekt',infinitive:'Infinitiv',imperative:'Imperativ',participle:'Partizip',Strong:'stark',Weak:'schwach'})[x]||x);
  const l=D.lexemes[id],syr=s=>`<bdi lang="syr" dir="rtl">${esc(s||'')}</bdi>`;
  const credit=(source,ref)=>{const s=D.tables.sources[source];return `<cite title="${esc(s?.full_name||'')}">${esc(s?.abbreviation||s?.full_name||'SEDRA')}${ref?' · '+esc(ref):''}</cite>`;};
  const label=i=>{const l=D.lexemes[i];return `${syr(l.vocal||l.form)} <span>${esc(l.meanings[0]?.[0]||'')}</span><small>${esc([l.category,l.stem].filter(Boolean).map(term).join(' · '))} · SEDRA #${esc(i)}</small>`;};
  const choices=lookup(query),picker=choices.length>1?`<section class="sc-candidates"><h4>${esc(t('Mehrere Wörterbucheinträge für diese Schreibung'))}</h4><p class="muted">${esc(t('Bitte einen Eintrag wählen. Die Schreibung allein bestimmt die Bedeutung nicht.'))}</p>${choices.map(i=>`<button type="button" data-sid="${esc(i)}" class="${String(i)===String(id)?'on':''}" aria-pressed="${String(i)===String(id)}">${label(i)}</button>`).join('')}</section>`:'';
  if(!l)return {head:syr(query),card:picker||`<p class="muted">${esc(t('Kein genauer SEDRA-Treffer für diese Schreibung.'))}</p>`,forms:`<p class="muted">${esc(t('Bitte zuerst einen Wörterbucheintrag wählen.'))}</p>`};
  const root=l.root==null?null:D.roots[l.root],members=family(id),W=words(id),meaning=m=>`<li><span>${esc(m[0])}</span> <small>${esc(m[1])}</small> ${credit(m[2],m[3])}</li>`;
  const schemes={sedra3:'SEDRA III',sedra4:'SEDRA IV',calcode:'CAL',leiden:'Leiden',hugoye:'Hugoye'};
  const transcripts=Object.entries(l.transliterations||{}).sort(([a],[b])=>(a==='sedra4'?-1:b==='sedra4'?1:0));
  const translit=transcripts.length?`<section class="sc-transliterations"><h4>${esc(t('Lateinische Umschrift'))}</h4><dl>${transcripts.map(([code,text])=>`<div><dt>${esc(schemes[code]||code)}</dt><dd dir="ltr">${esc(text)}</dd></div>`).join('')}</dl></section>`:'';
  const origins=`<section class="sc-etymologies"><h4>${esc(t('Wortherkunft'))}</h4>${l.etymologies?.length?`<ul>${l.etymologies.map(e=>{const word=e.bracket==='parenthesized'?'('+e.word+')':e.bracket==='bracketed'?'['+e.word+']':e.word;return `<li data-etymology-id="${e.id}"><small>${esc(e.language||t('Sprache nicht erfasst'))}</small> <bdi lang="${esc(e.lang||'und')}" dir="${e.rtl?'rtl':'ltr'}">${esc(word)}</bdi>${e.meaning?' — '+esc(e.meaning):''}${e.notes?' · '+esc(e.notes):''} <cite>SEDRA · ${esc(t('Herkunftsangabe'))} #${e.id}</cite></li>`;}).join('')}</ul>`:`<p class="muted">${esc(t('Keine Herkunftsangabe in SEDRA erfasst.'))}</p>`}</section>`;
  const card=`<article class="sc-card" data-sedra-id="${esc(id)}">${picker}<section><h4>${esc(t('Bedeutungen'))}</h4>${l.meanings.length?`<ul>${l.meanings.slice(0,5).map(meaning).join('')}</ul>${l.meanings.length>5?`<details><summary>${esc(t('Weitere Bedeutungen'))} (${l.meanings.length-5})</summary><ul>${l.meanings.slice(5).map(meaning).join('')}</ul></details>`:''}`:`<p class="muted">${esc(t('Keine Bedeutung erfasst.'))}</p>`}</section>${origins}${translit}<section class="sc-family"><h4>${esc(t('Wortfamilie'))}${root?' · '+syr(root.syriac):''}</h4>${root?`<p class="muted">${esc(t('Verwandtschaft nach der ausdrücklich erfassten SEDRA-Wurzel.'))} ${credit(root.source_id,root.source_reference)}</p><div class="sc-members">${members.map(i=>`<button type="button" data-family-id="${esc(i)}" class="${String(i)===String(id)?'on':''}">${label(i)}</button>`).join('')}</div>`:`<p class="muted">${esc(t('Keine ausdrückliche Wurzelzuordnung erfasst.'))}</p>`}</section><p class="muted sc-credit">${credit(l.source,l.reference)} · SEDRA #${esc(id)} · Beth Mardutho · CC BY-NC 4.0 · ${esc(D.release)}</p></article>`;
  const forms=`<section class="sc-forms" data-sedra-id="${esc(id)}"><p class="muted">${esc(t('In SEDRA erfasste Wortformen; keine Häufigkeiten im Lesetext und keine erzeugten Paradigmen.'))}</p>${W.length?groups(id).map(([name,rows])=>`<section><h4>${esc(name?name.split(' · ').map(term).join(' · '):t('Grammatische Angaben nicht erfasst'))} <small>(${rows.length})</small></h4><div class="sc-table"><table><thead><tr><th>${esc(t('Konsonanten'))}</th><th>${esc(t('Westliche Vokalisierung'))}</th><th>${esc(t('Östliche Vokalisierung'))}</th><th>${esc(t('Quelle'))}</th></tr></thead><tbody>${rows.map(w=>`<tr data-sedra-word="${w.id}"><td>${syr(w.syriac)}${w.transliteration_east||w.transliteration_west?`<small class="sc-form-translit" dir="ltr">${esc(w.transliteration_east||w.transliteration_west)} · ${esc(t(w.transliteration_east?'Ost':'West'))}</small>`:''}</td><td>${w.syriac_vocalized_west?syr(w.syriac_vocalized_west):'—'}</td><td>${w.syriac_vocalized_east?syr(w.syriac_vocalized_east):'—'}</td><td>${credit(w.source_id,w.source_reference)} <small>#${w.id}</small></td></tr>`).join('')}</tbody></table></div></section>`).join(''):`<p class="muted">${esc(t('Zu diesem Wort sind keine Formen verzeichnet.'))}</p>`}</section>`;
  return {head:`${syr(l.vocal||l.form)}<span class="fmGloss">${esc(l.meanings[0]?.[0]||'')}</span><small>${esc([l.category,l.stem].filter(Boolean).map(term).join(' · '))} · SEDRA #${esc(id)} · ${W.length} ${esc(t('Wortformen'))}</small>`,card,forms};
 }
 return {lookup,matchAnalysis,family,words,groups,render};
}
const api={create,norm};if(typeof module==='object'&&module.exports)module.exports=api;else global.SyriacCards=api;
})(typeof window==='object'?window:globalThis);
