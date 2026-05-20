'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Loader2, MoreVertical } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseWrapper';
import type { } from '@supabase/supabase-js';
import type { Livestock } from '@/types';
import AddLivestockModal from '../../components/AddLivestockModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import DashboardLayout from '../../components/DashboardLayout';
import LivestockDetails from '@/components/LivestockDetails';

// Custom interface for the PWA install event to eliminate strict linting/compilation failures
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface MilkRecord {
  id: string;
  livestock_id: string;
  date: string;
  amount_liters: number;
  revenue_earned?: number;
  milking_session?: string;
}

interface HealthRecord {
  id: string;
  livestock_id: string;
  event_type: string;
  treatment_name?: string;
  description: string;
  cost: number;
  date: string;
}

interface ExpenseRecord {
  id: string;
  livestock_id: string;
  category: string;
  expense_type?: string;
  amount: number;
  notes: string;
  date: string;
}

type MainView = 'inventory' | 'management' | 'settings';
type ManagementTab = 'milk' | 'health' | 'expenses';

const chartColors = ['#22c55e', '#2563eb', '#f59e0b'];
const glassCardClass =
  'rounded-3xl border border-white/20 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl sm:p-8';

function safeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeString(value: unknown, fallback = 'Unknown'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function safeStatus(value: unknown): 'Available' | 'Sold' {
  return value === 'Sold' ? 'Sold' : 'Available';
}

function parseRecordDate(raw?: string | null): Date | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRecordDateForDisplay(raw?: string | null): string {
  const date = parseRecordDate(raw);
  if (!date) {
    return safeString(raw, 'Unknown date');
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getIsoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getPublicMediaUrl(bucket: string, pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const result = supabase.storage.from(bucket).getPublicUrl(pathOrUrl);
  return result.data?.publicUrl ?? '';
}

export default function DashboardPage() {
  const router = useRouter();

  
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);
  const [mainView, setMainView] = useState<MainView>('inventory');
  const [managementTab, setManagementTab] = useState<ManagementTab>('milk');
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Livestock | null>(null);
  const [editingLivestock, setEditingLivestock] = useState<Livestock | null>(null);
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [savingMilk, setSavingMilk] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [defaultMilkPriceKsh, setDefaultMilkPriceKsh] = useState('60');
  const [milkForm, setMilkForm] = useState({ morning_liters: '', evening_liters: '' });
  const [healthForm, setHealthForm] = useState({ event: '', cost: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'Feed', amount: '', notes: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);

  const safeLivestockData = useMemo(
    () => livestock.map((item) => ({
      ...item,
      name: safeString(item.name, 'Unknown'),
      breed: safeString(item.breed, 'Unknown'),
      location: safeString(item.location, 'Not recorded'),
      status: safeStatus(item.status),
      age: safeNumber(item.age),
      price_ksh: safeNumber(item.price_ksh ?? item.price),
      liters_per_day: safeNumber(item.liters_per_day),
    })),
    [livestock],
  );

  const summaryData = useMemo(() => {
    const availableValue = safeLivestockData
      .filter((item) => item.status === 'Available')
      .reduce((sum, item) => sum + item.price_ksh, 0);

    const soldValue = safeLivestockData
      .filter((item) => item.status === 'Sold')
      .reduce((sum, item) => sum + item.price_ksh, 0);

    return [
      { name: 'Available Assets', value: availableValue },
      { name: 'Sold Assets', value: soldValue },
    ];
  }, [safeLivestockData]);

  const farmProfitLoss = useMemo(() => {
    const revenue = milkRecords
      .filter((row) => row.milking_session === 'Day Total')
      .reduce((sum, row) => sum + safeNumber(row.revenue_earned), 0);
    const healthExpenses = healthRecords.reduce((sum, row) => sum + safeNumber(row.cost), 0);
    const expenseTotal = expenseRecords.reduce((sum, row) => sum + safeNumber(row.amount), 0);
    return { revenue, expensesTotal: healthExpenses + expenseTotal, net: revenue - (healthExpenses + expenseTotal) };
  }, [milkRecords, healthRecords, expenseRecords]);

  const monthlyFarmSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const revenue = milkRecords
      .filter((row) => row.milking_session === 'Day Total')
      .filter((row) => {
        const date = parseRecordDate(row.date);
        return date ? date.getFullYear() === currentYear && date.getMonth() === currentMonth : false;
      })
      .reduce((sum, row) => sum + safeNumber(row.revenue_earned), 0);

    const healthExpenses = healthRecords
      .filter((row) => {
        const date = parseRecordDate(row.date);
        return date ? date.getFullYear() === currentYear && date.getMonth() === currentMonth : false;
      })
      .reduce((sum, row) => sum + safeNumber(row.cost), 0);

    const expenseTotal = expenseRecords
      .filter((row) => {
        const date = parseRecordDate(row.date);
        return date ? date.getFullYear() === currentYear && date.getMonth() === currentMonth : false;
      })
      .reduce((sum, row) => sum + safeNumber(row.amount), 0);

    return { revenue, expensesTotal: healthExpenses + expenseTotal, net: revenue - (healthExpenses + expenseTotal) };
  }, [milkRecords, healthRecords, expenseRecords]);

  const defaultMilkValue = safeNumber(defaultMilkPriceKsh);
  const morningMilkValue = safeNumber(milkForm.morning_liters);
  const eveningMilkValue = safeNumber(milkForm.evening_liters);
  const totalMilkLitres = morningMilkValue + eveningMilkValue;
  const totalMilkRevenue = totalMilkLitres * defaultMilkValue;

  const fetchLivestock = useCallback(async (activeUserId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('livestock')
        .select('*')
        .eq('user_id', activeUserId)
        .order('updated_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setLivestock([]);
        return;
      }
      setLivestock((data ?? []) as Livestock[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load herd data.');
      setLivestock([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const editingForModal = editingLivestock
    ? {
        id: editingLivestock.id,
        name: editingLivestock.name ?? '',
        breed: editingLivestock.breed ?? '',
        age: editingLivestock.age ?? '',
        price_ksh: editingLivestock.price_ksh ?? editingLivestock.price ?? '',
        location: editingLivestock.location ?? '',
        status: editingLivestock.status ?? 'Available',
        liters_per_day: editingLivestock.liters_per_day ?? '',
        whatsapp_number: editingLivestock.whatsapp_number ?? '',
        description: editingLivestock.description ?? '',
        image_url: editingLivestock.image_url ?? '',
        video_url: editingLivestock.video_url ?? '',
      }
    : null;

  // BACKGROUND AUTHENTICATION ENGINE — single getUser and direct fetch
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          router.replace('/login');
          return;
        }
        if (!mounted) return;
        setUserId(user.id);
        setAuthChecked(true);
        // Immediately hydrate livestock for the active user
        await fetchLivestock(user.id);
      } catch {
        if (mounted) {
          setErrorMessage('Session confirmation failed. Attempting login redirect...');
          router.replace('/login');
        }
      }
    };
    void init();

    const sub = supabase.auth.onAuthStateChange((_event, sessionValue) => {
      if (sessionValue?.user?.id) {
        setUserId(sessionValue.user.id);
        void fetchLivestock(sessionValue.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => {
      mounted = false;
      if (sub?.data?.subscription) sub.data.subscription.unsubscribe();
    };
  }, [router, fetchLivestock]);

  useEffect(() => {
    if (mainView !== 'management' || !safeLivestockData.length) return;
    setSelectedLivestock((current) => current ?? safeLivestockData[0]);
  }, [mainView, safeLivestockData]);

  useEffect(() => {
    if (!selectedLivestock?.id || mainView !== 'management') return;

    let isMounted = true;
    const fetchManagementRecords = async () => {
      if (isMounted) setRecordsLoading(true);
      setErrorMessage(null);

      try {
        const [milkResponse, healthResponse, expenseResponse] = await Promise.all([
          supabase.from('milk_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false }),
          supabase.from('medical_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false }),
          supabase.from('expense_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false }),
        ]);

        if (milkResponse.error || healthResponse.error || expenseResponse.error) {
          setErrorMessage(
            milkResponse.error?.message || healthResponse.error?.message || expenseResponse.error?.message || null,
          );
          return;
        }

        if (isMounted) {
          setMilkRecords((milkResponse.data ?? []) as MilkRecord[]);
          setHealthRecords((healthResponse.data ?? []) as HealthRecord[]);
          setExpenseRecords((expenseResponse.data ?? []) as ExpenseRecord[]);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load records.');
        setMilkRecords([]);
        setHealthRecords([]);
        setExpenseRecords([]);
      } finally {
        if (isMounted) setRecordsLoading(false);
      }
    };

    void fetchManagementRecords();
    return () => { isMounted = false; };
  }, [mainView, selectedLivestock]);

  const handleOpenCreateModal = () => {
    setEditingLivestock(null);
    setShowModal(true);
  };

  const handleEditLivestock = (item: Livestock) => {
    setEditingLivestock(item);
    setShowModal(true);
  };

  const deleteLivestock = async (item: Livestock) => {
    // deletion is confirmed via DeleteConfirmModal; perform removal once
    setErrorMessage(null);
    try {
      if (item.image_url) {
        await supabase.storage.from('livestock-images').remove([item.image_url]);
      }
      if (item.video_url) {
        await supabase.storage.from('livestock-videos').remove([item.video_url]);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      await supabase.from('market_listings').delete().eq('livestock_id', item.id);
      const { error } = await supabase.from('livestock').delete().eq('id', item.id).eq('user_id', user.id);
      if (error) throw error;
      setLivestock((current) => current.filter((entry) => entry.id !== item.id));
      if (selectedLivestock?.id === item.id) setSelectedLivestock(null);
      // close the modal if it was open
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete livestock.');
    }
  };

  const markLivestockAvailable = async (item: Livestock) => {
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      const { error } = await supabase.from('livestock').update({ status: 'Available' }).eq('id', item.id).eq('user_id', user.id);
      if (error) throw error;
      setLivestock((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: 'Available' } : entry)));
      if (selectedLivestock?.id === item.id) setSelectedLivestock((current) => (current ? { ...current, status: 'Available' } : current));
      setOpenCardMenuId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update listing status.');
    }
  };

  const submitMilkRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;
    setSavingMilk(true);
    setErrorMessage(null);
    try {
      const morning = safeNumber(milkForm.morning_liters);
      const evening = safeNumber(milkForm.evening_liters);
      const totalLiters = morning + evening;
      if (totalLiters <= 0) {
        setErrorMessage('Enter morning and/or evening litres first.');
        setSavingMilk(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      const recordDate = getIsoToday();
        const rows = [];
      if (morning > 0) {
        rows.push({
          livestock_id: selectedLivestock.id,
          user_id: user.id,
          amount_liters: morning,
          date: recordDate,
          milking_session: 'Morning',
        });
      }
      if (evening > 0) {
        rows.push({
          livestock_id: selectedLivestock.id,
          user_id: user.id,
          amount_liters: evening,
          date: recordDate,
          milking_session: 'Evening',
        });
      }
      rows.push({
        livestock_id: selectedLivestock.id,
        user_id: user.id,
        amount_liters: totalLiters,
        revenue_earned: Number((totalLiters * defaultMilkValue).toFixed(2)),
        date: recordDate,
        milking_session: 'Day Total',
      });
      
      const { error: milkError } = await supabase.from('milk_records').insert(rows);
      if (milkError) throw milkError;
      
      setMilkForm({ morning_liters: '', evening_liters: '' });
      setSuccessMessage('Milk record saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      const { data } = await supabase.from('milk_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });
      setMilkRecords((data ?? []) as MilkRecord[]);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save milk record.');
    } finally {
      setSavingMilk(false);
    }
  };

  const submitHealthRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;
    setSavingHealth(true);
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      const recordDate = getIsoToday();
      const cost = safeNumber(healthForm.cost);
      const { error: healthError } = await supabase.from('medical_records').insert({
        livestock_id: selectedLivestock.id,
        user_id: user.id,
        event_type: safeString(healthForm.event, 'Health event'),
        description: `Logged on ${formatRecordDateForDisplay(recordDate)}`,
        cost,
        date: recordDate,
      });
      if (healthError) throw healthError;
      setHealthForm({ event: '', cost: '' });
      setSuccessMessage('Health record saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      const { data } = await supabase.from('medical_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });
      setHealthRecords((data ?? []) as HealthRecord[]);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save health record.');
    } finally {
      setSavingHealth(false);
    }
  };

  const submitExpenseRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLivestock?.id) return;
    setSavingExpense(true);
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      const recordDate = getIsoToday();
      const amount = safeNumber(expenseForm.amount);
      const { error } = await supabase.from('expense_records').insert({
        livestock_id: selectedLivestock.id,
        user_id: user.id,
        category: safeString(expenseForm.category, 'Miscellaneous'),
        amount,
        notes: safeString(expenseForm.notes, 'No notes'),
        date: recordDate,
      });
      if (error) throw error;
      setExpenseForm({ category: 'Feed', amount: '', notes: '' });
      setSuccessMessage('Expense saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      const { data } = await supabase.from('expense_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });
      setExpenseRecords((data ?? []) as ExpenseRecord[]);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save expense.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        router.replace('/login');
        return;
      }
      const { error } = await supabase.from('farm_settings').upsert({ user_id: user.id, default_milk_price: safeNumber(defaultMilkPriceKsh) }, { onConflict: 'user_id' });
      if (error) throw error;
      setSuccessMessage('Settings saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInstallClick = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setInstallReady(false);
  };

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallReady(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  return (
    <DashboardLayout>
      {successMessage ? (
        <div role="status" className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg">
          {successMessage}
        </div>
      ) : null}

      <section className="relative space-y-6 overflow-hidden rounded-3xl px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[2px]" aria-hidden="true" />
      
        <div className={`${glassCardClass} relative`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/90">Secure Dashboard</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Epaphroditus Farm Inventory</h1>
              <p className="mt-3 max-w-2xl text-white/90">Manage only the livestock you own and quickly add new stock.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!installReady}
                onClick={() => void handleInstallClick()}
                className="w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Install App
              </button>
              <button
                type="button"
                className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                onClick={handleOpenCreateModal}
              >
                Add New Livestock
              </button>
            </div>
          </div>

          <div className="mt-6 border-b border-white/30">
            <nav className="flex flex-col gap-3 md:flex-row md:gap-8">
              {[
                { key: 'inventory', label: 'Inventory' },
                { key: 'management', label: 'Management View' },
                { key: 'settings', label: 'Settings' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`py-2 px-1 border-b-2 font-semibold text-sm transition-all ${
                    mainView === tab.key ? 'border-white text-white scale-105' : 'border-transparent text-white/75 hover:text-white'
                  }`}
                  onClick={() => {
                    setMainView(tab.key as MainView);
                    setManagementTab('milk');
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <a href="/records" className="py-2 px-1 text-sm font-medium text-white/90 underline-offset-4 hover:text-white hover:underline">
                All Records
              </a>
            </nav>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        {mainView === 'inventory' && (
          <div className="relative grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            {/* HERD VALUE SUMMARY CARD */}
            <div className={glassCardClass}>
              <h2 className="text-xl font-bold text-white tracking-tight">Herd value summary</h2>
              <div className="mt-6 h-72">
                {loading && !authChecked ? (
                  <div className="flex h-full items-center justify-center text-white/50 text-sm">Syncing system session...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summaryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} label>
                        {summaryData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => `KSH ${safeNumber(value).toLocaleString()}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#ffffff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* YOUR LIVESTOCK SUMMARY CARD */}
            <div className={glassCardClass}>
              <h2 className="text-xl font-bold text-white tracking-tight">Your livestock</h2>
              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Loading asset ledger...</span>
                </div>
              ) : safeLivestockData.length === 0 ? (
                <p className="mt-4 text-white/60 text-sm">No animals have been added yet.</p>
              ) : (
                <div className="mt-6 space-y-4 max-h-[22rem] overflow-y-auto pr-1">
                  {safeLivestockData.map((item) => (
                    <div
                      key={item.id}
                      className="relative rounded-2xl border border-white/10 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-900/60 transition"
                      onClick={() => setSelectedLivestock(item)}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPublicMediaUrl('livestock-images', item.image_url)}
                          alt={`${item.name} photo`}
                          className="mb-3 h-24 w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="mb-3 h-24 w-full rounded-xl bg-slate-800/50 flex items-center justify-center text-xs text-white/40">No Image</div>
                      )}
                      <button
                        type="button"
                        aria-label={`Open actions for ${item.name}`}
                        className="absolute right-3 top-3 rounded-full p-1.5 text-white/60 transition hover:bg-slate-800 hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenCardMenuId((current) => (current === item.id ? null : item.id));
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openCardMenuId === item.id ? (
                        <div className="absolute right-3 top-11 z-20 w-36 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-xl" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/90 transition hover:bg-slate-800"
                            onClick={() => handleEditLivestock(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-950/50"
                            onClick={() => {
                              setDeleteTarget(item);
                              setShowDeleteModal(true);
                            }}
                          >
                            Delete
                          </button>
                          {item.status !== 'Available' ? (
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-400 transition hover:bg-emerald-950/50"
                              onClick={() => markLivestockAvailable(item)}
                            >
                              Sell to Market
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-white">{item.name}</h3>
                          <p className="text-xs text-white/60">{item.breed} · <span className={item.status === 'Available' ? 'text-emerald-400' : 'text-amber-400'}>{item.status}</span></p>
                        </div>
                        <p className="text-sm font-black text-emerald-400">KSH {item.price_ksh.toLocaleString()}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70 border-t border-white/5 pt-2">
                        <span>Age: <strong className="text-white">{item.age} yrs</strong></span>
                        <span>Location: <strong className="text-white">{item.location}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mainView === 'settings' && (
          <div className={glassCardClass}>
            <h2 className="text-xl font-bold text-white tracking-tight">Global configuration</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Set your default milk price per litre once. All milk revenue in Management uses this value until you change it here.
            </p>
            <div className="mt-6 max-w-md space-y-4">
              <label className="block text-sm font-medium text-white/90">
                Default milk price (KSH per litre)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultMilkPriceKsh}
                  onChange={(e) => setDefaultMilkPriceKsh(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => void handleSaveSettings()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {savingSettings ? 'Saving…' : 'Save settings'}
              </button>
              <a href="/records" className="inline-flex w-full items-center justify-center rounded-full bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition">
                Open All Records and reports
              </a>
            </div>
          </div>
        )}

        {mainView === 'management' && (
          <div className={glassCardClass}>
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Management records</h2>
                  <p className="text-sm text-white/70">Track milk production, health treatments, and expenses for each animal.</p>
                </div>
                <label className="text-sm text-white/90 w-full sm:w-auto">
                  <span className="mb-2 block font-medium">Selected animal</span>
                  <select
                    value={selectedLivestock?.id ?? ''}
                    onChange={(event) => {
                      const selected = safeLivestockData.find((item) => item.id === event.target.value) ?? null;
                      setSelectedLivestock(selected);
                    }}
                    className="w-full rounded-2xl border border-white/20 bg-slate-900 text-slate-100 font-semibold px-3 py-2 outline-none transition focus:border-emerald-500 sm:min-w-[18rem] sm:px-4 sm:py-3 appearance-none"
                    style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                  >
                    {safeLivestockData.length === 0 ? (
                      <option value="" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>No animals available</option>
                    ) : (
                      safeLivestockData.map((item) => (
                        <option key={item.id} value={item.id} style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
                          {item.name} ({item.breed})
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>

              {!selectedLivestock ? (
                <p className="text-white/60 text-sm">Add livestock first, then select an animal to begin record-keeping.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 backdrop-blur-md">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">This month (all sessions)</p>
                      <p className="mt-2 text-lg font-bold text-white">Revenue KSH {monthlyFarmSummary.revenue.toLocaleString()}</p>
                      <p className="text-sm text-white/70">Expenses KSH {monthlyFarmSummary.expensesTotal.toLocaleString()}</p>
                      <p className={`mt-2 text-2xl font-black ${monthlyFarmSummary.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Net profit KSH {monthlyFarmSummary.net.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[10px] text-white/40">Based on dated records for this animal this calendar month.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50">Profit / loss (all time)</p>
                      <p className="mt-2 text-lg font-bold text-white">Revenue KSH {farmProfitLoss.revenue.toLocaleString()}</p>
                      <p className="text-sm text-white/70">Expenses KSH {farmProfitLoss.expensesTotal.toLocaleString()}</p>
                      <p className={`mt-2 text-xl font-black ${farmProfitLoss.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Net KSH {farmProfitLoss.net.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                    {[
                      { key: 'milk', label: 'Milk logs' },
                      { key: 'health', label: 'Medical History' },
                      { key: 'expenses', label: 'Expenses' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                          managementTab === tab.key ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-950/50 text-white/80 hover:bg-slate-900'
                        }`}
                        onClick={() => setManagementTab(tab.key as ManagementTab)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {managementTab === 'milk' ? (
                    <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-white">Milk Production</h3>
                      <p className="mt-1 text-xs text-white/60">
                        Default price KSH {defaultMilkValue.toLocaleString()}/L — change in{' '}
                        <button type="button" className="font-semibold text-emerald-400 underline" onClick={() => setMainView('settings')}>
                          Settings
                        </button>.
                      </p>
                      <form className="mt-4 space-y-3" onSubmit={submitMilkRecord}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Morning litres"
                            value={milkForm.morning_liters}
                            onChange={(event) => setMilkForm((prev) => ({ ...prev, morning_liters: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Evening litres"
                            value={milkForm.evening_liters}
                            onChange={(event) => setMilkForm((prev) => ({ ...prev, evening_liters: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                        </div>
                        <p className="text-sm font-semibold text-white/90">Total day litres: {totalMilkLitres.toFixed(1)}</p>
                        <p className="text-sm font-bold text-emerald-400">Estimated revenue: KSH {totalMilkRevenue.toLocaleString()}</p>
                        <p className="text-[11px] text-white/40">Saves today&apos;s date automatically ({formatRecordDateForDisplay(getIsoToday())}).</p>
                        <button
                          type="submit"
                          disabled={savingMilk}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingMilk ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                          {savingMilk ? 'Saving…' : 'Save milk record'}
                        </button>
                      </form>
                      <div className="mt-4 overflow-x-auto max-h-48">
                        <table className="min-w-full text-left text-xs text-slate-200">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400">
                              <th className="py-2 pr-2 font-semibold">Date</th>
                              <th className="py-2 pr-2 font-semibold">Session</th>
                              <th className="py-2 font-semibold">Litres</th>
                            </tr>
                          </thead>
                          <tbody>
                            {milkRecords.map((record) => (
                              <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>
                                <td className="py-2 pr-2">{safeString(record.milking_session, '—')}</td>
                                <td className="py-2 text-emerald-400 font-bold">{safeNumber(record.amount_liters)} L</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {managementTab === 'health' ? (
                    <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-white">Health Tracker</h3>
                      <form className="mt-4 space-y-3" onSubmit={submitHealthRecord}>
                        <input
                          type="text"
                          required
                          placeholder="Medical event (e.g. Vaccination, Deworming)"
                          value={healthForm.event}
                          onChange={(event) => setHealthForm((prev) => ({ ...prev, event: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="Cost (KSH)"
                          value={healthForm.cost}
                          onChange={(event) => setHealthForm((prev) => ({ ...prev, cost: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={savingHealth}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingHealth ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                          {savingHealth ? 'Saving…' : 'Save health record'}
                        </button>
                      </form>
                      <div className="mt-4 overflow-x-auto max-h-48">
                        <table className="min-w-full text-left text-xs text-slate-200">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400">
                              <th className="py-2 pr-2 font-semibold">Date</th>
                              <th className="py-2 pr-2 font-semibold">Event</th>
                              <th className="py-2 font-semibold">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {healthRecords.map((record) => (
                              <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>
                                <td className="py-2 pr-2 font-medium">{safeString(record.event_type ?? record.treatment_name, 'Health')}</td>
                                <td className="py-2 text-red-400 font-bold">KSH {safeNumber(record.cost).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {managementTab === 'expenses' ? (
                    <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-white">Expense Log</h3>
                      <form className="mt-4 space-y-3" onSubmit={submitExpenseRecord}>
                        <select
                          value={expenseForm.category}
                          onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}
                          className="w-full rounded-xl border border-white/20 bg-slate-900 text-slate-100 font-semibold px-3 py-2 text-sm outline-none focus:border-emerald-500 appearance-none"
                          style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                        >
                          <option value="Feed" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Feed</option>
                          <option value="Labor" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Labor</option>
                          <option value="Medical" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Medical</option>
                          <option value="Transport" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Transport</option>
                          <option value="Utilities" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Utilities</option>
                          <option value="Miscellaneous" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Miscellaneous</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="Amount (KSH)"
                          value={expenseForm.amount}
                          onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={expenseForm.notes}
                          onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={savingExpense}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                          {savingExpense ? 'Saving…' : 'Save expense'}
                        </button>
                      </form>
                      <div className="mt-4 overflow-x-auto max-h-48">
                        <table className="min-w-full text-left text-xs text-slate-200">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400">
                              <th className="py-2 pr-2 font-semibold">Date</th>
                              <th className="py-2 pr-2 font-semibold">Category</th>
                              <th className="py-2 pr-2 font-semibold">Amount</th>
                              <th className="py-2 font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenseRecords.map((record) => (
                              <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>
                                <td className="py-2 pr-2">{safeString(record.category ?? record.expense_type, 'Miscellaneous')}</td>
                                <td className="py-2 pr-2 text-red-400 font-bold">KSH {safeNumber(record.amount).toLocaleString()}</td>
                                <td className="py-2 text-white/60">{safeString(record.notes, '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {recordsLoading ? <p className="text-xs text-white/50">Loading management history...</p> : null}
            </div>
          </div>
        )}

        {selectedLivestock && mainView === 'inventory' && (
          <LivestockDetails
            livestock={selectedLivestock}
            onClose={() => setSelectedLivestock(null)}
            isModal={true}
            onStatusUpdate={() => {
              setSelectedLivestock((current) => (current ? { ...current, status: 'Available' } : current));
              setLivestock((current) => current.map((entry) => (entry.id === selectedLivestock.id ? { ...entry, status: 'Available' } : entry)));
            }}
          />
        )}

        {showModal && (
          <AddLivestockModal
            isOpen={showModal}
            supabase={supabase as unknown as SupabaseClient}
            userId={userId}
            editingLivestock={editingForModal}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              if (userId) void fetchLivestock(userId);
            }}
          />
        )}
        {showDeleteModal && (
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            item={deleteTarget}
            onCancel={() => {
              setShowDeleteModal(false);
              setDeleteTarget(null);
            }}
            onConfirm={(item) => {
              void deleteLivestock(item);
            }}
          />
        )}
      </section>
    </DashboardLayout>
  );
}