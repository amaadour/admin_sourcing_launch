"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { 
  ArrowRightIcon, 
  CloseIcon, 
  ChevronLeftIcon, 
  CheckCircleIcon 
} from "@/icons";
import { useDropzone } from "react-dropzone";
import { countries as countryCodes } from 'country-flag-icons';
import { supabase } from "@/lib/supabase";

// Helper to validate Supabase image URLs
const isValidImageUrl = (url: string | null | undefined) =>
  !!url && url.startsWith('https://cfhochnjniddaztgwrbk.supabase.co/');

// Shipping methods based on destination region
const getShippingMethods = (region: string) => {
  const methods = ["Sea Freight", "Air Freight"];
  // Only add Train Freight for European countries
  if (region === "Europe") {
    methods.push("Train Freight");
  }
  return methods;
};

// Map UI shipping methods to database values
const mapShippingMethodToDbValue = (method: string): string => {
  const mapping: Record<string, string> = {
    'Sea Freight': 'Sea',
    'Air Freight': 'Air',
    'Train Freight': 'Train'
  };
  return mapping[method] || 'Sea'; // Default to 'Sea' if no match
};

// Helper function to get emoji flag from country code
const getCountryEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

// Type for country data
interface CountryData {
  code: string;
  name: string;
  emoji: string;
  region: string;
}

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuotationFormModal: React.FC<QuotationFormModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    productUrl: "",
    quantity: "",
    productImages: [] as File[],
    destinationCountry: "",
    destinationCity: "",
    shippingMethod: "",
    serviceType: "",
  });
  
  useEffect(() => {
    // Generate country list from country codes
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countryList: CountryData[] = countryCodes.map((code) => {
      let countryName: string;
      try {
        // Try to get the country name using Intl.DisplayNames
        const name = displayNames.of(code);
        // If Intl.DisplayNames returns null or undefined, use the code as fallback
        countryName = name || code;
      } catch (error) {
        // If there's an error (invalid region code), use the code as fallback
        countryName = code;
      }
      
      return {
        code: code.toLowerCase(),
        name: countryName,
        emoji: getCountryEmoji(code),
        region: getRegionForCountry(code)
      };
    });
    
    // Sort countries by name
    countryList.sort((a: CountryData, b: CountryData) => a.name.localeCompare(b.name));
    setCountries(countryList);
  }, []);
  
  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [countries, searchQuery]);
  
  // Function to determine region based on country code
  // This is a simplified version, in a real app you'd use a more accurate mapping
  const getRegionForCountry = (code: string): string => {
    const europeCountries = ["AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FO", "FI", "FR", "DE", "GI", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MK", "MT", "MD", "MC", "ME", "NL", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA"];
    const asiaCountries = ["AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "HK", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TR", "TM", "AE", "UZ", "VN", "YE"];
    const africaCountries = ["DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"];
    const northAmericaCountries = ["AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD", "GT", "HT", "HN", "JM", "MX", "NI", "PA", "KN", "LC", "VC", "TT", "US"];
    const southAmericaCountries = ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"];
    const oceaniaCountries = ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"];
    
    if (europeCountries.includes(code)) return "Europe";
    if (asiaCountries.includes(code)) return "Asia";
    if (africaCountries.includes(code)) return "Africa";
    if (northAmericaCountries.includes(code)) return "North America";
    if (southAmericaCountries.includes(code)) return "South America";
    if (oceaniaCountries.includes(code)) return "Oceania";
    
    return "Other";
  };

  // Get country region
  const getCountryRegion = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.region : "";
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "destinationCountry") {
      // Reset shipping method when country changes
      setFormData({
        ...formData,
        [name]: value,
        shippingMethod: "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Handle search query change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle file upload with dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFormData(prev => ({
      ...prev,
      productImages: [...prev.productImages, ...acceptedFiles],
    }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
  });

  // Add a function to remove an image by index
  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      productImages: prev.productImages.filter((_, index) => index !== indexToRemove),
    }));
  };

  // Navigate to next step
  const nextStep = () => {
    // Validate fields for the current step
    if (step === 1) {
      if (!formData.productName.trim()) {
        alert("Please enter a product name");
        return;
      }
      if (!formData.quantity.trim() || isNaN(parseInt(formData.quantity, 10))) {
        alert("Please enter a valid quantity (must be a number)");
        return;
      }
    } else if (step === 2) {
      if (!formData.destinationCountry) {
        alert("Please select a destination country");
        return;
      }
      if (!formData.destinationCity.trim()) {
        alert("Please enter a destination city");
        return;
      }
      if (!formData.shippingMethod) {
        alert("Please select a shipping method");
        return;
      }
    }
    
    setStep(step + 1);
  };

  // Navigate to previous step
  const prevStep = () => {
    setStep(step - 1);
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.productName.trim()) {
      alert("Please enter a product name");
      setStep(1);
      return;
    }
    
    // Validate quantity is a number
    if (!formData.quantity.trim() || isNaN(parseInt(formData.quantity, 10))) {
      alert("Please enter a valid quantity (must be a number)");
      setStep(1);
      return;
    }
    
    if (!formData.destinationCountry) {
      alert("Please select a destination country");
      setStep(2);
      return;
    }
    
    if (!formData.destinationCity.trim()) {
      alert("Please enter a destination city");
      setStep(2);
      return;
    }
    
    if (!formData.shippingMethod) {
      alert("Please select a shipping method");
      setStep(2);
      return;
    }
    
    if (!formData.serviceType) {
      alert("Please select a service type");
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Upload images first if any
      const imageUrls: string[] = [];
      if (formData.productImages.length > 0) {
        for (const file of formData.productImages) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;
            
            // Upload the file to the quotation images bucket
            const { error: uploadError } = await supabase.storage
              .from('quotation_images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error('Upload error details:', uploadError);
              throw new Error(`Error uploading image: ${uploadError.message}`);
            }
            
            // Get the public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
              .from('quotation_images')
              .getPublicUrl(filePath);
            
            if (publicUrl) {
              imageUrls.push(publicUrl);
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
          }
        }
      }
      
      // Create the quotation record
      console.log('Debug - formData shipping method:', formData.shippingMethod);
      
      const { data: quotationData, error: insertError } = await supabase
        .from('quotations')
        .insert({
          product_name: formData.productName,
          product_url: formData.productUrl,
          quantity: parseInt(formData.quantity, 10),
          shipping_country: formData.destinationCountry,
          shipping_city: formData.destinationCity,
          shipping_method: mapShippingMethodToDbValue(formData.shippingMethod),
          service_type: formData.serviceType,
          status: 'Pending',
          image_url: imageUrls.length > 0 ? imageUrls[0] : null,
          user_id: sessionData?.session?.user?.id,
          quotation_id: `QT-${Date.now()}`,
          title_option1: '',
          total_price_option1: '0',
          delivery_time_option1: 'To be determined'
        } as never)
        .select();
        
      if (insertError) {
        console.error('Insert error details:', insertError);
        throw new Error(`Failed to submit quotation: ${insertError.message}`);
      }

      // Store the generated UUID for reference (if needed in future)
      if (quotationData && quotationData.length > 0) {
        const first = (quotationData as unknown as Array<{ id: string }>)[0];
        console.log('Generated quotation ID:', first.id);
      }

      // Success! Move to completion step
      setStep(4);
    } catch (error) {
      console.error('Error submitting quotation:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-3xl h-auto mx-auto p-4 sm:p-6 overflow-hidden">
      {/* Modal header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#0D47A1] dark:text-white">Create New Quotation</h2>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700"></div>
        <div className="relative flex justify-between">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex flex-col items-center">
              <div 
                className={`z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step >= stepNumber 
                    ? 'bg-[#1E88E5] text-white border-[#1E88E5]' 
                    : 'bg-white text-gray-400 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                }`}
              >
                {step > stepNumber ? <CheckCircleIcon className="w-4 h-4" /> : stepNumber}
              </div>
              <span className={`mt-2 text-xs ${
                step >= stepNumber 
                  ? 'text-[#1E88E5]' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                Step {stepNumber}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="max-h-[calc(100vh-240px)] overflow-y-auto px-1 py-2">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Product Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Product Information</h3>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alibaba Product URL*
                </label>
                <input
                  type="text"
                  name="productUrl"
                  value={formData.productUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity Required *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Images
                </label>
                <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-[#1E88E5] dark:border-gray-700 rounded-xl hover:border-[#1E88E5]">
                  <div
                    {...getRootProps()}
                    className={`dropzone rounded-xl border-dashed border-gray-300 p-4 ${
                      isDragActive
                        ? "border-[#1E88E5] bg-gray-100 dark:bg-gray-800"
                        : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    {/* Hidden Input */}
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center">
                      {/* Icon Container */}
                      <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          <svg
                            className="fill-current"
                            width="24"
                            height="24"
                            viewBox="0 0 29 28"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Text Content */}
                      <h4 className="mb-2 font-medium text-gray-800 dark:text-white/90">
                        {isDragActive ? "Drop Files Here" : "Drag & Drop Files Here"}
                      </h4>

                      <span className="text-center mb-3 block w-full max-w-[290px] text-sm text-gray-500 dark:text-gray-400">
                        Drag and drop your PNG, JPG, WebP, SVG images here or browse
                      </span>

                      <span className="font-medium underline text-sm text-[#1E88E5]">
                        Browse File
                      </span>
                    </div>
                  </div>
                </div>
                
                {formData.productImages.length > 0 && (
                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Images ({formData.productImages.length})
                    </label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {formData.productImages.map((file, index) => (
                        <div key={index} className="relative w-24 h-24 overflow-hidden rounded-md group">
                          {file ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={`Product image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center w-full h-40 bg-gray-200 text-gray-500 rounded">
                              <span style={{fontSize: '2rem'}}>📷</span>
                              <span>No Photo Uploaded</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <CloseIcon className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center px-6 py-2 bg-[#1E88E5] text-white rounded-md hover:bg-[#1976D2] transition-colors"
                >
                  Next <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Shipping Information */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Shipping Information</h3>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Destination Country *
                </label>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2"
                  />
                  
                  <div className="h-[200px] overflow-y-auto border border-gray-300 rounded-md">
                    {filteredCountries.map((country) => (
                      <div
                        key={country.code}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            destinationCountry: country.code,
                            shippingMethod: ""
                          });
                          setSearchQuery("");
                        }}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          formData.destinationCountry === country.code
                            ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200"
                            : ""
                        }`}
                      >
                        <span className="text-xl">{country.emoji}</span>
                        <span>{country.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Destination City *
                </label>
                <input
                  type="text"
                  name="destinationCity"
                  value={formData.destinationCity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Shipping Method *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {formData.destinationCountry && getShippingMethods(getCountryRegion(formData.destinationCountry)).map((method) => (
                    <div
                      key={method}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          shippingMethod: method
                        });
                      }}
                      className={`flex items-center justify-center gap-2 p-3 cursor-pointer border rounded-md transition-colors ${
                        formData.shippingMethod === method
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] dark:bg-blue-900 dark:text-blue-200"
                          : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                    >
                      {method}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center px-6 py-2 bg-[#1E88E5] text-white rounded-md hover:bg-[#1976D2] transition-colors"
                >
                  Next <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Service Details */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Service Details</h3>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {["Sourcing", "Shipping Only"].map((service) => (
                    <div
                      key={service}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          serviceType: service
                        });
                      }}
                      className={`flex items-center justify-center gap-2 p-3 cursor-pointer border rounded-md transition-colors ${
                        formData.serviceType === service
                          ? "border-[#1E88E5] bg-blue-50 text-[#1E88E5] dark:bg-blue-900 dark:text-blue-200"
                          : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                    >
                      {service}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="text-sm font-medium text-gray-700 dark:text-white mb-2">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Product:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formData.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Quantity:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formData.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Destination:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {formData.destinationCity}, {countries.find(c => c.code === formData.destinationCountry)?.name || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Shipping Method:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formData.shippingMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Service:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formData.serviceType}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-[#1E88E5] text-white rounded-md hover:bg-[#1976D2] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quotation'}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 4: Completion */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 dark:bg-green-900 dark:text-green-300">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Quotation Submitted Successfully!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your quotation has been submitted and is now being reviewed by our team.
                You&apos;ll receive a response shortly.
              </p>
              <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  Waiting for prices from supplier
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#1E88E5] text-white rounded-md hover:bg-[#1976D2] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default QuotationFormModal;