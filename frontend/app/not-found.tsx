import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <p className="text-label uppercase text-ink-subtle">Page not found</p>
      <h1 className="mt-3 text-display font-semibold text-ink">
        That page isn’t here
      </h1>
      <p className="mt-2 max-w-sm text-body text-ink-muted">
        The link may be out of date, or the record may have been deleted.
      </p>
      <Button asChild variant="primary" className="mt-6">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
