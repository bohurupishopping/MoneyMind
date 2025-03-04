import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Payment } from '../../lib/supabase';

type PaymentWithCreditor = Payment & {
  creditors: {
    name: string;
  } | null;
  bank_accounts?: {
    name: string;
    account_type: string;
  } | null;
};

export function PaymentsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [payments, setPayments] = useState<PaymentWithCreditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchPayments();
      fetchPendingCount();
    }
  }, [selectedBusiness]);
  
  const fetchPayments = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, creditors(name), bank_accounts(name, account_type)')
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setPayments(data || []);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'PENDING');
        
      if (error) throw error;
      
      setPendingCount(data?.length || 0);
    } catch (err: any) {
      console.error('Error fetching pending count:', err);
      setPendingCount(0);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
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
        title="Payments"
        subtitle={`Make payments to your suppliers and creditors ${pendingCount > 0 ? `• ${pendingCount} pending bills` : ''}`}
        actionLabel="New Payment"
        actionLink="/payments/new"
        actionIcon={<Plus className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {payments.length === 0 ? (
        <EmptyState
          title="No payments recorded yet"
          description="Start recording payments to your suppliers and creditors."
          icon={<CreditCard size={24} />}
          actionLabel="Record Payment"
          actionLink="/payments/new"
        />
      ) : (
        <DataTable
          data={payments}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search payments..."
          searchKeys={['payment_number', 'creditors', 'payment_method', 'reference']}
          emptyMessage="No payments found"
          onRowClick={(payment) => navigate(`/payments/${payment.id}`)}
          columns={[
            {
              header: 'Payment #',
              accessor: 'payment_number',
              className: 'font-medium text-gray-900',
              showOnMobile: false
            },
            {
              header: 'Date',
              accessor: (item) => format(new Date(item.payment_date), 'MMM dd, yyyy')
            },
            {
              header: 'To',
              accessor: (item) => item.creditors?.name || 'N/A'
            },
            {
              header: 'Method',
              accessor: (item) => item.payment_method === 'Bank Transfer' && item.bank_accounts 
                ? `Bank Transfer - ${item.bank_accounts.name}`
                : item.payment_method,
              showOnMobile: false
            },
            {
              header: 'Reference',
              accessor: 'reference',
              showOnMobile: false
            },
            {
              header: 'Amount',
              accessor: (item) => formatCurrency(Number(item.amount)),
              className: 'font-medium text-right text-red-600'
            }
          ]}
        />
      )}
    </Layout>
  );
}