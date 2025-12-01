"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, X, Upload, Package, DollarSign, Clock, FileText, Image as ImageIcon, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { customToast } from "@/components/ui/toast"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface PriceOptionsData {
  title_option1?: string;
  image_option1: string | null;
  image_option1_2?: string | null;
  unit_price_option1?: number;
  unit_weight_option1?: number;
  delivery_time_option1?: string;
  description_option1?: string;
  title_option2?: string;
  image_option2: string | null;
  image_option2_2?: string | null;
  unit_price_option2?: number;
  unit_weight_option2?: number;
  delivery_time_option2?: string;
  description_option2?: string;
  title_option3?: string;
  image_option3: string | null;
  image_option3_2?: string | null;
  unit_price_option3?: number;
  unit_weight_option3?: number;
  delivery_time_option3?: string;
  description_option3?: string;
}

interface PriceOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  quotationId: string | number
  initialData?: PriceOptionsData
  onUpdate?: () => void
}

// Helper to validate Supabase image URLs
const isValidImageUrl = (url: string | null | undefined) =>
  !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

export default function PriceOptionsModal({
  isOpen,
  onClose,
  quotationId,
  initialData,
  onUpdate
}: PriceOptionsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showOption2, setShowOption2] = useState(!!initialData?.title_option2)
  const [showOption3, setShowOption3] = useState(!!initialData?.title_option3)
  const [imagePreview1, setImagePreview1] = useState<string | null>(initialData?.image_option1 ?? null)
  const [imagePreview1_2, setImagePreview1_2] = useState<string | null>(initialData?.image_option1_2 ?? null)
  const [imagePreview2, setImagePreview2] = useState<string | null>(initialData?.image_option2 ?? null)
  const [imagePreview2_2, setImagePreview2_2] = useState<string | null>(initialData?.image_option2_2 ?? null)
  const [imagePreview3, setImagePreview3] = useState<string | null>(initialData?.image_option3 ?? null)
  const [imagePreview3_2, setImagePreview3_2] = useState<string | null>(initialData?.image_option3_2 ?? null)

  const [formData, setFormData] = useState<PriceOptionsData>({
    title_option1: initialData?.title_option1 || "",
    image_option1: initialData?.image_option1 || null,
    image_option1_2: initialData?.image_option1_2 || null,
    unit_price_option1: initialData?.unit_price_option1,
    unit_weight_option1: initialData?.unit_weight_option1,
    delivery_time_option1: initialData?.delivery_time_option1 || "",
    description_option1: initialData?.description_option1 || "",
    title_option2: initialData?.title_option2,
    image_option2: initialData?.image_option2 || null,
    image_option2_2: initialData?.image_option2_2 || null,
    unit_price_option2: initialData?.unit_price_option2,
    unit_weight_option2: initialData?.unit_weight_option2,
    delivery_time_option2: initialData?.delivery_time_option2 || "",
    description_option2: initialData?.description_option2,
    title_option3: initialData?.title_option3,
    image_option3: initialData?.image_option3 || null,
    image_option3_2: initialData?.image_option3_2 || null,
    unit_price_option3: initialData?.unit_price_option3,
    unit_weight_option3: initialData?.unit_weight_option3,
    delivery_time_option3: initialData?.delivery_time_option3 || "",
    description_option3: initialData?.description_option3,
  })

  // Create a local storage key unique to this quotation
  const localStorageKey = `priceOptions_quotation_${quotationId}`;

  // Load data from localStorage when component mounts
  useEffect(() => {
    if (isOpen) {
      try {
        const savedData = localStorage.getItem(localStorageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);

          // Merge data: If savedData is missing fields that initialData has, use initialData
          // This fixes the issue where stale empty localStorage overrides fresh DB data
          if (initialData) {
            // Option 1
            if (!parsedData.title_option1 && initialData.title_option1) parsedData.title_option1 = initialData.title_option1;
            if ((parsedData.unit_price_option1 === undefined || parsedData.unit_price_option1 === null) && initialData.unit_price_option1 != null) parsedData.unit_price_option1 = initialData.unit_price_option1;
            if ((parsedData.unit_weight_option1 === undefined || parsedData.unit_weight_option1 === null) && initialData.unit_weight_option1 != null) parsedData.unit_weight_option1 = initialData.unit_weight_option1;
            if (!parsedData.delivery_time_option1 && initialData.delivery_time_option1) parsedData.delivery_time_option1 = initialData.delivery_time_option1;
            if (!parsedData.description_option1 && initialData.description_option1) parsedData.description_option1 = initialData.description_option1;
            if (!parsedData.image_option1 && initialData.image_option1) parsedData.image_option1 = initialData.image_option1;
            if (!parsedData.image_option1_2 && initialData.image_option1_2) parsedData.image_option1_2 = initialData.image_option1_2;

            // Option 2
            if (!parsedData.title_option2 && initialData.title_option2) parsedData.title_option2 = initialData.title_option2;
            if ((parsedData.unit_price_option2 === undefined || parsedData.unit_price_option2 === null) && initialData.unit_price_option2 != null) parsedData.unit_price_option2 = initialData.unit_price_option2;
            if ((parsedData.unit_weight_option2 === undefined || parsedData.unit_weight_option2 === null) && initialData.unit_weight_option2 != null) parsedData.unit_weight_option2 = initialData.unit_weight_option2;
            if (!parsedData.delivery_time_option2 && initialData.delivery_time_option2) parsedData.delivery_time_option2 = initialData.delivery_time_option2;
            if (!parsedData.description_option2 && initialData.description_option2) parsedData.description_option2 = initialData.description_option2;
            if (!parsedData.image_option2 && initialData.image_option2) parsedData.image_option2 = initialData.image_option2;
            if (!parsedData.image_option2_2 && initialData.image_option2_2) parsedData.image_option2_2 = initialData.image_option2_2;

            // Option 3
            if (!parsedData.title_option3 && initialData.title_option3) parsedData.title_option3 = initialData.title_option3;
            if ((parsedData.unit_price_option3 === undefined || parsedData.unit_price_option3 === null) && initialData.unit_price_option3 != null) parsedData.unit_price_option3 = initialData.unit_price_option3;
            if ((parsedData.unit_weight_option3 === undefined || parsedData.unit_weight_option3 === null) && initialData.unit_weight_option3 != null) parsedData.unit_weight_option3 = initialData.unit_weight_option3;
            if (!parsedData.delivery_time_option3 && initialData.delivery_time_option3) parsedData.delivery_time_option3 = initialData.delivery_time_option3;
            if (!parsedData.description_option3 && initialData.description_option3) parsedData.description_option3 = initialData.description_option3;
            if (!parsedData.image_option3 && initialData.image_option3) parsedData.image_option3 = initialData.image_option3;
            if (!parsedData.image_option3_2 && initialData.image_option3_2) parsedData.image_option3_2 = initialData.image_option3_2;
          }

          setFormData(parsedData);
          
          // Set preview images and visibility options based on saved data
          if (parsedData.image_option1) setImagePreview1(parsedData.image_option1);
          if (parsedData.image_option1_2) setImagePreview1_2(parsedData.image_option1_2);
          if (parsedData.image_option2) setImagePreview2(parsedData.image_option2);
          if (parsedData.image_option2_2) setImagePreview2_2(parsedData.image_option2_2);
          if (parsedData.image_option3) setImagePreview3(parsedData.image_option3);
          if (parsedData.image_option3_2) setImagePreview3_2(parsedData.image_option3_2);
          
          setShowOption2(!!parsedData.title_option2 || !!parsedData.image_option2 || 
            !!parsedData.unit_price_option2 || !!parsedData.delivery_time_option2 || 
            !!parsedData.description_option2);
          
          setShowOption3(!!parsedData.title_option3 || !!parsedData.image_option3 || 
            !!parsedData.unit_price_option3 || !!parsedData.delivery_time_option3 || 
            !!parsedData.description_option3);
        } else if (initialData) {
          setFormData(initialData);
          
          if (initialData.image_option1) setImagePreview1(initialData.image_option1);
          if (initialData.image_option1_2) setImagePreview1_2(initialData.image_option1_2);
          if (initialData.image_option2) setImagePreview2(initialData.image_option2);
          if (initialData.image_option2_2) setImagePreview2_2(initialData.image_option2_2);
          if (initialData.image_option3) setImagePreview3(initialData.image_option3);
          if (initialData.image_option3_2) setImagePreview3_2(initialData.image_option3_2);
          
          const hasOption2Data = initialData.title_option2 || initialData.image_option2 || 
            initialData.unit_price_option2 || initialData.delivery_time_option2 || 
            initialData.description_option2;
          
          const hasOption3Data = initialData.title_option3 || initialData.image_option3 || 
            initialData.unit_price_option3 || initialData.delivery_time_option3 || 
            initialData.description_option3;
          
          setShowOption2(!!hasOption2Data);
          setShowOption3(!!hasOption3Data);
          
          if (hasOption3Data) {
            setShowOption2(true);
          }
        }
      } catch (error) {
        console.error("Error loading saved form data:", error);
      }
    }
  }, [isOpen, initialData, localStorageKey]);

  // Save to localStorage whenever form data changes
  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(formData));
      } catch (error) {
        console.error("Error saving form data to localStorage:", error);
      }
    }
  }, [formData, localStorageKey, isOpen]);

  // Clear localStorage when closing or successfully submitting
  const clearStoredData = () => {
    try {
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error("Error clearing stored form data:", error);
    }
  };

  // Update the original onClose to clear localStorage
  const handleClose = () => {
    clearStoredData();
    onClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof PriceOptionsData,
  ) => {
    const value = e.target.value

    if (field.includes("unit_price") || field.includes("unit_weight")) {
      setFormData({
        ...formData,
        [field]: value ? Number.parseFloat(value) : null,
      })
      return;
    }
    if (field.includes("total_price")) {
      setFormData({
        ...formData,
        [field]: value ? Number.parseFloat(value) : null,
      })
    } else {
      setFormData({
        ...formData,
        [field]: value || null,
      })
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionNumber: number, isExtra = false) => {
    const file = e.target.files?.[0];
    if (!file) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload"
      });
      return;
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "File size must be less than 2MB"
      });
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "File must be an image (JPG, PNG, GIF, or SVG)"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a unique filename with option number and timestamp
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const uniqueId = `${timestamp}-${Math.random().toString(36).substring(2, 15)}`;
      const fileName = `option${optionNumber}${isExtra ? '_2' : ''}-${uniqueId}.${fileExt}`;

      // Create unique path for each option
      const filePath = `price_options/${quotationId}/option${optionNumber}/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from("price_option_images")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Set to false to prevent overwriting
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get the public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from("price_option_images")
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${timestamp}`;

      // Update form data with the new image URL
      const field = `image_option${optionNumber}${isExtra ? '_2' : ''}` as keyof PriceOptionsData;
      setFormData(prev => ({
        ...prev,
        [field]: urlWithCacheBust
      }));

      // Update image preview with the new URL
      if (optionNumber === 1 && !isExtra) setImagePreview1(urlWithCacheBust);
      if (optionNumber === 1 && isExtra) setImagePreview1_2(urlWithCacheBust);
      if (optionNumber === 2 && !isExtra) setImagePreview2(urlWithCacheBust);
      if (optionNumber === 2 && isExtra) setImagePreview2_2(urlWithCacheBust);
      if (optionNumber === 3 && !isExtra) setImagePreview3(urlWithCacheBust);
      if (optionNumber === 3 && isExtra) setImagePreview3_2(urlWithCacheBust);

      customToast({
        variant: "default",
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Image upload error:', error);
      customToast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? `Failed to upload image: ${error.message}` 
          : "Failed to upload image. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.title_option1) {
        throw new Error("Title is required for Option 1");
      }

      const updateData: PriceOptionsData = {
        title_option1: formData.title_option1,
        image_option1: formData.image_option1,
        image_option1_2: formData.image_option1_2,
        unit_price_option1: formData.unit_price_option1,
        unit_weight_option1: formData.unit_weight_option1,
        delivery_time_option1: formData.delivery_time_option1,
        description_option1: formData.description_option1,
        title_option2: formData.title_option2,
        image_option2: formData.image_option2,
        image_option2_2: formData.image_option2_2,
        unit_price_option2: formData.unit_price_option2,
        unit_weight_option2: formData.unit_weight_option2,
        delivery_time_option2: formData.delivery_time_option2,
        description_option2: formData.description_option2,
        title_option3: formData.title_option3,
        image_option3: formData.image_option3,
        image_option3_2: formData.image_option3_2,
        unit_price_option3: formData.unit_price_option3,
        unit_weight_option3: formData.unit_weight_option3,
        delivery_time_option3: formData.delivery_time_option3,
        description_option3: formData.description_option3,
      };

      const { error } = await supabase
        .from("quotations")
        .update(updateData as never)
        .eq("id", quotationId);

      if (error) throw error;

      // Clear localStorage on successful submission
      clearStoredData();

      customToast({
        variant: "default",
        title: "Success",
        description: "Price options updated successfully"
      });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating price options:', error);
      customToast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update price options"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (optionNumber: number, isExtra: boolean) => {
    const field = `image_option${optionNumber}${isExtra ? '_2' : ''}` as keyof PriceOptionsData;
    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
    
    if (optionNumber === 1 && !isExtra) setImagePreview1(null);
    if (optionNumber === 1 && isExtra) setImagePreview1_2(null);
    if (optionNumber === 2 && !isExtra) setImagePreview2(null);
    if (optionNumber === 2 && isExtra) setImagePreview2_2(null);
    if (optionNumber === 3 && !isExtra) setImagePreview3(null);
    if (optionNumber === 3 && isExtra) setImagePreview3_2(null);
  };

  const renderOption1Content = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title - Full Width on mobile, 4 columns on desktop */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="title_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title_option1"
            placeholder="e.g. Standard"
            value={formData.title_option1 || ""}
            onChange={(e) => handleInputChange(e, "title_option1")}
            required
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Delivery Time - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="delivery_time_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Delivery Time
          </Label>
          <Input
            id="delivery_time_option1"
            placeholder="e.g. 7-10 days"
            value={formData.delivery_time_option1 || ""}
            onChange={(e) => handleInputChange(e, "delivery_time_option1")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Price - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_price_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm">$</span>
            <Input
              id="unit_price_option1"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.unit_price_option1 || ""}
              onChange={(e) => handleInputChange(e, "unit_price_option1")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option1"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option1 || ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option1")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Description - 8 columns */}
        <div className="md:col-span-8 space-y-1.5">
          <Label htmlFor="description_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</Label>
          <Textarea
            id="description_option1"
            placeholder="Add details about this option..."
            value={formData.description_option1 || ""}
            onChange={(e) => handleInputChange(e, "description_option1")}
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Images</Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Main Image */}
            <div className="relative aspect-square">
              {imagePreview1 && isValidImageUrl(imagePreview1) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview1}
                    alt="Option 1 Main"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(1, false)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 1)} />
                  <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Main</span>
                </label>
              )}
            </div>

            {/* Extra Image */}
            <div className="relative aspect-square">
              {imagePreview1_2 && isValidImageUrl(imagePreview1_2) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview1_2}
                    alt="Option 1 Extra"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(1, true)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 1, true)} />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Extra</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOption2Content = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title - Full Width on mobile, 4 columns on desktop */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="title_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Title
          </Label>
          <Input
            id="title_option2"
            placeholder="e.g. Premium"
            value={formData.title_option2 || ""}
            onChange={(e) => handleInputChange(e, "title_option2")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Delivery Time - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="delivery_time_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Delivery Time
          </Label>
          <Input
            id="delivery_time_option2"
            placeholder="e.g. 2 WEEKS"
            value={formData.delivery_time_option2 || ""}
            onChange={(e) => handleInputChange(e, "delivery_time_option2")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Price - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_price_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm">$</span>
            <Input
              id="unit_price_option2"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.unit_price_option2 || ""}
              onChange={(e) => handleInputChange(e, "unit_price_option2")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option2"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option2 || ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option2")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Description - 8 columns */}
        <div className="md:col-span-8 space-y-1.5">
          <Label htmlFor="description_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</Label>
          <Textarea
            id="description_option2"
            placeholder="Add details about this option..."
            value={formData.description_option2 || ""}
            onChange={(e) => handleInputChange(e, "description_option2")}
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Images</Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Main Image */}
            <div className="relative aspect-square">
              {imagePreview2 && isValidImageUrl(imagePreview2) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview2}
                    alt="Option 2 Main"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(2, false)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 2)} />
                  <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Main</span>
                </label>
              )}
            </div>

            {/* Extra Image */}
            <div className="relative aspect-square">
              {imagePreview2_2 && isValidImageUrl(imagePreview2_2) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview2_2}
                    alt="Option 2 Extra"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(2, true)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 2, true)} />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Extra</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOption3Content = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title - Full Width on mobile, 4 columns on desktop */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="title_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Title
          </Label>
          <Input
            id="title_option3"
            placeholder="e.g. Deluxe"
            value={formData.title_option3 || ""}
            onChange={(e) => handleInputChange(e, "title_option3")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Delivery Time - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label htmlFor="delivery_time_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Delivery Time
          </Label>
          <Input
            id="delivery_time_option3"
            placeholder="e.g. 3 DAYS"
            value={formData.delivery_time_option3 || ""}
            onChange={(e) => handleInputChange(e, "delivery_time_option3")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Price - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_price_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm">$</span>
            <Input
              id="unit_price_option3"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.unit_price_option3 || ""}
              onChange={(e) => handleInputChange(e, "unit_price_option3")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option3"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option3 || ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option3")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin text-gray-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Description - 8 columns */}
        <div className="md:col-span-8 space-y-1.5">
          <Label htmlFor="description_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</Label>
          <Textarea
            id="description_option3"
            placeholder="Add details about this option..."
            value={formData.description_option3 || ""}
            onChange={(e) => handleInputChange(e, "description_option3")}
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all text-gray-900 dark:text-slate-100"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Images</Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Main Image */}
            <div className="relative aspect-square">
              {imagePreview3 && isValidImageUrl(imagePreview3) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview3}
                    alt="Option 3 Main"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(3, false)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 3)} />
                  <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Main</span>
                </label>
              )}
            </div>

            {/* Extra Image */}
            <div className="relative aspect-square">
              {imagePreview3_2 && isValidImageUrl(imagePreview3_2) ? (
                <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <Image
                    src={imagePreview3_2}
                    alt="Option 3 Extra"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(3, true)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 3, true)} />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Extra</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Price Options</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-slate-900/95">
            <form id="price-options-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Option 1 */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <CardHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold">1</span>
                      Price Option 1
                    </CardTitle>
                    <span className="text-[10px] font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/30 tracking-wide uppercase">Required</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {renderOption1Content()}
                </CardContent>
              </Card>

              {/* Add Option 2 button */}
              {!showOption2 && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowOption2(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Price Option 2
                  </Button>
                </div>
              )}

              {/* Option 2 */}
              {showOption2 && (
                <Card className="relative shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => {
                        setShowOption2(false);
                        setShowOption3(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold">2</span>
                      Price Option 2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {renderOption2Content()}
                  </CardContent>
                </Card>
              )}

              {/* Add Option 3 button */}
              {showOption2 && !showOption3 && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowOption3(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Price Option 3
                  </Button>
                </div>
              )}

              {/* Option 3 */}
              {showOption3 && (
                <Card className="relative shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setShowOption3(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold">3</span>
                      Price Option 3
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {renderOption3Content()}
                  </CardContent>
                </Card>
            )}
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
            <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={handleClose}
              className="w-24 bg-white dark:bg-slate-800 border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              form="price-options-form"
              disabled={isLoading}
              className="w-24 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                  'Save'
              )}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
);
} 