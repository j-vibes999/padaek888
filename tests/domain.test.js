// tests/domain.test.js
// Runs the REAL domain code from index.html (<script id="pa-deak-domain">), not a copy.
// Run: npm test   (or: node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const domainSrc = html.match(/<script id="pa-deak-domain">([\s\S]*?)<\/script>/);
assert.ok(domainSrc, 'index.html must contain <script id="pa-deak-domain">');
vm.runInThisContext(domainSrc[1], { filename: 'index.html#pa-deak-domain' });
const D = globalThis.PaDeakDomain;
const appSrc = (html.match(/<script id="pa-deak-app">([\s\S]*?)<\/script>/) || [])[1] || '';

const NOW = new Date('2026-10-19T05:00:00.000Z');
const clone = (o) => JSON.parse(JSON.stringify(o));

function baseState() {
  return D.normalizeState({
    meta: { schemaVersion: 3 },
    pricing: { price350: 20000, cost350: 12000 },
    inventory: { can350: 1000 },
    stores: [
      { id: 'ST-01', name: 'ຮ້ານ A', area: 'ວຽງຈັນ', route: 'ລົດສົ່ງ', customPriceLAK: 20000, creditDays: 7, phone: '020 5551 2345', lat: 17.96, lng: 102.61 },
      { id: 'ST-02', name: 'ຮ້ານ B', area: 'ວຽງຈັນ', route: 'ລົດສົ່ງ', customPriceLAK: 20000, creditDays: 0, phone: '020 5551 0000', lat: 18.02, lng: 102.63 },
      { id: 'ST-03', name: 'ຕົວແທນ ປາກເຊ', area: 'ປາກເຊ', route: 'ຝາກຂົນສົ່ງ', customPriceLAK: 17500, creditDays: 30, phone: '020 3344 5566', lat: 15.12, lng: 105.79 }
    ],
    orders: [
      { id: 'ORD-2026-001', storeId: 'ST-01', storeName: 'ຮ້ານ A', route: 'ລົດສົ່ງ', qty350: 120, unitPriceLAK: 20000, unitCostLAK: 12000, status: 'WAITING_PACK', createdAt: NOW.toISOString() },
      { id: 'ORD-2026-002', storeId: 'ST-02', storeName: 'ຮ້ານ B', route: 'ລົດສົ່ງ', qty350: 48, unitPriceLAK: 20000, unitCostLAK: 12000, status: 'PACKING', createdAt: NOW.toISOString() }
    ],
    invoices: [],
    inbounds: []
  }, NOW).state;
}

test('pack math: default 12 cans per pack, remainders and negatives', () => {
  assert.equal(D.DEFAULT_PACK_SIZE, 12);
  assert.deepEqual(D.splitCases(24), { cases: 2, remainder: 0 });
  assert.deepEqual(D.splitCases(30), { cases: 2, remainder: 6 });
  assert.equal(D.formatCases(24), '2 ແພັກ');
  assert.equal(D.formatCases(14), '1 ແພັກ + 2 ກະປ໋ອງ', 'no nested brackets when callers wrap it in ( )');
  assert.equal(D.formatCases(5), '5 ກະປ໋ອງ', 'less than one pack reads as cans only');
  assert.equal(D.formatCases(0), '0 ແພັກ');
  assert.equal(D.formatCases(-12), '-1 ແພັກ');
  assert.equal(D.formatCases(-14), '-1 ແພັກ + 2 ກະປ໋ອງ');
});

