"use client";

import React from 'react';
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuotationData } from "@/types/quotation";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData;
}

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b">
    <span className="font-medium">{label}:</span>
    <span>{value || "N/A"}</span>
  </div>
);

interface PriceOptionProps {
  option: {
    title: string;
    price: number;
    description?: string;
    deliveryTime?: string;
  };
  selected: boolean;
}

const PriceOption: React.FC<PriceOptionProps> = ({ option, selected }) => (
  <div className={`p-4 border rounded-lg ${selected ? "border-blue-500 bg-blue-50" : ""}`}>
    <h4 className="font-semibold">{option.title}</h4>
    <p className="text-lg font-bold">{formatPrice(option.price)}</p>
    {option.description && <p className="text-sm text-gray-600">{option.description}</p>}
    {option.deliveryTime && (
      <p className="text-sm text-gray-600">Delivery: {option.deliveryTime}</p>
    )}
    {selected && (
      <div className="mt-2">
        <span className="text-blue-600 text-sm font-medium">Selected Option</span>
      </div>
    )}
  </div>
);

export default function QuotationViewModal({ isOpen, onClose, quotation }: QuotationViewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Quotation Details</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <InfoRow label="Created" value={quotation.created_at ? format(new Date(quotation.created_at), 'PPpp') : 'N/A'} />
            <InfoRow label="Last Updated" value={quotation.updated_at ? format(new Date(quotation.updated_at), 'PPpp') : 'N/A'} />
            <InfoRow label="Status" value={quotation.status} />
            <InfoRow label="Service Type" value={quotation.service_type} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Product Details</h3>
            <InfoRow label="Product Name" value={quotation.product?.name} />
            <InfoRow label="Quantity" value={quotation.quantity} />
            <InfoRow label="Shipping Country" value={quotation.destination} />
            <InfoRow label="Shipping City" value={quotation.destination} />
            <InfoRow label="Shipping Method" value={quotation.shippingMethod} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Price Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: quotation.title_option1 || "Option 1",
                  price: parseFloat(quotation.total_price_option1 || "0"),
                  description: quotation.description_option1,
                  deliveryTime: quotation.delivery_time_option1,
                },
                {
                  title: quotation.title_option2 || "Option 2",
                  price: parseFloat(quotation.total_price_option2 || "0"),
                  description: quotation.description_option2,
                  deliveryTime: quotation.delivery_time_option2,
                },
                {
                  title: quotation.title_option3 || "Option 3",
                  price: parseFloat(quotation.total_price_option3 || "0"),
                  description: quotation.description_option3,
                  deliveryTime: quotation.delivery_time_option3,
                },
              ].map((option, index) => (
                <PriceOption
                  key={index}
                  option={option}
                  selected={quotation.selected_option === index + 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
} 