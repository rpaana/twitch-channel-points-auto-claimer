/**
 * Real-world simulated Twitch DOM fixtures for unit testing selector resilience.
 */
const { MockDocument, MockElement } = require('../mocks/dom.mock');

function createTwitchBaseDoc() {
  const doc = new MockDocument();
  const chatRoom = new MockElement('div', { class: 'chat-room' });
  doc.body.appendChild(chatRoom);
  return { doc, chatRoom };
}

// 1. Standard English Twitch with aria-label="Claim Bonus"
function createEnglishClaimFixture() {
  const { doc, chatRoom } = createTwitchBaseDoc();

  const pointsContainer = new MockElement('div', {
    class: 'community-points-summary',
    'data-test-selector': 'community-points-summary',
  });

  // Main balance button
  const balanceBtn = new MockElement('button');
  balanceBtn.appendChild(new MockElement('span', { 'data-test-selector': 'community-points-balance' }));
  pointsContainer.appendChild(balanceBtn);

  // Bonus claim button
  const claimBtn = new MockElement('button', {
    'aria-label': 'Claim Bonus',
    class: 'tw-button tw-button--success',
  });
  claimBtn.appendChild(new MockElement('span', { class: 'claimable-bonus__icon' }));
  pointsContainer.appendChild(claimBtn);

  chatRoom.appendChild(pointsContainer);
  return { doc, claimBtn, balanceBtn };
}

// 2. Icon-based bonus button (no explicit aria-label)
function createSvgIconOnlyFixture() {
  const { doc, chatRoom } = createTwitchBaseDoc();

  const pointsContainer = new MockElement('div', {
    class: 'community-points-summary',
  });

  const claimBtn = new MockElement('button', { class: 'tw-core-button' });
  const icon = new MockElement('div', { class: 'claimable-bonus__icon' });
  claimBtn.appendChild(icon);
  pointsContainer.appendChild(claimBtn);

  chatRoom.appendChild(pointsContainer);
  return { doc, claimBtn };
}

// 3. Localized bonus buttons (Finnish, German, French, Spanish)
function createLocalizedClaimFixture(langLabel) {
  const { doc, chatRoom } = createTwitchBaseDoc();

  const pointsContainer = new MockElement('div', {
    class: 'community-points-summary',
    'data-test-selector': 'community-points-summary',
  });

  const balanceBtn = new MockElement('button');
  balanceBtn.appendChild(new MockElement('span', { 'data-test-selector': 'community-points-balance' }));
  pointsContainer.appendChild(balanceBtn);

  const claimBtn = new MockElement('button', {
    'aria-label': langLabel,
  });
  claimBtn.appendChild(new MockElement('svg'));
  pointsContainer.appendChild(claimBtn);

  chatRoom.appendChild(pointsContainer);
  return { doc, claimBtn, balanceBtn };
}

// 4. Regular chat without bonus (CRITICAL: must not match balance button)
function createNoBonusChatFixture() {
  const { doc, chatRoom } = createTwitchBaseDoc();

  const pointsContainer = new MockElement('div', {
    class: 'community-points-summary',
    'data-test-selector': 'community-points-summary',
  });

  const balanceBtn = new MockElement('button', {
    'aria-label': 'Channel Points Balance: 15,240',
  });
  const balanceLabel = new MockElement('span', {
    'data-test-selector': 'community-points-balance',
  });
  balanceLabel.textContent = '15.2k';
  balanceBtn.appendChild(balanceLabel);
  pointsContainer.appendChild(balanceBtn);

  chatRoom.appendChild(pointsContainer);
  return { doc, balanceBtn };
}

module.exports = {
  createEnglishClaimFixture,
  createSvgIconOnlyFixture,
  createLocalizedClaimFixture,
  createNoBonusChatFixture,
};

