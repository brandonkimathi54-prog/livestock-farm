'use client';

import { useState, useEffect, FormEvent } from 'react';
import type { Livestock } from '@/types';

interface AddLivestockModalProps {
  isOpen: boolean;
  supabase: any;
  userId: string | null;
  editingLivestock?: Livestock | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddLivestockModal({
  isOpen,
  supabase,
  userId,
  editingLivestock,
  onClose,
  onSuccess,
}: AddLivestockModalProps) {
  const [formState, setFormState] = useState({
    name: '',
    breed: '',
    age: '',
    liters_per_day: '',
    price: '',
    status: 'Available' as const,
    location: '',
    whatsapp_number: '',
    description: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = !!editingLivestock;

  // Reset/Populate form
  useEffect(() => {
    if (editingLivestock) {
      setFormState({
        name: editingLivestock.name ?? '',
        breed: editingLivestock.breed ?? '',
        age: String(editingLivestock.age ?? 0),
        liters_per_day: String(editingLivestock.liters_per_day ?? 0),
        price: String(editingLivestock.price_ksh ?? editingLivestock.price ?? 0),
        status: (editingLivestock.status as 'Available' | 'Sold') ?? 'Available',
        location: editingLivestock.location ?? '',
        whatsapp_number: editingLivestock.whatsapp_number ?? '',
        description: editingLivestock.description ?? '',
      });
    } else {
      setFormState({
        name: '', breed: '', age: '', liters_per_day: '', price: '',
        status: 'Available', location: '', whatsapp_number: '', description: '',
      });
    }
    setPhotoFile(null);
    setVideoFile(null);
    setErrorMessage(null);
  }, [editingLivestock]);

  const handleChange = (key: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const uploadMedia = async (bucket: string, file: File, userId: string) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    if (!userId) {
      window.location.href = '/login';
      return;
    }

    let image_url = editingLivestock?.image_url || '';
    let video_url = editingLivestock?.video_url || '';

    try {
      // Upload Image
      if (photoFile) {
        image_url = await uploadMedia('livestock-images', photoFile, userId);
      }

      // Upload Video
      if (videoFile) {
        video_url = await uploadMedia('livestock-videos', videoFile, userId);
      }

      const payload = {
        name: formState.name,
        breed: formState.breed,
        age: parseInt(formState.age) || 0,
        liters_per_day: parseFloat(formState.liters_per_day) || 0,
        price_ksh: parseFloat(formState.price) || 0,
        status: formState.status,
        location: formState.location,
        whatsapp_number: formState.whatsapp_number,
        description: formState.description,
        image_url,
        video_url,
        user_id: userId,
      };

      let error: any = null;

      if (isEditing && editingLivestock?.id) {
        const { error: updateError } = await supabase
          .from('livestock')
          .update(payload)
          .eq('id', editingLivestock.id)
          .eq('user_id', userId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('livestock')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to save livestock. Check storage permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold text-slate-900">
          {isEditing ? 'Edit Livestock' : 'Add New Livestock'}
        </h2>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
            <input
              type="text"
              value={formState.breed}
              onChange={(e) => handleChange('breed', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={formState.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Liters/Day</label>
              <input
                type="number"
                step="0.1"
                value={formState.liters_per_day}
                onChange={(e) => handleChange('liters_per_day', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price (KSH) *</label>
            <input
              type="number"
              required
              value={formState.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formState.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            >
              <option value="Available">Available</option>
              <option value="Sold">Sold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={formState.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
            <input
              type="tel"
              value={formState.whatsapp_number}
              onChange={(e) => handleChange('whatsapp_number', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formState.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Video (Optional)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-full bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Livestock' : 'Add Livestock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}