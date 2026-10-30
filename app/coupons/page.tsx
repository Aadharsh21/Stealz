import type { Metadata } from 'next';
import { CouponsView } from '@/components/coupons-view';

export const metadata: Metadata = {
  title: 'Coupons and offers',
  description: 'Promo codes stores publish on Google Shopping, which stores have sales on, and more stores to check in the US, UK, UAE and India.',
};

export default function CouponsPage() {
  return <CouponsView />;
}
