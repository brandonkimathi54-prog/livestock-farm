"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, MapPin, Mail, User, Building } from "lucide-react";
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

export default function SignUpPage() {
  const [farmName, setFarmName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const trimmedFarmName = farmName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedLocation = location.trim();

    // Validation
    if (!trimmedFarmName) {
      setError("Please enter your farm name.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedUsername) {
      setError("Please enter a username.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email.");
      setIsSubmitting(false);
      return;
    }

    // Basic email validation
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedPassword) {
      setError("Please create a password.");
      setIsSubmitting(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedLocation) {
      setError("Please enter your location.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .ilike("username", trimmedUsername)
        .limit(1);

      if (checkError) {
        console.log("Supabase Error Details:", checkError);
        setError(getSupabaseErrorMessage(checkError));
        setIsSubmitting(false);
        return;
      }

      if (existingUser && existingUser.length > 0) {
        setError("Username already exists. Please choose a different username.");
        setIsSubmitting(false);
        return;
      }

      // Create new farmer profile
      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          farm_name: trimmedFarmName,
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPassword,
          location: trimmedLocation,
        })
        .select("id, farm_name, username")
        .single();

      if (insertError) {
        console.log("Supabase Error Details:", insertError);
        setError(getSupabaseErrorMessage(insertError));
        setIsSubmitting(false);
        return;
      }

      // Store user data in localStorage
      localStorage.setItem("marketplaceFarmName", insertedProfile?.farm_name ?? trimmedFarmName);
      localStorage.setItem("userRole", "farmer");
      if (insertedProfile?.id !== undefined && insertedProfile?.id !== null) {
        localStorage.setItem("currentUserId", String(insertedProfile.id));
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(`Network error: ${message}`);
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
        <section className="w-[92%] md:w-[500px] mx-auto rounded-3xl border border-white/40 bg-white/55 p-6 md:p-8 font-[var(--font-geist-sans)] shadow-xl backdrop-blur-xl">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Farmer Registration Portal
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-emerald-900 sm:text-7xl">
              SMART FARMER
            </h1>
            <p className="text-sm md:text-base text-gray-600 sm:text-lg">
              Create your farm management account and join our marketplace
            </p>
          </div>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              href="/"
              className="text-green-600 hover:text-green-700 font-semibold inline-flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Login
            </Link>
          </div>

          <form onSubmit={handleSignUp} className="mt-6 space-y-5">
            {/* Farm Name Field */}
            <div>
              <label htmlFor="farmName" className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-2">
                Farm Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <input
                  id="farmName"
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="Enter your farm name"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">This will identify your farm in the marketplace</p>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                />
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">For login and marketplace identification</p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-2">
                Create Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-green-600" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters to secure your farm data</p>
            </div>

            {/* Location Field */}
            <div>
              <label htmlFor="location" className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900 mb-2">
                Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your farm location"
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-3 text-base md:text-lg text-green-900 placeholder-green-700/50 outline-none ring-green-600 transition focus:ring-2"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Helpful for local buyers in the marketplace</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-green-600 px-4 py-2 md:px-6 md:py-4 text-sm md:text-base font-bold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                "Creating Account..."
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Create Farm Account
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/" className="text-green-600 font-bold hover:text-green-700 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
