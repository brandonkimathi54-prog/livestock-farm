"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import Navigation from "@/app/components/Navigation";

type Livestock = {
  id: number;
  name: string;
  breed: string;
  created_at: string;
  image_url?: string;
};

type HealthLog = {
  livestock_id: number;
  date: string;
  log_type: string;
};

type CowStatus = "Active" | "Sick";
type FilterMode = "All" | "Active" | "Sick";

export default function TrackingPage() {
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("All");
  const [error, setError] = useState("");
  const [cowName, setCowName] = useState("");
  const [breed, setBreed] = useState("");
  const [healthStatus, setHealthStatus] = useState("Healthy");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  async function loadTrackingData() {
    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      return;
    }
    const [livestockResponse, logsResponse] = await Promise.all([
      supabase
        .from("livestock")
        .select("id, name, breed, created_at, image_url")
        .eq("user_id", currentUserId)
        .order("created_at", {
          ascending: false,
        }),
      supabase.from("health_logs").select("livestock_id, date, log_type").eq("user_id", currentUserId),
    ]);

    if (livestockResponse.error) {
      setError(`Supabase error loading livestock: ${livestockResponse.error.message}`);
      return;
    }

    if (logsResponse.error) {
      setError(`Supabase error loading health logs: ${logsResponse.error.message}`);
      return;
    }

    setLivestock((livestockResponse.data ?? []) as Livestock[]);
    setHealthLogs((logsResponse.data ?? []) as HealthLog[]);
  }

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      void loadTrackingData();
    }
  }, [currentUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsSaving(false);
      return;
    }

    let imageUrl: string | null = null;
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `cow-photos/${fileName}`;
      const bucketName = 'cow photos';

      console.log("Attempting upload to bucket:", bucketName);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        setError("Failed to upload image");
        setIsSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const { error: insertError } = await supabase.from("livestock").insert({
      user_id: currentUserId,
      name: cowName.trim(),
      breed: breed.trim(),
      health_status: healthStatus.trim(),
      image_url: imageUrl,
    });

    if (insertError) {
      const details = [insertError.message, insertError.details, insertError.hint]
        .filter(Boolean)
        .join(" | ");
      setError(`Failed to add livestock: ${details}`);
      setIsSaving(false);
      return;
    }

    // Reset form
    setCowName("");
    setBreed("");
    setHealthStatus("Healthy");
    setSelectedFile(null);

    // Refresh data
    await loadTrackingData();
    setIsSaving(false);
  }

  const cowStatusById = useMemo(() => {
    const latestLogByCowId = new Map<number, HealthLog>();
    for (const log of healthLogs) {
      const logTime = new Date(log.date).getTime();
      if (!Number.isFinite(logTime)) continue;
      const currentLatest = latestLogByCowId.get(log.livestock_id);
      if (!currentLatest || logTime > new Date(currentLatest.date).getTime()) {
        latestLogByCowId.set(log.livestock_id, log);
      }
    }

    const statusById = new Map<number, CowStatus>();
    const sickPattern = /(sick|ill|disease|injury|treatment|fever|infection)/i;
    for (const cow of livestock) {
      const latestLog = latestLogByCowId.get(cow.id);
      if (latestLog && sickPattern.test(latestLog.log_type)) {
        statusById.set(cow.id, "Sick");
      } else {
        statusById.set(cow.id, "Active");
      }
    }

    return statusById;
  }, [healthLogs, livestock]);

  const latestHealthCheckById = useMemo(() => {
    const latestById = new Map<number, string>();
    for (const log of healthLogs) {
      const logTime = new Date(log.date).getTime();
      if (!Number.isFinite(logTime)) continue;
      const existing = latestById.get(log.livestock_id);
      if (!existing || logTime > new Date(existing).getTime()) {
        latestById.set(log.livestock_id, log.date);
      }
    }
    return latestById;
  }, [healthLogs]);

  const filteredLivestock = useMemo(() => {
    const query = search.trim().toLowerCase();
    return livestock.filter((cow) => {
      const status = cowStatusById.get(cow.id) ?? "Active";
      const matchesSearch = !query || cow.name.toLowerCase().includes(query);
      const matchesFilter = filterMode === "All" || status === filterMode;
      return matchesSearch && matchesFilter;
    });
  }, [cowStatusById, filterMode, livestock, search]);

  const getAgeLabel = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    if (!Number.isFinite(createdTime)) return "Unknown";
    const ageInDays = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
    if (ageInDays < 30) return `${ageInDays} days`;
    const ageInMonths = Math.floor(ageInDays / 30);
    if (ageInMonths < 12) return `${ageInMonths} months`;
    const ageInYears = Math.floor(ageInMonths / 12);
    return `${ageInYears} years`;
  };

  const toggleFilter = () => {
    if (filterMode === "All") {
      setFilterMode("Active");
      return;
    }
    if (filterMode === "Active") {
      setFilterMode("Sick");
      return;
    }
    setFilterMode("All");
  };

  return (
    <>
      <Navigation currentPage="/tracking" />
      <div className="min-h-screen bg-black text-green-400 px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16">
        <main className="mx-auto w-full max-w-6xl space-y-6 md:space-y-8 lg:ml-64">
        {/* Add Livestock Form */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Add New Livestock</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cowName" className="block text-sm font-medium mb-1">
                  Name
                </label>
                <input
                  id="cowName"
                  type="text"
                  required
                  value={cowName}
                  onChange={(e) => setCowName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
              <div>
                <label htmlFor="breed" className="block text-sm font-medium mb-1">
                  Breed
                </label>
                <input
                  id="breed"
                  type="text"
                  required
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
              <div>
                <label htmlFor="healthStatus" className="block text-sm font-medium mb-1">
                  Health Status
                </label>
                <input
                  id="healthStatus"
                  type="text"
                  required
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
            </div>
            <div>
              <label htmlFor="image" className="block text-sm font-medium mb-1">
                Picture (Optional)
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>
            {error && (
              <div className="bg-red-900 border border-red-400 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              {isSaving ? "Adding..." : "Add Livestock"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name (e.g. kairo)..."
              className="bg-zinc-900 text-white p-2 rounded w-full"
            />
            <button
              type="button"
              onClick={toggleFilter}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Filter: {filterMode}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-zinc-800 p-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Back to Home
            </Link>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-300">
                  <th className="px-3 py-3 font-semibold">Image</th>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Breed</th>
                  <th className="px-3 py-3 font-semibold">Age</th>
                  <th className="px-3 py-3 font-semibold">Last Health Check</th>
                </tr>
              </thead>
              <tbody>
                {filteredLivestock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-400">
                      No livestock matched your search.
                    </td>
                  </tr>
                ) : (
                  filteredLivestock.map((cow) => (
                    <tr key={cow.id} className="border-b border-zinc-800 last:border-0">
                      <td className="px-3 py-3">
                        {cow.image_url ? (
                          <img
                            src={cow.image_url}
                            alt={cow.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-700 rounded flex items-center justify-center text-zinc-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-white">{cow.name}</td>
                      <td className="px-3 py-3 text-zinc-300">{cow.breed}</td>
                      <td className="px-3 py-3 text-zinc-300">{getAgeLabel(cow.created_at)}</td>
                      <td className="px-3 py-3 text-zinc-300">
                        {latestHealthCheckById.get(cow.id)
                          ? new Date(latestHealthCheckById.get(cow.id) as string).toLocaleDateString(
                              "en-KE"
                            )
                          : "No health checks"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        </main>
      </div>
    </>
  );
}
