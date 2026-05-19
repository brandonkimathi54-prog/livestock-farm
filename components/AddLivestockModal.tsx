import React, { useEffect, useMemo, useState } from 'react';
import type { Livestock } from '../src/types';

interface AddLivestockModalProps {
  isOpen: boolean;
  supabase: any;
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
  editingLivestock?: Livestock | null;
}

const LIVESTOCK_MEDIA_BUCKET = 'livestock-media';

const initialFormState = {
  name: '',
  breed: '',
  age: '0',
  liters_per_day: '0',
  price: '0',
  status: 'Available',
  location: '',
  whatsapp_number: '',
  description: '',
};

export default function AddLivestockModal({ isOpen, supabase, onClose, onSuccess, editingLivestock }: AddLivestockModalProps) {
  const [formState, setFormState] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingLivestock) {
      setFormState({
        name: editingLivestock.name ?? '',
        breed: editingLivestock.breed ?? '',
        age: String(editingLivestock.age ?? 0),
        liters_per_day: String(editingLivestock.liters_per_day ?? 0),
        price: String(editingLivestock.price_ksh ?? editingLivestock.price ?? 0),
        status: editingLivestock.status ?? 'Available',
        location: editingLivestock.location ?? '',
        whatsapp_number: editingLivestock.whatsapp_number ?? '',
        description: editingLivestock.description ?? '',
      });
    } else {
      setFormState(initialFormState);
    }

    setPhotoFile(null);
    setVideoFile(null);
    setErrorMessage(null);
  }, [editingLivestock, isOpen]);

  const handleChange = (key: keyof typeof initialFormState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const uploadToBucket = async (bucket: string, userId: string, animalName: string, file: File) => {
    const safeAnimalName = animalName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension ? `.${extension}` : ''}`;
    const filePath = `${userId}/${safeAnimalName || 'livestock'}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData, error: publicUrlError } = await supabase.storage.from(bucket).getPublicUrl(filePath);
    if (publicUrlError || !publicUrlData?.publicUrl) {
      throw new Error(publicUrlError?.message || 'Failed to resolve public URL for uploaded media.');
    }

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!userId) {
      window.location.href = '/login';
      return;
    }

    let image_url: string | null = null;
    let video_url: string | null = null;
    const uploadWarnings: string[] = [];

    if (photoFile) {
      try {
        image_url = await uploadToBucket(LIVESTOCK_MEDIA_BUCKET, userId, formState.name, photoFile);
      } catch (uploadError) {
        uploadWarnings.push(
          uploadError instanceof Error
            ? `Photo upload blocked: ${uploadError.message}`
            : 'Photo upload blocked by storage policy.',
        );
      }
    }

    if (videoFile) {
      try {
        video_url = await uploadToBucket(LIVESTOCK_MEDIA_BUCKET, userId, formState.name, videoFile);
      } catch (uploadError) {
        uploadWarnings.push(
          uploadError instanceof Error
            ? `Video upload blocked: ${uploadError.message}`
            : 'Video upload blocked by storage policy.',
        );
      }
    }

    const livestockData = {
      user_id: userId,
      owner_id: userId,
      name: formState.name,
      breed: formState.breed,
      age: Number(formState.age),
      liters_per_day: Number(formState.liters_per_day || 0),
      price_ksh: Number(formState.price),
      status: formState.status || 'Available',
      location: formState.location,
      whatsapp_number: formState.whatsapp_number,
      description: formState.description,
      image_url: image_url ?? editingLivestock?.image_url ?? null,
      video_url: video_url ?? editingLivestock?.video_url ?? null,
    };

    setSaving(true);

    try {
      const { error } = editingLivestock
        ? await supabase.from('livestock').update(livestockData).eq('id', editingLivestock.id).eq('user_id', userId)
        : await supabase.from('livestock').insert([livestockData]);

      if (error) {
        throw error;
      }

      if (uploadWarnings.length > 0) {
        window.alert(`${uploadWarnings.join(' ')} Livestock saved without blocked media.`);
      }

      onSuccess();
      onClose();
      setFormState(initialFormState);
      setPhotoFile(null);
      setVideoFile(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save livestock');
    } finally {
      setSaving(false);
    }
  };

  const title = editingLivestock ? 'Edit Livestock' : 'Add Livestock';

  const hasFields = useMemo(() => !!formState.name || !!formState.breed || formState.age !== '0', [formState]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2rem] border border-zinc-700 bg-[#24292e]/95 shadow-2xl text-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">Create or update your livestock listing.</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Name</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Breed</span>
                <input
                  type="text"
                  value={formState.breed}
                  onChange={(event) => handleChange('breed', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Age</span>
                <input
                  type="number"
                  min="0"
                  value={formState.age}
                  onChange={(event) => handleChange('age', event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Average Liters/Day</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formState.liters_per_day}
                  onChange={(event) => handleChange('liters_per_day', event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Price (KSH)</span>
                <input
                  type="number"
                  min="0"
                  value={formState.price}
                  onChange={(event) => handleChange('price', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Status</span>
                <select
                  value={formState.status}
                  onChange={(event) => handleChange('status', event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                >
                  <option value="Available">Available</option>
                  <option value="Sold">Sold</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Location</span>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => handleChange('location', event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>

            <label className="space-y-1.5 text-sm text-slate-300">
              <span>WhatsApp Number</span>
              <input
                type="tel"
                value={formState.whatsapp_number}
                onChange={(event) => handleChange('whatsapp_number', event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-300">
              <span>Description</span>
              <textarea
                rows={4}
                value={formState.description}
                onChange={(event) => handleChange('description', event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-300">
                <span>Video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-emerald-500"
                />
              </label>
            </div>

            {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingLivestock ? 'Update Livestock' : 'Save Livestock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
