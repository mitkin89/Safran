// The editable lemma set is visible before every semantic search.
window.LibrarySemantic = (() => {
  'use strict';
  function create({$,esc,lsGet,lsSet,getGroups,run}) {
    const F=window.SemanticFields, C=window.SemanticContext, t=(...args)=>I18N.t(...args);
    let choices=[], selected=null;
    const custom=()=>lsGet('semanticFields').map(F.cleanCustom).filter(Boolean).slice(0,100);
    const label=f=>I18N.lang==='en'?f.en:f.title;
    function members() {
      selected=choices[+$('#smField').value]||null;
      $('#smDelete').hidden=!selected?.custom;
      $('#smSenseControls').hidden=selected?.id!=='fear'||!!selected?.custom;
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
      evidence(r,i,shortVer){
        const semantic=r.semantic;if(!semantic)return '';
        const contextRows=semantic.matches.map((m,k)=>{
          const c=m.context;if(!c)return '';
          const provenance=c.basis==='local'?'Lokale Korrektur':c.basis==='editorial'?'Redaktionelle Startzuordnung':'Noch nicht zugeordnet';
          const note=I18N.lang==='en'&&c.en?c.en:c.note;
          return `<div class="smContext"><bdi>${esc(m.form)}</bdi> · <b>${esc(t(C.labels[c.sense]))}</b> · ${esc(t(provenance))}${c.stale?' · '+esc(t('Textstand geändert: frühere Korrektur nicht angewendet.')):''}${note?`<p>${esc(note)}</p>`:''}
            <details class="smSenseEditor" data-sm-i="${i}" data-sm-match="${k}"><summary>${esc(t('Zuordnung ändern'))}</summary>
            <label>${esc(t('Bedeutung im Kontext'))}<select data-sm-sense>${Object.entries(C.labels).map(([key,name])=>`<option value="${key}"${key===c.sense?' selected':''}>${esc(t(name))}</option>`).join('')}</select></label>
            <label>${esc(t('Begründung'))}<textarea data-sm-note maxlength="500" rows="3">${esc(note||'')}</textarea></label>
            <button type="button" data-sm-save>${esc(t('Korrektur lokal speichern'))}</button> <button type="button" data-sm-reset>${esc(t('Lokale Korrektur zurücksetzen'))}</button><p class="muted">${esc(t('Gilt nur für dieses Wort in diesem Vers und Textstand.'))}</p><p data-sm-error role="alert" hidden></p></details></div>`;
        }).join('');
        return `<div class="smReason">${esc(t('Bedeutungsfeld'))}: <b>${esc(I18N.lang==='en'?semantic.en:semantic.title)}</b> · ${esc(t('Gefunden über'))} ${semantic.matches.map(m=>`<bdi>${esc(m.lemma)}</bdi> <small>${esc(m.source)}${m.source==='OSHB'?' H'+esc(m.id):''}</small>`).join(' · ')}${semantic.translationSkipped?' · '+esc(t('Abweichende Übersetzung: Wortmarkierung ausgelassen.')):''}</div>${contextRows}${(r.parallels||[]).map((p,j)=>`<div class="sres smTranslation" data-i="${i}" data-cp="${j}"><small>${esc(shortVer(p.versionTitle))} · ${esc(t('Zugeordnete deutsche Wiedergabe'))}</small><div>${p.parts.map(x=>x.m?'<mark>'+esc(x.t)+'</mark>':esc(x.t)).join('')}</div></div>`).join('')}`;
      },
      correct(r,index,editor,reset){
        const m=r?.semantic?.matches[index];if(!m?.context)return false;
        const record={book:r.title,versionTitle:r.versionTitle,kind:r.kind,path:r.path,position:m.position,id:m.id,signature:r.semantic.signature,sense:editor.querySelector('[data-sm-sense]').value,note:editor.querySelector('[data-sm-note]').value};
        const error=editor.querySelector('[data-sm-error]');
        const cleaned=C.clean(record);
        if(!reset&&!cleaned){error.hidden=false;error.textContent=t('Bitte eine Bedeutung und eine Begründung mit mindestens drei Zeichen angeben.');return false;}
        const stored=C.corrections(lsGet('semanticCorrections')).filter(old=>C.key(old)!==C.key(record));
        if(!reset)stored.push(cleaned);
        if(stored.length>2000){error.hidden=false;error.textContent=t('Höchstens 2000 lokale Kontextzuordnungen möglich.');return false;}
        try{localStorage.setItem('semanticCorrections',JSON.stringify(stored));return true;}
        catch{error.hidden=false;error.textContent=t('Korrektur konnte nicht lokal gespeichert werden.');return false;}
      },
      request:()=>selected?C.request({... (selected.custom?{custom:F.cleanCustom(selected)}:{fieldId:selected.id}),sense:$('#smSense').value,corrections:lsGet('semanticCorrections')}):{},
      title:()=>selected?label(selected):'',
      book:()=>$('#smBook').value,
      kinds:()=>$('#smLanguage').value==='he'?['he','de']:$('#smLanguage').value==='gr'?['other']:['he','other','de'],
      setBusy:busy=>{$('#smGo').textContent=t(busy?'Abbrechen':'Suchen');},
    };
  }
  return {create};
})();
