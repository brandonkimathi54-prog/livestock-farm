"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

const PHOTO_BG_URL =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80";

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
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    const trimmedFarmName = farmName.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = String(password.trim());

    if (!trimmedFarmName) {
      setError("Please enter your farm name.");
      return;
    }
    if (!trimmedUsername) {
      setError("Please enter your username.");
      return;
    }
    if (!trimmedPassword) {
      setError("Please enter your password.");
      return;
    }

    const { data: insertedProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        farm_name: trimmedFarmName,
        username: trimmedUsername,
        password: trimmedPassword,
      })
      .select("id, farm_name")
      .single();

    if (insertError) {
      console.log("Supabase Error Details:", insertError);
      setError(getSupabaseErrorMessage(insertError));
      return;
    }

    localStorage.setItem("marketplaceFarmName", insertedProfile?.farm_name ?? trimmedFarmName);
    if (insertedProfile?.id !== undefined && insertedProfile?.id !== null) {
      localStorage.setItem("currentUserId", String(insertedProfile.id));
    }
    router.push("/shop");
  }

  async function handleLogin() {
    localStorage.removeItem("user");
    const trimmedUsername = username.trim();
    const trimmedPassword = String(password.trim());

    if (!trimmedUsername) {
      setError("Please enter your username.");
      return;
    }
    if (!trimmedPassword) {
      setError("Please enter your password.");
      return;
    }

    const { data, error: loginError } = await supabase
      .from("profiles")
      .select("id, farm_name, username")
      .ilike("username", trimmedUsername)
      .eq("password", trimmedPassword)
      .limit(1);

    if (loginError) {
      console.log("Supabase Error Details:", loginError);
      console.log(data);
      setError(getSupabaseErrorMessage(loginError));
      return;
    }

    if (!data || data.length === 0) {
      console.log(data);
      setError("Login failed: username or password is incorrect.");
      return;
    }

    const resolvedFarmName = data[0].farm_name?.trim() || "";
    if (resolvedFarmName) {
      localStorage.setItem("marketplaceFarmName", resolvedFarmName);
    }
    if (data[0].id !== undefined && data[0].id !== null) {
      localStorage.setItem("currentUserId", String(data[0].id));
    }
    router.push("/shop");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(`Network error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat px-6 py-12 md:py-16"
      style={{ backgroundImage: `url('${PHOTO_BG_URL}')` }}
    >
      <div className="absolute inset-0 bg-slate-900/35" aria-hidden="true" />
      <main className="relative mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center pb-8 md:pb-12">
        <section className="w-[92%] md:w-[450px] mx-auto rounded-3xl border border-white/40 bg-white/55 p-6 md:p-8 font-[var(--font-geist-sans)] shadow-xl backdrop-blur-xl">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Smart Farmer Entry Gate
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-emerald-900 sm:text-7xl">
              SMART FARMER
            </h1>
            <p className="text-sm md:text-base text-slate-700 sm:text-lg">
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
            {mode === "signup" ? (
              <>
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
                    placeholder="Enter farm name"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                    required
                  />
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-green-600 px-4 py-2 md:px-6 md:py-4 text-sm md:text-base font-bold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === "login" ? (
                <>
                  <Lock className="h-4 w-4" />
                  Farmer Login
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}