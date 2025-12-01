"use client";

import React, { useState } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuotationData } from "@/types/quotation";
import { supabase } from "@/lib/supabase";
import { customToast } from "@/components/ui/toast";
import PriceOptionsModal from "./PriceOptionsModal";
import Image from 'next/image';
import { Package, MapPin, User, DollarSign, FileText, ExternalLink, ZoomIn } from 'lucide-react';

interface QuotationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData;
  onUpdate: () => void;
}

export default function QuotationEditModal({ isOpen, onClose, quotation, onUpdate }: QuotationEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceOptionsModalOpen, setIsPriceOptionsModalOpen] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  
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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        receiver_name: formData.receiver_name,
        receiver_phone: formData.receiver_phone,
        receiver_address: formData.receiver_address,
        updated_at: new Date().toISOString()
      };

      // Perform the update using the UUID
      const { error } = await supabase
        .from('quotations')
        .update(updateData as never)
        .eq('id', quotationUuid)
        .select('*');

      if (error) {
        throw new Error(`Failed to update quotation: ${error.message}`);
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Quotation</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID: {formData.quotation_id}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="quotation-edit-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* Section 1: Product & Status */}
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Product & Status Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Name</label>
                        <input
                          type="text"
                          name="product_name"
                          value={formData.product_name}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          required
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</label>
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          required
                          min="1"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          required
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service Type</label>
                        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 flex items-center">
                          <span className="flex-1">{formData.service_type || "N/A"}</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          Product URL
                          <ExternalLink className="w-3 h-3" />
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            name="product_url"
                            value={formData.product_url}
                            onChange={handleChange}
                            placeholder="https://..."
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          />
                          {formData.product_url && (
                            <a 
                              href={formData.product_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image Column */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Image</label>
                      <div 
                        className="relative w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 group cursor-pointer"
                        onClick={() => setIsImageZoomed(true)}
                      >
                        {isValidImageUrl(formData.quotation_image) ? (
                          <>
                            <Image 
                              src={formData.quotation_image} 
                              alt="Product" 
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                            <Package className="w-12 h-12 mb-2 opacity-50" />
                            <span className="text-sm">No image</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Shipping & Receiver */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Shipping Info */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-full">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">Shipping Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shipping Method</label>
                        <select
                          name="shipping_method"
                          value={formData.shipping_method}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          required
                        >
                          <option value="Sea">Sea Freight</option>
                          <option value="Air">Air Freight</option>
                          <option value="Train">Train Freight</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Country</label>
                          <input
                            type="text"
                            name="shipping_country"
                            value={formData.shipping_country}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</label>
                          <input
                            type="text"
                            name="shipping_city"
                            value={formData.shipping_city}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Info */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-full">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">Receiver Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</label>
                          <input
                            type="text"
                            name="receiver_name"
                            value={formData.receiver_name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone Number</label>
                          <input
                            type="text"
                            name="receiver_phone"
                            value={formData.receiver_phone}
                            onChange={handleChange}
                            placeholder="+1 234 567 890"
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery Address</label>
                        <textarea
                          name="receiver_address"
                          value={formData.receiver_address}
                          onChange={handleChange}
                          placeholder="Full delivery address..."
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Financials */}
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Financials</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quotation Fees</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          name="Quotation_fees"
                          value={formData.Quotation_fees}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 font-medium"
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPriceOptionsModalOpen(true)}
                        className="w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 h-[42px]"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Manage Price Options
                      </Button>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 text-gray-900 dark:text-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                form="quotation-edit-form"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 px-8 shadow-lg shadow-blue-500/20"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Image Zoom Modal */}
      {isImageZoomed && formData.quotation_image && (
        <Modal isOpen={isImageZoomed} onClose={() => setIsImageZoomed(false)}>
          <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative animate-in fade-in zoom-in duration-200">
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
              <div className="p-6 flex items-center justify-center bg-gray-100 dark:bg-gray-800 min-h-[400px]">
                {isValidImageUrl(formData.quotation_image) ? (
                  <Image 
                    src={formData.quotation_image} 
                    alt="Zoomed product"
                    width={800}
                    height={600}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" 
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-80 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-lg">
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
          image_option1: quotation.image_option1 || quotation.product.image,
          image_option1_2: quotation.image_option1_2,
          extra_images_option1: quotation.extra_images_option1,
          unit_price_option1: quotation.unit_price_option1,
          unit_weight_option1: quotation.unit_weight_option1,
          delivery_time_option1: quotation.delivery_time_option1 || "",
          description_option1: quotation.description_option1 || "",
          
          title_option2: quotation.title_option2 || "",
          image_option2: quotation.image_option2 || "",
          image_option2_2: quotation.image_option2_2,
          extra_images_option2: quotation.extra_images_option2,
          unit_price_option2: quotation.unit_price_option2,
          unit_weight_option2: quotation.unit_weight_option2,
          delivery_time_option2: quotation.delivery_time_option2 || "",
          description_option2: quotation.description_option2 || "",
          
          title_option3: quotation.title_option3 || "",
          image_option3: quotation.image_option3 || "",
          image_option3_2: quotation.image_option3_2,
          extra_images_option3: quotation.extra_images_option3,
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
