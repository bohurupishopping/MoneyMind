import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  User, 
  Trash2, 
  AlertCircle,
  Pencil
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { DetailRow } from '../../components/shared/DetailRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, PaymentReceipt } from '../../lib/supabase';

type ReceiptWithDebtor = PaymentReceipt & {
  debtors: {
    id: string;
    name: string;
  } | null;
};

export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [receipt, setReceipt] = useState<ReceiptWithDebtor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchReceipt();
    }
  }, [selectedBusiness, id]);
  
  const fetchReceipt = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*, debtors(id, name)')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      setReceipt(data);
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      setError('Failed to load receipt details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('payment_receipts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/receipts');
    } catch (err: any) {
      console.error('Error deleting receipt:', err);
      alert('Failed to delete receipt. Please try again.');
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
  
  if (!receipt) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Receipt not found.</p>
          <button
            onClick={() => navigate('/receipts')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Receipts
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={`Receipt #${receipt.receipt_number}`}
        backLink="/receipts"
        actionLabel="Edit"
        actionLink={`/receipts/edit/${id}`}
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
              <h3 className="text-lg font-medium text-gray-800">Payment Details</h3>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(Number(receipt.amount))}
              </div>
            </div>
            
            <div className="space-y-3 divide-y divide-gray-200">
              <DetailRow
                label="Receipt Number"
                value={receipt.receipt_number}
              />
              
              <div className="flex flex-col sm:flex-row sm:gap-12">
                <DetailRow
                  label="Payment Date"
                  value={format(new Date(receipt.payment_date), 'MMMM dd, yyyy')}
                  className="py-3 flex-1"
                />
                
                <DetailRow
                  label="Payment Method"
                  value={receipt.payment_method || 'Not specified'}
                  className="py-3 flex-1"
                />
              </div>
              
              {receipt.debtors && (
                <DetailRow
                  label="From"
                  value={
                    <button 
                      onClick={() => navigate(`/contacts/debtors/${receipt.debtors?.id}`)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {receipt.debtors.name}
                    </button>
                  }
                />
              )}
              
              {receipt.reference && (
                <DetailRow
                  label="Reference"
                  value={receipt.reference}
                />
              )}
              
              {receipt.notes && (
                <DetailRow
                  label="Notes"
                  value={receipt.notes}
                />
              )}
            </div>
          </Card>
        </div>
        
        <div>
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Payment Summary</h3>
            
            <div className="space-y-6">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                <span>Payment recorded on {format(new Date(receipt.created_at), 'MMM dd, yyyy')}</span>
              </div>
              
              {receipt.debtors && (
                <div className="flex items-center text-gray-700">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Paid by {receipt.debtors.name}</span>
                </div>
              )}
              
              {receipt.payment_method && (
                <div className="flex items-center text-gray-700">
                  <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Paid via {receipt.payment_method}</span>
                </div>
              )}
              
              {receipt.reference && (
                <div className="flex items-center text-gray-700">
                  <FileText className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Reference: {receipt.reference}</span>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Delete Receipt</span>
              </button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this receipt?</p>
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