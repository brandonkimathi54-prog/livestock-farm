import { supabase } from '@/lib/supabaseWrapper';
import type { Livestock } from '@/types';

const formatPrice = (value: number) => `KSH ${value.toLocaleString()}`;
const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

const COW_PHOTOS_BUCKET = 'cow photos';
const MARKET_VIDEOS_BUCKET = 'market-videos';

const getPublicMediaUrl = (bucket: string, pathOrUrl?: string | null) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
};

function LivestockCard({ item }: { item: Livestock }) {
  const whatsappLink = item.whatsapp_number
    ? `https://wa.me/${item.whatsapp_number.replace(/\D/g, '')}`
    : undefined;
  const imageSrc = item.image_url
    ? /^https?:\/\//i.test(item.image_url)
      ? item.image_url
      : supabase.storage.from(COW_PHOTOS_BUCKET).getPublicUrl(item.image_url).data.publicUrl
    : '';
  const videoSrc = getPublicMediaUrl(MARKET_VIDEOS_BUCKET, item.video_url);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 bg-slate-100 sm:grid-cols-2">
        {videoSrc ? (
          <video className="aspect-[4/3] h-full w-full object-cover" src={videoSrc} controls preload="metadata" />
        ) : null}
        {imageSrc ? (
          <img className="aspect-[4/3] h-full w-full object-cover" src={imageSrc} alt={`${item.name} livestock listing`} loading="lazy" />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center bg-slate-200 text-slate-500">
            No image available
          </div>
        )}
      </div>
      <div className="p-6">
        {item.breed ? (
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">{item.breed}</p>
        ) : null}
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">{item.name}</h2>
        <p className="mt-3 text-sm text-slate-600">Age: {item.age} years</p>
        <p className="mt-1 text-sm text-slate-600">
          Weight: {item.weight_kg != null ? `${item.weight_kg} kg` : 'Not recorded'}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Last vaccination:{' '}
          {item.last_vaccination_date
            ? /^\d{4}-\d{2}-\d{2}$/.test(item.last_vaccination_date)
              ? new Date(`${item.last_vaccination_date}T12:00:00`).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : item.last_vaccination_date
            : 'Not recorded'}
        </p>
        <p className="mt-3 text-xl font-semibold text-slate-900">{formatPrice(getLivestockPrice(item))}</p>
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
}

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
          {livestock.map((item: Livestock) => (
            <LivestockCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
