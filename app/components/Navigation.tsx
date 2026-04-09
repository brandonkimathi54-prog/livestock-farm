"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LayoutDashboard, ShoppingCart, TrendingUp, DollarSign, Truck, BarChart3, Stethoscope, LogOut, Menu, X } from "lucide-react";

interface NavigationProps {
  currentPage?: string;
  showBackButton?: boolean;
  onLogout?: () => void;
}

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Marketplace", href: "/shop", icon: ShoppingCart },
  { name: "Livestock", href: "/admin", icon: LayoutDashboard },
  { name: "Health", href: "/health", icon: Stethoscope },
  { name: "Productivity", href: "/productivity", icon: TrendingUp },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Tracking", href: "/tracking", icon: Truck },
  { name: "Trends", href: "/trends", icon: BarChart3 },
];

export default function Navigation({ currentPage, showBackButton = false, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    if (onLogout) {
      onLogout();
    } else {
      router.push("/");
    }
  };

  const handleNavigation = (href: string) => {
    setIsMobileMenuOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Desktop Top Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-lg border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-green-900">Smart Farmer</h1>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-1">
              {navigationItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.href || 
                               (currentPage?.includes(item.href) && item.href !== "/");
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-green-600 text-white"
                        : "text-green-900 hover:bg-green-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-green-900 hover:bg-green-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-lg border-b border-white/40 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {showBackButton ? (
            <button
              onClick={() => router.back()}
              className="p-2 text-green-900 hover:bg-green-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-green-900 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div className="text-center">
            <h1 className="text-lg font-bold text-green-900">Smart Farmer</h1>
          </div>
          
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed right-0 top-0 h-full w-80 bg-white/95 backdrop-blur-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/40">
              <div>
                <h2 className="text-xl font-bold text-green-900">Smart Farmer</h2>
                <p className="text-sm text-green-700">Menu</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-green-900 hover:bg-green-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.href || 
                               (currentPage?.includes(item.href) && item.href !== "/");
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-green-600 text-white"
                        : "text-green-900 hover:bg-green-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
              
              <div className="pt-4 border-t border-white/40">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-green-900 hover:bg-green-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/60 backdrop-blur-lg border border-white/40 rounded-2xl shadow-lg">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { name: "Home", href: "/", icon: Home },
            { name: "Market", href: "/shop", icon: ShoppingCart },
            { name: "Livestock", href: "/admin", icon: LayoutDashboard },
            { name: "Health", href: "/health", icon: Stethoscope },
            { name: "More", href: "/dashboard", icon: Menu },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.href || 
                           (currentPage?.includes(item.href) && item.href !== "/");
            
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isActive
                    ? "text-green-600"
                    : "text-green-900 hover:bg-green-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
