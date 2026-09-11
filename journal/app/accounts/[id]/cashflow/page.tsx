import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { CashflowForm } from "@/components/accounts/cashflow-form";
import { AccountLedgerSummary } from "@/components/accounts/account-ledger-summary";
import { BrokerStatementForm } from "@/components/accounts/broker-statement-form";
import { readBrokerSnapshot } from "@/lib/utils/broker-statement";

export default async function AccountCashflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: account } = await supabase
    .from("trading_accounts")
    .select("id, account_name, current_balance, currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!account) {
    redirect("/accounts");
  }

  const { data: movements } = await supabase
    .from("account_cashflows")
    .select("id, type, amount, created_at, posted_at, note, status, reason, currency")
    .eq("account_id", id)
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(500);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const snapshot = readBrokerSnapshot((settings?.preferences || {}) as Record<string, unknown>, account.id);

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0 space-y-6">
        <BrokerStatementForm
          accountId={account.id}
          currency={account.currency}
          snapshot={snapshot}
        />
        <AccountLedgerSummary
          accountId={account.id}
          accountName={account.account_name}
          currency={account.currency || "USD"}
          currentBalance={Number(account.current_balance || 0)}
          movements={
            (movements || []).map((movement) => ({
              id: movement.id,
              type: movement.type as "deposit" | "withdrawal",
              amount: Number(movement.amount || 0),
              created_at: movement.posted_at || movement.created_at,
              note: movement.note,
              status: (movement.status || "completed") as "pending" | "completed" | "review",
            }))
          }
        />

        <CashflowForm
          account={{
            id: account.id,
            account_name: account.account_name,
            current_balance: account.current_balance,
            currency: account.currency,
          }}
        />
      </div>
    </AppLayout>
  );
}
