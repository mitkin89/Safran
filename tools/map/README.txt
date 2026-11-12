Karte (Orte, Relief, Grenzen) – wie die Daten entstanden sind
  fetch_dem.py       Copernicus-DEM (90 m) für 24–52°O, 24–42°N, Mittelwerte auf ~740 m  -> dem.npy
  render_relief.py   Schummerung + Höhenfarben + Natural-Earth-Küsten/Flüsse/Seen -> map/relief.jpg
  build_places.py    OpenBible.info Bible Geocoding Data (CC BY 4.0) -> map/places.js (Verse auf hebräische Zählung)
  Grenzen/Ländernamen: Natural Earth ne_10m_admin_0_boundary_lines_land + ne_10m_admin_0_countries -> map/borders.js
Quellen: Copernicus DEM (EU Copernicus), Natural Earth (gemeinfrei), OpenBible.info (CC BY 4.0)

  build_elev.py      dem.npy -> map/elev.js (Höhenraster für Profil/Ortshöhen)
  build_routes.py    UBS Bible Routes (github.com/ubsicap/ubs-open-license, CC BY-SA 4.0) -> map/routes.js
  build_alma.py      ALMA (Ido Wachtel, HUJI GIS; ArcGIS-Layer Place_Name_Alma, Abfrage where=1=1) + Sefaria-API -> map/alma.js
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


Feinere Karte für das Land Israel und Umgebung (map/hi/, map/water.js, map/roads.js, map/towns.js)
--------------------------------------------------------------------------------------------------
Ausschnitt: 33,78–36,95° O, 29,25–33,73° N (Pixel 1232–1632 × 1240–1912 von relief.jpg).
map/hi/         <- python3 fetch_dem_hi.py <cache> <arbeit>           Copernicus DEM GLO-30 + Wassermaske (WBM) von copernicus-dem-30m.s3.amazonaws.com -> dem_hi.npy, sea_hi.npy, lake_hi.npy
                   python3 render_relief_hi.py <arbeit> map/relief.jpg map/hi
                   Kachelpyramide (JPEG, 512 px): Stufe 0 = 600, 1 = 1200, 2 = 2400 Pixel je Grad (~185/93/46 m), 322 Kacheln, ~9,5 MB; meta.js nennt die vorhandenen Kacheln.
                   Farben und Beleuchtung wie render_relief.py; der Rand geht weich in relief.jpg über. Die Karte lädt nur die sichtbaren Kacheln der passenden Stufe (library.js, mapHiDraw).
map/water.js    <- python3 build_water.py map/water.js <arbeit> <…/waterways.geojson> …
                   OSM-Gewässer (waterway=river/stream/wadi) aus den HOT-Exporten hotosm_<isr|pse|jor|syr|lbn|egy>_waterways (data.humdata.org, ODbL), in fünf Klassen + Namen.
map/roads.js    <- python3 build_roads.py itinere_roads.geojson map/roads.js
                   Itiner-e static version 2024 (https://doi.org/10.5281/zenodo.17122148, CC BY 4.0), auf den Kartenausschnitt beschnitten und vereinfacht.
map/towns.js    <- python3 build_towns.py ne_10m_populated_places map/towns.js israel_and_palestine.osm.pbf lebanon.osm.pbf <jor|syr|egy>/populated_places.geojson
                   Natural Earth populated places (ganze Karte, mit deutschen/hebräischen Namen) + OSM place=city/town im Ausschnitt
                   (Extrakte von download.openstreetmap.fr; Jordanien, Syrien, Ägypten: HOT-Exporte hotosm_<…>_populated_places).
