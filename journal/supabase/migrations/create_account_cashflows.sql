-- Create account cashflow ledger table for deposits and profit withdrawals.
-- Run this in the Supabase SQL Editor for your hosted project.

CREATE TABLE IF NOT EXISTS public.account_cashflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'review')),
  reason text,
  note text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_cashflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account cashflows"
ON public.account_cashflows FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account cashflows"
ON public.account_cashflows FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account cashflows"
ON public.account_cashflows FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own account cashflows"
ON public.account_cashflows FOR DELETE
USING (auth.uid() = user_id);
