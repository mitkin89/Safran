// Krauss, Talmudische Archäologie: Kurzzitate („HELLWALD S. 147“, „BLÜMNER, Technol. 2,31“, „MARQ., Pl.²“, „ZDPV 4,72“, „Lwr 2,371“)
// mit <abbr class="gab kbib" data-t="voller Titel">…</abbr> umschließen; beim Überfahren zeigt Safran den vollen Titel.
// Idempotent: vorhandene abbr.kbib werden zuerst entfernt, das Skript kann nach jeder Neuerzeugung des Buches erneut laufen.
// Grundlage: bibliographie.json (Kurzform -> Titel, aus werke.js durch bibliographie.js erzeugt).
// Bloßer Name mit mehreren Werken: das zuletzt davor mit Titel zitierte Werk desselben Autors (auch im Vollzitat),
// sonst der Eintrag des bloßen Namens. Vollzitate selbst („FR. HELLWALD, Haus und Hof in ihrer …, Leipz. 1888“) bleiben unmarkiert.
// Aufruf: node tools/krauss_ta/markieren.js [--dry]   (aktualisiert auch den Hash in bundled/manifest.json)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { werke, SIGEL, SIGEL_NUR_VOR_STELLE } = require('./werke');

const ROOT = path.join(__dirname, '..', '..');
const REL = 'own/Talmudische Archäologie/de/Samuel Krauss, Talmudische Archäologie, Bände I–III (Leipzig 1910–1912) – Transkription mit Claude.json';
const FILE = path.join(ROOT, 'bundled', REL);
const BIB = JSON.parse(fs.readFileSync(path.join(__dirname, 'bibliographie.json'), 'utf8'));

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// ---------- Schlüssel ordnen ----------
const sigel = new Set(Object.keys(SIGEL));
const nurVorStelle = new Set(SIGEL_NUR_VOR_STELLE);
const kurz = new Map();      // Name -> [{k, re, titel}] (längster Kurztitel zuerst)
const blank = new Map();     // Name -> Titel des bloßen Namens
const initial = new Map();   // "L.|LÖW" -> Titel
const namen = new Set();
for (const [k, t] of Object.entries(BIB)) {
  if (sigel.has(k)) continue;
  const i = k.indexOf(', ');
  if (i > 0) { const n = k.slice(0, i); namen.add(n); (kurz.get(n) || kurz.set(n, []).get(n)).push({ k: k.slice(i + 2), titel: t }); continue; }
  const im = k.match(/^((?:[A-ZÄÖÜ][a-zäöü]?\. ?)+) (\S.*)$/);
  if (im && !BIB[k.replace(/ /g, '')]) { initial.set(`${im[1].trim()}|${im[2]}`, t); continue; }
  namen.add(k); blank.set(k, t);
}
// Kurztitel tolerant: Punkte optional, Leerraum beliebig („Pl.²“ / „Pl²“, „Ag. d. pal. Am.“ / „Ag.d.pal.Am.“)
const kurzRe = k => reEsc(k).replace(/\\\./g, '\\.?').replace(/\s+/g, '\\s*');
for (const [n, arr] of kurz) {
  arr.sort((a, b) => b.k.length - a.k.length);
  for (const x of arr) x.re = new RegExp(`^\\.?\\s*[,(]?\\s*(${kurzRe(x.k)})(?![\\p{L}])`, 'u');
}
// Titelteil hinter dem Namen (für die Erkennung von Vollzitaten): „FR. HELLWALD, Haus und Hof …“ -> „hausundhof…“
const titelTeil = (n, t) => { const i = t.indexOf(n.replace(/\.$/, '') + ','); return i < 0 ? '' : norm(t.slice(i + n.length + 1)).slice(0, 14); };
const titelIni = (n, t) => { const i = t.indexOf(n.replace(/\.$/, '')); return i > 0 ? t.slice(0, i).trim() : ''; };
const werkeVon = new Map(); // Name -> [{titel, teil, ini}]
for (const n of namen) {
  const ts = new Set((kurz.get(n) || []).map(x => x.titel));
  if (blank.has(n) && !blank.get(n).includes('; oder')) ts.add(blank.get(n));
  werkeVon.set(n, [...ts].map(t => ({ titel: t, teil: titelTeil(n, t), ini: titelIni(n, t) })).filter(x => x.teil.length >= 6));
}

