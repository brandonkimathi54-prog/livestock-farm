'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseWrapper';
import type { Livestock } from '@/types';

interface MilkRow {
  id: string;
  livestock_id: string;
  date: string;
  amount_liters: number;
  milking_session?: string;
}

interface HealthRow {
  id: string;
  livestock_id: string;
  event_type: string;
  cost: number;
  date: string;
}

interface ExpenseRow {
  id: string;
  livestock_id: string;
  category: string;
  amount: number;
  date: string;
}

interface FinanceRow {
  id: string;
  livestock_id: string;
  type: string;
  amount: number;
  date: string;
}

function monthStartEnd(ym: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const start = new Date(y, mo, 1, 0, 0, 0, 0);
  const end = new Date(y, mo + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function parseRowDate(raw: string): Date | null {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00`);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(d: Date, start: Date, end: Date): boolean {
  return d >= start && d <= end;
}

export default function AllRecordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [milk, setMilk] = useState<MilkRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [finance, setFinance] = useState<FinanceRow[]>([]);

  const defaultYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [monthFilter, setMonthFilter] = useState(defaultYm);
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setUnauthorized(true);
      setLoading(false);
      router.replace('/login');
      return;
    }
    setUnauthorized(false);
    const { data: herd, error: herdErr } = await supabase
      .from('livestock')
      .select('id,name,breed')
      .eq('user_id', user.id);
    if (herdErr) {
      setLivestock([]);
      setLoading(false);
      return;
    }
    const list = (herd ?? []) as Livestock[];
    setLivestock(list);
    const ids = list.map((a) => a.id);
    if (ids.length === 0) {
      setMilk([]);
      setHealth([]);
      setExpenses([]);
      setFinance([]);
      setLoading(false);
      return;
    }

    const [mRes, hRes, eRes, fRes] = await Promise.all([
      supabase.from('milk_records').select('*').in('livestock_id', ids).order('id', { ascending: false }),
      supabase.from('health_records').select('*').in('livestock_id', ids).order('id', { ascending: false }),
      supabase.from('expenses').select('*').in('livestock_id', ids).order('id', { ascending: false }),
      supabase.from('financials').select('*').in('livestock_id', ids).order('id', { ascending: false }),
    ]);

    setMilk((mRes.data ?? []) as MilkRow[]);
    setHealth((hRes.data ?? []) as HealthRow[]);
    setExpenses((eRes.data ?? []) as ExpenseRow[]);
    setFinance((fRes.data ?? []) as FinanceRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const reload = () => {
      router.refresh();
      void loadAll();
    };

    reload();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };

    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadAll, router]);

  const range = useMemo(() => monthStartEnd(monthFilter), [monthFilter]);

  const filtered = useMemo(() => {
    const animalId = animalFilter === 'all' ? null : animalFilter;
    const passAnimal = (livestockId: string) => !animalId || livestockId === animalId;
    const passMonth = (raw: string) => {
      const d = parseRowDate(raw);
      if (!d || !range) return false;
      return inRange(d, range.start, range.end);
    };

    const milkF = milk.filter((r) => passAnimal(r.livestock_id) && passMonth(r.date));
    const healthF = health.filter((r) => passAnimal(r.livestock_id) && passMonth(r.date));
    const expF = expenses.filter((r) => passAnimal(r.livestock_id) && passMonth(r.date));
    const finF = finance.filter((r) => {
      if (!passMonth(r.date)) return false;
      if (!animalId) return true;
      return r.livestock_id === animalId;
    });

    const totalMilkLitres = milkF
      .filter((r) => (r.milking_session ?? '') !== 'Day Total')
      .reduce((s, r) => s + Number(r.amount_liters ?? 0), 0);
    const healthCount = healthF.length;
    const totalExp = expF.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalRev = finF.filter((r) => (r.type ?? '').toLowerCase() === 'revenue').reduce((s, r) => s + Number(r.amount ?? 0), 0);

    return { milkF, healthF, expF, finF, totalMilkLitres, healthCount, totalExp, totalRev };
  }, [milk, health, expenses, finance, monthFilter, animalFilter, range]);

  const animalName = (id: string) => livestock.find((a) => a.id === id)?.name ?? id.slice(0, 8);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const companyName = 'Epaphroditus Farm';
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(companyName, 40, 52);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Monthly performance report', 40, 70);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 86);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Period: ${monthFilter}`, 40, 110);
      doc.text(
        animalFilter === 'all' ? 'Animal: All livestock' : `Animal: ${animalName(animalFilter)}`,
        40,
        126,
      );

      const summaryBody = [
        ['Total milk produced (L)', String(filtered.totalMilkLitres.toFixed(1))],
        ['Health treatments recorded', String(filtered.healthCount)],
        ['Total revenue (KSH)', filtered.totalRev.toLocaleString()],
        ['Total expenses (KSH)', filtered.totalExp.toLocaleString()],
        ['Net profit (KSH)', (filtered.totalRev - filtered.totalExp).toLocaleString()],
      ];

      autoTable(doc, {
        startY: 150,
        head: [['Metric', 'Value']],
        body: summaryBody,
        theme: 'grid',
        styles: { fontSize: 10, textColor: [15, 23, 42], halign: 'left' },
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 248, 250] },
      });

      const docWithTable = doc as typeof doc & { lastAutoTable?: { finalY: number } };
      const yAfter = (docWithTable.lastAutoTable?.finalY ?? 150) + 24;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Filtered milk records', 40, yAfter);

      autoTable(doc, {
        startY: yAfter + 12,
        head: [['Date', 'Animal', 'Session', 'Litres']],
        body: filtered.milkF.map((r) => [r.date, animalName(r.livestock_id), r.milking_session ?? '', String(r.amount_liters)]),
        theme: 'grid',
        styles: { fontSize: 9, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`farm-report-${monthFilter}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Could not generate PDF. Check console for details.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading records…
      </div>
    );
  }

  if (unauthorized) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">Please sign in to view your records.</p>
        <div className="mt-5">
          <Link href="/login" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Go to login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">All records</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Filter by month and animal. Totals reflect milk (excluding &quot;Day Total&quot; rows), health events, revenue, and expenses.
          </p>
        </div>
        <button
          type="button"
          disabled={pdfLoading}
          onClick={() => void downloadPdf()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Download PDF report
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-6">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Month</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Animal</span>
          <select
            value={animalFilter}
            onChange={(e) => setAnimalFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All animals</option>
            {livestock.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">Filtered totals</p>
          <p className="mt-1">Milk produced: {filtered.totalMilkLitres.toFixed(1)} L</p>
          <p>Health treatments: {filtered.healthCount}</p>
          <p>Revenue: KSH {filtered.totalRev.toLocaleString()}</p>
          <p>Expenses: KSH {filtered.totalExp.toLocaleString()}</p>
          <p className="font-bold">Net: KSH {(filtered.totalRev - filtered.totalExp).toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Milk (filtered)</h2>
        <div className="mt-4 space-y-3 md:hidden">
          {filtered.milkF.length === 0 ? (
            <p className="text-sm text-slate-500">No milk rows for this filter.</p>
          ) : (
            filtered.milkF.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{animalName(r.livestock_id)}</p>
                    <p className="mt-1 text-xs text-slate-600">{r.date}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{r.amount_liters} L</p>
                </div>
                <p className="mt-3 text-xs text-slate-600">Session: {r.milking_session ?? '—'}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Animal</th>
                <th className="py-2 pr-2">Session</th>
                <th className="py-2">Litres</th>
              </tr>
            </thead>
            <tbody>
              {filtered.milkF.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{r.date}</td>
                  <td className="py-2 pr-2">{animalName(r.livestock_id)}</td>
                  <td className="py-2 pr-2">{r.milking_session ?? '—'}</td>
                  <td className="py-2">{r.amount_liters}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.milkF.length === 0 ? <p className="mt-2 text-sm text-slate-500">No milk rows for this filter.</p> : null}
        </div>
      </div>
    </section>
  );
}
