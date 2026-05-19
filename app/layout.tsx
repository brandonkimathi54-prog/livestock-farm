import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@/components/NavBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Epaphroditus Farm',
  description: 'Universal Livestock Marketplace and Management System',
  viewport: {
    width: 'device-width',
    initialScale: 1.0,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#047857',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-slate-950 text-white antialiased overflow-x-hidden">
        <NavBar />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
