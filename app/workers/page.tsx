"use client";

import Navigation from "@/app/components/Navigation";
import { Users, UserPlus, Phone, ShieldCheck } from "lucide-react";

export default function WorkersPage() {
  return (
    <div className="min-h-screen bg-cover bg-fixed bg-center" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80')" }}>
      
      <Navigation currentPage="/workers" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      
      <main className="p-6 lg:ml-64 pt-24">
        <div className="max-w-5xl mx-auto">
          
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl border border-white/20 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <Users className="text-teal-600" /> Farm Workers
                </h1>
                <p className="text-gray-600 mt-1">Manage your team and assignments</p>
              </div>
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
                <UserPlus size={20} /> Add Staff
              </button>
            </div>
          </div>

          {/* New Worker Form (Frosted Glass) */}
          <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/30 mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Register New Staff</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="text" placeholder="Worker Name" className="h-12 px-4 rounded-xl bg-white/60 border border-white/40 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="text" placeholder="Role (e.g. Milker)" className="h-12 px-4 rounded-xl bg-white/60 border border-white/40 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="text" placeholder="Phone Number" className="h-12 px-4 rounded-xl bg-white/60 border border-white/40 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <button className="w-full mt-6 h-14 bg-teal-600 text-white font-bold rounded-2xl shadow-lg hover:bg-teal-700 transition-all">
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
