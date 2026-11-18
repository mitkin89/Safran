// LibraryOutline: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryOutline = (() => {
  'use strict';
  function create(host) {
  // ---------- Gliederung: Wochenabschnitte, Kapitel und Absätze (offen/geschlossen: פ ס) des gewählten Buches ----------
  const olOwnCache = new Map();
  const olMz = () => { try { return localStorage.getItem('olMz') === '1'; } catch { return false; } };
  // Komplexe Texte (z. B. Testamente der zwölf Patriarchen): die Gliederung gehört zum gerade geöffneten Teil („Titel, Teil“)
  const olNode = g => { const sc = host.view && host.view.sections && host.view.sections[host.view.idx]; return g && sc && sc.path && typeof sc.path[0] === 'string' && sc.path[0] ? g.title + ', ' + sc.path[0] : null; };
  const olOwnCached = g => { const n = olNode(g); if (n && olOwnCache.get(n)) return olOwnCache.get(n); return g ? olOwnCache.get(g.title) : undefined; };
  async function olOwnFor(g) { const n = olNode(g); if (n) { const o = await olOwn(n); if (o) return o; } return olOwn(g.title); }
  async function olOwn(book) { if (!window.outline) return null; if (!olOwnCache.has(book)) olOwnCache.set(book, await window.outline.get(book)); return olOwnCache.get(book); }
  function olContentHtml(g, ol) {
    const lv2 = ol.levels === 2; // Gliederung nach Buch:Kapitel (z. B. Josephus), nicht nach Kapitel:Vers
    const L = I18N.lang;
    const T = (o, k) => (L !== 'he' && (o[k + '_' + L] || o[k + '_en'])) || o[k]; // Text in der Oberflächensprache, sonst Englisch, sonst Hebräisch (z. B. talmud.dev-Gliederungen ohne deutsche Fassung)
    const heUi = L === 'he' || !ol.sections[0] || !ol.sections[0]['head_' + L];
    const first = r => { const m = String(r).match(/^(\d+)(?::(\d+))?/); return m ? { ch: +m[1], v: m[2] ? +m[2] : 1 } : null; };
    const mzOn = olMz() && ol.sections.some(x => x.items.some(i => i.mz));
    const anySub = ol.sections.some(x => x.items.some(i => i.sub));
    const olRows = (list, lvl) => { let pb = null; if (lvl && list.some(x => x.blk)) { const ks = []; list.forEach(x => { const k = T(x, 'blk') || ''; if (!ks.includes(k)) ks.push(k); }); const st = x => { const sp = olSpans(x.ref)[0]; return sp ? sp[0] : 0; }; list = [...list].sort((a, b) => ks.indexOf(T(a, 'blk') || '') - ks.indexOf(T(b, 'blk') || '') || st(a) - st(b)); } /* nach Überschrift gruppieren */ return list.map(it => { const f = first(it.ref); const ih = (heUi || !(it['text_' + L] || it.text_en)) && /[\u0590-\u05FF]/.test(it.text); const meta = [T(it, 'speaker'), T(it, 'author'), T(it, 'kind'), T(it, 'place'), T(it, 'time'), T(it, 'par'), T(it, 'desc'), it.seg ? (L === 'he' ? 'סגולה: ' : L === 'de' ? 'Segula: ' : 'Segula: ') + T(it, 'seg') : ''].filter(Boolean).map(host.esc).join(' · '); const np = !lvl && window.__mapCount ? window.__mapCount(g.title, it.ref) : 0; const bk = lvl && it.blk ? T(it, 'blk') : null; const chip = bk && bk !== pb ? `<div class="olchip" dir="auto" data-blk="${host.esc(bk)}">${host.esc(bk.replace(/(\d)-(?=\d)/g, '$1–'))}</div>` : ''; if (bk) pb = bk; return chip + `<div role="link" tabindex="0" class="olp olc${ih ? '' : ' lt'}${it.mz ? ' olmz' : ''}${lvl ? ' olsub olsub1' : ''}${it.orph ? ' olorph' : ''}" data-r="${host.esc(it.ref)}"${lv2 ? ` data-sec="${host.esc(it.ref)}"` : ''} data-ref="${host.esc(g.title + ' ' + (/^\d+[ab]/.test(String(it.ref)) ? String(it.ref).split(/[-–]/)[0] : f ? f.ch + ':' + f.v : it.ref))}">${!lvl && anySub ? `<span class="oltg"${it.sub ? ` title="${host.esc(I18N.t('Unterpunkte'))}" aria-label="${host.esc(I18N.t('Unterpunkte'))}" role="button" tabindex="0" aria-expanded="false"` : ' style="visibility:hidden" aria-hidden="true"'}>${it.sub ? '▸' : ''}</span>` : ''}<span class="ref">${host.esc(String(it.ref).replace(/-/g, '–'))}</span><span class="${ih ? 'he' : 'tx'}"${ih ? ' lang="he"' : ''}>${it.mz ? `<b class="mzn">${it.mz}</b> ` : ''}${host.esc(T(it, 'text'))}${meta ? `<small class="olm"${ih ? '' : ' style="direction:ltr"'}>${meta}</small>` : ''}</span>${np ? `<span class="olmap" data-n="${np}" title="${host.esc(I18N.t('Karte: Orte dieses Abschnitts'))}">🗺 ${np}</span>` : ''}</div>` + (it.sub ? `<div class="olsubs" hidden>${olRows(it.sub, lvl + 1)}</div>` : ''); }).join(''); };
    return (T(ol, 'title') ? `<p class="${heUi ? 'he' : ''}" ${heUi ? 'lang="he"' : ''}><b>${host.esc(T(ol, 'title'))}</b></p>` : '') + ol.sections.filter(s => s.items.some(it => !!it.mz === mzOn)).map(s => {
      return `<details open><summary>${heUi ? `<span class="he" lang="he">${host.esc(s.head)}</span>` : `${host.esc(T(s, 'head'))} <small class="he" lang="he">${host.esc(s.head)}</small>`}</summary>${s.desc ? `<p class="he olnote" lang="he">${host.esc(s.desc)}</p>` : ''}${olRows(s.items.filter(it => !!it.mz === mzOn), 0)}</details>`;
    }).join('') + (T(ol, 'note') ? `<p class="muted olnote">${host.esc(T(ol, 'note'))}</p>` : '');
  }
  // „Gliederung“-Knopf nur, wenn es für das Buch eine gibt (Karte: siehe mapRefresh)
  async function olBtnRefresh() {
    const g = host.view && host.view.group, b = host.$('#olBtn'); if (!b) return;
    if (!g) { b.hidden = true; return; }
    const ol = await olOwnFor(g);
    if (host.view && host.view.group === g) b.hidden = !ol && host.$('#outlinePanel').hidden;
  }
  async function renderOutline() {
    const body = host.$('#olBody'); const g = host.view && host.view.group;
    if (!g) { body.innerHTML = ''; return; }
    host.$('#olTitle').textContent = I18N.t('Gliederung') + ' · ' + g.title;
    const ol = await olOwnFor(g);
    if (!host.view || host.view.group !== g) return; // inzwischen anderes Buch
    const hasMz = !!(ol && ol.sections.some(x => x.items.some(i => i.mz))); host.$('#olMzW').hidden = !hasMz; host.$('#olTabT').classList.toggle('on', !olMz() || !hasMz); host.$('#olTabM').classList.toggle('on', olMz() && hasMz);
    const key = g.title + '|' + (olNode(g) || '') + '|' + I18N.lang + '|' + olMz();
    if (body.dataset.key === key && ol && body.firstElementChild) olMark(true); // unverändert: nicht neu aufbauen (Zustand der Unterpunkte bleibt)
    else {
      if (body.dataset.book !== g.title) window.__olClicked = null;
      body.dataset.book = g.title; body.dataset.key = ol ? key : '';
      body.innerHTML = ol ? olContentHtml(g, ol) : `<p class="muted">${host.esc(I18N.t('Keine Gliederung verfügbar.'))}</p>`;
      olMark(true);
    }
    if (window.__olLast) { const el = [...body.querySelectorAll('.olp')].find(x => x.dataset.r === window.__olLast); window.__olLast = null; if (el) el.scrollIntoView({ block: 'center' }); }
  }
  // ---------- Gliederung als Überschriften im Lesetext (Einstellung unter „Anzeige“) ----------
  const olInlineOn = () => { try { return localStorage.getItem('olInline') !== '0'; } catch { return true; } }; // Standard: an; ausschalten unter „Anzeige“
  function olInlineApply(g, ol) {
    host.$$('#rOut .olhead').forEach(x => x.remove()); host.$$('#rOut .row.olrow').forEach(x => x.classList.remove('olrow', 'olh0', 'olh1', 'olh2', 'olh3'));
    if (!olInlineOn() || !ol || !host.view || host.view.group !== g || host.view.sres) return;
    const sec = host.view.sections[host.view.idx]; if (!sec) return;
    const L = I18N.lang, T = (o, k) => (L !== 'he' && (o[k + '_' + L] || o[k + '_en'])) || o[k];
    const nums = (sec.path || []).filter(x => typeof x === 'number').map(x => x + 1);
    const ch = host.auChapter(), bk = olBookNo(sec), lv2 = ol.levels === 2, mzOn = olMz();
    const rows = host.$$('#rOut .row[data-l]'); if (!rows.length) return;
    const vOf = l => { const m = String(l).match(/^(\d+)/); return m ? +m[1] : null; };
    // Stelle der Gliederung → erste passende Zeile dieses Abschnitts (oder null)
    const dafM = String(sec.label || '').match(/(\d+)([ab])\s*$/), dafCur = dafM ? dafM[1] + dafM[2] : null;
    const target = ref => {
      const r = String(ref).split(/[;,]/)[0].trim(); let m;
      if ((m = r.match(/^(\d+[ab])(?::(\d+))?/))) { // Talmud: Amud(:Segment)
        if (m[1] !== dafCur) return null;
        return m[2] ? rows.find(x => vOf(x.dataset.l) >= +m[2]) || null : rows[0];
      }
      if ((m = r.match(/^(\d+):(\d+):(\d+)/))) { // Band:Kapitel:Absatz
        if (nums.length === 1) { // Abschnitt = Band, Zeilen „Kapitel:Absatz“ (z. B. Ginzbergs Legenden)
          if (+m[1] !== nums[0]) return null;
          const ca = l => { const k = String(l).match(/^(\d+):(\d+)/); return k ? [+k[1], +k[2]] : null; };
          return rows.find(x => { const k = ca(x.dataset.l); return k && (k[0] > +m[2] || (k[0] === +m[2] && k[1] >= +m[3])); }) || null;
        }
        if (nums.length < 2 || +m[1] !== nums[nums.length - 2] || +m[2] !== nums[nums.length - 1]) return null;
        return rows.find(x => vOf(x.dataset.l) >= +m[3]) || null;
      }
      if (lv2) { // Buch:Kapitel (Zeilen „Kapitel:Absatz“)
        if (!(m = r.match(/^(\d+)(?::(\d+))?/)) || +m[1] !== bk) return null;
        return m[2] ? rows.find(x => vOf(x.dataset.l) >= +m[2]) || null : rows[0];
      }
      if (!(m = r.match(/^(\d+)(?::(\d+))?/)) || +m[1] !== ch) return null; // Kapitel:Vers
      return m[2] ? rows.find(x => vOf(x.dataset.l) >= +m[2]) || null : rows[0];
    };
    const put = new Map(); // Zeile → Überschriften davor (in Reihenfolge)
    const add = (row, lvl, text) => { if (!row || !text) return; let a = put.get(row); if (!a) put.set(row, (a = [])); if (!a.some(x => x.text === text)) a.push({ lvl, text }); };
    for (const sct of ol.sections) {
      const items = sct.items.filter(it => !!it.mz === mzOn); if (!items.length) continue;
      const r0 = target(items[0].ref);
      if (r0 && ol.sections.length > 1 && T(sct, 'head') && !(lv2 && r0 !== rows[0])) add(r0, 0, T(sct, 'head'));
      const walk = (list, lvl) => list.forEach(it => { add(target(it.ref), lvl, T(it, 'text')); if (it.sub) walk(it.sub, lvl + 1); });
      walk(items, 1);
    }
    // Beginnt das Kapitel mitten in einem Abschnitt der Gliederung: dessen Überschrift(en) trotzdem oben zeigen (als Fortsetzung)
    { const pos3 = (a, b, c) => a * 1e8 + b * 1e4 + c;
      const P0 = (() => { const v = vOf(rows[0].dataset.l) || 1; const has3 = ol.sections.some(x => x.items.some(i => /^\d+:\d+:\d+/.test(String(i.ref)))); if (nums.length === 1 && has3) { const k = String(rows[0].dataset.l).match(/^(\d+):(\d+)/); return k ? pos3(nums[0], +k[1], +k[2]) : null; } if (nums.length >= 2 && ol.sections.some(x => x.items.some(i => /^\d+:\d+:\d+/.test(String(i.ref))))) return pos3(nums[nums.length - 2], nums[nums.length - 1], v); if (lv2) return bk != null ? pos3(0, bk, v) : null; return ch != null ? pos3(0, ch, v) : null; })();
      const st = ref => { const r = String(ref).split(/[;,]/)[0].trim(); let m; if ((m = r.match(/^(\d+):(\d+):(\d+)/))) return pos3(+m[1], +m[2], +m[3]); if ((m = r.match(/^(\d+)(?::(\d+))?/))) return pos3(0, +m[1], m[2] ? +m[2] : 1); return null; };
      const en = ref => { if (lv2 || /^\d+:\d+:\d+/.test(String(ref))) return Infinity; const sp = olSpans(ref); return sp.length ? Math.max(...sp.map(x => x[1])) : Infinity; }; // olSpans: Kapitel*10000+Vers
      const pick = list => { let best = null; for (const it of list) { const a = st(it.ref); if (a == null || a > P0) continue; if (en(it.ref) < (P0 % 1e8)) continue; best = it; } return best; };
      if (P0 != null && !dafCur) {
        const cont = [];
        const secs = ol.sections.map(x => ({ x, items: x.items.filter(it => !!it.mz === mzOn) })).filter(o => o.items.length);
        let sc = null; for (const o of secs) { const a = st(o.items[0].ref); if (a != null && a <= P0) sc = o; }
        if (sc) {
          if (st(sc.items[0].ref) < P0 && ol.sections.length > 1 && T(sc.x, 'head')) cont.push({ lvl: 0, text: T(sc.x, 'head') });
          let list = sc.items, lvl = 1;
          while (list && list.length) { const it = pick(list); if (!it) break; if (st(it.ref) < P0) cont.push({ lvl, text: T(it, 'text') }); list = it.sub; lvl++; }
        }
        if (cont.length) { const a = put.get(rows[0]) || []; put.set(rows[0], [...cont.map(c => ({ ...c, cont: true })), ...a.filter(h => !cont.some(c => c.text === h.text))]); }
      } }
    // Steht die Überschrift schon als eigener Absatz im Text (z. B. Ginzbergs Abschnittstitel): diesen Absatz als Überschrift zeigen statt sie doppelt einzufügen
    const nrm = t => String(t || '').replace(/[\[\]⟨⟩()„“”"'’.,;:!?–-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const cellTexts = row => [...row.children].filter(c => !c.classList.contains('lab')).map(c => { const k = c.cloneNode(true); k.querySelectorAll('sup, .note, .footnote').forEach(x => x.remove()); return nrm(k.textContent); }).filter(Boolean);
    for (const [row, hs1] of put) {
      const ct = cellTexts(row); if (!ct.length) continue;
      const i = hs1.findIndex(h => !h.cont && ct.includes(nrm(h.text)));
      if (i < 0) continue;
      row.classList.add('olrow', 'olh' + Math.min(hs1[i].lvl, 3)); hs1.splice(i, 1);
    }
    for (const [row, hs0] of put) {
      if (!hs0.length) continue;
      // mehrere Unterpunkte derselben Ebene vor derselben Zeile (z. B. Frage und Antwort im selben Segment): in einer Zeile zusammenfassen
      const hs = []; for (const h of hs0) { const last = hs[hs.length - 1]; if (last && h.lvl >= 2 && last.lvl === h.lvl && !last.cont && !h.cont) last.text += ' · ' + h.text; else hs.push({ ...h }); }
      row.insertAdjacentHTML('beforebegin', hs.map(h => `<div class="olhead olh${Math.min(h.lvl, 3)}${h.cont ? ' olcont' : ''}" dir="auto">${host.esc(h.text)}${h.cont ? ` <small>(${host.esc(I18N.t('Fortsetzung'))})</small>` : ''}</div>`).join(''));
    }
    // gleiches Ebene-2-Etikett direkt hintereinander (z. B. zweimal „Gemara's objection“): nur die Linie zeigen
    { let prev = null; host.$$('#rOut .olhead, #rOut .row.olrow').forEach(h => { if (!h.classList.contains('olhead')) { if (h.classList.contains('olh0') || h.classList.contains('olh1')) prev = null; return; } if (h.classList.contains('olh0') || h.classList.contains('olh1')) { prev = null; return; } if (!h.classList.contains('olh2') || h.classList.contains('olcont')) return; if (prev !== null && h.textContent === prev) h.classList.add('olrep'); prev = h.textContent; }); }
  }
  async function olInline() {
    const g = host.view && host.view.group;
    if (!g || !olInlineOn()) { host.$$('#rOut .olhead').forEach(x => x.remove()); return; }
    const c = olOwnCached(g);
    if (c !== undefined) { olInlineApply(g, c); return; }
    const ol = await olOwnFor(g);
    if (host.view && host.view.group === g) host.withAnchor(() => olInlineApply(g, ol)); // erst geladen: Leseposition beim Einfügen halten
  }
  // aktuelle Stelle: der gerade gespielte Vers, sonst der Vers in der Leseansicht
  // Buch:Kapitel (z. B. Josephus): der Abschnitt ist das Buch („Buch 18“), die Zeilen heißen „Kapitel:Absatz“ („3:5“).
  // Stelle = Buch aus dem Abschnitt, Kapitel aus der obersten sichtbaren Zeile → {ch: 18, v: 3}
  const olBookNo = s => { const n = s ? String(s.label || '').match(/\d+/g) : null; return n ? +n[n.length - 1] : null; };
  function olTopRow() { const top = host.syncTop(); return host.$$('#rOut .row[data-l]').find(x => x.getBoundingClientRect().bottom > top + 4) || null; }
  function olSecPos() {
    const b = olBookNo(host.view && host.view.sections && host.view.sections[host.view.idx]); if (b == null) return null;
    const r = olTopRow(), m = r && String(r.dataset.l).match(/^(\d+)/);
    return { ch: b, v: m ? +m[1] : 1 };
  }
  function olPos(g, lv2) { if (lv2) return olSecPos(); const c = host.AU.cur; if (c && g && c.book === g.title) return { ch: c.ch, v: c.v }; return auChapterSafe(); }
  // liegt die Stelle (Kapitel, Vers) im ref der Gliederung? („1:27-2:5“, „4-5“, „3“, „15:32-37, 16:14-19“)
  const olPlaying = g => !!(host.AU.cur && g && host.AU.cur.book === g.title);
  const olSpanCache = new Map(); // ref-Text → Liste von [von, bis] als Kapitel*10000+Vers (einmal geparst)
  function olSpans(ref) {
    ref = String(ref); let r = olSpanCache.get(ref); if (r) return r; r = [];
    for (const part of ref.split(/[;,]/)) {
      const m = part.trim().match(/^(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?$/); if (!m) continue;
      let a, b;
      if (m[2]) { a = [+m[1], +m[2]]; b = m[4] ? [+m[3], +m[4]] : m[3] ? [+m[1], +m[3]] : a; } else { a = [+m[1], 0]; b = [m[3] ? +m[3] : +m[1], 9999]; }
      r.push([a[0] * 10000 + a[1], b[0] * 10000 + b[1]]);
    }
    olSpanCache.set(ref, r); return r;
  }
  function olIn(ref, pos, wholeCh) { // wholeCh: alle Punkte, die das Kapitel berühren; sonst nur der Punkt mit dem Vers
    if (!pos) return false;
    const lo = pos.ch * 10000 + (wholeCh ? 0 : pos.v), hi = pos.ch * 10000 + (wholeCh ? 9999 : pos.v);
    return olSpans(ref).some(([x, y]) => hi >= x && lo <= y);
  }
  function olChips() { if (host.$('#outlinePanel').hidden) return; // gleiche Überschriftzeile nicht in direkt aufeinanderfolgenden, aufgeklappten Gruppen wiederholen
    let last = null;
    host.$$('#olBody .olsubs').forEach(w => { const cs = [...w.querySelectorAll(':scope > .olchip')]; cs.forEach(c => { c.hidden = false; }); if (w.hidden) return; if (cs[0] && cs[0].dataset.blk === last) cs[0].hidden = true; if (cs.length) last = cs[cs.length - 1].dataset.blk; });
  }
  function olToggle(w, open, silent, how) { w.hidden = !open; if (how) w.dataset.how = how; if (!silent) olChips(); const t = w.previousElementSibling && w.previousElementSibling.querySelector('.oltg'); if (t) { t.textContent = open ? '▾' : '▸'; t.setAttribute('aria-expanded', open ? 'true' : 'false'); } }
  function olMark(scroll) {
    const pnl = host.$('#outlinePanel'); if (!pnl || pnl.hidden) return;
    // Nach Klick im Panel: angeklickten Punkt auf dem Bildschirm festhalten, auch wenn andere Gruppen auf-/zuklappen
    const holdEl = window.__olHold && Date.now() < window.__olHold ? host.$$('#olBody .olc').find(x => x.dataset.r === window.__olClicked) : null;
    let holdBox = null, holdTop = 0; if (holdEl) { holdBox = holdEl.parentElement; while (holdBox && holdBox !== document.body && !(holdBox.scrollHeight > holdBox.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(holdBox).overflowY))) holdBox = holdBox.parentElement; if (holdBox === document.body) holdBox = null; holdTop = holdEl.getBoundingClientRect().top; }
    const g = host.view && host.view.group, ol = g && olOwnCached(g), lv2 = !!(ol && ol.levels === 2), pos = olPos(g, lv2), whole = !lv2 && !olPlaying(g); let first = null;
    const hr = !lv2 && !olPlaying(g) ? host.$('#rOut .row.hit[data-l]') : null, tr = !lv2 && !olPlaying(g) ? (hr && hr.getBoundingClientRect().bottom > 0 && hr.getBoundingClientRect().top < innerHeight ? hr : olTopRow()) : null, tv = tr ? (m => m ? +m[1] : null)(String(tr.dataset.l).match(/(\d+)\s*[a-z]?\s*$/i)) : null, vpos = pos && tv ? { ch: pos.ch, v: tv } : pos; // Unterpunkte: nur der Punkt mit dem Vers am oberen Rand
    host.$$('#olBody .olc').forEach(el => { const sub = el.classList.contains('olsub'), on = olIn(el.dataset.r, sub || tv ? vpos : pos, whole && !sub && !tv); el.classList.toggle('cur', on); if (on && !first) first = el; });
    if (!first && vpos) { // Gliederungen aus einzelnen Punkten statt Bereichen (z. B. Krauss: „1:5“, „49:1“): der letzte Punkt vor der aktuellen Stelle gilt als „hier“
      const key = vpos.ch * 10000 + vpos.v; let best = null, bs = -1;
      host.$$('#olBody .olc:not(.olsub)').forEach(el => { const sp = olSpans(el.dataset.r)[0]; if (sp && sp[0] <= key && sp[0] >= bs) { bs = sp[0]; best = el; } });
      if (best) { best.classList.add('cur'); first = best; }
    }
    { // überlappende Unterpunkte (z. B. 1:10–20 und 1:12–14): nur den genauesten (schmalsten) markieren
      const wd = el => olSpans(el.dataset.r).reduce((a, [x, y]) => a + (y - x), 0), cs = host.$$('#olBody .olc.cur.olsub');
      if (cs.length > 1) { const pk = cs.find(el => el.dataset.r === window.__olClicked), mn = Math.min(...cs.map(wd)); let kept = false; cs.forEach(el => { if (pk ? el !== pk : (wd(el) > mn || kept)) el.classList.remove('cur'); else kept = true; }); first = host.$('#olBody .olc.cur'); }
    }
    const curW = new Set(); // Gruppen mit markiertem Punkt: automatisch aufklappen, außer der Nutzer hat sie bei unverändertem Punkt zugeklappt
    host.$$('#olBody .olc.cur').forEach(el => { const w = el.classList.contains('olsub') ? el.closest('.olsubs') : (el.nextElementSibling && el.nextElementSibling.classList.contains('olsubs') ? el.nextElementSibling : null); if (!w) return; curW.add(w); if (w.hidden && !(w.dataset.how === 'user-closed' && w.dataset.seen === '1')) olToggle(w, true, true, w.dataset.how === 'user-open' ? 'user-open' : 'auto'); });
    host.$$('#olBody .olsubs').forEach(w => { if (curW.has(w)) w.dataset.seen = '1'; else { delete w.dataset.seen; if (!w.hidden && w.dataset.how === 'auto') olToggle(w, false, true, ''); } }); // selbst aufgeklappte Gruppen ohne Markierung wieder schließen
    olChips();
    if (holdBox && holdEl.isConnected) holdBox.scrollTop += holdEl.getBoundingClientRect().top - holdTop;
    if (first) olKeepVisible(first, scroll); // nur das Gliederungs-Panel scrollen, nie das Lesefenster
  }
  // markierten Eintrag in der Gliederung sichtbar halten, ohne die Leseansicht zu verschieben
  function olKeepVisible(el, center) {
    let box = el.parentElement; while (box && box !== document.body && !(box.scrollHeight > box.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box || box === document.body) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (window.__olHold && Date.now() < window.__olHold) return; // gerade im Panel geklickt: nicht nachscrollen
    if (center ? (r.top < b.top || r.bottom > b.bottom) : (r.top < b.top || r.bottom > b.bottom)) box.scrollTop += r.top - b.top - (b.height - r.height) / 2;
  }
  // beim Lesen (Scrollen) die Markierung in Buch:Kapitel-Gliederungen mitführen
  { let olScrollT = null, olLastPos = '';
    window.addEventListener('scroll', () => {
      if (host.$('#outlinePanel').hidden) return;
      clearTimeout(olScrollT);
      olScrollT = setTimeout(() => {
        const g = host.view && host.view.group, ol = g && olOwnCached(g); if (!ol) return;
        let k; if (ol.levels === 2) { const p = olSecPos(); k = p ? p.ch + ':' + p.v : ''; } else { const r = olTopRow(); k = (host.view.idx) + '|' + (r ? r.dataset.l : ''); } if (k === olLastPos) return; olLastPos = k; olMark(false);
      }, 120);
    }, { passive: true });
  }
  function auChapterSafe() { const ch = typeof host.auChapter === 'function' ? host.auChapter() : null; if (ch == null || !host.view) return null; const l = host.$('#rOut .row.hit[data-l]') || host.$('#rOut .row[data-l]'); return { ch, v: l && /^\d+$/.test(l.dataset.l) ? +l.dataset.l : 1 }; }
  const olPlace = () => { const h = document.querySelector('header'); const t = (h ? h.getBoundingClientRect().bottom : 44) + 'px'; host.$('#outlinePanel').style.top = t; host.$('#tpResize').style.top = t; };
  host.$('#olBtn').onclick = () => { if (!host.$('#outlinePanel').hidden) { host.$('#outlinePanel').hidden = true; return; } host.$('#topicPanel').hidden = true; host.$('#mapPanel').hidden = true; olPlace(); host.$('#outlinePanel').hidden = false; renderOutline(); };
  host.$('#olClose').onclick = () => { host.$('#outlinePanel').hidden = true; };
  // Klick außerhalb oder Esc schließt die Gliederung
  document.addEventListener('mousedown', e => { const p = host.$('#outlinePanel'); if (p.hidden || p.classList.contains('docked') || e.target.closest('#outlinePanel, #olBtn, #tpResize, #suggest, #audioBar')) return; p.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !host.$('#outlinePanel').hidden) { host.$('#outlinePanel').hidden = true; e.stopPropagation(); } }, true);
  new MutationObserver(() => { host.$('#tpResize').hidden = host.$('#topicPanel').hidden && host.$('#outlinePanel').hidden; }).observe(host.$('#outlinePanel'), { attributes: true, attributeFilter: ['hidden'] });
  const olSetMz = on => { try { localStorage.setItem('olMz', on ? '1' : '0'); } catch { /* ohne Speicher */ } renderOutline(); };
  host.$('#olTabT').onclick = () => olSetMz(false); host.$('#olTabM').onclick = () => olSetMz(true);
  host.$('#mapOl').onclick = () => { host.$('#mapPanel').hidden = true; host.$('#olBtn').click(); };
  host.$('#olBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.oltg, .olp')) { e.preventDefault(); e.target.click(); } });
  host.$('#olBody').addEventListener('click', e => {
    const mp = e.target.closest('.olmap'); if (mp) { const q = mp.closest('.olp'); e.stopPropagation(); window.__olLast = q.dataset.r; window.__mapOpenFor && window.__mapOpenFor(host.view.group.title, q.dataset.r, q.querySelector('.ref').textContent + ' ' + (q.querySelector('.tx, .he')?.firstChild?.textContent || '')); return; }
    const tg = e.target.closest('.oltg'); if (tg) { const w = tg.closest('.olp').nextElementSibling; if (w && w.classList.contains('olsubs')) { e.stopPropagation(); olToggle(w, w.hidden, false, w.hidden ? 'user-open' : 'user-closed'); } return; }
    const p = e.target.closest('.olp'); if (!p) return;
    if (p.dataset.sec) { // Buch:Kapitel → Abschnitt „Buch b“ öffnen und zur ersten Zeile von Kapitel c („c:1“) scrollen
      const [b, c] = p.dataset.sec.split(':').map(Number);
      const idx = host.view && host.view.sections ? host.view.sections.findIndex(s => olBookNo(s) === b) : -1;
      if (idx < 0) return;
      const goRow = () => { const r = host.$$('#rOut .row[data-l]').find(x => +String(x.dataset.l).split(':')[0] === c); if (r) window.scrollBy(0, r.getBoundingClientRect().top - host.syncTop()); olMark(false); };
      if (idx !== host.view.idx || host.view.vf) { host.view.idx = idx; host.view.vf = null; host.renderSection(); requestAnimationFrame(goRow); } else goRow();
      return;
    }
    window.__olHold = Date.now() + 1500; // Klick im Panel: Panel bleibt stehen, nur der Text springt
    window.__olClicked = p.dataset.r; // der angeklickte Punkt bleibt bei überlappenden Unterpunkten markiert
    { // dreistufige Zählung (z. B. Ginzbergs Legenden, Band:Kapitel:Absatz): Abschnitt [Band, Kapitel] öffnen und zum Absatz scrollen
      const m3 = String(p.dataset.r).match(/^(\d+):(\d+):(\d+)$/);
      let idx = m3 && host.view && host.view.sections ? host.view.sections.findIndex(s => { const q = (s.path || []).filter(x => typeof x === 'number'); return q.length === 2 && q[0] === +m3[1] - 1 && q[1] === +m3[2] - 1; }) : -1;
      const byVol = idx < 0 && m3 && host.view && host.view.sections ? host.view.sections.findIndex(s => { const q = (s.path || []).filter(x => typeof x === 'number'); return q.length === 1 && q[0] === +m3[1] - 1; }) : -1; // Abschnitt = Band, Zeilen „Kapitel:Absatz“
      if (byVol >= 0) idx = byVol;
      if (idx >= 0) {
        const want = byVol >= 0 ? m3[2] + ':' + m3[3] : null;
        const goPar = () => { const r = host.$$('#rOut .row[data-l]').find(x => want ? String(x.dataset.l) === want : String(x.dataset.l).split(':').pop() === m3[3]); if (r) window.scrollBy(0, r.getBoundingClientRect().top - host.syncTop()); olMark(false); };
        if (idx !== host.view.idx || host.view.vf) { host.view.idx = idx; host.view.vf = null; host.renderSection(); requestAnimationFrame(goPar); } else goPar();
        return;
      }
    }
    { // komplexer Text (Teile): Kapitel im geöffneten Teil öffnen und zum Vers scrollen
      const nd = olNode(host.view && host.view.group), m = nd && String(p.dataset.r).match(/^(\d+)(?::(\d+))?/);
      if (nd && m && host.view.sections) {
        const key = nd.slice(host.view.group.title.length + 2), ch = +m[1] - 1, vs = m[2] || '1';
        const idx = host.view.sections.findIndex(s => s.path && s.path[0] === key && (s.path.length < 2 || s.path[1] === ch));
        if (idx >= 0) {
          const goVerse = () => { const r = host.$$('#rOut .row[data-l]').find(x => String(x.dataset.l).split(':').pop() === vs); if (r) window.scrollBy(0, r.getBoundingClientRect().top - host.syncTop()); olMark(false); };
          if (idx !== host.view.idx || host.view.vf) { host.view.idx = idx; host.view.vf = null; host.renderSection(); requestAnimationFrame(goVerse); } else goVerse();
          return;
        }
      }
    }
    host.jumpTo(p.dataset.ref, host.BG(e));
  });
  const TPS = window.topics;
  let topicsReady = false, tpIdx = null, tpSec = [], tpSecKey = '';
  const tpS = { slug: null, data: null, tab: 'notable', sort: 'rel', n: 60, q: '', sq: '', books: new Set(), booksOpen: false, stack: [] };
  const tpBookOf = ref => ref.replace(/\s+[\dIVXLC][\dabIVXLC:.,\- ]*$/, '').split(', ')[0];
  const tpLang = () => (I18N.lang === 'he' ? 'he' : 'en');
  const tpName = t => (I18N.lang === 'he' && t.he) ? t.he : (t.en || t.slug || t.s);
  async function refreshTopicStatus() {
    const st = await TPS.status();
    topicsReady = st.complete;
    host.$('#tpInfo').textContent = st.complete ? I18N.t('✓ vollständig vorhanden') : st.count ? `${st.count} / ${st.total}` : I18N.t('noch nicht heruntergeladen');
    host.$('#tpGet').textContent = st.complete ? I18N.t('Erneut laden') : st.count ? I18N.t('Fortsetzen') : I18N.t('Themen herunterladen');
    return st;
  }
  host.$('#tpGet').onclick = async () => {
    host.$('#tpGet').disabled = true; host.$('#tpStop').disabled = false; host.$('#tpProg').hidden = false;
    const r = await TPS.build();
    host.$('#tpStop').disabled = true; host.$('#tpProg').hidden = true; host.$('#tpGet').disabled = false; tpIdx = null;
    await refreshTopicStatus();
    if (r.error) host.$('#tpInfo').textContent = '⚠ ' + r.error;
    else if (r.failed) host.$('#tpInfo').textContent += ' · ' + I18N.t('{} Fehler (erneut starten zum Fortsetzen)', r.failed);
    if (host.view) loadTopics(host.view.sections[host.view.idx]);
  };
  host.$('#tpStop').onclick = () => TPS.cancel();
  TPS.onProgress(p => { host.$('#tpProg').max = p.total || 1; host.$('#tpProg').value = p.file; host.$('#tpInfo').textContent = `${I18N.t(p.phase)} (${p.file}/${p.total})`; });

  function btnLbl(sel, icon, key, n) { const el = host.$(sel); if (el) el.innerHTML = `${icon}<span class="bl">${host.esc(I18N.t(key))}</span>${n ? ' ' + n : ''}`; }
  async function loadTopics(s) {
    host.$('#tpBtn').hidden = !topicsReady; tpSec = []; tpSecKey = '';
    if (!topicsReady || !host.view || !s) return;
    const first = s.label.split(' › ')[0];
    const m = s.path.length === 1 && !s.label.includes('›') && first.match(/(\d+[ab]?)$/i);
    if (!m) { btnLbl('#tpBtn', '🏷', 'Themen', 0); return; }
    const token = host.view.idx + ':' + host.view.group.key;
    let rows = []; try { rows = await TPS.section(host.view.group.title, m[1]); } catch { rows = []; }
    if (!host.view || token !== host.view.idx + ':' + host.view.group.key) return;
    tpSec = rows; tpSecKey = host.view.group.title + ' ' + m[1];
    btnLbl('#tpBtn', '🏷', 'Themen', rows.length);
    host.apSoon();
    if (!host.$('#topicPanel').hidden && !tpS.slug) renderTopicPanel();
  }
  const tpSort = (a, b) => {
    const A = a.o, B = b.o, lang = tpLang();
    if (!A && !B) return 0;
    if (!A !== !B) return A ? -1 : 1;
    if (tpS.sort === 'chrono') return A.d === B.d ? (A.id < B.id ? -1 : A.id > B.id ? 1 : 0) : A.d - B.d;
    const i = lang === 'he' ? 1 : 0;
    if (A.cp[i] > 0 || B.cp[i] > 0) return B.cp[i] - A.cp[i];
    if (lang === 'en' && A.al.length !== B.al.length) return A.al.includes('en') ? -1 : B.al.includes('en') ? 1 : 0;
    if (A.pr !== B.pr) return B.pr - A.pr;
    return B.s - A.s;
  };
  const tpPara = s => host.esc(s || '').trim().replace(/\n\s*\n/g, '<br><br>');
  const REL = { 'is-a': 'Ist ein', 'parent-of': 'Übergeordnet zu', 'child-of': 'Untergeordnet zu', 'related-to': 'Verwandt', 'member-of': 'Gehört zu', 'has-role': 'Rolle', 'participates-in': 'Beteiligt an', 'person-participates-in-event': 'Beteiligte', 'spouse-of': 'Ehepartner', 'sibling-of': 'Geschwister', 'opposed': 'Gegensatz', 'has-relationship': 'Beziehungen' };
  async function renderTopicPanel() {
    const body = host.$('#tpBody'); const fl = host.$('#tpFilter'); fl.hidden = !!tpS.slug; fl.placeholder = I18N.t('Thema suchen (z. B. Abraham, Pessach) …'); if (fl.value !== tpS.q) fl.value = tpS.q;
    if (!tpS.slug) {
      host.$('#tpTitle').textContent = I18N.t('Themen');
      let rows, head = '';
      if (tpS.q) {
        if (!tpIdx) tpIdx = await TPS.list();
        const q = tpS.q.toLowerCase();
        rows = tpIdx.filter(x => (x.en || '').toLowerCase().includes(q) || (x.he || '').includes(tpS.q)).sort((a, b) => (b.n - a.n)).slice(0, 80).map(x => ({ slug: x.s, en: x.en, he: x.he, n: x.n }));
        head = `<p class="muted">${host.esc(I18N.t('{} Treffer', rows.length))}</p>`;
      } else {
        rows = tpSec; head = `<p class="muted">${host.esc(tpSecKey ? I18N.t('Themen in {}', tpSecKey) : I18N.t('Gib einen Namen ein, um ein Thema zu suchen.'))}</p>`;
        if (tpSecKey && !rows.length) head += `<p class="muted">${host.esc(I18N.t('Keine Themen zu diesem Abschnitt.'))}</p>`;
      }
      body.innerHTML = head + rows.map(r => `<button class="tpItem" data-slug="${host.esc(r.slug)}"><b>${host.esc(tpName(r))}</b>${r.he && I18N.lang !== 'he' ? ` <span class="he muted" lang="he">${host.esc(r.he)}</span>` : ''}${r.verses ? ` <span class="muted">· ${host.esc(I18N.t('V. {}', r.verses.slice(0, 6).join(', ') + (r.verses.length > 6 ? ' …' : '')))}</span>` : ''}</button>`).join('');
      return;
    }
    if (!tpS.data || tpS.data.slug !== tpS.slug) { body.innerHTML = `<p class="muted">…</p>`; tpS.data = await TPS.get(tpS.slug); }
    const d = tpS.data;
    if (!d) { body.innerHTML = `<p class="muted">${host.esc(I18N.t('Thema nicht gefunden.'))}</p><button data-act="back">←</button>`; return; }
    host.$('#tpTitle').textContent = tpName(d);
    const lang = tpLang(), allN = d.notable, allO = d.sources;
    const bookCount = new Map(); allN.concat(allO).forEach(x => { const b = tpBookOf(x.r); bookCount.set(b, (bookCount.get(b) || 0) + 1); });
    const bookList = [...bookCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    tpS.bookList = bookList.map(x => x[0]);
    const sqq = tpS.sq.toLowerCase();
    const keep = x => (!tpS.books.size || tpS.books.has(tpBookOf(x.r))) && (!sqq || x.r.toLowerCase().includes(sqq) || JSON.stringify(x.d || '').toLowerCase().includes(sqq));
    const notable = allN.filter(keep), others = allO.filter(keep);
    const tab = tpS.tab === 'notable' && !allN.length ? 'sources' : tpS.tab;
    if (tpS.auto !== d.slug + '|' + tab) { tpS.auto = d.slug + '|' + tab; tpS.sort = tab === 'sources' ? 'chrono' : 'rel'; } // „Alle Quellen“ zuerst chronologisch, „Notable Sources“ nach Relevanz
    const notableSorted = notable.slice().sort(tpSort), othersSorted = others.slice().sort(tpSort);
    const list = tab === 'notable' ? notableSorted : notable.concat(others).sort(tpSort);
    const text = d.desc && (d.desc[lang] || d.desc.en || d.desc.he);
    const chips = Object.entries(d.links || {}).map(([k, arr]) => `<div><span class="muted">${host.esc(I18N.t(REL[k] || k))}:</span> <span class="tpChips">${arr.slice(0, 14).map(x => `<button data-slug="${host.esc(x.t)}">${host.esc(I18N.lang === 'he' && x.he ? x.he : x.en)}</button>`).join('')}</span></div>`).join('');
    body.innerHTML = `<button data-act="back">←</button>
      ${d.he && I18N.lang !== 'he' ? `<div class="he" lang="he"><b>${host.esc(d.he)}</b></div>` : ''}
      ${text ? `<p>${tpPara(text)}</p>` : ''}
      ${chips}
      <input id="tpSq" class="tpSq" value="${host.esc(tpS.sq)}" placeholder="${host.esc(I18N.t('Quellen filtern (z. B. Rashi, Genesis) …'))}">
      <div class="tpTabs">
        ${allN.length ? `<button data-tab="notable" class="${tab === 'notable' ? 'on' : ''}">${host.esc(I18N.t('Notable Sources'))} (${notable.length})</button>` : ''}
        <button data-tab="sources" class="${tab === 'sources' ? 'on' : ''}">${host.esc(I18N.t(allN.length ? 'Alle Quellen' : 'Quellen'))} (${notable.length + others.length})</button>
        <span class="spacer"></span>
        <select data-act="sort"><option value="rel"${tpS.sort === 'rel' ? ' selected' : ''}>${host.esc(I18N.t('Relevanz'))}</option><option value="chrono"${tpS.sort === 'chrono' ? ' selected' : ''}>${host.esc(I18N.t('Chronologisch'))}</option></select>
      </div>` + list.slice(0, tpS.n).map(x => {
        const de = x.d && (x.d[lang] || x.d.en || x.d.he);
        return `<div class="tpSrc"><a data-ref="${host.esc(x.r)}">${host.esc(x.r)}</a>${de ? `<div class="tpD">${de.t ? `<b>${host.esc(de.t)}</b><br>` : ''}${tpPara(de.p)}</div>` : ''}</div>`;
      }).join('') + (!list.length ? `<p class="muted">${host.esc(I18N.t('Keine Quellen für diesen Filter.'))}</p>` : '') + (list.length > tpS.n ? `<button data-act="more">${host.esc(I18N.t('Mehr anzeigen'))} (${list.length - tpS.n})</button>` : '');
  }
  function openTopic(slug, push = true) {
    if (push && tpS.slug) tpS.stack.push(tpS.slug);
    tpS.slug = slug; tpS.data = null; tpS.n = 60; tpS.tab = 'notable'; tpS.sq = ''; tpS.books = new Set();
    placeTp(); host.$('#topicPanel').hidden = false; renderTopicPanel(); host.$('#topicPanel').scrollTop = 0;
  }
  const placeTp = () => { const h = document.querySelector('header'); const t = (h ? h.getBoundingClientRect().bottom : 44) + 'px'; host.$('#topicPanel').style.top = t; host.$('#tpResize').style.top = t; };
  // Breite per Ziehen am linken Rand (gemeinsam mit Kommentar- und Wörterbuchleiste)
  new MutationObserver(() => { host.$('#tpResize').hidden = host.$('#topicPanel').hidden && host.$('#outlinePanel').hidden; }).observe(host.$('#topicPanel'), { attributes: true, attributeFilter: ['hidden'] });
  host.$('#tpResize').addEventListener('mousedown', ev => {
    ev.preventDefault(); const rt = document.documentElement; rt.classList.add('cmt-dragging');
    const off = host.IS_PANE2 ? 0 : (rt.classList.contains('split') ? window.innerWidth * (parseFloat(getComputedStyle(rt).getPropertyValue('--p2w')) / 100) : 0);
    const mv = e2 => window.setPanelW(window.innerWidth - off - e2.clientX);
    const up = () => { rt.classList.remove('cmt-dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  host.$('#tpResize').addEventListener('dblclick', () => window.setPanelW(400));
  host.$('#tpBtn').onclick = () => { host.$('#outlinePanel').hidden = true; host.$('#mapPanel').hidden = true; placeTp(); tpS.slug = null; tpS.stack = []; tpS.q = ''; host.$('#tpFilter').value = ''; host.$('#topicPanel').hidden = false; renderTopicPanel(); };
  host.$('#tpClose').onclick = () => { host.$('#topicPanel').hidden = true; };


  // Klick außerhalb oder Esc schließt das Themen-Fenster
  document.addEventListener('mousedown', e => { const p = host.$('#topicPanel'); if (p.hidden || p.classList.contains('docked') || !e.target.closest || e.target.closest('#topicPanel, #tpBtn, #tpResize, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, dialog')) return; p.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !host.$('#topicPanel').hidden && !document.querySelector('dialog[open]')) { host.$('#topicPanel').hidden = true; e.stopPropagation(); } }, true);
  host.$('#tpFilter').oninput = e => { tpS.q = e.target.value.trim(); renderTopicPanel(); };
  host.$('#tpBody').addEventListener('input', async e => { if (e.target.id !== 'tpSq') return; const p = e.target.selectionStart; tpS.sq = e.target.value.trim(); tpS.n = 60; await renderTopicPanel(); const n = host.$('#tpSq'); if (n) { n.focus(); n.setSelectionRange(p, p); } });
  host.$('#tpBody').addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.slug) return openTopic(t.dataset.slug);
    if (t.dataset.ref) { host.hovApi && host.hovApi.hide(); return host.jumpTo(t.dataset.ref.replace(/-.*$/, ''), host.BG(e)); }
    if (t.dataset.tab) { tpS.tab = t.dataset.tab; tpS.n = 60; return renderTopicPanel(); }
    if (t.dataset.act === 'allbooks') { tpS.books = new Set(); tpS.n = 60; return renderTopicPanel(); }
    if (t.dataset.act === 'more') { tpS.n += 100; return renderTopicPanel(); }
    if (t.dataset.act === 'back') { tpS.slug = tpS.stack.pop() || null; tpS.data = null; return renderTopicPanel(); }
  });
  // Vorschau beim Überfahren einer Quelle (nur wenn der Text lokal vorliegt), Rechtsklick wie bei den Kommentaren
  host.$('#tpBody').addEventListener('mouseover', e => {
    const a = e.target.closest('a[data-ref]');
    if (!a || !host.hovApi || a.dataset.ref === host.hovApi.current()) return;
    host.hovApi.start(a, a.dataset.ref, true, false);
  });
  host.$('#tpBody').addEventListener('mouseout', e => { const a = e.target.closest('a[data-ref]'); if (a && host.hovApi && !a.contains(e.relatedTarget)) host.hovApi.hide(); });
  host.$('#topicPanel').addEventListener('scroll', () => host.hovApi && host.hovApi.hide(), { passive: true });
  host.$('#tpBody').addEventListener('contextmenu', e => {
    const a = e.target.closest('a[data-ref]');
    if (!a || (window.getSelection() + '')) return;
    const ref = a.dataset.ref.replace(/-.*$/, '');
    host.hovApi && host.hovApi.hide();
    const items = [{ label: 'Öffnen', fn: () => host.jumpTo(ref, false) }, { label: 'Im neuen Tab öffnen', fn: () => host.jumpTo(ref, true) }];
    if (!host.IS_PANE2) items.push({ label: 'Im zweiten Fenster öffnen', fn: () => host.openInPane2(null, { jump: ref }) });
    host.ctxShow(e, items);
  });
  host.$('#tpBody').addEventListener('toggle', e => { if (e.target.id === 'tpBooks') tpS.booksOpen = e.target.open; }, true);
  host.$('#tpBody').addEventListener('change', e => {
    if (e.target.dataset.bk != null) { const b = tpS.bookList[+e.target.dataset.bk]; if (e.target.checked) tpS.books.add(b); else tpS.books.delete(b); tpS.n = 60; return renderTopicPanel(); }
    if (e.target.dataset.act === 'sort') { tpS.sort = e.target.value; renderTopicPanel(); } });
  refreshTopicStatus().then(() => { if (host.view) loadTopics(host.view.sections[host.view.idx]); });

    return {
      get btnLbl() { return btnLbl; },
      get loadTopics() { return loadTopics; },
      get olBookNo() { return olBookNo; },
      get olBtnRefresh() { return olBtnRefresh; },
      get olChips() { return olChips; },
      get olInline() { return olInline; },
      get olInlineOn() { return olInlineOn; },
      get olMark() { return olMark; },
      get olOwn() { return olOwn; },
      get olOwnCache() { return olOwnCache; },
      get olOwnFor() { return olOwnFor; },
      get olToggle() { return olToggle; },
      get openTopic() { return openTopic; },
      get renderOutline() { return renderOutline; },
      get tpName() { return tpName; },
      get tpSec() { return tpSec; }, set tpSec(value) { tpSec = value; },
      get tpSecKey() { return tpSecKey; }, set tpSecKey(value) { tpSecKey = value; },
    };
  }
  return { create };
})();
