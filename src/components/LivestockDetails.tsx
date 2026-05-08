'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
}

export default function LivestockDetails({ livestock, onClose }: LivestockDetailsProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)' }}>
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

        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'milk', label: 'Milk Records' },
              { key: 'health', label: 'Health Logs' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <p className="text-slate-900">{livestock.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Breed</label>
                <p className="text-slate-900">{livestock.breed}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Age</label>
                <p className="text-slate-900">{livestock.age}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Price</label>
                <p className="text-slate-900">KSH {livestock.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'milk' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Milk Records</h3>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setShowMilkForm(true)}
              >
                Log Milk
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
                    <option>Morning</option>
                    <option>Evening</option>
                  </select>
                </div>
                <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                <button type="button" onClick={() => setShowMilkForm(false)} className="ml-2">Cancel</button>
              </form>
            )}
            {loading ? (
              <p>Loading...</p>
            ) : milkRecords.length === 0 ? (
              <p>No milk records yet.</p>
            ) : (
              <ul className="space-y-2">
                {milkRecords.map((record) => (
                  <li key={record.id} className="border p-2 rounded">
                    {record.date}: {record.amount_liters}L ({record.milking_session})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Health Logs</h3>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setShowHealthForm(true)}
              >
                Log Health Event
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
                  className="border p-2 w-full mt-2"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={healthForm.cost}
                  onChange={(e) => setHealthForm({ ...healthForm, cost: e.target.value })}
                  className="border p-2 mt-2"
                />
                <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                <button type="button" onClick={() => setShowHealthForm(false)} className="ml-2">Cancel</button>
              </form>
            )}
            {loading ? (
              <p>Loading...</p>
            ) : healthRecords.length === 0 ? (
              <p>No health logs yet.</p>
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
      </div>
    </div>
  );
}