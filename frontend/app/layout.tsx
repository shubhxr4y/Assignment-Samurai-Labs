import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Bahi — bookkeeping & invoicing',
    template: '%s · Bahi',
  },
  description:
    'Simple bookkeeping for small businesses: customers, items, invoices and a clear view of who owes you money.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                'rounded-md border border-line bg-surface text-ink shadow-overlay text-body px-4 py-3',
              description: 'text-ink-muted text-small',
              success: 'border-success-border',
              error: 'border-danger-border',
            },
          }}
        />
      </body>
    </html>
  );
}
