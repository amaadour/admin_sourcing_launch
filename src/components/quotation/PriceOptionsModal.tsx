"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, X } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { customToast } from "@/components/ui/toast"
import { supabase } from "@/lib/supabase"

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

// Helper to check if URL is a video
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

export default function PriceOptionsModal({
  isOpen,
  onClose,
  quotationId,
  initialData,
  onUpdate
}: PriceOptionsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [quantity, setQuantity] = useState<number>(1)
  const [showOption2, setShowOption2] = useState(!!initialData?.title_option2)
  const [showOption3, setShowOption3] = useState(!!initialData?.title_option3)

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

  // Fetch quantity from database when modal opens
  useEffect(() => {
    if (isOpen && quotationId) {
      const fetchQuantity = async () => {
        try {
          const { data, error } = await supabase
            .from('quotations')
            .select('quantity, unit_price_option1, unit_price_option2, unit_price_option3')
            .eq('id', quotationId)
            .single();

          if (error) {
            console.error('Error fetching quotation quantity:', error);
            return;
          }

          if (data) {
            const quotationData = data as {
              quantity?: number | null;
              unit_price_option1?: number | null;
              unit_price_option2?: number | null;
              unit_price_option3?: number | null;
            };
            setQuantity(quotationData.quantity || 1);
            // Update formData with unit prices from database if they exist and formData doesn't have them
            setFormData(prev => {
              const updates: Partial<PriceOptionsData> = {};
              if (quotationData.unit_price_option1 != null && prev.unit_price_option1 == null) {
                updates.unit_price_option1 = Number(quotationData.unit_price_option1);
              }
              if (quotationData.unit_price_option2 != null && prev.unit_price_option2 == null) {
                updates.unit_price_option2 = Number(quotationData.unit_price_option2);
              }
              if (quotationData.unit_price_option3 != null && prev.unit_price_option3 == null) {
                updates.unit_price_option3 = Number(quotationData.unit_price_option3);
              }
              return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });
          }
        } catch (error) {
          console.error('Error fetching quotation data:', error);
        }
      };

      fetchQuantity();
    }
  }, [isOpen, quotationId]);

  // Load data from localStorage when component mounts
  useEffect(() => {
    if (isOpen) {
      try {
        const savedData = localStorage.getItem(localStorageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setFormData(parsedData);
          
          // Set preview images and visibility options based on saved data
          
          setShowOption2(!!parsedData.title_option2 || !!parsedData.image_option2 || 
            !!parsedData.unit_price_option2 || !!parsedData.delivery_time_option2 || 
            !!parsedData.description_option2);
          
          setShowOption3(!!parsedData.title_option3 || !!parsedData.image_option3 || 
            !!parsedData.unit_price_option3 || !!parsedData.delivery_time_option3 || 
            !!parsedData.description_option3);
        } else if (initialData) {
          setFormData(initialData);
          
          
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

    // Check limit (max 10 files - images or videos) - only for main image fields
    if (!isExtra) {
      const currentImages = getAllImages(optionNumber);
      if (currentImages.length >= 10) {
        customToast({
          variant: "destructive",
          title: "Error",
          description: "You can upload a maximum of 10 files per option"
        });
        return;
      }
    }

    // Check file type - allow images and videos for all fields
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (!allowedTypes.includes(file.type)) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "File must be an image (JPG, PNG, GIF, SVG) or video (MP4, WebM, MOV, AVI)"
      });
      return;
    }

    // Check file size - 2MB for images, 50MB for videos
    const isVideo = allowedVideoTypes.includes(file.type);
    const maxSize = isVideo ? 50 * 1024 * 1024 : 2 * 1024 * 1024; // 50MB for videos, 2MB for images
    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? 50 : 2;
      customToast({
        variant: "destructive",
        title: "Error",
        description: `File size must be less than ${maxSizeMB}MB`
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

      // Add the new image/video to the existing images instead of replacing
      if (isExtra) {
        // For extra images, add to the extra_images array
        const fieldExtra = `extra_images_option${optionNumber}` as keyof PriceOptionsData;
        setFormData(prev => {
          const currentExtrasField = prev[fieldExtra];
          const currentExtras = Array.isArray(currentExtrasField) ? currentExtrasField : [];
          return {
            ...prev,
            [fieldExtra]: [...currentExtras, urlWithCacheBust]
          };
        });
      } else {
        // For main images, add to the existing images array
        const currentImages = getAllImages(optionNumber);
        const newImages = [...currentImages, urlWithCacheBust];
        updateOptionImages(optionNumber, newImages);
      }

      customToast({
        variant: "default",
        title: "Success",
        description: file.type.startsWith('video/') ? "Video uploaded successfully" : "Image uploaded successfully"
      });
    } catch (error) {
      console.error('File upload error:', error);
      customToast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? `Failed to upload file: ${error.message}` 
          : "Failed to upload file. Please try again."
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

  // Calculate total price = unit_price * quantity
  const calculateTotalPrice = (unitPrice: number | null | undefined): number => {
    if (!unitPrice || !quantity) return 0;
    return unitPrice * quantity;
  };

  // Helper to get all images for an option as a flat array
  const getAllImages = (optionNum: number): string[] => {
    const list: string[] = [];
    const img1 = formData[`image_option${optionNum}` as keyof PriceOptionsData] as string | null;
    const img2 = formData[`image_option${optionNum}_2` as keyof PriceOptionsData] as string | null;
    const extrasField = formData[`extra_images_option${optionNum}` as keyof PriceOptionsData];
    const extras = Array.isArray(extrasField) ? extrasField : [];

    if (img1) list.push(img1);
    if (img2) list.push(img2);
    if (extras && Array.isArray(extras)) list.push(...extras);
    return list;
  };

  // Helper to distribute images back to columns
  const updateOptionImages = (optionNum: number, images: string[]) => {
    const field1 = `image_option${optionNum}` as keyof PriceOptionsData;
    const field2 = `image_option${optionNum}_2` as keyof PriceOptionsData;
    const fieldExtra = `extra_images_option${optionNum}` as keyof PriceOptionsData;

    setFormData(prev => ({
      ...prev,
      [field1]: images[0] || null,
      [field2]: images[1] || null,
      [fieldExtra]: images.slice(2)
    }));
  };

  // Helper to remove an image by index
  const removeImage = (optionNum: number, index: number) => {
    const currentImages = getAllImages(optionNum);
    const newImages = currentImages.filter((_, idx) => idx !== index);
    updateOptionImages(optionNum, newImages);
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
              value={formData.unit_price_option1 != null ? formData.unit_price_option1 : ""}
              onChange={(e) => handleInputChange(e, "unit_price_option1")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
            />
          </div>
          {formData.unit_price_option1 != null && quantity > 0 && (
            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
              Total: <span className="font-semibold text-blue-600 dark:text-blue-400">${calculateTotalPrice(formData.unit_price_option1).toFixed(2)}</span> ({quantity} × ${formData.unit_price_option1.toFixed(2)})
            </div>
          )}
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option1" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option1"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option1 != null ? formData.unit_weight_option1 : ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option1")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
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
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
            Images/Videos ({getAllImages(1).length}/10)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {getAllImages(1).slice(0, 10).map((url, idx) => (
              <div key={idx} className="relative aspect-square">
                {isValidImageUrl(url) ? (
                  <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <Image
                        src={url}
                        alt={`Option 1 Image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(1, idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {getAllImages(1).length < 10 && (
              <div className="relative aspect-square">
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={(e) => handleImageUpload(e, 1)} 
                    disabled={isLoading}
                  />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Add</span>
                </label>
              </div>
            )}
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
              value={formData.unit_price_option2 != null ? formData.unit_price_option2 : ""}
              onChange={(e) => handleInputChange(e, "unit_price_option2")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
            />
          </div>
          {formData.unit_price_option2 != null && quantity > 0 && (
            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
              Total: <span className="font-semibold text-blue-600 dark:text-blue-400">${calculateTotalPrice(formData.unit_price_option2).toFixed(2)}</span> ({quantity} × ${formData.unit_price_option2.toFixed(2)})
            </div>
          )}
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option2" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option2"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option2 != null ? formData.unit_weight_option2 : ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option2")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
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
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
            Images/Videos ({getAllImages(2).length}/10)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {getAllImages(2).slice(0, 10).map((url, idx) => (
              <div key={idx} className="relative aspect-square">
                {isValidImageUrl(url) ? (
                  <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <Image
                        src={url}
                        alt={`Option 2 Image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(2, idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {getAllImages(2).length < 10 && (
              <div className="relative aspect-square">
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={(e) => handleImageUpload(e, 2)} 
                    disabled={isLoading}
                  />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Add</span>
                </label>
              </div>
            )}
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
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
              value={formData.unit_price_option3 != null ? formData.unit_price_option3 : ""}
              onChange={(e) => handleInputChange(e, "unit_price_option3")}
              className="pl-7 bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
            />
          </div>
          {formData.unit_price_option3 != null && quantity > 0 && (
            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
              Total: <span className="font-semibold text-blue-600 dark:text-blue-400">${calculateTotalPrice(formData.unit_price_option3).toFixed(2)}</span> ({quantity} × ${formData.unit_price_option3.toFixed(2)})
            </div>
          )}
        </div>
        
        {/* Weight - 2 columns */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="unit_weight_option3" className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</Label>
          <Input
            id="unit_weight_option3"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.unit_weight_option3 != null ? formData.unit_weight_option3 : ""}
            onChange={(e) => handleInputChange(e, "unit_weight_option3")}
            className="bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all input-no-spin"
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
            className="min-h-[120px] bg-transparent border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none transition-all"
          />
        </div>

        {/* Images - 4 columns */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
            Images/Videos ({getAllImages(3).length}/10)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {getAllImages(3).slice(0, 10).map((url, idx) => (
              <div key={idx} className="relative aspect-square">
                {isValidImageUrl(url) ? (
                  <div className="relative group w-full h-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <Image
                        src={url}
                        alt={`Option 3 Image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(3, idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {getAllImages(3).length < 10 && (
              <div className="relative aspect-square">
                <label className="flex flex-col items-center justify-center w-full h-full rounded-md border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={(e) => handleImageUpload(e, 3)} 
                    disabled={isLoading}
                  />
                  <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:text-slate-500 transition-colors" />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Add</span>
                </label>
              </div>
            )}
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
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/95">
            <form id="price-options-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Option 1 */}
              <Card className="shadow-sm bg-white dark:bg-slate-800 dark:border-slate-700 border border-gray-200">
                <CardHeader className="p-4 border-b border-gray-100 dark:border-slate-700/50">
                  <CardTitle className="text-lg text-gray-900 dark:text-slate-100 flex items-center">
                    Price Option 1 <span className="text-sm text-rose-500 dark:text-rose-400 ml-2">(Required)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-4">
                  {renderOption1Content()}
                </CardContent>
              </Card>

              {/* Add Option 2 button */}
              {!showOption2 && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowOption2(true)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Price Option 2
                  </Button>
                </div>
              )}

              {/* Option 2 */}
              {showOption2 && (
                <Card className="relative shadow-sm bg-white dark:bg-slate-800 dark:border-slate-700 border border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
                    onClick={() => {
                      setShowOption2(false);
                      setShowOption3(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="p-4 border-b border-gray-100 dark:border-slate-700/50">
                    <CardTitle className="text-lg text-gray-900 dark:text-slate-100">Price Option 2</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-4">
                    {renderOption2Content()}
                  </CardContent>
                </Card>
              )}

              {/* Add Option 3 button */}
              {showOption2 && !showOption3 && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowOption3(true)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Price Option 3
                  </Button>
                </div>
              )}

              {/* Option 3 */}
              {showOption3 && (
                <Card className="relative shadow-sm bg-white dark:bg-slate-800 dark:border-slate-700 border border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
                    onClick={() => setShowOption3(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="p-4 border-b border-gray-100 dark:border-slate-700/50">
                    <CardTitle className="text-lg text-gray-900 dark:text-slate-100">Price Option 3</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-4">
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
              className="w-24 bg-white dark:bg-slate-800 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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