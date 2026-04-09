"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { MessageCircle, ArrowRight } from "lucide-react";
import Navigation from "@/app/components/Navigation";

interface LivestockItem {
  id: number;
  name: string;
  farm_name?: string | null;
  breed: string;
  price_ksh: number | null;
  image_url: string | null;
  video_url: string | null;
  health_status: string;
  status: string;
  weight?: number;
  age?: number;
}

type MediaComponentProps = {
  animal: Pick<LivestockItem, "name" | "image_url" | "video_url">;
};

function MediaComponent({ animal }: MediaComponentProps) {
  if (animal.video_url) {
    return (
      <video
        src={animal.video_url}
        muted
        loop
        autoPlay
        playsInline
        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
    );
  }

  return (
    <img
      src={animal.image_url ?? "/farm-placeholder.svg"}
      alt={animal.name}
      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
    />
  );
}

export default function MarketplacePage() {
  const [livestock, setLivestock] = useState<LivestockItem[]>([]);
  const [farmFilterName, setFarmFilterName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchForSaleLivestock();
  }, []);

  async function fetchForSaleLivestock() {
    setIsLoading(true);
    try {
      const savedFarmName = localStorage.getItem("marketplaceFarmName")?.trim() ?? "";
      setFarmFilterName(savedFarmName);

      const { data, error: fetchError } = await supabase
        .from("livestock")
        .select("*")
        .eq("status", "For Sale")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching livestock:", fetchError);
        setError("Failed to load marketplace inventory");
      } else {
        const forSaleOnly = ((data || []) as LivestockItem[]).filter(
          (animal) => animal.status === "For Sale"
        );
        const normalizedFarmName = savedFarmName.toLowerCase();
        const filteredByFarm =
          normalizedFarmName.length > 0
            ? forSaleOnly.filter((animal) => {
                const farmName = animal.farm_name?.toLowerCase() ?? "";
                return farmName.includes(normalizedFarmName);
              })
            : forSaleOnly;
        setLivestock(filteredByFarm);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const handleWhatsAppInquiry = (animal: LivestockItem) => {
    const priceText =
      animal.price_ksh === null || animal.price_ksh <= 0
        ? "Price on request"
        : `KSh ${animal.price_ksh.toLocaleString()}`;
    const message = `Hello! I am interested in buying ${animal.name}, the ${animal.breed} listed for ${priceText}. Is it still available?`;
    const phoneNumber = "254793412488";
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
  };

  function formatPrice(value: number | null) {
    if (value === null || value <= 0) {
      return "Price on request";
    }
    const formattedPrice = value.toLocaleString();
    return `KSh ${formattedPrice}`;
  }

  if (isLoading) {
    return (
      <>
        <Navigation currentPage="/shop" />
        <div className="relative min-h-screen bg-cover bg-center bg-no-repeat px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16" style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}>
          <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl rounded-2xl border border-slate-200/40 bg-white/70 p-4 md:p-6 lg:p-8 backdrop-blur-xl lg:ml-64">
            <h1 className="mb-6 md:mb-8 text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-900">Livestock Marketplace</h1>
            <div className="text-center text-sm md:text-base lg:text-lg text-gray-700">Loading available livestock...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/shop" />
      <div className="relative min-h-screen bg-cover bg-center bg-no-repeat px-4 md:px-6 py-12 pt-20 lg:pt-16 pb-20 lg:pb-16" style={{ backgroundImage: "url('/farmer-pasture-bg.svg')" }}>
        <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl rounded-2xl border border-slate-200/40 bg-white/70 p-4 md:p-6 lg:p-8 backdrop-blur-xl lg:ml-64">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 lg:mb-12 gap-4">
            <div>
              <h1 className="mb-2 text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-emerald-900">
                Livestock Marketplace
              </h1>
              <p className="text-sm md:text-base lg:text-lg text-gray-700">Browse healthy livestock in a simple, readable view.</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-800 px-4 py-2 md:px-6 md:py-3 text-sm md:text-base font-bold text-white shadow-md transition hover:bg-emerald-900"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {error && (
            <div className="mb-6 md:mb-8 rounded-lg border border-red-300 bg-red-50 px-4 py-3 md:px-6 md:py-4 text-sm md:text-base text-red-700">
              {error}
            </div>
          )}

          {livestock.length === 0 ? (
            <div className="rounded-xl md:rounded-2xl border border-gray-200 bg-white p-6 md:p-8 lg:p-12 text-center shadow-md">
              <p className="mb-4 text-sm md:text-base lg:text-lg text-gray-700">No livestock currently available for sale.</p>
              <p className="text-xs md:text-sm text-gray-600">
                {farmFilterName
                  ? `No listings found for farm "${farmFilterName}".`
                  : "Please check back later or contact us for inquiries."}
              </p>
            </div>
          ) : (
            <>
              {/* Inventory Count */}
              <div className="mb-6 md:mb-8 inline-block">
                <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-emerald-900">
                  {livestock.length} Animal{livestock.length !== 1 ? "s" : ""} Available
                </p>
              </div>

              {/* Livestock Grid */}
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {livestock.map((animal, index) => (
                  <div
                    key={animal.id}
                    className="group overflow-hidden rounded-xl md:rounded-2xl border border-slate-200 bg-white transition-all duration-300"
                  >
                    {/* Image Container */}
                    <div className="relative overflow-hidden bg-slate-100 h-48 md:h-56 lg:h-64">
                      <MediaComponent animal={animal} />
                    </div>

                    {/* Content */}
                    <div className="space-y-4 md:space-y-5 p-4 md:p-6">
                      {/* Name */}
                      <div>
                        <h3 className="text-lg md:text-xl lg:text-2xl font-bold capitalize tracking-tight text-emerald-900">{animal.name}</h3>
                        <p className="mt-1 text-xs md:text-sm uppercase tracking-[0.12em] text-slate-500">Breed</p>
                        <p className="text-base md:text-lg lg:text-xl font-bold tracking-tight text-slate-800">{animal.breed}</p>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 border-y border-slate-200 py-3 md:py-4">
                        {animal.age !== undefined && animal.age !== null && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Age</p>
                            <p className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900">{animal.age}</p>
                          </div>
                        )}
                        {animal.weight !== undefined && animal.weight !== null && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Weight</p>
                            <p className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900">{animal.weight}kg</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Health</p>
                          <p className="text-base md:text-lg lg:text-xl font-bold tracking-tight text-emerald-900">{animal.health_status}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sale Price</p>
                          <p className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-emerald-900">{formatPrice(animal.price_ksh)}</p>
                        </div>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleWhatsAppInquiry(animal)}
                          className="flex w-full items-center justify-center gap-2 h-12 rounded-lg border border-emerald-800 bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 py-2 md:px-5 md:py-3 text-sm md:text-base lg:text-lg font-bold text-white transition-colors hover:from-emerald-800 hover:to-emerald-900"
                        >
                          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          Ask on WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer Info */}
          <div className="mt-8 md:mt-12 lg:mt-16 border-t border-gray-300 pt-6 md:pt-8 lg:pt-12 text-center">
            <p className="text-xs md:text-sm text-gray-700">
              Questions? Use WhatsApp to inquire about any animal or receive more information.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}