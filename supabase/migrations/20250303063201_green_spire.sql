/*
  # Create profiles for existing users

  1. Changes
    - Ensures profiles exist for all authenticated users
    - Fixes foreign key constraint issues when creating businesses
    
  2. Details
    - Automatically creates profile records for any auth users who don't have one
    - Uses user id and email from the auth.users table
*/

-- Create profiles for existing users who don't have one already
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id, email FROM auth.users
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    INSERT INTO profiles (id, email, created_at, updated_at)
    VALUES (user_record.id, user_record.email, NOW(), NOW());
  END LOOP;
END $$;