"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";
import { Plus, Search, Tag, Activity, Trash2, Edit } from "lucide-react";

interface Livestock {
  id: number;
  name: string;
  breed: string;
  age: number;
  farmer_username: string;
  created_at: string;
}

export default function LivestockPage() {
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Livestock | null>(null);
  const [currentFarmer, setCurrentFarmer] = useState("");

  // Form states
  const [animalName, setAnimalName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("currentSessionUser");
      if (user) {
        setCurrentFarmer(user);
        fetchMyData();
      }
    }
  }, []);

  const fetchMyData = async () => {
    const currentFarmer = localStorage.getItem("currentSessionUser");
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('livestock')
        .select('*')
        .eq('farmer_username', currentFarmer) // Only pulls data for THIS farmer
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching livestock:', error);
      } else {
        setLivestock(data || []);
      }
      // If a new farmer signs up, currentFarmer will find 0 rows, giving them an empty workspace!
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!animalName || !breed || !age) {
      alert("Please fill in all fields");
      return;
    }

    const currentFarmer = localStorage.getItem("currentSessionUser"); // Get logged-in name

    const { error } = await supabase
      .from('livestock')
      .insert([{ 
        name: animalName, 
        breed: breed,
        age: parseInt(age),
        farmer_username: currentFarmer // This "locks" the data to this farmer
      }]);

    if (error) {
      console.error('Error adding livestock:', error);
      alert('Error adding livestock');
    } else {
      // Clear form
      setAnimalName("");
      setBreed("");
      setAge("");
      setShowAddForm(false);
      
      // Refresh list
      fetchMyData();
    }
  };

  const handleDeleteLivestock = async (id: number) => {
    if (!confirm('Are you sure you want to delete this animal?')) return;

    try {
      const { error } = await supabase
        .from('livestock')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting livestock:', error);
      } else {
        // Refresh list
        fetchMyData();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

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
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus size={20} /> Add Animal
            </button>
          </header>

          {/* Add Animal Form */}
          {showAddForm && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Animal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Animal Name"
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold transition-all"
                >
                  Save Animal
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Livestock Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-pulse">
                <div className="w-full h-48 bg-gray-100 rounded-2xl mb-4"></div>
                <div className="h-6 bg-gray-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {livestock.map((animal) => (
                <div key={animal.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                  <div className="w-full h-48 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center">
                    <Activity className="text-gray-400" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{animal.name}</h3>
                  <p className="text-gray-600 mb-1">Breed: {animal.breed}</p>
                  <p className="text-gray-600 mb-4">Age: {animal.age} years</p>
                  <div className="flex gap-2">
                    <button className="p-2 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200">
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteLivestock(animal.id)}
                      className="p-2 bg-red-100 rounded-lg text-red-600 hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && livestock.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No animals found. Add your first animal to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
