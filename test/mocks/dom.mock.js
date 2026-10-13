/**
 * Lightweight in-memory DOM implementation for headless unit testing.
 * Implements standard querySelector, querySelectorAll, closest, dataset, and click dispatch.
 */

class MockElement {
  constructor(tagName = 'div', attributes = {}, parent = null) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.children = [];
    this.parentElement = parent;
    this.dataset = {};
    this.listeners = {};
    this.textContent = '';
    this.checked = false;
    this.clicksReceived = 0;
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  get className() {
    return this.attributes['class'] || '';
  }

  set className(val) {
    this.attributes['class'] = val;
  }

  get id() {
    return this.attributes['id'] || '';
  }

  set id(val) {
    this.attributes['id'] = val;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type || event] || [];
    for (const h of handlers) {
      h(event);
    }
  }

  click() {
    this.clicksReceived++;
    this.dispatchEvent({ type: 'click', target: this });
  }

  matches(selector) {
    const sel = selector.trim();
    if (!sel) return false;

    // Handle compound selector with tag and attribute, e.g., button[aria-label="Claim Bonus"]
    const tagAttrMatch = sel.match(/^([a-z0-9_-]+)?(\[[^\]]+\])?(\.[a-z0-9_-]+)?$/i);

    // Tag check
    if (/^[a-z0-9_-]+$/i.test(sel)) {
      return this.tagName.toLowerCase() === sel.toLowerCase();
    }

    // Class check
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      const classes = (this.className || '').split(/\s+/);
      return classes.includes(cls);
    }

    // ID check
    if (sel.startsWith('#')) {
      return this.id === sel.slice(1);
    }

    // Attribute check [name="value"] or [name]
    const attrMatch = sel.match(/^([a-z0-9_-]+)?\[([a-z0-9_-]+)(?:([*~|^$]?=)"([^"]*)")?\]$/i);
    if (attrMatch) {
      const [, tag, attrName, op, expectedVal] = attrMatch;
      if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) {
        return false;
      }
      const actualVal = this.getAttribute(attrName);
      if (actualVal === null) return false;
      if (!op) return true; // [attr] presence check
      if (op === '=') return actualVal === expectedVal;
      if (op === '*=') return actualVal.includes(expectedVal);
      if (op === '^=') return actualVal.startsWith(expectedVal);
      if (op === '$=') return actualVal.endsWith(expectedVal);
    }

    return false;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matches && curr.matches(selector)) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector) {
    const parts = selector.split(',').map((s) => s.trim());
    if (parts.length > 1) {
      const seen = new Set();
      const combined = [];
      for (const part of parts) {
        for (const el of this.querySelectorAll(part)) {
          if (!seen.has(el)) {
            seen.add(el);
            combined.push(el);
          }
        }
      }
      return combined;
    }

    // Descendant selector (e.g. "container button")
    const segments = selector.split(/\s+/).filter(Boolean);
    if (segments.length > 1) {
      let currentMatches = this.querySelectorAll(segments[0]);
      for (let i = 1; i < segments.length; i++) {
        const nextMatches = [];
        for (const el of currentMatches) {
          nextMatches.push(...el.querySelectorAll(segments[i]));
        }
        currentMatches = nextMatches;
      }
      return currentMatches;
    }

    const matches = [];
    const traverse = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) {
          matches.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return matches;
  }
}

class MockDocument extends MockElement {
  constructor() {
    super('DOCUMENT');
    this.body = new MockElement('BODY', {}, this);
    this.children.push(this.body);
  }

  getElementById(id) {
    const search = (node) => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  createElement(tagName, attributes = {}) {
    return new MockElement(tagName, attributes);
  }
}

module.exports = { MockElement, MockDocument };

