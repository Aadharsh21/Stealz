import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SaleView } from '@/components/sale-view';

export const metadata: Metadata = {
  title: 'On sale',
  description:
    'Designer clothing, bags, sneakers and accessories on sale at stores in the US, UK, UAE and India, with fake shops and inflated discounts left out.',
};

export default function SalePage() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-4 pt-10 sm:px-6" />}>
      <SaleView />
    </Suspense>
  );
}
