import { supabase } from '@/lib/supabase';
import type { Livestock } from '@/types';

const formatPrice = (value: number) => `KSH ${value.toLocaleString()}`;

export default async function MarketPage() {
  const { data } = await supabase
    .from('livestock')
    .select('*')
    .eq('status', 'Available')
    .order('updated_at', { ascending: false });

  const livestock = (data ?? []) as Livestock[];

  return (
    <section className="space-y-8 py-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Universal Market</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
          Public livestock listings
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Browse animals available for sale and contact farmers directly through WhatsApp.
        </p>
      </div>

      {livestock.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200">
          <p className="text-slate-600">No livestock is available right now. Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {livestock.map((item: Livestock) => {
            const whatsappLink = item.whatsapp_number
              ? `https://wa.me/${item.whatsapp_number.replace(/\D/g, '')}`
              : undefined;

            return (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">{item.type}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">{item.name}</h2>
                  <p className="mt-3 text-sm text-slate-600">Breed: {item.breed}</p>
                  <p className="mt-1 text-sm text-slate-600">Location: {item.location ?? 'Unknown'}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{formatPrice(item.price)}</p>
                  <div className="mt-6 flex flex-col gap-3">
                    <a
                      href={whatsappLink ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                        whatsappLink ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                      }`}
                    >
                      {whatsappLink ? 'Contact Farmer' : 'Contact Info Unavailable'}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
