// d3-init.js - loads local d3 if available, otherwise falls back to the d3-loader.
(function() {
  try {
    var localPath = chrome && chrome.runtime ? chrome.runtime.getURL('lib/d3.v7.min.js') : '../lib/d3.v7.min.js';
  } catch (e) {
    var localPath = '../lib/d3.v7.min.js';
  }

  var s = document.createElement('script');
  s.src = localPath;
  s.onload = function() { console.log('Loaded local d3'); };
  s.onerror = function() {
    console.warn('Local d3 not found, falling back to CDN loader');
    var loader = document.createElement('script');
    try {
      loader.src = chrome && chrome.runtime ? chrome.runtime.getURL('lib/d3-loader.js') : '../lib/d3-loader.js';
    } catch (e) {
      loader.src = '../lib/d3-loader.js';
    }
    document.head.appendChild(loader);
  };
  document.head.appendChild(s);
})();
