'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileText, LayoutDashboard, Package, Users } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-body font-medium transition-all duration-200',
              active
                ? 'bg-brand-50 text-brand-700 shadow-sm font-semibold'
                : 'text-ink-muted hover:bg-line/40 hover:text-ink hover:translate-x-0.5',
            )}
          >
            {active ? (
              <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-r bg-brand-600 animate-scale-in" />
            ) : null}
            <Icon
              className={cn(
                'size-4 transition-transform duration-200 group-hover:scale-110',
                active ? 'text-brand-600' : 'text-ink-subtle group-hover:text-ink',
              )}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link href="/" className="rounded-sm">
          <Logo />
        </Link>
      </div>
      <SidebarNav />
      <div className="mt-auto border-t border-line p-4">
        <p className="text-small font-medium text-ink">
          {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Your business'}
        </p>
        <p className="mt-0.5 text-small text-ink-subtle">
          GSTIN {process.env.NEXT_PUBLIC_BUSINESS_GSTIN ?? '—'}
        </p>
      </div>
    </aside>
  );
}
