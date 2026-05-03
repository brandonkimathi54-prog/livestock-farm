export interface Livestock {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  price: number;
  status: 'Available' | 'Sold' | string;
  image_url?: string | null;
  description?: string | null;
  location?: string | null;
  whatsapp_number?: string | null;
}
