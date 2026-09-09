import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { AccountForm } from "@/components/accounts/account-form";

export default async function EditAccountPage({
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
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!account) {
    redirect("/accounts");
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Edit Account</h1>
          <p className="mt-2 text-slate-600">
            Update account information
          </p>
        </div>

        <AccountForm
          accountId={id}
          initialData={{
            account_name: account.account_name,
            broker_name: account.broker_name,
            account_number: account.account_number,
            account_type: account.account_type || "demo",
            currency: account.currency || "USD",
            initial_balance: account.initial_balance?.toString() || "0",
            is_active: account.is_active,
          }}
        />
      </div>
    </AppLayout>
  );
}

