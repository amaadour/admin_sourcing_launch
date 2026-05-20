"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Type for quotation data
interface QuotationData {
  id: string;
  quotation_id: string;
  product_name: string;
  image_url: string;
  shipping_country: string;
  shipping_city: string;
  shipping_method: string;
}

// Interface for rows returned from the `shipping` table
interface ShippingRow {
  id: string;
  user_id: string | null;
  quotation_id: string | null;
  status: string | null;
  location: string | null;
  created_at: string;
  estimated_delivery: string | null;
}

// Type for simplified quotation data (used in passed data)
interface SimpleQuotationData {
  product_name: string;
  shipping_country: string;
  shipping_city: string;
}

// Interface for tracking data
interface ShipmentTrackingData {
  id: string;
  tracking_id?: string;
  quotation_id: string;
  status: string;
  location: string | null;
  created_at: string;
  estimated_delivery: string | null;
  // Related quotation data
  quotation?: QuotationData | SimpleQuotationData | null;
}

// Type for passed shipment data
interface PassedShipmentData {
  id: string;
  tracking_id?: string;
  user_id: string;
  quotation_id?: string;
  status: string;
  location?: string | null;
  created_at: string;
  estimated_delivery?: string | null;
  quotation?: SimpleQuotationData;
}

interface DashboardShippingTrackingProps {
  passedShipmentData?: PassedShipmentData[]; // Optional prop for passing shipment data from parent
}

