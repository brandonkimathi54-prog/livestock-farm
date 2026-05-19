export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@/utils/supabase/server'; // Correct Server Side initialization context
import type { Livestock } from '@/types';

const formatPrice = (value: number) => `KSH ${value.toLocaleString()}`;
const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

const LIVESTOCK_IMAGES_BUCKET = 'livestock-images';
const LIVESTOCK_VIDEOS_BUCKET = 'livestock-videos';

// Clean inline helper matching absolute and path structures natively
const getPublicMediaUrl = (supabase: any, bucket: string, pathOrUrl?: string | null) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
};

function LivestockCard({ item, supabase }: { item: Livestock; supabase: any }) {
  const whatsappLink = item.whatsapp_number
    ? `https://wa.me/${item.whatsapp_number.replace(/\D/g, '')}?text=Hello,%20I%20am%20interested%20in%20purchasing%20your%20livestock:%20${item.name}%20(${item.breed || ''})`
    : undefined;

  const imageSrc = getPublicMediaUrl(supabase, LIVESTOCK_IMAGES_BUCKET, item.image_url);
  const videoSrc = getPublicMediaUrl(supabase, LIVESTOCK_VIDEOS_BUCKET, item.video_url);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* MEDIA CONTAINER: Stack clean fallback hierarchy to prevent awkward column layout splits */}
        <div className="relative aspect-[4/3] w-full bg-slate-900 flex items-center justify-center overflow-hidden">
          {videoSrc ? (
            <video 
              className="h-full w-full object-cover" 
              src={videoSrc} 
              controls 
              preload="none" 
            />
          ) : imageSrc ? (
            <img 
              className="h-full w-full object-cover" 
              src={imageSrc} 
              alt={`${item.name} livestock listing`} 
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) parent.innerHTML = '<span class="text-slate-400 text-sm">Image Unreadable</span>';
              }}
            />
          ) : (
            <span className="text-slate-500 text-sm font-medium">No media available</span>
          )}
        </div>

        {/* Content Elements Card Block */}
        <div className="p-6">
          {item.breed ? (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{item.breed}</p>
          ) : null}
          <h2 className="mt-2 text-2xl font-bold text-slate-900 capitalize">{item.name}</h2>
          
          <div className="mt-4 space-y-1.5 border-t border-b border-slate-100 py-3 text-sm text-slate-600">
            <p><span className="font-medium text-slate-800">Age:</span> {item.age} years</p>
            <p>
              <span className="font-medium text-slate-800">Location:</span> {item.location || 'Not recorded'}
            </p>
            {item.description && (
              <p className="mt-2 text-xs text-slate-400 italic line-clamp-2">"{item.description}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing and Action Routing Layer Container */}
      <div className="px-6 pb-6">
        <p className="text-2xl font-black text-slate-900">{formatPrice(getLivestockPrice(item))}</p>
        <div className="mt-4">
          <a
            href={whatsappLink ?? '#'}
            target="_blank"
            rel="noreferrer"
            className={`w-full inline-flex items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-bold transition-all shadow-sm ${
              whatsappLink 
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95' 
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
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
  const supabase = createClient();

  const { data, error } = await supabase
    .from('livestock')
    .select('*')
    .eq('status', 'Available')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Database connection exception tracking:', error);
  }

  const livestock = (data ?? []) as Livestock[];

  return (
    <section className="space-y-6 py-6 sm:space-y-8 sm:py-8 max-w-7xl mx-auto px-4">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">Universal Market</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
          Public livestock listings
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500 text-sm sm:text-base">
          Browse animals available for sale and contact farmers directly through WhatsApp.
        </p>
      </div>

      {livestock.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center border border-dashed border-slate-300 shadow-sm">
          <p className="text-slate-500 font-medium text-sm">No live market listings found matching active inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {livestock.map((item: Livestock) => (
            <LivestockCard key={item.id} item={item} supabase={supabase} />
          ))}
        </div>
      )}
    </section>
  );
}