import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, PaymentReceipt } from '../../lib/supabase';

type ReceiptWithDebtor = PaymentReceipt & {
  debtors: {
    name: string;
  } | null;
};

export function ReceiptsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [receipts, setReceipts] = useState<ReceiptWithDebtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchReceipts();
    }
  }, [selectedBusiness]);
  
  const fetchReceipts = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*, debtors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('payment_date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setReceipts(data || []);
    } catch (err: any) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load payment receipts. Please try again.');
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
        title="Payment Receipts"
        subtitle="Record and track payments from your debtors"
        actionLabel="New Receipt"
        actionLink="/receipts/new"
        actionIcon={<Plus className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {receipts.length === 0 ? (
        <EmptyState
          title="No payment receipts yet"
          description="Start recording payments from your debtors to keep track of income."
          icon={<Receipt size={24} />}
          actionLabel="Record Payment"
          actionLink="/receipts/new"
        />
      ) : (
        <DataTable
          data={receipts}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search receipts..."
          searchKeys={['receipt_number', 'debtors.name', 'payment_method', 'reference']}
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
              header: 'From',
              accessor: (item) => item.debtors?.name || 'N/A'
            },
            {
              header: 'Method',
              accessor: 'payment_method'
            },
            {
              header: 'Reference',
              accessor: 'reference'
            },
            {
              header: 'Amount',
              accessor: (item) => formatCurrency(Number(item.amount)),
              className: 'font-medium text-right text-green-600'
            }
          ]}
        />
      )}
    </Layout>
  );
}