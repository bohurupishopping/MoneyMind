import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CreditCard, User, DollarSign, ArrowUpRight, FileText } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor, BankAccount, Bill } from '../../lib/supabase';

type FormData = {
  paymentNumber: string;
  amount: string;
  paymentDate: string;
  creditorId: string;
  bankAccountId: string;
  billId: string;
  reference: string;
  notes: string;
  createBankTransaction: boolean;
};

type LocationState = {
  creditorId?: string;
  billId?: string;
};

export function NewPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as LocationState;
  
  const [formData, setFormData] = useState<FormData>({
    paymentNumber: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    creditorId: locationState?.creditorId || '',
    bankAccountId: '',
    billId: locationState?.billId || '',
    reference: '',
    notes: '',
    createBankTransaction: true // Default to creating bank transaction
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [fetchingCreditors, setFetchingCreditors] = useState(true);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [fetchingBills, setFetchingBills] = useState(true);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchCreditors();
      fetchBankAccounts();
      generatePaymentNumber();
    }
  }, [selectedBusiness]);
  
  useEffect(() => {
    if (selectedBusiness && formData.creditorId) {
      fetchBillsForCreditor(formData.creditorId);
    } else {
      setBills([]);
    }
  }, [selectedBusiness, formData.creditorId]);
  
  // If a bill is selected, set the amount from that bill
  useEffect(() => {
    if (formData.billId && bills.length > 0) {
      const selectedBill = bills.find(bill => bill.id === formData.billId);
      if (selectedBill) {
        setFormData(prev => ({
          ...prev,
          amount: selectedBill.total_amount.toString()
        }));
      }
    }
  }, [formData.billId, bills]);
  
  const fetchCreditors = async () => {
    if (!selectedBusiness) return;
    
    setFetchingCreditors(true);
    
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
    } finally {
      setFetchingCreditors(false);
    }
  };
  
  const fetchBillsForCreditor = async (creditorId: string) => {
    if (!selectedBusiness || !creditorId) return;
    
    setFetchingBills(true);
    
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
    } finally {
      setFetchingBills(false);
    }
  };
  
  const fetchBankAccounts = async () => {
    if (!selectedBusiness) return;
    
    setFetchingAccounts(true);
    
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
    } finally {
      setFetchingAccounts(false);
    }
  };
  
  const generatePaymentNumber = async () => {
    if (!selectedBusiness) return;
    
    try {
      // Get the highest payment number
      const { data, error } = await supabase
        .from('payments')
        .select('payment_number')
        .eq('business_id', selectedBusiness.id)
        .order('payment_number', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      let nextNumber = 1;
      
      if (data && data.length > 0 && data[0].payment_number) {
        // Extract number from PAY-XXXX format
        const match = data[0].payment_number.match(/PAY-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Format with leading zeros
      const paymentNumber = `PAY-${nextNumber.toString().padStart(4, '0')}`;
      
      setFormData(prev => ({ ...prev, paymentNumber }));
    } catch (err: any) {
      console.error('Error generating payment number:', err);
      // Use a fallback pattern with timestamp
      const timestamp = new Date().getTime().toString().slice(-6);
      setFormData(prev => ({ ...prev, paymentNumber: `PAY-${timestamp}` }));
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
    
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const amount = parseFloat(formData.amount);
      
      // Create a payment
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          business_id: selectedBusiness.id,
          payment_number: formData.paymentNumber,
          amount: amount,
          payment_date: formData.paymentDate,
          creditor_id: formData.creditorId || null,
          bank_account_id: formData.createBankTransaction ? formData.bankAccountId : null,
          payment_method: formData.createBankTransaction ? 'Bank Transfer' : 'Other',
          reference: formData.reference || null,
          notes: formData.notes || null
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // If there's a creditor, update their outstanding amount
      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const newOutstandingAmount = Math.max(0, Number(creditor.outstanding_amount) - amount);
          
          const { error: updateError } = await supabase
            .from('creditors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', formData.creditorId);
            
          if (updateError) {
            console.error('Error updating creditor outstanding amount:', updateError);
            // Continue anyway as the payment was created successfully
          }
        }
      }
      
      // If a bill is selected, mark it as paid if the amount is equal or greater
      if (formData.billId) {
        const bill = bills.find(b => b.id === formData.billId);
        if (bill && amount >= Number(bill.total_amount)) {
          const { error: billError } = await supabase
            .from('bills')
            .update({ status: 'PAID' })
            .eq('id', formData.billId);
            
          if (billError) {
            console.error('Error updating bill status:', billError);
          }
        }
      }
      
      // If bank transaction should be created and we have a bank account
      if (formData.createBankTransaction && formData.bankAccountId) {
        // Generate transaction number
        const transactionNumber = `WIT-${formData.paymentNumber.replace('PAY-', '')}`;
        
        // Create description based on creditor
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
        
        // Create a withdrawal transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            business_id: selectedBusiness.id,
            account_id: formData.bankAccountId,
            transaction_number: transactionNumber,
            type: 'withdrawal',
            amount: amount,
            date: formData.paymentDate,
            description: description,
            category: 'Payment',
            reference_id: payment.id, // Link to payment
            reconciled: false,
            notes: formData.notes || null
          });
          
        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          // Continue anyway as the payment was created successfully
        }
      }
      
      navigate('/payments');
    } catch (err: any) {
      console.error('Error creating payment:', err);
      alert('Failed to create payment. Please try again.');
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
        title="Record New Payment"
        backLink="/payments"
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
                    disabled={fetchingCreditors}
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
                      disabled={fetchingBills}
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
                      disabled={fetchingAccounts}
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
              onClick={() => navigate('/payments')}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}