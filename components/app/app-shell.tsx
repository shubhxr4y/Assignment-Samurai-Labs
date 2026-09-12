'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sidebar, SidebarNav } from './sidebar';
import { Logo } from './logo';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar />

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="rounded-sm">
          <Logo />
        </Link>
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu />
        </Button>
      </header>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="top-4 max-w-xs translate-y-0 p-0 sm:max-w-xs">
          <div className="flex h-14 items-center border-b border-line px-5">
            <Logo />
          </div>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
