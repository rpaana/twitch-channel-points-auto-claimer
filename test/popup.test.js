const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { initPopup } = require('../popup/popup');
const { MockDocument, MockElement } = require('./mocks/dom.mock');
const { ChromeStorageMock } = require('./mocks/chrome-storage.mock');

describe('Suite 4: Popup Controller & UI State Synchronization', () => {
  let doc;
  let storageMock;
  let chromeMock;
  let toggleEl;
  let badgeEl;
  let countEl;
  let resetBtn;

  beforeEach(() => {
    doc = new MockDocument();
    toggleEl = new MockElement('input', { id: 'toggleEnabled', type: 'checkbox' });
    badgeEl = new MockElement('div', { id: 'statusBadge', class: 'status-badge active' });
    countEl = new MockElement('div', { id: 'claimCount' });
    resetBtn = new MockElement('button', { id: 'resetStatsBtn' });

    doc.body.appendChild(toggleEl);
    doc.body.appendChild(badgeEl);
    doc.body.appendChild(countEl);
    doc.body.appendChild(resetBtn);

    storageMock = new ChromeStorageMock();
    chromeMock = storageMock.createChromeGlobal();
  });

  test('4.1 Initial UI Render: Renders active state and formatted count from storage', async () => {
    await storageMock.set({ enabled: true, claimCount: 1500 });

    initPopup(doc, chromeMock);

    assert.equal(toggleEl.checked, true, 'Toggle switch must be checked when enabled');
    assert.equal(countEl.textContent, (1500).toLocaleString(), 'Counter must format number');
    assert.equal(badgeEl.textContent, 'Active');
    assert.equal(badgeEl.className, 'status-badge active');
  });

  test('4.2 User Toggle: Flipping switch updates storage and badge to Paused', async () => {
    await storageMock.set({ enabled: true, claimCount: 10 });
    initPopup(doc, chromeMock);

    // Simulate user toggling switch off
    toggleEl.checked = false;
    toggleEl.dispatchEvent('change');

    const stored = await storageMock.get({ enabled: true });
    assert.equal(stored.enabled, false, 'Storage must record enabled: false');
    assert.equal(badgeEl.textContent, 'Paused');
    assert.equal(badgeEl.className, 'status-badge paused');
  });

  test('4.3 Stats Reset: Reset button resets counter to 0 upon confirmation', async () => {
    await storageMock.set({ enabled: true, claimCount: 50 });
    // Mock confirmation returning true
    const confirmAlwaysYes = () => true;

    initPopup(doc, chromeMock, confirmAlwaysYes);

    // Simulate reset button click
    resetBtn.dispatchEvent('click');

    const stored = await storageMock.get({ claimCount: 99 });
    assert.equal(stored.claimCount, 0, 'Storage claimCount must be reset to 0');
    assert.equal(countEl.textContent, '0');
  });

  test('4.4 Reactive Storage Sync: UI updates live when storage changes', async () => {
    await storageMock.set({ enabled: true, claimCount: 5 });
    initPopup(doc, chromeMock);

    // Simulate content script claiming bonus in another tab
    await storageMock.set({ claimCount: 6 });

    assert.equal(countEl.textContent, '6', 'Popup count should update in real-time');
  });
});

