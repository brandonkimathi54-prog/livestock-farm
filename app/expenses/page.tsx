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
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("currentUserId") ?? "";
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchExpenses();
    } else {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    setInputPrice(milkPricePerKg);
  }, [milkPricePerKg]);

  useEffect(() => {
    const newRevenue = totalMilkKg * milkPricePerKg;
    setTotalRevenue(newRevenue);
    setNetProfit(newRevenue - totalCosts);
  }, [milkPricePerKg, totalMilkKg, totalCosts]);

  async function fetchExpenses() {
    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      return;
    }
    setIsLoading(true);
    const [expensesRes, productionRes, settingsRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false }),
      supabase
        .from("production_logs")
        .select("milk_kg")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false }),
      supabase.from("farm_settings").select("milk_price_per_kg").eq("user_id", currentUserId).single(),
    ]);

    if (expensesRes.error) {
      console.error("Error fetching expenses:", expensesRes.error);
      setError("Failed to load expenses");
    } else {
      setExpenses((expensesRes.data || []) as Expense[]);
      const costs = (expensesRes.data || []).reduce((sum, exp) => sum + exp.amount, 0);
      setTotalCosts(costs);
    }

    if (productionRes.error) {
      console.error("Error fetching production logs:", productionRes.error);
    } else {
      const productions = productionRes.data || [];
      const totalMilkKg = productions.reduce((sum, log) => sum + (log.milk_kg || 0), 0);
      setTotalMilkKg(totalMilkKg);
    }

    if (settingsRes.error) {
      console.error("Error fetching farm settings:", settingsRes.error);
    } else {
      const price = settingsRes.data?.milk_price_per_kg || 60;
      setMilkPricePerKg(price);
      setInputPrice(price);
    }

    setIsLoading(false);
  }

  async function updateMilkPrice(newPrice: number) {
    setIsSavingPrice(true);
    try {
      const { error } = await supabase
        .from("farm_settings")
        .update({ milk_price_per_kg: newPrice })
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error updating milk price:", error);
        setError("Failed to save milk price");
      } else {
        setMilkPricePerKg(newPrice);
        setError("");
      }
    } catch (err) {
      console.error("Unexpected error updating milk price:", err);
      setError("An unexpected error occurred while saving milk price");
    } finally {
      setIsSavingPrice(false);
    }
  }

  async function deleteExpense(id: number) {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", currentUserId);

      if (error) {
        console.error("Error deleting expense:", error);
        setError("Failed to delete expense");
      } else {
        setError("");
        await fetchExpenses();
      }
    } catch (err) {
      console.error("Unexpected error deleting expense:", err);
      setError("An unexpected error occurred while deleting expense");
    }
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
    setError("");
    setIsSaving(true);

    if (!currentUserId) {
      setError("No logged in user found. Please login again.");
      setIsSaving(false);
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Please provide a valid amount.");
      setIsSaving(false);
      return;
    }

    let result;
    if (editingExpenseId) {
      result = await supabase
        .from("expenses")
        .update({
          category,
          amount: parsedAmount,
          created_at: expenseDate,
        })
        .eq("id", editingExpenseId)
        .eq("user_id", currentUserId);
    } else {
      result = await supabase.from("expenses").insert({
        user_id: currentUserId,
        category,
        amount: parsedAmount,
        created_at: expenseDate,
      });
    }

    if (result.error) {
      const details = [result.error.message, result.error.details, result.error.hint]
        .filter(Boolean)
        .join(" | ");
      setError(`Failed to ${editingExpenseId ? "update" : "save"} expense: ${details}`);
      setIsSaving(false);
      return;
    }

    cancelEdit();
    await fetchExpenses();
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <>
        <Navigation currentPage="/expenses" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="max-w-4xl mx-auto lg:ml-64">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
                <h1 className="text-2xl md:text-3xl font-bold text-green-900 mb-6">Expenses</h1>
                <div className="text-center text-gray-600">Loading expenses data...</div>
              </div>
            </div>
          </main>
        </div>
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
        
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
          <div className="max-w-4xl mx-auto lg:ml-64">
            <h1 className="text-2xl md:text-3xl font-bold text-green-900 mb-6 md:mb-8">Expenses</h1>

            {/* Price Settings Card */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-4">Price Settings</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <label htmlFor="milkPrice" className="text-sm font-medium text-gray-600">
                  Current Milk Price (KSh/kg):
                </label>
                <input
                  type="number"
                  id="milkPrice"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(Number(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  className="h-11 w-full bg-white/80 border border-gray-300 rounded-xl px-3 py-2 text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2 sm:w-32"
                />
                <button
                  onClick={() => updateMilkPrice(inputPrice)}
                  disabled={isSavingPrice || inputPrice === milkPricePerKg}
                  className="h-11 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:cursor-not-allowed"
                >
                  {isSavingPrice ? "Saving..." : "Save"}
                </button>
              </div>
              {error && error.includes("milk price") && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Revenue</h3>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-blue-600">
                  KSh {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-2">@ KSh {milkPricePerKg}/kg</p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Expenses</h3>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-600">
                  KSh {totalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-2">All costs tracked</p>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Net Profit/Loss</h3>
                <p className={`text-2xl md:text-3xl lg:text-4xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  KSh {netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs mt-2 text-gray-600">
                  {netProfit >= 0 ? "Profitable" : "Operating at loss"}
                </p>
              </div>
            </div>

            {/* Expense Form */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-700">
                  {editingExpenseId ? "Update Expense" : "Record Expense"}
                </h2>
                {editingExpenseId && (
                  <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-800 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as typeof EXPENSE_CATEGORIES[number])}
                      className="h-11 w-full bg-white/80 border border-gray-300 rounded-xl px-3 py-2 text-green-900 outline-none ring-green-600 transition focus:ring-2"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Amount (KSh)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="0.01"
                      className="h-11 w-full bg-white/80 border border-gray-300 rounded-xl px-3 py-2 text-green-900 outline-none ring-green-600 transition focus:ring-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Date</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="h-11 w-full bg-white/80 border border-gray-300 rounded-xl px-3 py-2 text-green-900 outline-none ring-green-600 transition focus:ring-2"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  {isSaving ? "Saving..." : editingExpenseId ? "Update Expense" : "Record Expense"}
                </button>
              </form>
            </div>

            {/* History Table */}
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-4 md:p-6 shadow-lg">
              <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Expense History</h2>
              {expenses.length === 0 ? (
                <p className="text-gray-600">No expenses recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="border border-white/40 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/60 backdrop-blur-lg shadow-sm">
                      <div className="flex items-center gap-3 md:gap-4 flex-grow">
                        <div className="font-semibold text-lg rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-green-600/10 text-green-600">
                          {expense.category[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm md:text-base text-gray-700">{expense.category}</p>
                          <p className="text-xs md:text-sm text-gray-500">{new Date(expense.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto">
                        <p className="font-bold text-base md:text-xl text-gray-700">
                          KSh {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => editExpense(expense)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteExpense(expense.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature with Rotating LED Effect */}
            <footer className="mt-12 text-center pb-8">
              <p className="text-gray-700 font-medium">
                Created by{" "}
                <span className="inline-block font-extrabold animate-led-rotate bg-[length:200%_auto] bg-clip-text text-transparent bg-gradient-to-r from-green-900 via-emerald-400 via-white to-green-900">
                  Brandon
                </span>
              </p>
            </footer>
          </div>
        </main>
      </div>
      {/* Global CSS for the LED effect */}
      <style jsx global>{`
        @keyframes led-rotate {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .animate-led-rotate {
          animation: led-rotate 4s linear infinite;
        }
      `}</style>
    </>
  );
}