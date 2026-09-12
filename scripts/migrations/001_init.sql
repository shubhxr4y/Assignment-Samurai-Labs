-- ===========================================================================
-- 001_init.sql — core bookkeeping schema
--
-- Design notes (expanded in README.md):
--  * Money is NUMERIC(14,2). NUMERIC (not float) so rupee amounts are exact.
--    14 digits holds up to 999,99,99,99,99,999.99 — comfortably past any
--    small-business invoice.
--  * amount_pending and payment_status are GENERATED columns. They are derived
--    facts, so the database derives them: they can never drift out of sync with
--    amount_paid, whatever writes to the table.
--  * invoice_items stores a snapshot of the item's name, price and tax rate at
--    the time of invoicing. Editing an item later must never rewrite history on
--    an invoice a customer has already received.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keeps updated_at honest without relying on application code.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  gstin       TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customers_status_idx ON customers (status);
CREATE INDEX customers_name_idx   ON customers (lower(name));

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- items (products and services that can be put on an invoice)
-- ---------------------------------------------------------------------------
CREATE TABLE items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL CHECK (length(btrim(name)) > 0),
  description TEXT,
  unit        TEXT          NOT NULL DEFAULT 'unit',
  unit_price  NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate    NUMERIC(5,2)  NOT NULL DEFAULT 0
                            CHECK (tax_rate >= 0 AND tax_rate <= 100),
  status      TEXT          NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX items_status_idx ON items (status);
CREATE INDEX items_name_idx   ON items (lower(name));

CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT          NOT NULL UNIQUE
                               CHECK (length(btrim(invoice_number)) > 0),
  customer_id    UUID          NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  invoice_date   DATE          NOT NULL,
  notes          TEXT,

  subtotal       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal     >= 0),
  tax_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount   >= 0),
  total_amount   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid  >= 0),

  -- Derived, never written by the application.
  amount_pending NUMERIC(14,2)
    GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status TEXT
    GENERATED ALWAYS AS (
      CASE
        WHEN amount_paid <= 0             THEN 'pending'
        WHEN amount_paid >= total_amount  THEN 'paid'
        ELSE                                   'partially_paid'
      END
    ) STORED,

  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- You cannot collect more than you billed. Overpayment is a credit note,
  -- which is deliberately out of scope for this prototype.
  CONSTRAINT invoices_paid_not_over_total CHECK (amount_paid <= total_amount)
);

CREATE INDEX invoices_customer_id_idx    ON invoices (customer_id);
CREATE INDEX invoices_invoice_date_idx   ON invoices (invoice_date DESC);
CREATE INDEX invoices_payment_status_idx ON invoices (payment_status);
CREATE INDEX invoices_number_idx         ON invoices (lower(invoice_number));

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------
CREATE TABLE invoice_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID          NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,

  -- RESTRICT, not SET NULL: keeping the link intact is what makes item-wise
  -- sales reporting reliable. An item that has been invoiced is deactivated,
  -- never deleted (enforced in the service layer with a friendly 409).
  item_id        UUID          REFERENCES items (id) ON DELETE RESTRICT,

  -- Historical snapshot — see design note at the top of this file.
  item_name_snapshot TEXT      NOT NULL,
  item_unit_snapshot TEXT      NOT NULL DEFAULT 'unit',

  quantity       NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0
                               CHECK (tax_rate >= 0 AND tax_rate <= 100),

  line_subtotal  NUMERIC(14,2) NOT NULL CHECK (line_subtotal >= 0),
  tax_amount     NUMERIC(14,2) NOT NULL CHECK (tax_amount    >= 0),
  line_total     NUMERIC(14,2) NOT NULL CHECK (line_total    >= 0),

  line_no        INTEGER       NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX invoice_items_invoice_id_idx ON invoice_items (invoice_id);
CREATE INDEX invoice_items_item_id_idx    ON invoice_items (item_id);
