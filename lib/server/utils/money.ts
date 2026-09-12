/**
 * Money maths.
 *
 * Rupee amounts are handled as integer *paise* held in BigInt. Two reasons:
 *  1. 0.1 + 0.2 !== 0.3 in floating point, and a bookkeeping product that is
 *     one paisa out is a bookkeeping product nobody trusts.
 *  2. BigInt does not overflow, so a ₹99,99,99,999.99 line item multiplied by
 *     a large quantity is still exact. ("Very large values" is a real case:
 *     a machinery invoice runs into crores.)
 *
 * Everything crosses the DB boundary as a fixed-2-decimal string, which is
 * exactly what NUMERIC(14,2) round-trips losslessly.
 */

export type Paise = bigint;

const HUNDRED = 100n;

/** Largest value NUMERIC(14,2) can hold, in paise. */
export const MAX_AMOUNT_PAISE = 99_999_999_999_999n; // ₹99,99,99,99,999.99

/**
 * Parse a decimal string/number into paise without ever touching a float.
 * Accepts "1250", "1250.5", "1,250.50", 1250.5.
 */
export function toPaise(value: string | number): Paise {
  const raw = typeof value === 'number' ? value.toFixed(2) : String(value).trim().replace(/,/g, '');
  if (raw === '') return 0n;

  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(raw);
  if (!match) throw new Error(`Not a valid amount: ${value}`);

  const [, sign, whole = '', fractionRaw = ''] = match;
  // Round half-up on the third decimal rather than truncating.
  const fraction = fractionRaw.padEnd(3, '0');
  let paise = BigInt(whole || '0') * HUNDRED + BigInt(fraction.slice(0, 2) || '0');
  if (Number(fraction[2] ?? '0') >= 5) paise += 1n;

  return sign === '-' ? -paise : paise;
}

/** Render paise as a fixed-2-decimal string for Postgres NUMERIC. */
export function fromPaise(paise: Paise): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const whole = abs / HUNDRED;
  const fraction = (abs % HUNDRED).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Divide with half-up rounding. Both arguments must be non-negative. */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export interface LineInput {
  /** Decimal string or number, e.g. "2.5" */
  quantity: string | number;
  /** Rupees, e.g. "1250.00" */
  unitPrice: string | number;
  /** Percentage, e.g. "18" for 18% GST */
  taxRate: string | number;
}

export interface LineAmounts {
  lineSubtotal: Paise;
  taxAmount: Paise;
  lineTotal: Paise;
}

/**
 * line subtotal = quantity x unit price
 * line tax      = line subtotal x tax rate / 100
 * line total    = line subtotal + line tax
 *
 * Quantity is held to 2 decimals and tax rate to 2 decimals, so both are
 * scaled by 100 before the integer division that brings them back.
 */
export function calculateLine({ quantity, unitPrice, taxRate }: LineInput): LineAmounts {
  const quantityScaled = toPaise(quantity); // quantity x 100
  const unitPricePaise = toPaise(unitPrice);
  const taxRateScaled = toPaise(taxRate); // rate x 100 (basis points)

  const lineSubtotal = divideRoundHalfUp(quantityScaled * unitPricePaise, HUNDRED);
  const taxAmount = divideRoundHalfUp(lineSubtotal * taxRateScaled, 10_000n);

  return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount };
}

export interface InvoiceTotals {
  subtotal: Paise;
  taxAmount: Paise;
  totalAmount: Paise;
}

/**
 * Invoice totals are the sum of the *rounded* line amounts, not a re-rounding
 * of the raw sum. That is the convention GST invoices in India follow, and it
 * means the printed lines always add up to the printed total.
 */
export function sumLines(lines: readonly LineAmounts[]): InvoiceTotals {
  let subtotal = 0n;
  let taxAmount = 0n;
  for (const line of lines) {
    subtotal += line.lineSubtotal;
    taxAmount += line.taxAmount;
  }
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}
