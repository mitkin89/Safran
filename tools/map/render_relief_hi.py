#!/usr/bin/env python3
"""Feines Relief für das Land Israel und Umgebung als Kachelpyramide (map/hi/<stufe>/<x>_<y>.jpg + map/hi/meta.js).
Aufruf: render_relief_hi.py <ordner mit dem_hi.npy, sea_hi.npy, lake_hi.npy> <map/relief.jpg> <map/hi>
Gleiche Höhenfarben und gleiche Beleuchtung wie render_relief.py. Damit die Kacheln nahtlos auf relief.jpg liegen,
- stammt die großräumige Schummerung aus demselben auf 150 Pixel/Grad gemittelten Gelände (dreifach überhöht) wie dort;
  nur die Abweichung des feinen Geländes davon kommt (schwächer überhöht) hinzu;
- geht der Rand des Ausschnitts weich in das vergrößerte relief.jpg über.
Meer und Seen: Wassermaske (WBM) des Copernicus DEM. Flüsse sind nicht eingezeichnet (die Karte zeichnet sie als Linien, map/water.js).
Benötigt: pip install numpy pillow"""
import sys, os, math, json, numpy as np
from PIL import Image
src, relief, out = sys.argv[1], sys.argv[2], sys.argv[3]
Image.MAX_IMAGE_PIXELS = None
PPD0, K = 150, 0.84                      # Grundkarte: Pixel je Breitengrad, Stauchung der Länge
X0, Y0, X1, Y1 = 1232, 1240, 1632, 1912  # Ausschnitt in Pixeln von relief.jpg (33,78–36,95° O, 29,25–33,73° N)
F = 16                                   # feinste Stufe: 2400 Pixel je Grad (~46 m)
TS = 512; LEVELS = [4, 8, 16]; QUAL = 80
EX_BASE, EX_FINE = 3.0, 1.25             # Überhöhung: großräumig wie relief.jpg, Feinheiten schwächer
RAMP = 12                                # Breite des weichen Rands (Pixel von relief.jpg)
DX0 = round((33 - 24) * PPD0 * K); DY0 = (42 - 34) * PPD0     # Ursprung des DEM-Mosaiks (33° O, 34° N) in relief-Pixeln
PAD = 4                                  # Rand (relief-Pixel) für Glättung und Gradient
def crop(a):
    return a[(Y0 - PAD - DY0) * F:(Y1 + PAD - DY0) * F, (X0 - PAD - DX0) * F:(X1 + PAD - DX0) * F]
z = crop(np.load(os.path.join(src, 'dem_hi.npy'), mmap_mode='r')).astype('float32')
H, W = z.shape; h0, w0 = H // F, W // F
# großräumiges Gelände: Mittel über 16x16 (= Raster von relief.jpg), bikubisch zurück vergrößert
zl = z.reshape(h0, F, w0, F).mean(axis=(1, 3))
zs = np.array(Image.fromarray(zl, mode='F').resize((W, H), Image.BICUBIC))
ze = EX_BASE * zs + EX_FINE * (z - zs); del zs
mpp_y = 111320 / (PPD0 * F); mpp_x = mpp_y * math.cos(math.radians(33)) / K
gy, gx = np.gradient(ze, mpp_y, mpp_x); del ze
az = math.radians(315); alt = math.radians(40)
slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(gy, -gx); del gx, gy
hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1).astype('float32'); del slope, aspect
stops = [(-500, (168, 184, 140)), (0, (160, 186, 128)), (200, (196, 208, 150)), (500, (226, 214, 160)), (1000, (214, 180, 126)), (1600, (190, 150, 110)), (2300, (168, 140, 120)), (3200, (190, 180, 175)), (4500, (240, 240, 240))]
shade = 0.35 + 0.9 * hs; del hs
sea = crop(np.load(os.path.join(src, 'sea_hi.npy'), mmap_mode='r')).astype('float32') / 255
lake = crop(np.load(os.path.join(src, 'lake_hi.npy'), mmap_mode='r')).astype('float32') / 255
SEA = (120, 160, 190); LAKE = (135, 172, 198)
p = PAD * F; rgb = np.zeros((H - 2 * p, W - 2 * p, 3), 'uint8'); sl = (slice(p, H - p), slice(p, W - p))
# weicher Rand zu relief.jpg
base = Image.open(relief).convert('RGB').crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * F, (Y1 - Y0) * F), Image.BICUBIC)
hh, ww = rgb.shape[:2]; yy = np.arange(hh, dtype='float32')[:, None]; xx = np.arange(ww, dtype='float32')[None, :]
e = np.minimum(np.minimum(xx, ww - 1 - xx), np.minimum(yy, hh - 1 - yy)) / (RAMP * F); e = np.clip(e, 0, 1); e = e * e * (3 - 2 * e)
for c in range(3):
    v = np.interp(z[sl], [s[0] for s in stops], [s[1][c] for s in stops]).astype('float32') * shade[sl]
    v = v * (1 - sea[sl]) + SEA[c] * sea[sl]; v = v * (1 - lake[sl]) + LAKE[c] * lake[sl]
    b = np.asarray(base.getchannel(c), dtype='float32')
    rgb[..., c] = np.clip(v * e + b * (1 - e), 0, 255)
full = Image.fromarray(rgb); seaf = Image.fromarray((sea[sl] * 255).astype('uint8')); del rgb
os.makedirs(out, exist_ok=True); meta = {'x0': X0, 'y0': Y0, 'w': X1 - X0, 'h': Y1 - Y0, 'ts': TS, 'lv': []}; total = 0; n = 0
for li, f in enumerate(LEVELS):
    im = full if f == F else full.resize((ww * f // F, hh * f // F), Image.LANCZOS)
    sm = np.asarray(seaf if f == F else seaf.resize(im.size, Image.BOX))
    nx = math.ceil(im.width / TS); ny = math.ceil(im.height / TS); have = ''
    os.makedirs(os.path.join(out, str(li)), exist_ok=True)
    for ty in range(ny):
        for tx in range(nx):
            bx = (tx * TS, ty * TS, min(im.width, tx * TS + TS), min(im.height, ty * TS + TS))
            if sm[bx[1]:bx[3], bx[0]:bx[2]].min() >= 250: have += '0'; continue   # nur offenes Meer: keine Kachel
            fn = os.path.join(out, str(li), f'{tx}_{ty}.jpg'); im.crop(bx).save(fn, quality=QUAL, optimize=True, progressive=True)
            total += os.path.getsize(fn); n += 1; have += '1'
    meta['lv'].append({'f': f, 'nx': nx, 'ny': ny, 'w': im.width, 'h': im.height, 'have': have})
open(os.path.join(out, 'meta.js'), 'w').write('// Kachelpyramide des feinen Reliefs (tools/map/render_relief_hi.py); x0,y0,w,h in Pixeln von relief.jpg, f = Vergrößerung der Stufe\nwindow.BMAPHI = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print(n, 'Kacheln', round(total / 1e6, 2), 'MB')