const DashboardShippingTracking: React.FC<DashboardShippingTrackingProps> = ({ passedShipmentData }) => {
  const { user } = useAuth();
  const [shipmentData, setShipmentData] = useState<ShipmentTrackingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('DashboardShippingTracking - Props received:', passedShipmentData);

  useEffect(() => {
    // If data is passed as prop, use it instead of fetching
    if (passedShipmentData && passedShipmentData.length > 0) {
      console.log('Using passed shipment data:', passedShipmentData);
      // Ensure the passed data has all required fields
      const formattedData = passedShipmentData.map(item => ({
        id: item.id || '',
        tracking_id: item.tracking_id || item.id?.substring(0, 8) || '',
        quotation_id: item.quotation_id || '',
        status: item.status || 'Processing',
        location: item.location || 'Processing',
        created_at: item.created_at || new Date().toISOString(),
        estimated_delivery: item.estimated_delivery || null,
        quotation: item.quotation || {
          product_name: "Processing Order",
          shipping_country: "Processing",
          shipping_city: "Processing"
        }
      }));
      setShipmentData(formattedData);
      setIsLoading(false);
      return;
    }
    
    console.log('No passed data, fetching from database...');
    
    const fetchShipmentData = async () => {
      try {
        if (!user?.id) {
          setShipmentData([]);
          setIsLoading(false);
          return;
        }
        
        setIsLoading(true);
        setError(null);
        
        // Fetch only the current user's shipments, limited to 3
        const { data: userShipments, error: shippingError } = await supabase
          .from('shipping')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (shippingError) {
          console.error("Error accessing shipping table:", shippingError);
          setError("Failed to load shipping data");
          setIsLoading(false);
          return;
        }
        
        const shipments = (userShipments ?? []) as ShippingRow[];

        if (shipments.length === 0) {
          setShipmentData([]);
          setIsLoading(false);
          return;
        }
        
        // Get all valid quotation IDs from the user's shipping records
        const quotationIds = shipments
          .map(item => item.quotation_id)
          .filter(id => id != null); // Filter out null quotation_ids
        
        if (quotationIds.length === 0) {
          // If there are no valid quotation IDs, just return the shipping data without quotation details
          setShipmentData(shipments.map(shipment => ({
            id: shipment.id,
            tracking_id: shipment.id?.substring(0, 8),
            quotation_id: shipment.quotation_id ?? '',
            status: shipment.status ?? 'Processing',
            location: shipment.location ?? 'Processing',
            created_at: shipment.created_at,
            estimated_delivery: shipment.estimated_delivery ?? null,
            quotation: null
          })));
          setIsLoading(false);
          return;
        }
        
        // Fetch related quotation data
        const { data: quotationData, error: quotationError } = await supabase
          .from('quotations')
          .select('id, quotation_id, product_name, image_url, shipping_country, shipping_city, shipping_method')
          .in('id', quotationIds);
          
        if (quotationError) {
          console.error("Error fetching quotation data:", quotationError);
          // Don't fail completely, just continue without quotation data
          setShipmentData(shipments.map(shipment => ({
            id: shipment.id,
            tracking_id: shipment.id?.substring(0, 8),
            quotation_id: shipment.quotation_id ?? '',
            status: shipment.status ?? 'Processing',
            location: shipment.location ?? 'Processing',
            created_at: shipment.created_at,
            estimated_delivery: shipment.estimated_delivery ?? null,
            quotation: null
          })));
          setIsLoading(false);
          return;
        }
        
        // Create a map of quotations by ID for easier lookup
        const quotationsMap: Record<string, QuotationData> = {};
        const quotationsList = (quotationData ?? []) as QuotationData[];
        quotationsList.forEach((quotation) => {
          quotationsMap[quotation.id] = quotation;
        });
        
        // Join the shipping data with quotation data
        const combinedData: ShipmentTrackingData[] = shipments.map(shippingItem => ({
          id: shippingItem.id,
          tracking_id: shippingItem.id?.substring(0, 8),
          quotation_id: shippingItem.quotation_id ?? '',
          status: shippingItem.status ?? 'Processing',
          location: shippingItem.location ?? 'Processing',
          created_at: shippingItem.created_at,
          estimated_delivery: shippingItem.estimated_delivery ?? null,
          quotation: shippingItem.quotation_id ? quotationsMap[shippingItem.quotation_id] || null : null
        }));
        
        setShipmentData(combinedData);
      } catch (err) {
        console.error("Exception in fetchShipmentData:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShipmentData();
  }, [user?.id, passedShipmentData]);

  // right before the render
  console.log('DashboardShippingTracking - Current state:', { 
    isLoading, 
    hasError: !!error, 
    dataLength: shipmentData?.length || 0
  });

  // Get status badge color
  const getStatusBadgeColor = (status: string): "primary" | "success" | "warning" | "info" | "error" => {
    switch (status?.toLowerCase() || '') {
      case "delivered":
        return "success";
      case "in transit":
        return "primary";
      case "processing":
      case "waiting":
        return "warning";
      case "delayed":
        return "error";
      default:
        return "info";
    }
  };

  // Format date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render a message when there's no data, loading, or error
  const renderMessage = (message: string) => {
    return (
      <TableRow>
        <TableCell className="px-5 py-4 text-center">
          {message}
        </TableCell>
        <TableCell className="hidden">&nbsp;</TableCell>
        <TableCell className="hidden">&nbsp;</TableCell>
        <TableCell className="hidden">&nbsp;</TableCell>
        <TableCell className="hidden">&nbsp;</TableCell>
      </TableRow>
    );
  };

  return (
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
                Tracking #
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
                Location
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
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading && renderMessage("Loading shipment tracking data...")}
            {!isLoading && error && renderMessage(error)}
            {!isLoading && !error && shipmentData.length === 0 && renderMessage("No shipment tracking data available")}

            {!isLoading && !error && shipmentData.map((item) => (
              <TableRow 
                key={item.id}
                className="transition-all duration-300 hover:bg-[#E3F2FD] hover:shadow-md cursor-pointer transform hover:translate-x-1 hover:scale-[1.01]"
              >
                <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                  {item.tracking_id || item.id.substring(0, 8) || "N/A"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                  {item.quotation?.product_name || "Processing Order"}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#ffb300]">{item.location || "Processing"}</span>
                    <span className="text-xs text-gray-500">Last updated: {formatDate(item.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-700 text-start text-theme-sm dark:text-white/90">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#43a047]">{item.quotation?.shipping_country || "Processing"}</span>
                    <span className="text-xs text-gray-500">{item.quotation?.shipping_city || "Processing"}</span>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-start">
                  <Badge
                    size="sm"
                    color={getStatusBadgeColor(item.status)}
                  >
                    {item.status || "Processing"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardShippingTracking; 