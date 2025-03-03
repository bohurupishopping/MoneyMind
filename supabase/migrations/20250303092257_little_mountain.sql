/*
  # Payment System Schema

  1. New Indexes
    - Add index on payment_receipts(debtor_id) for faster lookups
    - Add index on payments(creditor_id) for faster lookups

  2. Constraints
    - Ensure payment amounts are positive
    - Ensure receipt amounts are positive
*/

-- Add indexes for foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS payment_receipts_debtor_id_idx ON payment_receipts(debtor_id);
CREATE INDEX IF NOT EXISTS payments_creditor_id_idx ON payments(creditor_id);

-- Add check constraints to ensure amounts are positive
ALTER TABLE payments 
ADD CONSTRAINT positive_payment_amount CHECK (amount > 0);

ALTER TABLE payment_receipts 
ADD CONSTRAINT positive_receipt_amount CHECK (amount > 0);

-- Add indexes for reference_id in transactions table
CREATE INDEX IF NOT EXISTS transactions_reference_id_idx ON transactions(reference_id);