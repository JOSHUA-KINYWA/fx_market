import Link from "next/link";
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
      const hasExitData = trade.exit_time || (trade.profit_loss !== null && trade.profit_loss !== undefined);
      const shouldBeClosed = hasExitData && trade.status !== "closed";
      const missingMetrics = !trade.pips && !trade.risk_reward_ratio && !trade.r_multiple;

      if (shouldBeClosed || missingMetrics) {
        // Get account balance for calculations
        const account = accountsData.find(a => a.id === trade.account_id);
        
        // Calculate all metrics
        const metrics = calculateTradeMetrics({
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

  }

  const finalAccountsData = accountsData;

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

          <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Account Operations
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-200">
                  {finalAccountsData.length} active account{finalAccountsData.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {finalAccountsData.slice(0, 3).map((account) => (
                  <Link
                    key={account.id}
                    href={`/accounts/${account.id}/cashflow`}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase text-white hover:bg-emerald-500 transition"
                  >
                    {account.account_name || "Ledger"}
                  </Link>
                ))}
                <Link
                  href="/analytics"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white hover:bg-blue-500 transition"
                >
                  Analytics
                </Link>
              </div>
            </div>
          </section>
          
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
