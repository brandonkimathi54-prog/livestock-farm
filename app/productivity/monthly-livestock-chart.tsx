"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyDataPoint = {
  month: string;
  count: number;
};

type Props = {
  data: MonthlyDataPoint[];
};

export default function MonthlyLivestockChart({ data }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Livestock Added per Month
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Monthly trend of herd growth based on livestock creation dates.
      </p>

      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} />
            <XAxis dataKey="month" stroke="#71717a" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} stroke="#71717a" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #3f3f46",
                backgroundColor: "#18181b",
                color: "#f4f4f5",
              }}
            />
            <Bar dataKey="count" fill="#16a34a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
