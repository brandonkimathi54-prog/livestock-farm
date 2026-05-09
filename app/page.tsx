import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-8 py-12 text-slate-900">
      <div className="rounded-3xl bg-white p-10 shadow-sm shadow-slate-200">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Epaphroditus Farm</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Grow your livestock business with a modern marketplace and farm dashboard.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Browse available animals, manage your herd, and keep sales and inventory in one place with Supabase-powered auth and data.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link href="/market" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Visit The Market
          </Link>
          <Link href="/auth" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            Login / Sign up
          </Link>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
          <h2 className="text-xl font-semibold">Public Market</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">View available livestock listings without signing in.</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
          <h2 className="text-xl font-semibold">Secure Dashboard</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Manage only your own livestock and track herd value.</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
          <h2 className="text-xl font-semibold">Supabase Auth</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Authenticate with email and redirect to your private dashboard.</p>
        </div>
      </div>
    </section>
  );
}
