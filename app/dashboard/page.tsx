'use client';



import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';

import { Loader2, MoreVertical } from 'lucide-react';

import { supabase } from '@/lib/supabaseWrapper';

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

  'rounded-3xl border border-white/35 bg-white/20 p-8 shadow-xl shadow-slate-900/10 backdrop-blur-xl';

const COW_PHOTOS_BUCKET = 'cow photos';
const MARKET_VIDEOS_BUCKET = 'market-videos';

const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

const getPublicMediaUrl = (bucket: string, pathOrUrl?: string | null) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
};

export default function DashboardPage() {

  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  const [livestock, setLivestock] = useState<Livestock[]>([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);

  const [mainView, setMainView] = useState<'inventory' | 'management'>('inventory');

  const [activeTab, setActiveTab] = useState<'inventory' | 'management'>('inventory');

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

    amount_liters: '',

    price_per_litre: '',

  });

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

  const [feedBagsRemaining, setFeedBagsRemaining] = useState(50);



  const getAutoFormattedDate = () => {

    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  };



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

    try {

      const raw = window.localStorage.getItem('farm_feed_bags_remaining');

      if (raw !== null && !Number.isNaN(Number(raw))) {

        setFeedBagsRemaining(Number(raw));

      }

    } catch {

      /* ignore */

    }

  }, []);



  useEffect(() => {

    try {

      window.localStorage.setItem('farm_feed_bags_remaining', String(feedBagsRemaining));

    } catch {

      /* ignore */

    }

  }, [feedBagsRemaining]);



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

    if (mainView !== 'management' || !livestock.length || selectedLivestock) {

      return;

    }

    setSelectedLivestock(livestock[0]);

  }, [mainView, livestock, selectedLivestock]);



  useEffect(() => {

    if (mainView === 'inventory') {

      setActiveTab('inventory');

    }

    setManagementTab('milk');

  }, [mainView]);



  useEffect(() => {

    if (!selectedLivestock?.id || mainView !== 'management') {

      return;

    }



    const fetchManagementRecords = async () => {

      setRecordsLoading(true);

      const [milkResponse, healthResponse, expenseResponse, financeResponse] = await Promise.all([

        supabase
          .from('milk_records')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('date', { ascending: false }),

        supabase
          .from('health_records')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('date', { ascending: false }),

        supabase
          .from('expenses')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('date', { ascending: false }),

        supabase
          .from('financials')
          .select('*')
          .eq('livestock_id', selectedLivestock.id)
          .order('date', { ascending: false }),

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

  }, [selectedLivestock, mainView]);



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

      const { error } = await supabase.from('livestock').delete().eq('id', item.id);

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
    if (!session?.user?.id) {
      setErrorMessage('Unable to update availability. Please sign in again.');
      return;
    }

    const { error } = await supabase
      .from('livestock')
      .update({ status: 'Available' })
      .eq('id', item.id)
      .eq('user_id', session.user.id);

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


  const handleMainTabClick = (tab: 'inventory' | 'management') => {

    setMainView(tab);

    if (tab === 'inventory') {

      setActiveTab('inventory');

    }

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

      router.replace('/auth');

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

    if (!selectedLivestock?.id || !session?.user?.id) return;

    setSavingMilk(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getAutoFormattedDate();

      const liters = Number(milkForm.amount_liters);

      const pricePerLitre = Number(milkForm.price_per_litre || 0);

      const totalRevenue = liters * pricePerLitre;



      const { error: milkError } = await supabase.from('milk_records').insert({

        livestock_id: selectedLivestock.id,

        amount_liters: liters,

        date: recordDate,

      });



      if (milkError) throw milkError;



      if (totalRevenue > 0) {

        const { error: financeError } = await supabase.from('financials').insert({

          livestock_id: selectedLivestock.id,

          user_id: session.user.id,

          type: 'revenue',

          amount: totalRevenue,

          description: `Milk revenue: ${liters}L @ KSH ${pricePerLitre}/L`,

          date: recordDate,

        });

        if (financeError) throw financeError;

      }



      setMilkForm({ amount_liters: '', price_per_litre: '' });

      setSuccessMessage('Record Saved Successfully');

      setTimeout(() => setSuccessMessage(null), 3000);



      const { data } = await supabase.from('milk_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });

      setMilkRecords((data ?? []) as MilkRecord[]);

      const { data: financeData } = await supabase

        .from('financials')

        .select('*')

        .eq('livestock_id', selectedLivestock.id)

        .order('date', { ascending: false });

      if (!financeData) {

        setFinancialRows([]);

      } else {

        setFinancialRows(financeData as FinancialRow[]);

      }

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save milk record');

    } finally {

      setSavingMilk(false);

    }

  };



  const handleHealthRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!selectedLivestock?.id) return;

    setSavingHealth(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getAutoFormattedDate();

      const cost = Number(healthForm.cost);



      const { error: healthError } = await supabase.from('health_records').insert({

        livestock_id: selectedLivestock.id,

        event_type: healthForm.event,

        description: `Logged on ${recordDate}`,

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



      const { data } = await supabase.from('health_records').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });

      setHealthRecords((data ?? []) as HealthRecord[]);

      const { data: expenseData } = await supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });

      setExpenseRecords((expenseData ?? []) as ExpenseRecord[]);

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save health record');

    } finally {

      setSavingHealth(false);

    }

  };



  const handleExpenseRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!selectedLivestock?.id) return;

    setSavingExpense(true);

    setErrorMessage(null);

    setSuccessMessage(null);



    try {

      const recordDate = getAutoFormattedDate();

      const amount = Number(expenseForm.amount);



      const { error } = await supabase.from('expenses').insert({

        livestock_id: selectedLivestock.id,

        category: expenseForm.category,

        amount,

        notes: expenseForm.notes,

        date: recordDate,

      });



      if (error) throw error;



      if (expenseForm.category === 'Feed') {

        setFeedBagsRemaining((bags) => Math.max(0, bags - 1));

      }



      setExpenseForm({ category: 'Feed', amount: '', notes: '' });

      setSuccessMessage('Record Saved Successfully');

      setTimeout(() => setSuccessMessage(null), 3000);



      const { data } = await supabase.from('expenses').select('*').eq('livestock_id', selectedLivestock.id).order('date', { ascending: false });

      setExpenseRecords((data ?? []) as ExpenseRecord[]);

    } catch (err) {

      setErrorMessage(err instanceof Error ? err.message : 'Failed to save expense');

    } finally {

      setSavingExpense(false);

    }

  };



  return (

    <>

      {successMessage ? (

        <div

          role="status"

          className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg"

        >

          {successMessage}

        </div>

      ) : null}



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

            <h1 className="mt-4 text-3xl font-semibold text-white">Epaphroditus Farm Inventory</h1>

            <p className="mt-3 max-w-2xl text-white/90">Manage only the livestock you own and quickly add new stock.</p>

          </div>

          <div className="flex flex-col sm:flex-row gap-3">

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

            ].map((tab) => (

              <button

                key={tab.key}

                className={`py-2 px-1 border-b-2 font-medium text-sm ${

                  mainView === tab.key

                    ? 'border-white text-white'

                    : 'border-transparent text-white/75 hover:text-white'

                }`}

                onClick={() => handleMainTabClick(tab.key as 'inventory' | 'management')}

              >

                {tab.label}

              </button>

            ))}

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

              <div className="space-y-4">

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Feed inventory</p>

                    <p className="mt-2 text-3xl font-bold text-amber-950">{feedBagsRemaining}</p>

                    <p className="mt-1 text-xs text-amber-900/80">Bags remaining (minus 1 per Feed expense log)</p>

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

                      type="number"

                      min="0"

                      step="0.01"

                      required

                      placeholder="Price per litre (KSH)"

                      value={milkForm.price_per_litre}

                      onChange={(event) => setMilkForm((prev) => ({ ...prev, price_per_litre: event.target.value }))}

                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"

                    />

                    <p className="text-sm font-medium text-emerald-800">

                      Estimated revenue: KSH{' '}

                      {(Number(milkForm.amount_liters || 0) * Number(milkForm.price_per_litre || 0)).toLocaleString()}

                    </p>

                    <p className="text-xs text-slate-500">

                      Date is captured automatically when you save ({getAutoFormattedDate()}).

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

                ) : null}



                {managementTab === 'health' ? (

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

                            <td className="py-2 pr-2">{record.date}</td>

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

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">

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

                    <p className="text-xs text-slate-500">

                      Feed expenses reduce your feed-bags counter by 1. Date is saved automatically.

                    </p>

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



      {showModal ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">

          <div className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto p-5 ${glassCardClass}`}>

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-2xl font-semibold text-slate-900">Add Livestock</h2>

                <p className="mt-2 text-sm text-slate-600">Create a new listing for your farm.</p>

              </div>

              <button

                type="button"

                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"

                onClick={() => {

                  setShowModal(false);

                  resetLivestockForm();

                }}

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



              <div className="grid gap-3 sm:grid-cols-3">

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

                  onClick={() => {

                    setShowModal(false);

                    resetLivestockForm();

                  }}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"

                >

                  {editingLivestock ? 'Update Livestock' : 'Save Livestock'}

                </button>

              </div>

            </form>

          </div>

        </div>

      ) : null}



    </section>



    </>

  );

}

