import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, DollarSign } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { Card } from '../../components/shared/Card';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, BankAccount } from '../../lib/supabase';

export function BankAccountsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchAccounts();
    }
  }, [selectedBusiness]);
  
  const fetchAccounts = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setAccounts(data || []);
      
      // Calculate total balance
      const total = (data || []).reduce((sum, account) => sum + Number(account.current_balance), 0);
      setTotalBalance(total);
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err);
      setError('Failed to load bank accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Get account type icon and color
  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'savings':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'credit card':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      case 'cash':
        return <DollarSign className="h-5 w-5 text-yellow-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const handleAccountClick = (accountId: string) => {
    navigate(`/banking/accounts/${accountId}`);
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
        title="Bank & Cash Accounts"
        subtitle="Manage your bank accounts and track balances"
        actionLabel="Add Account"
        actionLink="/banking/accounts/new"
        actionIcon={<Plus className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* Total Balance Card */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="p-6">
            <h3 className="text-xl font-medium mb-2">Total Balance</h3>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="mt-2 text-indigo-100">Across all accounts</p>
          </div>
        </Card>
      </div>
      
      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add your first bank or cash account to start tracking your finances."
          icon={<CreditCard size={24} />}
          actionLabel="Add Account"
          actionLink="/banking/accounts/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(account => (
            <div 
              key={account.id}
              onClick={() => handleAccountClick(account.id)}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px]"
            >
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {getAccountTypeIcon(account.account_type)}
                      <span className="ml-2 text-sm text-gray-500 uppercase">{account.account_type}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/banking/accounts/edit/${account.id}`);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Edit
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{account.name}</h3>
                  {account.account_number && (
                    <p className="text-sm text-gray-500 mb-4">••••{account.account_number.slice(-4)}</p>
                  )}
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(Number(account.current_balance))}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Opening Balance: {formatCurrency(Number(account.opening_balance))}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/banking/transactions/new', { state: { accountId: account.id } });
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Record Transaction
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}