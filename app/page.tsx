"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

function getSupabaseErrorMessage(error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) {
    return "Network error: no response received from Supabase.";
  }

  if (error.code === "42P01") {
    return `Table not found: ${error.message}`;
  }

  if (error.code === "PGRST116") {
    return `No matching data found: ${error.message}`;
  }

  const parts = [error.message, error.details, error.hint].filter(Boolean).join(" | ");
  return parts ? `Supabase error: ${parts}` : "Unknown Supabase error occurred.";
}

export default function HomePage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [farmName, setFarmName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPin = pin.trim();
    const trimmedFarmName = farmName.trim();

    if (!trimmedFarmName) {
      setError("Please enter your farm name.");
      return;
    }

    if (!/^\d{4}$/.test(trimmedPin)) {
      setError("Please enter a valid 4-digit PIN.");
      return;
    }

    if (mode === "signup" && !trimmedUsername) {
      setError("Please enter your username.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: insertError } = await supabase.from("profiles").insert({
          farm_name: trimmedFarmName,
          username: trimmedUsername,
          pin: trimmedPin,
        });

        if (insertError) {
          setError(getSupabaseErrorMessage(insertError));
          return;
        }

        localStorage.setItem("marketplaceFarmName", trimmedFarmName);
        router.push("/shop");
        return;
      }

      const { data, error: loginError } = await supabase
        .from("profiles")
        .select("farm_name")
        .ilike("farm_name", trimmedFarmName)
        .eq("pin", trimmedPin)
        .limit(1);

      if (loginError) {
        setError(getSupabaseErrorMessage(loginError));
        return;
      }

      if (!data || data.length === 0) {
        setError("Login failed: farm name not found or PIN is incorrect.");
        return;
      }

      if (data[0].farm_name) {
        localStorage.setItem("marketplaceFarmName", data[0].farm_name);
      }
      router.push("/shop");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(`Network error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12"
      style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}
    >
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" aria-hidden="true" />
      <main className="relative mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Smart Farmer Entry Gate
            </p>
            <h1 className="text-6xl font-black tracking-tight text-emerald-900 sm:text-7xl">
              SMART FARMER
            </h1>
            <p className="text-base text-slate-700 sm:text-lg">
              {mode === "login"
                ? "Login to access your farm marketplace."
                : "Create your farm profile and start listing livestock."}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-600 hover:text-emerald-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-600 hover:text-emerald-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="farmName"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900"
              >
                Enter your Farm Name
              </label>
              <input
                id="farmName"
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Kirinyaga Valley Farm"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none ring-emerald-600 transition focus:ring-2"
              />
            </div>

            {mode === "signup" ? (
              <>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none ring-emerald-600 transition focus:ring-2"
                />
              </>
            ) : null}
            <label
              htmlFor="pin"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900"
            >
              4-Digit PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 outline-none ring-emerald-600 transition focus:ring-2"
            />

            {error ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-gradient-to-r from-emerald-700 to-emerald-800 px-6 py-4 text-lg font-bold text-white transition hover:from-emerald-800 hover:to-emerald-900 disabled:opacity-70"
            >
              {isSubmitting
                ? mode === "login"
                  ? "Logging in..."
                  : "Registering..."
                : mode === "login"
                ? "Login"
                : "Register"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Lock className="h-4 w-4" />
            Farmer Login
          </Link>
        </section>
      </main>
    </div>
  );
}