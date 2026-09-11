/**
 * Client-side preview of the invoice maths.
 *
 * This mirrors backend/src/utils/money.ts exactly — same integer-paise
 * approach, same half-up rounding — so the totals a user watches update while
 * typing are the totals the server will store. The server remains the source
 * of truth: nothing computed here is ever sent as an amount, only quantities,
 * prices and rates are.
 *
 * (In a production codebase this would be one shared package imported by both
 * apps; see the trade-offs section of the README.)
 */

const HUNDRED = 100n;

export function toPaise(value: string | number): bigint {
  const raw = typeof value === 'number' ? value.toFixed(2) : String(value).trim().replace(/,/g, '');
  if (raw === '') return 0n;

  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(raw);
  if (!match) return 0n;

  const [, sign, whole = '', fractionRaw = ''] = match;
  const fraction = fractionRaw.padEnd(3, '0');
  let paise = BigInt(whole || '0') * HUNDRED + BigInt(fraction.slice(0, 2) || '0');
  if (Number(fraction[2] ?? '0') >= 5) paise += 1n;

  return sign === '-' ? -paise : paise;
}

export function fromPaise(paise: bigint): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  return `${negative ? '-' : ''}${abs / HUNDRED}.${(abs % HUNDRED).toString().padStart(2, '0')}`;
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export interface LineAmounts {
  lineSubtotal: bigint;
  taxAmount: bigint;
  lineTotal: bigint;
}

export function calculateLine(input: {
  quantity: string | number;
  unitPrice: string | number;
  taxRate: string | number;
}): LineAmounts {
  const quantityScaled = toPaise(input.quantity);
  const unitPricePaise = toPaise(input.unitPrice);
  const taxRateScaled = toPaise(input.taxRate);

  const lineSubtotal = divideRoundHalfUp(quantityScaled * unitPricePaise, HUNDRED);
  const taxAmount = divideRoundHalfUp(lineSubtotal * taxRateScaled, 10_000n);

  return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount };
}

export function sumLines(lines: readonly LineAmounts[]) {
  let subtotal = 0n;
  let taxAmount = 0n;
  for (const line of lines) {
    subtotal += line.lineSubtotal;
    taxAmount += line.taxAmount;
  }
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

export type PreviewStatus = 'pending' | 'partially_paid' | 'paid';

/** Same rule as the database's generated column. */
export function previewPaymentStatus(totalPaise: bigint, paidPaise: bigint): PreviewStatus {
  if (paidPaise <= 0n) return 'pending';
  if (paidPaise >= totalPaise) return 'paid';
  return 'partially_paid';
}
