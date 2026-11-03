import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmAlert } from '@/lib/alerts';
import { encodeRef, productHref } from '@/lib/ref';
import { buttonClass } from '@/components/classes';

export const metadata: Metadata = { title: 'Confirm alert', robots: { index: false } };

export default async function ConfirmAlertPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmAlert(token).catch(() => null) : null;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      {result ? (
        <>
          <h1 className="text-title1">You&apos;re watching this item</h1>
          <p className="mt-4 text-intro text-ink-soft">
            We&apos;ll email you when <span className="font-semibold text-ink">{result.title}</span> drops in price. We check
            every day, and each email has a link to stop alerts.
          </p>
          <Link href={productHref(encodeRef(result.ref))} className={`${buttonClass('primary', 'lg')} mt-9`}>
            See today&apos;s prices
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-title1">This link has expired</h1>
          <p className="mt-4 text-intro text-ink-soft">
            The confirmation link is invalid or was already used to stop alerts. Set the alert again from the product page.
          </p>
          <Link href="/" className={`${buttonClass('primary', 'lg')} mt-9`}>
            Go to Stealz
          </Link>
        </>
      )}
    </div>
  );
}
