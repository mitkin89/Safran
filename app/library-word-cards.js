// LibraryWordCards: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryWordCards = (() => {
  'use strict';
  function create(host) {
  // ---------- Wortkarte: Überblick zu einem Lemma (Wörterbücher, Verteilung, häufigste Formen, Septuaginta) + Formentabelle ----------
  // Ein Fenster mit zwei Reitern: „Überblick“ (die Wortkarte) und „Alle Formen (Tabelle)“. Grundlage sind der Formen-Index (oshb-forms.js),
  // die eingebundenen Wörterbücher (dict:lookup wie „Im Wörterbuch nachschlagen“) und für die Septuaginta der Index oshb-lxx.js.
  let formsP = null, fmCur = null, fmTab = 'card', wcToken = 0; // fmCur: { D, mdl, lemma, lem } des gezeigten Wortes
  const lazyScript = (src, get) => new Promise((res, rej) => {
    if (get()) return res(get());
    const el = document.createElement('script'); el.src = src;
    el.onload = () => (get() ? res(get()) : rej(new Error(src)));
    el.onerror = () => rej(new Error(src));
    document.body.appendChild(el);
  });
  function loadForms() { // der Index (ca. 2 MB) wird erst beim ersten Wort-Popup geladen
    if (!formsP) formsP = lazyScript('oshb-forms.js', () => window.OSHB_FORMS).catch(e => { formsP = null; throw e; });
    return formsP;
  }
  let lxxP = null;
  let stemP = null;
  const loadStems = () => stemP || (stemP = lazyScript('oshb-stems.js', () => window.OSHB_STEMS).catch(() => { stemP = null; return null; }));
  let qumP = null;
  const loadQum = () => qumP || (qumP = lazyScript('qumran-lex.js', () => window.QUMRAN_LEX).catch(() => { qumP = null; return null; }));
  const loadLxx = () => lxxP || (lxxP = lazyScript('oshb-lxx.js', () => window.OSHB_LXX).catch(() => { lxxP = null; return null; }));
  function fmTabName(t) {
    return t === 'forms' || t === 'concordance' ? t : 'card';
  }
  function fmShowTab(t = fmTab) {
    fmTab = fmTabName(t);
    host.$$('#fmTabs button').forEach(b => { const on = b.dataset.t === fmTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    host.$('#wcBody').hidden = fmTab !== 'card'; host.$('#fmBody').hidden = fmTab !== 'forms';
    host.$('#fmConcordance').disabled = !fmCur?.lem?.[0];
    host.$('#fmConcordanceBody').hidden = fmTab !== 'concordance';
    if (fmTab === 'concordance') wcLoadConcordance(wcConcordance?.token === wcToken ? wcConcordance.mode : fmCur?.family ? 'root' : 'lemma');
    host.hovApi && host.hovApi.hide();
    wcFindSoon();
  }
  let wcConcordance;
  async function wcLoadConcordance(mode = 'lemma') {
    const box = host.$('#fmConcordanceBody');
    const t = key => host.esc(I18N.t(key));
    const card = fmCur;
    const query = card?.lem?.[0];
    if (!query) {
      box.innerHTML = '<p class="muted">' + t('Lädt …') + '</p>';
      return;
    }
    const token = wcToken;
    if (wcConcordance?.token === token && wcConcordance.mode === mode) return;
    const exactLemma = !card.greek && !card.syriac && !card.targum ? card.lemma : '';
    const state = wcConcordance = { token, query, mode, exactLemma, results: [] };
    const active = () => token === wcToken && wcConcordance === state;
    box.innerHTML = `<div class="wcCcTools"><span class="muted" role="status">${t('Bibliothek wird durchsucht …')}</span>
      ${mode === 'lemma' ? `<button type="button" data-cc-search>${t('In der Suche öffnen')}</button>` : ''}</div>`;
    try {
      const stats = !card.greek && !card.syriac && !card.targum
        ? await host.loadPassageStats().catch(() => null) : null;
      if (!active()) return;
      const family = stats?.roots?.[card.lemma];
      const root = mode === 'root' && family ? card.lemma : '';
      state.root = root;
      if (root) state.query = family.root;
      const result = await host.O.search({
        query: state.query, kinds: ['he', 'other'], concordance: true, concordanceRoot: root, concordanceLemma: exactLemma, concordancePreview: true, crossLanguage: true,
        lemma: true, limit: 12, perFile: 3,
      });
      if (!active()) return;
      if (!result || result.cancelled || result.error) throw new Error('Concordance unavailable');
      state.results = result.results;
      const summary = state.results.length
        ? t('Konkordanz-Vorschau')
        : t('Keine Belege gefunden.');
      const modes = family && !card.family ? `<div class="wcCcModes" role="group" aria-label="${t('Suchumfang')}">
        <button type="button" data-cc-mode="lemma" aria-pressed="${!root}">${t('Grundform')}</button>
        <button type="button" data-cc-mode="root" aria-pressed="${!!root}">${t('Wortfamilie')} <bdi lang="he">${host.esc(family.root)}</bdi></button>
        </div>` : '';
      box.innerHTML = `${modes}<div class="wcCcTools"><span role="status">${summary}${result.errors ? ' · ' + host.esc(I18N.t('{} Dateien konnten nicht gelesen werden', result.errors)) : ''}</span>
        <button type="button" data-cc-search>${t(state.results.length ? 'Weitere Belege in der Suche' : 'In der Suche öffnen')}</button></div>
        <p class="muted">${root ? t('Die Wortfamilie umfasst mehrere Lemmata mit derselben Lexikonwurzel. Unter „Grundform“ siehst du nur das ausgewählte Lemma.') : exactLemma ? host.esc(I18N.t('Belege für das ausgewählte Lemma (Strong {}).', exactLemma)) : t('Belege zur Wortform und Grundform. Gleich geschriebene Lemmata können mit erscheinen.')}</p>
        ${host.concordanceCoverageHtml(result, true)}
        ${state.results.map(wcConcordanceRow).join('')}`;
      wcFindSoon();
    } catch {
      if (!active()) return;
      box.innerHTML = `<p class="muted" role="status">${t('Die Suche ist fehlgeschlagen.')}</p><button type="button" data-cc-retry>${t('Erneut versuchen')}</button>`;
    }
  }
  function wcConcordanceRow(hit, index) {
    const esc = host.esc;
    const lang = row => row.language === 'Syriac' ? 'syr' : row.kind === 'he' ? 'he' : 'grc';
    const address = row => esc([row.title, row.where].filter(Boolean).join(' · '));
    const { before, hit: word, after } = hit.snippet;
    const lemma = window.OSHB_LEMMAS?.[hit.matchedLemmaId];
    const gloss = lemma?.[I18N.lang === 'de' ? 2 : 1] || lemma?.[1];
    const peers = (hit.parallels || []).map((peer, i) => `<button type="button" data-cc-hit="${index}" data-cc-peer="${i}" class="wcCcPeer">
      <bdi lang="${lang(peer)}">${esc(peer.snippet.hit)}</bdi><small>${address(peer)} · ${esc(peer.analysisSource)}</small></button>`).join('');
    return `<article class="wcCcHit"><button type="button" data-cc-hit="${index}">
      <span>${address(hit)}</span>${hit.matchedLemma ? ` · <bdi lang="he">${esc(hit.matchedLemma)}</bdi>${gloss ? ' · ' + esc(gloss) : ''}` : ''}<small>${esc([hit.versionTitle, I18N.t(hit.basis === 'root' ? 'Wortfamilie' : hit.basis === 'lemma' ? 'Grundform' : 'Wortform'), hit.analysisSource && I18N.t(hit.analysisSource), hit.analysisReference].filter(Boolean).join(' · '))}</small>
      <span class="ccContext" dir="auto" lang="${lang(hit)}">${esc(before)}<mark>${esc(word)}</mark>${esc(after)}</span>
      </button>${peers ? '<div class="wcCcPeers">' + peers + '</div>' : ''}</article>`;
  }
  let syCardsP=null;
  function loadSyriacCards(){return syCardsP||(syCardsP=Promise.all([lazyScript('syriac-cards.js',()=>window.SyriacCards),lazyScript('sedra-data.js',()=>window.SEDRA_DATA)]).then(([api,data])=>api.create(data)).catch(e=>{syCardsP=null;throw e;}));}
  async function canOpenCard(kind,key){
    try{
      if(kind==='syriac')return (await loadSyriacCards()).lookup(key).length>0;
      if(kind==='hebrew')return !!window.Forms.model(await loadForms(),key)?.total;
      if(kind==='greek')return !!window.GMorph.model(await host.loadGM(),key)?.total;
      if(kind==='targum')return !!window.TargumForms.model(await loadTForms(),key)?.total;
    }catch{}return false;
  }
  async function openTextCard(word,current=()=>true){
    if(/[\u0710-\u072f]/u.test(word)&&await canOpenCard('syriac',word)&&current()){openSForms(word);return true;}
    if(/[\u05d0-\u05ea]/u.test(word)){const ids=host.lemIdsFor(word)||[];if(ids.length===1&&await canOpenCard('hebrew',ids[0])&&current()){openForms(ids[0],{word},'card');return true;}}
    if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(word)){try{const D=await host.loadGM(),ids=window.GMorph.dictionaryLemmas(D,word);if(ids.length===1&&await canOpenCard('greek',ids[0])&&current()){openGForms(ids[0],null,'card');return true;}}catch{}}
    return false;
  }
  async function openSForms(query,info={},tab='card',rest){
    info={...info,syriac:true,query};
    const key='sy:'+(info.id||query);
    fmHistOpen(false,key,info,tab,rest);
    const token=++wcToken,p=host.$('#formsPanel');fmCur=null;fmTrData=null;fmRest=null;
    p.hidden=false;fmShowTab(tab);host.$('#fmHead').textContent=query;
    host.$('#wcBody').innerHTML=host.$('#fmBody').innerHTML=`<p class="muted">${host.esc(I18N.t('Lädt …'))}</p>`;
    try{
      const model=await loadSyriacCards();if(token!==wcToken||p.hidden)return;
      const ids=model.lookup(query),id=info.id&&window.SEDRA_DATA.lexemes[info.id]?String(info.id):ids.length===1?ids[0]:null;
      const out=model.render(id,query,host.esc,s=>I18N.t(s));
      fmCur={syriac:true,greek:false,lemma:key,lem:[query],model,id,query};
      fmShowTab();
      host.$('#fmHead').innerHTML=out.head+`<button type="button" class="wdict" data-q="${host.esc(query)}"${id?` data-sedra-id="${id}"`:''}>${host.esc(I18N.t('Im Wörterbuch nachschlagen'))}</button>`;
      host.$('#wcBody').innerHTML=(info.apparatusSource?`<p class="sc-apparatus-source muted"><bdi lang="syr" dir="rtl">${host.esc(info.apparatusSource.form)}</bdi> · ${host.esc(I18N.t('Peschitta-Zählung'))}: ${host.esc(info.apparatusSource.book)} ${host.esc(info.apparatusSource.ref)}${info.apparatusSource.ref!==info.apparatusSource.mtRef?' · '+host.esc(I18N.t('MT-Zählung'))+': '+host.esc(info.apparatusSource.mtRef):''}</p>`:'')+out.card+`<section class="wcSec" id="wcDict"><h4>${host.esc(I18N.t('Wörterbücher'))}</h4><p class="muted">${host.esc(I18N.t('Lädt …'))}</p></section>`;host.$('#fmBody').innerHTML=out.forms;
      host.$('#wcBody').insertAdjacentHTML('beforeend',`<section class="wcSec" id="wcSyriacMentions"><h4>${host.esc(I18N.t('Syrische Belege in anderen Wörterbüchern'))}</h4><p class="muted">${host.esc(I18N.t('Lädt …'))}</p></section>`);
      wcSyriacMentions(token);
      wcDicts(token);
      if(rest)fmRestBase(rest);else p.scrollTop=0;
    }catch{if(token===wcToken)host.$('#wcBody').innerHTML=host.$('#fmBody').innerHTML=`<p class="muted">${host.esc(I18N.t('SEDRA konnte nicht geladen werden.'))}</p>`;}
  }
  function fmHomonyms(D,lemma,members){
    const LEM=window.OSHB_LEMMAS||{},ids=members?.map(member=>member.lemma)||host.lemIdsFor(LEM[lemma]?.[0]||'');
    const entries=ids.map(id=>({id,lem:LEM[id],total:window.Forms.model(D,id)?.total||0})).filter(e=>e.lem&&e.total).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id));
    if(entries.length<2)return '';
    return `<span class="fmHomonyms" role="group" aria-label="${host.esc(I18N.t(members ? 'Wortfamilie' : 'Einträge mit denselben Konsonanten:'))}">${entries.map(e=>`<button type="button" class="wcTrHm${e.id===lemma&&!members?' on':''}" data-lem="${host.esc(e.id)}" aria-pressed="${e.id===lemma&&!members}" title="${host.esc(I18N.t('Lexikoneintrag wechseln: {} Belege im Tanach, Strong {}.',e.total,e.id))}"><bdi class="fmLemma" lang="he" dir="rtl">${host.esc(e.lem[0])}</bdi> ${host.esc(I18N.lang==='de'&&e.lem[2]?e.lem[2]:e.lem[1])} <small>${e.total}</small></button>`).join('')}</span>`;
  }
  async function openForms(lemma, info, tab, rest) { // rest: Verlaufseintrag, dessen Zustand wiederhergestellt wird (Zurück/Vor)
    fmHistOpen(false, lemma, info, tab, rest);
    const p = host.$('#formsPanel'), body = host.$('#fmBody'), card = host.$('#wcBody'), LEM = window.OSHB_LEMMAS || {}, lem = LEM[lemma];
    const token = ++wcToken;
    fmRest = rest ? { h: rest, token } : null;
    p.hidden = false; fmCur = null; fmTrData = null; fmShowTab(tab || 'card');
    host.$('#fmHead').innerHTML = lem ? `<span class="fmLem" dir="rtl" lang="he">${host.esc(lem[0])}</span><span class="fmGloss">${host.esc(I18N.lang === 'de' && lem[2] ? lem[2] : lem[1])}</span>` : '';
    body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(I18N.t('Lädt …'))}</p>`;
    let D = null;
    try { D = await loadForms(); } catch { /* unten gemeldet */ }
    if (token !== wcToken) return;
    let family;
    if (rest?.family && D) {
      const roots = (await host.loadPassageStats().catch(() => null))?.roots;
      if (token !== wcToken) return;
      const selected = roots?.[lemma];
      if (selected) {
        const ids = Object.keys(roots).filter(id => roots[id].id === selected.id && roots[id].lang === selected.lang);
        family = { root: selected.root, ids };
      }
    }
    const mdl = D && (family ? window.Forms.familyModel(D, family.ids, s => I18N.t(s))
      : window.Forms.model(D, lemma, s => I18N.t(s)));
    if (!mdl) { body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(I18N.t('Zu diesem Wort sind keine Formen verzeichnet.'))}</p>`; return; }
    fmCur = { D, mdl, lemma, lem, family, F: window.Forms };
    fmShowTab();
    host.$('#fmHead .fmGloss')?.insertAdjacentHTML('afterend',fmHomonyms(D,lemma,mdl.members));
    const cur = info && info.m ? window.Forms.analyze(info.word, info.m, info.l) : null;
    host.$('#fmHead').insertAdjacentHTML('beforeend', `${lem ? `<button class="wdict" type="button" data-q="${host.esc(lem[0])}">Im Wörterbuch nachschlagen</button>` : ''}<span class="fmCnt">${host.esc(family ? I18N.t('{} Belege im Tanach · {} Lemmata', wcNum(mdl.total), wcNum(mdl.members.length)) : I18N.t('{} Belege im Tanach · {} verschiedene Formen · Strong {}', wcNum(mdl.total), wcNum(mdl.forms.length), lemma))}</span>`);
    const ST = await loadStems(); if (token !== wcToken) return;
    const gloss = (sk, id = lemma) => { const g = ST && ST[id] && ST[id][sk]; return g ? { text: I18N.lang === 'de' ? g[0] : g[1], u: !!g[2] } : null; };
    body.innerHTML = window.Forms.render(mdl, { esc: host.esc, t: s => I18N.t(s), current: family && cur ? { ...cur, lemma } : cur, gloss, lemmaLabel: wcLemmaLabel });
    wcRender(token, cur);
    fmTrInit(token);
    p.scrollTop = 0;
    if (rest) fmRestBase(rest);
    else if (fmTab === 'forms') { const c = body.querySelector('.fmF.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
  }
  // Paradigmen: unter jeder Form die Wiedergabe der gewählten Fassung (Zunz, Breuer …, Septuaginta, Targumim).
  // Deutsche Fassungen: gezählt an den Stellen genau dieser Form (interlin-ren.js, „Paradigma“ – Schlüssel und Form wie forms.js);
  // erst die Wiedergabe ohne Bindewort („und“, „da“, „so“ stehen für das ו und erscheinen grau), bei Gleichstand die Grundform statt einer Zufallsform,
  // bei schwacher Mehrheit (< 40 %) der Anteil dazu; die graue Zeile darunter nennt die Verteilung. Klick auf die Wiedergabe: alle Wiedergaben und Stellen.
  // Septuaginta/Targumim: häufigstes Lemma in den Versen der Form (über die Bestimmung zugeordnet).
  let fmTrData = null, fmTrPick = null; try { fmTrPick = localStorage.getItem('fmTrSrc') === 'off' ? 'off' : localStorage.getItem('wcTrSrc') || localStorage.getItem('fmTrSrc'); } catch { /* egal */ }
  function fmTrSelect(k) {
    fmTrPick=k;
    try { localStorage.setItem('fmTrSrc',k); if(k!=='off')localStorage.setItem('wcTrSrc',k); } catch { /* egal */ }
    fmTrApply();
  }
  async function fmTrInit(token) {
    const body = host.$('#fmBody'), lemma = fmCur && fmCur.lemma; if (!lemma) return;
    const S = await wcScopeSources(fmCur); if (token !== wcToken || !fmCur) return;
    fmTrData = S; body.querySelectorAll('.fmTrBar').forEach(x => x.remove());
    if (!S.keys.length) return;
    const bar = document.createElement('div'); bar.className = 'fmTrBar';
    body.prepend(bar); fmTrApply();
  }
  const fmTrCur = () => { const S = fmTrData; return !S ? 'off' : S.keys.includes(fmTrPick) ? fmTrPick : fmTrPick === 'off' ? 'off' : wcDefaultSource(S.keys); };
  const fmTrLab = (D, g) => { const L = D.labels[g]; return !L || L.other ? I18N.t('Andere') : L.forms[0]; };
  // Wiedergaben einer Form (Chip der Tabelle) in einer deutschen Fassung: { n, k, cores: [{ t, c, g, cj, cjn }], groups: [[g, n]], col }
  function fmTrEntryDe(ch, D) {
    const forms = fmCur.mdl.forms, cm = new Map(), gm = new Map(); let n = 0, k = 0, col = null, parts = 0;
    for (const i of String(ch.dataset.i).split(',')) {
      const f = forms[+i], e = f && (D.para[f.key] || {})[(f.pre ? '-' : f.waw ? '+' : '') + f.f]; if (!e) continue;
      const E = typeof e[0] === 'string' ? [1, 1, [[e[0], 1, e[1], e[2] || '', e[2] ? 1 : 0]]] : e; // Einzelbeleg kurz: [Wiedergabe, Gruppe, Bindewort?]
      parts++; n += E[0]; k += E[1]; col = parts === 1 ? E[4] || null : null;
      E[2].forEach(([t, c, g, cj, cjn]) => {
        const x = cm.get(t); cj = cj || ''; cjn = cjn || 0;
        if (!x) cm.set(t, { t, c, g, cj, cjn }); else { x.c += c; if (x.cj === cj) x.cjn += cjn; else if (cjn > x.cjn) { x.cj = cj; x.cjn = cjn; } }
      });
      (E[3] || E[2].map(x => [x[2], x[1]])).forEach(([g, m]) => gm.set(g, (gm.get(g) || 0) + m));
    }
    if (!n) return null;
    return { n, k: parts === 1 ? k : Math.max(cm.size, k), cores: [...cm.values()].sort((a, b) => b.c - a.c), groups: [...gm].sort((a, b) => b[1] - a[1]), col, de: true };
  }
  const fmTrPct = (c, n) => { const p = c / n * 100; return (p < 1 ? '< 1' : String(Math.round(p))) + ' %'; };
  // Wiedergabe mit grau abgesetztem Bindewort (steht für das ו), wenn es bei mindestens der Hälfte der Stellen steht
  const fmTrV = x => (x.cj && x.cjn * 2 >= x.c ? `<span class="cj">${host.esc(x.cj)}</span> ` : '') + `<bdi>${host.esc(x.t)}</bdi>`;
  // die beiden Zeilen unter der Form: [Hauptzeile, graue Zeile mit der Verteilung, Tooltip]
  function fmTrLines(E, D, name) {
    const cs = E.cores, top = cs[0], pc = c => `<small>${fmTrPct(c, E.n)}</small>`, lab = g => fmTrLab(D, g);
    const gl = E.groups.slice(0, 3).map(([g, m]) => `<bdi>${host.esc(lab(g))}</bdi> ${pc(m)}`).join(' · ');
    const tip = name + ': ' + E.groups.slice(0, 4).map(([g, m]) => lab(g) + ' ' + fmTrPct(m, E.n)).join(' · ') + (E.de ? ' – ' + I18N.t('Klick: alle Wiedergaben und Stellen') : '');
    if (E.k < 2 || cs.length < 2) return [fmTrV(top), '', tip];
    const tied = cs.filter(x => x.c === top.c);
    let l1, l2;
    if (tied.length > 1) { // Gleichstand: keine Zufallsform, sondern die Grundform(en) – die Formen selbst stehen darunter
      const gs = [...new Set(tied.map(x => x.g))];
      l1 = `<i class="gf">${gs.slice(0, 2).map(g => `<bdi>${host.esc(lab(g))}</bdi>`).join(' / ')}${gs.length > 2 ? ' …' : ''}</i> <small>${host.esc(I18N.t('{} versch.', wcNum(E.k)))}</small>`;
      l2 = E.de ? tied.slice(0, 3).map(fmTrV).join(' · ') + (E.k > 3 ? ' …' : '') : '';
      if (!E.de) {
        l1 = tied.slice(0, 2).map(x => `${fmTrV(x)} ${pc(x.c)}`).join(' · ');
        l2 = cs.slice(2, 4).map(x => `${fmTrV(x)} ${pc(x.c)}`).join(' · ') + (E.k > 4 ? ' …' : '');
      }
    } else if (top.c / E.n < 0.4) { // schwache Mehrheit: Anteil dazu, die zweite Wiedergabe nur, wenn sie für sich steht
      const two = cs[1] && (!cs[2] || cs[1].c > cs[2].c);
      l1 = `${fmTrV(top)} ${pc(top.c)}` + (two ? ` · ${fmTrV(cs[1])} ${pc(cs[1].c)}` : ' …');
      l2 = E.de ? gl + (E.groups.length === 1 ? ` · ${host.esc(I18N.t('{} versch.', wcNum(E.k)))}` : '') : cs.slice(two ? 2 : 1, two ? 4 : 3).map(x => `${fmTrV(x)} ${pc(x.c)}`).join(' · ');
    } else {
      l1 = fmTrV(top);
      l2 = pc(top.c) + cs.slice(1, 3).map(x => ` · ${fmTrV(x)} ${pc(x.c)}`).join('') + (E.k > 3 ? ' …' : '');
    }
    if (E.col) l2 = fmTrCol(E.col, E.n); // Formel: woran die häufigste Wiedergabe hängt (כֹּה אָמַר „so spricht …“)
    return [l1, l2, tip];
  }
  // Kollokation [Wort davor, Stellen danach, [Wiedergabe, n], [[Wiedergabe sonst, n] …]] -> „nach כֹּה (67 %): spricht 95 % · sonst: spricht 35 %, sprach 15 %“
  function fmTrCol(col, n) {
    const [w, pn, [cin, nin], out] = col, on = n - pn;
    return `${host.esc(I18N.t('nach'))} <bdi lang="he" class="cw">${host.esc(w)}</bdi> <small>(${fmTrPct(pn, n)})</small>: <bdi>${host.esc(cin)}</bdi> <small>${fmTrPct(nin, pn)}</small> · ${host.esc(I18N.t('sonst'))}: ${out.map(([t, m]) => `<bdi>${host.esc(t)}</bdi> <small>${fmTrPct(m, on)}</small>`).join(', ')}`;
  }
  function fmTrApply() {
    const body = host.$('#fmBody'), S = fmTrData, bar = body.querySelector('.fmTrBar'); if (!S || !bar || !fmCur) return;
    const cur = fmTrCur(), maxTot = Math.max(...S.keys.map(k => S.src[k].total));
    const few = k => { const n = S.src[k].total; return n < 5 || n < maxTot * 0.05; }; // Fassung mit wenig Belegen für dieses Wort (z. B. nur ein Buch): gekennzeichnet
    bar.innerHTML = `<span class="muted">${host.esc(I18N.t('Übersetzung unter den Formen:'))}</span>${S.keys.map(k => `<button type="button" class="wcTrSrc${k === cur ? ' on' : ''}${few(k) ? ' few' : ''}" data-fsrc="${k}"${few(k) ? ` title="${host.esc(I18N.t('nur wenige Belege für dieses Wort'))}"` : ''}>${wcTrPic(k)}${host.esc(I18N.t(WC_TR_LABEL[k]))} <small>${wcNum(S.src[k].total)}</small></button>`).join('')}<button type="button" class="wcTrSrc${cur === 'off' ? ' on' : ''}" data-fsrc="off">${host.esc(I18N.t('aus'))}</button>${cur !== 'off' && (S.src[cur].para || S.src[cur].lang === 'de') ? `<span class="fmTrN muted" dir="auto">${host.esc(I18N.t('Wort für Wort zugeordnet: Subjekt und Hilfsverb stehen oft bei einem anderen Wort. Grau: Bindewort für das ו. Klick auf eine Wiedergabe zeigt alle Wiedergaben und die Stellen.')).replace('ו', '<span lang="he">ו</span>')}</span>` : ''}`;
    host.hovApi && host.hovApi.hide(); // die Vers-Vorschau richtet sich nach der gewählten Fassung
    body.querySelectorAll('.fmTrL').forEach(x => x.remove());
    body.querySelectorAll('.fmTrRow').forEach(x => x.remove()); body.querySelectorAll('.fmF.trsel').forEach(x => x.classList.remove('sel', 'trsel'));
    body.classList.toggle('fmTrOn', cur !== 'off');
    if (cur === 'off') return;
    const source = S.src[cur], forms = fmCur.mdl.forms, BK = S.IR?.books || [];
    const others = new Map();
    const otherFor = D => {
      const aggregate = window.RenderingSearch.surfaceIndex(cur === 'Q' ? D.cells.map(c => ({ ...c, form: fmTrLab(D, c.g) })) : D.cells);
      const numOf = r => { const b = BK.indexOf(r.book); return b < 0 ? null : b * 1e6 + r.ch * 1000 + r.v; };
      return ch => {
        const codes = new Set(String(ch.dataset.i).split(',').map(i => forms[+i] && forms[+i].key.replace('*', '')).filter(Boolean));
        const rs = !fmCur.greek ? fmCur.F.refs(fmCur.D, fmCur.mdl, ch.dataset.i) : null;
        return aggregate(codes, rs ? new Set(rs.map(numOf)) : null);
      };
    };
    const name = I18N.t(WC_TR_LABEL[cur]);
    body.querySelectorAll('.fmF[data-i]').forEach(ch => {
      const lemma = forms[parseInt(ch.dataset.i, 10)]?.lemma;
      const D = source.byLemma ? source.byLemma[lemma] : source;
      if (!D) return;
      if (!D.para && !others.has(D)) others.set(D, otherFor(D));
      const E = D.para ? fmTrEntryDe(ch, D) : others.get(D)(ch); if (!E) return;
      const [l1, l2, tip] = fmTrLines(E, D, name);
      const sp = document.createElement('span'); sp.className = 'fmTrL' + (E.de ? ' can' : ''); sp.lang = D.lang; sp.dir = 'ltr'; // Wortformen sind durch bdi isoliert; Prozentangaben bleiben links-nach-rechts.
      sp.innerHTML = `<span class="l1">${l1}</span>${l2 ? `<span class="l2">${l2}</span>` : ''}`; sp.title = tip;
      ch.appendChild(sp);
    });
  }
  // Klick auf die Wiedergabe unter einer Form: alle Wiedergaben dieser Form (mit Anteil) und die Stellen mit hebräischem Wort und deutschem Text – als Zeile unter der Tabellenzeile
  function fmTrRefs(chip, lim = 30) {
    const S = fmTrData, cur = fmTrCur(), source = S?.src[cur], { mdl } = fmCur;
    const lemma = mdl.forms[parseInt(chip.dataset.i, 10)]?.lemma || fmCur.lemma;
    const D = source?.byLemma ? source.byLemma[lemma] : source;
    const E = D?.para && fmTrEntryDe(chip, D); if (!E) return;
    const forms = mdl.forms, rs = fmCur.F.refs(fmCur.D, mdl, chip.dataset.i);
    const mine = new Set(String(chip.dataset.i).split(',').map(i => forms[+i]).filter(Boolean).map(f => f.key + '|' + (f.pre ? '-' : f.waw ? '+' : '') + f.f));
    const part = rs.slice(0, lim), refs = part.map(r => r.book + ' ' + r.ch + ':' + r.v), ready = host.ilHas(refs) && refs.every(r => wcVerseWords.has(r));
    const tr = document.createElement('tr'); tr.className = 'fmRefRow fmTrRow';
    if (!ready) Promise.all([host.loadIL(host.ilBooksOf(refs)), wcTrCtxLoad(refs)]).then(() => { if (tr.isConnected && chip.classList.contains('trsel') && window.INTERLIN) { tr.remove(); fmTrRefs(chip, lim); } }, () => {});
    const rows = E.cores.map(x => `<span class="t" lang="de">${fmTrV(x)}</span><span class="b"><i style="width:${(x.c / E.n * 100).toFixed(1)}%"></i></span><small class="n">${wcNum(x.c)}</small><small class="p">${fmTrPct(x.c, E.n)}</small>`).join('');
    const restN = E.n - E.cores.reduce((a, x) => a + x.c, 0);
    const more = restN > 0 ? `<span class="t muted">${host.esc(I18N.t('{} weitere Wiedergaben', wcNum(E.k - E.cores.length)))}</span><span class="b"><i class="o" style="width:${(restN / E.n * 100).toFixed(1)}%"></i></span><small class="n">${wcNum(restN)}</small><small class="p">${fmTrPct(restN, E.n)}</small>` : '';
    const grp = E.k > 1 ? `<div class="fmTrG"><span class="muted">${host.esc(I18N.t('Nach Grundform:'))}</span> ${E.groups.map(([g, m]) => `<span class="fm" lang="de">${host.esc(fmTrLab(D, g))} <small>${fmTrPct(m, E.n)}</small></span>`).join(' · ')}${E.groups.reduce((a, x) => a + x[1], 0) < E.n ? ' …' : ''}</div>` : '';
    const col = E.col ? `<div class="fmTrG">${fmTrCol(E.col, E.n)}</div>` : '';
    let lines = '', lb = null;
    if (ready) part.forEach((r, j) => {
      const ref = refs[j], ws = wcVerseWords.get(ref) || [], occ = new Map(wcTrOcc(cur, ref, lemma).map(o => [o.i, o]));
      if (r.book !== lb) { lines += `<div class="bk">${host.esc(fmBook(r.book))}</div>`; lb = r.book; }
      const cv = r.ch + (I18N.lang === 'de' ? ',' : ':') + r.v; let any = false;
      ws.forEach((w, k) => {
        if (w.lem !== lemma || !mine.has(w.fk + '|' + w.fr)) return; any = true; const o = occ.get(k + 1);
        lines += `<div class="ln"><a data-ref="${host.esc(ref)}">${cv}</a><span class="he" lang="he" dir="rtl">${host.esc(w.he)}</span><span class="de" lang="de">${o && o.de ? host.esc(o.de) : `<span class="muted">${host.esc(I18N.t('(mit anderen Wörtern zusammen übersetzt)'))}</span>`}</span></div>`;
      });
      if (!any) lines += `<div class="ln"><a data-ref="${host.esc(ref)}">${cv}</a><span class="he"></span><span class="de"></span></div>`;
    });
    else lines = `<p class="muted">${host.esc(I18N.t('Lädt …'))}</p>`;
    const rest = rs.length - part.length, STEP = 300;
    const moreB = ready && rest > 0 ? `<div class="mr"><button type="button" class="fmTrMore" dir="auto" data-to="${lim + Math.min(rest, STEP)}">${host.esc(rest <= STEP ? I18N.t('alle {} Verse zeigen', rs.length.toLocaleString(I18N.loc)) : I18N.t('weitere {} Stellen zeigen', wcNum(STEP)))}</button></div>` : '';
    tr.innerHTML = `<td colspan="99"><div class="fmRH"><span dir="rtl" lang="he">${host.esc(chip.querySelector('span').textContent)}</span><span class="muted">${host.esc(I18N.t(WC_TR_LABEL[cur]))} · ${host.esc(I18N.t('{} Stellen mit eigener Wiedergabe · {} verschiedene', wcNum(E.n), wcNum(E.k)))}</span><button type="button" class="fmRX" title="${host.esc(I18N.t('Schließen'))}">✕</button></div><div class="fmTrD">${rows}${more}</div>${grp}${col}<div class="fmRL wcTrCx">${lines}${moreB}</div></td>`;
    chip.closest('tr').after(tr);
  }
  host.$('#fmBody').addEventListener('click', e => { const b = e.target.closest('.fmTrBar [data-fsrc]'); if (!b) return; e.stopPropagation(); const k=b.dataset.fsrc,S=wcTrLive(); if(k!=='off'&&S&&S.src[k])fmStep(()=>{S.pick=false;wcTrShow(k,false);});else fmTrSelect(k); }, true);
  // Griechisch (Septuaginta): dieselbe Karte aus dem Index lxx-morph.js; info = { form, key } der angeklickten Form
  async function openGForms(lemma, info, tab, rest) {
    fmHistOpen(true, lemma, info, tab, rest);
    const p = host.$('#formsPanel'), body = host.$('#fmBody'), card = host.$('#wcBody'), GM = window.GMorph, t = s => I18N.t(s);
    const token = ++wcToken;
    fmRest = null;
    p.hidden = false; fmCur = null; fmShowTab(tab || 'card');
    host.$('#fmHead').innerHTML = `<span class="fmLem fmGr" lang="grc">${host.esc(lemma)}</span>`;
    body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(t('Lädt …'))}</p>`;
    let D = null;
    try { D = await host.loadGM(); } catch { /* unten gemeldet */ }
    if (token !== wcToken) return;
    const li = D && GM.lemmaInfo(D, lemma), mdl = li && GM.model(D, lemma, t);
    if (!mdl || !mdl.total) { body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(t('Zu diesem Wort sind keine Formen verzeichnet.'))}</p>`; return; }
    fmCur = { D, mdl, lemma, lem: [lemma, li.gloss], F: GM, greek: true };
    fmShowTab();
    const cur = info && info.form ? { form: info.form, key: info.key } : null;
    const kinds = GM.topForms(mdl, 1).kinds, pos = [...new Set(mdl.forms.filter(f => f.n).map(f => GM.describe(f.key, t).pos))].join(', ');
    host.$('#fmHead').innerHTML = `<span class="fmLem fmGr" lang="grc">${host.esc(lemma)}</span><span class="fmGloss">${host.esc(li.gloss)}</span><button class="wdict" type="button" data-q="${host.esc(lemma)}" hidden>Im Wörterbuch nachschlagen</button><span class="fmCnt">${host.esc(I18N.t('{} Belege in der Septuaginta · {} verschiedene Formen · {}', mdl.total.toLocaleString(I18N.loc), kinds.toLocaleString(I18N.loc), pos))}</span>`;
    body.innerHTML = GM.render(mdl, { esc: host.esc, t, current: cur });
    wcRender(token, cur);
    p.scrollTop = 0;
    if (rest) fmRestBase(rest);
    else if (fmTab === 'forms') { const c = body.querySelector('.fmF.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
  }
  let targumFormsP = null;
  const loadTForms = () => targumFormsP || (targumFormsP = lazyScript('targum-forms.js', () => window.TARGUM_FORMS).catch(e => { targumFormsP = null; throw e; }));
  async function openTForms(id, info, tab, rest) {
    const lemma = 'tg:' + id;
    fmHistOpen(false, lemma, { ...(info || {}), targum: true }, tab, rest);
    const token = ++wcToken, p = host.$('#formsPanel'), body = host.$('#fmBody'), card = host.$('#wcBody');
    fmRest = null; fmCur = null; p.hidden = false; fmShowTab(tab || 'card');
    host.$('#fmHead').innerHTML = ''; body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(I18N.t('Lädt …'))}</p>`;
    let D; try { D = await loadTForms(); } catch { /* unten gemeldet */ }
    if (token !== wcToken) return;
    const F = window.TargumForms, mdl = D && F.model(D, id);
    if (!mdl || !mdl.total) { body.innerHTML = card.innerHTML = `<p class="muted">${host.esc(I18N.t('Zu diesem Wort sind keine Formen verzeichnet.'))}</p>`; return; }
    const lex = D.L[id][0];
    fmCur = { D, mdl, lemma, lem: [lex[0], lex[2]], F, targum: id };
    fmShowTab();
    host.$('#fmHead').innerHTML = `<span class="fmLem" lang="arc" dir="rtl">${host.esc(lex[0])}</span><span class="fmGloss">${host.esc(lex[2])}</span><button type="button" class="wdict" data-q="${host.esc(lex[0])}">Im Wörterbuch nachschlagen</button><span class="fmCnt">${host.esc(I18N.t('{} Belege in den Targumim · {} verschiedene Formen', wcNum(mdl.total), wcNum(F.topForms(mdl).kinds)))}</span>`;
    body.innerHTML = F.render(mdl, { esc: host.esc, t: s => I18N.t(s), current: info });
    wcRender(token, info); p.scrollTop = 0;
    if (rest) fmRestBase(rest);
  }
  const TANAKH_PARTS = [['Tora', 5], ['Propheten', 21], ['Schriften', 13]];
  const wcNum = n => n.toLocaleString(I18N.loc);
  function wcRender(token, cur) {
    const { D, mdl, F, greek, targum, family } = fmCur, card = host.$('#wcBody');
    const ds = F.dist(D, mdl), max = Math.max(1, ...ds.map(x => x.n)), nb = ds.filter(x => x.n).length;
    // Verteilung: ein Balken je Buch (Reihenfolge des Tanach, griechisch dazu die Apokryphen), in Gruppen; Höhe = Zahl der Belege
    let k = 0;
    const groups = (greek || targum ? D.groups : TANAKH_PARTS).map(([name, cnt]) => { const part = ds.slice(k, k + cnt); k += cnt; return { name, part }; });
    const bar = x => `<button type="button" class="wcBar${x.n ? '' : ' zero'}" data-b="${host.esc(x.book)}" style="--h:${(x.n / max * 100).toFixed(1)}" aria-label="${host.esc(fmBook(x.book) + ': ' + x.n)}"><i></i></button>`;
    const top = ds.filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 4);
    const tf = F.topForms(mdl, 8);
    const chip = x => `<button type="button" class="fmF${x.pre ? ' pre' : ''}${cur && (!x.lemma || x.lemma === fmCur.lemma) && cur.form === x.f ? ' cur' : ''}" data-i="${x.i}"><span lang="${targum ? 'arc' : greek ? 'grc' : 'he'}" dir="${greek ? 'ltr' : 'rtl'}">${host.esc(x.f)}</span><small>${wcNum(x.n)}</small>${x.lemma ? `<small class="wcFormLemma" dir="auto">${host.esc(wcLemmaLabel(x.lemma))}</small>` : ''}</button>`;
    card.innerHTML = `<div class="wcAct"><button type="button" class="wcAll" title="${host.esc(I18N.t(family ? 'Alle Stellen der Wortfamilie' : targum ? 'Alle Stellen dieses Wortes' : greek ? 'Startet die Suche nach diesem Wort in der Septuaginta (Treffer „Alle Formen“)' : 'Startet die Suche nach diesem Wort im hebräischen Tanach (Treffer „Alle Formen“)'))}">🔎 ${host.esc(I18N.t(family ? 'Alle Stellen der Wortfamilie' : 'Alle Stellen dieses Wortes'))} <small>${wcNum(mdl.total)}</small></button></div>
      <section class="wcSec"><h4>${host.esc(I18N.t(targum ? 'Verteilung in den Targumim' : greek ? 'Verteilung in der Septuaginta' : 'Verteilung im Tanach'))} <small>${host.esc(greek || targum ? I18N.t('{} Belege in {} von {} Büchern', wcNum(mdl.total), nb, ds.length) : I18N.t('{} Belege in {} von 39 Büchern', wcNum(mdl.total), nb))}</small></h4>
        <div class="wcChart"><div class="wcPlot"><span class="wcMax">${wcNum(max)}</span>${groups.map(g => `<div class="wcGrp" style="flex:${g.part.length}"><div class="wcBars">${g.part.map(bar).join('')}</div><div class="wcAx">${host.esc(I18N.t(g.name))}</div></div>`).join('')}</div><div class="wcTip" hidden></div></div>
        <div class="wcTop"><span class="muted">${host.esc(I18N.t('Am häufigsten:'))}</span> ${top.map(x => `<a data-b="${host.esc(x.book)}">${host.esc(fmBook(x.book))}</a> <small>${wcNum(x.n)}</small>`).join(' · ')} <span class="muted wcHint">· ${host.esc(I18N.t('Klick auf einen Balken zeigt die Stellen des Buches'))}</span></div>
        <div class="wcRefs" id="wcBookRefs"></div></section>
      <section class="wcSec"><h4>${host.esc(I18N.t('Häufigste Formen'))} <button type="button" class="wcLink" data-go="forms">${host.esc(I18N.t('alle {} Formen', wcNum(tf.kinds)))} →</button></h4>
        <div class="wcForms" dir="${greek ? 'ltr' : 'rtl'}">${tf.list.map(chip).join('')}</div><div class="wcRefs" id="wcFormRefs"></div></section>
      <section class="wcSec" id="wcTr" hidden></section>
      <section class="wcSec" id="wcDict"><h4>${host.esc(I18N.t('Wörterbücher'))}</h4><p class="muted">${host.esc(I18N.t('Lädt …'))}</p></section>
      <section class="wcSec" id="wcLxx" hidden></section>
      <section class="wcSec" id="wcTgR" hidden></section>
      <section class="wcSec" id="wcPsR" hidden></section>
      <section class="wcSec" id="wcQum" hidden></section>
      <section class="wcSec" id="wcTg" hidden></section>
      <p class="fmNote">${host.esc(I18N.t(targum ? 'Belegte Wortformen und Bestimmungen aus dem ETCBC Targum Corpus (CC BY-NC 4.0): Onkelos, Neofiti 1 und Pseudo-Jonathan zum Pentateuch. Die Fassungen zählen getrennt; gleich geschriebene Lexeme bleiben getrennt.' : greek ? 'Belege und Formen nach der Septuaginta-Morphologie lxx-morph (Seth Kushniryk, CC BY 4.0), den Wörtern der mitgelieferten Septuaginta-Fassungen zugeordnet (Tanach: CATSS-Text in hebräischer Zählung; deuterokanonische Bücher: Rahlfs). Richter (A und B), Daniel (Septuaginta und Theodotion), Tobit, Susanna und Bel stehen in zwei Fassungen und zählen je für sich; Kurzbedeutungen englisch (STEPBible).' : 'Belege und Formen nach dem Westminster Leningrad Codex (OSHB); gezählt sind vokalisierte Wörter mit diesem Lemma. Die Suche „Alle Stellen“ geht über das Schriftbild des Lemmas und kann gleich geschriebene Wörter mitfinden.'))}</p>`;
    if (!greek && !targum) {
      const lemma = fmCur.lemma;
      host.loadPassageStats().then(index => {
        const root = index?.roots?.[lemma]?.root;
        if (token !== wcToken || !root) return;
        const e = host.esc;
        host.$('#fmHead').insertAdjacentHTML('beforeend', `<div class="wcScope" role="group" aria-label="${e(I18N.t('Suchumfang'))}">
          <button type="button" data-wc-scope="lemma" aria-pressed="${!family}">${e(I18N.t('Dieses Lemma'))}</button>
          <button type="button" data-wc-scope="family" aria-pressed="${!!family}">${e(I18N.t('Wortfamilie'))} <bdi lang="he">${e(root)}</bdi></button></div>`);
        if (!family) card.querySelector('.wcAct')?.insertAdjacentHTML('beforeend',
          `<button type="button" class="wcRoot" data-root="${host.esc(root)}">${host.esc(I18N.t('Nach Wurzel suchen'))} <bdi lang="he">${host.esc(root)}</bdi></button>`);
      }, () => {});
    }
    wcDicts(token);
    if (greek) wcHeb(token);
    else if (!targum) {
      wcTrans(token);
      if (!family) { wcLxx(token); wcTgRen(token); wcPeshittaRen(token); wcQumran(token); wcTargum(token); }
    }
  }
  // Belegstellen als Zeilen je Buch (wie in der Formentabelle)
  function wcRefLemmaAttrs(ref) {
    if (ref.lemmas.length === 1) return ` data-same-lemma="${host.esc(ref.lemmas[0][0])}"`;
    return '';
  }
  function wcRefLemmas(ref) {
    return ` <small dir="auto">${ref.lemmas.map(([id, n]) =>
      host.esc(wcLemmaLabel(id) + (n > 1 ? ' ×' + wcNum(n) : ''))).join(' · ')}</small>`;
  }
  function wcRefList(rs, head, all) {
    const CAP = 300, shown = all ? rs : rs.slice(0, CAP), n = rs.reduce((s, r) => s + r.n, 0);
    const lines = []; let lb = null;
    for (const r of shown) {
      if (r.book !== lb) { lines.push(`<b>${host.esc(fmBook(r.book))}</b> `); lb = r.book; } else lines[lines.length - 1] += ' ';
      lines[lines.length - 1] += `<span class="fmR"><a data-ref="${host.esc((r.title || r.book) + ' ' + r.ch + ':' + r.v)}"${r.vt ? ` data-gvt="${host.esc(r.vt)}"` : ''}${r.lemmas ? wcRefLemmaAttrs(r) : ''}>${r.ch}${I18N.lang === 'de' ? ',' : ':'}${r.v}</a>${r.n > 1 ? `<small>×${r.n}</small>` : ''}${r.lemmas ? wcRefLemmas(r) : ''}</span>`;
    }
    const more = rs.length > shown.length ? `<div><button type="button" class="fmAll">${host.esc(I18N.t('alle {} Verse zeigen', wcNum(rs.length)))}</button></div>` : '';
    return `<div class="wcRefBox"><div class="fmRH">${head}<span class="muted">${host.esc(I18N.t('{}× in {} Versen', wcNum(n), wcNum(rs.length)))}</span><button type="button" class="fmRX" title="Schließen">✕</button></div><div class="fmRL">${lines.map(l => `<div>${l}</div>`).join('')}${more}</div></div>`;
  }
  function wcBookRefs(book, all) {
    const { D, mdl } = fmCur, box = host.$('#wcBookRefs');
    host.$$('#wcBody .wcBar').forEach(b => b.classList.toggle('sel', b.dataset.b === book));
    if (!book) { box.innerHTML = ''; box.dataset.b = ''; return; }
    box.dataset.b = book; box.innerHTML = wcRefList(book === '*' && fmCur.targum ? fmCur.F.refs(D, mdl, mdl.forms.map((_, i) => i).join(',')) : fmCur.F.refsIn(D, mdl, book), `<b>${host.esc(book === '*' ? I18N.t('Alle Stellen dieses Wortes') : fmBook(book))}</b>`, all);
  }
  function wcFormRefs(chip, all) {
    const { D, mdl } = fmCur, box = host.$('#wcFormRefs');
    host.$$('#wcBody .wcForms .fmF').forEach(c => c.classList.toggle('sel', c === chip));
    if (!chip) { box.innerHTML = ''; return; }
    box.innerHTML = wcRefList(fmCur.F.refs(D, mdl, chip.dataset.i), `<span dir="${fmCur.greek ? 'ltr' : 'rtl'}" lang="${fmCur.targum ? 'arc' : fmCur.greek ? 'grc' : 'he'}">${host.esc(chip.querySelector('span').textContent)}</span>`, all);
  }
  // Wörterbücher: Einträge zum Lemma aus den eingebundenen Wörterbüchern (dieselbe Suche wie „Im Wörterbuch nachschlagen“), je Wörterbuch die ersten Treffer
  async function wcDicts(token) {
    const { lem, greek, targum, syriac, id } = fmCur; const box = () => host.$('#wcDict');
    const done = html => { if (token === wcToken && box()) box().innerHTML = `<h4>${host.esc(I18N.t('Wörterbücher'))}</h4>` + html; };
    if (!lem) return done(`<p class="muted">${host.esc(I18N.t('Kein Eintrag in den Wörterbüchern.'))}</p>`);
    let r = null;
    try { r = await host.O.dictLookup(lem[0], host.dictSel && host.dictSel.length ? host.dictSel : null, false); } catch { r = null; }
    if (token !== wcToken) return;
    let res = (r && r.results) || [];
    if (targum && (!host.dictSel || !host.dictSel.length || host.dictSel.includes('9ce7ea6c00f1'))) {
      // Levy darf nicht durch die Treffergrenze anderer Wörterbücher verdrängt werden.
      try {
        const levy = await host.O.dictLookup(lem[0], '9ce7ea6c00f1', false);
        if (token !== wcToken) return;
        const seen = new Set(res.map(x => x.dictId + ':' + x.k));
        res = res.concat(((levy && levy.results) || []).filter(x => !seen.has(x.dictId + ':' + x.k)));
      } catch { /* übrige Wörterbücher weiterhin zeigen */ }
    }
    if(syriac){
      // A SEDRA spelling can denote unrelated lexemes. Preview only the chosen entry.
      if(id)res=res.filter(x=>x.dictId!=='7fab63c14df2'||new RegExp('data-sedra-id="'+id+'"').test(x.html||''));
      const fold=window.SyriacCards.norm,want=new Set([lem[0],id&&window.SEDRA_DATA.lexemes[id]?.form].filter(Boolean).map(fold));
      const exact=res.filter(x=>x.dictId==='7fab63c14df2'||String(x.head).split(/[·,;/]/).some(h=>want.has(fold(h))));
      if(exact.length)res=exact;
    }else { // für die Wortkarte nur Stichwörter mit genau diesem Schriftbild (falls es welche gibt)
      const cons = greek ? t => window.GMorph.fold(t) : targum ? window.TargumForms.fold : t => String(t).replace(/[^\u05D0-\u05EA]/g, ''), want = cons(lem[0]);
      const exact = res.filter(x => String(x.head).split(/[·,;/]/).some(h => cons(h) === want));
      if (exact.length) res = exact;
    }
    if (!res.length) return done(`<p class="muted">${host.esc(I18N.t('Kein Eintrag in den Wörterbüchern.'))}</p>`);
    if (greek) { const b = host.$('#fmHead .wdict'); if (b) b.hidden = false; } // „Im Wörterbuch nachschlagen“ nur, wenn ein eingebundenes Wörterbuch das griechische Wort kennt
    const by = new Map(); for (const x of res) { if (!by.has(x.dictId)) by.set(x.dictId, { id: x.dictId, name: x.dict, xs: [] }); by.get(x.dictId).xs.push(x); }
    const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const snip = h => { const t = String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > 190 ? t.slice(0, 190).replace(/\s+\S*$/, '') + ' …' : t; };
    const entry = x => `<details class="wcDE"><summary><b dir="auto"${syriac?' lang="syr"':''}>${host.esc(x.head)}</b> <span class="snip" dir="ltr">${host.heFix(snip(x.html))}</span></summary><div class="dbody" dir="ltr">${host.heFix(/Gesenius/.test(x.dict || '') && window.GAbk ? window.GAbk.mark(x.html) : window.GreekAbbreviations?window.GreekAbbreviations.mark(x.html,x.dict):x.html)}</div></details>`;
    done([...by.values()].map(d => {
      const pic = host.portraitOf(d.name);
      return `<div class="wcD" style="--dh:${hue(d.id)}"><div class="wcDH"><span>${pic ? `<img class="vpic" src="portraits/${encodeURIComponent(pic.img)}" alt="" data-title="${host.esc(pic.name || '')}" loading="lazy">` : ''}${host.esc(d.name)}</span><button type="button" class="wcDGo" data-id="${host.esc(d.id)}" data-name="${host.esc(d.name)}" title="${host.esc(I18N.t('Im Reiter „Wörterbuch“ öffnen'))}">↗ ${host.esc(I18N.t('Wörterbuch'))}</button></div>${d.xs.slice(0, 3).map(entry).join('')}${d.xs.length > 3 ? `<div class="wcDMore" hidden>${d.xs.slice(3).map(entry).join('')}</div><button type="button" class="fmAll wcDMoreB" data-n="${d.xs.length - 3}">${host.esc(I18N.t('+ {} weitere', d.xs.length - 3))}</button>` : ''}</div>`;
    }).join(''));
  }
  async function wcSyriacMentions(token){
    const {query,id}=fmCur,box=()=>host.$('#wcSyriacMentions');
    const title=`<h4>${host.esc(I18N.t('Syrische Belege in anderen Wörterbüchern'))}</h4><p class="muted">${host.esc(I18N.t('Artikel, die diese syrische Schreibung erwähnen; die Zuordnung der Bedeutung bleibt beim jeweiligen Wörterbuch.'))}</p>`;
    const done=html=>{if(token===wcToken&&box())box().innerHTML=title+html;};
    const queries=[...new Set([query,id&&window.SEDRA_DATA.lexemes[id]?.form].filter(Boolean))];
    let answer;try{answer=await host.O.dictSyriacMentions(queries,host.dictSel?.length?host.dictSel:null);}catch{answer={error:true};}
    if(token!==wcToken)return;
    if(answer.error)return done(`<p class="muted">${host.esc(I18N.t('Wörterbuchbelege konnten nicht geladen werden.'))}</p>`);
    if(!answer.results?.length)return done(`<p class="muted">${host.esc(I18N.t('Keine weiteren syrischen Belege in den ausgewählten Wörterbüchern.'))}</p>`);
    const fold=window.SyriacCards.norm,by=new Map();
    for(const x of answer.results){if(!by.has(x.dictId))by.set(x.dictId,{name:x.dict,xs:[]});by.get(x.dictId).xs.push(x);}
    const entry=x=>{
      const plain=x.html.replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|nbsp);/g,e=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&nbsp;':' '}[e])).replace(/\s+/g,' ').trim(),matches=[...plain.matchAll(/[\u0710-\u072f][\u0710-\u074f\u0300-\u036f\u200c\u200d]*/gu)],at=matches.find(m=>x.matched.includes(fold(m[0])))?.index||0,start=Math.max(0,at-45);
      const text=(start?'… ':'')+plain.slice(start,start+190)+(plain.length>start+190?' …':'');
      const snip=host.heFix(host.esc(text)).replace(/[\u0710-\u074f]+/gu,'<bdi lang="syr" dir="rtl">$&</bdi>');
      const html=host.heFix(/Gesenius/.test(x.dict)&&window.GAbk?window.GAbk.mark(x.html):window.GreekAbbreviations?window.GreekAbbreviations.mark(x.html,x.dict):x.html);
      return `<details class="wcDE"><summary><b dir="auto">${host.esc(x.head)}</b> <span class="snip" dir="ltr">${snip}</span></summary><button type="button" class="wcDGo wcSyDictGo" data-id="${host.esc(x.dictId)}" data-name="${host.esc(x.dict)}" data-q="${host.esc(x.query)}">↗ ${host.esc(I18N.t('Wörterbuch'))}</button><div class="dbody" dir="ltr">${html}</div></details>`;
    };
    done([...by].map(([id,d])=>`<div class="wcD" data-sy-dict="${host.esc(id)}"><div class="wcDH"><span>${host.esc(d.name)}</span><small>${d.xs.length}</small></div>${d.xs.slice(0,3).map(entry).join('')}${d.xs.length>3?`<div class="wcDMore" hidden>${d.xs.slice(3).map(entry).join('')}</div><button type="button" class="fmAll wcDMoreB" data-n="${d.xs.length-3}">${host.esc(I18N.t('+ {} weitere',d.xs.length-3))}</button>`:''}</div>`).join(''));
  }
  // Septuaginta: häufigste griechische Lemmata für dieses hebräische Lemma (CATSS-Zuordnung + lxx-morph, Index oshb-lxx.js); Klick öffnet die griechische Wortkarte
  async function wcLxx(token) {
    const { lemma } = fmCur;
    const X = await loadLxx();
    if (token !== wcToken || !X || !window.Lxx) return;
    const r = window.Lxx.renderings(X, lemma), box = host.$('#wcLxx');
    if (!r || !r.list.length || !box) return;
    const mx = r.list[0].n;
    box.hidden = false;
    box.innerHTML = `<h4>${host.esc(I18N.t('Wiedergabe in der Septuaginta'))} <small>${host.esc(I18N.t('{} Zuordnungen · {} griechische Wörter', wcNum(r.total), wcNum(r.kinds)))}</small></h4>
      <div class="wcLx">${r.list.slice(0, 10).map(x => `<div class="wcLxR">${x.g.includes(' ') ? `<span class="g" lang="grc">${host.esc(x.g)}</span>` : `<button type="button" class="g wcGL" lang="grc" data-gl="${host.esc(x.g)}" title="${host.esc(I18N.t('Griechische Wortkarte öffnen'))}">${host.esc(x.g)}</button>`}<span class="b"><i style="width:${Math.max(2, x.n / mx * 100).toFixed(1)}%"></i></span><small>${wcNum(x.n)}</small></div>`).join('')}</div>
      <p class="muted wcLxN">${host.esc(I18N.t('Nach der Wort-für-Wort-Zuordnung von CATSS; die griechischen Wörter sind auf ihr Lemma zurückgeführt (lxx-morph), ohne Artikel und – wo das hebräische Wort Vorsilbe oder Suffix hat – ohne Präposition und Pronomen. Klick auf ein Wort öffnet seine Wortkarte.'))}</p>`;
  }
  // Übersetzungsstatistik („Wie wird das Wort übersetzt?“): Liste der Wiedergaben einer wortgenau zugeordneten Fassung, je Zeile ein Balken (Breite = Anteil) –
  // deutsch (interlin-ren.js: Zunz, Breuer, Philippson, Herxheimer; Gruppen nach deutscher Grundform, mit Formen und Stellen), griechisch (Septuaginta, oshb-lxx.js)
  // und aramäisch (Targumim, targum-ren.js). Zeilen der deutschen Fassungen lassen sich aufklappen (Formen mit Anzahl, Stellen mit hebräischer Form und deutschem Segment);
  // Wiedergaben mit nur einem Beleg stehen zusammen unter „Einzelbelege“. Gleich geschriebene Lemmata (Homonyme) lassen sich über eine eigene Zeile umschalten.
  let ilRenP = null, wcTrState = null;
  let lxxRenP = null, witnessRenP = null;
  const loadWitnessRen = () => witnessRenP || (witnessRenP = lazyScript('witness-ren.js', () => window.WITNESS_REN).catch(() => { witnessRenP = null; return null; }));
  const WC_TR_WITNESSES = { Samaritan: 'he', Peshitta: 'syr' };
  let wcTrMore = false; try { wcTrMore = localStorage.getItem('wcTrMore') === '1'; } catch { /* egal */ }
  let qRenP = null; // Lesarten der Qumran-Rollen je Lemma (tools/dss/ren.py)
  const loadQRen = () => qRenP || (qRenP = lazyScript('qumran-ren.js', () => window.QUMRAN_REN).catch(() => { qRenP = null; return null; }));
  const loadLxxRen = () => lxxRenP || (lxxRenP = lazyScript('lxx-ren.js', () => window.LXX_REN).catch(() => { lxxRenP = null; return null; }));
  const loadIlRen = () => ilRenP || (ilRenP = (async () => {
    const revision = host.ilRevision;
    const [built] = await Promise.all([lazyScript('interlin-ren.js', () => window.INTERLIN_REN), host.loadIL([])]);
    if (revision !== host.ilRevision) return loadIlRen();
    const all = built || { books: host.ilPrivateRen ? host.ilPrivateRen.books : [], tr: {} };
    all.tr = all.tr || {};
    delete all.tr.BuberRosenzweig;
    if (host.ilPrivateRen && JSON.stringify(all.books) === JSON.stringify(host.ilPrivateRen.books)) all.tr.BuberRosenzweig = host.ilPrivateRen.tr.BuberRosenzweig;
    window.INTERLIN_REN = all;
    return all;
  })().catch(() => { ilRenP = null; return null; }));
  const WC_TR_DE = new Set(['Mendelssohn', 'BuberRosenzweig', 'Zunz', 'Breuer', 'Philippson', 'Herxheimer', 'Goldschmidt', 'Hirsch', 'JuliusHirsch', 'Wolf']);
  const WC_TR_LABEL = { Mendelssohn: 'Mendelssohn (1815)', Wolf: 'Wolf', BuberRosenzweig: 'Buber/Rosenzweig', Zunz: 'Zunz (1838)', Breuer: 'Breuer', Philippson: 'Philippson', Herxheimer: 'Herxheimer', Goldschmidt: 'Goldschmidt (1921)', Hirsch: 'S. R. Hirsch', JuliusHirsch: 'Julius Hirsch', LXX: 'Septuaginta', O: 'Onkelos', PJ: 'Pseudo-Jonathan', N: 'Neofiti 1', Q: 'Qumran-Rollen', Samaritan: 'Samaritanus', Peshitta: 'Peschitta' };
  // Porträt im Quell-Chip (wie in der Interlinear-Auswahl): Schlüssel der Fassung -> Name in portraits/index.js; fehlt das Bild, bleibt der Chip ohne
  // Vers-Vorschau in der Wortkarte: Text aus der dort gewählten Fassung (Tabelle: „Übersetzung unter den Formen“, Überblick: Quell-Chip der Übersetzungsstatistik);
  // der Versionstitel wird wie in der Interlinear-Ansicht über IL_VT erkannt. „aus“ oder keine Auswahl: wie überall (null)
  const WC_TR_VT = { O: host.IL_VT.Onkelos, PJ: host.IL_VT['Pseudo-Jonathan'], N: host.IL_VT.Neofiti, LXX: /^Septuaginta \(CATSS(?:, Judges A \(Codex Alexandrinus\))?\)$/, Q: /^Qumran-Rollen \(ETCBC DSS\)/, Peshitta:/^ETCBC Peshitta/, Samaritan:/^Samaritanischer Pentateuch/ };
  function wcDefaultSource(keys){const title=host.getBibleTranslation?.()||'';return keys.find(k=>(host.IL_VT[k]||WC_TR_VT[k])?.test(title))||keys[0];}
  const RTL = l => l === 'arc' || l === 'he' || l === 'syr';
  function wcHovPick(a) {
    if (fmCur && fmCur.targum && a.closest('.fmRL') && a.dataset.gvt) {
      return { vt: '^' + a.dataset.gvt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', rtl: true, label: 'Targum', targum: fmCur.targum };
    }
    if (fmCur && fmCur.greek && a.closest('.fmRL')) {
      const vt = a.dataset.gvt;
      return { vt: vt ? '^' + vt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' : '^Septuaginta', rtl: false, label: 'Septuaginta', greek: fmCur.lemma };
    }
    const k = a.closest('#fmBody') ? (fmTrData ? fmTrCur() : 'off') : a.closest('#wcBody') ? (wcTrLive() ? wcTrLive().cur : 'off') : 'off';
    const sameLemma=a.dataset.sameLemma;
    const lem = sameLemma || (fmCur && !fmCur.family && !fmCur.greek && !fmCur.targum ? fmCur.lemma : null); // das Wort der Wortkarte wird in der Vorschau markiert
    if (!k || k === 'off' || (fmCur && fmCur.greek)) return lem ? { lem } : null;
    const re = WC_TR_VT[k] || host.IL_VT[k] || new RegExp(String(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return { vt: re.source, rtl: RTL(WC_TR_WITNESSES[k]) || k === 'O' || k === 'PJ' || k === 'N', label: WC_TR_LABEL[k] || k, lem, targetForm:a.dataset.targetForm || '', targetPosition:Number(a.dataset.targetPosition)||null };
  }
  const WC_TR_PIC = { Mendelssohn: 'Mendelssohn', Wolf: 'Wolf, Das Buch Samuel', Zunz: 'Zunz', Breuer: 'Raphael Breuer', Philippson: 'Philippson', Herxheimer: 'Herxheimer', Goldschmidt: 'Goldschmidt', Hirsch: 'Samson Raphael Hirsch', JuliusHirsch: 'Julius Hirsch', LXX: 'Septuaginta', O: 'Targum Onkelos', PJ: 'Targum Pseudo-Jonathan', N: 'Targum Neofiti', Q: 'Qumran', Samaritan: 'Samaritan Pentateuch', Peshitta: 'Peshitta', BuberRosenzweig: 'Martin Buber gemeinsam mit Franz Rosenzweig' };
  host.$('#formsPanel').addEventListener('error',e=>{if(e.target.matches?.('img.wcTrPic'))e.target.remove();},true);
  const wcTrPic = k => { const pic = WC_TR_PIC[k] && host.portraitOf(WC_TR_PIC[k]); return pic ? `<img class="wcTrPic" src="portraits/${encodeURIComponent(pic.img)}" alt="" loading="lazy">` : ''; };
  // Stellen: Buch*1000000 + Kapitel*1000 + Vers als Differenzen (Basis 36) -> Zahlen
  function unB36(str) { let prev = 0; return String(str || '').split('.').filter(Boolean).map(x => (prev += parseInt(x, 36))); }
  // Bestimmung des hebräischen Worts -> Filtermerkmale (Binjan, Form, Person, Genus, Numerus, Status, Suffix)
  const WC_TR_DIMS = [['stem', 'Binjan'], ['tense', 'Form'], ['person', 'Person'], ['gender', 'Genus'], ['number', 'Numerus'], ['state', 'Status'], ['suffix', 'Suffix']];
  const WC_TR_MAIN = new Set(['stem', 'tense']); // immer sichtbar; die übrigen hinter „Weitere Merkmale“
  const wcFeatCache = new Map();
  function wcFeat(code, lemma) {
    if (wcFeatCache.has(code)) return wcFeatCache.get(code);
    let d = null; try { d = window.Morph && window.Morph.decode(code, lemma); } catch { d = null; }
    const seg = d && d.segs[d.main] || {}, f = {};
    if (seg.stem) f.stem = seg.stem;
    if (seg.tense) f.tense = seg.tense === 'P' ? 'Partizip passiv' : seg.tense;
    String(seg.info || '').split(', ').forEach(t => {
      if (/Pers\./.test(t)) f.person = t; else if (/^(m\.|f\.|c\.|m\.\/f\.)$/.test(t)) f.gender = t; else if (/^(Sg\.|Pl\.|Du\.)$/.test(t)) f.number = t; else if (/absolut|constructus|bestimmt/.test(t)) f.state = t;
    });
    f.suffix = d && d.segs.some(x => x.suffix) ? 'mit Suffix' : 'ohne Suffix';
    wcFeatCache.set(code, f); return f;
  }
  // Quellen der Übersetzungsstatistik für ein Lemma: {src: {Fassung: {lang, labels, cells}}, keys, IR}
  // labels[g].forms: deutsche Fassungen [Grundform, [Form, Anzahl], …]; Septuaginta und Targumim [Lemma]
  async function wcTrSources(lemma) {
    const [IR, LR, TR, QR, WR] = await Promise.all([loadIlRen(), loadLxxRen(), loadTgRen(), loadQRen(), loadWitnessRen()]);
    const src = {};
    if (IR) for (const [tr, M] of Object.entries(IR.tr)) { const x = M[lemma]; if (!x) continue; src[tr] = { lang: 'de', labels: x[0].map(f => ({ forms: f })), cells: x[1].map(([g, code, n, refs, f]) => ({ g, code, n, refs, f })), para: x[2] || {} }; }
    const lx = LR && LR[lemma];
    if (lx) src.LXX = { lang: 'grc', labels: lx[0].map(g => ({ forms: [g], other: g === '*' })), cells: lx[1].map(([g, code, n, refs, forms]) => ({ g, code, n, refs, targets:forms?.map(form=>[null,form]) })) };
    const tg = TR && TR[lemma];
    if (tg) ['O', 'PJ', 'N'].forEach((k, i) => { const cells = tg[1].map(c => ({ g: c[0], code: c[1], n: c[2 + i], refs: c[5 + i], targets:c[8+i] })).filter(c => c.n); if (cells.length) src[k] = { lang: 'arc', labels: tg[0].map(([l, gl, id]) => ({ forms: [l], gl, targumLex:id, other: l === '*' })), cells }; });
    // Qumran-Rollen: was die Rollen dort haben, wo der masoretische Text das Wort hat (gleich / andere Schreibweise / andere Lesart)
    const qr = QR && QR[lemma];
    if (qr) src.Q = { lang: 'he', labels: qr[0].map(l => { if (l === '*') return { forms: ['*'], other: true }; const k = l[0], w = l.slice(2); return k === '0' ? { forms: [I18N.t('gleich (= MT)')], same: true } : { forms: [w], gl: I18N.t(k === '1' ? 'andere Schreibweise' : 'andere Lesart') }; }), cells: qr[1].map(([g, code, n, refs]) => ({ g, code, n, refs })) };
    // All indices encode references in the same book order.
    if (WR && (!IR || JSON.stringify(IR.books) === JSON.stringify(WR.books))) {
      for (const [key, lang] of Object.entries(WC_TR_WITNESSES)) {
        const grouped = WR.groups?.[key]?.[lemma], entry = grouped || WR[key][lemma];
        if (!entry) continue;
        const [labels, cells] = entry;
        src[key] = { lang, grouped:!!grouped, labels: grouped ? labels : labels.map(form => ({ forms: [form] })),
          cells: cells.map(([g, code, n, refs, form]) => ({ g, code, n, refs, form })) };
      }
    }
    for (const k in src) src[k].total = src[k].cells.reduce((a, c) => a + c.n, 0);
    const keys = Object.keys(WC_TR_LABEL).filter(k => src[k]?.total >= (Object.hasOwn(WC_TR_WITNESSES, k) ? 1 : 2));
    return { src, keys, IR: IR || WR && { books: WR.books } };
  }
  function wcScopeSources(card) {
    if (!card.family) return wcTrSources(card.lemma);
    const revision = host.ilRevision;
    if (!card.translationSources || card.translationSources.revision !== revision) {
      const promise = Promise.all(card.family.ids.map(async id => [id, await wcTrSources(id)])).then(entries => {
        const src = window.RenderingSearch.familySources(entries);
        return { src, keys: Object.keys(WC_TR_LABEL).filter(key => src[key]?.total), IR: entries[0]?.[1].IR };
      });
      card.translationSources = { revision, promise };
    }
    return card.translationSources.promise;
  }
  async function wcTrans(token) {
    const { lemma, family } = fmCur;
    const R = await wcScopeSources(fmCur);
    if (token !== wcToken || !host.$('#wcTr')) return;
    if (!R.keys.length) return;
    // Schwester-Lemmata: gleiche Konsonanten, anderes Lemma (עָנָה antworten / singen / gebeugt sein) – nur die, zu denen es eine Statistik gibt
    const LEM = window.OSHB_LEMMAS || {}, ids = (!family && LEM[lemma] && host.lemIdsFor(LEM[lemma][0])) || [], sis = [{ id: lemma, ...R }];
    for (const id of ids) { if (id === lemma) continue; const r = await wcTrSources(id); if (r.keys.length) sis.push({ id, ...r }); }
    const box = host.$('#wcTr'); if (token !== wcToken || !box) return;
    let pick = null; try { pick = localStorage.getItem('wcTrSrc'); } catch { /* egal */ }
    wcTrState = { src: R.src, keys: R.keys, cur: R.keys.includes(pick) ? pick : wcDefaultSource(R.keys), open: null, IR: R.IR, f: {}, lemma, family, sis: sis.length > 1 ? sis : [], allRows: false, refLim: 12, base: lemma, tok: token };
    if (fmRest && fmRest.token === token) { fmRestTr(fmRest.h); fmRest = null; } // Zurück/Vor: Fassung, Homonym, Filter und aufgeklappte Zeile des Verlaufseintrags
    if(fmTrPick!=='off')fmTrSelect(wcTrState.cur);
    box.hidden = false; wcTrRender();
  }
  // Verse (Buch*1000000 + Kapitel*1000 + Vers), in denen eine Fassung das Lemma einzeln wiedergibt – für den Vergleich zweier Fassungen
  function wcTrVerses(S, k) {
    const cache = S.vs ||= {}, key = S.lemma + '|' + k;
    if (!cache[key]) {
      const seen = new Map();
      for (const cell of S.src[k].cells) {
        for (const ref of unB36(cell.refs)) seen.set(ref + '|' + (cell.lemma || S.lemma), ref);
      }
      cache[key] = seen;
    }
    return cache[key];
  }
  function wcTrCommon(S, a, b) {
    const A = wcTrVerses(S, a), B = wcTrVerses(S, b), verses = new Set();
    for (const [key, ref] of A) if (B.has(key)) verses.add(ref);
    return verses.size;
  }
  // Fassung wählen; second (Strg/Cmd-Klick oder nach „Vergleichen mit …“): als zweite Fassung daneben (Vergleich) – ein Klick auf die zweite Fassung tauscht die beiden
  function wcTrShow(k, second) {
    const S = wcTrState; if (!S || !S.src[k]) return; host.hovApi && host.hovApi.hide();
    if (second || S.pick) {
      if (k === S.cur) { if (!S.pick) return; S.pick = false; wcTrRender(); return; }
      if (k === S.cmp && second) S.cmp = null; else if (!wcTrCommon(S, S.cur, k)) return; else S.cmp = k;
      S.pick = false;
    } else if (k === S.cmp) { S.cmp = S.cur; S.cur = k; } else S.cur = k;
    S.same=null;S.sameLimits={};S.open = null; S.allRows = false; S.refLim = 12; fmTrSelect(S.cur); wcTrRender();
  }
  function wcTrCmpPick() { const S = wcTrState; if (!S) return; S.pick = !S.pick; wcTrRender(); }
  function wcTrCmpOff() { const S = wcTrState; if (!S) return; S.cmp = null; S.pick = false; S.open = null; S.allRows = false; S.refLim = 12; wcTrRender(); }
  function wcTrRefs(key) { const S = wcTrState; if (!S) return; S.open = S.open === key ? null : key; S.refLim = 12; wcTrRender(); }
  function wcTrFilt(dim, val) { const S = wcTrState; if (!S) return; if (dim === '*') S.f = {}; else if (S.f[dim] === val || val == null) delete S.f[dim]; else S.f[dim] = val; S.open = null; S.refLim = 12; wcTrRender(); }
  // A homonym is a different lexical entry: rebuild the entire card and save
  // the old one in history. Keep the chosen translation, reset lexical filters.
  function wcTrLemma(id) {
    if(!fmCur||fmCur.greek||fmCur.targum||(!fmCur.family&&fmCur.lemma===id))return;
    const ids = fmCur.family?.ids || host.lemIdsFor(fmCur.lem?.[0] || '');
    if (!ids.includes(id) || !window.Forms.model(fmCur.D,id)) return;
    const S=wcTrLive();
    fmHistSave();
    const tab = fmTab === 'concordance' ? 'concordance' : 'card';
    const next={greek:false,lemma:id,info:null,tab,scroll:0,book:'',chip:null,fchip:null,
      tr:S?{lemma:id,cur:S.cur,cmp:S.cmp||null,f:{},open:null,allRows:false,refLim:12}:null};
    fmHistPush(next);openForms(id,null,tab,next);
  }
  // ----- Stellen mit Kontext: Westminster-Wörter des Verses (Lemma, Bestimmung, Form) + Segmente der Fassung aus interlin.js -----
  const wcVerseWords = new Map(); // „Genesis 18:27“ -> [{lem, code, he}] (leer, wenn der Vers nicht zu lesen war)
  const wcMcode = (l, m) => { // wie tools/interlinear/renderings.py: Bestimmung des Hauptworts, Suffix angehängt
    const ls = l.split('/'), ms = m.slice(1).split('/'); let i = ls.findIndex(x => /\d/.test(x)); if (i < 0) i = ls.length - 1;
    const suf = ms.slice(i + 1).filter(x => x[0] === 'S');
    return m[0] + (i < ms.length ? ms[i] : ms[ms.length - 1]) + (suf.length ? '/' + suf[0] : '');
  };
  const wcClean = t => { const w = String(t).replace(/\.\.\.|[„“”‚‘’"«»,.;:!?()[\]—–…']/g, ' ').split(/\s+/).filter(Boolean); while (w.length > 1 && /^(und|der|die|das|den|dem|des)$/i.test(w[0])) w.shift(); return w.join(' ').toLowerCase(); };
  async function wcTrCtxLoad(refs) {
    const need = [...new Set(refs)].filter(r => !wcVerseWords.has(r));
    if (!need.length) return;
    let res = null; try { res = await host.LK.texts(need, 'he', true); } catch { res = null; }
    for (const r of need) {
      const t = res && res[r], ws = [];
      if (t && t.items && /westminster/i.test(t.versionTitle || '')) {
        const re = /<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>([^<]*)/g, html = t.items.join(' '); let m;
        while ((m = re.exec(html))) { // fk/fr: Schlüssel und Form wie in der Formentabelle (Forms.analyze) – bindet eine Stelle an genau eine Form
          const a = window.Forms ? window.Forms.analyze(m[3], m[2], m[1]) : null;
          ws.push({ lem: (m[1].split('/').find(x => /\d/.test(x)) || '').trim(), code: wcMcode(m[1], m[2]), he: m[3].replace(/[֑-ֽ֯]/g, ''), fk: a ? a.key : '', fr: a ? a.raw : '' });
        }
      }
      wcVerseWords.set(r, ws);
    }
  }
  // Vorkommen des Lemmas in einem Vers mit dem deutschen Segment der Fassung (nur Segmente, die diesem Wort allein zugeordnet sind – wie in der Zählung)
  function wcTrOcc(tr, ref, lemma) {
    const IL = window.INTERLIN, ws = wcVerseWords.get(ref) || [], m = /^(.*) (\d+:\d+)$/.exec(ref);
    if (!WC_TR_DE.has(tr)) return ws.map((w, k) => ({ i: k + 1, he: w.he, code: w.code, de: '', cl: '' })).filter((w, k) => ws[k].lem === lemma); // Septuaginta/Targum: nur die hebräische Form, die Wiedergabe ist die Zeile selbst
    const segs = m && IL && IL[tr] && IL[tr][m[1]] && IL[tr][m[1]][m[2]]; if (!segs || !ws.length) return [];
    const per = new Map();
    segs.forEach(([idx, t], k) => { const c = idx.filter(i => i >= 1 && i <= ws.length && ws[i - 1].lem && ws[i - 1].lem !== '853'); if (c.length === 1) (per.get(c[0]) || per.set(c[0], []).get(c[0])).push([k, t]); });
    const out = [];
    per.forEach((xs, i) => { const w = ws[i - 1]; if (w.lem !== lemma) return; out.push({ i, he: w.he, code: w.code, de: xs.map(([k, t], j) => (j ? (k === xs[j - 1][0] + 1 ? ' ' : ' … ') : '') + t).join(''), cl: wcClean(xs.map(x => x[1]).join(' ')) }); });
    return out.sort((a, b) => a.i - b.i);
  }
  function wcSameHtml(S,D){
    if(D.lang!=='de'||S.same==null)return '';
    const label=D.labels[+S.same]?.forms[0];if(!label)return '';
    const matches=window.RenderingSearch.find(S.IR,S.cur,label),LEM=window.OSHB_LEMMAS||{};
    const t=(s,...a)=>host.esc(I18N.t(s,...a));
    return `<section class="wcSame"><h5>${t('Gleiche Wiedergabe')}: <span lang="de">${host.esc(label)}</span> · ${t(WC_TR_LABEL[S.cur])}<button type="button" class="wcSameClose" aria-label="${t('Schließen')}">✕</button></h5>
      <p class="muted">${t('Gleiche deutsche Grundform in dieser Übersetzung, über alle erfassten Tanachstellen. Das bedeutet keine identische Bedeutung im Kontext; Wortformfilter gelten hier nicht.')}</p>
      <p>${t('{} Wörter · {} zugeordnete Belege',wcNum(matches.length),wcNum(matches.reduce((n,x)=>n+x.count,0)))}</p>
      ${matches.map(x=>{const lem=LEM[x.lemma],lim=S.sameLimits?.[x.lemma]||60;
        return `<details class="wcSameEntry" data-lemma="${host.esc(x.lemma)}"><summary><bdi lang="he" dir="rtl">${host.esc(lem?.[0]||x.lemma)}</bdi> ${host.esc(lem?(I18N.lang==='de'&&lem[2]?lem[2]:lem[1]):'')} ${x.languages.includes('arc')?' ('+t('Aramäisch')+')':''} · ${x.count===1?t('1 Beleg'):t('{} Belege',wcNum(x.count))}${x.lemma===S.lemma?' · '+t('Aktuelles Wort'):''}</summary>
        <button type="button" class="wcHL" data-hl="${host.esc(x.lemma)}">${t('Wortkarte öffnen')}</button>
        <p lang="de">${x.forms.map(([f,n])=>host.esc(f)+' ('+wcNum(n)+')').join(' · ')}</p>
        <div class="fmRL">${x.refs.slice(0,lim).map(num=>{const book=S.IR.books[Math.floor(num/1e6)],c=Math.floor(num/1000)%1000,v=num%1000,ref=book+' '+c+':'+v;return `<a data-ref="${host.esc(ref)}" data-same-lemma="${host.esc(x.lemma)}">${host.esc(fmBook(book))} ${c}:${v}</a>`;}).join(' · ')}${x.refs.length>lim?`<button type="button" class="wcSameMore" data-lemma="${host.esc(x.lemma)}" data-limit="${lim+60}">${t('weitere {} Stellen zeigen',wcNum(Math.min(60,x.refs.length-lim)))}</button>`:''}</div></details>`;
      }).join('')}
    </section>`;
  }
  function wcTrLemmaCaption(lemma) {
    return lemma ? ` <small class="wcFormLemma" dir="auto">${host.esc(wcLemmaLabel(lemma))}</small>` : '';
  }
  function wcTrRender() {
    const S = wcTrState, box = host.$('#wcTr'); if (!S || !box) return;
    const D = S.src[S.cur], fk = Object.keys(S.f), de = D.lang === 'de', LEM = window.OSHB_LEMMAS || {};
    const gloss = id => { const l = LEM[id]; return l ? (I18N.lang === 'de' && l[2] ? l[2] : l[1]) : ''; };
    const srcName = k => I18N.t(WC_TR_LABEL[k]).replace(/ \(.*$/, '');
    const match = (c, skip) => { const f = wcFeat(c.code, c.lemma || S.lemma); return fk.every(k => k === skip || f[k] === S.f[k]); };
    // Filter: je Merkmal die vorkommenden Werte mit Anzahl (gezählt unter den übrigen gewählten Filtern)
    const dims = WC_TR_DIMS.map(([k, name]) => {
      const cnt = new Map();
      D.cells.forEach(c => { if (!match(c, k)) return; const v = wcFeat(c.code, c.lemma || S.lemma)[k]; if (v) cnt.set(v, (cnt.get(v) || 0) + c.n); });
      return { k, name, vals: [...cnt].sort((a, b) => b[1] - a[1]) };
    }).filter(d => d.vals.length > 1 || S.f[d.k]);
    // Gruppen unter dem Filter; Stellen je Gruppe in der Reihenfolge des Tanach (Doppelte bleiben: zwei Vorkommen im Vers = zwei Zeilen)
    const gn = new Map(), grefs = new Map();
    D.cells.forEach(c => { if (!match(c)) return; gn.set(c.g, (gn.get(c.g) || 0) + c.n); if (c.refs) { const a = grefs.get(c.g) || grefs.set(c.g, []).get(c.g); unB36(c.refs).forEach((num,j) => a.push({ num, code: c.code, g: c.g, lemma: c.lemma, form:c.targets?.[j]?.[1] || c.form, position:c.targets?.[j]?.[0] })); } });
    grefs.forEach(a => a.sort((x, y) => x.num - y.num));
    const gs = [...gn].map(([g, n]) => ({ ...D.labels[g], g, n, lang: D.labels[g] && D.labels[g].same ? I18N.lang : D.lang, refs: grefs.get(g) }))  /* Qumran „gleich …“: Text der Oberfläche, nicht hebräisch */.sort((a, b) => (!!a.other - !!b.other) || b.n - a.n);
    const tot = gs.reduce((a, g) => a + g.n, 0), all = D.total;
    const pct = n => { const p = n / tot * 100; return (p < 1 ? '< 1' : String(Math.round(p))) + ' %'; };
    const lab = g => g.other ? I18N.t('Andere') : g.forms[0];
    // Einzelbelege: Wiedergaben mit nur einem Beleg zusammengefasst (wenn es genug sind und daneben noch andere stehen)
    const ones = gs.filter(g => g.n === 1 && !g.other), fold = ones.length >= 3 && ones.length < gs.length;
    const main = fold ? gs.filter(g => g.n !== 1 || g.other) : gs, CAP = 20;
    const shown = S.allRows ? main : main.slice(0, CAP);
    // abweichende Deutung: dieselbe Grundform ist bei einem gleich geschriebenen Lemma deutlich häufiger -> die Fassung liest hier wohl das andere Wort
    const sisIdx = S.sis.filter(s => s.id !== S.lemma && s.src[S.cur]).map(s => { const d = s.src[S.cur], m = new Map(); d.cells.forEach(c => { const L = d.labels[c.g]; if (L && !L.other) m.set(L.forms[0], (m.get(L.forms[0]) || 0) + c.n); }); return { id: s.id, m, total: d.total }; });
    const hint = g => {
      if (g.other || !sisIdx.length || RTL(D.lang)) return null; // Targum: aramäische Lexeme sind oft selbst Homonyme
      const share = g.n / tot; if (share >= 0.1) return null; let best = null;
      for (const s of sisIdx) { const n2 = s.m.get(g.forms[0]) || 0, sh = n2 / s.total; if (n2 >= 3 && n2 > g.n && sh >= 0.1 && sh >= 4 * share && (!best || sh > best.sh)) best = { id: s.id, sh }; }
      return best && gloss(best.id) ? I18N.t('{} liest hier wohl „{}“', srcName(S.cur), gloss(best.id)) : null;
    };
    // ----- Stellen einer aufgeklappten Zeile -----
    const BOOKS = S.IR && S.IR.books || [];
    const refOf = num => BOOKS[Math.floor(num / 1e6)] + ' ' + (Math.floor(num / 1000) % 1000) + ':' + (num % 1000);
    let formSets = null;
    const fset = g => { if (!formSets) { formSets = new Map(); D.labels.forEach((L, i) => formSets.set(i, new Set(L.forms.slice(1).map(f => String(f[0]).toLowerCase())))); } return formSets.get(g) || new Set(); };
    const anyForm = cl => { fset(0); for (const s of formSets.values()) if (s.has(cl)) return true; return false; };
    const ctx = (items, key, withLabel) => {
      const lim = Math.min(items.length, S.refLim), part = items.slice(0, lim), refs = part.map(it => refOf(it.num));
      if (refs.some(r => !wcVerseWords.has(r)) || (!Object.hasOwn(WC_TR_WITNESSES, S.cur) && !host.ilHas(refs) && !S.ilFail)) { // Kontext nachladen, dann neu zeichnen
        if (!S.loading) { S.loading = true; Promise.all([Object.hasOwn(WC_TR_WITNESSES, S.cur) || host.loadIL(host.ilBooksOf(refs)), wcTrCtxLoad(refs)]).then(([IL]) => { S.loading = false; if (!IL) S.ilFail = true; if (wcTrState === S && S.open === key) wcTrRender(); }, () => { S.loading = false; S.ilFail = true; }); }
      }
      const occs = new Map(), used = new Map(), hs = withLabel ? new Map(ones.map(g => [g.g, hint(g)])) : null; let lb = null, html = '';
      part.forEach((it, j) => {
        const r = refs[j], bk = Math.floor(it.num / 1e6);
        const lemma = it.lemma || S.lemma, occurrenceKey = r + '|' + lemma;
        if (!occs.has(occurrenceKey)) { occs.set(occurrenceKey, wcTrOcc(S.cur, r, lemma)); used.set(occurrenceKey, new Set()); }
        const u = used.get(occurrenceKey), mine = fset(it.g); let o = null, bs = -1;
        occs.get(occurrenceKey).forEach(x => { if (u.has(x.i)) return; const s = (x.code === it.code ? 4 : 0) + (mine.has(x.cl) ? 2 : anyForm(x.cl) ? 0 : 1); if (s > bs) { bs = s; o = x; } });
        if (o) u.add(o.i);
        if (bk !== lb) { html += `<div class="bk">${host.esc(fmBook(BOOKS[bk]))}</div>`; lb = bk; }
        const cv = (Math.floor(it.num / 1000) % 1000) + (I18N.lang === 'de' ? ',' : ':') + (it.num % 1000);
        html += `<div class="ln"><a data-ref="${host.esc(r)}"${it.form ? ` data-target-form="${host.esc(it.form)}"` : ''}${it.position ? ` data-target-position="${it.position}"` : ''}${it.lemma ? ` data-same-lemma="${host.esc(it.lemma)}"` : ''}>${cv}</a><span class="he" lang="he" dir="rtl">${o ? host.esc(o.he) : ''}${wcTrLemmaCaption(it.lemma)}</span><span class="de" lang="${de ? 'de' : D.lang}" dir="${RTL(D.lang) ? 'rtl' : 'ltr'}">${o && o.de ? host.esc(o.de) : S.cur === 'Q' ? (D.labels[it.g].same ? '=' : host.esc(D.labels[it.g].forms[0])) : !de ? host.esc(it.form || D.labels[it.g].forms[0]) : withLabel ? `<span class="muted">${host.esc(D.labels[it.g].forms[0])}</span>` : ''}${hs && hs.get(it.g) ? ` <small class="hint">${host.esc(hs.get(it.g))}</small>` : ''}</span></div>`;
      });
      const rest = items.length - lim, STEP = 300;
      const more = rest > 0 ? `<div class="mr"><button type="button" class="wcTrMoreRefs" dir="auto" data-to="${lim + Math.min(rest, STEP)}">${host.esc(rest <= STEP ? I18N.t('alle {} Stellen zeigen', wcNum(items.length)) : I18N.t('weitere {} Stellen zeigen', wcNum(STEP)))}</button></div>` : '';
      return `<div class="fmRL wcTrCx">${html}${more}</div>`;
    };
    const detail = g => {
      const fm = g.forms.slice(1), sum = fm.reduce((a, f) => a + f[1], 0), gAll = D.cells.reduce((a, c) => a + (c.g === g.g ? c.n : 0), 0), h = hint(g);
      return `<div class="wcTrX">${h ? `<p class="wcTrHint" dir="auto">${host.esc(h)} <span class="muted">– ${host.esc(I18N.t('diese Wiedergabe ist bei dem gleich geschriebenen Wort deutlich häufiger.'))}</span></p>` : ''}
        ${fm.length ? `${D.grouped ? `<details class="wcTrForms"><summary>${host.esc(I18N.t('{} belegte Originalformen',wcNum(fm.length)))}</summary>` : ''}<div class="wcTrFm"><span class="muted">${host.esc(I18N.t('Formen:'))}</span>${fm.map(([f, n]) => `<span class="fm" lang="${D.lang}" dir="${RTL(D.lang) ? 'rtl' : 'ltr'}">${host.esc(f)} <small>${wcNum(n)}</small></span>`).join('')}${sum < gAll ? `<span class="muted">${host.esc(I18N.t('… und weitere Formen'))}</span>` : ''}${fk.length ? `<span class="muted">(${host.esc(I18N.t('ohne Filter gezählt'))})</span>` : ''}</div>${D.grouped ? '</details>' : ''}` : ''}
        ${g.refs ? ctx(g.refs, String(g.g)) : ''}</div>`;
    };
    // Ring: die häufigsten Wiedergaben (bis 7, ohne die zusammengefassten Einzelbelege) in den Kategorienfarben, der Rest grau; dieselbe Farbe trägt die Zeile in der Liste
    const TOP = 7, slices = main.filter(g => !g.other).slice(0, TOP).map((g, i) => ({ g, n: g.n, c: i + 1, k: String(g.g), t: lab(g) }));
    const col = new Map(slices.map(x => [x.g.g, x.c])), restN = tot - slices.reduce((a, x) => a + x.n, 0);
    if (restN > 0) slices.push({ n: restN, c: 0, k: 'rest', t: I18N.t('Andere') });
    const R0 = 94, R1 = 60, C = 100; let a0 = 0;
    const pt = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)].map(x => x.toFixed(2)).join(' ');
    const arcs = tot ? slices.map(x => {
      const a1 = a0 + x.n / tot * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0;
      const d = slices.length === 1 ? `M ${C} ${C - R0} A ${R0} ${R0} 0 1 1 ${C - 0.01} ${C - R0} L ${C - 0.01} ${C - R1} A ${R1} ${R1} 0 1 0 ${C} ${C - R1} Z` : `M ${pt(R0, a0)} A ${R0} ${R0} 0 ${big} 1 ${pt(R0, a1)} L ${pt(R1, a1)} A ${R1} ${R1} 0 ${big} 0 ${pt(R1, a0)} Z`;
      a0 = a1;
      return `<path d="${d}" class="wcTrS c${x.c}" data-s="${x.k}"><title>${host.esc(x.t)}: ${wcNum(x.n)} (${pct(x.n)})</title></path>`;
    }).join('') : `<circle cx="100" cy="100" r="77" class="wcTrE"/>`;
    const lemHe = S.family?.root || (LEM[S.lemma] || [])[0] || (fmCur && fmCur.lem ? fmCur.lem[0] : '');
    const ring = `<svg class="wcTrRing" viewBox="0 0 200 200" role="img" aria-label="${host.esc(I18N.t('Wie wird das Wort übersetzt?'))}">${arcs}<text x="100" y="100" class="wcTrC" lang="he">${host.esc(lemHe)}</text><text x="100" y="123" class="wcTrT">${host.esc(wcNum(tot))}</text></svg>`;
    const cOf = g => col.get(g.g) || 0, sOf = g => col.has(g.g) ? String(g.g) : 'rest';
    const chev = can => `<span class="chev" aria-hidden="true">${can ? '›' : ''}</span>`;
    const sw = '<i class="sw" aria-hidden="true"></i>';
    const bar = n => `<span class="b"><i style="width:${(n / tot * 100).toFixed(1)}%"></i></span>`;
    const name = g => de&&!g.other ? `<button type="button" class="wcSamePick" data-g="${g.g}" aria-pressed="${S.same===String(g.g)}" title="${host.esc(I18N.t('Andere hebräische Wörter mit dieser Wiedergabe zeigen'))}">${host.esc(lab(g))}</button>` : g.lang === 'arc' && !g.other ? `<button type="button" class="wcTgL" data-q="${host.esc(g.forms[0])}" title="${host.esc(I18N.t('Im Wörterbuch nachschlagen'))}">${host.esc(lab(g))}</button>` : host.esc(lab(g));
    const row = g => {
      const key = String(g.g), can = !!g.refs && !g.other, open = can && S.open === key, h = hint(g);
      return `<div class="wcTrR c${cOf(g)}${can ? ' can' : ''}${open ? ' open' : ''}${h ? ' odd' : ''}" data-g="${key}" data-s="${sOf(g)}"${g.targumLex ? ` data-tg-lexeme="${host.esc(g.targumLex)}"` : ''}${can ? ` role="button" tabindex="0" aria-expanded="${open}"${open ? '' : ` title="${host.esc(I18N.t('Formen und Stellen zeigen'))}"`}` : ''}>${chev(can)}${sw}<span class="f"><span lang="${g.lang}"${RTL(g.lang) ? ' dir="rtl"' : ''}>${name(g)}</span>${g.gl ? ` <small class="muted">${host.esc(g.gl)}</small>` : ''}${D.grouped ? ` <small class="muted wcTrKind">${host.esc(I18N.t(g.type === 'lemma' ? 'Lemma' : g.type === 'phrase' ? 'Wortgruppe' : 'Wortform ohne sichere Lemma-Zuordnung'))}</small>` : ''}${h ? ` <small class="hint" title="${host.esc(h)}">${host.esc(h)}</small>` : ''}</span>${bar(g.n)}<small class="n">${wcNum(g.n)}</small><small class="p">${pct(g.n)}</small></div>${open ? detail(g) : ''}`;
    };
    const onesRow = () => {
      const open = S.open === 'ones', n = ones.length;
      const body = !open ? '' : de ? `<div class="wcTrX"><div class="wcSameChoices">${ones.map(name).join(' ')}</div>${ctx(ones.map(g => g.refs[0]).sort((x, y) => x.num - y.num), 'ones', true)}</div>`
        : `<div class="wcTrX"><div class="wcTrFm">${ones.map(g => `<span class="fm" lang="${g.lang}"${RTL(g.lang) ? ' dir="rtl"' : ''}>${name(g)}${g.gl ? ` <small>${host.esc(g.gl)}</small>` : ''}</span>`).join('')}</div></div>`;
      return `<div class="wcTrR c0 can ones${open ? ' open' : ''}" data-g="ones" data-s="rest" role="button" tabindex="0" aria-expanded="${open}">${chev(true)}${sw}<span class="f"><bdi>${host.esc(I18N.t('Einzelbelege'))}</bdi> <small class="muted">(${wcNum(n)})</small></span>${bar(n)}<small class="n">${wcNum(n)}</small><small class="p">${pct(n)}</small></div>${body}`;
    };
    const others = shown.filter(g => g.other), normal = shown.filter(g => !g.other);
    const list = D.grouped ? (['lemma','form','phrase'].map(type=>{
      const members=gs.filter(g=>g.type===type);if(!members.length)return '';
      const rows=members.map(row).join('');if(type==='lemma')return rows;
      const title=I18N.t(type==='form' ? 'Wortformen ohne sichere Lemma-Zuordnung' : 'Wortgruppen');
      return `<details class="wcTrUnresolved"${members.some(g=>String(g.g)===S.open)?' open':''}><summary>${host.esc(title)} · ${wcNum(members.length)} · ${host.esc(I18N.t('{} Belege',wcNum(members.reduce((n,g)=>n+g.n,0))))}</summary>${rows}</details>`;
    }).join('') || `<p class="muted">${host.esc(I18N.t('Keine Belege für diese Auswahl.'))}</p>`) : gs.length ? normal.map(row).join('') + (main.length > shown.length ? `<div class="mr"><button type="button" class="wcTrAllRows" dir="auto">${host.esc(I18N.t('alle {} Wiedergaben zeigen', wcNum(main.length)))}</button></div>` : '') + (fold ? onesRow() : '') + others.map(row).join('')
      : `<p class="muted">${host.esc(I18N.t('Keine Belege für diese Auswahl.'))}</p>`;
    // ----- Vergleich zweier Fassungen: an denselben Stellen gibt A das Wort mit X wieder, B mit Y (Paare nach A gruppiert); Klick auf ein Paar zeigt die Stellen mit beiden Wiedergaben -----
    function cmpView() {
      const kB = S.cmp, B = S.src[kB], deB = B.lang === 'de';
      const per = Dx => { const m = new Map(); let n = 0; Dx.cells.forEach(c => { if (!match(c)) return; n += c.n; unB36(c.refs).forEach((num,j) => (m.get(num) || m.set(num, []).get(num)).push({ g: c.g, code: c.code, lemma: c.lemma, form:c.targets?.[j]?.[1] || c.form, position:c.targets?.[j]?.[0] })); }); return { m, n }; };
      const PA = per(D), PB = per(B), pairs = new Map(); let np = 0;
      PA.m.forEach((as, num) => { // mehrere Vorkommen im Vers: erst die mit gleicher Bestimmung zusammen, dann der Reihe nach
        const bs = PB.m.get(num); if (!bs) return; const free = bs.slice(), pr = [], left = [];
        as.forEach(a => { const j = free.findIndex(b => b.lemma === a.lemma && b.code === a.code); if (j >= 0) pr.push([a, free.splice(j, 1)[0]]); else left.push(a); });
        left.forEach(a => { const j = free.findIndex(b => b.lemma === a.lemma); if (j >= 0) pr.push([a, free.splice(j, 1)[0]]); });
        pr.forEach(([a, b]) => { const key = 'x' + a.g + '-' + b.g, p = pairs.get(key) || pairs.set(key, { key, a: a.g, b: b.g, n: 0, refs: [] }).get(key); p.n++; p.refs.push({ num, lemma: a.lemma, code: a.code, codeB: b.code, g: a.g, gb: b.g, form:a.form, formB:b.form, position:a.position, positionB:b.position }); np++; });
      });
      const lA = g => D.labels[g].other ? I18N.t('Andere') : D.labels[g].forms[0], lB = g => B.labels[g].other ? I18N.t('Andere') : B.labels[g].forms[0];
      const sameLang = D.lang === B.lang, isSame = p => sameLang && !D.labels[p.a].other && !B.labels[p.b].other && String(lA(p.a)).toLowerCase() === String(lB(p.b)).toLowerCase();
      const ga = new Map(); pairs.forEach(p => { p.refs.sort((x, y) => x.num - y.num); ga.set(p.a, (ga.get(p.a) || 0) + p.n); });
      const order = [...ga].sort((x, y) => (!!D.labels[x[0]].other - !!D.labels[y[0]].other) || y[1] - x[1]).map(x => x[0]), rank = new Map(order.map((g, i) => [g, i]));
      const rowsAll = [...pairs.values()].sort((x, y) => rank.get(x.a) - rank.get(y.a) || y.n - x.n), rows = S.allRows ? rowsAll : rowsAll.slice(0, 20);
      const nSame = rowsAll.reduce((a, p) => a + (isSame(p) ? p.n : 0), 0), pc = n => { const q = n / np * 100; return (q > 0 && q < 1 ? '< 1' : String(Math.round(q))) + ' %'; };
      const span = (Dx, t, other) => `<span lang="${other ? '' : Dx.lang}"${RTL(Dx.lang) && !other ? ' dir="rtl"' : ''}>${host.esc(t)}</span>`;
      const cx = p => {
        const lim = Math.min(p.refs.length, S.refLim), part = p.refs.slice(0, lim), refs = part.map(it => refOf(it.num));
        if (refs.some(r => !wcVerseWords.has(r)) || ((de || deB) && !host.ilHas(refs) && !S.ilFail)) {
          if (!S.loading) { S.loading = true; Promise.all([de || deB ? host.loadIL(host.ilBooksOf(refs)) : true, wcTrCtxLoad(refs)]).then(([IL]) => { S.loading = false; if (!IL) S.ilFail = true; if (wcTrState === S && S.open === p.key) wcTrRender(); }, () => { S.loading = false; S.ilFail = true; }); }
        }
        const picker = (k, Dx) => { // das Vorkommen im Vers, das zu dieser Zeile gehört (wie in der einfachen Stellenliste)
          const sets = new Map(Dx.labels.map((L, i) => [i, new Set(L.forms.slice(1).map(f => String(f[0]).toLowerCase()))])), any = cl => { for (const s of sets.values()) if (s.has(cl)) return true; return false; };
          const occs = new Map(), used = new Map();
          return (r, g, code, lemma = S.lemma) => {
            const occurrenceKey = r + '|' + lemma;
            if (!occs.has(occurrenceKey)) { occs.set(occurrenceKey, wcTrOcc(k, r, lemma)); used.set(occurrenceKey, new Set()); }
            const u = used.get(occurrenceKey), mine = sets.get(g) || new Set(); let o = null, bs = -1;
            occs.get(occurrenceKey).forEach(x => { if (u.has(x.i)) return; const s = (x.code === code ? 4 : 0) + (mine.has(x.cl) ? 2 : any(x.cl) ? 0 : 1); if (s > bs) { bs = s; o = x; } });
            if (o) u.add(o.i); return o;
          };
        };
        const pa = picker(S.cur, D), pb = picker(kB, B);
        const cell = (Dx, o, t, form) => `<span class="de" lang="${Dx.lang}" dir="${RTL(Dx.lang) ? 'rtl' : 'ltr'}">${o && o.de ? host.esc(o.de) : `<span class="muted">${host.esc(form || t)}</span>`}</span>`;
        let lb = null, html = `<div class="ln ln2 hd" aria-hidden="true"><span></span><span></span><span>${host.esc(srcName(S.cur))}</span><span>${host.esc(srcName(kB))}</span></div>`;
        part.forEach((it, j) => {
          const r = refs[j], bk = Math.floor(it.num / 1e6), oa = pa(r, it.g, it.code, it.lemma), ob = pb(r, it.gb, it.codeB), he = (oa || ob || {}).he || '';
          if (bk !== lb) { html += `<div class="bk">${host.esc(fmBook(BOOKS[bk]))}</div>`; lb = bk; }
          const cv = (Math.floor(it.num / 1000) % 1000) + (I18N.lang === 'de' ? ',' : ':') + (it.num % 1000);
          html += `<div class="ln ln2"><a data-ref="${host.esc(r)}"${it.form ? ` data-target-form="${host.esc(it.form)}"` : ''}${it.position ? ` data-target-position="${it.position}"` : ''}${it.lemma ? ` data-same-lemma="${host.esc(it.lemma)}"` : ''}>${cv}</a><span class="he" lang="he" dir="rtl">${host.esc(he)}${wcTrLemmaCaption(it.lemma)}</span>${cell(D, oa, lA(it.g),it.form)}${cell(B, ob, lB(it.gb),it.formB)}</div>`;
        });
        const rest = p.refs.length - lim, STEP = 300;
        return `<div class="wcTrX"><div class="fmRL wcTrCx">${html}${rest > 0 ? `<div class="mr"><button type="button" class="wcTrMoreRefs" dir="auto" data-to="${lim + Math.min(rest, STEP)}">${host.esc(rest <= STEP ? I18N.t('alle {} Stellen zeigen', wcNum(p.refs.length)) : I18N.t('weitere {} Stellen zeigen', wcNum(STEP)))}</button></div>` : ''}</div></div>`;
      };
      let prev = null;
      const list = !np ? `<p class="muted" dir="auto">${host.esc(I18N.t('Keine gemeinsamen Belege für diese Auswahl.'))}</p>` : rows.map(p => {
        const open = S.open === p.key, first = p.a !== prev, same = isSame(p), i = rank.get(p.a), c = D.labels[p.a].other || i >= 7 ? 0 : i + 1; prev = p.a;
        return `<div class="wcTrR wcTrP can c${c}${first ? ' first' : ''}${same ? ' same' : ''}${open ? ' open' : ''}" data-g="${p.key}" role="button" tabindex="0" aria-expanded="${open}"${open ? '' : ` title="${host.esc(I18N.t('Stellen zeigen'))}"`}><span class="chev" aria-hidden="true">›</span><i class="sw" aria-hidden="true"></i><span class="f fa">${span(D, lA(p.a), D.labels[p.a].other)}</span><span class="ar"${same ? ` title="${host.esc(I18N.t('gleiche Wiedergabe'))}"` : ''}>${same ? '=' : '→'}</span><span class="f fb">${span(B, lB(p.b), B.labels[p.b].other)}${B.labels[p.b].gl ? ` <small class="muted">${host.esc(B.labels[p.b].gl)}</small>` : ''}</span><span class="b"><i style="width:${(p.n / np * 100).toFixed(1)}%"></i></span><small class="n">${wcNum(p.n)}</small><small class="p">${pc(p.n)}</small></div>${open ? cx(p) : ''}`;
      }).join('') + (rowsAll.length > rows.length ? `<div class="mr"><button type="button" class="wcTrAllRows" dir="auto">${host.esc(I18N.t('alle {} Paare zeigen', wcNum(rowsAll.length)))}</button></div>` : '');
      const head = `<span class="cnt${fk.length ? ' filt' : ''}" dir="auto"><bdi>${host.esc(srcName(S.cur))}</bdi> ↔ <bdi>${host.esc(srcName(kB))}</bdi> <span class="muted">· ${host.esc(I18N.t('{} gemeinsame Belege (von {} / {})', wcNum(np), wcNum(PA.n), wcNum(PB.n)))}</span></span><button type="button" class="wcTrCmpX" title="${host.esc(I18N.t('Vergleich beenden'))}" aria-label="${host.esc(I18N.t('Vergleich beenden'))}">✕</button>${sameLang && np ? `<span class="wcTrAgree" dir="auto">${host.esc(I18N.t('stimmen überein: {} ({} von {})', pc(nSame), wcNum(nSame), wcNum(np)))}</span>` : ''}`;
      return { head, list, hidden: rowsAll.slice(rows.length).map(p => lA(p.a) + ' \n ' + lB(p.b)).join(' \n ') };
    }
    // ----- Kopf: Homonyme, Fassungen, Zählung + Filter -----
    const lem=LEM[S.lemma],hom='';
    const maxTot = Math.max(...S.keys.map(k => S.src[k].total)), cmpOn = !!(S.cmp || S.pick);
    const tabs = `<div class="wcTrTabs" role="tablist">${S.keys.map(k => { const n = S.src[k].total; const cv = cmpOn && k !== S.cur ? wcTrCommon(S, S.cur, k) : -1; return `<button type="button" role="tab" class="wcTrSrc${k === S.cur ? ' on' : ''}${k === S.cmp ? ' cmp' : ''}${cv === 0 ? ' none' : ''}${n < 5 || n < maxTot * 0.05 ? ' few' : ''}" aria-selected="${k === S.cur || k === S.cmp}" data-src="${k}"${cv >= 0 ? ` title="${host.esc(cv ? I18N.t('{} gemeinsame Verse mit {}', wcNum(cv), srcName(S.cur)) : I18N.t('Keine gemeinsamen Verse mit {}', srcName(S.cur)))}"` : ''}>${wcTrPic(k)}${k === S.cmp ? '<span class="x" aria-hidden="true">⇄</span>' : ''}${host.esc(I18N.t(WC_TR_LABEL[k]))} <small>${wcNum(n)}</small></button>`; }).join('')}${S.keys.length > 1 && !S.cmp ? `<button type="button" class="wcTrCmpB${S.pick ? ' on' : ''}" aria-pressed="${!!S.pick}" title="${host.esc(I18N.t('Zwei Quellen vergleichen – auch mit {}-Klick auf eine zweite Quelle', (window.platform && window.platform.mod) || 'Strg'))}"><span aria-hidden="true">⇄</span> <bdi>${host.esc(I18N.t('Vergleichen mit …'))}</bdi></button>` : ''}</div>${S.pick ? `<p class="wcTrPickN muted" dir="auto">${host.esc(I18N.t('Zweite Quelle wählen – ausgegraut: keine gemeinsamen Verse.'))}</p>` : ''}`;
    const dimRow = d => `<div class="wcTrFR"><span class="muted">${host.esc(I18N.t(d.name))}</span>${d.vals.map(([v, n]) => `<button type="button" class="wcTrFV${S.f[d.k] === v ? ' on' : ''}" data-dim="${d.k}" data-val="${host.esc(v)}" aria-pressed="${S.f[d.k] === v}">${host.esc(I18N.t(v))} <small>${wcNum(n)}</small></button>`).join('')}${S.f[d.k] && !d.vals.some(([v]) => v === S.f[d.k]) ? `<button type="button" class="wcTrFV on" data-dim="${d.k}" data-val="${host.esc(S.f[d.k])}" aria-pressed="true">${host.esc(I18N.t(S.f[d.k]))} <small>0</small></button>` : ''}</div>`;
    const mainDims = dims.filter(d => WC_TR_MAIN.has(d.k)), restDims = dims.filter(d => !WC_TR_MAIN.has(d.k));
    const X = S.cmp && S.cmp !== S.cur && S.src[S.cmp] ? cmpView() : null;
    const groupSummary = D.grouped ? [I18N.t('{} Belege',wcNum(tot)), ...[
      ['lemma','{} Lemma','{} Lemmata'], ['form','{} Wortform ohne Lemma','{} Wortformen ohne Lemma'], ['phrase','{} Wortgruppe','{} Wortgruppen']
    ].flatMap(([type,singular,plural])=>{const n=gs.filter(g=>g.type===type).length;return n?[I18N.t(n===1?singular:plural,wcNum(n))]:[];})].join(' · ') : I18N.t('{} Belege · {} Wiedergaben', wcNum(tot), wcNum(gs.length));
    const sum = `<div class="wcTrSum${X ? ' cmp' : ''}">${X ? X.head : `<span class="cnt${fk.length ? ' filt' : ''}" dir="auto">${host.esc(fk.length ? I18N.t('{} von {} Belegen', wcNum(tot), wcNum(all)) : groupSummary)}</span>`}${fk.map(k => `<button type="button" class="wcTrFV on rm" data-dim="${k}" data-val="${host.esc(S.f[k])}" title="${host.esc(I18N.t('Filter entfernen'))}">${host.esc(I18N.t(S.f[k]))} <span aria-hidden="true">✕</span></button>`).join('')}${fk.length > 1 ? `<button type="button" class="wcTrFV wcTrAll" data-dim="*">↺ ${host.esc(I18N.t('Alle Formen'))}</button>` : ''}${restDims.length ? `<button type="button" class="wcTrMoreB" aria-expanded="${wcTrMore}"><bdi>${host.esc(I18N.t('Weitere Merkmale'))}</bdi> <span aria-hidden="true">${wcTrMore ? '▴' : '▾'}</span></button>` : ''}</div>`;
    const note = X ? 'Verglichen sind die Stellen, an denen beide Quellen dieses Wort einzeln wiedergeben: jede Zeile zeigt, welche Wiedergabe der einen auf welche der anderen trifft. Klick auf eine Zeile zeigt die Stellen; Klick auf die zweite Quelle tauscht die Seiten.' : de ? 'Gezählt sind die Stellen, an denen die Übersetzung diesem Wort allein (ohne weiteres Inhaltswort) zugeordnet ist; die Formen sind nach ihrer deutschen Grundform zusammengefasst, „und“ und Artikel am Anfang weggelassen. Klick auf eine Zeile zeigt die Formen und die Stellen.' : S.cur === 'LXX' ? 'Septuaginta nach der Wort-für-Wort-Zuordnung von CATSS, griechische Wörter als Lemma (lxx-morph).' : S.cur === 'Q' ? 'Qumran-Rollen: was die biblischen Rollen dort haben, wo der masoretische Text dieses Wort hat – je erhaltene Rolle gezählt (maschinell zugeordnet, ETCBC DSS, CC BY-NC 4.0); von den Herausgebern ergänzte Wörter zählen nicht.' : S.cur === 'Samaritan' ? 'Samaritanus: nach belegten Lexemen der eigenen Wortanalysen gruppiert. Originalformen und Fundstellen bleiben erhalten; Wörter ohne sichere Zuordnung und Wortgruppen stehen separat.' : S.cur === 'Peshitta' ? 'Peschitta: nach belegten Lexemen der eigenen Wortanalysen gruppiert. Originalformen und Fundstellen bleiben erhalten; Wörter ohne sichere Zuordnung und Wortgruppen stehen separat.' : 'Targum nach der maschinellen Wortzuordnung zum Westminster-Text (ETCBC Targum Corpus, CC BY-NC 4.0).';
    { // was gerade eingeklappt ist (Formen einer Zeile, Einzelbelege, weitere Wiedergaben, weitere Merkmale) – die Suche im Fenster (wcFind) findet es und klappt es beim Springen auf
      const hid = [], gtxt = g => lab(g) + (g.gl ? ' ' + g.gl : '');
      if (X) { if (X.hidden) hid.push({ act: 'rows', sel: '.wcTrAllRows', text: X.hidden }); }
      else normal.concat(others).forEach(g => { const fm = g.forms.slice(1); if (g.refs && !g.other && S.open !== String(g.g) && fm.length) hid.push({ act: 'open', key: String(g.g), sel: `.wcTrR[data-g="${g.g}"]`, text: fm.map(f => f[0]).join(' \n ') }); });
      if (!X && main.length > shown.length) hid.push({ act: 'rows', sel: '.wcTrAllRows', text: main.slice(shown.length).map(gtxt).join(' \n ') });
      if (!X && fold && S.open !== 'ones') hid.push({ act: 'open', key: 'ones', sel: '.wcTrR.ones', text: ones.map(gtxt).join(' \n ') });
      if (restDims.length && !wcTrMore) hid.push({ act: 'more', sel: '.wcTrMoreB', text: restDims.map(d => I18N.t(d.name) + ' \n ' + d.vals.map(v => I18N.t(v[0])).join(' \n ')).join(' \n ') });
      S.hid = hid;
    }
    const fo = document.activeElement && box.contains(document.activeElement) && document.activeElement.closest('.wcTrR[data-g]'), foKey = fo && fo.dataset.g; // Tastaturfokus über das Neuzeichnen retten
    box.innerHTML = `<h4>${host.esc(I18N.t('Wie wird das Wort übersetzt?'))}${S.family ? ` <small class="wcTrLem">${host.esc(I18N.t('Wortfamilie'))} <bdi lang="he">${host.esc(S.family.root)}</bdi></small>` : lem ? ` <small class="wcTrLem"><span lang="he" dir="rtl">${host.esc(lem[0])}</span> ${host.esc(gloss(S.lemma))}</small>` : ''}</h4>
      ${hom}${tabs}
      <div class="wcTrF">${sum}${mainDims.map(dimRow).join('')}${wcTrMore ? restDims.map(dimRow).join('') : ''}</div>
      ${X ? `<div class="wcTrBody cmp"><div class="wcTrL">${X.list}</div></div>` : `<div class="wcTrBody"><div class="wcTrRingW">${ring}</div><div class="wcTrL">${list}</div></div>`}
      ${wcSameHtml(S,D)}<p class="muted wcLxN">${host.esc(I18N.t(note))}</p>`;
    // Ring und Liste hängen über die Farbe zusammen: Zeigen auf ein Segment hebt die Zeile hervor und umgekehrt
    const hl = k => box.querySelectorAll('.wcTrS, .wcTrR').forEach(x => x.classList.toggle('dim', k != null && x.dataset.s !== k));
    box.querySelectorAll('.wcTrS, .wcTrR').forEach(x => { if (!x.dataset.s) return; x.addEventListener('mouseenter', () => hl(x.dataset.s)); x.addEventListener('mouseleave', () => hl(null)); });
    if (foKey != null) { const n = [...box.querySelectorAll('.wcTrR[data-g]')].find(x => x.dataset.g === foKey); if (n) n.focus({ preventScroll: true }); }
  }
  // Targumim: häufigste aramäische Lexeme, mit denen Onkelos, Pseudo-Jonathan und Neofiti dieses hebräische Lemma wiedergeben
  // (maschinelle Wortzuordnung tools/targum/align.py, Index targum-ren.js); Klick schlägt das Lexem im Wörterbuch nach
  let tgRenP = null;
  const loadTgRen = () => tgRenP || (tgRenP = lazyScript('targum-ren.js', () => window.TARGUM_REN).catch(() => { tgRenP = null; return null; }));
  async function wcTgRen(token) {
    const { lemma } = fmCur;
    const X = await loadTgRen(), box = host.$('#wcTgR');
    if (token !== wcToken || !X || !box || !X[lemma]) return;
    const [labels, cells] = X[lemma], agg = labels.map(([l, g]) => ({ l, g, c: [0, 0, 0], n: 0 }));
    cells.forEach(([gi, , o, p, n]) => { const x = agg[gi]; x.c[0] += o; x.c[1] += p; x.c[2] += n; x.n += o + p + n; });
    const tot = agg.reduce((a, x) => a + x.n, 0), kinds = agg.filter(x => x.l !== '*').length + (agg.some(x => x.l === '*') ? 1 : 0);
    const list = agg.filter(x => x.n && x.l !== '*').sort((a, b) => b.n - a.n);
    if (!list.length) return;
    const mx = Math.max(...list.map(x => x.n)), TGN = ['Onkelos', 'Pseudo-Jonathan', 'Neofiti 1'], ct = [0, 0, 0]; list.forEach(x => x.c.forEach((v, i) => { ct[i] += v; }));
    box.hidden = false;
    box.innerHTML = `<h4>${host.esc(I18N.t('Wiedergabe in den Targumim'))} <small>${host.esc(I18N.t('{} Zuordnungen · {} aramäische Wörter', wcNum(tot), wcNum(kinds)))}</small></h4>
      <div class="wcLx wcTgX">${list.slice(0, 10).map(x => `<div class="wcLxR"><span class="wcTgW"><button type="button" class="g wcTgL" lang="arc" dir="rtl" data-q="${host.esc(x.l)}" title="${host.esc(I18N.t('Im Wörterbuch nachschlagen'))}">${host.esc(x.l)}</button>${x.g ? `<small class="muted">${host.esc(x.g)}</small>` : ''}</span><span class="b" title="${host.esc(x.c.map((v, i) => TGN[i] + ': ' + wcNum(v)).join(' · '))}">${x.c.map((v, i) => v ? `<i class="t${i}" style="width:${Math.max(1, v / mx * 100).toFixed(1)}%"></i>` : '').join('')}</span><small>${wcNum(x.n)}</small></div>`).join('')}</div>
      <p class="wcTgK">${TGN.map((t, i) => `<span><i class="t${i}"></i>${host.esc(t)} <small>${wcNum(ct[i])}</small></span>`).join('')}</p>
      <p class="muted wcLxN">${host.esc(I18N.t('Nach einer maschinellen Wort-für-Wort-Zuordnung der Targumim zum Westminster-Text (gleiche Wurzel, gleiche Bedeutung, feste Wiedergaben, Wortfolge); gezählt sind die aramäischen Lexeme ohne Vorsilben (ETCBC Targum Corpus, CC BY-NC 4.0). Klick auf ein Wort schlägt es im Wörterbuch nach.'))}</p>`;
  }
  async function wcPeshittaRen(token) {
    const card = fmCur, sources = await wcScopeSources(card);
    if (token !== wcToken || card !== fmCur) return;
    const D = sources.src.Peshitta, box = host.$('#wcPsR');
    if (!D || !box) return;
    const counts = new Map();
    D.cells.forEach(c => counts.set(c.g, (counts.get(c.g) || 0) + c.n));
    const rows = [...counts].map(([g, n]) => ({ g, n, ...D.labels[g] })).sort((a, b) => b.n - a.n);
    if (!rows.length) return;
    const max = rows[0].n, e = host.esc;
    const row = x => `<div class="wcLxR"><span class="wcPsW"><button type="button" class="g" lang="syr" dir="rtl" data-ps-group="${x.g}">${e(x.forms[0])}</button>${x.type === 'form' ? `<small>${e(I18N.t('Wortform ohne sichere Lemma-Zuordnung'))}</small>` : x.type === 'phrase' ? `<small>${e(I18N.t('Wortgruppen'))}</small>` : ''}</span><span class="b"><i style="width:${(x.n / max * 100).toFixed(1)}%"></i></span><small>${wcNum(x.n)}</small></div>`;
    box.innerHTML = `<h4>${e(I18N.t('Wiedergabe in der Peschitta'))} <small>${e(I18N.t('{} Belege', wcNum(D.total)))}</small></h4>
      <div class="wcLx wcPsX">${rows.slice(0, 10).map(row).join('')}</div>${rows.length > 10 ? `<details class="wcPsMore"><summary>${e(I18N.t('+ {} weitere', wcNum(rows.length - 10)))}</summary><div class="wcLx wcPsX">${rows.slice(10).map(row).join('')}</div></details>` : ''}
      <p class="muted wcLxN">${e(I18N.t('Peschitta (ETCBC): belegte syrische Wortformen aus den Interlinear-Zuordnungen zum Westminster-Text.'))} ${e(I18N.t('Gruppiert nach belegten Lemmata; Formen ohne sichere Lemma-Zuordnung und Wortgruppen bleiben getrennt. Klick zeigt die Originalformen und Stellen.'))}</p>`;
    box.hidden = false;
  }
  // Qumran (nichtbiblische Rollen, Index qumran-lex.js): Vorkommen des Lemmas (nach Konsonanten) je Buch mit Sprung zur Zeile
  async function wcQumran(token) {
    const { lem } = fmCur;
    if (!lem) return;
    const key = String(lem[0]).replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => 'כמנפצ'['ךםןףץ'.indexOf(c)]);
    const Q = await loadQum(), box = host.$('#wcQum');
    if (token !== wcToken || !Q || !box) return;
    const a = Q.l[key];
    if (!a || !a.length) return;
    const by = new Map();
    for (let i = 0; i < a.length; i += 3) { const b = a[i]; if (!by.has(b)) by.set(b, []); by.get(b).push([a[i + 1], a[i + 2]]); }
    const books = [...by.entries()].sort((x, y) => y[1].length - x[1].length);
    const CAP = 80;
    box.hidden = false;
    box.innerHTML = `<h4>${host.esc(I18N.t('In den Qumran-Rollen'))} <small>${host.esc(I18N.t('{} Zeilen in {} Büchern', wcNum(a.length / 3), wcNum(books.length)))}</small></h4>
      ${books.slice(0, 12).map(([b, rs]) => `<details class="wcQ"><summary><b>${host.esc(Q.b[b])}</b> <small>${wcNum(rs.length)}</small></summary><div class="fmRL">${rs.slice(0, CAP).map(([f, l]) => `<span class="fmR"><a data-ref="${host.esc(Q.b[b] + ' ' + f + ':' + l)}">${f}:${l}</a></span>`).join(' ')}${rs.length > CAP ? ' …' : ''}</div></details>`).join('')}
      ${books.length > 12 ? `<p class="muted">${host.esc(I18N.t('… und {} weitere Bücher', wcNum(books.length - 12)))}</p>` : ''}
      <p class="muted wcLxN">${host.esc(I18N.t('Nichtbiblische Rollen (ETCBC DSS, CC BY-NC 4.0); gezählt nach dem Lemma in Konsonantenschrift, daher können gleich geschriebene Wörter mitgezählt sein.'))}</p>`;
  }
  // Targumim (ETCBC, Neofiti 1, Pseudo-Jonathan und Onkelos zum Pentateuch): Verse, in denen ein Targum-Wort dieses Lemma als Lexem oder Wurzel hat
  const loadTgIdx = () => tgIdxP || (tgIdxP = lazyScript('targum-idx.js', () => window.TARGUM_IDX).catch(() => { tgIdxP = null; return null; }));
  let tgIdxP = null;
  async function wcTargum(token) {
    const { lem } = fmCur;
    if (!lem) return;
    const key = String(lem[0]).replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => 'כמנפצ'['ךםןףץ'.indexOf(c)]);
    const X = await loadTgIdx(), box = host.$('#wcTg');
    if (token !== wcToken || !X || !box || !X.r[key]) return;
    let n = 0; const refs = X.r[key].map(d => (n += d)), TGN = ['N', 'PJ', 'O'];
    const by = new Map(); // Vers -> [Targume]
    refs.forEach(r => { const t = r % 4, q = (r - t) / 4, v = q % 1000, c = Math.floor(q / 1000) % 100, b = Math.floor(q / 100000), k = X.b[b] + ' ' + c + ':' + v; if (!by.has(k)) by.set(k, [b, c, v, []]); by.get(k)[3].push(t); });
    const verses = [...by.entries()], CAP = 120, cnt = [0, 0, 0]; refs.forEach(r => cnt[r % 4]++);
    box.hidden = false;
    box.innerHTML = `<h4>${host.esc(I18N.t('In den Targumim'))} <small>${host.esc(I18N.t('{} Verse (Onkelos: {}, Neofiti 1: {}, Pseudo-Jonathan: {})', wcNum(verses.length), wcNum(cnt[2]), wcNum(cnt[0]), wcNum(cnt[1])))}</small></h4>
      <div class="fmRL">${verses.slice(0, CAP).map(([k, [, , , ts]]) => `<span class="fmR"><a data-ref="${host.esc(k)}">${host.esc(k)}</a><small>${[...new Set(ts)].sort((a, b) => (b === 2) - (a === 2) || a - b).map(t => TGN[t]).join(' ')}</small></span>`).join('')}</div>
      ${verses.length > CAP ? `<p class="muted">${host.esc(I18N.t('… und {} weitere Verse', wcNum(verses.length - CAP)))}</p>` : ''}
      <p class="muted wcLxN">${host.esc(I18N.t('Targum Onkelos (O, Ausgabe Sperber), Neofiti 1 (N) und Pseudo-Jonathan (PJ), ETCBC Targum Corpus (CC BY-NC 4.0); gezählt nach Lexem oder Wurzel des aramäischen Wortes in Konsonantenschrift, daher können verwandte oder gleich geschriebene Wörter mitgezählt sein.'))}</p>`;
  }
  // Griechische Karte: welche hebräischen Wörter gibt dieses Lemma wieder? (Gegenrichtung desselben Index); Klick öffnet die hebräische Wortkarte
  async function wcHeb(token) {
    const { lemma } = fmCur;
    const X = await loadLxx();
    if (token !== wcToken || !X || !window.Lxx) return;
    const r = window.Lxx.hebrew(X, lemma), box = host.$('#wcLxx'), LEM = window.OSHB_LEMMAS || {};
    if (!r || !r.list.length || !box) return;
    const mx = r.list[0].n;
    box.hidden = false;
    box.innerHTML = `<h4>${host.esc(I18N.t('Hebräische Vorlage'))} <small>${host.esc(I18N.t('{} Zuordnungen · {} hebräische Wörter', wcNum(r.total), wcNum(r.kinds)))}</small></h4>
      <div class="wcLx wcHb">${r.list.slice(0, 10).map(x => { const l = LEM[x.h]; return `<div class="wcLxR"><button type="button" class="g wcHL" data-hl="${host.esc(x.h)}" title="${host.esc(I18N.t('Hebräische Wortkarte öffnen'))}"><span lang="he" dir="rtl">${host.esc(l ? l[0] : x.h)}</span> <span class="muted">${host.esc(l ? (I18N.lang === 'de' && l[2] ? l[2] : l[1]) : '')}</span></button><span class="b"><i style="width:${Math.max(2, x.n / mx * 100).toFixed(1)}%"></i></span><small>${wcNum(x.n)}</small></div>`; }).join('')}</div>
      <p class="muted wcLxN">${host.esc(I18N.t('Hebräische Wörter (Westminster-Lemma), denen CATSS dieses griechische Wort Wort für Wort zuordnet – nur Bücher des Tanach mit CATSS-Fassung. Klick auf ein Wort öffnet seine Wortkarte.'))}</p>`;
  }
  // Lemma-Suche griechisch: Sprache „Andere“, Treffer „Alle Formen“
  function gSearchAll(lemma) {
    closeForms(); host.showTab('search');
    host.sEntApply({ q: lemma, l: 'other', m: 'lemma' });
    host.renderSearchSaved(); host.runSearch();
  }
  function wcSearchAll() { // Lemma-Suche in der Suchmaske: Hebräisch, Treffer „Alle Formen“
    const { lem } = fmCur; if (!lem) return;
    if (fmCur.family) { const { family, lemma } = fmCur; closeForms(); host.openConcordance(family.root, lemma); return; }
    if (fmCur.targum) { wcBookRefs('*', true); host.$('#wcBookRefs').scrollIntoView({ block: 'nearest' }); return; }
    if (fmCur.greek) { gSearchAll(lem[0]); return; }
    closeForms(); host.showTab('search');
    host.sEntApply({ q: lem[0].replace(/[^א-ת]/g, ''), l: 'he', m: 'lemma' });
    host.renderSearchSaved(); host.runSearch();
  }
  // ---------- Wortkarte: Verlauf (Zurück/Vor) ----------
  // Wie im Browser: jeder Schritt, der den Inhalt wesentlich wechselt (anderes Wort, anderer Reiter, Homonym, Fassung, Filter), legt einen Eintrag an und
  // schneidet den Vorwärts-Teil ab. Ein Eintrag hält den ganzen Zustand der Karte (Wort, Reiter, Fassung, Homonym, Filter, aufgeklappte Zeile, gewählte
  // Stellenlisten, Scrollposition); der Zustand des aktuellen Eintrags wird beim Verlassen nachgetragen. Der Verlauf bleibt über das Schließen hinaus
  // erhalten (bis zum Neustart), höchstens FM_HMAX Einträge.
  const FM_HMAX = 50;
  let fmHist = [], fmHi = -1, fmRest = null, fmActive = false, fmHold = null; // fmActive: die Wortkarte ist das Fenster, in dem man gerade arbeitet
  const wcTrLive = () => (wcTrState && fmCur && !fmCur.greek && !fmCur.syriac && wcTrState.tok === wcToken && wcTrState.base === fmCur.lemma ? wcTrState : null);
  const fmLemGloss = id => { const l = (window.OSHB_LEMMAS || {})[id]; return l ? (I18N.lang === 'de' && l[2] ? l[2] : l[1]) : ''; };
  function wcLemmaLabel(id) {
    const head = window.OSHB_LEMMAS?.[id]?.[0];
    return head ? [head, fmLemGloss(id) || id].join(' · ') : id;
  }
  function wcScope(family) {
    if (!fmCur || !!fmCur.family === family) return;
    const { lemma } = fmCur, h = fmHist[fmHi];
    fmHistSave();
    const next = { greek: false, lemma, family, info: h?.info, tab: fmTab, scroll: 0,
      tr: h?.tr ? { ...h.tr, f: {}, open: null, same: null, sameLimits: {}, allRows: false, refLim: 12 } : null };
    fmHistPush(next);
    openForms(lemma, next.info, fmTab, next);
  }
  function fmHistLabel(h) { // für den Tooltip: wohin führt der Schritt?
    if(h.info?.syriac)return h.info.query+' · SEDRA'+(h.tab==='forms'?' · '+I18N.t('Alle Formen (Tabelle)'):'');
    const l = !h.greek && (window.OSHB_LEMMAS || {})[h.lemma];
    let s = h.info && h.info.targum ? (((window.TARGUM_FORMS || {}).L || {})[h.lemma.slice(3)] || [[h.lemma]])[0][0] : h.greek ? h.lemma : l ? l[0] + ' ' + fmLemGloss(h.lemma) : String(h.lemma);
    if (h.tab === 'forms') s += ' – ' + I18N.t('Alle Formen (Tabelle)');
    else if (h.tr) {
      s += ' – ' + I18N.t(WC_TR_LABEL[h.tr.cur] || h.tr.cur);
      if (h.tr.cmp) s += ' ↔ ' + I18N.t(WC_TR_LABEL[h.tr.cmp] || h.tr.cmp);
      if (h.tr.lemma !== h.lemma && fmLemGloss(h.tr.lemma)) s += ' · ' + fmLemGloss(h.tr.lemma);
      const fv = Object.values(h.tr.f || {}); if (fv.length) s += ' · ' + fv.map(v => I18N.t(v)).join(', ');
    }
    return s;
  }
  function fmHistUI() {
    const mac = !!(window.platform && window.platform.isMac);
    [['#fmBack', -1, 'Zurück', 'Zurück: {}', mac ? 'Cmd+[' : 'Alt+←'], ['#fmFwd', 1, 'Vor', 'Vor: {}', mac ? 'Cmd+]' : 'Alt+→']].forEach(([id, d, none, to, key]) => {
      const b = host.$(id), h = fmHist[fmHi + d]; if (!b) return;
      b.disabled = !h; b.title = (h ? I18N.t(to, fmHistLabel(h)) : I18N.t(none)) + ' (' + key + ')';
    });
  }
  const fmKey = () => { const S = wcTrLive(); return JSON.stringify([fmTab, S ? [S.lemma, S.cur, S.f, S.cmp || 0] : 0]); };
  function fmHistSave() { // Zustand der gezeigten Karte in den aktuellen Eintrag schreiben
    const h = fmHist[fmHi], p = host.$('#formsPanel');
    if (!h || p.hidden || !fmCur || fmCur.lemma !== h.lemma || !!fmCur.greek !== h.greek) return; // geschlossen oder noch am Laden
    h.tab = fmTab; h.scroll = p.scrollTop;
    const S = wcTrLive(); if (S) h.tr = { lemma: S.lemma, cur: S.cur, cmp: S.cmp || null, f: { ...S.f }, open: S.open, allRows: S.allRows, refLim: S.refLim, same:S.same??null,sameLimits:{...S.sameLimits} };
    const bx = host.$('#wcBookRefs'), c = host.$('#wcBody .wcForms .fmF.sel'), fc = host.$('#fmBody .fmF.sel');
    h.book = (bx && bx.dataset.b) || ''; h.chip = c ? c.dataset.i : null; h.fchip = fc ? fc.dataset.i : null;
  }
  function fmHistPush(e) {
    fmHist.length = fmHi + 1; fmHist.push(e); // Vorwärts-Teil abschneiden
    if (fmHist.length > FM_HMAX) fmHist.splice(0, fmHist.length - FM_HMAX);
    fmHi = fmHist.length - 1; fmHistUI();
  }
  function fmHistOpen(greek, lemma, info, tab, rest) { // eine Wortkarte wird geöffnet (aus dem Text, aus einer anderen Karte, aus dem Wörterbuch …)
    if (rest) return; // Zurück/Vor: kein neuer Eintrag
    fmActive = !(typeof host.pins !== 'undefined' && host.pins.forms) || fmActive; // schwebend liegt die Karte über dem Text und ist damit das aktive Fenster; angepinnt erst nach einem Klick hinein
    fmHistSave();
    const fresh = { greek, lemma, family: false, info: info || null, tab: fmTabName(tab), tr: null, book: '', chip: null, fchip: null, scroll: 0 }, h = fmHist[fmHi];
    if (h && h.lemma === lemma && h.greek === greek) { Object.assign(h, fresh); fmHistUI(); } else fmHistPush(fresh); // dasselbe Wort noch einmal: kein doppelter Eintrag
  }
  // Schritt innerhalb der Karte (Reiter, Fassung, Filter, Homonym): vorher den Stand merken, danach – wenn sich etwas geändert hat – ein neuer Eintrag
  function fmStep(fn) {
    const h = fmHist[fmHi];
    if (!h || !fmCur || fmCur.lemma !== h.lemma) { fn(); return; }
    fmHistSave(); const before = fmKey(); fn();
    if (fmKey() === before) return;
    fmHistPush({ ...h, tr: h.tr ? { ...h.tr, f: { ...h.tr.f } } : null }); fmHistSave(); fmHistUI();
  }
  function fmRestTr(h) { // Übersetzungsstatistik: Homonym, Fassung, Filter, aufgeklappte Zeile eines Eintrags einsetzen
    const S = wcTrState, t = h.tr; if (!S || !t) return;
    if (t.lemma !== S.lemma) { const x = S.sis.find(s => s.id === t.lemma); if (x) { S.lemma = x.id; S.src = x.src; S.keys = x.keys; S.IR = x.IR; } }
    S.cur = S.keys.includes(t.cur) ? t.cur : S.keys[0]; S.cmp = t.cmp && t.cmp !== S.cur && S.keys.includes(t.cmp) ? t.cmp : null; S.pick = false; S.f = { ...t.f }; S.open = t.open; S.allRows = !!t.allRows; S.refLim = t.refLim || 12;S.same=t.same??null;S.sameLimits={...t.sameLimits};
    fmTrSelect(S.cur);
  }
  function fmScrollHold(top) { // Scrollposition halten, bis die nachgeladenen Abschnitte (Wörterbücher, Stellen …) stehen oder man selbst scrollt
    fmHold = { top, token: wcToken, until: Date.now() + 5000 }; host.$('#formsPanel').scrollTop = top;
  }
  function fmRestBase(h) { // Reiter, gewählte Stellenlisten und Scrollposition eines Eintrags
    fmShowTab(h.tab);
    if (fmCur) {
      if (host.$('#wcBookRefs')) wcBookRefs(h.book || null);
      if (host.$('#wcFormRefs')) wcFormRefs((h.chip != null && host.$$('#wcBody .wcForms .fmF').find(x => x.dataset.i === h.chip)) || null);
      host.$$('#fmBody .fmRefRow').forEach(x => x.remove()); host.$$('#fmBody .fmF.sel').forEach(x => x.classList.remove('sel'));
      const fc = h.fchip != null && host.$$('#fmBody .fmF').find(x => x.dataset.i === h.fchip);
      if (fc && fc.closest('tr')) { fc.classList.add('sel'); fmRefs(fc, false); }
    }
    fmScrollHold(h.scroll || 0);
  }
  function fmHistGo(d) {
    const k = fmHi + d, p = host.$('#formsPanel'); if (k < 0 || k >= fmHist.length || p.hidden) return;
    fmHistSave(); fmHi = k; const h = fmHist[k]; fmHistUI();
    host.hovApi && host.hovApi.hide();
    if (fmCur && fmCur.lemma === h.lemma && !!fmCur.greek === h.greek && !!fmCur.family === !!h.family && host.$('#wcBody .wcSec') && (!h.tr || wcTrLive())) { // dasselbe Wort: nur den Zustand umstellen
      if (h.tr) { fmRestTr(h); wcTrRender(); }
      fmRestBase(h);
    } else if(h.info?.syriac)openSForms(h.info.query,h.info,h.tab,h);
    else if (h.info && h.info.targum) openTForms(h.lemma.slice(3), h.info, h.tab, h);
    else (h.greek ? openGForms : openForms)(h.lemma, h.info, h.tab, h);
  }
  host.$('#fmBack').onclick = () => fmHistGo(-1);
  host.$('#fmFwd').onclick = () => fmHistGo(1);
  fmHistUI();
  if (window.ResizeObserver) { // nachgeladene Abschnitte ändern die Höhe: die wiederhergestellte Scrollposition nachführen
    const ro = new ResizeObserver(() => { const p = host.$('#formsPanel'); if (!fmHold) return; if (fmHold.token !== wcToken || Date.now() > fmHold.until) { fmHold = null; return; } if (Math.abs(p.scrollTop - fmHold.top) > 1) p.scrollTop = fmHold.top; });
    ro.observe(host.$('#wcBody')); ro.observe(host.$('#fmBody'));
  }
  ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach(ev => host.$('#formsPanel').addEventListener(ev, () => { fmHold = null; }, { passive: true, capture: true }));
  document.addEventListener('pointerdown', e => { fmActive = !!(e.target.closest && e.target.closest('#formsPanel')); }, true);
  host.$('#formsPanel').addEventListener('focusin', () => { fmActive = true; });

  // ---------- Wortkarte: Suche im Fenster (Cmd/Strg+F, solange die Wortkarte aktiv ist) ----------
  // Durchsucht Kopf und gezeigten Reiter; verglichen wird ohne Groß-/Kleinschreibung, hebräisch ohne Vokale und Akzente, griechisch ohne Akzente.
  // Auch Zugeklapptes wird gefunden und beim Springen aufgeklappt: Wörterbuchartikel, „+ weitere“, Abschnitte der Formentabelle sowie – über das
  // Verzeichnis S.hid aus wcTrRender – die Formen eingeklappter Zeilen, Einzelbelege, weitere Wiedergaben und „Weitere Merkmale“.
  // Nicht durchsucht werden die Stellen (Verse) eingeklappter Zeilen: sie werden erst beim Aufklappen geladen.
  const wcF = { hits: [], idx: -1, timer: null };
  const wcFHl = (name, rs) => { try { if (!rs.length) CSS.highlights.delete(name); else CSS.highlights.set(name, new Highlight(...rs)); } catch { /* ältere Engine */ } };
  const wcFCh = c => { let o = ''; for (const x of c.toLowerCase().normalize('NFD')) { if (/[̀-֑ͯ-ֽֿׁׂׄ-ׇ\u0730-\u074a]/.test(x)) continue; o += x === 'ς' ? 'σ' : x === '־' || /\s/.test(x) ? ' ' : x; } return o; };
  const wcFNorm = s => { let o = ''; for (const c of String(s)) o += wcFCh(c); return o.replace(/ +/g, ' '); };
  const wcFMore = h => h && h.nextElementSibling && h.nextElementSibling.matches('.wcDMoreB, .fmMoreB') ? h.nextElementSibling : null;
  const wcFindWanted = () => { const p = host.$('#formsPanel'); return !p.hidden && !document.querySelector('dialog[open]') && (fmActive || p.contains(document.activeElement) || p.matches(':hover')); };
  function wcFindRun(keep, scroll) {
    const p = host.$('#formsPanel'), prev = wcF.idx, cnt = host.$('#fmFindN'), q = wcFNorm(host.$('#fmFindIn').value).trim();
    wcF.hits = []; wcF.idx = -1; wcFHl('wcfind', []); wcFHl('wcfind-active', []); cnt.textContent = ''; cnt.title = '';
    if (host.$('#fmFind').hidden || p.hidden || !q) return;
    const hits = [];
    for (const root of [host.$('#fmHead'), host.$({ forms: '#fmBody', card: '#wcBody', concordance: '#fmConcordanceBody' }[fmTab])]) {
      const groups = new Map(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement; if (!el || el.closest('svg, script, style')) continue;
        const h = el.closest('[hidden]'); if (h && !wcFMore(h)) continue; // versteckt und nicht aufklappbar
        if (!h && !el.closest('details:not([open])') && el.checkVisibility && !el.checkVisibility()) continue;
        const key = el.closest('summary, p, li, td, th, button, h4, .ln, .bk, .wcTrR, .fm, .fmR, div') || root;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(node);
      }
      for (const nodes of groups.values()) {
        let n = ''; const map = []; let last = null; // map[i] = [Textknoten, Position] zu jedem Zeichen von n
        for (const node of nodes) {
          if (last && node.parentElement !== last && n && !n.endsWith(' ')) { n += ' '; map.push(null); } // getrennte Elemente (Wort und Zahl daneben) nicht zusammenziehen
          last = node.parentElement;
          const txt = node.nodeValue;
          for (let i = 0; i < txt.length; i++) for (const c of wcFCh(txt[i])) { if (c === ' ' && (!n || n.endsWith(' '))) continue; n += c; map.push([node, i]); }
        }
        for (let pos = n.indexOf(q); pos >= 0; pos = n.indexOf(q, pos + q.length)) {
          let s0 = pos, e0 = pos + q.length - 1;
          while (s0 <= e0 && !map[s0]) s0++;
          while (e0 >= s0 && !map[e0]) e0--;
          if (s0 > e0) continue;
          const r = document.createRange(); r.setStart(map[s0][0], map[s0][1]); r.setEnd(map[e0][0], map[e0][1] + 1); hits.push({ r });
        }
      }
    }
    const S = fmTab === 'card' && wcTrLive(); // Eingeklapptes der Übersetzungsstatistik: Treffer ohne Textstelle, an ihrer Zeile verankert
    if (S && S.hid) for (const x of S.hid) {
      const a = host.$('#wcTr ' + x.sel); if (!a) continue;
      const n = wcFNorm(x.text); let k = 0;
      for (let pos = n.indexOf(q); pos >= 0; pos = n.indexOf(q, pos + q.length)) { const r = document.createRange(); r.selectNodeContents(a); r.collapse(false); hits.push({ r, v: x, k: k++ }); }
    }
    hits.sort((a, b) => a.r.compareBoundaryPoints(Range.START_TO_START, b.r) || (a.k || 0) - (b.k || 0));
    wcF.hits = hits; wcFHl('wcfind', hits.filter(x => !x.v).map(x => x.r));
    cnt.title = I18N.t('Eingeklapptes wird mit durchsucht und beim Springen aufgeklappt; die Stellen einer eingeklappten Zeile erst nach dem Aufklappen.');
    if (!hits.length) { cnt.textContent = I18N.t('keine Treffer'); return; }
    if (keep && prev >= 0) wcFindGo(Math.min(prev, hits.length - 1), false);
    else { const j = hits.findIndex(x => !x.v); wcFindGo(j >= 0 ? j : 0, scroll); } // beim Tippen zuerst ein sichtbarer Treffer
  }
  function wcFindGo(i, scroll, reveal) {
    const n = wcF.hits.length, cnt = host.$('#fmFindN'); if (!n) return;
    i = ((i % n) + n) % n; const h = wcF.hits[i];
    if (h.v && reveal) { wcFindReveal(h); return; }
    wcF.idx = i; cnt.textContent = I18N.t('{} von {}', wcNum(i + 1), wcNum(n));
    if (h.v) { wcFHl('wcfind-active', []); const a = host.$('#wcTr ' + h.v.sel); if (a && scroll) a.scrollIntoView({ block: 'center', inline: 'nearest' }); return; }
    const el = h.r.startContainer.parentElement;
    if (scroll && el) {
      for (let d = el.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) d.open = true;
      const mb = wcFMore(el.closest('[hidden]')); if (mb) mb.click();
      fmHold = null; el.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    wcFHl('wcfind-active', [h.r]);
  }
  function wcFindReveal(h) { // Treffer in Eingeklapptem: aufklappen, neu suchen, zum ersten Treffer im Aufgeklappten
    const S = wcTrLive(), x = h.v; if (!S || !host.$('#wcTr')) return;
    const seen = new Set(host.$$('#wcTr .wcTrR[data-g]').map(e => e.dataset.g)), nfr = host.$$('#wcTr .wcTrFR').length;
    if (x.act === 'open') { S.open = x.key; S.refLim = 12; } else if (x.act === 'rows') S.allRows = true; else wcTrMore = true;
    wcTrRender(); wcFindRun(true, false);
    const inside = r => {
      const el = r.startContainer.parentElement;
      if (x.act === 'open') { const X = el.closest('.wcTrX'), R = X && X.previousElementSibling; return !!R && R.dataset.g === x.key; }
      if (x.act === 'rows') { const R = el.closest('.wcTrR[data-g]'); return !!R && !seen.has(R.dataset.g); }
      const F = el.closest('.wcTrFR'); return !!F && host.$$('#wcTr .wcTrFR').indexOf(F) >= nfr;
    };
    let j = wcF.hits.findIndex(y => !y.v && inside(y.r));
    if (j >= 0) { for (let c = 0; c < h.k && wcF.hits[j + 1] && !wcF.hits[j + 1].v && inside(wcF.hits[j + 1].r); c++) j++; wcFindGo(j, true); return; }
    const a = host.$('#wcTr ' + (x.act === 'open' ? `.wcTrR[data-g="${x.key}"]` : '.wcTrL')); // noch kein Text dazu (Stellen laden nach): die aufgeklappte Zeile zeigen
    if (a) { fmHold = null; a.scrollIntoView({ block: 'center', inline: 'nearest' }); const r0 = document.createRange(); r0.selectNode(a); const k = wcF.hits.findIndex(y => y.r.compareBoundaryPoints(Range.START_TO_START, r0) >= 0); if (k >= 0) wcFindGo(k, false); }
  }
  function wcFindStep(fwd) {
    if (!host.$('#fmFindIn').value.trim()) return;
    if (!wcF.hits.length) { wcFindRun(false, true); return; }
    const cur = wcF.hits[wcF.idx];
    if (cur && cur.v) { wcFindReveal(cur); return; } // der gezeigte Treffer steckt in einer eingeklappten Zeile: erst aufklappen
    wcFindGo(wcF.idx + (fwd ? 1 : -1), true, true);
  }
  function wcFindSoon() { if (host.$('#fmFind').hidden) return; clearTimeout(wcF.timer); wcF.timer = setTimeout(() => wcFindRun(true, false), 150); } // Inhalt hat sich geändert: Markierungen nachziehen, ohne zu springen
  function wcFindOpen() { const b = host.$('#fmFind'), i = host.$('#fmFindIn'); b.hidden = false; fmActive = true; i.focus(); i.select(); if (i.value.trim()) wcFindRun(true, false); }
  function wcFindClose() { clearTimeout(wcF.timer); host.$('#fmFind').hidden = true; wcF.hits = []; wcF.idx = -1; wcFHl('wcfind', []); wcFHl('wcfind-active', []); host.$('#fmFindN').textContent = ''; }
  host.$('#fmFindIn').addEventListener('input', () => wcFindRun(false, true));
  host.$('#fmFindIn').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); wcFindStep(!e.shiftKey); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); wcFindStep(e.key === 'ArrowDown'); }
  });
  host.$('#fmFindNext').onclick = () => wcFindStep(true);
  host.$('#fmFindPrev').onclick = () => wcFindStep(false);
  host.$('#fmFindX').onclick = wcFindClose;
  { const mo = new MutationObserver(wcFindSoon); ['#fmHead', '#wcBody', '#fmBody'].forEach(s => mo.observe(host.$(s), { childList: true, subtree: true, characterData: true })); }
  // Tasten der Wortkarte: Zurück/Vor (Alt+←/→, Cmd/Strg+[ / ]), Suche (Cmd/Strg+F), Escape schließt zuerst die Suche – alles nur, solange die Wortkarte aktiv ist
  document.addEventListener('keydown', e => {
    const p = host.$('#formsPanel'); if (p.hidden || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { if (!host.$('#fmFind').hidden) { e.preventDefault(); e.stopImmediatePropagation(); wcFindClose(); if (p.contains(document.activeElement)) document.activeElement.blur(); } return; }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') { if (wcFindWanted()) { e.preventDefault(); e.stopImmediatePropagation(); wcFindOpen(); } return; }
    let d = 0;
    if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return; d = e.key === 'ArrowLeft' ? -1 : 1; }
    else if (mod && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === ']')) d = e.key === '[' ? -1 : 1;
    if (!d || !(fmActive || p.contains(document.activeElement))) return;
    e.preventDefault(); e.stopImmediatePropagation(); fmHistGo(d);
  }, true);
  const closeForms = () => { fmHistSave(); wcFindClose(); fmActive = false; host.$('#formsPanel').hidden = true; host.hovApi && host.hovApi.hide(); wcToken++; };
  host.$('#fmClose').onclick = closeForms;
  host.$('#fmTabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (!b) return; fmStep(() => { fmShowTab(b.dataset.t); if (fmTab === 'forms') { const c = host.$('#fmBody .fmF.cur'); if (c) c.scrollIntoView({ block: 'center' }); } else host.$('#formsPanel').scrollTop = 0; }); });
  host.$('#wcBody').addEventListener('click', e => {
    if (!fmCur) return;
    if(fmCur.syriac){const b=e.target.closest('[data-sid],[data-family-id]');if(b){const id=b.dataset.sid||b.dataset.familyId,query=b.dataset.familyId?window.SEDRA_DATA.lexemes[id].form:fmCur.query;openSForms(query,{id},'card');return;}if(!e.target.closest('#wcDict,#wcSyriacMentions'))return;}

    const syGo=e.target.closest('.wcSyDictGo');if(syGo){const q=syGo.dataset.q,only={id:syGo.dataset.id,name:syGo.dataset.name};closeForms();host.showTab('dict');host.dictLookup(q,only);return;}
    const src = e.target.closest('.dbody .dsrc[data-sref]'); // Stellenangabe im aufgeklappten Wörterbuchartikel
    if (src) { e.preventDefault(); host.hovApi && host.hovApi.hide(); host.jumpTo(src.dataset.sref, host.BG(e)); return; }
    const dr = e.target.closest('.dbody .dref[data-q]'); if (dr) { closeForms(); host.openDict(dr.dataset.q); return; }
    const a = e.target.closest('.fmRL a[data-ref]');
    if (a) { host.hovApi && host.hovApi.hide(); host.jumpTo(a.dataset.ref, host.BG(e)); return; }
    const rx = e.target.closest('.fmRX'); if (rx) { if (rx.closest('#wcBookRefs')) wcBookRefs(null); else wcFormRefs(null); return; }
    const mb = e.target.closest('.wcDMoreB'); if (mb) { const m = mb.previousElementSibling; m.hidden = !m.hidden; mb.textContent = m.hidden ? I18N.t('+ {} weitere', mb.dataset.n) : I18N.t('weniger'); return; }
    const al = e.target.closest('.fmAll'); if (al) { if (al.closest('#wcBookRefs')) wcBookRefs(host.$('#wcBookRefs').dataset.b, true); else wcFormRefs(host.$('#wcBody .wcForms .fmF.sel'), true); return; }
    const rootButton = e.target.closest('.wcRoot');
    if (rootButton) {
      const lemma = fmCur.lemma;
      closeForms();
      host.openConcordance(rootButton.dataset.root, lemma);
      return;
    }
    if (e.target.closest('.wcAll')) { wcSearchAll(); return; }
    const gl = e.target.closest('.wcGL[data-gl]'); if (gl) { openGForms(gl.dataset.gl, null, 'card'); return; }
    const ps = e.target.closest('[data-ps-group]');
    if (ps && wcTrState?.src.Peshitta) {
      wcTrState.cur = 'Peshitta'; wcTrState.cmp = null; wcTrState.f = {}; wcTrState.open = ps.dataset.psGroup;
      wcTrRender(); host.$('#wcTr').scrollIntoView({ block: 'start' }); return;
    }
    const tq = e.target.closest('.wcTgL[data-q]'); if (tq) { host.openDict(tq.dataset.q); return; }
    const same=e.target.closest('.wcSamePick');if(same){const S=wcTrLive();if(S){S.same=S.same===same.dataset.g?null:same.dataset.g;S.sameLimits={};wcTrRender();host.$('#wcTr .wcSame')?.scrollIntoView({block:'nearest'});}return;}
    if(e.target.closest('.wcSameClose')){if(wcTrState){wcTrState.same=null;wcTrRender();}return;}
    const moreSame=e.target.closest('.wcSameMore');if(moreSame){const S=wcTrLive();if(S){S.sameLimits={...S.sameLimits,[moreSame.dataset.lemma]:+moreSame.dataset.limit};const opened=[...host.$$('#wcTr .wcSameEntry[open]')].map(x=>x.dataset.lemma);wcTrRender();host.$$('#wcTr .wcSameEntry').forEach(x=>x.open=opened.includes(x.dataset.lemma));}return;}
    const ts = e.target.closest('.wcTrSrc[data-src]'); if (ts) { fmStep(() => wcTrShow(ts.dataset.src, e.ctrlKey || e.metaKey)); return; }
    if (e.target.closest('.wcTrCmpB')) { wcTrCmpPick(); return; }
    if (e.target.closest('.wcTrCmpX')) { fmStep(wcTrCmpOff); return; }
    const tf = e.target.closest('.wcTrFV[data-dim]'); if (tf) { fmStep(() => wcTrFilt(tf.dataset.dim, tf.dataset.val)); return; }
    const th = e.target.closest('.wcTrHm[data-lem]'); if (th) { wcTrLemma(th.dataset.lem); return; }
    if (e.target.closest('.wcTrMoreB')) { wcTrMore = !wcTrMore; try { localStorage.setItem('wcTrMore', wcTrMore ? '1' : '0'); } catch { /* egal */ } wcTrRender(); return; }
    if (e.target.closest('.wcTrAllRows')) { if (wcTrState) { wcTrState.allRows = true; wcTrRender(); } return; }
    const tm = e.target.closest('.wcTrMoreRefs[data-to]'); if (tm) { if (wcTrState) { wcTrState.refLim = +tm.dataset.to; wcTrRender(); } return; }
    const tr = e.target.closest('.wcTrR.can[data-g]'); if (tr && !e.target.closest('a')) { wcTrRefs(tr.dataset.g); return; }
    const hl = e.target.closest('.wcHL[data-hl]'); if (hl) { openForms(hl.dataset.hl, null, 'card'); return; }
    const go = e.target.closest('.wcLink[data-go]'); if (go) { fmStep(() => { fmShowTab(go.dataset.go); host.$('#formsPanel').scrollTop = 0; }); return; }
    const dg = e.target.closest('.wcDGo'); if (dg) { const q = fmCur.lem[0], only = { id: dg.dataset.id, name: dg.dataset.name }; closeForms(); host.showTab('dict'); host.dictLookup(q, only, false, fmCur.syriac ? fmCur.id : undefined); return; }
    const bar = e.target.closest('.wcBar, .wcTop a[data-b]'); if (bar) { wcBookRefs(host.$('#wcBookRefs').dataset.b === bar.dataset.b ? null : bar.dataset.b); return; }
    const chip = e.target.closest('.wcForms .fmF'); if (chip) { wcFormRefs(chip.classList.contains('sel') ? null : chip); }
  });
  host.$('#wcBody').addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest && e.target.closest('.wcTrR.can[data-g]'); if (!tr || e.target !== tr) return; e.preventDefault(); wcTrRefs(tr.dataset.g); });
  { // Balken: Buch und Zahl sofort beim Überfahren (und bei Tastaturfokus)
    const tip = (b, on) => {
      const t = host.$('#wcBody .wcTip'); if (!t) return;
      if (!on || !fmCur) { t.hidden = true; return; }
      const x = fmCur.F.dist(fmCur.D, fmCur.mdl).find(q => q.book === b.dataset.b); if (!x) return;
      t.innerHTML = `<b>${host.esc(fmBook(x.book))}</b> ${x.n ? host.esc(I18N.t('{}× in {} Versen', wcNum(x.n), wcNum(x.verses))) + ` <span class="muted">· ${host.esc(I18N.t('{} je 1000 Verse', (x.verses / x.size * 1000).toLocaleString(I18N.loc, { maximumFractionDigits: 1 })))}</span>` : host.esc(I18N.t('kein Beleg'))}`;
      t.hidden = false;
      const c = t.parentElement.getBoundingClientRect(), r = b.getBoundingClientRect();
      t.style.left = Math.max(0, Math.min(c.width - t.offsetWidth, r.left - c.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    };
    host.$('#wcBody').addEventListener('mouseover', e => { const b = e.target.closest('.wcBar'); if (b) tip(b, true); });
    host.$('#wcBody').addEventListener('mouseout', e => { const b = e.target.closest('.wcBar'); if (b && !b.contains(e.relatedTarget)) tip(b, false); });
    host.$('#wcBody').addEventListener('focusin', e => { const b = e.target.closest('.wcBar'); if (b) tip(b, true); });
    host.$('#wcBody').addEventListener('focusout', e => { const b = e.target.closest('.wcBar'); if (b) tip(b, false); });
  }
  { const refOf = e => { const a = e.target.closest('.fmRL a[data-ref], .dbody .dsrc[data-sref]'); return a ? [a, (a.dataset.ref || a.dataset.sref).replace(/-.*$/, '')] : [null, '']; };
    host.$('#wcBody').addEventListener('mouseover', e => { const [a, ref] = refOf(e); if (!a || !host.hovApi || ref === host.hovApi.current()) return; host.hovApi.start(a, ref, true, false, wcHovPick(a)); });
    host.$('#wcBody').addEventListener('mouseout', e => { const [a] = refOf(e); if (a && host.hovApi && !a.contains(e.relatedTarget)) host.hovApi.hide(); }); }
  { let z = 1; try { z = +localStorage.getItem('fmZoom') || 1; } catch { /* egal */ }
    const apz = () => {
      z = Math.max(0.7, Math.min(2, Math.round(z * 20) / 20));
      for (const selector of ['#fmHead', '#wcBody', '#fmBody', '#fmConcordanceBody']) {
        host.$(selector).style.zoom = z;
      }
      try { localStorage.setItem('fmZoom', String(z)); } catch { /* egal */ }
    };
    apz();
    host.$('#fmSm').onclick = () => { z -= 0.1; apz(); }; host.$('#fmBg').onclick = () => { z += 0.1; apz(); };
    host.$('#fmSm').ondblclick = host.$('#fmBg').ondblclick = () => { z = 1; apz(); }; }
  { let wide = false; try { wide = localStorage.getItem('fmWide') === '1'; } catch { /* egal */ }
    const ap = () => host.$('#formsPanel').classList.toggle('wide', wide); ap();
    host.$('#fmWide').onclick = () => { wide = !wide; const panel=host.$('#formsPanel');panel.classList.remove('panel-sized');ap();window.dispatchEvent(new CustomEvent('study-panel-width',{detail:wide?1040:560}));try { localStorage.removeItem('panelSize:formsPanel');localStorage.setItem('fmWide', wide ? '1' : '0'); } catch { /* egal */ } }; }
  host.$('#fmConcordanceBody').addEventListener('click', e => {
    if (e.target.closest('[data-cc-retry]')) { const mode = wcConcordance?.mode; wcConcordance = null; wcLoadConcordance(mode); return; }
    if (wcConcordance?.token !== wcToken) return;
    const mode = e.target.closest('[data-cc-mode]')?.dataset.ccMode;
    if (mode) { wcLoadConcordance(mode); return; }
    if (e.target.closest('[data-cc-search]')) { host.openConcordance(wcConcordance.query, wcConcordance.root, wcConcordance.exactLemma); return; }
    const button = e.target.closest('[data-cc-hit]');
    if (!button) return;
    const hit = wcConcordance.results[+button.dataset.ccHit];
    const target = button.dataset.ccPeer == null ? hit : hit?.parallels?.[+button.dataset.ccPeer];
    if (target) {host.hovApi?.hide();host.openConcordanceHit(target, host.BG(e));}
  });
  { // Aligned Greek/Syriac peers: full native verse, exact aligned positions.
    const box=host.$('#fmConcordanceBody');
    const start=e=>{
      const button=e.target.closest('[data-cc-hit]');
      if(!button||button.contains(e.relatedTarget)||wcConcordance?.token!==wcToken||!host.hovApi)return;
      const row=wcConcordance.results[+button.dataset.ccHit],hit=button.dataset.ccPeer==null?row:row?.parallels?.[+button.dataset.ccPeer];
      if(hit)host.hovApi.start(button,[hit.title,hit.where].join(' · '),true,false,{concordance:hit});
    };
    const stop=e=>{const b=e.target.closest('[data-cc-hit]');if(b&&!b.contains(e.relatedTarget))host.hovApi?.hide();};
    box.addEventListener('mouseover',start);box.addEventListener('focusin',start);
    box.addEventListener('mouseout',stop);box.addEventListener('focusout',stop);
  }
  host.$('#fmHead').addEventListener('click', e => { const scope=e.target.closest('[data-wc-scope]');if(scope){wcScope(scope.dataset.wcScope==='family');return;}const hom=e.target.closest('.wcTrHm[data-lem]');if(hom){wcTrLemma(hom.dataset.lem);return;}const b = e.target.closest('.wdict'); if (b) host.openDict(b.dataset.q,null,b.dataset.sedraId); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !host.$('#formsPanel').hidden && !host.$('#formsPanel').classList.contains('docked') && !document.querySelector('dialog[open]')) closeForms(); });
  // Belegstellen einer Form: nach Büchern geordnet, als Zeile unter der Tabellenzeile
  function fmBook(b) { // griechische Bücher in zwei Fassungen tragen ein Kennzeichen: „Judges (B)“, „Daniel (Theodotion)“
    const m = /^(.*?)( \((?:A|B|Theodotion|Sinaiticus|Onkelos|Neofiti 1|Pseudo-Jonathan)\))?$/.exec(b), base = m[1];
    return ((I18N.lang === 'de' && host.deNames(base).split(' / ')[0]) || base) + (m[2] || '');
  }
  function fmRefs(chip, all) {
    const { D, mdl } = fmCur, rs = fmCur.F.refs(D, mdl, chip.dataset.i), CAP = 300;
    const shown = all ? rs : rs.slice(0, CAP), n = rs.reduce((s, r) => s + r.n, 0);
    const lines = []; let lb = null;
    for (const r of shown) {
      if (r.book !== lb) { lines.push(`<b>${host.esc(fmBook(r.book))}</b> `); lb = r.book; } else lines[lines.length - 1] += ' ';
      lines[lines.length - 1] += `<span class="fmR"><a data-ref="${host.esc((r.title || r.book) + ' ' + r.ch + ':' + r.v)}"${r.vt ? ` data-gvt="${host.esc(r.vt)}"` : ''}${r.lemmas ? wcRefLemmaAttrs(r) : ''}>${r.ch}${I18N.lang === 'de' ? ',' : ':'}${r.v}</a>${r.n > 1 ? `<small>×${r.n}</small>` : ''}${r.lemmas ? wcRefLemmas(r) : ''}</span>`;
    }
    const more = rs.length > shown.length ? `<div><button type="button" class="fmAll">${host.esc(I18N.t('alle {} Verse zeigen', rs.length.toLocaleString(I18N.loc)))}</button></div>` : '';
    const tr = document.createElement('tr'); tr.className = 'fmRefRow';
    tr.innerHTML = `<td colspan="99"><div class="fmRH"><span dir="${fmCur.greek ? 'ltr' : 'rtl'}" lang="${fmCur.targum ? 'arc' : fmCur.greek ? 'grc' : 'he'}">${host.esc(chip.querySelector('span').textContent)}</span><span class="muted">${host.esc(I18N.t('{}× in {} Versen', n.toLocaleString(I18N.loc), rs.length.toLocaleString(I18N.loc)))}</span><button type="button" class="fmRX" title="Schließen">✕</button></div><div class="fmRL">${lines.map(l => `<div>${l}</div>`).join('')}${more}</div></td>`;
    chip.closest('tr').after(tr);
  }
  host.$('#fmBody').addEventListener('click', e => {
    const closeRefs = () => { host.$$('#fmBody .fmRefRow').forEach(x => x.remove()); host.$$('#fmBody .fmF.sel').forEach(x => x.classList.remove('sel', 'trsel')); };
    const a = e.target.closest('.fmRL a[data-ref]');
    if (a) { host.hovApi && host.hovApi.hide(); host.jumpTo(a.dataset.ref, host.BG(e)); return; }
    if (e.target.closest('.fmRX')) { closeRefs(); return; }
    if (e.target.closest('.fmAll')) { const c = host.$('#fmBody .fmF.sel'); if (c && fmCur) { host.$$('#fmBody .fmRefRow').forEach(x => x.remove()); fmRefs(c, true); } return; }
    const mb = e.target.closest('.fmMoreB');
    if (mb) { const m = mb.previousElementSibling; m.hidden = !m.hidden; mb.textContent = m.hidden ? '+' + mb.dataset.n : '−'; return; }
    const nv = e.target.closest('.fmNav button');
    if (nv) { const s = host.$(`#fmBody .fmSec[data-sec="${nv.dataset.sec}"]`); if (s) { s.open = true; s.scrollIntoView({ block: 'start' }); } return; }
    const tm = e.target.closest('.fmTrMore[data-to]'); // Wiedergaben einer Form: weitere Stellen
    if (tm) { const c = host.$('#fmBody .fmF.trsel'); if (c && fmCur) { host.$$('#fmBody .fmRefRow').forEach(x => x.remove()); fmTrRefs(c, +tm.dataset.to); } return; }
    const chip = e.target.closest('.fmF');
    if (chip && fmCur && e.target.closest('.fmTrL.can')) { // Klick auf die Wiedergabe: alle Wiedergaben und Stellen dieser Form
      const was = chip.classList.contains('trsel'); closeRefs(); if (!was) { chip.classList.add('sel', 'trsel'); fmTrRefs(chip); } return;
    }
    if (chip && fmCur) { const was = chip.classList.contains('sel') && !chip.classList.contains('trsel'); closeRefs(); if (!was) { chip.classList.add('sel'); fmRefs(chip, false); } }
  });
  // Vorschau des Verses beim Überfahren einer Belegstelle (wie bei den Verknüpfungen)
  host.$('#fmBody').addEventListener('mouseover', e => { const a = e.target.closest('.fmRL a[data-ref]'); if (!a || !host.hovApi || a.dataset.ref === host.hovApi.current()) return; host.hovApi.start(a, a.dataset.ref, true, false, wcHovPick(a)); });
  host.$('#fmBody').addEventListener('mouseout', e => { const a = e.target.closest('.fmRL a[data-ref]'); if (a && host.hovApi && !a.contains(e.relatedTarget)) host.hovApi.hide(); });
  host.$('#formsPanel').addEventListener('scroll', () => host.hovApi && host.hovApi.hide(), { passive: true });

    return {
      get canReopen(){return !!fmCur||fmHi>=0;},
      reopen() { if(!fmCur&&fmHi<0)return false;host.$('#formsPanel').hidden=false;fmActive=true;if(!fmCur)fmHistGo(0);return true; },
      get gSearchAll() { return gSearchAll; },
      get ilRenP() { return ilRenP; }, set ilRenP(value) { ilRenP = value; },
      get lazyScript() { return lazyScript; },
      get loadForms() { return loadForms; },
      get loadTForms() { return loadTForms; },
      async matchSyriacAnalysis(query,part){if(!part)return null;try{return (await loadSyriacCards()).matchAnalysis(query,part);}catch{return null;}},
      get canOpenCard(){return canOpenCard;},
      get openTextCard(){return openTextCard;},
      get openSForms() { return openSForms; },
      get openForms() { return openForms; },
      get openGForms() { return openGForms; },
      get openTForms() { return openTForms; },
      get wcFindOpen() { return wcFindOpen; },
      get wcFindWanted() { return wcFindWanted; },
      get wcTrCtxLoad() { return wcTrCtxLoad; },
      get wcTrState() { return wcTrState; }, set wcTrState(value) { wcTrState = value; },
      get wcVerseWords() { return wcVerseWords; },
    };
  }
  return { create };
})();
