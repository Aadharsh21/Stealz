import type { Metadata } from 'next';
import { UnsubscribeForm } from '@/components/unsubscribe-form';

export const metadata: Metadata = { title: 'Stop alerts', robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <UnsubscribeForm token={token ?? ''} />
    </div>
  );
}
