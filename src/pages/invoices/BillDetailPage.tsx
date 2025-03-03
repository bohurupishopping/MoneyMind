import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, 
  FileText, 
  User, 
  Trash2, 
  AlertCircle,
  Pencil,
  CheckCircle
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DetailRow } from '../../components/shared/DetailRow';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DataTable } from '../../components/shared/DataTable';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Bill, BillItem } from '../../lib/supabase';

type BillWithCreditor = Bill & {
  creditors: {
    id: string;
    name: string;
  } | null;
};

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [bill, setBill] = useState<BillWithCreditor | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchBillData();
    }
  }, [selectedBusiness, id]);
  
  const fetchBillData = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch bill details
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*, creditors(id, name)')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (billError) throw billError;
      
      setBill(billData);
      
      // Fetch bill items
      const { data: itemsData, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', id)
        .order('id');
        
      if (itemsError) throw itemsError;
      
      setBillItems(itemsData || []);
    } catch (err: any) {
      console.error('Error fetching bill data:', err);
      setError('Failed to load bill details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/bills');
    } catch (err: any) {
      console.error('Error deleting bill:', err);
      alert('Failed to delete bill. Please try again.');
    }
  };
  
  const handleMarkAsPaid = async () => {
    if (!id || !bill) return;
    
    setMarkingAsPaid(true);
    
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'PAID' })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh bill data
      fetchBillData();
    } catch (err: any) {
      console.error('Error marking bill as paid:', err);
      alert('Failed to update bill status. Please try again.');
    } finally {
      setMarkingAsPaid(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get status type for badge
  const getStatusType = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'success';
      case 'OVERDUE':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
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
  
  if (!bill) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Bill not found.</p>
          <button
            onClick={() => navigate('/bills')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Bills
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={`Bill #${bill.bill_number}`}
        backLink="/bills"
        actionLabel="Edit"
        actionLink={`/bills/edit/${id}`}
        actionIcon={<Pencil className="h-4 w-4 mr-1" />}
      />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800">Bill Details</h3>
                <div className="mt-2">
                  <StatusBadge 
                    label={bill.status} 
                    type={getStatusType(bill.status) as any} 
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(Number(bill.total_amount))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <DetailRow
                  label="Bill Number"
                  value={bill.bill_number}
                />
                
                <DetailRow
                  label="Issue Date"
                  value={format(new Date(bill.issue_date), 'MMMM dd, yyyy')}
                />
                
                <DetailRow
                  label="Due Date"
                  value={format(new Date(bill.due_date), 'MMMM dd, yyyy')}
                />
                
                {bill.creditors && (
                  <DetailRow
                    label="Supplier"
                    value={
                      <button 
                        onClick={() => navigate(`/contacts/creditors/${bill.creditors?.id}`)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {bill.creditors.name}
                      </button>
                    }
                  />
                )}
              </div>
              
              <div>
                {bill.status !== 'PAID' && (
                  <div className="mb-4">
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={markingAsPaid}
                      className="flex items-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {markingAsPaid ? 'Updating...' : 'Mark as Paid'}
                    </button>
                  </div>
                )}
                
                {bill.notes && (
                  <DetailRow
                    label="Notes"
                    value={bill.notes}
                  />
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Bill Items</h4>
              
              {billItems.length === 0 ? (
                <p className="text-gray-500 italic">No items found for this bill.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {formatCurrency(Number(item.unit_price))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(Number(item.total_price))}
                          </td>
                        </tr>
                      ))}
                      
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          Total:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900 text-right">
                          {formatCurrency(Number(bill.total_amount))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div>
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Bill Summary</h3>
            
            <div className="space-y-6">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                <span>Created on {format(new Date(bill.created_at), 'MMM dd, yyyy')}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <FileText className="h-5 w-5 mr-2 text-gray-400" />
                <span>Bill #{bill.bill_number}</span>
              </div>
              
              {bill.creditors && (
                <div className="flex items-center text-gray-700">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Supplier: {bill.creditors.name}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-500">Status:</span>
                  <StatusBadge 
                    label={bill.status} 
                    type={getStatusType(bill.status) as any} 
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-500">Total Amount:</span>
                  <span className="font-bold">{formatCurrency(Number(bill.total_amount))}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Delete Bill</span>
              </button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this bill?</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 bg-white text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}