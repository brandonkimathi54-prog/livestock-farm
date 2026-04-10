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
  is_for_sale?: boolean;
  weight?: number;
  age?: number;
  user_id?: number;
  whatsapp_number?: string | null;
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
      const targetFarm = localStorage.getItem("targetFarm")?.trim() ?? "";

      // If client entered a specific farmer's username, use that as filter
      if (targetFarm) {
        setFarmFilterName(targetFarm);
      } else {
        setFarmFilterName(savedFarmName);
      }

      const { data: marketplaceCows, error: fetchError } = await supabase
        .from("livestock")
        .select('*')
        .eq('is_for_sale', true);

      if (fetchError) {
        console.error("Error fetching livestock:", fetchError);
        setError("Failed to load marketplace inventory");
      } else {
        // Only display cows that have been marked 'For Sale' by the farmer
        const marketItems = ((marketplaceCows || []) as LivestockItem[]).filter(item => item.is_for_sale === true);
        setLivestock(marketItems);
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
    
    // Use the WhatsApp number from the profile, fallback to default if not available
    const phoneNumber = animal.whatsapp_number || "254793412488";
    
    // Clean the phone number (remove +, spaces, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`, "_blank");
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
        <div className="relative min-h-screen">
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
          />
          <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
          
          <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg">
              <h1 className="text-center text-3xl md:text-4xl font-bold text-green-900 mb-6">Livestock Marketplace</h1>
              <div className="text-center text-lg text-gray-600">Loading available livestock...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation currentPage="/shop" onLogout={() => {localStorage.clear(); window.location.href='/';}} />
      <div className="relative min-h-screen">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="fixed inset-0 bg-white/40" aria-hidden="true" />
        
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-12 pt-20 lg:pt-20 pb-24 lg:pb-24">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-green-900 mb-4">
              Livestock Marketplace
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Browse healthy livestock from local farmers
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
              >
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl text-center">
              {error}
            </div>
          )}

          {livestock.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg text-center">
              <p className="text-lg text-gray-700 mb-4">No livestock currently available for sale.</p>
              <p className="text-sm text-gray-600">
                {farmFilterName
                  ? `No listings found for farm "${farmFilterName}".`
                  : "Please check back later or contact us for inquiries."}
              </p>
            </div>
          ) : (
            <>
              {/* Inventory Count */}
              <div className="mb-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-green-900">
                  {livestock.length} Animal{livestock.length !== 1 ? "s" : ""} Available
                </p>
              </div>

              {/* Livestock Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {livestock.map((animal) => (
                  <div
                    key={animal.id}
                    className="group bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/70"
                  >
                    {/* Image Container */}
                    <div className="relative overflow-hidden bg-gray-100 h-64">
                      <MediaComponent animal={animal} />
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                      {/* Name */}
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-green-900 capitalize">{animal.name}</h3>
                        <p className="text-sm text-gray-500 uppercase tracking-[0.12em] mt-1">Breed</p>
                        <p className="text-xl font-bold text-gray-800">{animal.breed}</p>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {animal.age !== undefined && animal.age !== null && (
                          <div className="text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Age</p>
                            <p className="text-xl font-bold text-gray-900">{animal.age}</p>
                          </div>
                        )}
                        {animal.weight !== undefined && animal.weight !== null && (
                          <div className="text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Weight</p>
                            <p className="text-xl font-bold text-gray-900">{animal.weight}kg</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Health</p>
                          <p className="text-lg font-bold text-green-600">{animal.health_status}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-center space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Sale Price</p>
                          <p className="text-3xl font-bold text-green-900">{formatPrice(animal.price_ksh)}</p>
                        </div>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleWhatsAppInquiry(animal)}
                          className="w-full h-12 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
                        >
                          <MessageCircle className="w-5 h-5 inline mr-2" />
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
          <div className="mt-16 bg-white/60 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-lg text-center">
            <p className="text-gray-600">
              Questions? Use WhatsApp to inquire about any animal or receive more information.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}