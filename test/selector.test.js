const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { findBonusButton } = require('../scripts/content');
const {
  createEnglishClaimFixture,
  createSvgIconOnlyFixture,
  createLocalizedClaimFixture,
  createNoBonusChatFixture,
} = require('./fixtures/twitch-doms');

describe('Suite 2: DOM Selector & False-Positive Prevention', () => {
  test('2.1 English Standard: Correctly identifies button[aria-label="Claim Bonus"]', () => {
    const { doc, claimBtn } = createEnglishClaimFixture();
    const result = findBonusButton(doc);
    assert.equal(result, claimBtn, 'Must return the bonus claim button element');
  });

  test('2.2 SVG Chest Icon: Identifies parent button of .claimable-bonus__icon', () => {
    const { doc, claimBtn } = createSvgIconOnlyFixture();
    const result = findBonusButton(doc);
    assert.equal(result, claimBtn, 'Must find button wrapping the claimable-bonus__icon class');
  });

  test('2.3 Localized Buttons: Matches across multiple languages', () => {
    const localizedCases = [
      { lang: 'Finnish', label: 'Lunasta bonus' },
      { lang: 'German', label: 'Bonus einlösen' },
      { lang: 'French', label: 'Récupérer le bonus' },
      { lang: 'Spanish', label: 'Reivindicar puntos' },
    ];

    for (const { lang, label } of localizedCases) {
      const { doc, claimBtn } = createLocalizedClaimFixture(label);
      const result = findBonusButton(doc);
      assert.equal(result, claimBtn, `Must identify claim button in ${lang} (${label})`);
    }
  });

  test('2.4 False Positive Guard: NEVER selects the main points balance drawer button', () => {
    const { doc, balanceBtn } = createNoBonusChatFixture();
    const result = findBonusButton(doc);
    assert.equal(result, null, 'Must return null when only community points balance button is present');
    assert.notEqual(result, balanceBtn, 'Must NEVER click the points balance drawer button');
  });

  test('2.5 Empty Chat: Safely returns null when no points elements exist', () => {
    const emptyDoc = { querySelector: () => null };
    const result = findBonusButton(emptyDoc);
    assert.equal(result, null);
  });

  test('2.6 Error Resilience: Gracefully handles null or undefined document', () => {
    assert.doesNotThrow(() => {
      const result = findBonusButton(null);
      assert.equal(result, null);
    });
  });

  test('2.7 Rewards & Power-ups Guard: NEVER selects Rewards & Power-ups drawer toggle button', () => {
    const { doc, rewardsBtn } = require('./fixtures/twitch-doms').createModernRewardsDrawerFixture();
    const result = findBonusButton(doc);
    assert.equal(result, null, 'Must return null when only Rewards & Power-ups button is present');
    assert.notEqual(result, rewardsBtn, 'Must NEVER click the Rewards & Power-ups drawer toggle');
  });
});

