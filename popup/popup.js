/**
 * Popup Controller for Twitch Auto-Claimer
 * Manages user toggling, claim statistics display, toolbar icon badges, and reactive chrome.storage sync.
 */

function initPopup(doc = document, chromeApi = chrome, confirmFn = (typeof window !== 'undefined' ? window.confirm : () => true)) {
  const toggleEnabled = doc.getElementById('toggleEnabled');
  const statusBadge = doc.getElementById('statusBadge');
  const claimCountEl = doc.getElementById('claimCount');
  const resetStatsBtn = doc.getElementById('resetStatsBtn');

  if (!toggleEnabled || !statusBadge || !claimCountEl) {
    return null;
  }

  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'status-badge active';
    } else {
      statusBadge.textContent = 'Paused';
      statusBadge.className = 'status-badge paused';
    }

    // Update Chrome toolbar action badge
    if (chromeApi && chromeApi.action && chromeApi.action.setBadgeText) {
      chromeApi.action.setBadgeText({ text: isEnabled ? '' : 'OFF' });
      if (!isEnabled && chromeApi.action.setBadgeBackgroundColor) {
        chromeApi.action.setBadgeBackgroundColor({ color: '#777777' });
      }
    }
  }

  // Load initial settings and statistics from storage
  if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
    chromeApi.storage.local.get({ enabled: true, claimCount: 0 }, (items) => {
      toggleEnabled.checked = Boolean(items.enabled);
      claimCountEl.textContent = (items.claimCount || 0).toLocaleString();
      updateStatusUI(items.enabled);
    });

    // Handle toggle switch changes
    toggleEnabled.addEventListener('change', () => {
      const isEnabled = toggleEnabled.checked;
      chromeApi.storage.local.set({ enabled: isEnabled }, () => {
        updateStatusUI(isEnabled);
      });
    });

    // Handle resetting claim statistics
    if (resetStatsBtn) {
      resetStatsBtn.addEventListener('click', () => {
        if (confirmFn('Reset bonus claims counter to 0?')) {
          chromeApi.storage.local.set({ claimCount: 0 }, () => {
            claimCountEl.textContent = '0';
          });
        }
      });
    }

    // React to storage updates live (e.g. from background or content script)
    if (chromeApi.storage.onChanged) {
      chromeApi.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        if (changes.claimCount !== undefined) {
          claimCountEl.textContent = (changes.claimCount.newValue || 0).toLocaleString();
        }
        if (changes.enabled !== undefined) {
          toggleEnabled.checked = Boolean(changes.enabled.newValue);
          updateStatusUI(changes.enabled.newValue);
        }
      });
    }
  }

  return {
    updateStatusUI,
  };
}

// Browser environment initialization
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initPopup(document, chrome, window.confirm ? window.confirm.bind(window) : undefined);
  });
}

// Export for Node.js unit testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initPopup };
}
