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
        articles.append(f'<div class="sedra-entry" data-sedra-id="{lid}"><div class="sedra-lemma">{syr(vocal)} <small>{esc(cat)}</small></div>{"".join(sections)}{root_html}{forms_html}<p class="sedra-credit">{credit(lex.get("source_id"),lex.get("source_reference"))} · SEDRA #{lid} · Beth Mardutho · CC BY-NC 4.0 · 5.0 (2026-10-24)</p></div>')
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
    report = dict(id=ID, name=NAME, lexemes=len(ids), glosses=count_glosses, attestedWords=count_words,
                  sourceHashes=hashes, sha256=hashlib.sha256(buf).hexdigest(), bytes=len(buf))
    (HERE / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "sourceHashes"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
