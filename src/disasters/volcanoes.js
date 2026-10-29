import * as Cesium from 'cesium';

// Curated active & monitored Holocene volcanoes worldwide
export const GLOBAL_VOLCANOES_DATASET = Object.freeze([
  { id: 'etna', name: 'Mount Etna', country: 'Italy', type: 'Stratovolcano', elevationM: 3357, lat: 37.751, lon: 14.993, status: 'Active Eruption', alertLevel: 'Warning', hazardRadiusKm: 35 },
  { id: 'kilauea', name: 'Kilauea', country: 'United States (Hawaii)', type: 'Shield volcano', elevationM: 1222, lat: 19.421, lon: -155.287, status: 'Active Eruption', alertLevel: 'Watch', hazardRadiusKm: 30 },
  { id: 'stromboli', name: 'Stromboli', country: 'Italy', type: 'Stratovolcano', elevationM: 924, lat: 38.789, lon: 15.213, status: 'Continuous Eruption', alertLevel: 'Watch', hazardRadiusKm: 20 },
  { id: 'popocatepetl', name: 'Popocatépetl', country: 'Mexico', type: 'Stratovolcano', elevationM: 5426, lat: 19.023, lon: -98.622, status: 'Active Ash Emissions', alertLevel: 'Warning', hazardRadiusKm: 45 },
  { id: 'sakurajima', name: 'Sakurajima', country: 'Japan', type: 'Stratovolcano', elevationM: 1117, lat: 31.585, lon: 130.657, status: 'Explosive Eruption', alertLevel: 'Warning', hazardRadiusKm: 25 },
  { id: 'merapi', name: 'Mount Merapi', country: 'Indonesia', type: 'Stratovolcano', elevationM: 2910, lat: -7.540, lon: 110.446, status: 'Pyroclastic Flows', alertLevel: 'Warning', hazardRadiusKm: 35 },
  { id: 'fuego', name: 'Volcán de Fuego', country: 'Guatemala', type: 'Stratovolcano', elevationM: 3763, lat: 14.473, lon: -90.880, status: 'Strombolian Eruptions', alertLevel: 'Warning', hazardRadiusKm: 30 },
  { id: 'semeru', name: 'Semeru', country: 'Indonesia', type: 'Stratovolcano', elevationM: 3676, lat: -8.108, lon: 112.922, status: 'Active Eruption', alertLevel: 'Warning', hazardRadiusKm: 30 },
  { id: 'krakatoa', name: 'Anak Krakatau', country: 'Indonesia', type: 'Caldera Island', elevationM: 157, lat: -6.102, lon: 105.423, status: 'Surtseyan Activity', alertLevel: 'Watch', hazardRadiusKm: 25 },
  { id: 'st_helens', name: 'Mount St. Helens', country: 'United States (WA)', type: 'Stratovolcano', elevationM: 2549, lat: 46.191, lon: -122.195, status: 'Monitored Unrest', alertLevel: 'Advisory', hazardRadiusKm: 25 },
  { id: 'fagradalsfjall', name: 'Reykjanes / Sundhnukur', country: 'Iceland', type: 'Fissure Vent', elevationM: 385, lat: 63.893, lon: -22.269, status: 'Lava Fountaining', alertLevel: 'Warning', hazardRadiusKm: 20 },
  { id: 'fournaise', name: 'Piton de la Fournaise', country: 'Reunion (France)', type: 'Shield volcano', elevationM: 2632, lat: -21.244, lon: 55.708, status: 'Effusive Eruption', alertLevel: 'Watch', hazardRadiusKm: 25 },
  { id: 'taal', name: 'Taal Volcano', country: 'Philippines', type: 'Caldera', elevationM: 311, lat: 14.002, lon: 120.993, status: 'Degassing & Tremor', alertLevel: 'Advisory', hazardRadiusKm: 25 },
  { id: 'nyiragongo', name: 'Mount Nyiragongo', country: 'DR Congo', type: 'Stratovolcano (Lava Lake)', elevationM: 3470, lat: -1.520, lon: 29.250, status: 'Persistent Lava Lake', alertLevel: 'Watch', hazardRadiusKm: 35 },
  { id: 'yasur', name: 'Mount Yasur', country: 'Vanuatu', type: 'Stratovolcano', elevationM: 361, lat: -19.532, lon: 169.447, status: 'Strombolian Eruptions', alertLevel: 'Watch', hazardRadiusKm: 15 },
  { id: 'ruapehu', name: 'Mount Ruapehu', country: 'New Zealand', type: 'Stratovolcano', elevationM: 2797, lat: -39.280, lon: 175.570, status: 'Crater Lake Unrest', alertLevel: 'Advisory', hazardRadiusKm: 20 },
  { id: 'cotopaxi', name: 'Cotopaxi', country: 'Ecuador', type: 'Stratovolcano', elevationM: 5897, lat: -0.677, lon: -78.436, status: 'Steam & Ash Emissions', alertLevel: 'Advisory', hazardRadiusKm: 40 },
  { id: 'erta_ale', name: 'Erta Ale', country: 'Ethiopia', type: 'Shield volcano', elevationM: 613, lat: 13.600, lon: 40.670, status: 'Active Lava Lake', alertLevel: 'Watch', hazardRadiusKm: 20 },
  { id: 'erebus', name: 'Mount Erebus', country: 'Antarctica', type: 'Stratovolcano', elevationM: 3794, lat: -77.530, lon: 167.170, status: 'Phonolitic Lava Lake', alertLevel: 'Advisory', hazardRadiusKm: 25 },
  { id: 'lewotobi', name: 'Lewotobi Laki-laki', country: 'Indonesia', type: 'Stratovolcano', elevationM: 1584, lat: -8.538, lon: 122.768, status: 'Explosive Plumes', alertLevel: 'Warning', hazardRadiusKm: 30 },
  { id: 'mayon', name: 'Mayon Volcano', country: 'Philippines', type: 'Stratovolcano', elevationM: 2462, lat: 13.257, lon: 123.685, status: 'Crater Glow & Rockfalls', alertLevel: 'Watch', hazardRadiusKm: 25 },
  { id: 'shiveluch', name: 'Shiveluch', country: 'Russia (Kamchatka)', type: 'Stratovolcano', elevationM: 3283, lat: 56.650, lon: 161.360, status: 'Dome Growth & Ash Plumes', alertLevel: 'Warning', hazardRadiusKm: 40 },
  { id: 'villarrica', name: 'Villarrica', country: 'Chile', type: 'Stratovolcano', elevationM: 2847, lat: -39.420, lon: -71.930, status: 'Incandescence & Gas', alertLevel: 'Watch', hazardRadiusKm: 25 },
]);

