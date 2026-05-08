'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';
import type { Livestock } from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import LivestockDetails from '@/components/LivestockDetails';

interface MilkRecord {
  id: string;
  livestock_id: string;
  date: string;
  amount_liters: number;
  milking_session: string;
  livestock?: Livestock;
}

interface HealthRecord {
  id: string;
  livestock_id: string;
  event_type: string;
  description: string;
  cost: number;
  date: string;
  livestock?: Livestock;
}

const chartColors = ['#22c55e', '#2563eb'];
const glassCardClass =
  'rounded-3xl border border-white/35 bg-white/20 p-8 shadow-xl shadow-slate-900/10 backdrop-blur-xl';
const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'management'>('inventory');
  const [recordsTab, setRecordsTab] = useState<'milk' | 'health' | 'expenses'>('milk');
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogType, setQuickLogType] = useState<'milk' | 'health'>('milk');
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
  const [quickMilkForm, setQuickMilkForm] = useState({
    livestock_id: '',
    date: '',
    amount_liters: '',
    milking_session: 'Morning',
  });
  const [quickHealthForm, setQuickHealthForm] = useState({
    livestock_id: '',
    event_type: '',
    description: '',
    cost: '',
    date: '',
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
        .eq('user_id', session.user.id)
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
      .reduce((sum, item) => sum + getLivestockPrice(item), 0);
    const soldValue = livestock
      .filter((item) => item.status === 'Sold')
      .reduce((sum, item) => sum + getLivestockPrice(item), 0);
    const totalValue = livestock.reduce((sum, item) => sum + getLivestockPrice(item), 0);

    return [
      { name: 'Available', value: availableValue },
      { name: 'Sold', value: soldValue },
      { name: 'Total', value: totalValue },
    ];
  }, [livestock]);

  const handleChange = (key: keyof typeof formState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const saveLivestock = async (user: Session['user']) => {
    const newRecord = {
      user_id: user.id,
      name: formState.name,
      type: formState.type,
      breed: formState.breed,
      age: Number(formState.age),
      price_ksh: Number(formState.price),
      status: formState.status,
      location: formState.location,
      whatsapp_number: formState.whatsapp_number,
      description: formState.description,
    };

    return supabase.from('livestock').insert([newRecord]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!session?.user?.id) {
      router.replace('/auth');
      return;
    }

    const { error } = await saveLivestock(session.user);

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
    window.location.reload();
  };

  return (
    <section
      className="relative space-y-8 overflow-hidden rounded-3xl px-4 py-8 sm:px-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.28)), url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[2px]" aria-hidden="true" />
      <div className={`${glassCardClass} relative`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/90">Secure Dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Your Farm Inventory</h1>
            <p className="mt-3 max-w-2xl text-white/90">Manage only the livestock you own and quickly add new stock.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            onClick={() => setShowModal(true)}
          >
            Add New Livestock
          </button>
        </div>

        <div className="mt-6 border-b border-white/30">
          <nav className="flex space-x-8">
            {[
              { key: 'inventory', label: 'Inventory' },
              { key: 'management', label: 'Management View' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-white text-white'
                    : 'border-transparent text-white/75 hover:text-white'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="relative grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className={glassCardClass}>
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

          <div className={glassCardClass}>
            <h2 className="text-lg font-semibold text-slate-900">Your livestock</h2>
            {loading ? (
              <p className="mt-4 text-slate-600">Loading your herd...</p>
            ) : livestock.length === 0 ? (
              <p className="mt-4 text-slate-600">No animals have been added yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {livestock.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedLivestock(item)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-500">{item.breed} · {item.status}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">KSH {getLivestockPrice(item).toLocaleString()}</p>
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
      )}

      {activeTab === 'management' && (
        <div className={glassCardClass}>
          {selectedLivestock ? (
            <LivestockDetails livestock={selectedLivestock} onClose={() => setSelectedLivestock(null)} isModal={false} />
          ) : (
            <p className="text-slate-600">Select an animal from the Inventory tab to view and manage its records.</p>
          )}
        </div>
      )}

      {selectedLivestock && activeTab === 'inventory' && (
        <LivestockDetails livestock={selectedLivestock} onClose={() => setSelectedLivestock(null)} isModal={true} />
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className={`w-full max-w-2xl ${glassCardClass}`}>
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

      {selectedLivestock && (
        <LivestockDetails
          livestock={selectedLivestock}
          onClose={() => setSelectedLivestock(null)}
        />
      )}
    </section>
  );
}
