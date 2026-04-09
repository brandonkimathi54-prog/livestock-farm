"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LayoutDashboard, Stethoscope, TrendingUp, DollarSign, Truck, BarChart3, ArrowLeft } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

export default function DashboardPage() {
  const AUTH_STORAGE_KEY = "dashboard_pin_authenticated";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedUsername) {
      setAuthError("Please enter your username.");
      return;
    }

    if (!normalizedPassword) {
      setAuthError("Please enter your password.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", normalizedUsername)
      .eq("password", normalizedPassword)
      .limit(1);

    if (error) {
      setAuthError("Unable to login right now. Please try again.");
      return;
    }

    if (!data || data.length === 0) {
      setAuthError("Incorrect username or password.");
      return;
    }

    setAuthError("");
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setIsAuthenticated(true);
  }

  const managementFeatures = [
    {
      title: "Livestock Management",
      description: "Add, edit, and manage your livestock inventory with detailed health and breed information.",
      icon: LayoutDashboard,
      href: "/admin",
      color: "emerald",
    },
    {
      title: "Health Tracking",
      description: "Track health conditions, treatments, and veterinary costs for your herd.",
      icon: Stethoscope,
      href: "/health",
      color: "red",
    },
    {
      title: "Productivity Logs",
      description: "Record milk production, track yields, and monitor monthly productivity trends.",
      icon: TrendingUp,
      href: "/productivity",
      color: "blue",
    },
    {
      title: "Expense Management",
      description: "Track farm expenses by category and view financial summaries with revenue calculations.",
      icon: DollarSign,
      href: "/expenses",
      color: "amber",
    },
    {
      title: "livestock Tracking",
      description: "Track livestock movements, locations, and upload photos to your herd database.",
      icon: Truck,
      href: "/tracking",
      color: "purple",
    },
    {
      title: "Production Trends",
      description: "Visualize milk production trends, track peak periods, and identify patterns over time.",
      icon: BarChart3,
      href: "/trends",
      color: "cyan",
    },
  ];

  const textClasses = {
    emerald: "text-emerald-800",
    red: "text-red-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
    cyan: "text-cyan-700",
  };

  if (isCheckingAuth) {
    return (
      <div
        className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
        style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
      >
        <div className="absolute inset-0 bg-white/10" aria-hidden="true" />
        <main className="relative mx-auto flex min-h-[80vh] w-full max-w-7xl items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-8 py-6 text-lg font-semibold text-slate-700 backdrop-blur-xl">
            Checking access...
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
        style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
      >
        <div className="absolute inset-0 bg-white/10" aria-hidden="true" />
        <main className="relative mx-auto flex min-h-[80vh] w-full max-w-7xl items-center justify-center">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/85 p-8 backdrop-blur-xl">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                PIN Protection
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-900">
                Management Portal Login
              </h1>
              <p className="mt-2 text-sm text-slate-700">
                Enter your username and password to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 transition focus:ring-2"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 transition focus:ring-2"
                />
              </div>

              {authError ? (
                <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-base font-bold text-white transition hover:bg-emerald-900"
              >
                Login
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
      style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
    >
      <div className="absolute inset-0 bg-white/10" aria-hidden="true" />
      <main className="relative mx-auto w-full max-w-7xl space-y-12 rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-md">
        {/* Header */}
        <section className="space-y-4">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-gray-700 transition-colors hover:text-emerald-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight text-emerald-900 sm:text-6xl lg:text-7xl">
              Management Dashboard
            </h1>
            <p className="max-w-3xl text-lg text-gray-700 sm:text-xl">
              Comprehensive farm management hub. Access all your livestock management tools from one centralized location.
            </p>
          </div>
        </section>

        {/* Management Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementFeatures.map((feature) => {
            const Icon = feature.icon;
            const textColor = textClasses[feature.color as keyof typeof textClasses];

            return (
              <Link key={feature.href} href={feature.href} className="group relative">
                <div className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-md transition-all duration-300 hover:shadow-lg">
                  <div className="flex flex-col h-full gap-4">
                    <div className="w-fit rounded-xl bg-gray-100 p-3 transition-colors group-hover:bg-gray-200">
                      <Icon className={`w-7 h-7 ${textColor}`} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-emerald-900">{feature.title}</h3>
                      <p className="flex-grow text-base leading-relaxed text-gray-700">
                        {feature.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-lg font-bold text-white transition group-hover:bg-emerald-900">
                        Access →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Quick Stats Section */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-emerald-900">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">📋 Livestock Management</p>
              <p className="text-lg text-gray-800">Add and manage your herd inventory</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">💰 Financial Tracking</p>
              <p className="text-lg text-gray-800">Monitor revenue, expenses, and profit</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">📊 Analytics & Trends</p>
              <p className="text-lg text-gray-800">Visualize production and performance</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
