document.addEventListener('DOMContentLoaded', async () => {
  const statusSpan = document.getElementById('session-status');
  const toggleBtn = document.getElementById('toggle-session-btn');
  const viewBtn = document.getElementById('view-map-btn');

  function updateUI(isActive) {
    statusSpan.textContent = isActive ? 'Active' : 'Inactive';
    toggleBtn.textContent = isActive ? 'Stop Session' : 'Start Session';
    toggleBtn.dataset.active = isActive ? '1' : '0';
  }

  const storage = await chrome.storage.local.get(['isSessionActive']);
  updateUI(!!storage.isSessionActive);

  toggleBtn.addEventListener('click', () => {
    const currentlyActive = toggleBtn.dataset.active === '1';
    const newState = !currentlyActive;
    // update storage & notify background
    // Immediately update storage so state is visible even if service worker is inactive
    chrome.storage.local.set({ isSessionActive: newState }, () => {
      updateUI(newState);
    });

    // Also notify background (will wake service worker if needed)
    chrome.runtime.sendMessage({ type: 'TOGGLE_SESSION', value: newState }, (resp) => {
      // service worker will handle its internal state; we already updated UI/storage
    });
  });

  viewBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('visualizer/visualizer.html') });
  });
});
