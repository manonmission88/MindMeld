// Background service worker for MindMeld
console.log('MindMeld service worker loaded');

// Initialize default storage state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isSessionActive: false,
    currentSession: { nodes: [], edges: [], lastVisited: null }
  });
  console.log('MindMeld onInstalled: initialized storage');
  // create context menu to open visualizer quickly
  try {
    chrome.contextMenus.create({
      id: 'open-visualizer',
      title: 'Open Research Map',
      contexts: ['action']
    });
  } catch (e) { console.warn('contextMenus not created', e); }
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'TOGGLE_SESSION') {
    console.log('MindMeld received TOGGLE_SESSION message', message);
    const activate = message.value === true;
    if (activate) {
      // start: clear currentSession and set active
      chrome.storage.local.set({ isSessionActive: true, currentSession: { nodes: [], edges: [], lastVisited: null } }, () => {
        console.log('MindMeld: session started');
        sendResponse({ ok: true });
      });
    } else {
      // stop
      chrome.storage.local.set({ isSessionActive: false }, () => {
        console.log('MindMeld: session stopped');
        sendResponse({ ok: true });
      });
    }
    // Return true to indicate async sendResponse
    return true;
  }
});

// Toolbar button click toggles session (simple control)
chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get('isSessionActive', (res) => {
    const newState = !(res && res.isSessionActive);
    chrome.storage.local.set({ isSessionActive: newState }, () => {
      console.log('MindMeld: toolbar toggled, set isSessionActive=', newState);
      // notify background logic via message too (keeps current behavior)
      chrome.runtime.sendMessage({ type: 'TOGGLE_SESSION', value: newState });
      // update badge
      chrome.action.setBadgeText({ text: newState ? 'ON' : '' });
      chrome.action.setBadgeBackgroundColor({ color: newState ? '#22c55e' : '#000000' });
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-visualizer') {
    chrome.tabs.create({ url: chrome.runtime.getURL('visualizer/visualizer.html') });
  }
});

// Helper: add node if missing and return boolean indicating whether node was added
function addNodeIfMissing(nodes, node) {
  const exists = nodes.find(n => n.id === node.id);
  if (!exists) {
    nodes.push(node);
    return true;
  }
  return false;
}

// Track page navigations
chrome.webNavigation.onCompleted.addListener((details) => {
  try {
    // only track main frame navigations
    if (details.frameId !== 0) return;
    console.log('MindMeld: navigation onCompleted event', details);

    // Check session active (callback-style)
    chrome.storage.local.get(['isSessionActive'], (state) => {
      console.log('MindMeld: isSessionActive?', state && state.isSessionActive);
      if (!state || !state.isSessionActive) return;

      // get tab info
      chrome.tabs.get(details.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url) return;

        const url = tab.url;
        const title = tab.title || url;

        chrome.storage.local.get(['currentSession'], (result) => {
          const session = (result && result.currentSession) ? result.currentSession : { nodes: [], edges: [], lastVisited: null };

          const newNode = { id: url, title };
          const added = addNodeIfMissing(session.nodes, newNode);
          if (added) console.log('MindMeld: added node', newNode);

          // Create an edge from lastVisited -> current url (if lastVisited exists)
          if (session.lastVisited) {
            const edgeExists = session.edges && session.edges.find(e => e.source === session.lastVisited && e.target === url);
            if (!edgeExists) {
              session.edges = session.edges || [];
              session.edges.push({ source: session.lastVisited, target: url });
            }
          }

          // update lastVisited regardless
          session.lastVisited = url;

          // persist
          chrome.storage.local.set({ currentSession: session }, () => {
            console.log('MindMeld: currentSession saved', { nodes: session.nodes.length, edges: session.edges && session.edges.length, lastVisited: session.lastVisited });
          });
        });
      });
    });
  } catch (err) {
    console.error('Error tracking navigation', err);
  }
});
