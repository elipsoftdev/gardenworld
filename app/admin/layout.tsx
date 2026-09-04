import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'Administración | Garden World',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