test('pack size is configurable; stored quantities (cans) never change', () => {
  const case24 = { size: 24, label: 'ລັງ' };
  assert.deepEqual(D.splitCases(48, 24), { cases: 2, remainder: 0 });
  assert.equal(D.formatCases(26, case24), '1 ລັງ + 2 ກະປ໋ອງ');
  assert.equal(D.formatCases(26, { size: 6, label: 'ກ່ອງ' }), '4 ກ່ອງ + 2 ກະປ໋ອງ');
  // invalid input falls back to safe defaults
  assert.deepEqual(D.normalizePack({ size: 0, label: 'x' }), { size: 12, label: 'ແພັກ' });
  assert.deepEqual(D.normalizePack({ size: 999 }), { size: 12, label: 'ແພັກ' });
  assert.deepEqual(D.normalizePack({ size: '24', label: 'ລັງ' }), { size: 24, label: 'ລັງ' });
  assert.deepEqual(D.splitCases(30, 0), { cases: 2, remainder: 6 }, 'bad pack size never divides by zero');
  // old saved data (no packaging field) gets the default; a saved pack survives normalize
  const s = baseState();
  assert.deepEqual(s.packaging, { size: 12, label: 'ແພັກ' });
  s.packaging = { size: 24, label: 'ລັງ' };
  const again = D.normalizeState(clone(s), NOW).state;
  assert.deepEqual(D.packOf(again), { size: 24, label: 'ລັງ' });
  assert.equal(again.orders[0].qty350, 120, 'order quantity untouched');
  assert.equal(again.inventory.can350, s.inventory.can350, 'stock untouched');
});

test('numbers typed with thousand separators are read correctly', () => {
  assert.equal(D.toInt('4,800,000'), 4800000);
  assert.equal(D.toInt(' 12,000 '), 12000);
  assert.equal(D.toNum('1,234.5'), 1234.5);
  assert.equal(D.toInt(''), 0);
  assert.equal(D.toInt('', 7), 7);
  const t = D.orderTotals(D.toInt('24'), D.toInt('20,000'), D.toInt('12,000'));
  assert.equal(t.totalLAK, 480000);
});

test('order totals, margins and empty inputs never produce NaN', () => {
  const t = D.orderTotals(120, 20000, 12000);
  assert.equal(t.totalLAK, 2400000);
  assert.equal(t.profitLAK, 960000);
  assert.equal(t.marginPct, 40);
  assert.equal(D.orderTotals(480, 18000, 12000).marginPct, 33.3);
  const empty = D.orderTotals(24, 20000, D.toInt('', 12000));
  assert.equal(empty.unitCostLAK, 12000, 'empty cost field falls back to default (old code used ?? on NaN)');
  assert.ok(Number.isFinite(empty.profitLAK));
  assert.equal(D.toInt('abc', 7), 7);
});

test('route normalization', () => {
  assert.equal(D.normalizeRoute('ລົດກະບະສົ່ງຮອບໃນເມືອງ'), D.ROUTE_LOCAL);
  assert.equal(D.normalizeRoute('ຂົນສົ່ງດ່ວນ Flash / Anousith'), D.ROUTE_FREIGHT);
  assert.equal(D.normalizeRoute('ຝາກລົດຕູ້ / ລົດເມສາຍເໜືອ'), D.ROUTE_FREIGHT);
  assert.equal(D.normalizeRoute(''), D.ROUTE_LOCAL);
});

test('phones: WhatsApp links and validation', () => {
  assert.equal(D.getWhatsAppUrl('020 5551 2345'), 'https://wa.me/8562055512345');
  assert.equal(D.getWhatsAppUrl('20 5551 2345'), 'https://wa.me/8562055512345');
  assert.equal(D.getWhatsAppUrl('+856 20 9988 7766'), 'https://wa.me/8562099887766');
  assert.equal(D.getWhatsAppUrl('-'), null);
  assert.equal(D.getWhatsAppUrl(null), null);
  assert.equal(D.validatePhone('030 9988 7766'), true);
  assert.equal(D.validatePhone('12345'), false);
  assert.equal(D.validatePhone('ໂທຫາເຈ້ນົກ'), false);
});

test('dates are real ISO timestamps; Lao text dates are parsed', () => {
  const iso = D.parseLaoDate('08 ຕຸລາ 2026');
  assert.equal(D.dateKey(iso), '2026-10-08');
  assert.equal(D.formatDate(iso), '08 ຕຸລາ 2026');
  assert.equal(D.dateKey(D.addDays(iso, 7)), '2026-10-15');
  assert.equal(D.parseLaoDate('ມື້ນີ້ ພຽງສ້າງ'), null);
  assert.equal(D.formatDate(null), '-');
  assert.ok(D.isSameDay(NOW.toISOString(), NOW));
});

