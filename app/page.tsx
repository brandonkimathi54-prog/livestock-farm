"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EntryGate() {
  const [farmerUsername, setFarmerUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const enterAsClient = () => {
    if (!farmerUsername) return alert("Enter a farmer's username to browse!");
    localStorage.setItem('userRole', 'client');
    localStorage.setItem('targetFarm', farmerUsername);
    router.push('/shop');
  };

  const enterAsFarmer = () => {
    // Replace 'farmer123' with your database validation later
    if (password === 'farmer123') {
      localStorage.setItem('userRole', 'farmer');
      router.push('/admin'); // Redirects to Inventory
    } else {
      alert("Invalid Password");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Smart Farmer Entry</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-xl bg-blue-50">
            <h2 className="font-bold mb-2">Customer / Client</h2>
            <input 
              className="w-full p-2 border rounded mb-2 text-black" 
              placeholder="Enter Farmer Username" 
              onChange={(e) => setFarmerUsername(e.target.value)}
            />
            <button onClick={enterAsClient} className="w-full bg-blue-600 text-white py-2 rounded-lg">Browse Shop</button>
          </div>

          <div className="p-4 border rounded-xl bg-green-50">
            <h2 className="font-bold mb-2">Farmer Login</h2>
            <input 
              type="password"
              className="w-full p-2 border rounded mb-2 text-black" 
              placeholder="Enter Password" 
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={enterAsFarmer} className="w-full bg-green-600 text-white py-2 rounded-lg">Access Management</button>
          </div>
        </div>
      </div>
    </div>
  );
}