"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";
import { Plus, Search, Tag, Activity } from "lucide-react";

export default function LivestockPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navigation currentPage="/animals" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      <main className="flex-grow lg:ml-64 p-6 pt-24">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Livestock</h1>
              <p className="text-gray-500">Track and manage your farm animals</p>
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <Plus size={20} /> Add Animal
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* The beautiful cards you had go here - linked to Supabase */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-pulse">
              <div className="w-full h-48 bg-gray-100 rounded-2xl mb-4"></div>
              <div className="h-6 bg-gray-100 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
