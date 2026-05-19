'use client';



import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';

import { Loader2, MoreVertical } from 'lucide-react';

import { supabase } from '@/lib/supabaseWrapper';

import type { Livestock } from '@/types';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import AddLivestockModal from '@/components/AddLivestockModal';
import DashboardLayout from '@/components/DashboardLayout';
import LivestockDetails from '@/components/LivestockDetails';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};



interface MilkRecord {

  id: string;

  livestock_id: string;

  date: string;

  amount_liters: number;

  milking_session?: string;

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

interface FinancialRow {

  id: string;

  livestock_id: string;

  type: string;

  amount: number;

  description?: string | null;

  date: string;

}



const chartColors = ['#22c55e', '#2563eb'];

const glassCardClass =

  'rounded-3xl border border-white/35 bg-white/20 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:p-8';

const COW_PHOTOS_BUCKET = 'cow photos';
const MARKET_VIDEOS_BUCKET = 'market-videos';

const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

const getPublicMediaUrl = (bucket: string, pathOrUrl?: string | null) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
};

const DEFAULT_MILK_PRICE_STORAGE_KEY = 'farm_default_milk_price_ksh';

/** ISO date (YYYY-MM-DD) for reliable DB ordering and filters. */
function getRecordDateIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatRecordDateForDisplay(raw: string): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return raw;
}

