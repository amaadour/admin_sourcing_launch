"use client";

import React, { useState } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuotationData, CustomizationFile } from "@/types/quotation";
import { supabase } from "@/lib/supabase";
import { customToast } from "@/components/ui/toast";
import { sendEmailClient } from "@/lib/sendEmailClient";
import PriceOptionsModal from "./PriceOptionsModal";
import Image from 'next/image';

interface QuotationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData;
  onUpdate: () => void;
}

export default function QuotationEditModal({ isOpen, onClose, quotation, onUpdate }: QuotationEditModalProps) {
  console.log("Quotation data received:", quotation);
  console.log("Quotation fees value:", quotation.Quotation_fees);
  console.log("Quotation fees type:", typeof quotation.Quotation_fees);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceOptionsModalOpen, setIsPriceOptionsModalOpen] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [hasApprovedPayment, setHasApprovedPayment] = useState(false);
  const [customizationFiles, setCustomizationFiles] = useState<CustomizationFile[]>([]);
  const [formData, setFormData] = useState({
    quotation_id: quotation.quotation_id || '',
    product_name: quotation.product.name,
    quantity: parseInt(quotation.quantity),
    status: quotation.status,
    shipping_method: quotation.shippingMethod,
    shipping_country: quotation.destination.split(', ')[1] || '',
    shipping_city: quotation.destination.split(', ')[0] || '',
    quotation_image: quotation.image_url || quotation.product.image || '',
    Quotation_fees: quotation.Quotation_fees?.toString() || '',
    service_type: quotation.service_type || '',
    product_url: quotation.product_url || '',
    receiver_name: quotation.receiver_name || '',
    receiver_phone: quotation.receiver_phone || '',
    receiver_address: quotation.receiver_address || '',
    rejection_reason: quotation.rejection_reason || '',
    client_label: quotation.client_label || '',
    is_customizable: quotation.is_customizable || false,
    customization_price: quotation.customization_price?.toString() || '',
  });

  React.useEffect(() => {
    const checkApprovedPayment = async () => {
      if (!quotation.id) return;
      const { data } = await supabase
        .from('payment_quotations')
        .select('payments!inner(status)')
        .eq('quotation_id', quotation.id)
        .eq('payments.status', 'Approved')
        .limit(1);
      if (data && data.length > 0) setHasApprovedPayment(true);
    };
    checkApprovedPayment();
  }, [quotation.id]);

  // Fetch fresh customization fields from DB so they stay in sync with PriceOptionsModal
  React.useEffect(() => {
    const fetchCustomizationSettings = async () => {
      if (!quotation.id) return;
      const { data } = await supabase
        .from('quotations')
        .select('is_customizable, customization_price')
        .eq('id', quotation.id)
        .single();
      if (data) {
        const d = data as { is_customizable?: boolean | null; customization_price?: number | null };
        setFormData(prev => ({
          ...prev,
          is_customizable: !!d.is_customizable,
          customization_price: d.customization_price?.toString() || '',
        }));
      }
    };
    fetchCustomizationSettings();
  }, [quotation.id]);

  React.useEffect(() => {
    const fetchCustomizationFiles = async () => {
      if (!quotation.id) return;
      const { data } = await supabase
        .from('customization_files')
        .select('*')
        .eq('quotation_id', quotation.id)
        .order('created_at', { ascending: false });
      if (data) setCustomizationFiles(data as CustomizationFile[]);
    };
    fetchCustomizationFiles();
  }, [quotation.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.status === 'Rejected' && !formData.rejection_reason.trim()) {
      customToast({
        variant: "destructive",
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this quotation.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, try to find the actual UUID by quotation_id
      let quotationUuid;
      
      // Check if we already have a valid UUID
      if (quotation.id && typeof quotation.id === 'string' && 
          (quotation.id as string).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        quotationUuid = quotation.id;
      } else {
        // Try to find the UUID using the quotation_id
        const { data: quotationData, error: lookupError } = await supabase
          .from('quotations')
          .select('id')
          .eq('quotation_id', quotation.quotation_id)
          .maybeSingle();

        if (lookupError) {
          console.error('Error looking up quotation UUID:', lookupError);
          throw new Error('Failed to find quotation in database');
        }

        if (!quotationData) {
          throw new Error('Quotation not found in database');
        }

        quotationUuid = (quotationData as unknown as { id: string }).id;
      }

      console.log('Found quotation UUID:', quotationUuid);

      const updateData = {
        quotation_id: formData.quotation_id,
        product_name: formData.product_name,
        quantity: formData.quantity,
        status: formData.status,
        shipping_method: formData.shipping_method,
        shipping_country: formData.shipping_country,
        shipping_city: formData.shipping_city,
        image_url: formData.quotation_image,
        Quotation_fees: formData.Quotation_fees === '' ? null : parseFloat(formData.Quotation_fees),
        service_type: formData.service_type,
        product_url: formData.product_url,
        receiver_name: formData.receiver_name || null,
        receiver_phone: formData.receiver_phone || null,
        receiver_address: formData.receiver_address || null,
        rejection_reason: formData.status === 'Rejected' ? formData.rejection_reason.trim() : null,
        client_label: hasApprovedPayment ? (quotation.client_label || null) : (formData.client_label.trim() || null),
        is_customizable: formData.is_customizable,
        customization_price: formData.is_customizable && formData.customization_price.trim()
          ? parseFloat(formData.customization_price)
          : null,
        updated_at: new Date().toISOString()
      };

      // Perform the update using the UUID
      const { data, error } = await supabase
        .from('quotations')
        .update(updateData as never)
        .eq('id', quotationUuid)
        .select('*');

      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          quotationUuid
        });
        throw new Error(`Failed to update quotation: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after update');
      }

      console.log('Update successful:', data[0]);

      // Sync client_label to shipping table if label changed and not locked
      if (!hasApprovedPayment) {
        const newLabel = formData.client_label.trim() || null;
        await supabase
          .from('shipping')
          .update({ label: newLabel } as never)
          .eq('quotation_id', quotationUuid);
      }

      // Send email if status changed to Approved or Rejected
      const newStatus = formData.status;
      const oldStatus = quotation.status;
      if ((newStatus === 'Approved' || newStatus === 'Rejected') && newStatus !== oldStatus) {
        const clientEmail = quotation.user?.email;
        if (clientEmail) {
          sendEmailClient({
            type: 'quotation_status',
            clientEmail,
            quotation: {
              quotation_id: quotation.quotation_id,
              product_name: quotation.product?.name || formData.product_name,
              quantity: quotation.quantity,
              status: newStatus,
              shipping_country: formData.shipping_country,
              shipping_city: formData.shipping_city,
              receiver_name: formData.receiver_name,
              rejection_reason: newStatus === 'Rejected' ? formData.rejection_reason : null,
            },
          });
        }
      }

      customToast({
        variant: "default",
        title: "Success",
        description: "Quotation updated successfully",
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating quotation:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update quotation";
      customToast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to validate Supabase image URLs
  const isValidImageUrl = (url: string | null | undefined) =>
    !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

  // Reusable input class
  const inp = "w-full rounded-lg border border-[#BBDEFB] bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/20 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";
  const lbl = "block text-xs font-semibold text-[#0D47A1]/60 uppercase tracking-wide mb-1.5";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Fixed Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#E3F2FD] dark:bg-blue-900/20 border-b border-[#BBDEFB] flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[#0D47A1] dark:text-blue-300">Edit Quotation</h2>
                <p className="text-xs text-[#0D47A1]/60 mt-0.5">{formData.quotation_id} — {formData.product_name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[#BBDEFB] text-[#0D47A1] hover:bg-[#BBDEFB] transition-all active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6L18 18" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSubmit} id="edit-quotation-form" className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900 p-5 space-y-4">

              {/* Product Information */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Product Information</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Quotation ID</label>
                    <input type="text" name="quotation_id" value={formData.quotation_id} onChange={handleChange} className={`${inp} bg-[#E3F2FD]/50 text-[#0D47A1] font-mono cursor-not-allowed`} required readOnly={!!quotation.quotation_id} />
                  </div>
                  <div>
                    <label className={lbl}>Service Type</label>
                    <div className={`${inp} bg-[#E3F2FD]/50 text-[#0D47A1]`}>{formData.service_type || '—'}</div>
                  </div>
                  <div>
                    <label className={lbl}>Product Name</label>
                    <input type="text" name="product_name" value={formData.product_name} onChange={handleChange} className={inp} required />
                  </div>
                  <div>
                    <label className={lbl}>Quantity</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={inp} required min="1" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={lbl}>Product URL</label>
                    <input type="text" name="product_url" value={formData.product_url} onChange={handleChange} className={inp} placeholder="https://..." />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Status</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    {(['Pending', 'Approved', 'Rejected'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          formData.status === s
                            ? s === 'Approved' ? 'bg-green-600 border-green-600 text-white'
                              : s === 'Rejected' ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-amber-400 border-amber-400 text-white'
                            : 'border-[#BBDEFB] text-[#0D47A1]/60 hover:bg-[#E3F2FD]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {formData.status === 'Rejected' && (
                    <div>
                      <label className={lbl}>Rejection Reason <span className="text-red-500">*</span></label>
                      <textarea name="rejection_reason" value={formData.rejection_reason} onChange={handleChange} rows={3} placeholder="Explain why this quotation is being rejected…" className={`${inp} border-red-300 focus:border-red-500 focus:ring-red-200 resize-none`} required />
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Shipping</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Method</label>
                    <select name="shipping_method" value={formData.shipping_method} onChange={handleChange} className={inp} required>
                      <option value="Sea">Sea</option>
                      <option value="Air">Air</option>
                      <option value="Train">Train</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Country</label>
                    <input type="text" name="shipping_country" value={formData.shipping_country} onChange={handleChange} className={inp} required />
                  </div>
                  <div>
                    <label className={lbl}>City</label>
                    <input type="text" name="shipping_city" value={formData.shipping_city} onChange={handleChange} className={inp} required />
                  </div>
                </div>
              </div>

              {/* Receiver */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Receiver Information</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Name</label>
                    <input type="text" name="receiver_name" value={formData.receiver_name} onChange={handleChange} className={inp} placeholder="Receiver name" />
                  </div>
                  <div>
                    <label className={lbl}>Phone</label>
                    <input type="text" name="receiver_phone" value={formData.receiver_phone} onChange={handleChange} className={inp} placeholder="Phone number" />
                  </div>
                  <div>
                    <label className={lbl}>Address</label>
                    <input type="text" name="receiver_address" value={formData.receiver_address} onChange={handleChange} className={inp} placeholder="Delivery address" />
                  </div>
                </div>
              </div>

              {/* Image + Fees */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Product Image & Fees</h3>
                </div>
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start">
                  <div
                    className="relative w-full md:w-48 h-40 rounded-lg overflow-hidden border border-[#BBDEFB] cursor-zoom-in bg-[#E3F2FD]/30 flex items-center justify-center flex-shrink-0 group"
                    onClick={() => setIsImageZoomed(true)}
                  >
                    {isValidImageUrl(formData.quotation_image) ? (
                      <>
                        <Image src={formData.quotation_image} alt="Product" width={192} height={160} className="object-contain max-h-36 group-hover:scale-105 transition-transform duration-200" />
                        <div className="absolute bottom-1.5 right-1.5 bg-[#0D47A1]/70 text-white p-1 rounded-full">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z"/><path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd"/></svg>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#0D47A1]/40">No image available</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={lbl}>Service Fee ($)</label>
                    <input type="number" step="0.01" name="Quotation_fees" value={formData.Quotation_fees} onChange={handleChange} className={inp} placeholder="0.00" />
                    <p className="text-xs text-[#0D47A1]/50 mt-1.5">Added to the client&apos;s total at checkout</p>
                  </div>
                </div>
              </div>

              {/* Client Shipping Label */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Shipping Label</h3>
                  {hasApprovedPayment && (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#0D47A1] bg-white border border-[#0D47A1] px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      Locked
                    </span>
                  )}
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  {hasApprovedPayment ? (
                    <p className="text-sm text-[#0D47A1] font-mono bg-[#E3F2FD]/50 rounded px-3 py-2 border border-[#BBDEFB]">{formData.client_label || '—'}</p>
                  ) : (
                    <input type="text" name="client_label" value={formData.client_label} onChange={handleChange} placeholder="Enter shipping label…" className={inp} />
                  )}
                </div>
              </div>

              {/* Customization Option */}
              <div className="rounded-xl border border-[#BBDEFB] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#E3F2FD] border-b border-[#BBDEFB]">
                  <h3 className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide">Customization Option</h3>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_customizable: !prev.is_customizable }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${formData.is_customizable ? 'bg-[#0D47A1]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.is_customizable ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {formData.is_customizable && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-b border-[#E3F2FD]">
                    <label className={lbl}>Customized Unit Price ($ / unit)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0D47A1]/60 text-sm">$</span>
                      <input type="number" name="customization_price" value={formData.customization_price} onChange={handleChange} placeholder="0.00" step="0.01" min="0" className={`${inp} pl-7`} />
                    </div>
                    <p className="text-xs text-[#0D47A1]/50 mt-1.5">Total = unit price × quantity. Clients must upload customization files before paying.</p>
                  </div>
                )}
                {customizationFiles.length > 0 && (
                  <div className="p-4 bg-white dark:bg-gray-800 space-y-2">
                    <p className="text-xs font-semibold text-[#0D47A1] uppercase tracking-wide mb-2">Client Files ({customizationFiles.length})</p>
                    {customizationFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[#BBDEFB] bg-[#E3F2FD]/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-[#0D47A1] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0D47A1] truncate">{file.file_name}</p>
                            <p className="text-xs text-[#0D47A1]/50">{file.file_type}{file.file_size ? ` · ${(file.file_size / 1024).toFixed(0)} KB` : ''}</p>
                          </div>
                        </div>
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D47A1] text-white text-xs font-medium hover:bg-[#1565C0] transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manage Price Options */}
              <button
                type="button"
                onClick={() => setIsPriceOptionsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#BBDEFB] text-[#0D47A1] text-sm font-semibold hover:bg-[#E3F2FD] hover:border-[#0D47A1] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                Manage Price Options
              </button>

            </form>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#BBDEFB] bg-white dark:bg-gray-900 flex-shrink-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-[#BBDEFB] text-[#0D47A1] hover:bg-[#E3F2FD]">
                Cancel
              </Button>
              <Button type="submit" form="edit-quotation-form" variant="primary" disabled={isLoading} className="!bg-[#0D47A1] hover:!bg-[#1565C0] text-white px-6">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Saving…
                  </span>
                ) : 'Save Changes'}
              </Button>
            </div>

          </div>
        </div>
      </Modal>

      {/* Image Zoom Modal */}
      {isImageZoomed && formData.quotation_image && (
        <Modal isOpen={isImageZoomed} onClose={() => setIsImageZoomed(false)}>
          <div className="fixed inset-0 flex items-center justify-center z-[150]">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Image</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setIsImageZoomed(false)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {isValidImageUrl(formData.quotation_image) ? (
                  <Image 
                    src={formData.quotation_image} 
                    alt="Zoomed product"
                    width={800}
                    height={600}
                    className="max-w-full max-h-[70vh] object-contain" 
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-80 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                    No valid image
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Price Options Modal */}
      <PriceOptionsModal
        isOpen={isPriceOptionsModalOpen}
        onClose={() => setIsPriceOptionsModalOpen(false)}
        quotationId={quotation.id}
        initialData={{
          title_option1: quotation.title_option1 || quotation.product.name,
          extra_images_option1: quotation.extra_images_option1 || [],
          unit_price_option1: quotation.unit_price_option1,
          unit_weight_option1: quotation.unit_weight_option1,
          delivery_time_option1: quotation.delivery_time_option1 || "",
          description_option1: quotation.description_option1 || "",
          title_option2: quotation.title_option2 || "",
          extra_images_option2: quotation.extra_images_option2 || [],
          unit_price_option2: quotation.unit_price_option2,
          unit_weight_option2: quotation.unit_weight_option2,
          delivery_time_option2: quotation.delivery_time_option2 || "",
          description_option2: quotation.description_option2 || "",
          title_option3: quotation.title_option3 || "",
          extra_images_option3: quotation.extra_images_option3 || [],
          unit_price_option3: quotation.unit_price_option3,
          unit_weight_option3: quotation.unit_weight_option3,
          delivery_time_option3: quotation.delivery_time_option3 || "",
          description_option3: quotation.description_option3 || ""
        }}
        onUpdate={onUpdate}
      />
    </>
  );
} 