// Paragraphen, in denen ein bloßer Name ein bestimmtes Werk meint (werke.js, Option abs)
const bereiche = new Map(); // Name -> [{von, bis, titel, ini}]
for (const x of werke) for (const [von, bis] of x.abs || []) for (const n of x.namen)
  (bereiche.get(n) || bereiche.set(n, []).get(n)).push({ von, bis, titel: x.titel, ini: x.ini || '' });

// ---------- Muster ----------
const formen = [...namen, ...sigel].sort((a, b) => b.length - a.length);
const HAUPT = new RegExp(`(?<![\\p{L}\\p{N}\\-.’'])(${formen.map(reEsc).join('|')})(?![\\p{L}\\-])`, 'gu');
// Name in gewöhnlicher Schreibung („Löw, Aramäische Pflanzennamen“) – nur für den Zusammenhang, wird nicht markiert
const klein = [...namen].filter(n => /^[A-ZÄÖÜ][A-ZÄÖÜß]+$/.test(n) && werkeVon.get(n).length)
  .map(n => n[0] + n.slice(1).toLowerCase()).sort((a, b) => b.length - a.length);
const KLEIN = new RegExp(`(?<![\\p{L}])(${klein.map(reEsc).join('|')})(?=,\\s)`, 'gu');
const kleinZuName = s => s.toUpperCase();

