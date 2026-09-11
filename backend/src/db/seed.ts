/**
 * Seeds a realistic set of customers, items and invoices.
 *
 * Invoice amounts are computed with the *same* money helpers the API uses, so
 * seeded data is arithmetically identical to data created through the UI —
 * a seed that quietly disagrees with the application is worse than no seed.
 *
 *   npm run seed
 */
import { closePool, withTransaction } from './pool.js';
import { calculateLine, fromPaise, sumLines, toPaise, type LineAmounts } from '../utils/money.js';
import { buildInvoiceNumber } from '../utils/invoice-number.js';
import { customers, invoices, items } from './seed-data.js';

function dateFromOffset(offsetDays: string): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + Number(offsetDays));
  return date.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await withTransaction(async (client) => {
    console.log('• Clearing existing data …');
    await client.query('TRUNCATE invoice_items, invoices, items, customers RESTART IDENTITY CASCADE');

    const customerIds = new Map<string, string>();
    for (const customer of customers) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO customers (name, email, phone, address, gstin, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [customer.name, customer.email, customer.phone, customer.address, customer.gstin, customer.status],
      );
      customerIds.set(customer.key, rows[0]!.id);
    }
    console.log(`✓ ${customers.length} customers`);

    const itemRows = new Map<string, { id: string; name: string; unit: string; unit_price: string; tax_rate: string }>();
    for (const item of items) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO items (name, description, unit, unit_price, tax_rate, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [item.name, item.description, item.unit, item.unit_price, item.tax_rate, item.status],
      );
      itemRows.set(item.key, {
        id: rows[0]!.id,
        name: item.name,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
      });
    }
    console.log(`✓ ${items.length} items`);

    for (const invoice of invoices) {
      const invoiceDate = dateFromOffset(invoice.invoice_date);
      const invoiceNumber = buildInvoiceNumber(
        Number(invoice.invoice_number),
        new Date(`${invoiceDate}T00:00:00Z`),
      );

      const amounts: LineAmounts[] = [];
      const lines = invoice.lines.map((line, index) => {
        const item = itemRows.get(line.item);
        if (!item) throw new Error(`Seed error: unknown item "${line.item}"`);
        const computed = calculateLine({
          quantity: line.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
        });
        amounts.push(computed);
        return { item, line, computed, lineNo: index + 1 };
      });

      const totals = sumLines(amounts);
      const amountPaid =
        invoice.paid === 'full'
          ? totals.totalAmount
          : invoice.paid === 'none'
            ? 0n
            : toPaise(invoice.paid);

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO invoices
           (invoice_number, customer_id, invoice_date, notes,
            subtotal, tax_amount, total_amount, amount_paid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          invoiceNumber,
          customerIds.get(invoice.customer),
          invoiceDate,
          invoice.notes,
          fromPaise(totals.subtotal),
          fromPaise(totals.taxAmount),
          fromPaise(totals.totalAmount),
          fromPaise(amountPaid > totals.totalAmount ? totals.totalAmount : amountPaid),
        ],
      );

      for (const { item, line, computed, lineNo } of lines) {
        await client.query(
          `INSERT INTO invoice_items
             (invoice_id, item_id, item_name_snapshot, item_unit_snapshot, quantity,
              unit_price, tax_rate, line_subtotal, tax_amount, line_total, line_no)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            rows[0]!.id,
            item.id,
            item.name,
            item.unit,
            line.quantity,
            item.unit_price,
            item.tax_rate,
            fromPaise(computed.lineSubtotal),
            fromPaise(computed.taxAmount),
            fromPaise(computed.lineTotal),
            lineNo,
          ],
        );
      }
    }
    console.log(`✓ ${invoices.length} invoices`);
  });

  console.log('\nSeed complete.');
}

seed()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nSeed failed:', (error as Error).message);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
