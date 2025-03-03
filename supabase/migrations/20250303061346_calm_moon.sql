/*
  # Initial Schema for Business Accounting Platform

  1. New Tables
    - `profiles` - User profiles with additional information
    - `businesses` - Business entities owned by users
    - `payment_receipts` - Records of payments received
    - `debtors` - People or businesses who owe money
    - `creditors` - People or businesses to whom money is owed
    - `purchases` - Records of items or services purchased
    - `invoices` - Invoices issued to debtors
    - `invoice_items` - Line items for invoices
    - `bills` - Bills received from creditors
    - `bill_items` - Line items for bills

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control based on business ownership
*/

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, name)
);

-- Enable RLS on businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own businesses
CREATE POLICY "Users can read own businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Create policy for users to create businesses
CREATE POLICY "Users can create businesses"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Create policy for users to update their own businesses
CREATE POLICY "Users can update own businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create policy for users to delete their own businesses
CREATE POLICY "Users can delete own businesses"
  ON businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create debtors table
CREATE TABLE IF NOT EXISTS debtors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  outstanding_amount DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on debtors
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read debtors from their businesses
CREATE POLICY "Users can read debtors from their businesses"
  ON debtors
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = debtors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create debtors for their businesses
CREATE POLICY "Users can create debtors for their businesses"
  ON debtors
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = debtors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update debtors from their businesses
CREATE POLICY "Users can update debtors from their businesses"
  ON debtors
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = debtors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete debtors from their businesses
CREATE POLICY "Users can delete debtors from their businesses"
  ON debtors
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = debtors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create creditors table
CREATE TABLE IF NOT EXISTS creditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  outstanding_amount DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on creditors
ALTER TABLE creditors ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read creditors from their businesses
CREATE POLICY "Users can read creditors from their businesses"
  ON creditors
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = creditors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create creditors for their businesses
CREATE POLICY "Users can create creditors for their businesses"
  ON creditors
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = creditors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update creditors from their businesses
CREATE POLICY "Users can update creditors from their businesses"
  ON creditors
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = creditors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete creditors from their businesses
CREATE POLICY "Users can delete creditors from their businesses"
  ON creditors
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = creditors.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create payment_receipts table
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  debtor_id UUID REFERENCES debtors(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payment_receipts
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read payment receipts from their businesses
CREATE POLICY "Users can read payment receipts from their businesses"
  ON payment_receipts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payment_receipts.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create payment receipts for their businesses
CREATE POLICY "Users can create payment receipts for their businesses"
  ON payment_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payment_receipts.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update payment receipts from their businesses
CREATE POLICY "Users can update payment receipts from their businesses"
  ON payment_receipts
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payment_receipts.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete payment receipts from their businesses
CREATE POLICY "Users can delete payment receipts from their businesses"
  ON payment_receipts
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payment_receipts.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  creditor_id UUID REFERENCES creditors(id),
  purchase_number TEXT NOT NULL,
  description TEXT,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read purchases from their businesses
CREATE POLICY "Users can read purchases from their businesses"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = purchases.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create purchases for their businesses
CREATE POLICY "Users can create purchases for their businesses"
  ON purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = purchases.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update purchases from their businesses
CREATE POLICY "Users can update purchases from their businesses"
  ON purchases
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = purchases.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete purchases from their businesses
CREATE POLICY "Users can delete purchases from their businesses"
  ON purchases
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = purchases.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  debtor_id UUID REFERENCES debtors(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read invoices from their businesses
CREATE POLICY "Users can read invoices from their businesses"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = invoices.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create invoices for their businesses
CREATE POLICY "Users can create invoices for their businesses"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = invoices.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update invoices from their businesses
CREATE POLICY "Users can update invoices from their businesses"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = invoices.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete invoices from their businesses
CREATE POLICY "Users can delete invoices from their businesses"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = invoices.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read invoice items from their businesses
CREATE POLICY "Users can read invoice items from their businesses"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN businesses ON invoices.business_id = businesses.id
    WHERE invoice_items.invoice_id = invoices.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create invoice items for their businesses
CREATE POLICY "Users can create invoice items for their businesses"
  ON invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    JOIN businesses ON invoices.business_id = businesses.id
    WHERE invoice_items.invoice_id = invoices.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update invoice items from their businesses
CREATE POLICY "Users can update invoice items from their businesses"
  ON invoice_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN businesses ON invoices.business_id = businesses.id
    WHERE invoice_items.invoice_id = invoices.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete invoice items from their businesses
CREATE POLICY "Users can delete invoice items from their businesses"
  ON invoice_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN businesses ON invoices.business_id = businesses.id
    WHERE invoice_items.invoice_id = invoices.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  creditor_id UUID REFERENCES creditors(id),
  bill_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read bills from their businesses
CREATE POLICY "Users can read bills from their businesses"
  ON bills
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bills.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create bills for their businesses
CREATE POLICY "Users can create bills for their businesses"
  ON bills
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bills.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update bills from their businesses
CREATE POLICY "Users can update bills from their businesses"
  ON bills
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bills.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete bills from their businesses
CREATE POLICY "Users can delete bills from their businesses"
  ON bills
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bills.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create bill_items table
CREATE TABLE IF NOT EXISTS bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on bill_items
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read bill items from their businesses
CREATE POLICY "Users can read bill items from their businesses"
  ON bill_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bills
    JOIN businesses ON bills.business_id = businesses.id
    WHERE bill_items.bill_id = bills.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create bill items for their businesses
CREATE POLICY "Users can create bill items for their businesses"
  ON bill_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bills
    JOIN businesses ON bills.business_id = businesses.id
    WHERE bill_items.bill_id = bills.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update bill items from their businesses
CREATE POLICY "Users can update bill items from their businesses"
  ON bill_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bills
    JOIN businesses ON bills.business_id = businesses.id
    WHERE bill_items.bill_id = bills.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete bill items from their businesses
CREATE POLICY "Users can delete bill items from their businesses"
  ON bill_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bills
    JOIN businesses ON bills.business_id = businesses.id
    WHERE bill_items.bill_id = bills.id
    AND businesses.owner_id = auth.uid()
  ));

-- Create triggers to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up trigger for each table
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_businesses_modtime
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_debtors_modtime
BEFORE UPDATE ON debtors
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_creditors_modtime
BEFORE UPDATE ON creditors
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_payment_receipts_modtime
BEFORE UPDATE ON payment_receipts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_purchases_modtime
BEFORE UPDATE ON purchases
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_invoices_modtime
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_invoice_items_modtime
BEFORE UPDATE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_bills_modtime
BEFORE UPDATE ON bills
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_bill_items_modtime
BEFORE UPDATE ON bill_items
FOR EACH ROW EXECUTE FUNCTION update_modified_column();