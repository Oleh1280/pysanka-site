/**
 * Tests for phone and email validation logic (from script.js submitOrder)
 *
 * Run: node --test tests/phone-validation.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Validation logic extracted from script.js ──

function validatePhone(raw) {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  return /^(\+?380\d{9}|0\d{9})$/.test(cleaned);
}

function normalizePhone(raw) {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return '+38' + cleaned;
  return '+' + cleaned;
}

function validateEmail(val) {
  if (!val) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

// ── Phone validation tests ──

describe('Phone validation', () => {
  it('accepts +380XXXXXXXXX', () => {
    assert.ok(validatePhone('+380971234567'));
  });

  it('accepts 380XXXXXXXXX (without +)', () => {
    assert.ok(validatePhone('380971234567'));
  });

  it('accepts 0XXXXXXXXX (local format)', () => {
    assert.ok(validatePhone('0971234567'));
  });

  it('accepts with spaces', () => {
    assert.ok(validatePhone('+380 97 123 45 67'));
  });

  it('accepts with dashes', () => {
    assert.ok(validatePhone('+380-97-123-45-67'));
  });

  it('accepts with parentheses', () => {
    assert.ok(validatePhone('+380(97)1234567'));
  });

  it('accepts mixed formatting', () => {
    assert.ok(validatePhone('(097) 123-45-67'));
  });

  it('rejects too short', () => {
    assert.ok(!validatePhone('+38097123'));
  });

  it('rejects too long', () => {
    assert.ok(!validatePhone('+3809712345678'));
  });

  it('rejects non-Ukrainian format', () => {
    assert.ok(!validatePhone('+1234567890'));
  });

  it('rejects empty', () => {
    assert.ok(!validatePhone(''));
  });

  it('rejects letters', () => {
    assert.ok(!validatePhone('+380abc'));
  });
});

// ── Phone normalization tests ──

describe('Phone normalization', () => {
  it('keeps +380 format as-is', () => {
    assert.equal(normalizePhone('+380971234567'), '+380971234567');
  });

  it('normalizes 0XX to +380XX', () => {
    assert.equal(normalizePhone('0971234567'), '+380971234567');
  });

  it('normalizes 380XX to +380XX', () => {
    assert.equal(normalizePhone('380971234567'), '+380971234567');
  });

  it('strips spaces before normalizing', () => {
    assert.equal(normalizePhone('+380 97 123 45 67'), '+380971234567');
  });

  it('strips dashes before normalizing', () => {
    assert.equal(normalizePhone('097-123-45-67'), '+380971234567');
  });
});

// ── Email validation tests ──

describe('Email validation', () => {
  it('accepts empty (optional field)', () => {
    assert.ok(validateEmail(''));
  });

  it('accepts null/undefined (optional)', () => {
    assert.ok(validateEmail(null));
    assert.ok(validateEmail(undefined));
  });

  it('accepts valid email', () => {
    assert.ok(validateEmail('user@example.com'));
  });

  it('accepts email with subdomain', () => {
    assert.ok(validateEmail('user@mail.example.com'));
  });

  it('accepts Ukrainian provider', () => {
    assert.ok(validateEmail('ivan@ukr.net'));
  });

  it('rejects missing @', () => {
    assert.ok(!validateEmail('userexample.com'));
  });

  it('rejects missing domain', () => {
    assert.ok(!validateEmail('user@'));
  });

  it('rejects missing TLD', () => {
    assert.ok(!validateEmail('user@example'));
  });

  it('rejects spaces', () => {
    assert.ok(!validateEmail('user @example.com'));
  });
});

// ── Cart grouping logic ──

describe('Cart item grouping', () => {
  function groupCartItems(cartItems, products) {
    const grouped = {};
    cartItems.forEach(ci => {
      if (grouped[ci.id]) { grouped[ci.id].quantity++; }
      else {
        const p = products.find(pr => pr.id === ci.id);
        grouped[ci.id] = { productName: p ? p.name : ci.name || `Товар #${ci.id}`, quantity: 1, price: p ? p.price : ci.price || 0 };
      }
    });
    return Object.values(grouped);
  }

  const PRODUCTS = [
    { id: 1, name: 'Гуцульська з оленем', price: 450 },
    { id: 2, name: 'Буковинська ружа', price: 380 },
  ];

  it('groups duplicate items and counts quantity', () => {
    const cart = [
      { id: 1, name: 'Гуцульська з оленем', price: 450 },
      { id: 1, name: 'Гуцульська з оленем', price: 450 },
      { id: 2, name: 'Буковинська ружа', price: 380 },
    ];
    const items = groupCartItems(cart, PRODUCTS);
    assert.equal(items.length, 2);
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].productName, 'Гуцульська з оленем');
    assert.equal(items[1].quantity, 1);
  });

  it('handles single item', () => {
    const cart = [{ id: 1, name: 'Гуцульська з оленем', price: 450 }];
    const items = groupCartItems(cart, PRODUCTS);
    assert.equal(items.length, 1);
    assert.equal(items[0].quantity, 1);
  });

  it('handles empty cart', () => {
    const items = groupCartItems([], PRODUCTS);
    assert.equal(items.length, 0);
  });

  it('falls back to cart data if product not in PRODUCTS', () => {
    const cart = [{ id: 99, name: 'Невідома писанка', price: 999 }];
    const items = groupCartItems(cart, PRODUCTS);
    assert.equal(items[0].productName, 'Невідома писанка');
    assert.equal(items[0].price, 999);
  });

  it('calculates correct total after grouping', () => {
    const cart = [
      { id: 1 }, { id: 1 }, { id: 1 },
      { id: 2 },
    ];
    const items = groupCartItems(cart, PRODUCTS);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    assert.equal(total, 450 * 3 + 380);
    assert.ok(!isNaN(total));
  });
});
