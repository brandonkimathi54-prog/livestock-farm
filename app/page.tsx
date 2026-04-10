"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntryPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    // Standardizing to use the password established during sign-up
    if (password) {
      router.push("/dashboard"); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-4" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80')" }}>
      
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/40">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8 tracking-tight">Smart Farmer Entry</h1>

        {/* Client / Shop Section */}
        <div className="space-y-4 mb-8">
          <input
            type="text"
            placeholder="Enter Farmer Username"
            className="w-full h-14 px-5 rounded-2xl border border-gray-200 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button className="w-full h-14 bg-[#0085FF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]">
            Browse Shop
          </button>
        </div>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm font-medium">Farmer Login</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Farmer Management Section */}
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-14 px-5 rounded-2xl border border-gray-200 bg-white/50 focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
          <button 
            onClick={handleLogin}
            className="w-full h-14 bg-[#2E7D32] hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
          >
            Access Management
          </button>
        </div>
      </div>
    </div>
  );
}