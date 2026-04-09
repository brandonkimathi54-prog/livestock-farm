"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/app/components/Navigation";
import { TrendingUp, Calendar, Milk } from "lucide-react";

interface Livestock {
  id: string;
  name: string;
}

interface ProductionLog {
  id: number;
  livestock_id: string;
  litres: number;
  milk_kg: number;
  created_at: string;
  livestock: { name: string } | null;
}

interface MonthlySummary {
  total_litres: number;
  total_milk_kg: number;
}

export default function ProductivityPage() {
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [selectedLivestockId, setSelectedLivestockId] = useState("");
  const [litres, setLitres] = useState("");
  const [milkKg, setMilkKg] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({ total_litres: 0, total_milk_kg: 0 });
  const [ledger, setLedger] = useState<ProductionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchData();
    }
  }, [currentUserId]);

  async function fetchData() {
    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      return;
    }
    setIsLoading(true);
    try {
      // Fetch livestock for dropdown
      const { data: livestockData, error: livestockError } = await supabase
        .from("livestock")
        .select("id, name")
        .eq("user_id", currentUserId)
        .order("name");

      if (livestockError) {
        console.error("Error fetching livestock:", livestockError);
        setError("Failed to load livestock data");
        return;
      }

      setLivestock(livestockData || []);

      // Fetch monthly summary
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: summaryData, error: summaryError } = await supabase
        .from("production_logs")
        .select("litres, milk_kg")
        .eq("user_id", currentUserId)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      if (summaryError) {
        console.error("Error fetching monthly summary:", summaryError);
      } else {
        const totalLitres = summaryData?.reduce((sum, log) => sum + log.litres, 0) || 0;
        const totalMilkKg = summaryData?.reduce((sum, log) => sum + log.milk_kg, 0) || 0;
        setMonthlySummary({ total_litres: totalLitres, total_milk_kg: totalMilkKg });
      }

      // Fetch ledger (last 50 entries)
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("production_logs")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ledgerError) {
        console.error("Error fetching ledger:", ledgerError);
      } else {
        const ledgerWithNames = (ledgerData || []).map((log) => ({
          ...log,
          livestock: {
            name:
              livestock.find((item) => String(item.id) === String(log.livestock_id))?.name ||
              "Unknown",
          },
        }));
        setLedger(ledgerWithNames);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsSaving(false);
      return;
    }

    const parsedLitres = Number(litres);
    const parsedMilkKg = Number(milkKg);

    if (!Number.isFinite(parsedLitres) || parsedLitres < 0) {
      setError("Please provide a valid litres value.");
      setIsSaving(false);
      return;
    }

    if (!Number.isFinite(parsedMilkKg) || parsedMilkKg < 0) {
      setError("Please provide a valid milk KG value.");
      setIsSaving(false);
      return;
    }

    if (!selectedLivestockId) {
      setError("Please select a livestock.");
      setIsSaving(false);
      return;
    }

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from("production_logs")
        .insert({
          user_id: currentUserId,
          livestock_id: selectedLivestockId,
          litres: parsedLitres,
          milk_kg: parsedMilkKg,
        })
        .select("*");

      if (insertError) {
        console.error("Error inserting production log:", insertError);
        const details = [insertError.message, insertError.details, insertError.hint]
          .filter(Boolean)
          .join(" | ");
        setError(`Failed to save production log: ${details}`);
        setIsSaving(false);
        return;
      }

      // Reset form
      setSelectedLivestockId("");
      setLitres("");
      setMilkKg("");

      // Add to new record to local state instantly
      if (insertedData && insertedData.length > 0) {
        const newRecord = insertedData[0];
        const livestockName =
          livestock.find((l) => l.id === newRecord.livestock_id)?.name || "Loading...";

        const newProductionLog: ProductionLog = {
          ...newRecord,
          livestock: {
            name: livestockName,
          },
        };

        setLedger((prev) => [newProductionLog, ...prev]);

        // Update monthly summary instantly
        const now = new Date();
        const recordDate = new Date(newRecord.created_at);
        if (recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()) {
          setMonthlySummary((prev) => ({
            total_litres: prev.total_litres + newRecord.litres,
            total_milk_kg: prev.total_milk_kg + newRecord.milk_kg,
          }));
        }
      }

      // Refresh data to ensure correct names are displayed
      await fetchData();
    } catch (err) {
      console.error("Unexpected error during submission:", err);
      setError("An unexpected error occurred during submission");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Navigation currentPage="/productivity" />
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Productivity Logs</h1>
              <div className="text-center text-lg text-gray-600">Loading production data...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/productivity" />
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
              Productivity Logs
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Track your farm's milk production
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
            {/* Monthly Summary Cards */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600/10 rounded-xl p-3">
                      <Milk className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Monthly Total Litres</h3>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {monthlySummary.total_litres.toFixed(2)} L
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600/10 rounded-xl p-3">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Monthly Total Milk KG</h3>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {monthlySummary.total_milk_kg.toFixed(2)} KG
                </p>
              </div>
            </div>

            {/* Record Production Form */}
            <div className="lg:col-span-2">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600/10 rounded-xl p-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Record Production</h3>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="livestock" className="mb-2 block text-sm font-semibold text-green-900">
                      Select Livestock
                    </label>
                    <select
                      id="livestock"
                      value={selectedLivestockId}
                      onChange={(e) => setSelectedLivestockId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                      required
                    >
                      <option value="">Choose a livestock...</option>
                      {livestock.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="litres" className="mb-2 block text-sm font-semibold text-green-900">
                        Litres
                      </label>
                      <input
                        type="number"
                        id="litres"
                        value={litres}
                        onChange={(e) => setLitres(e.target.value)}
                        step="0.01"
                        min="0"
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="milkKg" className="mb-2 block text-sm font-semibold text-green-900">
                        Milk KG
                      </label>
                      <input
                        type="number"
                        id="milkKg"
                        value={milkKg}
                        onChange={(e) => setMilkKg(e.target.value)}
                        step="0.01"
                        min="0"
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-12 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Record Production"}
                  </button>
                </form>
              </div>
            </div>

            {/* Production Ledger Table */}
            <div className="lg:col-span-3">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-600/10 rounded-xl p-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Production Ledger</h3>
                  </div>
                </div>
                
                {ledger.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No production records yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 text-gray-700">Date</th>
                          <th className="text-left py-3 text-gray-700">Livestock</th>
                          <th className="text-right py-3 text-gray-700">Litres</th>
                          <th className="text-right py-3 text-gray-700">Milk KG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map((log) => (
                          <tr key={log.id} className="border-b border-gray-200">
                            <td className="py-3">
                              {new Date(log.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3">{log.livestock?.name || 'Unknown'}</td>
                            <td className="text-right py-3">{log.litres.toFixed(2)}</td>
                            <td className="text-right py-3">{log.milk_kg.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
