# Musiorganolog — Interactive Musical Instrument Family Tree

An interactive, multilingual visualization of the world's musical instruments organized by the [Hornbostel–Sachs classification system](https://en.wikipedia.org/wiki/Hornbostel%E2%80%93Sachs). Explore instrument families, geographic origins, and rich media through a radial tree layout.

---

## Features

- 🌳 **Radial family tree** — D3.js v7 force-free radial layout; sun-ray labels for deep nodes
- 🗺️ **Interactive map** — Leaflet.js map showing geographic origins of each instrument
- 🖼️ **Rich media panel** — Wikimedia Commons thumbnails, descriptions, audio samples
- 🌐 **Trilingual** — Turkish 🇹🇷 / English 🇬🇧 / German 🇩🇪 (TR/EN/DE)
- 🔍 **Live search** — real-time filter across all instrument names
- 🏷️ **Hornbostel–Sachs taxonomy** — Chordophones, Aerophones, Membranophones, Idiophones, Electrophones
- 📌 **Permalink support** — URL hash links to any node (e.g. `#saz`)
- 📱 **Responsive** — touch-friendly pan/zoom, mobile breakpoint

---

## Project Structure

```
organoloji-family-tree/
├── index.html            # Single-page app entry point
├── serve.py              # Local dev server (gzip, cache headers)
├── css/
│   └── style.css         # Global styles
├── js/
│   ├── app.js            # Bootstrap, i18n, tab routing
│   ├── radial.js         # D3.js radial tree visualization
│   ├── map.js            # Leaflet map + instrument pins
│   └── search.js         # Live search logic
└── data/
    └── instruments.json  # Instrument dataset (~7 600 entries)
```

---

## Getting Started

### Prerequisites

- Python 3.x (for local server) **or** any static HTTP server

### Run locally

```bash
# Clone the repo
git clone https://github.com/your-username/organoloji-family-tree.git
cd organoloji-family-tree

# Start the dev server
python3 serve.py
```

Then open **http://localhost:8000** in your browser.

> ⚠️ Opening `index.html` directly via `file://` will fail due to CORS restrictions on the JSON data file. Always use the local server.

---

## Data Format

`data/instruments.json` follows a recursive tree structure:

```json
{
  "name": { "tr": "Kordofonlar", "en": "Chordophones", "de": "Chordophone" },
  "id": "chordophone",
  "children": [
    {
      "name": { "tr": "Saz", "en": "Saz", "de": "Saz" },
      "id": "saz",
      "image": "https://upload.wikimedia.org/...",
      "coords": [39.9, 32.8],
      "description": { "tr": "...", "en": "...", "de": "..." }
    }
  ]
}
```

---

## Classification System

Instruments are organized by the **Hornbostel–Sachs** system (1914), the standard musicological classification:

| Class | Description |
|---|---|
| **Chordophones** | Sound from vibrating strings |
| **Aerophones** | Sound from vibrating air |
| **Membranophones** | Sound from vibrating membranes |
| **Idiophones** | Sound from the instrument body itself |
| **Electrophones** | Sound from electronic means |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Visualization | [D3.js v7](https://d3js.org/) |
| Map | [Leaflet.js](https://leafletjs.com/) |
| Tiles | [OpenStreetMap](https://www.openstreetmap.org/) |
| Fonts | [Google Fonts — Inter](https://fonts.google.com/) |
| Server | Python 3 `http.server` with gzip middleware |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-instruments`
3. Add instruments to `data/instruments.json` following the schema above
4. Submit a pull request

---

## License

MIT — see [LICENSE](LICENSE) for details.

Image credits: [Wikimedia Commons](https://commons.wikimedia.org/) (CC BY / CC BY-SA)
