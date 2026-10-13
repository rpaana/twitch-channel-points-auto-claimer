/**
 * Mock implementation of Chrome Extension Storage and Action API
 */
class ChromeStorageMock {
  constructor() {
    this.storage = {};
    this.listeners = [];
    this.badgeText = '';
    this.badgeColor = '';
  }

  get(defaults, callback) {
    const result = {};
    if (typeof defaults === 'object' && defaults !== null) {
      for (const [key, defaultValue] of Object.entries(defaults)) {
        result[key] = this.storage[key] !== undefined ? this.storage[key] : defaultValue;
      }
    } else if (typeof defaults === 'string') {
      result[defaults] = this.storage[defaults];
    } else if (Array.isArray(defaults)) {
      for (const key of defaults) {
        result[key] = this.storage[key];
      }
    } else {
      Object.assign(result, this.storage);
    }

    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  }

  set(items, callback) {
    const changes = {};
    for (const [key, val] of Object.entries(items)) {
      const oldValue = this.storage[key];
      this.storage[key] = val;
      changes[key] = { oldValue, newValue: val };
    }

    // Notify registered listeners
    for (const listener of this.listeners) {
      try {
        listener(changes, 'local');
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    }

    if (callback) {
      callback();
    }
    return Promise.resolve();
  }

  createChromeGlobal() {
    const self = this;
    return {
      storage: {
        local: {
          get: (defaults, cb) => self.get(defaults, cb),
          set: (items, cb) => self.set(items, cb),
        },
        onChanged: {
          addListener: (fn) => self.listeners.push(fn),
          removeListener: (fn) => {
            self.listeners = self.listeners.filter((l) => l !== fn);
          },
        },
      },
      action: {
        setBadgeText: (details) => {
          self.badgeText = details.text;
        },
        setBadgeBackgroundColor: (details) => {
          self.badgeColor = details.color;
        },
      },
    };
  }

  reset() {
    this.storage = {};
    this.listeners = [];
    this.badgeText = '';
    this.badgeColor = '';
  }
}

module.exports = { ChromeStorageMock };
