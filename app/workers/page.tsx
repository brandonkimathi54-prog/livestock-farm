"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";
import { Users, UserPlus, Phone, Mail, Trash2, Edit } from "lucide-react";

interface Worker {
  id: number;
  name: string;
  role: string;
  contact: string;
  farmer_username: string;
  created_at: string;
}

export default function WorkersPage() {
  const [displayName, setDisplayName] = useState("Farmer");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [workerName, setWorkerName] = useState("");
  const [role, setRole] = useState("");
  const [contact, setContact] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // We now pull the specific username saved during login
      const user = localStorage.getItem("currentSessionUser"); 
      if (user) {
        setDisplayName(user);
        fetchWorkersData();
      } else {
        setDisplayName("Farmer");
      }
    }
  }, []);

  const fetchWorkersData = async () => {
    const currentFarmer = localStorage.getItem("currentSessionUser");
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('farmer_username', currentFarmer) // This filters out everyone else's data
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workers data:', error);
      } else {
        setWorkers(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorker = async () => {
    if (!workerName || !role || !contact) {
      alert("Please fill in all fields");
      return;
    }

    const currentFarmer = localStorage.getItem("currentSessionUser");

    const { error } = await supabase
      .from('workers')
      .insert([
        { 
          name: workerName, 
          role: role,
          contact: contact,
          farmer_username: currentFarmer // This tags the data to ONLY this user
        }
      ]);

    if (error) {
      console.error('Error saving worker:', error);
      alert('Error saving worker');
    } else {
      // Clear form
      setWorkerName("");
      setRole("");
      setContact("");
      setShowAddForm(false);
      
      // Refresh list
      fetchWorkersData();
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting worker:', error);
      } else {
        // Refresh list
        fetchWorkersData();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

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

          {/* Add Worker Button */}
          <div className="mb-6">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <UserPlus size={20} /> Add Staff
            </button>
          </div>

          {/* Add Worker Form */}
          {showAddForm && (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/40 mb-10">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-teal-600" /> Register New Staff
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Worker Name</label>
                  <input 
                    type="text" 
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/70 text-gray-900 border border-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" 
                    placeholder="e.g. John" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Role</label>
                  <input 
                    type="text" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/70 text-gray-900 border border-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" 
                    placeholder="e.g. Milker" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Contact</label>
                  <input 
                    type="text" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/70 text-gray-900 border border-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500" 
                    placeholder="Phone number" 
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={handleSaveWorker}
                  className="flex-1 h-14 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  Save Worker Record
                </button>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 h-14 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Workers List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="bg-white/90 p-6 rounded-3xl flex items-center justify-between border border-white shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ) : workers.length === 0 ? (
              <div className="bg-white/90 p-6 rounded-3xl flex items-center justify-between border border-white shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-700 font-bold">W</div>
                  <div>
                    <p className="font-bold text-gray-800">Worker List</p>
                    <p className="text-xs text-gray-500">No records found yet</p>
                  </div>
                </div>
                <Phone className="text-gray-300" size={20} />
              </div>
            ) : (
              workers.map((worker) => (
                <div key={worker.id} className="bg-white/90 p-6 rounded-3xl flex items-center justify-between border border-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-700 font-bold">
                      {worker.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{worker.name}</p>
                      <p className="text-sm text-gray-500">{worker.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteWorker(worker.id)}
                      className="p-2 bg-red-100 rounded-lg text-red-600 hover:bg-red-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
