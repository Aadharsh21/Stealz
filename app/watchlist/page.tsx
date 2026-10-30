import type { Metadata } from 'next';
import { WatchlistView } from '@/components/watchlist-view';

export const metadata: Metadata = {
  title: 'Your watchlist',
  robots: { index: false },
};

export default function WatchlistPage() {
  return <WatchlistView />;
}
