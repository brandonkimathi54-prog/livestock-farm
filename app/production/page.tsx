"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";
import { Milk, TrendingUp, Calendar, Trash2 } from "lucide-react";

interface ProductionLog {
  id: number;
  animal_name: string;
  milk_kgs: number;
  farmer_username: string;
  created_at: string;
}

export default function ProductionPage() {
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFarmer, setCurrentFarmer] = useState("");

  // Form states
  const [animalName, setAnimalName] = useState("");
  const [milkAmount, setMilkAmount] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("currentSessionUser");
      if (user) {
        setCurrentFarmer(user);
        fetchProductionData();
      }
    }
  }, []);

  const fetchProductionData = async () => {
    const currentFarmer = localStorage.getItem("currentSessionUser");
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('production')
        .select('*')
        .eq('farmer_username', currentFarmer) // This filters out everyone else's data
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching production data:', error);
      } else {
        setProductionLogs(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduction = async () => {
    if (!animalName || !milkAmount) {
      alert("Please fill in all fields");
      return;
    }

    const currentFarmer = localStorage.getItem("currentSessionUser");

    const { error } = await supabase
      .from('production')
      .insert([
        { 
          animal_name: animalName, 
          milk_kgs: parseFloat(milkAmount),
          farmer_username: currentFarmer // This tags the data to ONLY this user
        }
      ]);

    if (error) {
      console.error('Error saving production log:', error);
      alert('Error saving production log');
    } else {
      // Clear form
      setAnimalName("");
      setMilkAmount("");
      
      // Refresh list
      fetchProductionData();
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Are you sure you want to delete this production log?')) return;

    try {
      const { error } = await supabase
        .from('production')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting production log:', error);
      } else {
        // Refresh list
        fetchProductionData();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navigation currentPage="/production" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      <main className="flex-grow lg:ml-64 p-6 pt-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <Milk className="text-blue-500" /> Milk Production Logs
          </h1>
          
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl border border-white mb-8">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProduction(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Animal Name</label>
                  <input 
                    type="text" 
                    value={animalName}
                    onChange={(e) => setAnimalName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="e.g. Mercy" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Milk Amount (Kgs)</label>
                  <input 
                    type="number" 
                    value={milkAmount}
                    onChange={(e) => setMilkAmount(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700"
              >
                Save Daily Log
              </button>
            </form>
          </div>

          {/* Production History */}
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl border border-white">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Production History</h2>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading production data...</p>
              </div>
            ) : productionLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No production logs found. Start by adding your first milk production record!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productionLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-4 bg-white/50 rounded-2xl border border-white/20">
                    <div>
                      <p className="font-bold text-gray-800">{log.animal_name}</p>
                      <p className="text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-blue-600">{log.milk_kgs} kgs</p>
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-2 bg-red-100 rounded-lg text-red-600 hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
