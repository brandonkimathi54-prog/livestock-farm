"use client";

import { useEffect, useState } from "react";
import Navigation from "@/app/components/Navigation";
import { Users, UserPlus } from "lucide-react";

export default function WorkersPage() {
  const [displayName, setDisplayName] = useState("Farmer");

  useEffect(() => {
    // Get the username/email instead of the long ID number
    const userEmail = localStorage.getItem("userEmail"); 
    if (userEmail) {
      // Takes the part before the @ in the email for a clean welcome
      setDisplayName(userEmail.split('@')[0]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-cover bg-fixed bg-center" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80')" }}>
      
      <Navigation currentPage="/workers" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      
      <main className="p-6 lg:ml-64 pt-24">
        <div className="max-w-5xl mx-auto">
          
          {/* Welcome Header */}
          <div className="mb-8 px-4">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">
              Welcome, {displayName}
            </h1>
          </div>

          {/* New Worker Form - Restored to White/Frosted Glass */}
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/40 mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="text-teal-600" /> Register New Staff
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Worker Name</label>
                <input type="text" className="w-full h-12 px-4 rounded-xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. John" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Role</label>
                <input type="text" className="w-full h-12 px-4 rounded-xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Milker" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Contact</label>
                <input type="text" className="w-full h-12 px-4 rounded-xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-teal-500" placeholder="Phone number" />
              </div>
            </div>
            <button className="w-full mt-8 h-14 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">
              Save Worker Record
            </button>
          </div>

          {/* Staff List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 p-6 rounded-3xl shadow-sm flex items-center justify-between border border-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-700 font-bold text-xl">
                  J
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">John Doe</h4>
                  <p className="text-sm text-gray-500">Head Groomer</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                  <Phone size={18} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
