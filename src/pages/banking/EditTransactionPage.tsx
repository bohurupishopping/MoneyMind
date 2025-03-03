import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Transaction, BankAccount } from '../../lib/supabase';

type FormData = {
  type: 'deposit' | 'withdrawal' | 'transfer';
  accountId: string;
  transactionNumber: string;
  amount: string;
  date: string;
  description: string;
  category: string;
  reconciled: boolean;
  notes: string;
};

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    type: 'deposit',
    accountId: '',
    transactionNumber: '',
    amount: '',
    date: '',
    description: '',
    category: '',
    reconciled: false,
    notes: ''
  });
  
  const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchAccounts();
      fetchTransaction();
    }
  }, [selectedBusiness, id]);
  
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
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
    }
  };
  
  const fetchTransaction = async () => {
    if (!selectedBusiness || !id) return;
    
    setFetchLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalTransaction(data);
        setFormData({
          type: data.type as 'deposit' | 'withdrawal' | 'transfer',
          accountId: data.account_id,
          transactionNumber: data.transaction_number,
          amount: data.amount.toString(),
          date: new Date(data.date).toISOString().split('T')[0],
          description: data.description || '',
          category: data.category || '',
          reconciled: data.reconciled,
          notes: data.notes || ''
        });
      } else {
        navigate('/banking/transactions');
      }
    } catch (err: any) {
      console.error('Error fetching transaction:', err);
      alert('Failed to load transaction. Please try again.');
      navigate('/banking/transactions');
    } finally {
      setFetchLoading(false);
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
  
  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
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
    
    if (!validateForm() || !selectedBusiness || !id || !originalTransaction) return;
    
    setLoading(true);
    
    try {
      const amount = parseFloat(formData.amount);
      
      // Update the transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          account_id: formData.accountId,
          transaction_number: formData.transactionNumber,
          amount,
          date: formData.date,
          description: formData.description,
          category: formData.category || null,
          reconciled: formData.reconciled,
          notes: formData.notes || null
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (updateError) throw updateError;
      
      // Special handling for transfers if this transaction has a reference_id
      if (originalTransaction.reference_id) {
        // This is the second part of a transfer, update the first part too
        const { error: referenceError } = await supabase
          .from('transactions')
          .update({
            date: formData.date,
            category: formData.category || null,
            reconciled: formData.reconciled,
            notes: formData.notes || null
          })
          .eq('id', originalTransaction.reference_id);
          
        if (referenceError) {
          console.error('Error updating reference transaction:', referenceError);
          // Continue anyway as the main transaction was updated successfully
        }
      }
      
      // If this transaction has a paired transfer transaction (it's the source of a transfer)
      const { data: linkedTransactions, error: linkedError } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference_id', id);
        
      if (!linkedError && linkedTransactions && linkedTransactions.length > 0) {
        // Update the linked transactions with matching details
        const { error: linkedUpdateError } = await supabase
          .from('transactions')
          .update({
            amount,
            date: formData.date,
            category: formData.category || null,
            reconciled: formData.reconciled,
            notes: formData.notes || null
          })
          .eq('reference_id', id);
          
        if (linkedUpdateError) {
          console.error('Error updating linked transaction:', linkedUpdateError);
          // Continue anyway as the main transaction was updated successfully
        }
      }
      
      navigate('/banking/transactions');
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id || !originalTransaction) return;
    
    try {
      // If this is part of a transfer, we need to delete both sides
      if (originalTransaction.reference_id) {
        // This is the second part of a transfer, delete the first part too
        await supabase
          .from('transactions')
          .delete()
          .eq('id', originalTransaction.reference_id);
      }
      
      // Check if this transaction has a paired transfer transaction
      const { data: linkedTransactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference_id', id);
        
      if (linkedTransactions && linkedTransactions.length > 0) {
        // Delete the linked transactions
        await supabase
          .from('transactions')
          .delete()
          .eq('reference_id', id);
      }
      
      // Delete the main transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/banking/transactions');
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction. Please try again.');
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

  // Find selected account for balance check
  const selectedAccount = accounts.find(a => a.id === formData.accountId);

  return (
    <Layout>
      <PageHeader
        title="Edit Transaction"
        backLink="/banking/transactions"
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          {/* Transaction Type Display */}
          <div className="mb-6">
            <div className="flex items-center">
              <div 
                className={`py-2 px-4 font-medium text-sm ${
                  formData.type === 'deposit' 
                    ? 'text-green-600' 
                    : formData.type === 'withdrawal'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}
              >
                <span className="flex items-center">
                  {formData.type === 'deposit' && <ArrowDownRight className="h-4 w-4 mr-1" />}
                  {formData.type === 'withdrawal' && <ArrowUpRight className="h-4 w-4 mr-1" />}
                  {formData.type === 'transfer' && <RefreshCw className="h-4 w-4 mr-1" />}
                  {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-500 ml-2">
                (Transaction type cannot be changed)
              </div>
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormRow
                label="Account"
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
                      {account.name} (Balance: ${Number(account.current_balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </FormRow>
              
              <FormRow
                label="Transaction Number"
                htmlFor="transactionNumber"
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
                 parseFloat(formData.amount || '0') > Number(selectedAccount.current_balance) + Number(originalTransaction?.amount || 0) && (
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
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between">
            <div className="mt-4 sm:mt-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2 px-4 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Transaction
              </button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">
                    Are you sure you want to delete this transaction?
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
                onClick={() => navigate('/banking/transactions')}
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