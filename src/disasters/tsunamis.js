import * as Cesium from 'cesium';

// Major oceanic tsunami subduction zones & monitored coastal trench basins
export const MONITORED_TSUNAMI_ZONES = Object.freeze([
  { id: 'kuril_kamchatka', name: 'Kuril-Kamchatka Subduction Zone', basin: 'Northwest Pacific Ocean', lat: 51.2, lon: 159.8, alertLevel: 'Advisory', maxMagnitude: 7.8, status: 'Active Seismic Trench', waveRiskKm: 450 },
  { id: 'nankai_trough', name: 'Nankai Trough Megathrust', basin: 'Philippine Sea / Japan Coast', lat: 33.1, lon: 136.2, alertLevel: 'Watch', maxMagnitude: 8.0, status: 'Subduction Tsunami Watch', waveRiskKm: 400 },
  { id: 'sunda_megathrust', name: 'Sunda Megathrust Trench', basin: 'Eastern Indian Ocean / Sumatra', lat: 1.5, lon: 97.1, alertLevel: 'Watch', maxMagnitude: 8.2, status: 'Deep Subduction Zone', waveRiskKm: 500 },
  { id: 'cascadia', name: 'Cascadia Subduction Zone', basin: 'Northeast Pacific Ocean (US/Canada)', lat: 45.0, lon: -125.5, alertLevel: 'Monitored', maxMagnitude: 7.5, status: 'Locked Megathrust Trench', waveRiskKm: 350 },
  { id: 'tonga_trench', name: 'Tonga-Kermadec Trench', basin: 'Southwest Pacific Ocean', lat: -21.0, lon: -175.0, alertLevel: 'Advisory', maxMagnitude: 7.6, status: 'Volcanic & Tectonic Wave Source', waveRiskKm: 420 },
  { id: 'aleutian_trench', name: 'Aleutian Subduction Trench', basin: 'Bering Sea / North Pacific', lat: 53.5, lon: -164.0, alertLevel: 'Advisory', maxMagnitude: 7.9, status: 'Oceanic Subduction Trench', waveRiskKm: 400 },
  { id: 'atacama_chile', name: 'Peru-Chile (Atacama) Trench', basin: 'Southeast Pacific Ocean', lat: -23.5, lon: -71.5, alertLevel: 'Watch', maxMagnitude: 7.7, status: 'High-Velocity Plate Convergence', waveRiskKm: 450 },
  { id: 'puerto_rico', name: 'Puerto Rico Trench', basin: 'Atlantic Ocean / Caribbean Basin', lat: 19.8, lon: -66.5, alertLevel: 'Monitored', maxMagnitude: 7.3, status: 'Deepest Atlantic Subduction Trench', waveRiskKm: 300 },
  { id: 'hellenic_arc', name: 'Hellenic Subduction Arc', basin: 'Eastern Mediterranean Sea', lat: 35.0, lon: 24.5, alertLevel: 'Monitored', maxMagnitude: 6.9, status: 'Mediterranean Tsunami Hazard', waveRiskKm: 250 },
]);

const USGS_TSUNAMI_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';

/**
 * Fetch live tsunami alerts from USGS (events with properties.tsunami === 1) and combine with monitored trenches.
 */
export async function fetchTsunamisSnapshot({ signal } = {}) {
  const alerts = [...MONITORED_TSUNAMI_ZONES];
  try {
    const res = await fetch(USGS_TSUNAMI_FEED_URL, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        for (const feature of data.features) {
          const props = feature.properties;
          const coords = feature.geometry?.coordinates;
          if (props?.tsunami === 1 && Array.isArray(coords) && coords.length >= 2) {
            const [lon, lat, depth] = coords;
            alerts.unshift({
              id: `usgs-tsunami-${feature.id}`,
              name: `Tsunami Alert: ${props.place || 'Oceanic Event'}`,
              basin: 'Pacific / Regional Basin',
              lat,
              lon,
              alertLevel: props.mag >= 7.0 ? 'Warning' : 'Advisory',
              maxMagnitude: props.mag,
              depthKm: depth,
              status: `Live Tsunami Alert (M${props.mag} at ${depth || 10}km depth)`,
              waveRiskKm: Math.round(Math.pow(1.8, Math.max(5, props.mag)) * 3),
              time: props.time ? new Date(props.time).toISOString() : new Date().toISOString(),
              url: props.url,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Disasters:Tsunamis] USGS tsunami live fetch fallback:', err.message);
  }
  return alerts;
}

/**
 * Create Cesium 3D oceanic ripple rings and wave propagation markers for tsunamis.
 */
export function populateTsunamiEntities(dataSource, tsunamiAlerts) {
  dataSource.entities.removeAll();

  for (const t of tsunamiAlerts) {
    const position = Cesium.Cartesian3.fromDegrees(t.lon, t.lat);
    const outerRadius = (t.waveRiskKm || 300) * 1000;
    const innerRadius = Math.round(outerRadius * 0.45);
    const isWarning = t.alertLevel === 'Warning' || (t.maxMagnitude && t.maxMagnitude >= 7.0);

    const waveColor = isWarning 
      ? Cesium.Color.fromCssColorString('#00e5ff')
      : Cesium.Color.fromCssColorString('#0091ea');

    const tsunamiProps = {
      disasterType: 'tsunami',
      name: t.name,
      basin: t.basin,
      country: t.basin,
      alertLevel: t.alertLevel,
      severity: t.alertLevel,
      status: t.status,
      maxMagnitude: t.maxMagnitude,
      depthKm: t.depthKm || 15,
      waveRiskKm: t.waveRiskKm || 350,
      hazardRadiusKm: t.waveRiskKm || 350,
      lat: t.lat,
      lon: t.lon,
      time: t.time || new Date().toISOString(),
      sources: 'USGS National Earthquake Information Center · NOAA PTWC',
      description: 'Oceanic megathrust plate convergence and seafloor displacement capable of generating high-velocity transoceanic tsunami wave trains.',
      safetyRecommendation: 'Observe immediate coastal evacuations for low-lying shorelines upon warning. Small craft and deep-draft vessels navigate to open water >100 fathoms.',
    };

    // Outer oceanic wave propagation ring
    dataSource.entities.add(new Cesium.Entity({
      id: `tsunami:${t.id}`,
      name: t.name,
      position,
      properties: tsunamiProps,
      ellipse: {
        semiMajorAxis: outerRadius,
        semiMinorAxis: outerRadius,
        material: new Cesium.ColorMaterialProperty(waveColor.withAlpha(0.18)),
        outline: true,
        outlineColor: waveColor.withAlpha(0.85),
        outlineWidth: isWarning ? 3 : 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      point: {
        pixelSize: isWarning ? 14 : 10,
        color: waveColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `🌊 ${t.name}\n${t.status}`,
        font: 'bold 11px "JetBrains Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        pixelOffset: new Cesium.Cartesian2(0, -26),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 12000000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));

    // Inner wave harmonic disc
    dataSource.entities.add(new Cesium.Entity({
      id: `tsunami-inner:${t.id}`,
      name: `${t.name} (Wave Core)`,
      position,
      properties: tsunamiProps,
      ellipse: {
        semiMajorAxis: innerRadius,
        semiMinorAxis: innerRadius,
        material: new Cesium.ColorMaterialProperty(waveColor.withAlpha(0.28)),
        outline: true,
        outlineColor: waveColor.withAlpha(0.95),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    }));
  }
}
