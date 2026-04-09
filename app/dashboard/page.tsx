"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LayoutDashboard, Stethoscope, TrendingUp, DollarSign, Truck, BarChart3, ArrowLeft } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

const PHOTO_BG_URL =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80";

interface LivestockStatusItem {
  id: number;
  name: string;
  health_status: string | null;
  breed: string | null;
  age: number | null;
}

export default function DashboardPage() {
  const AUTH_STORAGE_KEY = "dashboard_pin_authenticated";
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [livestockPreview, setLivestockPreview] = useState<LivestockStatusItem[]>([]);
  const [urgencyLevels, setUrgencyLevels] = useState<Record<number, "Low" | "Medium" | "Critical">>({});
  const [identification, setIdentification] = useState({
    breed: "",
    age: "",
    specialMarks: "",
  });
  const [dailyTarget, setDailyTarget] = useState(40);
  const [todayProduction, setTodayProduction] = useState(46);

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
    if (data[0]?.id !== undefined && data[0]?.id !== null) {
      localStorage.setItem("currentUserId", String(data[0].id));
    }
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setIsAuthenticated(true);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchLivestockPreview() {
      const currentUserId = localStorage.getItem("currentUserId");
      if (!currentUserId) return;
      const { data, error } = await supabase
        .from("livestock")
        .select("id, name, health_status, breed, age")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error) {
        const preview = (data || []) as LivestockStatusItem[];
        setLivestockPreview(preview);
        const initialUrgencies: Record<number, "Low" | "Medium" | "Critical"> = {};
        preview.forEach((animal) => {
          const status = (animal.health_status || "").toLowerCase();
          if (status.includes("critical") || status.includes("sick") || status.includes("injur")) {
            initialUrgencies[animal.id] = "Critical";
          } else if (status.includes("watch") || status.includes("check")) {
            initialUrgencies[animal.id] = "Medium";
          } else {
            initialUrgencies[animal.id] = "Low";
          }
        });
        setUrgencyLevels(initialUrgencies);
      }
    }
    fetchLivestockPreview();
  }, [isAuthenticated]);

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
    emerald: "text-lime-300",
    red: "text-red-300",
    blue: "text-sky-300",
    amber: "text-amber-300",
    purple: "text-fuchsia-300",
    cyan: "text-cyan-300",
  };

  const buttonClasses = {
    emerald: "bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950",
    red: "bg-gradient-to-r from-rose-500 to-red-500 text-white",
    blue: "bg-gradient-to-r from-sky-500 to-blue-500 text-slate-950",
    amber: "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950",
    purple: "bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white",
    cyan: "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950",
  };

  const averageProduction = 38;
  const productionPercent = Math.max(0, Math.min(100, Math.round((todayProduction / dailyTarget) * 100)));
  const isAboveAverage = todayProduction > averageProduction;

  function handleLogout() {
    localStorage.clear();
    setIsAuthenticated(false);
    router.push("/");
  }

  if (isCheckingAuth) {
    return (
      <div
        className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
        style={{ backgroundImage: `url('${PHOTO_BG_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/35" aria-hidden="true" />
        <main className="relative mx-auto flex min-h-[80vh] w-full max-w-7xl items-center justify-center">
          <div className="rounded-2xl border border-white/40 bg-white/55 px-8 py-6 text-lg font-semibold text-slate-700 backdrop-blur-xl">
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
        style={{ backgroundImage: `url('${PHOTO_BG_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/35" aria-hidden="true" />
        <main className="relative mx-auto flex min-h-[80vh] w-full max-w-7xl items-center justify-center">
          <section className="w-full max-w-md rounded-2xl border border-white/40 bg-white/55 p-8 font-[var(--font-geist-sans)] shadow-xl backdrop-blur-xl">
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
      style={{ backgroundImage: `url('${PHOTO_BG_URL}')` }}
    >
      <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />
      <main className="relative mx-auto w-full max-w-7xl space-y-12 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-8 font-[var(--font-geist-sans)] shadow-xl backdrop-blur-xl">
        {/* Header */}
        <section className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-300 transition-colors hover:text-lime-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30"
            >
              Logout
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight text-slate-100 sm:text-6xl lg:text-7xl">
              Management Dashboard
            </h1>
            <p className="max-w-3xl text-lg text-slate-300 sm:text-xl">
              Comprehensive farm management hub. Access all your livestock management tools from one centralized location.
            </p>
          </div>
        </section>

        {/* Management Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementFeatures.map((feature) => {
            const Icon = feature.icon;
            const textColor = textClasses[feature.color as keyof typeof textClasses];
            const buttonClass = buttonClasses[feature.color as keyof typeof buttonClasses];
            const isLivestock = feature.title === "Livestock Management";
            const isHealth = feature.title === "Health Tracking";
            const isProductivity = feature.title === "Productivity Logs";

            return (
              <div key={feature.href} className="group relative">
                <div className="relative rounded-2xl border border-slate-700/70 bg-slate-800/60 p-8 shadow-md backdrop-blur-lg transition-all duration-300 hover:border-slate-600">
                  <div className="flex flex-col h-full gap-4">
                    <div className="w-fit rounded-xl bg-slate-700/60 p-3 transition-colors group-hover:bg-slate-700">
                      <Icon className={`w-7 h-7 ${textColor}`} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-100">{feature.title}</h3>
                      <p className="flex-grow text-base leading-relaxed text-slate-300">
                        {feature.description}
                      </p>
                    </div>

                    {isLivestock && livestockPreview.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                        {livestockPreview.map((animal) => {
                          const healthText = (animal.health_status || "").toLowerCase();
                          const needsAction =
                            healthText.includes("sick") ||
                            healthText.includes("injur") ||
                            healthText.includes("critical") ||
                            healthText.includes("action");
                          return (
                            <div key={animal.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-slate-200">{animal.name}</span>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                  needsAction
                                    ? "bg-red-500/20 text-red-300 animate-pulse"
                                    : "bg-lime-500/20 text-lime-300"
                                }`}
                              >
                                {needsAction ? "Action Needed" : "Healthy"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {isLivestock ? (
                      <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Identification
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={identification.breed}
                            onChange={(e) =>
                              setIdentification((prev) => ({ ...prev, breed: e.target.value }))
                            }
                            placeholder="Breed"
                            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-lime-400 transition focus:ring-2"
                          />
                          <input
                            type="text"
                            value={identification.age}
                            onChange={(e) =>
                              setIdentification((prev) => ({ ...prev, age: e.target.value }))
                            }
                            placeholder="Age"
                            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-lime-400 transition focus:ring-2"
                          />
                        </div>
                        <textarea
                          value={identification.specialMarks}
                          onChange={(e) =>
                            setIdentification((prev) => ({ ...prev, specialMarks: e.target.value }))
                          }
                          rows={2}
                          placeholder="Special Marks"
                          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-lime-400 transition focus:ring-2"
                        />
                      </div>
                    ) : null}

                    {isHealth && livestockPreview.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Urgency Monitor
                        </p>
                        {livestockPreview.map((animal) => {
                          const urgency = urgencyLevels[animal.id] ?? "Low";
                          const rowClass =
                            urgency === "Critical"
                              ? "border-red-500/40 bg-red-500/15"
                              : urgency === "Medium"
                              ? "border-amber-400/40 bg-amber-400/15"
                              : "border-lime-400/40 bg-lime-400/15";
                          return (
                            <div
                              key={animal.id}
                              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${rowClass}`}
                            >
                              <span className="truncate text-sm font-semibold text-slate-100">{animal.name}</span>
                              <select
                                value={urgency}
                                onChange={(e) =>
                                  setUrgencyLevels((prev) => ({
                                    ...prev,
                                    [animal.id]: e.target.value as "Low" | "Medium" | "Critical",
                                  }))
                                }
                                className="rounded-md border border-slate-500 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-100 outline-none"
                              >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>Critical</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {isProductivity ? (
                      <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Daily Target
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={1}
                            value={dailyTarget}
                            onChange={(e) => setDailyTarget(Math.max(1, Number(e.target.value) || 1))}
                            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                            aria-label="Daily target liters"
                          />
                          <input
                            type="number"
                            min={0}
                            value={todayProduction}
                            onChange={(e) => setTodayProduction(Math.max(0, Number(e.target.value) || 0))}
                            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                            aria-label="Today production liters"
                          />
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 ${
                              isAboveAverage ? "shadow-[0_0_16px_2px_rgba(56,189,248,0.75)]" : ""
                            }`}
                            style={{ width: `${productionPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-300">
                          {todayProduction}L / {dailyTarget}L ({productionPercent}%) {isAboveAverage ? "- Above average" : ""}
                        </p>
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <Link
                        href={feature.href}
                        className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-lg font-bold transition ${buttonClass}`}
                      >
                        Access →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Quick Stats Section */}
        <section className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-8 shadow-md backdrop-blur-lg">
          <h2 className="mb-4 text-2xl font-bold text-slate-100">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-300">📋 Livestock Management</p>
              <p className="text-lg text-slate-200">Add and manage your herd inventory</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">💰 Financial Tracking</p>
              <p className="text-lg text-slate-200">Monitor revenue, expenses, and profit</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">📊 Analytics & Trends</p>
              <p className="text-lg text-slate-200">Visualize production and performance</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
