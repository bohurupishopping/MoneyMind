/*
  # Payment System Implementation

  1. New Tables
    - `payments` - Store payment transactions to creditors
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `payment_number` (text, identifier)
      - `creditor_id` (uuid, foreign key to creditors, optional)
      - `bank_account_id` (uuid, foreign key to bank_accounts, optional)
      - `amount` (decimal)
      - `payment_date` (date)
      - `payment_method` (text, optional)
      - `reference` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on the new table
    - Add policies for CRUD operations
    - Create trigger for updated_at column
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  creditor_id UUID REFERENCES creditors(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read payments from their businesses
CREATE POLICY "Users can read payments from their businesses"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payments.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to create payments for their businesses
CREATE POLICY "Users can create payments for their businesses"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payments.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to update payments from their businesses
CREATE POLICY "Users can update payments from their businesses"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payments.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create policy for users to delete payments from their businesses
CREATE POLICY "Users can delete payments from their businesses"
  ON payments
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payments.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Set up trigger for the payments table
CREATE TRIGGER update_payments_modtime
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();