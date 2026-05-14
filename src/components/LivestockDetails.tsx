'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseWrapper';
import type { Livestock } from '@/types';

interface MilkRecord {
  id: string;
  livestock_id: string;
  date: string;
  amount_liters: number;
  milking_session: string;
}

interface HealthRecord {
  id: string;
  livestock_id: string;
  event_type: string;
  description: string;
  cost: number;
  date: string;
}

interface LivestockDetailsProps {
  livestock: Livestock;
  onClose: () => void;
  isModal?: boolean;
  onStatusUpdate?: () => void;
}

export default function LivestockDetails({ livestock, onClose, isModal = true, onStatusUpdate }: LivestockDetailsProps) {
  const livestockPrice = Number(livestock.price_ksh ?? livestock.price ?? 0);
  const [activeTab, setActiveTab] = useState<'overview' | 'milk' | 'health'>('overview');
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMilkForm, setShowMilkForm] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [milkForm, setMilkForm] = useState({
    date: '',
    amount_liters: '',
    milking_session: 'Morning',
  });
  const [healthForm, setHealthForm] = useState({
    event_type: '',
    description: '',
    cost: '',
    date: '',
  });

  useEffect(() => {
    if (activeTab === 'milk') {
      fetchMilkRecords();
    } else if (activeTab === 'health') {
      fetchHealthRecords();
    }
  }, [activeTab, livestock.id]);

  const fetchMilkRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('milk_records')
      .select('*')
      .eq('livestock_id', livestock.id)
      .order('date', { ascending: false });
    if (!error) setMilkRecords(data ?? []);
    setLoading(false);
  };

  const fetchHealthRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('livestock_id', livestock.id)
      .order('date', { ascending: false });
    if (!error) setHealthRecords(data ?? []);
    setLoading(false);
  };

  const handleMilkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('milk_records').insert({
      livestock_id: livestock.id,
      date: milkForm.date,
      amount_liters: parseFloat(milkForm.amount_liters),
      milking_session: milkForm.milking_session,
    });
    if (!error) {
      setShowMilkForm(false);
      setMilkForm({ date: '', amount_liters: '', milking_session: 'Morning' });
      fetchMilkRecords();
    }
  };

  const handleHealthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('health_records').insert({
      livestock_id: livestock.id,
      event_type: healthForm.event_type,
      description: healthForm.description,
      cost: parseFloat(healthForm.cost),
      date: healthForm.date,
    });
    if (!error) {
      setShowHealthForm(false);
      setHealthForm({ event_type: '', description: '', cost: '', date: '' });
      fetchHealthRecords();
    }
  };

  const handleSellToMarket = async () => {
    if (livestock.status === 'Available') return;

    const { error } = await supabase
      .from('livestock')
      .update({ status: 'Available' })
      .eq('id', livestock.id);

    if (!error) {
      onStatusUpdate?.();
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">{livestock.name} Details</h2>
        <button
          type="button"
          className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mb-6 flex gap-4 border-b border-slate-200">
        <button
          type="button"
          className={`pb-2 text-sm font-semibold transition ${
            activeTab === 'overview' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold transition ${
            activeTab === 'milk' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('milk')}
        >
          Milk Records
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold transition ${
            activeTab === 'health' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('health')}
        >
          Health Records
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Animal Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Name:</span>
                <span className="font-semibold text-slate-900">{livestock.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Breed:</span>
                <span className="font-semibold text-slate-900">{livestock.breed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Age:</span>
                <span className="font-semibold text-slate-900">{livestock.age}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <span className="font-semibold text-slate-900">{livestock.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Location:</span>
                <span className="font-semibold text-slate-900">{livestock.location ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Price:</span>
                <span className="font-semibold text-slate-900">KSH {livestockPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={() => setShowMilkForm(true)}
              >
                Log Milk Production
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={() => setShowHealthForm(true)}
              >
                Log Health Event
              </button>
              <button
                type="button"
                disabled={livestock.status === 'Available'}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  livestock.status === 'Available'
                    ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
                onClick={handleSellToMarket}
              >
                {livestock.status === 'Available' ? 'Available in Market' : 'Sell to Market'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'milk' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Milk Production Records</h3>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setShowMilkForm(!showMilkForm)}
            >
              {showMilkForm ? 'Cancel' : 'Add Record'}
            </button>
          </div>
          {showMilkForm && (
            <form onSubmit={handleMilkSubmit} className="mb-4 p-4 border rounded" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)' }}>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="date"
                  value={milkForm.date}
                  onChange={(e) => setMilkForm({ ...milkForm, date: e.target.value })}
                  required
                  className="border p-2"
                />
                <input
                  type="number"
                  placeholder="Liters"
                  value={milkForm.amount_liters}
                  onChange={(e) => setMilkForm({ ...milkForm, amount_liters: e.target.value })}
                  required
                  className="border p-2"
                />
                <select
                  value={milkForm.milking_session}
                  onChange={(e) => setMilkForm({ ...milkForm, milking_session: e.target.value })}
                  className="border p-2"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
              <button type="submit" className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">Submit</button>
            </form>
          )}
          {loading ? (
            <p>Loading milk records...</p>
          ) : (
            <ul className="space-y-2">
              {milkRecords.map((record) => (
                <li key={record.id} className="border p-2 rounded">
                  {record.date}: {record.amount_liters} liters ({record.milking_session})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Health Records</h3>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setShowHealthForm(!showHealthForm)}
            >
              {showHealthForm ? 'Cancel' : 'Add Record'}
            </button>
          </div>
          {showHealthForm && (
            <form onSubmit={handleHealthSubmit} className="mb-4 p-4 border rounded" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)' }}>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Event Type"
                  value={healthForm.event_type}
                  onChange={(e) => setHealthForm({ ...healthForm, event_type: e.target.value })}
                  required
                  className="border p-2"
                />
                <input
                  type="date"
                  value={healthForm.date}
                  onChange={(e) => setHealthForm({ ...healthForm, date: e.target.value })}
                  required
                  className="border p-2"
                />
              </div>
              <textarea
                placeholder="Description"
                value={healthForm.description}
                onChange={(e) => setHealthForm({ ...healthForm, description: e.target.value })}
                required
                className="mt-2 w-full border p-2"
              />
              <input
                type="number"
                placeholder="Cost (KSH)"
                value={healthForm.cost}
                onChange={(e) => setHealthForm({ ...healthForm, cost: e.target.value })}
                required
                className="mt-2 border p-2"
              />
              <button type="submit" className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">Submit</button>
            </form>
          )}
          {loading ? (
            <p>Loading health records...</p>
          ) : (
            <ul className="space-y-2">
              {healthRecords.map((record) => (
                <li key={record.id} className="border p-2 rounded">
                  {record.date}: {record.event_type} - {record.description} (Cost: KSH {record.cost})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
        <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)' }}>
          {content}
        </div>
      </div>
    );
  }

  return <div>{content}</div>;
}

