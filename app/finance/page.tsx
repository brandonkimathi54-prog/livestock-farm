"use client";
import React, { useState } from 'react';

export default function FinancePage() {
  const [expenses, setExpenses] = useState([
    { id: 1, date: '2026-04-09', category: 'Feed', amount: 5000, desc: 'Dairy Meal' },
  ]);

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-green-500 mb-6">Farm Finance</h1>

      {/* Record New Expense Form */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-green-500/30 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-green-400">Record New Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-white">
            <option>Select Category</option>
            <option>Animal Feed</option>
            <option>Medical/Vet</option>
            <option>Labor</option>
            <option>Equipment</option>
          </select>
          <input type="number" placeholder="Amount (KSh)" className="bg-gray-800 p-3 rounded-lg border border-gray-700" />
          <button className="bg-green-600 hover:bg-green-700 p-3 rounded-lg font-bold">Log Expense</button>
        </div>
      </div>

      {/* Expense Ledger with Visibility Fix */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Expense Ledger</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="pb-3">Date</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Amount (KSh)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-b border-gray-100">
                {/* text-gray-900 ensures the data is visible on white background */}
                <td className="py-4 text-gray-900">{exp.date}</td>
                <td className="py-4 text-gray-900 font-medium">{exp.category}</td>
                <td className="py-4 text-green-700 font-bold">{exp.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
