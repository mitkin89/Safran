// Apparatus search: all classified readings of the LXX, the Peshitta and the Hexapla (Vorlage/Deutung) in the whole
// Tanakh, searchable in their notes (German or English), Vorlage and Greek, and filterable by witness, type and book.
// „Gemeinsam gegen den MT“: LXX and Peshitta both have a substantive reading at the same MT words.
window.LibraryTextCritSearch=(()=>{
'use strict';
const ORDER=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','I Samuel','II Samuel','I Kings','II Kings','Isaiah','Jeremiah','Ezekiel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Psalms','Proverbs','Job','Song of Songs','Ruth','Lamentations','Ecclesiastes','Esther','Daniel','Ezra','Nehemiah','I Chronicles','II Chronicles'];
const TYPES={lesart:'andere Lesart',deutung:'andere Deutung',zusatz:'Zusatz',auslassung:'Auslassung',harmonisierung:'Angleichung',technik:'Übersetzungstechnik',doublette:'Doppelübersetzung',umstellung:'Umstellung',zahl:'Zahl',name:'Name',syrfehler:'innersyrischer Fehler',grfehler:'innergriechischer Fehler',vorlage:'andere Vorlage',quellenhinweis:'Quellenvergleich (Field)'};
Object.assign(TYPES,{aleppo:'Aleppo / Leningradensis: alle Unterschiede',ma_k:'Aleppo: Konsonanten',ma_p:'Aleppo: Vollschreibung',ma_v:'Aleppo: Vokalisierung',ma_a:'Aleppo: Akzente',ma_w:'Aleppo: Wortbestand'});
const MA_EN={k:'Different consonants',p:'Plene/defective spelling: extra or missing ו or י',v:'Different vocalization',a:'Different accents',w:'Different word division or words'};
// substantive differences from the MT: everything except translation technique and inner-versional errors
const traditions=window.TextCritTraditions;
const NOT_SUBST=new Set(['technik','syrfehler','grfehler']);
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f\u0730-\u074a]/g,'').toLowerCase();
function create(host){
  const {$}=host,t=s=>window.I18N?.textCrit?.(String(s))??String(s),esc=s=>host.esc(t(s)),raw=s=>host.esc(String(s));
  let all=null,loading=null,shown=150;
  // every reading as {w:'LXX'|'Syr'|'Hex',book,ch,v,type,note,en,vorlage,g,he,sure}
  async function load(){
    if(all)return all;
    if(loading)return loading;
    loading=(async()=>{
      const out=[];
      const ix=await host.load('lxx-readings/index.js',()=>window.LXX_READINGS_INDEX);
      await Promise.all(Object.entries(ix||{}).map(async([code,info])=>{
        const d=await host.load('lxx-readings/'+code+'.js',()=>window.LXX_READINGS?.[code]).catch(()=>null);
        for(const [ref,v] of Object.entries(d?.verses||{})){if(!v||!v.r)continue;const [ch,vs]=ref.split(':').map(Number);
          for(const r of v.r)out.push({tags:traditions.tags('LXX',code,ref,r),w:'LXX',ed:code,book:info.book,ch,v:vs,type:r.type,note:r.note||'',en:r.en||'',vorlage:r.vorlage||'',g:r.g||'',he:r.he||[],sure:r.sure!==false});}
      }));
      const books=window.PeshittaAlignment?.READINGS||[];
      await Promise.all(books.map(async book=>{
        const d=await host.load('peshitta-readings/'+book.replace(/ /g,'_')+'.js',()=>window.PESHITTA_READINGS?.[book]).catch(()=>null);
        for(const [ref,rs] of Object.entries(d||{})){if(!Array.isArray(rs))continue;const [ch,vs]=ref.split(':').map(Number);
          for(const r of rs)out.push({tags:traditions.tags('Syr',book,ref,r),w:'Syr',book,ch,v:vs,type:r.type,note:r.note||'',en:r.en||'',vorlage:r.vorlage||'',g:'',he:r.he||[],sure:r.sure!==false,parallel:r.parallel||''});}
      }));
      const hx=await host.load('hexapla-vorlage.js',()=>window.HEXAPLA_VORLAGE).catch(()=>null);
      for(const [k,r] of Object.entries(hx||{})){const m=/^(.*) (\d+):(\d+)#\d+ (.*)$/.exec(k);if(!m)continue;
        out.push({tags:traditions.tags('Hex','',k,r),w:'Hex',book:m[1],ch:+m[2],v:+m[3],type:r.t,note:r.n||'',en:r.en||'',vorlage:r.he||'',g:'',he:[],sure:true,sig:m[4]});}
      // Only reviewed Field comparisons: a footnote's scope is not a reading of every cited version.
      await Promise.all(traditions.sourceBooks().map(async book=>{
        const data=await host.load('hexapla-data/'+book.replace(/ /g,'_')+'.js',()=>window.HEXAPLA_DATA?.[book]);
        for(const {ref,unit,tags} of traditions.sourceEntries(data)){
          const [ch,v]=ref.split(':').map(Number);
          out.push({tags,w:'Hex',book,ch,v,type:'quellenhinweis',note:tags.map(t=>t.de).join(' '),en:tags.map(t=>t.en).join(' '),g:'',he:[],sure:false,sourceComparison:true,sig:'Field',sourceText:unit.t});
        }
      }));
      // MAM is an edited Aleppo text; lost portions follow other Tiberian
      // manuscripts. Never present those as direct readings of the lost codex.
      const ma=window.LibraryAleppoTC;
      if(ma)await Promise.all(ma.BOOKS.map(async book=>{
        const data=await host.load('aleppo-diff/'+book.replace(/ /g,'_')+'.js',()=>window.ALEPPO_DIFF?.[book]);
        for(const [ref,rows] of Object.entries(data?.verses||{})){
          const [ch,v]=ref.split(':').map(Number),lost=ma.lost(book,ch,v);
          for(const [start,end,kind,mt,reading] of rows){
            const note=ma.KIND[kind][1]+'.'+(lost?' Hier ist der Aleppo-Kodex verloren; MAM folgt anderen tiberischen Handschriften.':''),en=MA_EN[kind]+'.'+(lost?' The Aleppo Codex is lost here; MAM follows other Tiberian manuscripts.':'');
            out.push({w:'MA',book,ch,v,type:'ma_'+kind,note,en,mt,ma:reading,g:'',vorlage:'',he:end<0?[]:Array.from({length:end-start+1},(_,i)=>start+i+1),sure:true,tags:[]});
          }
        }
      }));
      // LXX and Peshitta at the same MT words (or both without MT words, i.e. both pluses in the verse)
      const by=new Map();for(const r of out){if(!['LXX','Syr'].includes(r.w)||NOT_SUBST.has(r.type))continue;const k=r.book+' '+r.ch+':'+r.v;(by.get(k)||by.set(k,[]).get(k)).push(r);}
      for(const rs of by.values()){const l=rs.filter(r=>r.w==='LXX'),s=rs.filter(r=>r.w==='Syr');
        for(const a of l)for(const b of s){const ov=a.he.length&&b.he.length?a.he.some(x=>b.he.includes(x)):!a.he.length&&!b.he.length;if(ov){a.both=b.both=true;}}}
      out.sort((a,b)=>ORDER.indexOf(a.book)-ORDER.indexOf(b.book)||a.ch-b.ch||a.v-b.v||a.w.localeCompare(b.w));
      return all=out;
    })();
    try{return await loading;}finally{loading=null;}
  }
  const panel=()=>$('#tcSearch');
  function mount(){
    const box=panel();if(box.dataset.ready)return;box.dataset.ready='1';
    const books=ORDER.map(b=>'<option value="'+raw(b)+'">'+raw(b)+'</option>').join('');
    const types=Object.entries(TYPES).map(([k,l])=>'<option value="'+k+'">'+esc(l)+'</option>').join('');
    const groups=Object.entries(traditions.categories).map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join('');
    box.innerHTML='<div class="tcs-form"><input id="tcsQ" type="search" placeholder="'+raw(t('In Erläuterungen suchen, z. B. Targum, Midrasch, Etrog'))+'" aria-label="'+raw(t('Lesarten durchsuchen'))+'">'+
      '<div class="tcs-filters"><label><input type="checkbox" data-w="LXX" checked> Tov</label><label><input type="checkbox" data-w="Syr" checked> Syr</label><label><input type="checkbox" data-w="Hex" checked> Field</label><label><input type="checkbox" data-w="MA" checked> '+esc('Aleppo (MAM)')+'</label>'+
      '<select id="tcsType" aria-label="'+raw(t('Art der Lesart'))+'"><option value="">'+esc('Alle Arten')+'</option>'+types+'</select>'+
      '<select id="tcsTradition" aria-label="'+raw(t('Jüdische Auslegung'))+'" title="'+esc('Zeigt Lesarten mit redaktionell zugeordneten Auslegungstraditionen.')+'"><option value="">'+esc('Alle Lesarten')+'</option><optgroup label="'+esc('Jüdische Auslegung')+'"><option value="any">'+esc('Alle Gruppen')+'</option>'+groups+'</optgroup></select>'+
      '<select id="tcsBook" aria-label="'+raw(t('Buch'))+'"><option value="">'+esc('Ganzer Tanach')+'</option>'+books+'</select>'+
      '<label title="'+raw(t('LXX und Peschitta weichen an denselben MT-Wörtern ab (nicht nur Übersetzungstechnik)'))+'"><input id="tcsBoth" type="checkbox"> '+esc('LXX und Syr gemeinsam gegen den MT')+'</label>'+
      '<label><input id="tcsSure" type="checkbox"> '+esc('nur sichere')+'</label></div></div><div id="tcsOut" aria-live="polite"></div>';
    let timer=null;const go=()=>{clearTimeout(timer);timer=setTimeout(()=>{shown=150;run();},200);};
    box.addEventListener('input',go);box.addEventListener('change',go);
    box.addEventListener('click',async e=>{
      const more=e.target.closest('.tcs-more');if(more){shown+=300;run();return;}
      const hit=e.target.closest('[data-tcs-ref]');if(!hit)return;
      await host.goVerse(hit.dataset.tcsBook,+hit.dataset.tcsCh,+hit.dataset.tcsV,{w:hit.dataset.tcsW,type:hit.dataset.tcsType});
    });
  }
  function matches(r,q){
    if(!q.length)return true;
    const hay=fold([r.note,r.en,r.vorlage,r.g,r.mt||'',r.ma||'',r.parallel||'',r.sig||'',r.sourceText||'',...r.tags.flatMap(tag=>[tag.source,tag.de,tag.en])].join(' '));
    return q.every(w=>hay.includes(w));
  }
  async function run(){
    const box=panel(),out=$('#tcsOut');if(!box||box.hidden)return;
    out.innerHTML='<p class="muted">'+esc('Lesarten werden geladen …')+'</p>';
    let rs;try{rs=await load();}catch{out.innerHTML='<p class="muted">'+esc('Lesarten konnten nicht geladen werden.')+'</p>';return;}
    const q=fold($('#tcsQ').value).split(/\s+/).filter(Boolean),ws=new Set([...box.querySelectorAll('[data-w]:checked')].map(x=>x.dataset.w));
    const type=$('#tcsType').value,book=$('#tcsBook').value,both=$('#tcsBoth').checked,sure=$('#tcsSure').checked;
    const tradition=$('#tcsTradition').value;
    const hits=rs.filter(r=>ws.has(r.w)&&(!type||(type==='aleppo'?r.w==='MA':r.type===type))&&(!book||r.book===book)&&(!both||r.both)&&(!sure||r.sure)&&(!tradition||r.tags.some(tag=>tradition==='any'||tag.category===tradition))&&matches(r,q));
    const verses=new Set(hits.map(r=>r.book+' '+r.ch+':'+r.v)).size;
    const en=window.I18N?.lang==='en';
    const mark=s=>{let h=raw(s);for(const w of q){if(!/^[\p{L}\p{N}]+$/u.test(w))continue;h=h.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','giu'),'<mark>$1</mark>');}return h;};
    const row=r=>'<button type="button" class="tcs-hit" data-tcs-ref data-tcs-w="'+r.w+'" data-tcs-type="'+r.type+'" data-tcs-book="'+raw(r.book)+'" data-tcs-ch="'+r.ch+'" data-tcs-v="'+r.v+'">'+
      '<span class="tcs-ref">'+raw(r.book+' '+r.ch+':'+r.v)+'</span> <span class="tc-witness-label" data-witness="'+r.w+'">'+raw(r.w==='Hex'&&r.sig?'Field '+r.sig:r.w==='LXX'?'Tov':r.w==='MA'?t('Aleppo (MAM)'):r.w)+'</span> '+
      '<abbr class="ab tc-tov-tag">'+esc(TYPES[r.type]||r.type)+'</abbr>'+(r.both?' <span class="tcs-both" title="'+raw(t('LXX und Peschitta weichen an denselben MT-Wörtern ab (nicht nur Übersetzungstechnik)'))+'">LXX+Syr</span>':'')+
      (r.vorlage?' <bdi lang="he" dir="rtl">≈ '+raw(r.vorlage)+'</bdi>':'')+(r.g?' <span lang="grc">'+raw(r.g)+'</span>':'')+
      (r.w==='MA'?' <span>MA: <bdi lang="he" dir="rtl">'+raw(r.ma||t('fehlt'))+'</bdi> · ML: <bdi lang="he" dir="rtl">'+raw(r.mt||t('fehlt'))+'</bdi></span>':'')+
      traditions.badge(r.tags,raw)+'<span class="tcs-note">'+mark(traditions.note(en&&r.en?r.en:r.note,r.tags))+(r.sure||r.sourceComparison?'':' <span class="muted">('+esc('unsicher')+')</span>')+'</span></button>';
    out.innerHTML='<p class="tcs-count muted">'+raw(window.I18N?.t?window.I18N.t('{} Lesarten in {} Versen',hits.length,verses):hits.length+' Lesarten in '+verses+' Versen')+'</p>'+
      hits.slice(0,shown).map(row).join('')+(hits.length>shown?'<button type="button" class="tcs-more">'+esc('Weitere anzeigen')+'</button>':'');
  }
  function toggle(on){
    const box=panel(),open=on??box.hidden;mount();
    box.hidden=!open;$('#tcBody').hidden=open;$('#tcSearchBtn').classList.toggle('on',open);$('#tcSearchBtn').setAttribute('aria-pressed',String(open));
    host.onToggle?.();
    if(open){run();setTimeout(()=>$('#tcsQ').focus(),0);}else host.closed?.();
  }
  $('#tcSearchBtn').addEventListener('click',()=>toggle());
  return {toggle,load,get open(){return !panel().hidden;}};
}
return {create,TYPES};
})();
