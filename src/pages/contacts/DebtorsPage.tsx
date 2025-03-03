import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Debtor } from '../../lib/supabase';

export function DebtorsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchDebtors();
    }
  }, [selectedBusiness]);
  
  const fetchDebtors = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('debtors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setDebtors(data || []);
    } catch (err: any) {
      console.error('Error fetching debtors:', err);
      setError('Failed to load debtors. Please try again.');
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
        title="Debtors"
        subtitle="Manage people and businesses who owe you money"
        actionLabel="Add Debtor"
        actionLink="/contacts/debtors/new"
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {debtors.length === 0 ? (
        <EmptyState
          title="No debtors yet"
          description="Add your first debtor to start tracking who owes you money."
          icon={<Users size={24} />}
          actionLabel="Add Debtor"
          actionLink="/contacts/debtors/new"
        />
      ) : (
        <DataTable
          data={debtors}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search debtors..."
          searchKeys={['name', 'email', 'phone']}
          emptyMessage="No debtors found"
          onRowClick={(debtor) => navigate(`/contacts/debtors/${debtor.id}`)}
          columns={[
            {
              header: 'Name',
              accessor: 'name',
              className: 'font-medium text-gray-900'
            },
            {
              header: 'Email',
              accessor: 'email'
            },
            {
              header: 'Phone',
              accessor: 'phone'
            },
            {
              header: 'Outstanding',
              accessor: (item) => formatCurrency(Number(item.outstanding_amount || 0)),
              className: 'font-medium text-right',
            }
          ]}
        />
      )}
    </Layout>
  );
}