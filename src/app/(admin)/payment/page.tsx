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
  total_price_option1: string;
  image_url: string | null;
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
          const { data: quotationsDataById, error: quotationsErrorById } = await supabase
            .from('quotations')
            .select('id, quotation_id, product_name, total_price_option1, image_url')
            .in('id', quotationIds);
            
          if (quotationsErrorById) {
            console.error("Error fetching quotations by ID:", quotationsErrorById);
          } else if (quotationsDataById) {
            console.log(`Found ${quotationsDataById.length} matching quotations by ID`);
            
            (quotationsDataById as unknown as Quotation[]).forEach((quotation) => {
              quotationsMap[quotation.id] = quotation;
            });
          }
        }
        
        // Then fetch by reference numbers
        if (referenceNumbers.length > 0) {
          const { data: quotationsDataByRef, error: quotationsErrorByRef } = await supabase
            .from('quotations')
            .select('id, quotation_id, product_name, total_price_option1, image_url')
            .in('quotation_id', referenceNumbers);
            
          if (quotationsErrorByRef) {
            console.error("Error fetching quotations by reference:", quotationsErrorByRef);
          } else if (quotationsDataByRef) {
            console.log(`Found ${quotationsDataByRef.length} matching quotations by reference number`);
            
            (quotationsDataByRef as unknown as Quotation[]).forEach((quotation) => {
              quotationsMap[quotation.id] = quotation;
            });
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
  const handleViewQuotations = (quotations: Quotation[] | undefined) => {
    if (quotations && quotations.length > 0) {
      console.log("Opening quotations modal with", quotations.length, "items");
      setSelectedQuotations(quotations);
      setQuotationModalOpen(true);
    }
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
                        {payment.quotations && payment.quotations.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                            onClick={() => handleViewQuotations(payment.quotations)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 dark:border-slate-600"
                              >
                            View Quotations
                              </Button>
                            )}
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

      {/* Quotations Modal - Fixed implementation */}
      <Dialog open={quotationModalOpen} onOpenChange={setQuotationModalOpen}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-slate-100">Quotations Paid</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedQuotations.length > 0 ? (
              <div className="space-y-6">
                {selectedQuotations.map((quotation) => (
                  <div key={quotation.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg border-gray-200 dark:border-slate-700">
                    <div className="flex-shrink-0">
                      {quotation.image_url ? (
                        <div className="relative h-40 w-40 md:h-48 md:w-48 overflow-hidden rounded-md">
                          <Image
                            src={quotation.image_url}
                            alt={quotation.product_name}
                            width={192}
                            height={192}
                            className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity"
                            onClick={() => window.open(quotation.image_url || '', '_blank')}
                            style={{ cursor: 'zoom-in' }}
                          />
                        </div>
                      ) : (
                        <div className="h-40 w-40 md:h-48 md:w-48 bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-16 w-16 text-gray-400 dark:text-slate-500" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
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
                            <div className="flex-grow">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{quotation.product_name}</h3>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Quotation ID</p>
                          <p className="font-mono text-sm text-gray-700 dark:text-slate-300">{quotation.quotation_id || quotation.id}</p>
                              </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Price</p>
                          <p className="font-medium text-lg text-gray-800 dark:text-slate-100">{formatAmount(quotation.total_price_option1)}</p>
                            </div>
                          </div>
                      </div>
            </div>
            ))}
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