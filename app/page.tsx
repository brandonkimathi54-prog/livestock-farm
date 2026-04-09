"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
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
  const [mode, setMode] = useState<"farmer-login" | "farmer-signup" | "client-login" | "client-signup">("farmer-login");
  const [farmName, setFarmName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e); // Save the event so we can trigger it later
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      // Optionally show a success message or redirect
      }
    }
  };

  async function handleRegister() {
    const trimmedUsername = username.trim();
    const trimmedPassword = String(password.trim());

    if (mode.includes("farmer")) {
      const trimmedFarmName = farmName.trim();
      
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
    } else if (mode.includes("client")) {
      const trimmedClientName = clientName.trim();
      const trimmedEmail = email.trim();
      
      if (!trimmedClientName) {
        setError("Please enter your client name.");
        return;
      }
      
      if (!trimmedEmail) {
        setError("Please enter your email address.");
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

      // For now, store client data in localStorage (could be moved to a clients table later)
      localStorage.setItem("clientName", trimmedClientName);
      localStorage.setItem("clientEmail", trimmedEmail);
      localStorage.setItem("clientUsername", trimmedUsername);
      
      // Redirect to marketplace as client
      router.push("/shop");
    }
  }

  async function handleLogin() {
    localStorage.removeItem("user");
    const trimmedUsername = username.trim();
    const trimmedPassword = String(password.trim());

    if (!trimmedUsername) {
      setError("Please enter your username.");
      return;
    }

    if (mode.includes("farmer")) {
      // For farmer login - check profiles table
      const { data, error: loginError } = await supabase
        .from("profiles")
        .select("id, farm_name, username")
        .ilike("username", trimmedUsername)
        .limit(1);

      if (loginError) {
        console.log("Supabase Error Details:", loginError);
        setError(getSupabaseErrorMessage(loginError));
        return;
      }

      if (!data || data.length === 0) {
        setError("Farmer username not found. Please check the username.");
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
    } else if (mode.includes("client")) {
      // For client login - simple validation for now (could be enhanced with client table)
      if (trimmedUsername.length < 3) {
        setError("Username must be at least 3 characters long.");
        return;
      }
      
      // Store client login info
      localStorage.setItem("clientUsername", trimmedUsername);
      localStorage.setItem("isClient", "true");
      
      // Redirect to marketplace as client
      router.push("/shop");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "farmer-signup" || mode === "client-signup") {
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
            <p className="text-sm md:text-base text-gray-600 sm:text-lg">
              {mode.includes("login") 
                ? (mode.includes("farmer") ? "Enter farmer's username to view their marketplace" : "Enter client credentials to access marketplace")
                : (mode.includes("farmer") ? "Create your farm management account" : "Create your client marketplace account")
              }
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode.includes("farmer") ? "farmer-login" : "client-login");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  mode.includes("login")
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-emerald-900"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(mode.includes("farmer") ? "farmer-signup" : "client-signup");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  mode.includes("signup")
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-emerald-900"
                }`}
              >
                Sign Up
              </button>
            </div>
            
            {/* Account Type Selection */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode.includes("login") ? "farmer-login" : "farmer-signup");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  mode.includes("farmer")
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-emerald-900"
                }`}
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(mode.includes("login") ? "client-login" : "client-signup");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  mode.includes("client")
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-emerald-900"
                }`}
              >
                Client
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Farmer-specific fields */}
            {mode.includes("farmer") && mode.includes("signup") && (
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
            )}

            {/* Client-specific fields */}
            {mode.includes("client") && mode.includes("signup") && (
              <>
                <div>
                  <label
                    htmlFor="clientName"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900"
                  >
                    Client Name
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                    required
                  />
                </div>
              </>
            )}

            {/* Common fields */}
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                {mode.includes("client") ? "Username" : "Username"}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Enter ${mode.includes("client") ? "username" : "farmer username"}`}
                className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                required
              />
            </div>

            {mode.includes("signup") && (
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                />
              </div>
            )}

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
              {mode.includes("login") ? (
                <>
                  <Lock className="h-4 w-4" />
                  {mode.includes("farmer") ? "View Marketplace" : "Access Marketplace"}
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {mode.includes("farmer") ? "Create Farm Account" : "Create Client Account"}
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}