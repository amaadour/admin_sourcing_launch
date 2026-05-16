"use client";

import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { sendEmailClient } from "@/lib/sendEmailClient";

// Product fallback image
const defaultProductImage = "/images/product/product-01.jpg";
const imagePlaceholder = "/images/placeholder.jpg";

// Define the shipment tracking data type
interface ShipmentTrackingData {
  id: string;
  quotation_id: string | null;
  status: string | null;
  location: string | null;
  videos_urls: string[] | null;
  images_urls: string[] | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  created_at: string;
  user_id: string | null;
  label: string | null;
  // Related quotation data
  quotation?: QuotationData | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
  // User data from join
  user?: {
    full_name: string;
    email: string;
  } | null;
  hasApprovedPayment?: boolean;
}

// Define quotation data interface
interface QuotationData {
  id: string;
  quotation_id: string;
  product_name: string;
  image_url: string;
  shipping_country: string;
  shipping_city: string;
  shipping_method: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
  client_label?: string | null;
}

// Receiver information interface
interface ReceiverInfo {
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
}

export default function ShipmentTrackingPage() {
  const { user } = useAuth();
  const [shipmentData, setShipmentData] = useState<ShipmentTrackingData[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentTrackingData | null>(null);
  const [filteredShipmentData, setFilteredShipmentData] = useState<ShipmentTrackingData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Status management states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [customStatus, setCustomStatus] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Predefined status options
  const statusOptions = [
    "In Transit",
    "Processing",
    "Delivered",
    "Delayed",
    "Waiting",
    "Custom"
  ];
  
  // Receiver info modal states
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [receiverInfo, setReceiverInfo] = useState<ReceiverInfo>({
    receiver_name: '',
    receiver_phone: '',
    receiver_address: ''
  });
  const [savedReceivers, setSavedReceivers] = useState<(ReceiverInfo & { id: string })[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [useExistingReceiver, setUseExistingReceiver] = useState(false);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [saveForLater, setSaveForLater] = useState(false);

  // Shipment details edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedShipment, setEditedShipment] = useState<{
    location: string;
    estimated_delivery: string;
    delivered_at: string | null;
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    origin: string;
    destination_country: string;
    destination_city: string;
  }>({
    location: "",
    estimated_delivery: "",
    delivered_at: null,
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    origin: "China",
    destination_country: "",
    destination_city: ""
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Label edit states
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState('');
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete state
  const [deletingImageIdx, setDeletingImageIdx] = useState<number | null>(null);

  // Fetch shipment data from Supabase - get user's shipments
  useEffect(() => {
    const fetchShipmentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all shipments first
        const { data: allShipments, error: shippingError } = await supabase
          .from('shipping')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (shippingError) {
          console.error("Error accessing shipping table:", shippingError);
          setError("Failed to load shipping data: " + shippingError.message);
          setLoading(false);
          return;
        }
        
        if (!allShipments || allShipments.length === 0) {
          // No shipments found
          setShipmentData([]);
          setFilteredShipmentData([]);
          setLoading(false);
          return;
        }
        
        // Get all user IDs from shipments
        type ShippingRow = {
          id: string;
          user_id: string | null;
          quotation_id: string | null;
          status: string | null;
          location: string | null;
          created_at: string;
          delivered_at: string | null;
          estimated_delivery: string | null;
          videos_urls: string[] | null;
          images_urls: string[] | null;
          receiver_name?: string | null;
          receiver_phone?: string | null;
          receiver_address?: string | null;
          label: string | null;
        };

        const shipmentsRows = (allShipments ?? []) as unknown as ShippingRow[];

        const userIds = shipmentsRows
          .map(item => item.user_id)
          .filter((id): id is string => id !== null && id !== undefined);

        // Fetch user information if there are any user IDs
        let usersMap: Record<string, { full_name: string; email: string }> = {};
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (userError) {
            console.error("Error fetching user data:", userError);
          } else if (userData) {
            const usersRows = (userData ?? []) as unknown as Array<{ id: string; full_name: string; email: string }>
            usersMap = usersRows.reduce((acc, user) => ({
              ...acc,
              [user.id]: { full_name: user.full_name, email: user.email }
            }), {} as Record<string, { full_name: string; email: string }>);
          }
        }
        
        // Get all quotation IDs from the shipping records, filtering out null/undefined values
        const quotationIds = shipmentsRows
          .map(item => item.quotation_id)
          .filter((id): id is string => id !== null && id !== undefined);
          
        // If there are no valid quotation IDs, we can skip fetching quotations
        if (quotationIds.length === 0) {
          // Map shipping items without quotation data
          const combinedData = shipmentsRows.map(shippingItem => ({
            ...shippingItem,
            quotation: null
          }));
          setShipmentData(combinedData);
          setFilteredShipmentData(combinedData);
          setLoading(false);
          return;
        }
        
        // Fetch related quotation data using only valid IDs, including receiver information
        const { data: quotationData, error: quotationError } = await supabase
          .from('quotations')
          .select('id, quotation_id, product_name, image_url, shipping_country, shipping_city, shipping_method, receiver_name, receiver_phone, receiver_address, client_label')
          .in('id', quotationIds);
          
        if (quotationError) {
          console.error("Error fetching quotation data:", quotationError);
          setError("Failed to load quotation details");
          setLoading(false);
          return;
        }
        
        // Create a map of quotations by ID for easier lookup
        const quotationsMap: Record<string, QuotationData> = {};
        const quotationRows = (quotationData ?? []) as unknown as QuotationData[];
        quotationRows.forEach((quotation) => {
          quotationsMap[quotation.id] = quotation;
        });
        
        // Fetch approved payment status for all quotations in one query
        const approvedPaymentSet = new Set<string>();
        if (quotationIds.length > 0) {
          const { data: approvedPayments } = await supabase
            .from('payment_quotations')
            .select('quotation_id, payments!inner(status)')
            .in('quotation_id', quotationIds)
            .eq('payments.status', 'Approved');
          if (approvedPayments) {
            (approvedPayments as unknown as Array<{ quotation_id: string }>).forEach(p => {
              if (p.quotation_id) approvedPaymentSet.add(p.quotation_id);
            });
          }
        }

        // Join the shipping data with quotation data and user data, including receiver information
        const combinedData = shipmentsRows.map((shippingItem) => {
          const qId = shippingItem.quotation_id ?? undefined
          const uId = shippingItem.user_id ?? undefined
          const quotation = qId ? (quotationsMap[qId] ?? null) : null
          return {
            ...shippingItem,
            quotation: quotation,
            user: uId ? (usersMap[uId] ?? null) : null,
            // Use receiver info from quotation if available, otherwise from shipping table
            receiver_name: quotation?.receiver_name || shippingItem.receiver_name || null,
            receiver_phone: quotation?.receiver_phone || shippingItem.receiver_phone || null,
            receiver_address: quotation?.receiver_address || shippingItem.receiver_address || null,
            hasApprovedPayment: qId ? approvedPaymentSet.has(qId) : false,
          }
        });
        
        setShipmentData(combinedData);
        setFilteredShipmentData(combinedData);
      } catch (err) {
        console.error("Exception in fetchShipmentData:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    const fetchSavedReceivers = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('shipping_receivers')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error fetching saved receivers:", error);
          return;
        }
        
        if (data && data.length > 0) {
          setSavedReceivers(data);
        }
      } catch (err) {
        console.error("Exception fetching saved receivers:", err);
      }
    };
    
    fetchShipmentData();
    fetchSavedReceivers();
  }, [user?.id]);

  // Effect to check URL parameters for quotation ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const quotationId = params.get('quotationId');
      
      if (quotationId && shipmentData.length > 0) {
        const shipment = shipmentData.find(s => s.quotation?.id === quotationId);
        if (shipment) {
          setSelectedShipment(shipment);
          setShowDetailsModal(true);
        }
      }
    }
  }, [shipmentData]);

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

  // Recompute available filter options whenever data loads
  React.useEffect(() => {
    const countries = [...new Set(
      shipmentData.map(s => s.quotation?.shipping_country).filter(Boolean)
    )] as string[];
    setAvailableCountries(countries.sort());

    const statuses = [...new Set(
      shipmentData.map(s => s.status).filter(Boolean)
    )] as string[];
    setAvailableStatuses(statuses.sort());
  }, [shipmentData]);

  // Apply all filters whenever any filter or data changes
  React.useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    const u = userFilter.toLowerCase().trim();

    const filtered = shipmentData.filter(s => {
      const matchSearch = !q || (
        s.quotation?.quotation_id?.toLowerCase().includes(q) ||
        s.quotation?.product_name?.toLowerCase().includes(q) ||
        s.quotation?.shipping_country?.toLowerCase().includes(q) ||
        s.quotation?.shipping_city?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q) ||
        s.receiver_name?.toLowerCase().includes(q)
      );
      const matchUser = !u || (
        s.user?.full_name?.toLowerCase().includes(u) ||
        s.user?.email?.toLowerCase().includes(u)
      );
      const matchCountry = !countryFilter || s.quotation?.shipping_country === countryFilter;
      const matchStatus = !statusFilter || s.status === statusFilter;
      return matchSearch && matchUser && matchCountry && matchStatus;
    });
    setFilteredShipmentData(filtered);
  }, [searchQuery, userFilter, countryFilter, statusFilter, shipmentData]);

  const activeFilterCount = [searchQuery, userFilter, countryFilter, statusFilter].filter(Boolean).length;

  const handleClearFilters = () => {
    setSearchQuery("");
    setUserFilter("");
    setCountryFilter("");
    setStatusFilter("");
  };

  // View shipment details
  const viewShipmentDetails = (shipment: ShipmentTrackingData) => {
    setSelectedShipment(shipment);
    setShowDetailsModal(true);
    setIsEditingLabel(false);
    setLabelError(null);
  };

  // Open receiver information modal
  const openReceiverModal = (shipment: ShipmentTrackingData) => {
    setSelectedShipment(shipment);
    setReceiverInfo({
      receiver_name: '',
      receiver_phone: '',
      receiver_address: ''
    });
    setSubmissionSuccess(false);
    setSubmissionError(null);
    setShowReceiverModal(true);
  };

  // Handle receiver input change
  const handleReceiverInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReceiverInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Select an existing receiver
  const handleSelectExistingReceiver = (receiverId: string) => {
    const receiver = savedReceivers.find(r => r.id === receiverId);
    if (receiver) {
      setReceiverInfo({
        receiver_name: receiver.receiver_name,
        receiver_phone: receiver.receiver_phone,
        receiver_address: receiver.receiver_address
      });
      setSelectedReceiverId(receiverId);
    }
  };

  // Submit receiver information
  const handleReceiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShipment || !user?.id) {
      setSubmissionError("Session information missing. Please refresh the page.");
      return;
    }
    
    // Validate inputs
    if (!receiverInfo.receiver_name.trim()) {
      setSubmissionError("Receiver name is required");
      return;
    }
    
    if (!receiverInfo.receiver_phone.trim()) {
      setSubmissionError("Receiver phone number is required");
      return;
    }
    
    if (!receiverInfo.receiver_address.trim()) {
      setSubmissionError("Receiver address is required");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      // Save the receiver information to the shipping_receivers table
      const { error: receiverError } = await supabase
        .from('shipping_receivers')
        .insert({
          user_id: user.id,
          shipping_id: selectedShipment.id,
          receiver_name: receiverInfo.receiver_name,
          receiver_phone: receiverInfo.receiver_phone,
          receiver_address: receiverInfo.receiver_address,
          is_default: saveForLater, // Set is_default based on the checkbox
        } as never);
        
      if (receiverError) {
        throw receiverError;
      }
      
      // If saveForLater is true but an existing receiver is being used, update it to be default
      if (saveForLater && useExistingReceiver && selectedReceiverId) {
        const { error: updateError } = await supabase
          .from('shipping_receivers')
          .update({ is_default: true } as never)
          .eq('id', selectedReceiverId);
          
        if (updateError) {
          console.error("Error setting receiver as default:", updateError);
        }
      }
      
      // Update the shipping table with receiver information and status
      const { error: updateError } = await supabase
        .from('shipping')
        .update({ 
          status: 'processing',
          receiver_name: receiverInfo.receiver_name,
          receiver_phone: receiverInfo.receiver_phone,
          receiver_address: receiverInfo.receiver_address
        } as never)
        .eq('id', selectedShipment.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update the local state to reflect the change
      setShipmentData(prevData => 
        prevData.map(shipment => 
          shipment.id === selectedShipment.id 
            ? { 
                ...shipment, 
                status: 'processing',
                receiver_name: receiverInfo.receiver_name,
                receiver_phone: receiverInfo.receiver_phone,
                receiver_address: receiverInfo.receiver_address
              } 
            : shipment
        )
      );
      
      setFilteredShipmentData(prevData => 
        prevData.map(shipment => 
          shipment.id === selectedShipment.id 
            ? { 
                ...shipment, 
                status: 'processing',
                receiver_name: receiverInfo.receiver_name,
                receiver_phone: receiverInfo.receiver_phone,
                receiver_address: receiverInfo.receiver_address
              } 
            : shipment
        )
      );
      
      // If we're saving for later, update the local state
      if (saveForLater && !useExistingReceiver) {
        setSavedReceivers(prev => [
          ...prev,
          { 
            id: crypto.randomUUID(), // Temporary ID until we fetch from DB again
            receiver_name: receiverInfo.receiver_name,
            receiver_phone: receiverInfo.receiver_phone,
            receiver_address: receiverInfo.receiver_address
          }
        ]);
      }
      
      setSubmissionSuccess(true);
      
      // Close the modal after a brief delay
      setTimeout(() => {
        setShowReceiverModal(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error submitting receiver information:", err);
      setSubmissionError(err instanceof Error ? err.message : "Failed to save receiver information");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString();
  };

  // Validate and format URL
  const validateImageUrl = (url: string): string => {
    // If URL is already absolute, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path without leading slash, add it
    if (!url.startsWith('/')) {
      return `/${url}`;
    }
    
    // Otherwise, it's already a valid relative URL
    return url;
  };
  
  // Check if URL is valid for display
  const isValidUrl = (url: string): boolean => {
    try {
      // Test if URL is constructable (for absolute URLs)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        new URL(url);
        return true;
      }
      // For relative URLs, just check if it has content
      return !!url.trim();
    } catch {
      return false;
    }
  };

  // Function to open status update modal
  const openStatusModal = (shipment: ShipmentTrackingData) => {
    setSelectedShipment(shipment);
    setSelectedStatus(shipment.status || "");
    setCustomStatus("");
    setStatusUpdateError(null);
    setShowStatusModal(true);
  };

  // Function to update shipment status
  const handleStatusUpdate = async () => {
    if (!selectedShipment) return;
    
    setIsUpdatingStatus(true);
    setStatusUpdateError(null);
    
    const newStatus = selectedStatus === "Custom" ? customStatus : selectedStatus;
    
    try {
      const { error: updateError } = await supabase
        .from('shipping')
        .update({ status: newStatus } as never)
        .eq('id', selectedShipment.id);
        
      if (updateError) throw updateError;
      
      // Update local state
      setShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id
            ? { ...shipment, status: newStatus }
            : shipment
        )
      );
      
      setFilteredShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id
            ? { ...shipment, status: newStatus }
            : shipment
        )
      );
      
      setShowStatusModal(false);

      // Send shipping update email to client
      if (selectedShipment.user?.email) {
        sendEmailClient({
          type: 'shipping_update',
          clientEmail: selectedShipment.user.email,
          shipment: {
            status: newStatus,
            product_name: selectedShipment.quotation?.product_name,
            tracking_number: selectedShipment.label || undefined,
            destination: selectedShipment.quotation ? `${selectedShipment.quotation.shipping_city || ''} ${selectedShipment.quotation.shipping_country}`.trim() : undefined,
            quotation_id: selectedShipment.quotation_id || undefined,
          },
        });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      setStatusUpdateError("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Function to start editing shipment details
  const startEditingDetails = () => {
    if (!selectedShipment) return;
    
    setEditedShipment({
      location: selectedShipment.location || "",
      estimated_delivery: selectedShipment.estimated_delivery || "",
      delivered_at: selectedShipment.delivered_at,
      receiver_name: selectedShipment.receiver_name || selectedShipment.quotation?.receiver_name || "",
      receiver_phone: selectedShipment.receiver_phone || selectedShipment.quotation?.receiver_phone || "",
      receiver_address: selectedShipment.receiver_address || selectedShipment.quotation?.receiver_address || "",
      origin: "China", // Default value
      destination_country: selectedShipment.quotation?.shipping_country || "",
      destination_city: selectedShipment.quotation?.shipping_city || ""
    });
    setIsEditingDetails(true);
    setDetailsError(null);
  };

  // Function to handle input changes
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedShipment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to save shipment details
  const handleSaveDetails = async () => {
    if (!selectedShipment) return;
    
    setIsSavingDetails(true);
    setDetailsError(null);
    
    try {
      // Prepare update data - format dates properly
      interface ShippingUpdateData {
        location: string;
        receiver_name: string;
        receiver_phone: string;
        receiver_address: string;
        estimated_delivery?: string;
        delivered_at?: string | null;
      }
      
      const updateData: ShippingUpdateData = {
        location: editedShipment.location,
        receiver_name: editedShipment.receiver_name,
        receiver_phone: editedShipment.receiver_phone,
        receiver_address: editedShipment.receiver_address
      };
      
      // Only include estimated_delivery if it has a value
      if (editedShipment.estimated_delivery) {
        updateData.estimated_delivery = editedShipment.estimated_delivery;
      }
      
      // Only include delivered_at if it has a value
      if (editedShipment.delivered_at) {
        updateData.delivered_at = editedShipment.delivered_at;
      }
      
      // Update shipping table
      const { error: shippingError } = await supabase
        .from('shipping')
        .update(updateData as never)
        .eq('id', selectedShipment.id);
        
      if (shippingError) throw shippingError;

      // Only update quotations table if quotation_id exists
      if (selectedShipment.quotation_id) {
        const { error: quotationError } = await supabase
          .from('quotations')
          .update({
            shipping_country: editedShipment.destination_country,
            shipping_city: editedShipment.destination_city
          } as never)
          .eq('id', selectedShipment.quotation_id);
          
        if (quotationError) {
          console.error("Error updating quotation:", quotationError);
          // Continue with the rest of the function, even if quotation update fails
        }
      }
      
      // Update local state
      const updatedShipment = {
        ...selectedShipment,
        location: editedShipment.location,
        estimated_delivery: editedShipment.estimated_delivery,
        delivered_at: editedShipment.delivered_at,
        receiver_name: editedShipment.receiver_name,
        receiver_phone: editedShipment.receiver_phone,
        receiver_address: editedShipment.receiver_address,
        quotation: selectedShipment.quotation ? {
          ...selectedShipment.quotation,
          shipping_country: editedShipment.destination_country,
          shipping_city: editedShipment.destination_city
        } : null
      };
      
      setShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id ? updatedShipment : shipment
        )
      );
      
      setFilteredShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id ? updatedShipment : shipment
        )
      );
      
      setSelectedShipment(updatedShipment);
      setIsEditingDetails(false);
    } catch (err) {
      console.error("Error updating shipment details:", err);
      setDetailsError("Failed to update shipment details. Please try again.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Save carton label to both shipping and quotations tables
  const handleSaveLabel = async () => {
    if (!selectedShipment) return;
    setIsSavingLabel(true);
    setLabelError(null);
    try {
      const labelValue = editedLabel.trim() || null;

      const { error: shippingError } = await supabase
        .from('shipping')
        .update({ label: labelValue } as never)
        .eq('id', selectedShipment.id);
      if (shippingError) throw shippingError;

      if (selectedShipment.quotation_id) {
        const { error: quotationError } = await supabase
          .from('quotations')
          .update({ client_label: labelValue } as never)
          .eq('id', selectedShipment.quotation_id);
        if (quotationError) throw quotationError;
      }

      const updatedShipment = {
        ...selectedShipment,
        label: labelValue,
        quotation: selectedShipment.quotation
          ? { ...selectedShipment.quotation, client_label: labelValue }
          : null,
      };
      setShipmentData(prev => prev.map(s => s.id === selectedShipment.id ? updatedShipment : s));
      setFilteredShipmentData(prev => prev.map(s => s.id === selectedShipment.id ? updatedShipment : s));
      setSelectedShipment(updatedShipment);
      setIsEditingLabel(false);
    } catch (err) {
      console.error('Error saving label:', err);
      setLabelError('Failed to save label. Please try again.');
    } finally {
      setIsSavingLabel(false);
    }
  };

  // Function to handle file uploads
  const handleFileUpload = async (files: FileList, type: 'images' | 'videos') => {
    if (!selectedShipment) {
      setUploadError("Please select a shipment first");
      return;
    }

    if (files.length === 0) {
      setUploadError("Please select files to upload");
      return;
    }
    
    setUploadingFiles(true);
    setUploadError(null);
    setUploadProgress(0);
    
    try {
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB`);
        }

        // Validate file type
        if (type === 'images' && !file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
          throw new Error(`File ${file.name} is not a supported image type. Supported types: JPEG, PNG, GIF, WEBP`);
        }
        if (type === 'videos' && !file.type.match(/^video\/(mp4|webm|quicktime)$/)) {
          throw new Error(`File ${file.name} is not a supported video type. Supported types: MP4, WebM, QuickTime`);
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        // Create a more structured file path that doesn't use type as a folder name
        const fileName = `shipment-${selectedShipment.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload the file to shipment_updates bucket
        const { error: uploadError, data } = await supabase.storage
          .from('shipment_updates')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          if (uploadError.message.includes('storage/bucket-not-found')) {
            throw new Error('Storage bucket not found. Please contact your administrator.');
          }
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        if (!data?.path) {
          throw new Error(`Failed to get upload path for ${file.name}`);
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('shipment_updates')
          .getPublicUrl(data.path);
            
        if (!publicUrl) {
          throw new Error(`Failed to get public URL for ${file.name}`);
        }

        uploadedUrls.push(publicUrl);
        
        // Update progress
        const progress = ((i + 1) / totalFiles) * 100;
        setUploadProgress(progress);
      }
      
      if (uploadedUrls.length === 0) {
        throw new Error("No files were uploaded successfully");
      }

      // Update the shipping record with new URLs
      const existingUrls = type === 'images' 
        ? (selectedShipment.images_urls || [])
        : (selectedShipment.videos_urls || []);
      
      const { error: updateError } = await supabase
        .from('shipping')
        .update({
          [`${type}_urls`]: [...existingUrls, ...uploadedUrls]
        } as never)
        .eq('id', selectedShipment.id);
        
      if (updateError) {
        throw new Error(`Failed to update shipping record: ${updateError.message}`);
      }
      
      // Update local state
      const updatedShipment = {
        ...selectedShipment,
        [`${type}_urls`]: [...existingUrls, ...uploadedUrls]
      };
      
      setSelectedShipment(updatedShipment);
      setShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id ? updatedShipment : shipment
        )
      );
      
      setFilteredShipmentData(prevData =>
        prevData.map(shipment =>
          shipment.id === selectedShipment.id ? updatedShipment : shipment
        )
      );
      
    } catch (err) {
      console.error("Error uploading files:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload files. Please try again.");
    } finally {
      setUploadingFiles(false);
      setUploadProgress(0);
    }
  };

  // Delete a shipment image
  const handleDeleteImage = async (url: string, idx: number) => {
    if (!selectedShipment) return;
    setDeletingImageIdx(idx);
    try {
      // Extract storage path from public URL
      const match = url.match(/\/storage\/v1\/object\/public\/shipment_updates\/(.+)/);
      if (match?.[1]) {
        await supabase.storage.from('shipment_updates').remove([decodeURIComponent(match[1])]);
      }
      const newUrls = (selectedShipment.images_urls || []).filter((_, i) => i !== idx);
      await supabase.from('shipping').update({ images_urls: newUrls } as never).eq('id', selectedShipment.id);
      const updated = { ...selectedShipment, images_urls: newUrls };
      setSelectedShipment(updated);
      setShipmentData(prev => prev.map(s => s.id === selectedShipment.id ? updated : s));
      setFilteredShipmentData(prev => prev.map(s => s.id === selectedShipment.id ? updated : s));
      if (lightboxOpen) {
        const remaining = newUrls.length;
        if (remaining === 0) { setLightboxOpen(false); }
        else { setLightboxIndex(i => Math.min(i, remaining - 1)); }
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    } finally {
      setDeletingImageIdx(null);
    }
  };

  // Function to handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files, type);
    }
  };

  // Function to trigger file input click
  const triggerFileInput = (inputId: string) => {
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6 min-h-screen overflow-y-auto">
      {/* Page Header Section */}
      <div className="col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[#0D47A1] dark:text-white/90">
            Your Shipment Tracking
          </h1>
        </div>
      </div>

      {/* Shipment Details Modal */}
      <Modal 
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        className="max-w-3xl p-8 mx-4 md:mx-auto max-h-[90vh] overflow-y-auto"
      >
        {selectedShipment && selectedShipment.quotation && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Shipment Details</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Tracking Number: {selectedShipment.quotation.quotation_id || "N/A"}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">Label:</span> {selectedShipment.label || "Not assigned"}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="relative h-48 w-full overflow-hidden rounded-lg mb-4">
                  <Image
                    src={selectedShipment.quotation.image_url || defaultProductImage}
                    alt={selectedShipment.quotation.product_name || "Product"}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedShipment.quotation.product_name || "Product"}</h3>
                <p className="text-gray-500 dark:text-gray-400">Order ID: {selectedShipment.quotation.quotation_id || "N/A"}</p>
              </div>
              
              <div className="space-y-4">
                <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-1">
                    <Badge color={getStatusBadgeColor(selectedShipment.status || '')} size="sm">
                      {selectedShipment.status || "Not Available"}
                    </Badge>
                  </div>
                </div>
                
                <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dates</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Created:</span> {formatDate(selectedShipment.created_at)}
                  </p>
                  {selectedShipment.status?.toLowerCase() === "delivered" ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Delivered:</span> {formatDate(selectedShipment.delivered_at)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Estimated Delivery:</span> {formatDate(selectedShipment.estimated_delivery)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <div className="text-gray-500 text-sm mb-1 dark:text-gray-400">Origin</div>
                {isEditingDetails ? (
                  <input
                    type="text"
                    name="origin"
                    value={editedShipment.origin}
                    onChange={handleDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSavingDetails}
                  />
                ) : (
                  <>
                <div className="font-medium text-[#0D47A1] dark:text-blue-400">China</div>
                <div className="text-gray-700 dark:text-gray-300">Shipping Port</div>
                  </>
                )}
              </div>
              <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <div className="text-gray-500 text-sm mb-1 dark:text-gray-400">Current Location</div>
                {isEditingDetails ? (
                  <input
                    type="text"
                    name="location"
                    value={editedShipment.location}
                    onChange={handleDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter current location"
                    disabled={isSavingDetails}
                  />
                ) : (
                  <>
                <div className="font-medium text-[#ffb300] dark:text-yellow-400">{selectedShipment.location || "Not updated"}</div>
                <div className="text-gray-700 dark:text-gray-300">{selectedShipment.location ? "In Transit" : "Waiting for update"}</div>
                  </>
                )}
              </div>
              <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <div className="text-gray-500 text-sm mb-1 dark:text-gray-400">Destination</div>
                {isEditingDetails ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="destination_country"
                      value={editedShipment.destination_country}
                      onChange={handleDetailsChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Country"
                      disabled={isSavingDetails}
                    />
                    <input
                      type="text"
                      name="destination_city"
                      value={editedShipment.destination_city}
                      onChange={handleDetailsChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="City"
                      disabled={isSavingDetails}
                    />
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-[#43a047] dark:text-green-400">{selectedShipment.quotation?.shipping_country || "Not specified"}</div>
                    <div className="text-gray-700 dark:text-gray-300">{selectedShipment.quotation?.shipping_city || "Not specified"}</div>
                  </>
                )}
              </div>
            </div>

            {/* Dates Section */}
            <div className="mt-6 p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditingDetails ? (
                  <>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Estimated Delivery Date</label>
                      <input
                        type="date"
                        name="estimated_delivery"
                        value={editedShipment.estimated_delivery || ""}
                        onChange={handleDetailsChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={isSavingDetails}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: Leave empty if not available</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Delivered Date</label>
                      <input
                        type="date"
                        name="delivered_at"
                        value={editedShipment.delivered_at || ""}
                        onChange={handleDetailsChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={isSavingDetails}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: Set only if delivered</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                      <p className="font-medium text-gray-800 dark:text-white">{formatDate(selectedShipment.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedShipment.status?.toLowerCase() === "delivered" ? "Delivered" : "Estimated Delivery"}
                      </p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {selectedShipment.status?.toLowerCase() === "delivered"
                          ? formatDate(selectedShipment.delivered_at)
                          : formatDate(selectedShipment.estimated_delivery)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Receiver Information Section - Enhanced to match payment page style */}
            {(selectedShipment.receiver_name || selectedShipment.receiver_phone || selectedShipment.receiver_address || selectedShipment.quotation?.receiver_name || selectedShipment.quotation?.receiver_phone || selectedShipment.quotation?.receiver_address) && (
              <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 border dark:border-purple-800 rounded-lg p-6 md:p-8 border-[var(--color-amber-50)]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-semibold dark:text-purple-100 text-[var(--color-black)]">Receiver Information</h4>
                  {!isEditingDetails && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startEditingDetails}
                      className="border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/40 text-[var(--color-black)]"
                    >
                      Edit Details
                    </Button>
                  )}
                </div>
                
                {isEditingDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm text-purple-700 dark:text-purple-300 mb-2">Name</label>
                      <input
                        type="text"
                        name="receiver_name"
                        value={editedShipment.receiver_name}
                        onChange={handleDetailsChange}
                        className="w-full p-3 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-purple-900/40 dark:border-purple-700 dark:text-white"
                        placeholder="Receiver's name"
                        disabled={isSavingDetails}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-purple-700 dark:text-purple-300 mb-2">Phone Number</label>
                      <input
                        type="text"
                        name="receiver_phone"
                        value={editedShipment.receiver_phone}
                        onChange={handleDetailsChange}
                        className="w-full p-3 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-purple-900/40 dark:border-purple-700 dark:text-white"
                        placeholder="Receiver's phone"
                        disabled={isSavingDetails}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-purple-700 dark:text-purple-300 mb-2">Address</label>
                      <textarea
                        name="receiver_address"
                        value={editedShipment.receiver_address}
                        onChange={handleDetailsChange}
                        className="w-full p-3 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-purple-900/40 dark:border-purple-700 dark:text-white"
                        placeholder="Receiver's address"
                        rows={3}
                        disabled={isSavingDetails}
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    {(selectedShipment.receiver_name || selectedShipment.quotation?.receiver_name) && (
                      <div className="flex justify-between items-start gap-4 py-1">
                        <span className="dark:text-purple-300 font-medium text-[var(--color-black)]">Name:</span>
                        <span className="font-medium dark:text-purple-100 text-right flex-1 text-[var(--color-black)]">
                          {selectedShipment.receiver_name || selectedShipment.quotation?.receiver_name || 'N/A'}
                        </span>
                      </div>
                    )}
                    {(selectedShipment.receiver_phone || selectedShipment.quotation?.receiver_phone) && (
                      <div className="flex justify-between items-start gap-4 py-1">
                        <span className="dark:text-purple-300 font-medium text-[var(--color-black)]">Phone:</span>
                        <span className="font-medium dark:text-purple-100 text-right flex-1 text-[var(--color-black)]">
                          {selectedShipment.receiver_phone || selectedShipment.quotation?.receiver_phone || 'N/A'}
                        </span>
                      </div>
                    )}
                    {(selectedShipment.receiver_address || selectedShipment.quotation?.receiver_address) && (
                      <div className="pt-1">
                        <div className="mb-2">
                          <span className="dark:text-purple-300 font-medium text-[var(--color-black)]">Address:</span>
                        </div>
                        <p className="dark:text-purple-100 whitespace-pre-line leading-relaxed text-[var(--color-black)]">
                          {selectedShipment.receiver_address || selectedShipment.quotation?.receiver_address || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {detailsError && (
                  <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                    {detailsError}
                  </div>
                )}

                {isEditingDetails && (
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingDetails(false)}
                      disabled={isSavingDetails}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveDetails}
                      disabled={isSavingDetails}
                      className={isSavingDetails ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                    >
                      {isSavingDetails ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              )}
              </div>
            )}

            {/* Label in Carton Section */}
            <div className="mt-6 p-4 border border-[#0D47A1] dark:border-blue-700 rounded-lg bg-[#E3F2FD] dark:bg-blue-900/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0D47A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
                  </svg>
                  <h3 className="text-base font-semibold text-[#0D47A1] dark:text-blue-300">Label in Carton</h3>
                </div>
                {selectedShipment.hasApprovedPayment ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#0D47A1] border border-[#0D47A1]/40 bg-white px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked – Payment Approved
                  </span>
                ) : !isEditingLabel ? (
                  <button
                    onClick={() => { setEditedLabel(selectedShipment.quotation?.client_label || selectedShipment.label || ''); setIsEditingLabel(true); setLabelError(null); }}
                    className="flex items-center gap-1 text-xs font-medium text-[#0D47A1] border border-[#0D47A1] bg-white hover:bg-[#E3F2FD] px-2 py-0.5 rounded-full transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                ) : null}
              </div>

              {isEditingLabel ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedLabel}
                    onChange={e => setEditedLabel(e.target.value)}
                    placeholder="Enter carton label…"
                    disabled={isSavingLabel}
                    className="w-full rounded-lg border border-[#0D47A1]/40 bg-white px-4 py-2.5 text-[#0D47A1] placeholder-blue-300 focus:outline-none focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/20 dark:bg-gray-800 dark:text-blue-300"
                  />
                  {labelError && <p className="text-xs text-red-500">{labelError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLabel}
                      disabled={isSavingLabel}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D47A1] hover:bg-[#1565C0] rounded-lg disabled:opacity-60 transition-colors"
                    >
                      {isSavingLabel ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      )}
                      {isSavingLabel ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setIsEditingLabel(false); setLabelError(null); }}
                      disabled={isSavingLabel}
                      className="px-4 py-2 text-sm font-medium text-[#0D47A1] border border-[#0D47A1]/40 bg-white hover:bg-[#E3F2FD] rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#0D47A1]/20">
                  {(selectedShipment.quotation?.client_label || selectedShipment.label) ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#0D47A1] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-[#0D47A1] font-mono font-medium dark:text-blue-300">
                        {selectedShipment.quotation?.client_label || selectedShipment.label}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Not assigned — click Edit to add a label</p>
                  )}
                </div>
              )}
            </div>

            {/* Image Gallery Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Shipment Images
                  {selectedShipment.images_urls && selectedShipment.images_urls.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({selectedShipment.images_urls.length})</span>
                  )}
                </h3>
                <div>
                  <input id="image-upload" type="file" multiple accept="image/*" className="hidden"
                    onChange={(e) => handleFileInputChange(e, 'images')} disabled={uploadingFiles} />
                  <Button size="sm" variant="outline" disabled={uploadingFiles}
                    onClick={() => triggerFileInput('image-upload')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    {uploadingFiles ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              </div>

              {selectedShipment.images_urls && selectedShipment.images_urls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedShipment.images_urls.map((url, idx) => {
                    const isValid = isValidUrl(url);
                    const imageUrl = isValid ? validateImageUrl(url) : imagePlaceholder;
                    const isDeleting = deletingImageIdx === idx;
                    return (
                      <div key={idx} className="relative h-32 rounded-lg overflow-hidden group cursor-pointer">
                        {/* Click to open lightbox */}
                        <div onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }} className="absolute inset-0 z-10" />
                        <Image src={imageUrl} alt={`Shipment image ${idx + 1}`} fill className="object-cover transition-transform group-hover:scale-105" />
                        {/* Zoom icon on hover */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center pointer-events-none">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow">
                            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(url, idx); }}
                          disabled={isDeleting}
                          className="absolute top-1.5 right-1.5 z-30 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Delete image"
                        >
                          {isDeleting ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </button>
                        {/* Image number badge */}
                        <span className="absolute bottom-1.5 left-1.5 z-20 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  {uploadingFiles ? "Uploading images..." : "No images available"}
                </div>
              )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && selectedShipment.images_urls && selectedShipment.images_urls.length > 0 && (() => {
              const imgs = selectedShipment.images_urls;
              const url = imgs[lightboxIndex];
              const isValid = isValidUrl(url);
              const src = isValid ? validateImageUrl(url) : imagePlaceholder;
              return (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                  {/* Close */}
                  <button onClick={() => setLightboxOpen(false)}
                    className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                  {/* Counter */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                    {lightboxIndex + 1} / {imgs.length}
                  </div>
                  {/* Delete from lightbox */}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(url, lightboxIndex); }}
                    disabled={deletingImageIdx === lightboxIndex}
                    className="absolute top-4 right-16 text-white bg-red-600/80 hover:bg-red-600 rounded-full p-2 z-10">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {/* Prev */}
                  {imgs.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + imgs.length) % imgs.length); }}
                      className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                  {/* Image */}
                  <div className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <img src={src} alt={`Shipment image ${lightboxIndex + 1}`}
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none" />
                  </div>
                  {/* Next */}
                  {imgs.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % imgs.length); }}
                      className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                  {/* Thumbnail strip */}
                  {imgs.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] pb-1" onClick={(e) => e.stopPropagation()}>
                      {imgs.map((u, i) => {
                        const ts = isValidUrl(u) ? validateImageUrl(u) : imagePlaceholder;
                        return (
                          <div key={i} onClick={() => setLightboxIndex(i)}
                            className={`relative w-12 h-12 rounded flex-shrink-0 cursor-pointer overflow-hidden border-2 transition-all ${i === lightboxIndex ? 'border-[#1E88E5] scale-110' : 'border-white/30 opacity-60 hover:opacity-100'}`}>
                            <img src={ts} alt="" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Video Gallery Section */}
              <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">Shipment Videos</h3>
                <div>
                  <input
                    id="video-upload"
                    type="file"
                    multiple
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFileInputChange(e, 'videos')}
                    disabled={uploadingFiles}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingFiles}
                    onClick={() => triggerFileInput('video-upload')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {uploadingFiles ? 'Uploading...' : 'Upload Videos'}
                  </Button>
                </div>
              </div>
              
              {selectedShipment.videos_urls && selectedShipment.videos_urls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedShipment.videos_urls.map((url, idx) => {
                    const isValid = isValidUrl(url);
                    const videoUrl = isValid ? validateImageUrl(url) : "";
                    
                    if (!isValid) return null;
                    
                    return (
                      <div key={idx} className="rounded-lg overflow-hidden">
                        <video 
                          controls
                          className="w-full h-auto"
                          preload="metadata"
                        >
                          <source src={videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    );
                  })}
              </div>
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  {uploadingFiles ? "Uploading videos..." : "No videos available"}
                </div>
              )}
            </div>

            {/* Upload Progress and Error Messages */}
            {(uploadingFiles || uploadError) && (
              <div className="mt-4">
                {uploadingFiles && (
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
                {uploadError && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Receiver Information Modal */}
      <Modal 
        isOpen={showReceiverModal}
        onClose={() => !isSubmitting && setShowReceiverModal(false)}
        className="max-w-md p-6 mx-4 md:mx-auto"
      >
        {submissionSuccess ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Information Saved!</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your shipping information has been successfully submitted and your shipment is now being processed.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Provide Shipping Information</h3>
              <button 
                onClick={() => !isSubmitting && setShowReceiverModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide the receiver information for your shipment.
            </p>
            
            {savedReceivers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useExistingReceiver"
                    checked={useExistingReceiver}
                    onChange={() => setUseExistingReceiver(!useExistingReceiver)}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="useExistingReceiver" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use saved shipping information
                  </label>
                </div>
                
                {useExistingReceiver && (
                  <div className="mb-4">
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={selectedReceiverId || ''}
                      onChange={(e) => handleSelectExistingReceiver(e.target.value)}
                    >
                      <option value="">Select saved shipping information</option>
                      {savedReceivers.map(receiver => (
                        <option key={receiver.id} value={receiver.id}>
                          {receiver.receiver_name} - {receiver.receiver_phone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            
            <form onSubmit={handleReceiverSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receiver Name*
                  </label>
                  <input
                    type="text"
                    name="receiver_name"
                    value={receiverInfo.receiver_name}
                    onChange={handleReceiverInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Full Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receiver Phone Number*
                  </label>
                  <input
                    type="text"
                    name="receiver_phone"
                    value={receiverInfo.receiver_phone}
                    onChange={handleReceiverInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Phone Number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Exact Address*
                  </label>
                  <textarea
                    name="receiver_address"
                    value={receiverInfo.receiver_address}
                    onChange={handleReceiverInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Street, City, State, Country, ZIP Code"
                    rows={3}
                    required
                  ></textarea>
                </div>
                
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="saveForLater"
                    checked={saveForLater}
                    onChange={() => setSaveForLater(!saveForLater)}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="saveForLater" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Save this information for future shipments
                  </label>
                </div>
                
                {submissionError && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {submissionError}
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={() => !isSubmitting && setShowReceiverModal(false)}
                    variant="outline"
                    type="button"
                    disabled={isSubmitting}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className={isSubmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      "Submit Information"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal 
        isOpen={showStatusModal}
        onClose={() => !isUpdatingStatus && setShowStatusModal(false)}
        className="max-w-md p-6 mx-4 md:mx-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Status</h3>
          <button 
            onClick={() => !isUpdatingStatus && setShowStatusModal(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            disabled={isUpdatingStatus}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                if (e.target.value !== "Custom") {
                  setCustomStatus("");
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isUpdatingStatus}
            >
              <option value="">Select a status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {selectedStatus === "Custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Status
              </label>
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter custom status"
                disabled={isUpdatingStatus}
              />
            </div>
          )}

          {statusUpdateError && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {statusUpdateError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => !isUpdatingStatus && setShowStatusModal(false)}
              variant="outline"
              type="button"
              disabled={isUpdatingStatus}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus || (!customStatus && selectedStatus === "Custom")}
              className={isUpdatingStatus ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            >
              {isUpdatingStatus ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Main Table Section */}
      <div className="col-span-12">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0D47A1] dark:text-blue-400 text-base">Your Shipment Status</h3>
            </div>

            {/* Filter panel */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-4 mb-4">
              {/* Row 1: text search + user + clear */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {/* General search */}
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by QT#, product, country, status..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <svg className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* User filter */}
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    placeholder="Filter by user (name / email)..."
                    className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <svg className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>

                {/* Clear all */}
                {activeFilterCount > 0 && (
                  <button onClick={handleClearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 whitespace-nowrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Row 2: dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status dropdown */}
                <div className="relative">
                  <button type="button"
                    onClick={() => setStatusDropdownOpen(o => !o)}
                    onBlur={() => setTimeout(() => setStatusDropdownOpen(false), 150)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E88E5] min-w-[130px] justify-between">
                    <span className={statusFilter ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                      {statusFilter || 'All Statuses'}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {statusDropdownOpen && (
                    <ul className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {['', ...availableStatuses].map(s => (
                        <li key={s || '__all__'}
                          onMouseDown={() => { setStatusFilter(s); setStatusDropdownOpen(false); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${statusFilter === s ? 'bg-[#1E88E5] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-[#1E88E5] hover:text-white'}`}>
                          {s || 'All Statuses'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Country dropdown */}
                <div className="relative">
                  <button type="button"
                    onClick={() => setCountryDropdownOpen(o => !o)}
                    onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E88E5] min-w-[140px] justify-between">
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
                        <li key={c || '__all__'}
                          onMouseDown={() => { setCountryFilter(c); setCountryDropdownOpen(false); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${countryFilter === c ? 'bg-[#1E88E5] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-[#1E88E5] hover:text-white'}`}>
                          {c || 'All Countries'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1E88E5] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] dark:border-blue-400"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your shipment data...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500 dark:text-red-400">
              <p>{error}</p>
            </div>
          ) : !user ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <p>Please sign in to view your shipments</p>
            </div>
          ) : filteredShipmentData.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <p>You don&apos;t have any active shipments</p>
              <p className="mt-2 text-sm">Check back later or contact customer support for assistance</p>
            </div>
          ) : (
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
                      Tracking Number
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
                      Destination
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Current Location
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
                      Dates
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {/* Table Body */}
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filteredShipmentData.map((shipment) => (
                    <TableRow
                        key={shipment.id}
                      className="transition-all duration-300 hover:bg-[#E3F2FD] dark:hover:bg-blue-900/20 hover:shadow-md cursor-pointer"
                    >
                      <TableCell className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {shipment.quotation?.quotation_id || "N/A"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg flex-shrink-0">
                            <Image
                                src={shipment.quotation?.image_url || defaultProductImage}
                                alt={shipment.quotation?.product_name || "Product"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                              <div className="font-medium text-gray-800 dark:text-white/90">{shipment.quotation?.product_name || "Product"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex flex-col">
                            <span className="font-medium text-green-600 dark:text-green-400">{shipment.quotation?.shipping_country || "Not specified"}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{shipment.quotation?.shipping_city || "Not specified"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex flex-col">
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{shipment.location || "Not updated"}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{shipment.location ? "In Transit" : "Waiting for update"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex items-center gap-2">
                        <Badge color={getStatusBadgeColor(shipment.status || '')} size="sm">
                            {shipment.status || "Not Available"}
                        </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            onClick={() => {
                              openStatusModal(shipment);
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Created: {formatDate(shipment.created_at)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                              {shipment.status?.toLowerCase() === "delivered" 
                                ? `Delivered: ${formatDate(shipment.delivered_at)}` 
                                : `Est. Delivery: ${formatDate(shipment.estimated_delivery)}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            onClick={() => viewShipmentDetails(shipment)}
                          >
                            View Details
                          </Button>
                          
                          {/* Add "Provide Shipping Info" button for shipments with "Waiting" status */}
                          {shipment.status?.toLowerCase() === "waiting" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="bg-[#1E88E5] hover:bg-[#0D47A1] dark:bg-blue-600 dark:hover:bg-blue-700"
                              onClick={() => openReceiverModal(shipment)}
                            >
                              Provide Info
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
} 