const EONET_VOLCANOES_URL = 'https://eonet.gsfc.nasa.gov/api/v3/categories/volcanoes?status=all&limit=40';

/**
 * Fetch live volcanic activity from NASA EONET and merge with world active volcano catalog.
 */
export async function fetchVolcanoesSnapshot({ signal } = {}) {
  const volcanoes = [...GLOBAL_VOLCANOES_DATASET];
  try {
    const res = await fetch(EONET_VOLCANOES_URL, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          const geom = ev.geometry?.[0];
          if (geom && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
            const [lon, lat] = geom.coordinates;
            // Check if already in curated set
            const exists = volcanoes.some(v => Math.hypot(v.lat - lat, v.lon - lon) < 0.3);
            if (!exists) {
              volcanoes.push({
                id: `eonet-${ev.id}`,
                name: ev.title || 'Volcanic Event',
                country: 'NASA EONET Observation',
                type: 'Active Volcanic Eruption',
                elevationM: null,
                lat,
                lon,
                status: 'Live Eruption / Thermal Alert',
                alertLevel: 'Warning',
                hazardRadiusKm: 30,
                date: geom.date,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Disasters:Volcanoes] EONET live fetch fallback:', err.message);
  }
  return volcanoes;
}

/**
 * Create Cesium 3D visualization entities for active volcanoes.
 */
export function populateVolcanoEntities(dataSource, volcanoes) {
  dataSource.entities.removeAll();

  for (const v of volcanoes) {
    const position = Cesium.Cartesian3.fromDegrees(v.lon, v.lat);
    const radiusMeters = (v.hazardRadiusKm || 25) * 1000;

    // Glowing magma crater circle
    const isErupting = v.alertLevel === 'Warning' || v.status.includes('Eruption') || v.status.includes('Explosive');
    const primaryColor = isErupting 
      ? Cesium.Color.fromCssColorString('#ff2200')
      : Cesium.Color.fromCssColorString('#ff7700');

    dataSource.entities.add(new Cesium.Entity({
      id: `volcano:${v.id}`,
      name: v.name,
      position,
      ellipse: {
        semiMajorAxis: radiusMeters,
        semiMinorAxis: radiusMeters,
        material: new Cesium.ColorMaterialProperty(primaryColor.withAlpha(isErupting ? 0.38 : 0.22)),
        outline: true,
        outlineColor: primaryColor.withAlpha(0.9),
        outlineWidth: isErupting ? 3 : 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      point: {
        pixelSize: isErupting ? 12 : 9,
        color: primaryColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `🌋 ${v.name}\n${v.status}`,
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
        disasterType: 'volcano',
        name: v.name,
        country: v.country,
        volcanoType: v.type,
        elevationM: v.elevationM,
        status: v.status,
        alertLevel: v.alertLevel,
        severity: v.alertLevel,
        hazardRadiusKm: v.hazardRadiusKm || 30,
        lat: v.lat,
        lon: v.lon,
        time: v.date || new Date().toISOString(),
        sources: 'Smithsonian Global Volcanism Program (GVP) · NASA EONET',
        description: 'Active volcanic edifice characterized by active magmatic ascent, crater thermal anomalies, degassing vents, and potential explosive tephra emissions.',
        safetyRecommendation: 'Maintain minimum 20-35 km safety exclusion zone around active caldera. Aviation corridors monitor airborne volcanic ash dispersion.',
      },
    }));
  }
}
