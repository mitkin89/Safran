// The editable lemma set is visible before every semantic search.
window.LibrarySemantic = (() => {
  'use strict';
  function create({$,esc,lsGet,lsSet,getGroups,run}) {
    const F=window.SemanticFields, t=(...args)=>I18N.t(...args);
    let choices=[], selected=null;
    const custom=()=>lsGet('semanticFields').map(F.cleanCustom).filter(Boolean).slice(0,100);
    const label=f=>I18N.lang==='en'?f.en:f.title;
    function members() {
      selected=choices[+$('#smField').value]||null;
      $('#smDelete').hidden=!selected?.custom;
      $('#smMembers').innerHTML=selected ? `<p>${esc(t(selected.custom?'Eigenes Bedeutungsfeld':'Redaktionelle Startauswahl'))}: <b>${esc(label(selected))}</b></p><p dir="auto">${selected.he.map(id=>`<bdi lang="he">${esc(F.heNames[id]?.[0]||id)}</bdi> <small>H${esc(id)}${F.heNames[id]?' · '+esc(I18N.lang==='en'?F.heNames[id][1]:F.heNames[id][2]):''}</small>`).join(' · ')}</p><p dir="auto">${selected.gr.map(l=>`<bdi lang="grc">${esc(l)}</bdi>`).join(' · ')}</p>` : `<p>${esc(t('Kein passendes Bedeutungsfeld. Suchwort kürzen oder ein eigenes Feld anlegen.'))}</p>`;
    }
    function refresh() {
      const previous=selected;
      choices=F.find($('#smQuery').value,custom());
      $('#smField').innerHTML=choices.map((f,i)=>`<option value="${i}">${esc(label(f))}${f.custom?' · '+esc(t('Eigenes Feld')):''}</option>`).join('');
      const ix=choices.findIndex(f=>f.id===previous?.id && f.title===previous?.title);
      $('#smField').value=String(ix<0?0:ix);members();
    }
    function books() {
      const before=$('#smBook').value;
      $('#smBook').innerHTML=`<option value="">${esc(t('Alle verfügbaren Bücher'))}</option>`+[...new Set(getGroups().map(g=>g.title))].map(title=>`<option>${esc(title)}</option>`).join('');
      if([...$('#smBook').options].some(o=>o.value===before))$('#smBook').value=before;
      refresh();
    }
    $('#smQuery').oninput=refresh;$('#smField').onchange=members;
    $('#smForm').onsubmit=e=>{e.preventDefault();run();};
    $('#smCopy').onclick=()=>{
      $('#smEdit').open=true;$('#smTitle').value=selected?label(selected):'';
      $('#smHebrew').value=selected?.he.join(', ')||'';$('#smGreek').value=selected?.gr.join(', ')||'';$('#smTitle').focus();
    };
    $('#smSave').onclick=()=>{
      const split=id=>$('#'+id).value.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
      const f=F.cleanCustom({title:$('#smTitle').value,he:split('smHebrew').map(s=>s.replace(/^H/i,'')),gr:split('smGreek')});
      $('#smError').hidden=!!f;
      if(!f){$('#smError').textContent=t('Titel und mindestens ein Lemma angeben. Strong-Kennungen durch Kommas trennen; Homonyme z. B. 7356 b.');return;}
      const all=custom().filter(old=>old.title!==f.title);lsSet('semanticFields',[...all,f].slice(-100));
      $('#smQuery').value='';selected=f;refresh();$('#smEdit').open=false;
    };
    $('#smDelete').onclick=()=>{if(!selected?.custom)return;lsSet('semanticFields',custom().filter(f=>f.title!==selected.title));selected=null;refresh();};
    books();
    return {
      books,
      request:()=>selected?(selected.custom?{custom:F.cleanCustom(selected)}:{fieldId:selected.id}):{},
      title:()=>selected?label(selected):'',
      book:()=>$('#smBook').value,
      kinds:()=>$('#smLanguage').value==='he'?['he','de']:$('#smLanguage').value==='gr'?['other']:['he','other','de'],
      setBusy:busy=>{$('#smGo').textContent=t(busy?'Abbrechen':'Suchen');},
    };
  }
  return {create};
})();
