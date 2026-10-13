const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Suite 1: Manifest V3 Specification & Security Scoping', () => {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  test('1.1 Manifest Version must strictly be Manifest V3', () => {
    assert.equal(manifest.manifest_version, 3);
  });

  test('1.2 Permissions must only include "storage" (no unnecessary access)', () => {
    assert.deepEqual(manifest.permissions, ['storage']);
    assert.equal(manifest.host_permissions, undefined, 'Host permissions not required when content_scripts specifies domain');
  });

  test('1.3 Content script matches must strictly target Twitch domain', () => {
    assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be an array');
    assert.equal(manifest.content_scripts.length, 1);

    const scriptConfig = manifest.content_scripts[0];
    assert.deepEqual(scriptConfig.matches, ['https://*.twitch.tv/*']);
    assert.deepEqual(scriptConfig.js, ['scripts/content.js']);

    // Ensure no dangerous wildcards
    const hasWildcards = scriptConfig.matches.some(m => m === '<all_urls>' || m === '*://*/*' || m.includes('google.com'));
    assert.equal(hasWildcards, false, 'Must not match non-Twitch websites');
  });

  test('1.4 Action popup must point to popup/popup.html', () => {
    assert.equal(manifest.action.default_popup, 'popup/popup.html');
  });

  test('1.5 All declared icons must exist on disk and be non-empty', () => {
    const requiredSizes = ['16', '48', '128'];
    for (const size of requiredSizes) {
      const iconRelPath = manifest.icons[size];
      assert.ok(iconRelPath, `Icon size ${size} must be defined in manifest.icons`);
      
      const iconAbsPath = path.join(__dirname, '..', iconRelPath);
      assert.ok(fs.existsSync(iconAbsPath), `Icon file at ${iconRelPath} must exist`);
      
      const stats = fs.statSync(iconAbsPath);
      assert.ok(stats.size > 0, `Icon file ${iconRelPath} must not be empty`);
    }
  });
});

