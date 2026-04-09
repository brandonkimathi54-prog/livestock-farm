import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/app/components/Footer";
import Navigation from "@/app/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. This is "Pro-Tip" fix: It prevents phone from shrinking site
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1A6650",
};

// 2. Updated Metadata for your specific project
export const metadata: Metadata = {
  title: "Smart Farmer",
  description: "Professional Livestock and Farm Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Farmer",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Smart Farmer",
    description: "Professional Livestock and Farm Management System",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: "/icon-192x192.svg",
    apple: {
      url: "/icon-192x192.svg",
      sizes: "192x192",
    },
  },
};

// Base background component for consistent styling
interface BackgroundWrapperProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

function BackgroundWrapper({ children, showNavigation = false }: BackgroundWrapperProps) {
  return (
    <div className="relative min-h-screen standalone-mode">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')",
          zIndex: -1
        }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 bg-white/40" style={{ zIndex: -1 }} />
      
      {/* Navigation */}
      {showNavigation && <Navigation />}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gradient-to-br from-green-50/50 to-emerald-50/30">
        <BackgroundWrapper showNavigation={false}>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </BackgroundWrapper>
      </body>
    </html>
  );
}