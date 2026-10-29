import * as Cesium from 'cesium';

// Major global river basins and active monitored flood zones
export const MONITORED_FLOOD_BASINS = Object.freeze([
  { id: 'brahmaputra', name: 'Brahmaputra & Assam Basin', country: 'India / Bangladesh', river: 'Brahmaputra', lat: 26.2, lon: 92.9, severity: 'Severe', status: 'Monsoonal Inundation & Bank Erosion', inundationRadiusKm: 120 },
  { id: 'yangtze', name: 'Middle Yangtze River Basin', country: 'China', river: 'Yangtze', lat: 30.5, lon: 114.3, severity: 'Warning', status: 'Crest Level High Water', inundationRadiusKm: 140 },
  { id: 'indus', name: 'Indus River Floodplain (Sindh)', country: 'Pakistan', river: 'Indus', lat: 27.5, lon: 68.8, severity: 'Severe', status: 'Extreme Runoff & Surcharge', inundationRadiusKm: 130 },
  { id: 'danube', name: 'Danube Basin Lowlands', country: 'Central Europe (Austria/Slovakia/Hungary)', river: 'Danube', lat: 47.9, lon: 17.6, severity: 'Moderate', status: 'River Floodplain High Water', inundationRadiusKm: 100 },
  { id: 'rio_grande_sul', name: 'Guaíba / Jacuí River Basin', country: 'Brazil (Rio Grande do Sul)', river: 'Taquari-Antas / Jacuí', lat: -29.9, lon: -51.2, severity: 'Severe', status: 'Catastrophic Basin Inundation', inundationRadiusKm: 110 },
  { id: 'mississippi', name: 'Lower Mississippi Floodway', country: 'United States', river: 'Mississippi', lat: 32.3, lon: -90.9, severity: 'Advisory', status: 'Spillway & Backwater Swell', inundationRadiusKm: 100 },
  { id: 'rhine_meuse', name: 'Rhine-Meuse Delta', country: 'Netherlands / Germany', river: 'Rhine / Waal', lat: 51.8, lon: 5.3, severity: 'Moderate', status: 'Surge Barriers & Tidal Retention', inundationRadiusKm: 85 },
  { id: 'mekong_delta', name: 'Mekong River Delta', country: 'Vietnam / Cambodia', river: 'Mekong (Tiền / Hậu)', lat: 10.3, lon: 105.8, severity: 'Warning', status: 'Seasonal Flood Pulse Inundation', inundationRadiusKm: 115 },
  { id: 'valencia_flash', name: 'Turia / Magro Basin Flash Flood Area', country: 'Spain', river: 'Rambla del Poyo / Magro', lat: 39.4, lon: -0.4, severity: 'Severe', status: 'Torrential Runoff Inundation', inundationRadiusKm: 70 },
  { id: 'congo_basin', name: 'Middle Congo River Swell', country: 'DR Congo / Republic of Congo', river: 'Congo River', lat: -4.3, lon: 15.3, severity: 'Warning', status: 'Sub-Saharan River Swell', inundationRadiusKm: 120 },
]);

const EONET_FLOODS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/categories/floods?status=all&limit=30';

/**
 * Fetch live flood disaster observations from NASA EONET and merge with monitored flood basins.
 */
export async function fetchFloodsSnapshot({ signal } = {}) {
  const floods = [...MONITORED_FLOOD_BASINS];
  try {
    const res = await fetch(EONET_FLOODS_URL, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          const geom = ev.geometry?.[0];
          if (geom) {
            let lat = null;
            let lon = null;
            if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
              [lon, lat] = geom.coordinates;
            } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0]?.[0])) {
              // Calculate centroid of first ring
              const ring = geom.coordinates[0];
              lon = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
              lat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
            }
            if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
              const exists = floods.some(f => Math.hypot(f.lat - lat, f.lon - lon) < 0.8);
              if (!exists) {
                floods.push({
                  id: `eonet-flood-${ev.id}`,
                  name: ev.title || 'Inundation Zone',
                  country: 'NASA EONET Satellite Inundation',
                  river: 'Regional Hydrological Basin',
                  lat,
                  lon,
                  severity: 'Severe',
                  status: 'Active Flood Advisory',
                  inundationRadiusKm: 80,
                  date: geom.date,
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Disasters:Floods] EONET live fetch fallback:', err.message);
  }
  return floods;
}

/**
 * Create Cesium 3D inundation polygon & water beacon entities for floods.
 */
export function populateFloodEntities(dataSource, floods) {
  dataSource.entities.removeAll();

  for (const f of floods) {
    const position = Cesium.Cartesian3.fromDegrees(f.lon, f.lat);
    const radiusMeters = (f.inundationRadiusKm || 80) * 1000;
    const isSevere = f.severity === 'Severe' || f.status.includes('Catastrophic') || f.status.includes('Extreme');

    const floodColor = isSevere
      ? Cesium.Color.fromCssColorString('#0077ff')
      : Cesium.Color.fromCssColorString('#00c853');

    // Water inundation area
    dataSource.entities.add(new Cesium.Entity({
      id: `flood:${f.id}`,
      name: f.name,
      position,
      ellipse: {
        semiMajorAxis: radiusMeters,
        semiMinorAxis: Math.round(radiusMeters * 0.75),
        material: new Cesium.ColorMaterialProperty(floodColor.withAlpha(0.28)),
        outline: true,
        outlineColor: floodColor.withAlpha(0.9),
        outlineWidth: isSevere ? 3 : 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      point: {
        pixelSize: isSevere ? 12 : 9,
        color: floodColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `💧 ${f.name}\n${f.status}`,
        font: 'bold 11px "JetBrains Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        pixelOffset: new Cesium.Cartesian2(0, -26),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: {
        disasterType: 'flood',
        name: f.name,
        country: f.country,
        river: f.river,
        basin: f.river,
        severity: f.severity,
        alertLevel: f.severity,
        status: f.status,
        inundationRadiusKm: f.inundationRadiusKm || 80,
        hazardRadiusKm: f.inundationRadiusKm || 80,
        lat: f.lat,
        lon: f.lon,
        time: f.date || new Date().toISOString(),
        sources: 'NASA Earth Observatory (EONET) · Copernicus EMS',
        description: 'Severe hydrological floodway surcharge, monsoonal river swelling, and extensive floodplain inundation.',
        safetyRecommendation: 'Evacuate floodway zones immediately. Avoid moving floodwaters, bridges with high hydraulic surcharge, and saturated earthen embankments.',
      },
    }));
  }
}
