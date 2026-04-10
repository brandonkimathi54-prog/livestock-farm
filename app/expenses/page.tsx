"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";
import Navigation from "@/app/components/Navigation";

type Expense = {
  id: number;
  category: "Feed" | "Vet" | "Worker" | "AI";
  amount: number;
  farmer_username: string;
  created_at: string;
};

const EXPENSE_CATEGORIES = ["Feed", "Vet", "Worker", "AI"] as const;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCosts, setTotalCosts] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [category, setCategory] = useState<typeof EXPENSE_CATEGORIES[number]>("Feed");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [milkPricePerKg, setMilkPricePerKg] = useState(60);
  const [totalMilkKg, setTotalMilkKg] = useState(0);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [inputPrice, setInputPrice] = useState(60);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [currentFarmer, setCurrentFarmer] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("currentSessionUser") ?? "";
      setCurrentFarmer(user);
      if (user) {
        fetchExpenses();
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setInputPrice(milkPricePerKg);
  }, [milkPricePerKg]);

  useEffect(() => {
    const newRevenue = totalMilkKg * milkPricePerKg;
    setTotalRevenue(newRevenue);
    setNetProfit(newRevenue - totalCosts);
  }, [milkPricePerKg, totalMilkKg, totalCosts]);

  async function fetchExpenses() {
    if (!currentFarmer) return;
    setIsLoading(true);
    try {
      const [expensesRes, productionRes, settingsRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("farmer_username", currentFarmer).order("created_at", { ascending: false }),
        supabase.from("production_logs").select("milk_kg").eq("farmer_username", currentFarmer),
        supabase.from("farm_settings").select("milk_price_per_kg").eq("farmer_username", currentFarmer).single(),
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data as Expense[]);
        setTotalCosts(expensesRes.data.reduce((sum, exp) => sum + exp.amount, 0));
      }

      if (productionRes.data) {
        setTotalMilkKg(productionRes.data.reduce((sum, log) => sum + (log.milk_kg || 0), 0));
      }

      if (settingsRes.data) {
        setMilkPricePerKg(settingsRes.data.milk_price_per_kg);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to sync data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateMilkPrice(newPrice: number) {
    setIsSavingPrice(true);
    const { error } = await supabase
      .from("farm_settings")
      .update({ milk_price_per_kg: newPrice })
      .eq("farmer_username", currentFarmer);

    if (error) setError("Failed to update price.");
    else setMilkPricePerKg(newPrice);
    setIsSavingPrice(false);
  }

  async function deleteExpense(id: number) {
    if (!confirm("Delete this record?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  }

  function editExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setCategory(expense.category);
    setAmount(expense.amount.toString());
    setExpenseDate(expense.created_at.split("T")[0]);
  }

  function cancelEdit() {
    setEditingExpenseId(null);
    setAmount("");
    setCategory("Feed");
    setExpenseDate(new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const currentFarmer = localStorage.getItem("currentSessionUser");
    const payload = {
      farmer_username: currentFarmer,
      category,
      amount: Number(amount),
      created_at: expenseDate,
    };

    const request = editingExpenseId 
      ? supabase.from("expenses").update(payload).eq("id", editingExpenseId)
      : supabase.from("expenses").insert(payload);

    const { error } = await request;
    if (error) setError(error.message);
    else {
      cancelEdit();
      fetchExpenses();
    }
    setIsSaving(false);
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      <Navigation currentPage="/expenses" onLogout={handleLogout} />
      
      <div className="relative min-h-screen">
        {/* Background Layer */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2074&auto=format&fit=crop')" }} 
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20">
          <div className="max-w-4xl mx-auto lg:ml-64">
            
            {/* Loading State Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
                <p className="font-bold text-green-800">Updating Ledger...</p>
              </div>
            )}

            {/* Milk Price Section */}
            <div className="mb-8 p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-2">Milk Price per Litre (KES)</label>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(Number(e.target.value))}
                  className="h-11 w-full bg-white/80 border border-gray-300 rounded-xl px-4 text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => updateMilkPrice(inputPrice)}
                  disabled={isSavingPrice}
                  className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  {isSavingPrice ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold text-blue-600">KSh {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Expenses</h3>
                <p className="text-3xl font-bold text-red-600">KSh {totalCosts.toLocaleString()}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Net Profit</h3>
                <p className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  KSh {netProfit.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">{editingExpenseId ? "Edit Expense" : "New Expense"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="h-11 rounded-xl border border-gray-300 px-3">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-11 rounded-xl border border-gray-300 px-3 text-black" required />
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-3" required />
                </div>
                <button type="submit" className="w-full bg-green-600 text-white h-11 rounded-xl font-bold hover:bg-green-700">
                  {isSaving ? "Processing..." : "Save Record"}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">History</h2>
              <div className="space-y-3">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center p-4 bg-white/50 rounded-2xl border border-white/20">
                    <div>
                      <p className="font-bold text-gray-900">{exp.category}</p>
                      <p className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-gray-700">KSh {exp.amount.toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button onClick={() => editExpense(exp)} className="text-blue-600 p-1"><Pencil size={16} /></button>
                        <button onClick={() => deleteExpense(exp.id)} className="text-red-600 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="mt-12 text-center pb-8">
              <p className="text-gray-700 font-medium">Created by Brandon</p>
            </footer>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .led-glow { text-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
      `}</style>
    </>
  );
}