// Fundstelle/Fortsetzung nach einem Kurzzitat: Seitenzahl, Band, „S.“, „s. v.“, „a. a. O.“, Satzende …
const LOC = /^[¹²³⁴⁵⁶⁷⁸⁹⁰]*(?:[\s,.:]*(?:$|[;)\]—–=]|\d|[IVX]+\b|S\.|p\.|pp\.|§|No\.|Nr\.|n\.|col\.|Sp\.|s\. ?v\.|s\. ?u\.|s\. ?o\.|Bd\.|Abt\.|Kap\.|c\.|ib\.|ibid|l\. ?c\.|a\. ?a\. ?O|a\. ?a|o\. ?c\.|z\. ?St|zu\s|Index|Register|unter|passim|im Index|Anm\.|A\.|App|Einl\.|Suppl\.|Fig\.|Taf|Abb|f\.|ff\.|vgl\.|s\.\s|\(|[A-ZÄÖÜ]{2,})|\.\s+\p{Lu}|\.$)/u;
const STELLE = /^\s?(?:\d|[IVX]+[\s,]|ib\.|a\. ?a\. ?O|s\. ?v\.|l\. ?c\.|Trg|[¹²³⁴⁵⁶⁷⁸⁹⁰])/;
const SIGEL_RE = [...sigel].sort((a, b) => b.length - a.length).map(reEsc).join('|');
// bloßer Name ohne Werkbezug: „LÖW in Lwr“, „BACHER in REJ“, „FRAENKEL ZDMG“, „HARKAVY-Festschrift“, „VOGELSTEIN und RIEGER“
const NICHT = new RegExp(`^\\.?,?\\s*(?:(?:in|im|zu|zur|bei|und|u\\.|nebst|sowie|oder|brieflich|mündlich)\\b|\\]|\\(brieflich|\\(mündlich|-\\p{L}|(?:${SIGEL_RE})(?![\\p{L}]))`, 'u');
const UNBEK = /^\.?\s*[,(]\s*[„"“(]?\p{Lu}\p{Ll}|^\.?\s*[,(]\s*[„"“]|^\s+\p{Lu}\p{Ll}{3,}(?!\.)/u;
const INI = /((?:[A-ZÄÖÜ][a-zäöü]?\.\s?){1,2})\s*$/;

// ---------- Markieren ----------
const stat = { stellen: 0, proKey: new Map(), beispiele: new Map(), mehrdeutig: new Map(), kontext: 0 };
const ctx = new Map(); // Name bzw. „Initiale|Name“ -> {titel, ini}: zuletzt mit Titel zitiertes Werk
let abschnitt = 0; // laufender Abschnitt (§): ein Standardwerk wird nur durch ein im selben Abschnitt zitiertes anderes Werk verdrängt
const setCtx = (n, v) => { v = { ...v, abs: abschnitt }; ctx.set(n, v); if (v.ini) ctx.set(`${v.ini}|${n}`, v); };
const liste = [];
const zaehle = (k, t, s) => { if (process.env.KTA_LISTE) liste.push(`${k}\t${t.slice(0, 70)}\t${s}`); stat.stellen++; stat.proKey.set(k, (stat.proKey.get(k) || 0) + 1); if (!stat.beispiele.has(k)) stat.beispiele.set(k, s); };
const ab = (t, s) => `<abbr class="gab kbib" data-t="${attr(t)}">${s}</abbr>`;

function vollzitat(n, rest) {
  // „, Haus und Hof in ihrer …“ -> Werk, falls der Titel einem bekannten Werk des Namens entspricht
  const m = rest.match(/^\.?\s*[,(]\s*(.{6,60})/);
  if (!m) return null;
  const r = norm(m[1]);
  return (werkeVon.get(n) || []).find(x => r.startsWith(x.teil.slice(0, Math.min(x.teil.length, Math.max(6, r.length >= 14 ? 14 : r.length))))) || null;
}

function markText(s) {
  // Zusammenhang aus Vollzitaten in gewöhnlicher Schreibung („I. Löw, Aramäische Pflanzennamen, Leipzig 1881“)
  const kl = [];
  KLEIN.lastIndex = 0;
  for (let m; (m = KLEIN.exec(s));) kl.push(m);
  let out = '', last = 0, ki = 0;
  const kleinBis = pos => { for (; ki < kl.length && kl[ki].index < pos; ki++) { const m = kl[ki], n = kleinZuName(m[1]); const v = vollzitat(n, s.slice(m.index + m[1].length)); if (v) setCtx(n, v); } };
  HAUPT.lastIndex = 0;
  for (let m; (m = HAUPT.exec(s));) {
    const f = m[1], p = m.index, end = p + f.length, rest = s.slice(end, end + 220);
    kleinBis(p);
    let wrapEnd = end, titel = null, key = f;
    if (sigel.has(f)) {
      if (nurVorStelle.has(f) && !STELLE.test(rest)) continue;
      if (f === 'L' && /^\s?Trg/.test(rest)) continue; // „L Trg Wb“ hat eigene Schlüssel
      if (f.length === 1 && /(?:^|\s)I{1,3}\s$/.test(s.slice(Math.max(0, p - 5), p))) continue; // „I K 4,24“ = I Könige
      titel = BIB[f];
    } else {
      const pre = s.slice(Math.max(0, p - 14), p);
      const im = pre.match(INI);
      // „J. H. SCHWARZ“, aber „T. L. LÖW“ (T = Tosefta) -> „L.“: zuerst alle, dann nur die letzte Initiale
      let ini = im ? im[1].replace(/\s+/g, ' ').trim() : '';
      if (ini.includes(' ') && !initial.has(`${ini}|${f}`)) ini = ini.split(' ').pop();
      let hit = null;
      for (const x of kurz.get(f) || []) { const km = rest.match(x.re); if (km) { hit = { x, km }; break; } }
      if (hit) {
        const after = rest.slice(hit.km[0].length);
        setCtx(f, { titel: hit.x.titel, ini: titelIni(f, hit.x.titel) });
        if (!LOC.test(after)) continue; // Titel geht weiter: Vollzitat oder längerer Titel – nicht markieren
        wrapEnd = end + hit.km[0].length; titel = hit.x.titel; key = `${f}, ${hit.x.k}`;
      } else {
        const v = vollzitat(f, rest);
        if (v) { setCtx(f, v); continue; } // Vollzitat
        if (NICHT.test(rest) || UNBEK.test(rest)) continue;
        if (/^\s?[¹²³⁴⁵⁶⁷⁸⁹⁰]*[\s,.]*\(?(?:Vater|eine Frau)/.test(rest)) continue;
        const iniT = ini && initial.get(`${ini}|${f}`);
        let base = iniT || blank.get(f);
        const stelle = LOC.test(rest);
        // ohne Fundstelle („wie I. LÖW bemerkt“) nur bei Autoren mit einem einzigen Werk
        if (!stelle && (!base || (werkeVon.get(f) || []).length > 1)) continue;
        // Name, dessen bloße Form kein Werk meint (z. B. LAGARDE): nur „a. a. O.“/„l. c.“/„ib.“ verweist auf das zuletzt genannte
        if (!base && !/^\s*,?\s*(?:a\. ?a\. ?O|l\. ?c\.|ib\.)/.test(rest)) continue;
        const c = (ini && ctx.get(`${ini}|${f}`)) || ctx.get(f);
        const cOk = c && (!ini || !c.ini || c.ini === ini || c.ini.startsWith(ini));
        const par = abschnitt + 1; // gedruckte Paragraphenzahl (Abschnitt i = § i+1)
        const ber = (bereiche.get(f) || []).find(x => par >= x.von && par <= x.bis && (!ini || !x.ini || x.ini === ini));
        if (f === 'LÖW' && /^\s*No\./.test(rest)) base = BIB['LÖW, Pfl.'];
        else if (ber && !(cOk && c.abs === abschnitt)) base = ber.titel;
        else if (cOk && (!base || base.includes('; oder') ? true
          : c.abs === abschnitt || /^\s*,?\s*(?:a\. ?a\. ?O|l\. ?c\.|ib\.)/.test(rest))) {
          if (base !== c.titel) stat.kontext++;
          base = c.titel;
        }
        if (!base) continue;
        if (base.includes('; oder')) stat.mehrdeutig.set(f, (stat.mehrdeutig.get(f) || 0) + 1);
        titel = base; key = iniT ? `${ini} ${f}` : f;
      }
    }
    if (!titel) continue;
    const txt = s.slice(p, wrapEnd);
    zaehle(key, titel, s.slice(Math.max(0, p - 30), wrapEnd + 30).replace(/\s+/g, ' '));
    out += s.slice(last, p) + ab(titel, txt);
    last = wrapEnd;
    HAUPT.lastIndex = wrapEnd;
  }
  kleinBis(s.length);
  return out + s.slice(last);
}

function markHtml(html) {
  html = html.replace(/<abbr class="gab kbib" data-t="[^"]*">([\s\S]*?)<\/abbr>/g, '$1');
  const parts = html.split(/(<[^>]*>)/);
  let schutz = 0; // innerhalb <a>…</a> oder <abbr>…</abbr>
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i];
    if (i % 2) { if (/^<(a|abbr)\b/i.test(t)) schutz++; else if (/^<\/(a|abbr)>/i.test(t)) schutz = Math.max(0, schutz - 1); continue; }
    if (!schutz && t) parts[i] = markText(t);
  }
  return parts.join('');
}

const book = JSON.parse(fs.readFileSync(FILE, 'utf8'));
book.text = book.text.map((sec, i) => { abschnitt = i; return sec.map(markHtml); });
const buf = Buffer.from(JSON.stringify(book, null, 1), 'utf8');
const hash = crypto.createHash('sha1').update(buf).digest('hex');

const top = [...stat.proKey].sort((a, b) => b[1] - a[1]);
console.log(`markiert: ${stat.stellen} Stellen, ${stat.proKey.size} verschiedene Kurzformen; nach Zusammenhang aufgelöst: ${stat.kontext}`);
console.log('häufigste:', top.slice(0, 25).map(([k, n]) => `${k} ${n}`).join(' · '));
if (stat.mehrdeutig.size) console.log('mehrdeutig gelassen (alle Kandidaten in der Blase):', [...stat.mehrdeutig].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
if (process.argv.includes('--beispiele')) for (const [k] of top) console.log(`  ${k}: …${stat.beispiele.get(k)}…`);
if (process.env.KTA_LISTE) fs.writeFileSync(process.env.KTA_LISTE, liste.join('\n') + '\n');
if (process.argv.includes('--dry')) process.exit(0);

fs.writeFileSync(FILE, buf);
const mf = path.join(ROOT, 'bundled', 'manifest.json');
const man = JSON.parse(fs.readFileSync(mf, 'utf8'));
const it = man.items.find(x => x.rel === REL);
if (!it) throw new Error('Manifest-Eintrag fehlt: ' + REL);
it.hash = hash;
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
console.log('geschrieben; Manifest-Hash', hash);
