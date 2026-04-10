"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Milk, 
  Stethoscope, 
  ShoppingBag, 
  Receipt, 
  PlusCircle,
  Users
} from "lucide-react";
import Navigation from "@/app/components/Navigation";

export default function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("Farmer");

  useEffect(() => {
    const user = localStorage.getItem("currentUserId");
    if (user) setFarmerName(user);
  }, []);

  const cards = [
    { title: "Manage Livestock", desc: "View and add your animals", icon: <PlusCircle />, link: "/admin", color: "bg-green-500" },
    { title: "Milk Production", desc: "Log daily milk yields", icon: <Milk />, link: "/productivity", color: "bg-blue-500" },
    { title: "Health Records", desc: "Track vaccinations & meds", icon: <Stethoscope />, link: "/health", color: "bg-red-500" },
    { title: "Expenses & Profit", desc: "Financial overview", icon: <Receipt />, link: "/expenses", color: "bg-orange-500" },
    { title: "Marketplace", desc: "Sell your livestock", icon: <ShoppingBag />, link: "/shop", color: "bg-purple-500" },
    { title: "Farm Workers", desc: "Manage your team", icon: <Users />, link: "/tracking", color: "bg-teal-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentPage="/dashboard" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl hidden lg:block z-20">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
            <LayoutDashboard /> SmartFarm
          </h2>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {cards.map((card) => (
            <Link key={card.link} href={card.link} className="flex items-center gap-3 p-3 text-gray-600 hover:bg-green-50 hover:text-green-700 rounded-xl transition-all">
              {card.icon} <span className="font-medium">{card.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-64 p-6 md:p-10">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome back, {farmerName}!</h1>
            <p className="text-gray-500">Here's what's happening on your farm today.</p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
            {farmerName[0].toUpperCase()}
          </div>
        </header>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link key={card.title} href={card.link}>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer">
                <div className={`${card.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{card.title}</h3>
                <p className="text-gray-500 mt-1">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
