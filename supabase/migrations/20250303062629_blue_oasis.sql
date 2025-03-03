/*
  # Add insert policy for profiles table
  
  1. Security
    - Add a policy allowing authenticated users to insert their own profile
    - This fixes the 403 error during signup when creating a profile record
*/

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also add a policy for anon users during signup
CREATE POLICY "New users can create their profile during signup"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);