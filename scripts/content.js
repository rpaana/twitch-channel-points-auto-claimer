/**
 * Twitch Channel Points Auto-Claimer — Content Script
 * Scoped strictly to https://*.twitch.tv/*
 * Zero dependencies, privacy-first, ultra-lightweight.
 */

(function () {
  'use strict';

  const LOG_PREFIX = '[Twitch Auto-Claimer]';
  let isEnabled = true;
  let lastClaimedTimestamp = 0;
  const CLAIM_COOLDOWN_MS = 5000; // 5-second cooldown between claims to avoid duplicate clicks

  // Initialize status from local storage
  chrome.storage.local.get({ enabled: true }, (data) => {
    isEnabled = data.enabled;
    if (isEnabled) {
      console.log(`${LOG_PREFIX} Initialized and active.`);
    } else {
      console.log(`${LOG_PREFIX} Initialized (currently paused by user).`);
    }
  });

  // Listen for toggle updates in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.enabled !== undefined) {
      isEnabled = changes.enabled.newValue;
      console.log(`${LOG_PREFIX} State updated: ${isEnabled ? 'ACTIVE' : 'PAUSED'}`);
      if (isEnabled) {
        checkAndClaim();
      }
    }
  });

  /**
   * Resiliently locate the bonus claim button across different Twitch DOM versions & languages.
   */
  function findBonusButton() {
    // 1. Direct aria-label matching (English)
    const directAria = document.querySelector('button[aria-label="Claim Bonus"], [aria-label="Claim Bonus"]');
    if (directAria) return directAria;

    // 2. Dedicated Twitch bonus icon class
    const bonusIcon = document.querySelector('.claimable-bonus__icon');
    if (bonusIcon) {
      const parentBtn = bonusIcon.closest('button');
      if (parentBtn) return parentBtn;
    }

    // 3. Inspect community points container (handles localized interfaces)
    const summaryContainer = document.querySelector(
      '[data-test-selector="community-points-summary"], .community-points-summary'
    );
    if (summaryContainer) {
      const buttons = summaryContainer.querySelectorAll('button');
      for (const btn of buttons) {
        // Skip the main balance button
        if (btn.querySelector('[data-test-selector="community-points-balance"]')) {
          continue;
        }

        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        // Check for common localized keywords
        if (
          label.includes('bonus') ||
          label.includes('claim') ||
          label.includes('lunasta') ||
          label.includes('einlösen') ||
          label.includes('récupérer') ||
          label.includes('reivindicar')
        ) {
          return btn;
        }

        // If the button has an SVG icon inside and isn't the balance viewer, it's the chest
        if (btn.querySelector('svg')) {
          return btn;
        }
      }
    }

    return null;
  }

  /**
   * Check for bonus button and claim it if available
   */
  function checkAndClaim() {
    if (!isEnabled) return;

    const now = Date.now();
    if (now - lastClaimedTimestamp < CLAIM_COOLDOWN_MS) {
      return; // Within cooldown window
    }

    const button = findBonusButton();
    if (!button || button.dataset.autoClaimed === 'true') {
      return;
    }

    // Mark element to avoid duplicate clicks before DOM removal
    button.dataset.autoClaimed = 'true';
    lastClaimedTimestamp = now;

    // Trigger the claim
    button.click();
    console.log(`${LOG_PREFIX} 🎁 Bonus channel points claimed at ${new Date().toLocaleTimeString()}!`);

    // Increment lifetime statistics in storage
    chrome.storage.local.get({ claimCount: 0 }, (data) => {
      chrome.storage.local.set({ claimCount: (data.claimCount || 0) + 1 });
    });
  }

  // Periodic polling interval (resilient to SPA routing and background tabs)
  setInterval(checkAndClaim, 2500);

  // MutationObserver for instant reaction as soon as the chest appears
  let observerDebounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (!isEnabled) return;
    if (observerDebounceTimeout) return;

    observerDebounceTimeout = setTimeout(() => {
      observerDebounceTimeout = null;
      checkAndClaim();
    }, 400);
  });

  // Start observing once the document is ready
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
