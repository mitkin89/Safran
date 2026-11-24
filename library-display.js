// Anzeigeeinstellungen für Lesetext und Vorschau, mit lokal gespeicherten Werten.
// Die aktuelle Bibliothek und das Neuzeichnen des Lesers werden übergeben.
window.LibraryDisplay = (() => {
  'use strict';
  function create({ $, $$, esc, shortVer, getView, getGroups, renderSection,
    olInlineOn, olInline, withAnchor, onBibleVersionsChanged=()=>{} }) {
    // ---------- Anzeigeoptionen ----------
    const DISP0 = { he: 1.3, gr: 1.15, en: 1, de: 1, niq: false, can: false, taam: 'off', shr: true, mar: 'normal', hideTabs: true, headStick: false, hov: 1.15 };
    let disp = { ...DISP0 };
    try { disp = { ...DISP0, ...JSON.parse(localStorage.getItem('disp') || '{}') }; } catch { /* egal */ }
    const taamMode=()=>['major','all'].includes(disp.taam)?disp.taam:'off';
    function mtHtml(html,book,verse){
      if(taamMode()==='off')return html;
      const tpl=document.createElement('template');tpl.innerHTML=html;
      const words=[...tpl.content.querySelectorAll('.w')];
      const texts=words.map(w=>{let tail='';for(let n=w.nextSibling;n&&!n.matches?.('.w');n=n.nextSibling)tail+=n.textContent||'';return w.textContent+tail;});
      const breaks=window.Taamim.boundaries(texts,book,taamMode(),(getView()?.sections?.[getView().idx]?.path?.[0]??-1)+1,+verse);
      words.forEach((w,i)=>{if(breaks[i])w.dataset.taamBreak=breaks[i];});
      return tpl.innerHTML;
    }
    function taamLayout(){
      const root=$('#rOut');root.querySelectorAll('.taam-break').forEach(e=>e.remove());
      if(taamMode()==='off')return;
      root.querySelectorAll('.cell[data-mt] .txt').forEach(txt=>{
        const words=[...txt.querySelectorAll('.w')],done=new Set();
        words.forEach((w,i)=>{
          if(!w.dataset.taamBreak||i===words.length-1)return;
          const unit=w.closest('.ilg')||w;if(done.has(unit)||unit.contains(words.at(-1)))return;done.add(unit);
          // Keep punctuation and qere belonging to the word before the new line.
          let after=unit;while(after.nextSibling&&!after.nextSibling.matches?.('.w,.ilg')&& !/[א-ת]/.test(after.nextSibling.textContent||''))after=after.nextSibling;
          const br=document.createElement('br');br.className='taam-break';after.after(br);
        });
      });
    }
    const stripHe = h => {
      if (disp.can) h = h.replace(/[\u0591-\u05AF\u05BD]/g, '');
      if (disp.niq) h = h.replace(/[\u05B0-\u05BC\u05BF\u05C1\u05C2\u05C7]/g, '');
      return h;
    };
    function applyDisp(rerender) {
      const o = $('#rOut').style;
      o.setProperty('--hef', disp.he); o.setProperty('--grf', disp.gr); o.setProperty('--enf', disp.en); o.setProperty('--def', disp.de);
      $('#dHe').value = disp.he; $('#dGr').value = disp.gr; $('#dEn').value = disp.en; $('#dDe').value = disp.de;
      for (const [id, v] of [['dHe', disp.he], ['dGr', disp.gr], ['dEn', disp.en], ['dDe', disp.de], ['dHov', disp.hov || 1.15]]) { const o = $('#' + id + 'V'); if (o) o.textContent = Math.round(v * 100) + ' %'; } // Wert neben dem Regler
      $('#dTaam').value=taamMode();
      $('#dNiq').checked = disp.niq; $('#dCan').checked = disp.can; $('#dShr').checked = !!disp.shr; $('#dOlIn').checked = olInlineOn();
      document.body.classList.toggle('dock-shrink', !!disp.shr);
      document.body.classList.toggle('head-stick', !!disp.headStick); if ($('#dHdSt')) $('#dHdSt').checked = !!disp.headStick;
      if ($('#dHideTabs')) $('#dHideTabs').checked = !!disp.hideTabs; if (!disp.hideTabs && typeof window.hdShow === 'function') window.hdShow();
      document.documentElement.style.setProperty('--hovf', disp.hov || 1.15); if ($('#dHov')) $('#dHov').value = disp.hov || 1.15; // Vorschau-Blase (Stellen)
      document.body.classList.toggle('mar-narrow', disp.mar === 'narrow'); if ($('#dMar')) $('#dMar').value = disp.mar === 'narrow' ? 'narrow' : 'normal';
      try { localStorage.setItem('disp', JSON.stringify(disp)); } catch { /* egal */ }
      if (rerender && getView() && getView().group) { // Position beim Umschalten behalten: dieselbe Zeile bleibt an derselben Stelle (ohne Vokale sind die Zeilen niedriger, die reine Pixelposition würde springen)
        const top = $('#stick') ? $('#stick').getBoundingClientRect().bottom : 0;
        const row = $$('#rOut .row[data-l]').find(r => r.getBoundingClientRect().bottom > top + 4);
        const label = row ? row.dataset.l : null, off = row ? row.getBoundingClientRect().top : 0, y = window.scrollY;
        renderSection();
        const again = label != null ? $$('#rOut .row[data-l]').find(r => r.dataset.l === label) : null;
        if (again) window.scrollTo(0, window.scrollY + again.getBoundingClientRect().top - off); else window.scrollTo(0, y);
      }
    }
    // Auswahl „Vorschau – deutsche Fassung“: alle deutschen Fassungen des Tanach in der Bibliothek, nach Zahl der Bücher; leer = Zunz (Standard), * = erste vorhandene
    function pvDeFill() {
      const n = { he: new Map(), en: new Map(), de: new Map(), other: new Map() };
      for (const g of getGroups()) { if (!/^Tanakh\//.test(g.key || '')) continue; for (const v of g.versions) { if (v.versionTitle === 'merged') continue; const m = n[v.kind] || n.other; m.set(v.versionTitle, (m.get(v.versionTitle) || 0) + 1); } }
      const sorted = (m, skip) => [...m].filter(([vt]) => !(skip && skip.test(vt))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const cut = t => (t.length > 46 ? t.slice(0, 45).trimEnd() + '…' : t); // das Auswahlfeld ist schmal; der volle Name steht im Tooltip
      const opt = ([vt, c]) => `<option class="ut" value="${esc(vt)}" title="${esc(shortVer(vt))}">${esc(cut(shortVer(vt)))} (${c})</option>`;
      const set = (sel, v, ok) => { sel.value = v && ok(v) ? v : ''; };
      const de = $('#dPvDe'), he = $('#dPvHe'), x = $('#dPvX');
      if (de) {
        de.innerHTML = `<option value="">${esc(I18N.t('Zunz (Standard)'))}</option><option value="*">${esc(I18N.t('erste vorhandene Fassung'))}</option>` + sorted(n.de, /Zunz/).map(opt).join('');
        set(de, disp.pvDe, v => v === '*' || n.de.has(v));
      }
      if (he) {
        he.innerHTML = `<option value="">${esc(I18N.t('Westminster (Standard)'))}</option>` + sorted(n.he, /^Westminster/).map(opt).join('');
        set(he, disp.pvHe, v => n.he.has(v));
      }
      if (x) {
        const KN = { en: 'Englisch', de: 'Deutsch', he: 'Hebräisch / Aramäisch', other: 'Andere (Griechisch, Aramäisch …)' };
        x.innerHTML = `<option value="">${esc(I18N.t('keine'))}</option>`
          + ['en', 'other', 'he', 'de'].map(k => n[k].size || k === 'en' ? `<optgroup label="${esc(I18N.t(KN[k]))}"><option value="@${k}">${esc(I18N.t('beste vorhandene'))}</option>${sorted(n[k]).map(opt).join('')}</optgroup>` : '').join('');
        set(x, disp.pvX, v => /^@(en|de|he|other)$/.test(v) || Object.values(n).some(m => m.has(v)));
      }
    }
    $('#dispBtn').onclick = () => { $('#dispPanel').hidden = !$('#dispPanel').hidden; if (!$('#dispPanel').hidden) pvDeFill(); };
    $('#dispPanel').addEventListener('input', e => {
      const id = e.target.id;
      if (id === 'dHe') disp.he = +e.target.value;
      if (id === 'dGr') disp.gr = +e.target.value;
      if (id === 'dEn') disp.en = +e.target.value;
      if (id === 'dDe') disp.de = +e.target.value;
      if (id === 'dNiq') disp.niq = e.target.checked;
      if (id === 'dCan') disp.can = e.target.checked;
      if (id === 'dTaam') disp.taam = e.target.value;
      if (id === 'dShr') disp.shr = e.target.checked;
      if (id === 'dMar') disp.mar = e.target.value;
      if (id === 'dHideTabs') disp.hideTabs = e.target.checked;
      if (id === 'dHdSt') disp.headStick = e.target.checked;
      if (id === 'dHov') disp.hov = +e.target.value;
      if (id === 'dPvDe' || id === 'dPvHe' || id === 'dPvX') { disp[{ dPvDe: 'pvDe', dPvHe: 'pvHe', dPvX: 'pvX' }[id]] = e.target.value; if (typeof window.pvClear === 'function') window.pvClear(); }
      if (id === 'dOlIn') { try { localStorage.setItem('olInline', e.target.checked ? '1' : '0'); } catch { /* egal */ } withAnchor(() => olInline()); return; }
      applyDisp(id === 'dNiq' || id === 'dCan' || id === 'dTaam');
      if (['dPvDe','dPvHe','dPvX'].includes(id)) onBibleVersionsChanged(id);
    });
    $('#dispClose').onclick = () => { $('#dispPanel').hidden = true; };
    // The secondary reader and other windows share the same Bible defaults.
    window.addEventListener('storage',e=>{
      if(e.key!=='disp'||!e.newValue)return;
      try{
        const next=JSON.parse(e.newValue),changed=['pvHe','pvDe','pvX'].filter(k=>(disp[k]||'')!==(next[k]||''));
        if(!changed.length)return;
        for(const k of changed)disp[k]=next[k]||'';
        if(typeof window.pvClear==='function')window.pvClear();
        pvDeFill();onBibleVersionsChanged(changed.includes('pvDe')?'dPvDe':'dPvHe');
      }catch{}
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#dispPanel').hidden && !document.querySelector('dialog[open]')) { $('#dispPanel').hidden = true; e.stopPropagation(); } }, true);
    { // Gruppe „Fenster & Leisten“: auf- oder zugeklappt merken
      const d = $('#dgWin'); try { d.open = localStorage.getItem('dgWin') === '1'; } catch { /* egal */ }
      d.addEventListener('toggle', () => { try { localStorage.setItem('dgWin', d.open ? '1' : '0'); } catch { /* egal */ } });
    }
    document.addEventListener('click', e => {
      if (!$('#dispPanel').hidden && !e.target.closest('#dispPanel') && !e.target.closest('#dispBtn')) $('#dispPanel').hidden = true;
    });
    return { state: disp, stripHe, mtHtml, taamLayout, apply: applyDisp };
  }
  return { create };
})();
