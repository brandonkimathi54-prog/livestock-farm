'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';
import type { Livestock } from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const chartColors = ['#22c55e', '#2563eb'];

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    type: '',
    breed: '',
    age: '0',
    price: '0',
    status: 'Available',
    location: '',
    whatsapp_number: '',
    description: '',
  });

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = '/auth';
        return;
      }
      setSession(data.session);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        window.location.href = '/auth';
        return;
      }
      setSession(session);
    });

    return () => listener.subscription?.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const fetchLivestock = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('livestock')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setLivestock(data ?? []);
      }
      setLoading(false);
    };

    fetchLivestock();
  }, [session]);

  const summaryData = useMemo(() => {
    const availableValue = livestock
      .filter((item) => item.status === 'Available')
      .reduce((sum, item) => sum + Number(item.price ?? 0), 0);
    const soldValue = livestock
      .filter((item) => item.status === 'Sold')
      .reduce((sum, item) => sum + Number(item.price ?? 0), 0);

    return [
      { name: 'Available', value: availableValue },
      { name: 'Sold', value: soldValue },
    ];
  }, [livestock]);

  const handleChange = (key: keyof typeof formState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!session?.user?.id) {
      router.replace('/auth');
      return;
    }

    const newRecord = {
      owner_id: session.user.id,
      name: formState.name,
      type: formState.type,
      breed: formState.breed,
      age: Number(formState.age),
      price: Number(formState.price),
      status: formState.status,
      location: formState.location,
      whatsapp_number: formState.whatsapp_number,
      description: formState.description,
    };

    const { error } = await supabase.from('livestock').insert([newRecord]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setShowModal(false);
    setFormState({
      name: '',
      type: '',
      breed: '',
      age: '0',
      price: '0',
      status: 'Available',
      location: '',
      whatsapp_number: '',
      description: '',
    });

    const { data, error: refreshError } = await supabase
      .from('livestock')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('updated_at', { ascending: false });

    const refreshedLivestock = (data ?? []) as Livestock[];

    if (refreshError) {
      setErrorMessage(refreshError.message);
    } else {
      setLivestock(refreshedLivestock);
    }
  };

  return (
    <section className="space-y-8 py-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Secure Dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">Your Farm Inventory</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Manage only the livestock you own and quickly add new stock.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            onClick={() => setShowModal(true)}
          >
            Add New Livestock
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Herd value summary</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summaryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  label
                >
                  {summaryData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => `KSH ${Number(value ?? 0).toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Your livestock</h2>
          {loading ? (
            <p className="mt-4 text-slate-600">Loading your herd...</p>
          ) : livestock.length === 0 ? (
            <p className="mt-4 text-slate-600">No animals have been added yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {livestock.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-500">{item.breed} · {item.status}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">KSH {item.price.toLocaleString()}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Age: {item.age}</span>
                    <span>Location: {item.location ?? 'Unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Add Livestock</h2>
                <p className="mt-2 text-sm text-slate-600">Create a new listing for your farm.</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Breed</span>
                  <input
                    type="text"
                    value={formState.breed}
                    onChange={(event) => handleChange('breed', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Type</span>
                  <input
                    type="text"
                    value={formState.type}
                    onChange={(event) => handleChange('type', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Age</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.age}
                    onChange={(event) => handleChange('age', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Price (KSH)</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.price}
                    onChange={(event) => handleChange('price', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Status</span>
                  <select
                    value={formState.status}
                    onChange={(event) => handleChange('status', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    <option value="Available">Available</option>
                    <option value="Sold">Sold</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Location</span>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => handleChange('location', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span>WhatsApp Number</span>
                <input
                  type="tel"
                  value={formState.whatsapp_number}
                  onChange={(event) => handleChange('whatsapp_number', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                <span>Description</span>
                <textarea
                  value={formState.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Save Livestock
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
