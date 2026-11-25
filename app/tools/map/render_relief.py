import numpy as np, shapefile, math
from PIL import Image, ImageDraw, ImageFilter
W0,E0,S0,N0=24,52,24,42; PPD=150; K=0.84   # K = cos(33°) horizontale Stauchung
dem=np.load('dem.npy'); H,Wd=dem.shape
# sea/land mask from Natural Earth land polygons (supersampled)
SS=2; mw=int(Wd*K)*SS; mh=H*SS
def px(lon,lat): return ((lon-W0)*PPD*K*SS, (N0-lat)*PPD*SS)
def poly_mask(shp, fill=255):
    im=Image.new('L',(mw,mh),0); d=ImageDraw.Draw(im)
    r=shapefile.Reader(shp)
    for s in r.shapes():
        if s.bbox[2]<W0-1 or s.bbox[0]>E0+1 or s.bbox[3]<S0-1 or s.bbox[1]>N0+1: continue
        parts=list(s.parts)+[len(s.points)]
        for a,b in zip(parts[:-1],parts[1:]):
            pts=[px(*p) for p in s.points[a:b]]
            if len(pts)>2: d.polygon(pts,fill=fill)
    return im
land=poly_mask('ne_10m_land/ne_10m_land')
lakes=poly_mask('ne_10m_lakes/ne_10m_lakes')
# DEM fill & resample to final size
w=int(Wd*K); dem2=np.where(np.isnan(dem),0,dem)
d_im=Image.fromarray(dem2.astype('float32'),mode='F').resize((w,H),Image.BILINEAR)
z=np.array(d_im)
# hillshade
mpp_y=111320/PPD; mpp_x=mpp_y*math.cos(math.radians(33))/K
zs=z*3.0   # Überhöhung
gy,gx=np.gradient(zs,mpp_y,mpp_x)
az=math.radians(315); alt=math.radians(40)
slope=np.arctan(np.hypot(gx,gy)); aspect=np.arctan2(gy,-gx)
hs=np.sin(alt)*np.cos(slope)+np.cos(alt)*np.sin(slope)*np.cos(az-aspect)
hs=np.clip(hs,0,1)
# Höhenfarben
stops=[(-500,(168,184,140)),(0,(160,186,128)),(200,(196,208,150)),(500,(226,214,160)),(1000,(214,180,126)),(1600,(190,150,110)),(2300,(168,140,120)),(3200,(190,180,175)),(4500,(240,240,240))]
def tint(z):
    out=np.zeros(z.shape+(3,),'float32')
    for c in range(3):
        out[...,c]=np.interp(z,[s[0] for s in stops],[s[1][c] for s in stops])
    return out
col=tint(z)
shade=(0.35+0.9*hs)[...,None]
rgb=np.clip(col*shade,0,255)
img=Image.fromarray(rgb.astype('uint8'))
nanm=Image.fromarray((np.isnan(dem)*255).astype('uint8')).resize((w,H),Image.BILINEAR)
lm=np.array(land.resize((w,H),Image.LANCZOS))/255.0
lm=np.minimum(lm,1-np.array(nanm)/255.0)
yy,xx=np.mgrid[0:H,0:w]; lon=W0+xx/(PPD*K); lat=N0-yy/PPD
casp=((lon>46.5)&(lat>36.3)&(z<-12)).astype('float32')   # Kaspisches Meer (liegt in Natural Earth als Land)
lm=np.minimum(lm,1-np.array(Image.fromarray((casp*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))/255.0)
km=np.array(lakes.resize((w,H),Image.LANCZOS))/255.0
sea=np.array([120,160,190],'float32'); lake=np.array([135,172,198],'float32')
a=np.array(img).astype('float32')
a=a*lm[...,None]+sea*(1-lm[...,None])
a=a*(1-km[...,None])+lake*km[...,None]
img=Image.fromarray(np.clip(a,0,255).astype('uint8'))
# Flüsse
d=ImageDraw.Draw(img)
r=shapefile.Reader('ne_10m_rivers_lake_centerlines/ne_10m_rivers_lake_centerlines')
for s in r.shapes():
    if s.bbox[2]<W0 or s.bbox[0]>E0 or s.bbox[3]<S0 or s.bbox[1]>N0: continue
    parts=list(s.parts)+[len(s.points)]
    for a0,b0 in zip(parts[:-1],parts[1:]):
        pts=[((x-W0)*PPD*K,(N0-y)*PPD) for x,y in s.points[a0:b0]]
        if len(pts)>1: d.line(pts,fill=(96,140,178),width=2)
img.save('relief.jpg',quality=86,optimize=True); print(img.size)
import os;print(os.path.getsize('relief.jpg')/1e6,'MB')
