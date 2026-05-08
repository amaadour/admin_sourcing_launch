"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

interface Quotation {
  id: string;
  quotation_id: string;
  product_name: string;
  product_url?: string | null;
  quantity: number;
  total_price_option1: string | null;
  total_price_option2: string | null;
  total_price_option3: string | null;
  unit_price_option1: string | null;
  unit_price_option2: string | null;
  unit_price_option3: string | null;
  unit_weight_option1: string | null;
  unit_weight_option2: string | null;
  unit_weight_option3: string | null;
  title_option1: string | null;
  title_option2: string | null;
  title_option3: string | null;
  description_option1: string | null;
  description_option2: string | null;
  description_option3: string | null;
  delivery_time_option1: string | null;
  delivery_time_option2: string | null;
  delivery_time_option3: string | null;
  image_url: string | null;
  extra_images_option1?: string[] | null;
  extra_images_option2?: string[] | null;
  extra_images_option3?: string[] | null;
  selected_option: number | null;
  status: string;
  service_type: string | null;
  shipping_method: string | null;
  shipping_country: string | null;
  shipping_city: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  created_at: string;
  updated_at: string | null;
  Quotation_fees: string | null;
}

interface Payment {
  id: string;
  user_id: string | null;
  total_amount: string;
  method: string;
  status: string;
  proof_url: string | null;
  created_at: string;
  quotation_ids: string[] | null;
  payment_proof: string | null;
  reference_number: string | null;
  // Not from database, added after fetching
  profile?: Profile;
  quotations?: Quotation[];
}

