"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Fetch livestock for dropdown
      const { data: livestockData, error: livestockError } = await supabase
        .from("livestock")
        .select("id, name")
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
        .order("created_at", { ascending: false })
        .limit(50);

      if (ledgerError) {
        console.error("Error fetching ledger:", ledgerError);
        console.log(
          "Ledger Fetch Error Details:",
          ledgerError.message,
          ledgerError.details,
          ledgerError.hint
        );
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

      // Add the new record to the local state instantly
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
      console.log("Refreshing data after insert...");
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
      <div className="min-h-screen bg-black text-green-400 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Milk Production Dashboard</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Milk Production Dashboard</h1>
          <Link
            href="/"
            className="bg-green-600 hover:bg-green-700 text-black px-4 py-2 rounded transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
            <h2 className="text-xl font-semibold mb-2">Monthly Total Litres</h2>
            <p className="text-3xl font-bold">{monthlySummary.total_litres.toFixed(2)} L</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
            <h2 className="text-xl font-semibold mb-2">Monthly Total Milk KG</h2>
            <p className="text-3xl font-bold">{monthlySummary.total_milk_kg.toFixed(2)} KG</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-900 p-6 rounded-lg border border-green-400 mb-8">
          <h2 className="text-xl font-semibold mb-4">Record Production</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="livestock" className="block text-sm font-medium mb-1">
                Select Livestock
              </label>
              <select
                id="livestock"
                value={selectedLivestockId}
                onChange={(e) => setSelectedLivestockId(e.target.value)}
                className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
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
                <label htmlFor="litres" className="block text-sm font-medium mb-1">
                  Litres
                </label>
                <input
                  type="number"
                  id="litres"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="milkKg" className="block text-sm font-medium mb-1">
                  Milk KG
                </label>
                <input
                  type="number"
                  id="milkKg"
                  value={milkKg}
                  onChange={(e) => setMilkKg(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-400 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-black font-semibold py-2 px-4 rounded transition-colors"
            >
              {isSaving ? "Saving..." : "Record Production"}
            </button>
          </form>
        </div>

        {/* Ledger Table */}
        <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
          <h2 className="text-xl font-semibold mb-4">Production Ledger</h2>
          {ledger.length === 0 ? (
            <p className="text-gray-400">No production records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-400">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Livestock</th>
                    <th className="text-right py-2">Litres</th>
                    <th className="text-right py-2">Milk KG</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((log) => (
                    <tr key={log.id} className="border-b border-gray-700">
                      <td className="py-2">
                        {new Date(log.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">{log.livestock?.name || 'Unknown'}</td>
                      <td className="text-right py-2">{log.litres.toFixed(2)}</td>
                      <td className="text-right py-2">{log.milk_kg.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
