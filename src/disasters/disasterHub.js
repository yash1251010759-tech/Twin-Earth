import * as Cesium from 'cesium';
import { fetchVolcanoesSnapshot, populateVolcanoEntities } from './volcanoes.js';
import { fetchTsunamisSnapshot, populateTsunamiEntities } from './tsunamis.js';
import { fetchFloodsSnapshot, populateFloodEntities } from './floods.js';
import { fetchCyclonesSnapshot, populateCycloneEntities } from './cyclones.js';

/**
 * DisasterHub — Unified natural hazard monitoring engine.
 * Coordinates 3D layers for Volcanoes, Tsunamis, Floods, and Cyclones on Cesium,
 * with real-time incident inspection and camera fly-to.
 */
export class DisasterHub {
  constructor(viewer) {
    this.viewer = viewer;
    this.volcanoesSource = new Cesium.CustomDataSource('disaster_volcanoes');
    this.tsunamisSource = new Cesium.CustomDataSource('disaster_tsunamis');
    this.floodsSource = new Cesium.CustomDataSource('disaster_floods');
    this.cyclonesSource = new Cesium.CustomDataSource('disaster_cyclones');

    const stored = this._loadPreferences();
    const autoEnable = Boolean(globalThis.__teEnableDisastersOnStart);
    const launcherEl = typeof document !== 'undefined' ? document.getElementById('first-run-launcher') : null;
    const launcherWaiting = Boolean(launcherEl && !launcherEl.hasAttribute('hidden'));

    if (autoEnable) {
      this.volcanoesEnabled = true;
      this.tsunamisEnabled = true;
      this.floodsEnabled = true;
      this.cyclonesEnabled = true;
      this._savePreferences();
    } else if (stored) {
      this.volcanoesEnabled = Boolean(stored.volcanoes);
      this.tsunamisEnabled = Boolean(stored.tsunamis);
      this.floodsEnabled = Boolean(stored.floods);
      this.cyclonesEnabled = stored.cyclones !== undefined ? Boolean(stored.cyclones) : true;
    } else if (launcherWaiting) {
      // First-run mission launcher is waiting for visitor choice: start clean
      this.volcanoesEnabled = false;
      this.tsunamisEnabled = false;
      this.floodsEnabled = false;
      this.cyclonesEnabled = false;
    } else {
      // Direct load or returning session: active by default
      this.volcanoesEnabled = true;
      this.tsunamisEnabled = true;
      this.floodsEnabled = true;
      this.cyclonesEnabled = true;
    }

    this.data = {
      volcanoes: [],
      tsunamis: [],
      floods: [],
      cyclones: [],
    };

    this._updateInterval = null;
    this._abortController = null;
    this._handler = null;
    this._selectedIncident = null;
    this._incidentIndex = 0;

    this._init();
  }

