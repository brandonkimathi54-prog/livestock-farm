'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseWrapper';
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
    <header className="bg-green-700 text-white flex items-center justify-between p-4 shadow-md relative z-20">
      <div className="flex items-center gap-3">
        {/* Use the Epaphroditus Farm logo */}
        <img src="/android-chrome-192x192.png" alt="Epaphroditus Farm Logo" className="h-8 w-8" />
        
        <span className="text-2xl font-semibold tracking-tight">Epaphroditus Farm</span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/market" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
          Market
        </Link>
        {session ? (
          <Link href="/dashboard" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
            Dashboard
          </Link>
        ) : (
          <Link href="/auth" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
            Login
          </Link>
        )}
        <div className="w-3 h-3 bg-emerald-500 rounded-full ml-1" title="Connected"></div>
        <span className="text-sm font-light text-emerald-100">Online</span>
      </div>
    </header>
  );
}