test('IDs are never reused after deletes (old code used length + 1)', () => {
  const s = baseState();
  const a = D.nextId(s, 'ORD', NOW);
  assert.equal(a, 'ORD-2026-003');
  s.orders.unshift({ id: a });
  s.orders = s.orders.filter(o => o.id !== a); // delete the newest one
  assert.equal(D.nextId(s, 'ORD', NOW), 'ORD-2026-004', 'counter keeps moving forward');
  assert.equal(D.peekNextId(s, 'ST', NOW), 'ST-04');
  assert.equal(D.peekNextId(s, 'ST', NOW), 'ST-04', 'peek does not consume');
  s.invoices.push({ id: 'INV-2026-0415' });
  assert.equal(D.nextId(s, 'INV', NOW), 'INV-2026-0416');
});

test('stock: available = on hand − orders still waiting/packing', () => {
  const s = baseState();
  assert.equal(D.reservedCans(s), 168);
  assert.equal(D.availableCans(s), 832);
});

test('order lifecycle: stock leaves at OUT_FOR_DELIVERY, invoice at DELIVERED', () => {
  const s = baseState();
  assert.equal(D.advanceOrder(s, 'ORD-2026-001', NOW).to, 'PACKING');
  assert.equal(s.inventory.can350, 1000);
  const out = D.advanceOrder(s, 'ORD-2026-001', NOW);
  assert.equal(out.to, 'OUT_FOR_DELIVERY');
  assert.equal(s.inventory.can350, 880);
  const done = D.advanceOrder(s, 'ORD-2026-001', NOW);
  assert.equal(done.to, 'DELIVERED');
  assert.equal(s.inventory.can350, 880, 'not deducted twice');
  assert.equal(done.invoice.amountLAK, 2400000);
  assert.equal(D.dateKey(done.invoice.dueDate), '2026-10-26', '7 credit days');
  assert.equal(s.stores[0].debtLAK, 2400000, 'debt derived from invoice');
  assert.equal(D.advanceOrder(s, 'ORD-2026-001', NOW).error, 'FINAL');
});

test('shipping more than stock is blocked and changes nothing (old code clamped to 0)', () => {
  const s = baseState();
  s.inventory.can350 = 100;
  const r = D.advanceOrder(s, 'ORD-2026-002', NOW); // PACKING -> OUT, 48 cans: ok
  assert.ok(r.ok);
  s.orders[0].status = 'PACKING';
  const blocked = D.advanceOrder(s, 'ORD-2026-001', NOW); // 120 > 52
  assert.equal(blocked.error, 'INSUFFICIENT_STOCK');
  assert.equal(blocked.shortage, 68);
  assert.equal(s.inventory.can350, 52);
  assert.equal(s.orders[0].status, 'PACKING');
});

test('revert and cancel restore exactly what was deducted', () => {
  const s = baseState();
  D.advanceOrder(s, 'ORD-2026-002', NOW); // -> OUT, -48
  assert.equal(s.inventory.can350, 952);
  const rv = D.revertOrder(s, 'ORD-2026-002', NOW);
  assert.equal(rv.to, 'PACKING');
  assert.equal(s.inventory.can350, 1000);
  D.advanceOrder(s, 'ORD-2026-002', NOW);
  D.advanceOrder(s, 'ORD-2026-002', NOW); // delivered, COD invoice
  const inv = D.invoiceForOrder(s, 'ORD-2026-002');
  assert.equal(D.dateKey(inv.dueDate), D.dateKey(NOW), 'COD is due the same day');
  assert.equal(D.revertOrder(s, 'ORD-2026-002', NOW).error, 'USE_CANCEL');
  const c = D.cancelOrder(s, 'ORD-2026-002', NOW);
  assert.equal(c.restored, 48);
  assert.equal(s.inventory.can350, 1000);
  assert.equal(inv.status, 'CANCELLED');
  assert.equal(D.receivableTotal(s), 0, 'cancelled invoices are not receivable');
  assert.equal(D.isOpenInvoice(inv), false, 'cancelled invoices cannot be paid');
});

