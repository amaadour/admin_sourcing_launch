"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { QuotationData } from "@/types/quotation";
import QuotationEditModal from "@/components/quotation/QuotationEditModal";
import PriceOptionsModal from "@/components/quotation/PriceOptionsModal";

// Constants
const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type StatusOption = typeof STATUS_OPTIONS[number];

// Metrics interface
interface QuotationMetrics {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface CustomTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
  children: React.ReactNode;
  colSpan?: number;
  isHeader?: boolean;
}

const TableCell = ({ className, children, colSpan, isHeader, ...props }: CustomTableCellProps) => {
  if (isHeader) {
    return (
      <th className={className} colSpan={colSpan} {...props}>
        {children}
      </th>
    );
  }
  return (
    <td className={className} colSpan={colSpan} {...props}>
      {children}
    </td>
  );
};

// Update the UserInfo interface
interface UserInfo {
  email: string;
  fullName: string;
  role: string;
  phone: string;
  country: string;
}

// Helper to validate Supabase image URLs
const isValidImageUrl = (url: string | null | undefined) =>
  !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

export default function QuotationPage() {
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>('All');
  const [metrics, setMetrics] = useState<QuotationMetrics>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [currentQuotation, setCurrentQuotation] = useState<QuotationData | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<UserInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get the current user from auth context
  const { user } = useAuth();

  // Wrap fetchData in useCallback to make it stable
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError("Authentication required");
        setQuotations([]);
        setIsLoading(false);
        return;
      }

      // Build the base query with proper join
      let query = supabase
        .from('quotations')
        .select(`
          *,
          rejection_reason,
          profiles (
            id,
            email,
            full_name,
            phone,
            country,
            role
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply status filter
      if (selectedStatus !== 'All') {
        query = query.eq('status', selectedStatus);
      }

      // Apply search filter if exists
      if (searchQuery) {
        query = query.or(
          `product_name.ilike.%${searchQuery}%,quotation_id.ilike.%${searchQuery}%,shipping_country.ilike.%${searchQuery}%`
        );
      }

      // Apply country filter
      if (countryFilter) {
        query = query.eq('shipping_country', countryFilter);
      }

      // Apply user filter (search by email or full name on joined profiles)
      if (userFilter) {
        query = query.or(`email.ilike.%${userFilter}%,full_name.ilike.%${userFilter}%`, { foreignTable: 'profiles' });
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);
      
      // Execute the query
      const { data: quotationsData, error: quotationsError, count } = await query as unknown as {
        data: Array<{
          id: string;
          user_id: string;
          quotation_id?: string;
          product_name?: string;
          image_url?: string;
          product_description?: string;
          quantity?: number;
          created_at: string;
          status?: string;
          total_price_option1?: string | number;
          unit_price_option1?: number;
          unit_weight_option1?: number;
          extra_images_option1?: string[];
          shipping_method?: string;
          shipping_city?: string;
          shipping_country?: string;
          Quotation_fees?: number | null;
          service_type?: string;
          title_option1?: string;
          image_option1?: string;
          price_description_option1?: string;
          delivery_time_option1?: string;
          description_option1?: string;
          total_price_option2?: string;
          unit_price_option2?: number;
          unit_weight_option2?: number;
          extra_images_option2?: string[];
          title_option2?: string;
          image_option2?: string;
          price_description_option2?: string;
          delivery_time_option2?: string;
          description_option2?: string;
          title_option3?: string;
          total_price_option3?: string;
          unit_price_option3?: number;
          unit_weight_option3?: number;
          extra_images_option3?: string[];
          image_option3?: string;
          price_description_option3?: string;
          delivery_time_option3?: string;
          description_option3?: string;
          selected_option?: number;
          product_url?: string;
          receiver_name?: string;
          receiver_phone?: string;
          receiver_address?: string;
          rejection_reason?: string | null;
          client_label?: string | null;
          is_customizable?: boolean | null;
          customization_price?: number | null;
          selected_version?: string | null;
          profiles?: {
            email?: string;
            full_name?: string;
            role?: string;
            phone?: string;
            country?: string;
          };
        }> | null,
        error: unknown,
        count: number | null
      };

      if (quotationsError) {
        console.error('Error fetching quotations:', quotationsError);
        throw quotationsError;
      }

      console.log('Raw quotations data:', quotationsData); // Debug log

      // Calculate total pages
      if (count !== null) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }

      // Format the data
      const formattedData = quotationsData?.map((item) => {
        return {
          id: item.id,
          user_id: item.user_id,
          quotation_id: item.quotation_id || `QT-${item.id}`,
          product: {
            name: item.product_name || "",
            image: item.image_url || "",
            category: '', // Don't use service_type as category
            description: item.product_description || ""
          },
          quantity: item.quantity?.toString() || "0",
          date: item.created_at,
          status: item.status || "Pending",
          price: item.total_price_option1?.toString() || "0",
          shippingMethod: item.shipping_method || "",
          destination: item.shipping_city ? `${item.shipping_city}, ${item.shipping_country}` : "",
          hasImage: Boolean(item.image_url),
          Quotation_fees: item.Quotation_fees,
          user: item.profiles ? {
            email: item.profiles.email || "",
            fullName: item.profiles.full_name || "",
            role: item.profiles.role || "",
            phone: item.profiles.phone || "",
            address: "",
            city: "",
            country: item.profiles.country || ""
          } : undefined,
          service_type: item.service_type,
          // Add price options data
          title_option1: item.title_option1,
          total_price_option1: item.total_price_option1 !== undefined ? String(item.total_price_option1) : undefined,
          unit_price_option1: item.unit_price_option1,
          unit_weight_option1: item.unit_weight_option1,
          image_option1: item.image_option1,
          extra_images_option1: item.extra_images_option1,
          price_description_option1: item.price_description_option1,
          delivery_time_option1: item.delivery_time_option1,
          description_option1: item.description_option1,
          title_option2: item.title_option2,
          total_price_option2: item.total_price_option2,
          unit_price_option2: item.unit_price_option2,
          unit_weight_option2: item.unit_weight_option2,
          image_option2: item.image_option2,
          extra_images_option2: item.extra_images_option2,
          price_description_option2: item.price_description_option2,
          delivery_time_option2: item.delivery_time_option2,
          description_option2: item.description_option2,
          title_option3: item.title_option3,
          total_price_option3: item.total_price_option3,
          unit_price_option3: item.unit_price_option3,
          unit_weight_option3: item.unit_weight_option3,
          image_option3: item.image_option3,
          extra_images_option3: item.extra_images_option3,
          price_description_option3: item.price_description_option3,
          delivery_time_option3: item.delivery_time_option3,
          description_option3: item.description_option3,
          selected_option: item.selected_option,
          product_url: item.product_url,
          receiver_name: item.receiver_name,
          receiver_phone: item.receiver_phone,
          receiver_address: item.receiver_address,
          rejection_reason: item.rejection_reason ?? null,
          client_label: item.client_label ?? null,
          is_customizable: item.is_customizable ?? false,
          customization_price: item.customization_price ?? null,
          selected_version: (item.selected_version as 'stock' | 'customized' | null) ?? null,
        };
      }) || [];

      setQuotations(formattedData);

      // Calculate metrics
      const metricsRes = await supabase
        .from('quotations')
        .select('status');

      const metricsData = (metricsRes.data ?? []) as unknown as Array<{ status?: string | null }>

      if (metricsData && Array.isArray(metricsData)) {
        const total = metricsData.length;
        const approved = metricsData.filter(item => item.status === "Approved").length;
        const pending = metricsData.filter(item => item.status === "Pending").length;
        const rejected = metricsData.filter(item => item.status === "Rejected").length;
        
        setMetrics({ total, approved, pending, rejected });
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentPage, selectedStatus, searchQuery, countryFilter, userFilter]);

  // Use fetchData in useEffect
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load distinct destination countries for the filter dropdown
  useEffect(() => {
    const loadCountries = async () => {
      const { data } = await supabase.from('quotations').select('shipping_country').not('shipping_country', 'is', null).neq('shipping_country', '');
      if (data) {
        const rows = data as unknown as { shipping_country?: string }[];
        const unique = [...new Set(rows.map(r => r.shipping_country).filter(Boolean))] as string[];
        setAvailableCountries(unique.sort());
      }
    };
    loadCountries();
  }, []);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle status filter change
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value as StatusOption);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All');
    setCountryFilter('');
    setUserFilter('');
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedStatus !== 'All',
    countryFilter,
    userFilter,
    searchQuery,
  ].filter(Boolean).length;

  // Add modal handlers
  const handleEdit = (quotation: QuotationData) => {
    setCurrentQuotation(quotation);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setCurrentQuotation(null);
    setIsEditModalOpen(false);
  };

  const handleQuotationUpdate = () => {
    // Refetch data after update
    fetchData();
  };

  const UserInfoModal = ({ isOpen, onClose, userInfo }: { 
    isOpen: boolean; 
    onClose: () => void; 
    userInfo: NonNullable<typeof selectedUserInfo>;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">User Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Full Name</label>
              <p className="text-gray-900 dark:text-white">{userInfo.fullName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{userInfo.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Phone</label>
              <p className="text-gray-900 dark:text-white">{userInfo.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Country</label>
              <p className="text-gray-900 dark:text-white">{userInfo.country || 'Not provided'}</p>
            </div>
            {userInfo.role === 'admin' && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Role</label>
                <p className="text-gray-900 dark:text-white">{userInfo.role}</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Page Header Section */}
      <div className="col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[#0D47A1] dark:text-blue-400">
            Quotation Management
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/quotation/new">
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-[#1E88E5] hover:bg-[#0D47A1] dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Create New Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {/* Total Quotes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] dark:bg-blue-900/30 rounded-xl">
              <svg className="text-[#0D47A1] dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mt-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Quotes
              </span>
              <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-blue-400">
                {metrics.total}
              </h4>
            </div>
          </div>

          {/* Approved Quotes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] dark:bg-blue-900/30 rounded-xl">
              <svg className="text-[#0D47A1] dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mt-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Approved Quotes
              </span>
              <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-blue-400">
                {metrics.approved}
              </h4>
            </div>
          </div>

          {/* Pending Quotes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] dark:bg-blue-900/30 rounded-xl">
              <svg className="text-[#0D47A1] dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mt-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Pending Quotes
              </span>
              <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-blue-400">
                {metrics.pending}
              </h4>
            </div>
          </div>

          {/* Rejected Quotes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] dark:bg-blue-900/30 rounded-xl">
              <svg className="text-[#0D47A1] dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mt-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Rejected Quotes
              </span>
              <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-blue-400">
                {metrics.rejected}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="col-span-12">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] mb-4">
          {/* Row 1: search + clear */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* General search */}
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by QT number, product or country..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <svg className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* User search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
                placeholder="Filter by user (name / email)..."
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <svg className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Row 2: dropdowns + date range */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status custom dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(o => !o)}
                onBlur={() => setTimeout(() => setStatusDropdownOpen(false), 150)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E88E5] min-w-[130px] justify-between"
              >
                <span className={selectedStatus !== 'All' ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {selectedStatus === 'All' ? 'All Statuses' : selectedStatus}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {statusDropdownOpen && (
                <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {STATUS_OPTIONS.map(status => (
                    <li
                      key={status}
                      onMouseDown={() => { handleStatusChange({ target: { value: status } } as React.ChangeEvent<HTMLSelectElement>); setStatusDropdownOpen(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors
                        ${selectedStatus === status
                          ? 'bg-[#1E88E5] text-white'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-[#1E88E5] hover:text-white'
                        }`}
                    >
                      {status === 'All' ? 'All Statuses' : status}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Country custom dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountryDropdownOpen(o => !o)}
                onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E88E5] min-w-[140px] justify-between"
              >
                <span className={countryFilter ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {countryFilter || 'All Countries'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {countryDropdownOpen && (
                <ul className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {['', ...availableCountries].map(c => (
                    <li
                      key={c || '__all__'}
                      onMouseDown={() => { setCountryFilter(c); setCurrentPage(1); setCountryDropdownOpen(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors
                        ${countryFilter === c
                          ? 'bg-[#1E88E5] text-white'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-[#1E88E5] hover:text-white'
                        }`}
                    >
                      {c || 'All Countries'}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="col-span-12">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Quotation Table */}
      <div className="col-span-12">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1102px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      ID
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Product
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Service Type
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Quantity
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Date & Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Destination
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      User
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Label
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E88E5] dark:border-blue-400"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : quotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No quotations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotations.map((item, index) => (
                      <TableRow key={`quotation-${item.quotation_id || index}-${index}`}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start text-gray-700 dark:text-gray-300">
                          {item.quotation_id}
                        </TableCell>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 overflow-hidden rounded-lg">
                              {item.product?.image ? (
                                isValidImageUrl(item.product.image) ? (
                                  <Image
                                    width={40}
                                    height={40}
                                    src={item.product.image}
                                    alt={item.product?.name || 'Product image'}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/images/placeholder.png'; // Make sure to have this placeholder image in your public folder
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center w-full h-40 bg-gray-200 text-gray-500 rounded">
                                    <span style={{fontSize: '2rem'}}>📷</span>
                                    <span>No Photo Uploaded</span>
                                  </div>
                                )
                              ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400 dark:text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {item.product.name}
                              </span>
                              <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                {item.product.category}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                          {item.service_type || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {item.date ? (
                            <div className="flex flex-col">
                              <span>{new Date(item.date).toLocaleDateString('en-GB')}</span>
                              <span className="text-xs text-gray-400">{new Date(item.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                            </div>
                          ) : "No date"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <Badge
                            color={
                              item.status === "Approved"
                                ? "success"
                                : item.status === "Pending"
                                ? "warning"
                                : "error"
                            }
                            className={
                              item.status === "Approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : item.status === "Pending"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">
                          {item.destination || <span className="text-gray-400 dark:text-gray-600">—</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {item.user ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-700 dark:text-gray-300">{item.user.fullName || 'Unknown'}</span>
                              <span className="text-xs text-blue-500 hover:underline cursor-pointer" 
                                    onClick={() => setSelectedUserInfo({
                                      email: item.user?.email || '', 
                                      fullName: item.user?.fullName || '', 
                                      role: item.user?.role || '',
                                      phone: item.user?.phone || '',
                                      country: item.user?.country || ''
                                    })}>
                                {item.user.email}
                              </span>
                              <div className="flex flex-col mt-1 text-xs text-gray-500">
                                {item.user.phone && <span>📱 {item.user.phone}</span>}
                                {item.user.country && <span>🌍 {item.user.country}</span>}
                              </div>
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          {item.client_label ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E3F2FD] text-[#0D47A1] border border-[#0D47A1]/30 max-w-[120px] truncate" title={item.client_label}>
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              {item.client_label}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && quotations.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-white/[0.05]">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, metrics.total)} of {metrics.total} items
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(i + 1)}
                    className={currentPage === i + 1 
                      ? "bg-[#1E88E5] hover:bg-[#0D47A1] dark:bg-blue-600 dark:hover:bg-blue-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {currentQuotation && (
        <QuotationEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          quotation={currentQuotation}
          onUpdate={handleQuotationUpdate}
        />
      )}

      {currentQuotation && (
        <PriceOptionsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          quotationId={currentQuotation.id}
          initialData={{
            title_option1: currentQuotation.title_option1 || currentQuotation.product.name,
            extra_images_option1: currentQuotation.extra_images_option1 || [],
            unit_price_option1: currentQuotation.unit_price_option1,
            unit_weight_option1: currentQuotation.unit_weight_option1,
            delivery_time_option1: currentQuotation.delivery_time_option1 || "",
            description_option1: currentQuotation.description_option1 || "",
            title_option2: currentQuotation.title_option2 || "",
            extra_images_option2: currentQuotation.extra_images_option2 || [],
            unit_price_option2: currentQuotation.unit_price_option2,
            unit_weight_option2: currentQuotation.unit_weight_option2,
            delivery_time_option2: currentQuotation.delivery_time_option2 || "",
            description_option2: currentQuotation.description_option2 || "",
            title_option3: currentQuotation.title_option3 || "",
            extra_images_option3: currentQuotation.extra_images_option3 || [],
            unit_price_option3: currentQuotation.unit_price_option3,
            unit_weight_option3: currentQuotation.unit_weight_option3,
            delivery_time_option3: currentQuotation.delivery_time_option3 || "",
            description_option3: currentQuotation.description_option3 || ""
          }}
          onUpdate={handleQuotationUpdate}
        />
      )}

      {selectedUserInfo && (
        <UserInfoModal
          isOpen={!!selectedUserInfo}
          onClose={() => setSelectedUserInfo(null)}
          userInfo={selectedUserInfo}
        />
      )}
    </div>
  );
} 