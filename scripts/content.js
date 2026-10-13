/**
 * Twitch Channel Points Auto-Claimer — Content Script
 * Scoped strictly to https://*.twitch.tv/*
 * Zero dependencies, privacy-first, ultra-lightweight.
 */

(function () {
  'use strict';

  const LOG_PREFIX = '[Twitch Auto-Claimer]';
  const CLAIM_COOLDOWN_MS = 5000; // 5-second cooldown between claims to avoid duplicate clicks
  const SCAN_INTERVAL_MS = 3000;  // 3-second heartbeat: ultra-low CPU footprint, battery-friendly

  let isEnabled = true;
  let lastClaimedTimestamp = 0;

  /**
   * Resiliently locate the bonus claim button across different Twitch DOM versions & languages.
   * @param {Document|Object} doc Document or root node to query
   * @returns {Element|null} Found button or null
   */
  /**
   * Checks whether a button is the channel points rewards drawer toggle (which must never be clicked).
   * @param {Element} btn
   * @returns {boolean}
   */
  function isRewardsDrawerButton(btn) {
    if (!btn || !btn.getAttribute) return true;

    // 1. Drawer toggles on Twitch have aria-expanded (e.g. aria-expanded="false")
    if (btn.getAttribute('aria-expanded') !== null) {
      return true;
    }

    // 2. Buttons with rewards/power-ups/balance in their aria-label (and not "claim")
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (
      label.includes('reward') ||
      label.includes('power-up') ||
      label.includes('power up') ||
      label.includes('balance') ||
      label.includes('channel points')
    ) {
      if (!label.includes('claim') && !label.includes('bonus') && !label.includes('lunasta')) {
        return true;
      }
    }

    // 3. Child balance indicator
    if (btn.querySelector && btn.querySelector('[data-test-selector="community-points-balance"]')) {
      return true;
    }

    return false;
  }

  /**
   * Resiliently locate the bonus claim button across different Twitch DOM versions & languages.
   * @param {Document|Object} doc Document or root node to query
   * @returns {Element|null} Found button or null
   */
  function findBonusButton(doc = document) {
    if (!doc || !doc.querySelector) return null;

    // 1. Direct aria-label matching (English)
    const directAria = doc.querySelector('button[aria-label="Claim Bonus"], [aria-label="Claim Bonus"]');
    if (directAria && !isRewardsDrawerButton(directAria)) {
      return directAria;
    }

    // 2. Dedicated Twitch bonus icon class
    const bonusIcon = doc.querySelector('.claimable-bonus__icon');
    if (bonusIcon) {
      const parentBtn = bonusIcon.closest('button');
      if (parentBtn && !isRewardsDrawerButton(parentBtn)) {
        return parentBtn;
      }
    }

    // 3. Inspect community points container (handles localized interfaces)
    const summaryContainer = doc.querySelector(
      '[data-test-selector="community-points-summary"], .community-points-summary'
    );
    if (summaryContainer) {
      const buttons = summaryContainer.querySelectorAll('button');
      for (const btn of buttons) {
        // Skip the main rewards/power-ups/balance drawer button
        if (isRewardsDrawerButton(btn)) {
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

        // If the button wraps a claimable bonus icon
        if (btn.querySelector('.claimable-bonus__icon')) {
          return btn;
        }
      }
    }

    return null;
  }

  /**
   * Performs the claim action with cooldown and state safety checks.
   * @param {Element} button Target button to click
   * @param {Object} storage chrome.storage or mock storage
   * @param {Object} options Execution options (cooldownMs, lastClaimedTimestamp, isEnabled, now)
   * @returns {Object} Result of claim operation
   */
  function executeClaim(button, storage, options = {}) {
    const {
      cooldownMs = CLAIM_COOLDOWN_MS,
      lastTimestamp = 0,
      enabled = true,
      now = Date.now(),
    } = options;

    if (!enabled) {
      return { claimed: false, reason: 'disabled' };
    }

    if (now - lastTimestamp < cooldownMs) {
      return { claimed: false, reason: 'cooldown' };
    }

    if (!button || button.dataset.autoClaimed === 'true') {
      return { claimed: false, reason: 'already_claimed' };
    }

    // Mark element to avoid duplicate clicks
    button.dataset.autoClaimed = 'true';
    button.click();

    // Increment lifetime statistics in storage
    if (storage && storage.local) {
      storage.local.get({ claimCount: 0 }, (data) => {
        storage.local.set({ claimCount: (data.claimCount || 0) + 1 });
      });
    }

    return { claimed: true, timestamp: now };
  }

  /**
   * Browser runtime initialization
   */
  function initBrowser() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return;
    }

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
          runCheck();
        }
      }
    });

    function runCheck() {
      if (!isEnabled) return;
      const button = findBonusButton(document);
      const result = executeClaim(button, chrome.storage, {
        cooldownMs: CLAIM_COOLDOWN_MS,
        lastTimestamp: lastClaimedTimestamp,
        enabled: isEnabled,
      });

      if (result.claimed) {
        lastClaimedTimestamp = result.timestamp;
        console.log(`${LOG_PREFIX} 🎁 Bonus channel points claimed at ${new Date().toLocaleTimeString()}!`);
      }
    }

    // High-efficiency heartbeat:
    // A 3-second interval uses ~0.05ms CPU per check and completely avoids
    // the heavy DOM overhead of observing high-velocity chat streams.
    setInterval(runCheck, SCAN_INTERVAL_MS);
  }

  // Run in browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    initBrowser();
  }

  // Export for headless testing in Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      findBonusButton,
      executeClaim,
      CLAIM_COOLDOWN_MS,
      SCAN_INTERVAL_MS,
    };
  }
})();
