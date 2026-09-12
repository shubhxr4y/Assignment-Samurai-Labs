import * as reports from '../repositories/report.repository';

/**
 * One call powers the whole dashboard. A business owner opening the app should
 * wait on one request, not eight.
 */
export async function getDashboard() {
  const [summary, recentInvoices, topCustomers, topItems, pendingPayments, monthlySales] =
    await Promise.all([
      reports.summary(),
      reports.recentInvoices(6),
      reports.customerSales(5),
      reports.itemSales(5),
      reports.pendingPayments(5),
      reports.monthlySales(6),
    ]);

  return { summary, recentInvoices, topCustomers, topItems, pendingPayments, monthlySales };
}

export const getCustomerSales = () => reports.customerSales();
export const getItemSales = () => reports.itemSales();
export const getPendingPayments = () => reports.pendingPayments();
