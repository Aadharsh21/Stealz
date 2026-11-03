import Link from 'next/link';
import { buttonClass } from '@/components/classes';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="eyebrow text-accent-ink">Page not found</p>
      <h1 className="mt-3 text-title1">This page isn&apos;t on the rack</h1>
      <p className="mt-4 text-intro text-ink-soft">The link may be old or mistyped. Search for the item instead.</p>
      <Link href="/" className={`${buttonClass('primary', 'lg')} mt-9`}>
        Go to the homepage
      </Link>
    </div>
  );
}
