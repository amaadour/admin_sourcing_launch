"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
 
  BoxIconLine, 
  GroupIcon, 
  PaperPlaneIcon,
  DollarLineIcon
} from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Image from "next/image";
import DashboardShippingTracking from "@/components/shipping/DashboardShippingTracking";
import QuotationFormModal from "@/components/quotation/QuotationFormModal";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Cache configuration
const CACHE_KEY = 'dashboard_data_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Define the cache structure
interface CacheData {
  quotationData: QuotationItem[];
  shipmentData: ShipmentItem[];
  metrics: DashboardMetrics;
  timestamp: number;
  userId: string;
}

// Define the type for quotation data
interface QuotationItem {
  id: string;
  product: {
    name: string;
    image: string;
  };
  quantity: number;
  date: string;
  status: string;
  hasImage: boolean;
  price?: string;
}

// Define type for shipping data
interface ShipmentItem {
  id: string;
  tracking_id?: string;
  user_id: string;
  quotation_id?: string;
  status: string;
  location?: string;
  created_at: string;
  estimated_delivery?: string;
  quotation?: {
    product_name: string;
    shipping_country: string;
    shipping_city: string;
  };
}

// Define type for dashboard metrics
interface DashboardMetrics {
  pendingQuotations: number;
  activeShipments: number;
  deliveredProducts: number;
  totalSpend: number;
}

// Define type for quotation data
interface QuotationType {
  id: string;
  product_name: string;
  shipping_country: string;
  shipping_city: string;
}

