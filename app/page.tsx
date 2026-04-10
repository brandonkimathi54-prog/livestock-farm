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
  const [mode, setMode] = useState<"entry-gate" | "farmer-login" | "farmer-signup" | "client-login">("entry-gate");
  const [role, setRole] = useState<'farmer' | 'client'>('farmer');
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
    const trimmedUsername = username.trim();
    const trimmedPassword = String(password.trim());

    if (mode === "client-login") {
      // Client enters farmer's username to access their marketplace
      if (!trimmedUsername) {
        setError("Please enter a farmer's username");
        return;
      }
      localStorage.setItem('userRole', 'client');
      localStorage.setItem('farmerUsername', trimmedUsername);
      router.push('/shop');
    } else {
      // Farmer login
      if (role === 'farmer') {
        // Hardcode a temporary password for now
        if (trimmedPassword === 'farmer123') {
          localStorage.setItem('userRole', 'farmer');
          router.push('/dashboard');
        } else {
          setError("Invalid Farmer Password");
        }
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "farmer-signup") {
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
              {mode === "entry-gate" 
                ? "Choose your path to access the Smart Farmer platform"
                : (mode === "farmer-login" ? "Enter your credentials to access your farm dashboard" : "Create your farm management account")
              }
            </p>
          </div>

          {mode === "entry-gate" && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Farmer Card */}
              <button
                type="button"
                onClick={() => setMode("farmer-login")}
                className="group bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg transition-all hover:shadow-xl hover:bg-white/70 hover:scale-105"
              >
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-600/10 rounded-2xl flex items-center justify-center group-hover:bg-green-600/20 transition-colors">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-900">Farmer</h2>
                  <p className="text-gray-600">Manage your farm and livestock</p>
                  <div className="flex items-center justify-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                    <span>Access Dashboard</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Client Card */}
              <button
                type="button"
                onClick={() => setMode("client-login")}
                className="group bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg transition-all hover:shadow-xl hover:bg-white/70 hover:scale-105"
              >
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-900">Client</h2>
                  <p className="text-gray-600">Browse specific farmer's marketplace</p>
                  <div className="flex items-center justify-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                    <span>Enter Farmer Marketplace</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Back button for login/signup forms */}
          {mode !== "entry-gate" && (
            <button
              type="button"
              onClick={() => {
                setMode("entry-gate");
                setError("");
                setUsername("");
                setPassword("");
                setFarmName("");
              }}
              className="mt-4 text-green-600 hover:text-green-700 font-semibold flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Entry Gate
            </button>
          )}

          {mode !== "entry-gate" && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Role Selection */}
              {mode === "farmer-login" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-3">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        role === 'farmer' 
                          ? 'border-green-600 bg-green-50 text-green-700' 
                          : 'border-gray-300 bg-white/80 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">Farmer</div>
                        <div className="text-xs mt-1">Manage farm</div>
                      </div>
                    </button>
                                      </div>
                </div>
              )}

              {/* Farmer-specific fields */}
              {mode === "farmer-signup" && (
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

              {/* Username field - only show for farmers or during signup */}
              {(mode === "farmer-signup" || (mode === "farmer-login" && role === 'farmer')) && (
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter farmer username"
                      className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password field - only show for farmers or during signup */}
              {(mode === "farmer-signup" || (mode === "farmer-login" && role === 'farmer')) && (
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "farmer-signup" ? "Create password" : "Enter password"}
                      className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === "client-login" && (
                <>
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-2">
                      Client Access
                    </h2>
                    <p className="text-gray-600">
                      Enter farmer's username to browse their marketplace
                    </p>
                  </div>

                  {/* Client login - farmer username input */}
                  <div>
                    <label htmlFor="farmerUsername" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Enter Farmer Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        id="farmerUsername"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter farmer's username"
                        className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                        required
                      />
                    </div>
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
                    <ArrowRight className="h-4 w-4" />
                    Browse Farmer's Marketplace
                  </button>
                </>
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
                {mode === "farmer-login" ? (
                  role === 'farmer' ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Access Dashboard
                    </>
                  ) : (
                    <></>
                  )
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Create Farm Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* Sign-Up Link */}
          {mode === "farmer-login" && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">New farmer? 
                <button
                  type="button"
                  onClick={() => {
                    setMode("farmer-signup");
                    setError("");
                    setUsername("");
                    setPassword("");
                    setFarmName("");
                  }}
                  className="text-green-600 font-bold ml-1 hover:text-green-700 transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}