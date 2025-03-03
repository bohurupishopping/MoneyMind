import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor } from '../../lib/supabase';

type FormData = {
  purchaseNumber: string;
  purchaseDate: string;
  creditorId: string;
  description: string;
  itemName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
};

type LocationState = {
  creditorId?: string;
};

export function NewPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as LocationState;
  
  const [formData, setFormData] = useState<FormData>({
    purchaseNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    creditorId: locationState?.creditorId || '',
    description: '',
    itemName: '',
    quantity: '1',
    unitPrice: '',
    totalPrice: '0.00',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [fetchingCreditors, setFetchingCreditors] = useState(true);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchCreditors();
      generatePurchaseNumber();
    }
  }, [selectedBusiness]);
  
  // Calculate total price when quantity or unit price changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const totalPrice = (quantity * unitPrice).toFixed(2);
    
    setFormData(prev => ({
      ...prev,
      totalPrice
    }));
  }, [formData.quantity, formData.unitPrice]);
  
  const fetchCreditors = async () => {
    if (!selectedBusiness) return;
    
    setFetchingCreditors(true);
    
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('name');
        
      if (error) throw error;
      
      setCreditors(data || []);
    } catch (err: any) {
      console.error('Error fetching creditors:', err);
    } finally {
      setFetchingCreditors(false);
    }
  };
  
  const generatePurchaseNumber = async () => {
    if (!selectedBusiness) return;
    
    try {
      // Get the highest purchase number
      const { data, error } = await supabase
        .from('purchases')
        .select('purchase_number')
        .eq('business_id', selectedBusiness.id)
        .order('purchase_number', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      let nextNumber = 1;
      
      if (data && data.length > 0 && data[0].purchase_number) {
        // Extract number from PUR-XXXX format
        const match = data[0].purchase_number.match(/PUR-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Format with leading zeros
      const purchaseNumber = `PUR-${nextNumber.toString().padStart(4, '0')}`;
      
      setFormData(prev => ({ ...prev, purchaseNumber }));
    } catch (err: any) {
      console.error('Error generating purchase number:', err);
      // Use a fallback pattern with timestamp
      const timestamp = new Date().getTime().toString().slice(-6);
      setFormData(prev => ({ ...prev, purchaseNumber: `PUR-${timestamp}` }));
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.purchaseNumber.trim()) {
      newErrors.purchaseNumber = 'Purchase number is required';
    }
    
    if (!formData.purchaseDate.trim()) {
      newErrors.purchaseDate = 'Purchase date is required';
    }
    
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }
    
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors.quantity = 'Quantity must be a positive number';
      }
    }
    
    if (!formData.unitPrice.trim()) {
      newErrors.unitPrice = 'Unit price is required';
    } else {
      const unitPrice = parseFloat(formData.unitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        newErrors.unitPrice = 'Unit price must be a positive number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedBusiness) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert({
          business_id: selectedBusiness.id,
          purchase_number: formData.purchaseNumber,
          purchase_date: formData.purchaseDate,
          creditor_id: formData.creditorId || null,
          description: formData.description || null,
          item_name: formData.itemName,
          quantity: parseFloat(formData.quantity),
          unit_price: parseFloat(formData.unitPrice),
          total_price: parseFloat(formData.totalPrice)
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // If there's a creditor, update their outstanding amount
      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const newOutstandingAmount = Number(creditor.outstanding_amount) + parseFloat(formData.totalPrice);
          
          const { error: updateError } = await supabase
            .from('creditors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', formData.creditorId);
            
          if (updateError) {
            console.error('Error updating creditor outstanding amount:', updateError);
            // Continue anyway as the purchase was created successfully
          }
        }
      }
      
      navigate('/purchases');
    } catch (err: any) {
      console.error('Error creating purchase:', err);
      alert('Failed to create purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        title="Record New Purchase"
        backLink="/purchases"
      />
      
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormRow
                label="Purchase Number"
                htmlFor="purchaseNumber"
                error={errors.purchaseNumber}
                required
              >
                <input
                  id="purchaseNumber"
                  name="purchaseNumber"
                  type="text"
                  value={formData.purchaseNumber}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.purchaseNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="PUR-0001"
                />
              </FormRow>
              
              <FormRow
                label="Purchase Date"
                htmlFor="purchaseDate"
                error={errors.purchaseDate}
                required
              >
                <input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.purchaseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormRow>
              
              <FormRow
                label="Supplier (Creditor)"
                htmlFor="creditorId"
              >
                <select
                  id="creditorId"
                  name="creditorId"
                  value={formData.creditorId}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={fetchingCreditors}
                >
                  <option value="">-- Select Supplier (Optional) --</option>
                  {creditors.map(creditor => (
                    <option key={creditor.id} value={creditor.id}>
                      {creditor.name}
                    </option>
                  ))}
                </select>
              </FormRow>
              
              <FormRow
                label="Description"
                htmlFor="description"
              >
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional details about this purchase"
                />
              </FormRow>
            </div>
            
            <div>
              <FormRow
                label="Item Name"
                htmlFor="itemName"
                error={errors.itemName}
                required
              >
                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  value={formData.itemName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.itemName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Office Supplies, Equipment, etc."
                />
              </FormRow>
              
              <FormRow
                label="Quantity"
                htmlFor="quantity"
                error={errors.quantity}
                required
              >
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1"
                />
              </FormRow>
              
              <FormRow
                label="Unit Price"
                htmlFor="unitPrice"
                error={errors.unitPrice}
                required
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    className={`pl-8 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.unitPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </FormRow>
              
              <FormRow
                label="Total Price"
                htmlFor="totalPrice"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    id="totalPrice"
                    name="totalPrice"
                    type="number"
                    step="0.01"
                    value={formData.totalPrice}
                    readOnly
                    className="pl-8 w-full p-2 bg-gray-50 border border-gray-300 rounded-md"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Automatically calculated based on quantity and unit price
                </p>
              </FormRow>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Purchase'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}