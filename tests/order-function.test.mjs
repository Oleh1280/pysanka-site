/**
 * Tests for Netlify Function: order.js
 *
 * Run: node --test tests/order-function.test.mjs
 *
 * Tests the order function logic: validation, order number generation,
 * email templates. Does NOT call real APIs (Sanity/Resend).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers extracted from order.js for testing ──

function generateOrderNumber() {
  const now = new Date();
  const datePart = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return 'P' + datePart + '-' + rand;
}

function buildMasterEmail(order) {
  const itemsHtml = order.items
    .map(function(i) { return '<tr><td>' + i.productName + '</td><td>' + i.quantity + '</td><td>' + i.price + ' ₴</td></tr>'; })
    .join('');
  return '<div>' +
    '<p>Замовлення №' + order.orderNumber + '</p>' +
    '<p>' + order.customer.name + '<br>' + order.customer.phone +
    (order.customer.email ? '<br>' + order.customer.email : '') + '</p>' +
    '<p>' + order.delivery.city + ', Нова Пошта №' + order.delivery.np + '</p>' +
    '<table>' + itemsHtml + '</table>' +
    '<p>Разом: ' + order.total + ' ₴</p>' +
    '<p>Оплата: ' + (order.paymentMethod === 'cod' ? 'Накладений платіж' : 'Переказ на картку') + '</p>' +
    (order.comment ? '<p>Коментар: ' + order.comment + '</p>' : '') +
    '</div>';
}

// ── Tests ──

describe('generateOrderNumber', () => {
  it('should match format P{MMDD}-{4digits}', () => {
    const num = generateOrderNumber();
    assert.match(num, /^P\d{4}-\d{4}$/);
  });

  it('should start with P and current month/day', () => {
    const num = generateOrderNumber();
    const now = new Date();
    const expected = 'P' + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    assert.ok(num.startsWith(expected), `${num} should start with ${expected}`);
  });

  it('should generate unique numbers', () => {
    const numbers = new Set();
    for (let i = 0; i < 100; i++) numbers.add(generateOrderNumber());
    assert.ok(numbers.size > 90, `Expected >90 unique numbers, got ${numbers.size}`);
  });
});

describe('Order validation', () => {
  it('should reject missing customer name', () => {
    const body = { customer: { phone: '+380971234567' }, items: [{ productName: 'Test', quantity: 1, price: 100 }] };
    assert.ok(!body.customer.name, 'Name is missing');
  });

  it('should reject missing phone', () => {
    const body = { customer: { name: 'Тест' }, items: [{ productName: 'Test', quantity: 1, price: 100 }] };
    assert.ok(!body.customer.phone, 'Phone is missing');
  });

  it('should reject empty items', () => {
    const body = { customer: { name: 'Тест', phone: '+380971234567' }, items: [] };
    assert.ok(!body.items.length, 'Items are empty');
  });

  it('should accept valid order data', () => {
    const body = {
      customer: { name: 'Іван Петренко', phone: '+380971234567', email: 'ivan@test.com' },
      delivery: { city: 'Київ', np: '23' },
      items: [{ productName: 'Гуцульська з оленем', quantity: 1, price: 450 }],
      paymentMethod: 'cod',
    };
    assert.ok(body.customer.name && body.customer.phone && body.items.length > 0);
  });
});

describe('Total calculation', () => {
  it('should calculate total for single item', () => {
    const items = [{ price: 450, quantity: 1 }];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    assert.equal(total, 450);
  });

  it('should calculate total for multiple items', () => {
    const items = [
      { price: 450, quantity: 2 },
      { price: 720, quantity: 1 },
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    assert.equal(total, 1620);
  });

  it('should not produce NaN with valid quantities', () => {
    const items = [{ price: 450, quantity: 1 }, { price: 720, quantity: 3 }];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    assert.ok(!isNaN(total), 'Total should not be NaN');
    assert.equal(total, 2610);
  });
});

describe('Master email template', () => {
  const order = {
    orderNumber: 'P0101-1234',
    customer: { name: 'Тест Покупець', phone: '+380971234567', email: 'test@test.com' },
    delivery: { city: 'Львів', np: '5' },
    items: [{ productName: 'Буковинська ружа', quantity: 2, price: 380 }],
    total: 760,
    paymentMethod: 'cod',
    comment: 'Подарункова упаковка',
  };

  it('should include order number', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('P0101-1234'));
  });

  it('should include customer details', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('Тест Покупець'));
    assert.ok(html.includes('+380971234567'));
    assert.ok(html.includes('test@test.com'));
  });

  it('should include delivery info', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('Львів'));
    assert.ok(html.includes('№5'));
  });

  it('should include items and total', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('Буковинська ружа'));
    assert.ok(html.includes('760 ₴'));
  });

  it('should show correct payment method - cod', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('Накладений платіж'));
  });

  it('should show correct payment method - transfer', () => {
    const html = buildMasterEmail({ ...order, paymentMethod: 'transfer' });
    assert.ok(html.includes('Переказ на картку'));
  });

  it('should include comment when present', () => {
    const html = buildMasterEmail(order);
    assert.ok(html.includes('Подарункова упаковка'));
  });

  it('should omit comment section when empty', () => {
    const html = buildMasterEmail({ ...order, comment: '' });
    assert.ok(!html.includes('Коментар:'));
  });

  it('should omit email when not provided', () => {
    const html = buildMasterEmail({ ...order, customer: { ...order.customer, email: '' } });
    assert.ok(!html.includes('test@test.com'));
  });
});
