import { roundMoney } from "@/lib/utils/account-ledger";

export const BROKER_STATEMENT_10_SEP_2026 = {
  source: "broker-2026-09-10-mpesa-25",
  asOf: "2026-09-10T19:01:27.830Z",
  balance: 104.14,
  deposits: 0,
  withdrawals: 25,
  realisedPnl: 73.65,
  closedTrades: 27,
  label: "Broker statement 10 Sep 2026",
};

const MPESA_WITHDRAWAL = {
  amount: 25,
  posted_at: "2026-09-09T06:19:09.265Z",
  note: "WD MPesa TID127741620",
  reason: "Broker listed withdrawal",
};

export type BrokerStatementSnapshot = {
  source: string;
  asOf: string;
  balance: number;
  deposits: number;
  withdrawals: number;
  realisedPnl: number;
  closedTrades: number;
  label?: string;
};

type LedgerClient = {
  from: (table: string) => {
    select: (...args: any[]) => any;
    update: (...args: any[]) => any;
    insert: (...args: any[]) => any;
    delete: (...args: any[]) => any;
  };
};

function isGeneratedStatementCashflow(item: {
  type?: string | null;
  note?: string | null;
  reason?: string | null;
  amount?: number | string | null;
}): boolean {
  const text = `${item.note || ""} ${item.reason || ""}`.toLowerCase();
  if (item.type === "deposit") return true;
  if (text.includes("broker statement")) return true;
  if (text.includes("deposit remainder") || text.includes("withdrawal remainder")) return true;
  if (item.type === "withdrawal" && Math.abs(Number(item.amount || 0) - MPESA_WITHDRAWAL.amount) > 0.009 && text.includes("broker")) {
    return true;
  }
  return false;
}

export function isAfterStatement(dateValue: string | null | undefined, asOf: string): boolean {
  if (!dateValue) return false;
  return new Date(dateValue).getTime() > new Date(asOf).getTime();
}

export async function applyBalanceDelta(
  supabase: LedgerClient,
  accountId: string,
  userId: string,
  delta: number
): Promise<number | null> {
  const amount = roundMoney(delta);
  if (Math.abs(amount) < 0.005) {
    const { data: account } = await supabase
      .from("trading_accounts")
      .select("current_balance")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();
    return account ? Number(account.current_balance || 0) : null;
  }

  const { data: account } = await supabase
    .from("trading_accounts")
    .select("current_balance")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (!account) return null;

  const nextBalance = roundMoney(Number(account.current_balance || 0) + amount);
  const { error } = await supabase
    .from("trading_accounts")
    .update({ current_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to apply balance delta:", error.message || error);
    return Number(account.current_balance || 0);
  }

  return nextBalance;
}

export async function saveBrokerSnapshot(
  supabase: LedgerClient,
  userId: string,
  accountId: string,
  snapshot: BrokerStatementSnapshot
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_settings")
    .select("id, preferences")
    .eq("user_id", userId)
    .maybeSingle();

  const currentPrefs = (existing?.preferences || {}) as Record<string, unknown>;
  const byAccount = {
    ...((currentPrefs.brokerStatementByAccountId as Record<string, BrokerStatementSnapshot>) || {}),
    [accountId]: snapshot,
  };
  const payload = {
    user_id: userId,
    preferences: {
      ...currentPrefs,
      brokerStatementByAccountId: byAccount,
    },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("user_settings").update(payload).eq("user_id", userId);
  } else {
    await supabase.from("user_settings").insert(payload);
  }
}

export function readBrokerSnapshot(
  preferences: Record<string, unknown> | null | undefined,
  accountId: string
): BrokerStatementSnapshot | null {
  const byAccount = (preferences?.brokerStatementByAccountId || {}) as Record<string, BrokerStatementSnapshot>;
  return byAccount[accountId] || null;
}

export async function applyBrokerStatement(
  supabase: LedgerClient,
  accountId: string,
  userId: string,
  snapshot: BrokerStatementSnapshot = BROKER_STATEMENT_10_SEP_2026
): Promise<number> {
  const { data: cashflows } = await supabase
    .from("account_cashflows")
    .select("id, type, amount, status, posted_at, created_at, note, reason")
    .eq("account_id", accountId)
    .eq("user_id", userId);

  const staleIds = (cashflows || [])
    .filter((item) => isGeneratedStatementCashflow(item))
    .map((item) => item.id)
    .filter(Boolean);

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("account_cashflows")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .in("id", staleIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  const { data: remainingCashflows } = await supabase
    .from("account_cashflows")
    .select("id, type, amount, status, posted_at, created_at, note, reason")
    .eq("account_id", accountId)
    .eq("user_id", userId);

  const { data: laterTrades } = await supabase
    .from("trades")
    .select("profit_loss, status, exit_time, entry_time")
    .eq("account_id", accountId)
    .eq("user_id", userId);

  const hasMpesaWithdrawal = (remainingCashflows || []).some(
    (item) => item.type === "withdrawal" && Math.abs(Number(item.amount || 0) - MPESA_WITHDRAWAL.amount) < 0.009
  );

  if (snapshot.withdrawals > 0 && !hasMpesaWithdrawal) {
    const { error } = await supabase.from("account_cashflows").insert({
      user_id: userId,
      account_id: accountId,
      type: "withdrawal",
      amount: MPESA_WITHDRAWAL.amount,
      status: "completed",
      note: MPESA_WITHDRAWAL.note,
      reason: MPESA_WITHDRAWAL.reason,
      currency: "USD",
      posted_at: MPESA_WITHDRAWAL.posted_at,
    });
    if (error) {
      throw error;
    }
  }

  const laterPnl = roundMoney(
    (laterTrades || []).reduce((sum: number, trade: { profit_loss?: number | string | null; status?: string | null; exit_time?: string | null; entry_time?: string | null }) => {
      if (!isAfterStatement(trade.exit_time || trade.entry_time, snapshot.asOf)) return sum;
      const pnl = Number(trade.profit_loss);
      if (!Number.isFinite(pnl)) return sum;
      return sum + pnl;
    }, 0)
  );

  const laterCash = roundMoney(
    (remainingCashflows || []).reduce((sum: number, item: { type?: string | null; amount?: number | string | null; status?: string | null; posted_at?: string | null; created_at?: string | null }) => {
      const when = item.posted_at || item.created_at;
      if (!isAfterStatement(when, snapshot.asOf)) return sum;
      if (item.status && item.status !== "completed") return sum;
      const amount = Number(item.amount || 0);
      if (item.type === "deposit") return sum + amount;
      if (item.type === "withdrawal") return sum - amount;
      return sum;
    }, 0)
  );

  const nextBalance = roundMoney(snapshot.balance + laterPnl + laterCash);

  await supabase
    .from("trading_accounts")
    .update({ current_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", userId);

  await saveBrokerSnapshot(supabase, userId, accountId, {
    ...snapshot,
    deposits: 0,
    withdrawals: 25,
    balance: snapshot.balance || BROKER_STATEMENT_10_SEP_2026.balance,
  });
  return nextBalance;
}

export async function ensureBrokerStatement(
  supabase: LedgerClient,
  accountId: string,
  userId: string,
  preferences: Record<string, unknown> | null | undefined
): Promise<BrokerStatementSnapshot> {
  const existing = readBrokerSnapshot(preferences, accountId);
  if (existing?.source === BROKER_STATEMENT_10_SEP_2026.source) {
    return existing;
  }

  await applyBrokerStatement(supabase, accountId, userId, BROKER_STATEMENT_10_SEP_2026);
  return BROKER_STATEMENT_10_SEP_2026;
}
