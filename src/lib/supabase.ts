import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug missing environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced client with better session persistence options and error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // Store a local copy of session data
    storageKey: 'supabase.auth.token',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') {
          return null;
        }
        try {
          const value = window.localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error retrieving auth data from storage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(value));
          } catch (error) {
            console.error('Error storing auth data:', error);
          }
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing auth data:', error);
          }
        }
      },
    },
    // Refresh the session automatically
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
  realtime: {
    timeout: 30000,
  },
}); 