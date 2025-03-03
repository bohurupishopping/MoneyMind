import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';

type FormData = {
  name: string;
  accountNumber: string;
  accountType: string;
  openingBalance: string;
};

export function NewBankAccountPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountNumber: '',
    accountType: 'checking',
    openingBalance: '0.00',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      newErrors.name = 'Account name is required';
    }
    
    if (!formData.accountType) {
      newErrors.accountType = 'Account type is required';
    }
    
    // Validate opening balance as a valid number
    if (formData.openingBalance) {
      const amount = parseFloat(formData.openingBalance);
      if (isNaN(amount)) {
        newErrors.openingBalance = 'Opening balance must be a valid number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const openingBalance = parseFloat(formData.openingBalance) || 0;
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          business_id: selectedBusiness.id,
          name: formData.name,
          account_number: formData.accountNumber || null,
          account_type: formData.accountType,
          opening_balance: openingBalance,
          current_balance: openingBalance
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      navigate('/banking/accounts');
    } catch (err: any) {
      console.error('Error creating bank account:', err);
      alert('Failed to create bank account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedBusiness) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Please select or create a business to continue.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Add New Account"
        backLink="/banking/accounts"
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <FormRow
            label="Account Name"
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
              placeholder="Primary Checking, Savings, Petty Cash, etc."
            />
          </FormRow>
          
          <FormRow
            label="Account Type"
            htmlFor="accountType"
            error={errors.accountType}
            required
          >
            <select
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.accountType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </FormRow>
          
          <FormRow
            label="Account Number"
            htmlFor="accountNumber"
            hint="Optional - for your reference only"
          >
            <input
              id="accountNumber"
              name="accountNumber"
              type="text"
              value={formData.accountNumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Last 4 digits or full account number"
            />
          </FormRow>
          
          <FormRow
            label="Opening Balance"
            htmlFor="openingBalance"
            error={errors.openingBalance}
            hint="Current balance of this account"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                id="openingBalance"
                name="openingBalance"
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={handleChange}
                className={`pl-8 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.openingBalance ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
          </FormRow>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/banking/accounts')}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}