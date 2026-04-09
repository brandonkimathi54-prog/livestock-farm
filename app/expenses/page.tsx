"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";

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

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    // Update input price when milk price changes (e.g., from database load)
    setInputPrice(milkPricePerKg);
  }, [milkPricePerKg]);

  useEffect(() => {
    // Recalculate revenue and net profit when milk price changes
    const newRevenue = totalMilkKg * milkPricePerKg;
    setTotalRevenue(newRevenue);
    setNetProfit(newRevenue - totalCosts);
  }, [milkPricePerKg, totalMilkKg, totalCosts]);

  async function fetchExpenses() {
    setIsLoading(true);
    const [expensesRes, productionRes, settingsRes] = await Promise.all([
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("production_logs").select("milk_kg").order("created_at", { ascending: false }),
      supabase.from("farm_settings").select("milk_price_per_kg").eq("id", 1).single(),
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
      // Keep default value of 60 if settings can't be loaded
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
        .eq("id", 1);

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
      const { error } = await supabase.from("expenses").delete().eq("id", id);

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

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Please provide a valid amount.");
      setIsSaving(false);
      return;
    }

    let result;
    if (editingExpenseId) {
      // Update existing expense
      result = await supabase
        .from("expenses")
        .update({
          category,
          amount: parsedAmount,
          created_at: expenseDate,
        })
        .eq("id", editingExpenseId);
    } else {
      // Insert new expense
      result = await supabase.from("expenses").insert({
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

    // Reset form
    cancelEdit();

    // Refresh expenses
    await fetchExpenses();
    setIsSaving(false);
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Feed":
        return "bg-blue-900/30 border-blue-600/50 text-blue-300";
      case "Vet":
        return "bg-red-900/30 border-red-600/50 text-red-300";
      case "Worker":
        return "bg-purple-900/30 border-purple-600/50 text-purple-300";
      case "AI":
        return "bg-green-900/30 border-green-600/50 text-green-300";
      default:
        return "bg-zinc-800/30 border-zinc-600/50 text-zinc-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-green-400 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Expenses</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Expenses</h1>
          <Link
            href="/"
            className="bg-green-600 hover:bg-green-700 text-black px-4 py-2 rounded transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Price Settings Card */}
        <div className="bg-gray-900 p-6 rounded-lg border border-yellow-400 mb-8">
          <h2 className="text-lg font-semibold text-yellow-300 mb-4">Price Settings</h2>
          <div className="flex items-center gap-4">
            <label htmlFor="milkPrice" className="text-sm font-medium text-yellow-200">
              Current Milk Price (KSh/kg):
            </label>
            <input
              type="number"
              id="milkPrice"
              value={inputPrice}
              onChange={(e) => setInputPrice(Number(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="bg-gray-800 border border-yellow-400 rounded px-3 py-2 text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-32"
            />
            <button
              onClick={() => updateMilkPrice(inputPrice)}
              disabled={isSavingPrice || inputPrice === milkPricePerKg}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-black font-semibold px-4 py-2 rounded transition-colors disabled:cursor-not-allowed"
            >
              {isSavingPrice ? "Saving..." : "Save"}
            </button>
          </div>
          {error && error.includes("milk price") && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div className="bg-gray-900 p-6 rounded-lg border border-blue-400">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Total Revenue</h3>
            <p className="text-4xl font-bold text-blue-400">
              KSh {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-200 mt-2">@ KSh {milkPricePerKg}/kg</p>
          </div>

          {/* Total Expenses Card */}
          <div className="bg-gray-900 p-6 rounded-lg border border-red-400">
            <h3 className="text-sm font-semibold text-red-300 mb-2">Total Expenses</h3>
            <p className="text-4xl font-bold text-red-400">
              KSh {totalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-red-200 mt-2">All costs tracked</p>
          </div>

          {/* Net Profit/Loss Card */}
          <div className={`bg-gray-900 p-6 rounded-lg border ${netProfit >= 0 ? "border-green-400" : "border-red-400"}`}>
            <h3 className={`text-sm font-semibold mb-2 ${netProfit >= 0 ? "text-green-300" : "text-red-300"}`}>
              Net Profit/Loss
            </h3>
            <p className={`text-4xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              KSh {netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-2 ${netProfit >= 0 ? "text-green-200" : "text-red-200"}`}>
              {netProfit >= 0 ? "✓ Profitable" : "✗ Operating at loss"}
            </p>
          </div>
        </div>

        {/* Total Costs Card */}
        <div className="bg-gray-900 p-6 rounded-lg border border-green-400 mb-8">
          <h2 className="text-lg font-semibold mb-2">Expense Summary</h2>
          <p className="text-3xl font-bold text-green-400">KSh {totalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {/* Expense Entry Form */}
        <div className="bg-gray-900 p-6 rounded-lg border border-green-400 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingExpenseId ? "Update Expense" : "Record Expense"}
            </h2>
            {editingExpenseId && (
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof EXPENSE_CATEGORIES[number])}
                  className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount (KSh)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-gray-800 border border-green-400 rounded px-3 py-2 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-400 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-black font-semibold py-2 px-4 rounded transition-colors"
            >
              {isSaving ? "Saving..." : editingExpenseId ? "Update Expense" : "Record Expense"}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="bg-gray-900 p-6 rounded-lg border border-green-400">
          <h2 className="text-xl font-semibold mb-4">Expense History</h2>
          {expenses.length === 0 ? (
            <p className="text-gray-400">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`border rounded-lg p-4 flex items-center justify-between ${getCategoryColor(expense.category)}`}
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="font-semibold text-lg rounded-full w-12 h-12 flex items-center justify-center bg-black/30">
                      {expense.category[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{expense.category}</p>
                      <p className="text-sm opacity-75">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-xl">
                        KSh {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editExpense(expense)}
                        className="p-2 hover:bg-black/20 rounded transition-colors"
                        title="Edit expense"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400 hover:text-red-300"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
