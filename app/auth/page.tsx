'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseWrapper';
import { Eye, EyeOff } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          alert(error.message);
        } else if (data.user) {
          // Forces the browser to reload and send the new cookies to the Middleware
          window.location.href = '/dashboard';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        alert('Login Error: ' + message);
        setErrorMessage(message);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsSubmitted(true);
      }
    }

    setLoading(false);
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-sm shadow-slate-200" style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(6px)' }}>
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Account access</p>
        <h1 className="text-3xl font-semibold text-slate-900">{mode === 'login' ? 'Login to Epaphroditus Farm' : 'Create your account'}</h1>
        <p className="text-sm leading-6 text-slate-600">
          {mode === 'login'
            ? 'Sign in with your email and password to manage your herd.'
            : 'Sign up to access your private dashboard and start listing livestock.'}
        </p>
      </div>

      {isSubmitted ? (
        <div className="mt-8 rounded-3xl bg-green-50 border border-green-200 p-6 text-green-800" style={{ background: 'rgba(0, 128, 0, 0.1)', backdropFilter: 'blur(5px)' }}>
          <p className="text-lg font-semibold">Check your Inbox!</p>
          <p className="mt-2">We sent a confirmation link to your email. Please click it to activate your Smart Farmer account.</p>
        </div>
      ) : (
        <>
          <form className="mt-8 space-y-5" onSubmit={(e) => handleLogin(e)}>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-zinc-950 placeholder-zinc-500 outline-none transition focus:border-slate-400"
            />

            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium text-zinc-950 placeholder-zinc-500 outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-2 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/0 text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
            <button
              type="button"
              className="font-semibold text-slate-900 underline-offset-4 transition hover:text-slate-700"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
