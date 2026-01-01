"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, X, Download, Check } from "lucide-react"
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
  extra_images_option1?: string[];
  unit_price_option1?: number;
  unit_weight_option1?: number;
  delivery_time_option1?: string;
  description_option1?: string;
  title_option2?: string;
  extra_images_option2?: string[];
  unit_price_option2?: number;
  unit_weight_option2?: number;
  delivery_time_option2?: string;
  description_option2?: string;
  title_option3?: string;
  extra_images_option3?: string[];
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
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState<PriceOptionsData>({
    title_option1: initialData?.title_option1 || "",
    extra_images_option1: initialData?.extra_images_option1 || [],
    unit_price_option1: initialData?.unit_price_option1,
    unit_weight_option1: initialData?.unit_weight_option1,
    delivery_time_option1: initialData?.delivery_time_option1 || "",
    description_option1: initialData?.description_option1 || "",
    title_option2: initialData?.title_option2,
    extra_images_option2: initialData?.extra_images_option2 || [],
    unit_price_option2: initialData?.unit_price_option2,
    unit_weight_option2: initialData?.unit_weight_option2,
    delivery_time_option2: initialData?.delivery_time_option2 || "",
    description_option2: initialData?.description_option2,
    title_option3: initialData?.title_option3,
    extra_images_option3: initialData?.extra_images_option3 || [],
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
          
          setShowOption2(!!parsedData.title_option2 || (parsedData.extra_images_option2 && parsedData.extra_images_option2.length > 0) || 
            !!parsedData.unit_price_option2 || !!parsedData.delivery_time_option2 || 
            !!parsedData.description_option2);
          
          setShowOption3(!!parsedData.title_option3 || (parsedData.extra_images_option3 && parsedData.extra_images_option3.length > 0) || 
            !!parsedData.unit_price_option3 || !!parsedData.delivery_time_option3 || 
            !!parsedData.description_option3);
        } else if (initialData) {
          setFormData(initialData);
          
          
          const hasOption2Data = initialData.title_option2 || (initialData.extra_images_option2 && initialData.extra_images_option2.length > 0) || 
            initialData.unit_price_option2 || initialData.delivery_time_option2 || 
            initialData.description_option2;
          
          const hasOption3Data = initialData.title_option3 || (initialData.extra_images_option3 && initialData.extra_images_option3.length > 0) || 
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionNumber: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one file to upload"
      });
      return;
    }

    // Check limit (max 10 files - images or videos)
    const currentImages = getAllImages(optionNumber);
    const remainingSlots = 10 - currentImages.length;
    if (remainingSlots <= 0) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "You can upload a maximum of 10 files per option"
      });
      return;
    }
    if (files.length > remainingSlots) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: `You can only upload ${remainingSlots} more file${remainingSlots > 1 ? 's' : ''}. Please select fewer files.`
      });
      return;
    }

    // Check file type - allow images and videos for all fields
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    // Validate all files before uploading
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];
    const filesArray = Array.from(files);
    
    filesArray.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(file.name);
      }
      const isVideo = allowedVideoTypes.includes(file.type);
      const maxSize = isVideo ? 50 * 1024 * 1024 : 2 * 1024 * 1024; // 50MB for videos, 2MB for images
      if (file.size > maxSize) {
        oversizedFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: `Invalid file type(s): ${invalidFiles.join(', ')}. Files must be images (JPG, PNG, GIF, SVG) or videos (MP4, WebM, MOV, AVI)`
      });
      return;
    }

    if (oversizedFiles.length > 0) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: `File(s) too large: ${oversizedFiles.join(', ')}. Images must be less than 2MB and videos less than 50MB`
      });
      return;
    }

    try {
      setIsLoading(true);
      const uploadedUrls: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Upload all files sequentially
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        try {
          // Create a unique filename with option number and timestamp
          const fileExt = file.name.split(".").pop();
          const timestamp = Date.now() + i; // Add index to ensure uniqueness
          const uniqueId = `${timestamp}-${Math.random().toString(36).substring(2, 15)}`;
          const fileName = `option${optionNumber}-${uniqueId}.${fileExt}`;

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
            errorCount++;
            continue;
          }

          // Get the public URL with cache busting
          const { data: { publicUrl } } = supabase.storage
            .from("price_option_images")
            .getPublicUrl(filePath);

          const urlWithCacheBust = `${publicUrl}?t=${timestamp}`;
          uploadedUrls.push(urlWithCacheBust);
          successCount++;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          errorCount++;
        }
      }

      // Add all successfully uploaded images/videos to the form data
      if (uploadedUrls.length > 0) {
        const currentImages = getAllImages(optionNumber);
        const newImages = [...currentImages, ...uploadedUrls];
        updateOptionImages(optionNumber, newImages);
      }

      // Show success/error toast
      if (successCount > 0) {
        customToast({
          variant: "default",
          title: "Upload Complete",
          description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} file(s) failed to upload.` : ''}`
        });
      } else {
        customToast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}. Please try again.`
        });
      }

      // Reset the file input
      e.target.value = '';
    } catch (error) {
      console.error('File upload error:', error);
      customToast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? `Failed to upload files: ${error.message}` 
          : "Failed to upload files. Please try again."
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
        extra_images_option1: formData.extra_images_option1 || [],
        unit_price_option1: formData.unit_price_option1,
        unit_weight_option1: formData.unit_weight_option1,
        delivery_time_option1: formData.delivery_time_option1,
        description_option1: formData.description_option1,
        title_option2: formData.title_option2,
        extra_images_option2: formData.extra_images_option2 || [],
        unit_price_option2: formData.unit_price_option2,
        unit_weight_option2: formData.unit_weight_option2,
        delivery_time_option2: formData.delivery_time_option2,
        description_option2: formData.description_option2,
        title_option3: formData.title_option3,
        extra_images_option3: formData.extra_images_option3 || [],
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
    const extrasField = formData[`extra_images_option${optionNum}` as keyof PriceOptionsData];
    return Array.isArray(extrasField) ? extrasField : [];
  };

  // Helper to update images for an option
  const updateOptionImages = (optionNum: number, images: string[]) => {
    const fieldExtra = `extra_images_option${optionNum}` as keyof PriceOptionsData;

    setFormData(prev => ({
      ...prev,
      [fieldExtra]: images
    }));
  };

  // Helper to remove an image by index
  const removeImage = (optionNum: number, index: number) => {
    const currentImages = getAllImages(optionNum);
    const imageUrl = currentImages[index];
    const newImages = currentImages.filter((_, idx) => idx !== index);
    updateOptionImages(optionNum, newImages);
    
    // Remove from selected if it was selected (using URL as ID)
    if (imageUrl) {
      const imageId = `${optionNum}-${imageUrl}`;
      setSelectedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  // Toggle image selection
  const toggleImageSelection = (optionNum: number, index: number) => {
    const images = getAllImages(optionNum);
    const url = images[index];
    if (!url) return;
    
    const imageId = `${optionNum}-${url}`;
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  // Download a single file
  const downloadFile = async (url: string, filename: string): Promise<void> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  };

  // Download all selected images/videos
  const handleDownloadSelected = async () => {
    if (selectedImages.size === 0) {
      customToast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select at least one image or video to download"
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process all options
      for (let optionNum = 1; optionNum <= 3; optionNum++) {
        const images = getAllImages(optionNum);
        
        for (let idx = 0; idx < images.length; idx++) {
          const url = images[idx];
          const imageId = `${optionNum}-${url}`;
          
          if (selectedImages.has(imageId)) {
            try {
              // Extract filename from URL or create one
              const urlParts = url.split('/');
              const originalFilename = urlParts[urlParts.length - 1].split('?')[0];
              const extension = originalFilename.split('.').pop() || (isVideoUrl(url) ? 'mp4' : 'jpg');
              const filename = `option${optionNum}_${idx + 1}.${extension}`;
              
              // Add small delay between downloads to avoid browser blocking
              if (successCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              await downloadFile(url, filename);
              successCount++;
            } catch (error) {
              console.error(`Error downloading file ${url}:`, error);
              errorCount++;
            }
          }
        }
      }

      if (successCount > 0) {
        customToast({
          variant: "default",
          title: "Download Complete",
          description: `Successfully downloaded ${successCount} file${successCount > 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
        // Clear selection after successful download
        setSelectedImages(new Set());
      } else {
        customToast({
          variant: "destructive",
          title: "Download Failed",
          description: "Failed to download selected files"
        });
      }
    } catch (error) {
      customToast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while downloading files"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Select/Deselect all images
  const toggleSelectAll = (optionNum: number) => {
    const images = getAllImages(optionNum);
    const allSelected = images.every((url) => selectedImages.has(`${optionNum}-${url}`));
    
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all in this option
        images.forEach((url) => {
          newSet.delete(`${optionNum}-${url}`);
        });
      } else {
        // Select all in this option
        images.forEach((url) => {
          newSet.add(`${optionNum}-${url}`);
        });
      }
      return newSet;
    });
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
              Images/Videos ({getAllImages(1).length}/10)
            </Label>
            {getAllImages(1).length > 0 && (
              <button
                type="button"
                onClick={() => toggleSelectAll(1)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {getAllImages(1).every((url) => selectedImages.has(`1-${url}`)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
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
                    {/* Checkbox for selection */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageSelection(1, idx);
                      }}
                      className={`absolute top-1 left-1 p-1 rounded transition-all ${
                        selectedImages.has(`1-${url}`)
                          ? 'bg-blue-600 text-white opacity-100'
                          : 'bg-white/90 text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${selectedImages.has(`1-${url}`) ? 'opacity-100' : 'opacity-50'}`} />
                    </button>
                    {selectedImages.has(`1-${url}`) && (
                      <div className="absolute inset-0 border-2 border-blue-600 rounded-md pointer-events-none" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(1, idx);
                      }}
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
                    multiple
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
              Images/Videos ({getAllImages(2).length}/10)
            </Label>
            {getAllImages(2).length > 0 && (
              <button
                type="button"
                onClick={() => toggleSelectAll(2)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {getAllImages(2).every((url) => selectedImages.has(`2-${url}`)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
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
                    {/* Checkbox for selection */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageSelection(2, idx);
                      }}
                      className={`absolute top-1 left-1 p-1 rounded transition-all ${
                        selectedImages.has(`2-${url}`)
                          ? 'bg-blue-600 text-white opacity-100'
                          : 'bg-white/90 text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${selectedImages.has(`2-${url}`) ? 'opacity-100' : 'opacity-50'}`} />
                    </button>
                    {selectedImages.has(`2-${url}`) && (
                      <div className="absolute inset-0 border-2 border-blue-600 rounded-md pointer-events-none" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(2, idx);
                      }}
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
                    multiple
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
              Images/Videos ({getAllImages(3).length}/10)
            </Label>
            {getAllImages(3).length > 0 && (
              <button
                type="button"
                onClick={() => toggleSelectAll(3)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {getAllImages(3).every((url) => selectedImages.has(`3-${url}`)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
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
                    {/* Checkbox for selection */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageSelection(3, idx);
                      }}
                      className={`absolute top-1 left-1 p-1 rounded transition-all ${
                        selectedImages.has(`3-${url}`)
                          ? 'bg-blue-600 text-white opacity-100'
                          : 'bg-white/90 text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${selectedImages.has(`3-${url}`) ? 'opacity-100' : 'opacity-50'}`} />
                    </button>
                    {selectedImages.has(`3-${url}`) && (
                      <div className="absolute inset-0 border-2 border-blue-600 rounded-md pointer-events-none" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(3, idx);
                      }}
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
                    multiple
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
            <div className="flex items-center gap-2">
              {selectedImages.size > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSelected}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download ({selectedImages.size})
                </Button>
              )}
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