import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Garden World | Productos, plantas y paisajismo',
  description:
    'Productos, plantas y servicios de paisajismo para crear y vivir mejores espacios exteriores.',
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    siteName: 'Garden World',
    title: 'Garden World | Productos, plantas y paisajismo',
    description:
      'Objetos, vegetación y diseño para convertir el exterior en parte de la vida cotidiana.',
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
