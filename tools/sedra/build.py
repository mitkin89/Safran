#!/usr/bin/env python3
"""Build the bundled SEDRA dictionary from pinned, hash-checked public tables.

Run without arguments to rebuild from source/, or --download to fetch missing files.
No texts, scans, generated paradigms or unverified records are imported.
"""
import argparse
import collections
import gzip
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ID = hashlib.sha1(b"Safran:SEDRA:lexicon").hexdigest()[:12]
NAME = "SEDRA — Syriac Lexicon (Beth Mardutho)"


class Plain(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, text):
        self.parts.append(text)


def plain(value):
    p = Plain()
    p.feed(str(value or ""))
    return " ".join("".join(p.parts).split())


def esc(value):
    return html.escape(str(value or ""), quote=True)


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--download", action="store_true")
    opts = args.parse_args()
    manifest = json.loads((HERE / "source.json").read_text())
    tables = {}
    hashes = {}
    for file in manifest["files"]:
        dest = HERE / "source" / file["name"]
        if not dest.exists() and opts.download:
            dest.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["curl", "-fLsS", "--retry", "2", "--max-time", "90",
                            "https://sedra.bethmardutho.org" + file["path"], "-o", str(dest)], check=True)
        buf = dest.read_bytes()
        digest = hashlib.sha256(buf).hexdigest()
        if file.get("sha256") and digest != file["sha256"]:
            raise ValueError("Source checksum mismatch: " + file["name"])
        hashes[file["name"]] = digest
        if file["name"].endswith(".jsonl.gz"):
            rows = [json.loads(line) for line in gzip.decompress(buf).splitlines() if line]
            if len(rows) != file["rows"]:
                raise ValueError("Source row count mismatch: " + file["name"])
            tables[file["name"].split(".")[0]] = rows

    sources = {r["id"]: r for r in tables["sources"]}
    langs = {r["id"]: r for r in tables["languages"]}
    categories = {r["id"]: r["name"] for r in tables["category_types"]}
    kaylos = {r["id"]: r["name"] for r in tables["kaylos"]}
    roots = {r["id"]: r for r in tables["roots"] if r["review_status"] == "verified"}
    glosses = collections.defaultdict(list)
    words = collections.defaultdict(list)
    for r in tables["glosses"]:
        if r["review_status"] == "verified":
            glosses[r["lexeme_id"]].append(r)
    for r in tables["words"]:
        if r["review_status"] == "verified" and r["is_theoretical"] is False and not r.get("merged_into_id"):
            words[r["lexeme_id"]].append(r)

    etymologies = collections.defaultdict(list)
    for e in sorted(tables["etymologies"], key=lambda r: (r["sort_order"], r["id"])):
        if e["review_status"] == "verified":
            language = langs.get(e.get("language_id"), {})
            etymologies[e["lexeme_id"]].append(dict(id=e["id"], language=language.get("name"),
                lang=language.get("iso_code"), rtl=bool(language.get("is_rtl")), word=plain(e.get("source_word")),
                meaning=plain(e.get("meaning")), notes=plain(e.get("notes")), bracket=e.get("bracket")))

    def translits(row):
        return {code: row[field] for code, field in [("sedra3", "translit_sedra3"), ("sedra4", "translit_sedra4"),
                ("calcode", "transliteration_cal"), ("leiden", "translit_leiden"), ("hugoye", "translit_hugoye")]
                if row.get(field)}

    def etym_html(lid):
        rows = []
        for e in etymologies[lid]:
            word = esc(e["word"])
            if e["bracket"] == "parenthesized": word = "(" + word + ")"
            if e["bracket"] == "bracketed": word = "[" + word + "]"
            rows.append(f'<li data-etymology-id="{e["id"]}"><small>{esc(e["language"])}</small> <bdi lang="{esc(e["lang"])}" dir="{"rtl" if e["rtl"] else "ltr"}">{word}</bdi>{" — " + esc(e["meaning"]) if e["meaning"] else ""}{" · " + esc(e["notes"]) if e["notes"] else ""} <cite>SEDRA · Etymology #{e["id"]}</cite></li>')
        return '<section class="sedra-etymologies"><h4>Etymology</h4><ul>' + ''.join(rows) + '</ul></section>' if rows else ''

    def credit(source_id, reference):
        source = sources.get(source_id, {})
        name = source.get("abbreviation") or source.get("full_name") or "SEDRA"
        return f'<cite title="{esc(source.get("full_name", name))}">{esc(name)}{": " + esc(reference) if reference else ""}</cite>'

    def syr(text):
        return f'<bdi lang="syr" dir="rtl">{esc(text)}</bdi>'

    heads, keys, articles, ids = [], [], [], []
    count_glosses = count_words = 0
    for lex in sorted(tables["lexemes"], key=lambda r: r["id"]):
        if lex["review_status"] != "verified" or lex.get("merged_into_id"):
            continue
        lid, form = lex["id"], lex["syriac"]
        vocal = lex.get("syriac_vocalized") or form
        heads.append([vocal])
        # Search aliases are kept out of the displayed headword. Several lexemes
        # can share a spelling: the dictionary returns every exact candidate.
        alias = {form, vocal}
        for word in words[lid]:
            alias.update(x for x in [word["syriac"], word.get("syriac_vocalized_west"), word.get("syriac_vocalized_east")] if x)
        keys.append(sorted(alias))
        ids.append(lid)
        grouped = collections.defaultdict(list)
        for g in sorted(glosses[lid], key=lambda r: (r["sort_order"], r["id"])):
            language = langs[g["language_id"]]
            text = " ".join(plain(g.get(k)) for k in ["prefix", "meaning", "postfix"] if g.get(k))
            note = plain(g.get("notes"))
            if note:
                text = (note + " " + text) if g.get("notes_position") == "before" else (text + " " + note)
            if text:
                qualifier = kaylos.get(g.get("kaylo_id")) or g.get("verb_type") or ""
                grouped[language["id"]].append(f'<li><span lang="{esc(language["iso_code"])}" dir="{"rtl" if language["is_rtl"] else "ltr"}">{esc(text)}</span>{" <small>" + esc(qualifier) + "</small>" if qualifier else ""} {credit(g.get("source_id"), g.get("source_reference"))}</li>')
        sections = []
        # English is the default gloss language, not an invented German gloss.
        for lang_id in sorted(grouped, key=lambda i: (langs[i]["name"] != "English", langs[i]["name"])):
            lang = langs[lang_id]
            sections.append(f'<div class="sedra-language"><small>{esc(lang["name"])}</small><ul>{"".join(grouped[lang_id])}</ul></div>')
        root = roots.get(lex.get("root_id"))
        root_html = f'<div class="sedra-root"><small>Root</small> {syr(root["syriac"])} <small>({esc(root["kind"])})</small> {credit(root.get("source_id"),root.get("source_reference"))}</div>' if root else ''
        cat = " · ".join(x for x in [categories.get(lex.get("category_type_id")), kaylos.get(lex.get("kaylo_id"))] if x)
        forms = sorted({w.get("syriac_vocalized_west") or w.get("syriac_vocalized_east") or w["syriac"] for w in words[lid]})
        forms_html = '<details class="sedra-forms"><summary>Forms · ' + str(len(forms)) + '</summary><div>' + ' · '.join(syr(f) for f in forms) + '</div></details>' if forms else ''
        articles.append(f'<div class="sedra-entry" data-sedra-id="{lid}"><div class="sedra-lemma">{syr(vocal)} <small>{esc(cat)}</small></div>{"".join(sections)}{root_html}{etym_html(lid)}{forms_html}<p class="sedra-credit">{credit(lex.get("source_id"),lex.get("source_reference"))} · SEDRA #{lid} · Beth Mardutho · CC BY-NC 4.0 · 5.0 (2026-10-24)</p></div>')
        count_glosses += len(glosses[lid])
        count_words += len(words[lid])
    data = dict(name=NAME, indexLang="Syriac", contentsLang="Multilingual", heads=heads, keys=keys, html=articles,
                sedra=dict(ids=ids, release=manifest["version"], source=manifest["url"], license=manifest["license"], licenseUrl=manifest["licenseUrl"]))
    buf = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    out = ROOT / "bundled" / "dict"
    (out / (ID + ".json.gz")).write_bytes(gzip.compress(buf, compresslevel=9, mtime=0))
    catalog_path = out / "manifest.json"
    catalog = json.loads(catalog_path.read_text())
    catalog["items"] = [x for x in catalog["items"] if x["id"] != ID]
    catalog["items"].append(dict(id=ID, name=NAME, count=len(ids), hash=hashlib.sha1(buf).hexdigest()))
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + "\n")
    # Structured, lazily loaded word-card data. Only explicit upstream ids link families.
    set_ids = set(ids)
    card_lex = {}
    for lex in tables["lexemes"]:
        lid = lex["id"]
        if lid not in set_ids:
            continue
        meanings = []
        for g in sorted(glosses[lid], key=lambda r: (langs[r["language_id"]]["name"] != "English", r["sort_order"], r["id"])):
            text = " ".join(plain(g.get(k)) for k in ["prefix", "meaning", "postfix"] if g.get(k))
            if g.get("notes"):
                text = (plain(g["notes"]) + " " + text) if g.get("notes_position") == "before" else (text + " " + plain(g["notes"]))
            if text:
                meanings.append([text, langs[g["language_id"]]["name"], g.get("source_id"), g.get("source_reference")])
        card_lex[lid] = dict(form=lex["syriac"], vocal=lex.get("syriac_vocalized"), root=lex.get("root_id") if lex.get("root_id") in roots else None,
                             category=categories.get(lex.get("category_type_id")), stem=kaylos.get(lex.get("kaylo_id")),
                             meanings=meanings, source=lex.get("source_id"), reference=lex.get("source_reference"),
                             etymologies=etymologies[lid], transliterations=translits(lex))
    fields = ["id", "syriac", "syriac_vocalized_west", "syriac_vocalized_east", "stem_id", "kaylo_id", "tense_id", "person_id", "gender_id", "number_id", "state_id", "suffix_type", "suffix_person_id", "suffix_gender_id", "suffix_number_id", "source_id", "source_reference", "transliteration_east", "transliteration_west"]
    card_data = dict(version=1, release=manifest["version"], source=manifest["url"], license=manifest["license"],
        lexemes=card_lex, roots={i: {k: r.get(k) for k in ["syriac", "kind", "source_id", "source_reference"]} for i,r in roots.items()},
        wordFields=fields, words={i: [[w.get(k) for k in fields] for w in rows] for i,rows in words.items() if i in set_ids},
        tables={name:{r["id"]:r for r in tables[name]} for name in ["stems", "kaylos", "tenses", "persons", "genders", "numbers", "states", "sources"]})
    translit_data = dict(version=1, release=manifest["version"], source=manifest["url"], license=manifest["license"],
        schemes=tables["transliteration_schemes"], patterns=tables["transliteration_patterns"])
    translit_bytes = ("// Original SEDRA transliteration mappings, CC BY-NC 4.0.\nwindow.SYRIAC_TRANSLITERATION_DATA=" + json.dumps(translit_data, ensure_ascii=False, separators=(",", ":")) + ";\n").encode()
    (ROOT / "syriac-transliteration-data.js").write_bytes(translit_bytes)
    card_bytes = ("// Generated by tools/sedra/build.py; SEDRA 5.0, CC BY-NC 4.0.\nwindow.SEDRA_DATA=" + json.dumps(card_data, ensure_ascii=False, separators=(",", ":")) + ";\n").encode()
    (ROOT / "sedra-data.js").write_bytes(card_bytes)
    report = dict(id=ID, name=NAME, lexemes=len(ids), glosses=count_glosses, attestedWords=count_words,
                  sourceHashes=hashes, etymologies=sum(len(v) for v in etymologies.values()), transliterationSha256=hashlib.sha256(translit_bytes).hexdigest(), cardSha256=hashlib.sha256(card_bytes).hexdigest(), sha256=hashlib.sha256(buf).hexdigest(), bytes=len(buf))
    (HERE / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "sourceHashes"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
