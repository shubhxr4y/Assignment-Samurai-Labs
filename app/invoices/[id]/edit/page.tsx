'use client';

import { useParams } from 'next/navigation';
import { InvoiceForm } from '@/components/app/invoice-form';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useInvoice } from '@/hooks/use-api';

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const { data: invoice, error, isLoading, mutate } = useInvoice(id);

  return (
    <>
      <PageHeader
        backHref={id ? `/invoices/${id}` : '/invoices'}
        backLabel="Back to invoice"
        title={invoice ? `Edit ${invoice.invoice_number}` : 'Edit invoice'}
        description="Changing the items recalculates the totals. Payments already recorded stay as they are."
      />

      {error ? (
        <Card>
          <ErrorState message={error.message} onRetry={() => void mutate()} />
        </Card>
      ) : isLoading || !invoice ? (
        <Card className="p-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-6 h-48 w-full" />
        </Card>
      ) : (
        <InvoiceForm invoice={invoice} />
      )}
    </>
  );
}
