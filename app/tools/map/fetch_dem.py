import rasterio, numpy as np, os, sys
from concurrent.futures import ThreadPoolExecutor
W,E,S,N=24,52,24,42; PPD=150
H=(N-S)*PPD; Wd=(E-W)*PPD
arr=np.full((H,Wd),np.nan,dtype='float32')
env=rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_MAX_RETRY='3',GDAL_HTTP_TIMEOUT='60',GDAL_HTTP_MULTIPLEX='YES')
def get(t):
    lat,lon=t
    u=f'/vsicurl/https://copernicus-dem-90m.s3.amazonaws.com/Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM/Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM.tif'
    try:
        with env, rasterio.open(u) as ds:
            return t, ds.read(1,out_shape=(PPD,PPD),resampling=rasterio.enums.Resampling.average)
    except Exception as e:
        return t,None
tiles=[(la,lo) for la in range(S,N) for lo in range(W,E)]
miss=0
with ThreadPoolExecutor(16) as ex:
    for (la,lo),d in ex.map(get,tiles):
        if d is None: miss+=1; continue
        y=(N-la-1)*PPD; x=(lo-W)*PPD; arr[y:y+PPD,x:x+PPD]=d
print('missing',miss,'of',len(tiles))
np.save('dem.npy',arr)
