import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  Plus, 
  Filter,
  CreditCard,
  Download
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DataTable } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Transaction, BankAccount } from '../../lib/supabase';

type TransactionWithDetails = Transaction & {
  bank_accounts: {
    name: string;
  };
  typeIcon: React.ReactNode;
  typeClass: string;
};

type FilterState = {
  accountId: string | null;
  type: string | null;
  fromDate: string | null;
  toDate: string | null;
  reconciled: boolean | null;
};

// Add interface for IE Navigator
interface IENavigator extends Navigator {
  msSaveBlob?: (blob: Blob, filename: string) => boolean;
}

// Helper function to format transaction data for CSV
function formatTransactionForCSV(transaction: TransactionWithDetails) {
  return {
    'Date': format(new Date(transaction.date), 'yyyy-MM-dd'),
    'Transaction Number': transaction.transaction_number,
    'Account': transaction.bank_accounts?.name || 'Unknown',
    'Type': transaction.type,
    'Description': transaction.description,
    'Category': transaction.category,
    'Amount': Number(transaction.amount).toFixed(2),
    'Reconciled': transaction.reconciled ? 'Yes' : 'No',
    'Notes': transaction.notes || 'N/A',
    'Created At': format(new Date(transaction.created_at), 'yyyy-MM-dd HH:mm:ss')
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

// Update the downloadCSV function
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Type assertion for IE compatibility
  const nav = navigator as IENavigator;
  if (nav.msSaveBlob) {
    nav.msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as { accountId?: string } | null;
  
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    accountId: locationState?.accountId || null,
    type: null,
    fromDate: null,
    toDate: null,
    reconciled: null
  });
  const [exporting, setExporting] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchAccounts();
      fetchTransactions();
    }
  }, [selectedBusiness, filters]);
  
  const fetchAccounts = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, business_id, account_number, account_type, opening_balance, current_balance, created_at, updated_at')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
    }
  };
  
  const fetchTransactions = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Start building the query
      let query = supabase
        .from('transactions')
        .select('*, bank_accounts(name)')
        .eq('business_id', selectedBusiness.id);
      
      // Apply filters
      if (filters.accountId) {
        query = query.eq('account_id', filters.accountId);
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.fromDate) {
        query = query.gte('date', filters.fromDate);
      }
      
      if (filters.toDate) {
        query = query.lte('date', filters.toDate);
      }
      
      if (filters.reconciled !== null) {
        query = query.eq('reconciled', filters.reconciled);
      }
      
      // Execute query
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      
      // Process transactions with visual indicators
      const processedTransactions = (data || []).map(transaction => {
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
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (name: keyof FilterState, value: string | boolean | null) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      accountId: null,
      type: null,
      fromDate: null,
      toDate: null,
      reconciled: null
    });
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
      // Build query with current filters
      let query = supabase
        .from('transactions')
        .select('*, bank_accounts(name)')
        .eq('business_id', selectedBusiness.id);
      
      // Apply filters
      if (filters.accountId) {
        query = query.eq('account_id', filters.accountId);
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.fromDate) {
        query = query.gte('date', filters.fromDate);
      }
      
      if (filters.toDate) {
        query = query.lte('date', filters.toDate);
      }
      
      if (filters.reconciled !== null) {
        query = query.eq('reconciled', filters.reconciled);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedData = data.map(formatTransactionForCSV);
        const csv = convertToCSV(formattedData);
        const filename = `transactions_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
        
        downloadCSV(csv, filename);
      } else {
        alert('No transactions to export');
      }
    } catch (err: any) {
      console.error('Error exporting transactions:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  
  if (loading && transactions.length === 0) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all your financial transactions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {transactions.length > 0 && (
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
            onClick={() => navigate('/banking/transactions/new')}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="accountFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <select
                  id="accountFilter"
                  value={filters.accountId || ''}
                  onChange={(e) => handleFilterChange('accountId', e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  id="typeFilter"
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="transfer">Transfers</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="fromDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  id="fromDateFilter"
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="toDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  id="toDateFilter"
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
          
          {showFilters && (
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.reconciled === true}
                    onChange={() => {
                      if (filters.reconciled === true) {
                        handleFilterChange('reconciled', null);
                      } else {
                        handleFilterChange('reconciled', true);
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Reconciled Only</span>
                </label>
                
                <label className="inline-flex items-center ml-4">
                  <input
                    type="checkbox"
                    checked={filters.reconciled === false}
                    onChange={() => {
                      if (filters.reconciled === false) {
                        handleFilterChange('reconciled', null);
                      } else {
                        handleFilterChange('reconciled', false);
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Unreconciled Only</span>
                </label>
              </div>
              
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </Card>
      
      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Record your first transaction to start tracking your finances."
          icon={<CreditCard size={24} />}
          actionLabel="Record Transaction"
          actionLink="/banking/transactions/new"
        />
      ) : (
        <DataTable
          data={transactions}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Search transactions..."
          searchKeys={['transaction_number', 'description', 'category']}
          emptyMessage="No transactions found"
          onRowClick={(transaction) => navigate(`/banking/transactions/edit/${transaction.id}`)}
          columns={[
            {
              header: 'Date',
              accessor: (item) => format(new Date(item.date), 'MMM dd, yyyy')
            },
            {
              header: 'Account',
              accessor: (item) => item.bank_accounts?.name || 'Unknown'
            },
            {
              header: 'Description',
              accessor: 'description',
              className: 'font-medium text-gray-900'
            },
            {
              header: 'Type',
              accessor: (item) => (
                <span className={`flex items-center ${item.typeClass}`}>
                  {item.typeIcon}
                  <span className="ml-1 capitalize">{item.type}</span>
                </span>
              )
            },
            {
              header: 'Category',
              accessor: 'category'
            },
            {
              header: 'Amount',
              accessor: (item: TransactionWithDetails) => {
                const amount = formatCurrency(Number(item.amount));
                const colorClass = item.type === 'deposit' ? 'text-green-600' : 'text-red-600';
                return <span className={`font-medium ${colorClass}`}>{amount}</span>;
              }
            },
            {
              header: 'Reconciled',
              accessor: (item) => (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.reconciled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.reconciled ? 'Yes' : 'No'}
                </span>
              )
            }
          ]}
        />
      )}
    </Layout>
  );
}