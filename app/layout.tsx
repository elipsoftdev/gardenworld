import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Garden World | Tu jardín. Tu diseño.',
  description:
    'Productos, plantas y paisajismo para ordenar, simplificar y transformar tus espacios exteriores.',
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    siteName: 'Garden World',
    title: 'Garden World | Tu jardín. Tu diseño.',
    description:
      'Diseño, orden y naturaleza para vivir mejor tus espacios exteriores.',
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
      </head>
      <body>{children}</body>
    </html>
  );
}