test('payments: partial + full keep history and the original amount', () => {
  const s = baseState();
  ['ORD-2026-001', 'ORD-2026-001', 'ORD-2026-001'].forEach(id => D.advanceOrder(s, id, NOW));
  const inv = D.invoiceForOrder(s, 'ORD-2026-001');
  const p1 = D.applyPayment(inv, { amount: 1000000, method: 'ເງິນສົດ', at: NOW.toISOString() });
  assert.equal(p1.isFull, false);
  assert.equal(D.invoiceState(inv, NOW), 'PARTIAL');
  assert.equal(s.stores[0].debtLAK, 2400000, 'debt is recomputed on save, not mutated');
  D.recomputeDerived(s);
  assert.equal(s.stores[0].debtLAK, 1400000);
  const p2 = D.applyPayment(inv, { amount: 2000000, method: 'BCEL', ref: 'X1' });
  assert.equal(p2.applied, 1400000, 'overpayment capped at balance');
  assert.equal(p2.change, 600000);
  assert.equal(inv.status, 'PAID');
  assert.equal(inv.amountLAK, 2400000, 'original amount kept (old code overwrote it)');
  assert.equal(inv.payments.length, 2);
  assert.equal(D.collectedTotal(s), 2400000, 'collected counts every payment');
  assert.equal(D.applyPayment(inv, { amount: 1 }).error, 'NOT_OPEN');
  assert.equal(D.deleteOrder(s, 'ORD-2026-001').error, 'HAS_PAYMENTS');
});

test('overdue is computed from the due date', () => {
  const inv = { amountLAK: 100, payments: [], status: 'UNPAID', dueDate: D.parseLaoDate('10 ຕຸລາ 2026') };
  assert.equal(D.invoiceState(inv, NOW), 'OVERDUE');
  inv.dueDate = D.parseLaoDate('25 ຕຸລາ 2026');
  assert.equal(D.invoiceState(inv, NOW), 'UNPAID');
});

test('stores are linked by id: renaming keeps history and debt together', () => {
  const s = baseState();
  ['ORD-2026-001', 'ORD-2026-001', 'ORD-2026-001'].forEach(id => D.advanceOrder(s, id, NOW));
  D.renameStore(s, 'ST-01', "Joe's \"Shop\"");
  assert.equal(s.orders[0].storeName, "Joe's \"Shop\"");
  assert.equal(s.invoices[0].storeName, "Joe's \"Shop\"");
  assert.equal(D.storeBalance(s, 'ST-01'), 2400000);
  assert.ok(D.isDuplicateStoreName(s, 'ຮ້ານ b'));
  assert.ok(!D.isDuplicateStoreName(s, 'ຮ້ານ B', 'ST-02'));
});

test('profit stats: realized = delivered only, cancelled excluded', () => {
  const s = baseState();
  ['ORD-2026-001', 'ORD-2026-001', 'ORD-2026-001'].forEach(id => D.advanceOrder(s, id, NOW));
  const st = D.storeStats(s);
  assert.equal(st.get('ST-01').totalProfit, 960000);
  assert.equal(st.get('ST-02').totalProfit, 0);
  assert.equal(st.get('ST-02').pendingProfit, 384000);
  D.cancelOrder(s, 'ORD-2026-002', NOW);
  assert.equal(D.overallStats(s).pendingProfit, 0);
  assert.equal(D.overallStats(s).marginPct, 40);
});

test('dispatch: COD amount only for cash stores; route ordered by distance', () => {
  const s = baseState();
  const g = D.dispatchByStore(s, { route: D.ROUTE_LOCAL });
  assert.equal(g.get('ST-01').codLAK, 0, 'credit store: nothing to collect on delivery');
  assert.equal(g.get('ST-02').codLAK, 960000);
  const order = D.nearestNeighborRoute(D.HUB, s.stores.filter(x => x.route === D.ROUTE_LOCAL)).map(x => x.id);
  assert.deepEqual(order, ['ST-01', 'ST-02']);
});

