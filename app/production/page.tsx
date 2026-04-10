"use client";

import { useState } from "react";
import Navigation from "@/app/components/Navigation";
import { Milk, TrendingUp, Calendar } from "lucide-react";

export default function ProductionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navigation currentPage="/production" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      <main className="flex-grow lg:ml-64 p-6 pt-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <Milk className="text-blue-500" /> Milk Production Logs
          </h1>
          
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl border border-white">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Select Animal</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Mercy</option>
                    <option>Kairo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Milk Amount (Kgs)</label>
                  <input type="number" className="w-full h-12 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
              </div>
              <button className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700">
                Save Daily Log
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
