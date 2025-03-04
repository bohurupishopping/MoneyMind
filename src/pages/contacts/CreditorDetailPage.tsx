import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AtSign, Phone, MapPin, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DataTable } from '../../components/shared/DataTable';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor, Bill, Purchase, Payment } from '../../lib/supabase';

export function CreditorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [creditor, setCreditor] = useState<Creditor | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchCreditorData();
    }
  }, [selectedBusiness, id]);
  
  const fetchCreditorData = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch creditor details
      const { data: creditorData, error: creditorError } = await supabase
        .from('creditors')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (creditorError) throw creditorError;
      
      setCreditor(creditorData);
      
      // Fetch related bills
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('creditor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('issue_date', { ascending: false });
        
      if (billError) throw billError;
      
      setBills(billData || []);
      
      // Fetch related purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('creditor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('purchase_date', { ascending: false });
        
      if (purchaseError) throw purchaseError;
      
      setPurchases(purchaseData || []);

      // Fetch related payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          bank_accounts (
            id,
            name,
            account_type
          )
        `)
        .eq('creditor_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });
        
      if (paymentError) throw paymentError;
      
      setPayments(paymentData || []);
      
    } catch (err: any) {
      console.error('Error fetching creditor data:', err);
      setError('Failed to load creditor information. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('creditors')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/contacts/creditors');
    } catch (err: any) {
      console.error('Error deleting creditor:', err);
      alert('Failed to delete creditor. Please try again.');
    }
  };
  
  // Memoized calculations for better performance
  const totals = useMemo(() => {
    const purchaseTotal = purchases.reduce((sum, purchase) => sum + Number(purchase.total_price), 0);
    const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      purchases: purchaseTotal,
      payments: paymentTotal,
      outstanding: purchaseTotal - paymentTotal
    };
  }, [purchases, payments]);
  
  
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
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }
  
  if (!creditor) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-gray-500">Creditor not found.</p>
          <button
            onClick={() => navigate('/contacts/creditors')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Back to Creditors List
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={creditor.name}
        subtitle="Creditor Details"
        backLink="/contacts/creditors"
        actionLabel="Edit"
        actionLink={`/contacts/creditors/edit/${id}`}
        actionIcon={<Pencil className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 shadow-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Contact Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creditor.email && (
              <div className="flex items-start p-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors duration-200">
                <div className="flex-shrink-0 mt-1">
                  <AtSign className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm text-gray-900 mt-1">{creditor.email}</p>
                </div>
              </div>
            )}
            
            {creditor.phone && (
              <div className="flex items-start p-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors duration-200">
                <div className="flex-shrink-0 mt-1">
                  <Phone className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-sm text-gray-900 mt-1">{creditor.phone}</p>
                </div>
              </div>
            )}
          </div>
          
          {creditor.address && (
            <div className="mt-4 flex items-start p-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors duration-200">
              <div className="flex-shrink-0 mt-1">
                <MapPin className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Address</p>
                <p className="text-sm text-gray-900 whitespace-pre-line mt-1">{creditor.address}</p>
              </div>
            </div>
          )}
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Financial Summary</h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Total Purchases</p>
              <p className="text-lg font-semibold text-purple-900 mt-1">{formatCurrency(totals.purchases)}</p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Payments</p>
              <p className="text-lg font-semibold text-green-900 mt-1">{formatCurrency(totals.payments)}</p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-sm font-medium text-orange-700">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.outstanding)}
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Total Bills</p>
              <p className="text-lg font-semibold text-blue-900 mt-1">{bills.length}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center text-red-600 hover:text-red-800 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span>Delete Creditor</span>
            </button>
            
            {showDeleteConfirm && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this creditor?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 bg-white text-gray-700 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Bills */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Bills</h2>
          <button
            onClick={() => navigate('/bills/new', { state: { creditorId: id } })}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            <Pencil className="h-4 w-4 mr-1" />
            New Bill
          </button>
        </div>
        
        {bills.length === 0 ? (
          <p className="text-gray-500 italic">No bills found for this creditor.</p>
        ) : (
          <DataTable
            data={bills}
            keyExtractor={(item) => item.id}
            pagination={true}
            emptyMessage="No bills found"
            onRowClick={(bill) => navigate(`/bills/${bill.id}`)}
            columns={[
              {
                header: 'Bill #',
                accessor: 'bill_number',
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
      
      {/* Payments */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Payments</h2>
          <button
            onClick={() => navigate('/payments/new', { state: { creditorId: id } })}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            <Pencil className="h-4 w-4 mr-1" />
            New Payment
          </button>
        </div>
        
        {payments.length === 0 ? (
          <p className="text-gray-500 italic">No payments found for this creditor.</p>
        ) : (
          <DataTable
            data={payments}
            keyExtractor={(item) => item.id}
            pagination={true}
            emptyMessage="No payments found"
            onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
            columns={[
              {
                header: 'Payment #',
                accessor: 'payment_number',
                className: 'font-medium text-gray-900'
              },
              {
                header: 'Date',
                accessor: (item) => format(new Date(item.payment_date), 'MMM dd, yyyy')
              },
              {
                header: 'Method',
                accessor: (item) => item.payment_method === 'Bank Transfer' && item.bank_account_id
                  ? `Bank Transfer - ${(item as any).bank_accounts?.name || ''}`
                  : item.payment_method
              },
              {
                header: 'Reference',
                accessor: 'reference'
              },
              {
                header: 'Amount',
                accessor: (item) => formatCurrency(Number(item.amount)),
                className: 'font-medium text-green-600'
              }
            ]}
          />
        )}
      </div>
      
      {/* Purchases */}
      <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Purchases</h2>
          <button
            onClick={() => navigate('/purchases/new', { state: { creditorId: id } })}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            <Pencil className="h-4 w-4 mr-1" />
            New Purchase
          </button>
        </div>
        
        {purchases.length === 0 ? (
          <p className="text-gray-500 italic">No purchase records found for this creditor.</p>
        ) : (
          <DataTable
            data={purchases}
            keyExtractor={(item) => item.id}
            pagination={true}
            emptyMessage="No purchases found"
            onRowClick={(purchase) => navigate(`/purchases/${purchase.id}`)}
            columns={[
              {
                header: 'Purchase #',
                accessor: 'purchase_number',
                className: 'font-medium text-gray-900'
              },
              {
                header: 'Date',
                accessor: (item) => format(new Date(item.purchase_date), 'MMM dd, yyyy')
              },
              {
                header: 'Item',
                accessor: 'item_name'
              },
              {
                header: 'Quantity',
                accessor: 'quantity'
              },
              {
                header: 'Unit Price',
                accessor: (item) => formatCurrency(Number(item.unit_price))
              },
              {
                header: 'Total',
                accessor: (item) => formatCurrency(Number(item.total_price)),
                className: 'font-medium'
              }
            ]}
          />
        )}
      </div>
    </Layout>
  );
}