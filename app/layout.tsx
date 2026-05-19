import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@/components/NavBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Epaphroditus Farm',
  description: 'Universal Livestock Marketplace and Management System',
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
        <main className="flex-1 mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="bg-transparent py-4 text-center text-sm text-white/20 drop-shadow-sm">
          Created by Brandon
        </footer>
      </body>
    </html>
  );
}
