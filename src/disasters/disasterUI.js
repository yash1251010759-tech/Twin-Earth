import { getDisasterHub } from './disasterHub.js';

/**
 * Wire Disaster Console modal, incident cards, and controls.
 */
export function initDisasterUI() {
  const hubBtn = document.getElementById('disaster-hub-btn');
  const modal = document.getElementById('disaster-console');
  const incidentCard = document.getElementById('disaster-incident-card');

  if (!hubBtn || !modal) return;

  const closeBtns = modal.querySelectorAll('[data-disaster-console-close]');
  const toggleBtns = modal.querySelectorAll('[data-toggle-disaster]');
  const cycleBtn = document.getElementById('disaster-cycle-next-btn');
  const incidentCloseBtn = incidentCard?.querySelector('[data-incident-close]');
  const incidentFlyToBtn = document.getElementById('incident-flyto-btn');

  const searchInput = document.getElementById('disaster-search-input');
  const searchClear = document.getElementById('disaster-search-clear');
  const searchResults = document.getElementById('disaster-search-results');
  const incidentOrbitBtn = document.getElementById('incident-orbit-btn');
  const incidentCopyCoordsBtn = document.getElementById('incident-copy-coords-btn');

  function openConsole() {
    modal.removeAttribute('hidden');
    modal.classList.add('is-open');
    hubBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => searchInput?.focus(), 100);
  }

  function closeConsole() {
    modal.classList.remove('is-open');
    modal.setAttribute('hidden', '');
    hubBtn.setAttribute('aria-expanded', 'false');
  }

  hubBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (modal.hasAttribute('hidden')) {
      openConsole();
    } else {
      closeConsole();
    }
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeConsole();
    });
  });

  // Layer toggles (Volcanoes, Tsunamis, Floods, Cyclones)
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.getAttribute('data-toggle-disaster');
      const hub = getDisasterHub();
      if (!hub) return;

      const card = btn.closest('.disaster-toggle-card');
      const isCurrentlyActive = card.classList.contains('active');
      const nextActive = !isCurrentlyActive;

      card.classList.toggle('active', nextActive);
      btn.classList.toggle('active', nextActive);
      btn.textContent = nextActive ? 'LAYER ACTIVE' : 'LAYER OFF';

      hub.setLayerEnabled(type, nextActive);
    });
  });

  // Disaster search and filter
  function renderSearchResults(items) {
    if (!searchResults) return;
    if (!items || !items.length) {
      searchResults.innerHTML = '<div class="disaster-search-empty">No active disasters matched this query.</div>';
      searchResults.removeAttribute('hidden');
      return;
    }

    searchResults.innerHTML = items.map((item) => {
      const emoji = item.type === 'cyclone' ? '🌀' : item.type === 'volcano' ? '🌋' : item.type === 'tsunami' ? '🌊' : '💧';
      const typeLabel = item.type === 'cyclone' ? 'CYCLONE' : item.type === 'volcano' ? 'VOLCANO' : item.type === 'tsunami' ? 'TSUNAMI' : 'FLOOD';
      const metric = item.type === 'cyclone' ? `${item.windSpeedKts || 65} kts` : item.type === 'volcano' ? (item.elevationM ? `${item.elevationM}m` : 'Active') : item.type === 'tsunami' ? (item.maxMagnitude ? `M${item.maxMagnitude}` : 'Trench') : 'Inundation';
      const location = item.country || item.basin || item.river || 'Global Zone';

      return `
        <div class="disaster-result-item" data-disaster-id="${item.id}" data-disaster-type="${item.type}">
          <span class="result-icon">${emoji}</span>
          <div class="result-info">
            <div class="result-name-row">
              <span class="result-name">${item.name}</span>
              <span class="result-type-badge">${typeLabel}</span>
            </div>
            <div class="result-meta-row">
              <span class="result-location">${location}</span>
              <span class="result-metric">${metric}</span>
            </div>
          </div>
          <span class="result-alert-badge" data-level="${(item.alertLevel || item.severity || 'ACTIVE').toLowerCase()}">${item.alertLevel || item.severity || 'ACTIVE'}</span>
        </div>
      `;
    }).join('');

    searchResults.removeAttribute('hidden');

    searchResults.querySelectorAll('.disaster-result-item').forEach((itemEl) => {
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = itemEl.getAttribute('data-disaster-id');
        const hub = getDisasterHub();
        if (!hub) return;
        const target = hub.getAllIncidents().find((x) => x.id === id);
        if (target) {
          closeConsole();
          hub.selectIncident(target);
          const flyHeight = target.type === 'cyclone' ? 550000 : target.type === 'tsunami' ? 350000 : 120000;
          hub.flyToIncident(target.lat, target.lon, flyHeight);
        }
      });
    });
  }

  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (searchClear) searchClear.hidden = !q;
    const hub = getDisasterHub();
    if (!hub) return;
    if (!q) {
      if (searchResults) searchResults.setAttribute('hidden', '');
      return;
    }
    const matches = hub.searchDisasters(q);
    renderSearchResults(matches);
  });

  searchClear?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    searchClear.hidden = true;
    if (searchResults) searchResults.setAttribute('hidden', '');
  });

  // Cycle next incident
  cycleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const hub = getDisasterHub();
    if (hub) {
      const incident = hub.cycleNextIncident();
      if (incident) {
        closeConsole();
      }
    }
  });

  // Incident card close
  incidentCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    incidentCard.setAttribute('hidden', '');
  });

  // Incident Fly-To
  incidentFlyToBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const hub = getDisasterHub();
    if (hub && hub._selectedIncident) {
      const inc = hub._selectedIncident;
      const flyHeight = inc.type === 'cyclone' ? 550000 : inc.type === 'tsunami' ? 350000 : 120000;
      hub.flyToIncident(inc.lat, inc.lon, flyHeight);
    }
  });

  // Incident Orbit Camera
  incidentOrbitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const hub = getDisasterHub();
    if (hub && hub._selectedIncident) {
      const inc = hub._selectedIncident;
      hub.orbitIncident(inc.lat, inc.lon);
    }
  });

  // Incident Copy Coordinates
  incidentCopyCoordsBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const hub = getDisasterHub();
    if (hub && hub._selectedIncident) {
      const inc = hub._selectedIncident;
      const text = `${inc.lat.toFixed(4)}, ${inc.lon.toFixed(4)}`;
      try {
        await navigator.clipboard.writeText(text);
        const label = incidentCopyCoordsBtn.querySelector('span:last-child');
        if (label) {
          const old = label.textContent;
          label.textContent = 'COPIED!';
          setTimeout(() => { label.textContent = old; }, 1800);
        }
      } catch {}
    }
  });

  // Keyboard shortcut listener
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      if (e.key === 'Escape' && activeEl === searchInput) {
        searchInput.value = '';
        if (searchClear) searchClear.hidden = true;
        if (searchResults) searchResults.setAttribute('hidden', '');
        searchInput.blur();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (!modal.hasAttribute('hidden')) {
        closeConsole();
      } else if (incidentCard && !incidentCard.hasAttribute('hidden')) {
        incidentCard.setAttribute('hidden', '');
      }
    }
  });
}
