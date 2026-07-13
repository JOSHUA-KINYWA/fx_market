-- Fix trading_accounts default values
-- Run this in Supabase SQL Editor

-- Remove any existing default values on balance columns
ALTER TABLE IF EXISTS public.trading_accounts
  ALTER COLUMN initial_balance DROP DEFAULT,
  ALTER COLUMN current_balance DROP DEFAULT;

-- Ensure columns allow NULL or 0 instead of defaulting to 10000
ALTER TABLE IF EXISTS public.trading_accounts
  ALTER COLUMN initial_balance SET DEFAULT NULL,
  ALTER COLUMN current_balance SET DEFAULT NULL;

-- Drop any trigger that might be overwriting balances
DROP TRIGGER IF EXISTS set_default_account_balance ON public.trading_accounts;
DROP FUNCTION IF EXISTS public.set_default_account_balance();

-- Remove any default account if it was auto-created (optional)
-- DELETE FROM public.trading_accounts 
-- WHERE account_name = 'Default Account' AND initial_balance = 10000;
