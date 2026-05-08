import { User as SupabaseUser } from '@supabase/supabase-js';

// Base user type that matches the database structure
export interface BaseUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_anonymous: boolean;
  is_super_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
  raw_user_meta_data?: Record<string, string | number | boolean | null>;
  raw_app_meta_data?: Record<string, string | number | boolean | null>;
}

// Extended profile data type
export interface UserProfile extends BaseUser {
  first_name: string;
  last_name: string;
  full_name: string;
  country?: string;
  address?: string;
  city?: string;
  avatar_url?: string;
}

// Type for user metadata stored in Supabase
export interface UserMetadata {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  country?: string;
  address?: string;
  city?: string;
}

// Type for creating/updating user profiles
export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  address?: string;
  city?: string;
  avatar_url?: string;
}

// Combined type for authenticated user with profile
export interface AuthenticatedUser extends SupabaseUser {
  profile?: UserProfile;
  metadata: UserMetadata;
}

// Type guard to check if user is authenticated
export function isAuthenticatedUser(user: SupabaseUser | null): user is AuthenticatedUser {
  return user !== null && 'id' in user;
} 