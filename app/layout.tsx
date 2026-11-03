import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import localFont from 'next/font/local';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { DemoDataToggle } from '@/components/demo-data-toggle';
import { LocationProvider } from '@/components/location-provider';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

// Inter is the stand-in for SF Pro on devices that don't have it (Windows, Android, Linux).
// Apple devices use their own system font first, so they never download it. It's a variable
// font with optical sizes, split by alphabet so most visitors only load the Latin file.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  declarations: [
    { prop: 'font-family', value: 'inter' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});

// Accented letters and the rupee sign, loaded only on pages that use them.
const interExtended = localFont({
  src: './fonts/inter-latin-ext.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
  variable: '--font-inter-ext',
  declarations: [
    { prop: 'font-family', value: 'inter' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
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
  width: 'device-width',
  initialScale: 1,
  // Paint edge to edge under the notch; the header and sheets pad themselves back in.
  viewportFit: 'cover',
  // The Android keyboard shrinks the layout like iOS does, so fields stay in view.
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${interExtended.variable}`}>
      <body className="min-h-dvh">
        <LocationProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-full bg-sticker px-4 py-2 font-semibold text-sticker-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          {process.env.NODE_ENV === 'development' && <DemoDataToggle />}
        </LocationProvider>
        <Analytics />
      </body>
    </html>
  );
}
