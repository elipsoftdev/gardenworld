import './globals.css';
import type { Metadata } from 'next';

const siteUrl = 'https://gardenworld.online';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Garden World | Bases para mangueras y diseño para tu jardín',
  description:
    'Bases para mangueras Garden World diseñadas para mantener tu jardín ordenado e integrar funcionalidad y diseño en tus espacios exteriores.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    siteName: 'Garden World',
    url: '/',
    title: 'Garden World | Bases para mangueras y diseño para tu jardín',
    description:
      'Bases para mangueras Garden World para ordenar y disfrutar mejor tu jardín.',
  },
  twitter: {
    card: 'summary',
    title: 'Garden World | Bases para mangueras y diseño para tu jardín',
    description:
      'Bases para mangueras Garden World para ordenar y disfrutar mejor tu jardín.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
              '@type': 'WebSite',
              name: 'Garden World',
              url: siteUrl,
              inLanguage: 'es-VE',
              description: 'Bases para mangueras Garden World para espacios exteriores.',
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
