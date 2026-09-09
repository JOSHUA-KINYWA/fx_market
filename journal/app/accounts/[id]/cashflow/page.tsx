import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { CashflowForm } from "@/components/accounts/cashflow-form";

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

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
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
