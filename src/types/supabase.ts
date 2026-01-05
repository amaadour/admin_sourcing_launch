export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      payments: {
        Row: {
          id: string
          user_id: string
          total_amount: number
          method: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          proof_url?: string
          payment_proof?: string
          reference_number?: string
          quotation_ids?: string[]
        }
        Insert: {
          id?: string
          user_id: string
          total_amount: number
          method: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          proof_url?: string
          payment_proof?: string
          reference_number?: string
          quotation_ids?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          total_amount?: number
          method?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          proof_url?: string
          payment_proof?: string
          reference_number?: string
          quotation_ids?: string[]
        }
      }
      payment_quotations: {
        Row: {
          id: string
          payment_id: string
          quotation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          quotation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          quotation_id?: string
          user_id?: string
          created_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          quotation_id: string
          product_name: string
          quantity: number
          status: string
          created_at: string
          product_images?: string[]
          image_url?: string
          hasImage?: boolean
          service_type?: string
          product_url?: string
          shipping_method?: string
          shipping_country?: string
          shipping_city?: string
          title_option1?: string
          total_price_option1?: string
          delivery_time_option1?: string
          description_option1?: string
          image_option1?: string
          title_option2?: string
          total_price_option2?: string
          delivery_time_option2?: string
          description_option2?: string
          image_option2?: string
          title_option3?: string
          total_price_option3?: string
          delivery_time_option3?: string
          description_option3?: string
          image_option3?: string
          user_id: string
        }
        Insert: {
          id?: string
          quotation_id: string
          product_name: string
          quantity: number
          status?: string
          created_at?: string
          product_images?: string[]
          image_url?: string
          hasImage?: boolean
          service_type?: string
          product_url?: string
          shipping_method?: string
          shipping_country?: string
          shipping_city?: string
          title_option1?: string
          total_price_option1?: string
          delivery_time_option1?: string
          description_option1?: string
          image_option1?: string
          title_option2?: string
          total_price_option2?: string
          delivery_time_option2?: string
          description_option2?: string
          image_option2?: string
          title_option3?: string
          total_price_option3?: string
          delivery_time_option3?: string
          description_option3?: string
          image_option3?: string
          user_id?: string
        }
        Update: {
          id?: string
          quotation_id?: string
          product_name?: string
          quantity?: number
          status?: string
          created_at?: string
          product_images?: string[]
          image_url?: string
          hasImage?: boolean
          service_type?: string
          product_url?: string
          shipping_method?: string
          shipping_country?: string
          shipping_city?: string
          title_option1?: string
          total_price_option1?: string
          delivery_time_option1?: string
          description_option1?: string
          image_option1?: string
          title_option2?: string
          total_price_option2?: string
          delivery_time_option2?: string
          description_option2?: string
          image_option2?: string
          title_option3?: string
          total_price_option3?: string
          delivery_time_option3?: string
          description_option3?: string
          image_option3?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 