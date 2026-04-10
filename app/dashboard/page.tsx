"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Stethoscope, TrendingUp, DollarSign, Truck, BarChart3 } from "lucide-react";
import Navigation from "@/app/components/Navigation";
import { supabase } from "@/src/lib/supabase";

const PHOTO_BG_URL = "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80";

export default function DashboardPage() {
  const [totalCows, setTotalCows] = useState(0);
  const [dailyMilk, setDailyMilk] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchQuickStats();
    }
  }, [currentUserId]);

  async function fetchQuickStats() {
    setIsLoading(true);
    try {
      // Get total cows count
      const { data: livestockData, error: livestockError } = await supabase
        .from("livestock")
        .select("id")
        .eq("user_id", currentUserId);

      if (!livestockError) {
        setTotalCows(livestockData?.length || 0);
      }

      // Get today's milk production
      const today = new Date().toISOString().split('T')[0];
      const { data: productionData, error: productionError } = await supabase
        .from("production_logs")
        .select("litres")
        .eq("user_id", currentUserId)
        .eq("date", today);

      if (!productionError) {
        const dailyTotal = (productionData || []).reduce((sum, log) => sum + (log.litres || 0), 0);
        setDailyMilk(dailyTotal);
      }

      // Calculate monthly profit (revenue - expenses)
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [revenueResponse, expensesResponse] = await Promise.all([
        supabase
          .from("production_logs")
          .select("litres")
          .eq("user_id", currentUserId)
          .gte("date", currentMonth),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", currentUserId)
          .gte("date", currentMonth)
      ]);

      if (!revenueResponse.error && !expensesResponse.error) {
        // Calculate monthly revenue (assuming KES 50 per liter)
        const monthlyRevenue = (revenueResponse.data || [])
          .reduce((sum, log) => sum + ((log.litres || 0) * 50), 0);

        const monthlyExpenses = (expensesResponse.data || [])
          .reduce((sum, expense) => sum + (expense.amount || 0), 0);

        setMonthlyProfit(monthlyRevenue - monthlyExpenses);
      }
    } catch (error) {
      console.error("Error fetching quick stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const managementFeatures = [
    {
      title: "Livestock Management",
      description: "Add, edit, and monitor your livestock inventory with detailed health and production records.",
      icon: LayoutDashboard,
      href: "/admin",
    },
    {
      title: "Health Monitoring",
      description: "Track health issues, treatments, and medical expenses for optimal animal care.",
      icon: Stethoscope,
      href: "/health",
    },
    {
      title: "Productivity Tracking",
      description: "Monitor milk production, breeding cycles, and performance metrics.",
      icon: TrendingUp,
      href: "/productivity",
    },
    {
      title: "Financial Management",
      description: "Track expenses, revenue, and profitability with detailed financial reports.",
      icon: DollarSign,
      href: "/expenses",
    },
    {
      title: "Supply Chain",
      description: "Manage feed, equipment, and supply inventory with automated reorder alerts.",
      icon: Truck,
      href: "/tracking",
    },
    {
      title: "Analytics & Trends",
      description: "View comprehensive analytics, trends, and predictive insights for data-driven decisions.",
      icon: BarChart3,
      href: "/trends",
    },
  ];

  const quickStats = [
    {
      title: "Total Cows",
      value: isLoading ? "..." : totalCows.toString(),
      icon: LayoutDashboard,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Daily Milk",
      value: isLoading ? "..." : `${dailyMilk}L`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Monthly Profit",
      value: isLoading ? "..." : `KSh ${monthlyProfit.toLocaleString()}`,
      icon: DollarSign,
      color: monthlyProfit >= 0 ? "text-green-600" : "text-red-600",
      bgColor: monthlyProfit >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "Health Status",
      value: "Healthy",
      icon: Stethoscope,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <>
      <Navigation currentPage="/dashboard" />
      <div className="relative min-h-screen">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: `url('${PHOTO_BG_URL}')` }}
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
        
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
          {/* Header */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-green-900 mb-4">
              Management Dashboard
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-600">
              Comprehensive farm management hub. Access all your livestock management tools from one centralized location.
            </p>
          </section>

          {/* Management Features Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
            {managementFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/70"
              >
                <div className="flex flex-col items-center space-y-6">
                  <div className="bg-green-600/10 rounded-2xl p-4 group-hover:bg-green-600/20 transition-colors">
                    <feature.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-bold text-green-900 group-hover:text-green-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 group-hover:text-gray-500 transition-colors leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <Link
                    href={feature.href}
                    className="inline-flex items-center justify-center w-full gap-2 rounded-xl bg-green-600 px-6 py-4 h-12 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
                  >
                    Access →
                  </Link>
                </div>
              </div>
            ))}
          </section>

          {/* Quick Stats */}
          <section className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
            <h2 className="mb-8 text-2xl font-bold text-green-900 text-center">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickStats.map((stat) => (
                <div key={stat.title} className={`${stat.bgColor} rounded-2xl p-6 border border-white/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-green-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} rounded-2xl p-3`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
