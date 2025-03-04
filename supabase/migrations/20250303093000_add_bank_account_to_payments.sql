/*
  # Add Bank Account Support to Payments

  1. Changes:
    - Add bank_account_id column to payments table
    - Add foreign key constraint to bank_accounts table
    - Add index for bank_account_id
    - Update existing payments to handle the new column
*/

-- Add bank_account_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'bank_account_id'
    ) THEN
        -- Add the new column
        ALTER TABLE payments
        ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);

        -- Create index for the new column
        CREATE INDEX IF NOT EXISTS payments_bank_account_id_idx 
        ON payments(bank_account_id);

        -- Update existing bank transfer payments
        -- This will set bank_account_id to NULL for existing payments
        -- You may want to handle this differently based on your data
        UPDATE payments
        SET bank_account_id = NULL
        WHERE payment_method = 'Bank Transfer';
    END IF;
END $$; 