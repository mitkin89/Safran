Karte (Orte, Relief, Grenzen) – wie die Daten entstanden sind
  fetch_dem.py       Copernicus-DEM (90 m) für 24–52°O, 24–42°N, Mittelwerte auf ~740 m  -> dem.npy
  render_relief.py   Schummerung + Höhenfarben + Natural-Earth-Küsten/Flüsse/Seen -> map/relief.jpg
  build_places.py    OpenBible.info Bible Geocoding Data (CC BY 4.0) -> map/places.js (Verse auf hebräische Zählung)
  Grenzen/Ländernamen: Natural Earth ne_10m_admin_0_boundary_lines_land + ne_10m_admin_0_countries -> map/borders.js
Quellen: Copernicus DEM (EU Copernicus), Natural Earth (gemeinfrei), OpenBible.info (CC BY 4.0)

  build_elev.py      dem.npy -> map/elev.js (Höhenraster für Profil/Ortshöhen)
  build_routes.py    UBS Bible Routes (github.com/ubsicap/ubs-open-license, CC BY-SA 4.0) -> map/routes.js
  extract_topostext.py / build_josephus.py  ToposText-Werkseite (HTML) + Gazetteer -> Abschnitt->Orte -> map/josephus.js (ODC-BY)


Jerusalem-Detailkarte (map/jer/)
--------------------------------
osm.js, dem.js  <- python3 build_jerusalem.py israel_and_palestine.osm.pbf map/jer
                   (OSM-Extrakt von download.openstreetmap.fr, Copernicus DEM GLO-30 per rasterio)
wilson.jpg      <- "1865 Ordnance Survey of Jerusalem Old City full map.jpg" (Wikimedia Commons, gemeinfrei),
                   zugeschnitten (x 500-11950, y 1000-16350 der 12000x17474-Datei; Zeichenerklärung am Rand weiß) und auf 30 % verkleinert.
meta.js         <- python3 build_jer_meta.py jer_wilson_meta.json map/jer/meta.js (Ausrichtung + Namen)
Die Ausrichtung (Affine) stammt aus Passpunkten an der Altstadtmauer und wurde mit der OSM-Mauerlinie nachjustiert
(Kontrolle: Gihon-Quelle laut OSM = "Virgin's Well" bei Wilson, ~1 m Abweichung).
