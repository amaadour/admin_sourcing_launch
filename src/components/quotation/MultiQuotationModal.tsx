import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import { QuotationData } from "@/types/quotation";
import Image from "next/image";
import { useRouter } from 'next/navigation';

interface MultiQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedQuotations: QuotationData[];
}

// Helper to validate Supabase image URLs
const isValidImageUrl = (url: string | null | undefined) =>
  !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

const MultiQuotationModal: React.FC<MultiQuotationModalProps> = ({
  isOpen,
  onClose,
  approvedQuotations,
}) => {
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  const [total, setTotal] = useState<number>(0);
  const router = useRouter();

  const calculateTotal = useCallback(() => {
    let sum = 0;
    
    approvedQuotations.forEach(quotation => {
      if (selectedQuotations.includes(quotation.quotation_id)) {
        // Extract numeric price value and add to total
        const price = quotation.price ? 
          parseFloat(quotation.price.replace(/[$,]/g, '')) : 0;
        
        if (!isNaN(price)) {
          sum += price;
        }
      }
    });
    
    setTotal(sum);
  }, [approvedQuotations, selectedQuotations]);

  useEffect(() => {
    // Calculate total when selections change
    calculateTotal();
  }, [selectedQuotations, calculateTotal]);

  const handleToggleQuotation = (quotationId: string) => {
    setSelectedQuotations(prev => {
      if (prev.includes(quotationId)) {
        return prev.filter(id => id !== quotationId);
      } else {
        return [...prev, quotationId];
      }
    });
  };

  const handleProceed = () => {
    if (selectedQuotations.length === 0) return;
    
    // Navigate to checkout with selected quotations
    router.push(`/checkoutpage?quotations=${selectedQuotations.join(',')}`);
    onClose();
  };

  const selectAll = () => {
    setSelectedQuotations(approvedQuotations.map(q => q.quotation_id));
  };

  const deselectAll = () => {
    setSelectedQuotations([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0D47A1]">
            Select Quotations to Pay
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm text-gray-500">
              {selectedQuotations.length} of {approvedQuotations.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          {approvedQuotations.map((quotation) => (
            <div 
              key={quotation.quotation_id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedQuotations.includes(quotation.quotation_id) 
                  ? 'border-[#1E88E5] bg-[#E3F2FD]' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`quotation-${quotation.quotation_id}`}
                    checked={selectedQuotations.includes(quotation.quotation_id)}
                    onChange={() => handleToggleQuotation(quotation.quotation_id)}
                    className="h-5 w-5 text-[#1E88E5] rounded focus:ring-[#1E88E5]"
                  />
                  
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    {isValidImageUrl(quotation.product.image) ? (
                      <Image
                        src={quotation.product.image!}
                        alt={quotation.product.name}
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
                  
                  <div>
                    <h3 className="font-medium text-gray-800">{quotation.product.name}</h3>
                    <p className="text-sm text-gray-500">ID: {quotation.quotation_id}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{quotation.price}</div>
                  <div className="text-sm text-gray-500">{quotation.quantity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total Amount:</span>
            <span className="font-bold text-lg text-[#0D47A1]">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleProceed}
            disabled={selectedQuotations.length === 0}
          >
            Proceed to Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiQuotationModal; 