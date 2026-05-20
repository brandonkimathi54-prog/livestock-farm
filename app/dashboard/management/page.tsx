"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseWrapper';
import { Loader2, Activity, BarChart2, Users, TrendingUp, HeartPulse } from 'lucide-react';
import type { Livestock } from '@/types';

interface MilkRecord {
  id: string;
  livestock_id: string;
  date: string;
  amount_liters: number;
}

interface HealthRecord {
  id: string;
  livestock_id: string;
  event_type: string;
  description: string;
  date: string;
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-300" size={size} />
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400">{title}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

export default function ManagementView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          router.replace('/login');
          return;
        }
        if (!mounted) return;
        setUserId(user.id);

        // Fetch user's livestock
        const { data: livestockData, error: livestockError } = await supabase
          .from('livestock')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (livestockError) throw livestockError;
        if (!mounted) return;
        setLivestock((livestockData ?? []) as Livestock[]);

        // Fetch milk records
        const { data: milkData, error: milkError } = await supabase
          .from('milk_records')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1000);
        if (milkError) throw milkError;
        if (!mounted) return;
        setMilkRecords((milkData ?? []) as MilkRecord[]);

        // Fetch health/ops records
        const { data: healthData, error: healthError } = await supabase
          .from('health_records')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(500);
        if (healthError) throw healthError;
        if (!mounted) return;
        setHealthRecords((healthData ?? []) as HealthRecord[]);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load management data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchAll();
    return () => { mounted = false; };
  }, [router]);

  // Derived metrics
  const metrics = useMemo(() => {
    const activeAnimals = livestock.filter((l) => (l.status ?? 'Available') !== 'Sold');
    const totalHerdYield = activeAnimals.reduce((s, a) => s + (Number(a.liters_per_day ?? 0) || 0), 0);
    const avgProduction = activeAnimals.length ? Number((totalHerdYield / activeAnimals.length).toFixed(2)) : 0;
    const projectedValue = livestock
      .filter((l) => (l.status ?? 'Available') === 'Available')
      .reduce((s, a) => s + (Number(a.price_ksh ?? a.price ?? 0) || 0), 0);
    const revenueRealized = livestock
      .filter((l) => (l.status ?? '') === 'Sold')
      .reduce((s, a) => s + (Number(a.price_ksh ?? a.price ?? 0) || 0), 0);

    return { totalHerdYield, avgProduction, projectedValue, revenueRealized, activeCount: activeAnimals.length };
  }, [livestock]);

  const topPerformers = useMemo(() => {
    const sorted = [...livestock].sort((a, b) => (Number(b.liters_per_day ?? 0) || 0) - (Number(a.liters_per_day ?? 0) || 0));
    return sorted.slice(0, 5);
  }, [livestock]);

  const today = useMemo(() => {
    const iso = new Date().toISOString().split('T')[0];
    return iso;
  }, []);

  const todayProduction = useMemo(() => {
    return milkRecords
      .filter((r) => (r.date ?? '').startsWith(today))
      .reduce((s, r) => s + (Number(r.amount_liters ?? 0) || 0), 0);
  }, [milkRecords, today]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Management • Production & Operations</h2>
        <div className="text-sm text-slate-400">Last updated: {new Date().toLocaleString()}</div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/6 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <Spinner />
            <div className="text-sm text-slate-300">Loading farm metrics…</div>
          </div>
        </div>
      ) : (
        <>
          {error ? (
            <div className="rounded-2xl border border-rose-600/30 bg-rose-900/10 p-4 text-sm text-rose-300">{error}</div>
          ) : null}

          {/* Top metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard title="Total Herd Yield (L/day)" value={<span>{metrics.totalHerdYield.toLocaleString()}</span>} icon={<Activity />} />
            <MetricCard title="Avg Production / Animal" value={<span>{metrics.avgProduction} L</span>} icon={<BarChart2 />} />
            <MetricCard title="Projected Asset Value" value={<span>KSH {metrics.projectedValue.toLocaleString()}</span>} icon={<Users />} />
            <MetricCard title="Revenue Realized" value={<span>KSH {metrics.revenueRealized.toLocaleString()}</span>} icon={<TrendingUp />} />
          </div>

          {/* Main grid: production summary + top performers */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="col-span-2 rounded-2xl border border-white/6 bg-slate-900 p-6">
              <h3 className="text-lg font-bold text-white">Production Tracking</h3>
              <p className="mt-1 text-sm text-slate-400">Overview of daily output and recent milk records.</p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">Today's Collection</div>
                    <div className="text-xs text-slate-300">{milkRecords.length} records</div>
                  </div>
                  <div className="mt-3 text-3xl font-black text-white">{todayProduction.toLocaleString()} L</div>
                  <div className="mt-2 text-sm text-slate-400">Across {metrics.activeCount} active animals</div>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">Efficiency (Avg / Animal)</div>
                    <div className="text-xs text-slate-300">Based on liters/day</div>
                  </div>
                  <div className="mt-3 text-3xl font-black text-white">{metrics.avgProduction} L</div>
                  <div className="mt-2 text-sm text-slate-400">Daily production efficiency</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-300">Recent Milk Records</h4>
                <div className="mt-3 grid gap-2 max-h-56 overflow-y-auto">
                  {milkRecords.length === 0 ? (
                    <div className="text-sm text-slate-400">No production records yet.</div>
                  ) : (
                    milkRecords.slice(0, 12).map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-800/30 px-3 py-2 text-sm">
                        <div className="text-sm text-slate-200">{r.date} • {r.amount_liters} L</div>
                        <div className="text-xs text-slate-400">ID: {r.livestock_id}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/6 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Top Performers</h3>
                <div className="text-sm text-slate-400">Sorted by L/day</div>
              </div>

              <div className="mt-4 space-y-3">
                {topPerformers.length === 0 ? (
                  <div className="text-sm text-slate-400">No livestock available</div>
                ) : (
                  topPerformers.map((p) => {
                    const val = Number(p.liters_per_day ?? 0) || 0;
                    const max = Math.max(...topPerformers.map((t) => Number(t.liters_per_day ?? 0) || 0), 1);
                    const pct = Math.round((val / max) * 100);
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">{p.name}</div>
                            <div className="text-xs text-slate-400">{p.breed ?? '—'} • {p.location ?? '—'}</div>
                          </div>
                          <div className="text-sm font-bold text-emerald-400">{val} L</div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Health & Ops Timeline */}
          <div className="rounded-2xl border border-white/6 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Health & Operations Timeline</h3>
              <div className="text-sm text-slate-400">Recent events and alerts</div>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="flex items-center gap-3"><Spinner /> <div className="text-sm text-slate-400">Loading timeline…</div></div>
              ) : healthRecords.length === 0 ? (
                <div className="text-sm text-slate-400">No health records yet. Scheduled checks and vaccination windows will appear here.</div>
              ) : (
                healthRecords.slice(0, 20).map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-md border border-white/5 bg-slate-950/30 p-3">
                    <div className="mt-1 text-slate-300"><HeartPulse /></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">{h.event_type}</div>
                        <div className="text-xs text-slate-400">{h.date}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">{h.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
