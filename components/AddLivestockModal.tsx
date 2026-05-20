'use client';

import { useState, FormEvent, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2, X } from 'lucide-react';
import { supabase as defaultSupabase } from '@/lib/supabaseWrapper';

interface EditingLivestock {
  id?: string;
  name?: string;
  breed?: string;
  age?: number | string;
  price_ksh?: number | string;
  price?: number | string;
  location?: string;
  status?: string;
  liters_per_day?: number | string;
  whatsapp_number?: string;
  description?: string;
  image_url?: string;
  video_url?: string;
}

interface AddLivestockModalProps {
  isOpen: boolean;
  userId: string | null;
  editingLivestock: EditingLivestock | null;
  onClose: () => void;
  onSuccess: () => void;
  supabase?: SupabaseClient;
}

interface LivestockFormData {
  name: string;
  breed: string;
  age: string;
  price_ksh: string;
  location: string;
  status: string;
  liters_per_day: string;
  whatsapp_number: string;
  description: string;
}

export default function AddLivestockModal({
  isOpen,
  userId,
  editingLivestock,
  onClose,
  onSuccess,
  supabase,
}: AddLivestockModalProps) {
  const client = supabase ?? defaultSupabase;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<LivestockFormData>({
    name: '',
    breed: '',
    age: '',
    price_ksh: '',
    location: '',
    status: 'Available',
    liters_per_day: '',
    whatsapp_number: '',
    description: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Sync edit data if updating an existing animal
  useEffect(() => {
    if (editingLivestock) {
      setFormData({
        name: editingLivestock.name ?? '',
        breed: editingLivestock.breed ?? '',
        age: editingLivestock.age?.toString() ?? '',
        price_ksh: (editingLivestock.price_ksh ?? editingLivestock.price ?? '').toString(),
        location: editingLivestock.location ?? '',
        status: editingLivestock.status ?? 'Available',
        liters_per_day: editingLivestock.liters_per_day?.toString() ?? '',
        whatsapp_number: editingLivestock.whatsapp_number ?? '',
        description: editingLivestock.description ?? '',
      });
    } else {
      setFormData({
        name: '',
        breed: '',
        age: '',
        price_ksh: '',
        location: '',
        status: 'Available',
        liters_per_day: '',
        whatsapp_number: '',
        description: '',
      });
    }
    setError(null);
    setImageFile(null);
    setVideoFile(null);
  }, [editingLivestock, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Stop form reloading behavior immediately
    
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await client.auth.getUser();
      activeUserId = user?.id ?? null;
    }

    if (!activeUserId) {
      setError('Your active user session could not be resolved. Please refresh or log in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let image_url = editingLivestock?.image_url ?? '';
      let video_url = editingLivestock?.video_url ?? '';

      if (imageFile) {
        try {
          const extension = imageFile.name.split('.').pop() ?? 'jpg';
          const filePath = `uploads/${activeUserId}-${Date.now()}.${extension}`;

          const { error: uploadError } = await client.storage
            .from('livestock-images')
            .upload(filePath, imageFile, { upsert: true });

          if (uploadError) {
            throw uploadError;
          }

          image_url = filePath;
        } catch (uploadErr) {
          setLoading(false);
          setError(
            uploadErr instanceof Error
              ? `Image Upload Failed: Ensure the 'livestock-images' storage bucket exists in your Supabase dashboard. ${uploadErr.message}`
              : "Image Upload Failed: Ensure the 'livestock-images' storage bucket exists in your Supabase dashboard."
          );
          return;
        }
      }

      if (videoFile) {
        try {
          const extension = videoFile.name.split('.').pop() ?? 'mp4';
          const videoPath = `videos/${activeUserId}-video-${Date.now()}.${extension}`;

          const { error: uploadError } = await client.storage
            .from('livestock-images')
            .upload(videoPath, videoFile, { upsert: true });

          if (uploadError) {
            throw uploadError;
          }

          video_url = videoPath;
        } catch (uploadErr) {
          setLoading(false);
          setError(
            uploadErr instanceof Error
              ? `Video Upload Failed: Ensure the 'livestock-images' storage bucket exists in your Supabase dashboard. ${uploadErr.message}`
              : "Video Upload Failed: Ensure the 'livestock-images' storage bucket exists in your Supabase dashboard."
          );
          return;
        }
      }

      const finalPayload = {
        user_id: activeUserId,
        name: formData.name.trim(),
        breed: formData.breed.trim(),
        age: formData.age ? Number(formData.age) : 0,
        price_ksh: formData.price_ksh ? Number(formData.price_ksh) : 0,
        location: formData.location.trim(),
        status: formData.status,
        liters_per_day: formData.liters_per_day ? Number(formData.liters_per_day) : 0,
        whatsapp_number: formData.whatsapp_number.trim(),
        description: formData.description.trim(),
        image_url,
        video_url,
        updated_at: new Date().toISOString(),
      };

      if (editingLivestock?.id) {
        // UPDATE Existing Animal
        const { error: updateError } = await client
          .from('livestock')
          .update(finalPayload)
          .eq('id', editingLivestock.id);

        if (updateError) throw updateError;
      } else {
        // INSERT Fresh Animal
        const { error: insertError } = await client
          .from('livestock')
          .insert([finalPayload]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">
            {editingLivestock ? 'Edit Animal Details' : 'Add New Livestock'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-500/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Input Fields with Explicit High Contrast Text Styling */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              placeholder="e.g. Rose"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Breed</label>
            <input
              type="text"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              placeholder="e.g. Friesian"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Age</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                placeholder="2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Liters/Day</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.liters_per_day}
                onChange={(e) => setFormData({ ...formData, liters_per_day: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                placeholder="8"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Price (KSH) *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.price_ksh}
              onChange={(e) => setFormData({ ...formData, price_ksh: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              placeholder="199999"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              placeholder="e.g. Kutus Farm Section A"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">WhatsApp Number</label>
            <input
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              placeholder="e.g. 0712345678"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition resize-none"
              placeholder="Provide details about health, vaccination, etc."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition appearance-none font-semibold"
              >
                <option value="Available">Available</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Video (Optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving Animal…' : editingLivestock ? 'Save Changes' : 'Add Livestock'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}