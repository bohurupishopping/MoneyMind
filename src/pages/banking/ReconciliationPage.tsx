import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle, 
  CreditCard,
  Save
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Transaction, BankAccount } from '../../lib/supabase';

type TransactionWithDetails = Transaction & {
  bank_accounts: {
    name: string;
  };
  typeIcon: React.ReactNode;
  typeClass: string;
  selected: boolean;
};

export function ReconciliationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as { accountId?: string } | null;
  
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>(locationState?.accountId || '');
  const [statementBalance, setStatementBalance] = useState<string>('');
  const [statementDate, setStatementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difference, setDifference] = useState<number>(0);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchAccounts();
    }
  }, [selectedBusiness]);
  
  useEffect(() => {
    if (selectedBusiness && selectedAccount) {
      fetchTransactions();
    }
  }, [selectedBusiness, selectedAccount]);
  
  useEffect(() => {
    // Calculate the difference between the statement balance and the reconciled transactions
    if (statementBalance) {
      const reconciledAmount = transactions
        .filter(t => t.selected || t.reconciled)
        .reduce((sum, t) => {
          if (t.type === 'deposit') {
            return sum + Number(t.amount);
          } else {
            return sum - Number(t.amount);
          }
        }, 0);
      
      const diff = parseFloat(statementBalance) - reconciledAmount;
      setDifference(diff);
    }
  }, [transactions, statementBalance]);
  
  const fetchAccounts = async () => {
    if (!selectedBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, current_balance')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
    }
  };
  
  const fetchTransactions = async () => {
    if (!selectedBusiness || !selectedAccount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the account's current balance to use as default statement balance
      const { data: accountData, error: accountError } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', selectedAccount)
        .single();
        
      if (accountError) throw accountError;
      
      // Set default statement balance from account
      if (accountData && !statementBalance) {
        setStatementBalance(accountData.current_balance.toString());
      }
      
      // Fetch unreconciled transactions for this account
      const { data, error } = await supabase
        .from('transactions')
        .select('*, bank_accounts(name)')
        .eq('business_id', selectedBusiness.id)
        .eq('account_id', selectedAccount)
        .order('date', { ascending: false });
        
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
          typeClass,
          selected: transaction.reconciled
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
  
  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(e.target.value);
    setStatementBalance(''); // Reset statement balance when account changes
  };
  
  const handleStatementBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatementBalance(e.target.value);
  };
  
  const handleStatementDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatementDate(e.target.value);
  };
  
  const toggleTransaction = (index: number) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index].selected = !updatedTransactions[index].selected;
    setTransactions(updatedTransactions);
  };
  
  const handleSave = async () => {
    if (!selectedBusiness || !selectedAccount) return;
    
    setSaving(true);
    
    try {
      // Update all selected transactions to be reconciled
      const transactionsToUpdate = transactions
        .filter(t => t.selected && !t.reconciled)
        .map(t => t.id);
      
      if (transactionsToUpdate.length > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({ reconciled: true })
          .in('id', transactionsToUpdate);
          
        if (error) throw error;
      }
      
      // Also update any transactions that were deselected
      const transactionsToUnreconcile = transactions
        .filter(t => !t.selected && t.reconciled)
        .map(t => t.id);
      
      if (transactionsToUnreconcile.length > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({ reconciled: false })
          .in('id', transactionsToUnreconcile);
          
        if (error) throw error;
      }
      
      // Show success and navigate back to account or transactions page
      alert('Reconciliation saved successfully.');
      
      if (locationState?.accountId) {
        navigate(`/banking/accounts/${locationState.accountId}`);
      } else {
        navigate('/banking/transactions');
      }
    } catch (err: any) {
      console.error('Error saving reconciliation:', err);
      alert('Failed to save reconciliation. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
      <PageHeader
        title="Account Reconciliation"
        subtitle="Match your bank statement with your records"
        backLink={locationState?.accountId ? `/banking/accounts/${locationState.accountId}` : "/banking/transactions"}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}
      
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="accountSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Select Account
              </label>
              <select
                id="accountSelect"
                value={selectedAccount}
                onChange={handleAccountChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!!locationState?.accountId}
              >
                <option value="">-- Select Account --</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} (Balance: {formatCurrency(Number(account.current_balance))})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="statementBalance" className="block text-sm font-medium text-gray-700 mb-1">
                Statement Balance
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  id="statementBalance"
                  type="number"
                  step="0.01"
                  value={statementBalance}
                  onChange={handleStatementBalanceChange}
                  className="pl-8 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="statementDate" className="block text-sm font-medium text-gray-700 mb-1">
                Statement Date
              </label>
              <input
                id="statementDate"
                type="date"
                value={statementDate}
                onChange={handleStatementDateChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          {statementBalance && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-gray-700">Difference: </span>
                  <span className={`font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(difference)}
                  </span>
                  {Math.abs(difference) < 0.01 && (
                    <span className="ml-2 text-sm text-green-600 flex items-center inline-flex">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Balanced
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Reconciliation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {selectedAccount ? (
        transactions.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-gray-500">No transactions found for this account.</p>
              <button
                onClick={() => navigate('/banking/transactions/new', { state: { accountId: selectedAccount } })}
                className="mt-4 inline-flex items-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
              >
                Record First Transaction
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      <span className="sr-only">Select</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr 
                      key={transaction.id}
                      className={transaction.selected ? 'bg-green-50' : 'hover:bg-gray-50'}
                      onClick={() => toggleTransaction(index)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={transaction.selected}
                            onChange={() => {}} // Handled by row click
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`flex items-center ${transaction.typeClass}`}>
                          {transaction.typeIcon}
                          <span className="ml-1 capitalize">{transaction.type}</span>
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(transaction.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full mb-4">
              <CreditCard className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">Select an Account</h3>
            <p className="text-gray-600 mb-4">
              Choose a bank account to reconcile from the dropdown above.
            </p>
          </div>
        </Card>
      )}
    </Layout>
  );
}