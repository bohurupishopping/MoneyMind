import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, BankAccount } from '../../lib/supabase';

type FormData = {
  type: 'deposit' | 'withdrawal' | 'transfer';
  accountId: string;
  toAccountId: string;
  transactionNumber: string;
  amount: string;
  date: string;
  description: string;
  category: string;
  reconciled: boolean;
  notes: string;
};

type LocationState = {
  accountId?: string;
  type?: 'deposit' | 'withdrawal' | 'transfer';
};

export function NewTransactionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as LocationState || {};
  
  const [formData, setFormData] = useState<FormData>({
    type: locationState.type || 'deposit',
    accountId: locationState.accountId || '',
    toAccountId: '',
    transactionNumber: '',
    amount: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
    category: '',
    reconciled: false,
    notes: ''
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [nextTransactionNumber, setNextTransactionNumber] = useState('');
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchAccounts();
      generateTransactionNumber();
    }
  }, [selectedBusiness, formData.type]);
  
  const fetchAccounts = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setAccounts(data || []);
      
      // Set default account if it was passed from another page and exists
      if (locationState.accountId && !formData.accountId) {
        const accountExists = data?.some(account => account.id === locationState.accountId);
        if (accountExists) {
          setFormData(prev => ({ ...prev, accountId: locationState.accountId || '' }));
        }
      }
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
    }
  };
  
  const generateTransactionNumber = async () => {
    if (!selectedBusiness) return;
    
    try {
      const prefixMap = {
        deposit: 'DEP',
        withdrawal: 'WIT',
        transfer: 'TRF'
      };
      
      const prefix = prefixMap[formData.type];
      
      // Get the highest transaction number with this prefix
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_number')
        .eq('business_id', selectedBusiness.id)
        .ilike('transaction_number', `${prefix}-%`)
        .order('transaction_number', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      let nextNumber = 1;
      
      if (data && data.length > 0 && data[0].transaction_number) {
        // Extract number from PREFIX-XXXX format
        const match = data[0].transaction_number.match(new RegExp(`${prefix}-(\\d+)`));
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Format with leading zeros
      const transactionNumber = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
      setNextTransactionNumber(transactionNumber);
      
      setFormData(prev => ({ ...prev, transactionNumber }));
    } catch (err: any) {
      console.error('Error generating transaction number:', err);
      // Use a fallback with timestamp
      const prefix = formData.type.substring(0, 3).toUpperCase();
      const timestamp = new Date().getTime().toString().slice(-6);
      const fallbackNumber = `${prefix}-${timestamp}`;
      
      setNextTransactionNumber(fallbackNumber);
      setFormData(prev => ({ ...prev, transactionNumber: fallbackNumber }));
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleTypeChange = (type: 'deposit' | 'withdrawal' | 'transfer') => {
    setFormData(prev => ({ ...prev, type }));
  };
  
  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
    }
    
    if (formData.type === 'transfer' && !formData.toAccountId) {
      newErrors.toAccountId = 'Destination account is required';
    }
    
    if (formData.type === 'transfer' && formData.accountId === formData.toAccountId) {
      newErrors.toAccountId = 'Source and destination accounts must be different';
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }
    
    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const amount = parseFloat(formData.amount);
      
      // Create the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: selectedBusiness.id,
          account_id: formData.accountId,
          transaction_number: formData.transactionNumber,
          type: formData.type,
          amount,
          date: formData.date,
          description: formData.description,
          category: formData.category || null,
          reconciled: formData.reconciled,
          notes: formData.notes || null
        })
        .select()
        .single();
        
      if (transactionError) throw transactionError;
      
      // If this is a transfer, also create the corresponding transaction in the destination account
      if (formData.type === 'transfer' && formData.toAccountId) {
        const { error: transferError } = await supabase
          .from('transactions')
          .insert({
            business_id: selectedBusiness.id,
            account_id: formData.toAccountId,
            reference_id: transaction.id, // Reference to the original transaction
            transaction_number: `TRF-TO-${formData.transactionNumber.replace('TRF-', '')}`,
            type: 'deposit',
            amount,
            date: formData.date,
            description: `Transfer from ${accounts.find(a => a.id === formData.accountId)?.name || 'account'}`,
            category: formData.category || null,
            reconciled: formData.reconciled,
            notes: formData.notes || null
          });
          
        if (transferError) throw transferError;
      }
      
      // Go back to the account page if we came from there, otherwise to the transactions list
      if (locationState.accountId) {
        navigate(`/banking/accounts/${locationState.accountId}`);
      } else {
        navigate('/banking/transactions');
      }
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      alert('Failed to create transaction. Please try again.');
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

  // Find selected account for balance check
  const selectedAccount = accounts.find(a => a.id === formData.accountId);

  return (
    <Layout>
      <PageHeader
        title="Record New Transaction"
        backLink={locationState.accountId ? `/banking/accounts/${locationState.accountId}` : "/banking/transactions"}
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          {/* Transaction Type Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  formData.type === 'deposit' 
                    ? 'border-green-500 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTypeChange('deposit')}
              >
                <span className="flex items-center">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Deposit
                </span>
              </button>
              
              <button
                type="button"
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  formData.type === 'withdrawal' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTypeChange('withdrawal')}
              >
                <span className="flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Withdrawal
                </span>
              </button>
              
              <button
                type="button"
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  formData.type === 'transfer' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTypeChange('transfer')}
              >
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Transfer
                </span>
              </button>
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormRow
                label={formData.type === 'transfer' ? 'From Account' : 'Account'}
                htmlFor="accountId"
                error={errors.accountId}
                required
              >
                <select
                  id="accountId"
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.accountId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} (Balance: ₹{Number(account.current_balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </FormRow>
              
              {formData.type === 'transfer' && (
                <FormRow
                  label="To Account"
                  htmlFor="toAccountId"
                  error={errors.toAccountId}
                  required
                >
                  <select
                    id="toAccountId"
                    name="toAccountId"
                    value={formData.toAccountId}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.toAccountId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select Destination Account --</option>
                    {accounts
                      .filter(account => account.id !== formData.accountId)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </FormRow>
              )}
              
              <FormRow
                label="Transaction Number"
                htmlFor="transactionNumber"
                hint="Auto-generated, you can modify if needed"
              >
                <input
                  id="transactionNumber"
                  name="transactionNumber"
                  type="text"
                  value={formData.transactionNumber}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </FormRow>
              
              <FormRow
                label="Amount"
                htmlFor="amount"
                error={errors.amount}
                required
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    className={`pl-8 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                
                {/* Show warning if withdrawal amount exceeds balance */}
                {(formData.type === 'withdrawal' || formData.type === 'transfer') && 
                 selectedAccount && 
                 parseFloat(formData.amount || '0') > Number(selectedAccount.current_balance) && (
                  <p className="mt-1 text-sm text-yellow-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Warning: This will overdraw the account
                  </p>
                )}
              </FormRow>
            </div>
            
            <div>
              <FormRow
                label="Date"
                htmlFor="date"
                error={errors.date}
                required
              >
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormRow>
              
              <FormRow
                label="Description"
                htmlFor="description"
                error={errors.description}
                required
              >
                <input
                  id="description"
                  name="description"
                  type="text"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Rent payment, Client deposit, etc."
                />
              </FormRow>
              
              <FormRow
                label="Category"
                htmlFor="category"
                hint="Optional - helps with reporting"
              >
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Rent, Utilities, Sales, etc."
                />
              </FormRow>
              
              <FormRow
                label="Notes"
                htmlFor="notes"
              >
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional details about this transaction"
                />
              </FormRow>
            </div>
          </div>
          
          <div className="mt-4 mb-6">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="reconciled"
                checked={formData.reconciled}
                onChange={(e) => setFormData(prev => ({ ...prev, reconciled: e.target.checked }))}
                className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Mark as reconciled</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(locationState.accountId ? `/banking/accounts/${locationState.accountId}` : "/banking/transactions")}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}