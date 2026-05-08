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

interface ExpenseRecord {
  id: string;
  livestock_id: string;
  category: string;
  amount: number;
  notes: string;
  date: string;
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
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    type: '',
    breed: '',
    age: '0',
    liters_per_day: '0',
    price: '0',
    status: 'Available',
    location: '',
    whatsapp_number: '',
    description: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [milkForm, setMilkForm] = useState({
    date: '',
    amount_liters: '',
  });
  const [healthForm, setHealthForm] = useState({
    event: '',
    cost: '',
    date: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    category: 'Feed',
    amount: '',
    notes: '',
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

  useEffect(() => {
    if (activeTab !== 'management' || !livestock.length || selectedLivestock) {
      return;
    }
    setSelectedLivestock(livestock[0]);
  }, [activeTab, livestock, selectedLivestock]);

  useEffect(() => {
    if (!selectedLivestock?.id || activeTab !== 'management') {
      return;
    }

    const fetchManagementRecords = async () => {
      setRecordsLoading(true);
      const [milkResponse, healthResponse, expenseResponse] = await Promise.all([
        supabase.from('milk_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false }),
        supabase.from('health_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false }),
      ]);

      if (milkResponse.error || healthResponse.error || expenseResponse.error) {
        setErrorMessage(milkResponse.error?.message ?? healthResponse.error?.message ?? expenseResponse.error?.message ?? null);
      } else {
        setMilkRecords((milkResponse.data ?? []) as MilkRecord[]);
        setHealthRecords((healthResponse.data ?? []) as HealthRecord[]);
        setExpenseRecords((expenseResponse.data ?? []) as ExpenseRecord[]);
      }
      setRecordsLoading(false);
    };

    fetchManagementRecords();
  }, [selectedLivestock, activeTab]);

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

  const uploadToBucket = async (bucket: string, userId: string, animalName: string, file: File) => {
    const safeAnimalName = animalName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension ? `.${extension}` : ''}`;
    const filePath = `${userId}/${safeAnimalName || 'livestock'}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveLivestock = async (user: Session['user'], mediaUrls?: { image_url?: string; video_url?: string }) => {
    const isBullOrHeifer = /bull|heifer/i.test(formState.type);
    const newRecord = {
      user_id: user.id,
      owner_id: user.id,
      name: formState.name,
      type: formState.type,
      breed: formState.breed,
      age: Number(formState.age),
      liters_per_day: isBullOrHeifer ? 0 : Number(formState.liters_per_day || 0),
      price_ksh: Number(formState.price),
      status: formState.status || 'Available',
      location: formState.location,
      whatsapp_number: formState.whatsapp_number,
      description: formState.description,
      image_url: mediaUrls?.image_url ?? null,
      video_url: mediaUrls?.video_url ?? null,
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

    let image_url: string | undefined;
    let video_url: string | undefined;
    const uploadWarnings: string[] = [];

    if (photoFile) {
      try {
        image_url = await uploadToBucket('cow-photos', session.user.id, formState.name, photoFile);
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
        video_url = await uploadToBucket('market-videos', session.user.id, formState.name, videoFile);
      } catch (uploadError) {
        uploadWarnings.push(
          uploadError instanceof Error
            ? `Video upload blocked: ${uploadError.message}`
            : 'Video upload blocked by storage policy.',
        );
      }
    }

    const { error } = await saveLivestock(session.user, { image_url, video_url });

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
      liters_per_day: '0',
      price: '0',
      status: 'Available',
      location: '',
      whatsapp_number: '',
      description: '',
    });
    setPhotoFile(null);
    setVideoFile(null);
    if (uploadWarnings.length > 0) {
      setErrorMessage(`${uploadWarnings.join(' ')} Livestock saved without blocked media.`);
    }
    window.location.reload();
  };

  const handleMilkRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;

    const { error } = await supabase.from('milk_records').insert({
      livestock_id: selectedLivestock.id,
      amount_liters: Number(milkForm.amount_liters),
      date: milkForm.date,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMilkForm({ date: '', amount_liters: '' });
    const { data } = await supabase.from('milk_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });
    setMilkRecords((data ?? []) as MilkRecord[]);
  };

  const handleHealthRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;

    const { error } = await supabase.from('health_records').insert({
      livestock_id: selectedLivestock.id,
      event_type: healthForm.event,
      cost: Number(healthForm.cost),
      date: healthForm.date,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setHealthForm({ event: '', cost: '', date: '' });
    const { data } = await supabase.from('health_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });
    setHealthRecords((data ?? []) as HealthRecord[]);
  };

  const handleExpenseRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;

    const { error } = await supabase.from('expenses').insert({
      livestock_id: selectedLivestock.id,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      notes: expenseForm.notes,
      date: expenseForm.date,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setExpenseForm({ category: 'Feed', amount: '', notes: '', date: '' });
    const { data } = await supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });
    setExpenseRecords((data ?? []) as ExpenseRecord[]);
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
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Management records</h2>
                <p className="text-sm text-slate-600">Track milk production, health treatments, and expenses for each animal.</p>
              </div>
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-medium">Selected animal</span>
                <select
                  value={selectedLivestock?.id ?? ''}
                  onChange={(event) => {
                    const picked = livestock.find((item) => item.id === event.target.value) ?? null;
                    setSelectedLivestock(picked);
                  }}
                  className="w-full min-w-64 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-slate-400"
                >
                  {livestock.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.breed})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!selectedLivestock ? (
              <p className="text-slate-600">Add livestock first, then select an animal to begin record-keeping.</p>
            ) : (
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Milk Production</h3>
                  <form className="mt-4 space-y-3" onSubmit={handleMilkRecordSubmit}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      placeholder="Liters"
                      value={milkForm.amount_liters}
                      onChange={(event) => setMilkForm((prev) => ({ ...prev, amount_liters: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="date"
                      required
                      value={milkForm.date}
                      onChange={(event) => setMilkForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Save milk record
                    </button>
                  </form>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-2">Date</th>
                          <th className="py-2">Liters</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milkRecords.map((record) => (
                          <tr key={record.id} className="border-b border-slate-100">
                            <td className="py-2 pr-2">{record.date}</td>
                            <td className="py-2">{record.amount_liters}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Health Tracker</h3>
                  <form className="mt-4 space-y-3" onSubmit={handleHealthRecordSubmit}>
                    <input
                      type="text"
                      required
                      placeholder="Event"
                      value={healthForm.event}
                      onChange={(event) => setHealthForm((prev) => ({ ...prev, event: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Cost (KSH)"
                      value={healthForm.cost}
                      onChange={(event) => setHealthForm((prev) => ({ ...prev, cost: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="date"
                      required
                      value={healthForm.date}
                      onChange={(event) => setHealthForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Save health record
                    </button>
                  </form>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-2">Date</th>
                          <th className="py-2 pr-2">Event</th>
                          <th className="py-2">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {healthRecords.map((record) => (
                          <tr key={record.id} className="border-b border-slate-100">
                            <td className="py-2 pr-2">{record.date}</td>
                            <td className="py-2 pr-2">{record.event_type}</td>
                            <td className="py-2">KSH {Number(record.cost ?? 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Expense Log</h3>
                  <form className="mt-4 space-y-3" onSubmit={handleExpenseRecordSubmit}>
                    <select
                      value={expenseForm.category}
                      onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="Feed">Feed</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Amount (KSH)"
                      value={expenseForm.amount}
                      onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={expenseForm.notes}
                      onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Save expense
                    </button>
                  </form>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-2">Date</th>
                          <th className="py-2 pr-2">Category</th>
                          <th className="py-2 pr-2">Amount</th>
                          <th className="py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRecords.map((record) => (
                          <tr key={record.id} className="border-b border-slate-100">
                            <td className="py-2 pr-2">{record.date}</td>
                            <td className="py-2 pr-2">{record.category}</td>
                            <td className="py-2 pr-2">KSH {record.amount.toLocaleString()}</td>
                            <td className="py-2">{record.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {recordsLoading ? <p className="text-sm text-slate-600">Loading management history...</p> : null}
          </div>
        </div>
      )}

      {selectedLivestock && activeTab === 'inventory' && (
        <LivestockDetails livestock={selectedLivestock} onClose={() => setSelectedLivestock(null)} isModal={true} />
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 ${glassCardClass}`}>
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

            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1.5 text-sm text-slate-700">
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

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Type</span>
                  <input
                    type="text"
                    value={formState.type}
                    onChange={(event) => handleChange('type', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1.5 text-sm text-slate-700">
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
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Average Liters/Day</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formState.liters_per_day}
                    onChange={(event) => handleChange('liters_per_day', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1.5 text-sm text-slate-700">
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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
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
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Location</span>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => handleChange('location', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-sm text-slate-700">
                <span>WhatsApp Number</span>
                <input
                  type="tel"
                  value={formState.whatsapp_number}
                  onChange={(event) => handleChange('whatsapp_number', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Description</span>
                <textarea
                  value={formState.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-slate-400"
                  />
                </label>
              </div>

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
