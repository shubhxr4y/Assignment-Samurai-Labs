export type EntityStatus = 'active' | 'inactive';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';

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
}

export interface CustomerWithStats extends Customer {
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
}

export interface ItemWithStats extends Item {
  invoice_count: number;
  quantity_sold: string;
  total_sales: string;
}

/** One invoice line this item has appeared on — its sales history. */
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

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
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

export interface InvoiceWithCustomer extends Invoice {
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
}

export interface InvoiceDetail extends InvoiceWithCustomer {
  customer_address: string | null;
  customer_gstin: string | null;
  customer_status: EntityStatus;
  items: InvoiceLine[];
}
