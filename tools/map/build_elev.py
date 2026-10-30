# Höhenraster für das Höhenprofil: dem.npy (Copernicus DEM, 150 Pixel/Grad, 24-52 E, 24-42 N) -> map/elev.js
# 3x3-Mittel (50 Pixel/Grad ≈ 2 km), 8 Bit in Stufen zu 22 m (Nullpunkt -450 m), zlib + Base64.
import numpy as np, zlib, base64, sys, json
src, out = sys.argv[1], sys.argv[2]
d = np.load(src); d = np.nan_to_num(d, nan=0.0)
h, w = d.shape; f = 3; d = d[:h // f * f, :w // f * f].reshape(h // f, f, w // f, f).mean(axis=(1, 3))
OFF, STEP = -450, 22
q = np.clip(np.round((d - OFF) / STEP), 0, 255).astype(np.uint8)
z = base64.b64encode(zlib.compress(q.tobytes(), 9)).decode()
meta = {'W0': 24, 'N0': 42, 'ppd': 150 // f, 'w': q.shape[1], 'h': q.shape[0], 'off': OFF, 'step': STEP, 'z': z}
open(out, 'w').write('// Höhenraster (Copernicus DEM 90 m, grob gemittelt), siehe tools/map/build_elev.py\nwindow.BELEV=' + json.dumps(meta) + ';\n')
print(q.shape, len(z) // 1024, 'KB')
