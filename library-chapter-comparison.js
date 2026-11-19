window.LibraryChapterComparison=(()=>{
'use strict';
function create({root,books,load,index,esc}){
  const states=new Map(),contexts=new WeakMap();
  const t=(s,...a)=>esc(I18N.t(s,...a)),n=value=>value.toLocaleString(I18N.loc,{maximumFractionDigits:1});
  const modes=[['shared','Gemeinsame Wörter'],['differences','Unterschiedliche Häufigkeit'],['onlyA','Nur in A'],['onlyB','Nur in B'],['roots','Wortfamilien'],['stems','Verbstämme'],['forms','Verbformen']];
  const title=p=>p.book+' '+p.chapter;
  function render(ctx){
    const {box,s}=ctx,x=s.result;if(!x)return;
    const rows=x[s.mode],scale=Math.max(1,...rows.flatMap(r=>[r.rateA,r.rateB]));
    box.querySelector('.ccResult').innerHTML=`<div class="ccSummary"><span><b>A · ${esc(title(s.a))}</b><br>${t('{} Wörter · {} Verse',x.a.words,x.a.verses)}</span><span><b>B · ${esc(title(s.b))}</b><br>${t('{} Wörter · {} Verse',x.b.words,x.b.verses)}</span></div>
      <div class="ccModes">${modes.map(([key,label])=>`<button type="button" data-cc-mode="${key}" aria-pressed="${s.mode===key}" class="${s.mode===key?'on':''}">${t(label)} <small>${x[key].length}</small></button>`).join('')}</div>
      <p class="muted">${t('Balken je 1.000 Wörter, mit gleicher Skala für beide Kapitel und alle Zeilen. A: blau. B: gold.')}</p>
      ${!rows.length?`<p>${t('Keine Einträge für diese Auswahl.')}</p>`:rows.slice(0,s.limit).map(r=>{
        const lem=r.w&&window.OSHB_LEMMAS?.[r.w.lemma],label=lem?.[0]||r.root||r.stem||'',gloss=lem?(I18N.lang==='de'&&lem[2]?lem[2]:lem[1]):'';
        const head=r.w?`<button type="button" class="apW" data-lemma="${esc(r.w.lemma)}" data-word="${esc(r.w.raw)}" data-l="${esc(r.w.l)}" data-m="${esc(r.w.m)}"><span class="f" lang="he" dir="rtl">${esc(label)}</span></button> ${esc(gloss)}`:s.mode==='roots'?`<bdi class="ccRoot" lang="he" dir="rtl">${esc(label)}</bdi>`:`<b>${esc(r.stem||'')}</b> ${t(r.tense||'')} ${esc(I18N.lang==='de'?r.info||'':String(r.info||'').replace(/Pers\./g,'pers.').replace(/Sg\./g,'sg.').replace(/Pl\./g,'pl.').replace(/Du\./g,'du.'))}`;
        return `<details class="ccRow" data-cc-key="${esc(r.key)}"${s.open.has(s.mode+'|'+r.key)?' open':''}><summary><span class="ccWord">${head}</span><span class="ccBars" role="img" aria-label="${t('A: {} Belege, {} je 1.000. B: {} Belege, {} je 1.000.',r.nA,n(r.rateA),r.nB,n(r.rateB))}">${[['A',r.nA,r.rateA],['B',r.nB,r.rateB]].map(([side,count,rate])=>`<span class="ccBar ${side}"><b>${side}</b><i><em style="width:${100*rate/scale}%"></em></i><small>${count}× · ${n(rate)} ‰</small></span>`).join('')}</span></summary><div class="ccRefs">${[['A',s.a,r.refsA],['B',s.b,r.refsB]].map(([side,p,refs])=>`<p><b>${side} · ${esc(title(p))}:</b> ${refs.length?refs.map(v=>`<a data-ref="${esc(title(p)+':'+v)}">${t('Vers {}',v)}</a>`).join(' · '):'—'}</p>`).join('')}</div></details>`;
      }).join('')}${rows.length>s.limit?`<button type="button" class="ccMore">${t('+ {} weitere',rows.length-s.limit)}</button>`:''}
      <p class="muted">${t('Gezählt nach OSHB-Lexikoneinträgen. Wortlisten ohne Funktionswörter; Namen bleiben enthalten. Häufigkeiten beziehen sich auf alle erkannten Wörter des Kapitels. Unterschiede belegen für sich keine literarische Verbindung.')}</p>`;
  }
  function readChoices(ctx){for(const side of ['a','b'])ctx.s[side]={book:ctx.box.querySelector('[data-cc-book='+side+']').value,chapter:Number(ctx.box.querySelector('[data-cc-chapter='+side+']').value)};}
  async function run(ctx,initial=false,restore=false){
    const token=++ctx.token,{box,s}=ctx;readChoices(ctx);box.querySelector('.ccResult').textContent=I18N.t('Lädt …');
    try{
      const [a,b,idx]=await Promise.all([load(s.a.book),load(s.b.book),index()]);
      if(!box.isConnected||ctx.token!==token)return;
      if(initial&&s.a.book===s.b.book){s.b.chapter=s.a.chapter<a.text.length?s.a.chapter+1:Math.max(1,s.a.chapter-1);box.querySelector('[data-cc-chapter=b]').value=s.b.chapter;}
      for(const [side,doc]of [['a',a],['b',b]]){
        const input=box.querySelector('[data-cc-chapter='+side+']');input.max=doc.text.length;
        if(!Number.isInteger(s[side].chapter)||s[side].chapter<1||s[side].chapter>doc.text.length)throw Error('chapter');
      }
      const rows=(doc,ch)=>doc.text[ch-1].map((html,i)=>({label:String(i+1),html}));
      const ar=rows(a,s.a.chapter),br=rows(b,s.b.chapter);
      if(!ar.length||!br.length)throw Error('empty');
      s.result=window.ChapterComparison.compare(ar,br,idx);render(ctx);
      if(restore&&s.scroll!=null)requestAnimationFrame(()=>{if(box.isConnected)box.closest('#allPanel').scrollTop=s.scroll;});
    }catch{if(box.isConnected&&ctx.token===token)box.querySelector('.ccResult').textContent=I18N.t('Kapitel konnte nicht geladen werden. Prüfe Buch, Kapitelnummer und die installierte MT-Fassung.');}
  }
  function mount(box,defaults){
    if(contexts.has(box))return;
    const key=title(defaults)+'|'+defaults.scope;let s=states.get(key),initial=!s;
    if(!s){s={a:{...defaults},b:{...defaults},mode:'shared',limit:20,open:new Set()};states.set(key,s);if(states.size>20)states.delete(states.keys().next().value);}
    const available=books(),options=selected=>available.map(book=>`<option value="${esc(book)}"${book===selected?' selected':''}>${esc(book)}</option>`).join('');
    box.innerHTML=`<p class="muted">${t('Zwei vollständige Kapitel vergleichen – auch wenn im Überblick gerade ein Einzelvers ausgewählt ist.')}</p><div class="ccChoices">${['a','b'].map(side=>`<fieldset><legend>${side.toUpperCase()}</legend><label>${t('Buch')} <select data-cc-book="${side}">${options(s[side].book)}</select></label><label>${t('Kapitel')} <input type="number" min="1" step="1" value="${s[side].chapter}" data-cc-chapter="${side}"></label></fieldset>`).join('')}</div><div class="ccActions"><button type="button" class="ccRun">${t('Vergleichen')}</button><button type="button" class="ccSwap">⇄ ${t('A und B tauschen')}</button></div><div class="ccResult" aria-live="polite"></div>`;
    const ctx={box,s,token:0};contexts.set(box,ctx);run(ctx,initial,!initial);
  }
  function context(target){const box=target.closest('.apChapterCompare');return box&&contexts.get(box);}
  root.addEventListener('click',e=>{
    const ctx=context(e.target);if(!ctx)return;const {s,box}=ctx;
    if(e.target.closest('.apW')){s.scroll=box.closest('#allPanel').scrollTop;return;}
    if(e.target.closest('.ccRun')){s.limit=20;s.open.clear();run(ctx);return;}
    if(e.target.closest('.ccSwap')){readChoices(ctx);[s.a,s.b]=[s.b,s.a];for(const side of ['a','b']){box.querySelector('[data-cc-book='+side+']').value=s[side].book;box.querySelector('[data-cc-chapter='+side+']').value=s[side].chapter;}s.open.clear();run(ctx);return;}
    const mode=e.target.closest('[data-cc-mode]');if(mode){s.mode=mode.dataset.ccMode;s.limit=20;render(ctx);return;}
    if(e.target.closest('.ccMore')){s.limit+=20;render(ctx);}
  });
  root.addEventListener('change',e=>{const ctx=context(e.target);if(!ctx)return;if(e.target.matches('[data-cc-book]'))ctx.box.querySelector('[data-cc-chapter='+e.target.dataset.ccBook+']').removeAttribute('max');});
  root.addEventListener('toggle',e=>{if(!e.target.matches('.ccRow'))return;const ctx=context(e.target);if(!ctx)return;const k=ctx.s.mode+'|'+e.target.dataset.ccKey;if(e.target.open)ctx.s.open.add(k);else ctx.s.open.delete(k);},true);
  return {mount};
}
return {create};
})();
