-- Tie strategies and trade setups to accounts
-- Run this in the Supabase SQL Editor

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS account_id text;

ALTER TABLE public.trade_setups
  ADD COLUMN IF NOT EXISTS account_id text;

-- Optional: add FK constraints
-- ALTER TABLE public.strategies
--   ADD CONSTRAINT strategies_account_id_fkey
--   FOREIGN KEY (account_id) REFERENCES public.trading_accounts(id) ON DELETE SET NULL;
--
-- ALTER TABLE public.trade_setups
--   ADD CONSTRAINT trade_setups_account_id_fkey
--   FOREIGN KEY (account_id) REFERENCES public.trading_accounts(id) ON DELETE SET NULL;
