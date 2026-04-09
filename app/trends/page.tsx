"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";

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
      <div className="min-h-screen bg-black text-green-400 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Production Trends</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
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

        {error && (
          <div className="bg-red-900 border border-red-400 text-red-400 px-4 py-3 rounded mb-8">
            {error}
          </div>
        )}

        <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
          <h2 className="text-xl font-semibold mb-6">Daily Milk Production</h2>

          {chartData.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No production data available.</p>
          ) : (
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#888"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Milk (kg)", angle: -90, position: "insideLeft", style: { fill: "#888" } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #10b981",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                    labelStyle={{ color: "#10b981" }}
                    formatter={(value: any) => [
                      `${(value as number).toFixed(2)} kg`,
                      "Milk Production",
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line
                    type="monotone"
                    dataKey="totalMilkKg"
                    stroke="#06b6d4"
                    dot={{ fill: "#06b6d4", r: 4 }}
                    activeDot={{ r: 6 }}
                    strokeWidth={2}
                    name="Daily Production"
                    isAnimationActive={true}
                  />

                  {/* Mark dry/expecting periods */}
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

          <div className="mt-8 pt-6 border-t border-green-400/30">
            <h3 className="text-sm font-semibold text-green-300 mb-3">Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-cyan-500"></div>
                <span>Daily milk production (kg)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Dry/Expecting period (0 production)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-cyan-400">
            <h3 className="text-sm font-semibold text-cyan-300 mb-2">Total Production</h3>
            <p className="text-3xl font-bold text-cyan-400">
              {chartData.reduce((sum, d) => sum + d.totalMilkKg, 0).toFixed(2)} kg
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
            <h3 className="text-sm font-semibold text-green-300 mb-2">Average Daily</h3>
            <p className="text-3xl font-bold text-green-400">
              {(chartData.reduce((sum, d) => sum + d.totalMilkKg, 0) / (chartData.length || 1)).toFixed(2)} kg
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-purple-400">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Peak Production</h3>
            <p className="text-3xl font-bold text-purple-400">
              {Math.max(...chartData.map((d) => d.totalMilkKg), 0).toFixed(2)} kg
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
