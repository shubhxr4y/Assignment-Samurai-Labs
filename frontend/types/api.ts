export type EntityStatus = 'active' | 'inactive';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { total?: number };
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  invoice_count: number;
  total_sales: string;
  total_pending: string;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: string;
  tax_rate: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  invoice_count: number;
  quantity_sold: string;
  total_sales: string;
}

/** One invoice line an item has appeared on — the item's sales history. */
export interface ItemSalesHistoryRow {
  line_id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  payment_status: PaymentStatus;
  customer_id: string;
  customer_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string | null;
  item_name_snapshot: string;
  item_unit_snapshot: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal: string;
  tax_amount: string;
  line_total: string;
  line_no: number;
}

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  invoice_date: string;
  notes: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  amount_pending: string;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice extends InvoiceSummary {
  customer_address: string | null;
  customer_gstin: string | null;
  customer_status: EntityStatus;
  items: InvoiceLine[];
}

export interface DashboardSummary {
  total_sales: string;
  total_collected: string;
  total_outstanding: string;
  invoice_count: number;
  paid_count: number;
  partially_paid_count: number;
  pending_count: number;
  customer_count: number;
  item_count: number;
}

export interface CustomerSalesRow {
  customer_id: string;
  customer_name: string;
  status: EntityStatus;
  invoice_count: number;
  total_sales: string;
  total_paid: string;
  total_pending: string;
}

export interface ItemSalesRow {
  item_id: string | null;
  item_name: string;
  unit: string;
  invoice_count: number;
  quantity_sold: string;
  total_sales: string;
}

export interface PendingPaymentRow {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  customer_name: string;
  total_amount: string;
  amount_paid: string;
  amount_pending: string;
  payment_status: PaymentStatus;
  days_outstanding: number;
}

export interface MonthlySalesRow {
  month: string;
  total_sales: string;
  total_collected: string;
}

export interface Dashboard {
  summary: DashboardSummary;
  recentInvoices: InvoiceSummary[];
  topCustomers: CustomerSalesRow[];
  topItems: ItemSalesRow[];
  pendingPayments: PendingPaymentRow[];
  monthlySales: MonthlySalesRow[];
}

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  status?: EntityStatus;
}

export interface ItemInput {
  name: string;
  description?: string | null;
  unit?: string;
  unit_price: string;
  tax_rate?: string;
  status?: EntityStatus;
}

export interface InvoiceLineInput {
  item_id: string;
  quantity: string;
  unit_price?: string;
  tax_rate?: string;
}

export interface InvoiceInput {
  invoice_number?: string | null;
  customer_id: string;
  invoice_date: string;
  notes?: string | null;
  items: InvoiceLineInput[];
  amount_paid?: string;
}
