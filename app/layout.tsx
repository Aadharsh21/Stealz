import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { LocationProvider } from '@/components/location-provider';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
});

function siteUrl(): URL {
  const raw =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  try {
    return new URL(raw);
  } catch {
    return new URL('http://localhost:3000');
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${BRAND.name}: compare prices on bags, shoes and clothes`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.description,
  },
  twitter: { card: 'summary', title: `${BRAND.name}: ${BRAND.tagline}`, description: BRAND.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#151a30' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-dvh">
        <LocationProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-lg bg-sticker px-4 py-2 font-semibold text-sticker-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </LocationProvider>
      </body>
    </html>
  );
}
