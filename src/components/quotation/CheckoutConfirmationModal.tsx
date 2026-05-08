import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import { CheckCircleIcon } from "@/icons";
import Image from "next/image";
import { QuotationData, PriceOption } from '@/types/quotation';
import BankInformation from './BankInformation';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from '@/context/AuthContext';

type BankType = 'WISE' | 'SOCIETE_GENERALE' | 'CIH';

// No need to extend the base QuotationData anymore
// QuotationData is now imported from src/types/quotation

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quotation: QuotationData;
}

const CheckoutConfirmationModal: React.FC<CheckoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quotation
}) => {
  const { user } = useAuth(); // Get current authenticated user
  const [selectedBank, setSelectedBank] = useState<BankType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPriceOption, setSelectedPriceOption] = useState<PriceOption | null>(null);
  const [isUpdatingOption, setIsUpdatingOption] = useState(false);
  const [quotationUuid, setQuotationUuid] = useState<string | null>(null);
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>(quotation.priceOptions || []);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
  // Log the quotation object for debugging
  useEffect(() => {
    console.log("Quotation object:", quotation);
    
    // Fetch the actual UUID on component load and get complete price options
    const fetchQuotationData = async () => {
      try {
        if (!quotation.quotation_id) return;
        
        setIsLoadingOptions(true);
        
        // Get the quotation UUID and all option data
        const { data, error } = await supabase
          .from('quotations')
          .select('id, title_option1, title_option2, title_option3, total_price_option1, total_price_option2, total_price_option3, delivery_time_option1, delivery_time_option2, delivery_time_option3, description_option1, description_option2, description_option3, image_option1, image_option2, image_option3, selected_option')
          .eq('quotation_id', quotation.quotation_id)
          .single();
          
        if (error) {
          console.error("Error fetching quotation data:", error);
          setIsLoadingOptions(false);
          return;
        }
        
        if (data) {
          const row = data as unknown as {
            id: string;
            title_option1?: string;
            title_option2?: string;
            title_option3?: string;
            total_price_option1?: string | number;
            total_price_option2?: string | number;
            total_price_option3?: string | number;
            delivery_time_option1?: string;
            delivery_time_option2?: string;
            delivery_time_option3?: string;
            description_option1?: string;
            description_option2?: string;
            description_option3?: string;
            image_option1?: string;
            image_option2?: string;
            image_option3?: string;
            selected_option?: number;
          };
          console.log("Full quotation data from database:", row);
          setQuotationUuid(row.id);
          
          // Recreate price options array from the database data
          const fullPriceOptions: PriceOption[] = [];
          
          // Add option 1 if it exists
          if (row.title_option1) {
            fullPriceOptions.push({
              id: '1',
              price: row.total_price_option1 ? `$${parseFloat(String(row.total_price_option1)).toLocaleString()}` : 'N/A',
              supplier: row.title_option1,
              deliveryTime: row.delivery_time_option1 || 'N/A',
              description: row.description_option1,
              modelName: row.title_option1,
              modelImage: row.image_option1 || "/images/product/product-01.jpg"
            });
          }
          
          // Add option 2 if it exists
          if (row.title_option2) {
            fullPriceOptions.push({
              id: '2',
              price: row.total_price_option2 ? `$${parseFloat(String(row.total_price_option2)).toLocaleString()}` : 'N/A',
              supplier: row.title_option2,
              deliveryTime: row.delivery_time_option2 || 'N/A',
              description: row.description_option2,
              modelName: row.title_option2,
              modelImage: row.image_option2 || "/images/product/product-01.jpg"
            });
          }
          
          // Add option 3 if it exists
          if (row.title_option3) {
            fullPriceOptions.push({
              id: '3',
              price: row.total_price_option3 ? `$${parseFloat(String(row.total_price_option3)).toLocaleString()}` : 'N/A',
              supplier: row.title_option3,
              deliveryTime: row.delivery_time_option3 || 'N/A',
              description: row.description_option3,
              modelName: row.title_option3,
              modelImage: row.image_option3 || "/images/product/product-01.jpg"
            });
          }
          
          // Set the price options if we found more than what was passed in
          if (fullPriceOptions.length > (quotation.priceOptions?.length || 0)) {
            console.log("Setting full price options:", fullPriceOptions);
            setPriceOptions(fullPriceOptions);
            
            // Set selected option based on the database value
            if (row.selected_option && row.selected_option > 0 && row.selected_option <= fullPriceOptions.length) {
              setSelectedPriceOption(fullPriceOptions[row.selected_option - 1]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch quotation data:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    };
    
    fetchQuotationData();
  }, [quotation]);
  
  // Set initial selected price option based on quotation.selected_option
  useEffect(() => {
    if (quotation.priceOptions?.length && quotation.selected_option) {
      // selected_option is 1-based, array is 0-based
      const optionIndex = quotation.selected_option - 1;
      if (optionIndex >= 0 && optionIndex < quotation.priceOptions.length) {
        setSelectedPriceOption(quotation.priceOptions[optionIndex]);
      }
    }
  }, [quotation.priceOptions, quotation.selected_option]);

  // Helper to validate Supabase image URLs
  const isValidImageUrl = (url: string | null | undefined) =>
    !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

  if (!priceOptions.length) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        showCloseButton={true} 
        className="max-w-md mx-auto"
      >
        <div className="p-6 text-center">
          {isLoadingOptions ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-700">Loading price options...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="mt-4 text-lg font-medium text-gray-700">No price options available</p>
              <p className="mt-2 text-gray-500">This quotation doesn&apos;t have any price options defined.</p>
              <button
                onClick={onClose}
                className="mt-6 px-5 py-2 bg-[#1E88E5] text-white rounded-lg hover:bg-[#1976D2] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  const handlePriceOptionSelect = async (option: PriceOption, optionIndex: number) => {
    if (isUpdatingOption || !quotationUuid) return;
    
    setIsUpdatingOption(true);
    try {
      console.log(`Updating selected_option to ${optionIndex + 1} for quotation ${quotationUuid}`);
      
      // Update the selected option in the database using the option index + 1 (1-based indexing)
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ 
          selected_option: optionIndex + 1, // Convert to 1-based index
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', quotationUuid); // Use the UUID, not the formatted ID

      if (updateError) {
        throw new Error(`Failed to update selected option: ${updateError.message}`);
      }

      setSelectedPriceOption(option);
      toast.success('Price option selected successfully');
    } catch (error) {
      console.error('Error updating selected option:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update selected option');
    } finally {
      setIsUpdatingOption(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedBank || !selectedPriceOption || isProcessing) {
      toast.error('Please select a bank and price option before proceeding.');
      return;
    }

    if (!quotation.quotation_id) {
      toast.error('Missing quotation ID.');
      return;
    }
    
    if (!quotationUuid) {
      toast.error('Could not find valid quotation reference.');
      return;
    }
    
    // Get current user's ID - either from quotation or current auth context
    const userId = quotation.user_id || user?.id;
    if (!userId) {
      toast.error('User information not available.');
      return;
    }

    setIsProcessing(true);
    try {
      // Check if there's already a payment for this quotation
      const { data: existingPayments, error: checkError } = await supabase
        .from('payments')
        .select('id, status, quotation_ids, created_at, reference_number')
        .contains('quotation_ids', [quotationUuid]);

      if (checkError) {
        throw new Error(`Failed to check existing payments: ${checkError.message}`);
      }

      const paymentsList = (existingPayments ?? []) as Array<{
        id: string
        status: string
        quotation_ids: string[] | string | null
        created_at: string
        reference_number: string | null
      }>

      const activePayment = paymentsList.find((payment) =>
        payment.status !== 'FAILED' && payment.status !== 'REJECTED'
      )

      if (activePayment) {
        // Instead of blocking, ask for confirmation
        const formattedDate = new Date(activePayment.created_at).toLocaleDateString();
        const isConfirmed = window.confirm(
          `A payment (Ref: ${activePayment.reference_number}) already exists for this quotation from ${formattedDate}. Do you want to create another payment?`
        );
        
        if (!isConfirmed) {
          setIsProcessing(false);
          // Redirect to payment page
          window.location.href = '/payment';
          return;
        }
        
        // User confirmed, continue with creating a new payment
        console.log("User confirmed to create another payment despite existing one.");
      }

      // Extract price value
      // Remove currency symbol and commas before parsing
      const cleanPrice = selectedPriceOption.price.replace(/[$,]/g, '');
      const amount = parseFloat(cleanPrice);

      if (isNaN(amount)) {
        throw new Error('Invalid price format');
      }

      console.log(`Original price: ${selectedPriceOption.price}, Parsed amount: ${amount}`);

      // Generate a reference number
      const referenceNumber = `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Debugging info
      console.log("Payment creation data:", {
        quotation_ids: [quotationUuid],
        total_amount: amount,
        method: selectedBank,
        status: 'PENDING',
        reference_number: referenceNumber,
        user_id: userId
      });

      // Save payment data to Supabase
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            quotation_ids: [quotationUuid], // Use the UUID here
            total_amount: amount,
            method: selectedBank,
            status: 'PENDING',
            reference_number: referenceNumber,
            user_id: userId
          } as never
        ] as never)
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      if (!payment) {
        throw new Error('Payment creation failed without error');
      }

      // Normalize payment row for safe typing
      const paymentRow = payment as unknown as { id: string; reference_number: string | null }

      // Update quotation status to PAYMENT_PENDING
      const { error: quotationError } = await supabase
        .from('quotations')
        .update({ 
          status: 'Approved',
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', quotationUuid); // Use the UUID here

      if (quotationError) {
        // If quotation update fails, mark payment as failed
        await supabase
          .from('payments')
          .update({ 
            status: 'FAILED'
          } as never)
          .eq('id', paymentRow.id);
          
        throw new Error(`Failed to update quotation: ${quotationError.message}`);
      }

      // Payment successful
      toast.success('Payment initiated successfully');
      
      // Set a short delay before redirecting to let the user see the success message
      setTimeout(() => {
        // Redirect to payment page
        window.location.href = `/payment?ref=${paymentRow.reference_number ?? ''}`;
      }, 1500);
      
      onConfirm();
      onClose();
    } catch (error) {
      console.error('Payment processing error:', error instanceof Error ? error.message : 'Unknown error');
      toast.error(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const banks: BankType[] = ['WISE', 'SOCIETE_GENERALE', 'CIH'];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      showCloseButton={false} 
      className="max-w-2xl mx-auto"
    >
      <div className="flex flex-col">
        {/* Debug Info - Comment out in production */}
        <div className="p-2 bg-gray-100 border-b text-xs">
          <p>Quotation ID: {quotation.quotation_id}</p>
          <p>UUID: {quotationUuid || 'Loading...'}</p>
          <p>Price Options: {priceOptions.length}</p>
          <p>Selected Option: {quotation.selected_option || 'None'}</p>
        </div>

        {/* Price Options Selection */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Price Option</h3>
          {isLoadingOptions ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1E88E5] border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-gray-600">Loading all price options...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {priceOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handlePriceOptionSelect(option, index)}
                  disabled={isUpdatingOption || !quotationUuid}
                  className={`w-full flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    selectedPriceOption?.id === option.id
                      ? 'border-[#1E88E5] bg-blue-50'
                      : 'border-gray-200 hover:border-[#1E88E5]'
                  } ${(isUpdatingOption || !quotationUuid) ? 'opacity-50 cursor-not-allowed' : ''} relative`}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    {isValidImageUrl(option.modelImage) ? (
                      <Image
                        src={option.modelImage!}
                        alt={option.modelName || "Product Option"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-40 bg-gray-200 text-gray-500 rounded">
                        <span style={{fontSize: '2rem'}}>📷</span>
                        <span>No Photo Uploaded</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {option.supplier}
                          {option.id === String(quotation.selected_option) && (
                            <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Currently Selected
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Delivery Time: {option.deliveryTime}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-[#1E88E5]">
                        {option.price}
                      </span>
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-500 mt-2">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {isUpdatingOption && selectedPriceOption?.id === option.id && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="p-4">
          <h4 className="text-base font-medium text-gray-900 mb-3">Select Payment Method</h4>
          <div className="grid grid-cols-3 gap-3">
            {banks.map((bank) => (
              <button
                key={bank}
                onClick={() => setSelectedBank(bank)}
                className={`py-2 px-4 text-center border rounded-lg transition-colors
                  ${selectedBank === bank 
                    ? 'border-[#1E88E5] bg-blue-50 text-[#1E88E5]' 
                    : 'border-gray-200 hover:border-[#1E88E5]'
                  }`}
              >
                {bank.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bank Information */}
        {selectedBank && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Bank Information</h4>
              <BankInformation bank={selectedBank} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            {selectedPriceOption && (
              <div className="text-sm">
                <span className="text-gray-600">Selected Option: </span>
                <span className="font-medium">{selectedPriceOption.supplier}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="font-bold text-[#1E88E5]">{selectedPriceOption.price}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing || !selectedBank || !selectedPriceOption || !quotationUuid}
                className="px-5 py-2 bg-[#1E88E5] text-white rounded-lg hover:bg-[#1976D2] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CheckoutConfirmationModal; 