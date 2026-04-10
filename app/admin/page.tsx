"use client";

import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Navigation from "@/app/components/Navigation";

interface Livestock {
  id: number;
  name: string;
  breed: string;
  price_ksh: number;
  health_status: string;
  status?: string;
  is_for_sale?: boolean;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [whatsappSaveSuccess, setWhatsappSaveSuccess] = useState(false);
  
  // State to handle the modal visibility and new cow data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCow, setNewCow] = useState({ name: '', breed: '', age: '', price: '' });

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchWhatsAppNumber();
    }
  }, [currentUserId]);

  async function fetchWhatsAppNumber() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("whatsapp_number")
        .eq("id", currentUserId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching WhatsApp number:", error);
      } else if (data) {
        setWhatsappNumber(data.whatsapp_number || "");
      }
    } catch (err) {
      console.error("Unexpected error fetching WhatsApp number:", err);
    }
  }

  async function saveWhatsAppNumber() {
    setIsSavingWhatsApp(true);
    setError("");
    setWhatsappSaveSuccess(false);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_number: whatsappNumber.trim() })
        .eq("id", currentUserId);
        
      if (error) {
        setError("Failed to save WhatsApp number: " + error.message);
      } else {
        setWhatsappSaveSuccess(true);
        setTimeout(() => setWhatsappSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred while saving WhatsApp number.");
    } finally {
      setIsSavingWhatsApp(false);
    }
  }

  const handleAddCow = (e: React.FormEvent) => {
    e.preventDefault();
    // Add logic to save cow to your list
    const cowToAdd: Livestock = {
      id: Date.now(),
      name: newCow.name,
      breed: newCow.breed,
      price_ksh: parseFloat(newCow.price) || 0,
      health_status: "Healthy",
      status: "Active",
      age: parseFloat(newCow.age) || 0,
      created_at: new Date().toISOString()
    };
    setLivestock([...livestock, cowToAdd]);
    setIsModalOpen(false);
    setNewCow({ name: '', breed: '', age: '', price: '' });
  };

  async function fetchLivestock() {
    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("livestock")
      .select("*")
      .eq("user_id", currentUserId)
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
    if (currentUserId) {
      fetchLivestock();
    }
  }, [currentUserId]);

  async function deleteCow(id: number) {
    if (!confirm("Are you sure you want to delete this cow?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("livestock")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUserId);

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

  const handleSell = async (id: string) => {
  // Simple ID check
  if (!id) return;

  const { error } = await supabase
    .from('livestock')
    .update({ is_for_sale: true })
    .eq('id', id);

  if (error) {
    console.error("Sell Error:", error.message);
    alert("Still refusing: " + error.message);
  } else {
    alert("Success! The cow is now listed.");
    window.location.reload();
  }
};

async function toggleSaleStatus(cow: Livestock) {
  if (cow.is_for_sale === true) {
    // Unlist from marketplace
    const { error: updateError } = await supabase
      .from("livestock")
      .update({ is_for_sale: false })
      .eq("id", cow.id)
      .eq("user_id", currentUserId); // Add user_id filter for RLS

    if (updateError) {
      console.error("Error toggling sale status:", updateError);
      setError("Failed to update sale status");
      return;
    }

    setError("");
    await fetchLivestock();
  } else {
    // List for sale using the new handleSell function
    await handleSell(String(cow.id));
  }
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

    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsSaving(false);
      return;
    }

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
        .eq("id", editingCowId)
        .eq("user_id", currentUserId);
    } else {
      // Insert new cow
      result = await supabase.from("livestock").insert({
        user_id: currentUserId,
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
        supabase
          .from("livestock")
          .select("name, breed, weight, price_ksh")
          .eq("user_id", currentUserId)
          .order("name", { ascending: true }),
        supabase.from("production_logs").select("*").eq("user_id", currentUserId).order("date", { ascending: false }),
        supabase.from("expenses").select("*").eq("user_id", currentUserId).order("date", { ascending: false }),
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
    <>
      <Navigation />
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16"
        style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
      >
        <main className="mx-auto w-full max-w-6xl rounded-2xl bg-white/80 p-4 md:p-6 lg:p-8 shadow-xl backdrop-blur-md lg:ml-64">
        <div className="mb-4 md:mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-900">
            Meme Livestock Farm
          </p>
        </div>
        <div className="mt-4 space-y-4">
          <button
            type="button"
            onClick={downloadCsvReport}
            disabled={isDownloadingReport}
            className="inline-flex items-center justify-center h-11 rounded-lg bg-emerald-800 px-4 py-2 md:px-5 md:py-3 text-sm md:text-base font-bold text-white shadow-md transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingReport ? "Generating Report..." : "Download CSV Report"}
          </button>
        </div>

        {/* WhatsApp Settings Section */}
        <div className="mt-8 bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-green-900">WhatsApp Contact Settings</h2>
          <p className="mb-6 text-sm text-gray-600">
            Set your WhatsApp number so buyers can contact you directly from the marketplace.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="whatsapp" className="mb-2 block text-sm font-semibold text-green-900">
                WhatsApp Number
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g., +254793412488"
                className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
              />
              <p className="mt-2 text-xs text-gray-500">
                Include country code (e.g., +254 for Kenya)
              </p>
            </div>
            
            {whatsappSaveSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                WhatsApp number saved successfully!
              </div>
            )}
            
            <button
              type="button"
              onClick={saveWhatsAppNumber}
              disabled={isSavingWhatsApp}
              className="inline-flex items-center justify-center h-11 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingWhatsApp ? "Saving..." : "Save WhatsApp Number"}
            </button>
          </div>
        </div>

        <h1 className="mt-4 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-emerald-900">
          {editingCowId ? "Edit Livestock" : "Add Livestock"}
        </h1>
        <p className="mt-3 text-sm md:text-base lg:text-lg text-gray-700">
          {editingCowId ? "Update cow profile with pricing and health details." : "Add a new cow profile with pricing and health details for your clients."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 md:mt-8 space-y-4 md:space-y-5">
          <div>
            <label
              htmlFor="cowName"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
            >
              Cow Name
            </label>
            <input
              id="cowName"
              type="text"
              required
              value={cowName}
              onChange={(e) => setCowName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="breed"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
            >
              Breed
            </label>
            <input
              id="breed"
              type="text"
              required
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
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
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="healthStatus"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
            >
              Health Status
            </label>
            <input
              id="healthStatus"
              type="text"
              required
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="weight"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
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
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="age"
              className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
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
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="imageFile"
                className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
              >
                Cow Photo
              </label>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:px-4 py-2 md:py-3 text-gray-900 outline-none ring-emerald-500 transition focus:ring-2"
              />
              {selectedFile ? (
                <p className="mt-2 text-xs md:text-sm text-emerald-800">
                  Selected: {selectedFile.name}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="videoFile"
                className="mb-2 block text-sm md:text-base font-semibold text-emerald-900"
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
                className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 md:px-5 md:py-3 text-sm md:text-base font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Upload Video
              </button>
              {editingCowId && existingVideoUrl ? (
                <p className="mt-2 text-xs md:text-sm text-gray-700">
                  Current video exists. Upload a new file to replace it.
                </p>
              ) : null}
              {selectedVideoFile ? (
                <p className="mt-2 text-xs md:text-sm text-emerald-800">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex flex-1 items-center justify-center h-12 rounded-lg bg-emerald-800 px-4 py-2 md:px-6 md:py-4 text-sm md:text-lg font-bold text-white shadow-md transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : editingCowId ? "Update Livestock" : "Add Livestock"}
            </button>
            {editingCowId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center justify-center h-12 rounded-lg bg-gray-600 px-4 py-2 md:px-6 md:py-4 text-sm md:text-base font-semibold text-white transition hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Livestock Inventory */}
        <div className="mt-8 md:mt-12">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold mb-6 hover:bg-green-700 transition"
          >
            + Add New Cow
          </button>
          <h2 className="mb-4 md:mb-6 text-2xl md:text-3xl font-bold text-emerald-900">
            Livestock Inventory
          </h2>
          {isLoading ? (
            <p className="text-gray-700">Loading livestock...</p>
          ) : livestock.length === 0 ? (
            <p className="text-gray-700">No livestock added yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {livestock.map((cow) => (
                <div
                  key={cow.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 md:p-6 shadow-md"
                >
                  {cow.status === "For Sale" ? (
                    <div className="mb-3">
                      <span className="inline-flex rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Live
                      </span>
                    </div>
                  ) : null}
                  {cow.image_url ? (
                    <div className="mb-4 flex items-start gap-2 md:gap-3">
                      <img
                        src={cow.image_url}
                        alt={cow.name}
                        className="h-24 md:h-32 w-2/3 rounded-lg object-cover"
                      />
                      {cow.video_url ? (
                        <video
                          src={cow.video_url}
                          muted
                          loop
                          controls
                          playsInline
                          className="h-24 md:h-32 w-1/3 rounded-lg bg-black object-cover"
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
                        className="h-24 md:h-32 w-full rounded-lg bg-black object-cover"
                      />
                    </div>
                  ) : null}
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-emerald-900">
                    {cow.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Breed: {cow.breed}
                  </p>
                  <p className="text-sm md:text-base text-gray-700">
                    Health: {cow.health_status}
                  </p>
                  <p className="text-sm md:text-base text-gray-700">
                    Status: {cow.status || "Active"}
                  </p>
                  {cow.weight && (
                    <p className="text-sm md:text-base text-gray-700">
                      Weight: {cow.weight} kg
                    </p>
                  )}
                  {cow.age && (
                    <p className="text-sm md:text-base text-gray-700">
                      Age: {cow.age} years
                    </p>
                  )}
                  <p className="mt-2 text-lg md:text-xl lg:text-2xl font-bold text-emerald-900">
                    {cow.price_ksh !== null && cow.price_ksh !== undefined
                      ? `KSh ${cow.price_ksh.toLocaleString()}`
                      : "Price not set"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => editCow(cow)}
                      className="inline-flex items-center justify-center h-10 rounded-lg bg-blue-700 px-2 py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                      <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline ml-1">Edit</span>
                    </button>
                    <button
                      onClick={() => deleteCow(cow.id)}
                      className="inline-flex items-center justify-center h-10 rounded-lg bg-rose-700 px-2 py-2 text-xs md:text-sm font-bold text-white transition hover:bg-rose-800"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline ml-1">Delete</span>
                    </button>
                    <button
                      onClick={() => toggleSaleStatus(cow)}
                      className="inline-flex items-center justify-center h-10 rounded-lg bg-emerald-700 px-2 py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      {cow.status === "For Sale" ? "Unlist" : "Sell"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Cow Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-green-900 mb-6">Add New Cow</h2>
              <form onSubmit={handleAddCow} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Cow Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCow.name}
                    onChange={(e) => setNewCow({...newCow, name: e.target.value})}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter cow name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Breed
                  </label>
                  <input
                    type="text"
                    required
                    value={newCow.breed}
                    onChange={(e) => setNewCow({...newCow, breed: e.target.value})}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter breed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCow.age}
                    onChange={(e) => setNewCow({...newCow, age: e.target.value})}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Price (KSh)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCow.price}
                    onChange={(e) => setNewCow({...newCow, price: e.target.value})}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter price"
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Add Cow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setNewCow({ name: '', breed: '', age: '', price: '' });
                    }}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </>
  );
}
