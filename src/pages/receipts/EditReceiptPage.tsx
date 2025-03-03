import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Debtor, PaymentReceipt, BankAccount, Transaction } from '../../lib/supabase';

type FormData = {
  receiptNumber: string;
  amount: string;
  paymentDate: string;
  debtorId: string;
  paymentMethod: string;
  bankAccountId: string;
  reference: string;
  notes: string;
};

export function EditReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    receiptNumber: '',
    amount: '',
    paymentDate: '',
    debtorId: '',
    paymentMethod: '',
    bankAccountId: '',
    reference: '',
    notes: '',
  });
  
  const [originalData, setOriginalData] = useState<PaymentReceipt | null>(null);
  const [relatedTransaction, setRelatedTransaction] = useState<Transaction | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchReceipt();
      fetchDebtors();
      fetchBankAccounts();
      fetchRelatedTransaction();
    }
  }, [selectedBusiness, id]);
  
  const fetchReceipt = async () => {
    if (!selectedBusiness || !id) return;
    
    setFetchLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalData(data);
        setFormData({
          receiptNumber: data.receipt_number,
          amount: data.amount.toString(),
          paymentDate: new Date(data.payment_date).toISOString().split('T')[0],
          debtorId: data.debtor_id || '',
          paymentMethod: data.payment_method || '',
          bankAccountId: '', // Will be filled in by fetchRelatedTransaction
          reference: data.reference || '',
          notes: data.notes || '',
        });
      } else {
        navigate('/receipts');
      }
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      alert('Failed to load receipt information. Please try again.');
      navigate('/receipts');
    } finally {
      setFetchLoading(false);
    }
  };
  
  const fetchRelatedTransaction = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      // Look for a transaction that references this receipt
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('reference_id', id)
        .eq('type', 'deposit')
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error is expected
          console.error('Error fetching related transaction:', error);
        }
        return;
      }
      
      if (data) {
        setRelatedTransaction(data);
        setFormData(prev => ({
          ...prev,
          bankAccountId: data.account_id
        }));
      }
    } catch (err: any) {
      console.error('Error fetching related transaction:', err);
    }
  };
  
  const fetchDebtors = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('debtors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setDebtors(data || []);
    } catch (err: any) {
      console.error('Error fetching debtors:', err);
    }
  };
  
  const fetchBankAccounts = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setBankAccounts(data || []);
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.receiptNumber.trim()) {
      newErrors.receiptNumber = 'Receipt number is required';
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }
    
    if (!formData.paymentDate.trim()) {
      newErrors.paymentDate = 'Payment date is required';
    }
    
    if (formData.paymentMethod === 'Bank Transfer' && !formData.bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness || !id || !originalData) return;
    
    setLoading(true);
    
    try {
      // Calculate amount difference to update debtor balances
      const oldAmount = Number(originalData.amount);
      const newAmount = parseFloat(formData.amount);
      const amountDifference = newAmount - oldAmount;
      
      // Update receipt
      const { error } = await supabase
        .from('payment_receipts')
        .update({
          receipt_number: formData.receiptNumber,
          amount: newAmount,
          payment_date: formData.paymentDate,
          debtor_id: formData.debtorId || null,
          payment_method: formData.paymentMethod || null,
          reference: formData.reference || null,
          notes: formData.notes || null
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) {
        throw error;
      }
      
      // Handle debtor updates
      const oldDebtorId = originalData.debtor_id;
      const newDebtorId = formData.debtorId;
      
      // If debtor has changed
      if (oldDebtorId !== newDebtorId) {
        // Restore amount to old debtor if there was one
        if (oldDebtorId) {
          const { data: oldDebtor } = await supabase
            .from('debtors')
            .select('outstanding_amount')
            .eq('id', oldDebtorId)
            .single();
            
          if (oldDebtor) {
            const newOutstandingAmount = Number(oldDebtor.outstanding_amount) + oldAmount;
            
            await supabase
              .from('debtors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', oldDebtorId);
          }
        }
        
        // Apply amount to new debtor if there is one
        if (newDebtorId) {
          const { data: newDebtor } = await supabase
            .from('debtors')
            .select('outstanding_amount')
            .eq('id', newDebtorId)
            .single();
            
          if (newDebtor) {
            const newOutstandingAmount = Math.max(0, Number(newDebtor.outstanding_amount) - newAmount);
            
            await supabase
              .from('debtors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', newDebtorId);
          }
        }
      } 
      // If same debtor but amount changed
      else if (oldDebtorId && amountDifference !== 0) {
        const { data: debtor } = await supabase
          .from('debtors')
          .select('outstanding_amount')
          .eq('id', oldDebtorId)
          .single();
          
        if (debtor) {
          // If amount increased, reduce outstanding amount more
          // If amount decreased, increase outstanding amount
          const newOutstandingAmount = Math.max(0, Number(debtor.outstanding_amount) - amountDifference);
          
          await supabase
            .from('debtors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', oldDebtorId);
        }
      }
      
      // Handle bank transaction updates
      // If the payment method is bank transfer and we have a bank account
      if (formData.paymentMethod === 'Bank Transfer' && formData.bankAccountId) {
        let description = `Payment received`;
        if (formData.debtorId) {
          const debtor = debtors.find(d => d.id === formData.debtorId);
          if (debtor) {
            description = `Payment from ${debtor.name}`;
          }
        }
        
        // If there's an existing transaction, update it
        if (relatedTransaction) {
          const { error: transactionError } = await supabase
            .from('transactions')
            .update({
              account_id: formData.bankAccountId,
              amount: newAmount,
              date: formData.paymentDate,
              description: description,
              notes: formData.notes || null
            })
            .eq('id', relatedTransaction.id);
            
          if (transactionError) {
            console.error('Error updating transaction:', transactionError);
          }
        } 
        // Otherwise create a new transaction
        else {
          const transactionNumber = `DEP-${formData.receiptNumber.replace('REC-', '')}`;
          
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              business_id: selectedBusiness.id,
              account_id: formData.bankAccountId,
              transaction_number: transactionNumber,
              type: 'deposit',
              amount: newAmount,
              date: formData.paymentDate,
              description: description,
              category: 'Payment Receipt',
              reference_id: id,
              reconciled: false,
              notes: formData.notes || null
            });
            
          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
          }
        }
      } 
      // If payment method is not bank transfer but there was a transaction, delete it
      else if (relatedTransaction) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', relatedTransaction.id);
          
        if (deleteError) {
          console.error('Error deleting transaction:', deleteError);
        }
      }
      
      navigate(`/receipts/${id}`);
    } catch (err: any) {
      console.error('Error updating receipt:', err);
      alert('Failed to update receipt. Please try again.');
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
        title="Edit Payment Receipt"
        backLink={`/receipts/${id}`}
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormRow
                label="Receipt Number"
                htmlFor="receiptNumber"
                error={errors.receiptNumber}
                required
              >
                <input
                  id="receiptNumber"
                  name="receiptNumber"
                  type="text"
                  value={formData.receiptNumber}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.receiptNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="REC-0001"
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
              </FormRow>
              
              <FormRow
                label="Payment Date"
                htmlFor="paymentDate"
                error={errors.paymentDate}
                required
              >
                <input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormRow>
              
              <FormRow
                label="From Debtor"
                htmlFor="debtorId"
              >
                <select
                  id="debtorId"
                  name="debtorId"
                  value={formData.debtorId}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Debtor (Optional) --</option>
                  {debtors.map(debtor => (
                    <option key={debtor.id} value={debtor.id}>
                      {debtor.name}
                    </option>
                  ))}
                </select>
              </FormRow>
            </div>
            
            <div>
              <FormRow
                label="Payment Method"
                htmlFor="paymentMethod"
              >
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Payment Method --</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Other">Other</option>
                </select>
              </FormRow>
              
              {formData.paymentMethod === 'Bank Transfer' && (
                <FormRow
                  label="Deposit to Account"
                  htmlFor="bankAccountId"
                  error={errors.bankAccountId}
                  required
                >
                  <select
                    id="bankAccountId"
                    name="bankAccountId"
                    value={formData.bankAccountId}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.bankAccountId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select Account --</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                </FormRow>
              )}
              
              <FormRow
                label="Reference"
                htmlFor="reference"
                hint="Check number, transaction ID, etc."
              >
                <input
                  id="reference"
                  name="reference"
                  type="text"
                  value={formData.reference}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Check #123, Invoice #ABC, etc."
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
                  placeholder="Additional notes about this payment"
                />
              </FormRow>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/receipts/${id}`)}
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