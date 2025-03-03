/*
  # Banking & Cash Management

  1. New Tables
    - `bank_accounts`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `name` (text)
      - `account_number` (text)
      - `account_type` (text)
      - `opening_balance` (decimal)
      - `current_balance` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `account_id` (uuid, foreign key to bank_accounts)
      - `reference_id` (uuid, nullable - for transfer pairing)
      - `transaction_number` (text)
      - `type` (text - deposit, withdrawal, transfer)
      - `amount` (decimal)
      - `date` (date)
      - `description` (text)
      - `category` (text)
      - `reconciled` (boolean)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for CRUD operations
*/

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_number TEXT,
  account_type TEXT NOT NULL,
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_accounts
CREATE POLICY "Users can read bank accounts from their businesses"
  ON bank_accounts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bank_accounts.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create bank accounts for their businesses"
  ON bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bank_accounts.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update bank accounts from their businesses"
  ON bank_accounts
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bank_accounts.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete bank accounts from their businesses"
  ON bank_accounts
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = bank_accounts.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  reference_id UUID, -- For transfers (pairing withdrawal with deposit)
  transaction_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT,
  category TEXT,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can read transactions from their businesses"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = transactions.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create transactions for their businesses"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = transactions.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update transactions from their businesses"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = transactions.business_id
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete transactions from their businesses"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = transactions.business_id
    AND businesses.owner_id = auth.uid()
  ));

-- Set up trigger for each table
CREATE TRIGGER update_bank_accounts_modtime
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_transactions_modtime
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add function to update bank account balance when transaction is created/updated/deleted
CREATE OR REPLACE FUNCTION update_bank_account_balance() RETURNS TRIGGER AS $$
BEGIN
  -- Update account balance
  IF TG_OP = 'INSERT' THEN
    -- For new transactions
    IF NEW.type = 'deposit' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'withdrawal' OR NEW.type = 'transfer' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updated transactions
    IF OLD.type = 'deposit' THEN
      -- Reverse old deposit
      UPDATE bank_accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'withdrawal' OR OLD.type = 'transfer' THEN
      -- Reverse old withdrawal
      UPDATE bank_accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
    END IF;
    
    -- Apply new transaction
    IF NEW.type = 'deposit' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'withdrawal' OR NEW.type = 'transfer' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- For deleted transactions
    IF OLD.type = 'deposit' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'withdrawal' OR OLD.type = 'transfer' THEN
      UPDATE bank_accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for transaction balance updates
CREATE TRIGGER update_balance_on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

CREATE TRIGGER update_balance_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

CREATE TRIGGER update_balance_on_transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();