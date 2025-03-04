import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreditCard, DollarSign, User, FileText } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor, Payment, BankAccount, Transaction, Bill } from '../../lib/supabase';

type FormData = {
  paymentNumber: string;
  amount: string;
  paymentDate: string;
  creditorId: string;
  billId: string;
  bankAccountId: string;
  reference: string;
  notes: string;
  createBankTransaction: boolean;
};

export function EditPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [formData, setFormData] = useState<FormData>({
    paymentNumber: '',
    amount: '',
    paymentDate: '',
    creditorId: '',
    billId: '',
    bankAccountId: '',
    reference: '',
    notes: '',
    createBankTransaction: false
  });
  
  const [originalData, setOriginalData] = useState<Payment | null>(null);
  const [relatedTransaction, setRelatedTransaction] = useState<Transaction | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPayment();
      fetchCreditors();
      fetchBankAccounts();
      fetchRelatedTransaction();
    }
  }, [selectedBusiness, id]);

  useEffect(() => {
    if (selectedBusiness && formData.creditorId) {
      fetchBillsForCreditor(formData.creditorId);
    } else {
      setBills([]);
    }
  }, [selectedBusiness, formData.creditorId]);

  const fetchBillsForCreditor = async (creditorId: string) => {
    if (!selectedBusiness || !creditorId) return;
    
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('creditor_id', creditorId)
        .eq('status', 'PENDING')
        .order('issue_date', { ascending: false });
        
      if (error) throw error;
      
      setBills(data || []);
    } catch (err: any) {
      console.error('Error fetching bills:', err);
    }
  };
  
  const fetchPayment = async () => {
    if (!selectedBusiness || !id) return;
    
    setFetchLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setOriginalData(data);
        setFormData({
          paymentNumber: data.payment_number,
          amount: data.amount.toString(),
          paymentDate: new Date(data.payment_date).toISOString().split('T')[0],
          creditorId: data.creditor_id || '',
          billId: data.bill_id || '',
          bankAccountId: '', // Will be filled by fetchRelatedTransaction
          reference: data.reference || '',
          notes: data.notes || '',
          createBankTransaction: data.payment_method === 'Bank Transfer'
        });
      } else {
        navigate('/payments');
      }
    } catch (err: any) {
      console.error('Error fetching payment:', err);
      alert('Failed to load payment information. Please try again.');
      navigate('/payments');
    } finally {
      setFetchLoading(false);
    }
  };
  
  const fetchRelatedTransaction = async () => {
    if (!selectedBusiness || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('reference_id', id)
        .eq('type', 'withdrawal')
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
          bankAccountId: data.account_id,
          createBankTransaction: true
        }));
      }
    } catch (err: any) {
      console.error('Error fetching related transaction:', err);
    }
  };
  
  const fetchCreditors = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setCreditors(data || []);
    } catch (err: any) {
      console.error('Error fetching creditors:', err);
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
    const newErrors: Partial<FormData> = {};
    
    if (!formData.paymentNumber.trim()) {
      newErrors.paymentNumber = 'Payment number is required';
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
    
    if (formData.createBankTransaction && !formData.bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account or uncheck "Create bank transaction"';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness || !id || !originalData) return;
    
    setLoading(true);
    
    try {
      // Calculate amount difference to update creditor balances
      const oldAmount = Number(originalData.amount);
      const newAmount = parseFloat(formData.amount);
      const amountDifference = newAmount - oldAmount;
      
      // Update payment
      const { error } = await supabase
        .from('payments')
        .update({
          payment_number: formData.paymentNumber,
          amount: newAmount,
          payment_date: formData.paymentDate,
          creditor_id: formData.creditorId || null,
          bill_id: formData.billId || null,
          bank_account_id: formData.createBankTransaction ? formData.bankAccountId : null,
          payment_method: formData.createBankTransaction ? 'Bank Transfer' : 'Other',
          reference: formData.reference || null,
          notes: formData.notes || null
        })
        .eq('id', id)
        .eq('business_id', selectedBusiness.id);
        
      if (error) {
        throw error;
      }
      
      // Handle creditor updates
      const oldCreditorId = originalData.creditor_id;
      const newCreditorId = formData.creditorId;
      
      // If creditor has changed
      if (oldCreditorId !== newCreditorId) {
        // Add amount back to old creditor if there was one
        if (oldCreditorId) {
          const { data: oldCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', oldCreditorId)
            .single();
            
          if (oldCreditor) {
            const newOutstandingAmount = Number(oldCreditor.outstanding_amount) + oldAmount;
            
            await supabase
              .from('creditors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', oldCreditorId);
          }
        }
        
        // Subtract amount from new creditor if there is one
        if (newCreditorId) {
          const { data: newCreditor } = await supabase
            .from('creditors')
            .select('outstanding_amount')
            .eq('id', newCreditorId)
            .single();
            
          if (newCreditor) {
            const newOutstandingAmount = Math.max(0, Number(newCreditor.outstanding_amount) - newAmount);
            
            await supabase
              .from('creditors')
              .update({ outstanding_amount: newOutstandingAmount })
              .eq('id', newCreditorId);
          }
        }
      } 
      // If same creditor but amount changed
      else if (oldCreditorId && amountDifference !== 0) {
        const { data: creditor } = await supabase
          .from('creditors')
          .select('outstanding_amount')
          .eq('id', oldCreditorId)
          .single();
          
        if (creditor) {
          const newOutstandingAmount = Math.max(0, Number(creditor.outstanding_amount) - amountDifference);
          
          await supabase
            .from('creditors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', oldCreditorId);
        }
      }
      
      // Handle bank transaction updates
      if (formData.createBankTransaction && formData.bankAccountId) {
        let description = `Payment made`;
        if (formData.creditorId) {
          const creditor = creditors.find(c => c.id === formData.creditorId);
          if (creditor) {
            description = `Payment to ${creditor.name}`;
          }
        }

        if (formData.billId) {
          description += ` for bill ${bills.find(b => b.id === formData.billId)?.bill_number || ''}`;
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
          const transactionNumber = `WIT-${formData.paymentNumber.replace('PAY-', '')}`;
          
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              business_id: selectedBusiness.id,
              account_id: formData.bankAccountId,
              transaction_number: transactionNumber,
              type: 'withdrawal',
              amount: newAmount,
              date: formData.paymentDate,
              description: description,
              category: 'Payment',
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
      
      navigate(`/payments/${id}`);
    } catch (err: any) {
      console.error('Error updating payment:', err);
      alert('Failed to update payment. Please try again.');
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
        title="Edit Payment"
        backLink={`/payments/${id}`}
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormRow
                label="Payment Number"
                htmlFor="paymentNumber"
                error={errors.paymentNumber}
                required
              >
                <input
                  id="paymentNumber"
                  name="paymentNumber"
                  type="text"
                  value={formData.paymentNumber}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.paymentNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="PAY-0001"
                />
              </FormRow>
              
              <FormRow
                label="To Creditor"
                htmlFor="creditorId"
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    id="creditorId"
                    name="creditorId"
                    value={formData.creditorId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Creditor (Optional) --</option>
                    {creditors.map(creditor => (
                      <option key={creditor.id} value={creditor.id}>
                        {creditor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </FormRow>

              {formData.creditorId && bills.length > 0 && (
                <FormRow
                  label="For Bill"
                  htmlFor="billId"
                  hint="Selecting a bill will automatically set the amount"
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      id="billId"
                      name="billId"
                      value={formData.billId}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Bill (Optional) --</option>
                      {bills.map(bill => (
                        <option key={bill.id} value={bill.id}>
                          {bill.bill_number} (${Number(bill.total_amount).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </FormRow>
              )}
              
              <FormRow
                label="Amount"
                htmlFor="amount"
                error={errors.amount}
                required
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    className={`pl-10 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
            </div>
            
            <div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="createBankTransaction"
                    checked={formData.createBankTransaction}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Create bank transaction record</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  This will automatically create a withdrawal transaction in the selected bank account
                </p>
              </div>
              
              {formData.createBankTransaction && (
                <FormRow
                  label="Withdraw from Account"
                  htmlFor="bankAccountId"
                  error={errors.bankAccountId}
                  required
                >
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
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
                          {account.name} ({account.account_type}) - {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR'
                          }).format(Number(account.current_balance))}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  placeholder="Check #123, Bill #ABC, etc."
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
              onClick={() => navigate(`/payments/${id}`)}
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