"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

interface Livestock {
  id: number;
  name: string;
  breed: string;
  price_ksh: number;
  health_status: string;
  status?: string;
  weight?: number;
  age?: number;
  image_url?: string;
  video_url?: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [cowName, setCowName] = useState("");
  const [breed, setBreed] = useState("");
  const [price, setPrice] = useState("");
  const [healthStatus, setHealthStatus] = useState("Healthy");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCowId, setEditingCowId] = useState<number | null>(null);

  async function fetchLivestock() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("livestock")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching livestock:", error);
      setError("Failed to load livestock");
    } else {
      setLivestock(data || []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchLivestock();
  }, []);

  async function deleteCow(id: number) {
    if (!confirm("Are you sure you want to delete this cow?")) {
      return;
    }

    try {
      const { error } = await supabase.from("livestock").delete().eq("id", id);

      if (error) {
        console.error("Error deleting cow:", error);
        setError("Failed to delete cow");
      } else {
        setError("");
        await fetchLivestock();
      }
    } catch (err) {
      console.error("Unexpected error deleting cow:", err);
      setError("An unexpected error occurred while deleting cow");
    }
  }

  async function toggleSaleStatus(cow: Livestock) {
    const nextStatus = cow.status === "For Sale" ? "Active" : "For Sale";
    const { error: updateError } = await supabase
      .from("livestock")
      .update({ status: nextStatus })
      .eq("id", cow.id);

    if (updateError) {
      console.error("Error toggling sale status:", updateError);
      setError("Failed to update sale status");
      return;
    }

    setError("");
    await fetchLivestock();
  }

  function editCow(cow: Livestock) {
    setEditingCowId(cow.id);
    setCowName(cow.name);
    setBreed(cow.breed);
    setPrice(cow.price_ksh.toString());
    setHealthStatus(cow.health_status);
    setWeight(cow.weight ? cow.weight.toString() : "");
    setAge(cow.age ? cow.age.toString() : "");
    setSelectedFile(null); // Clear file selection when editing
    setSelectedVideoFile(null);
    setExistingImageUrl(cow.image_url ?? null);
    setExistingVideoUrl(cow.video_url ?? null);
  }

  function cancelEdit() {
    setEditingCowId(null);
    setCowName("");
    setBreed("");
    setPrice("");
    setHealthStatus("Healthy");
    setWeight("");
    setAge("");
    setSelectedFile(null);
    setSelectedVideoFile(null);
    setExistingImageUrl(null);
    setExistingVideoUrl(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const parsedPrice = Number(price);
    const parsedWeight = Number(weight);
    const parsedAge = age ? Number(age) : null;

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Please provide a valid price in KSh.");
      setIsSaving(false);
      return;
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      setError("Please provide a valid weight.");
      setIsSaving(false);
      return;
    }

    if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 0)) {
      setError("Please provide a valid age.");
      setIsSaving(false);
      return;
    }

    let imageUrl: string | null = existingImageUrl;
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

    let videoUrl: string | null = existingVideoUrl;
    if (selectedVideoFile) {
      const videoExt = selectedVideoFile.name.split(".").pop();
      const videoFileName = `${Date.now()}.${videoExt}`;
      const videoFilePath = `market-videos/${videoFileName}`;
      const videoBucketName = "market-videos";

      const { error: videoUploadError } = await supabase.storage
        .from(videoBucketName)
        .upload(videoFilePath, selectedVideoFile);

      if (videoUploadError) {
        console.error("Error uploading market video:", videoUploadError);
        setError("Failed to upload market video");
        setIsSaving(false);
        return;
      }

      const { data: videoData } = supabase.storage
        .from(videoBucketName)
        .getPublicUrl(videoFilePath);

      videoUrl = videoData.publicUrl;
    }

    let result;
    if (editingCowId) {
      // Update existing cow
      result = await supabase
        .from("livestock")
        .update({
          name: cowName.trim(),
          breed: breed.trim(),
          price_ksh: parsedPrice,
          health_status: healthStatus.trim(),
          weight: parsedWeight,
          age: parsedAge,
          image_url: imageUrl,
          video_url: videoUrl,
        })
        .eq("id", editingCowId);
    } else {
      // Insert new cow
      result = await supabase.from("livestock").insert({
        name: cowName.trim(),
        breed: breed.trim(),
        price_ksh: parsedPrice,
        health_status: healthStatus.trim(),
        weight: parsedWeight,
        age: parsedAge,
        image_url: imageUrl,
        video_url: videoUrl,
      });
    }

    if (result.error) {
      const details = [result.error.message, result.error.details, result.error.hint]
        .filter(Boolean)
        .join(" | ");
      setError(`Supabase error: ${details}`);
      setIsSaving(false);
      return;
    }

    // Reset form
    cancelEdit();

    // Refresh livestock list
    await fetchLivestock();
    setIsSaving(false);
  }

  function csvCell(value: unknown) {
    const safe = value === null || value === undefined ? "" : String(value);
    return `"${safe.replace(/"/g, '""')}"`;
  }

  async function downloadCsvReport() {
    setError("");
    setIsDownloadingReport(true);

    try {
      const [livestockResponse, productionResponse, expensesResponse] = await Promise.all([
        supabase.from("livestock").select("name, breed, weight, price_ksh").order("name", { ascending: true }),
        supabase.from("production_logs").select("*").order("date", { ascending: false }),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
      ]);

      if (livestockResponse.error) throw livestockResponse.error;
      if (productionResponse.error) throw productionResponse.error;
      if (expensesResponse.error) throw expensesResponse.error;

      const livestockRows = (livestockResponse.data ?? []) as Array<Record<string, unknown>>;
      const productionRows = (productionResponse.data ?? []) as Array<Record<string, unknown>>;
      const expenseRows = (expensesResponse.data ?? []) as Array<Record<string, unknown>>;

      const lines: string[] = [];

      lines.push("Livestock");
      lines.push(["Name", "Breed", "Weight", "Price"].join(","));
      for (const row of livestockRows) {
        lines.push(
          [
            csvCell(row.name),
            csvCell(row.breed),
            csvCell(row.weight),
            csvCell(row.price_ksh),
          ].join(",")
        );
      }

      lines.push("");
      lines.push("Daily Production");
      lines.push(["Date", "Liters/KG"].join(","));
      for (const row of productionRows) {
        const liters = row.liters ?? row.litres ?? row.milk_liters ?? row.milk_litres ?? "";
        const kilos = row.kilos ?? row.kg ?? row.milk_kilograms ?? row.milk_kilos ?? "";
        const litersKg = `Liters: ${liters || 0} | KG: ${kilos || 0}`;
        lines.push([csvCell(row.date), csvCell(litersKg)].join(","));
      }

      lines.push("");
      lines.push("Expenses");
      lines.push(["Category", "Amount", "Date"].join(","));
      for (const row of expenseRows) {
        lines.push([csvCell(row.category), csvCell(row.amount), csvCell(row.date)].join(","));
      }

      const csvContent = lines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Kirinyaga_Farm_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Error downloading report:", downloadError);
      setError("Failed to generate CSV report. Please check table access.");
    } finally {
      setIsDownloadingReport(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
      style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
    >
      <main className="mx-auto w-full max-w-6xl rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-900">
            Meme Livestock Farm
          </p>
          <Link
            href="/"
            className="text-base font-semibold text-emerald-900 hover:text-emerald-700"
          >
            Back to Home
          </Link>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={downloadCsvReport}
            disabled={isDownloadingReport}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-base font-bold text-white shadow-md transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingReport ? "Generating Report..." : "Download CSV Report"}
          </button>
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-emerald-900 sm:text-5xl">
          {editingCowId ? "Edit Livestock" : "Add Livestock"}
        </h1>
        <p className="mt-3 text-lg text-gray-700">
          {editingCowId ? "Update cow profile with pricing and health details." : "Add a new cow profile with pricing and health details for your clients."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="cowName"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Cow Name
            </label>
            <input
              id="cowName"
              type="text"
              required
              value={cowName}
              onChange={(e) => setCowName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="breed"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Breed
            </label>
            <input
              id="breed"
              type="text"
              required
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Price in KSh
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="healthStatus"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Health Status
            </label>
            <input
              id="healthStatus"
              type="text"
              required
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="weight"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              min="0"
              step="0.01"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="age"
              className="mb-2 block text-base font-semibold text-emerald-900"
            >
              Age (years)
            </label>
            <input
              id="age"
              type="number"
              min="0"
              step="0.1"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="imageFile"
                className="mb-2 block text-base font-semibold text-emerald-900"
              >
                Cow Photo
              </label>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
              />
              {selectedFile ? (
                <p className="mt-2 text-sm text-emerald-800">
                  Selected: {selectedFile.name}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="videoFile"
                className="mb-2 block text-base font-semibold text-emerald-900"
              >
                Market Video
              </label>
              <input
                ref={videoInputRef}
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Upload Video
              </button>
              {editingCowId && existingVideoUrl ? (
                <p className="mt-2 text-sm text-gray-700">
                  Current video exists. Upload a new file to replace it.
                </p>
              ) : null}
              {selectedVideoFile ? (
                <p className="mt-2 text-sm text-emerald-800">
                  Selected: {selectedVideoFile.name}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-800 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : editingCowId ? "Update Livestock" : "Add Livestock"}
            </button>
            {editingCowId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center justify-center rounded-lg bg-gray-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Livestock Inventory */}
        <div className="mt-12">
          <h2 className="mb-6 text-3xl font-bold text-emerald-900">
            Livestock Inventory
          </h2>
          {isLoading ? (
            <p className="text-gray-700">Loading livestock...</p>
          ) : livestock.length === 0 ? (
            <p className="text-gray-700">No livestock added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {livestock.map((cow) => (
                <div
                  key={cow.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-md"
                >
                  {cow.status === "For Sale" ? (
                    <div className="mb-3">
                      <span className="inline-flex rounded-full border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Live
                      </span>
                    </div>
                  ) : null}
                  {cow.image_url ? (
                    <div className="mb-4 flex items-start gap-3">
                      <img
                        src={cow.image_url}
                        alt={cow.name}
                        className="h-32 w-2/3 rounded-lg object-cover"
                      />
                      {cow.video_url ? (
                        <video
                          src={cow.video_url}
                          muted
                          loop
                          controls
                          playsInline
                          className="h-32 w-1/3 rounded-lg bg-black object-cover"
                        />
                      ) : null}
                    </div>
                  ) : cow.video_url ? (
                    <div className="mb-4">
                      <video
                        src={cow.video_url}
                        muted
                        loop
                        controls
                        playsInline
                        className="h-32 w-full rounded-lg bg-black object-cover"
                      />
                    </div>
                  ) : null}
                  <h3 className="text-2xl font-bold text-emerald-900">
                    {cow.name}
                  </h3>
                  <p className="text-base text-gray-700">
                    Breed: {cow.breed}
                  </p>
                  <p className="text-base text-gray-700">
                    Health: {cow.health_status}
                  </p>
                  <p className="text-base text-gray-700">
                    Status: {cow.status || "Active"}
                  </p>
                  {cow.weight && (
                    <p className="text-base text-gray-700">
                      Weight: {cow.weight} kg
                    </p>
                  )}
                  {cow.age && (
                    <p className="text-base text-gray-700">
                      Age: {cow.age} years
                    </p>
                  )}
                  <p className="mt-2 text-2xl font-bold text-emerald-900">
                    {cow.price_ksh !== null && cow.price_ksh !== undefined
                      ? `KSh ${cow.price_ksh.toLocaleString()}`
                      : "Price not set"}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => editCow(cow)}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCow(cow.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-700 px-5 py-3 text-base font-bold text-white transition hover:bg-rose-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => toggleSaleStatus(cow)}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800"
                    >
                      {cow.status === "For Sale" ? "Unlist" : "Sell"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
