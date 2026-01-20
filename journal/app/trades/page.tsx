import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { TradesListWithFilters } from "@/components/trades/trades-list-with-filters";
import { serializeArray } from "@/lib/utils/serialize";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get trading accounts
  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const accountIds = accounts?.map((a) => a.id) || [];

  // Get all trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .in("account_id", accountIds.length > 0 ? accountIds : [null])
    .order("entry_time", { ascending: false });

  // Convert to plain objects to avoid read-only issues
  const tradesData = trades ? serializeArray(trades) : [];
  const accountsData = accounts ? serializeArray(accounts) : [];

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Trades</h1>
            <p className="mt-2 text-slate-600">
              Manage and review your trading history
            </p>
          </div>
          <Link href="/trades/new">
            <Button>Add Trade</Button>
          </Link>
        </div>

        <TradesListWithFilters trades={tradesData} accounts={accountsData} />
      </div>
    </AppLayout>
  );
}

