"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    const checkAdminAccess = async () => {
      if (user) {
        // Check if user is in admin_users table
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email || '')
          .single();

        if (adminError || !adminUser) {
          console.error("Not an admin user, redirecting to signin");
          await supabase.auth.signOut();
          router.push("/signin");
          return;
        }

        console.log("Admin user detected, redirecting to dashboard");
        router.push("/dashboard-home");
      } else {
        console.log("No user detected, redirecting to signin");
        router.push("/signin");
      }
    };

    checkAdminAccess();
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Loading...</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 