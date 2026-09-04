import './globals.css';
import type { Metadata } from 'next';
import { getSiteUrl, isDevelopmentSite } from '@/lib/site';

const isDevelopment = isDevelopmentSite();
const siteUrl = getSiteUrl();
const homeUrl = `${siteUrl}/`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Garden World | Diseño para espacios exteriores',
  description:
    'Diseño, orden y funcionalidad para disfrutar mejor tus jardines y espacios exteriores.',
  alternates: isDevelopment ? undefined : { canonical: '/' },
  robots: {
    index: !isDevelopment,
    follow: !isDevelopment,
  },
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    siteName: 'Garden World',
    url: '/',
    title: 'Garden World | Diseño para espacios exteriores',
    description: 'Diseño, orden y funcionalidad para disfrutar mejor tus espacios exteriores.',
  },
  twitter: {
    card: 'summary',
    title: 'Garden World | Diseño para espacios exteriores',
    description: 'Diseño, orden y funcionalidad para disfrutar mejor tus espacios exteriores.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-VE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  name: 'Garden World',
                  url: homeUrl,
                  inLanguage: 'es-VE',
                  description: 'Diseño, orden y funcionalidad para jardines y espacios exteriores.',
                },
                {
                  '@type': 'Organization',
                  name: 'Garden World',
                  url: homeUrl,
                  logo: `${siteUrl}/images/brand/garden-world-logo-original.png`,
                },
              ],
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
