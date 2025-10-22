# MindMeld — Research Rabbit Hole Visualizer

Chrome extension (Manifest V3) MVP that tracks pages visited during a research session and visualizes them as a D3 force-directed mind map.

How to load locally

1. Open Chrome and go to chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked" and select this repository folder (`mindmeld`)

Usage

- Open the extension popup, click "Start Session".
- Browse pages (each main-frame navigation will be recorded).
- Click "Stop Session" in the popup to finish.
- Click "View Research Map" to open the visualization page and see the graph.

Notes

- The D3 library is loaded at runtime from CDN via `lib/d3-loader.js`. For offline packaging, replace that with a local copy of `d3.v7.min.js`.
- This MVP stores session data in `chrome.storage.local` under `currentSession`.
