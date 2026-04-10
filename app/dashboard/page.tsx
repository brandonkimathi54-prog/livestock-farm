"use client";

import Link from "next/link";
import { Home, Lock } from "lucide-react";

export default function DashboardHub() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 bg-cover bg-center"
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80')" }}>
      
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-center text-gray-600 font-medium mb-4">Smart Farmer platform</h2>

        {/* Farmer Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 shadow-xl border border-white/20 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home className="text-green-600 w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Farmer</h3>
          <p className="text-gray-500 mb-6">Manage your farm and livestock</p>
          <Link href="/management" className="inline-flex items-center text-green-600 font-bold text-lg hover:gap-2 transition-all">
            Access Dashboard <span className="ml-2">?</span>
          </Link>
        </div>

        {/* Client Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 shadow-xl border border-white/20 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600 w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Client</h3>
          <p className="text-gray-500 mb-6">Browse specific farmer's marketplace</p>
          <Link href="/shop" className="inline-flex items-center text-green-600 font-bold text-lg hover:gap-2 transition-all">
            Enter Farmer Marketplace <span className="ml-2">?</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
