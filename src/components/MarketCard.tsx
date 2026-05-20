"use client";

import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabaseWrapper';
import { Play, Calendar, Droplets, MapPin, MessageCircle } from "lucide-react";
import type { Livestock } from "@/types";

interface MarketCardProps {
  item: Livestock;
  imageSrc?: string;
  videoSrc?: string;
}

export default function MarketCard({ item, imageSrc, videoSrc }: MarketCardProps) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeType, setActiveType] = useState<'image' | 'video' | null>(null);
  const [activeSrc, setActiveSrc] = useState<string>('');

  useEffect(() => {
    const initialImage = getImageUrl(imageSrc ?? item.image_url) || getImageUrl(item.image_url);
    const initialVideo = getVideoUrl(videoSrc ?? item.video_url) || getVideoUrl(item.video_url);
    if (initialImage) {
      setActiveType('image');
      setActiveSrc(initialImage);
    } else if (initialVideo) {
      setActiveType('video');
      setActiveSrc(initialVideo);
    } else {
      setActiveType(null);
      setActiveSrc('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, videoSrc, item.image_url, item.video_url]);

  const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data } = supabase.storage.from('livestock-images').getPublicUrl(path);
      return data?.publicUrl || '';
    } catch (e) {
      return '';
    }
  };

  const getVideoUrl = (path?: string | null) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data } = supabase.storage.from('livestock-images').getPublicUrl(path);
      return data?.publicUrl || '';
    } catch (e) {
      return '';
    }
  };

  const formatPrice = (value: number) => `KSH ${value.toLocaleString()}`;

  const getWhatsAppUrl = (raw?: string) => {
    if (!raw) return undefined;
    const digits = raw.replace(/\D/g, "");
    if (!digits) return undefined;
    // Normalize to Kenya country code (254)
    let normalized = digits;
    if (normalized.startsWith("+")) normalized = normalized.slice(1);
    if (normalized.startsWith("0")) normalized = `254${normalized.slice(1)}`;
    if (!normalized.startsWith("254") && normalized.length <= 9) normalized = `254${normalized}`;
    const text = encodeURIComponent(`Hello, I am interested in your livestock: ${item.name} (${item.breed ?? ""})`);
    return `https://wa.me/${normalized}?text=${text}`;
  };

  const whatsappLink = getWhatsAppUrl(item.whatsapp_number ?? undefined);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/6 bg-slate-950 text-white">
      <div className="relative w-full overflow-hidden bg-slate-900">
        <div className="aspect-[16/9] w-full">
          {/* media area uses absolute children */}
          <div className="relative h-full w-full">
            {activeType === 'video' && activeSrc ? (
              <video
                className="h-full w-full object-cover"
                src={activeSrc}
                controls
                autoPlay
                playsInline
              />
            ) : activeType === 'image' && activeSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeSrc}
                alt={`${item.name} image`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Droplets size={28} />
                  <span className="text-sm">No media available</span>
                </div>
              </div>
            )}

            {(() => {
              const hasImage = Boolean(getImageUrl(imageSrc ?? item.image_url) || getImageUrl(item.image_url));
              const hasVideo = Boolean(getVideoUrl(videoSrc ?? item.video_url) || getVideoUrl(item.video_url));
              if (hasVideo && hasImage && activeType !== 'video') {
                return (
                  <button
                    aria-label="Play video"
                    onClick={() => {
                      const v = getVideoUrl(videoSrc ?? item.video_url) || getVideoUrl(item.video_url);
                      if (v) {
                        setActiveType('video');
                        setActiveSrc(v);
                        setIsPlayingVideo(true);
                      }
                    }}
                    className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-3 text-white hover:bg-black/50"
                  >
                    <Play size={22} />
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {item.breed && (
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{item.breed}</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.status === 'Sold' ? 'bg-rose-600 text-white' : 'bg-emerald-700 text-white'}`}>
              {item.status}
            </span>
          </div>
        </div>

        <h3 className="mt-3 truncate text-2xl font-black text-white">{item.name}</h3>

        {item.description && (
          <p className="mt-2 text-sm text-slate-400 line-clamp-2">{item.description}</p>
        )}

        <div className="mt-4 flex items-start justify-between gap-4 border-y border-white/5 py-3 text-sm text-slate-300">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 text-slate-200">
              <Calendar size={16} />
              <span className="text-xs">{item.age ?? '-'} yrs</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200 justify-center">
              <Droplets size={16} />
              <span className="text-xs">{item.liters_per_day ?? '-'} L</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200 justify-start">
              <MapPin size={16} />
              <span className="max-w-[8rem] truncate text-xs text-slate-300">{item.location ?? '—'}</span>
            </div>
          </div>

          <div className="w-32 shrink-0">
            <div className="text-xs text-slate-400 mb-2 font-semibold">Photos</div>
            <div className="flex flex-col gap-2">
              {(() => {
                const imgs: { type: 'image' | 'video'; src: string }[] = [];
                const mainImage = getImageUrl(imageSrc ?? item.image_url) || getImageUrl(item.image_url);
                const mainVideo = getVideoUrl(videoSrc ?? item.video_url) || getVideoUrl(item.video_url);
                if (mainImage) imgs.push({ type: 'image', src: mainImage });
                if (mainVideo) imgs.push({ type: 'video', src: mainVideo });
                return imgs.slice(0, 3).map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveType(m.type);
                      setActiveSrc(m.src);
                      setIsPlayingVideo(m.type === 'video');
                    }}
                    className={`h-12 w-12 rounded-md overflow-hidden border ${activeSrc === m.src ? 'border-emerald-500' : 'border-white/6'} bg-slate-800`}
                    aria-label={`Select ${m.type} ${idx + 1}`}
                  >
                    {m.type === 'video' ? (
                      <video className="h-full w-full object-cover" src={m.src} preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.src} alt={`thumb-${idx}`} className="h-full w-full object-cover" />
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">Asking Price</div>
            <div className="mt-1 text-lg font-extrabold text-white">{formatPrice(Number(item.price_ksh ?? item.price ?? 0))}</div>
          </div>

          <div>
            <a
              href={whatsappLink ?? '#'}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${whatsappLink ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-slate-400 cursor-not-allowed'}`}
            >
              <MessageCircle size={16} />
              Contact Farmer
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
