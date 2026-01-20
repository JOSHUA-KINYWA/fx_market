import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { RiskManagementDashboard } from "@/components/risk-management/risk-management-dashboard";
import { serializeArray } from "@/lib/utils/serialize";
import { calculateTradeMetrics } from "@/lib/utils/trade-calculations";

export default async function RiskManagementPage() {
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
    .eq("is_active", true);

  const accountIds = accounts?.map((a) => a.id) || [];

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .in("account_id", accountIds.length > 0 ? accountIds : [null])
    .order("entry_time", { ascending: false });

  // Convert to plain objects to avoid read-only issues
  const tradesData = trades ? serializeArray(trades) : [];
  const accountsData = accounts ? serializeArray(accounts) : [];

  // Update trades that are missing metrics or have incorrect status
  if (trades && trades.length > 0) {
    for (const trade of trades) {
      const hasExitData = trade.exit_time || trade.exit_price || (trade.profit_loss !== null && trade.profit_loss !== undefined);
      const shouldBeClosed = hasExitData && trade.status !== "closed";
      const missingMetrics = !trade.pips && !trade.risk_reward_ratio && !trade.r_multiple;

      if (shouldBeClosed || missingMetrics) {
        // Get account balance for calculations
        const account = accountsData.find(a => a.id === trade.account_id);
        
        // Calculate all metrics
        const metrics = calculateTradeMetrics({
          entry_price: trade.entry_price,
          exit_price: trade.exit_price || null,
          stop_loss: trade.stop_loss || null,
          take_profit: trade.take_profit || null,
          direction: trade.direction,
          currency_pair: trade.currency_pair,
          position_size: trade.position_size,
          profit_loss: trade.profit_loss || null,
          exit_time: trade.exit_time || null,
          current_balance: account?.current_balance || null,
        });

        // Update status if needed
        const newStatus = shouldBeClosed ? "closed" : trade.status;

        // Update trade in database
        await supabase
          .from("trades")
          .update({
            status: newStatus,
            pips: metrics.pips !== null ? metrics.pips : trade.pips,
            risk_reward_ratio: metrics.risk_reward_ratio !== null ? metrics.risk_reward_ratio : trade.risk_reward_ratio,
            r_multiple: metrics.r_multiple !== null ? metrics.r_multiple : trade.r_multiple,
            risk_amount: metrics.risk_amount !== null ? metrics.risk_amount : trade.risk_amount,
          })
          .eq("id", trade.id);
      }
    }
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Risk Management</h1>
          <p className="mt-2 text-slate-600">
            Analyze and improve your risk management practices
          </p>
        </div>

        <RiskManagementDashboard trades={tradesData} accounts={accountsData} />
      </div>
    </AppLayout>
  );
}



