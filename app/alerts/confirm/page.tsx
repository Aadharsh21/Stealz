import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmAlert } from '@/lib/alerts';
import { encodeRef, productHref } from '@/lib/ref';

export const metadata: Metadata = { title: 'Confirm alert', robots: { index: false } };

export default async function ConfirmAlertPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmAlert(token).catch(() => null) : null;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      {result ? (
        <>
          <h1 className="type-wide text-[30px] font-extrabold tracking-[-0.03em]">You&apos;re watching this item</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
            We&apos;ll email you when <span className="font-semibold text-ink">{result.title}</span> drops in price. We check
            every day, and each email has a link to stop alerts.
          </p>
          <Link href={productHref(encodeRef(result.ref))} className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-soft">
            See today&apos;s prices
          </Link>
        </>
      ) : (
        <>
          <h1 className="type-wide text-[30px] font-extrabold tracking-[-0.03em]">This link has expired</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
            The confirmation link is invalid or was already used to stop alerts. Set the alert again from the product page.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-soft">
            Go to Stealz
          </Link>
        </>
      )}
    </div>
  );
}
