"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/app/components/Navigation";

interface Livestock {
  id: string;
  name: string;
}

interface HealthLog {
  id: number;
  livestock_id: string;
  condition: string;
  treatment: string | null;
  cost: number;
  created_at: string;
  livestock: { name: string } | null;
}

export default function HealthPage() {
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [selectedLivestockId, setSelectedLivestockId] = useState("");
  const [condition, setCondition] = useState("");
  const [treatment, setTreatment] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchData();
    } else {
      setIsLoading(false);
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

      // Fetch health logs with livestock name join
      const { data: logsData, error: logsError } = await supabase
        .from("health_logs")
        .select("*, livestock!health_logs_cow_id_fkey(name)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (logsError) {
        console.error(
          "Detailed Fetch Error:",
          logsError.message,
          logsError.hint
        );
      } else {
        setHealthLogs(logsData || []);
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
    setSuccessMessage("");
    setIsSaving(true);

    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsSaving(false);
      return;
    }

    const parsedCost = Number(cost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError("Please provide a valid cost (0 or greater).");
      setIsSaving(false);
      return;
    }

    if (!selectedLivestockId) {
      setError("Please select a livestock.");
      setIsSaving(false);
      return;
    }

    if (!condition.trim()) {
      setError("Please enter a condition.");
      setIsSaving(false);
      return;
    }

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from("health_logs")
        .insert({
          user_id: currentUserId,
          livestock_id: selectedLivestockId,
          condition: condition.trim(),
          treatment: treatment.trim() || null,
          cost: parsedCost,
        })
        .select("*");

      console.log("Supabase Response:", insertedData, insertError);
      if (insertError) {
        console.error("Error inserting health log:", insertError);
        console.log("Database Error Details:", insertError);
        const details = [insertError.message, insertError.details, insertError.hint]
          .filter(Boolean)
          .join(" | ");
        setError(`Failed to save health log: ${details}`);
        setIsSaving(false);
        return;
      }

      // Reset form
      setSelectedLivestockId("");
      setCondition("");
      setTreatment("");
      setCost("");

      // Show success message
      setSuccessMessage("Health log saved successfully!");

      // Add the new record to the local state instantly
      if (insertedData && insertedData.length > 0) {
        const newRecord = insertedData[0];
        const livestockName =
          livestock.find((l) => l.id === newRecord.livestock_id)?.name || "Loading...";

        const newHealthLog: HealthLog = {
          ...newRecord,
          livestock: {
            name: livestockName,
          },
        };

        setHealthLogs((prev) => [newHealthLog, ...prev]);
      }

      // Refresh data to ensure correct names are displayed
      console.log("Refreshing health data after insert...");
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
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
        <Navigation currentPage="/health" />
        <div className="min-h-screen bg-black text-green-400 px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16">
          <div className="max-w-4xl mx-auto lg:ml-64">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Health Logs</h1>
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/health" />
      <div className="min-h-screen bg-black text-green-400 px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16">
        <div className="max-w-4xl mx-auto lg:ml-64">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Health Logs</h1>

        {/* Form */}
        <div className="bg-gray-900 p-4 md:p-6 rounded-lg border border-green-400 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Record Health Issue</h2>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div>
              <label htmlFor="livestock" className="block text-sm font-medium mb-1">
                Select Livestock
              </label>
              <select
                id="livestock"
                value={selectedLivestockId}
                onChange={(e) => setSelectedLivestockId(e.target.value)}
                className="h-11 w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
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
                <label htmlFor="condition" className="block text-sm font-medium mb-1">
                  Condition
                </label>
                <input
                  type="text"
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="h-11 w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="cost" className="block text-sm font-medium mb-1">
                  Cost (KSh)
                </label>
                <input
                  type="number"
                  id="cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  step="0.01"
                  min="0"
                  className="h-11 w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="treatment" className="block text-sm font-medium mb-1">
                Treatment (Optional)
              </label>
              <textarea
                id="treatment"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {error && (
              <div className="bg-red-900 border border-red-400 text-red-400 px-3 py-2 md:px-4 rounded text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900 border border-green-400 text-green-400 px-3 py-2 md:px-4 rounded font-semibold text-sm">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="h-11 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-black font-semibold py-2 px-4 rounded transition-colors"
            >
              {isSaving ? "Saving..." : "Record Health Issue"}
            </button>
          </form>
        </div>

        {/* Health History Table */}
        <div className="bg-gray-900 p-4 md:p-6 rounded-lg border border-green-400">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Health History</h2>
          {healthLogs.length === 0 ? (
            <p className="text-gray-400">No health records yet.</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {healthLogs.map((log) => (
                  <div key={log.id} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-green-300">{log.livestock?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-400">
                        KSh {log.cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="text-gray-400">Condition:</span> {log.condition}</p>
                      {log.treatment && (
                        <p className="text-sm"><span className="text-gray-400">Treatment:</span> {log.treatment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-400">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Livestock</th>
                      <th className="text-left py-2">Condition</th>
                      <th className="text-left py-2">Treatment</th>
                      <th className="text-right py-2">Cost (KSh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-700">
                        <td className="py-2">
                          {new Date(log.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2">{log.livestock?.name || 'Unknown'}</td>
                        <td className="py-2">{log.condition}</td>
                        <td className="py-2">{log.treatment || "None"}</td>
                        <td className="text-right py-2">{log.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </>
  );
}