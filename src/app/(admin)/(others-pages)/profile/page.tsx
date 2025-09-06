"use client";

import React, { Suspense } from "react";
import dynamic from 'next/dynamic';

// Import components dynamically with SSR disabled
const UserInfoCard = dynamic(() => import("@/components/user-profile/UserInfoCard"), {
  ssr: false,
});



// Loading fallback component
const LoadingCard = () => (
  <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
    <div className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
  </div>
);

export default function Profile() {
  return (
    <div>
      <div className="rounded-2xl bg-white dark:bg-gray-900">
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white md:text-2xl">
          My Profile
        </h3>
      </div>

      <div className="space-y-6">

    
        <Suspense fallback={<LoadingCard />}>
          <UserInfoCard />
        </Suspense>
      </div>
    </div>
  );
}
