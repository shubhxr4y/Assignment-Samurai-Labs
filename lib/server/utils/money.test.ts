/**
 * Tests for the money maths. No test framework: node:test ships with Node.
 *   npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateLine, fromPaise, sumLines, toPaise } from './money';
import { buildInvoiceNumber, financialYearLabel, parseSequence } from './invoice-number';

describe('toPaise / fromPaise', () => {
  it('parses decimal strings exactly', () => {
    assert.equal(toPaise('1250.50'), 125050n);
    assert.equal(toPaise('1250'), 125000n);
    assert.equal(toPaise('0.05'), 5n);
    assert.equal(toPaise('1,25,000.00'), 12500000n);
  });

  it('rounds half up at the third decimal instead of truncating', () => {
    assert.equal(toPaise('10.005'), 1001n);
    assert.equal(toPaise('10.004'), 1000n);
  });

  it('round-trips back to a fixed two-decimal string', () => {
    assert.equal(fromPaise(125050n), '1250.50');
    assert.equal(fromPaise(5n), '0.05');
    assert.equal(fromPaise(0n), '0.00');
  });

  it('survives amounts that would lose precision as floats', () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    assert.equal(fromPaise(toPaise('0.1') + toPaise('0.2')), '0.30');
  });
});

describe('calculateLine', () => {
  it('multiplies quantity by unit price', () => {
    const line = calculateLine({ quantity: '3', unitPrice: '1899.00', taxRate: '0' });
    assert.equal(fromPaise(line.lineSubtotal), '5697.00');
    assert.equal(fromPaise(line.taxAmount), '0.00');
    assert.equal(fromPaise(line.lineTotal), '5697.00');
  });

  it('applies GST at the line level', () => {
    const line = calculateLine({ quantity: '40', unitPrice: '3150.00', taxRate: '18' });
    assert.equal(fromPaise(line.lineSubtotal), '126000.00');
    assert.equal(fromPaise(line.taxAmount), '22680.00');
    assert.equal(fromPaise(line.lineTotal), '148680.00');
  });

  it('handles fractional quantities', () => {
    const line = calculateLine({ quantity: '2.5', unitPrice: '415.00', taxRate: '28' });
    assert.equal(fromPaise(line.lineSubtotal), '1037.50');
    assert.equal(fromPaise(line.taxAmount), '290.50');
  });

  it('rounds tax half up to the paisa', () => {
    // 95.00 x 3 = 285.00, 18% = 51.30 exactly
    assert.equal(fromPaise(calculateLine({ quantity: '3', unitPrice: '95', taxRate: '18' }).taxAmount), '51.30');
    // 0.05 x 1 at 5% = 0.0025 -> rounds to 0.00
    assert.equal(fromPaise(calculateLine({ quantity: '1', unitPrice: '0.05', taxRate: '5' }).taxAmount), '0.00');
    // 1.00 x 1 at 12.5% = 0.125 -> rounds half up to 0.13
    assert.equal(fromPaise(calculateLine({ quantity: '1', unitPrice: '1', taxRate: '12.5' }).taxAmount), '0.13');
  });

  it('stays exact for crore-scale invoices', () => {
    const line = calculateLine({ quantity: '999', unitPrice: '99999999.99', taxRate: '18' });
    assert.equal(fromPaise(line.lineSubtotal), '99899999990.01');
    assert.equal(fromPaise(line.lineTotal), '117881999988.21');
  });
});

describe('sumLines', () => {
  it('totals the rounded line amounts, so printed lines add up to the printed total', () => {
    const lines = [
      calculateLine({ quantity: '3', unitPrice: '95', taxRate: '18' }),
      calculateLine({ quantity: '7', unitPrice: '118', taxRate: '18' }),
      calculateLine({ quantity: '1', unitPrice: '24000', taxRate: '18' }),
    ];
    const totals = sumLines(lines);
    assert.equal(fromPaise(totals.subtotal), '25111.00');
    assert.equal(fromPaise(totals.taxAmount), '4519.98');
    assert.equal(fromPaise(totals.totalAmount), '29630.98');
    assert.equal(totals.subtotal + totals.taxAmount, totals.totalAmount);
  });

  it('returns zeroes for an empty invoice', () => {
    const totals = sumLines([]);
    assert.equal(fromPaise(totals.totalAmount), '0.00');
  });
});

describe('invoice numbering', () => {
  it('uses the Indian financial year, April to March', () => {
    assert.equal(financialYearLabel(new Date('2026-09-11T00:00:00Z')), '2026-27');
    assert.equal(financialYearLabel(new Date('2026-03-31T00:00:00Z')), '2025-26');
    assert.equal(financialYearLabel(new Date('2026-04-01T00:00:00Z')), '2026-27');
  });

  it('builds and re-reads a running series', () => {
    const number = buildInvoiceNumber(7, new Date('2026-09-11T00:00:00Z'));
    assert.equal(number, 'INV-2026-27-0007');
    assert.equal(parseSequence(number, '2026-27'), 7);
    assert.equal(parseSequence('HAND-WRITTEN-42', '2026-27'), 0);
  });
});
