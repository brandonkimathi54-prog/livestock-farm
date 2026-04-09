"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";
import { Wallet, TrendingUp, DollarSign, ArrowDown, ArrowUp } from "lucide-react";

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  monthly_revenue: number;
  monthly_expenses: number;
}

export default function FinancePage() {
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFinancialData();
    }
  }, [currentUserId]);

  async function fetchFinancialData() {
    setIsLoading(true);
    try {
      // Get current month's revenue and expenses
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const [revenueResponse, expensesResponse] = await Promise.all([
        supabase
          .from("production_logs")
          .select("milk_liters")
          .eq("user_id", currentUserId)
          .gte("date", currentMonth)
          .order("date", { ascending: false }),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", currentUserId)
          .gte("date", currentMonth)
          .order("date", { ascending: false })
      ]);

      // Calculate monthly revenue (assuming KES 50 per liter)
      const monthlyRevenue = (revenueResponse.data || [])
        .reduce((sum, log) => sum + (log.milk_liters * 50), 0);

      const monthlyExpenses = (expensesResponse.data || [])
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Get all-time totals
      const [allTimeRevenue, allTimeExpenses] = await Promise.all([
        supabase
          .from("production_logs")
          .select("milk_liters")
          .eq("user_id", currentUserId)
          .order("date", { ascending: false }),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", currentUserId)
          .order("date", { ascending: false })
      ]);

      const totalRevenue = (allTimeRevenue.data || [])
        .reduce((sum, log) => sum + (log.milk_liters * 50), 0);

      const totalExpenses = (allTimeExpenses.data || [])
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      setFinancialData({
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
        monthly_revenue: monthlyRevenue,
        monthly_expenses: monthlyExpenses
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (isLoading) {
    return (
      <>
        <Navigation currentPage="/finance" />
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Finance Dashboard</h1>
              <div className="text-center text-lg text-gray-600">Loading financial data...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/finance" />
      <div className="relative min-h-screen">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
        
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-green-900 mb-4">
              Finance Dashboard
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Track your farm's financial performance
            </p>
          </div>

          {financialData && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Total Revenue */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600/10 rounded-xl p-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Total Revenue</h3>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {formatCurrency(financialData.total_revenue)}
                </p>
              </div>

              {/* Total Expenses */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600/10 rounded-xl p-3">
                      <ArrowDown className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Total Expenses</h3>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(financialData.total_expenses)}
                </p>
              </div>

              {/* Net Profit */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600/10 rounded-xl p-3">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Net Profit</h3>
                  </div>
                </div>
                <p className={`text-3xl font-bold ${financialData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialData.net_profit)}
                </p>
              </div>

              {/* Profit Margin */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-600/10 rounded-xl p-3">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Profit Margin</h3>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {financialData.total_revenue > 0 
                    ? `${((financialData.net_profit / financialData.total_revenue) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
            </div>

            // Monthly Performance
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Monthly Revenue */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">This Month's Revenue</h3>
                <div className="flex items-center gap-3">
                  <ArrowUp className="w-5 h-5 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.monthly_revenue)}
                  </p>
                </div>
              </div>

              {/* Monthly Expenses */}
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">This Month's Expenses</h3>
                <div className="flex items-center gap-3">
                  <ArrowDown className="w-5 h-5 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialData.monthly_expenses)}
                  </p>
                </div>
              </div>
            </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
