// Lightweight loader: injects D3 v7 from CDN into the page.
// We keep a loader file so extension doesn't rely on external network for packaging, but it will load at runtime.
(function () {
  if (window.d3) return;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
  s.onload = () => console.log('D3 loaded');
  s.onerror = () => console.error('Failed to load D3 from CDN');
  document.head.appendChild(s);
})();
