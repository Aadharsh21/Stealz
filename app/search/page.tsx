import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResultsView } from '@/components/results-view';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-4 pt-8 sm:px-6" />}>
      <ResultsView />
    </Suspense>
  );
}
