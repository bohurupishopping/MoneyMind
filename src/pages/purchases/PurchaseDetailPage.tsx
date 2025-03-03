import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, 
  ShoppingBag, 
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
import { supabase, Purchase } from '../../lib/supabase';

type PurchaseWithCreditor = Purchase & {
  creditors: {
    id: string;
    name: string;
  } | null;
};

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  
  const [purchase, setPurchase] = useState<PurchaseWithCreditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (selectedBusiness && id) {
      fetchPurchase();
    }
  }, [selectedBusiness, id]);
  
  const fetchPurchase = async () => {
    if (!selectedBusiness || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, creditors(id, name)')
        .eq('id', id)
        .eq('business_id', selectedBusiness.id)
        .single();
        
      if (error) throw error;
      
      setPurchase(data);
    } catch (err: any) {
      console.error('Error fetching purchase:', err);
      setError('Failed to load purchase details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/purchases');
    } catch (err: any) {
      console.error('Error deleting purchase:', err);
      alert('Failed to delete purchase. Please try again.');
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
  
  if (!purchase) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Purchase not found.</p>
          <button
            onClick={() => navigate('/purchases')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Back to Purchases
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={`Purchase #${purchase.purchase_number}`}
        backLink="/purchases"
        actionLabel="Edit"
        actionLink={`/purchases/edit/${id}`}
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
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-medium text-gray-800">Purchase Details</h3>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(Number(purchase.total_price))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <DetailRow
                  label="Purchase Number"
                  value={purchase.purchase_number}
                />
                
                <DetailRow
                  label="Purchase Date"
                  value={format(new Date(purchase.purchase_date), 'MMMM dd, yyyy')}
                />
                
                {purchase.creditors && (
                  <DetailRow
                    label="Supplier"
                    value={
                      <button 
                        onClick={() => navigate(`/contacts/creditors/${purchase.creditors?.id}`)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {purchase.creditors.name}
                      </button>
                    }
                  />
                )}
              </div>
              
              <div>
                <DetailRow
                  label="Item"
                  value={purchase.item_name}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow
                    label="Quantity"
                    value={purchase.quantity}
                  />
                  
                  <DetailRow
                    label="Unit Price"
                    value={formatCurrency(Number(purchase.unit_price))}
                  />
                </div>
                
                <DetailRow
                  label="Total Price"
                  value={formatCurrency(Number(purchase.total_price))}
                  className="font-medium"
                />
              </div>
            </div>
            
            {purchase.description && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                <p className="text-gray-800">{purchase.description}</p>
              </div>
            )}
          </Card>
        </div>
        
        <div>
          <Card>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Purchase Summary</h3>
            
            <div className="space-y-6">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                <span>Purchased on {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <ShoppingBag className="h-5 w-5 mr-2 text-gray-400" />
                <span>{purchase.quantity} × {purchase.item_name}</span>
              </div>
              
              {purchase.creditors && (
                <div className="flex items-center text-gray-700">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Purchased from {purchase.creditors.name}</span>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Delete Purchase</span>
              </button>
              
              {showDeleteConfirm && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this purchase?</p>
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