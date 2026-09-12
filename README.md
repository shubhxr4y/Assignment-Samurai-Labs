# Bahi (बही) — Modern Bookkeeping & Invoicing for Small Businesses

A production-ready full-stack bookkeeping and invoicing web application designed for Indian MSMEs, shopkeepers, and service providers. Manage customers and catalogues, issue tax-compliant GST invoices, record payments, track receivables aging, and review sales analytics in real time.

Built for the **Samurai Labs Full-Stack Product Engineer** assignment.

> **Bahi** (बही) refers to the traditional cloth-bound ledger (*bahi-khata*) maintained by generations of Indian merchants. This software pays homage to that heritage with a warm, paper-inspired aesthetic while providing the speed, precision, and reliability of a modern web application.

---

## Quick Navigation

- [Executive Summary & Features](#executive-summary--features)
- [System Architecture](#system-architecture)
- [Comprehensive File-by-File Codebase Tour](#comprehensive-file-by-file-codebase-tour)
  - [1. Root Configuration & Tooling](#1-root-configuration--tooling)
  - [2. Database Schema & Lifecycle Scripts (`scripts/`)](#2-database-schema--lifecycle-scripts-scripts)
  - [3. Server Core, Services & Repositories (`lib/server/`)](#3-server-core-services--repositories-libserver)
  - [4. API Route Handlers (`app/api/`)](#4-api-route-handlers-appapi)
  - [5. Application Pages (`app/`)](#5-application-pages-app)
  - [6. Reusable UI Primitives (`components/ui/`)](#6-reusable-ui-primitives-componentsui)
  - [7. Application Domain Components (`components/app/`)](#7-application-domain-components-componentsapp)
  - [8. Client Services, Hooks & Utilities (`lib/`, `services/`, `hooks/`, `types/`)](#8-client-services-hooks--utilities-lib-services-hooks-types)
  - [9. Testing & Documentation (`docs/`)](#9-testing--documentation-docs)
- [Data Model & Database Design](#data-model--database-design)
- [Core Business Rules & Precision Math](#core-business-rules--precision-math)
- [Design System & Micro-Animations](#design-system--micro-animations)
- [Getting Started & Local Setup](#getting-started--local-setup)
- [1-Click Vercel Deployment Guide](#1-click-vercel-deployment-guide)
- [Verification & Automated Tests](#verification--automated-tests)
- [API Reference](#api-reference)
- [Edge Cases Handled](#edge-cases-handled)
- [Architectural Trade-offs & Future Roadmap](#architectural-trade-offs--future-roadmap)

---

## Executive Summary & Features

Bahi is a single, unified full-stack application built with **Next.js 15 App Router**, **React 19**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL**. It eliminates the complexity of coordinating separate frontend and backend hosting by deploying the UI and REST API as serverless functions on a single domain.

### What All is Covered

| Module | Core Capabilities |
| --- | --- |
| **Executive Dashboard** | Four real-time KPI tiles (Total Revenue, Cash Collected, Pending Receivables, Active Invoices), animated 6-month sales revenue bar chart, customer revenue contribution visualizer, urgent receivables aging queue, and high-velocity item leaderboard. |
| **Invoice Engine** | Financial-year auto-numbering (`INV-YYZZ-NNNN`), live GST tax calculation (any rate 0–100%, with standard slabs 0%, 5%, 12%, 18%, 28% in seed data), fractional quantity support, historical line snapshotting, full print-ready document view, and deletion safeguards. |
| **Payment Ledger** | Record exact cash/bank collections, automatic database-level payment status generation (`pending`, `partially_paid`, `paid`), zero-overpayment guards, and payment settlement badges with animated live pulse rings. |
| **Customer Directory** | Complete customer profile management, 15-character GSTIN format validation, phone/email directory, lifetime value metrics (`total_sales`, `total_pending`), and soft-archiving protection against deleting active debtor history. |
| **Item Catalogue** | Product catalogue with description, freeform unit label (e.g. pcs, kg, mtr, box, hrs in seed data), unit pricing in INR, flexible GST rate (0–100%), aggregate units sold, total revenue generated, and full invoice sales history. |
| **Financial Reports** | Three dedicated financial reports: **Customer-wise Sales** (billing vs collection efficiency), **Item-wise Sales** (volume vs revenue share), and **Pending Payments Ledger** (receivables aging in days). |

---

## System Architecture

The application adopts a clean, layered architecture inside a single repository:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 15 RUNTIME (ROOT)                        │
│                                                                          │
│  ┌─────────────────────────┐             ┌────────────────────────────┐  │
│  │    Client Browser UI    │  HTTP/REST  │ Next.js Route Handlers     │  │
│  │ (React 19 + SWR Hooks)  │ ──────────▶ │        (app/api/*)         │  │
│  └─────────────────────────┘             └─────────────┬──────────────┘  │
│                                                        │                 │
│                                                        ▼                 │
│                                          ┌────────────────────────────┐  │
│                                          │ Business Services Layer    │  │
│                                          │  (Validation & Logic)      │  │
│                                          └─────────────┬──────────────┘  │
│                                                        │                 │
│                                                        ▼                 │
│                                          ┌────────────────────────────┐  │
│                                          │ Data Repositories (SQL)    │  │
│                                          └─────────────┬──────────────┘  │
└────────────────────────────────────────────────────────┼─────────────────┘
                                                         │ pg pool
                                                         ▼
                                          ┌────────────────────────────┐
                                          │   PostgreSQL Database      │
                                          │  (Supabase or Self-hosted) │
                                          └────────────────────────────┘
```

### Architectural Guarantees

1. **Single Origin (`/api`)**: The frontend makes standard relative fetch requests to `/api/*`. No CORS configurations or multi-server orchestration required.
2. **One-Way Server Data Flow**: 
   $$\text{Route Handler} \longrightarrow \text{Zod Validator} \longrightarrow \text{Domain Service} \longrightarrow \text{SQL Repository} \longrightarrow \text{PostgreSQL}$$
3. **Zero ORM Overhead**: All database queries are written in explicit, readable, parameterized SQL with full type safety.
4. **Predictable JSON Envelopes**: Every API endpoint returns a standardized response structure:
   ```jsonc
   // Success response
   { "success": true, "data": { ... }, "meta": { "total": 14 } }

   // Error response
   { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Please select a customer.", "fields": { "customer_id": "Required" } } }
   ```

---

## Comprehensive File-by-File Codebase Tour

This section guides you through the codebase file by file, explaining the purpose, key exports, and implementation details of every component.

### 1. Root Configuration & Tooling

| File | Purpose & Details |
| --- | --- |
| `package.json` | Declares project dependencies, engines, and lifecycle scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `migrate`, `seed`, `db:reset`, `test`). Uses React 19, Next.js 15, `pg`, `zod`, `swr`, Radix UI, and Lucide icons. |
| `tsconfig.json` | Configures TypeScript compilation with strict mode enabled, path aliases (`@/*` pointing to root), and Next.js compiler plugin support. |
| `tailwind.config.ts` | The central design system token file. Configures custom color palettes (`paper`, `ink`, `brand`, `status`), typography hierarchy, custom shadows, and CSS keyframe animations (`fadeInUp`, `fade-in`, `pulse`). |
| `next.config.mjs` | Next.js framework configuration. Enables production optimizations and standalone serverless builds. |
| `postcss.config.mjs` | PostCSS configuration integrating Tailwind CSS and Autoprefixer. |
| `.env.example` | Template of all required environment variables for local development and production deployments. |
| `.gitignore` | Ensures secrets (`.env*`), build outputs (`.next/`, `dist/`), and dependencies (`node_modules/`) are never committed. |

---

### 2. Database Schema & Lifecycle Scripts (`scripts/`)

| File | Purpose & Details |
| --- | --- |
| `scripts/migrations/001_init.sql` | The single source of truth for the database schema. Creates the `customers`, `items`, `invoices`, and `invoice_items` tables. Configures `NUMERIC(14,2)` precision, foreign key relationships, search indexes, check constraints (`quantity > 0`), and `STORED GENERATED` columns for `amount_pending` and `payment_status`. |
| `scripts/migrate.ts` | Automated migration runner. Reads migration SQL files in chronological order from `scripts/migrations/`, executes them inside isolated transactions, and tracks execution status in a `schema_migrations` table. Supports a `--reset` flag to wipe and rebuild cleanly. |
| `scripts/seed.ts` | Database seeder that loads sample business data. Crucially uses the server's own `money.ts` calculation logic to ensure seeded line totals and taxes are arithmetically identical to invoices generated in the UI. |
| `scripts/seed-data.ts` | Static test dataset representing an electrical and hardware supplier in Howrah (8 customers, 17 items across varied tax rates, and 14 historical invoices with varied payment statuses). |
| `scripts/seed-sql.ts` | Utility script that converts the seed dataset into raw SQL statements, allowing direct copy-pasting into the Supabase Web SQL Editor without running Node scripts. |

---

### 3. Server Core, Services & Repositories (`lib/server/`)

The `lib/server/` directory houses all backend business logic and database interactions.

#### Database & Configuration
- `lib/server/db/pool.ts`: Manages PostgreSQL connection pooling via `pg.Pool`. Features serverless environment detection (restricting connection pools on Vercel), lazy proxy initialization (preventing build-time connection errors when `DATABASE_URL` is absent), query logging in development, and the `withTransaction` wrapper for atomic operations.
- `lib/server/config/env.ts`: Safe environment loader validating `DATABASE_URL`, `DATABASE_SSL`, and `PORT`.
- `lib/server/types/domain.ts`: TypeScript interface definitions for database records, including `Customer`, `Item`, `Invoice`, `InvoiceItem`, and report summary shapes.

#### Domain Services (Business Rules)
- `lib/server/services/invoice.service.ts`: The business core for invoicing. Handles financial-year invoice sequence generation, line-item snapshotting, payment balance calculations, payment recording with strict overpayment guards, and cascade deletions.
- `lib/server/services/customer.service.ts`: Manages customer registration, updates, and deletion rules (prevents hard deletion of customers with invoice history, prompting soft deactivation instead).
- `lib/server/services/item.service.ts`: Item catalogue management with validation and deletion protection for items referenced in existing invoices.
- `lib/server/services/report.service.ts`: Orchestrates aggregated analytical data for reports and dashboard metrics.

#### Data Repositories (Hand-Written SQL)
- `lib/server/repositories/invoice.repository.ts`: Parameterized SQL queries for invoice creation, updates, payment status adjustments, line-item insertions, and multi-filter querying.
- `lib/server/repositories/customer.repository.ts`: SQL queries for customers with real-time balance aggregations (`invoice_count`, `total_sales`, `total_pending`).
- `lib/server/repositories/item.repository.ts`: SQL queries for item catalogues with lifetime sales figures and invoice item history lookups.
- `lib/server/repositories/report.repository.ts`: Complex analytical queries computing 6-month monthly revenue trends, customer billing vs collections, item revenue contributions, and receivables aging.

#### Validators & Utilities
- `lib/server/validators/customer.validator.ts`: Zod schema for customer creation/editing with Indian GSTIN regex validation (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
- `lib/server/validators/item.validator.ts`: Zod schema for items, verifying tax rates (0–100%) and non-negative pricing.
- `lib/server/validators/invoice.validator.ts`: Zod schema validating invoice creation, positive line quantities, and payment recordings.
- `lib/server/validators/common.ts`: Shared validation schemas for UUIDs, pagination parameters, sorting, and search queries.
- `lib/server/utils/money.ts`: High-precision financial arithmetic module. Converts decimal currency strings into integer `BigInt` paise, applies banker's half-up rounding at the line level, and computes tax and invoice totals with zero floating-point error.
- `lib/server/utils/invoice-number.ts`: Computes the current Indian financial year (April 1 – March 31) and formats the next sequential invoice number (`INV-2026-27-0001`).
- `lib/server/utils/api-error.ts`: Domain error classes (`ApiError`, `ValidationError`, `NotFoundError`, `ConflictError`) with standard HTTP status mappings.
- `lib/server/utils/next-response.ts`: Helper converting server results or thrown errors into standard Next.js JSON responses.

---

### 4. API Route Handlers (`app/api/`)

Next.js 15 App Router serverless endpoints mapped under `/api/*`:

- `app/api/health/route.ts`: Server healthcheck returning uptime and timestamp.
- `app/api/dashboard/route.ts`: Aggregated endpoint returning KPI stats, 6-month sales trend, top customers, top items, and urgent receivables in a single request.
- `app/api/customers/route.ts`: `GET` (list customers with search/filter) & `POST` (create customer).
- `app/api/customers/[id]/route.ts`: `GET` (fetch details), `PUT` (update customer), `DELETE` (delete or soft-archive).
- `app/api/items/route.ts`: `GET` (list inventory items) & `POST` (create new item).
- `app/api/items/[id]/route.ts`: `GET` (item details), `PUT` (edit item), `DELETE` (delete item).
- `app/api/items/[id]/sales/route.ts`: `GET` (retrieves every invoice line this item has appeared on).
- `app/api/invoices/route.ts`: `GET` (list invoices with multi-status filters) & `POST` (create invoice with live line calculation).
- `app/api/invoices/next-number/route.ts`: `GET` (fetches the next auto-incremented invoice number for the active FY).
- `app/api/invoices/[id]/route.ts`: `GET` (fetch invoice with line items and customer snapshot), `PUT` (update invoice), `DELETE` (delete invoice).
- `app/api/invoices/[id]/payments/route.ts`: `POST` (record payment received against an invoice).
- `app/api/reports/customer-sales/route.ts`: `GET` (customer sales, collections, and outstanding report).
- `app/api/reports/item-sales/route.ts`: `GET` (item sales volume and revenue report).
- `app/api/reports/pending-payments/route.ts`: `GET` (receivables aging report sorted by days overdue).

---

### 5. Application Pages (`app/`)

- `app/layout.tsx`: Root application shell providing metadata, font configuration (Inter and Source Serif 4), and the Toast notifications container.
- `app/globals.css`: Global CSS variables, custom typography utilities, paper texture backgrounds, and animation keyframes (`fadeInUp`).
- `app/page.tsx`: The Executive Dashboard featuring animated KPI tiles, monthly sales bar chart, customer revenue distribution, top-selling items, and quick-action receivables table.
- `app/invoices/page.tsx`: Invoices ledger with status filter tabs (`All`, `Pending`, `Partially Paid`, `Paid`), search bar, and action dropdowns.
- `app/invoices/new/page.tsx`: Interactive invoice creator featuring instant GST calculation as line items are modified.
- `app/invoices/[id]/page.tsx`: Document-style invoice viewer with clean printable styling, payment status banner, and payment recording modal.
- `app/invoices/[id]/edit/page.tsx`: Invoice editing screen with pre-populated line items and live re-calculation.
- `app/customers/page.tsx`: Customer directory with search, status filters, and instant customer creation modal.
- `app/customers/[id]/page.tsx`: Detailed customer profile showing contact information, GSTIN, lifetime metrics, and invoice history.
- `app/items/page.tsx`: Product catalogue table listing item name, description, unit, GST rate, unit price, and total units sold.
- `app/items/[id]/page.tsx`: Item detail page showing sales volume, total revenue, and historical invoice appearances.
- `app/reports/customer-sales/page.tsx`: Customer billing vs collections report with collection efficiency bars.
- `app/reports/item-sales/page.tsx`: Item volume and revenue contribution analysis.
- `app/reports/pending-payments/page.tsx`: Outstanding receivables ledger with payment aging indicators.
- `app/not-found.tsx`: User-friendly 404 page with navigation back to the dashboard.

---

### 6. Reusable UI Primitives (`components/ui/`)

Tailwind-styled UI components built on Radix UI primitives:

- `components/ui/amount.tsx`: Formats rupee figures (`₹1,25,000.00`) with Indian numbering grouping (`en-IN`) and tabular figures (`font-mono`) to ensure perfect vertical alignment in financial tables.
- `components/ui/status-badge.tsx`: Payment status badge featuring custom color tokens and **animated live pulse rings** (`animate-ping`) for pending and partially paid items.
- `components/ui/button.tsx`: Accessible button component with variant styles (`primary`, `secondary`, `destructive`, `ghost`), loading spinners, and tactile active press animation (`active:scale-[0.98]`).
- `components/ui/card.tsx`: Paper-styled card container featuring subtle hairline borders and micro-elevation.
- `components/ui/table.tsx`: Data-dense financial table with styled headers, alternating hover rows, and right-aligned numeric cells.
- `components/ui/dialog.tsx`: Accessible modal dialog built on `@radix-ui/react-dialog` with animated backdrop overlay and smooth scale-in transitions.
- `components/ui/input.tsx` & `components/ui/select.tsx`: Form input and dropdown select primitives with focus rings and error states.
- `components/ui/combobox.tsx`: Searchable item/customer selector powered by `cmdk` for fast keyboard selection.
- `components/ui/confirm-dialog.tsx`: Reusable confirmation modal for destructive operations (e.g., deleting invoices).
- `components/ui/states.tsx`: Shimmer skeleton loading states, empty collection states with action buttons, and error retry states.
- `components/ui/tabs.tsx`: Underline tab bar for switching ledger views.

---

### 7. Application Domain Components (`components/app/`)

- `components/app/app-shell.tsx`: Layout wrapper coordinating the navigation sidebar and content area.
- `components/app/sidebar.tsx`: Primary sidebar navigation with active route highlights, keyboard shortcuts, and business info badge.
- `components/app/page-header.tsx`: Consistent page title bar with breadcrumbs, descriptions, and primary call-to-action buttons.
- `components/app/stat-tile.tsx`: Metric card component featuring staggered entrance animations, trend indicators, and formatted currency.
- `components/app/sales-chart.tsx`: Custom SVG-based bar chart rendering a 6-month monthly revenue trend with **animated rising bars** (`transition-all duration-700 ease-out`).
- `components/app/invoice-form.tsx`: Interactive form for creating and editing invoices. Supports dynamic line addition/removal, autocomplete item selection, live tax rate calculation, and client-side arithmetic preview.
- `components/app/record-payment-dialog.tsx`: Modal for recording incoming cash/bank payments with quick-action buttons ("Pay in Full", "Clear") and instant balance calculation.
- `components/app/customer-form-dialog.tsx`: Modal form for creating and updating customer details.
- `components/app/item-form-dialog.tsx`: Modal form for creating and updating inventory catalogue items.
- `components/app/list-toolbar.tsx`: Unified search and filter bar for tables with debounced input.
- `components/app/row-actions.tsx`: Contextual actions dropdown menu for table rows.
- `components/app/logo.tsx`: Bahi brand logo with Devanagari script accent.

---

### 8. Client Services, Hooks & Utilities (`lib/`, `services/`, `hooks/`, `types/`)

- `lib/api.ts`: Client HTTP wrapper that unwraps `{ success, data, error }` envelopes and standardizes client error handling. Automatically points to the unified `/api` endpoint.
- `lib/money.ts`: Client-side financial calculator mirroring server logic for real-time subtotal, tax, and grand total updates on form inputs.
- `lib/format.ts`: String and date formatters (`formatDate`, `formatIndianCurrency`, `formatGSTIN`).
- `lib/utils.ts`: Tailwind CSS class merger (`cn`) combining `clsx` and `tailwind-merge`.
- `services/customers.ts`, `services/items.ts`, `services/invoices.ts`: Typed client API functions wrapping HTTP requests for each domain entity.
- `hooks/use-api.ts`: Custom SWR hook wrappers (`useCustomers`, `useItems`, `useInvoices`, `useDashboard`, `useReports`) with automated cache revalidation and optimistic updates.
- `hooks/use-debounced.ts`: Debounces user search queries to avoid redundant API requests.
- `types/api.ts`: Shared client-side TypeScript definitions for API payloads, forms, and responses.

---

### 9. Testing & Documentation (`docs/`)

- `lib/server/utils/money.test.ts`: 13 exhaustive unit tests executed via Node's native test runner (`node:test`). Validates decimal string parsing, half-up rounding, GST calculations, fractional quantities, crore-scale amounts, and FY invoice numbering.
- `docs/api.http`: Ready-to-execute HTTP request collection for VS Code REST Client or Postman.
- `docs/design.md`: In-depth design documentation explaining typography selections, color palette rationale, spacing grids, and component state flows.
- `docs/screenshots/`: High-resolution screenshots of all 12 primary application screens.

---

## Data Model & Database Design

The relational model enforces data integrity, historical snapshotting, and strict financial consistency:

```
┌──────────────────┐               ┌──────────────────┐
│    customers     │ 1           * │     invoices     │
│──────────────────│───────────────│──────────────────│
│ id (PK, UUID)    │               │ id (PK, UUID)    │
│ name             │               │ invoice_number U │
│ email            │               │ customer_id (FK) │
│ phone            │               │ invoice_date     │
│ address          │               │ subtotal         │
│ gstin            │               │ tax_amount       │
│ status           │               │ total_amount     │
└──────────────────┘               │ amount_paid      │
                                   │ amount_pending*  │
                                   │ payment_status*  │
                                   └─────────┬────────┘
                                             │ 1
                                             │
                                             │ *
┌──────────────────┐               ┌─────────┴────────┐
│      items       │ 1           * │  invoice_items   │
│──────────────────│───────────────│──────────────────│
│ id (PK, UUID)    │               │ id (PK, UUID)    │
│ name             │               │ invoice_id (FK)  │
│ unit             │               │ item_id (FK)     │
│ unit_price       │               │ item_name_snap   │
│ tax_rate         │               │ item_unit_snap   │
│ status           │               │ quantity         │
└──────────────────┘               │ unit_price       │
                                   │ tax_rate         │
                                   │ line_subtotal    │
                                   │ tax_amount       │
                                   │ line_total       │
                                   └──────────────────┘
* Denotes STORED GENERATED database columns
```

### Key Architectural Database Decisions

1. **Immutable Line Snapshots**: When an invoice is issued, `invoice_items` stores copies of `item_name_snapshot`, `item_unit_snapshot`, `unit_price`, and `tax_rate`. If an item's catalogue price increases next month, historical invoices remain unaltered.
2. **Database-Generated Columns**: `amount_pending` and `payment_status` are derived at the database level:
   ```sql
   amount_pending NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
   payment_status VARCHAR(20) GENERATED ALWAYS AS (
     CASE 
       WHEN amount_paid <= 0 THEN 'pending'
       WHEN amount_paid >= total_amount THEN 'paid'
       ELSE 'partially_paid'
     END
   ) STORED
   ```
   This guarantees that payment statuses can never drift out of sync regardless of whether writes occur through the API, a migration script, or direct SQL execution.
3. **Optimized Indexes**:
   - `invoices(customer_id)`, `invoices(invoice_date DESC)`, `invoices(payment_status)`
   - `invoice_items(invoice_id)`, `invoice_items(item_id)`
   - Lowercase functional indexes for fast case-insensitive customer and item search: `LOWER(name)`.

---

## Core Business Rules & Precision Math

### Zero-Float Integer Arithmetic

Standard JavaScript `Number` types use IEEE-754 double-precision floating-point arithmetic, causing subtle rounding errors like `0.1 + 0.2 = 0.30000000000000004`. In financial bookkeeping, a discrepancy of even 1 paisa causes reconciliation failures.

Bahi guarantees arithmetic precision through custom integer math in `lib/server/utils/money.ts`:
- All currency values are converted to **integer paise** stored in `BigInt` (₹125.50 $\rightarrow$ `12550n`).
- Quantities are parsed into integer units scaled to two decimal places (2.50 kg $\rightarrow$ `250n`).
- Calculations use banker's **half-up rounding**:
  $$\text{paise} = \left\lfloor \frac{\text{raw} + 5000\text{n}}{10000\text{n}} \right\rfloor$$
- Sums of rounded line items match the displayed invoice total exactly:
  $$\text{Total Invoice Amount} = \sum \text{Rounded Line Subtotals} + \sum \text{Rounded Line Taxes}$$

### Financial Year Invoice Numbering

In accordance with Indian commercial practice, invoice numbers reset every financial year (April 1 to March 31):
- `INV-2025-26-0001` for FY 2025-26
- `INV-2026-27-0001` for FY 2026-27

The sequence queries the highest numerical suffix for the current financial year and increments it by one. Users may also manually enter custom invoice numbers, protected by a database `UNIQUE` constraint.

---

## Design System & Micro-Animations

The interface is modeled after physical Indian stationery and high-grade document design:

- **Color Palette**:
  - `paper`: Warm eggshell background (`#FBFAF8`) replacing harsh digital whites.
  - `ink`: Deep carbon tone (`#1B1917`) replacing pure black.
  - `brand`: Traditional ledger ink-indigo (`#3A4BA0`) for primary interactive controls.
  - `status`: Semantic status colors — Paid Green (`#14622F`), Partially Paid Amber (`#8A4B07`), and Pending Slate (`#4A453F`). Unpaid invoices are deliberately styled in neutral slate rather than alarming red.
- **Typography**: Inter for crisp numerical legibility in tables; Source Serif 4 for invoice headers and totals to evoke printed formal invoices.
- **Micro-Animations**:
  - **Staggered Card Entrances**: Dashboard metric cards load sequentially via `animate-fade-in-up` with progressive delay utilities (`delay-50` to `delay-400`).
  - **Animated Rising Sales Bars**: Monthly revenue chart bars smoothly animate from baseline height on page load (`transition-all duration-700 ease-out`).
  - **Tactile Button Clicks**: Buttons feature subtle micro-scaling on click (`active:scale-[0.98]`).
  - **Live Pulsing Status Rings**: `pending` and `partially_paid` badges display animated ambient rings (`animate-ping`) to highlight unpaid accounts.
  - **Accessibility**: All animations respect user OS preferences via `@media (prefers-reduced-motion: reduce)`.

---

## Getting Started & Local Setup

### Prerequisites

- **Node.js**: Version 20.x or later.
- **PostgreSQL**: Version 14+ (Local PostgreSQL instance or a free [Supabase](https://supabase.com) database).

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/shubhxr4y/Assignment-Samurai-Labs.git
cd Assignment-Samurai-Labs
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Populate your `.env.local`:

```env
# PostgreSQL connection string (direct or pooled)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Enable SSL for Supabase / hosted PostgreSQL
DATABASE_SSL=true

# Relative endpoint for client-side API requests
NEXT_PUBLIC_API_URL=/api

# Business metadata displayed on printed invoices
NEXT_PUBLIC_BUSINESS_NAME="Sharma Electricals & Hardware"
NEXT_PUBLIC_BUSINESS_GSTIN="19AAACH7409R1ZZ"
NEXT_PUBLIC_BUSINESS_ADDRESS="12 Netaji Subhas Road, Howrah, West Bengal 711101"
NEXT_PUBLIC_BUSINESS_PHONE="+91 98300 12345"
NEXT_PUBLIC_BUSINESS_EMAIL="billing@sharmaelectricals.in"
```

### 3. Initialize Database & Seed Sample Data

Run migrations to create tables, constraints, and indexes:

```bash
npm run migrate
```

Seed the database with sample customers, items, and invoices:

```bash
npm run seed
```

*(Optional)* To reset the database and re-seed from scratch in one step:
```bash
npm run db:reset
```

### 4. Start the Development Server

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 1-Click Vercel Deployment Guide

Because Bahi is a single full-stack Next.js 15 application, deployment to Vercel takes less than two minutes:

1. **Push your repository** to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New" $\rightarrow$ "Project"**.
3. Import your GitHub repository (`Assignment-Samurai-Labs`).
4. **Leave Root Directory as `./`** (do not select a subfolder).
5. Add the following **Environment Variables**:
   - `DATABASE_URL`: Your Supabase database connection string (use port 6543 pooler mode for serverless deployments).
   - `DATABASE_SSL`: `true`
   - `NEXT_PUBLIC_API_URL`: `/api`
   - *(Optional)* Add your business details (`NEXT_PUBLIC_BUSINESS_NAME`, etc.).
6. Click **Deploy**. Vercel will automatically build the Next.js pages and deploy the 12 API route handlers as serverless functions.
7. Run migrations against your production database using your local CLI:
   ```bash
   npx tsx scripts/migrate.ts
   ```

---

## Verification & Automated Tests

### Running Unit Tests

To run the automated precision test suite covering integer math, half-up rounding, GST line taxes, fractional quantities, crore-scale calculations, and FY sequence numbering:

```bash
npm test
```

Expected output:
```
✔ money > parses decimal string to paise (0.6ms)
✔ money > formats paise to decimal string (0.2ms)
✔ money > adds, subtracts, multiplies paise (0.2ms)
✔ money > calculates GST tax with half-up rounding (0.3ms)
✔ money > calculates complete line item (0.2ms)
✔ money > calculates invoice totals across lines (0.2ms)
✔ money > handles fractional quantities correctly (0.2ms)
✔ money > handles crore-scale amounts without precision loss (0.3ms)
✔ money > handles zero amounts correctly (0.1ms)
✔ money > rounds half-up correctly at 0.5 paisa boundary (0.2ms)
✔ invoice-number > generates correct sequence format (0.3ms)
✔ invoice-number > handles FY transition correctly (0.2ms)
✔ invoice-number > increments existing sequence number (0.2ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
```

### Type Checking & Production Build

```bash
# Verify 100% TypeScript compliance
npm run typecheck

# Verify successful Next.js production compilation
npm run build
```

---

## API Reference

All endpoints accept and return JSON using the base path `/api`.

### Customers (`/api/customers`)
- `GET /api/customers`: List customers with `search`, `status`, `sort`, and pagination parameters.
- `POST /api/customers`: Create a new customer record.
- `GET /api/customers/:id`: Retrieve single customer with aggregated lifetime sales and pending balance.
- `PUT /api/customers/:id`: Update customer details.
- `DELETE /api/customers/:id`: Delete customer (returns `409 Conflict` if the customer has existing invoices).

### Items (`/api/items`)
- `GET /api/items`: List catalogue items with sales totals.
- `POST /api/items`: Create a new inventory item.
- `GET /api/items/:id`: Retrieve single item.
- `PUT /api/items/:id`: Update item details.
- `DELETE /api/items/:id`: Delete item (returns `409 Conflict` if item appears on any invoice).
- `GET /api/items/:id/sales`: Retrieve full list of invoice lines featuring this item.

### Invoices (`/api/invoices`)
- `GET /api/invoices`: List invoices with status filter (`pending`, `partially_paid`, `paid`), date range, or customer ID.
- `POST /api/invoices`: Issue an invoice. Backend recalculates all taxes and totals from line quantities.
- `GET /api/invoices/next-number`: Generates next recommended invoice number for the active fiscal year.
- `GET /api/invoices/:id`: Fetch complete invoice document with customer details and line items.
- `PUT /api/invoices/:id`: Edit invoice lines and recalculate balances.
- `POST /api/invoices/:id/payments`: Record payment received against an invoice.
- `DELETE /api/invoices/:id`: Delete an invoice and cascade remove its line items.

### Dashboard & Reports (`/api/dashboard`, `/api/reports`)
- `GET /api/dashboard`: Aggregated dashboard payload (KPIs, 6-month chart, urgent receivables, top items).
- `GET /api/reports/customer-sales`: Customer-wise sales, collections, and outstanding report.
- `GET /api/reports/item-sales`: Item volume and revenue contribution report.
- `GET /api/reports/pending-payments`: Aging ledger of all pending receivables.

---

## Edge Cases Handled

| Scenario | Handled Behavior |
| --- | --- |
| **Floating-Point Imprecision** | Prevented by storing and calculating all currency as `BigInt` integer paise. |
| **Duplicate Invoice Numbers** | Enforced by a database `UNIQUE` constraint; returns an actionable error message suggesting the next sequence number. |
| **Overpayment Attempt** | Blocked across form UI, domain service, and database `CHECK` constraints (`amount_paid <= total_amount`). |
| **Catalog Price Changes** | Inactive or repriced items do not alter historical invoices due to line-item snapshotting (`item_name_snapshot`, etc.). |
| **Deleting Active Customers/Items** | Protected via `409 Conflict` responses preventing accidental record destruction; offers soft-archiving instead. |
| **Invoice with Zero Lines** | Blocked by Zod validation with a clear prompt: *"Please add at least one item to the invoice."* |
| **Empty or Filtered Lists** | Contextual empty states providing a 1-click action ("Add Customer" or "Clear Filters"). |
| **Network or Database Dropouts** | Graceful error states with "Retry" action buttons rather than raw stack traces. |
| **Malformed URL Identifiers** | Handled with custom 404 page and clean navigation back to safety. |

---

## Architectural Trade-offs & Future Roadmap

### Intentional Trade-offs

1. **Single-Tenant Scope**: The system focuses on delivering an exceptional, polished experience for an independent business without the overhead of multi-tenant organization switching or user authentication.
2. **Hand-Written SQL over ORM**: Direct SQL queries maximize performance, transparency, and database feature usage (such as `STORED GENERATED` columns) at the cost of writing manual update queries.
3. **SWR Client-Side Fetching**: Chosen to preserve an explicit separation between client UI components and API route handlers, enabling smooth revalidations and optimistic UI updates.

### Future Roadmap

1. **Multi-User Authentication**: Role-based access control (Owner, Accountant, Sales Staff) with Supabase Auth or NextAuth.
2. **Dedicated Payment Transactions Table**: Introduce a `payments` table to log discrete partial payments with payment method (UPI, NEFT, Cash, Cheque) and transaction reference numbers.
3. **Automated Server-Rendered PDF Generation**: Headless Chromium PDF generation for 1-click invoice downloads and WhatsApp sharing.
4. **Credit Notes & Adjustments**: Formal credit note workflows to handle client returns and overpayments cleanly.
5. **CSV / Excel Exports**: One-click data export for CA reconciliation and GST filing.

---

*Built by Shubhom for the Samurai Labs Full-Stack Product Engineer assignment.*
