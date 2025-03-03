/*
  # Add API requests tracking table

  1. New Tables
    - `api_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `endpoint` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `api_requests` table
    - Add policy for authenticated users to read their own requests
    - Add policy for service role to create requests
*/

-- Create api_requests table
CREATE TABLE IF NOT EXISTS api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own requests"
  ON api_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can create requests"
  ON api_requests
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS api_requests_user_id_created_at_idx 
  ON api_requests(user_id, created_at);