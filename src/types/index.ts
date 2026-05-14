export interface Livestock {
  id: string;
  owner_id?: string;
  user_id?: string;
  name: string;
  breed: string;
  age: number;
  liters_per_day?: number;
  price?: number;
  price_ksh?: number;
  status: 'Available' | 'Sold' | string;
  image_url?: string | null;
  video_url?: string | null;
  description?: string | null;
  location?: string | null;
  whatsapp_number?: string | null;
}
