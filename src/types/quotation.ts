export interface PriceOption {
  id: string;
  price: string;
  supplier: string;
  deliveryTime: string;
  description?: string;
  modelName?: string;
  modelImage?: string;
}

export interface QuotationProduct {
  name: string;
  image: string;
  category?: string;
  description?: string;
  unitGrossWeight?: string;
}

export interface QuotationData {
  id: string;
  user_id?: string;
  quotation_id: string;
  product: QuotationProduct;
  quantity: string;
  date: string;
  status: string;
  price: string;
  shippingMethod: string;
  destination: string;
  hasImage: boolean;
  created_at?: string;
  updated_at?: string;
  service_type?: string;
  priceOptions?: PriceOption[];
  image_url?: string;
  Quotation_fees?: number | null;
  user?: {
    email: string;
    fullName: string;
    role: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  // Price options fields
  title_option1?: string;
  total_price_option1?: string;
  unit_price_option1?: number;
  unit_weight_option1?: number;
  image_option1?: string;
  price_description_option1?: string;
  delivery_time_option1?: string;
  description_option1?: string;
  title_option2?: string;
  total_price_option2?: string;
  unit_price_option2?: number;
  unit_weight_option2?: number;
  image_option2?: string;
  price_description_option2?: string;
  delivery_time_option2?: string;
  description_option2?: string;
  title_option3?: string;
  total_price_option3?: string;
  unit_price_option3?: number;
  unit_weight_option3?: number;
  image_option3?: string;
  price_description_option3?: string;
  delivery_time_option3?: string;
  description_option3?: string;
  selected_option?: number;
  product_url?: string;
  image_option1_2?: string;
  image_option2_2?: string;
  image_option3_2?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
} 