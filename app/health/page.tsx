"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/app/components/Navigation";
import { Heart, Activity, Plus } from "lucide-react";

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
          logsError.details,
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

      if (insertError) {
        console.error("Error inserting health log:", insertError);
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

      // Add to new record to local state instantly
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

        // Refresh data to ensure correct names are displayed
        await fetchData();
      }
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
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Health Logs</h1>
              <div className="text-center text-lg text-gray-600">Loading health data...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/health" />
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
              Health Logs
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Track and manage livestock health records
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Record Health Issue Form */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600/10 rounded-xl p-3">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Record Health Issue</h3>
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
                    <label htmlFor="condition" className="mb-2 block text-sm font-semibold text-green-900">
                      Condition
                    </label>
                    <input
                      type="text"
                      id="condition"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="Enter health condition"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="treatment" className="mb-2 block text-sm font-semibold text-green-900">
                      Treatment (Optional)
                    </label>
                    <textarea
                      id="treatment"
                      value={treatment}
                      onChange={(e) => setTreatment(e.target.value)}
                      rows={3}
                      placeholder="Enter treatment details"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="cost" className="mb-2 block text-sm font-semibold text-green-900">
                      Cost (KSh)
                    </label>
                    <input
                      type="number"
                      id="cost"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="Enter treatment cost"
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
                  {isSaving ? "Saving..." : "Record Health Issue"}
                </button>
              </form>
            </div>

            {/* Health History Table */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600/10 rounded-xl p-3">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Health History</h3>
                </div>
              </div>
              
              {healthLogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No health records yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-700">Date</th>
                        <th className="text-left py-3 text-gray-700">Livestock</th>
                        <th className="text-left py-3 text-gray-700">Condition</th>
                        <th className="text-left py-3 text-gray-700">Treatment</th>
                        <th className="text-right py-3 text-gray-700">Cost (KSh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-200">
                          <td className="py-3">
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3">{log.livestock?.name || 'Unknown'}</td>
                          <td className="py-3">{log.condition}</td>
                          <td className="py-3">{log.treatment || "None"}</td>
                          <td className="text-right py-3">{log.cost.toFixed(2)}</td>
                        </tr>
                      ))}
}
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
<div className="relative min-h-screen">
<div 
className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
/>
<div className="fixed inset-0 bg-white/40" aria-hidden="true" />
  
<main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
<div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
<h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Health Logs</h1>
<div className="text-center text-lg text-gray-600">Loading health data...</div>
</div>
</main>
</div>
</>
);
}

return (
<>
<Navigation currentPage="/health" />
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
Health Logs
</h1>
<p className="text-lg md:text-xl text-gray-600">
Track and manage livestock health records
</p>
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
{/* Record Health Issue Form */}
<div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
<div className="flex items-center justify-between mb-6">
<div className="flex items-center gap-3">
<div className="bg-red-600/10 rounded-xl p-3">
<Heart className="w-6 h-6 text-red-600" />
</div>
<h3 className="text-lg font-semibold text-gray-700">Record Health Issue</h3>
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
<label htmlFor="condition" className="mb-2 block text-sm font-semibold text-green-900">
Condition
</label>
<input
type="text"
id="condition"
value={condition}
onChange={(e) => setCondition(e.target.value)}
placeholder="Enter health condition"
className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
required
/>
</div>
<div>
<label htmlFor="treatment" className="mb-2 block text-sm font-semibold text-green-900">
Treatment (Optional)
</label>
<textarea
id="treatment"
value={treatment}
onChange={(e) => setTreatment(e.target.value)}
rows={3}
placeholder="Enter treatment details"
className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
/>
</div>
<div>
<label htmlFor="cost" className="mb-2 block text-sm font-semibold text-green-900">
Cost (KSh)
</label>
<input
type="number"
id="cost"
value={cost}
onChange={(e) => setCost(e.target.value)}
step="0.01"
min="0"
placeholder="Enter treatment cost"
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
{isSaving ? "Saving..." : "Record Health Issue"}
</button>
</form>
</div>

{/* Health History Table */}
<div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
<div className="flex items-center justify-between mb-6">
<div className="flex items-center gap-3">
<div className="bg-purple-600/10 rounded-xl p-3">
<Activity className="w-6 h-6 text-purple-600" />
</div>
<h3 className="text-lg font-semibold text-gray-700">Health History</h3>
</div>
</div>
  
{healthLogs.length === 0 ? (
<div className="text-center py-12">
<p className="text-gray-600">No health records yet.</p>
</div>
) : (
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-gray-200">
<th className="text-left py-3 text-gray-700">Date</th>
<th className="text-left py-3 text-gray-700">Livestock</th>
<th className="text-left py-3 text-gray-700">Condition</th>
<th className="text-left py-3 text-gray-700">Treatment</th>
<th className="text-right py-3 text-gray-700">Cost (KSh)</th>
</tr>
</thead>
<tbody>
{healthLogs.map((log) => (
<tr key={log.id} className="border-b border-gray-200">
<td className="py-3">
{new Date(log.created_at).toLocaleDateString()}
</td>
<td className="py-3">{log.livestock?.name || 'Unknown'}</td>
<td className="py-3">{log.condition}</td>
<td className="py-3">{log.treatment || "None"}</td>
<td className="text-right py-3">{log.cost.toFixed(2)}</td>
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
