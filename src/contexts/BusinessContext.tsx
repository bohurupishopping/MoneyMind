import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, Business } from '../lib/supabase';
import { useAuth } from './AuthContext';

type BusinessContextType = {
  businesses: Business[];
  selectedBusiness: Business | null;
  loading: boolean;
  error: string | null;
  fetchBusinesses: () => Promise<void>;
  selectBusiness: (businessId: string) => void;
  createBusiness: (businessData: Partial<Business>) => Promise<{ error: any | null, business: Business | null }>;
  updateBusiness: (businessId: string, businessData: Partial<Business>) => Promise<{ error: any | null }>;
  deleteBusiness: (businessId: string) => Promise<{ error: any | null }>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize fetchBusinesses to prevent unnecessary recreations
  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setBusinesses(data || []);
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch businesses only when user changes
  useEffect(() => {
    if (user) {
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setSelectedBusiness(null);
      setLoading(false);
    }
  }, [user, fetchBusinesses]);

  // Set selected business from localStorage only when businesses change
  useEffect(() => {
    if (businesses.length > 0 && !selectedBusiness) {
      const savedBusinessId = localStorage.getItem('selectedBusinessId');
      
      if (savedBusinessId) {
        const business = businesses.find(b => b.id === savedBusinessId);
        if (business) {
          setSelectedBusiness(business);
          return;
        }
      }
      
      // Default to first business if no saved selection or saved selection not found
      setSelectedBusiness(businesses[0]);
    }
  }, [businesses, selectedBusiness]);

  // Ensure the user has a profile record
  const ensureProfileExists = async () => {
    if (!user) return false;
    
    // Check if the profile exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (error || !data) {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email
        });
        
      return !insertError;
    }
    
    return true;
  };

  const selectBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setSelectedBusiness(business);
      localStorage.setItem('selectedBusinessId', businessId);
    }
  };

  const createBusiness = async (businessData: Partial<Business>) => {
    if (!user) return { error: new Error('User not authenticated'), business: null };
    
    setError(null);
    
    try {
      // Ensure the user has a profile
      const profileExists = await ensureProfileExists();
      if (!profileExists) {
        throw new Error('Failed to create or find user profile');
      }
      
      const newBusiness = {
        ...businessData,
        owner_id: user.id
      };
      
      const { data, error } = await supabase
        .from('businesses')
        .insert(newBusiness)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      setBusinesses(prev => [...prev, data]);
      
      // If this is the first business, select it automatically
      if (businesses.length === 0) {
        setSelectedBusiness(data);
        localStorage.setItem('selectedBusinessId', data.id);
      }
      
      return { error: null, business: data };
    } catch (err: any) {
      console.error('Error creating business:', err);
      setError(err.message);
      return { error: err, business: null };
    }
  };

  const updateBusiness = async (businessId: string, businessData: Partial<Business>) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', businessId);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setBusinesses(prev => 
        prev.map(b => b.id === businessId ? { ...b, ...businessData } : b)
      );
      
      // Update selected business if it's the one being edited
      if (selectedBusiness?.id === businessId) {
        setSelectedBusiness(prev => prev ? { ...prev, ...businessData } : null);
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('Error updating business:', err);
      setError(err.message);
      return { error: err };
    }
  };

  const deleteBusiness = async (businessId: string) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setBusinesses(prev => prev.filter(b => b.id !== businessId));
      
      // If we deleted the selected business, select another one
      if (selectedBusiness?.id === businessId) {
        const remainingBusinesses = businesses.filter(b => b.id !== businessId);
        if (remainingBusinesses.length > 0) {
          setSelectedBusiness(remainingBusinesses[0]);
          localStorage.setItem('selectedBusinessId', remainingBusinesses[0].id);
        } else {
          setSelectedBusiness(null);
          localStorage.removeItem('selectedBusinessId');
        }
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting business:', err);
      setError(err.message);
      return { error: err };
    }
  };

  const value = useMemo(() => ({
    businesses,
    selectedBusiness,
    loading,
    error,
    fetchBusinesses,
    selectBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness
  }), [
    businesses,
    selectedBusiness,
    loading,
    error,
    fetchBusinesses,
    selectBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness
  ]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}