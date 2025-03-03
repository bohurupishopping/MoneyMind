import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Invoice } from '../../lib/supabase';

type InvoiceWithDebtor = Invoice & {
  debtors: {
    name: string;
  } | null;
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [invoices, setInvoices] = useState<InvoiceWithDebtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchInvoices();
    }
  }, [selectedBusiness]);
  
  const fetchInvoices = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, debtors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('issue_date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return <span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">PAID</span>;
      case 'OVERDUE':
        return <span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">OVERDUE</span>;
      case 'PENDING':
        return <span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">PENDING</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">{status}</span>;
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
      <PageHeader
        title="Invoices"
        subtitle="Manage and track invoices sent to your clients"
        actionLabel="New Invoice"
        actionLink="/invoices/new"
        actionIcon={<Plus className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice to start billing your clients."
          icon={<FileText size={24} />}
          actionLabel="Create Invoice"
          actionLink="/invoices/new"
        />
      ) : (
        <DataTable
          data={invoices}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search invoices..."
          searchKeys={['invoice_number', 'debtors.name', 'notes']}
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
              accessor: (item) => formatCurrency(Number(item.total_amount)),
              className: 'font-medium'
            },
            {
              header: 'Status',
              accessor: (item) => getStatusBadge(item.status)
            }
          ]}
        />
      )}
    </Layout>
  );
}