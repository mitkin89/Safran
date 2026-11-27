// Interlinear-Anzeige: Auswahl, Legende, Wortgruppen und Hervorhebungen.
// Ein Zustand je Lesefenster; gemeinsame Quellen bleiben auch für Wortkarten
// und Vorschauen zugänglich und werden über eine explizite Schnittstelle übergeben.
window.LibraryInterlinear = (() => {
  'use strict';
  function create({ $, $$, esc, cache, getView, portraitOf, consOf, apChap, verseOf, openSamaritan, openGreek, sources, afterRefresh, mishnah, stripHe }) {
    const O = window.offline;
    const { loadIL, resetPrivateIL, IL_TG, IL_QK, ilName,
      loadTgIL, tgVer, tgSegs, tgDoc, tgPlain, loadQIL, qVer,
      ilLxxVer, ilLxxDoc, ilLxxSegs, loadSmrIL, loadPsIL, loadAlIL } = sources;
    let ilTr = 'Zunz'; try { ilTr = localStorage.getItem('interlinTr') || 'Zunz'; } catch { /* egal */ }
    let ilOn = false; try { ilOn = localStorage.getItem('interlin') === '1'; } catch { /* egal */ }
    $('#importInterlinear').onclick = async () => {
      const r = await O.interlinearImport();
      if (r.canceled) return;
      if (r.error) { alert(I18N.t('Interlinear-Import fehlgeschlagen: {}', r.error)); return; }
      if (!ilPick.includes('BuberRosenzweig')) { ilPick.push('BuberRosenzweig'); ilSave(); }
      await resetPrivateIL();
      alert(I18N.t('{} Verse lokal für Buber/Rosenzweig eingebunden.', r.verses));
    };
    // Jede deutsche Übersetzung steht als eigene Zeile unter dem Wort (bzw. unter der Wortgruppe); Segmente mit mehreren Wörtern („als die Richter richteten“) stehen einmal unter der zusammengehörigen Wortgruppe.
    // Mit mehreren Übersetzungen werden die Gruppen aller Übersetzungen zusammengefasst, jede Übersetzung hat ihre Zeile (Farbe + Kürzel).
    const ilHlClear = () => $$('#rOut .ilhl').forEach(x => x.classList.remove('ilhl'));
    function ilClear() {
      ilHlClear();
      $$('#rOut .taam-break').forEach(e=>e.remove());
      $$('#rOut .ilg').forEach(g => { const inner = g.firstChild; while (inner.firstChild) g.parentNode.insertBefore(inner.firstChild, g); g.remove(); });
    }
    // trs: [[Name, Segmente, Sigel?]] – ein Vers; Segmente [[Wortnummern], Text, Art?] (Art nur bei Qumran: 0 gleich, 1 Schreibweise, 2 Lesart, 3 rekonstruiert, 4 Plus)
    function ilVerse(cell, trs, order) {
      const ws = [...cell.querySelectorAll('.w')], n = ws.length; if (!n) return;
      const par = Array.from({ length: n + 2 }, (_, i) => i), find = x => par[x] === x ? x : (par[x] = find(par[x]));
      const union = (x, y) => { x = find(x); y = find(y); if (x < y) par[y] = x; else if (y < x) par[x] = y; };
      const info = trs.map(([name, segs, sig]) => {
        const lead = new Map(), memberOf = new Map(); // Anführer-Wort -> [[Nr, Text, Wörter]]; Mitglieds-Wort -> Anführer
        segs.forEach(([idx, t, kind, meta], k) => { if (!idx.length) return; const L = Math.min(...idx); (lead.get(L) || lead.set(L, []).get(L)).push([k, t, idx, kind, meta]); idx.forEach(i => { if (i !== L) memberOf.set(i, L); }); });
        lead.forEach((_, L) => memberOf.delete(L));
        const run = new Map(); // Anführer -> letztes Wort der zusammenhängenden Gruppe
        lead.forEach((_, L) => { let e = L; while (memberOf.get(e + 1) === L && e < n) e++; run.set(L, e); for (let i = L + 1; i <= e; i++) union(L, i); });
        const marks = new Map(); // Wort, das zu einer nicht zusammenhängenden Gruppe gehört -> Wörter der Gruppe
        memberOf.forEach((L, i) => { if (!(i > L && i <= run.get(L))) marks.set(i, [...new Set(lead.get(L).flatMap(x => x[2]))]); });
        // Qumran: Wörter der Rolle ohne Gegenstück (Plus) hängen am vorigen zugeordneten Wort (am Anfang: am ersten)
        segs.forEach(([idx, t, kind, meta], k) => { if (idx.length || !(sig || meta?.kind === 'addition')) return; let j = k - 1; while (j >= 0 && !segs[j][0].length) j--; let L = meta?.boundary!=null ? Math.max(1,meta.boundary) : j >= 0 ? Math.min(...segs[j][0]) : null; if (L == null) { const nx = segs.find(x => x[0].length); L = nx ? Math.min(...nx[0]) : null; } if (L != null) (lead.get(L) || lead.set(L, []).get(L)).push([k, t, [], kind, meta]); });
        return { name, lead, marks, sig, shown: false };
      });
      const units = new Map(); // Anfang -> Ende
      for (let i = 1; i <= n; i++) { const r = find(i); units.set(r, Math.max(units.get(r) || 0, i)); }
      const multi = trs.length > 1, mk = (cls, txt, ix) => { const e = document.createElement('span'); e.className = cls; if (txt != null) e.textContent = txt; if (ix) e.dataset.ix = ix.join(','); return e; };
      [...units].forEach(([st, en]) => {
        const lines = info.map(inf => {
          const { name, lead, marks, sig } = inf;
          const line = mk('ilt'); line.dataset.tr = name; line.dataset.i = order.indexOf(name) + 1; line.title = (IL_LABEL[name] || name) + (sig ? ' · ' + sig : ''); if(name==='Peshitta'){line.lang='syr';line.dir='rtl';line.classList.add('il-ps');} else if(name==='Aleppo'){line.lang='he';line.dir='rtl';line.classList.add('il-ma');if(sig){if(!inf.shown){inf.shown=true;line.classList.add('il-ma-lost');}line.title=I18N.t(IL_LABEL.Aleppo)+' · '+I18N.t('Aleppo-Kodex hier verloren; MAM folgt anderen tiberischen Handschriften');}} else if(name==='Samaritan'){line.lang='he';line.dir='rtl';line.classList.add('il-smr');} else if (name === 'LXX') line.lang = 'grc'; else if (IL_TG[name]) { line.lang = 'arc'; line.dir = 'rtl'; } else if (sig) { line.lang = 'he'; line.dir = 'rtl'; line.classList.add('ilq'); }
          const parts = []; for (let L = st; L <= en; L++) (lead.get(L) || []).forEach(x => parts.push(x));
          if (sig && name !== 'Samaritan' && name !== 'Aleppo' && parts.length && !inf.shown) { inf.shown = true; line.append(mk('ilsig', sig)); } // Sigel der Rolle beim ersten erhaltenen Wort des Verses
          const sorted = parts.sort((x, y) => x[0] - y[0]), runEnd = new Map(); // lange Zusätze (ab 4 Wörtern) eingeklappt
          for (let j = 0; j < sorted.length; ) { if (sorted[j][4]?.kind !== 'addition') { j++; continue; } let e = j; while (e + 1 < sorted.length && sorted[e + 1][4]?.kind === 'addition' && sorted[e + 1][0] === sorted[e][0] + 1) e++; if (e - j >= 3) runEnd.set(j, e); j = e + 1; }
          let tgt = line, openEnd = -1;
          sorted.forEach(([k, t, idx, kind, meta], j) => { if (runEnd.has(j)) { const d = document.createElement('details'), su = document.createElement('summary'); d.className = 'il-plusrun'; su.textContent = '+' + (runEnd.get(j) - j + 1); su.title = I18N.t('Zusatz gegenüber dem MT'); d.append(su); if (j) line.append(' '); line.append(d); tgt = d; openEnd = runEnd.get(j); } if (j && !runEnd.has(j)) tgt.append(k === parts[j - 1][0] + 1 ? ' ' : ' … '); const e = mk('ils', ['Samaritan','Peshitta'].includes(name)?null:t, idx.length ? idx : null); if(name==='Samaritan'){e.innerHTML=window.SamaritanInterlinear.wordHtml(t,meta,esc);if(idx.length)e.classList.add('ilx');} if(name==='Peshitta'&&meta?.kind!=='missing'){e.innerHTML=window.PeshittaAlignment.wordHtml(t,meta,esc);if(idx.length)e.classList.add('ilx');e.dataset.mtRef=meta.mtRef;e.title=I18N.t(meta.reviewed?(meta.reviewedBy==='Claude'?'Am Text geprüft (Claude)':'Am Text geprüft (Codex)'):'Automatischer Zuordnungsvorschlag, nicht manuell geprüft')+' · '+I18N.t(meta.origin==='patracosy'?'Zuordnung aus PaTraCoSy':'Zuordnung mit Onkelos als Hilfe erschlossen (nicht Onkelos-Text)');} if(name==='LXX'&&meta?.lxx){e.classList.add('il-lxx-word');e.tabIndex=0;e.setAttribute('role','button');e.addEventListener('click',ev=>{ev.stopPropagation();openGreek(e,meta.lxx);});e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();e.click();}});} if(name==='Aleppo'&&meta?.d){e.classList.add('il-ma-'+meta.d);e.title=I18N.t(AL_KIND[meta.d]);} if(name==='Aleppo'&&idx.length===1&&!['k','w'].includes(meta?.d)&&!meta?.kind){const mw=ws[idx[0]-1];if(mw?.dataset.m){e.classList.add('wa');e.dataset.m=mw.dataset.m;if(mw.dataset.l)e.dataset.l=mw.dataset.l;}} if (kind != null) { e.classList.add('ilq' + kind); e.title = I18N.t(IL_QK[kind]) + (kind !== 3 && /[\[\]]/.test(t) ? ' · enthält von den Herausgebern ergänzte Buchstaben' : ''); } if (meta?.kind === 'addition' && name !== 'Samaritan') { e.classList.add('il-plus'); e.title = I18N.t('Zusatz gegenüber dem MT') + (e.title ? ' · ' + e.title : ''); } else if (meta?.kind === 'missing' && name !== 'Samaritan') { e.className = 'ils il-minus'; e.textContent = '—'; e.title = I18N.t('Im MT vorhanden, in dieser Fassung ohne Wiedergabe'); } tgt.append(e);  if (j === openEnd) { tgt = line; openEnd = -1; } });
          if (!parts.length) for (let i = st; i <= en; i++) if (marks.has(i)) { line.append(mk('ils ilm', '…', marks.get(i))); break; }
          return line;
        });
        if (!lines.some(l => l.firstChild) && st === en) return; // nichts darunter zu zeigen
        const g = mk('ilg'), inner = mk('ilw'); g.appendChild(inner); g.dataset.multi = multi ? '1' : '';
        ws[st - 1].parentNode.insertBefore(g, ws[st - 1]);
        for (let nd = ws[st - 1], last = ws[en - 1]; nd; ) { const nx = nd.nextSibling; inner.appendChild(nd); if (nd === last) break; nd = nx; }
        lines.forEach(l => g.appendChild(l));
      });
    }
    // ---------- Wörter über alle geöffneten Versionen verbinden ----------
    // In den deutschen Spalten (Zunz, Breuer …) sind die Wortgruppen nach der Zuordnung in interlin.js anklickbar (.ilx, data-ix = Nummern der Westminster-Wörter).
    // Ein Klick auf eine solche Gruppe, auf ein Westminster-Wort oder auf ein Septuaginta-Wort lässt in allen geöffneten Versionen die zugehörigen Wörter leuchten.
    function ilTagCell(cell, segs) {
      const txt = cell.querySelector('.txt'); if (!txt || txt.dataset.ilx) return;
      const nodes = [], tw = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT);
      for (let nd; (nd = tw.nextNode()); ) if (!nd.parentElement.closest('.note, sup')) nodes.push(nd);
      let full = '', starts = nodes.map(nd => { const p = full.length; full += nd.data; return p; });
      const space = s => String(s).replace(/\s+/g, ' ').trim();
      if (space(full) !== space(segs.map(([, text]) => text).join(' '))) return;
      txt.dataset.ilx = '1';
      const hits = []; let pos = 0;
      for (const [idx, t] of segs) {
        const w = t.trim(); if (!w) continue;
        const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'g'); re.lastIndex = pos;
        const m = re.exec(full); if (!m || m.index - pos > 80) continue;
        pos = m.index + m[0].length; if (idx.length) hits.push([m.index, pos, idx]);
      }
      for (let h = hits.length - 1; h >= 0; h--) { // von hinten, damit die Textknoten davor unverändert bleiben
        const [s0, e0, idx] = hits[h];
        for (let k = nodes.length - 1; k >= 0; k--) {
          const nd = nodes[k], ns = starts[k], ne = ns + nd.data.length, s = Math.max(s0, ns) - ns, e = Math.min(e0, ne) - ns;
          if (e <= s) continue;
          let mid = s > 0 ? nd.splitText(s) : nd; if (e - s < mid.data.length) mid.splitText(e - s);
          const sp = document.createElement('span'); sp.className = 'ilx'; sp.dataset.ix = idx.join(','); mid.replaceWith(sp); sp.appendChild(mid);
        }
      }
    }
    function ilLink(src) {
      let row = src.closest('.row'); if (!row) return;
      if(src.dataset.mtRef){const section=getView()?.sections?.[getView().idx],chap=section&&apChap(section),[c,v]=src.dataset.mtRef.split(':');if(String(chap)!==c)return;row=[...$$('#rOut .row[data-l]')].find(r=>String(verseOf(r.dataset.l))===v&&r.querySelector('.cell[data-mt]'));if(!row)return;}
      const hc = [...row.querySelectorAll('.cell[data-k="he"]')].find(c => c.querySelector('.w')); if (!hc) return;
      const ws = [...hc.querySelectorAll('.w')], cons = ws.map(w => consOf(w.textContent)), nth = (arr, i) => arr.slice(0, i).filter(x => x === arr[i]).length;
      let ix = [];
      if (src.classList.contains('ilx')) ix = src.dataset.ix.split(',').map(Number);
      else if (src.classList.contains('w') && hc.contains(src)) ix = [ws.indexOf(src) + 1];
      else if (src.classList.contains('wg')) {
        const c = consOf(src.dataset.h), same = [...src.closest('.cell').querySelectorAll('.wg')].filter(x => consOf(x.dataset.h) === c), k = same.indexOf(src);
        const at = cons.map((x, i) => x === c ? i : -1).filter(i => i >= 0)[k]; if (at != null) ix = [at + 1];
      }
      ix = ix.filter(i => i >= 1 && i <= ws.length); if (!ix.length) return;
      const was = src.classList.contains('ilhl'); ilHlClear(); if (was) return;
      const set = new Set(ix),section=getView()?.sections?.[getView().idx],mtRef=section?apChap(section)+':'+verseOf(row.dataset.l):null;
      ix.forEach(i => ws[i - 1].classList.add('ilhl'));
      row.querySelectorAll('.ilx').forEach(x => { if ((!x.dataset.mtRef||x.dataset.mtRef===mtRef)&&x.dataset.ix.split(',').some(i => set.has(+i))) x.classList.add('ilhl'); });
      row.querySelectorAll('.cell').forEach(c => {
        if (c === hc) return;
        const wg = [...c.querySelectorAll('.wg')]; if (!wg.length) return;
        ix.forEach(i => { const hit = wg.filter(x => consOf(x.dataset.h) === cons[i - 1])[nth(cons, i - 1)]; if (hit) hit.classList.add('ilhl'); });
      });
      if(mtRef)$$('#rOut .syw.ilx[data-mt-ref]').forEach(x=>{if(x.dataset.mtRef===mtRef&&x.dataset.ix.split(',').some(i=>set.has(+i)))x.classList.add('ilhl');});
      src.classList.add('ilhl');
    }
    $('#rOut').addEventListener('click', e => {
      const src = e.target.closest('.ilx, .w, .wg');
      if (src && (src.classList.contains('ilx') || src.closest('.row') && src.closest('.row').querySelector('.ilx'))) ilLink(src); else if ($('#rOut .ilhl')) ilHlClear();
    });
    // Feste Reihenfolge = feste Farbe je Werk (--il1 … --il16); „LXX“ = Septuaginta (CATSS), Wort für Wort unter dem Westminster-Text
    const IL_ORDER = ['Zunz', 'Breuer', 'Philippson', 'Herxheimer', 'LXX', 'Onkelos', 'Pseudo-Jonathan', 'Neofiti', 'Goldschmidt', 'Hirsch', 'JuliusHirsch', 'Qumran', 'BuberRosenzweig', 'Umschrift', 'Wolf', 'Mendelssohn', 'Samaritan', 'Peshitta', 'Aleppo'];
    const IL_LABEL = { Aleppo:'Aleppo-Text (MAM)', Peshitta:'Peschitta', Samaritan:'Samaritanus · Tal–Florentin', Mendelssohn: 'Mendelssohn (1815)', Wolf: 'Wolf', BuberRosenzweig: 'Buber/Rosenzweig', Zunz: 'Zunz (1838)', Breuer: 'Breuer', Philippson: 'Philippson', Herxheimer: 'Herxheimer', Goldschmidt: 'Goldschmidt (1921)', Hirsch: 'S. R. Hirsch', JuliusHirsch: 'Julius Hirsch', LXX: 'Septuaginta', Onkelos: 'Onkelos', 'Pseudo-Jonathan': 'Pseudo-Jonathan', Neofiti: 'Neofiti 1', Qumran: 'Qumran-Rollen', Umschrift: 'Umschrift (Aussprache)' };
    const IL_SUB = { Aleppo:'Miqra according to the Masorah (Aleppo-Kodex, wo erhalten), dem Westminster-MT Wort für Wort zugeordnet; hervorgehoben: Abweichungen', Peshitta:'PaTraCoSy und eigene Vorschläge mit Onkelos als Hilfe; teils am Text geprüft (siehe Tooltip). Hebräische Umschrift: nur Konsonanten.', Samaritan:'Tal–Florentin (2024), dem Westminster-MT wortweise maschinell zugeordnet; rote Markierungen der Ausgabe bleiben erhalten', Mendelssohn: 'Moses Mendelssohn, Die fünf Bücher Mose, Dessau 1815 · deutsche Übersetzung', Wolf: 'Benedikt Pinchas Wolf, Das Buch Samuel', BuberRosenzweig: 'Martin Buber und Franz Rosenzweig · lokale Wortzuordnung', Zunz: 'Leopold Zunz, Die vier und zwanzig Bücher der Heiligen Schrift, Berlin 1838', Breuer: 'Raphael Breuer, Arba Megillot, Josua, Richter, Esra und Nehemia', Philippson: 'Ludwig Philippson, Die Israelitische Bibel', Herxheimer: 'Salomon Herxheimer, Die vier und zwanzig Bücher der Bibel', Goldschmidt: 'Lazarus Goldschmidt, Pentateuch, Berlin 1921', Hirsch: 'Samson Raphael Hirsch, Pentateuch (1867–1878) und Psalmen (1882)', JuliusHirsch: 'Julius Hirsch, Jesaia und die zwölf kleinen Propheten', LXX: 'Griechisch, Wortgruppen nach der Zuordnung von CATSS', Onkelos: 'Targum Onkelos (Sperber), Wort für Wort maschinell zugeordnet', 'Pseudo-Jonathan': 'Targum Pseudo-Jonathan; Zusätze bleiben ohne Zuordnung', Neofiti: 'Targum Neofiti 1; Zusätze bleiben ohne Zuordnung', Qumran: 'Biblische Rollen vom Toten Meer (ETCBC), je Rolle eine Zeile; farbig: abweichende Lesart', Umschrift: 'Phonetische Umschrift jedes Wortes (ETCBC phono, Dirk Roorda); ˈ Hauptton' };
    const IL_PIC = { Aleppo:'Aleppo', BuberRosenzweig:'Martin Buber gemeinsam mit Franz Rosenzweig', Peshitta:'Peshitta', Samaritan:'Samaritanischer Pentateuch', Mendelssohn: 'Mendelssohn', Wolf: 'Wolf, Das Buch Samuel', Zunz: 'Zunz', Breuer: 'Raphael Breuer', Philippson: 'Philippson', Herxheimer: 'Herxheimer', Goldschmidt: 'Goldschmidt', Hirsch: 'Samson Raphael Hirsch', JuliusHirsch: 'Julius Hirsch', LXX: 'Septuaginta', Onkelos: 'Targum Onkelos', 'Pseudo-Jonathan': 'Targum Pseudo-Jonathan', Neofiti: 'Targum Neofiti', Qumran: 'Qumran' };
    const ilBreuerJoseph = () => getView() && getView().group && ['Ezekiel', 'Jeremiah'].includes(getView().group.title);
    const ilPic = n => n === 'Breuer' && ilBreuerJoseph() ? 'Joseph Breuer' : IL_PIC[n];
    const ilSub = n => n === 'Breuer' && ilBreuerJoseph() ? (getView().group.title === 'Jeremiah' ? 'Joseph Breuer, Das Buch Jirmejah' : 'Joseph Breuer, Das Buch Jecheskel (1921)') : IL_SUB[n];
    // Auswahl (Häkchen) wird gemerkt; ältere Einstellung (ein Werk oder „Alle“) wird übernommen
    let ilPick = null; try { ilPick = JSON.parse(localStorage.getItem('interlinPick') || 'null'); } catch { /* egal */ }
    if (!Array.isArray(ilPick)) ilPick = ilOn ? (ilTr === '*' ? IL_ORDER.slice(0, 4) : [ilTr]) : [];
    const ilSave = () => { try { localStorage.setItem('interlinPick', JSON.stringify(ilPick)); } catch { /* egal */ } };
    let ilAvail = []; // für das aktuelle Kapitel vorhandene Werke
    // Legende: Farbpunkt + Name je gewähltem Werk; Überfahren hebt die Zeile hervor, Klick nimmt das Werk aus der Auswahl
    function ilLegend(use) {
      $$('#rOut .illeg').forEach(x => x.remove());
      if (use.length < 2) return;
      const leg = document.createElement('div'); leg.className = 'illeg';
      use.forEach(n => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'illc'; b.dataset.i = IL_ORDER.indexOf(n) + 1; b.dataset.tr = n;
        const pic = portraitOf(ilPic(n));
        b.title = (pic && pic.name ? pic.name + ' – ' : '') + I18N.t('Klick: dieses Werk ausblenden'); b.innerHTML = `${pic ? `<img class="vpic" src="portraits/${encodeURIComponent(pic.img)}" alt="" data-title="${esc(pic.name || '')}">` : '<i></i>'}${esc(I18N.t(IL_LABEL[n] || n))}`;
        b.onclick = () => { ilPick = ilPick.filter(x => x !== n); ilSave(); ilRefresh(); ilPopRender(); };
        b.onmouseenter = () => $$('#rOut .ilt').forEach(l => l.classList.toggle('ildim', l.dataset.tr !== n));
        b.onmouseleave = () => $$('#rOut .ildim').forEach(l => l.classList.remove('ildim'));
        leg.appendChild(b);
      });
      const head = $('#rOut .row.head'); // die Legende klebt unter den Spaltenköpfen (Versionsnamen), nicht darüber
      if (head) { head.after(leg); leg.style.setProperty('--headh', head.offsetHeight + 'px'); } else $('#rOut').prepend(leg);
    }
    // Auswahlfenster am Interlinear-Knopf: ein Häkchen je Werk (mit Bild), dazu „Alle“ und „Keine“
    function ilPopRender() {
      const pop = $('#ilPop'); if (!pop || pop.hidden) return;
      if(mishnah?.active()){pop.innerHTML=mishnah.menu();return;}
      const row = n => { const pic = portraitOf(ilPic(n)), on = ilPick.includes(n);
        return `<label class="ilpR" data-i="${IL_ORDER.indexOf(n) + 1}"><input type="checkbox" value="${n}"${on ? ' checked' : ''}>${pic ? `<img class="vpic" src="portraits/${encodeURIComponent(pic.img)}" alt="" data-title="${esc(pic.name || '')}">` : (n === 'LXX' ? `<span class="ilpPh" lang="grc">Α</span>` : `<span class="ilpPh" lang="he">א</span>`)}<span class="ilpT"><b>${esc(I18N.t(IL_LABEL[n]))}</b><small>${esc(I18N.t(ilSub(n)))}</small></span><i class="ilpDot"></i></label>`; };
      pop.innerHTML = `<div class="ilpH"><b>${esc(I18N.t('Interlinear'))}</b><span><button type="button" data-a="all">${esc(I18N.t('Alle'))}</button><button type="button" data-a="none">${esc(I18N.t('Keine'))}</button></span></div>${ilAvail.map(row).join('')}<p class="muted ilpN">${esc(I18N.t('Die gewählten Werke stehen Wort für Wort unter dem hebräischen Text (Westminster).'))}</p>`;
    }
    function ilPopPlace() {
      const pop = $('#ilPop'), r = $('#ilBtn').getBoundingClientRect(); if (pop.hidden) return;
      pop.style.top = Math.round(r.bottom + 4) + 'px';
      pop.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))) + 'px';
    }
    function ilPopToggle(show = $('#ilPop').hidden) { const pop = $('#ilPop'); pop.hidden = !show; $('#ilBtn').setAttribute('aria-expanded', String(show)); if (show) { ilPopRender(); ilPopPlace(); } }
    $('#ilPop').addEventListener('change', e => {
      const c = e.target.closest('input[type=checkbox]'); if (!c) return;
      if(mishnah?.active()){mishnah.choose(c.value,c.checked);return;}
      ilPick = c.checked ? [...new Set([...ilPick, c.value])] : ilPick.filter(x => x !== c.value); ilSave(); ilRefresh();
    });
    $('#ilPop').addEventListener('click', e => {
      const a = e.target.closest('button[data-a]'); if (!a) return;
      if(mishnah?.active()){mishnah.choose(a.dataset.a,true);return;}
      ilPick = a.dataset.a === 'all' ? [...new Set([...ilPick, ...ilAvail])] : ilPick.filter(x => !ilAvail.includes(x)); ilSave(); ilPopRender(); ilRefresh();
    });
    document.addEventListener('pointerdown', e => { const pop = $('#ilPop'); if (pop && !pop.hidden && !e.target.closest('#ilPop, #ilBtn')) ilPopToggle(false); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#ilPop').hidden) ilPopToggle(false); });
    addEventListener('resize', () => ilPopPlace());
    let ilTok = 0;
    async function ilSourceChecks(names, title, snapshot = getView()) {
      const checked = new Set(), warnings = [];
      const loaded = snapshot && snapshot.loaded || [], group = snapshot && snapshot.group;
      const hebrew = loaded.filter(d => d.entry.kind === 'he' && /^Westminster/.test(d.entry.versionTitle || ''));
      if (!hebrew.length) return { checked, warnings };
      for (const name of names) {
        if (name === 'BuberRosenzweig') { checked.add(name); continue; } // bereits durch matchLibrary geprüft
        const expected = window.INTERLIN_SOURCES && window.INTERLIN_SOURCES[name] && window.INTERLIN_SOURCES[name][title];
        let translations = loaded.filter(d => ilName(d.entry.versionTitle) === name);
        if (!translations.length && expected) {
          const entry = group && group.versions.find(v => v.versionTitle === expected.translation.versionTitle);
          if (entry) {
            try { const doc = cache.get(entry.rel) || await O.read(entry.rel); translations = [doc]; }
            catch { warnings.push((IL_LABEL[name] || name) + ': ' + I18N.t('Textfassung konnte nicht geprüft werden')); continue; }
          }
        }
        const result = hebrew.map(doc => window.AlignmentSources.check(expected, doc, translations));
        if (result.every(r => r.ok)) checked.add(name);
        else warnings.push((IL_LABEL[name] || name) + ': ' + I18N.t(result.find(r => !r.ok).reason));
      }
      return { checked, warnings };
    }
    async function smrPrepare(snapshot) {
      const book=snapshot?.group?.title;
      if(!['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'].includes(book))return {data:null,warning:null};
      const he=snapshot.loaded.filter(d=>d.entry.kind==='he'&&/^Westminster/.test(d.entry.versionTitle||''));
      if(!he.length)return {data:null,warning:null};
      const data=await loadSmrIL(),expected=data.source.books[book],translations=snapshot.loaded.filter(d=>d.entry.versionTitle===expected.translation.versionTitle);
      if(!translations.length){const e=snapshot.group.versions.find(e=>e.versionTitle===expected.translation.versionTitle);if(e){try{translations.push(cache.get(e.rel)||await O.read(e.rel));}catch{return {data:null,warning:'Samaritanus: Textfassung konnte nicht geprüft werden'};}}}
      const results=he.map(d=>window.AlignmentSources.check(expected,d,translations));
      return results.every(r=>r.ok)?{data,warning:null}:{data:null,warning:'Samaritanus: '+results.find(r=>!r.ok).reason};
    }
    const AL_KIND={k:'Aleppo-Text: andere Konsonanten',p:'Aleppo-Text: plene/defektiv',v:'Aleppo-Text: andere Vokale',a:'Aleppo-Text: andere Akzente',w:'Aleppo-Text: anderer Wortbestand'};
    async function alPrepare(snapshot){
      const g=snapshot?.group;if(!g||!(g.versions||[]).some(e=>/^Aleppo/.test(e.versionTitle||'')))return {data:null};
      if(!snapshot.loaded.some(d=>d.entry.kind==='he'&&/^Westminster/.test(d.entry.versionTitle||'')))return {data:null};
      try{return {data:await loadAlIL(g.title),title:g.title};}catch{return {data:null,warning:I18N.t('Aleppo-Text: Wortzuordnung konnte nicht geladen werden')};}
    }
    // kompakte Form aus tools/aleppo/interlinear.py -> Segmente wie bei den anderen Zeugen
    function alRows(al,chap,v){
      const list=al.data?.verses?.[chap+':'+v];if(!list)return [];
      let prev=0;const segs=list.map(x=>{
        if(typeof x==='string'){prev++;return [[prev],stripHe?stripHe(x):x,null,null];}
        const [ix,t,f]=x,idx=Array.isArray(ix)?ix:ix?[ix]:[];if(idx.length)prev=Math.max(...idx);
        const meta=f==='+'?{kind:'addition'}:f==='-'?{kind:'missing'}:f?{d:f}:null;
        return [idx,stripHe?stripHe(t):t,null,meta];
      });
      const lost=window.LibraryAleppoTC?.lost?.(al.title,+chap,v);
      return segs.length?[['Aleppo',segs,lost?'*':undefined]]:[];
    }
    async function psPrepare(snapshot){
      if(!window.PeshittaAlignment.has(snapshot?.group?.title))return {data:null};
      const he=snapshot.loaded.filter(d=>d.entry.kind==='he'&&/^Westminster/.test(d.entry.versionTitle||''));
      const entry=snapshot.group.versions.find(e=>e.language==='Syriac'&&e.versionTitle==='ETCBC Peshitta (Syriac, TF 0.2)');
      if(!he.length||!entry)return {data:null};
      try{
        const data=window.PeshittaAlignment.book(await loadPsIL(snapshot.group.title),snapshot.group.title),doc=snapshot.loaded.find(d=>d.entry.rel===entry.rel)||cache.get(entry.rel)||await O.read(entry.rel);
        cache.set(entry.rel,doc);
        if(data&&he.every(d=>window.PeshittaAlignment.prepare(data,d,doc)))return {data,doc};
        return {data:null,warning:I18N.t('Peschitta: Textfassung weicht vom Quellstand der Zuordnung ab')};
      }catch{return {data:null,warning:I18N.t('Peschitta: Wortzuordnung konnte nicht geladen werden')};}
    }
    function psRows(ps,ref,cell){
      return ps.data?window.PeshittaAlignment.segments(ps.data,ref,cell,ps.doc):null;
    }
    // Interlinear: Peschitta-Wörter ohne Gegenstück erscheinen als Zusatz, MT-Wörter ohne Wiedergabe als „—“ (das Akkusativzeichen את ausgenommen).
    function psIlRows(ps,ref,cell){
      const rows=psRows(ps,ref,cell);if(!rows)return [];
      const used=new Set(rows.flatMap(r=>r[0])),out=rows.map(r=>r[0].length?r:[r[0],r[1],r[2],{...r[3],kind:'addition'}]);
      [...cell.querySelectorAll('.w')].forEach((w,i)=>{const c=consOf(w.textContent);if(!used.has(i+1)&&c!=='את'&&c!=='ואת')out.push([[i+1],'—',null,{kind:'missing'}]);});
      return out;
    }
    function psUnlinked(ps,ref,cell){
      if(!psRows(ps,ref,cell))cell.insertAdjacentHTML('beforeend',`<div class="ps-unlinked muted">${esc(I18N.t('Peschitta: Für diesen Vers liegt keine passende Wortzuordnung vor.'))}</div>`);
    }
    function smrRows(data,ref,cell){
      if(!data||!window.SamaritanInterlinear.matches(data,ref,[...cell.querySelectorAll('.w')].map(w=>w.textContent)))return [];
      return window.SamaritanInterlinear.rows(data,ref).map(r=>['Samaritan',r.segs,'SMR'+(r.ref?' '+r.ref.slice(r.ref.lastIndexOf(' ')+1):'')]);
    }
    function smrOpen(data,ref,cell){
      if(!data)return;
      const html=window.SamaritanInterlinear.openHtml(data,ref,esc);if(html)cell.insertAdjacentHTML('beforeend',html);
    }
    async function ilRefresh() {
      try {
        await refreshContent();
      } finally { afterRefresh?.(); }
    }
    async function refreshContent() {
      const b = $('#ilBtn'); if (!b) return;
      const tok = ++ilTok;
      if(mishnah?.active()){await mishnah.refresh();ilPopRender();return;}
      mishnah?.invalidate();
      const bavliSection = getView() && getView().sections && getView().sections[getView().idx];
      const bavliPage = bavliSection && apChap(bavliSection);
      $('#bavliIlBtn').hidden = !(getView() && getView().group && getView().group.title === 'Berakhot' && /^(?:[2-9]|10)[ab]$/.test(bavliPage || ''));
      const title = getView() && getView().group ? getView().group.title : '', ALL = await loadIL(title ? [title] : []);
      if (tok !== ilTok) return;
      const s0 = getView() && getView().sections && getView().sections[getView().idx], c0 = s0 && apChap(s0), names = ALL && title ? Object.keys(ALL).filter(n => ALL[n][title] && (!c0 || Object.keys(ALL[n][title]).some(k => k.startsWith(c0 + ':')))) : []; // nur Kapitel, für die eine Zuordnung vorliegt
      const lxx = !!(getView() && getView().group && ilLxxVer(getView().group)) && !!c0 && /^\d+$/.test(c0);
      const TG = getView() && getView().group && Object.keys(IL_TG).some(n => tgVer(getView().group, n)) ? await loadTgIL() : null;
      if (tok !== ilTok) return;
      const tgHas = n => !!(TG && TG[n] && TG[n][title] && c0 && /^\d+$/.test(c0) && TG[n][title][+c0 - 1] && tgVer(getView().group, n));
      const QIL = getView() && getView().group && qVer(getView().group) ? await loadQIL() : null;
      if (tok !== ilTok) return;
      const qHas = !!(QIL && QIL[title] && c0 && Object.keys(QIL[title]).some(k => k.startsWith(c0 + ':')));
      const sourceChecks = await ilSourceChecks(names, title);
      const smr = await smrPrepare(getView());
      const ps = await psPrepare(getView());
      const al = await alPrepare(getView());
      if(al.warning)sourceChecks.warnings.push(al.warning);
      if(ps.warning)sourceChecks.warnings.push(ps.warning);
      if(smr.warning)sourceChecks.warnings.push(smr.warning);
      if (tok !== ilTok) return;
      ilAvail = IL_ORDER.filter(n => n === 'Aleppo' ? !!al.data : n === 'Peshitta' ? !!ps.data : n === 'Samaritan' ? !!smr.data : n === 'LXX' ? lxx : n === 'Qumran' ? qHas : IL_TG[n] ? tgHas(n) : sourceChecks.checked.has(n));
      const has = ilAvail.length > 0, use = ilAvail.filter(n => ilPick.includes(n)), on = use.length > 0;
      b.hidden = !has; b.classList.toggle('on', has && on);
      if (!has && !$('#ilPop').hidden) ilPopToggle(false); else ilPopRender();
      document.body.classList.toggle('il', has && on);
      ilClear();
      $$('#rOut .smr-open, #rOut .ps-unlinked, #rOut .ps-notice').forEach(n=>n.remove());
      $$('#rOut .syw.ilx').forEach(n=>{n.classList.remove('ilx');delete n.dataset.ix;delete n.dataset.mtRef;});
      $$('#rOut .illeg').forEach(x => x.remove());
      $$('#rOut .il-source-warning').forEach(x => x.remove());
      if (sourceChecks.warnings.length) { const notice = document.createElement('p'); notice.className = 'il-source-warning muted'; notice.textContent = I18N.t('Wortzuordnung nicht angewendet: {}', sourceChecks.warnings.join('; ')); $('#rOut').prepend(notice); }
      if (!has) return;
      const s = getView().sections && getView().sections[getView().idx], chap = s && apChap(s); if (!chap) return;
      const psWords=new Map();
      if(ps.data)$$('#rOut .cell[data-syriac] .syw').forEach(w=>{const a=psWords.get(w.dataset.si)||[];a.push(w);psWords.set(w.dataset.si,a);});
      for (const row of $$('#rOut .row[data-l]')) { // deutsche und aramäische Spalten: Wortgruppen anklickbar machen (unabhängig vom Interlinear-Knopf)
        const v = verseOf(row.dataset.l); if (v == null) continue;
        if(ps.data){
          const mt=[...row.querySelectorAll('.cell[data-mt]')].find(c=>c.querySelector('.w'));
          if(mt){
            const segs=psRows(ps,chap+':'+v,mt);
            if(segs)for(const [ix,form,kind,meta]of segs){
              if(!ix.length)continue;
              (psWords.get(meta.id)||[]).forEach(w=>{if(w.textContent===form){w.classList.add('ilx');w.dataset.ix=ix.join(',');w.dataset.mtRef=meta.mtRef;w.title=I18N.t(meta.reviewed?(meta.reviewedBy==='Claude'?'Am Text geprüft (Claude)':'Am Text geprüft (Codex)'):'Automatischer Zuordnungsvorschlag, nicht manuell geprüft');}});
            }
          }
        }
        row.querySelectorAll('.cell[data-vt]').forEach(cell => {
          const nm = ilName(cell.dataset.vt); if (!nm || (!IL_TG[nm] && !sourceChecks.checked.has(nm))) return;
          const segs = IL_TG[nm] ? tgSegs(TG, nm, title, chap, v, (cell.querySelector('.txt') || cell).textContent) : ALL && ALL[nm] && ALL[nm][title] && ALL[nm][title][chap + ':' + v];
          if (segs) ilTagCell(cell, segs);
        });
      }
      if (!on) return;
      const lx = use.includes('LXX') ? await ilLxxDoc(getView().group) : null, tgd = {};
      for (const n of use) if (IL_TG[n]) tgd[n] = await tgDoc(getView().group, n);
      if (tok !== ilTok) return;
      ilLegend(use);
      for (const row of $$('#rOut .row[data-l]')) {
        const v = verseOf(row.dataset.l); if (v == null) continue;
        row.querySelectorAll('.cell[data-k="he"]').forEach(cell => {
          if (!cell.querySelector('.w')) return;
          const owner = getView().loaded.find(d => d.entry.rel === cell.dataset.rel);
          if (!owner || !/^Westminster/.test(owner.entry.versionTitle || '')) return;
          const tgv = nm => { const d = tgd[nm], ch = d && d.text[+chap - 1]; return ch ? tgSegs(TG, nm, title, chap, v, tgPlain(ch[v - 1])) : null; };
          const trs = use.flatMap(nm => nm === 'Aleppo' ? alRows(al,chap,v) : nm === 'Peshitta' ? [['Peshitta',psIlRows(ps,chap+':'+v,cell)]] : nm === 'Samaritan' ? smrRows(smr.data,title+' '+chap+':'+v,cell) : nm === 'Qumran' ? ((QIL[title] || {})[chap + ':' + v] || []).map(([sig, segs]) => [nm, segs, sig]) : [[nm, nm === 'LXX' ? (lx && lx.text[+chap - 1] ? ilLxxSegs(cell, lx.text[+chap - 1][v - 1],{title,vt:lx.versionTitle||lx.entry?.versionTitle,ch:+chap,v}) : null) : IL_TG[nm] ? tgv(nm) : ALL[nm][title][chap + ':' + v]]]).filter(x => x[1] && x[1].length);
          if (trs.length) ilVerse(cell, trs, IL_ORDER);
          if(use.includes('Peshitta'))psUnlinked(ps,chap+':'+v,cell);
          if(use.includes('Samaritan'))smrOpen(smr.data,title+' '+chap+':'+v,cell);
        });
      }
    }
    $('#rOut').addEventListener('click',e=>{const word=e.target.closest('.smr-word');if(word&&!String(window.getSelection()))openSamaritan(word);});
    $('#rOut').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.smr-word')){e.preventDefault();e.target.click();}});
    $('#ilBtn').onclick = () => ilPopToggle();


    async function exportRenderer(snapshot) {
      // Snapshot the chosen sources; render detached cells without changing the reader or chapter.
      const picks = ilPick.slice(), title = snapshot.group.title;
      if (!picks.length) return null;
      const ALL = await loadIL([title]), names = picks.filter(n => ALL?.[n]?.[title]);
      const checks = await ilSourceChecks(names, title, snapshot);
      const smr = picks.includes('Samaritan') ? await smrPrepare(snapshot) : {data:null,warning:null};
      const ps = picks.includes('Peshitta') ? await psPrepare(snapshot) : {data:null};
      const al = picks.includes('Aleppo') ? await alPrepare(snapshot) : {data:null};
      if(ps.warning)checks.warnings.push(ps.warning);
      if(smr.warning)checks.warnings.push(smr.warning);
      const TG = picks.some(n => IL_TG[n]) ? await loadTgIL() : null;
      const QIL = picks.includes('Qumran') && qVer(snapshot.group) ? await loadQIL() : null;
      const lx = picks.includes('LXX') && ilLxxVer(snapshot.group) ? await ilLxxDoc(snapshot.group) : null;
      const tgd = {};
      for (const n of picks) if (IL_TG[n] && tgVer(snapshot.group, n)) tgd[n] = await tgDoc(snapshot.group, n);
      const renderer = (html, doc, section, label) => {
        if (doc.entry.kind !== 'he' || !/^Westminster/.test(doc.entry.versionTitle || '')) return html;
        const chap = apChap(section), v = verseOf(label);
        if (!/^\d+$/.test(chap) || v == null) return html;
        const cell = document.createElement('div'); cell.innerHTML = html;
        const trs = picks.flatMap(n => {
          if (n === 'Aleppo') return alRows(al,chap,v);
          if (n === 'Peshitta') return [['Peshitta',psIlRows(ps,chap+':'+v,cell)]];
          if (n === 'Samaritan') return smrRows(smr.data,title+' '+chap+':'+v,cell);
          if (n === 'Qumran') return ((QIL?.[title] || {})[chap + ':' + v] || []).map(([sig, segs]) => [n, segs, sig]);
          let segs;
          if (n === 'LXX') segs = lx?.text[+chap - 1] ? ilLxxSegs(cell, lx.text[+chap - 1][v - 1],{title,vt:lx.versionTitle||lx.entry?.versionTitle,ch:+chap,v}) : null;
          else if (IL_TG[n]) { const ch = tgd[n]?.text[+chap - 1]; segs = ch ? tgSegs(TG, n, title, chap, v, tgPlain(ch[v - 1])) : null; }
          else if (checks.checked.has(n)) segs = ALL[n]?.[title]?.[chap + ':' + v];
          return segs?.length ? [[n, segs]] : [];
        }).filter(x => x[1]?.length);
        if (trs.length) ilVerse(cell, trs, IL_ORDER);
        if(picks.includes('Peshitta')&&ps.data)psUnlinked(ps,chap+':'+v,cell);
        if(picks.includes('Samaritan'))smrOpen(smr.data,title+' '+chap+':'+v,cell);
        return cell.innerHTML;
      };
      renderer.warnings = checks.warnings;
      renderer.labels = picks.filter(n => n === 'Aleppo' && al.data || n === 'Peshitta' && ps.data || checks.checked.has(n) || n === 'Samaritan' && smr.data || n === 'LXX' && lx || n === 'Qumran' && QIL || tgd[n]).map(n => IL_LABEL[n] || n);
      return renderer;
    }
    return { refresh: ilRefresh, tagCell: ilTagCell, exportRenderer, get selectedSources(){return ilPick.filter(n=>ilAvail.includes(n));}, get availableSources(){return ilAvail;} };
  }
  return { create };
})();
