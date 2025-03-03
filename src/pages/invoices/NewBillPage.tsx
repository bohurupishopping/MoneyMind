import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { FormRow } from '../../components/shared/FormRow';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase, Creditor } from '../../lib/supabase';

type FormData = {
  billNumber: string;
  issueDate: string;
  dueDate: string;
  creditorId: string;
  notes: string;
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>;
  totalAmount: string;
};

type LocationState = {
  creditorId?: string;
};

export function NewBillPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusiness } = useBusiness();
  const locationState = location.state as LocationState;

  const [formData, setFormData] = useState<FormData>({
    billNumber: '',
    issueDate: new Date().toISOString().split('T')[0], // Today's date
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    creditorId: locationState?.creditorId || '',
    notes: '',
    items: [
      {
        id: Date.now().toString(),
        description: '',
        quantity: '1',
        unitPrice: '',
        totalPrice: '0.00'
      }
    ],
    totalAmount: '0.00'
  });

  const [errors, setErrors] = useState<Partial<FormData> & { items?: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [fetchingCreditors, setFetchingCreditors] = useState(true);

  useEffect(() => {
    if (selectedBusiness) {
      fetchCreditors();
      generateBillNumber();
    }
  }, [selectedBusiness]);

  // Calculate total amount whenever items change
  useEffect(() => {
    calculateTotals();
  }, [formData.items]);

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

  const generateBillNumber = async () => {
    if (!selectedBusiness) return;

    try {
      // Get the highest bill number
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .eq('business_id', selectedBusiness.id)
        .order('bill_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;

      if (data && data.length > 0 && data[0].bill_number) {
        // Extract number from BILL-XXXX format
        const match = data[0].bill_number.match(/BILL-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format with leading zeros
      const billNumber = `BILL-${nextNumber.toString().padStart(4, '0')}`;

      setFormData(prev => ({ ...prev, billNumber }));
    } catch (err: any) {
      console.error('Error generating bill number:', err);
      // Use a fallback pattern with timestamp
      const timestamp = new Date().getTime().toString().slice(-6);
      setFormData(prev => ({ ...prev, billNumber: `BILL-${timestamp}` }));
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

  const handleItemChange = (index: number, field: string, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Update the total price for this item if quantity or unit price changed
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(field === 'quantity' ? value : updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unitPrice' ? value : updatedItems[index].unitPrice) || 0;
      updatedItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));

    // Clear error for this item if it exists
    if (errors.items && errors.items[index] && errors.items[index][field]) {
      const updatedErrors = { ...errors };
      if (updatedErrors.items) {
        updatedErrors.items[index] = { ...updatedErrors.items[index], [field]: undefined };
      }
      setErrors(updatedErrors);
    }
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      quantity: '1',
      unitPrice: '',
      totalPrice: '0.00'
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return; // Don't remove the last item

    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const calculateTotals = () => {
    // Calculate sum of all item total prices
    const totalAmount = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);

    setFormData(prev => ({ ...prev, totalAmount: totalAmount.toFixed(2) }));
  };

  const validateForm = () => {
    const newErrors: any = {};
    const itemErrors: any[] = [];
    let hasErrors = false;

    if (!formData.billNumber.trim()) {
      newErrors.billNumber = 'Bill number is required';
      hasErrors = true;
    }

    if (!formData.issueDate.trim()) {
      newErrors.issueDate = 'Issue date is required';
      hasErrors = true;
    }

    if (!formData.dueDate.trim()) {
      newErrors.dueDate = 'Due date is required';
      hasErrors = true;
    } else {
      const issueDate = new Date(formData.issueDate);
      const dueDate = new Date(formData.dueDate);
      if (dueDate < issueDate) {
        newErrors.dueDate = 'Due date cannot be earlier than issue date';
        hasErrors = true;
      }
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      const itemError: any = {};

      if (!item.description.trim()) {
        itemError.description = 'Description is required';
        hasErrors = true;
      }

      if (!item.quantity.trim()) {
        itemError.quantity = 'Quantity is required';
        hasErrors = true;
      } else {
        const quantity = parseFloat(item.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          itemError.quantity = 'Quantity must be a positive number';
          hasErrors = true;
        }
      }

      if (!item.unitPrice.trim()) {
        itemError.unitPrice = 'Unit price is required';
        hasErrors = true;
      } else {
        const unitPrice = parseFloat(item.unitPrice);
        if (isNaN(unitPrice) || unitPrice <= 0) {
          itemError.unitPrice = 'Unit price must be a positive number';
          hasErrors = true;
        }
      }

      itemErrors[index] = itemError;
    });

    if (itemErrors.some(error => Object.keys(error).length > 0)) {
      newErrors.items = itemErrors;
    }

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedBusiness) return;

    setLoading(true);

    try {
      // First create the bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          business_id: selectedBusiness.id,
          bill_number: formData.billNumber,
          issue_date: formData.issueDate,
          due_date: formData.dueDate,
          creditor_id: formData.creditorId || null,
          status: 'PENDING',
          total_amount: parseFloat(formData.totalAmount),
          notes: formData.notes || null
        })
        .select()
        .single();

      if (billError) throw billError;

      // Then add the bill items
      const billItems = formData.items.map(item => ({
        bill_id: bill.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unitPrice),
        total_price: parseFloat(item.totalPrice)
      }));

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);

      if (itemsError) throw itemsError;

      // Update creditor's outstanding amount if a creditor is selected
      if (formData.creditorId) {
        const creditor = creditors.find(c => c.id === formData.creditorId);
        if (creditor) {
          const newOutstandingAmount = Number(creditor.outstanding_amount) + parseFloat(formData.totalAmount);

          const { error: updateError } = await supabase
            .from('creditors')
            .update({ outstanding_amount: newOutstandingAmount })
            .eq('id', formData.creditorId);

          if (updateError) {
            console.error('Error updating creditor outstanding amount:', updateError);
            // Continue anyway as the bill was created successfully
          }
        }
      }

      navigate('/bills');
    } catch (err: any) {
      console.error('Error creating bill:', err);
      alert('Failed to create bill. Please try again.');
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
        title="Create New Bill"
        backLink="/bills"
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <FormRow
                label="Bill Number"
                htmlFor="billNumber"
                error={errors.billNumber}
                required
              >
                <input
                  id="billNumber"
                  name="billNumber"
                  type="text"
                  value={formData.billNumber}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.billNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="BILL-0001"
                />
              </FormRow>

              <FormRow
                label="Issue Date"
                htmlFor="issueDate"
                error={errors.issueDate}
                required
              >
                <input
                  id="issueDate"
                  name="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.issueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormRow>

              <FormRow
                label="Due Date"
                htmlFor="dueDate"
                error={errors.dueDate}
                required
              >
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.dueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormRow>
            </div>

            <div>
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
                label="Notes"
                htmlFor="notes"
              >
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional notes for this bill"
                />
              </FormRow>
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mb-4">Bill Items</h3>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
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
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-normal">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.items && errors.items[index]?.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Item description"
                      />
                      {errors.items && errors.items[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right ${
                          errors.items && errors.items[index]?.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.items && errors.items[index]?.quantity && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].quantity}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">$</span>
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className={`pl-8 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right ${
                            errors.items && errors.items[index]?.unitPrice ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.items && errors.items[index]?.unitPrice && (
                          <p className="mt-1 text-sm text-red-600">{errors.items[index].unitPrice}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">$</span>
                        </div>
                        <input
                          type="text"
                          value={item.totalPrice}
                          readOnly
                          className="pl-8 w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-right"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium text-gray-700">
                    Total:
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    ${formData.totalAmount}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={addItem}
              className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
            >
              + Add Item
            </button>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/bills')}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}