function parseRecordDate(raw: string): Date | null {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00`);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDateInCurrentMonth(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function DashboardPage() {

  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);

  const [livestock, setLivestock] = useState<Livestock[]>([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);

  const [mainView, setMainView] = useState<'inventory' | 'management' | 'settings'>('inventory');

  const [managementTab, setManagementTab] = useState<'milk' | 'health' | 'expenses'>('milk');

  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  const [editingLivestock, setEditingLivestock] = useState<Livestock | null>(null);

  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);

  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);

  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);

  const [financialRows, setFinancialRows] = useState<FinancialRow[]>([]);

  const [recordsLoading, setRecordsLoading] = useState(false);

  const [formState, setFormState] = useState({

    name: '',

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

    morning_liters: '',

    evening_liters: '',

  });

  const [defaultMilkPriceKsh, setDefaultMilkPriceKsh] = useState('60');

  const morningMilkValue = parseFloat(milkForm.morning_liters);
  const eveningMilkValue = parseFloat(milkForm.evening_liters);
  const morningMilk = Number.isFinite(morningMilkValue) ? morningMilkValue : 0;
  const eveningMilk = Number.isFinite(eveningMilkValue) ? eveningMilkValue : 0;
  const totalMilkLitres = morningMilk + eveningMilk;
  const totalMilkRevenue = totalMilkLitres * Number(defaultMilkPriceKsh || 0);

  const [savingSettings, setSavingSettings] = useState(false);

  const [healthForm, setHealthForm] = useState({

    event: '',

    cost: '',

  });

  const [expenseForm, setExpenseForm] = useState({

    category: 'Feed',

    amount: '',

    notes: '',

  });

  const [savingMilk, setSavingMilk] = useState(false);

  const [savingHealth, setSavingHealth] = useState(false);

  const [savingExpense, setSavingExpense] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);



  const getAutoFormattedDate = () => {

    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  };



  useEffect(() => {

    const loadDefaultPrice = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data } = await supabase
          .from('farm_settings')
          .select('default_milk_price')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.default_milk_price != null && !Number.isNaN(Number(data.default_milk_price))) {
          setDefaultMilkPriceKsh(String(Number(data.default_milk_price)));
          return;
        }
      }

      try {
        const raw = window.localStorage.getItem(DEFAULT_MILK_PRICE_STORAGE_KEY);
        if (raw !== null && !Number.isNaN(Number(raw))) {
          setDefaultMilkPriceKsh(String(Number(raw)));
        }
      } catch (e) {
        void e;
      }
    };

    void loadDefaultPrice();

  }, []);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setInstallReady(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);



  useEffect(() => {

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }
      setSession(session);
    });

    return () => listener.subscription?.unsubscribe();

  }, [router]);



  useEffect(() => {

    const fetchLivestock = async () => {

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('livestock')
        .select('*')
        .eq('user_id', user.id)
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

    if (mainView !== 'management' || !livestock.length || selectedLivestock) {

      return;

    }

    setSelectedLivestock(livestock[0]);

  }, [mainView, livestock, selectedLivestock]);



  useEffect(() => {

    setManagementTab('milk');

  }, [mainView]);



  useEffect(() => {

    if (!selectedLivestock?.id || mainView !== 'management') {

      return;

    }



    const fetchManagementRecords = async () => {

      setRecordsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }

      const [milkResponse, healthResponse, expenseResponse, financeResponse] = await Promise.all([

        supabase
          .from('milk_records')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('id', { ascending: false }),

        supabase
          .from('health_records')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('id', { ascending: false }),

        supabase
          .from('expenses')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('id', { ascending: false }),

        supabase
          .from('financials')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('id', { ascending: false }),

      ]);



      if (milkResponse.error || healthResponse.error || expenseResponse.error) {

        setErrorMessage(milkResponse.error?.message ?? healthResponse.error?.message ?? expenseResponse.error?.message ?? null);

      } else {

        setMilkRecords((milkResponse.data ?? []) as MilkRecord[]);

        setHealthRecords((healthResponse.data ?? []) as HealthRecord[]);

        setExpenseRecords((expenseResponse.data ?? []) as ExpenseRecord[]);

        if (!financeResponse.error) {

          setFinancialRows((financeResponse.data ?? []) as FinancialRow[]);

        } else {

          setFinancialRows([]);

        }

      }

      setRecordsLoading(false);

    };



    fetchManagementRecords();

  }, [selectedLivestock?.id, mainView]);



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



  const farmProfitLoss = useMemo(() => {

    const revenue = financialRows

      .filter((row) => (row.type ?? '').toLowerCase() === 'revenue')

      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    const expensesTotal = expenseRecords.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return { revenue, expensesTotal, net: revenue - expensesTotal };

  }, [financialRows, expenseRecords]);



  const monthlyFarmSummary = useMemo(() => {
    const revenue = financialRows
      .filter((row) => (row.type ?? '').toLowerCase() === 'revenue')
      .filter((row) => {
        const d = parseRecordDate(row.date);
        return d ? isDateInCurrentMonth(d) : false;
      })
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    const expensesTotal = expenseRecords
      .filter((row) => {
        const d = parseRecordDate(row.date);
        return d ? isDateInCurrentMonth(d) : false;
      })
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return { revenue, expensesTotal, net: revenue - expensesTotal };
  }, [financialRows, expenseRecords]);



  const handleChange = (key: keyof typeof formState, value: string) => {

    setFormState((current) => ({ ...current, [key]: value }));

  };



  const resetLivestockForm = () => {

    setFormState({

      name: '',

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

    setEditingLivestock(null);

  };



  const handleOpenCreateModal = () => {

    resetLivestockForm();

    setShowModal(true);

  };



  const handleEditLivestock = (item: Livestock) => {

    setEditingLivestock(item);

    setFormState({

      name: item.name ?? '',

      breed: item.breed ?? '',

      age: String(item.age ?? 0),

      liters_per_day: String(item.liters_per_day ?? 0),

      price: String(item.price_ksh ?? item.price ?? 0),

      status: item.status ?? 'Available',

      location: item.location ?? '',

      whatsapp_number: item.whatsapp_number ?? '',

      description: item.description ?? '',

    });

    setPhotoFile(null);

    setVideoFile(null);

    setOpenCardMenuId(null);

    setShowModal(true);

  };



  const deleteLivestock = async (item: Livestock) => {

    const confirmed = window.confirm(`Are you sure you want to remove ${item.name}?`);

    if (!confirmed) return;



    try {

      // Clean up image from storage if it exists

      if (item.image_url) {

        const imagePath = item.image_url;

        const { error: imageError } = await supabase.storage

          .from('cow photos')

          .remove([imagePath]);

        if (imageError) {

          console.warn('Failed to delete image:', imageError.message);

        }

      }



      // Clean up video from storage if it exists

      if (item.video_url) {

        const videoPath = item.video_url;

        const { error: videoError } = await supabase.storage

          .from('market-videos')

          .remove([videoPath]);

        if (videoError) {

          console.warn('Failed to delete video:', videoError.message);

        }

      }



      // Delete the database record

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }

      const { error } = await supabase.from('livestock').delete().eq('id', item.id).eq('user_id', user.id);

      if (error) {

        setErrorMessage(error.message);

        return;

      }



      setLivestock((current) => current.filter((entry) => entry.id !== item.id));

      if (selectedLivestock?.id === item.id) {

        setSelectedLivestock(null);

      }

    } catch (error) {

      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete livestock');

    }

  };

  const markLivestockAvailable = async (item: Livestock) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      window.location.href = '/login';
      return;
    }

    const { error } = await supabase
      .from('livestock')
      .update({ status: 'Available' })
      .eq('id', item.id)
      .eq('user_id', user.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setLivestock((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status: 'Available' } : entry)),
    );

    if (selectedLivestock?.id === item.id) {
      setSelectedLivestock((current) => (current ? { ...current, status: 'Available' } : current));
    }

    setOpenCardMenuId(null);
  };


  const handleMainTabClick = (tab: 'inventory' | 'management' | 'settings') => {

    setMainView(tab);

    setManagementTab('milk');

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

    return filePath;

  };



  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    setErrorMessage(null);



    const {

      data: { user },

      error: userError,

    } = await supabase.auth.getUser();



    if (userError || !user?.id) {

      router.replace('/login');

      return;

    }



    let image_url: string | undefined;

    let video_url: string | undefined;

    const uploadWarnings: string[] = [];



    if (photoFile) {

      try {

        image_url = await uploadToBucket(COW_PHOTOS_BUCKET, user.id, formState.name, photoFile);

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

        video_url = await uploadToBucket(MARKET_VIDEOS_BUCKET, user.id, formState.name, videoFile);

      } catch (uploadError) {

        uploadWarnings.push(

          uploadError instanceof Error

            ? `Video upload blocked: ${uploadError.message}`

            : 'Video upload blocked by storage policy.',

        );

      }

    }




    const livestockData = {

      user_id: user.id,

      owner_id: user.id,

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

    const { error } = editingLivestock

      ? await supabase.from('livestock').update(livestockData).eq('id', editingLivestock.id).eq('user_id', user.id)

      : await supabase.from('livestock').insert([livestockData]);



    if (error) {

      setErrorMessage(error.message);

      return;

    }



    setShowModal(false);

    resetLivestockForm();

    if (uploadWarnings.length > 0) {

      setErrorMessage(`${uploadWarnings.join(' ')} Livestock saved without blocked media.`);

    }

    window.location.reload();

  };



  const handleMilkRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!selectedLivestock?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      window.location.href = '/login';
      return;
    }

    const morningValue = parseFloat(milkForm.morning_liters);

    const eveningValue = parseFloat(milkForm.evening_liters);

    const morning = Number.isFinite(morningValue) ? morningValue : 0;

    const evening = Number.isFinite(eveningValue) ? eveningValue : 0;

    const totalLiters = morning + evening;

    if (totalLiters <= 0) {

      setErrorMessage('Enter morning and/or evening litres (total must be greater than zero).');

      return;

    }

    setSavingMilk(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getRecordDateIso();

      const pricePerLitre = Number(defaultMilkPriceKsh || 0);

      const totalRevenue = totalLiters * pricePerLitre;



      const rows: { livestock_id: string; amount_liters: number; date: string; milking_session: string }[] = [];

      if (morning > 0) {

        rows.push({

          livestock_id: selectedLivestock.id,

          amount_liters: morning,

          date: recordDate,

          milking_session: 'Morning',

        });

      }

      if (evening > 0) {

        rows.push({

          livestock_id: selectedLivestock.id,

          amount_liters: evening,

          date: recordDate,

          milking_session: 'Evening',

        });

      }

      rows.push({

        livestock_id: selectedLivestock.id,

        amount_liters: totalLiters,

        date: recordDate,

        milking_session: 'Day Total',

      });



      const { error: milkError } = await supabase.from('milk_records').insert(rows);

      if (milkError) throw milkError;



      if (totalRevenue > 0) {

        const { error: financeError } = await supabase.from('financials').insert({

          livestock_id: selectedLivestock.id,

          user_id: user.id,

          type: 'revenue',

          amount: totalRevenue,

          description: `Milk revenue: ${totalLiters}L (M ${morning} / E ${evening}) @ KSH ${pricePerLitre}/L`,

          date: recordDate,

        });

        if (financeError) throw financeError;

      }



      setMilkForm({ morning_liters: '', evening_liters: '' });

      setSuccessMessage('Record Saved Successfully');

      setTimeout(() => setSuccessMessage(null), 3000);



      const { data } = await supabase

        .from('milk_records')

        .select('*')

        .eq('livestock_id', selectedLivestock.id)

        .order('id', { ascending: false });

      setMilkRecords((data ?? []) as MilkRecord[]);

      const { data: financeData } = await supabase

        .from('financials')

        .select('*')

        .eq('livestock_id', selectedLivestock.id)

        .order('id', { ascending: false });

      setFinancialRows((financeData ?? []) as FinancialRow[]);
      router.refresh();

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save milk record');

    } finally {

      setSavingMilk(false);

    }

  };



  const handleHealthRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!selectedLivestock?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      window.location.href = '/login';
      return;
    }

    setSavingHealth(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getRecordDateIso();

      const cost = Number(healthForm.cost);



      const { error: healthError } = await supabase.from('health_records').insert({

        livestock_id: selectedLivestock.id,

        event_type: healthForm.event,

        description: `Logged on ${formatRecordDateForDisplay(recordDate)}`,

        cost: cost,

        date: recordDate,

      });



      if (healthError) throw healthError;



      if (cost > 0) {

        const { error: expenseError } = await supabase.from('expenses').insert({

          livestock_id: selectedLivestock.id,

          category: 'Medical/Veterinary',

          amount: cost,

          notes: `Auto from health: ${healthForm.event}`,

          date: recordDate,

        });

        if (expenseError) throw expenseError;

      }



      setHealthForm({ event: '', cost: '' });

      setSuccessMessage('Record Saved Successfully');

      setTimeout(() => setSuccessMessage(null), 3000);



      const { data } = await supabase.from('health_records').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });

      setHealthRecords((data ?? []) as HealthRecord[]);

      const { data: expenseData } = await supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });

      setExpenseRecords((expenseData ?? []) as ExpenseRecord[]);
      router.refresh();

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save health record');

    } finally {

      setSavingHealth(false);

    }

  };



  const handleExpenseRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!selectedLivestock?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      window.location.href = '/login';
      return;
    }

    setSavingExpense(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getRecordDateIso();

      const amount = Number(expenseForm.amount);



      const { error } = await supabase.from('expenses').insert({

        livestock_id: selectedLivestock.id,

        category: expenseForm.category,

        amount,

        notes: expenseForm.notes,

        date: recordDate,

      });



      if (error) throw error;



      setExpenseForm({ category: 'Feed', amount: '', notes: '' });

      setSuccessMessage('Record Saved Successfully');

      setTimeout(() => setSuccessMessage(null), 3000);



      const { data } = await supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('id', { ascending: false });

      setExpenseRecords((data ?? []) as ExpenseRecord[]);
      router.refresh();

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save expense');

    } finally {

      setSavingExpense(false);

    }

  };



  const handleInstallClick = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setInstallReady(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        window.location.href = '/login';
        return;
      }

      const defaultMilkPrice = Number(defaultMilkPriceKsh || 0);
      const { error } = await supabase
        .from('farm_settings')
        .upsert({ user_id: user.id, default_milk_price: defaultMilkPrice }, { onConflict: 'user_id' });

      if (error) throw error;

      setSuccessMessage('Settings saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <DashboardLayout>
      {successMessage ? (

        <div

          role="status"

          className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg"

        >

          {successMessage}

        </div>

      ) : null}



      <section

        className="relative space-y-6 overflow-hidden rounded-3xl px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8"

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

            <h1 className="mt-4 text-3xl font-semibold text-white">Epaphroditus Farm Inventory</h1>

            <p className="mt-3 max-w-2xl text-white/90">Manage only the livestock you own and quickly add new stock.</p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!installReady}
              onClick={() => void handleInstallClick()}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Install App
            </button>

            <button

              type="button"

              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"

              onClick={() => window.location.href = '/chat'}

            >

              🌾 Smart Advisor

            </button>

            <button

              type="button"

              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"

              onClick={handleOpenCreateModal}

            >

              Add New Livestock

            </button>

          </div>

        </div>



        <div className="mt-6 border-b border-white/30">

          <nav className="flex space-x-8">

            {[

              { key: 'inventory', label: 'Inventory' },

              { key: 'management', label: 'Management View' },

              { key: 'settings', label: 'Settings' },

            ].map((tab) => (

              <button

                key={tab.key}

                className={`py-2 px-1 border-b-2 font-medium text-sm ${

                  mainView === tab.key

                    ? 'border-white text-white'

                    : 'border-transparent text-white/75 hover:text-white'

                }`}

                onClick={() => handleMainTabClick(tab.key as 'inventory' | 'management' | 'settings')}

              >

                {tab.label}

              </button>

            ))}

            <a

              href="/records"

              className="py-2 px-1 text-sm font-medium text-white/90 underline-offset-4 hover:text-white hover:underline"

            >

              All Records

            </a>

          </nav>

        </div>

      </div>



      {mainView === 'inventory' && (

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

                    className="relative rounded-3xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50"

                    onClick={() => setSelectedLivestock(item)}

                  >

                    {getPublicMediaUrl('cow photos', item.image_url) ? (
                      <img
                        src={getPublicMediaUrl('cow photos', item.image_url)}
                        alt={`${item.name} photo`}
                        className="mb-3 h-24 w-full rounded-2xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="mb-3 h-24 w-full rounded-2xl bg-slate-200" />
                    )}

                    <button

                      type="button"

                      aria-label={`Open actions for ${item.name}`}

                      className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"

                      onClick={(event) => {

                        event.stopPropagation();

                        setOpenCardMenuId((current) => (current === item.id ? null : item.id));

                      }}

                    >

                      <MoreVertical size={16} />

                    </button>

                    {openCardMenuId === item.id ? (

                      <div

                        className="absolute right-3 top-11 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"

                        onClick={(event) => event.stopPropagation()}

                      >

                        <button

                          type="button"

                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"

                          onClick={() => handleEditLivestock(item)}

                        >

                          Edit

                        </button>

                        <button

                          type="button"

                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"

                          onClick={() => deleteLivestock(item)}

                        >

                          Delete

                        </button>
                        {item.status !== 'Available' ? (
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-600 transition hover:bg-emerald-50"
                            onClick={() => markLivestockAvailable(item)}
                          >
                            Sell to Market
                          </button>
                        ) : null}
                      </div>

                    ) : null}

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



      {mainView === 'settings' && (

        <div className={glassCardClass}>

          <h2 className="text-xl font-semibold text-slate-900">Global configuration</h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">

            Set your default milk price per litre once. All milk revenue in Management uses this value until you change it here.

          </p>

          <div className="mt-6 max-w-md space-y-3">

            <label className="block text-sm font-medium text-slate-700">

              Default milk price (KSH per litre)

              <input

                type="number"

                min="0"

                step="0.01"

                value={defaultMilkPriceKsh}

                onChange={(e) => setDefaultMilkPriceKsh(e.target.value)}

                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"

              />

            </label>

            <button
              type="button"
              disabled={savingSettings}
              onClick={() => void handleSaveSettings()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>

            <a

              href="/records"

              className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"

            >

              Open All Records and reports

            </a>

          </div>

        </div>

      )}



      {mainView === 'management' && (

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

                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 outline-none transition focus:border-slate-400 sm:min-w-64 sm:px-4 sm:py-3"

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

              <div className="space-y-4">

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">This month (all sessions)</p>

                    <p className="mt-2 text-lg font-semibold text-emerald-950">

                      Revenue KSH {monthlyFarmSummary.revenue.toLocaleString()}

                    </p>

                    <p className="text-sm text-emerald-900/90">

                      Expenses KSH {monthlyFarmSummary.expensesTotal.toLocaleString()}

                    </p>

                    <p

                      className={`mt-2 text-2xl font-bold ${monthlyFarmSummary.net >= 0 ? 'text-emerald-800' : 'text-red-700'}`}

                    >

                      Net profit KSH {monthlyFarmSummary.net.toLocaleString()}

                    </p>

                    <p className="mt-1 text-xs text-emerald-900/80">Based on dated records for this animal this calendar month.</p>

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Profit / loss (this animal)</p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">

                      Revenue KSH {farmProfitLoss.revenue.toLocaleString()}

                    </p>

                    <p className="text-sm text-slate-600">

                      Expenses KSH {farmProfitLoss.expensesTotal.toLocaleString()}

                    </p>

                    <p

                      className={`mt-2 text-xl font-bold ${farmProfitLoss.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}

                    >

                      Net KSH {farmProfitLoss.net.toLocaleString()}

                    </p>

                  </div>

                </div>



                <div className="flex flex-wrap gap-2">

                  {[

                    { key: 'milk', label: 'Milk' },

                    { key: 'health', label: 'Health' },

                    { key: 'expenses', label: 'Expenses' },

                  ].map((tab) => (

                    <button

                      key={tab.key}

                      type="button"

                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${

                        managementTab === tab.key ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-700 hover:bg-white'

                      }`}

                      onClick={() => setManagementTab(tab.key as 'milk' | 'health' | 'expenses')}

                    >

                      {tab.label}

                    </button>

                  ))}

                </div>



                {managementTab === 'milk' ? (

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">

                  <h3 className="text-lg font-semibold text-slate-900">Milk Production</h3>

                  <p className="mt-1 text-xs text-slate-600">

                    Default price KSH {Number(defaultMilkPriceKsh || 0).toLocaleString()}/L — change in{' '}

                    <button type="button" className="font-semibold text-emerald-800 underline" onClick={() => handleMainTabClick('settings')}>

                      Settings

                    </button>

                    .

                  </p>

                  <form className="mt-4 space-y-3" onSubmit={handleMilkRecordSubmit}>

                    <div className="grid gap-3 sm:grid-cols-2">

                      <input

                        type="number"

                        min="0"

                        step="0.1"

                        placeholder="Morning litres"

                        value={milkForm.morning_liters}

                        onChange={(event) => setMilkForm((prev) => ({ ...prev, morning_liters: event.target.value }))}

                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"

                      />

                      <input

                        type="number"

                        min="0"

                        step="0.1"

                        placeholder="Evening litres"

                        value={milkForm.evening_liters}

                        onChange={(event) => setMilkForm((prev) => ({ ...prev, evening_liters: event.target.value }))}

                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"

                      />

                    </div>

                    <p className="text-sm font-semibold text-slate-800">

                      Total day litres:{' '}

                      {(Number(milkForm.morning_liters || 0) + Number(milkForm.evening_liters || 0)).toFixed(1)}

                    </p>

                    <p className="text-sm font-medium text-emerald-800">

                      Estimated revenue (default price): KSH{' '}

                      {(

                        (Number(milkForm.morning_liters || 0) + Number(milkForm.evening_liters || 0)) *

                        Number(defaultMilkPriceKsh || 0)

                      ).toLocaleString()}

                    </p>

                    <p className="text-xs text-slate-500">

                      Saves today&apos;s date automatically ({formatRecordDateForDisplay(getRecordDateIso())}).

                    </p>

                    <button

                      type="submit"

                      disabled={savingMilk}

                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"

                    >

                      {savingMilk ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}

                      {savingMilk ? 'Saving…' : 'Save milk record'}

                    </button>

                  </form>

                  <div className="mt-4 overflow-x-auto">

                    <table className="min-w-full text-left text-xs text-slate-700">

                      <thead>

                        <tr className="border-b border-slate-200">

                          <th className="py-2 pr-2">Date</th>

                          <th className="py-2 pr-2">Session</th>

                          <th className="py-2">Litres</th>

                        </tr>

                      </thead>

                      <tbody>

                        {milkRecords.map((record) => (

                          <tr key={record.id} className="border-b border-slate-100">

                            <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>

                            <td className="py-2 pr-2">{record.milking_session ?? '—'}</td>

                            <td className="py-2">{record.amount_liters}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                  </div>

                ) : null}



                {managementTab === 'health' ? (

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">

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

                    <p className="text-xs text-slate-500">

                      Date is saved automatically when you save.

                    </p>

                    <button

                      type="submit"

                      disabled={savingHealth}

                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"

                    >

                      {savingHealth ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}

                      {savingHealth ? 'Saving…' : 'Save health record'}

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

                            <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>

                            <td className="py-2 pr-2">{record.event_type}</td>
                            <td className="py-2">KSH {Number(record.cost ?? 0).toLocaleString()}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                  </div>

                ) : null}



                {managementTab === 'expenses' ? (

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">

                  <h3 className="text-lg font-semibold text-slate-900">Expense Log</h3>

                  <form className="mt-4 space-y-3" onSubmit={handleExpenseRecordSubmit}>

                    <select

                      value={expenseForm.category}

                      onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}

                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"

                    >

                      <option value="Feed">Feed</option>

                      <option value="Labor">Labor</option>

                      <option value="Medical">Medical</option>

                      <option value="Transport">Transport</option>

                      <option value="Utilities">Utilities</option>

                      <option value="Miscellaneous">Miscellaneous</option>

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

                    <p className="text-xs text-slate-500">Date is saved automatically when you save.</p>

                    <button

                      type="submit"

                      disabled={savingExpense}

                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"

                    >

                      {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}

                      {savingExpense ? 'Saving…' : 'Save expense'}

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

                            <td className="py-2 pr-2">{formatRecordDateForDisplay(record.date)}</td>

                            <td className="py-2 pr-2">{record.category}</td>

                            <td className="py-2 pr-2">KSH {record.amount.toLocaleString()}</td>

                            <td className="py-2">{record.notes}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                  </div>

                ) : null}

              </div>

            )}

            {recordsLoading ? <p className="text-sm text-slate-600">Loading management history...</p> : null}

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
            setLivestock((current) =>
              current.map((entry) =>
                entry.id === selectedLivestock.id ? { ...entry, status: 'Available' } : entry,
              ),
            );
          }}
        />

      )}



      {showModal && (
        <AddLivestockModal
          isOpen={showModal}
          supabase={supabase}
          editingLivestock={editingLivestock}
          onClose={() => {
            setShowModal(false);
            resetLivestockForm();
          }}
          onSuccess={() => {
            fetchLivestock();
          }}
        />
      )}



    </section>



  </DashboardLayout>

  );

}

