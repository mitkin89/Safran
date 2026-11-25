#!/usr/bin/env python3
"""Holt das Copernicus DEM GLO-30 (1 Bogensekunde) samt Wassermaske (WBM) für das Land Israel und Umgebung
und rechnet es auf das Raster der feinsten Kachelstufe um (2400 Pixel je Breitengrad, 2400*0,84 je Längengrad).
Aufruf: fetch_dem_hi.py <cache-ordner> <ausgabeordner>   -> dem_hi.npy (float32, m), sea_hi.npy, lake_hi.npy (uint8, Flächenanteil 0–255)
Quelle: https://copernicus-dem-30m.s3.amazonaws.com/ (Copernicus DEM, © DLR e.V. 2010-2014 und © Airbus Defence and Space GmbH 2014-2018,
bereitgestellt im Rahmen des Copernicus-Programms der EU und der ESA). Benötigt: pip install rasterio numpy pillow"""
import sys, os, urllib.request, numpy as np, rasterio
from rasterio.enums import Resampling
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
cache, out = sys.argv[1], sys.argv[2]; os.makedirs(cache, exist_ok=True); os.makedirs(out, exist_ok=True)
LON0, LON1, LAT0, LAT1 = 33, 37, 29, 34          # ganze Gradkacheln
PPD = 2400; K = 0.84; PX = round(PPD * K)        # 2016 Pixel je Längengrad
BASE = 'https://copernicus-dem-30m.s3.amazonaws.com/'
def name(la, lo): return f'Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00'
def fetch(u, p):
    if os.path.exists(p) and os.path.getsize(p) > 0: return True
    try: urllib.request.urlretrieve(u, p + '.part'); os.replace(p + '.part', p); return True
    except Exception as e: print('fehlt', u, e); return False
def get(t):
    la, lo = t; n = name(la, lo)
    a = fetch(f'{BASE}{n}_DEM/{n}_DEM.tif', os.path.join(cache, n + '_DEM.tif'))
    b = fetch(f'{BASE}{n}_DEM/AUXFILES/{n}_WBM.tif', os.path.join(cache, n + '_WBM.tif'))
    return t, a, b
tiles = [(la, lo) for la in range(LAT0, LAT1) for lo in range(LON0, LON1)]
H = (LAT1 - LAT0) * PPD; W = (LON1 - LON0) * PX
dem = np.zeros((H, W), 'float32'); sea = np.zeros((H, W), 'uint8'); lake = np.zeros((H, W), 'uint8')
with ThreadPoolExecutor(4) as ex: got = list(ex.map(get, tiles))
for (la, lo), a, b in got:
    y = (LAT1 - la - 1) * PPD; x = (lo - LON0) * PX; n = name(la, lo)
    if not a: sea[y:y + PPD, x:x + PX] = 255; continue      # Kachel fehlt = offenes Meer
    with rasterio.open(os.path.join(cache, n + '_DEM.tif')) as ds:
        dem[y:y + PPD, x:x + PX] = ds.read(1, out_shape=(PPD, PX), resampling=Resampling.average)
    if b:
        with rasterio.open(os.path.join(cache, n + '_WBM.tif')) as ds: m = ds.read(1)   # 0 Land, 1 Meer, 2 See, 3 Fluss
        f = lambda mask: np.array(Image.fromarray((mask * 255).astype('uint8')).resize((PX, PPD), Image.BOX))
        sea[y:y + PPD, x:x + PX] = f(m == 1); lake[y:y + PPD, x:x + PX] = f(m == 2)
    print(n, 'ok', flush=True)
np.save(os.path.join(out, 'dem_hi.npy'), dem); np.save(os.path.join(out, 'sea_hi.npy'), sea); np.save(os.path.join(out, 'lake_hi.npy'), lake)
print(dem.shape, float(dem.min()), float(dem.max()))
