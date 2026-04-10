"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntryPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleAuth = () => {
    if (!username || !password) return alert("Please fill in all fields");

    if (isSignUp) {
      localStorage.setItem("savedUsername", username);
      localStorage.setItem("savedPassword", password);
      alert("Farm registered successfully! Please log in.");
      setIsSignUp(false);
    } else {
      const storedUser = localStorage.getItem("savedUsername");
      const storedPass = localStorage.getItem("savedPassword");

      if (username === storedUser && password === storedPass) {
        localStorage.setItem("currentSessionUser", username); 
        router.push("/dashboard");
      } else {
        alert("Invalid username or password.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-4" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80')" }}>
      
      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/40">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8 tracking-tight">Smart Farmer Entry</h1>

        {!isSignUp && (
          <div className="space-y-4 mb-8">
            <input
              type="text"
              placeholder="Enter Farmer Username"
              /* text-gray-900 makes the typing font dark and readable */
              className="w-full h-14 px-5 rounded-2xl border border-gray-300 bg-white/70 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button className="w-full h-14 bg-[#0085FF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all">
              Browse Shop
            </button>
          </div>
        )}

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm font-medium">
            {isSignUp ? "Register Farm" : "Farmer Login"}
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            /* text-gray-900 added here for high contrast */
            className="w-full h-14 px-5 rounded-2xl border border-gray-300 bg-white/70 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            /* text-gray-900 added here for high contrast */
            className="w-full h-14 px-5 rounded-2xl border border-gray-300 bg-white/70 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
          <button 
            onClick={handleAuth}
            className="w-full h-14 bg-[#2E7D32] hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transition-all"
          >
            {isSignUp ? "Sign Up & Register" : "Access Management"}
          </button>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-green-800 font-bold hover:underline mt-2"
          >
            {isSignUp ? "Already have a farm? Log in" : "New farmer? Register your farm here"}
          </button>
        </div>
      </div>
    </div>
  );
}