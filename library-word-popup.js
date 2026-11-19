// Morphologie-Popups und Wortauswahl, je Lesefenster eine Instanz.
window.LibraryWordPopup = (() => {
  'use strict';
  function create({ $, $$, esc, O, reader, lazyScript, apChap, verseOf, loadIL,
    openDict, loadForms, openForms, openGForms, openTForms, gSearchAll, jumpTo }) {
  // OSHB-Texte: Klick auf ein Wort zeigt Lemma, Stamm, Zeit und Form; „Im Wörterbuch“ schlägt das Lemma nach
  let wpop = null;
  const closeWpop = () => { gTok++; if (wpop) { wpop.remove(); wpop = null; } $$('#rOut .syw.sel, #rOut .w.sel, #rOut .wt.sel, #rOut .wq.sel, #rOut .wg.sel, #bavliInterlinear .bil-heword.sel').forEach(x => x.classList.remove('sel')); gSel = null; try { CSS.highlights.delete('gsel'); } catch { /* ältere Engine */ } };
  // Septuaginta (CATSS): Klick auf eine griechische Wortgruppe zeigt die hebräischen Wörter, denen sie zugeordnet ist
  const GFLAG = { z: 'Zusatz der Septuaginta (kein hebräisches Gegenstück)', m: 'Minus der Septuaginta (hebräisches Wort ohne griechisches Gegenstück)', d: 'Doublette: ein hebräisches Wort ist doppelt übersetzt', i: 'Infinitivus absolutus im Hebräischen', t: 'Transliteriertes hebräisches Wort', v: 'Griechisches Präverb für eine hebräische Präposition', s: 'Komparativ/Superlativ (hebr. מ)', u: 'Gegenstück steht an anderer Stelle im Vers (Umstellung oder Verteilung)' };
  // x (optional, mit Morphologie): { rows: HTML der Wort-Bestimmungen, buttons: HTML, word, at: Element/Range zum Ausrichten, on: Klick-Behandlung }
  function showGreekUnit(w, x) {
    const hs = w ? (w.dataset.h || '').split(' ').filter(Boolean) : [], rs = w ? (w.dataset.r || '').split(' ').filter(Boolean) : [], fl = w ? (w.dataset.f || '').split('').filter(c => GFLAG[c]) : [];
    if (w) w.classList.add('sel');
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    const btns = a => `<div class="wgh">${a.map(h => `<button class="wdict" dir="rtl" lang="he" data-q="${esc(h)}" title="Im Wörterbuch nachschlagen">${esc(h)}</button>`).join(' ')}</div>`;
    let body = !w ? '' : hs.length ? `<div class="wseg${x ? '' : ' main'}">${fl.includes('m') ? 'Hebräisches Wort (CATSS)' : 'Hebräisches Gegenstück (CATSS)'}</div>${btns(hs)}`
      : (fl.includes('m') ? '' : `<div class="wseg${x ? '' : ' main'}">${w?.dataset.catssApparatus ? 'Kein direktes hebräisches Gegenstück in dieser CATSS-Quellzeile' : 'Kein hebräisches Gegenstück (Zusatz der Septuaginta)'}</div>`);
    if (rs.length) body += `<div class="wseg">Rückübersetzung (vermutliche hebräische Vorlage)</div>${btns(rs)}`;
    const notes = fl;
    if (notes.length) body += `<div class="wseg">Besonderheiten</div><ul class="gfl">${notes.map(c => `<li>${GFLAG[c]}</li>`).join('')}</ul>`;
    const word = x ? x.word : fl.includes('m') ? hs.join(' ') : w.textContent;
    wpop.innerHTML = `<div class="wtop"><span dir="${x?.dir||(!x && fl.includes('m') ? 'rtl' : 'ltr')}" lang="${x?.lang||(!x && fl.includes('m') ? 'he' : 'grc')}" class="wword${x || !fl.includes('m') ? ' wgr' : ''}">${esc(word)}</span><button class="wx" title="Schließen">✕</button></div>${x ? x.rows : ''}${body}${x ? x.buttons : ''}`;
    document.body.appendChild(wpop);
    const place = () => {
      if (!wpop) return;
      const r = (x && x.at ? x.at : w).getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
      const px = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
      let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
      wpop.style.left = px + 'px'; wpop.style.top = y + 'px';
    };
    place();
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) { closeWpop(); return; }
      if (x && x.on && x.on(ev)) return;
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
    };
    return place;
  }
  // ---------- Septuaginta: Bestimmung jedes griechischen Wortes (lxx-morph; Index lxx-morph.js, Auswertung gmorph.js) ----------
  let gmP = null, gSel = null, gTok = 0; // gSel: angeklicktes Wort { cell, i }
  // A popup belongs to its displayed passage, including when navigation does not scroll.
  if(typeof MutationObserver==='function')new MutationObserver(()=>{if(gSel&&!gSel.cell.isConnected)closeWpop();}).observe($('#rOut'),{childList:true});
  const loadGM = () => gmP || (gmP = lazyScript('lxx-morph.js', () => window.LXX_MORPH).catch(e => { gmP = null; throw e; }));
  // Kapitel und Vers einer griechischen Zelle (nur Texte mit Kapitel:Vers)
  function greekCtx(cell) {
    const row = cell.closest('.row'); if (!row || !cell.dataset.gt) return null;
    let path = null, label = row.dataset.l;
    try {
      if (row.classList.contains('sh')) { path = JSON.parse(row.dataset.sp); label = row.dataset.sl; }
      else { const h = row.closest('.pgb') && row.closest('.pgb').querySelector('.pgh[data-sk]'); path = h ? JSON.parse(h.dataset.sk) : reader.view && reader.view.sections && reader.view.sections[reader.view.idx] ? reader.view.sections[reader.view.idx].path : null; }
    } catch { path = null; }
    if (!Array.isArray(path) || path.length !== 1 || !Number.isInteger(path[0]) || !/^\d+$/.test(String(label || ''))) return null;
    let ch = path[0] + 1, v = +label;
    // umgestellte Fassung (andere Zählung): die Wort-Bestimmung hängt an der eigenen Stelle des Verses
    const dv = reader.view && reader.view.loaded ? reader.view.loaded.find(x => x.vsrc && x.entry.title === cell.dataset.gt && (x.entry.versionTitle || x.versionTitle || '') === cell.dataset.gv) : null;
    if (dv) { const sv = dv.vsrc[ch + ':' + v]; if (sv && sv.length > 1) return null; if (sv) { ch = sv[0][0]; v = sv[0][1]; } }
    return { title: cell.dataset.gt, vt: cell.dataset.gv, ch, v };
  }
  // Die griechischen Wörter einer Zelle, gezählt wie in gmorph.js (ohne <small>, Fußnoten), und das Wort unter dem Klick
  function greekWordAt(cell, e, w, all = false) {
    const txt = cell.querySelector('.txt') || cell, GM = window.GMorph;
    const nodes = []; let s = '';
    const tw = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) { if (n.parentElement.closest('small, sup, .note')) { s += ' '; continue; } nodes.push([n, s.length]); s += n.nodeValue; }
    const words = []; for (const m of s.matchAll(GM.WORD)) if (GM.GREEK.test(m[0])) words.push({ t: m[0], s: m.index, e: m.index + m[0].length });
    let at = -1;
    try { const r = e && document.caretRangeFromPoint(e.clientX, e.clientY); if (r && r.startContainer.nodeType === 3) { const f = nodes.find(q => q[0] === r.startContainer); if (f) at = f[1] + r.startOffset; } } catch { /* ohne Klickstelle: erstes Wort der Gruppe */ }
    let i = at < 0 ? -1 : words.findIndex(q => q.s <= at && at <= q.e), grp = null;
    if (w) {
      const inW = nodes.filter(q => w.contains(q[0])); if (!inW.length) return null;
      const a = inW[0][1], b = inW[inW.length - 1][1] + inW[inW.length - 1][0].nodeValue.length;
      grp = words.map((q, k) => (q.s >= a && q.e <= b ? k : -1)).filter(k => k >= 0);
      if (!grp.length) return null;
      if (!grp.includes(i)) { const p = window.Lxx ? window.Lxx.pick(w.textContent) : null; i = grp[p && p.i.length ? p.i[0] : 0] != null ? grp[p && p.i.length ? p.i[0] : 0] : grp[0]; } // Klick neben die Wörter: das Hauptwort der Gruppe (ohne Artikel, καί)
    }
    if (i < 0 && !all) return null;
    const range = k => { // Wort k als Bereich im Dokument (zum Hervorheben und Ausrichten)
      const find = pos => { let f = nodes[0]; for (const q of nodes) { if (q[1] <= pos) f = q; else break; } return f; };
      const a = find(words[k].s), b = find(Math.max(words[k].s, words[k].e - 1)), rg = document.createRange();
      rg.setStart(a[0], words[k].s - a[1]); rg.setEnd(b[0], words[k].e - b[1]); return rg;
    };
    return { i, words, grp, range };
  }
  function apparatusGreekAt(w,source) {
    const GM=window.GMorph,words=GM.words(source.text).map(t=>({t})),group=GM.words(source.group);
    const start=source.start;
    // Counts and exact surface must both agree: never borrow a repeated word's
    // analysis from another position or a different witness edition.
    if(!group.length||group.some((t,i)=>words[start+i]?.t!==t))return null;
    const grp=group.map((_,i)=>start+i);
    return {i:start,words,grp,range:()=>w};
  }
  function showSyriacWord(w){
    const was=w.classList.contains('sel');closeWpop();if(was)return;
    const cell=w.closest('.cell'),doc=reader.view?.loaded?.find(d=>d.entry.rel===(w.dataset.syRel||cell?.dataset.rel)),row=w.closest('.row');let path=reader.view?.sections?.[reader.view.idx]?.path;
    if(row?.classList.contains('sh'))try{path=JSON.parse(row.dataset.sp);}catch{}
    else{const h=row?.closest('.pgb')?.querySelector('.pgh[data-sk]');if(h)try{path=JSON.parse(h.dataset.sk);}catch{}}
    const sourceDoc=doc||(w.dataset.syRel&&reader.cache?.get(w.dataset.syRel));
    let label=row?.dataset.sl||row?.dataset.l;
    if(w.dataset.syRef&&/^[1-9]\d*:[1-9]\d*$/.test(w.dataset.syRef)){const [chapter,verse]=w.dataset.syRef.split(':').map(Number);path=[chapter-1];label=String(verse);}
    const r=window.SyriacMorph.at(sourceDoc,w.dataset.si,w.textContent,path,label),t=s=>I18N.t(s);
    const translit=`<div class="sy-translit"><small>${esc(t('Hebräische Umschrift (Konsonanten)'))}</small><bdi lang="he" dir="rtl">${esc(window.SyriacMorph.hebrew(w.textContent))}</bdi></div>`;
    const rows=r?.parts.length?r.parts.map(p=>{const d=window.SyriacMorph.describe(p,t),lem=window.SyriacMorph.lemma(p.lex);return `<div class="wseg main"><span class="wlem" lang="syr" dir="rtl">${esc(p.form)} → ${esc(lem)}</span><br><span class="sy-translit-parts" lang="he" dir="rtl">${esc(window.SyriacMorph.hebrew(p.form))} → ${esc(window.SyriacMorph.hebrew(lem))}</span><br><span class="sy-morph">${esc([d.pos,d.info].filter(Boolean).join(' · '))}</span><br><strong class="sy-gloss">${esc(p.gloss)}</strong><br><code class="sy-source">${esc(p.lex)} · ETCBC Syriac #${esc(p.sourceId)}</code></div>`;}).join(''):`<p class="muted">${esc(t('Für dieses Wort liegt keine sicher zugeordnete Morphologie vor.'))}</p>`;
    const source=`<p class="muted">${esc(t('Peschitta · eigene Verszählung'))}${r?` · ${r.chapter}:${r.verse} · Peshitta #${r.id}`:''}<br>${esc(t('Morphologie: ETCBC Syriac Corpus; Kurzglossen auf Englisch.'))}</p>`;
    const lemmas=[...new Set((r?.parts||[]).map(p=>window.SyriacMorph.lemma(p.lex)).filter(Boolean))];
    const buttons=lemmas.map(q=>`<button class="wdict" data-q="${esc(q)}">${esc(t('Im Wörterbuch nachschlagen'))}: <bdi lang="syr" dir="rtl">${esc(q)}</bdi></button>`).join('');
    // Use the attested surface of each morpheme, not an assumed identity
    // between ETCBC's lexeme codes and SEDRA's independent lexical entries.
    const queries=[...new Set((r?.parts?.length?r.parts.map(p=>p.form):[w.textContent]).filter(Boolean))];
    const sedra=`<section class="sy-sedra"><h4>${esc(t('SEDRA-Wörterbuch'))}</h4><p class="sy-sedra-note">${esc(t('Wörterbuchtreffer zur Schreibung, keine Bestimmung dieser Textstelle.'))}</p>${queries.map((q,i)=>`<details class="sy-sedra-part"${i===queries.length-1?' open':''}><summary><bdi lang="syr" dir="rtl">${esc(q)}</bdi></summary><div class="sy-sedra-results" data-query="${esc(q)}">${esc(t('Lädt …'))}</div></details>`).join('')}</section>`;
    w.classList.add('sel');gSel={cell,i:w.dataset.si};
    const place=showGreekUnit(null,{rows:translit+rows+source+sedra,buttons,word:w.textContent,at:w,lang:'syr',dir:'rtl',on:ev=>{
      const b=ev.target.closest('.sedra-open');if(!b)return false;
      openDict(b.dataset.q,{id:'7fab63c14df2',name:'SEDRA — Syriac Lexicon (Beth Mardutho)'});return true;
    }});
    wpop.classList.add('syriac-word');
    const pop=wpop,token=gTok;
    place();
    pop.addEventListener('toggle',()=>{if(wpop===pop)place();},true);
    for(const q of queries){
      const slot=[...pop.querySelectorAll('.sy-sedra-results')].find(el=>el.dataset.query===q);
      O.dictLookup(q,'7fab63c14df2',false).then(result=>{
        if(wpop!==pop||gTok!==token||!w.isConnected)return;
        const hits=(result.results||[]).filter(x=>x.dictId==='7fab63c14df2'&&x.kind==='exact');
        slot.innerHTML=result.error?`<p class="muted">${esc(t('SEDRA konnte nicht geladen werden.'))}</p>`:hits.length?hits.map(hit=>{
          const entry=document.createElement('div');entry.innerHTML=hit.html;
          const gloss=entry.querySelector('.sedra-language [lang=eng]')||entry.querySelector('.sedra-language li > span');
          const short=gloss?.textContent||'';
          const primary=gloss?.closest('.sedra-language'),root=entry.querySelector('.sedra-root');
          if(root?.querySelector('small'))root.querySelector('small').textContent=t('Wurzel');
          const meanings=primary?[...primary.querySelectorAll('li')].slice(0,3).map(li=>li.outerHTML).join(''):'';
          const id=entry.querySelector('[data-sedra-id]')?.dataset.sedraId||'';
          return `<details class="sy-sedra-candidate" data-sedra-id="${esc(id)}"${hits.length===1?' open':''}><summary><bdi lang="syr" dir="rtl">${esc(hit.head)}</bdi>${short?` <span>${esc(short.slice(0,120))}${short.length>120?'…':''}</span>`:''}</summary>${meanings?`<small>${esc(primary.querySelector('small')?.textContent||'')}</small><ul class="sy-sedra-glosses">${meanings}</ul>`:''}${root?.outerHTML||''}<details class="sy-sedra-more"><summary>${esc(t('Vollständiger Wörterbucheintrag'))}</summary>${hit.html}</details></details>`;
        }).join('')+`<button class="wdict sedra-open" data-q="${esc(q)}">${esc(t('Im SEDRA-Wörterbuch öffnen'))}</button>`:`<p class="muted">${esc(t('Kein genauer SEDRA-Treffer für diese Schreibung.'))}</p>`;
        place();
      }).catch(()=>{
        if(wpop!==pop||gTok!==token)return;
        slot.innerHTML=`<p class="muted">${esc(t('SEDRA konnte nicht geladen werden.'))}</p>`;place();
      });
    }
  }
  let greekManualP=null;
  async function showCorpusWord(cell,at,doc){
    const token=++gTok;let manual=null;
    if(doc.greekMorphology.work==='tlg0526.tlg004')try{manual=await(greekManualP||(greekManualP=lazyScript('greek-corpus-manual.js',()=>window.GREEK_CORPUS_MANUAL).catch(e=>{greekManualP=null;throw e;})));}catch{}
    if(token!==gTok||!cell.isConnected)return;
    const row=cell.closest('.row');let path=reader.view?.sections?.[reader.view.idx]?.path;
    if(row?.classList.contains('sh'))try{path=JSON.parse(row.dataset.sp);}catch{}
    else{const heading=row?.closest('.pgb')?.querySelector('.pgh[data-sk]');if(heading)try{path=JSON.parse(heading.dataset.sk);}catch{}}
    const data=window.GreekCorpus.at(doc,path,row?.dataset.sl||row?.dataset.l,at.words.map(w=>w.t),manual),r=data?.records[at.i],t=s=>I18N.t(s);
    let meaning='';
    if(r?.lemma)try{meaning=window.GreekCorpus.gloss(await loadGM(),r.lemma);}catch{}
    if(token!==gTok||!cell.isConnected)return;
    const described=r?.tag?window.GreekCorpus.describe(r.tag,t):null;
    const rows=r?.lemma?`<div class="wseg main" data-source="${r.source}" data-analysis="${r.analysis}"><span class="wlem" lang="grc">${esc(r.lemma)}</span>${meaning?`<div class="corpus-meaning"><strong class="corpus-gloss" lang="en">${esc(meaning)}</strong><small class="corpus-gloss-source">${esc(t('Kurzbedeutung (Englisch) · STEPBible'))}</small></div>`:'<br>'}<span class="corpus-morph">${esc([described?.pos,described?.info].filter(Boolean).join(' · '))}</span></div><p class="muted">${esc(r.source==='gorman'?t('GLAUx / Gorman · manuell annotiert'):t('OGA · automatisch annotiert'))}<br>${esc(data.work)} · ${esc(r.locus||data.locus)} · <code>${esc(r.tag)}</code></p>`:`<p class="muted">${esc(t('Für dieses Wort liegt keine sicher zugeordnete Morphologie vor.'))}</p>`;
    const query=r?.lemma?.replace(/[0-9]+$/,'');
    const ref=data&&doc.greekMorphology.references?.[r?.locus||data.locus];
    const buttons=(query?`<button type="button" class="wdict" data-q="${esc(query)}">${esc(t('Im Wörterbuch nachschlagen'))}</button>`:'')+(ref?`<button type="button" class="corpus-ref" data-ref="${esc(ref)}">${data.work==='tlg0526.tlg003'?esc(t('Übersetzung öffnen')):'Whiston:'} ${esc(ref)}</button>`:'');
    const range=at.range(at.i);try{CSS.highlights.set('gsel',new Highlight(range));}catch{}
    gSel={cell,i:at.i};showGreekUnit(null,{rows,buttons,word:at.words[at.i].t,at:range,on:ev=>{const b=ev.target.closest('.corpus-ref');if(!b)return false;closeWpop();jumpTo(b.dataset.ref,false);return true;}});
    wpop?.classList.add('greek-corpus-word');
  }
  async function showGreekWord(cell, w, e, source = null) {
    const at = source && window.GMorph ? apparatusGreekAt(w,source) : cell && window.GMorph ? greekWordAt(cell, e, w) : null, was = gSel, wasGroup = w && w.classList.contains('sel');
    closeWpop();
    if (!at) { if (w && !wasGroup) showGreekUnit(w); return; }
    if (was && was.cell === cell && was.i === at.i) return; // dasselbe Wort noch einmal: schließen
    const corpusDoc=!source&&reader.view?.loaded?.find(d=>d.entry.rel===cell.dataset.rel&&d.greekMorphology);if(corpusDoc&&window.GreekCorpus){await showCorpusWord(cell,at,corpusDoc);return;}
    const ctx = source ? source.ctx : greekCtx(cell), tok = ++gTok;
    let D = null;
    if (ctx) { try { D = await loadGM(); } catch { D = null; } }
    if (tok !== gTok || wpop || !cell.isConnected) return; // inzwischen wurde woanders geklickt
    const GM = window.GMorph, bi = D ? GM.bookIndex(D, ctx.title, ctx.vt) : -1;
    const toks = bi >= 0 ? GM.verse(D, bi, ctx.ch, ctx.v) : null;
    if (!toks || toks.length !== at.words.length) { if (w) showGreekUnit(w); return; } // Fassung ohne Bestimmung (oder Vers passt nicht zum Index): wie bisher nur das hebräische Gegenstück
    const t = s => I18N.t(s), idx = w ? at.grp : [at.i];
    const show = main => {
      if (wpop) { wpop.remove(); wpop = null; }
      gSel = { cell, i: main };
      const inf = k => (toks[k] ? GM.info(D, toks[k].id) : null);
      const hint = k => (toks[k].low ? `<span class="wlow" title="${esc(t('lxx-morph stuft diese Bestimmung als unsicher ein'))}">${esc(t('unsicher'))}</span>` : toks[k].guess ? `<span class="wlow" title="${esc(t('Das Wort ließ sich im Vers nicht zuordnen; die Bestimmung ist die häufigste dieser Wortform'))}">${esc(t('nach der Wortform'))}</span>` : '');
      const rows = idx.map(k => {
        const f = inf(k), d = f && GM.describe(f.key, t);
        return `<div class="wseg${k === main ? ' main' : ' wgalt'}" data-k="${k}"${k === main ? '' : ` title="${esc(t('Dieses Wort wählen'))}"`}>${idx.length > 1 ? `<span class="wgs" lang="grc">${esc(at.words[k].t)}</span> ` : ''}`
          + (f ? `<span class="wlem wgl" lang="grc">${esc(f.lemma)}</span> <span class="muted">${esc(f.gloss)}</span><br><b>${esc(d.pos)}</b>${d.info ? ' · ' + esc(d.info) : ''} ${hint(k)}` : `<span class="muted">${esc(t('ohne Bestimmung'))}</span>`) + '</div>';
      }).join('');
      const m = inf(main);
      const buttons = m ? `<button class="wdict wglex" data-q="${esc(m.lemma)}" hidden>Im Wörterbuch nachschlagen</button><button class="wforms wcard" title="${esc(t('Wortkarte: Wörterbücher, Verteilung und Formen dieses Wortes'))}">Wortkarte</button><button class="wforms wtable" title="${esc(t('Alle in der Septuaginta belegten Formen dieses Wortes als Tabelle'))}">Alle Formen (Tabelle)</button><button class="wforms wall" title="${esc(t('Startet die Suche nach diesem Wort in der Septuaginta (Treffer „Alle Formen“)'))}">🔎 ${esc(t('Alle Stellen dieses Wortes'))}</button>` : '';
      const rg = at.range(main);
      try { CSS.highlights.set('gsel', new Highlight(rg)); } catch { /* ältere Engine */ }
      const place = showGreekUnit(w, { rows, buttons, word: at.words[main].t, at: rg, on: ev => {
        const alt = ev.target.closest('.wgalt[data-k]'); if (alt && !ev.target.closest('button')) { show(+alt.dataset.k); return true; }
        const wf = ev.target.closest('.wforms');
        if (wf && m) { const info = { lemma: m.lemma, form: m.form, key: m.key }; closeWpop(); if (wf.classList.contains('wall')) gSearchAll(m.lemma); else openGForms(m.lemma, info, wf.classList.contains('wtable') ? 'forms' : 'card'); return true; }
        return false;
      } });
      if (m) O.dictLookup(m.lemma, reader.dictSel && reader.dictSel.length ? reader.dictSel : null, false).then(r => { // Lexikon-Knopf nur, wenn ein eingebundenes Wörterbuch das Wort kennt
        const b = wpop && wpop.querySelector('.wglex'); if (b && b.dataset.q === m.lemma && r && r.results && r.results.length) { b.hidden = false; place(); }
      }).catch(() => {});
    };
    show(at.i);
  }
  // Targum-Wörter (ETCBC): Lexem, Wurzel, Bedeutung, Wortart, Stamm, Genus/Numerus/Status
  const T_SP = { subs: 'Substantiv', verb: 'Verb', prep: 'Präposition', conj: 'Konjunktion', pron: 'Pronomen', advb: 'Adverb', adjv: 'Adjektiv', intj: 'Interjektion', nmpr: 'Eigenname', art: 'Artikel', unknown: 'unbekannt' };
  const T_VS = { G: 'Peal (G)', D: 'Pael (D)', C: 'Aphel (C)', Gt: 'Ethpeel (Gt)', Dt: 'Ethpaal (Dt)', Ct: 'Ittaphal (Ct)', DD: 'Pael-Variante (DD)', PO: 'Pol (PO)', POT: 'Ethpol (POT)' };
  const T_ST = { e: 'Emphaticus', a: 'Absolutus', c: 'Constructus', x: 'Absolutus oder Constructus' };
  const T_NU = { s: 'Singular', pl: 'Plural' }, T_GN = { m: 'maskulin', f: 'feminin' };
  function showTargumWord(w) {
    const [sp, vs, st, nu, gn] = w.dataset.m.split('.');
    const lx = (window.TARGUM_LEX || {})[w.dataset.l] || ['', '', ''];
    w.classList.add('sel');
    const parts = [];
    if (sp !== '-') parts.push(`<b>${esc(T_SP[sp] || sp)}</b>`);
    if (vs !== '-') parts.push(`Stamm: <b>${esc(T_VS[vs] || vs)}</b>`);
    if (gn !== '-') parts.push(esc(T_GN[gn] || gn));
    if (nu !== '-') parts.push(esc(T_NU[nu] || nu));
    if (st !== '-') parts.push(esc(T_ST[st] || st));
    let h = '<div class="wseg main">';
    if (lx[0]) h += `<span class="wlem" dir="rtl" lang="he">${esc(lx[0])}</span> `;
    if (lx[2]) h += `<span class="muted">${esc(lx[2])}</span><br>`;
    if (lx[1] && lx[1] !== lx[0]) h += `Wurzel: <span dir="rtl" lang="he" class="wlem">${esc(lx[1])}</span><br>`;
    h += parts.join(' · ') + '</div>';
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span dir="rtl" lang="he" class="wword">${esc(w.textContent)}</span><button class="wx" title="Schließen">✕</button></div>${h}${lx[0] ? `<button class="wdict" data-q="${esc(lx[0])}">Im Wörterbuch nachschlagen</button>` : ''}${lx[0] ? `<button class="wforms wtcard" data-tl="${esc(w.dataset.l)}">${esc(I18N.t('Wortkarte'))}</button><button class="wforms wttable" data-tl="${esc(w.dataset.l)}">${esc(I18N.t('Alle Formen (Tabelle)'))}</button>` : ''}`;
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
      const card = ev.target.closest('.wtcard, .wttable'); if (card) { closeWpop(); openTForms(card.dataset.tl, { form: w.textContent }, card.classList.contains('wttable') ? 'forms' : 'card'); }
    };
  }
  // Qumran (ETCBC DSS): data-l = Lemma, data-m = Wortart.Stamm.Zeit.Person.Genus.Numerus.Status ('-' = ohne Angabe)
  const Q_SP = { subs: 'Substantiv', verb: 'Verb', ptcl: 'Partikel', adjv: 'Adjektiv', numr: 'Zahlwort', pron: 'Pronomen', prep: 'Präposition', conj: 'Konjunktion', art: 'Artikel', advb: 'Adverb', nmpr: 'Eigenname', prps: 'Personalpronomen', prde: 'Demonstrativpronomen', prin: 'Fragepronomen', nega: 'Verneinung', inrg: 'Fragepartikel', intj: 'Interjektion' };
  const Q_VS = { qal: 'Qal', hif: 'Hifil', nif: 'Nifal', hit: 'Hitpael', hof: 'Hofal', etpe: 'Etpeel (aram.)', hifil: 'Hifil', piel: 'Piel', nifal: 'Nifal', hitpael: 'Hitpael', hofal: 'Hofal', pual: 'Pual', polel: 'Polel', poel: 'Poel', poal: 'Poal', pilpel: 'Pilpel', hitpoel: 'Hitpoel', hitopel: 'Hitpolel', peal: 'Peal (aram.)', pael: 'Pael (aram.)', aphel: 'Afel (aram.)', haphel: 'Hafel (aram.)', shaphel: 'Schafel (aram.)', ithpeel: 'Itpeel (aram.)', ithpaal: 'Itpaal (aram.)', peil: 'Peil (aram.)', passive: 'Passiv' };
  const Q_VT = { perf: 'Perfekt', impf: 'Imperfekt', wayy: 'Narrativ (wajjiqtol)', impv: 'Imperativ', ptca: 'Partizip aktiv', ptcp: 'Partizip passiv', infc: 'Infinitiv constructus', infa: 'Infinitiv absolutus' };
  const Q_GN = { m: 'maskulin', f: 'feminin', b: 'beide Geschlechter', c: 'gemeinsam' }, Q_NU = { s: 'Singular', p: 'Plural', d: 'Dual' }, Q_ST = { a: 'Absolutus', c: 'Constructus', d: 'bestimmt' };
  let bavliP = null, bavliDialog = null;
  const loadBavli = () => bavliP || (bavliP = lazyScript('bavli-morph.js', () => window.BAVLI_MORPH).catch(e => { bavliP = null; throw e; }));
  async function decorateBavliReader() {
    const section = reader.view && reader.view.sections && reader.view.sections[reader.view.idx], page = section && apChap(section);
    const cells = $$('#rOut .cell[data-bavli]');
    if (!cells.length || !/^(?:[2-9]|10)[ab]$/.test(page || '')) return;
    let D; try { D = await loadBavli(); } catch { return; }
    const B = window.BavliMorph;
    for (const cell of cells) {
      if (!cell.isConnected || cell.querySelector('.w')) continue;
      const row = cell.closest('.row'), verse = row && verseOf(row.dataset.l), text = cell.querySelector('.txt');
      if (!verse || !text) continue;
      const nodes = [], tokens = [], walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
      for (let nd; (nd = walker.nextNode()); ) {
        if (nd.parentElement.closest('.note, sup')) continue;
        for (const match of nd.data.matchAll(/\S+/g)) if (/[א-ת]/.test(match[0])) { nodes.push({ nd, start: match.index, end: match.index + match[0].length }); tokens.push(match[0]); }
      }
      const matched = B.matchWords(D, `Berakhot ${page}:${verse}`, tokens);
      if (!matched) continue; // Andere Textfassung: keine bloße Positionszuordnung erzwingen.
      for (let i = nodes.length - 1; i >= 0; i--) {
        const { nd, start, end } = nodes[i], occurrence = matched[i];
        const word = start ? nd.splitText(start) : nd;
        if (end - start < word.data.length) word.splitText(end - start);
        const span = document.createElement('span'); span.className = 'w'; span.dataset.l = occurrence.id; span.dataset.m = B.definiteMorph(D.lexicon[occurrence.id]);
        word.replaceWith(span); span.appendChild(word);
      }
    }
  }
  async function openBavliAnchor(w, anchor) {
    const same = w.classList.contains('sel'); closeWpop(); if (same) return;
    const token = gTok;
    try {
      const D = await loadBavli();
      if (token !== gTok || !w.isConnected) return;
      const occurrence = window.BavliMorph.atAnchor(D, anchor); if (!occurrence) return;
      w.dataset.l = occurrence.id; w.dataset.m = window.BavliMorph.definiteMorph(D.lexicon[occurrence.id]);
      await showBavliWord(w);
    } catch { alert(I18N.t('Morphologie konnte nicht geladen werden.')); }
  }
  const bavliStatus = e => e.status === 'ambiguous' ? 'Mehrdeutig: mehrere Analysen' : e.status === 'partial' ? 'Teilweise bestimmt: Merkmale bleiben offen' : e.status === 'unresolved' ? 'Noch nicht sicher bestimmt' : '';
  async function showBavliWord(w) {
    const tok = gTok, D = await loadBavli().catch(() => { alert(I18N.t('Morphologie konnte nicht geladen werden.')); return null; });
    if (!D || tok !== gTok || !w.isConnected) return;
    const B = window.BavliMorph, e = D.lexicon[w.dataset.l];
    if (!e) return;
    const aa = B.analyses(e), status = bavliStatus(e), allNotes = [...new Set([e.note, ...aa.map(a => a.note)].filter(Boolean))];
    const refs = [...new Set([...(e.rules || []), ...aa.flatMap(a => a.rules || [])])];
    const choices = [];
    const body = aa.map(a => {
      const lemma = B.headLemma(a), language = a.lang === 'A' ? 'Jüdisch-babylonisches Aramäisch' : 'Hebräisch';
      if (!choices.some(x => x.lemma === lemma && x.lang === a.lang)) choices.push({ lemma, lang: a.lang });
      const subject = a.subject || e.subject;
      const role = subject ? `<p>${esc(I18N.t('Subjektssuffix'))}: ${esc([subject.person && subject.person + '. Person', Q_GN[subject.gender] || subject.gender, Q_NU[subject.number] || subject.number].filter(Boolean).join(' · '))}</p>` : '';
      return `<div class="wseg main"><span class="wlem" dir="rtl" lang="${a.lang === 'A' ? 'arc' : 'he'}">${esc(lemma)}</span>${a.gloss ? ` <span class="muted">${esc(a.gloss)}</span>` : ''}<br><small>${esc(I18N.t(language))}</small>${a.root ? `<p>${esc(I18N.t('Wurzel'))}: <bdi>${esc(a.root)}</bdi></p>` : ''}${B.describe(a, window.Morph, s => I18N.t(s)).map(s => `<div class="${s.main ? 'bavliMain' : ''}">${esc(s.label)}</div>`).join('')}${role}</div>`;
    }).join('');
    w.classList.add('sel');
    wpop = document.createElement('div'); wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span class="wword" dir="rtl">${esc(w.textContent)}</span><button class="wx" title="${esc(I18N.t('Schließen'))}">✕</button></div>${status ? `<p class="bavliStatus">${esc(I18N.t(status))}</p>` : ''}${body}${allNotes.map(n => `<p>${esc(n)}</p>`).join('')}${choices.map((a, i) => `<button class="wdict" data-q="${esc(a.lemma)}">${esc(I18N.t('Im Wörterbuch nachschlagen'))}${choices.length > 1 ? ': ' + esc(a.lemma) + ' (' + esc(I18N.t(a.lang === 'A' ? 'Aramäisch' : 'Hebräisch')) + ')' : ''}</button> <button class="wforms bvforms" data-i="${i}">${esc(I18N.t('Belegte Formen'))}${choices.length > 1 ? ': ' + esc(a.lemma) + ' (' + esc(I18N.t(a.lang === 'A' ? 'Aramäisch' : 'Hebräisch')) + ')' : ''}</button>`).join('')}${refs.length ? `<details><summary>${esc(I18N.t('Grammatische Belege'))}</summary><ul>${refs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>` : ''}<p class="muted">${esc(I18N.t('Eigene Morphologie · Berakhot 2a–10b'))}</p>`;
    const host = w.closest('dialog[open]') || document.body;
    host.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    wpop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px';
    wpop.style.top = (r.bottom + ph + 6 < window.innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - ph - 6)) + 'px';
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) { if (host !== document.body) host.close(); openDict(b.dataset.q); }
      const f = ev.target.closest('.bvforms'); if (f) { const a = choices[+f.dataset.i]; closeWpop(); showBavliForms(D, a.lemma, a.lang); }
    };
  }
  function showBavliForms(D, lemma, lang) {
    const B = window.BavliMorph, rows = B.forms(D, lemma, lang);
    if (!bavliDialog) { bavliDialog = document.createElement('dialog'); bavliDialog.id = 'bavliForms'; document.body.appendChild(bavliDialog); }
    bavliDialog.innerHTML = `<form method="dialog"><button class="bavliClose" aria-label="${esc(I18N.t('Schließen'))}">✕</button></form><h2><bdi>${esc(lemma)}</bdi> · ${esc(I18N.t(lang === 'A' ? 'Aramäisch' : 'Hebräisch'))} · ${esc(I18N.t('Belegte Formen'))}</h2><p>${esc(I18N.t('Nur die in Berakhot 2a–10b belegten Formen; keine ergänzten Paradigmen.'))}</p><table class="fmT"><thead><tr><th>${esc(I18N.t('Form'))}</th><th>${esc(I18N.t('Bestimmung'))}</th><th>${esc(I18N.t('Stellen'))}</th></tr></thead><tbody>${rows.map(r => `<tr><td dir="rtl">${esc(r.word)}</td><td>${B.describe(r, window.Morph, s => I18N.t(s)).map(x => esc(x.label)).join('<br>')}${r.status !== 'reviewed' ? `<br><b>${esc(I18N.t(r.status === 'partial' ? 'Teilweise bestimmt' : 'Mögliche Analyse'))}</b>` : ''}</td><td>${r.refs.map(x => `<button type="button" data-ref="${esc(x.ref)}">${esc(x.ref)} <small>(${x.token})</small></button>`).join(' ')}</td></tr>`).join('')}</tbody></table>`;
    bavliDialog.onclick = ev => { const b = ev.target.closest('[data-ref]'); if (b) { bavliDialog.close(); const origin = document.getElementById('bavliInterlinear'); if (origin && origin.open) origin.close(); jumpTo(b.dataset.ref, false); } };
    if (!bavliDialog.open) bavliDialog.showModal();
  }
  function showQumranWord(w) {
    const [sp, vs, vt, ps, gn, nu, st, sx] = w.dataset.m.split('.');
    const lem = w.dataset.l;
    w.classList.add('sel');
    const parts = [];
    if (sp !== '-') parts.push(`<b>${esc(Q_SP[sp] || sp)}</b>`);
    if (vs !== '-') parts.push(`Stamm: <b>${esc(Q_VS[vs] || vs)}</b>`);
    if (vt !== '-') parts.push(`Form: <b>${esc(Q_VT[vt] || vt)}</b>`);
    if (ps !== '-') parts.push(`${esc(ps)}. Person`);
    if (gn !== '-') parts.push(esc(Q_GN[gn] || gn));
    if (nu !== '-') parts.push(esc(Q_NU[nu] || nu));
    if (st !== '-') parts.push(esc(Q_ST[st] || st));
    // Pronominalsuffix (פשרו, לו, ידו …): Person, Genus, Numerus, z. B. „3ms“
    if (sx && /^[123]?[mfcb]?[sdp]?$/.test(sx)) parts.push(`Suffix: <b>${esc([sx[0] && /\d/.test(sx[0]) ? sx[0] + '.' : '', Q_GN[sx.replace(/\d/, '')[0]] || '', Q_NU[sx.slice(-1)] || ''].filter(Boolean).join(' '))}</b>`);
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span dir="rtl" lang="he" class="wword">${esc(w.textContent)}</span><button class="wx" title="Schließen">✕</button></div><div class="wseg main"><span class="wlem" dir="rtl" lang="he">${esc(lem)}</span><br>${parts.join(' · ')}</div><button class="wdict" data-q="${esc(lem)}">Im Wörterbuch nachschlagen</button>`;
    if(w.dataset.dssSource){
      const source=document.createElement('p');source.className='muted';source.textContent=[w.dataset.dssStatus,w.dataset.dssSource].filter(Boolean).join(' · ');wpop.appendChild(source);
    }
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
    };
  }
  // Samaritanischer Pentateuch: eigene Textgrundlage und eigene Annotationen.
  let samaritanP = null;
  const loadSamaritan = () => samaritanP || (samaritanP = lazyScript('samaritan-data.js', () => window.SAMARITAN_DATA).catch(e => { samaritanP = null; throw e; }));
  async function showSamaritanWord(w) {
    const token = gTok;
    let D;
    try { D = await loadSamaritan(); }
    catch { if (token === gTok && w.isConnected) alert(I18N.t('Morphologie konnte nicht geladen werden.')); return; }
    if (token !== gTok || !w.isConnected) return;
    const S = window.SamaritanMorph, info = S.word(D, w.dataset.l);
    if (!info) return;
    const t = s => I18N.t(s);
    const rows = info.parts.map(part => `<div class="wseg main"><span class="wlem" dir="rtl" lang="he">${esc(S.lemma(part))}</span>${part[1] ? ` <span class="muted">${esc(part[1])}</span>` : ''}<br>${S.describe(part,t).map(esc).join(' · ')}</div>`).join('');
    const phono = info.phono.filter(Boolean).join(' · ');
    const variants = info.variants.map(v => `<p><b>Tal–Florentin:</b> <bdi>${esc(v.base)}</bdi> → <bdi>${esc(v.reading === '-' ? t('ausgelassen') : v.reading)}</bdi></p>`).join('');
    const lemmas = [...new Set(info.parts.filter(p => !['conj','art','prep'].includes(p[2])).map(S.lemma).filter(Boolean))];
    if (!lemmas.length) lemmas.push(...new Set(info.parts.map(S.lemma).filter(Boolean)));
    if (!lemmas.length && !info.context) { const q=w.textContent.replace(/[^א-ת ]/g,'').trim();if(q)lemmas.push(q); }
    const apparatus=(info.talNotes||[]).map(n=>`<section class="tal-apparatus-entry"><div>${window.Reader.cleanHtml(n.html)}</div><small class="tal-cite" dir="ltr">${esc(n.citation)}</small></section>`).join('');
    const morphology=rows||(!info.context?`<p class="muted">${esc(t('Für diese Lesart wurde keine CACCHT-Morphologie übernommen.'))}</p>`:'');
    w.classList.add('sel');
    wpop = document.createElement('div'); wpop.id = 'wpop'; wpop.classList.add('samaritan-word');
    wpop.innerHTML = `<div class="wtop"><span class="wword" dir="${info.context||info.language==='English'?'ltr':'rtl'}" lang="he">${esc(info.context?info.ref:w.textContent)}</span><button class="wx" title="${esc(t('Schließen'))}">✕</button></div><p class="muted">${esc(t(info.context?'Anmerkungen zum Vers':'Samaritanisches Hebräisch'))}</p>${phono ? `<div class="wphon" lang="he-Latn" title="${esc(t('Umschrift der Datenquelle'))}">${esc(phono)}</div>${phono.includes('�') ? `<p class="muted">${esc(t('Umschrift teilweise unlesbar'))}</p>` : ''}` : ''}${morphology}${apparatus?`<div class="tal-apparatus">${apparatus}</div>`:''}${variants}${info.notes.map(n=>`<p class="muted">${esc(n)}</p>`).join('')}${lemmas.map(l=>`<button class="wdict" data-q="${esc(l)}">${esc(t('Im Wörterbuch nachschlagen'))}: <bdi>${esc(l)}</bdi></button>`).join('')}${info.parts.length?`<p class="muted">CACCHT / DT-UCPH · ${esc(D.version)} · CC BY-NC 4.0</p>`:''}`;
    document.body.appendChild(wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    wpop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px';
    wpop.style.top = (r.bottom + ph + 6 < window.innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - ph - 6)) + 'px';
    wpop.onclick = e => {
      if (e.target.closest('.wx')) { closeWpop(); return; }
      const b = e.target.closest('.wdict'); if (b) { closeWpop(); openDict(b.dataset.q); }
    };
  }
  // Aussprache (ETCBC phono) im Wort-Popup: aus der Umschrift-Zuordnung in interlin.js (Westminster-Wort Nr. n im Vers)
  function wPhono(w, pop) {
    const cell = w.closest('.cell'), row = w.closest('.row[data-l]'), s = reader.view && reader.view.sections && reader.view.sections[reader.view.idx], chap = s && apChap(s);
    if (!cell || !row || !chap || !reader.view.group) return;
    const box = w.closest('[data-vt]') || cell; // Spalte je Sprache: nur die Wörter derselben Fassung zählen
    if (box.dataset.vt && !/^Westminster/.test(box.dataset.vt)) return;
    const v = verseOf(row.dataset.l), i = [...box.querySelectorAll('.w[data-m]')].indexOf(w) + 1, book = reader.view.group.title;
    if (v == null || i < 1) return;
    loadIL().then(IL => {
      const segs = IL && IL.Umschrift && IL.Umschrift[book] && IL.Umschrift[book][chap + ':' + v]; if (!segs || !pop.isConnected) return;
      const t = segs.filter(x => x[0].includes(i)).map(x => x[1].replace(/^\*/, '').replace(/-$/, '')).join(' '); if (!t) return;
      const e = document.createElement('div'); e.className = 'wphon'; e.lang = 'he-Latn'; e.textContent = t;
      e.title = I18N.t('Aussprache (phonetische Umschrift, ETCBC phono) – ˈ Hauptton, ˌ Nebenton');
      const top = pop.querySelector('.wtop'); if (top) top.after(e);
    }, () => {});
  }
  $('#rOut').addEventListener('click', e => {
    // The interlinear controller opens Samaritan words with their own IDs.
    // Do not invalidate its pending lazy morphology load in this handler.
    if (e.target.closest('.smr-word')) return;
    const sy=e.target.closest('.syw[data-si]');if(sy){showSyriacWord(sy);return;}
    const w = e.target.closest('.w[data-m], .wt[data-m], .wq[data-m], .wg');
    gTok++; // ein noch ladendes griechisches Wort-Popup gilt nicht mehr
    // griechischer Text ohne Wortgruppen (Rahlfs): jedes Wort ist anklickbar
    const gc = !w && !e.target.closest('#wpop, a, button, small, sup, .note, .lab, .head') ? e.target.closest('.cell[data-gt]') : null;
    if (!w && !gc) { if (!e.target.closest('#wpop')) closeWpop(); return; }
    if (window.getSelection && String(window.getSelection())) return; // beim Markieren nicht stören
    if (gc || w.classList.contains('wg')) { showGreekWord(gc || w.closest('.cell'), gc ? null : w, e); return; }
    const same = w.classList.contains('sel');
    closeWpop();
    if (same) return;
    if (w.classList.contains('wt')) { showTargumWord(w); return; }
    if (w.classList.contains('wq')) { showQumranWord(w); return; }
    if (window.SamaritanMorph && window.SamaritanMorph.own(w.dataset.l)) { showSamaritanWord(w); return; }
    if (window.BavliMorph && window.BavliMorph.own(w.dataset.l)) { showBavliWord(w); return; }
    const d = window.Morph.decode(w.dataset.m, w.dataset.l);
    if (!d) return;
    const LEM = window.OSHB_LEMMAS || {};
    w.classList.add('sel');
    const rows = d.segs.map((s, i) => {
      const lem = s.lemma && LEM[s.lemma] ? LEM[s.lemma] : null;
      const parts = [`<b>${esc(s.pos)}</b>`];
      if (s.stem) parts.push(`Stamm: <b>${esc(s.stem)}</b>`);
      if (s.tense) parts.push(`Zeit/Form: <b>${esc(s.tense)}</b>`);
      if (s.info) parts.push(esc(s.info));
      let h = `<div class="wseg${i === d.main ? ' main' : ''}">`;
      if (s.prefix) h += `<span class="wpre">${esc(s.prefix)}</span> `;
      if (lem) h += `<span class="wlem" dir="rtl" lang="he">${esc(lem[0])}</span> <span class="muted">${esc(I18N.lang === 'de' && lem[2] ? lem[2] : lem[1])}</span><br>`;
      return h + parts.join(' · ') + '</div>';
    }).join('');
    const mainSeg = d.segs[d.main], lem = mainSeg && mainSeg.lemma && LEM[mainSeg.lemma];
    wpop = document.createElement('div');
    wpop.id = 'wpop';
    wpop.innerHTML = `<div class="wtop"><span dir="rtl" lang="he" class="wword">${esc(w.textContent)}</span><button class="wx" title="Schließen">✕</button></div>${rows}${lem ? `<button class="wdict" data-q="${esc(lem[0])}">Im Wörterbuch nachschlagen</button>` : ''}${mainSeg && mainSeg.lemma ? `<button class="wforms wcard" title="Wortkarte: Wörterbücher, Verteilung und Formen dieses Wortes">Wortkarte</button><button class="wforms wtable" title="Alle im Tanach belegten Formen dieses Wortes als Tabelle">Alle Formen (Tabelle)</button>` : ''}`;
    if (mainSeg && mainSeg.lemma) loadForms().catch(() => {}); // Formen-Index schon laden, damit die Tabelle sofort da ist
    const wInfo = { lemma: mainSeg && mainSeg.lemma, word: w.textContent, m: w.dataset.m, l: w.dataset.l };
    document.body.appendChild(wpop);
    wPhono(w, wpop);
    const r = w.getBoundingClientRect(), pw = wpop.offsetWidth, ph = wpop.offsetHeight;
    let x = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    wpop.style.left = x + 'px'; wpop.style.top = y + 'px';
    wpop.ondblclick = ev => { // Doppelklick auf ein Wort im Popup schlägt es im Wörterbuch nach (das Lemma als Ganzes mit seinen Zeichen)
      if (ev.target.closest('button')) return;
      const lw = ev.target.closest('.wlem');
      const sel = (window.getSelection() + '').trim().replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '');
      const q = lw ? lw.textContent.trim() : sel;
      if (q && q.length <= 40 && !/\s/.test(q)) openDict(q);
    };
    wpop.onclick = ev => {
      if (ev.target.closest('.wx')) closeWpop();
      const b = ev.target.closest('.wdict'); if (b) openDict(b.dataset.q);
      const wf = ev.target.closest('.wforms'); if (wf) { closeWpop(); openForms(wInfo.lemma, wInfo, wf.classList.contains('wtable') ? 'forms' : 'card'); }
    };
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWpop(); });

    return { openQumranWord(w) { gTok++; closeWpop(); return showQumranWord(w); }, openGreekApparatus(w,source) { return showGreekWord(w,w,null,source); }, openSamaritanWord(w) { gTok++; closeWpop(); return showSamaritanWord(w); }, close: closeWpop, loadGM, greekWordAt, decorateBavliReader, openBavliAnchor };
  }
  return { create };
})();
