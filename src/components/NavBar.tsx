'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function NavBar() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => setSession(data.session));

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Smart Farmer
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Link href="/market" className="rounded-full px-4 py-2 transition hover:bg-slate-100">
            Market
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700">
                Dashboard
              </Link>
            </>
          ) : (
            <Link href="/auth" className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
