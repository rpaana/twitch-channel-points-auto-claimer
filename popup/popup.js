document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const statusBadge = document.getElementById('statusBadge');
  const claimCountEl = document.getElementById('claimCount');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'status-badge active';
    } else {
      statusBadge.textContent = 'Paused';
      statusBadge.className = 'status-badge paused';
    }
  }

  // Load initial settings and statistics
  chrome.storage.local.get({ enabled: true, claimCount: 0 }, (items) => {
    toggleEnabled.checked = items.enabled;
    claimCountEl.textContent = items.claimCount.toLocaleString();
    updateStatusUI(items.enabled);
  });

  // Handle toggle switch changes
  toggleEnabled.addEventListener('change', () => {
    const isEnabled = toggleEnabled.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      updateStatusUI(isEnabled);
    });
  });

  // Handle resetting claim statistics
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Reset bonus claims counter to 0?')) {
      chrome.storage.local.set({ claimCount: 0 }, () => {
        claimCountEl.textContent = '0';
      });
    }
  });

  // React to storage updates live (e.g., when content script increments claims)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.claimCount !== undefined) {
      claimCountEl.textContent = (changes.claimCount.newValue || 0).toLocaleString();
    }
    if (changes.enabled !== undefined) {
      toggleEnabled.checked = changes.enabled.newValue;
      updateStatusUI(changes.enabled.newValue);
    }
  });
});
