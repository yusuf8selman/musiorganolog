/**
 * map.js — App.MapView  v=1
 * Leaflet world map of 287 instruments grouped by region/country
 *
 * Depends on:
 *   - Leaflet 1.9.x (loaded before this file)
 *   - App.state.data  (instruments.json tree)
 *   - App.openModal()
 */

App.MapView = (function () {

  /* ── Category accent colours ─────────────────────────────── */
  const CAT_COLOR = {
    kordofonlar:    '#d4af37', // gold
    aerofonlar:     '#6aacdd', // sky blue
    idiofonlar:     '#72c49a', // sage green
    membranofonlar: '#c96e6e', // muted red
    elektrofonlar:  '#a67cc8', // lilac
  };

  /* ── Region → [lat, lng] lookup ──────────────────────────── */
  const COORDS = {
    // ── Africa ──────────────────────────────────────────────
    'Sub-Saharan Africa':           [ -5.0,  25.0],
    'South Africa':                 [-30.6,  22.9],
    'Madagascar':                   [-18.8,  46.9],
    'Ethiopia':                     [  9.1,  40.5],
    'Kenya':                        [  0.0,  37.9],
    'West Africa':                  [ 13.0,  -5.0],
    'Ghana':                        [  7.9,  -1.0],
    'Central Africa':               [  0.0,  18.6],
    'Mauritania / West Africa':     [ 18.0, -12.0],
    'Ancient Egypt':                [ 26.8,  30.8],
    'Africa / Americas':            [ 15.0, -20.0],
    // ── Americas ────────────────────────────────────────────
    'Brazil':                       [-14.2, -51.9],
    'USA':                          [ 37.1, -95.7],
    'Hawaii (USA)':                 [ 20.8,-156.3],
    'Andes (South America)':        [-13.2, -72.1],
    'Paraguay':                     [-23.4, -58.4],
    'Colombia':                     [  4.6, -74.1],
    'Argentina / Germany':          [-38.4, -63.6],
    'Mexico':                       [ 23.6,-102.6],
    'Americas':                     [ 10.0, -80.0],
    'Portugal / Brazil':            [ 39.4,  -8.2],
    // ── Europe ──────────────────────────────────────────────
    'Europe':                       [ 50.0,  10.0],
    'Europe (Italy)':               [ 42.5,  12.5],
    'Europe (Renaissance)':         [ 48.0,  12.0],
    'Europe (Baroque)':             [ 49.0,  11.0],
    'Europe (Medieval)':            [ 47.0,  13.0],
    'Europe (France)':              [ 46.2,   2.2],
    'Europe / Americas':            [ 48.0,  10.0],
    'Italy':                        [ 41.9,  12.5],
    'Italy (Baroque)':              [ 43.0,  13.0],
    'Spain':                        [ 40.5,  -3.7],
    'Spain / Europe':               [ 40.5,  -3.7],
    'Germany / Europe':             [ 51.2,  10.5],
    'Greece':                       [ 39.1,  21.8],
    'Ancient Greece':               [ 38.5,  22.5],
    'Hungary / Balkans':            [ 47.2,  18.6],
    'Ireland / Scotland':           [ 54.5,  -4.0],
    'Albania':                      [ 41.2,  20.2],
    'Slovakia':                     [ 48.7,  19.7],
    'Romania':                      [ 45.9,  24.9],
    'Iceland':                      [ 64.9, -18.0],
    'Russia':                       [ 61.5, 105.3],
    // ── Middle East / Central Asia ───────────────────────────
    'Turkey':                       [ 39.0,  35.2],
    'Turkey / Middle East':         [ 38.0,  36.0],
    'Middle East / Turkey':         [ 36.0,  38.0],
    'Turkey / Anatolia':            [ 39.5,  33.0],
    'Turkey / Black Sea Region':    [ 41.0,  37.5],
    'Turkey / Aegean Region':       [ 38.0,  27.5],
    'Turkey / Aegean and Southern Anatolia': [ 37.2,  30.0],
    'Turkey / Aegean and Central Anatolia':  [ 38.5,  32.0],
    'Turkey / Konya and Central Anatolia':   [ 38.0,  33.5],
    'Turkey / Ottoman Empire':      [ 41.0,  29.0],
    'Central Asia / Turkey':        [ 45.0,  60.0],
    'Middle East / Central Asia':   [ 35.0,  50.0],
    'Middle East / Europe':         [ 39.0,  30.0],
    'Iran':                         [ 32.4,  53.7],
    'Iran / India':                 [ 28.6,  64.0],
    'Iran / Azerbaijan':            [ 38.0,  47.0],
    'Iran / Central Asia':          [ 38.0,  60.0],
    'Mesopotamia / Ancient Greece': [ 33.2,  43.7],
    'Afghanistan':                  [ 33.9,  67.7],
    'Kazakhstan / Kyrgyzstan':      [ 48.0,  68.0],
    'Kyrgyzstan':                   [ 41.2,  74.8],
    // ── South Asia ──────────────────────────────────────────
    'India':                        [ 20.6,  78.9],
    'Sri Lanka / India':            [  8.5,  81.0],
    // ── East / SE Asia ──────────────────────────────────────
    'China':                        [ 35.9, 104.2],
    'Japan':                        [ 36.2, 138.3],
    'South Korea':                  [ 35.9, 127.8],
    'Vietnam':                      [ 14.1, 108.3],
    'Mongolia':                     [ 46.9, 103.8],
    'Myanmar':                      [ 17.6,  96.0],
    'Laos':                         [ 19.9, 102.5],
    'Indonesia':                    [ -0.8, 113.9],
    // ── Oceania ─────────────────────────────────────────────
    'Australia':                    [-25.3, 133.8],
    'New Zealand (Māori)':          [-40.9, 174.9],
    // ── Additional regions ───────────────────────────────────
    'Middle East':                  [ 29.3,  42.5],
    'Armenia':                      [ 40.1,  45.0],
    'Azerbaijan':                   [ 40.4,  47.5],
    'Israel / Middle East':         [ 31.0,  35.0],
    'Egypt':                        [ 26.8,  30.8],
    'Morocco':                      [ 31.8,  -7.1],
    'Nigeria':                      [  9.1,   8.7],
    'Rwanda / Burundi':             [ -2.0,  30.0],
    'Senegal / Gambia (West Africa)':[ 14.5, -14.5],
    'Tuareg people, Sahara Desert (Algeria, Mali, Niger)': [ 20.0,   5.0],
    'Zimbabwe':                     [-20.0,  29.2],
    'Zimbabwe / Africa':            [-18.5,  27.0],
    'Nepal':                        [ 28.4,  84.1],
    'Tibet / Himalayas':            [ 31.0,  88.0],
    'Thailand':                     [ 15.9, 100.9],
    'Philippines':                  [ 12.9, 121.8],
    'Switzerland':                  [ 46.8,   8.2],
    'Switzerland / Austria':        [ 47.2,  10.0],
    'Hungary':                      [ 47.2,  19.5],
    'Basque Country':               [ 43.1,  -1.7],
    'France':                       [ 46.2,   2.2],
    'England':                      [ 52.4,  -1.9],
    'Portugal':                     [ 39.4,  -8.2],
    'Cuba':                         [ 21.5, -77.8],
    // 'Universal' intentionally omitted — no geographic home
  };

  /* ── Internal state ──────────────────────────────────────── */
  const S = {
    map:         null,
    layerGroup:  null,
    instruments: [],   // flat [{...node, _cat: 'kordofonlar'}]
    categories:  [],   // [{id, name_tr, name_en, name_de}]
    initialized: false,
    filter:      null, // null = all, string = catId
    markerDefs:  [],   // [{origLat, origLng, r, marker, region}] for screen jitter
  };

  /* ── Helpers ─────────────────────────────────────────────── */

  function getCoords(regionEn) {
    if (!regionEn) return null;
    if (COORDS[regionEn]) return COORDS[regionEn];
    // Try each slash-separated part ("Iran / India" → try "Iran", "India")
    for (const part of regionEn.split('/')) {
      const k = part.trim().replace(/\s*\(.*\)$/, '').trim();
      if (COORDS[k]) return COORDS[k];
    }
    return null;
  }

  function flattenLeaves(nodes, catId) {
    const out = [];
    for (const node of nodes) {
      const cat = catId || node.id;
      if (node.children && node.children.length > 0) {
        out.push(...flattenLeaves(node.children, cat));
      } else {
        out.push({ ...node, _cat: cat });
      }
    }
    return out;
  }

  /* ── Marker div icon — CSS class approach for performance ─── */
  function makeIcon(count, color, r) {
    const size = r * 2;
    const fs   = r < 18 ? 9 : 11;
    return L.divIcon({
      className: '',
      // All visual styling lives in .mrm (style.css) — no backdrop-filter,
      // no box-shadow, no JS inline transitions — keeps 100 markers at 60 fps
      html: `<div class="mrm" style="--mc:${color};width:${size}px;height:${size}px;border-radius:${r}px;font-size:${fs}px">${count}</div>`,
      iconSize:    [size, size],
      iconAnchor:  [r, r],
      popupAnchor: [0, -r - 4],
    });
  }

  /* ── Build popup DOM element ─────────────────────────────── */
  function buildPopup(region, instruments) {
    const lang = App.state.language;

    const regionLabel = lang === 'tr'
      ? (instruments[0]?.region_tr || region)
      : region;

    const instrWord = { tr: 'enstrüman', en: 'instruments', de: 'Instrumente' }[lang] || 'instruments';

    const wrap = document.createElement('div');
    wrap.className = 'mp-popup';

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'mp-header';
    hdr.innerHTML =
      `<span class="mp-region-name">${regionLabel}</span>` +
      `<span class="mp-count-badge">${instruments.length} ${instrWord}</span>`;
    wrap.appendChild(hdr);

    // Instrument list
    const ul = document.createElement('ul');
    ul.className = 'mp-list';

    const sorted = [...instruments].sort((a, b) => {
      const na = lang === 'tr' ? a.name_tr : lang === 'de' ? a.name_de : a.name_en;
      const nb = lang === 'tr' ? b.name_tr : lang === 'de' ? b.name_de : b.name_en;
      return (na || '').localeCompare(nb || '');
    });

    sorted.forEach(inst => {
      const name = lang === 'tr' ? inst.name_tr : lang === 'de' ? inst.name_de : inst.name_en;
      const color = CAT_COLOR[inst._cat] || '#d4af37';
      const li = document.createElement('li');
      li.className = 'mp-item';
      li.dataset.id = inst.id;
      li.innerHTML = `<span class="mp-dot" style="background:${color}"></span><span class="mp-item-name">${name}</span>`;
      li.addEventListener('click', () => {
        S.map.closePopup();
        App.openModal(inst);
      });
      ul.appendChild(li);
    });

    wrap.appendChild(ul);
    return wrap;
  }

  /* ── Screen-space jitter: runs after every zoom change ──────
     Only markers whose ORIGINAL coords fall inside (or near) the
     current viewport are jittered. Off-screen markers are reset
     to their true lat/lng and left alone — this prevents them
     from piling up at the screen edges and ruining on-screen ones.
     Result: at any zoom level, visible markers never overlap.    */
  function _screenJitter() {
    if (!S.map || !S.markerDefs.length) return;

    // Below zoom 4: keep markers at their true geographic positions.
    // Natural clustering at world-level zoom is intentional and looks good.
    // At zoom ≥ 4: activate repulsion so visible markers never overlap.
    if (S.map.getZoom() < 4) {
      S.markerDefs.forEach(d => d.marker.setLatLng([d.origLat, d.origLng]));
      return;
    }

    const sz     = S.map.getSize();
    const margin = 120; // px — include markers just outside the edge

    // 1. Reset every marker to its original geographic position first
    S.markerDefs.forEach(d => d.marker.setLatLng([d.origLat, d.origLng]));

    // 2. Split into visible (inside viewport+margin) vs off-screen
    const visible = [];
    S.markerDefs.forEach(d => {
      const pt = S.map.latLngToContainerPoint([d.origLat, d.origLng]);
      if (pt.x > -margin && pt.x < sz.x + margin &&
          pt.y > -margin && pt.y < sz.y + margin) {
        visible.push({ px: pt.x, py: pt.y, r: d.r, marker: d.marker, region: d.region });
      }
      // Off-screen markers stay at origLat/origLng — no action needed
    });

    if (visible.length < 2) return;

    // Deterministic angle for zero-distance pairs
    function hashAngle(a, b) {
      let h = 0;
      const s = a + b;
      for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
      return ((h >>> 0) % 360) / 360 * Math.PI * 2;
    }

    // 3. Pixel-space repulsion on VISIBLE markers only — 16 passes
    for (let pass = 0; pass < 16; pass++) {
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i], b = visible[j];
          const dx = b.px - a.px, dy = b.py - a.py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minD = a.r + b.r + 4; // desired gap
          if (dist >= minD) continue;

          let ax, ay;
          if (dist < 0.5) {
            const angle = hashAngle(a.region, b.region);
            ax = Math.cos(angle); ay = Math.sin(angle);
          } else {
            ax = dx / dist; ay = dy / dist;
          }

          const push = (minD - dist) * 0.65;
          const wA   = b.r / (a.r + b.r);
          const wB   = a.r / (a.r + b.r);

          a.px -= ax * push * wA;  a.py -= ay * push * wA;
          b.px += ax * push * wB;  b.py += ay * push * wB;
        }
      }
    }

    // 4. Convert adjusted pixels back to lat/lng — no clamping
    visible.forEach(item => {
      const ll = S.map.containerPointToLatLng([item.px, item.py]);
      item.marker.setLatLng(ll);
    });
  }

  /* ── Plot all markers (re-run when filter changes) ───────── */
  function plotMarkers() {
    if (!S.layerGroup) return;
    S.layerGroup.clearLayers();
    S.markerDefs = [];

    // Group instruments by region_en
    const groups = {};
    for (const inst of S.instruments) {
      if (!inst.region_en) continue;
      if (S.filter && inst._cat !== S.filter) continue;
      if (!groups[inst.region_en]) groups[inst.region_en] = [];
      groups[inst.region_en].push(inst);
    }

    for (const [region, insts] of Object.entries(groups)) {
      const coords = getCoords(region);
      if (!coords) {
        console.warn('[MapView] No coords for region:', region);
        continue;
      }

      const count = insts.length;

      // Dominant category colour
      const tally = {};
      insts.forEach(i => { tally[i._cat] = (tally[i._cat] || 0) + 1; });
      const domCat = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      const color  = CAT_COLOR[domCat] || '#d4af37';

      const r = Math.max(15, Math.min(34, 11 + count * 2.2));
      const marker = L.marker(coords, { icon: makeIcon(count, color, r) });

      marker.bindPopup(buildPopup(region, insts), {
        className:      'map-instr-popup',
        maxWidth:       300,
        minWidth:       210,
        autoPanPadding: L.point(20, 20),
      });

      S.layerGroup.addLayer(marker);

      // Store original position for screen-space jitter
      S.markerDefs.push({ origLat: coords[0], origLng: coords[1], r, marker, region });
    }

    // Apply screen-space separation at current zoom
    _screenJitter();
  }

  /* ── Build / rebuild filter bar ─────────────────────────── */
  function buildFilterBar() {
    const bar = document.getElementById('map-filter-bar');
    if (!bar) return;
    const lang = App.state.language;

    bar.innerHTML = '';

    // "All" button
    const allLabel = { tr: 'Tümü', en: 'All', de: 'Alle' }[lang] || 'All';
    const allBtn = document.createElement('button');
    allBtn.className = 'mfb' + (!S.filter ? ' active' : '');
    allBtn.textContent = allLabel;
    allBtn.addEventListener('click', () => setFilter(null));
    bar.appendChild(allBtn);

    // Per-category buttons
    S.categories.forEach(cat => {
      const name = lang === 'tr' ? cat.name_tr : lang === 'de' ? (cat.name_de || cat.name_en) : cat.name_en;
      const btn  = document.createElement('button');
      btn.className = 'mfb' + (S.filter === cat.id ? ' active' : '');
      btn.style.setProperty('--cat-clr', CAT_COLOR[cat.id] || '#d4af37');
      btn.innerHTML = `<span class="mfb-dot"></span>${name}`;
      btn.addEventListener('click', () => setFilter(S.filter === cat.id ? null : cat.id));
      bar.appendChild(btn);
    });
  }

  function setFilter(catId) {
    S.filter = catId || null;
    buildFilterBar();
    plotMarkers();
  }

  /* ── Public API ──────────────────────────────────────────── */
  return {

    init(data) {
      if (S.initialized) return;
      S.initialized = true;

      // Store root categories
      S.categories = data.map(d => ({
        id:      d.id,
        name_tr: d.name_tr,
        name_en: d.name_en,
        name_de: d.name_de || d.name_en,
      }));

      // Flatten all leaf instruments with their root category
      S.instruments = flattenLeaves(data, null);

      this._buildMap();
    },

    _buildMap() {
      const container = document.getElementById('map-canvas');
      if (!container) return;

      S.map = L.map(container, {
        center:               [20, 0],
        zoom:                 3,
        minZoom:              2,        // overridden dynamically in _fitWorld
        maxZoom:              8,
        zoomControl:          false,
        attributionControl:   true,
        // Hard pan boundary = exactly one world copy.
        // Tiles repeat naturally (fills any screen), but the user
        // cannot pan outside [-180,180] / [-85,85].
        maxBounds:            [[-85, -180], [85, 180]],
        maxBoundsViscosity:   1.0,
      });

      // Standard wrapping tiles — they fill the container at every zoom level.
      // maxBounds above prevents the "infinite scroll" the user didn't want.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>' +
          ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
        subdomains: 'abcd',
        maxZoom:    19,
      }).addTo(S.map);

      // Zoom control — styled in CSS
      L.control.zoom({ position: 'bottomright' }).addTo(S.map);

      // Marker layer
      S.layerGroup = L.layerGroup().addTo(S.map);

      // Re-run screen jitter after every zoom so markers always separate properly
      S.map.on('zoomend', _screenJitter);

      buildFilterBar();
      plotMarkers();
      this._fitWorld();
    },

    // Calculate the minimum zoom where the world fills the container
    // without any void, then lock it as minZoom.
    _fitWorld() {
      if (!S.map) return;
      S.map.invalidateSize();
      const sz = S.map.getSize();                       // container px
      // At zoom Z the world tile grid is 256·2^Z wide.
      // We need that ≥ container dimension on both axes.
      const zW = Math.ceil(Math.log2(sz.x / 256));
      const zH = Math.ceil(Math.log2(sz.y / 256));
      const minZ = Math.max(zW, zH, 2);
      S.map.setMinZoom(minZ);
      // If current zoom is below the new minimum, snap up
      if (S.map.getZoom() < minZ) {
        S.map.setZoom(minZ, { animate: false });
      }
    },

    /** Called every time the map view becomes visible */
    onShow() {
      if (!S.initialized) {
        this.init(App.state.data);
        return;
      }
      requestAnimationFrame(() => {
        setTimeout(() => this._fitWorld(), 80);
      });
      buildFilterBar();
    },

    /** Called when UI language changes */
    setLanguage() {
      if (!S.initialized) return;
      buildFilterBar();
      plotMarkers();
    },

    /**
     * Arama sonucundan haritada o bölgeye git, popup'ı aç,
     * ilgili enstrümanı vurgula ve modalı aç.
     */
    navigateTo(inst) {
      if (!S.map || !S.initialized) return;
      const regionEn = inst.region_en;
      if (!regionEn) return;

      // Find the marker definition for this region
      const def = S.markerDefs.find(d => d.region === regionEn);
      if (!def) return;

      const targetZoom = Math.max(S.map.getZoom(), 5);

      // Fly to the original geographic position of the marker
      S.map.flyTo([def.origLat, def.origLng], targetZoom, {
        animate: true,
        duration: 0.9,
      });

      // After flight lands: open popup, highlight instrument, open modal
      setTimeout(() => {
        def.marker.openPopup();

        // Highlight the specific instrument row in the popup list
        setTimeout(() => {
          const popup = def.marker.getPopup();
          if (!popup) return;
          const popupEl = popup.getElement();
          if (!popupEl) return;
          const item = popupEl.querySelector(`.mp-item[data-id="${inst.id}"]`);
          if (item) {
            item.classList.add('mp-item-highlight');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            setTimeout(() => item.classList.remove('mp-item-highlight'), 2500);
          }
          // Open modal for this instrument (same as radial tree behaviour)
          App.openModal(inst);
        }, 200);
      }, 1000);
    },
  };

})();
