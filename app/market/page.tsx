export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Livestock } from '@/types';

const formatPrice = (value: number) => `KSH ${value.toLocaleString()}`;
const getLivestockPrice = (item: Livestock) => Number(item.price_ksh ?? item.price ?? 0);

const LIVESTOCK_IMAGES_BUCKET = 'livestock-images';

import MarketCard from '../../src/components/MarketCard';

// Server-side helper to resolve public URLs for both image and video using the same bucket
const getPublicMediaUrl = (supabase: SupabaseClient, pathOrUrl?: string | null) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const result = supabase.storage.from(LIVESTOCK_IMAGES_BUCKET).getPublicUrl(pathOrUrl);
  return result.data?.publicUrl || '';
};

export default async function MarketPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
          {livestock.map((item: Livestock) => {
            const imageSrc = getPublicMediaUrl(supabase, item.image_url);
            const videoSrc = getPublicMediaUrl(supabase, item.video_url);
            return <MarketCard key={item.id} item={item} imageSrc={imageSrc} videoSrc={videoSrc} />;
          })}
        </div>
      )}
    </section>
  );
}