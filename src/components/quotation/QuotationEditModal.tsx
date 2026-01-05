"use client";

import React, { useState } from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuotationData } from "@/types/quotation";
import { supabase } from "@/lib/supabase";
import { customToast } from "@/components/ui/toast";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        created_at: new Date().toISOString(),
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Quotation</h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quotation ID
                      </label>
                      <input
                        type="text"
                        name="quotation_id"
                        value={formData.quotation_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                        readOnly={!!quotation.quotation_id}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        name="product_name"
                        value={formData.product_name}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Service Type
                      </label>
                      <div className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Service Type: {formData.service_type ? formData.service_type : "N/A"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product URL
                      </label>
                      <input
                        type="text"
                        name="product_url"
                        value={formData.product_url}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Method
                      </label>
                      <select
                        name="shipping_method"
                        value={formData.shipping_method}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                      >
                        <option value="Sea">Sea</option>
                        <option value="Air">Air</option>
                        <option value="Train">Train</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Country
                      </label>
                      <input
                        type="text"
                        name="shipping_country"
                        value={formData.shipping_country}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping City
                      </label>
                      <input
                        type="text"
                        name="shipping_city"
                        value={formData.shipping_city}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Receiver Information Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receiver Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Receiver Name
                      </label>
                      <input
                        type="text"
                        name="receiver_name"
                        value={formData.receiver_name}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        placeholder="Enter receiver name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Receiver Phone
                      </label>
                      <input
                        type="text"
                        name="receiver_phone"
                        value={formData.receiver_phone}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        placeholder="Enter receiver phone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Receiver Address
                      </label>
                      <input
                        type="text"
                        name="receiver_address"
                        value={formData.receiver_address}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                        placeholder="Enter receiver address"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quotation Image
                    </label>
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center cursor-pointer relative overflow-hidden z-10" onClick={() => setIsImageZoomed(true)}>
                        {isValidImageUrl(formData.quotation_image) ? (
                          <>
                            <Image 
                              src={formData.quotation_image} 
                              alt="Quotation product" 
                              width={400}
                              height={300}
                              className="max-h-60 object-contain relative z-10"
                            />
                            <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full z-20">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
                                <path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="h-40 w-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                            No image available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quotation Fees
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="Quotation_fees"
                      value={formData.Quotation_fees}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPriceOptionsModalOpen(true)}
                    className="w-full mb-4 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Manage Price Options
                  </Button>

                  <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-6 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
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