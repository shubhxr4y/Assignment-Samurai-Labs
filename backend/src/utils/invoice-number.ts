/**
 * Invoice numbering.
 *
 * Indian invoicing convention is a per-financial-year running series
 * (1 April - 31 March), e.g. INV-2026-27-0007. The API suggests the next
 * number; the user can always override it, because businesses migrating from
 * a paper book need to continue their own series. Uniqueness is enforced by a
 * UNIQUE constraint, so a clash is caught even under concurrent writes.
 */

export function financialYearLabel(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1; // April = month 3
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

export const INVOICE_PREFIX = 'INV';

export function buildInvoiceNumber(sequence: number, date: Date = new Date()): string {
  return `${INVOICE_PREFIX}-${financialYearLabel(date)}-${String(sequence).padStart(4, '0')}`;
}

/** Pull the running number out of "INV-2026-27-0007" -> 7. Returns 0 if it does not match. */
export function parseSequence(invoiceNumber: string, fyLabel: string): number {
  const match = new RegExp(`^${INVOICE_PREFIX}-${fyLabel}-(\\d+)$`).exec(invoiceNumber.trim());
  return match?.[1] ? Number(match[1]) : 0;
}
