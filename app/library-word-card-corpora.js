window.LibraryWordCardCorpora={create({$,esc,load,gm,forms,morph,jump,changed}){
 let pending,state=null;
 const panel=document.createElement('div');panel.id='fmCorpusControls';panel.hidden=true;$('#fmTabs').before(panel);
 const body=document.createElement('div');body.id='fmCorpusBody';body.hidden=true;$('#fmTabs').after(body);
 const t=s=>I18N.t(s),names={all:'Alle',Tanach:'Tanach',Mishnah:'Mischna',LXX:'Septuaginta',Josephus:'Josephus',Philo:'Philo'};
 const dimensions={pos:'Wortart',stem:'Binyan',tense:'Form',mood:'Modus',voice:'Genus verbi',person:'Person',gender:'Genus',number:'Numerus',case:'Kasus',state:'Status',degree:'Steigerung'};
 const labels={pres:'Präsens',imperf:'Imperfekt',fut:'Futur',aor:'Aorist',perf:'Perfekt',plup:'Plusquamperfekt',futperf:'Futur II',ind:'Indikativ',subj:'Konjunktiv',opt:'Optativ',imperat:'Imperativ',inf:'Infinitiv',ptc:'Partizip',act:'Aktiv',mid:'Medium',pass:'Passiv','mid/pass':'Medium/Passiv',sg:'Sg.',pl:'Pl.',dual:'Du.',masc:'m.',fem:'f.',neut:'n.',nom:'Nominativ',gen:'Genitiv',dat:'Dativ',acc:'Akkusativ',voc:'Vokativ'};
 const label=(k,v)=>t(k==='pos'?(gm().POS[v]||v):(labels[v]||v));
 function model(){return pending||(pending=Promise.all([load('word-card-corpora.js',()=>window.WordCardCorpora),load('word-card-corpora-data.js',()=>window.WORD_CARD_CORPORA)]).then(([api,D])=>api.create(D,{GM:gm(),Forms:forms(),Morph:morph()})).catch(e=>{pending=null;throw e;}));}
 function reset(){state=null;panel.hidden=true;body.hidden=true;$('#formsPanel').classList.remove('corpus-filtered');}
 async function attach(ctx,current){reset();const marker=state={ctx,loading:true};try{const api=await model();if(state!==marker||!current())return;
  const base=api.base(ctx),extra=[...new Set((ctx.heads||[ctx.head]).map(h=>ctx.greek?h:window.WordCardCorpora.fold(h)))].flatMap(h=>api.extra(h,ctx.greek));Object.assign(marker,{api,rows:[...base,...extra],scope:ctx.only?'all':ctx.greek?'LXX':'Tanach',filters:{...(ctx.restore?.filters||{})},limit:100,loading:false});if(ctx.restore?.scope)marker.scope=ctx.restore.scope;panel.hidden=false;render();
 }catch{if(state===marker){panel.hidden=false;panel.textContent=t('Korpusdaten konnten nicht geladen werden.');}}}
 const enabled=()=>state&&!state.loading&&(state.ctx.only||state.scope!==(state.ctx.greek?'LXX':'Tanach')||Object.keys(state.filters).length);
 function render(){const S=state;if(!S||S.loading)return;const {api,rows,scope,filters}=S,scopes=S.ctx.greek?['all','LXX','Josephus','Philo']:['all','Tanach','Mishnah'];
  const coverageNote=!S.ctx.greek&&(scope==='all'||scope==='Mishnah')?'<p class="muted">'+esc(t('Mischna: erfasste Traktate in Seder Seraim; Analyse-Kandidaten, keine gesicherte Gleichsetzung mit Tanach-Lemmata.'))+'</p>':'';
  const facets=api.facets(rows,scope,filters),selected=api.filter(rows,scope,filters),n=api.count(selected);
  panel.innerHTML=`<div class="wcCorpusScopes">${scopes.map(k=>`<button type="button" data-corpus="${k}" aria-pressed="${scope===k}">${esc(t(names[k]))} <small>${api.count(api.filter(rows,k,{})).toLocaleString(I18N.loc)}</small></button>`).join('')}</div>${coverageNote}<div class="wcCorpusGrammar">${Object.entries(facets).map(([k,vs])=>`<div class="wcPeshFilter"><span>${esc(t(S.ctx.greek&&k==='tense'?'Tempus':dimensions[k]||k))}</span>${vs.map(([v,c])=>`<button type="button" data-dim="${k}" data-val="${esc(v)}" aria-pressed="${filters[k]===v}">${esc(label(k,v))} <small>${c.toLocaleString(I18N.loc)}</small></button>`).join('')}</div>`).join('')}${Object.keys(filters).length?`<button type="button" data-reset>${esc(t('Filter zurücksetzen'))}</button>`:''}</div>`;
  const on=!!enabled();$('#formsPanel').classList.toggle('corpus-filtered',on);body.hidden=!on;
  if(!on)return;
  const hits=api.unique(selected),dist=new Map(),fm=new Map();for(const h of hits){const k=h.title+' · '+t(names[h.corpus]);dist.set(k,(dist.get(k)||0)+h.n);}for(const r of selected){if(!fm.has(r.form))fm.set(r.form,[]);fm.get(r.form).push(r);}
  const tab=$('#fmTabs [aria-selected=true]')?.dataset.t||'card',formsList=[...fm].sort((a,b)=>api.count(b[1])-api.count(a[1]));
  const summary=`<p><b>${n.toLocaleString(I18N.loc)} ${esc(t('Belege'))}</b> · ${fm.size.toLocaleString(I18N.loc)} ${esc(t('Wortformen'))}</p>`;
  const note=`<p class="muted">${esc(t(S.ctx.greek?'Josephus/Philo: automatische Analysen mit vorhandenen manuellen Korrekturen.':'Mischna: erfasste Traktate in Seder Seraim; Analyse-Kandidaten, keine gesicherte Gleichsetzung mit Tanach-Lemmata.'))}${!S.ctx.greek?' '+api.coverage.mishnah.map(esc).join(', '):''}</p>`;
  const refs=()=>`<div class="fmRL">${hits.slice(0,S.limit).map((h,i)=>`<p><a href="#" data-hit="${i}">${esc(h.title)} ${esc([...h.path.map(n=>n+1),h.label].join(':'))}</a> · ${esc(t(names[h.corpus]))}${h.n>1?' ×'+h.n:''}</p>`).join('')}</div>${hits.length>S.limit?`<button type="button" data-more>${esc(t('Weitere Belege'))}</button>`:''}`;
  const max=Math.max(1,...dist.values());
  body.innerHTML=summary+(tab==='forms'?`<table class="fmT"><tbody>${formsList.map(([f,rs])=>`<tr><td><bdi>${esc(f)}</bdi></td><td>${api.count(rs)}</td><td>${esc([...new Set(rs.flatMap(r=>Object.entries(r.features).flatMap(([k,vs])=>vs.map(v=>label(k,v)))))].join(' · '))}</td></tr>`).join('')}</tbody></table>`:tab==='concordance'?refs():`<section class="wcSec"><h4>${esc(t('Verteilung'))}</h4>${[...dist].map(([name,c])=>`<div class="wcCorpusBar"><span>${esc(name)}</span><progress max="${max}" value="${c}"></progress><b>${c.toLocaleString(I18N.loc)}</b></div>`).join('')}</section><section class="wcSec"><h4>${esc(t('Häufigste Formen'))}</h4>${formsList.slice(0,12).map(([f,rs])=>`<span class="wcPeshBook"><bdi>${esc(f)}</bdi> ${api.count(rs)}</span>`).join('')}</section>`)+note;
  S.hits=hits;
 }
 panel.onclick=e=>{const s=e.target.closest('[data-corpus]'),f=e.target.closest('[data-dim]');if(!state||state.loading)return;if(s){state.scope=s.dataset.corpus;state.filters={};}else if(f){const k=f.dataset.dim,v=f.dataset.val;if(state.filters[k]===v)delete state.filters[k];else state.filters[k]=v;}else if(e.target.closest('[data-reset]'))state.filters={};else return;state.limit=100;render();changed();};
 body.onclick=e=>{const a=e.target.closest('[data-hit]');if(a){e.preventDefault();jump(state.hits[+a.dataset.hit],e);}if(e.target.closest('[data-more]')){state.limit+=100;render();}};
 return {model,attach,reset,render,enabled,snapshot:()=>state&&!state.loading?{scope:state.scope,filters:{...state.filters}}:null,restore:s=>{if(state&&!state.loading&&s){state.scope=s.scope;state.filters={...s.filters};render();}}};
}};
