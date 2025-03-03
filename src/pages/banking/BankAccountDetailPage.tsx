import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DetailRow } from '../../components/shared/DetailRow';
import { DataTable } from '../../components/shared/DataTable';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, BankAccount, Transaction } from '../../lib/supabase';

type TransactionWithType = Transaction & {
  typeIcon: React.ReactNode;
  typeClass: string;
};

export function BankAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchAccountData();
    }
  }, [selectedBusiness, id]);
  
  const fetchAccountData = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (accountError) throw accountError;
      
      setAccount(accountData);
      
      // Fetch account transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', id)
        .eq('business_id', selectedBusiness.id)
        .order('date', { ascending: false });
        
      if (transactionsError) throw transactionsError;
      
      // Process transactions with visual indicators
      const processedTransactions = (transactionsData || []).map(transaction => {
        let typeIcon;
        let typeClass;
        
        switch (transaction.type) {
          case 'deposit':
            typeIcon = <ArrowDownRight className="h-4 w-4" />;
            typeClass = 'text-green-600';
            break;
          case 'withdrawal':
            typeIcon = <ArrowUpRight className="h-4 w-4" />;
            typeClass = 'text-red-600';
            break;
          case 'transfer':
            typeIcon = <RefreshCw className="h-4 w-4" />;
            typeClass = 'text-blue-600';
            break;
          default:
            typeIcon = <ArrowDownRight className="h-4 w-4" />;
            typeClass = 'text-gray-600';
        }
        
        return {
          ...transaction,
          typeIcon,
          typeClass
        };
      });
      
      setTransactions(processedTransactions);
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError('Failed to load account information. Please try again.');
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
  
  // Get account type icon
  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'savings':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'credit card':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      case 'cash':
        return <CreditCard className="h-5 w-5 text-yellow-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
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
  
  if (!account) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Account not found.</p>
          <button
            onClick={() => navigate('/banking/accounts')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Accounts
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={account.name}
        subtitle={`Account Details · ${account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}`}
        backLink="/banking/accounts"
        actionLabel="Edit"
        actionLink={`/banking/accounts/edit/${id}`}
        actionIcon={<Pencil className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                {getAccountTypeIcon(account.account_type)}
                <h3 className="text-lg font-medium text-gray-800 ml-2">{account.name}</h3>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(Number(account.current_balance))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {account.account_number && (
                  <DetailRow
                    label="Account Number"
                    value={`••••${account.account_number.slice(-4)}`}
                  />
                )}
                
                <DetailRow
                  label="Account Type"
                  value={account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                />
              </div>
              
              <div>
                <DetailRow
                  label="Opening Balance"
                  value={formatCurrency(Number(account.opening_balance))}
                />
                
                <DetailRow
                  label="Current Balance"
                  value={formatCurrency(Number(account.current_balance))}
                  className="font-medium"
                />
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/banking/transactions/new', { state: { accountId: id, type: 'deposit' } })}
                className="py-2 px-4 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <span className="flex items-center">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Record Deposit
                </span>
              </button>
              
              <button
                onClick={() => navigate('/banking/transactions/new', { state: { accountId: id, type: 'withdrawal' } })}
                className="py-2 px-4 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <span className="flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Record Withdrawal
                </span>
              </button>
              
              <button
                onClick={() => navigate('/banking/transactions/new', { state: { accountId: id, type: 'transfer' } })}
                className="py-2 px-4 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Record Transfer
                </span>
              </button>
            </div>
          </Card>
        </div>
        
        <div>
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Account Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                <span>Created on {format(new Date(account.created_at), 'MMM dd, yyyy')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Total Deposits:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(transactions
                    .filter(t => t.type === 'deposit')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                  )}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Total Withdrawals:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(transactions
                    .filter(t => t.type === 'withdrawal' || t.type === 'transfer')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                  )}
                </span>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-500">Current Balance:</span>
                <span className="font-bold text-gray-800">{formatCurrency(Number(account.current_balance))}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/banking/reconcile', { state: { accountId: id } })}
                className="flex items-center text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Reconcile Account</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Transactions */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">Recent Transactions</h2>
          <button
            onClick={() => navigate('/banking/transactions', { state: { accountId: id } })}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View All Transactions
          </button>
        </div>
        
        {transactions.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-gray-500">No transactions recorded yet.</p>
              <button
                onClick={() => navigate('/banking/transactions/new', { state: { accountId: id } })}
                className="mt-4 inline-flex items-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
              >
                Record First Transaction
              </button>
            </div>
          </Card>
        ) : (
          <DataTable
            data={transactions.slice(0, 10)}
            keyExtractor={(item) => item.id}
            pagination={false}
            emptyMessage="No transactions found"
            onRowClick={(transaction) => navigate(`/banking/transactions/edit/${transaction.id}`)}
            columns={[
              {
                header: 'Date',
                accessor: (transaction) => format(new Date(transaction.date), 'MMM dd, yyyy')
              },
              {
                header: 'Description',
                accessor: 'description',
                className: 'font-medium text-gray-900'
              },
              {
                header: 'Type',
                accessor: (transaction) => (
                  <span className={`flex items-center ${transaction.typeClass}`}>
                    {transaction.typeIcon}
                    <span className="ml-1 capitalize">{transaction.type}</span>
                  </span>
                )
              },
              {
                header: 'Category',
                accessor: 'category'
              },
              {
                header: 'Amount',
                accessor: (transaction) => formatCurrency(Number(transaction.amount)),
                className: (transaction) => `font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`
              },
              {
                header: 'Reconciled',
                accessor: (transaction) => (
                  <span className={`px-2 py-1 text-xs rounded-full ${transaction.reconciled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {transaction.reconciled ? 'Yes' : 'No'}
                  </span>
                )
              }
            ]}
          />
        )}
      </div>
    </Layout>
  );
}