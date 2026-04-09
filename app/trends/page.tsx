"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";
import Navigation from "@/app/components/Navigation";

interface ProductionData {
  date: string;
  totalMilkKg: number;
  status?: string;
}

interface DailyProduction {
  date: string;
  totalMilkKg: number;
}

export default function ProductionTrendsPage() {
  const [chartData, setChartData] = useState<ProductionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchProductionTrends();
    } else {
      setIsLoading(false);
    }
  }, [currentUserId]);

  async function fetchProductionTrends() {
    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      return;
    }
    setIsLoading(true);
    try {
      const { data: productionData, error: fetchError } = await supabase
        .from("production_logs")
        .select("milk_kg, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("Error fetching production data:", fetchError);
        setError("Failed to load production trends");
        setIsLoading(false);
        return;
      }

      const { data: livestockData, error: livestockError } = await supabase
        .from("livestock")
        .select("id, health_status")
        .eq("user_id", currentUserId);

      if (livestockError) {
        console.error("Error fetching livestock data:", livestockError);
      }

      // Group production data by date
      const groupedByDate: Record<string, DailyProduction> = {};

      (productionData || []).forEach((log: any) => {
        const date = new Date(log.created_at).toISOString().split("T")[0];
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, totalMilkKg: 0 };
        }
        groupedByDate[date].totalMilkKg += log.milk_kg || 0;
      });

      // Convert to array and check for dry/expecting periods
      const trendData: ProductionData[] = Object.values(groupedByDate).map((item) => {
        // Check if any livestock are in dry/expecting status
        const hasDryOrExpecting = (livestockData || []).some(
          (livestock: any) =>
            livestock.health_status &&
            (livestock.health_status.toLowerCase().includes("dry") ||
              livestock.health_status.toLowerCase().includes("expecting"))
        );

        return {
          date: item.date,
          totalMilkKg: item.totalMilkKg,
          status: hasDryOrExpecting ? "Dry/Expecting" : undefined,
        };
      });

      setChartData(trendData);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Navigation currentPage="/trends" />
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Production Trends</h1>
              <div className="text-center text-lg text-gray-600">Loading trends data...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/trends" />
      <div className="relative min-h-screen">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
        
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
          <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Production Trends</h1>
          <Link
            href="/"
            className="bg-green-600 hover:bg-green-700 text-black px-4 py-2 rounded transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

            </div>

            {error && (
              <div className="bg-red-900 border border-red-400 text-red-400 px-4 py-3 rounded mb-8">
                {error}
              </div>
            )}

            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-6 text-gray-700">Daily Milk Production</h2>

              {chartData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No production data available.</p>
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6B7280"
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis 
                        stroke="#6B7280"
                        tick={{ fill: "#6B7280" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#FFFFFF", 
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px"
                        }}
                        labelStyle={{ color: "#111827" }}
                        itemStyle={{ color: "#111827" }}
                      />
                      <Legend 
                        wrapperStyle={{ color: "#6B7280" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalMilkKg" 
                        stroke="#059669" 
                        strokeWidth={2}
                        dot={{ fill: "#059669", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {chartData.map((point, index) => {
                        if (point.status === "Dry/Expecting" && point.totalMilkKg === 0) {
                          return (
                            <ReferenceDot
                              key={`dry-${index}`}
                              x={point.date}
                              y={0}
                              r={5}
                              fill="#ef4444"
                              stroke="#dc2626"
                            />
                          );
                        }
                        return null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200/30">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-gray-600">Daily Production (kg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Dry/Expecting period (0 production)</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Production</h3>
                <p className="text-3xl font-bold text-green-900">
                  {chartData.reduce((sum, d) => sum + d.totalMilkKg, 0).toFixed(2)} kg
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Average Daily</h3>
                <p className="text-3xl font-bold text-green-900">
                  {(chartData.reduce((sum, d) => sum + d.totalMilkKg, 0) / (chartData.length || 1)).toFixed(2)} kg
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Peak Production</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {Math.max(...chartData.map((d) => d.totalMilkKg), 0).toFixed(2)} kg
                </p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
}
