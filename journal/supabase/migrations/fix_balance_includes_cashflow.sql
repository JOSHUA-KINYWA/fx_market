-- Keep this function for older callers/triggers, but do not rebuild
-- current_balance from journal trades. Manual records are incomplete
-- versus the broker statement, so a rebuild would overwrite 104.14.

DROP FUNCTION IF EXISTS public.update_account_balance(uuid);

CREATE FUNCTION public.update_account_balance(account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentionally no-op. Account balance is the broker ledger:
  -- statement balance, then deposits/withdrawals/new trade P&L applied in the app.
  RETURN;
END;
$$;