test('HTML escaping and CSV safety', () => {
  assert.equal(D.escapeHtml('<img src=x onerror="a">\'`&'), '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&#96;&amp;');
  const s = baseState();
  s.invoices.push({ id: 'INV-1', storeName: '=HYPERLINK("x") "ຮ້ານ"', amountLAK: 5, payments: [], status: 'UNPAID' });
  const csv = D.invoicesToCSV(s, NOW);
  assert.ok(csv.startsWith('﻿'), 'BOM so Excel shows Lao text');
  assert.ok(csv.includes('"\'=HYPERLINK(""x"") ""ຮ້ານ"""'), 'quotes doubled, formula neutralized');
});

const LEGACY_V2 = {
  pricing: { price350: 20000, cost350: 12000 },
  inventory: { can350: '2360' },
  stores: [
    { id: 'ST-01', name: 'ຮ້ານ A', route: 'ລົດສົ່ງ', creditDays: 7, debtLAK: 6600000, phone: '020-55112233', x: 1, y: 2 },
    { id: 'ST-01', name: 'ຮ້ານ B', route: 'ຝາກຂົນສົ່ງ', creditDays: 0, debtLAK: 0, phone: '-' }
  ],
  orders: [
    { id: 'ORD-2026-002', storeName: 'ຮ້ານ B', route: 'ລົດສົ່ງ', qty350: 24, unitPriceLAK: 20000, unitCostLAK: null, totalLAK: 480000, status: 'DELIVERED', createdAt: 'ມື້ນີ້ ພຽງສ້າງ' },
    { id: 'ORD-2026-001', storeName: 'ຮ້ານ A', route: 'ລົດສົ່ງ', qty350: 90, unitPriceLAK: 20000, unitCostLAK: 12000, totalLAK: 1800000, status: 'OUT_FOR_DELIVERY', createdAt: '13 ຕຸລາ 2026 08:30' },
    { id: 'ORD-2026-002', storeName: 'ຮ້ານ A', route: 'ລົດສົ່ງ', qty350: 50, unitPriceLAK: 20000, unitCostLAK: 12000, totalLAK: 1000000, status: 'DELIVERED', createdAt: '13 ຕຸລາ 2026 07:00' }
  ],
  invoices: [
    { id: 'INV-2026-004', orderId: 'ORD-2026-002', storeName: 'ຮ້ານ B', amountLAK: 480000, status: 'UNPAID', dueDate: 'ເກັບເງິນປາຍທາງ (COD)', method: '-' },
    { id: 'INV-2026-0408', storeName: 'ຮ້ານ A', date: '01 ຕຸລາ 2026', dueDate: '08 ຕຸລາ 2026', amountLAK: 1800000, status: 'OVERDUE', method: '-' },
    { id: 'INV-2026-0412', storeName: 'ຮ້ານ A', date: '06 ຕຸລາ 2026', amountLAK: 4800000, status: 'PAID', method: 'BCEL (Ref: 1)' }
  ],
  inbounds: [{ po: 'PO-08', date: '14 ຕຸລາ 2026', qty350: 5000, status: 'ກຳລັງຂົນສົ່ງ', note: '' }]
};

