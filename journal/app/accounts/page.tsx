import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { AccountsList } from "@/components/accounts/accounts-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Accounts</h1>
            <p className="mt-2 text-gray-600">
              Manage your trading accounts
            </p>
          </div>
          <Link href="/accounts/new">
            <Button>Add Account</Button>
          </Link>
        </div>

        <AccountsList accounts={accounts || []} />
      </div>
    </AppLayout>
  );
}



