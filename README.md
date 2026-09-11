# Bahi — bookkeeping & invoicing for small businesses

A working prototype of a simple bookkeeping and invoicing product: manage customers and
items, raise invoices, record payments, and see at a glance how sales are going and who
still owes money.

Built for the Samurai Labs Full-Stack Product Engineer assignment.

> **Bahi** (बही) is the ledger book an Indian shopkeeper keeps — the *bahi-khata*. The
> product is named after the thing it replaces.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup and migrations](#database-setup-and-migrations)
- [Seed data](#seed-data)
- [Running the apps](#running-the-apps)
- [Tests](#tests)
- [API documentation](#api-documentation)
- [Data model](#data-model)
- [Business logic](#business-logic)
- [Design system](#design-system)
- [Screens](#screens)
- [Assumptions and decisions](#assumptions-and-decisions)
- [Edge cases handled](#edge-cases-handled)
- [Deployment](#deployment)
- [Trade-offs](#trade-offs)
- [What I would do next](#what-i-would-do-next)

---

## What it does

| Screen | What it answers |
| --- | --- |
| **Dashboard** | How much have I sold, how much has come in, who owes me, what is selling |
| **Invoices** | Everything billed, filterable by payment status, searchable by number or customer |
| **Create invoice** | Pick a customer, add lines, watch subtotal / GST / total update as you type |
| **Invoice detail** | A clean document a business owner can show a customer, plus payment recording |
| **Customers** | Who you invoice, what each is worth, and what each still owes |
| **Items** | Your catalogue, with price, GST rate, and how much of each has sold |
| **Item detail** | What one item has sold, and every invoice it has appeared on |
| **Reports** | Customer-wise sales, item-wise sales, and pending payments |

Full CRUD on customers, items and invoices. Payment status is **Pending**, **Partially
paid** or **Paid**, derived from the amount received rather than set by hand.

---

## Tech stack

**Frontend** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS,
Radix UI primitives, React Hook Form + Zod, SWR.

**Backend** — Node.js, Express, TypeScript, `pg`, Zod.

**Database** — PostgreSQL (Supabase-compatible; Supabase is used purely as the Postgres
host, no Supabase SDK, Auth or Storage).

No ORM. The queries here are simple enough that hand-written SQL is clearer than a schema
DSL, and it keeps the data model visible in one file.

---

## Architecture

```
┌────────────────────┐   REST over HTTP    ┌────────────────────┐        ┌────────────┐
│  Next.js frontend  │ ──────────────────▶ │   Express API      │ ─────▶ │ PostgreSQL │
│  (browser)         │ ◀────────────────── │   (Node.js)        │ ◀───── │ (Supabase) │
└────────────────────┘   JSON envelope     └────────────────────┘   pg   └────────────┘
```

The browser talks only to the REST API. It never holds a database credential — the only
variable it receives is `NEXT_PUBLIC_API_URL`.

Inside the API, each request moves through one direction only:

```
route → validator (Zod) → controller → service (business rules) → repository (SQL) → pg
```

- **Controllers** unwrap the request and shape the response. No logic.
- **Services** own the rules: pricing, totals, payment limits, deletion policy.
- **Repositories** own SQL. Nothing else in the codebase writes a query.
- **Middleware** handles validation, async errors, and translating Postgres errors into
  sentences a business owner can read.

Every response uses one envelope, so the client has exactly one shape to unwrap:

```jsonc
{ "success": true,  "data": … , "meta": { "total": 14 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Please select a customer.", "fields": { … } } }
```

---

## Folder structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/env.ts             # parsed + validated once, fails loudly at boot
│   │   ├── controllers/              # request in, response out
│   │   ├── db/
│   │   │   ├── migrations/001_init.sql
│   │   │   ├── migrate.ts            # forward-only runner, tracked in schema_migrations
│   │   │   ├── pool.ts               # pool, query helpers, withTransaction
│   │   │   ├── seed.ts               # seeds via the API's own money helpers
│   │   │   ├── seed-sql.ts           # same seed, emitted as plain SQL
│   │   │   └── seed-data.ts          # the data itself
│   │   ├── middleware/               # validate, async-handler, error-handler
│   │   ├── repositories/             # all SQL lives here
│   │   ├── routes/
│   │   ├── services/                 # business rules
│   │   ├── types/domain.ts
│   │   ├── utils/                    # money.ts, invoice-number.ts, api-error.ts …
│   │   ├── app.ts
│   │   └── server.ts
│   └── .env.example
│
├── frontend/
│   ├── app/                          # App Router pages
│   │   ├── page.tsx                  # dashboard
│   │   ├── customers/…               # list + detail
│   │   ├── items/…                   # list + detail
│   │   ├── invoices/…                # list, new, detail, edit
│   │   └── reports/
│   ├── components/
│   │   ├── ui/                       # the design system primitives
│   │   └── app/                      # product components (shell, forms, chart, tiles)
│   ├── hooks/                        # SWR data hooks
│   ├── lib/                          # api client, formatting, money preview
│   ├── services/                     # typed endpoint wrappers
│   ├── types/api.ts
│   ├── tailwind.config.ts            # the design tokens
│   └── .env.example
│
└── docs/
    ├── api.http                      # API collection (VS Code REST Client)
    ├── design.md                     # screenshots + design decisions
    └── screenshots/                  # every screen, 1440 px, from the production build
```

---

## Getting started

**Prerequisites:** Node 20+, and a PostgreSQL 14+ database (local, or a free Supabase
project).

```bash
# 1. backend
cd backend
cp .env.example .env          # then fill in DATABASE_URL
npm install
npm run migrate               # create the schema
npm run seed                  # load sample data
npm run dev                   # http://localhost:4000

# 2. frontend (in a second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000.

### Using Supabase as the database

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI.** Use the *direct* connection
   (port 5432) for a long-running Node process, or the *pooler* (port 6543) if you deploy
   the API to a serverless host.
3. Put it in `backend/.env` as `DATABASE_URL`, and set `DATABASE_SSL=true`.
4. Run `npm run migrate && npm run seed`.

If you would rather not point Node at the database, `npm run seed:sql > seed.sql` prints
the whole seed as plain SQL you can paste into the Supabase SQL editor, alongside
`backend/src/db/migrations/001_init.sql`.

---

## Environment variables

**`backend/.env`**

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `DATABASE_SSL` | no | `true` for Supabase and most hosted Postgres |
| `PORT` | no | defaults to `4000` |
| `NODE_ENV` | no | `development` \| `production` |
| `CORS_ORIGIN` | no | comma-separated list of allowed origins |

**`frontend/.env.local`**

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | e.g. `http://localhost:4000/api` |
| `NEXT_PUBLIC_BUSINESS_*` | no | name, address, GSTIN, phone, email printed on invoices |

Nothing secret is exposed to the browser: the frontend has no database credential, and
`.env` files are git-ignored. Only `*.example` files are committed.

---

## Database setup and migrations

Migrations are plain `.sql` files applied in filename order, each inside a transaction,
each recorded in `schema_migrations`.

```bash
npm run migrate              # apply anything pending
npm run migrate -- --reset   # drop the schema and rebuild from scratch
npm run db:reset             # reset + reseed in one step
```

To add a migration, drop `002_something.sql` next to `001_init.sql`. Forward-only by
design: rollback scripts that are never tested are worse than not having them.

---

## Seed data

`npm run seed` loads a fictional electrical and hardware supplier in Howrah:

- **8 customers** — Sharma Traders, Verma Hardware, Patel & Sons, Iyer Interiors,
  Bose Construction, Khanna Electricals, Reddy Enterprises, and one deliberately inactive.
- **17 items** across the 0 / 5 / 12 / 18 / 28 % GST slabs, including one inactive item and
  two service lines (labour per point, AMC).
- **14 invoices** spread over the last six months: **5 paid, 4 partially paid, 5 pending**,
  totalling roughly ₹23,37,799 invoiced with about ₹13,01,663 still outstanding.

Invoice dates are generated relative to today, so the dashboard's six-month trend is
always populated no matter when you seed.

The seed prices every line using the *same* money helpers the API uses, so seeded invoices
are arithmetically identical to invoices raised through the UI. A seed that quietly
disagrees with the application is worse than no seed at all.

---

## Running the apps

| Command | Where | What |
| --- | --- | --- |
| `npm run dev` | backend | API with hot reload on :4000 |
| `npm run build` / `npm start` | backend | compile to `dist/`, run the compiled server |
| `npm run migrate` / `seed` / `db:reset` | backend | database lifecycle |
| `npm run seed:sql` | backend | print the seed as SQL |
| `npm test` | backend | money and invoice-numbering tests |
| `npm run dev` | frontend | Next.js on :3000 |
| `npm run build` / `npm start` | frontend | production build |
| `npm run typecheck` | both | `tsc --noEmit` |

---

## Tests

The money maths is the part that must not be wrong, so that is what is tested:

```bash
cd backend && npm test
```

13 tests using Node's built-in test runner (no framework dependency) covering decimal
parsing, half-up rounding, GST at the line level, fractional quantities, crore-scale
amounts, and the financial-year invoice series.

---

## API documentation

Base URL `/api`. Every response uses the envelope shown in
[Architecture](#architecture). `docs/api.http` is a ready-to-run collection.

### Customers

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/customers` | `?search=&status=active|inactive|all&sort=&order=&limit=&offset=` — each row carries `invoice_count`, `total_sales`, `total_pending` |
| `GET` | `/api/customers/:id` | one customer with the same roll-up |
| `POST` | `/api/customers` | `201` |
| `PUT` | `/api/customers/:id` | partial body allowed |
| `DELETE` | `/api/customers/:id` | `204`, or `409 CUSTOMER_IN_USE` if they have invoices |

### Items

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/items` | same query shape; rows carry `quantity_sold`, `total_sales` |
| `GET` | `/api/items/:id` | |
| `GET` | `/api/items/:id/invoices` | sales history: every invoice line this item has appeared on |
| `POST` | `/api/items` | `201` |
| `PUT` | `/api/items/:id` | |
| `DELETE` | `/api/items/:id` | `204`, or `409 ITEM_IN_USE` if it has ever been invoiced |

### Invoices

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/invoices` | `?search=&status=pending|partially_paid|paid|all&customer_id=&from=&to=&sort=&order=` |
| `GET` | `/api/invoices/next-number` | next number in the current financial-year series |
| `GET` | `/api/invoices/:id` | invoice + line items + customer details |
| `POST` | `/api/invoices` | `201`; the client sends quantities and rates, never amounts |
| `PUT` | `/api/invoices/:id` | replaces the lines and recalculates every total |
| `PATCH` | `/api/invoices/:id/payment` | `{ "amount_paid": "125000.00" }` or `{ "mark_as": "paid" \| "pending" }` |
| `DELETE` | `/api/invoices/:id` | `204`; cascades to its line items |

### Dashboard and reports

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/dashboard` | summary + recent invoices + top customers + top items + pending + 6-month trend, in one round trip |
| `GET` | `/api/reports/customer-sales` | invoiced / received / outstanding per customer |
| `GET` | `/api/reports/item-sales` | quantity sold and sales value per item |
| `GET` | `/api/reports/pending-payments` | every invoice with money outstanding, plus its age in days |

### Status codes

`200` ok · `201` created · `204` deleted · `400` malformed request · `404` not found ·
`409` conflict (duplicate invoice number, record still in use) · `422` validation failed ·
`500` unexpected.

---

## Data model

```
customers ──1:many──▶ invoices ──1:many──▶ invoice_items ◀──many:1── items
```

```sql
customers      (id, name, email, phone, address, gstin, status, created_at, updated_at)
items          (id, name, description, unit, unit_price, tax_rate, status, …)
invoices       (id, invoice_number UNIQUE, customer_id FK, invoice_date, notes,
                subtotal, tax_amount, total_amount, amount_paid,
                amount_pending  GENERATED, payment_status GENERATED, …)
invoice_items  (id, invoice_id FK, item_id FK,
                item_name_snapshot, item_unit_snapshot,
                quantity, unit_price, tax_rate,
                line_subtotal, tax_amount, line_total, line_no)
```

Three decisions worth calling out:

**1. Historical snapshots.** `invoice_items` stores the item's name, unit, price and tax
rate as they were at the moment of invoicing. Raise the price of copper wire tomorrow and
last month's invoice is untouched — which is the only behaviour an accountant will accept.

**2. Derived columns are derived by the database.** `amount_pending` and `payment_status`
are `GENERATED ALWAYS … STORED`:

```sql
payment_status GENERATED ALWAYS AS (
  CASE WHEN amount_paid <= 0            THEN 'pending'
       WHEN amount_paid >= total_amount THEN 'paid'
       ELSE                                  'partially_paid' END) STORED
```

They cannot drift out of sync with `amount_paid`, whatever writes to the table — the API,
a migration, or someone in `psql` at 11pm. They are also indexable, so filtering invoices
by status stays a single index scan.

**3. Money is `NUMERIC(14,2)`, never a float,** and it is parsed as a *string* on the way
out of Postgres (node-postgres does this by default and the setting is kept deliberately).

Indexes: `invoices(customer_id)`, `invoices(invoice_date DESC)`, `invoices(payment_status)`,
`invoice_items(invoice_id)`, `invoice_items(item_id)`, plus lowercase name indexes on
customers and items for search.

---

## Business logic

### Invoice calculation

```
line subtotal = quantity × unit price
line tax      = line subtotal × tax rate ÷ 100
line total    = line subtotal + line tax

subtotal      = Σ line subtotals
tax total     = Σ line taxes
total         = subtotal + tax total
```

Totals are the sum of the **rounded** line amounts, not a re-rounding of the raw sum. That
is the convention GST invoices follow in India, and it guarantees the printed lines always
add up to the printed total.

All of it happens in `backend/src/utils/money.ts` in **integer paise held as `BigInt`**:

- floating point cannot represent `0.1 + 0.2` exactly, and a bookkeeping product that is
  one paisa out is a bookkeeping product nobody trusts;
- `BigInt` does not overflow, so a crore-scale line item times a large quantity is still
  exact (there is a test for precisely this).

Rounding is **half-up to the paisa**, applied once per line.

**The backend is the source of truth.** The client sends `{ item_id, quantity, unit_price?,
tax_rate? }` and never sends an amount. The create-invoice screen previews totals live
using `frontend/lib/money.ts`, a mirror of the same algorithm, purely so the numbers move
as you type.

### Payment rules

- `Pending` — nothing received.
- `Partially paid` — something received, but less than the total.
- `Paid` — received ≥ total.

Enforced in three places, on purpose: the form (instant feedback), the service (a readable
409/422), and a `CHECK` constraint (`amount_paid >= 0`, `amount_paid <= total_amount`) so
it holds even against a direct SQL write.

Payments are recorded as the **absolute amount received so far**, not as a delta. Small
businesses correct mistakes constantly — "I typed 5,000 instead of 50,000" — and an
absolute figure is the one they can always reconcile against the bank statement. The
"Record payment" dialog shows the resulting status before you save.

### Invoice numbering

Indian businesses run a per-financial-year series (1 April – 31 March), so the API suggests
`INV-2026-27-0007` — the next number in the current year's series. It is only a suggestion:
a business migrating from a paper book needs to continue its own numbering, so the field is
editable. Uniqueness is enforced by a `UNIQUE` constraint, which catches a clash even under
concurrent writes, and the resulting error says *"Invoice number … is already in use. Try
the next one in your series."*

---

## Design system

The goal was a product that looks considered, not a component library dropped onto a page.
The whole system lives in `frontend/tailwind.config.ts` — if a value is not in there, it
does not appear in the product.

**Type scale** — six steps, each with one job:

| Token | Size | Used for |
| --- | --- | --- |
| `display` | 28 px | page titles |
| `figure` | 26 px | dashboard numbers |
| `title` | 20 px | card and dialog titles, invoice totals |
| `lead` | 16 px | section headings, empty-state titles |
| `body` | 14 px | everything else — this is a dense data product |
| `small` | 13 px | secondary and helper text |
| `label` | 11 px, 600, tracked, uppercase | table headers, metric labels |

Inter for the UI; Source Serif 4 for the wordmark, invoice header and totals — a small
serif accent that makes the invoice read as a document rather than a screen.

**Colour** — a warm neutral ramp (paper `#FBFAF8`, ink `#1B1917`) rather than the usual
cool grey, one brand ink-indigo `#3A4BA0` reserved for primary actions and active nav, and
three payment-status colours used for nothing else:

| Status | | Reasoning |
| --- | --- | --- |
| Paid | green `#14622F` | settled |
| Partially paid | amber `#8A4B07` | needs attention |
| Pending | warm slate `#4A453F` | not yet started — *not* an error, so not red |
| Error | red `#A5271D` | reserved for genuine failure |

Pending is deliberately neutral. An unpaid invoice from this morning is not a problem, and
colouring it red trains people to ignore red.

**Spacing** — a 4 px rhythm, restricted in practice to 4 / 8 / 12 / 16 / 20 / 24 / 32.
Cards use 20 px padding, page sections 20 px gaps, table cells 16 × 12.

**Depth** — exactly two shadows in the whole product: a 1 px hairline for cards, and one
overlay shadow for dialogs and popovers. No gradients.

**Component states** — every interactive component handles hover, focus-visible (one ring
treatment, defined once globally), disabled, loading, error, and empty. Tables have a
shimmer skeleton that preserves their shape while loading, an error state with a retry, and
an empty state that names the next action.

**Numbers** — every rupee figure goes through one `<Amount>` component: Indian digit
grouping (`₹1,25,000`), tabular figures so columns align digit-for-digit, right-aligned in
tables, and zero muted so a column of pending amounts shows only what is actually owed.
Text columns stay left-aligned.

**Microcopy** — written for a shop owner. Never `customer_id is required`; instead
*"Please select a customer."* Empty states say what to do next: *"No customers yet — add
your first customer to start creating invoices."* Destructive confirmations describe the
consequence rather than asking "Are you sure?".

---

## Screens

Full-size screenshots of every screen, each with a note on why it is built the way it is,
are in **[docs/design.md](docs/design.md)**. The short version:

| Screen | |
| --- | --- |
| [Dashboard](docs/screenshots/01-dashboard.png) | sales, collections, and who owes money, above the fold |
| [Create invoice](docs/screenshots/02-invoice-create.png) · [with lines](docs/screenshots/03-invoice-form-filled.png) | totals recomputed on every keystroke |
| [Invoice detail](docs/screenshots/04-invoice-detail.png) | a document view, printable to PDF as-is |
| [Invoices](docs/screenshots/05-invoices-list.png) · [Customers](docs/screenshots/06-customers-list.png) · [Items](docs/screenshots/08-items-list.png) | data-dense tables, numbers right-aligned |
| [Customer detail](docs/screenshots/07-customer-detail.png) · [Item detail](docs/screenshots/09-item-detail.png) | what the record is worth, then its history |
| [Customer-wise](docs/screenshots/10-reports-customer-sales.png) · [item-wise](docs/screenshots/11-reports-item-sales.png) · [pending](docs/screenshots/12-reports-pending-payments.png) | the three reporting views |

There is no Figma file: the product was designed directly in code at high fidelity, which
the brief allows. The design system lives in `frontend/tailwind.config.ts` and is described
above.

---

## Assumptions and decisions

Where the brief was open, here is what I chose and why.

1. **Single business, no authentication.** The prototype is one business's books. Auth and
   multi-tenancy are a real feature, not a checkbox, and faking them would have cost time
   better spent on the core. See [What I would do next](#what-i-would-do-next).

2. **Deletion never breaks history.** A customer with invoices, or an item that has ever
   been invoiced, cannot be hard-deleted — the API returns `409` with a sentence explaining
   why and offering *Mark inactive* instead. Records with no history delete cleanly.
   Invoices themselves *can* be deleted (with a confirmation that says sales figures will
   change), because a mis-raised invoice is a normal thing to remove.

3. **Overpayment is out of scope.** `amount_paid` cannot exceed `total_amount`. Handling
   genuine overpayment properly means credit notes and customer balances, which is a
   larger feature; blocking it with a clear message is the honest prototype behaviour.

4. **Editing an invoice recalculates it.** If the new total would fall below what has
   already been received, the API refuses and explains, rather than silently creating a
   credit balance.

5. **Tax is GST-style, per line, single rate.** Each line carries its own rate, so a mixed
   invoice (18 % wire, 28 % cement) is correct. CGST/SGST/IGST splitting depends on place
   of supply and is deliberately not modelled — the total is right either way.

6. **Inactive means "not for new business".** Inactive customers and items stay on every
   invoice they already appear on, but cannot be added to a new one.

7. **Dates, not timestamps, for invoices.** An invoice date has no time zone; it is stored
   as `DATE` and never shifted.

8. **GSTIN is optional on customers**, validated for shape only, and printed when present.

9. **No pagination UI.** The API paginates (`limit` / `offset`, default 100) but the
   screens do not yet show a pager — at prototype data volumes it would be furniture. The
   endpoint already returns `meta.total` for when it is needed.

10. **No dark mode.** A single, carefully-tuned light theme was worth more than two
    half-tuned ones for a product used against printed paperwork.

---

## Edge cases handled

| Case | Behaviour |
| --- | --- |
| No customers / items / invoices yet | Empty states that name the next action, not blank tables |
| List filtered to nothing | A *different* empty state, with "Clear filters" |
| Invoice with no line items | Blocked, with *"Please add at least one item to the invoice."* |
| Quantity ≤ 0, negative price, tax rate > 100 | Rejected by Zod **and** by `CHECK` constraints |
| Negative or excessive payment | Rejected in the form, the service, and the database |
| Payment exceeding the total | *"Record only what you have actually received."* |
| Editing an invoice below what is already paid | Refused, with both figures quoted |
| Duplicate invoice number | `409` naming the number, with the field highlighted |
| Deleting a customer with invoices | `409`, offering "Mark inactive" |
| Deleting an item that has been sold | `409`, offering "Mark inactive" |
| Inactive item or customer on a new invoice | Blocked, naming the record |
| Item renamed or repriced after invoicing | Old invoices unchanged (snapshots) |
| Very large amounts (crores) | Exact — `BigInt` paise, `NUMERIC(14,2)` storage, grouped display |
| Fractional quantities (2.5 kg) | Supported to 2 decimals |
| API unreachable | *"We could not reach the server…"* with a retry, not a stack trace |
| Any failed request | Loading and error states on every screen; no infinite spinners |
| Malformed UUID in a URL | *"That link looks wrong. Please go back and try again."* |
| Half-paisa rounding | Half-up, once per line, so lines always sum to the total |

---

## Deployment

**Frontend → Vercel.** Import the repo, set the root directory to `frontend`, add
`NEXT_PUBLIC_API_URL` (and the `NEXT_PUBLIC_BUSINESS_*` values), deploy. No other
configuration needed.

**Backend → any Node host** (Railway, Render, Fly.io, or a container).

```bash
cd backend && npm ci && npm run build && npm start   # serves dist/server.js
```

Set `DATABASE_URL`, `DATABASE_SSL=true`, `NODE_ENV=production`, and `CORS_ORIGIN` to the
deployed frontend origin. Run `npm run migrate` once against the production database as a
release step. Use Supabase's **pooler** connection string if the host is serverless.

**Database → Supabase.** Nothing else is required; the app uses it as plain Postgres.

---

## Trade-offs

Things I chose against, and what it cost.

- **The money algorithm exists twice** — once in `backend/src/utils/money.ts` and once in
  `frontend/lib/money.ts`. The frontend copy only ever powers a live preview and its
  results are never sent to the server, but it is still duplication. In a production repo
  this would be a shared workspace package consumed by both apps. Two package.json files
  were the right size for an assignment; a monorepo toolchain was not.

- **No ORM.** Hand-written SQL means the data model is legible in one file and every query
  is explicit, at the cost of writing update statements by hand. At this size, the trade
  favours clarity. Past roughly thirty tables I would want migrations generated from types.

- **No pagination or virtualisation in the UI.** Fine for hundreds of rows, wrong for tens
  of thousands.

- **Tests cover the money maths only.** That is where a bug is silent and expensive. API
  integration tests and a Playwright pass over the invoice flow are the next thing I would
  write, not the thing I would cut.

- **SWR with client-side fetching**, rather than React Server Components talking to the
  API. It keeps the "frontend talks to the backend only over REST" boundary obvious and
  makes mutations/revalidation simple. The cost is no server-side rendering of data.

- **The dashboard is one endpoint, not six.** Fewer round trips and a single loading state,
  at the cost of a chunkier response.

- **Soft-delete via a status flag**, rather than `deleted_at` tombstones. Simpler, and it
  matches how a shop owner thinks ("stop showing me this item") — but it means there is no
  audit trail of *when* something was retired.

---

## What I would do next

In rough priority order.

1. **Authentication and organisations** — sign-in, a business per account, row-level
   scoping. Everything else is built assuming this arrives.
2. **Payment history** — a `payments` table (date, amount, method, reference) instead of a
   single `amount_paid` column. The current model answers "how much is owed" but not "when
   did they pay". The generated-column design makes this a contained change.
3. **Invoice PDF** — server-rendered from the same layout as the detail screen, so the
   printed document and the on-screen one cannot diverge.
4. **Due dates and ageing** — payment terms, an overdue status, a 30/60/90 ageing report,
   and polite reminder emails. This is the feature an owner would ask for first.
5. **Credit notes and refunds** — which is the right way to solve overpayment.
6. **Optimistic updates** on payment recording, with rollback on failure.
7. **Integration and end-to-end tests** — supertest across the API, Playwright over the
   invoice flow.
8. **Observability** — structured request logging with request IDs, and error tracking.
9. **Rate limiting and request-size limits** ahead of any public deployment.
10. **CSV export** of the three reports, since that is how this data reaches an accountant.

---

*Built by Sidharth for the Samurai Labs Full-Stack Product Engineer assignment.*
