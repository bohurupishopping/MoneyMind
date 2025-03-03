import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Purchase } from '../../lib/supabase';

type PurchaseWithCreditor = Purchase & {
  creditors: {
    name: string;
  } | null;
};

export function PurchasesPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [purchases, setPurchases] = useState<PurchaseWithCreditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchPurchases();
    }
  }, [selectedBusiness]);
  
  const fetchPurchases = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, creditors(name)')
        .eq('business_id', selectedBusiness.id)
        .order('purchase_date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchases. Please try again.');
    } finally {
      setLoading(false);
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
        title="Purchases"
        subtitle="Record and track business expenses and purchases"
        actionLabel="New Purchase"
        actionLink="/purchases/new"
        actionIcon={<Plus className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {purchases.length === 0 ? (
        <EmptyState
          title="No purchases recorded yet"
          description="Record your business purchases to track expenses."
          icon={<ShoppingBag size={24} />}
          actionLabel="Record Purchase"
          actionLink="/purchases/new"
        />
      ) : (
        <DataTable
          data={purchases}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search purchases..."
          searchKeys={['purchase_number', 'item_name', 'description', 'creditors']}
          emptyMessage="No purchases found"
          onRowClick={(purchase) => navigate(`/purchases/${purchase.id}`)}
          columns={[
            {
              header: 'Purchase #',
              accessor: 'purchase_number',
              className: 'font-medium text-gray-900',
              showOnMobile: false
            },
            {
              header: 'Date',
              accessor: (item) => format(new Date(item.purchase_date), 'MMM dd, yyyy')
            },
            {
              header: 'Creditor',
              accessor: (item) => item.creditors?.name || 'N/A'
            },
            {
              header: 'Item',
              accessor: 'item_name',
              showOnMobile: false
            },
            {
              header: 'Quantity',
              accessor: 'quantity',
              showOnMobile: false
            },
            {
              header: 'Total',
              accessor: (item) => formatCurrency(Number(item.total_price)),
              className: 'font-medium text-right'
            }
          ]}
        />
      )}
    </Layout>
  );
}