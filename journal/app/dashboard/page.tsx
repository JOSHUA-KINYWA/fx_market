import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { TradingPsychologyQuotes } from "@/components/trades/trading-psychology-quotes";
import { serializeArray } from "@/lib/utils/serialize";
import { calculateTradeMetrics } from "@/lib/utils/trade-calculations";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get trading accounts
  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const accountIds = accounts?.map((a) => a.id) || [];

  // Get trades for stats - fetch all trades for accurate calculations
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

        // Update local data for immediate display
        const tradeIndex = tradesData.findIndex(t => t.id === trade.id);
        if (tradeIndex !== -1) {
          tradesData[tradeIndex] = {
            ...tradesData[tradeIndex],
            status: newStatus,
            pips: metrics.pips !== null ? metrics.pips : tradesData[tradeIndex].pips,
            risk_reward_ratio: metrics.risk_reward_ratio !== null ? metrics.risk_reward_ratio : tradesData[tradeIndex].risk_reward_ratio,
            r_multiple: metrics.r_multiple !== null ? metrics.r_multiple : tradesData[tradeIndex].r_multiple,
            risk_amount: metrics.risk_amount !== null ? metrics.risk_amount : tradesData[tradeIndex].risk_amount,
          };
        }
      }
    }

    // Update account balances after fixing trades
    for (const account of accountsData) {
      const accountTrades = tradesData.filter(
        (t) => t.account_id === account.id && t.status === "closed"
      );
      const totalPnL = accountTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const calculatedBalance = (account.initial_balance || 0) + totalPnL;

      if (Math.abs(calculatedBalance - (account.current_balance || 0)) > 0.01) {
        await supabase
          .from("trading_accounts")
          .update({ current_balance: calculatedBalance })
          .eq("id", account.id);
      }
    }
  }

  // Calculate and update account balances based on trades
  if (accountsData.length > 0) {
    for (const account of accountsData) {
      const accountTrades = tradesData.filter(
        (t) => t.account_id === account.id && t.status === "closed"
      );
      const totalPnL = accountTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const calculatedBalance = (account.initial_balance || 0) + totalPnL;

      if (Math.abs(calculatedBalance - (account.current_balance || 0)) > 0.01) {
        await supabase
          .from("trading_accounts")
          .update({ current_balance: calculatedBalance })
          .eq("id", account.id);
        
        // Update the accountsData array for immediate display
        const accountIndex = accountsData.findIndex(a => a.id === account.id);
        if (accountIndex !== -1) {
          accountsData[accountIndex] = {
            ...accountsData[accountIndex],
            current_balance: calculatedBalance,
          };
        }
      }
    }
  }
  
  // Refetch accounts to ensure we have the latest balance data
  const { data: updatedAccounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);
  
  const finalAccountsData = updatedAccounts ? serializeArray(updatedAccounts) : accountsData;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-slate-400">
              Track your trading performance and improve your strategy
            </p>
          </div>

          <TradingPsychologyQuotes />
          
          <DashboardStats trades={tradesData} accounts={finalAccountsData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DashboardCharts trades={tradesData} />
            <RecentTrades trades={tradesData} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
