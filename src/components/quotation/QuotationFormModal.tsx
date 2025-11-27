"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { 
  ArrowRightIcon, 
  CloseIcon, 
  ChevronLeftIcon
} from "@/icons";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import Stepper from "@/components/Stepper";

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

// Comprehensive list of all countries with their regions
// Excluding Israel (IL) and Western Sahara (EH)
const getAllCountries = (): Array<{ code: string; name: string; region: string }> => {
  return [
    // Africa
    { code: 'DZ', name: 'Algeria', region: 'Africa' },
    { code: 'AO', name: 'Angola', region: 'Africa' },
    { code: 'BJ', name: 'Benin', region: 'Africa' },
    { code: 'BW', name: 'Botswana', region: 'Africa' },
    { code: 'BF', name: 'Burkina Faso', region: 'Africa' },
    { code: 'BI', name: 'Burundi', region: 'Africa' },
    { code: 'CV', name: 'Cape Verde', region: 'Africa' },
    { code: 'CM', name: 'Cameroon', region: 'Africa' },
    { code: 'CF', name: 'Central African Republic', region: 'Africa' },
    { code: 'TD', name: 'Chad', region: 'Africa' },
    { code: 'KM', name: 'Comoros', region: 'Africa' },
    { code: 'CG', name: 'Congo', region: 'Africa' },
    { code: 'CD', name: 'Congo, Democratic Republic of the', region: 'Africa' },
    { code: 'CI', name: 'Côte d\'Ivoire', region: 'Africa' },
    { code: 'DJ', name: 'Djibouti', region: 'Africa' },
    { code: 'EG', name: 'Egypt', region: 'Africa' },
    { code: 'GQ', name: 'Equatorial Guinea', region: 'Africa' },
    { code: 'ER', name: 'Eritrea', region: 'Africa' },
    { code: 'SZ', name: 'Eswatini', region: 'Africa' },
    { code: 'ET', name: 'Ethiopia', region: 'Africa' },
    { code: 'GA', name: 'Gabon', region: 'Africa' },
    { code: 'GM', name: 'Gambia', region: 'Africa' },
    { code: 'GH', name: 'Ghana', region: 'Africa' },
    { code: 'GN', name: 'Guinea', region: 'Africa' },
    { code: 'GW', name: 'Guinea-Bissau', region: 'Africa' },
    { code: 'KE', name: 'Kenya', region: 'Africa' },
    { code: 'LS', name: 'Lesotho', region: 'Africa' },
    { code: 'LR', name: 'Liberia', region: 'Africa' },
    { code: 'LY', name: 'Libya', region: 'Africa' },
    { code: 'MG', name: 'Madagascar', region: 'Africa' },
    { code: 'MW', name: 'Malawi', region: 'Africa' },
    { code: 'ML', name: 'Mali', region: 'Africa' },
    { code: 'MR', name: 'Mauritania', region: 'Africa' },
    { code: 'MU', name: 'Mauritius', region: 'Africa' },
    { code: 'MA', name: 'Morocco', region: 'Africa' },
    { code: 'MZ', name: 'Mozambique', region: 'Africa' },
    { code: 'NA', name: 'Namibia', region: 'Africa' },
    { code: 'NE', name: 'Niger', region: 'Africa' },
    { code: 'NG', name: 'Nigeria', region: 'Africa' },
    { code: 'RW', name: 'Rwanda', region: 'Africa' },
    { code: 'ST', name: 'São Tomé and Príncipe', region: 'Africa' },
    { code: 'SN', name: 'Senegal', region: 'Africa' },
    { code: 'SC', name: 'Seychelles', region: 'Africa' },
    { code: 'SL', name: 'Sierra Leone', region: 'Africa' },
    { code: 'SO', name: 'Somalia', region: 'Africa' },
    { code: 'ZA', name: 'South Africa', region: 'Africa' },
    { code: 'SS', name: 'South Sudan', region: 'Africa' },
    { code: 'SD', name: 'Sudan', region: 'Africa' },
    { code: 'TZ', name: 'Tanzania', region: 'Africa' },
    { code: 'TG', name: 'Togo', region: 'Africa' },
    { code: 'TN', name: 'Tunisia', region: 'Africa' },
    { code: 'UG', name: 'Uganda', region: 'Africa' },
    { code: 'ZM', name: 'Zambia', region: 'Africa' },
    { code: 'ZW', name: 'Zimbabwe', region: 'Africa' },
    
    // Asia
    { code: 'AF', name: 'Afghanistan', region: 'Asia' },
    { code: 'AM', name: 'Armenia', region: 'Asia' },
    { code: 'AZ', name: 'Azerbaijan', region: 'Asia' },
    { code: 'BH', name: 'Bahrain', region: 'Asia' },
    { code: 'BD', name: 'Bangladesh', region: 'Asia' },
    { code: 'BT', name: 'Bhutan', region: 'Asia' },
    { code: 'BN', name: 'Brunei', region: 'Asia' },
    { code: 'KH', name: 'Cambodia', region: 'Asia' },
    { code: 'CN', name: 'China', region: 'Asia' },
    { code: 'GE', name: 'Georgia', region: 'Asia' },
    { code: 'IN', name: 'India', region: 'Asia' },
    { code: 'ID', name: 'Indonesia', region: 'Asia' },
    { code: 'IR', name: 'Iran', region: 'Asia' },
    { code: 'IQ', name: 'Iraq', region: 'Asia' },
    { code: 'JP', name: 'Japan', region: 'Asia' },
    { code: 'JO', name: 'Jordan', region: 'Asia' },
    { code: 'KZ', name: 'Kazakhstan', region: 'Asia' },
    { code: 'KW', name: 'Kuwait', region: 'Asia' },
    { code: 'KG', name: 'Kyrgyzstan', region: 'Asia' },
    { code: 'LA', name: 'Laos', region: 'Asia' },
    { code: 'LB', name: 'Lebanon', region: 'Asia' },
    { code: 'MY', name: 'Malaysia', region: 'Asia' },
    { code: 'MV', name: 'Maldives', region: 'Asia' },
    { code: 'MN', name: 'Mongolia', region: 'Asia' },
    { code: 'MM', name: 'Myanmar', region: 'Asia' },
    { code: 'NP', name: 'Nepal', region: 'Asia' },
    { code: 'KP', name: 'North Korea', region: 'Asia' },
    { code: 'OM', name: 'Oman', region: 'Asia' },
    { code: 'PK', name: 'Pakistan', region: 'Asia' },
    { code: 'PH', name: 'Philippines', region: 'Asia' },
    { code: 'QA', name: 'Qatar', region: 'Asia' },
    { code: 'SA', name: 'Saudi Arabia', region: 'Asia' },
    { code: 'SG', name: 'Singapore', region: 'Asia' },
    { code: 'KR', name: 'South Korea', region: 'Asia' },
    { code: 'LK', name: 'Sri Lanka', region: 'Asia' },
    { code: 'SY', name: 'Syria', region: 'Asia' },
    { code: 'TW', name: 'Taiwan', region: 'Asia' },
    { code: 'TJ', name: 'Tajikistan', region: 'Asia' },
    { code: 'TH', name: 'Thailand', region: 'Asia' },
    { code: 'TL', name: 'Timor-Leste', region: 'Asia' },
    { code: 'TR', name: 'Turkey', region: 'Asia' },
    { code: 'TM', name: 'Turkmenistan', region: 'Asia' },
    { code: 'AE', name: 'UAE', region: 'Asia' },
    { code: 'UZ', name: 'Uzbekistan', region: 'Asia' },
    { code: 'VN', name: 'Vietnam', region: 'Asia' },
    { code: 'YE', name: 'Yemen', region: 'Asia' },
    
    // Europe
    { code: 'AL', name: 'Albania', region: 'Europe' },
    { code: 'AD', name: 'Andorra', region: 'Europe' },
    { code: 'AT', name: 'Austria', region: 'Europe' },
    { code: 'BY', name: 'Belarus', region: 'Europe' },
    { code: 'BE', name: 'Belgium', region: 'Europe' },
    { code: 'BA', name: 'Bosnia and Herzegovina', region: 'Europe' },
    { code: 'BG', name: 'Bulgaria', region: 'Europe' },
    { code: 'HR', name: 'Croatia', region: 'Europe' },
    { code: 'CY', name: 'Cyprus', region: 'Europe' },
    { code: 'CZ', name: 'Czech Republic', region: 'Europe' },
    { code: 'DK', name: 'Denmark', region: 'Europe' },
    { code: 'EE', name: 'Estonia', region: 'Europe' },
    { code: 'FI', name: 'Finland', region: 'Europe' },
    { code: 'FR', name: 'France', region: 'Europe' },
    { code: 'DE', name: 'Germany', region: 'Europe' },
    { code: 'GR', name: 'Greece', region: 'Europe' },
    { code: 'HU', name: 'Hungary', region: 'Europe' },
    { code: 'IS', name: 'Iceland', region: 'Europe' },
    { code: 'IE', name: 'Ireland', region: 'Europe' },
    { code: 'IT', name: 'Italy', region: 'Europe' },
    { code: 'LV', name: 'Latvia', region: 'Europe' },
    { code: 'LI', name: 'Liechtenstein', region: 'Europe' },
    { code: 'LT', name: 'Lithuania', region: 'Europe' },
    { code: 'LU', name: 'Luxembourg', region: 'Europe' },
    { code: 'MT', name: 'Malta', region: 'Europe' },
    { code: 'MD', name: 'Moldova', region: 'Europe' },
    { code: 'MC', name: 'Monaco', region: 'Europe' },
    { code: 'ME', name: 'Montenegro', region: 'Europe' },
    { code: 'NL', name: 'Netherlands', region: 'Europe' },
    { code: 'MK', name: 'North Macedonia', region: 'Europe' },
    { code: 'NO', name: 'Norway', region: 'Europe' },
    { code: 'PL', name: 'Poland', region: 'Europe' },
    { code: 'PT', name: 'Portugal', region: 'Europe' },
    { code: 'RO', name: 'Romania', region: 'Europe' },
    { code: 'RU', name: 'Russia', region: 'Europe' },
    { code: 'SM', name: 'San Marino', region: 'Europe' },
    { code: 'RS', name: 'Serbia', region: 'Europe' },
    { code: 'SK', name: 'Slovakia', region: 'Europe' },
    { code: 'SI', name: 'Slovenia', region: 'Europe' },
    { code: 'ES', name: 'Spain', region: 'Europe' },
    { code: 'SE', name: 'Sweden', region: 'Europe' },
    { code: 'CH', name: 'Switzerland', region: 'Europe' },
    { code: 'UA', name: 'Ukraine', region: 'Europe' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe' },
    { code: 'VA', name: 'Vatican City', region: 'Europe' },
    
    // North America
    { code: 'AG', name: 'Antigua and Barbuda', region: 'North America' },
    { code: 'BS', name: 'Bahamas', region: 'North America' },
    { code: 'BB', name: 'Barbados', region: 'North America' },
    { code: 'BZ', name: 'Belize', region: 'North America' },
    { code: 'CA', name: 'Canada', region: 'North America' },
    { code: 'CR', name: 'Costa Rica', region: 'North America' },
    { code: 'CU', name: 'Cuba', region: 'North America' },
    { code: 'DM', name: 'Dominica', region: 'North America' },
    { code: 'DO', name: 'Dominican Republic', region: 'North America' },
    { code: 'SV', name: 'El Salvador', region: 'North America' },
    { code: 'GD', name: 'Grenada', region: 'North America' },
    { code: 'GT', name: 'Guatemala', region: 'North America' },
    { code: 'HT', name: 'Haiti', region: 'North America' },
    { code: 'HN', name: 'Honduras', region: 'North America' },
    { code: 'JM', name: 'Jamaica', region: 'North America' },
    { code: 'MX', name: 'Mexico', region: 'North America' },
    { code: 'NI', name: 'Nicaragua', region: 'North America' },
    { code: 'PA', name: 'Panama', region: 'North America' },
    { code: 'KN', name: 'Saint Kitts and Nevis', region: 'North America' },
    { code: 'LC', name: 'Saint Lucia', region: 'North America' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', region: 'North America' },
    { code: 'TT', name: 'Trinidad and Tobago', region: 'North America' },
    { code: 'US', name: 'United States', region: 'North America' },
    
    // South America
    { code: 'AR', name: 'Argentina', region: 'South America' },
    { code: 'BO', name: 'Bolivia', region: 'South America' },
    { code: 'BR', name: 'Brazil', region: 'South America' },
    { code: 'CL', name: 'Chile', region: 'South America' },
    { code: 'CO', name: 'Colombia', region: 'South America' },
    { code: 'EC', name: 'Ecuador', region: 'South America' },
    { code: 'GY', name: 'Guyana', region: 'South America' },
    { code: 'PY', name: 'Paraguay', region: 'South America' },
    { code: 'PE', name: 'Peru', region: 'South America' },
    { code: 'SR', name: 'Suriname', region: 'South America' },
    { code: 'UY', name: 'Uruguay', region: 'South America' },
    { code: 'VE', name: 'Venezuela', region: 'South America' },
    
    // Oceania
    { code: 'AU', name: 'Australia', region: 'Oceania' },
    { code: 'FJ', name: 'Fiji', region: 'Oceania' },
    { code: 'KI', name: 'Kiribati', region: 'Oceania' },
    { code: 'MH', name: 'Marshall Islands', region: 'Oceania' },
    { code: 'FM', name: 'Micronesia', region: 'Oceania' },
    { code: 'NR', name: 'Nauru', region: 'Oceania' },
    { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
    { code: 'PW', name: 'Palau', region: 'Oceania' },
    { code: 'PG', name: 'Papua New Guinea', region: 'Oceania' },
    { code: 'WS', name: 'Samoa', region: 'Oceania' },
    { code: 'SB', name: 'Solomon Islands', region: 'Oceania' },
    { code: 'TO', name: 'Tonga', region: 'Oceania' },
    { code: 'TV', name: 'Tuvalu', region: 'Oceania' },
    { code: 'VU', name: 'Vanuatu', region: 'Oceania' },
  ];
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
    // Get all countries excluding Israel (IL) and Western Sahara (EH)
    const allCountries = getAllCountries();
    
    const countryList: CountryData[] = allCountries.map((country) => ({
      code: country.code.toLowerCase(),
      name: country.name,
      emoji: getCountryEmoji(country.code),
      region: country.region
    }));
    
    // Sort countries alphabetically by name
    countryList.sort((a, b) => a.name.localeCompare(b.name));
    
    setCountries(countryList);
  }, []);
  
  // Update search query when destination country changes
  useEffect(() => {
    if (formData.destinationCountry) {
      const selectedCountry = countries.find(c => c.code === formData.destinationCountry);
      if (selectedCountry) {
        setSearchQuery(selectedCountry.name);
      }
    }
  }, [formData.destinationCountry, countries]);
  
  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    // If search query is empty, return all countries
    if (!searchQuery.trim()) return countries;
    
    // If the search query exactly matches the selected country name,
    // we want to still show other countries with similar names
    const selectedCountry = countries.find(c => c.code === formData.destinationCountry);
    if (selectedCountry && searchQuery === selectedCountry.name) {
      // Return the selected country first, followed by other countries that partially match
      const otherMatches = countries.filter(country => 
        country.code !== formData.destinationCountry && 
        country.name.toLowerCase().includes(searchQuery.toLowerCase().substring(0, 3))
      );
      return [selectedCountry, ...otherMatches];
    }
    
    // Regular filtering
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [countries, searchQuery, formData.destinationCountry]);
  
  // Removed unused getRegionForCountry function after restricting country list

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
      
      const selectedCountry = countries.find(c => c.code === formData.destinationCountry);
      const { data: quotationData, error: insertError } = await supabase
        .from('quotations')
        .insert({
          product_name: formData.productName,
          product_url: formData.productUrl,
          quantity: parseInt(formData.quantity, 10),
          shipping_country: selectedCountry ? selectedCountry.name : '', // Save full country name
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
        })
        .select();
        
      if (insertError) {
        console.error('Insert error details:', insertError);
        throw new Error(`Failed to submit quotation: ${insertError.message}`);
      }

      // Store the generated UUID for reference (if needed in future)
      if (quotationData && quotationData.length > 0) {
        console.log('Generated quotation ID:', quotationData[0].id);
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
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-3xl h-auto mx-auto p-4 sm:p-6">
      {/* Modal header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-[#0D47A1] dark:text-white">Create New Quotation</h2>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Stepper Progress Indicator */}
      <Stepper currentStep={step} steps={["Product Information", "Shipping Information", "Service Details"]} className="mb-6 flex-shrink-0" />

      {/* Form content */}
      <div className="overflow-y-auto custom-scrollbar px-1 py-2 flex-1 min-h-0">
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
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`Product image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
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
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                  Destination Country *
                </label>
                <div className="mb-4">
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      {formData.destinationCountry ? (
                        <span 
                          className="text-xl"
                          style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
                        >
                          {countries.find(c => c.code === formData.destinationCountry)?.emoji}
                        </span>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="w-full pl-11 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          if (formData.destinationCountry) {
                            setFormData({
                              ...formData,
                              destinationCountry: "",
                              shippingMethod: ""
                            });
                          }
                        }}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Country List */}
                  <div className="max-h-[220px] overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600 custom-scrollbar">
                    {filteredCountries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">No countries found</span>
                      </div>
                    ) : (
                      filteredCountries.map((country) => (
                        <div
                          key={country.code}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              destinationCountry: country.code,
                              shippingMethod: ""
                            });
                            setSearchQuery(country.name);
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                            formData.destinationCountry === country.code
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200"
                              : "hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <span 
                            className="text-2xl flex-shrink-0"
                            style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
                          >
                            {country.emoji}
                          </span>
                          <span className="font-medium">{country.name}</span>
                          {formData.destinationCountry === country.code && (
                            <svg className="w-5 h-5 ml-auto text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Country count indicator */}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} {searchQuery && 'found'}
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
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
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
                          : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600 dark:text-white"
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
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-white transition-colors"
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

              {/* Explanatory Text for Service Types */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <div className="font-semibold text-gray-800 dark:text-white mb-1">Sourcing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">“We find and buy the product, then ship it to you.”<br/> <span className="text-xs text-gray-500 dark:text-gray-400">Use this if you want us to be responsible for choosing the supplier for the product and ship the goods.</span></div>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <div className="font-semibold text-gray-800 dark:text-white mb-1">Shipping Only</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">“You already have the product. We just handle the shipping.”<br/> <span className="text-xs text-gray-500 dark:text-gray-400">Use this if you want us to receive the goods from the supplier & ship them to you.</span></div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Sourcing', 'Shipping Only'].map((service) => (
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
                          ? 'border-[#1E88E5] bg-blue-50 text-[#1E88E5] dark:bg-blue-900 dark:text-blue-200'
                          : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600 dark:text-white'
                      }`}
                    >
                      {service}
                    </div>
                  ))}
                </div>
              </div>

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

              <div className="flex justify-between mt-6 gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-white transition-colors"
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
            <div className="flex flex-col items-center py12">
              {/* Removed checkmark icon and circle for minimalist look */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quotation Submitted!</h3>
              <p className="text-base text-gray-600 dark:text-gray-300 mb-6 text-center max-w-md">
                Thank you for your request. Our team is now reviewing your quotation and will get back to you as soon as possible.<br />You will receive a notification once your quote is ready.
              </p>
              <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 w-full max-w-md flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Waiting for supplier prices...</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
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