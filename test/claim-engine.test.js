const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { executeClaim, CLAIM_COOLDOWN_MS } = require('../scripts/content');
const { MockElement } = require('./mocks/dom.mock');
const { ChromeStorageMock } = require('./mocks/chrome-storage.mock');

describe('Suite 3: Claim Engine, Cooldown & Anti-Spam Execution', () => {
  let storageMock;
  let chromeMock;

  beforeEach(() => {
    storageMock = new ChromeStorageMock();
    chromeMock = storageMock.createChromeGlobal();
  });

  test('3.1 Successful Claim: Clicks button, tags element, and updates counter', async () => {
    const button = new MockElement('button');
    await storageMock.set({ claimCount: 5 });

    const result = executeClaim(button, chromeMock.storage, {
      cooldownMs: 5000,
      lastTimestamp: 0,
      enabled: true,
      now: 10000,
    });

    assert.equal(result.claimed, true);
    assert.equal(result.timestamp, 10000);
    assert.equal(button.clicksReceived, 1, 'Button should receive exactly 1 click event');
    assert.equal(button.dataset.autoClaimed, 'true', 'Button should be tagged to avoid duplicate clicks');

    // Verify storage updated
    const data = await storageMock.get({ claimCount: 0 });
    assert.equal(data.claimCount, 6, 'Storage claimCount must increment from 5 to 6');
  });

  test('3.2 Cooldown Protection: Blocks rapid subsequent executions within cooldown window', () => {
    const button = new MockElement('button');
    const lastTimestamp = 10000;
    const now = 12000; // 2 seconds later (within 5s cooldown)

    const result = executeClaim(button, chromeMock.storage, {
      cooldownMs: CLAIM_COOLDOWN_MS,
      lastTimestamp,
      enabled: true,
      now,
    });

    assert.equal(result.claimed, false);
    assert.equal(result.reason, 'cooldown');
    assert.equal(button.clicksReceived, 0, 'Must NOT click button during active cooldown');
  });

  test('3.3 Anti-Spam Protection: Rejects buttons already marked as auto-claimed', () => {
    const button = new MockElement('button');
    button.dataset.autoClaimed = 'true';

    const result = executeClaim(button, chromeMock.storage, {
      cooldownMs: 1000,
      lastTimestamp: 0,
      enabled: true,
      now: 10000,
    });

    assert.equal(result.claimed, false);
    assert.equal(result.reason, 'already_claimed');
    assert.equal(button.clicksReceived, 0, 'Must NOT re-click an already-claimed button');
  });

  test('3.4 Disabled State Compliance: Does not click when extension is paused', async () => {
    const button = new MockElement('button');
    await storageMock.set({ claimCount: 20 });

    const result = executeClaim(button, chromeMock.storage, {
      cooldownMs: 1000,
      lastTimestamp: 0,
      enabled: false, // PAUSED
      now: 10000,
    });

    assert.equal(result.claimed, false);
    assert.equal(result.reason, 'disabled');
    assert.equal(button.clicksReceived, 0);

    const data = await storageMock.get({ claimCount: 0 });
    assert.equal(data.claimCount, 20, 'Claim count must not change when paused');
  });

  test('3.5 Null Safe: Gracefully returns without error if button is null', () => {
    const result = executeClaim(null, chromeMock.storage, {
      cooldownMs: 1000,
      lastTimestamp: 0,
      enabled: true,
      now: 10000,
    });

    assert.equal(result.claimed, false);
  });
});

