import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { TradeForm } from "@/components/trades/trade-form";

export default async function EditTradePage({
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

  const { data: trade } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!trade) {
    redirect("/trades");
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: setups } = await supabase
    .from("trade_setups")
    .select("*")
    .eq("user_id", user.id);

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Trade</h1>
          <p className="mt-2 text-gray-600">
            Update trade information
          </p>
        </div>

        <TradeForm
          accounts={accounts || []}
          strategies={strategies || []}
          setups={setups || []}
          tradeId={id}
          initialData={trade}
        />
      </div>
    </AppLayout>
  );
}

