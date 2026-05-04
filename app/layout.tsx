import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@/components/NavBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Farmer',
  description: 'Universal Livestock Marketplace and Management System',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
