import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anonymous key');
}

// Create a single supabase client for the entire app
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Type definitions for database tables
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Debtor = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstanding_amount: number;
  created_at: string;
  updated_at: string;
};

export type Creditor = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstanding_amount: number;
  created_at: string;
  updated_at: string;
};

export type PaymentReceipt = {
  id: string;
  business_id: string;
  receipt_number: string;
  debtor_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  business_id: string;
  payment_number: string;
  creditor_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  business_id: string;
  creditor_id: string | null;
  purchase_number: string;
  description: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  business_id: string;
  debtor_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
};

export type Bill = {
  id: string;
  business_id: string;
  creditor_id: string | null;
  bill_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillItem = {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
};

// Types for Banking & Cash Management
export type BankAccount = {
  id: string;
  business_id: string;
  name: string;
  account_number: string | null;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  business_id: string;
  account_id: string;
  reference_id: string | null;
  transaction_number: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description: string | null;
  category: string | null;
  reconciled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};