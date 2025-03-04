import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Users, 
  FileText, 
  DollarSign, 
  ArrowUpRight, 
  AlertCircle,
  Plus,
  Building2
} from 'lucide-react';

import { Layout } from '../../components/Layout';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/shared/DataTable';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Invoice, PaymentReceipt } from '../../lib/supabase';
import { format } from 'date-fns';

export function DashboardPage() {
  const { selectedBusiness } = useBusiness();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalDebtors: 0,
    totalCreditors: 0
  });
  
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize fetchDashboardData to prevent unnecessary recreations
  const fetchDashboardData = useCallback(async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch stats
      const [
        paymentReceipts,
        purchases,
        debtors,
        creditors,
        invoices
      ] = await Promise.all([
        // Get payment receipts for income calculation
        supabase
          .from('payment_receipts')
          .select('amount')
          .eq('business_id', selectedBusiness.id),
          
        // Get purchases for expense calculation
        supabase
          .from('purchases')
          .select('total_price')
          .eq('business_id', selectedBusiness.id),
          
        // Get debtors count and total
        supabase
          .from('debtors')
          .select('outstanding_amount')
          .eq('business_id', selectedBusiness.id),
          
        // Get creditors count and total
        supabase
          .from('creditors')
          .select('outstanding_amount')
          .eq('business_id', selectedBusiness.id),
          
        // Get recent invoices
        supabase
          .from('invoices')
          .select('*, debtors(name)')
          .eq('business_id', selectedBusiness.id)
          .order('issue_date', { ascending: false })
          .limit(5)
      ]);
      
      // Get recent payments
      const { data: recentPaymentsData, error: paymentsError } = await supabase
        .from('payment_receipts')
        .select('*, debtors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false })
        .limit(5);
      
      if (paymentsError) throw paymentsError;
      
      // Calculate totals
      const totalIncome = paymentReceipts.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpenses = purchases.data?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const totalDebtors = debtors.data?.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0) || 0;
      const totalCreditors = creditors.data?.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0) || 0;
      
      setStats({
        totalIncome,
        totalExpenses,
        totalDebtors,
        totalCreditors
      });
      
      setRecentInvoices(invoices.data || []);
      setRecentPayments(recentPaymentsData || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness?.id]); // Only depend on the business ID, not the entire business object

  // Fetch data only when selected business ID changes
  useEffect(() => {
    if (selectedBusiness?.id) {
      fetchDashboardData();
    }
  }, [selectedBusiness?.id, fetchDashboardData]);

  // Memoize currency formatter
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    });
    return (amount: number) => formatter.format(amount);
  }, []);

  // Display loading state
  if (loading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  // Display business selection/creation prompt if no business is selected
  if (!selectedBusiness) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="bg-indigo-100 p-3 rounded-full inline-flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Business Selected</h2>
            <p className="text-gray-600 mb-6">
              Please select an existing business or create a new one to continue.
            </p>
            <button
              onClick={() => navigate('/businesses/new')}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Business
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Welcome to {selectedBusiness.name}</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start text-red-800">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: 12, label: "vs last month", positive: true }}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon={<CreditCard className="h-6 w-6" />}
          trend={{ value: 8, label: "vs last month", positive: false }}
        />
        <StatCard
          title="Debtors"
          value={formatCurrency(stats.totalDebtors)}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Creditors"
          value={formatCurrency(stats.totalCreditors)}
          icon={<FileText className="h-6 w-6" />}
        />
      </div>
      
      {/* Recent Invoices */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Recent Invoices</h2>
          <button
            onClick={() => navigate('/invoices')}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </button>
        </div>
        
        <DataTable
          data={recentInvoices}
          keyExtractor={(item) => item.id}
          pagination={false}
          emptyMessage="No invoices found"
          onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
          columns={[
            {
              header: 'Invoice #',
              accessor: 'invoice_number',
              className: 'font-medium text-gray-900'
            },
            {
              header: 'Client',
              accessor: (item) => item.debtors?.name || 'N/A'
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
              accessor: (item) => formatCurrency(item.total_amount),
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
      </div>
      
      {/* Recent Payments */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Recent Payments</h2>
          <button
            onClick={() => navigate('/receipts')}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </button>
        </div>
        
        <DataTable
          data={recentPayments}
          keyExtractor={(item) => item.id}
          pagination={false}
          emptyMessage="No payment receipts found"
          onRowClick={(payment) => navigate(`/receipts/${payment.id}`)}
          columns={[
            {
              header: 'Receipt #',
              accessor: 'receipt_number',
              className: 'font-medium text-gray-900'
            },
            {
              header: 'From',
              accessor: (item) => item.debtors?.name || 'N/A'
            },
            {
              header: 'Date',
              accessor: (item) => format(new Date(item.payment_date), 'MMM dd, yyyy')
            },
            {
              header: 'Amount',
              accessor: (item) => formatCurrency(item.amount),
              className: 'font-medium text-green-600'
            },
            {
              header: 'Method',
              accessor: 'payment_method'
            }
          ]}
        />
      </div>
    </Layout>
  );
}