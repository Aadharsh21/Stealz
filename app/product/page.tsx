import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProductView } from '@/components/product-view';

export const metadata: Metadata = {
  title: 'Compare stores',
  robots: { index: false },
};

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-4 pt-8 sm:px-6" />}>
      <ProductView />
    </Suspense>
  );
}
