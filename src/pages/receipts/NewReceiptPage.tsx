import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CreditCard, User, DollarSign } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Debtor, BankAccount, Invoice } from '../../lib/supabase';

type FormData = {
  receiptNumber: string;
  amount: string;
  paymentDate: string;
  debtorId: string;
  paymentMethod: string;
  bankAccountId: string;
  invoiceId: string;
  reference: string;
  notes: string;
  createBankTransaction: boolean;
};

type LocationState = {
  debtorId?: string;
  invoiceId?: string;
};

export function NewReceiptPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as LocationState;
  
  const [formData, setFormData] = useState<FormData>({
    receiptNumber: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    debtorId: locationState?.debtorId || '',
    paymentMethod: '',
    bankAccountId: '',
    invoiceId: locationState?.invoiceId || '',
    reference: '',
    notes: '',
    createBankTransaction: true
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fetchingDebtors, setFetchingDebtors] = useState(true);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [fetchingInvoices, setFetchingInvoices] = useState(true);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchDebtors();
      fetchBankAccounts();
      generateReceiptNumber();
    }
  }, [selectedBusiness]);
  
  useEffect(() => {
    if (selectedBusiness && formData.debtorId) {
      fetchInvoicesForDebtor(formData.debtorId);
    } else {
      setInvoices([]);
    }
  }, [selectedBusiness, formData.debtorId]);
  
  // If an invoice is selected, set the amount from that invoice
  useEffect(() => {
    if (formData.invoiceId && invoices.length > 0) {
      const selectedInvoice = invoices.find(invoice => invoice.id === formData.invoiceId);
      if (selectedInvoice) {
        setFormData(prev => ({
          ...prev,
          amount: selectedInvoice.total_amount.toString()
        }));
      }
    }
  }, [formData.invoiceId, invoices]);
  
  const fetchDebtors = async () => {
    if (!selectedBusiness) return;
    
    setFetchingDebtors(true);
    
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
    } finally {
      setFetchingDebtors(false);
    }
  };
  
  const fetchInvoicesForDebtor = async (debtorId: string) => {
    if (!selectedBusiness || !debtorId) return;
    
    setFetchingInvoices(true);
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('debtor_id', debtorId)
        .eq('status', 'PENDING')
        .order('issue_date', { ascending: false });
        
      if (error) throw error;
      
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    } finally {
      setFetchingInvoices(false);
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
  
  const generateReceiptNumber = async () => {
    if (!selectedBusiness) return;
    
    try {
      // Get the highest receipt number
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('receipt_number')
        .eq('business_id', selectedBusiness.id)
        .order('receipt_number', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      let nextNumber = 1;
      
      if (data && data.length > 0 && data[0].receipt_number) {
        // Extract number from REC-XXXX format
        const match = data[0].receipt_number.match(/REC-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Format with leading zeros
      const receiptNumber = `REC-${nextNumber.toString().padStart(4, '0')}`;
      
      setFormData(prev => ({ ...prev, receiptNumber }));
    } catch (err: any) {
      console.error('Error generating receipt number:', err);
      // Use a fallback pattern with timestamp
      const timestamp = new Date().getTime().toString().slice(-6);
      setFormData(prev => ({ ...prev, receiptNumber: `REC-${timestamp}` }));
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
      
      // Create a payment receipt
      const { data: receipt, error } = await supabase
        .from('payment_receipts')
        .insert({
          business_id: selectedBusiness.id,
          receipt_number: formData.receiptNumber,
          amount: amount,
          payment_date: formData.paymentDate,
          debtor_id: formData.debtorId || null,
          payment_method: formData.paymentMethod || null,
          reference: formData.reference || null,
          notes: formData.notes || null
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // If there's a debtor, update their outstanding amount
      if (formData.debtorId) {
        const debtor = debtors.find(d => d.id === formData.debtorId);
        if (debtor) {
          const newOutstandingAmount = Math.max(0, Number(debtor.outstanding_amount) - amount);
          
          const { error: updateError } = await supabase
            .from('debtors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', formData.debtorId);
            
          if (updateError) {
            console.error('Error updating debtor outstanding amount:', updateError);
            // Continue anyway as the receipt was created successfully
          }
        }
      }
      
      // If an invoice is selected, mark it as paid if the amount is equal or greater
      if (formData.invoiceId) {
        const invoice = invoices.find(i => i.id === formData.invoiceId);
        if (invoice && amount >= Number(invoice.total_amount)) {
          const { error: invoiceError } = await supabase
            .from('invoices')
            .update({ status: 'PAID' })
            .eq('id', formData.invoiceId);
            
          if (invoiceError) {
            console.error('Error updating invoice status:', invoiceError);
          }
        }
      }
      
      // If bank transaction should be created and we have a bank account
      if (formData.createBankTransaction && formData.bankAccountId) {
        // Generate transaction number
        const transactionNumber = `DEP-${formData.receiptNumber.replace('REC-', '')}`;
        
        // Create description based on debtor and payment method
        let description = `Payment received`;
        if (formData.debtorId) {
          const debtor = debtors.find(d => d.id === formData.debtorId);
          if (debtor) {
            description = `Payment from ${debtor.name}`;
          }
        }
        
        if (formData.invoiceId) {
          description += ` for invoice ${invoices.find(i => i.id === formData.invoiceId)?.invoice_number || ''}`;
        }
        
        // Create a deposit transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            business_id: selectedBusiness.id,
            account_id: formData.bankAccountId,
            transaction_number: transactionNumber,
            type: 'deposit',
            amount: amount,
            date: formData.paymentDate,
            description: description,
            category: 'Payment Receipt',
            reference_id: receipt.id, // Link to receipt
            reconciled: false,
            notes: formData.notes || null
          });
          
        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          // Continue anyway as the receipt was created successfully
        }
      }
      
      navigate('/receipts');
    } catch (err: any) {
      console.error('Error creating receipt:', err);
      alert('Failed to create receipt. Please try again.');
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
        title="Record Payment Receipt"
        backLink="/receipts"
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
                label="From Debtor"
                htmlFor="debtorId"
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    id="debtorId"
                    name="debtorId"
                    value={formData.debtorId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={fetchingDebtors}
                  >
                    <option value="">-- Select Debtor (Optional) --</option>
                    {debtors.map(debtor => (
                      <option key={debtor.id} value={debtor.id}>
                        {debtor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </FormRow>
              
              {formData.debtorId && invoices.length > 0 && (
                <FormRow
                  label="For Invoice"
                  htmlFor="invoiceId"
                  hint="Selecting an invoice will automatically set the amount"
                >
                  <select
                    id="invoiceId"
                    name="invoiceId"
                    value={formData.invoiceId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={fetchingInvoices}
                  >
                    <option value="">-- Select Invoice (Optional) --</option>
                    {invoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} (${Number(invoice.total_amount).toFixed(2)})
                      </option>
                    ))}
                  </select>
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
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="createBankTransaction"
                    checked={formData.createBankTransaction}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Create bank transaction record</span>
                </label>
              </div>
              
              {formData.createBankTransaction && (
                <FormRow
                  label="Deposit to Account"
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
                          {account.name} ({account.account_type}) - ${Number(account.current_balance).toFixed(2)}
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
              onClick={() => navigate('/receipts')}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Receipt'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}