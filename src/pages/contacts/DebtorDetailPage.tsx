import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AtSign, Phone, MapPin, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DetailRow } from '../../components/shared/DetailRow';
import { DataTable } from '../../components/shared/DataTable';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Debtor, Invoice, PaymentReceipt } from '../../lib/supabase';

export function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchDebtorData();
    }
  }, [selectedBusiness, id]);
  
  const fetchDebtorData = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch debtor details
      const { data: debtorData, error: debtorError } = await supabase
        .from('debtors')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (debtorError) throw debtorError;
      
      setDebtor(debtorData);
      
      // Fetch related invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('debtor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('issue_date', { ascending: false });
        
      if (invoiceError) throw invoiceError;
      
      setInvoices(invoiceData || []);
      
      // Fetch related payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('debtor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });
        
      if (paymentError) throw paymentError;
      
      setPayments(paymentData || []);
      
    } catch (err: any) {
      console.error('Error fetching debtor data:', err);
      setError('Failed to load debtor information. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('debtors')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/contacts/debtors');
    } catch (err: any) {
      console.error('Error deleting debtor:', err);
      alert('Failed to delete debtor. Please try again.');
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }
  
  if (!debtor) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Debtor not found.</p>
          <button
            onClick={() => navigate('/contacts/debtors')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Debtors List
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={debtor.name}
        subtitle="Debtor Details"
        backLink="/contacts/debtors"
        actionLabel="Edit"
        actionLink={`/contacts/debtors/edit/${id}`}
        actionIcon={<Pencil className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {debtor.email && (
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{debtor.email}</p>
                </div>
              </div>
            )}
            
            {debtor.phone && (
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{debtor.phone}</p>
                </div>
              </div>
            )}
          </div>
          
          {debtor.address && (
            <div className="mt-4 flex items-start">
              <div className="flex-shrink-0 mt-1">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{debtor.address}</p>
              </div>
            </div>
          )}
        </Card>
        
        <Card>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Financial Summary</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(Number(debtor.outstanding_amount || 0))}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Total Invoices</p>
              <p className="text-lg font-semibold text-gray-800">{invoices.length}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Total Payments</p>
              <p className="text-lg font-semibold text-gray-800">{payments.length}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span>Delete Debtor</span>
            </button>
            
            {showDeleteConfirm && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this debtor?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 bg-white text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Recent Invoices */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Invoices</h2>
          <button
            onClick={() => navigate('/invoices/new', { state: { debtorId: id } })}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Create Invoice
          </button>
        </div>
        
        {invoices.length === 0 ? (
          <p className="text-gray-500 italic">No invoices found for this debtor.</p>
        ) : (
          <DataTable
            data={invoices}
            keyExtractor={(item) => item.id}
            pagination={true}
            emptyMessage="No invoices found"
            onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
            columns={[
              {
                header: 'Invoice #',
                accessor: 'invoice_number',
                className: 'font-medium text-gray-900'
              },
              {
                header: 'Issue Date',
                accessor: (item) => format(new Date(item.issue_date), 'MMM dd, yyyy')
              },
              {
                header: 'Due Date',
                accessor: (item) => format(new Date(item.due_date), 'MMM dd, yyyy')
              },
              {
                header: 'Amount',
                accessor: (item) => formatCurrency(Number(item.total_amount)),
                className: 'font-medium'
              },
              {
                header: 'Status',
                accessor: (item) => (
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium 
                    ${item.status === 'PAID' 
                      ? 'bg-green-100 text-green-800' 
                      : item.status === 'OVERDUE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {item.status}
                  </span>
                )
              }
            ]}
          />
        )}
      </div>
      
      {/* Recent Payments */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Payment Receipts</h2>
          <button
            onClick={() => navigate('/receipts/new', { state: { debtorId: id } })}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Create Receipt
          </button>
        </div>
        
        {payments.length === 0 ? (
          <p className="text-gray-500 italic">No payment receipts found for this debtor.</p>
        ) : (
          <DataTable
            data={payments}
            keyExtractor={(item) => item.id}
            pagination={true}
            emptyMessage="No payment receipts found"
            onRowClick={(receipt) => navigate(`/receipts/${receipt.id}`)}
            columns={[
              {
                header: 'Receipt #',
                accessor: 'receipt_number',
                className: 'font-medium text-gray-900'
              },
              {
                header: 'Date',
                accessor: (item) => format(new Date(item.payment_date), 'MMM dd, yyyy')
              },
              {
                header: 'Amount',
                accessor: (item) => formatCurrency(Number(item.amount)),
                className: 'font-medium text-green-600'
              },
              {
                header: 'Method',
                accessor: 'payment_method'
              },
              {
                header: 'Reference',
                accessor: 'reference'
              }
            ]}
          />
        )}
      </div>
    </Layout>
  );
}