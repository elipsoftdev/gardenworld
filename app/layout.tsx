import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GardenWorld | Roll up — soportes de manguera en metal',
  description:
    'Roll up: soporte de manguera en acero, en 5 acabados. Más insumos de jardinería seleccionados uno por uno. Venezuela y LATAM.',
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    siteName: 'GardenWorld',
    title: 'GardenWorld | Roll up — soportes de manguera en metal',
    description:
      'Soportes de manguera en acero inoxidable y aluminio, en 5 acabados. Insumos de jardinería seleccionados. Venezuela y LATAM.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..700&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
