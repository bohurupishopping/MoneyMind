import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, BankAccount } from '../../lib/supabase';

type FormData = {
  name: string;
  accountNumber: string;
  accountType: string;
  openingBalance: string;
};

export function EditBankAccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountNumber: '',
    accountType: 'checking',
    openingBalance: '0.00',
  });
  
  const [originalAccount, setOriginalAccount] = useState<BankAccount | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchAccount();
    }
  }, [selectedBusiness, id]);
  
  const fetchAccount = async () => {
    if (!selectedBusiness || !id) return;
    
    setFetchLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalAccount(data);
        setFormData({
          name: data.name,
          accountNumber: data.account_number || '',
          accountType: data.account_type,
          openingBalance: data.opening_balance.toString(),
        });
      } else {
        navigate('/banking/accounts');
      }
    } catch (err: any) {
      console.error('Error fetching account:', err);
      alert('Failed to load account information. Please try again.');
      navigate('/banking/accounts');
    } finally {
      setFetchLoading(false);
    }
  };
  
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
    
    if (!validateForm() || !selectedBusiness || !id || !originalAccount) return;
    
    setLoading(true);
    
    try {
      const newOpeningBalance = parseFloat(formData.openingBalance) || 0;
      const oldOpeningBalance = Number(originalAccount.opening_balance);
      
      // Calculate the adjustment to current balance based on opening balance change
      const openingBalanceChange = newOpeningBalance - oldOpeningBalance;
      const newCurrentBalance = Number(originalAccount.current_balance) + openingBalanceChange;
      
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          name: formData.name,
          account_number: formData.accountNumber || null,
          account_type: formData.accountType,
          opening_balance: newOpeningBalance,
          current_balance: newCurrentBalance
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) {
        throw error;
      }
      
      navigate(`/banking/accounts/${id}`);
    } catch (err: any) {
      console.error('Error updating account:', err);
      alert('Failed to update account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/banking/accounts');
    } catch (err: any) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account. Please try again.');
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
        title="Edit Account"
        backLink={`/banking/accounts/${id}`}
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
            hint="Updating this will adjust the current balance accordingly"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
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
          
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between">
            <div className="mt-4 sm:mt-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2 px-4 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Account
              </button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">
                    Are you sure? This will delete all transactions for this account.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 bg-white text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/banking/accounts/${id}`)}
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
          </div>
        </form>
      </Card>
    </Layout>
  );
}