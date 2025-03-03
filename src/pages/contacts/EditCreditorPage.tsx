import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AtSign, Phone, MapPin, AlertCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor } from '../../lib/supabase';

type FormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  outstandingAmount: string;
};

export function EditCreditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    outstandingAmount: '0.00',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchCreditor();
    }
  }, [selectedBusiness, id]);
  
  const fetchCreditor = async () => {
    if (!selectedBusiness || !id) return;
    
    setFetchLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setFormData({
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          outstandingAmount: data.outstanding_amount?.toString() || '0.00',
        });
      } else {
        navigate('/contacts/creditors');
      }
    } catch (err: any) {
      console.error('Error fetching creditor:', err);
      alert('Failed to load creditor information. Please try again.');
      navigate('/contacts/creditors');
    } finally {
      setFetchLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }
    
    // Validate outstanding amount as a valid number
    if (formData.outstandingAmount) {
      const amount = parseFloat(formData.outstandingAmount);
      if (isNaN(amount) || amount < 0) {
        newErrors.outstandingAmount = 'Outstanding amount must be a valid positive number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness || !id) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('creditors')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          outstanding_amount: parseFloat(formData.outstandingAmount) || 0
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) {
        throw error;
      }
      
      navigate(`/contacts/creditors/${id}`);
    } catch (err: any) {
      console.error('Error updating creditor:', err);
      alert('Failed to update creditor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Edit Creditor"
        backLink={`/contacts/creditors/${id}`}
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <FormRow
            label="Name"
            htmlFor="name"
            error={errors.name}
            required
          >
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Individual or Company Name"
            />
          </FormRow>
          
          <FormRow
            label="Email"
            htmlFor="email"
            error={errors.email}
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AtSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`pl-10 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contact@example.com"
              />
            </div>
          </FormRow>
          
          <FormRow
            label="Phone"
            htmlFor="phone"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </FormRow>
          
          <FormRow
            label="Address"
            htmlFor="address"
          >
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="address"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </FormRow>
          
          <FormRow
            label="Outstanding Amount"
            htmlFor="outstandingAmount"
            error={errors.outstandingAmount}
            hint="The current amount you owe this creditor"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="outstandingAmount"
                name="outstandingAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.outstandingAmount}
                onChange={handleChange}
                className={`pl-8 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.outstandingAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
          </FormRow>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/contacts/creditors/${id}`)}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}