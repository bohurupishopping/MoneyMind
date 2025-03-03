import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, AlertCircle } from 'lucide-react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';

type FormData = {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
};

export function EditBusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { businesses, updateBusiness, deleteBusiness } = useBusiness();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (id) {
      const business = businesses.find(b => b.id === id);
      if (business) {
        setFormData({
          businessName: business.name,
          address: business.address || '',
          phone: business.phone || '',
          email: business.email || '',
          taxId: business.tax_id || '',
        });
      } else {
        navigate('/dashboard');
      }
    }
  }, [id, businesses, navigate]);
  
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
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !id) return;
    
    setLoading(true);
    
    try {
      const { error } = await updateBusiness(id, {
        name: formData.businessName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        tax_id: formData.taxId
      });
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error updating business:', err);
      alert('Failed to update business. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    setLoading(true);
    
    try {
      const { error } = await deleteBusiness(id);
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error deleting business:', err);
      alert('Failed to delete business. Please try again.');
    } finally {
      setLoading(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Edit Business"
        backLink="/dashboard"
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <FormRow
            label="Business Name"
            htmlFor="businessName"
            error={errors.businessName}
            required
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleChange}
                className={`pl-10 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.businessName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Your Business Name"
              />
            </div>
          </FormRow>
          
          <FormRow
            label="Business Email"
            htmlFor="email"
            error={errors.email}
          >
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="contact@yourbusiness.com"
            />
          </FormRow>
          
          <FormRow
            label="Business Phone"
            htmlFor="phone"
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+1 (555) 123-4567"
            />
          </FormRow>
          
          <FormRow
            label="Business Address"
            htmlFor="address"
          >
            <textarea
              id="address"
              name="address"
              rows={2}
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="123 Business St, City, State, ZIP"
            />
          </FormRow>
          
          <FormRow
            label="Tax ID / Registration Number"
            htmlFor="taxId"
          >
            <input
              id="taxId"
              name="taxId"
              type="text"
              value={formData.taxId}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tax ID or Registration Number"
            />
          </FormRow>
          
          <div className="mt-6 flex flex-col sm:flex-row justify-between">
            <div>
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="py-2 px-4 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Business
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="py-2 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-4 sm:mt-0">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="mr-4 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          </div>
        </form>
      </Card>
    </Layout>
  );
}