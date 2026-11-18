// LibraryMap: eigener Zustand und explizite Anbindung an den Leser.
window.LibraryMap = (() => {
  'use strict';
  function create(host) {
  // ---------- Karte: Orte des Kapitels (OpenBible.info) auf einem Relief aus dem Copernicus-Höhenmodell ----------
  const BM = window.BMAP, BB = window.BBORD;
  // Orte der Werke des Josephus (ToposText, ODC-BY) werden zu den Bibelorten hinzugefügt; „Kapitel“ = Buch*1000+Kapitel (0 = Vorwort)
  if (BM && window.BMJOS) {
    BM.nOrig = BM.books.length; BM.j3 = new Set(); const km = (a, b) => Math.hypot((a[0] - b[0]) * 95, (a[1] - b[1]) * 111), nn = s => String(s).replace(/\(.*?\)/g, '').split('/')[0].toLowerCase().replace(/[^a-z]/g, ''), seen = new Map();
    window.BMJOS.forEach(w => {
      const bi = BM.books.push(w.title) - 1; if (w.depth3) BM.j3.add(bi); const map = w.places.map(pl => {
        const key = pl[0] + '|' + pl[2] + '|' + pl[3]; if (seen.has(key)) return seen.get(key);
        let ix = BM.places.findIndex(p => !p[7] && nn(p[0]) === nn(pl[0]) && km([p[2], p[3]], [pl[2], pl[3]]) < 25); // gleicher Ort schon aus OpenBible?
        if (ix < 0) { ix = BM.places.push([pl[0], pl[1], pl[2], pl[3], [], '', []]) - 1; }
        if (!BM.places[ix][7]) BM.places[ix][7] = { g: pl[4], pl: pl[5], wd: pl[6] };
        seen.set(key, ix); return ix;
      });
      Object.entries(w.by).forEach(([k, l]) => l.forEach(n => BM.places[map[n]][4].push(w.depth3 ? [bi, +k, 0] : [bi, Math.floor(k / 1000), k % 1000])));
    });
  }
  // Orte der rabbinischen Literatur (ALMA, Ido Wachtel/HUJI GIS): je Werk Orte und Abschnittsschlüssel (Pfad des Abschnitts, „|“-getrennt);
  // Einträge [Buch, Schlüssel, Segment, Stelle] – Schlüssel ist hier eine Zeichenkette, die Stelle dient als Link
  if (BM && window.BMALMA) {
    BM.alma = new Set(); const km = (a, b) => Math.hypot((a[0] - b[0]) * 95, (a[1] - b[1]) * 111), nn = s => String(s || '').replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z]/g, ''), seen = new Map();
    // Derselbe Ort schon vorhanden? Gleicher Name; sonst gleicher hebräischer Name (ohne Vokalzeichen und Lesemütter) oder gleiches Umschrift-Gerüst
    // (Beth-shean = Bet Shean, Lydda = Lod, Jabneh = Yavne), auch über die weiteren Namen – jeweils nur bei nahezu gleicher Lage
    const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    const heC = s => String(s || '').replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]), heS = s => heC(s).replace(/[וי]/g, '').replace(/א$/, 'ה');
    const enS = s => String(s || '').replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z]/g, '').replace(/th/g, 't').replace(/ph/g, 'f').replace(/sh/g, 's').replace(/tz|ts|z/g, 's').replace(/kh|ch/g, 'h').replace(/ck|q|c/g, 'k').replace(/[vw]/g, 'b').replace(/[aeiouyj]/g, '').replace(/(.)\1+/g, '$1').replace(/h$/, '');
    const alts = s => String(s || '').split(/[,;/]/).map(enS).filter(x => x.length > 2);
    const mk = (n, h, a, p) => { const ps = String(n || '').replace(/\(.*?\)/g, '').split(/[/,]/).map(x => x.trim()).filter(Boolean); // „Sepphoris/Diocaesarea (Palestine)“ -> zwei Namen
      return { n: nn(ps[0]), ns: ps.map(nn), s: enS(ps[0]), h: heS(h), hc: heC(h), a: alts(a).concat(ps.slice(1).map(enS).filter(x => x.length > 2)), j: !!(p && p[7] && !p[5]) }; }; // j: Ort nur aus ToposText (Josephus), ohne hebräischen Namen
    const KEY = BM.places.map(p => mk(p[0], p[5], p[9], p));
    const AREA = /^(region|region\/people|people group|country|body of water|sea_lake|sea\/strait|lake|river|natural area|mountain range|)$/;
    const find = pl => {
      const c = mk(pl[0], pl[4], pl[5]); let best = -1, bs = 1e9;
      for (let i = 0; i < BM.places.length; i++) {
        const p = BM.places[i], k = KEY[i], d = km([p[2], p[3]], [pl[2], pl[3]]);
        if (d >= 10) { if (d < 250 && k.ns.includes(c.n) && c.n.length > 2 && AREA.test(pl[1]) && AREA.test(p[1]) && 500 + d < bs) { bs = 500 + d; best = i; } continue; } // Gebiet/Land/Gewässer: die Quellen setzen den Mittelpunkt verschieden
        const sc = k.ns.includes(c.n) ? d : c.hc.length > 1 && k.hc === c.hc ? 20 + d : d < 4 && c.h.length > 1 && k.h === c.h ? 30 + d : d < 6 && ((c.s.length > 2 && (k.s === c.s || k.a.includes(c.s))) || (k.s.length > 2 && c.a.includes(k.s))) ? 40 + d
          : d < 0.55 && k.j && !AREA.test(pl[1]) && !AREA.test(p[1]) && km([pl[2], pl[3]], [35.235, 31.777]) > 3 ? 60 + d : -1; // zuletzt: dieselbe Fundstätte (ToposText und ALMA setzen Orte auf die Ausgrabung), auch bei ganz anderem Namen (Machairous = Mikhvar)
        if (sc >= 0 && sc < bs) { bs = sc; best = i; }
      }
      return best;
    };
    window.BMALMA.forEach(w => {
      let bi = BM.books.indexOf(w.title); if (bi < 0) bi = BM.books.push(w.title) - 1; BM.alma.add(bi);
      const map = w.places.map(pl => {
        const key = pl[0] + '|' + pl[2] + '|' + pl[3]; if (seen.has(key)) return seen.get(key);
        let ix = find(pl);
        if (ix < 0) { ix = BM.places.push([pl[0], pl[1], pl[2], pl[3], [], pl[4] || '', []]) - 1; KEY.push(mk(pl[0], pl[4], '')); }
        const p = BM.places[ix]; if (!p[5] && pl[4]) { p[5] = pl[4]; KEY[ix].h = heS(pl[4]); }
        const more = [nn(pl[0]) !== nn(p[0]) ? pl[0] : '', ...String(pl[5] || '').split(/[,;]/)].map(x => x.trim()).filter(Boolean); // weitere Namen (auch die abweichende ALMA-Umschrift)
        if (more.length) { const have = String(p[9] || '').split(', ').filter(Boolean); more.forEach(x => { if (!have.some(y => nn(y) === nn(x)) && nn(x) !== nn(p[0])) have.push(x); }); if (have.length) { p[9] = have.join(', '); KEY[ix].a = alts(p[9]); } }
        seen.set(key, ix); return ix;
      });
      Object.entries(w.by).forEach(([k, l]) => l.forEach(([n, v, ref, per]) => BM.places[map[n]][4].push([bi, k, v, ref, per || 'O'])));
    });
    // Prüfhilfe: Orte mit verschiedenem Namen, die weniger als 3 km auseinanderliegen (mögliche Doppelgänger: der eine nur aus ALMA, der andere ohne ALMA-Stellen) – in der Konsole: __mapNear()
    window.__mapNear = (lim = 3) => { const out = [], only = p => p[4].length && p[4].every(e => BM.alma.has(e[0])), none = p => !p[4].some(e => BM.alma.has(e[0])); BM.places.forEach((a, i) => { for (let j = i + 1; j < BM.places.length; j++) { const b = BM.places[j]; if (Math.abs(a[3] - b[3]) > 0.05) continue; const d = km([a[2], a[3]], [b[2], b[3]]); if (d < lim && ((only(a) && none(b)) || (only(b) && none(a)))) out.push([a[0], b[0], +d.toFixed(2), a[5] || '', b[5] || '']); } }); return out; };
  }
  // Epoche eines Eintrags [Buch, Kapitel, Vers, Stelle?, Epoche?]: Bibel (OpenBible), 2. Tempel (Josephus/Makkabäer), sonst aus ALMA
  const MPER = new Set(['B', 'S', 'T', 'A']); try { const v = JSON.parse(localStorage.getItem('mapPer') || 'null'); if (Array.isArray(v)) { MPER.clear(); v.forEach(x => MPER.add(x)); } } catch { /* egal */ }
  const mapPerOf = e => e[4] || (BM.nOrig != null && e[0] >= BM.nOrig && !(BM.alma && BM.alma.has(e[0])) ? 'S' : 'B');
  const mapPerOk = e => { const q = mapPerOf(e); return MPER.has(q === 'O' ? 'S' : q); };
  const mapPlaceOk = p => MPER.size === 4 || p[4].some(mapPerOk);
  // Farben der Epochen (dieselben wie auf den Epochen-Knöpfen und in der Legende, library.css) und Reihenfolge von früh nach spät
  const MPCOL = { B: '#d6382f', S: '#8e44ad', T: '#1f6fd8', A: '#2e8b57' }, MPORD = ['B', 'S', 'T', 'A'], MPNAME = { B: 'Tanach', S: '2. Tempel', T: 'Tannaiten', A: 'Amoräer' };
  const mapPm = i => (MP.pm || (MP.pm = BM.places.map(p => { let m = 0; p[4].forEach(e => { const q = mapPerOf(e); m |= 1 << Math.max(0, MPORD.indexOf(q === 'O' ? 'S' : q)); }); return m; })))[i]; // Epochen eines Ortes als Bitmaske
  const mapPerMask = () => MPORD.reduce((m, k, n) => m | (MPER.has(k) ? 1 << n : 0), 0);
  const mapCols = i => { const m = mapPm(i), e = (m & mapPerMask()) || m; return MPORD.filter((k, n) => e >> n & 1).map(k => MPCOL[k]); }; // früheste Epoche zuerst
  // Ortstypen der Quellen (OpenBible, ToposText, ALMA) auf Deutsch; werden über I18N weiter übersetzt
  const MTYPE = { settlement: 'Ortschaft', city: 'Stadt', village: 'Dorf', polity: 'Stadt oder Staat', country: 'Land', region: 'Gebiet', 'region/people': 'Gebiet oder Volk', 'people group': 'Volk', river: 'Fluss', 'body of water': 'Gewässer', sea_lake: 'Meer oder See', 'sea/strait': 'Meer', lake: 'See', mountain: 'Berg', 'mountain range': 'Gebirge', hill: 'Hügel', valley: 'Tal', wadi: 'Wadi', campsite: 'Lagerplatz', road: 'Straße', 'pass/road': 'Pass oder Straße', 'mountain pass': 'Pass', canal: 'Kanal', tree: 'Baum', structure: 'Bauwerk', building: 'Gebäude', gate: 'Tor', well: 'Brunnen', spring: 'Wasserquelle', pool: 'Teich', ford: 'Furt', cliff: 'Klippe', island: 'Insel', 'district in settlement': 'Stadtteil', rock: 'Fels', garden: 'Garten', altar: 'Altar', special: 'besonderer Ort', 'natural area': 'Landschaft', hall: 'Halle', field: 'Feld', forest: 'Wald', room: 'Raum', fortification: 'Festung', 'stone heap': 'Steinhaufen', 'sanctuary/temple': 'Heiligtum', deme: 'Demos', battlefield: 'Schlachtfeld', cape: 'Kap', monument: 'Denkmal', harbor: 'Hafen', location: 'Örtlichkeit' };
  const mapTypeT = ty => { const de = MTYPE[ty]; if (!de) return ty || ''; const k = 'Ortstyp: ' + de, v = I18N.t(k); return v === k ? de : v; }; // Schlüssel mit Vorsatz, damit einzelne Wörter (See, Tor, Land) nicht anderswo in der Oberfläche übersetzt werden
  const MAREA = /^(region|region\/people|people group|country|body of water|sea_lake|sea\/strait|lake|river|natural area|valley|wadi|canal)$/, MTRI = /^(mountain|mountain range|hill|cliff|rock)$/; // Flächen: kursiver Name ohne Punkt; Berge: Dreieck
  // feste Grundbeschriftung (Gewässer, Landschaften): [englisch, deutsch, hebräisch, Länge, Breite, ab Zoom, bis Zoom, Wasser?]
  const MBASE = [['Mediterranean Sea', 'Mittelmeer', 'הים התיכון', 30.6, 33.7, 0, 2.5, 1], ['Mediterranean Sea', 'Mittelmeer', 'הים התיכון', 34.25, 32.35, 2.5, 60, 1], ['Red Sea', 'Rotes Meer', 'ים סוף', 36.2, 25.4, 0, 6, 1], ['Persian Gulf', 'Persischer Golf', 'המפרץ הפרסי', 50.2, 27.9, 0, 6, 1], ['Caspian Sea', 'Kaspisches Meer', 'הים הכספי', 50.7, 40.6, 0, 6, 1], ['Black Sea', 'Schwarzes Meer', 'הים השחור', 34.5, 41.75, 0, 6, 1],
    ['Cyprus', 'Zypern', 'קפריסין', 33.2, 35.0, 0.3, 20, 0], ['Sinai', 'Sinai', 'סיני', 33.8, 29.5, 0.25, 12, 0], ['Nile', 'Nil', 'נילוס', 31.55, 27.2, 0.3, 30, 1], ['Euphrates', 'Euphrat', 'פרת', 39.75, 35.45, 0.3, 30, 1], ['Tigris', 'Tigris', 'חידקל', 43.2, 35.1, 0.3, 30, 1],
    ['Dead Sea', 'Totes Meer', 'ים המלח', 35.48, 31.5, 2.2, 200, 1], ['Sea of Galilee', 'See Genezareth', 'כנרת', 35.59, 32.82, 4.5, 200, 1], ['Jordan', 'Jordan', 'ירדן', 35.56, 32.2, 7, 200, 1]];
  const mapSecKey = () => { const s = host.view && host.view.sections && host.view.sections[host.view.idx]; return s && s.path ? s.path.filter(x => x !== '').join('|') : null; };
  // Jerusalem: OpenBible kennt für Tore, Türme, Teiche und Paläste nur den Stadtmittelpunkt. Hier sind Lagen nach Neh 3 und der Forschung gesetzt (vermutet, teils umstritten).
  const JERPOS = { 'Sheep Gate': [35.2364, 31.7808], 'Fish Gate': [35.2305, 31.7815], 'Gate of Yeshanah': [35.2290, 31.7800], 'Valley Gate': [35.2263, 31.7720], 'Dung Gate': [35.2325, 31.7690], 'Fountain Gate': [35.2352, 31.7698], 'Water Gate': [35.2370, 31.7728], 'Horse Gate': [35.2368, 31.7770], 'East Gate': [35.2374, 31.7788], 'Muster Gate': [35.2368, 31.7798], 'Corner Gate': [35.2282, 31.7774], 'Ephraim Gate': [35.2275, 31.7790], 'Benjamin Gate': [35.2318, 31.7822], 'Potsherd Gate': [35.2312, 31.7686], 'Shallecheth': [35.2337, 31.7777],
    'Tower of the Ovens': [35.2303, 31.7766], 'Tower of Hananel': [35.2360, 31.7803], 'Tower of the Hundred': [35.2364, 31.7804], 'Millo': [35.2362, 31.7752], 'Jebus': [35.2362, 31.7738], 'Lower Pool': [35.2348, 31.7692],
    'House of the Forest of Lebanon': [35.2363, 31.7764], 'Hall of the Throne': [35.2363, 31.7764], 'Hall of Pillars': [35.2363, 31.7764], 'Hall of Judgment': [35.2363, 31.7764] };
  BM.places.forEach(p => { const q = JERPOS[p[0]]; if (q && !p[7] && Math.abs(p[2] - 35.234) < 0.003 && p[3] > 31.776 && p[3] < 31.781) { p[2] = q[0]; p[3] = q[1]; p[8] = 1; } });
  const mapJosKey = () => { const s = host.view && host.view.sections && host.view.sections[host.view.idx], p = s && s.path; if (!p) return null; if (p[0] === 'Preface') return 0; const nums = p.filter(x => typeof x === 'number'); return nums.length >= 1 ? nums[0] + 1 : null; }; // Seitenabschnitt = Buch (Kapitel stehen darin)
  const MP = { img: null, ok: false, s: 1, tx: 0, ty: 0, cur: [], sel: -1, alt: -1, byChap: null, byBook: null, over: null, drag: null, lay: [], rul: null, grp: null, vsel: null, vnum: 0, hov: -1, rhov: null, sort: 'az', dense: false };
  try { if (localStorage.getItem('mapSort') === 'occ') MP.sort = 'occ'; } catch { /* egal */ }
  const mapPx = p => [(p[2] - BM.W0) * BM.ppd * BM.k, (BM.N0 - p[3]) * BM.ppd];
  const mapHe = p => p[5] || '';
  const mapXY = (lon, lat) => [(lon - BM.W0) * BM.ppd * BM.k, (BM.N0 - lat) * BM.ppd];
  const mapConf = p => p[8] ? 400 : (p[6] && p[6][0] ? p[6][0][3] : 1000);   // Sicherheit der wahrscheinlichsten Zuordnung (Promille, neuestes Jahrzehnt)
  // Orte, deren Verse in einem Gliederungs-ref liegen („1:27-2:5“, „15:32-37, 16:14-19“)
  function mapRanges(ref) {
    return String(ref).split(',').map(part => {
      const m = part.trim().match(/^(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?$/); if (!m) return null; let a, b;
      if (m[2]) { a = +m[1] * 10000 + +m[2]; b = m[4] ? +m[3] * 10000 + +m[4] : m[3] ? +m[1] * 10000 + +m[3] : a; } else { a = +m[1] * 10000; b = (m[3] ? +m[3] : +m[1]) * 10000 + 9999; }
      return [a, b];
    }).filter(Boolean);
  }
  function mapByBook() { if (MP.byBook) return MP.byBook; MP.byBook = new Map(); BM.places.forEach((p, i) => p[4].forEach(([b, c, v]) => { if (typeof c !== 'number') return; if (!MP.byBook.has(b)) MP.byBook.set(b, []); MP.byBook.get(b).push([i, c * 10000 + v, c * 10000 + (v ? v : 9999)]); })); return MP.byBook; }
  function mapForRef(title, ref) { // -> [{i, vs}]
    const bi = BM.books.indexOf(title); if (bi < 0) return []; const rg = mapRanges(ref); if (!rg.length) return []; const out = new Map();
    (mapByBook().get(bi) || []).forEach(([i, lo, hi]) => { if (rg.some(([a, b]) => hi >= a && lo <= b)) { if (!out.has(i)) out.set(i, []); out.get(i).push(lo % 10000); } });
    return [...out].map(([i, vs]) => ({ i, vs }));
  }
  function mapChapPlaces() {
    if (MP.over) return MP.over.list;
    if (!BM || !host.view || !host.view.group) return [];
    const bi = BM.books.indexOf(host.view.group.title); const jos = bi >= 0 && !!BM.j3 && BM.j3.has(bi), alm = bi >= 0 && !!BM.alma && BM.alma.has(bi), ch = alm ? mapSecKey() : jos ? mapJosKey() : host.auChapter(); if (bi < 0 || ch == null) return [];
    if (!MP.byChap) { MP.byChap = new Map(); BM.places.forEach((p, i) => p[4].forEach(([b, c, v]) => { const k = b + '|' + c; let m = MP.byChap.get(k); if (!m) MP.byChap.set(k, m = new Map()); if (!m.has(i)) m.set(i, []); m.get(i).push(v); })); }
    if (jos) { // Josephus: alle Kapitel des Buches (bzw. Vorwort)
      const u = new Map(); MP.byChap.forEach((mm, k) => { const [b, c] = k.split('|').map(Number); if (b !== bi || (ch === 0 ? c !== 0 : Math.floor(c / 1000) !== ch)) return; mm.forEach((vs, i) => { if (!u.has(i)) u.set(i, []); u.get(i).push(...vs); }); });
      return [...u].map(([i, vs]) => ({ i, vs }));
    }
    const m = MP.byChap.get(bi + '|' + ch); return m ? [...m].map(([i, vs]) => ({ i, vs })) : [];
  }
  function mapRefresh() {
    if (!BM) return; MP.over = null; MP.grp = null; MP.vsel = null; MP.cur = mapChapPlaces(); host.$('#mapBtn').hidden = !MP.cur.length && host.$('#mapPanel').hidden; host.btnLbl('#mapBtn', '🗺', 'Karte', MP.cur.length);
    if (!host.$('#mapPanel').hidden) { MP.sel = -1; mapRouteFill(); mapFit(); mapInfo(); mapDraw(); }
  }
  function mapSize() { const cv = host.$('#mapCv'), r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; const w = Math.max(50, Math.round(r.width * d)), h = Math.max(50, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return { w, h, d }; }
  const MAPZ = 14; // größter Zoom außerhalb von Jerusalem und der feinen Kacheln (das Relief hat 150 Pixel je Grad; darüber ist nur noch Unschärfe zu sehen)
  const mapNearJer = (lon, lat) => Math.abs(lon - 35.235) < 0.2 && Math.abs(lat - 31.775) < 0.17;
  const mapInMap = p => { const [x, y] = mapPx(p); return x >= 0 && y >= 0 && x <= BM.w && y <= BM.h; }; // Rom u. a. liegen außerhalb des Reliefs
  const mapCur = () => MPER.size === 4 ? MP.cur : MP.cur.filter(c => mapPlaceOk(BM.places[c.i])); // Orte des Kapitels, die der Epochenfilter durchlässt
  // Die Karte darf nicht aus dem Bild rutschen: ist sie kleiner als die Fläche, wird sie zentriert; sonst bleibt höchstens ein Rand von 30 % frei
  function mapClamp() {
    const { w, h } = mapSize(), lo = Math.min(w / BM.w, h / BM.h); if (MP.s < lo) MP.s = lo;
    const W = BM.w * MP.s, H = BM.h * MP.s, mx = Math.min(w * 0.3, Math.max(0, (W - w) / 2)), my = Math.min(h * 0.3, Math.max(0, (H - h) / 2));
    MP.tx = W <= w ? (w - W) / 2 : Math.min(mx, Math.max(w - W - mx, MP.tx)); MP.ty = H <= h ? (h - H) / 2 : Math.min(my, Math.max(h - H - my, MP.ty));
  }
  // Punkte (Kartenpixel) einpassen; die Ränder zählen in Bildschirmpixeln: rechts bleibt Platz für Namen und die Knopfleiste
  function mapFitPts(pts, cap) {
    const { w, h, d } = mapSize(), all = Math.min(w / BM.w, h / BM.h);
    if (!pts.length) { MP.s = all; MP.tx = (w - BM.w * all) / 2; MP.ty = (h - BM.h * all) / 2; return; }
    const mL = Math.min(44 * d, w * 0.1), mR = Math.min(118 * d, w * 0.24), mT = Math.min(34 * d, h * 0.1), mB = Math.min(40 * d, h * 0.12), aw = w - mL - mR, ah = h - mT - mB;
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    MP.s = Math.min(Math.max(Math.min(aw / Math.max(x1 - x0, 1e-9), ah / Math.max(y1 - y0, 1e-9)), all), cap);
    MP.tx = mL + aw / 2 - (x0 + x1) / 2 * MP.s; MP.ty = mT + ah / 2 - (y0 + y1) / 2 * MP.s;
  }
  function mapFit() {
    let pl = mapCur().map(c => BM.places[c.i]).filter(mapInMap);
    const inJ = pl.filter(p => p[2] > JER_BOX[0] && p[2] < JER_BOX[2] && p[3] > JER_BOX[1] && p[3] < JER_BOX[3]);
    if (inJ.length >= 4 && inJ.length >= pl.length * 0.6) pl = inJ; // die meisten Orte liegen in Jerusalem (z. B. Neh 3): dorthin einpassen, Ausreißer bleiben außerhalb des Bildes
    mapFitPts(pl.map(mapPx), pl.length === 1 ? 3 : pl.length && pl.length === inJ.length ? 3000 : MAPZ);
  }
  // Bildschirmpositionen. Orte bleiben an ihrer wahren Lage; nur (nahezu) deckungsgleiche Orte werden zu einem kleinen Kreis aufgefächert (höchstens 8),
  // größere Haufen werden zu einer Zählblase (Klick zoomt hinein). Die Gruppen entstehen um den jeweils wichtigsten Ort, nicht als Kette.
  function mapLayout() {
    const { d, w, h } = mapSize(), lay = [], inCh = new Set(MP.cur.map(c => c.i)), e = 14 * d;
    const pts = mapCur().map(c => { const p = BM.places[c.i], [x, y] = mapPx(p), o = { i: c.i, x: x * MP.s + MP.tx, y: y * MP.s + MP.ty, chap: true, n: p[4].length };
      if (x < 0 || y < 0 || x > BM.w || y > BM.h) { o.off = Math.atan2(o.y - h / 2, o.x - w / 2); o.x = Math.min(w - e, Math.max(e, o.x)); o.y = Math.min(h - 36 * d, Math.max(e, o.y)); } // außerhalb des Reliefs: Pfeil am Bildrand
      return o; });
    const vis = pts.filter(o => o.x > 0 && o.y > 0 && o.x < w && o.y < h).length, dense = vis > 40, near = (dense ? 8 : 13) * d, used = new Array(pts.length).fill(false);
    MP.dense = dense;
    const ord = pts.map((_, k) => k).sort((a, b) => (pts[b].i === MP.sel) - (pts[a].i === MP.sel) || pts[b].n - pts[a].n);
    ord.forEach(ai => {
      if (used[ai]) return; used[ai] = true; const a = pts[ai]; if (a.i === MP.sel) { lay.push(a); return; } // der gewählte Ort steht immer für sich
      const grp = [ai]; let ext = 0;
      ord.forEach(bi => { if (used[bi] || pts[bi].i === MP.sel) return; const dd = Math.hypot(a.x - pts[bi].x, a.y - pts[bi].y); if (dd < near) { used[bi] = true; grp.push(bi); if (dd > ext) ext = dd; } });
      if (grp.length === 1) { lay.push(a); return; }
      const same = ext < 4 * d, cx = grp.reduce((t, k) => t + pts[k].x, 0) / grp.length, cy = grp.reduce((t, k) => t + pts[k].y, 0) / grp.length;
      if (grp.length <= 8 && (same || !dense)) { const R = (dense ? (grp.length === 2 ? 7 : 6 + grp.length * 1.4) : (grp.length === 2 ? 11 : 9 + grp.length * 2)) * d;
        grp.sort((p, q) => BM.places[pts[p].i][0].localeCompare(BM.places[pts[q].i][0])).forEach((k, n) => { const an = -Math.PI / 2 + n * 2 * Math.PI / grp.length + (grp.length === 2 ? Math.PI / 2 : 0); lay.push({ i: pts[k].i, x: cx + R * Math.cos(an), y: cy + R * Math.sin(an), chap: true, n: pts[k].n, spread: true, cx, cy, off: pts[k].off }); });
      } else if (grp.length > 8 || same) lay.push({ i: a.i, x: cx, y: cy, chap: true, n: a.n, bub: grp.map(k => pts[k].i) });
      else grp.forEach(k => lay.push(pts[k])); // viele Orte, aber nicht deckungsgleich: an der wahren Lage lassen (kleinere Marker)
    });
    if (host.$('#mapAll').checked) { const mask = mapPerMask(), all = MPER.size === 4; BM.places.forEach((p, i) => { if (inCh.has(i) || !(all || (mapPm(i) & mask))) return; const [x, y] = mapPx(p); lay.push({ i, x: x * MP.s + MP.tx, y: y * MP.s + MP.ty, chap: false, n: p[4].length }); }); }
    return lay;
  }
  function mapDraw() {
    if (host.$('#mapPanel').hidden || !MP.ok) return; const cv = host.$('#mapCv'), { w, h, d } = mapSize(), g = cv.getContext('2d');
    mapClamp();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#7aa0be'; g.fillRect(0, 0, w, h);
    g.imageSmoothingQuality = 'high'; g.drawImage(MP.img, MP.tx, MP.ty, BM.w * MP.s, BM.h * MP.s);
    mapHiDraw(g, w, h); mapWaterDraw(g, d, w, h); mapRoadsDraw(g, d, w, h); // feines Relief, Gewässer und römische Straßen liegen unter allem anderen
    const r = d, ll = I18N.lang, FONT = '-apple-system, system-ui, sans-serif';
    MP.lay = mapLayout();
    const chap = MP.lay.filter(o => o.chap), R0 = (MP.dense ? 4 : 6) * r, fade = o => !!MP.vsel && !MP.vsel.has(o.i);
    mapJerDraw(g, r, chap);
    if (BB && host.$('#mapBord').checked) {
      g.save(); g.lineJoin = 'round'; g.setLineDash([6 * r, 4 * r]); g.strokeStyle = 'rgba(120,20,60,.85)'; g.lineWidth = 1.6 * r;
      BB.lines.forEach(l => { g.beginPath(); l.forEach(([x, y], k) => { const X = x * MP.s + MP.tx, Y = y * MP.s + MP.ty; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); });
      g.restore(); g.font = `italic 600 ${13 * r}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(100,15,50,.9)'; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3 * r; g.lineJoin = 'round';
      BB.names.forEach(n => { const t = (ll === 'de' ? n[1] : ll === 'he' && n[2] ? n[2] : n[0]).toUpperCase(), X = n[3] * MP.s + MP.tx, Y = n[4] * MP.s + MP.ty; if (X < 0 || Y < 0 || X > w || Y > h) return; g.strokeText(t, X, Y); g.fillText(t, X, Y); });
      g.textAlign = 'start';
    }
    g.textAlign = 'start'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    // Hindernisse für Namen: Bedienelemente auf der Karte, Maßstab, Marker
    const boxes = [], hit = a => boxes.some(q => a.x < q.x + q.w && a.x + a.w > q.x && a.y < q.y + q.h && a.y + a.h > q.y), inside = b => b.x >= 3 * r && b.y >= 2 * r && b.x + b.w <= w - 3 * r && b.y + b.h <= h - 2 * r;
    { const cb = cv.getBoundingClientRect(); ['#mapZoomB', '#mapJer', '#mapRuler', '#mapLegend'].forEach(s => { const el = host.$(s); if (!el || el.hidden) return; const b = el.getBoundingClientRect(); if (b.width) boxes.push({ x: (b.left - cb.left) * d - 3 * r, y: (b.top - cb.top) * d - 3 * r, w: b.width * d + 6 * r, h: b.height * d + 6 * r }); }); }
    const sbar = mapScale(w, h, r); boxes.push(sbar.box);
    const txt = (t, x, y, fill, lw, halo) => { g.lineWidth = (lw || 3.5) * r; g.strokeStyle = halo || 'rgba(255,255,255,.9)'; g.strokeText(t, x, y); g.fillStyle = fill; g.fillText(t, x, y); };
    // Kandidaten für einen Namen: rechts, links, oben, unten – nur wo frei und ganz im Bild
    const spot = (o, tw, th, off, force) => {
      const c = [[o.x + off, o.y - th / 2], [o.x - off - tw, o.y - th / 2], [o.x - tw / 2, o.y - off - th], [o.x - tw / 2, o.y + off]]; if (o.spread && o.x < o.cx - 1) c.unshift(c.splice(1, 1)[0]);
      const bs = c.map(([bx, by]) => ({ x: bx - 2 * r, y: by, w: tw + 4 * r, h: th })); return bs.find(b => inside(b) && !hit(b)) || (force ? bs.find(inside) || bs[0] : null);
    };
    const isArea = o => !o.spread && !o.bub && o.off == null && o.i !== MP.sel && MAREA.test(BM.places[o.i][1]);
    chap.forEach(o => { if (!isArea(o)) { const R = o.bub ? 13 * r : o.i === MP.sel ? 9 * r : R0 + 2 * r; boxes.push({ x: o.x - R, y: o.y - R, w: 2 * R, h: 2 * R }); } });
    // gewählter Ort: Platz für Marker und Namen zuerst sichern, gezeichnet wird er zuletzt (über allem)
    let so = null;
    if (MP.sel >= 0) { so = MP.lay.find(o => o.i === MP.sel && !o.bub); if (!so) { const [x, y] = mapPx(BM.places[MP.sel]); so = { i: MP.sel, x: x * MP.s + MP.tx, y: y * MP.s + MP.ty, chap: false }; }
      if (so.x < -20 || so.y < -20 || so.x > w + 20 || so.y > h + 20) so = null;
      else { if (!so.chap) boxes.push({ x: so.x - 9 * r, y: so.y - 9 * r, w: 18 * r, h: 18 * r }); g.font = `700 ${13 * r}px ${FONT}`; so.name = BM.places[so.i][0]; so.tw = g.measureText(so.name).width; so.lb = spot(so, so.tw, 16 * r, 12 * r, true); boxes.push(so.lb); } }
    // Flächen (Gebiete, Gewässer, Völker): kursiver Name auf der Lage statt eines Punktes; wo dafür kein Platz ist, bleibt es beim Marker
    const areaFont = `italic 600 ${12.5 * r}px ${FONT}`; g.font = areaFont;
    chap.filter(isArea).sort((a, b) => b.n - a.n).forEach(o => { const name = BM.places[o.i][0], tw = g.measureText(name).width, bb = { x: o.x - tw / 2 - 3 * r, y: o.y - 8 * r, w: tw + 6 * r, h: 16 * r };
      if (inside(bb) && !hit(bb)) { o.area = true; o.lb = bb; o.name = name; boxes.push(bb); } else boxes.push({ x: o.x - R0 - 2 * r, y: o.y - R0 - 2 * r, w: 2 * R0 + 4 * r, h: 2 * R0 + 4 * r }); });
    // Grundbeschriftung (Gewässer, Landschaften), dezent und nur wo nichts anderes liegt
    g.font = `italic ${12 * r}px ${FONT}`;
    const shown = new Set(MP.lay.map(o => BM.places[o.i][0]));
    MBASE.forEach(b => { if (MP.s < b[5] || MP.s >= b[6] || shown.has(b[0])) return; const t = ll === 'de' ? b[1] : ll === 'he' ? b[2] : b[0], [x, y] = mapXY(b[3], b[4]), X = x * MP.s + MP.tx, Y = y * MP.s + MP.ty, tw = g.measureText(t).width, bb = { x: X - tw / 2 - 3 * r, y: Y - 8 * r, w: tw + 6 * r, h: 16 * r };
      if (!inside(bb) || hit(bb)) return; boxes.push(bb); g.globalAlpha = 0.85; txt(t, X - tw / 2, Y, b[7] ? '#1f4f7a' : '#5a4524', 2.5, 'rgba(255,255,255,.55)'); g.globalAlpha = 1; });
    mapRouteDraw(g, r); // Routen liegen unter Markern und Namen
    // übrige Orte („alle Orte“): kleine Punkte in der Farbe der frühesten Epoche
    const colc = {}, col1 = i => { const k = mapPm(i); return colc[k] || (colc[k] = mapCols(i)[0] || MPCOL.B); };
    g.globalAlpha = 0.72; MP.lay.forEach(o => { if (o.chap || o.x < -4 || o.y < -4 || o.x > w + 4 || o.y > h + 4) return; g.beginPath(); g.arc(o.x, o.y, 2.6 * r, 0, 7); g.fillStyle = col1(o.i); g.fill(); }); g.globalAlpha = 1;
    chap.filter(o => o.spread).forEach(o => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5 * r; g.beginPath(); g.moveTo(o.cx, o.cy); g.lineTo(o.x, o.y); g.stroke(); });
    // Marker: Kreis (Ort), Dreieck (Berg), Pfeil (außerhalb der Karte); unsichere Zuordnung als hohler Ring; mehrere Epochen als mehrfarbiger Ring
    const marker = (o, on) => {
      const p = BM.places[o.i], cols = on ? ['#ffcc00'] : mapCols(o.i), col = cols[0] || MPCOL.B, unc = !on && mapConf(p) < 500, R = on ? 8 * r : R0;
      const shape = () => { g.beginPath();
        if (o.off != null) { const a = o.off, q = k => [o.x + Math.cos(a + k) * R * 1.5, o.y + Math.sin(a + k) * R * 1.5]; g.moveTo(...q(0)); g.lineTo(...q(2.5)); g.lineTo(...q(-2.5)); g.closePath(); }
        else if (MTRI.test(p[1])) { g.moveTo(o.x, o.y - R * 1.2); g.lineTo(o.x + R * 1.1, o.y + R * 0.8); g.lineTo(o.x - R * 1.1, o.y + R * 0.8); g.closePath(); }
        else g.arc(o.x, o.y, R, 0, 7); };
      if (cols.length > 1 && !MP.dense && !unc && o.off == null && !MTRI.test(p[1])) { // Ort kommt in mehreren Epochen vor
        g.beginPath(); g.arc(o.x, o.y, R + 3.6 * r, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.6 * r;
        cols.forEach((c, k) => { g.beginPath(); g.arc(o.x, o.y, R + 1.6 * r, -Math.PI / 2 + k * 2 * Math.PI / cols.length, -Math.PI / 2 + (k + 1) * 2 * Math.PI / cols.length); g.strokeStyle = c; g.stroke(); });
        g.beginPath(); g.arc(o.x, o.y, R - 0.6 * r, 0, 7); g.fillStyle = col; g.fill(); return; }
      shape(); g.fillStyle = unc ? 'rgba(255,255,255,.82)' : col; g.fill(); g.lineWidth = (unc ? 2.4 : MP.dense && !on ? 1.3 : 2) * r; g.strokeStyle = unc ? col : '#fff'; g.stroke();
      if (on) { g.beginPath(); g.arc(o.x, o.y, R + 1.8 * r, 0, 7); g.lineWidth = 1.2 * r; g.strokeStyle = '#222'; g.stroke(); }
    };
    chap.forEach(o => { if (o.bub || o.area || o.i === MP.sel) return; g.globalAlpha = fade(o) ? 0.3 : 1; marker(o, false); }); g.globalAlpha = 1;
    chap.forEach(o => { if (!o.bub) return; const R = (10 + Math.min(5, o.bub.length / 8)) * r, t = String(o.bub.length); o.R = R; g.beginPath(); g.arc(o.x, o.y, R, 0, 7); g.fillStyle = 'rgba(255,255,255,.94)'; g.fill(); g.lineWidth = 2.4 * r; g.strokeStyle = col1(o.i); g.stroke();
      g.font = `700 ${11 * r}px ${FONT}`; g.fillStyle = '#222'; g.fillText(t, o.x - g.measureText(t).width / 2, o.y + 0.5 * r); });
    if (MP.sel >= 0) { // andere mögliche Lagen des gewählten Ortes (unter 5 % nur in der Liste)
      const me = so, al = BM.places[MP.sel][6] || []; g.font = `${11 * r}px ${FONT}`;
      al.forEach((a, k) => { if (k === 0 || (a[3] < 50 && k !== MP.alt)) return; const [x0, y0] = mapXY(a[1], a[2]), X = x0 * MP.s + MP.tx, Y = y0 * MP.s + MP.ty, on = k === MP.alt, R = (5 + a[3] / 1000 * 5) * r;
        if (me && Math.hypot(X - me.x, Y - me.y) < 3 * r && !on) return; // liegt auf dem Ort selbst
        if (me) { g.save(); g.setLineDash([4 * r, 3 * r]); g.strokeStyle = 'rgba(30,30,30,.7)'; g.lineWidth = 1.2 * r; g.beginPath(); g.moveTo(me.x, me.y); g.lineTo(X, Y); g.stroke(); g.restore(); }
        g.beginPath(); g.arc(X, Y, R, 0, 7); g.fillStyle = on ? '#ffcc00' : 'rgba(255,255,255,.55)'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#222'; g.stroke();
        const t = a[0] + ' · ' + Math.round(a[3] / 10) + ' %', bb = spot({ x: X, y: Y }, g.measureText(t).width, 14 * r, R + 4 * r, on); if (bb) { boxes.push(bb); txt(t, bb.x + 2 * r, bb.y + 7 * r, '#222', 3); } });
    }
    // Namen der Kapitelorte, die wichtigsten (meiste Stellen) zuerst; was nirgends Platz findet, bleibt ohne Namen (Hover/Klick zeigt ihn)
    g.font = `${12 * r}px ${FONT}`;
    chap.filter(o => !o.bub && !o.area && o.i !== MP.sel).sort((a, b) => fade(a) - fade(b) || b.n - a.n).forEach(o => {
      const name = BM.places[o.i][0], bb = spot(o, g.measureText(name).width, 14 * r, R0 + 4 * r); if (!bb) return; boxes.push(bb); g.globalAlpha = fade(o) ? 0.45 : 1; txt(name, bb.x + 2 * r, bb.y + 7 * r, '#222'); g.globalAlpha = 1; });
    g.font = areaFont; chap.forEach(o => { if (!o.area) return; g.globalAlpha = fade(o) ? 0.35 : mapConf(BM.places[o.i]) < 500 ? 0.7 : 1; txt(o.name, o.lb.x + 3 * r, o.y, col1(o.i), 3.5); g.globalAlpha = 1; });
    // übrige Orte: die meistgenannten beschriften, soweit Platz ist
    if (host.$('#mapAll').checked) { let left = chap.length ? 24 : 45, tries = 0; const rest = MP.lay.filter(o => !o.chap && o.i !== MP.sel && o.x > 0 && o.y > 0 && o.x < w && o.y < h).sort((a, b) => b.n - a.n);
      for (const o of rest) { if (!left || ++tries > 260) break; const p = BM.places[o.i]; g.font = `${MAREA.test(p[1]) ? 'italic ' : ''}${10.5 * r}px ${FONT}`; const bb = spot(o, g.measureText(p[0]).width, 12 * r, 5 * r); if (!bb) continue; boxes.push(bb); left--; txt(p[0], bb.x + 2 * r, bb.y + 6 * r, '#333', 2.6, 'rgba(255,255,255,.8)'); } }
    mapBackLabels(g, r, w, h, { boxes, hit, inside, shown }); g.textAlign = 'start'; g.textBaseline = 'middle';
    if (so) { marker(so, true); g.font = `700 ${13 * r}px ${FONT}`; txt(so.name, so.lb.x + 2 * r, so.lb.y + 8 * r, '#111', 4.5, 'rgba(255,255,255,.96)'); }
    try { const noted = new Set(host.notesAll.filter(n => n.place).map(n => n.place)); if (noted.size) { g.font = `${12 * r}px -apple-system, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; MP.lay.forEach(o => { if (!o.bub && noted.has(BM.places[o.i][0])) { g.lineWidth = 3 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText('✎', o.x + 5 * r, o.y - 5 * r); g.fillStyle = '#b8570a'; g.fillText('✎', o.x + 5 * r, o.y - 5 * r); } }); g.textBaseline = 'middle'; } } catch { /* Notizen noch nicht geladen */ }
    if (MP.hov >= 0 && MP.hov !== MP.sel) { const o = MP.lay.find(q => q.i === MP.hov && !q.bub) || MP.lay.find(q => q.bub && q.bub.includes(MP.hov)); // Ort unter dem Mauszeiger bzw. dessen Chip in der Liste
      if (o) { const R = o.area ? 0 : (o.bub ? o.R : o.chap ? R0 : 2.6 * r) + 4 * r; g.beginPath(); if (o.area) g.rect(o.lb.x, o.lb.y, o.lb.w, o.lb.h); else g.arc(o.x, o.y, R, 0, 7); g.lineWidth = 4 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); g.lineWidth = 1.6 * r; g.strokeStyle = '#222'; g.stroke(); } }
    mapRulDraw(g, r);
    sbar.draw(g);
  }
  // Maßstabsbalken unten rechts (runde Länge, höchstens etwa 110 Bildschirmpixel)
  function mapScale(w, h, r) {
    const kpp = 111.2 / (BM.ppd * MP.s), max = 110 * r * kpp, e = Math.pow(10, Math.floor(Math.log10(max))), L = [5, 2, 1].map(m => m * e).find(v => v <= max), px = L / kpp, x1 = w - 12 * r, x0 = x1 - px, y = h - 11 * r;
    const t = L >= 1 ? L.toLocaleString(I18N.lang === 'de' ? 'de-DE' : 'en-US') + ' km' : Math.round(L * 1000) + ' m';
    return { box: { x: x0 - 8 * r, y: y - 20 * r, w: px + 20 * r, h: 31 * r }, draw: g => { g.save(); g.lineCap = 'butt'; g.lineJoin = 'miter'; const path = () => { g.beginPath(); g.moveTo(x0, y - 5 * r); g.lineTo(x0, y); g.lineTo(x1, y); g.lineTo(x1, y - 5 * r); };
      path(); g.lineWidth = 4.5 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); path(); g.lineWidth = 1.8 * r; g.strokeStyle = '#222'; g.stroke();
      g.font = `600 ${11 * r}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(t, (x0 + x1) / 2, y - 6 * r); g.fillStyle = '#222'; g.fillText(t, (x0 + x1) / 2, y - 6 * r); g.restore(); } };
  }
  // Entfernungsmessung: Klicks setzen Punkte (rasten auf Orte ein), Luftlinie in km
  // Höhenraster (map/elev.js, zlib+Base64) wird beim ersten Öffnen der Karte entpackt
  let ELV = null;
  async function mapElevLoad() {
    if (ELV !== null || !window.BELEV) return; ELV = false;
    try { const E = window.BELEV, bin = Uint8Array.from(atob(E.z), c => c.charCodeAt(0)), ds = new DecompressionStream('deflate'); const buf = await new Response(new Blob([bin]).stream().pipeThrough(ds)).arrayBuffer(); ELV = { E, a: new Uint8Array(buf) }; if (!host.$('#mapPanel').hidden) { mapInfo(); mapRulInfo(); } } catch { ELV = false; }
  }
  function mapElev(lon, lat) { // Höhe in m (bilinear), null wenn nicht geladen/außerhalb
    if (!ELV) return null;
    const { E, a } = ELV, x = (lon - E.W0) * E.ppd - 0.5, y = (E.N0 - lat) * E.ppd - 0.5; if (x < 0 || y < 0 || x >= E.w - 1 || y >= E.h - 1) return null;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, g = (i, j) => a[(y0 + j) * E.w + x0 + i];
    const v = g(0, 0) * (1 - fx) * (1 - fy) + g(1, 0) * fx * (1 - fy) + g(0, 1) * (1 - fx) * fy + g(1, 1) * fx * fy; return Math.round(v * E.step + E.off);
  }
  const mapM = m => m === null ? '' : (m < 0 ? '−' : '') + Math.abs(m).toLocaleString(I18N.lang === 'de' ? 'de-DE' : 'en-US') + ' m';
  const mapLL = (x, y) => [BM.W0 + x / (BM.ppd * BM.k), BM.N0 - y / BM.ppd];
  function mapKm(a, b) { const R = 6371, t = Math.PI / 180, dl = (b[1] - a[1]) * t, dn = (b[0] - a[0]) * t, s = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
  function mapRulDraw(g, r) {
    const R = MP.rul; if (!R || !R.pts.length) return; const sc = p => { const [x, y] = mapXY(p[0], p[1]); return [x * MP.s + MP.tx, y * MP.s + MP.ty]; };
    const P = R.pts.map(sc); g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const line = (pts, dash) => { g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.setLineDash(dash); g.stroke(); };
    g.lineWidth = 5 * r; g.strokeStyle = 'rgba(255,255,255,.9)'; if (P.length > 1) line(P, []);
    g.lineWidth = 2.5 * r; g.strokeStyle = '#1f4fd8'; if (P.length > 1) line(P, [7 * r, 4 * r]);
    if (R.cur) { const q = [R.cur[0], R.cur[1]], a = P[P.length - 1]; g.lineWidth = 2 * r; g.strokeStyle = 'rgba(31,79,216,.6)'; line([a, q], [3 * r, 4 * r]); const km = mapKm(R.pts[R.pts.length - 1], mapLL((q[0] - MP.tx) / MP.s, (q[1] - MP.ty) / MP.s)); g.setLineDash([]); g.font = `600 ${12 * r}px -apple-system, sans-serif`; const tx = Math.round(km) + ' km'; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(tx, q[0] + 10 * r, q[1] - 8 * r); g.fillStyle = '#1f4fd8'; g.fillText(tx, q[0] + 10 * r, q[1] - 8 * r); }
    g.setLineDash([]); g.font = `600 ${12 * r}px -apple-system, sans-serif`;
    const many = P.length > 12;
    for (let k = 1; !many && k < P.length; k++) { const km = Math.round(mapKm(R.pts[k - 1], R.pts[k])) + ' km', mx = (P[k - 1][0] + P[k][0]) / 2, my = (P[k - 1][1] + P[k][1]) / 2; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(km, mx + 4 * r, my - 5 * r); g.fillStyle = '#1f4fd8'; g.fillText(km, mx + 4 * r, my - 5 * r); }
    P.forEach((q, k) => { if (many && k && k < P.length - 1) return; g.beginPath(); g.arc(q[0], q[1], 5 * r, 0, 7); g.fillStyle = k ? '#fff' : '#1f4fd8'; g.fill(); g.lineWidth = 2.5 * r; g.strokeStyle = '#1f4fd8'; g.stroke(); });
    if (R.hov) { const q = sc([R.hov.lon, R.hov.lat]); g.beginPath(); g.arc(q[0], q[1], 7 * r, 0, 7); g.fillStyle = 'rgba(31,79,216,.3)'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#1f4fd8'; g.stroke(); }
    g.restore();
  }
  function mapProfile(pts) { // Stützpunkte alle ~2 km entlang der Linie
    const out = []; let km = 0;
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], L = mapKm(a, b), n = Math.max(1, Math.min(400, Math.ceil(L / 2)));
      for (let s = k === 1 ? 0 : 1; s <= n; s++) { const t = s / n, lon = a[0] + (b[0] - a[0]) * t, lat = a[1] + (b[1] - a[1]) * t; out.push({ km: km + L * t, lon, lat, e: mapElev(lon, lat) }); } km += L; }
    return out;
  }
  function mapProfDraw(hov) {
    const R = MP.rul, cv = host.$('#mapRulProf'); if (!R || !cv || !R.prof) return; const d = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * d; cv.height = H * d; const g = cv.getContext('2d'); g.scale(d, d);
    const P = R.prof.filter(p => p.e !== null); if (P.length < 2) return; const tot = R.prof[R.prof.length - 1].km || 1; let lo = Math.min(...P.map(p => p.e)), hi = Math.max(...P.map(p => p.e)); lo = Math.min(lo, 0); hi = Math.max(hi, lo + 100); const padL = 34, padB = 12, X = km => padL + (km / tot) * (W - padL - 4), Y = e => 4 + (1 - (e - lo) / (hi - lo)) * (H - 4 - padB);
    g.fillStyle = '#9db8d6'; g.fillRect(padL, Y(0), W - padL - 4, H - padB - Y(0) + 0.5); // unter dem Meeresspiegel
    g.beginPath(); g.moveTo(X(P[0].km), Y(lo)); P.forEach(p => g.lineTo(X(p.km), Y(p.e))); g.lineTo(X(P[P.length - 1].km), Y(lo)); g.closePath(); g.fillStyle = 'rgba(150,120,70,.55)'; g.fill();
    g.beginPath(); P.forEach((p, k) => k ? g.lineTo(X(p.km), Y(p.e)) : g.moveTo(X(p.km), Y(p.e))); g.lineWidth = 1.5; g.strokeStyle = '#6b4a1e'; g.stroke();
    g.font = '10px -apple-system, sans-serif'; g.fillStyle = '#444'; g.textAlign = 'right'; g.fillText(Math.round(hi) + '', padL - 3, 10); g.fillText(Math.round(lo) + '', padL - 3, H - padB); if (lo < 0 && hi > 0) g.fillText('0', padL - 3, Y(0) + 3);
    g.textAlign = 'left'; g.fillText('0', padL, H - 1); g.textAlign = 'right'; g.fillText(Math.round(tot) + ' km', W - 4, H - 1);
    R.hov = null; if (hov !== undefined && hov !== null) { const p = R.prof[hov]; if (p && p.e !== null) { R.hov = p; g.strokeStyle = '#1f4fd8'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(p.km), 2); g.lineTo(X(p.km), H - padB); g.stroke(); g.beginPath(); g.arc(X(p.km), Y(p.e), 3, 0, 7); g.fillStyle = '#1f4fd8'; g.fill(); const t = Math.round(p.km) + ' km · ' + mapM(p.e); g.textAlign = X(p.km) > W / 2 ? 'right' : 'left'; g.fillStyle = '#1f4fd8'; g.fillText(t, X(p.km) + (X(p.km) > W / 2 ? -4 : 4), 11); } }
    R.profX = X;
  }
  function mapRulInfo() {
    const R = MP.rul, b = host.$('#mapRuler'); if (!R || !R.on) { b.hidden = true; return; } b.hidden = false; const t = I18N.t.bind(I18N); let tot = 0, rows = '';
    for (let k = 1; k < R.pts.length; k++) { const km = mapKm(R.pts[k - 1], R.pts[k]); tot += km; if (R.pts.length <= 12) rows += `<div>${host.esc(R.pts[k - 1][2] || t('Punkt') + ' ' + k)} → ${host.esc(R.pts[k][2] || t('Punkt') + ' ' + (k + 1))}: <b>${Math.round(km)} km</b></div>`; }
    b.innerHTML = R.pts.length < 2 ? `<div class="rh">${host.esc(t('Entfernung messen'))}</div><div class="rs">${host.esc(t('Klicke Orte oder Punkte auf der Karte an. Esc beendet.'))}</div>`
      : `<div class="rh">${host.esc(t('Luftlinie'))}: <b>${Math.round(tot)} km</b></div>${rows}<div class="rs">≈ ${(tot / 30).toFixed(1)} ${host.esc(t('Tagesreisen zu Fuß (je 30 km, grob; echte Wege sind länger)'))}</div>`;
    R.prof = null;
    if (R.pts.length >= 2 && ELV) { R.prof = mapProfile(R.pts); const P = R.prof.filter(p => p.e !== null); if (P.length > 1) { let up = 0, dn = 0, ref = P[0].e; P.forEach(p => { if (p.e - ref > 30) { up += p.e - ref; ref = p.e; } else if (ref - p.e > 30) { dn += ref - p.e; ref = p.e; } });
        b.innerHTML += `<canvas id="mapRulProf"></canvas><div class="rs">${host.esc(t('Höhenprofil'))}: ↑ ${Math.round(up)} m · ↓ ${Math.round(dn)} m · ${host.esc(t('höchster Punkt'))} ${mapM(Math.max(...P.map(p => p.e)))} · ${host.esc(t('tiefster Punkt'))} ${mapM(Math.min(...P.map(p => p.e)))}</div>`; } }
    b.innerHTML += `<div class="rb"><button data-x="undo">${host.esc(t('Letzter Punkt zurück'))}</button><button data-x="clr">${host.esc(t('Neu'))}</button></div>`;
    if (R.prof) mapProfDraw(null);
  }
  function mapRulToggle(on) { if (on) mapElevLoad(); if (on === undefined) on = !(MP.rul && MP.rul.on); MP.rul = on ? { on: true, pts: [], cur: null } : null; host.$('#mapRulB').classList.toggle('on', on); host.$('#mapCv').style.cursor = on ? 'crosshair' : ''; mapRulInfo(); mapDraw(); }
  function mapPickO(ev) { // Objekte des Layouts unter dem Mauszeiger (nächstes zuerst); Flächennamen zählen mit ihrem ganzen Schriftzug
    const cv = host.$('#mapCv'), b = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1, mx = (ev.clientX - b.left) * d, my = (ev.clientY - b.top) * d; const out = [];
    MP.lay.forEach(o => { let dd = Math.hypot(o.x - mx, o.y - my); if (o.area && o.lb && mx >= o.lb.x && mx <= o.lb.x + o.lb.w && my >= o.lb.y && my <= o.lb.y + o.lb.h) dd = Math.min(dd, 6 * d); if (dd < (o.bub ? 15 : 11) * d) out.push([dd - (o.chap ? 4 * d : 0), o]); });
    out.sort((a, b2) => a[0] - b2[0] || (b2[1].n || 0) - (a[1].n || 0)); return out.map(o => o[1]); // bei gleichem Abstand der häufiger genannte Ort
  }
  function mapPick(ev, all) { const l = mapPickO(ev).filter(o => !o.bub).map(o => o.i); return all ? l : (l.length ? l[0] : -1); }
  // Zählblase: auf ihre Orte hineinzoomen; liegen sie (fast) auf demselben Punkt, die Orte stattdessen in der Liste zeigen
  function mapBubble(o) {
    const pl = o.bub.map(i => BM.places[i]).filter(mapInMap), s0 = MP.s, tx = MP.tx, ty = MP.ty, ext = pl.length ? Math.max(Math.max(...pl.map(p => p[2])) - Math.min(...pl.map(p => p[2])), Math.max(...pl.map(p => p[3])) - Math.min(...pl.map(p => p[3]))) : 0;
    MP.sel = -1; MP.grp = null;
    if (ext > 0.0015) mapFitPts(pl.map(mapPx), Math.min(s0 * 5, pl.every(p => mapNearJer(p[2], p[3])) ? 3000 : MAPZ)); // schrittweise hinein, damit der Zusammenhang sichtbar bleibt
    if (ext <= 0.0015 || MP.s < s0 * 1.15) { MP.s = s0; MP.tx = tx; MP.ty = ty; MP.grp = o.bub.slice(); }
    mapDraw(); mapInfo();
  }
  const mapRefLink = (bi, c, v, ref) => { const t = BM.books[bi]; if (ref) return `<a data-ref="${host.esc(ref)}">${host.esc(ref.slice(t.length).replace(/^[ ,]+/, '') || ref)}</a>`; if (BM.j3 && BM.j3.has(bi)) return c ? `<a data-ref="${host.esc(t + ' ' + Math.floor(c / 1000) + ':' + (c % 1000))}">${Math.floor(c / 1000)}.${c % 1000}</a>` : `<a data-ref="${host.esc(t + ', Preface')}">${host.esc(I18N.t('Vorwort'))}</a>`; return `<a data-ref="${host.esc(t + ' ' + c + (v ? ':' + v : ''))}">${host.esc(c + (v ? ':' + v : ''))}</a>`; };
  const mapName = (i, no) => { const p = BM.places[i], he = mapHe(p); return host.esc(p[0]) + (no ? `<sup>${no}</sup>` : '') + (he ? ` <span class="he" dir="rtl">${host.esc(he)}</span>` : (p[7] && p[7].g ? ` <span class="he" lang="grc">${host.esc(p[7].g)}</span>` : '')); };
  // Routen (UBS MARBLE, CC BY-SA 4.0): ausgewählte Route wird als Linie gezeichnet
  const BR = window.BROUTES || [];
  const TANAKH_ORD = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']; // Rückfallebene, falls ein Buch nicht in der Bibliothek ist
  const mapRouteTitle = r => I18N.lang === 'de' ? r.de : r.en;
  const mapLen = ln => { let s = 0; for (let k = 1; k < ln.length; k++) s += mapKm(ln[k - 1], ln[k]); return s; };
  function mapRouteFill() {
    const sel = host.$('#mapRoute'), keep = MP.route ? MP.route.id : ''; let h = `<option value="">${host.esc(I18N.t('Routen …'))}</option>`, cur = null;
    const chNow = host.auChapter(), bk = r => r.ref.replace(/ \d.*$/, ''), hb = host.view && host.view.group ? host.view.group.title : '', ord = BR.map((r, i) => [r, i]).sort((a, b) => { try { return ((bk(a[0]) === hb ? 0 : 1) - (bk(b[0]) === hb ? 0 : 1)) || host.libCmpGroups(host.groups.find(g => g.title === bk(a[0])) || null, host.groups.find(g => g.title === bk(b[0])) || null) || (TANAKH_ORD.indexOf(bk(a[0])) - TANAKH_ORD.indexOf(bk(b[0]))) || a[1] - b[1]; } catch { return a[1] - b[1]; } }).map(x => x[0]); // das gerade gelesene Buch zuerst, sonst gleiche Reihenfolge wie die Bücher in der Bibliothek
    ord.forEach(r => { const b = bk(r); if (b !== cur) { if (cur) h += '</optgroup>'; h += `<optgroup label="${host.esc(b)}">`; cur = b; } const mm = r.ref.match(/^(.*) (\d+):/), here = mm && host.view && host.view.group && mm[1] === host.view.group.title && +mm[2] === chNow; h += `<option value="${host.esc(r.id)}">${here ? '● ' : ''}${host.esc(mapRouteTitle(r))} · ${host.esc(mm ? mm[1] + ' ' + mm[2] : r.ref)}</option>`; });
    sel.innerHTML = h + '</optgroup>'; sel.value = keep;
  }
  function mapRouteSet(id) {
    if (MP.rul && MP.rul.fromRoute) mapRulToggle(false);
    MP.route = BR.find(r => r.id === id) || null; host.$('#mapRoute').value = MP.route ? MP.route.id : ''; MP.sel = -1;
    if (MP.route) { const pts = MP.route.lines.flat().map(c => mapXY(c[0], c[1])), { w, h } = mapSize(); const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1])), pad = 60; MP.s = Math.min(Math.max(Math.min(w / (x1 - x0 + 2 * pad), h / (y1 - y0 + 2 * pad)), Math.min(w / BM.w, h / BM.h)), 3); MP.tx = w / 2 - (x0 + x1) / 2 * MP.s; MP.ty = h / 2 - (y0 + y1) / 2 * MP.s; }
    mapDraw(); mapInfo();
  }
  function mapRouteDraw(g, r) {
    const R = MP.route; if (!R) return; g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    R.lines.forEach((ln, li) => { const P = ln.map(c => { const [x, y] = mapXY(c[0], c[1]); return [x * MP.s + MP.tx, y * MP.s + MP.ty]; }), hv = MP.rhov === li; g.globalAlpha = MP.rhov != null && !hv ? 0.3 : 1; // Hover über einem Linien-Chip hebt die Linie hervor
      const path = () => { g.beginPath(); P.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); };
      path(); g.lineWidth = (hv ? 8 : 6) * r; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(); path(); g.lineWidth = (hv ? 4.5 : 3) * r; g.strokeStyle = '#a4161a'; g.stroke();
      let acc = 0; for (let k = 1; k < P.length; k++) { const dx = P[k][0] - P[k - 1][0], dy = P[k][1] - P[k - 1][1], L = Math.hypot(dx, dy); acc += L; if (acc > 90 * r && L > 0) { acc = 0; const a = Math.atan2(dy, dx), cx = P[k][0], cy = P[k][1]; g.beginPath(); g.moveTo(cx + Math.cos(a) * 5 * r, cy + Math.sin(a) * 5 * r); g.lineTo(cx + Math.cos(a + 2.5) * 5 * r, cy + Math.sin(a + 2.5) * 5 * r); g.lineTo(cx + Math.cos(a - 2.5) * 5 * r, cy + Math.sin(a - 2.5) * 5 * r); g.closePath(); g.fillStyle = '#a4161a'; g.fill(); g.lineWidth = 1 * r; g.strokeStyle = '#fff'; g.stroke(); } }
      const s = P[0], e = P[P.length - 1]; g.beginPath(); g.arc(s[0], s[1], 5 * r, 0, 7); g.fillStyle = '#2e7d32'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#fff'; g.stroke(); g.beginPath(); g.arc(e[0], e[1], 5 * r, 0, 7); g.fillStyle = '#222'; g.fill(); g.stroke();
      if (R.lines.length > 1) { const t = String(li + 1); g.beginPath(); g.arc(s[0], s[1], 7.5 * r, 0, 7); g.fillStyle = '#2e7d32'; g.fill(); g.lineWidth = 2 * r; g.strokeStyle = '#fff'; g.stroke(); g.font = `700 ${10 * r}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(t, s[0], s[1] + 0.5 * r); g.textAlign = 'start'; } }); // Nummer am Anfang, passend zu den Chips „📏 1 · 58 km“
    g.restore();
  }
  function mapRoutesHere() { // Routen, deren Anfangsstelle im gerade gelesenen Kapitel liegt
    if (!host.view || !host.view.group) return []; const ch = host.auChapter(); if (ch == null) return [];
    return BR.filter(r => { const m = r.ref.match(/^(.*) (\d+):/); return m && m[1] === host.view.group.title && +m[2] === ch; });
  }
  function mapRouteBox() {
    const R = MP.route, t = I18N.t.bind(I18N); let h = '';
    if (R) { const tot = R.lines.map(mapLen); h += `<div class="rt"><h4>${host.esc(mapRouteTitle(R))}${I18N.lang === 'de' ? '' : ''} <span class="chip" data-rt="">✕ ${host.esc(t('Route ausblenden'))}</span></h4><div class="sub">${mapRefLinkTxt(R.ref)} · ${R.lines.length} ${host.esc(t(R.lines.length > 1 ? 'Linien' : 'Linie'))} · ≈ ${Math.round(tot.reduce((a, b) => a + b, 0))} km (${host.esc(t('Luftlinie'))})<br>${R.lines.map((l, k) => `<span class="chip" data-rl="${k}" title="${host.esc(t('Als Messung übernehmen (Länge, Höhenprofil)'))}">📏 ${k + 1} · ${Math.round(tot[k])} km</span>`).join(' ')}</div><div class="sub rcred">${host.esc(t('Routen: UBS MARBLE / Leen Ritmeyer (CC BY-SA 4.0). Bibelstelle von Safran zugeordnet, ungefähr.'))}</div></div>`; }
    const here = mapRoutesHere().filter(r => !R || r.id !== R.id);
    if (here.length) h += `<div class="sub">${host.esc(t('Routen in diesem Kapitel'))}: ${here.map(r => `<span class="chip" data-rt="${host.esc(r.id)}">🧭 ${host.esc(mapRouteTitle(r))}</span>`).join(' ')}</div>`;
    return h;
  }
  const mapRefLinkTxt = ref => `<a data-ref="${host.esc(ref)}">${host.esc(ref)}</a>`;
  function mapInfo() { MP.rhov = null; mapInfo0(); if (MP.sel < 0) host.$('#mapInfo').insertAdjacentHTML('afterbegin', mapRouteBox()); }
  // Zahl der Orte je Epoche in der aktuellen Ansicht auf den Epochen-Knöpfen (die Knöpfe sind zugleich die Farblegende)
  function mapPerCounts() {
    const n = [0, 0, 0, 0], add = i => { const m = mapPm(i); for (let k = 0; k < 4; k++) if (m >> k & 1) n[k]++; };
    if (host.$('#mapAll').checked) BM.places.forEach((p, i) => add(i)); else MP.cur.forEach(c => add(c.i));
    host.$$('#mapPer button').forEach(b => { const s = b.querySelector('.n'); if (s) s.textContent = n[MPORD.indexOf(b.dataset.p)] || ''; });
  }
  const mapVn = c => { let v = 0; (c.vs || []).forEach(x => { if (x > 0 && (!v || x < v)) v = x; }); return v; }; // erste Stelle (Vers/Abschnitt) im Kapitel
  // „another name for X“, „within 2 km of X“ … (OpenBible) auf Deutsch bzw. in der Oberflächensprache
  const mapLoc = s => { s = String(s || '?'); let m; if ((m = /^another name for (.+)$/.exec(s))) return I18N.t('anderer Name für {}', m[1]); if ((m = /^within (\d+) km of (.+)$/.exec(s))) return I18N.t('im Umkreis von {#} km um {}', m[1], m[2]); if ((m = /^about (\d+) km around (.+)$/.exec(s))) return I18N.t('etwa {#} km rund um {}', m[1], m[2]); return s; };
  function mapInfo0() {
    const el = host.$('#mapInfo'), here = host.view && host.view.group ? host.view.group.title : '', t = I18N.t.bind(I18N);
    mapPerCounts();
    if (MP.sel < 0) {
      const cur = mapCur(), hid = MP.cur.length - cur.length; let list = MP.grp ? cur.filter(c => MP.grp.includes(c.i)) : cur.slice(); if (MP.grp && !list.length) { MP.grp = null; list = cur.slice(); }
      if (!MP.cur.length) { el.innerHTML = `<div class="sub">${host.esc(t('Zu diesem Kapitel sind keine Orte verzeichnet. „Alle Orte“ zeigt die ganze Karte.'))}</div>`; return; }
      const occ = MP.sort === 'occ' && list.some(c => mapVn(c)), nm = c => BM.places[c.i][0];
      list.sort((a, b) => (occ ? (mapVn(a) || 1e9) - (mapVn(b) || 1e9) : 0) || nm(a).localeCompare(nm(b)) || a.i - b.i);
      const cnt = new Map(), no = new Map(); cur.forEach(c => cnt.set(nm(c), (cnt.get(nm(c)) || 0) + 1)); cur.slice().sort((a, b) => a.i - b.i).forEach(c => { if (cnt.get(nm(c)) > 1) { const k = (no.get('#' + nm(c)) || 0) + 1; no.set('#' + nm(c), k); no.set(c.i, k); } }); // gleichnamige Orte: ¹ ² …
      const chip = c => { const p = BM.places[c.i], v = mapVn(c); return `<span class="chip${MP.vsel && !MP.vsel.has(c.i) ? ' dim' : ''}" data-i="${c.i}" data-k="${host.esc((p[0] + ' ' + mapHe(p) + ' ' + (p[9] || '')).toLowerCase())}">${mapName(c.i, no.get(c.i))}${v ? `<span class="vn">${v}</span>` : ''}</span>`; };
      const head = MP.grp ? `${list.length} ${host.esc(t('Orte an dieser Stelle'))} · <span class="chip" data-i="-3">← ${host.esc(t('alle Orte des Kapitels'))}</span>`
        : MP.over ? host.esc(t('Orte dieses Abschnitts')) + ': ' + host.esc(MP.over.label) + ' · <span class="chip" data-i="-2">← ' + host.esc(t('Kapitel')) + '</span>' : host.esc(t('Orte in diesem Kapitel')) + ' (' + cur.length + ')';
      el.innerHTML = `<div class="sub">${head}${hid ? ` · ${hid} ${host.esc(t('durch den Epochenfilter ausgeblendet'))}` : ''}` +
        (MP.vsel ? ` · <span class="chip on" data-i="-4" title="${host.esc(t('Hervorhebung aufheben'))}">${host.esc(t('Vers'))} ${MP.vnum}: ${MP.vsel.size} ✕</span>` : '') +
        (list.length > 2 && list.some(c => mapVn(c)) ? ` <span class="msort"><span class="chip${occ ? '' : ' on'}" data-sort="az">A–Z</span><span class="chip${occ ? ' on' : ''}" data-sort="occ" title="${host.esc(t('In der Reihenfolge des Textes; die kleine Zahl ist der Vers bzw. Abschnitt der ersten Nennung'))}">${host.esc(t('nach Vorkommen'))}</span></span>` : '') + '</div>' +
        (list.length > 40 ? `<input id="mapFlt" type="search" placeholder="Orte filtern …" autocomplete="off">` : '') +
        `<div class="chips">${list.map(chip).join('')}</div>`;
      return;
    }
    const p = BM.places[MP.sel], n = MPER.size === 4 ? p[4].length : p[4].filter(mapPerOk).length;
    const me = MP.lay.find(o => o.i === MP.sel), nb = me ? MP.lay.filter(o => !o.bub && o.i !== MP.sel && Math.hypot(o.x - me.x, o.y - me.y) < 26 * (window.devicePixelRatio || 1)).slice(0, 8) : [];
    el.innerHTML = `<h4>${mapName(MP.sel)}</h4><div class="sub">${[host.esc(mapTypeT(p[1])), n + ' ' + host.esc(t(n === 1 ? 'Stelle' : 'Stellen')), ELV && mapInMap(p) ? host.esc(t('Höhe')) + ' ≈ ' + mapM(mapElev(...mapLL(...mapPx(p)))) : '', mapInMap(p) ? '' : host.esc(t('liegt außerhalb des Kartenausschnitts'))].filter(Boolean).join(' · ')} · <span class="chip" data-i="-1">← ${host.esc(t('Liste'))}</span></div>` +
      (p[9] ? `<div class="sub">${host.esc(t('Weitere Namen'))}: ${host.esc(p[9])}</div>` : '') +
      (nb.length ? `<div class="sub">${host.esc(t('Daneben'))}: ${nb.map(o => `<span class="chip" data-i="${o.i}">${mapName(o.i)}</span>`).join(' ')}</div>` : '') +
      mapAlts(p) + mapOutRows(MP.sel) + mapNoteRows(p) + mapRefs(p, here);
  }
  // Stellen eines Ortes: nach Epoche und Korpus gegliedert, einklappbar und mit Zählern; das gerade gelesene Werk steht vorn und ist offen
  const MCORP = [['Mischna', /^Mishnah |^Pirkei Avot$/], ['Tosefta', /^Tosefta /], ['Jerusalemer Talmud', /^Jerusalem Talmud /], ['Targumim', /Targum|^Onkelos /], ['Kleine Traktate', /^Tractate |^Avot DeRabbi Natan/], ['Apokryphen', /^Book of /], ['Midraschim', /Rabbah|Midrash|Mekhilta|Sifr|Pesikta|Tanchuma|Seder Olam|Pirkei DeRabbi/]];
  const mapCorp = b => { if (!(BM.alma && BM.alma.has(b))) return BM.nOrig == null || b < BM.nOrig ? 'Tanach' : 'Josephus und Makkabäerbücher'; const c = MCORP.find(x => x[1].test(BM.books[b])); return c ? c[0] : 'Babylonischer Talmud'; };
  const mapRowLinks = (b, l, max) => l.slice(0, max).map(e => mapRefLink(b, e[1], e[2], e[3])).join(' ') + (l.length > max ? ` <a class="more">${host.esc(I18N.t('alle zeigen'))} (+${l.length - max})</a>` : '');
  function mapRefs(p, here) {
    const t = I18N.t.bind(I18N), tree = new Map(), wk = new Set();
    p[4].forEach(e => { if (!mapPerOk(e)) return; let q = mapPerOf(e); if (q === 'O') q = 'S'; const c = mapCorp(e[0]); let P = tree.get(q); if (!P) tree.set(q, P = new Map()); let C = P.get(c); if (!C) P.set(c, C = new Map()); let W = C.get(e[0]); if (!W) C.set(e[0], W = []); W.push(e); wk.add(e[0]); });
    MP.refs = tree;
    const isH = b => BM.books[b] === here, cnt = C => [...C.values()].reduce((s, l) => s + l.length, 0);
    const rows = (q, C) => [...C].sort((a, b) => isH(b[0]) - isH(a[0]) || (BM.alma && BM.alma.has(a[0]) && BM.alma.has(b[0]) ? BM.books[a[0]].localeCompare(BM.books[b[0]]) : a[0] - b[0]))
      .map(([b, l]) => `<div class="vs" data-w="${q}|${b}"><b>${host.esc(BM.books[b])}</b>${l.length > 3 ? ` <span class="n">${l.length}</span>` : ''} <span class="ls">${mapRowLinks(b, l, isH(b) ? 40 : 15)}</span></div>`).join('');
    if (tree.size <= 1 && wk.size <= 6) return [...tree].map(([q, P]) => [...P.values()].map(C => rows(q, C)).join('')).join('');
    return MPORD.filter(q => tree.has(q)).map(q => { const P = tree.get(q), nP = [...P.values()].reduce((s, C) => s + cnt(C), 0), hP = [...P.values()].some(C => [...C.keys()].some(isH));
      const inner = P.size === 1 ? rows(q, [...P.values()][0]) : [...P].sort((a, b) => [...b[1].keys()].some(isH) - [...a[1].keys()].some(isH)).map(([c, C]) => `<details class="cg"${[...C.keys()].some(isH) || cnt(C) <= 40 ? ' open' : ''}><summary>${host.esc(t(c))} <span class="n">${cnt(C)}</span></summary>${rows(q, C)}</details>`).join('');
      return `<details class="pg"${hP || tree.size === 1 || nP <= 40 ? ' open' : ''}><summary><i class="pd" style="background:${MPCOL[q]}"></i>${host.esc(t(MPNAME[q]))} <span class="n">${nP}</span></summary>${inner}</details>`; }).join('');
  }
  // Notizen zu Orten: freie Notizen mit Feld „place“ (= Ortsname), erscheinen auch im Reiter Notizen
  const mapNotesOf = p => { try { return host.notesAll.filter(n => n.place === p[0]); } catch { return []; } };
  function mapNoteRows(p) {
    const ns = mapNotesOf(p); return `<div class="pn"><div class="sub"><b>${host.esc(I18N.t('Notizen'))}</b> <span class="chip pnadd">＋ ${host.esc(I18N.t('Notiz zu diesem Ort'))}</span></div>` + ns.map(n => `<div class="pnote" data-id="${host.esc(n.id)}">${n.title && n.title !== p[0] ? '<b>' + host.esc(n.title) + '</b> ' : ''}${host.esc((n.note || '').slice(0, 200))}</div>`).join('') + '</div>';
  }
  function mapOutRows(i) { // Punkte der Gliederung dieses Buches, in denen der Ort vorkommt
    const g = host.view && host.view.group; if (!g || !BM.books.includes(g.title) || typeof host.olOwnCache === 'undefined') return '';
    const ol = host.olOwnCache.get(g.title); if (ol === undefined) { host.olOwn(g.title).then(() => { if (MP.sel === i) mapInfo(); }).catch(() => {}); return ''; } if (!ol) return '';
    const L = I18N.lang, T = (o, k) => (L !== 'he' && (o[k + '_' + L] || o[k + '_en'])) || o[k], rows = [];
    ol.sections.forEach(sec => sec.items.forEach(it => { if (mapForRef(g.title, it.ref).some(c => c.i === i)) rows.push(`<div class="olr" data-ref="${host.esc(g.title + ' ' + String(it.ref).split(/[-–,]/)[0])}"><span class="rf">${host.esc(String(it.ref).replace('-', '–'))}</span> ${host.esc(T(it, 'text') || '')}</div>`); }));
    return rows.length ? `<div class="sub">${host.esc(I18N.t('In der Gliederung'))}</div><div class="olrs">${rows.slice(0, 12).join('')}</div>` : '';
  }
  function mapAlts(p) {
    if (p[8]) return `<div class="sub">${host.esc(I18N.t('Lage vermutet'))}</div><div class="alts"><div class="muted" style="font-size:12px">${host.esc(I18N.t('Die Quelle kennt hier nur den Stadtmittelpunkt von Jerusalem. Die Lage ist nach Nehemia 3 und der Forschung gesetzt und teils umstritten.'))}</div></div>`;
    const al = p[6] || []; if (!al.length) return '';
    const rows = al.map((a, k) => `<div class="alt${k === MP.alt ? ' on' : ''}" data-a="${k}"><span class="nm" title="${host.esc(mapLoc(a[0]))}">${host.esc(mapLoc(a[0]))}${k === 0 && al.length > 1 ? ' ★' : ''}</span><span class="bar"><i style="width:${Math.min(100, Math.round(a[3] / 10))}%"></i></span><span class="pc">${Math.round(a[3] / 10)} %</span></div>`).join('');
    return `<div class="sub" title="${host.esc(I18N.t('Sicherheit der Zuordnung nach der Forschung des neuesten Jahrzehnts (OpenBible.info)'))}">${host.esc(I18N.t('Mögliche Lage'))}${mapConf(p) < 500 ? ' · ' + host.esc(I18N.t('Zuordnung unsicher')) : ''}</div><div class="alts">${rows}</div>`;
  }
  function mapSelect(i, center) {
    MP.sel = i; MP.alt = -1;
    if (i >= 0 && center && mapInMap(BM.places[i])) { // auf den Ort und seine möglichen Lagen einpassen
      const pl = BM.places[i], { w, h } = mapSize(), pts = [mapPx(pl), ...(pl[6] || []).slice(1).map(a => mapXY(a[1], a[2]))];
      const x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1])), y1 = Math.max(...pts.map(q => q[1]));
      const pad = 110, sx = w / (x1 - x0 + 2 * pad / Math.max(MP.s, 0.5)), sy = h / (y1 - y0 + 2 * pad / Math.max(MP.s, 0.5));
      MP.s = pts.length > 1 ? Math.min(mapNearJer(pl[2], pl[3]) ? 300 : MAPZ, Math.max(Math.min(sx, sy), 1.5)) : Math.max(MP.s, 1.5); if (Math.abs(pl[2] - 35.234) < 0.03 && Math.abs(pl[3] - 31.774) < 0.03 && MP.s < 60) MP.s = 60; /* Jerusalem: so weit hinein, dass Gelände und Wilson-Karte erscheinen */ MP.tx = w / 2 - (x0 + x1) / 2 * MP.s; MP.ty = h / 2 - (y0 + y1) / 2 * MP.s;
    }
    mapDraw(); mapInfo();
  }
  // ===== Jerusalem-Detailkarte: Gelände (Copernicus), Wilson 1865, heutiges OSM, Namen =====
  const JER = { st: 0, rel: null, osm: null, wil: null, meta: null, opt: { wil: 1, osm: 1, rel: 1, lab: 1, op: 80 } };
  try { Object.assign(JER.opt, JSON.parse(localStorage.getItem('jerOpt') || '{}')); } catch { /* egal */ }
  const JER_T = 22, JER_BOX = [35.19, 31.74, 35.28, 31.81]; // ab diesem Zoom setzen die Detailebenen ein; Ausschnitt des Höhenrasters
  const jerInfl = async z => { const bin = Uint8Array.from(atob(z), c => c.charCodeAt(0)); return new Uint8Array(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); };
  const jerScript = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); });
  async function jerLoad() {
    if (JER.st) return; JER.st = 1;
    try {
      await Promise.all([jerScript('map/jer/dem.js'), jerScript('map/jer/osm.js'), jerScript('map/jer/meta.js')]);
      if (window.BJERDEM) JER.rel = await jerRelief(window.BJERDEM);
      if (window.BJEROSM) JER.osm = await jerOsm(window.BJEROSM);
      JER.meta = window.BJERMETA || null;
      if (JER.meta && JER.meta.wil) { const im = new Image(); im.onload = () => { JER.wil = im; mapDraw(); }; im.src = 'map/jer/' + JER.meta.wil.file; }
    } catch { /* ohne Detailebenen weiter */ }
    JER.st = 2; mapDraw();
  }
  // Schummerung + Höhenlinien aus dem 30-m-Raster (geglättet, bikubisch auf das Sechsfache vergrößert)
  async function jerRelief(D) {
    const by = await jerInfl(D.z), u = new Uint16Array(by.buffer, by.byteOffset, by.length >> 1), w = D.w, h = D.h, F = 6, cw = w * F, ch = h * F;
    let e = new Float32Array(w * h); for (let i = 0; i < e.length; i++) e[i] = D.off + u[i] * D.step;
    const K = [0.054, 0.244, 0.403, 0.244, 0.054], blur = (src, dx, dy) => { const o = new Float32Array(src.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0; for (let k = -2; k <= 2; k++) { const xx = Math.min(w - 1, Math.max(0, x + k * dx)), yy = Math.min(h - 1, Math.max(0, y + k * dy)); t += K[k + 2] * src[yy * w + xx]; } o[y * w + x] = t; } return o; };
    e = blur(blur(e, 1, 0), 0, 1);
    const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    const g = (x, y) => e[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    const Z = new Float32Array(cw * ch);
    for (let Y = 0; Y < ch; Y++) { const sy = (Y + 0.5) / F - 0.5, y0 = Math.floor(sy), ty = sy - y0; for (let X = 0; X < cw; X++) { const sx = (X + 0.5) / F - 0.5, x0 = Math.floor(sx), tx = sx - x0; const r = [-1, 0, 1, 2].map(j => cr(g(x0 - 1, y0 + j), g(x0, y0 + j), g(x0 + 1, y0 + j), g(x0 + 2, y0 + j), tx)); Z[Y * cw + X] = cr(r[0], r[1], r[2], r[3], ty); } }
    const mx = (D.E - D.W) / cw * 111320 * Math.cos(31.77 * Math.PI / 180), my = (D.N - D.S) / ch * 110574, zen = 50 * Math.PI / 180, az = 315 * Math.PI / 180, zf = 2.2;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d'), im = c.createImageData(cw, ch), P = im.data, f = Math.round(Math.min(cw, ch) * 0.05);
    for (let Y = 0; Y < ch; Y++) for (let X = 0; X < cw; X++) {
      const x1 = Math.max(0, X - 1), x2 = Math.min(cw - 1, X + 1), y1 = Math.max(0, Y - 1), y2 = Math.min(ch - 1, Y + 1), q = (xx, yy) => Z[yy * cw + xx];
      const dzx = ((q(x2, y1) + 2 * q(x2, Y) + q(x2, y2)) - (q(x1, y1) + 2 * q(x1, Y) + q(x1, y2))) / (8 * mx) * zf, dzy = ((q(x1, y2) + 2 * q(X, y2) + q(x2, y2)) - (q(x1, y1) + 2 * q(X, y1) + q(x2, y1))) / (8 * my) * zf;
      const sl = Math.atan(Math.hypot(dzx, dzy)), as = Math.atan2(dzy, -dzx), hs = Math.max(0, Math.cos(zen) * Math.cos(sl) + Math.sin(zen) * Math.sin(sl) * Math.cos(az - as));
      const z = Z[Y * cw + X], t = Math.min(1, Math.max(0, (z - 420) / 400)), sh = 0.38 + 0.9 * hs;
      let R = (226 + 24 * t) * sh, Gc = (222 + 24 * t) * sh, B = (190 + 36 * t) * sh;
      const zr = Z[Y * cw + Math.min(cw - 1, X + 1)], zb = Z[Math.min(ch - 1, Y + 1) * cw + X]; // Höhenlinien alle 10 m (alle 50 m kräftiger)
      const c10 = Math.floor(z / 10), a10 = c10 !== Math.floor(zr / 10) || c10 !== Math.floor(zb / 10);
      if (a10) { const k = (Math.floor(z / 50) !== Math.floor(Math.min(z, Math.max(zr, zb)) / 50) || Math.floor(Math.max(z, zr, zb) / 50) !== Math.floor(Math.min(z, zr, zb) / 50)) ? 0.34 : 0.14; R = R * (1 - k) + 120 * k; Gc = Gc * (1 - k) + 85 * k; B = B * (1 - k) + 45 * k; }
      const o = (Y * cw + X) * 4, ed = Math.min(1, Math.min(X, Y, cw - 1 - X, ch - 1 - Y) / f); P[o] = R; P[o + 1] = Gc; P[o + 2] = B; P[o + 3] = 255 * ed * ed * (3 - 2 * ed);
    }
    c.putImageData(im, 0, 0); return cv;
  }
  async function jerOsm(D) {
    const j = JSON.parse(new TextDecoder().decode(await jerInfl(D.z))), O = j.o, out = {};
    const dec = (a, c0) => { const n = (a.length - c0) >> 1, x = new Int32Array(n), y = new Int32Array(n); let px = 0, py = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < n; i++) { px += a[c0 + 2 * i]; py += a[c0 + 2 * i + 1]; x[i] = px; y[i] = py; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } return { x, y, b: [x0, y0, x1, y1] }; };
    out.o = O; ['bld', 'wall', 'water', 'cem', 'park'].forEach(k => { out[k] = j[k].map(a => dec(a, 0)); }); out.hw = j.hw.map(a => Object.assign(dec(a, 1), { c: a[0] }));
    return out;
  }
  const jerOn = () => MP.s >= JER_T * 0.6 && JER.st !== 3;
  function jerVisible() { const { w, h } = mapSize(), [x0, y0] = mapXY(JER_BOX[0], JER_BOX[3]), [x1, y1] = mapXY(JER_BOX[2], JER_BOX[1]); return MP.s >= JER_T * 0.6 && x1 * MP.s + MP.tx > 0 && x0 * MP.s + MP.tx < w && y1 * MP.s + MP.ty > 0 && y0 * MP.s + MP.ty < h; }
  function mapJerDraw(g, r, chap) {
    const box = host.$('#mapJer'); const vis = jerVisible(); if (box) box.hidden = !vis; if (!vis) return; if (!JER.st) jerLoad();
    const a = Math.min(1, Math.max(0, (MP.s - JER_T * 0.6) / (JER_T * 0.8))), kx = BM.ppd * BM.k * MP.s, ky = BM.ppd * MP.s, X = lon => (lon - BM.W0) * kx + MP.tx, Y = lat => (BM.N0 - lat) * ky + MP.ty, ppm = ky / 110574, { w, h } = mapSize(), o = JER.opt;
    g.save(); g.globalAlpha = a;
    if (JER.rel && o.rel) { const [W, S, E, N] = JER_BOX; g.imageSmoothingEnabled = true; g.drawImage(JER.rel, X(W), Y(N), X(E) - X(W), Y(S) - Y(N)); }
    const M = JER.meta && JER.meta.wil;
    if (JER.wil && M && o.wil) { const A = M.A, B = M.B; g.save(); g.globalAlpha = a * o.op / 100; g.setTransform(kx * A[1], -ky * B[1], kx * A[2], -ky * B[2], kx * (A[0] - BM.W0) + MP.tx, ky * (BM.N0 - B[0]) + MP.ty); g.imageSmoothingQuality = 'high'; g.drawImage(JER.wil, 0, 0); g.restore(); }
    const S = JER.osm; if (S && o.osm) {
      const ax = kx / S.o[2], bx = (S.o[0] - BM.W0) * kx + MP.tx, ay = -ky / S.o[2], by = (BM.N0 - S.o[1]) * ky + MP.ty, vis = f => { const x0 = ax * f.b[0] + bx, x1 = ax * f.b[2] + bx, y1 = ay * f.b[1] + by, y0 = ay * f.b[3] + by; return x1 > 0 && x0 < w && y1 > 0 && y0 < h; };
      const path = (f, close) => { g.beginPath(); for (let i = 0; i < f.x.length; i++) { const px = ax * f.x[i] + bx, py = ay * f.y[i] + by; if (i) g.lineTo(px, py); else g.moveTo(px, py); } if (close) g.closePath(); };
      g.lineJoin = 'round'; g.lineCap = 'round';
      if (ppm > 0.05) { g.fillStyle = 'rgba(120,160,90,.22)'; S.park.forEach(f => { if (vis(f)) { path(f, true); g.fill(); } }); g.fillStyle = 'rgba(110,110,110,.2)'; S.cem.forEach(f => { if (vis(f)) { path(f, true); g.fill(); } }); }
      const ov = !!(JER.wil && M && o.wil && o.op > 25); // über der Wilson-Karte nur die heutigen Hauptstraßen in Blau (Gebäude und Gassen stehen schon auf Wilsons Karte)
      if (ppm > 0.45 && !ov) { g.fillStyle = 'rgba(176,150,118,.5)'; g.strokeStyle = 'rgba(110,85,55,.7)'; g.lineWidth = 0.8 * r; S.bld.forEach(f => { if (vis(f)) { path(f, true); g.fill(); g.stroke(); } }); }
      const minC = ov ? 3 : ppm > 0.25 ? 1 : ppm > 0.08 ? 3 : 4; g.strokeStyle = ov ? 'rgba(30,80,170,.6)' : 'rgba(95,80,65,.75)';
      S.hw.forEach(f => { if (f.c < minC || !vis(f)) return; g.lineWidth = (f.c >= 4 ? 2.6 : f.c === 3 ? 1.8 : 1) * r * Math.min(2.2, Math.max(0.8, ppm * 2)); path(f, false); g.stroke(); });
      g.strokeStyle = 'rgba(75,25,20,.9)'; g.lineWidth = 3 * r; S.wall.forEach(f => { if (vis(f)) { path(f, false); g.stroke(); } });
      g.strokeStyle = 'rgba(40,110,190,.8)'; g.lineWidth = 2 * r; S.water.forEach(f => { if (vis(f)) { path(f, false); g.stroke(); } });
    }
    if (o.lab && JER.meta && JER.meta.labels) { const ll = I18N.lang; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      JER.meta.labels.forEach(L => { if (L.z && MP.s < L.z) return; const t = (ll === 'de' ? L.n[1] : ll === 'he' && L.n[2] ? L.n[2] : L.n[0]) || L.n[0], px = X(L.p[0]), py = Y(L.p[1]); if (px < -80 || py < -30 || px > w + 80 || py > h + 30) return;
        const big = L.t === 'hill' || L.t === 'val', sz = (big ? 13 : 11) * r; g.font = `${big ? 'italic ' : ''}600 ${sz}px -apple-system, system-ui, sans-serif`;
        if (chap && chap.length) { const hw = g.measureText(big ? t.toUpperCase() : t).width / 2 + (big ? t.length * 1.5 * r : 0) + 8 * r; if (chap.some(q => L.a ? Math.hypot(q.x - px, q.y - py) < hw : Math.abs(q.x - px) < hw && Math.abs(q.y - py) < 13 * r)) return; } // Grundname läge unter einem Ort des Kapitels
        g.save(); g.translate(px, py); if (L.a) g.rotate(L.a * Math.PI / 180);
        const tx = big ? t.toUpperCase() : L.t === 'gate' ? t + (ll === 'de' ? ' (heute)' : ll === 'he' ? ' (כיום)' : ' (today)') : t; if (big && g.letterSpacing !== undefined) g.letterSpacing = (3 * r) + 'px'; g.lineWidth = 3.5 * r; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText(tx, 0, 0); g.fillStyle = L.t === 'val' ? '#2d5f8f' : L.t === 'hill' ? '#5a4524' : L.t === 'wall' ? '#6b1f18' : '#222'; g.fillText(tx, 0, 0); g.restore(); });
      g.textAlign = 'start'; }
    g.restore();
  }
  // ===== Feinere Karte: Reliefkacheln für das Land Israel (map/hi), Gewässer (OSM), römische Straßen (Itiner-e), heutige Städte =====
  // Alles wird erst bei Bedarf geladen; gezeichnet wird nur, was im Bild liegt, und nur so genau, wie der Zoom es zeigt.
  const HI = window.BMAPHI || null, HIC = new Map(), HIS = { n: 0, raf: 0 }; // Kachel-Cache: „Stufe/x_y“ -> { im, ok, u }
  const MAPZH = 22; // größter Zoom im Ausschnitt der feinen Kacheln (feinste Stufe: 2400 Pixel je Grad = Zoom 16)
  const mapInHi = (x, y) => !!HI && x >= HI.x0 && y >= HI.y0 && x <= HI.x0 + HI.w && y <= HI.y0 + HI.h; // Kartenpixel
  const mapDrawSoon = () => { if (HIS.raf) return; HIS.raf = requestAnimationFrame(() => { HIS.raf = 0; mapDraw(); }); };
  function mapHiVisible(w, h) { return !!HI && MP.s >= 1.6 && (HI.x0 + HI.w) * MP.s + MP.tx > 0 && HI.x0 * MP.s + MP.tx < w && (HI.y0 + HI.h) * MP.s + MP.ty > 0 && HI.y0 * MP.s + MP.ty < h; }
  function mapHiDraw(g, w, h) {
    if (!mapHiVisible(w, h)) return;
    let li = 0; while (li < HI.lv.length - 1 && HI.lv[li].f < MP.s * 0.8) li++; // Stufe, deren Kacheln höchstens um ein Viertel vergrößert werden
    const ox = HI.x0 * MP.s + MP.tx, oy = HI.y0 * MP.s + MP.ty, stamp = ++HIS.n;
    const pass = (k, load) => { // zeichnet die geladenen Kacheln einer Stufe; liefert die Zahl der noch fehlenden
      const L = HI.lv[k], q = MP.s / L.f, ts = HI.ts * q; let miss = 0;
      const tx0 = Math.max(0, Math.floor(-ox / ts)), tx1 = Math.min(L.nx - 1, Math.floor((w - ox) / ts)), ty0 = Math.max(0, Math.floor(-oy / ts)), ty1 = Math.min(L.ny - 1, Math.floor((h - oy) / ts));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (L.have.charCodeAt(ty * L.nx + tx) !== 49) continue; // nur offenes Meer: keine Kachel
        const key = k + '/' + tx + '_' + ty; let t = HIC.get(key);
        if (!t) { if (!load) continue; t = { im: new Image(), ok: false, u: 0 }; const tt = t; t.im.onload = () => { tt.ok = true; mapDrawSoon(); }; t.im.src = 'map/hi/' + key + '.jpg'; HIC.set(key, t); }
        t.u = stamp; if (!t.ok) { miss++; continue; }
        const x = Math.round(ox + tx * ts), y = Math.round(oy + ty * ts); // auf ganze Pixel, damit zwischen den Kacheln keine Fugen entstehen
        g.drawImage(t.im, x, y, Math.round(ox + tx * ts + t.im.naturalWidth * q) - x, Math.round(oy + ty * ts + t.im.naturalHeight * q) - y);
      }
      return miss; };
    const tiles = () => { // Zielstufe; solange dort Kacheln fehlen, liegen darunter die schon geladenen gröberen
      let miss = 0; { const L = HI.lv[li], ts = HI.ts * MP.s / L.f; for (let ty = Math.max(0, Math.floor(-oy / ts)); ty <= Math.min(L.ny - 1, Math.floor((h - oy) / ts)) && !miss; ty++) for (let tx = Math.max(0, Math.floor(-ox / ts)); tx <= Math.min(L.nx - 1, Math.floor((w - ox) / ts)); tx++) { if (L.have.charCodeAt(ty * L.nx + tx) !== 49) continue; const t = HIC.get(li + '/' + tx + '_' + ty); if (!t || !t.ok) { miss = 1; break; } } }
      if (miss) for (let k = 0; k < li; k++) pass(k, k === 0);
      pass(li, true); };
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.globalAlpha = Math.min(1, (MP.s - 1.6) / 0.5); tiles(); g.restore();
    if (HIC.size > 260) { const old = [...HIC].filter(([, t]) => t.u !== stamp).sort((a, b) => a[1].u - b[1].u); for (let i = 0; i < old.length && HIC.size > 180; i++) { old[i][1].im.onload = null; HIC.delete(old[i][0]); } } // lange nicht gezeigte Kacheln freigeben
  }
  // Linien (Gewässer, Straßen): wie map/jer/osm.js gepackt – Differenzen ganzer Zahlen, zlib, Base64
  const vecDec = (a, c0) => { const n = (a.length - c0) >> 1, x = new Int32Array(n), y = new Int32Array(n); let px = 0, py = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < n; i++) { px += a[c0 + 2 * i]; py += a[c0 + 2 * i + 1]; x[i] = px; y[i] = py; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } return { x, y, b: [x0, y0, x1, y1] }; };
  async function vecLoad(S, src, name, make) { if (S.st) return; S.st = 1; try { if (await jerScript(src) && window[name]) { make(window[name].z ? JSON.parse(new TextDecoder().decode(await jerInfl(window[name].z))) : window[name]); S.st = 2; mapDraw(); } else S.st = 3; } catch { S.st = 3; } }
  // Abbildung der gepackten Koordinaten auf den Bildschirm und Zeichnen der sichtbaren Linien in einen Pfad; Punkte, die näher als tol Pixel am vorigen liegen, entfallen
  const vecView = (o, w, h) => { const kx = BM.ppd * BM.k * MP.s, ky = BM.ppd * MP.s, ax = kx / o[2], bx = (o[0] - BM.W0) * kx + MP.tx, ay = -ky / o[2], by = (BM.N0 - o[1]) * ky + MP.ty;
    return { vis: f => ax * f.b[2] + bx > 0 && ax * f.b[0] + bx < w && ay * f.b[1] + by > 0 && ay * f.b[3] + by < h,
      path: (g, f, tol) => { const n = f.x.length; let lx = ax * f.x[0] + bx, ly = ay * f.y[0] + by; g.moveTo(lx, ly); for (let i = 1; i < n; i++) { const px = ax * f.x[i] + bx, py = ay * f.y[i] + by; if (i < n - 1 && Math.abs(px - lx) + Math.abs(py - ly) < tol) continue; g.lineTo(px, py); lx = px; ly = py; } } }; };
  const WAT = { st: 0, cl: null, lab: [], o: null }, WATZ = [2.1, 3.2, 5.5, 8.5, 12]; // Gewässerklassen erscheinen nacheinander: Hauptflüsse zuerst, kleine Wadis erst bei starkem Zoom
  function mapWaterDraw(g, r, w, h) {
    if (!mapHiVisible(w, h) || MP.s < WATZ[0]) return; if (!WAT.st) vecLoad(WAT, 'map/water.js', 'BMAPWATER', j => { WAT.o = j.o; WAT.cl = j.cl.map(c => c.map(a => vecDec(a, 0))); WAT.lab = j.lab || []; }); if (WAT.st !== 2) return;
    const V = vecView(WAT.o, w, h); g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    WAT.cl.forEach((c, k) => { const a = Math.min(1, (MP.s - WATZ[k]) / (WATZ[k] * 0.25)); if (a <= 0) return;
      g.beginPath(); for (const f of c) if (V.vis(f)) V.path(g, f, 1.5 * r);
      g.globalAlpha = a; g.strokeStyle = k ? 'rgba(74,128,176,.8)' : 'rgba(62,118,172,.95)'; g.lineWidth = (k === 0 ? Math.min(2.6, 1.5 + MP.s / 14) : k === 1 ? 1.25 : k === 2 ? 1.05 : 0.85) * r; g.stroke(); });
    g.restore();
  }
  const ROADS = { st: 0, r: null, o: null };
  function mapRoadsDraw(g, r, w, h) {
    if (!host.$('#mapRoads').checked) return; if (!ROADS.st) vecLoad(ROADS, 'map/roads.js', 'BMAPROADS', j => { ROADS.o = j.o; ROADS.r = j.r.map(a => Object.assign(vecDec(a, 2), { m: a[0] === 2, c: a[1] })); }); if (ROADS.st !== 2) return;
    const V = vecView(ROADS.o, w, h), small = MP.s < 1.2; g.save(); g.lineJoin = 'round'; g.lineCap = 'butt'; g.strokeStyle = '#7a4a22';
    // vier Pfade: Haupt-/Nebenstraße × gesichert oder vermutet / hypothetisch; in der Übersicht nur die Hauptstraßen
    for (let k = 0; k < 4; k++) { const main = k < 2, hyp = k % 2 === 1; if (small && !main) continue; g.beginPath();
      for (const f of ROADS.r) if (f.m === main && (f.c === 0) === hyp && V.vis(f)) V.path(g, f, 2 * r);
      g.setLineDash(hyp ? [2 * r, 3.5 * r] : [5.5 * r, 3 * r]); g.globalAlpha = (hyp ? 0.45 : main ? 0.8 : 0.6) * (small ? 0.8 : 1); g.lineWidth = (main ? 1.35 : 0.95) * r; g.stroke(); }
    g.restore();
  }
  // Hintergrundnamen: Flüsse (entlang des Laufs) und heutige Städte (blassgrau) – erst nach allen antiken Namen und nur, wo nichts anderes liegt
  const TOWNS = { st: 0, l: null };
  function mapBackLabels(g, r, w, h, E) {
    const ll = I18N.lang, FONT = '-apple-system, system-ui, sans-serif', X = lon => (lon - BM.W0) * BM.ppd * BM.k * MP.s + MP.tx, Y = lat => (BM.N0 - lat) * BM.ppd * MP.s + MP.ty;
    const dots = MP.lay.filter(o => !o.chap && o.x > 0 && o.y > 0 && o.x < w && o.y < h), onDot = b => dots.some(o => o.x > b.x - r && o.x < b.x + b.w + r && o.y > b.y - r && o.y < b.y + b.h + r); // Namen decken keine Punkte der übrigen Orte zu
    if (WAT.st === 2 && mapHiVisible(w, h)) { g.font = `italic ${11 * r}px ${FONT}`; g.textAlign = 'center'; let n = 0;
      for (const L of WAT.lab) { if (L[6] > MP.s) break; if (n >= 14) break; const px = X(L[3]), py = Y(L[4]); if (px < 0 || py < 0 || px > w || py > h) continue;
        if (E.shown.has(L[0]) || E.shown.has(L[0].replace(/^Nahal /, '').split(' (')[0])) continue; // steht schon als Ort des Kapitels auf der Karte
        const t = (ll === 'de' ? L[1] : ll === 'he' ? L[2] : '') || L[0], tw = g.measureText(t).width + 6 * r, an = -L[5] * Math.PI / 180, cw = Math.abs(Math.cos(an)) * tw + Math.abs(Math.sin(an)) * 14 * r, ch = Math.abs(Math.sin(an)) * tw + Math.abs(Math.cos(an)) * 14 * r;
        const bb = { x: px - cw / 2, y: py - ch / 2, w: cw, h: ch }; if (!E.inside(bb) || E.hit(bb) || onDot(bb)) continue; E.boxes.push(bb); n++;
        g.save(); g.translate(px, py); g.rotate(an); g.globalAlpha = 0.9; g.lineWidth = 2.6 * r; g.strokeStyle = 'rgba(255,255,255,.6)'; g.strokeText(t, 0, -1 * r); g.fillStyle = '#1f4f7a'; g.fillText(t, 0, -1 * r); g.restore(); }
      g.textAlign = 'start'; }
    if (host.$('#mapTowns').checked) {
      if (!TOWNS.st) vecLoad(TOWNS, 'map/towns.js', 'BMAPTOWNS', j => { TOWNS.l = j; });
      if (TOWNS.st === 2) { let n = 0; const names = new Set(MP.lay.filter(o => o.chap).map(o => BM.places[o.i][0]));
        for (const T of TOWNS.l) { if (T[5] > MP.s) break; if (n >= 36) break; const px = X(T[3]), py = Y(T[4]); if (px < 4 || py < 4 || px > w - 4 || py > h - 4) continue;
          if (names.has(T[0])) continue; // derselbe Ort steht schon als antiker Ort da
          const big = T[5] < 1 || T[6] >= 1e6, fs = (big ? 11.5 : 10.5) * r, q = 2.4 * r; g.font = `${big ? '600 ' : ''}${fs}px ${FONT}`;
          const mb = { x: px - q - r, y: py - q - r, w: 2 * q + 2 * r, h: 2 * q + 2 * r }; if (E.hit(mb)) continue; // der Ort selbst läge unter einem antiken Namen oder einem Ort des Kapitels
          const t = (ll === 'de' ? T[1] : ll === 'he' ? T[2] : '') || T[0], tw = g.measureText(t).width, c = [[px + q + 3 * r, py - 7 * r], [px - q - 3 * r - tw, py - 7 * r], [px - tw / 2, py - q - 15 * r], [px - tw / 2, py + q + 1 * r]].map(([bx, by]) => ({ x: bx - 2 * r, y: by, w: tw + 4 * r, h: 14 * r }));
          const bb = c.find(b => E.inside(b) && !E.hit(b) && !onDot(b)); if (!bb) continue; E.boxes.push(bb, mb); n++;
          g.globalAlpha = 0.9; g.beginPath(); g.rect(px - q + 0.5 * r, py - q + 0.5 * r, 2 * q - r, 2 * q - r); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); g.lineWidth = 1.1 * r; g.strokeStyle = 'rgba(90,90,90,.8)'; g.stroke();
          g.lineWidth = 2.4 * r; g.strokeStyle = 'rgba(255,255,255,.5)'; g.strokeText(t, bb.x + 2 * r, bb.y + 7 * r); g.fillStyle = 'rgba(78,78,78,.92)'; g.fillText(t, bb.x + 2 * r, bb.y + 7 * r); g.globalAlpha = 1; } } }
  }
  function mapJerGo() { const { w, h } = mapSize(), s = Math.min(w, h) / 2.44, [x, y] = mapXY(35.2345, 31.7770); MP.s = Math.min(6000, s); MP.tx = w / 2 - x * MP.s; MP.ty = h / 2 - y * MP.s; mapDraw(); }
  function mapZoom(f, mx, my) { // nicht weiter hinaus, als die ganze Karte passt; hinein bis MAPZ, im Ausschnitt der feinen Kacheln bis MAPZH, nur in Jerusalem (Detailkarte) weiter
    const { w, h } = mapSize(), lo = Math.min(w / BM.w, h / BM.h), [lon, lat] = mapLL((mx - MP.tx) / MP.s, (my - MP.ty) / MP.s), hi = mapNearJer(lon, lat) ? 6000 : mapInHi((mx - MP.tx) / MP.s, (my - MP.ty) / MP.s) ? MAPZH : MAPZ; let ns = Math.max(lo, MP.s * f); if (ns > hi) ns = Math.max(hi, Math.min(MP.s, ns)); MP.tx = mx - (mx - MP.tx) * ns / MP.s; MP.ty = my - (my - MP.ty) * ns / MP.s; MP.s = ns; mapDraw(); }
  function mapOpenFor(title, ref, label) { // aus der Gliederung: nur die Orte dieses Punktes
    if (!BM) return; const list = mapForRef(title, ref); if (!list.length) return;
    MP.over = { label, list }; mapOpen(); MP.over = { label, list }; MP.cur = list; MP.sel = -1; MP.grp = null; MP.vsel = null; host.$('#mapOl').hidden = false;
    requestAnimationFrame(() => { mapFit(); mapInfo(); mapDraw(); });
  }
  // Orte eines Verses hervorheben (die übrigen Orte des Kapitels werden blass); v = 0 hebt die Hervorhebung auf
  function mapVerseSet(v) { const st = v ? new Set(MP.cur.filter(c => (c.vs || []).includes(v)).map(c => c.i)) : null; MP.vsel = st && st.size ? st : null; MP.vnum = MP.vsel ? v : 0; if (MP.vsel) { MP.sel = -1; MP.grp = null; } mapDraw(); mapInfo(); }
  const mapVerseN = v => (BM && !MP.over && v ? MP.cur.filter(c => (c.vs || []).includes(v)).length : 0);
  function mapVerseShow(v) { if (host.$('#mapPanel').hidden) mapOpen(); requestAnimationFrame(() => requestAnimationFrame(() => mapVerseSet(v))); }
  window.__mapOpenFor = mapOpenFor;
  // Prüfhilfen: Abschnitt eines Werkes mit Zeichenketten-Schlüssel (ALMA: Talmudblatt, Midrasch-Kapitel) öffnen; Zustand der Karte
  window.__mapOpenKey = (title, key, label) => { const bi = BM.books.indexOf(title), m = new Map(); BM.places.forEach((p, i) => p[4].forEach(e => { if (e[0] === bi && String(e[1]) === String(key)) { if (!m.has(i)) m.set(i, []); m.get(i).push(e[2]); } })); const list = [...m].map(([i, vs]) => ({ i, vs })); if (!list.length) return 0; MP.over = { label: label || title, list }; mapOpen(); MP.over = { label: label || title, list }; MP.cur = list; MP.sel = -1; MP.grp = null; MP.vsel = null; host.$('#mapOl').hidden = false; requestAnimationFrame(() => { mapFit(); mapInfo(); mapDraw(); }); return list.length; };
  window.__MP = MP; window.__mapCount = (t, r) => mapForRef(t, r).length;
  function mapOpen() {
    if (!BM) return; host.$('#topicPanel').hidden = true; host.$('#outlinePanel').hidden = true; host.$('#mapPanel').hidden = false; host.$('#mapOl').hidden = true; mapElevLoad();
    if (!MP.img) { MP.img = new Image(); MP.img.onload = () => { MP.ok = true; mapFit(); mapDraw(); }; MP.img.src = 'map/relief.jpg'; }
    MP.cur = mapChapPlaces(); MP.sel = -1; MP.grp = null; MP.vsel = null; mapRouteFill(); requestAnimationFrame(() => { mapFit(); mapDraw(); mapInfo(); });
  }
  if (BM) {
    if (!BB) host.$('#mapBordL').hidden = true;
    try { host.$('#mapBord').checked = localStorage.getItem('mapBord') === '1'; } catch { /* egal */ }
    host.$('#mapBtn').onclick = () => { if (!host.$('#mapPanel').hidden) { host.$('#mapPanel').hidden = true; return; } mapOpen(); };
    host.$('#mapClose').onclick = () => { host.$('#mapPanel').hidden = true; };
    host.$('#mapAll').onchange = () => { mapDraw(); mapInfo(); };
    const perPaint = () => host.$$('#mapPer button').forEach(b => { b.classList.toggle('on', MPER.has(b.dataset.p)); b.style.setProperty('--pc', MPCOL[b.dataset.p]); });
    perPaint();
    host.$('#mapPer').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (!b) return; const k = b.dataset.p; if (MPER.has(k)) { if (MPER.size > 1) MPER.delete(k); } else MPER.add(k); perPaint(); try { localStorage.setItem('mapPer', JSON.stringify([...MPER])); } catch { /* egal */ } if (MP.sel >= 0 && !mapPlaceOk(BM.places[MP.sel])) MP.sel = -1; mapDraw(); mapInfo(); }); // die Epochen filtern auch die Orte des Kapitels; „alle Orte“ bleibt ein eigener Schalter
    ['mapTowns', 'mapRoads'].forEach(id => { const el = host.$('#' + id); try { el.checked = localStorage.getItem(id) !== '0'; } catch { el.checked = true; } el.onchange = () => { try { localStorage.setItem(id, el.checked ? '1' : '0'); } catch { /* egal */ } mapDraw(); }; });
    host.$('#mapBord').onchange = () => { try { localStorage.setItem('mapBord', host.$('#mapBord').checked ? '1' : '0'); } catch { /* egal */ } mapDraw(); };
    document.addEventListener('mousedown', e => { const p = host.$('#mapPanel'); if (p.hidden || p.classList.contains('docked') || !e.target.closest || e.target.closest('#mapPanel, #mapBtn, #suggest, #audioBar, #ctxMenu, #lkHover, #tip, #undoBar, dialog')) return; p.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !host.$('#mapPanel').hidden && !document.querySelector('dialog[open]')) { if (MP.rul) { mapRulToggle(false); e.stopPropagation(); return; } host.$('#mapPanel').hidden = true; e.stopPropagation(); } }, true);
    window.addEventListener('resize', () => { if (!host.$('#mapPanel').hidden) mapDraw(); });
    const cv = host.$('#mapCv'), mc = (e) => { const b = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; return [(e.clientX - b.left) * d, (e.clientY - b.top) * d]; };
    // Mausrad zoomt; Zwei-Finger-Wischen auf dem Trackpad verschiebt, Pinch (Strg) bzw. Cmd/Alt + Rad zoomt. Maus oder Trackpad entscheidet das erste Ereignis einer Geste:
    // ein Mausrad liefert ganze Rasten (wheelDelta ein Vielfaches von 120 bzw. |deltaY| ≥ 50) ohne seitlichen Anteil
    const wl = { t: 0, mouse: false };
    cv.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = mc(e);
      if (e.timeStamp - wl.t > 250) wl.mouse = e.deltaMode === 0 && !e.deltaX && ((!!e.wheelDeltaY && Math.abs(e.wheelDeltaY) >= 120 && e.wheelDeltaY % 120 === 0) || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)); wl.t = e.timeStamp;
      if (!(e.ctrlKey || e.metaKey || e.altKey || e.deltaMode === 1 || wl.mouse)) { const d = window.devicePixelRatio || 1; MP.tx -= e.deltaX * d; MP.ty -= e.deltaY * d; mapDraw(); return; }
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1); mapZoom(Math.exp(-Math.max(-300, Math.min(300, dy)) * (e.ctrlKey ? 0.012 : wl.mouse ? 0.0035 : 0.0055)), mx, my); }, { passive: false });
    host.$('#mapZin').onclick = () => { const { w, h } = mapSize(); mapZoom(1.8, w / 2, h / 2); };
    host.$('#mapZout').onclick = () => { const { w, h } = mapSize(); mapZoom(1 / 1.8, w / 2, h / 2); };
    host.$('#mapZfit').onclick = () => { mapFit(); mapDraw(); };
    host.$('#mapRulB').onclick = () => mapRulToggle();
    host.$('#mapJerB').onclick = mapJerGo;
    host.$('#mapLegB').onclick = () => { const l = host.$('#mapLegend'); l.hidden = !l.hidden; host.$('#mapLegB').classList.toggle('on', !l.hidden); mapDraw(); };
    { const jb = host.$('#mapJer'), set = () => jb.classList.toggle('min', !!JER.opt.min); set(); jb.querySelector('b').onclick = () => { JER.opt.min = JER.opt.min ? 0 : 1; try { localStorage.setItem('jerOpt', JSON.stringify(JER.opt)); } catch { /* egal */ } set(); mapDraw(); }; } // Kasten der Jerusalem-Ebenen einklappbar
    { const sv = () => { try { localStorage.setItem('jerOpt', JSON.stringify(JER.opt)); } catch { /* egal */ } }, bind = (id, k) => { const el = host.$(id); el.checked = !!JER.opt[k]; el.onchange = () => { JER.opt[k] = el.checked ? 1 : 0; sv(); mapDraw(); }; };
      bind('#jerWil', 'wil'); bind('#jerOsm', 'osm'); bind('#jerRel', 'rel'); bind('#jerLab', 'lab'); host.$('#jerOp').value = JER.opt.op; host.$('#jerOp').oninput = () => { JER.opt.op = +host.$('#jerOp').value; sv(); mapDraw(); }; }
    host.$('#mapRoute').onchange = () => mapRouteSet(host.$('#mapRoute').value);
    if (BM.nOrig && BM.nOrig < BM.books.length) host.$('#mapCredit').textContent += ' · Orte bei Josephus und in den Makkabäerbüchern: ToposText (topostext.org, ODC-BY)';
    if (BM.alma && BM.alma.size) host.$('#mapCredit').textContent += ' · Orte in der rabbinischen Literatur: ALMA (Ido Wachtel, Hebrew University GIS)';
    host.$('#mapCredit').textContent += ' · Jerusalem: Ordnance Survey of Jerusalem (Wilson 1865, gemeinfrei, Wikimedia Commons) · heutige Stadt: © OpenStreetMap-Mitwirkende (ODbL)';
    host.$('#mapCredit').textContent += ' · ' + I18N.t('Bäche und Wadis, heutige Orte: © OpenStreetMap-Mitwirkende (ODbL), Natural Earth · Römische Straßen: Itiner-e (de Soto, Pažout, Brughmans u. a. 2025, CC BY 4.0, itiner-e.org)');
    // Vorschau der Verse beim Überfahren: Verslinks in der Info und Orte auf der Karte
    host.$('#mapInfo').addEventListener('mouseover', e => { const a = e.target.closest('a[data-ref], .olr[data-ref]'); if (!a || !host.hovApi || a.dataset.ref === host.hovApi.current()) return; host.hovApi.start(a, a.dataset.ref, false, false); });
    host.$('#mapInfo').addEventListener('mouseout', e => { if (host.hovApi && e.target.closest('a[data-ref], .olr[data-ref]')) host.hovApi.hide(); });
    host.$('#mapPanel').addEventListener('mouseleave', () => { if (host.hovApi) host.hovApi.hide(); });
    // Größe: Breite am linken Rand, Höhe der Karte an der Trennleiste (wird gemerkt)
    { const P = host.$('#mapPanel'), W = host.$('#mapWrap'); let mw = 0, mh = 0; try { mw = +localStorage.getItem('mapW') || 0; mh = +localStorage.getItem('mapH2') || 0; } catch { /* egal */ }
      const setW = w => { if (!w) { P.style.width = ''; return; } P.style.width = Math.max(360, Math.min(window.innerWidth - 120, w)) + 'px'; };
      const setH = h => { if (!h) { W.style.flex = ''; return; } W.style.flex = `0 0 ${Math.max(140, Math.min(P.clientHeight - 160, h))}px`; };
      setW(mw); setH(mh);
      const drag = (el, move, done) => el.addEventListener('mousedown', ev => { ev.preventDefault(); const rt = document.documentElement; rt.classList.add('cmt-dragging'); const mv = e2 => move(e2), up = () => { rt.classList.remove('cmt-dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); done(); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });
      drag(host.$('#mapResize'), e2 => { const r = P.getBoundingClientRect(); setW(r.right - e2.clientX); mapDraw(); }, () => { try { localStorage.setItem('mapW', String(parseInt(P.style.width) || 0)); } catch { /* egal */ } });
      drag(host.$('#mapSplit'), e2 => { setH(e2.clientY - W.getBoundingClientRect().top); mapDraw(); }, () => { try { localStorage.setItem('mapH2', String(parseInt(W.style.flex.split(' ')[2]) || 0)); } catch { /* egal */ } });
      host.$('#mapResize').addEventListener('dblclick', () => { setW(0); try { localStorage.removeItem('mapW'); } catch { /* egal */ } mapDraw(); });
      host.$('#mapSplit').addEventListener('dblclick', () => { setH(0); try { localStorage.removeItem('mapH2'); } catch { /* egal */ } mapDraw(); });
      if (window.ResizeObserver) new ResizeObserver(() => { if (!P.hidden) mapDraw(); }).observe(W); }
    if (!BR.length) host.$('#mapRoute').hidden = true;
    host.$('#mapRuler').addEventListener('mousemove', e => { const c = e.target.closest && e.target.closest('#mapRulProf'), R = MP.rul; if (!c || !R || !R.prof || !R.profX) return; const bx = c.getBoundingClientRect(), x = e.clientX - bx.left, tot = R.prof[R.prof.length - 1].km || 1, km = Math.max(0, Math.min(tot, (x - 34) / (bx.width - 38) * tot)); let k = R.prof.findIndex(p => p.km >= km); if (k < 0) k = R.prof.length - 1; mapProfDraw(k); mapDraw(); });
    host.$('#mapRuler').addEventListener('mouseleave', () => { const R = MP.rul; if (R && R.hov) { R.hov = null; mapProfDraw(null); mapDraw(); } });
    host.$('#mapRuler').addEventListener('click', e => { const x = e.target.dataset && e.target.dataset.x; if (x === 'undo' && MP.rul) MP.rul.pts.pop(); else if (x === 'clr' && MP.rul) MP.rul.pts = []; else return; MP.rul.cur = null; mapRulInfo(); mapDraw(); });
    cv.addEventListener('mousedown', e => { if (!(MP.rul && MP.rul.on)) cv.style.cursor = ''; host.$('#mapHint').style.display = 'none'; MP.drag = { x: e.clientX, y: e.clientY, tx: MP.tx, ty: MP.ty, moved: false }; cv.classList.add('drag'); });
    window.addEventListener('mousemove', e => { if (!MP.drag) return; const d = window.devicePixelRatio || 1; if (Math.abs(e.clientX - MP.drag.x) + Math.abs(e.clientY - MP.drag.y) > 3) MP.drag.moved = true; MP.tx = MP.drag.tx + (e.clientX - MP.drag.x) * d; MP.ty = MP.drag.ty + (e.clientY - MP.drag.y) * d; mapDraw(); });
    window.addEventListener('mouseup', e => { if (!MP.drag) return; const mv = MP.drag.moved; MP.drag = null; cv.classList.remove('drag'); if (!mv && e.target === cv) { if (MP.rul && MP.rul.on) { const i = mapPick(e), [mx, my] = mc(e); let pt; if (i >= 0) { const [x, y] = mapPx(BM.places[i]); pt = [...mapLL(x, y), BM.places[i][0]]; } else pt = [...mapLL((mx - MP.tx) / MP.s, (my - MP.ty) / MP.s), null]; MP.rul.pts.push(pt); mapRulInfo(); mapDraw(); } else { const o = mapPickO(e)[0]; if (o && o.bub) mapBubble(o); else { if (!o) MP.grp = null; mapSelect(o ? o.i : -1, false); } } } });
    // Hinweis am Mauszeiger (Name, hebräisch, Typ, Zahl der Stellen); der Ort bekommt einen Ring, sein Chip in der Liste wird hervorgehoben
    const hovSet = i => { if (i === MP.hov) return; MP.hov = i; host.$$('#mapInfo .chip.hov').forEach(c => c.classList.remove('hov')); if (i >= 0) { const c = host.$(`#mapInfo .chip[data-i="${i}"]`); if (c) c.classList.add('hov'); } mapDraw(); };
    cv.addEventListener('mousemove', e => { if (MP.drag) return;
      if (MP.rul && MP.rul.on && MP.rul.pts.length) { MP.rul.cur = mc(e); mapDraw(); } const l = mapPickO(e), h = host.$('#mapHint'), t = I18N.t.bind(I18N);
      if (!(MP.rul && MP.rul.on)) cv.style.cursor = l.length ? 'pointer' : '';
      hovSet(l.length && !l[0].bub ? l[0].i : -1);
      if (!l.length) { h.style.display = 'none'; return; }
      h.textContent = l.slice(0, 4).map(o => { if (o.bub) return o.bub.length + ' ' + t('Orte') + ': ' + o.bub.slice(0, 6).map(i => BM.places[i][0]).join(', ') + (o.bub.length > 6 ? ' …' : ''); const p = BM.places[o.i]; return [p[0] + (mapHe(p) ? ' ' + mapHe(p) : ''), mapTypeT(p[1]), p[4].length + ' ' + t(p[4].length === 1 ? 'Stelle' : 'Stellen')].filter(Boolean).join(' · '); }).join('\n');
      h.style.display = 'block'; const wb = host.$('#mapWrap').getBoundingClientRect(); let x = e.clientX - wb.left + 14, y = e.clientY - wb.top + 16; if (x + h.offsetWidth > wb.width - 4) x = Math.max(4, e.clientX - wb.left - h.offsetWidth - 10); if (y + h.offsetHeight > wb.height - 4) y = Math.max(4, e.clientY - wb.top - h.offsetHeight - 10); h.style.left = x + 'px'; h.style.top = y + 'px'; });
    cv.addEventListener('mouseleave', () => { host.$('#mapHint').style.display = 'none'; hovSet(-1); });
    host.$('#mapInfo').addEventListener('mouseover', e => { const c = e.target.closest('.chip[data-i]'), rl = e.target.closest('[data-rl]'); if (c && +c.dataset.i >= 0 && +c.dataset.i !== MP.hov) { MP.hov = +c.dataset.i; mapDraw(); } if (rl && MP.rhov !== +rl.dataset.rl) { MP.rhov = +rl.dataset.rl; mapDraw(); } });
    host.$('#mapInfo').addEventListener('mouseout', e => { if (e.target.closest('.chip[data-i]') && MP.hov >= 0) { MP.hov = -1; mapDraw(); } if (e.target.closest('[data-rl]') && MP.rhov != null) { MP.rhov = null; mapDraw(); } });
    host.$('#mapInfo').addEventListener('input', e => { if (e.target.id !== 'mapFlt') return; const q = e.target.value.trim().toLowerCase(); host.$$('#mapInfo .chips .chip').forEach(c => { c.hidden = !!q && !(c.dataset.k || '').includes(q); }); });
    // Karte und Text: Klick auf einen Vers (bei angehefteter Karte) hebt dessen Orte hervor; Rechtsklick → „Orte dieses Verses auf der Karte“
    host.$('#rOut').addEventListener('click', e => { if (host.$('#mapPanel').hidden || MP.over) return; const rw = e.target.closest('.row[data-l]'); if (!rw || (window.getSelection() + '').trim()) return; const v = +String(rw.dataset.l).split(':').pop(); if (v) mapVerseSet(v); });
    cv.addEventListener('dblclick', e => { const [mx, my] = mc(e); mapZoom(2, mx, my); });
    host.$('#mapInfo').addEventListener('click', e => {
      const rt = e.target.closest('[data-rt]'); if (rt) { mapRouteSet(rt.dataset.rt); return; }
      const rl = e.target.closest('[data-rl]'); if (rl && MP.route) { const ln = MP.route.lines[+rl.dataset.rl]; mapElevLoad(); MP.rul = { on: true, pts: ln.map(c => [c[0], c[1], null]), cur: null, fromRoute: true }; host.$('#mapRulB').classList.add('on'); host.$('#mapCv').style.cursor = 'crosshair'; mapRulInfo(); mapDraw(); return; }
      if (e.target.closest('.pnadd') && MP.sel >= 0) { const p = BM.places[MP.sel]; host.openNoteDlg({ id: host.newId('free'), kind: 'free', title: p[0], place: p[0], note: '', order: host.topOrder() }, {}); return; }
      const pn = e.target.closest('.pnote'); if (pn) { const n = host.notesAll.find(x => x.id === pn.dataset.id); if (n) host.openNoteDlg(n, { canDelete: true }); return; }
      const mo = e.target.closest('a.more'); if (mo) { const rw = mo.closest('.vs'), [q, b] = (rw.dataset.w || '').split('|'), P = MP.refs && MP.refs.get(q), C = P && P.get(mapCorp(+b)), l = C && C.get(+b); if (l) rw.querySelector('.ls').innerHTML = mapRowLinks(+b, l, 1e9); return; }
      const so = e.target.closest('[data-sort]'); if (so) { MP.sort = so.dataset.sort; try { localStorage.setItem('mapSort', MP.sort); } catch { /* egal */ } mapInfo(); return; }
      const c = e.target.closest('.chip'); if (c) { if (+c.dataset.i === -3) { MP.grp = null; mapInfo(); return; } if (+c.dataset.i === -4) { mapVerseSet(0); return; } if (+c.dataset.i === -2) { MP.over = null; MP.cur = mapChapPlaces(); MP.sel = -1; mapFit(); mapDraw(); mapInfo(); return; } mapSelect(+c.dataset.i, +c.dataset.i >= 0); return; }
      const orow = e.target.closest('.olr'); if (orow) { host.jumpTo(orow.dataset.ref, host.BG(e)); return; }
      const al = e.target.closest('.alt'); if (al && MP.sel >= 0) { const k = +al.dataset.a, a = (BM.places[MP.sel][6] || [])[k]; if (a) { MP.alt = k; const [x, y] = mapXY(a[1], a[2]), { w, h } = mapSize(); MP.tx = w / 2 - x * MP.s; MP.ty = h / 2 - y * MP.s; mapDraw(); mapInfo(); } return; }
      const a = e.target.closest('a[data-ref]'); if (a) host.jumpTo(a.dataset.ref, host.BG(e));
    });
  }

    return {
      get BM() { return BM; },
      get mapDraw() { return mapDraw; },
      get mapInfo() { return mapInfo; },
      get mapName() { return mapName; },
      get mapOpen() { return mapOpen; },
      get mapRefresh() { return mapRefresh; },
      get mapSelect() { return mapSelect; },
      get mapVerseN() { return mapVerseN; },
      get mapVerseSet() { return mapVerseSet; },
      get mapVerseShow() { return mapVerseShow; },
      get MP() { return MP; },
    };
  }
  return { create };
})();
