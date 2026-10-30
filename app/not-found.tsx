import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <h1 className="type-wide text-[34px] font-extrabold tracking-[-0.035em]">This page isn&apos;t on the rack</h1>
      <p className="mt-3 text-[16px] text-ink-soft">The link may be old or mistyped. Search for the item instead.</p>
      <Link href="/" className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-soft">
        Go to the homepage
      </Link>
    </div>
  );
}
