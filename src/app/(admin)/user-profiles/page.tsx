"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import Image from "next/image";

// Define the Profile interface based on your database schema
interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null; // Frontend only
  phone: string | null; // Changed from phone_number to match DB
  country: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  updated_at: string | null;
  role: string | null;
  approve: boolean;
  first_name?: string | null;
  last_name?: string | null;
}

export default function UserProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  
  // Editing states
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Fetch all profile records from Supabase
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all profiles without pagination/limit (similar to shipment-tracking)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching profiles:", error);
          setError(`Failed to load profiles: ${error.message}`);
          return;
        }
        
        if (!data || data.length === 0) {
          setProfiles([]);
          setFilteredProfiles([]);
          return;
        }
        
        console.log(`Successfully fetched ${data.length} profile records`);
        setProfiles(data);
        setFilteredProfiles(data);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred while fetching profiles");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfiles();
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProfiles(profiles);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(profile => 
      (profile.id && profile.id.toLowerCase().includes(query)) ||
      (profile.full_name && profile.full_name.toLowerCase().includes(query)) ||
      (profile.email && profile.email.toLowerCase().includes(query)) ||
      (profile.phone && profile.phone.toLowerCase().includes(query)) ||
      (profile.country && profile.country.toLowerCase().includes(query)) ||
      (profile.city && profile.city.toLowerCase().includes(query)) ||
      (profile.role && profile.role.toLowerCase().includes(query))
    );
    
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle approve status
  const handleToggleApprove = async (profile: Profile) => {
    if (!profile?.id) return;
    setApproveLoadingId(profile.id);
    setApproveError(null);
    try {
      const nextApprove = !profile.approve;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ approve: nextApprove, updated_at: new Date().toISOString() } as never)
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update approval');
      }

      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, approve: nextApprove, updated_at: new Date().toISOString() } : p));
      setFilteredProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, approve: nextApprove, updated_at: new Date().toISOString() } : p));
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Failed to update approval');
    } finally {
      setApproveLoadingId(null);
    }
  };

  // Refresh data function
  const refreshData = () => {
    setLoading(true);
    setSearchQuery("");
    
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error refreshing profiles:", error);
          setError(`Failed to refresh: ${error.message}`);
        } else if (data) {
          console.log(`Refreshed with ${data.length} profile records`);
          setProfiles(data);
          setFilteredProfiles(data);
        }
        setLoading(false);
      });
  };

  // Start editing a profile
  const handleEditProfile = (profile: Profile) => {
    setEditMode(profile.id);
    setEditedProfile({
      full_name: profile.full_name,
      phone: profile.phone || "",
      country: profile.country || "",
      address: profile.address || "",
      role: profile.role || ""
    });
    setSaveError(null);
  };

  // Handle input changes for editing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save edited profile
  const handleSaveProfile = async (profileId: string) => {
    if (!editedProfile || !profileId) {
      setSaveError("Invalid profile data");
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Create a clean update object with only modified fields
      const updateData: Partial<Profile> = {};
      
      // Only include fields that are not empty or undefined
      if (editedProfile.full_name) updateData.full_name = editedProfile.full_name;
      if (editedProfile.phone !== undefined) updateData.phone = editedProfile.phone;
      if (editedProfile.country !== undefined) updateData.country = editedProfile.country;
      if (editedProfile.address !== undefined) updateData.address = editedProfile.address;
      if (editedProfile.role !== undefined) updateData.role = editedProfile.role;
      
      // Add the updated_at field
      updateData.updated_at = new Date().toISOString();
      
      // Check if we have data to update
      if (Object.keys(updateData).length === 0) {
        setEditMode(null);
        return;
      }
      
      console.log("Updating profile with data:", updateData);
      
      // First, just update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData as never)
        .eq('id', profileId);
      
      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw new Error(updateError.message || "Failed to update profile");
      }
      
      // Then fetch the updated profile data
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching updated profile:", fetchError);
        throw new Error(fetchError.message || "Failed to retrieve updated profile");
      }
      
      if (!fetchedProfile) {
        throw new Error("Could not retrieve updated profile");
      }
      
      console.log("Profile updated successfully:", fetchedProfile);
      
      // Update local state with the freshly fetched data
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId ? fetchedProfile : profile
        )
      );
      
      setFilteredProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId ? fetchedProfile : profile
        )
      );
      
      setEditMode(null);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditMode(null);
    setEditedProfile({});
    setSaveError(null);
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-teal-500'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-full p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-[#0D47A1] dark:text-white/90">
          User Profiles Management
        </h1>
        
        <Button 
          onClick={refreshData} 
          disabled={loading} 
          className="bg-[#1E88E5] hover:bg-[#0D47A1] text-white transition-all duration-300 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>Refresh</span>
            </div>
          )}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-8 w-full">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#0D47A1] dark:text-white/90 mb-1">
                User Profiles
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {filteredProfiles.length} {searchQuery ? 'matched' : ''} records found
              </p>
            </div>
            
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-[#1E88E5] transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm"
              />
              <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="m-6 p-4 bg-red-50 text-red-700 rounded-lg dark:bg-red-900/10 dark:text-red-400 border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>{error}</p>
            </div>
            <Button onClick={refreshData} variant="outline" className="mt-2 ml-8 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
              Try Again
            </Button>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-t-[#1E88E5] border-r-transparent border-b-[#1E88E5] border-l-transparent"></div>
              <p className="mt-3 text-gray-600 dark:text-gray-400">Loading profile records...</p>
            </div>
          </div>
        ) : (
          filteredProfiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M17.5 20h0"></path>
                  <path d="M3 20h7.5"></path>
                  <path d="M15 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"></path>
                  <path d="M21.27 20H15"></path>
                  <path d="M3 12h7.5"></path>
                  <path d="M21.32 12h-5.97"></path>
                  <path d="M13.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"></path>
                  <path d="M21.34 4h-7.5"></path>
                  <path d="M3 4h7.5"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No profiles found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {searchQuery ? 'No profiles match your search criteria. Try adjusting your search terms.' : 'No profile records found in the system.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <div className="p-4">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[20%]">User Info</TableCell>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[20%]">Email</TableCell>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[12%]">Phone</TableCell>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[12%]">Location</TableCell>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[12%]">Created</TableCell>
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[12%]">Approval</TableCell>
                      {editMode && (
                        <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[10%]">Role</TableCell>
                      )}
                      <TableCell className="font-medium text-gray-600 text-sm dark:text-gray-300 py-5 px-6 w-[14%] text-right">Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow 
                        key={profile.id} 
                        className={`border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ${
                          editMode === profile.id 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <TableCell className="py-5 px-6">
                          {editMode === profile.id ? (
                            <input
                              name="full_name"
                              value={editedProfile.full_name || ""}
                              onChange={handleInputChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Full Name"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              {profile.avatar_url ? (
                                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                  <Image 
                                    src={profile.avatar_url} 
                                    alt={profile.full_name || "User"}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getRandomColor(profile.full_name || profile.id)}`}>
                                  <span className="text-sm font-medium">{getInitials(profile.full_name)}</span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">{profile.full_name || 'Unnamed User'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{profile.id}</div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-gray-700 dark:text-gray-300">
                          {/* Email is not editable */}
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                            </svg>
                            <span>{profile.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          {editMode === profile.id ? (
                            <input
                              name="phone"
                              value={editedProfile.phone || ""}
                              onChange={handleInputChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Phone Number"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              <span>{profile.phone || '-'}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          {editMode === profile.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                name="country"
                                value={editedProfile.country || ""}
                                onChange={handleInputChange}
                                placeholder="Country"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                              <span>{profile.country || '-'}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{formatDate(profile.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <Badge 
                              color={profile.approve ? 'success' : 'error'}
                              size="sm"
                            >
                              {profile.approve ? 'Approved' : 'Not Approved'}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleToggleApprove(profile)}
                              disabled={approveLoadingId === profile.id}
                              className={`${profile.approve ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'} dark:border-gray-600`}
                              variant="outline"
                            >
                              {approveLoadingId === profile.id ? 'Saving...' : (profile.approve ? 'Revoke' : 'Approve')}
                            </Button>
                          </div>
                        </TableCell>
                        {editMode && (
                          <TableCell className="py-5 px-6">
                            {editMode === profile.id ? (
                              <select
                                name="role"
                                value={editedProfile.role || ""}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E88E5] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                <option value="">Select Role</option>
                                <option value="admin">Admin</option>
                                <option value="client">Client</option>
                              </select>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="py-5 px-6 text-right">
                          {editMode === profile.id ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleSaveProfile(profile.id)}
                                disabled={isSaving}
                                className="bg-[#1E88E5] hover:bg-[#0D47A1] text-white"
                                size="sm"
                              >
                                {isSaving ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving</span>
                                  </div>
                                ) : (
                                  <span>Save</span>
                                )}
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                variant="outline"
                                size="sm"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleEditProfile(profile)}
                              size="sm"
                              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                            >
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                                  <path d="m15 5 4 4"></path>
                                </svg>
                                <span>Edit</span>
                              </div>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        )}
        
        {saveError && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            </div>
          </div>
        )}
        {approveError && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{approveError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
 