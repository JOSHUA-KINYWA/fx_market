type CashflowLike = {
  type?: string | null;
  amount?: number | string | null;
  status?: string | null;
};

type TradeLike = {
  status?: string | null;
  profit_loss?: number | string | null;
  ticket_id?: string | null;
  currency_pair?: string | null;
  direction?: string | null;
  exit_time?: string | null;
  entry_time?: string | null;
  position_size?: number | string | null;
};

type LedgerClient = {
  from: (table: string) => {
    select: (...args: any[]) => any;
    update: (...args: any[]) => any;
  };
};

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function isCompletedCashflow(status?: string | null): boolean {
  return !status || status === "completed";
}

export function cashflowNet(cashflows: CashflowLike[]): number {
  return roundMoney(
    cashflows.reduce((sum, item) => {
      if (!isCompletedCashflow(item.status)) return sum;
      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount)) return sum;
      if (item.type === "deposit") return sum + amount;
      if (item.type === "withdrawal") return sum - amount;
      return sum;
    }, 0)
  );
}

export function cashflowTotals(cashflows: CashflowLike[]): { deposits: number; withdrawals: number; net: number } {
  const completed = cashflows.filter((item) => isCompletedCashflow(item.status));
  const deposits = roundMoney(
    completed
      .filter((item) => item.type === "deposit")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );
  const withdrawals = roundMoney(
    completed
      .filter((item) => item.type === "withdrawal")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );
  return { deposits, withdrawals, net: roundMoney(deposits - withdrawals) };
}

export function closedTradePnl(trades: TradeLike[]): number {
  return roundMoney(
    trades.reduce((sum, trade) => {
      const pnl = Number(trade.profit_loss);
      if (!Number.isFinite(pnl)) return sum;
      const closed = trade.status === "closed" || trade.status == null;
      return closed ? sum + pnl : sum;
    }, 0)
  );
}

export function deriveAccountBalance(
  initialBalance: number | string | null | undefined,
  cashflows: CashflowLike[],
  trades: TradeLike[]
): number {
  return roundMoney(Number(initialBalance || 0) + cashflowNet(cashflows) + closedTradePnl(trades));
}

export function tradeIdentityKey(trade: TradeLike): string {
  const ticket = String(trade.ticket_id || "").trim();
  if (ticket) return `ticket:${ticket}`;

  const time = trade.exit_time || trade.entry_time || "";
  const pnl = Number(trade.profit_loss || 0).toFixed(2);
  const size = Number(trade.position_size || 0).toFixed(4);
  const pair = String(trade.currency_pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const dir = String(trade.direction || "").toLowerCase();
  return `fill:${pair}|${dir}|${time}|${size}|${pnl}`;
}

export async function syncAccountBalance(
  supabase: LedgerClient,
  accountId: string,
  userId: string
): Promise<number | null> {
  const { data: account, error: accountError } = await supabase
    .from("trading_accounts")
    .select("id, initial_balance, current_balance")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (accountError || !account) {
    return null;
  }

  const [{ data: trades }, { data: cashflows }] = await Promise.all([
    supabase
      .from("trades")
      .select("status, profit_loss")
      .eq("account_id", accountId)
      .eq("user_id", userId),
    supabase
      .from("account_cashflows")
      .select("type, amount, status")
      .eq("account_id", accountId)
      .eq("user_id", userId),
  ]);

  const nextBalance = deriveAccountBalance(account.initial_balance, cashflows || [], trades || []);
  const currentBalance = Number(account.current_balance || 0);

  if (Math.abs(currentBalance - nextBalance) > 0.005) {
    const { error: updateError } = await supabase
      .from("trading_accounts")
      .update({ current_balance: nextBalance, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to persist derived account balance:", updateError.message || updateError);
    }
  }

  return nextBalance;
}

export async function syncAccountBalances(
  supabase: LedgerClient,
  accounts: Array<{ id: string }>,
  userId: string
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    const next = await syncAccountBalance(supabase, account.id, userId);
    if (typeof next === "number") {
      balances.set(account.id, next);
    }
  }
  return balances;
}
