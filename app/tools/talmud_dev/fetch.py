# talmud.dev: Sugja-Abschnitte (argument) und Argumentationsschritte (argument-move) für alle Traktate, en + he
import json, subprocess, time, os, sys
from concurrent.futures import ThreadPoolExecutor
T = [('Berakhot','2a','64a'),('Shabbat','2a','157b'),('Eruvin','2a','105a'),('Pesachim','2a','121b'),('Shekalim','2a','22b'),('Yoma','2a','88a'),('Sukkah','2a','56b'),('Beitzah','2a','40b'),('Rosh_Hashanah','2a','35a'),('Taanit','2a','31a'),('Megillah','2a','32a'),('Moed_Katan','2a','29a'),('Chagigah','2a','27a'),('Yevamot','2a','122b'),('Ketubot','2a','112b'),('Nedarim','2a','91b'),('Nazir','2a','66b'),('Sotah','2a','49b'),('Gittin','2a','90b'),('Kiddushin','2a','82b'),('Bava_Kamma','2a','119b'),('Bava_Metzia','2a','119a'),('Bava_Batra','2a','176b'),('Sanhedrin','2a','113b'),('Makkot','2a','24b'),('Shevuot','2a','49b'),('Avodah_Zarah','2a','76b'),('Horayot','2a','14a'),('Zevachim','2a','120b'),('Menachot','2a','110a'),('Chullin','2a','142a'),('Bekhorot','2a','61a'),('Arakhin','2a','34a'),('Temurah','2a','34a'),('Keritot','2a','28b'),('Meilah','2a','22a'),('Tamid','25b','33b'),('Niddah','2a','73a')]
def pages(a, b):
    k = lambda p: int(p[:-1]) * 2 + (p[-1] == 'b')
    return [f'{n // 2}{"ab"[n % 2]}' for n in range(k(a), k(b) + 1)]
def get(url):
    for t in range(4):
        r = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(5 * (t + 1))
    return None
def slim(d):
    if not d: return None
    P = d.get('pieces') or {}; o = {}
    for k in ('argument', 'argument-move'):
        o[k] = [{'s': i.get('startSegIdx'), 'e': i.get('endSegIdx'), 'f': i.get('fields')} for i in ((P.get(k) or {}).get('parsed') or {}).get('instances', [])]
    o['summary'] = ((P.get('argument') or {}).get('parsed') or {}).get('summary')
    return o
def one(tr, p):
    f = f'raw/{tr}/{p}.json'
    if os.path.exists(f): return
    en = slim(get(f'https://talmud.dev/api/daf-view/{tr}/{p}')); time.sleep(0.8)
    he = slim(get(f'https://talmud.dev/api/daf-view/{tr}/{p}?lang=he')); time.sleep(0.8)
    os.makedirs(f'raw/{tr}', exist_ok=True)
    json.dump({'en': en, 'he': he}, open(f, 'w'), ensure_ascii=False)
if __name__ == '__main__':
  jobs = [(tr, p) for tr, a, b in T for p in pages(a, b)]
  print(len(jobs), 'Amudim', flush=True)
  with ThreadPoolExecutor(5) as ex:
    for n, _ in enumerate(ex.map(lambda j: one(*j), jobs)):
        if n % 200 == 0: print(n, time.strftime('%H:%M'), flush=True)
  print('fertig', flush=True)