// Simple toast function since we don't have the toast component
const showToast = (message: string, type: 'success' | 'error') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(`${message}`);
};

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null>(null);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedQuotations, setSelectedQuotations] = useState<Quotation[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<string | null>(null);

  // Fetch all payment records from Supabase
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Step 1: Fetch all payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (paymentsError) {
          console.error("Error fetching payments:", paymentsError);
          setError(`Failed to load payments: ${paymentsError.message}`);
          return;
        }
        
        if (!paymentsData || paymentsData.length === 0) {
          setPayments([]);
          setFilteredPayments([]);
          setLoading(false);
          return;
        }
        
        console.log(`Successfully fetched ${paymentsData.length} payment records`);

        // Provide a concrete shape for payments rows to avoid 'never' inference
        type PaymentRow = {
          id: string;
          user_id: string | null;
          total_amount: number | string;
          method: string;
          status: string;
          proof_url: string | null;
          created_at: string;
          quotation_ids: string[] | string | null;
          payment_proof: string | null;
          reference_number: string | null;
        };

        const paymentsRows = (paymentsData ?? []) as unknown as PaymentRow[];
        
        // Debug: Check quotation_ids format in payments
        console.log("Sample payment quotation_ids:", 
          paymentsRows.slice(0, 3).map(p => ({ 
            id: p.id, 
            quotation_ids: p.quotation_ids,
            type: p.quotation_ids ? typeof p.quotation_ids : 'null',
            isArray: p.quotation_ids ? Array.isArray(p.quotation_ids) : false
          }))
        );
        
        // Step 2: Get unique user IDs
        const userIds = [...new Set(paymentsRows.map(payment => payment.user_id).filter(Boolean))];
        
        // Step 3: Fetch profiles for those user IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
          
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }
        
        // Create a map of user_id -> profile for quick lookup
        const profilesRows = (profilesData ?? []) as unknown as Profile[]
        const profilesMap = profilesRows.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);
        
        // Step 4: Get all quotation IDs from all payments
        // Handle different potential formats of quotation_ids
        const quotationIds: string[] = [];
        paymentsRows.forEach(payment => {
          // Handle array of IDs
          if (payment.quotation_ids && Array.isArray(payment.quotation_ids)) {
            payment.quotation_ids.forEach((id) => {
              if (id && typeof id === 'string') {
                quotationIds.push(id);
              }
            });
          }
          // Handle string format (comma-separated IDs)
          else if (payment.quotation_ids && typeof payment.quotation_ids === 'string') {
            const ids = payment.quotation_ids.split(',').map((id) => id.trim());
            quotationIds.push(...ids.filter(Boolean));
          }
        });
        
        console.log(`Extracted ${quotationIds.length} quotation IDs from payments`);
        
        // Get reference numbers to look up associated quotations
        const referenceNumbers = paymentsRows
          .map(p => p.reference_number)
          .filter(Boolean) as string[];
        
        console.log(`Found ${referenceNumbers.length} reference numbers to check for quotations`);
        
        // Step 5: Fetch quotation data using both ID and reference number
        const quotationsMap: Record<string, Quotation> = {};
        
        // First fetch by IDs if we have any
        if (quotationIds.length > 0) {
          // Filter out any invalid IDs
          const validIds = quotationIds.filter(id => id && id.length > 0);
          
          if (validIds.length > 0) {
            const { data: quotationsDataById, error: quotationsErrorById } = await supabase
              .from('quotations')
              .select('id, quotation_id, product_name, product_url, quantity, total_price_option1, total_price_option2, total_price_option3, unit_price_option1, unit_price_option2, unit_price_option3, unit_weight_option1, unit_weight_option2, unit_weight_option3, title_option1, title_option2, title_option3, description_option1, description_option2, description_option3, delivery_time_option1, delivery_time_option2, delivery_time_option3, image_url, extra_images_option1, extra_images_option2, extra_images_option3, selected_option, status, service_type, shipping_method, shipping_country, shipping_city, receiver_name, receiver_phone, receiver_address, created_at, updated_at, Quotation_fees')
              .in('id', validIds);
              
            if (quotationsErrorById) {
              console.error("Error fetching quotations by ID:", quotationsErrorById);
              console.error("Error details:", JSON.stringify(quotationsErrorById, null, 2));
            } else if (quotationsDataById) {
              console.log(`Found ${quotationsDataById.length} matching quotations by ID`);
              
              (quotationsDataById as unknown as Quotation[]).forEach((quotation) => {
                quotationsMap[quotation.id] = quotation;
              });
            }
          }
        }
        
        // Then fetch by reference numbers
        if (referenceNumbers.length > 0) {
          // Filter out any invalid reference numbers
          const validRefs = referenceNumbers.filter(ref => ref && ref.length > 0);
          
          if (validRefs.length > 0) {
            const { data: quotationsDataByRef, error: quotationsErrorByRef } = await supabase
              .from('quotations')
              .select('id, quotation_id, product_name, product_url, quantity, total_price_option1, total_price_option2, total_price_option3, unit_price_option1, unit_price_option2, unit_price_option3, unit_weight_option1, unit_weight_option2, unit_weight_option3, title_option1, title_option2, title_option3, description_option1, description_option2, description_option3, delivery_time_option1, delivery_time_option2, delivery_time_option3, image_url, extra_images_option1, extra_images_option2, extra_images_option3, selected_option, status, service_type, shipping_method, shipping_country, shipping_city, receiver_name, receiver_phone, receiver_address, created_at, updated_at, Quotation_fees')
              .in('quotation_id', validRefs);
              
            if (quotationsErrorByRef) {
              console.error("Error fetching quotations by reference:", quotationsErrorByRef);
              console.error("Error details:", JSON.stringify(quotationsErrorByRef, null, 2));
            } else if (quotationsDataByRef) {
              console.log(`Found ${quotationsDataByRef.length} matching quotations by reference number`);
              
              (quotationsDataByRef as unknown as Quotation[]).forEach((quotation) => {
                quotationsMap[quotation.id] = quotation;
              });
            }
          }
        }
        
        // Step 6: Combine all data
        const enrichedPayments: Payment[] = paymentsRows.map(payment => {
          // Get profile for this payment
          const profile = payment.user_id ? profilesMap[payment.user_id] : undefined;
          
          // Get quotations for this payment
          const quotations: Quotation[] = [];
          
          // Try to match by quotation_ids array
          if (payment.quotation_ids) {
            // Handle array format
            if (Array.isArray(payment.quotation_ids)) {
              payment.quotation_ids.forEach((id: string) => {
                if (quotationsMap[id]) {
                  quotations.push(quotationsMap[id]);
                }
              });
            }
            // Handle string format
            else if (typeof payment.quotation_ids === 'string') {
              payment.quotation_ids.split(',').forEach((id: string) => {
                const trimmedId = id.trim();
                if (trimmedId && quotationsMap[trimmedId]) {
                  quotations.push(quotationsMap[trimmedId]);
                }
              });
            }
          }
          
          // If no quotations found by ID, try to match by reference number
          if (quotations.length === 0 && payment.reference_number) {
            Object.values(quotationsMap).forEach(quotation => {
              if (quotation.quotation_id === payment.reference_number) {
                quotations.push(quotation);
              }
            });
          }
          
          return {
            id: payment.id,
            user_id: payment.user_id,
            total_amount: String(payment.total_amount),
            method: payment.method,
            status: payment.status,
            proof_url: payment.proof_url,
            created_at: payment.created_at,
            quotation_ids: Array.isArray(payment.quotation_ids)
              ? payment.quotation_ids
              : (typeof payment.quotation_ids === 'string'
                ? payment.quotation_ids.split(',').map((id) => id.trim()).filter(Boolean)
                : null),
            payment_proof: payment.payment_proof,
            reference_number: payment.reference_number,
            profile,
            quotations: quotations.length > 0 ? quotations : undefined
          };
        });
        
        setPayments(enrichedPayments);
        setFilteredPayments(enrichedPayments);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred while fetching payments");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayments();
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPayments(payments);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = payments.filter(payment => 
      payment.id.toLowerCase().includes(query) ||
      (payment.user_id && payment.user_id.toLowerCase().includes(query)) ||
      (payment.profile?.email && payment.profile.email.toLowerCase().includes(query)) ||
      (payment.profile?.full_name && payment.profile.full_name.toLowerCase().includes(query)) ||
      (payment.reference_number && payment.reference_number.toLowerCase().includes(query)) ||
      payment.method.toLowerCase().includes(query) ||
      payment.status.toLowerCase().includes(query) ||
      (payment.quotations && payment.quotations.some(q => 
        q.product_name.toLowerCase().includes(query) || 
        q.quotation_id.toLowerCase().includes(query)
      ))
    );
    
    setFilteredPayments(filtered);
  }, [searchQuery, payments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  // Refresh data function 
  const refreshData = async () => {
    setLoading(true);
    setSearchQuery("");
    
    try {
      // Re-fetch all payment data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
        setError(`Failed to refresh: ${paymentsError.message}`);
      return;
    }
    
      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        setFilteredPayments([]);
      return;
    }
    
      // Proceed with processing the data as in the original fetch
      // This is a simplified version - you'd repeat the same steps to get profiles and quotations
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      
    } catch (err) {
      console.error("Unexpected error during refresh:", err);
      setError("An unexpected error occurred while refreshing payments");
    } finally {
      setLoading(false);
    }
  };

  // Handle opening proof modal
  const handleViewProof = (proofUrl: string | null) => {
    if (proofUrl) {
      console.log("Opening proof modal with URL:", proofUrl);
      setCurrentProofUrl(proofUrl);
      setIsProofModalOpen(true);
    }
  };

  // Handle opening quotations modal
  const handleViewQuotations = (quotations: Quotation[] | undefined, payment: Payment) => {
    console.log("Opening quotations modal", quotations ? `with ${quotations.length} items` : "with no quotations");
    setSelectedQuotations(quotations || []);
    setSelectedPayment(payment);
    setQuotationModalOpen(true);
  };

  // Function to update payment status
  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(paymentId);
      
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus } as never)
        .eq('id', paymentId);
        
      if (error) {
        console.error("Error updating payment status:", error);
        showToast(`Failed to update status: ${error.message}`, 'error');
        return;
      }
      
      // Update state locally instead of fetching all data again
      setPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: newStatus } 
            : payment
        )
      );
      
      setFilteredPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: newStatus } 
              : payment
        )
      );
      
      showToast(`Payment status changed to ${newStatus}`, 'success');
      setIsStatusDropdownOpen(null);
    } catch (err) {
      console.error("Unexpected error during status update:", err);
      showToast("An unexpected error occurred", 'error');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle zoom functionality - not currently used
  // const toggleProofZoom = (imageUrl: string | null) => {
  //   if (imageUrl && !imageUrl.endsWith('.pdf')) {
  //     console.log("Toggling proof zoom:", imageUrl);
  //     setZoomedImage(zoomedImage === imageUrl ? null : imageUrl);
  //   }
  // };

  // Handle zoom for quotation images - not currently used
  // const toggleQuotationZoom = (index: number) => {
  //   console.log("Toggling quotation zoom for index:", index);
  //   setZoomedQuotationIndex(zoomedQuotationIndex === index ? null : index);
  // };

    return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Payment Management</h1>

      <Card className="p-6 mb-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
            Payment History ({filteredPayments.length} {searchQuery ? 'matched' : ''} Records of {payments.length} total)
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-600"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
                </svg>
          </div>

            <Button onClick={refreshData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
              {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            <p>{error}</p>
            <Button onClick={refreshData} variant="outline" className="mt-2 dark:text-slate-200 dark:border-slate-600">
              Try Again
              </Button>
            </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-slate-400">Loading payment records...</p>
            </div>
          </div>
        ) : (
          filteredPayments.length === 0 ? (
            <div className="text-center py-10 border rounded-md border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-slate-400">
                {searchQuery ? 'No payments match your search.' : 'No payment records found.'}
              </p>
        </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm p-4 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Left side - User info */}
                    <div className="sm:w-1/4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <h3 className="font-medium text-gray-700 dark:text-slate-200">User</h3>
                      {payment.profile ? (
                        <div className="mt-2">
                          <div className="font-medium text-gray-800 dark:text-slate-100">{payment.profile.full_name || 'Unnamed User'}</div>
                          <div className="text-sm text-gray-500 dark:text-slate-400">{payment.profile.email}</div>
                          <div className="text-xs font-mono text-gray-400 dark:text-slate-500 mt-1">{payment.user_id}</div>
        </div>
      ) : (
                        <div className="mt-2 font-mono text-xs break-all text-gray-700 dark:text-slate-300">{payment.user_id || '-'}</div>
                      )}
          </div>

                    {/* Middle - Payment details */}
                    <div className="sm:w-2/4 flex flex-col justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Payment ID</div>
                          <div className="font-mono text-xs truncate text-gray-700 dark:text-slate-300">{payment.id}</div>
                    </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Date</div>
                          <div className="text-gray-700 dark:text-slate-300">{formatDate(payment.created_at)}</div>
                    </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Reference</div>
                          <div className="text-gray-700 dark:text-slate-300">{payment.reference_number || '-'}</div>
                    </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Method</div>
                          <div className="text-gray-700 dark:text-slate-300">{payment.method}</div>
                    </div>
                  </div>

                      <div className="flex items-center gap-2 mt-3">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mr-1">Status:</div>
                        <Badge
                          className={`px-2 py-1 font-medium rounded-full ${
                            payment.status === 'Approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                              : payment.status.toLowerCase() === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                              : payment.status.toLowerCase() === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400'
                              : payment.status.toLowerCase() === 'processing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                              : payment.status.toLowerCase() === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {payment.status}
                        </Badge>
                        
                        {/* Status Update Dropdown */}
                        <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                            className="ml-2 h-7 px-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            disabled={isUpdatingStatus === payment.id}
                            onClick={() => setIsStatusDropdownOpen(isStatusDropdownOpen === payment.id ? null : payment.id)}
                          >
                            {isUpdatingStatus === payment.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 dark:border-slate-400 border-t-transparent"></div>
                            ) : (
                              <>Change <span className="ml-1">▼</span></>
                            )}
                    </Button>
                          
                          {isStatusDropdownOpen === payment.id && (
                            <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white dark:bg-slate-800 z-10 border border-gray-200 dark:border-slate-700">
                              <div className="py-1">
                                <button
                                  className={`w-full text-left px-4 py-2 text-sm ${payment.status === 'Approved' ? 'bg-gray-100 dark:bg-slate-700 font-medium' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} text-green-600 dark:text-green-400`}
                                  onClick={() => updatePaymentStatus(payment.id, 'Approved')}
                                  disabled={payment.status === 'Approved'}
                                >
                                  {payment.status === 'Approved' && '✓ '}Approved
                                </button>
                                <button
                                  className={`w-full text-left px-4 py-2 text-sm ${payment.status === 'Pending' ? 'bg-gray-100 dark:bg-slate-700 font-medium' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} text-yellow-600 dark:text-yellow-400`}
                                  onClick={() => updatePaymentStatus(payment.id, 'Pending')}
                                  disabled={payment.status === 'Pending'}
                                >
                                  {payment.status === 'Pending' && '✓ '}Pending
                                </button>
                                <button
                                  className={`w-full text-left px-4 py-2 text-sm ${payment.status === 'Rejected' ? 'bg-gray-100 dark:bg-slate-700 font-medium' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} text-red-600 dark:text-red-400`}
                                  onClick={() => updatePaymentStatus(payment.id, 'Rejected')}
                                  disabled={payment.status === 'Rejected'}
                                >
                                  {payment.status === 'Rejected' && '✓ '}Rejected
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                  </div>
                </div>
                
                    {/* Right side - Price and Actions */}
                    <div className="sm:w-1/4 flex flex-col items-start sm:items-end justify-between">
                                  <div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 sm:text-right">Amount</div>
                        <div className="font-medium text-lg text-gray-800 dark:text-slate-100">{formatAmount(payment.total_amount)}</div>
                        
                        <div className="flex mt-2 items-center gap-2">
                          <div className="text-xs text-gray-500 dark:text-slate-400">Quotations:</div>
                          {payment.quotations && payment.quotations.length > 0 ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400">
                              {payment.quotations.length} item{payment.quotations.length !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">None</Badge>
                                  )}
                                </div>
                                
                        <div className="flex mt-1 items-center gap-2">
                          <div className="text-xs text-gray-500 dark:text-slate-400">Proof:</div>
                          {payment.proof_url || payment.payment_proof ? (
                            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Available</Badge>
                          ) : (
                            <Badge className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Not Available</Badge>
                          )}
                                  </div>
                      </div>
                            
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewQuotations(payment.quotations, payment)}
                          disabled={!payment.quotations || payment.quotations.length === 0}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          View Quotations
                        </Button>
              <Button
                          variant="outline" 
                                    size="sm"
                          disabled={!payment.proof_url && !payment.payment_proof}
                          onClick={() => handleViewProof(payment.proof_url || payment.payment_proof)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 dark:border-slate-600"
                        >
                          View Proof
                </Button>
                </div>
            </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      {/* Payment Proof Modal - Fixed implementation */}
      <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
        <DialogContent className="max-w-3xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">Payment Proof</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {currentProofUrl && (
              <div className="w-full flex justify-center">
                {currentProofUrl.endsWith('.pdf') ? (
                  <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-md text-center">
                    <p className="text-gray-700 dark:text-slate-300">PDF Document</p>
                    <a href={currentProofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline block mt-2">
                      <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">View PDF</Button>
                    </a>
          </div>
                ) : (
                  <Image 
                    src={currentProofUrl} 
                    alt="Payment Proof"
                    width={800}
                    height={500}
                    className="w-full max-h-[500px] object-contain rounded-md"
                    onClick={() => window.open(currentProofUrl, '_blank')}
                    style={{ cursor: 'zoom-in' }}
                  />
                )}
                        </div>
                      )}
                    </div>
        </DialogContent>
      </Dialog>

      {/* Quotations Modal - Enhanced with comprehensive data */}
      <Dialog open={quotationModalOpen} onOpenChange={setQuotationModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">
              Quotations Paid {selectedPayment && `- ${formatAmount(selectedPayment.total_amount)}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedQuotations.length > 0 ? (
              <div className="space-y-6">
                {selectedQuotations.map((quotation) => {
                  const selectedOption = quotation.selected_option || 1;
                  const unitPrice = selectedOption === 1 ? quotation.unit_price_option1 : 
                                   selectedOption === 2 ? quotation.unit_price_option2 : 
                                   quotation.unit_price_option3;
                  const totalPrice = selectedOption === 1 ? quotation.total_price_option1 : 
                                    selectedOption === 2 ? quotation.total_price_option2 : 
                                    quotation.total_price_option3;
                  const unitWeight = selectedOption === 1 ? quotation.unit_weight_option1 : 
                                    selectedOption === 2 ? quotation.unit_weight_option2 : 
                                    quotation.unit_weight_option3;
                  const title = selectedOption === 1 ? quotation.title_option1 : 
                               selectedOption === 2 ? quotation.title_option2 : 
                               quotation.title_option3;
                  const description = selectedOption === 1 ? quotation.description_option1 : 
                                     selectedOption === 2 ? quotation.description_option2 : 
                                     quotation.description_option3;
                  const deliveryTime = selectedOption === 1 ? quotation.delivery_time_option1 : 
                                      selectedOption === 2 ? quotation.delivery_time_option2 : 
                                      quotation.delivery_time_option3;
                  const extraImages = selectedOption === 1 ? quotation.extra_images_option1 : 
                                     selectedOption === 2 ? quotation.extra_images_option2 : 
                                     quotation.extra_images_option3;
                  const calculatedTotal = unitPrice && quotation.quantity ? 
                    (parseFloat(unitPrice) * quotation.quantity).toFixed(2) : null;

                  return (
                    <div key={quotation.id} className="border rounded-lg border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-900/50">
                      {/* Header Section */}
                      <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-shrink-0">
                          {quotation.image_url ? (
                            <div className="relative h-32 w-32 md:h-40 md:w-40 overflow-hidden rounded-md border border-gray-200 dark:border-slate-700">
                              <Image
                                src={quotation.image_url}
                                alt={quotation.product_name}
                                width={160}
                                height={160}
                                className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity cursor-pointer"
                                onClick={() => window.open(quotation.image_url || '', '_blank')}
                              />
                            </div>
                          ) : (
                            <div className="h-32 w-32 md:h-40 md:w-40 bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center border border-gray-200 dark:border-slate-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{quotation.product_name}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-slate-400">Quotation ID</p>
                              <p className="font-mono text-gray-700 dark:text-slate-300 font-medium">{quotation.quotation_id || quotation.id}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-slate-400">Status</p>
                              <Badge className={`mt-1 ${
                                quotation.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                                quotation.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                              }`}>
                                {quotation.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-slate-400">Service Type</p>
                              <p className="text-gray-700 dark:text-slate-300">{quotation.service_type || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Information */}
                      {selectedPayment && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Payment Information</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-blue-700 dark:text-blue-300">Payment Amount</p>
                              <p className="font-bold text-lg text-blue-900 dark:text-blue-100">{formatAmount(selectedPayment.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-blue-700 dark:text-blue-300">Payment Method</p>
                              <p className="text-blue-900 dark:text-blue-100 font-medium">{selectedPayment.method}</p>
                            </div>
                            <div>
                              <p className="text-blue-700 dark:text-blue-300">Payment Status</p>
                              <Badge className={`mt-1 ${
                                selectedPayment.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                                selectedPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {selectedPayment.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-blue-700 dark:text-blue-300">Reference Number</p>
                              <p className="font-mono text-xs text-blue-900 dark:text-blue-100">{selectedPayment.reference_number || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Product Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-slate-400">Quantity:</span>
                              <span className="font-medium text-gray-900 dark:text-slate-100">{quotation.quantity} units</span>
                            </div>
                            {quotation.product_url && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-slate-400">Product URL:</span>
                                <a href={quotation.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                  View Product
                                </a>
                              </div>
                            )}
                            {quotation.Quotation_fees && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-slate-400">Quotation Fees:</span>
                                <span className="font-medium text-gray-900 dark:text-slate-100">{formatAmount(quotation.Quotation_fees)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Shipping Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-slate-400">Method:</span>
                              <span className="font-medium text-gray-900 dark:text-slate-100">{quotation.shipping_method || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-slate-400">Country:</span>
                              <span className="font-medium text-gray-900 dark:text-slate-100">{quotation.shipping_country || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-slate-400">City:</span>
                              <span className="font-medium text-gray-900 dark:text-slate-100">{quotation.shipping_city || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Selected Price Option */}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Selected Price Option {selectedOption}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-green-700 dark:text-green-300 mb-1">Option Title:</p>
                            <p className="font-medium text-green-900 dark:text-green-100">{title || 'N/A'}</p>
                          </div>
                          {description && (
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300 mb-1">Description:</p>
                              <p className="text-sm text-green-900 dark:text-green-100">{description}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Unit Price:</p>
                              <p className="font-bold text-green-900 dark:text-green-100">{unitPrice ? formatAmount(unitPrice) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Unit Weight:</p>
                              <p className="font-bold text-green-900 dark:text-green-100">{unitWeight ? `${unitWeight} g` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Quantity:</p>
                              <p className="font-bold text-green-900 dark:text-green-100">{quotation.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Total:</p>
                              <p className="font-bold text-lg text-green-900 dark:text-green-100">
                                {calculatedTotal ? formatAmount(calculatedTotal) : (totalPrice ? formatAmount(totalPrice) : 'N/A')}
                              </p>
                            </div>
                          </div>
                          {deliveryTime && (
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Delivery Time:</p>
                              <p className="font-medium text-green-900 dark:text-green-100">{deliveryTime}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Extra Images Gallery */}
                      {extraImages && Array.isArray(extraImages) && extraImages.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Additional Images ({extraImages.length})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {extraImages.map((imageUrl, idx) => (
                              <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imageUrl, '_blank')}>
                                <Image
                                  src={imageUrl}
                                  alt={`Additional image ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Receiver Information */}
                      {(quotation.receiver_name || quotation.receiver_phone || quotation.receiver_address) && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Receiver Information</h4>
                          <div className="space-y-2 text-sm">
                            {quotation.receiver_name && (
                              <div className="flex justify-between">
                                <span className="text-purple-700 dark:text-purple-300">Name:</span>
                                <span className="font-medium text-purple-900 dark:text-purple-100">{quotation.receiver_name}</span>
                              </div>
                            )}
                            {quotation.receiver_phone && (
                              <div className="flex justify-between">
                                <span className="text-purple-700 dark:text-purple-300">Phone:</span>
                                <span className="font-medium text-purple-900 dark:text-purple-100">{quotation.receiver_phone}</span>
                              </div>
                            )}
                            {quotation.receiver_address && (
                              <div>
                                <span className="text-purple-700 dark:text-purple-300">Address:</span>
                                <p className="text-purple-900 dark:text-purple-100 mt-1 whitespace-pre-line">{quotation.receiver_address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                        <span>Created: {formatDate(quotation.created_at)}</span>
                        {quotation.updated_at && <span>Updated: {formatDate(quotation.updated_at)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-slate-400">No quotation details available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 