test('legacy v2 data migrates safely', () => {
  const { state: s, report } = D.normalizeState(clone(LEGACY_V2), NOW);
  assert.equal(report.legacy, true);
  assert.equal(s.meta.schemaVersion, 3);
  const uniq = a => new Set(a).size === a.length;
  assert.ok(uniq(s.stores.map(x => x.id)) && uniq(s.orders.map(x => x.id)) && uniq(s.invoices.map(x => x.id)), 'duplicate ids repaired');
  assert.equal(s.inventory.can350, 2360);
  assert.ok(s.orders.filter(o => o.status === 'DELIVERED').every(o => o.stockDeducted), 'v2 deducted stock at DELIVERED');
  assert.equal(s.orders.find(o => o.status === 'OUT_FOR_DELIVERY').stockDeducted, false);
  assert.ok(s.orders.every(o => Number.isFinite(o.profitLAK)));
  assert.equal(s.orders[0].createdAt, null);
  assert.equal(s.orders[0].createdAtText, 'ມື້ນີ້ ພຽງສ້າງ');
  assert.equal(s.invoices.find(i => i.id === 'INV-2026-0412').payments.length, 1, 'PAID invoices get a payment record');
  const a = s.stores.find(x => x.name === 'ຮ້ານ A');
  assert.equal(a.debtLAK, 6600000, 'legacy debt preserved');
  assert.equal(report.openingInvoices, 1, 'debt without invoice -> opening balance invoice');
  assert.equal(D.receivableTotal(s), s.stores.reduce((t, x) => t + x.debtLAK, 0));
  assert.equal(s.inbounds[0].received, false);
  // idempotent
  const again = D.normalizeState(clone(s), NOW).state;
  assert.deepEqual(again, s);
});

test('backup parsing rejects unrelated JSON', () => {
  assert.throws(() => D.parseBackup('{"invalid": true}', NOW), /Invalid backup schema/);
  const { state } = D.parseBackup(JSON.stringify({ app: 'Pa Deak Operations', data: clone(LEGACY_V2) }), NOW);
  assert.equal(state.meta.schemaVersion, 3);
});

test('quantity reads as total cans first, then packs (ປາແດກ888)', () => {
  const grab = (name) => appSrc.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0];
  const make = new Function('D', 'PACK', 'esc', `${grab('qtyHtml')}\n${grab('qtyText')}\nreturn { qtyHtml, qtyText };`);
  const { qtyHtml, qtyText } = make(D, D.normalizePack({ size: 12, label: 'ແພັກ' }), D.escapeHtml);
  const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(plain(qtyHtml(90)), '90 ກະປ໋ອງ = 7 ແພັກ + 6 ກະປ໋ອງ');
  assert.equal(plain(qtyHtml(120)), '120 ກະປ໋ອງ = 10 ແພັກ');
  assert.equal(plain(qtyHtml(6)), '6 ກະປ໋ອງ', 'less than a pack: cans only');
  assert.equal(plain(qtyHtml(1200)), '1,200 ກະປ໋ອງ = 100 ແພັກ');
  assert.equal(qtyText(90), '90 ກະປ໋ອງ (7 ແພັກ + 6 ກະປ໋ອງ)');
  assert.equal(qtyText(5), '5 ກະປ໋ອງ');
  assert.doesNotMatch(appSrc, /canGrid\(/, 'the dot picture that looked like "7 packs of 6" is gone');
  assert.match(html, /<title>ປາແດກ888/);
  assert.match(html, /<div class="brand-title">ປາແດກ888<\/div>/);
  assert.match(appSrc, /app: 'Pa Deak Operations'/, 'backup files keep the old app id so old backups still import');
});

test('index.html static checks', () => {
  assert.ok(!/[*/%]\s*24\b/.test(appSrc), 'no hard-coded 24 cans per pack in app code (use PACK.size)');
  assert.ok(!/CANS_PER_CASE/.test(html), 'old fixed case size constant is gone');
  assert.doesNotMatch(html, /id="payment-amount"[^>]*step="1000"/, 'payment amount must accept any whole amount');
  assert.doesNotMatch(html, /[฀-๿]/, 'no Thai letters mixed into Lao text');
  assert.doesNotMatch(html, /ແກ້ວ/, 'unit is ກະປ໋ອງ (can), not ແກ້ວ');
  const called = new Set([...html.matchAll(/app\.([A-Za-z_]\w*)\s*\(/g)].map(m => m[1]));
  const defined = new Set([...appSrc.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/gm)].map(m => m[1]));
  const missing = [...called].filter(n => !defined.has(n));
  assert.deepEqual(missing, [], 'every app.method() used in the page exists');
});