export default function DashboardHome() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotationData, setQuotationData] = useState<QuotationItem[]>([]);
  const [shipmentData, setShipmentData] = useState<ShipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingQuotations: 0,
    activeShipments: 0,
    deliveredProducts: 0,
    totalSpend: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  
  // Get current user from auth context
  const { user } = useAuth();

  // Function to get cached data if valid
  const getCachedData = (userId: string): CacheData | null => {
    if (typeof window === 'undefined') return null; // Check for server-side rendering
    
    try {
      const cachedDataString = localStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (!cachedDataString) return null;
      
      const cachedData = JSON.parse(cachedDataString) as CacheData;
      const now = Date.now();
      
      // Check if cache is still valid (not expired) and belongs to the current user
      if (now - cachedData.timestamp < CACHE_EXPIRY && cachedData.userId === userId) {
        return cachedData;
      }
      
      // Clear expired cache
      localStorage.removeItem(`${CACHE_KEY}_${userId}`);
      return null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  };

  // Function to save data to cache
  const saveToCache = (userId: string, data: Partial<CacheData>) => {
    if (typeof window === 'undefined') return; // Check for server-side rendering
    
    try {
      localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
        ...data,
        userId,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
      // If caching fails, just continue without caching
    }
  };

  const fetchDashboardData = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Fetch pending quotations
      const query = supabase
        .from('quotations')
        .select(`
          *,
          profiles (
            id,
            email,
            full_name,
            phone,
            country,
            role
          )
        `)
        .eq('status', 'Pending')  // Only get pending quotations
        .order('created_at', { ascending: false })
        .limit(3);  // Limit to last 3
      
      // Execute the query
      const { data: quotationsData, error: quotationsError } = await query as unknown as { data: Array<{
        id: string;
        user_id: string;
        quotation_id?: string;
        product_name?: string;
        image_url?: string;
        service_type?: string;
        product_description?: string;
        quantity?: number;
        created_at: string;
        status?: string;
        total_price_option1?: string | number;
        shipping_method?: string;
        shipping_city?: string;
        shipping_country?: string;
        profiles?: {
          email?: string;
          full_name?: string;
          role?: string;
          phone?: string;
          country?: string;
        };
      }> | null, error: unknown };

      if (quotationsError) {
        console.error('Error fetching quotations:', quotationsError);
        throw quotationsError;
      }

      // Format the quotations data
      const formattedData = (quotationsData ?? []).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        quotation_id: item.quotation_id || `QT-${item.id}`,
        product: {
          name: item.product_name || "",
          image: item.image_url || "",
          category: item.service_type || "",
          description: item.product_description || ""
        },
        quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity ?? 0),
        date: new Date(item.created_at).toISOString().split('T')[0], // Format date as YYYY-MM-DD
        status: item.status || "Pending",
        price: item.total_price_option1?.toString() || "0",
        shippingMethod: item.shipping_method || "",
        destination: item.shipping_city ? `${item.shipping_city}, ${item.shipping_country}` : "",
        hasImage: Boolean(item.image_url),
        user: item.profiles ? {
          email: item.profiles.email || "",
          fullName: item.profiles.full_name || "",
          role: item.profiles.role,
          phone: item.profiles.phone || "",
          address: "",
          city: "",
          country: item.profiles.country || ""
        } : undefined
      })) || [];

      setQuotationData(formattedData);

      // Fetch the last 3 shipments from shipping table
      type ShippingRow = {
        id: string;
        user_id: string;
        quotation_id?: string | null;
        status?: string | null;
        location?: string | null;
        created_at: string;
        estimated_delivery?: string | null;
      };

      const shippingRes = await supabase
        .from('shipping')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const shippingData = (shippingRes.data ?? []) as unknown as ShippingRow[];
      const shippingError = shippingRes.error as unknown;

      console.log('Raw shipping data:', shippingData);
      console.log('Shipping error:', shippingError);

      if (shippingRes.error) {
        console.error('Error fetching shipping data:', shippingError);
        setShipmentData([]);
      } else if (shippingData.length > 0) {
        // Get all quotation IDs that aren't null
        const quotationIds = shippingData
          .map(item => item.quotation_id)
          .filter(id => id != null);
        
        // Fetch quotation data if we have IDs
        const quotationsMap: Record<string, QuotationType> = {};
        
        if (quotationIds.length > 0) {
          const quotRes = await supabase
            .from('quotations')
            .select('id, product_name, shipping_country, shipping_city')
            .in('id', quotationIds);

          const quotationsDataTyped = (quotRes.data ?? []) as unknown as QuotationType[];
          quotationsDataTyped.forEach((q) => {
            quotationsMap[q.id] = q;
          });
        }
        
        // Format the shipping data
        const formattedShippingData = shippingData.map((item) => ({
          id: item.id,
          tracking_id: item.id.substring(0, 8) || `TR-${item.id.substring(0, 6)}`,
          user_id: item.user_id,
          quotation_id: item.quotation_id ?? undefined,
          status: item.status || "In Transit",
          location: item.location || "Processing",
          created_at: item.created_at,
          estimated_delivery: item.estimated_delivery ?? undefined,
          quotation: item.quotation_id && quotationsMap[item.quotation_id] ? {
            product_name: quotationsMap[item.quotation_id].product_name || "Unknown Product",
            shipping_country: quotationsMap[item.quotation_id].shipping_country || "Unknown",
            shipping_city: quotationsMap[item.quotation_id].shipping_city || "Unknown"
          } : {
            product_name: "Processing Order",
            shipping_country: "Processing",
            shipping_city: "Processing"
          }
        }));

        console.log('Formatted shipping data:', formattedShippingData);
        setShipmentData(formattedShippingData);
      } else {
        // No shipping data
        setShipmentData([]);
      }

      // Calculate metrics
      const metricsRes = await supabase
        .from('quotations')
        .select('status');

      const metricsData = (metricsRes.data ?? []) as unknown as Array<{ status?: string | null }>

      if (metricsData && Array.isArray(metricsData)) {
        const approved = metricsData.filter(item => item.status === "Approved").length;
        const pending = metricsData.filter(item => item.status === "Pending").length;
        
        const newMetrics = {
          pendingQuotations: pending,
          activeShipments: 0,
          deliveredProducts: approved,
          totalSpend: 0
        };

        // Get active shipments count
        const { data: activeShipments, error: shipmentsError } = await supabase
          .from('shipping')
          .select('status')
          .eq('status', 'In Transit');

        if (!shipmentsError && activeShipments) {
          newMetrics.activeShipments = activeShipments.length;
        }

        // Calculate total spend from approved payments
        const paymentsRes = await supabase
          .from('payments')
          .select('total_amount')
          .eq('status', 'Approved');

        if (!paymentsRes.error && paymentsRes.data) {
          const approvedPayments = (paymentsRes.data ?? []) as unknown as Array<{ total_amount: number | string | null }>
          const totalSpend = approvedPayments.reduce((sum, payment) => {
            const value = payment.total_amount
            if (typeof value === 'number') {
              return sum + value
            }
            if (typeof value === 'string') {
              const parsed = parseFloat(value)
              return sum + (isNaN(parsed) ? 0 : parsed)
            }
            return sum
          }, 0)
          
          newMetrics.totalSpend = totalSpend;
        }
        
        setMetrics(newMetrics);
        
        // Save data to cache
        saveToCache(userId, {
          quotationData: formattedData,
          shipmentData: Array.isArray(shippingData) ? shippingData.map(item => ({
            id: item.id,
            tracking_id: item.id.substring(0, 8) || `TR-${item.id.substring(0, 6)}`,
            user_id: item.user_id,
            quotation_id: item.quotation_id ?? undefined,
            status: item.status || "In Transit",
            location: item.location || "Processing",
            created_at: item.created_at,
            estimated_delivery: item.estimated_delivery ?? undefined,
            quotation: {
              product_name: "Processing Order",
              shipping_country: "Processing",
              shipping_city: "Processing"
            }
          })) : [],
          metrics: newMetrics
        });
      }
      
    } catch (error) {
      console.error("Exception in fetchDashboardData:", error);
      setQuotationData([]);
      setShipmentData([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setIsRefreshing(true);
        
        // Get the user ID from auth context
        const userId = user?.id;
        
        if (!userId) {
          console.warn("No user ID available, showing no quotations");
          setQuotationData([]);
          setShipmentData([]);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // Try to get data from cache first if not refreshing
        if (!isRefreshing) {
          const cachedData = getCachedData(userId);
          if (cachedData) {
            console.log('Using cached dashboard data');
            setQuotationData(cachedData.quotationData);
            setShipmentData(cachedData.shipmentData);
            setMetrics(cachedData.metrics);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
          }
        }
        
        // If no cache or refreshing, fetch fresh data
        console.log(`Fetching dashboard data for user_id: ${userId}...`);
        await fetchDashboardData(userId);
        
      } catch (error) {
        console.error("Exception in loadData:", error);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
    
    loadData();
  }, [isModalOpen, user?.id, isRefreshing, fetchDashboardData]);
  
  const handleRefreshData = () => {
    setIsLoading(true);
    setIsRefreshing(true);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  // Navigation functions
  const goToQuotationsPage = () => router.push('/quotation');
  const goToShipmentTrackingPage = () => router.push('/shipment-tracking');
  
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Metric Cards Section */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {/* Quotation Pending Metric */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] rounded-xl">
              <PaperPlaneIcon className="text-[#0D47A1] size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Quotation Pending
                </span>
                <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-white/90">
                  {metrics.pendingQuotations}
                </h4>
              </div>

            </div>
          </div>

          {/* Active Shipments Metric */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] rounded-xl">
              <BoxIconLine className="text-[#0D47A1] size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Active Shipments
                </span>
                <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-white/90">
                  {metrics.activeShipments}
                </h4>
              </div>

            </div>
          </div>

          {/* Delivered Products Metric */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] rounded-xl">
              <GroupIcon className="text-[#0D47A1] size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Delivered Products
                </span>
                <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-white/90">
                  {metrics.deliveredProducts}
                </h4>
              </div>

            </div>
          </div>

          {/* Total Spend Metric */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-[#E3F2FD] rounded-xl">
              <DollarLineIcon className="text-[#0D47A1] size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total Spend
                </span>
                <h4 className="mt-2 font-bold text-[#0D47A1] text-title-sm dark:text-white/90">
                  ${metrics.totalSpend.toLocaleString()}
                </h4>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Recent Quotations Requests Table */}
      <div className="col-span-12">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <h3 className="font-semibold text-[#0D47A1] text-base dark:text-white/90">
              Recent Quotation Requests
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-[#1E88E5] hover:bg-[#0D47A1]"
                onClick={openModal}
              >
                Create New Quote
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[#1E88E5] border-[#64B5F6] hover:bg-[#E3F2FD]"
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[#1E88E5] border-[#64B5F6] hover:bg-[#E3F2FD]"
                onClick={goToQuotationsPage}
              >
                View All
              </Button>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto">
            <div className="min-w-full">
              <Table>
                {/* Table Header */}
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
                      Quantity
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {/* Table Body */}
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading && (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-gray-500 text-center">
                        <div className="w-full text-center">Loading latest quotations...</div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {!isLoading && quotationData.length === 0 && (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-gray-500 text-center">
                        <div className="w-full text-center">No quotations found</div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {!isLoading && quotationData.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="transition-all duration-300 hover:bg-[#E3F2FD] hover:shadow-md cursor-pointer transform hover:translate-x-1 hover:scale-[1.01]"
                    >
                      <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                        {item.id}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 overflow-hidden rounded-lg relative">
                            {item.hasImage ? (
                              <Image
                                width={40}
                                height={40}
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {item.product.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                        {item.date}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge
                          size="sm"
                          color={
                            item.status === "Approved"
                              ? "success"
                              : item.status === "Processing"
                              ? "warning"
                              : "primary"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Tracking Table */}
      <div className="col-span-12">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
            <h3 className="font-semibold text-[#0D47A1] text-base dark:text-white/90">
              Recent Shipment Tracking
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[#1E88E5] border-[#64B5F6] hover:bg-[#E3F2FD]"
                onClick={goToShipmentTrackingPage}
              >
                View All Shipments
              </Button>
            </div>
          </div>

          <DashboardShippingTracking passedShipmentData={shipmentData} />
        </div>
      </div>

      {/* Modal for New Quotation */}
      <QuotationFormModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
} 