  _loadPreferences() {
    try {
      const raw = localStorage.getItem('te:disaster-hub:v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  _savePreferences() {
    try {
      localStorage.setItem('te:disaster-hub:v1', JSON.stringify({
        volcanoes: this.volcanoesEnabled,
        tsunamis: this.tsunamisEnabled,
        floods: this.floodsEnabled,
        cyclones: this.cyclonesEnabled,
      }));
    } catch {}
  }

  enableAllDisasters() {
    this.setLayerEnabled('volcanoes', true);
    this.setLayerEnabled('tsunamis', true);
    this.setLayerEnabled('floods', true);
    this.setLayerEnabled('cyclones', true);
    this._savePreferences();
  }

  _init() {
    this.viewer.dataSources.add(this.volcanoesSource);
    this.viewer.dataSources.add(this.tsunamisSource);
    this.viewer.dataSources.add(this.floodsSource);
    this.viewer.dataSources.add(this.cyclonesSource);

    this.volcanoesSource.show = this.volcanoesEnabled;
    this.tsunamisSource.show = this.tsunamisEnabled;
    this.floodsSource.show = this.floodsEnabled;
    this.cyclonesSource.show = this.cyclonesEnabled;

    this._syncUIControls('volcanoes', this.volcanoesEnabled);
    this._syncUIControls('tsunamis', this.tsunamisEnabled);
    this._syncUIControls('floods', this.floodsEnabled);
    this._syncUIControls('cyclones', this.cyclonesEnabled);

    this._setupClickHandler();
    this.refresh();

    // Refresh disaster observations every 90 seconds
    this._updateInterval = setInterval(() => this.refresh(), 90000);
  }

  _setupClickHandler() {
    this._handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this._handler.setInputAction((movement) => {
      const picked = this.viewer.scene.pick(movement.position);
      if (picked && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        const disasterType = props.disasterType?.getValue?.() || props.disasterType;
        if (disasterType) {
          this.selectIncident({
            type: disasterType,
            name: props.name?.getValue?.() || props.name || picked.id.name,
            country: props.country?.getValue?.() || props.country,
            basin: props.basin?.getValue?.() || props.basin,
            river: props.river?.getValue?.() || props.river,
            status: props.status?.getValue?.() || props.status,
            alertLevel: props.alertLevel?.getValue?.() || props.alertLevel || props.severity?.getValue?.() || props.severity,
            elevationM: props.elevationM?.getValue?.() || props.elevationM,
            maxMagnitude: props.maxMagnitude?.getValue?.() || props.maxMagnitude,
            windSpeedKts: props.windSpeedKts?.getValue?.() || props.windSpeedKts,
            windSpeedKph: props.windSpeedKph?.getValue?.() || props.windSpeedKph,
            pressureMb: props.pressureMb?.getValue?.() || props.pressureMb,
            category: props.category?.getValue?.() || props.category,
            lat: props.lat?.getValue?.() || props.lat,
            lon: props.lon?.getValue?.() || props.lon,
            time: props.time?.getValue?.() || props.time || props.date?.getValue?.() || props.date,
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  async refresh() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    try {
      const [v, t, f, c] = await Promise.all([
        fetchVolcanoesSnapshot({ signal }),
        fetchTsunamisSnapshot({ signal }),
        fetchFloodsSnapshot({ signal }),
        fetchCyclonesSnapshot({ signal }),
      ]);

      if (signal.aborted) return;

      this.data.volcanoes = v;
      this.data.tsunamis = t;
      this.data.floods = f;
      this.data.cyclones = c;

      populateVolcanoEntities(this.volcanoesSource, v);
      populateTsunamiEntities(this.tsunamisSource, t);
      populateFloodEntities(this.floodsSource, f);
      populateCycloneEntities(this.cyclonesSource, c);

      this._updateUIStats();
      console.log(`[Disasters] Updated: ${v.length} volcanoes, ${t.length} tsunami alerts, ${f.length} flood zones, ${c.length} cyclones`);
    } catch (e) {
      if (!signal.aborted) console.warn('[Disasters] Refresh failed:', e);
    }
  }

  setLayerEnabled(layerId, enabled) {
    if (layerId === 'volcanoes') {
      this.volcanoesEnabled = enabled;
      this.volcanoesSource.show = enabled;
    } else if (layerId === 'tsunamis') {
      this.tsunamisEnabled = enabled;
      this.tsunamisSource.show = enabled;
    } else if (layerId === 'floods') {
      this.floodsEnabled = enabled;
      this.floodsSource.show = enabled;
    } else if (layerId === 'cyclones') {
      this.cyclonesEnabled = enabled;
      this.cyclonesSource.show = enabled;
    }
    this._savePreferences();
    this._updateUIStats();
    this._syncUIControls(layerId, enabled);
  }

  _syncUIControls(layerId, enabled) {
    if (typeof document === 'undefined') return;
    const card = document.querySelector(`.disaster-toggle-card[data-disaster-type="${layerId}"]`);
    const btn = document.querySelector(`[data-toggle-disaster="${layerId}"]`);
    if (card) card.classList.toggle('active', enabled);
    if (btn) {
      btn.classList.toggle('active', enabled);
      btn.textContent = enabled ? 'LAYER ACTIVE' : 'LAYER OFF';
    }
  }

  getAllIncidents() {
    const list = [];
    for (const v of this.data.volcanoes) list.push({ ...v, type: 'volcano' });
    for (const t of this.data.tsunamis) list.push({ ...t, type: 'tsunami' });
    for (const f of this.data.floods) list.push({ ...f, type: 'flood' });
    for (const c of this.data.cyclones) list.push({ ...c, type: 'cyclone' });
    return list;
  }

  searchDisasters(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const all = this.getAllIncidents();
    return all.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const type = String(item.type || '').toLowerCase();
      const country = String(item.country || '').toLowerCase();
      const basin = String(item.basin || '').toLowerCase();
      const river = String(item.river || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const status = String(item.status || '').toLowerCase();
      const alertLevel = String(item.alertLevel || item.severity || '').toLowerCase();

      return (
        name.includes(q) ||
        type.includes(q) ||
        country.includes(q) ||
        basin.includes(q) ||
        river.includes(q) ||
        category.includes(q) ||
        status.includes(q) ||
        alertLevel.includes(q) ||
        (q === 'cyclone' && type === 'cyclone') ||
        (q === 'cyclones' && type === 'cyclone') ||
        (q === 'typhoon' && (type === 'cyclone' || name.includes('typhoon'))) ||
        (q === 'hurricane' && (type === 'cyclone' || name.includes('hurricane'))) ||
        (q === 'volcano' && type === 'volcano') ||
        (q === 'volcanoes' && type === 'volcano') ||
        (q === 'tsunami' && type === 'tsunami') ||
        (q === 'tsunamis' && type === 'tsunami') ||
        (q === 'flood' && type === 'flood') ||
        (q === 'floods' && type === 'flood')
      );
    });
  }

  findDisaster(query) {
    const results = this.searchDisasters(query);
    if (!results.length) return null;
    const q = String(query || '').trim().toLowerCase();
    const exact = results.find((r) => String(r.name || '').toLowerCase() === q);
    return exact || results[0];
  }

  flyToIncident(lat, lon, heightM = 150000) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, heightM),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 2.2,
    });
  }

  orbitIncident(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const center = Cesium.Cartesian3.fromDegrees(lon, lat);
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    this.viewer.camera.lookAtTransform(transform, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 450000));
    let heading = 0;
    const interval = setInterval(() => {
      heading += 0.012;
      this.viewer.camera.lookAtTransform(transform, new Cesium.HeadingPitchRange(heading, Cesium.Math.toRadians(-35), 450000));
    }, 40);
    const stop = () => {
      clearInterval(interval);
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      window.removeEventListener('pointerdown', stop);
    };
    window.addEventListener('pointerdown', stop, { once: true });
  }

  cycleNextIncident() {
    // Gather all incidents across enabled layers
    const pool = [];
    if (this.volcanoesEnabled) {
      for (const v of this.data.volcanoes) {
        pool.push({ ...v, type: 'volcano' });
      }
    }
    if (this.tsunamisEnabled) {
      for (const t of this.data.tsunamis) {
        pool.push({ ...t, type: 'tsunami' });
      }
    }
    if (this.floodsEnabled) {
      for (const f of this.data.floods) {
        pool.push({ ...f, type: 'flood' });
      }
    }
    if (this.cyclonesEnabled) {
      for (const c of this.data.cyclones) {
        pool.push({ ...c, type: 'cyclone' });
      }
    }

    if (!pool.length) return null;
    this._incidentIndex = (this._incidentIndex + 1) % pool.length;
    const target = pool[this._incidentIndex];
    this.selectIncident(target);
    const flyHeight = target.type === 'cyclone' ? 550000 : target.type === 'tsunami' ? 350000 : 120000;
    this.flyToIncident(target.lat, target.lon, flyHeight);
    return target;
  }

  selectIncident(incident) {
    this._selectedIncident = incident;
    const card = document.getElementById('disaster-incident-card');
    if (!card) return;

    if (!incident) {
      card.setAttribute('hidden', '');
      return;
    }

    const typeEmoji = incident.type === 'volcano' ? '🌋' : incident.type === 'tsunami' ? '🌊' : incident.type === 'cyclone' ? '🌀' : '💧';
    const typeLabel = incident.type === 'volcano' ? 'VOLCANIC HAZARD' : incident.type === 'tsunami' ? 'TSUNAMI ALERT' : incident.type === 'cyclone' ? 'TROPICAL CYCLONE / TYPHOON' : 'FLOOD INUNDATION';

    const titleEl = card.querySelector('[data-incident-title]');
    const tagEl = card.querySelector('[data-incident-type-tag]');
    const statusEl = card.querySelector('[data-incident-status]');
    const locationEl = card.querySelector('[data-incident-location]');
    const alertLevelEl = card.querySelector('[data-incident-alert]');
    const coordsEl = card.querySelector('[data-incident-coords]');
    const descEl = card.querySelector('[data-incident-description]');
    const safetyEl = card.querySelector('[data-incident-safety]');
    const sourcesEl = card.querySelector('[data-incident-sources]');
    const timeEl = card.querySelector('[data-incident-time]');

    const mLabel1 = card.querySelector('[data-metric-label-1]');
    const mVal1 = card.querySelector('[data-metric-val-1]');
    const mLabel2 = card.querySelector('[data-metric-label-2]');
    const mVal2 = card.querySelector('[data-metric-val-2]');
    const mLabel3 = card.querySelector('[data-metric-label-3]');
    const mVal3 = card.querySelector('[data-metric-val-3]');
    const mLabel4 = card.querySelector('[data-metric-label-4]');
    const mVal4 = card.querySelector('[data-metric-val-4]');

    if (titleEl) titleEl.textContent = incident.name || 'Disaster Incident';
    if (tagEl) tagEl.textContent = `${typeEmoji} ${typeLabel}`;
    if (statusEl) statusEl.textContent = incident.status || 'Active Monitoring';
    if (locationEl) locationEl.textContent = incident.country || incident.basin || incident.river || 'Global Marine Basin';
    
    const alertText = incident.alertLevel || incident.severity || incident.category || 'ACTIVE';
    if (alertLevelEl) {
      alertLevelEl.textContent = alertText;
      alertLevelEl.setAttribute('data-level', alertText.toLowerCase().includes('warn') || alertText.toLowerCase().includes('cat 4') || alertText.toLowerCase().includes('cat 5') || alertText.toLowerCase().includes('super') ? 'critical' : 'warning');
    }

    if (coordsEl && Number.isFinite(incident.lat) && Number.isFinite(incident.lon)) {
      coordsEl.textContent = `${Math.abs(incident.lat).toFixed(2)}°${incident.lat >= 0 ? 'N' : 'S'}, ${Math.abs(incident.lon).toFixed(2)}°${incident.lon >= 0 ? 'E' : 'W'}`;
    }

    // Dynamic metrics grid per disaster type
    if (incident.type === 'cyclone') {
      const kts = incident.windSpeedKts || 65;
      const kph = incident.windSpeedKph || Math.round(kts * 1.852);
      if (mLabel1) mLabel1.textContent = 'MAX WINDS';
      if (mVal1) mVal1.textContent = `${kts} kts (${kph} km/h)`;
      if (mLabel2) mLabel2.textContent = 'BAROMETRIC PRESSURE';
      if (mVal2) mVal2.textContent = `${incident.pressureMb || 955} hPa / mb`;
      if (mLabel3) mLabel3.textContent = 'GALE RADIUS';
      if (mVal3) mVal3.textContent = `${incident.hazardRadiusKm || 280} km radius`;
      if (mLabel4) mLabel4.textContent = 'CLASSIFICATION';
      if (mVal4) mVal4.textContent = incident.category || 'Tropical Cyclone';
      if (descEl) descEl.textContent = incident.description || 'Intense convective marine storm vortex with closed low-level circulation, violent spiral rainbands, and extreme eyewall wind shear.';
      if (safetyEl) safetyEl.textContent = incident.safetyRecommendation || 'Maritime vessels divert outside gale radii immediately. Coastal communities observe storm surge and destructive wind advisories.';
      if (sourcesEl) sourcesEl.textContent = incident.sources || 'NASA EONET / JTWC / NOAA NHC';
    } else if (incident.type === 'volcano') {
      if (mLabel1) mLabel1.textContent = 'SUMMIT ELEVATION';
      if (mVal1) mVal1.textContent = incident.elevationM ? `${incident.elevationM.toLocaleString()} m (${Math.round(incident.elevationM * 3.28084).toLocaleString()} ft)` : 'Submarine / Caldera';
      if (mLabel2) mLabel2.textContent = 'VOLCANO TYPE';
      if (mVal2) mVal2.textContent = incident.volcanoType || 'Stratovolcano';
      if (mLabel3) mLabel3.textContent = 'CRATER HAZARD ZONE';
      if (mVal3) mVal3.textContent = `${incident.hazardRadiusKm || 30} km radius`;
      if (mLabel4) mLabel4.textContent = 'ALERT LEVEL';
      if (mVal4) mVal4.textContent = incident.alertLevel || 'Active Eruption Warning';
      if (descEl) descEl.textContent = incident.description || 'Active Holocene volcanic edifice exhibiting thermal crater incandescence, tephra plumes, and seismic unrest.';
      if (safetyEl) safetyEl.textContent = incident.safetyRecommendation || 'Maintain safety distance outside active ballistic and pyroclastic exclusion zones. Aviation reroute around ash columns.';
      if (sourcesEl) sourcesEl.textContent = incident.sources || 'Smithsonian Global Volcanism Program (GVP) · NASA EONET';
    } else if (incident.type === 'tsunami') {
      if (mLabel1) mLabel1.textContent = 'MAGNITUDE SOURCE';
      if (mVal1) mVal1.textContent = incident.maxMagnitude ? `M ${incident.maxMagnitude}` : 'Megathrust Event';
      if (mLabel2) mLabel2.textContent = 'FOCAL DEPTH';
      if (mVal2) mVal2.textContent = incident.depthKm ? `${incident.depthKm} km depth` : '15 km depth';
      if (mLabel3) mLabel3.textContent = 'WAVE RISK EXTENT';
      if (mVal3) mVal3.textContent = `${incident.waveRiskKm || 350} km propagation`;
      if (mLabel4) mLabel4.textContent = 'SUBDUCTION BASIN';
      if (mVal4) mVal4.textContent = incident.basin || 'Oceanic Trench';
      if (descEl) descEl.textContent = incident.description || 'Undersea tectonic rupture causing vertical seabed displacement and high-velocity oceanic tsunami wave train propagation.';
      if (safetyEl) safetyEl.textContent = incident.safetyRecommendation || 'Low-lying coastal areas evacuate to high ground immediately. Maritime traffic move to deep oceanic water off the shelf.';
      if (sourcesEl) sourcesEl.textContent = incident.sources || 'USGS National Earthquake Information Center · NOAA PTWC';
    } else {
      // flood
      if (mLabel1) mLabel1.textContent = 'INUNDATION EXTENT';
      if (mVal1) mVal1.textContent = `${incident.inundationRadiusKm || 80} km radius`;
      if (mLabel2) mLabel2.textContent = 'RIVER SYSTEM';
      if (mVal2) mVal2.textContent = incident.river || incident.basin || 'Regional Floodway';
      if (mLabel3) mLabel3.textContent = 'HYDROLOGICAL BASIN';
      if (mVal3) mVal3.textContent = incident.country || 'Monitored Flood Zone';
      if (mLabel4) mLabel4.textContent = 'SEVERITY STAGE';
      if (mVal4) mVal4.textContent = incident.severity || 'Severe Inundation';
      if (descEl) descEl.textContent = incident.description || 'Severe hydrological surcharge and riverbank overflow resulting in widespread monsoonal or flash inundation.';
      if (safetyEl) safetyEl.textContent = incident.safetyRecommendation || 'Evacuate floodway perimeters immediately. Do not navigate vehicles across submerged roadways or bridge abutments.';
      if (sourcesEl) sourcesEl.textContent = incident.sources || 'NASA Earth Observatory (EONET) · Copernicus EMS';
    }

    if (timeEl) {
      if (incident.time) {
        try {
          const dateObj = new Date(incident.time);
          timeEl.textContent = !isNaN(dateObj) ? `Observed: ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Observed: ${incident.time}`;
        } catch {
          timeEl.textContent = `Observed: ${incident.time}`;
        }
      } else {
        timeEl.textContent = 'Live Satellite Telemetry';
      }
    }

    card.removeAttribute('hidden');
  }

  _updateUIStats() {
    const vCount = document.getElementById('disaster-volcanoes-count');
    const tCount = document.getElementById('disaster-tsunamis-count');
    const fCount = document.getElementById('disaster-floods-count');
    const cCount = document.getElementById('disaster-cyclones-count');

    if (vCount) vCount.textContent = `${this.data.volcanoes.length || 23}`;
    if (tCount) tCount.textContent = `${this.data.tsunamis.length || 9}`;
    if (fCount) fCount.textContent = `${this.data.floods.length || 10}`;
    if (cCount) cCount.textContent = `${this.data.cyclones.length || 8}`;
  }

  destroy() {
    if (this._updateInterval) clearInterval(this._updateInterval);
    this._abortController?.abort();
    this._handler?.destroy();

    this.viewer.dataSources.remove(this.volcanoesSource, true);
    this.viewer.dataSources.remove(this.tsunamisSource, true);
    this.viewer.dataSources.remove(this.floodsSource, true);
    this.viewer.dataSources.remove(this.cyclonesSource, true);
  }
}

let activeDisasterHub = null;

export function initDisasterHub(viewer) {
  if (activeDisasterHub) return activeDisasterHub;
  activeDisasterHub = new DisasterHub(viewer);
  window.__teDisasterHub = activeDisasterHub;
  return activeDisasterHub;
}

export function getDisasterHub() {
  return activeDisasterHub;
}
