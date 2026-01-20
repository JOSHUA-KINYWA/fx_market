import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { TradeForm } from "@/components/trades/trade-form";

export default async function NewTradePage() {
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

  // Get strategies
  const { data: strategies } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Get trade setups
  const { data: setups } = await supabase
    .from("trade_setups")
    .select("*")
    .eq("user_id", user.id);

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add New Trade</h1>
          <p className="mt-2 text-gray-600">
            Record a new trade manually
          </p>
        </div>

        <TradeForm
          accounts={accounts || []}
          strategies={strategies || []}
          setups={setups || []}
        />
      </div>
    </AppLayout>
  );
}



