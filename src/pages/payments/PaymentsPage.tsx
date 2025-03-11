import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, Download } from 'lucide-react';
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

// Helper function to format payment data for CSV
function formatPaymentForCSV(payment: PaymentWithCreditor) {
  return {
    'Payment Number': payment.payment_number,
    'Date': format(new Date(payment.payment_date), 'yyyy-MM-dd'),
    'Amount': Number(payment.amount).toFixed(2),
    'Creditor': payment.creditors?.name || 'N/A',
    'Payment Method': payment.payment_method,
    'Bank Account': payment.bank_accounts ? `${payment.bank_accounts.name} (${payment.bank_accounts.account_type})` : 'N/A',
    'Reference': payment.reference || 'N/A',
    'Notes': payment.notes || 'N/A',
    'Created At': format(new Date(payment.created_at), 'yyyy-MM-dd HH:mm:ss')
  };
}

// Helper function to convert data to CSV
function convertToCSV(data: any[]) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const cell = row[header]?.toString() || '';
      // Escape quotes and wrap in quotes if contains comma
      return cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// Helper function to download CSV
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function PaymentsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [payments, setPayments] = useState<PaymentWithCreditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  
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
  
  const handleExport = async () => {
    if (!selectedBusiness || exporting) return;
    
    setExporting(true);
    
    try {
      // Fetch all payments for export (you might want to add date filters in the future)
      const { data, error } = await supabase
        .from('payments')
        .select('*, creditors(name), bank_accounts(name, account_type)')
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedData = data.map(formatPaymentForCSV);
        const csv = convertToCSV(formattedData);
        const filename = `payments_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
        
        downloadCSV(csv, filename);
      } else {
        alert('No payments to export');
      }
    } catch (err: any) {
      console.error('Error exporting payments:', err);
      alert('Failed to export payments. Please try again.');
    } finally {
      setExporting(false);
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Make payments to your suppliers and creditors {pendingCount > 0 ? `• ${pendingCount} pending bills` : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {payments.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
          
          <button
            onClick={() => navigate('/payments/new')}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
          </button>
        </div>
      </div>
      
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