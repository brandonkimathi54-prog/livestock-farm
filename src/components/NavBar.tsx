'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseWrapper';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function NavBar() {
  const [session, setSession] = useState<Session | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => setSession(data.session));

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setInstallReady(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const handleInstallClick = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setInstallReady(false);
  };

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 bg-green-700 p-4 text-white shadow-md">
      <div className="flex items-center gap-3">
        {/* Use the Epaphroditus Farm logo */}
        <img src="/android-chrome-192x192.png" alt="Epaphroditus Farm Logo" className="h-8 w-8" />

        <span className="text-2xl font-semibold tracking-tight">Epaphroditus Farm</span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/market" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
          Market
        </Link>
        {session ? (
          <>
            <Link href="/dashboard" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
              Dashboard
            </Link>
            <Link href="/records" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
              All Records
            </Link>
          </>
        ) : null}
        {installReady ? (
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            className="rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-emerald-950 transition hover:bg-amber-300"
          >
            Install app
          </button>
        ) : (
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-emerald-100" title="Install becomes available when the browser supports this app as a PWA">
            PWA install
          </span>
        )}
        {session ? null : (
          <Link href="/auth" className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium transition hover:bg-white/20">
            Login
          </Link>
        )}
        <div className="ml-1 h-3 w-3 rounded-full bg-emerald-500" title="Connected"></div>
        <span className="text-sm font-light text-emerald-100">Online</span>
      </div>
    </header>
  );
}
