import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-[#112211] to-[#0b131a] text-zinc-100 antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-full flex-col justify-between px-4 py-6 sm:px-6">
        <main className="flex-1 w-full">{children}</main>
        <footer className="w-full py-4 text-center mt-8 bg-transparent">
          <p className="text-xs font-semibold text-white/30 drop-shadow-sm tracking-widest uppercase">
            Created by Brandon
          </p>
        </footer>
      </div>
    </div>
  );
}
