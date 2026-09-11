'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InvoiceForm } from '@/components/app/invoice-form';
import { PageHeader } from '@/components/app/page-header';

function NewInvoiceForm() {
  // /invoices/new?customer=<id> pre-selects a customer from their detail page.
  const customerId = useSearchParams().get('customer');
  return <InvoiceForm initialCustomerId={customerId} />;
}

export default function NewInvoicePage() {
  return (
    <>
      <PageHeader
        backHref="/invoices"
        backLabel="All invoices"
        title="Create invoice"
        description="Pick a customer, add what you sold, and the totals are worked out as you type."
      />
      <Suspense fallback={null}>
        <NewInvoiceForm />
      </Suspense>
    </>
  );
}
