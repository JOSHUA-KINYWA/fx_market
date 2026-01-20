"use client";

import { Database } from "@/types/database.types";
import { format } from "date-fns";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface DashboardStatsProps {
  readonly trades: Trade[];
  readonly accounts: Database["public"]["Tables"]["trading_accounts"]["Row"][];
}

export function DashboardStats({ trades, accounts }: DashboardStatsProps) {
  // Filter for US30/NAS100 only (includes variations)
  const us30Trades = trades.filter((t) => {
    const pair = t.currency_pair?.toUpperCase() || "";
    return (
      pair.includes("US30") || 
      pair.includes("NAS100") ||
      pair.includes("U30") ||
      pair === "NAS100" ||
      pair === "US30"
    );
  });
  
  const closedTrades = us30Trades.filter((t) => t.status === "closed");
  const winningTrades = closedTrades.filter((t) => (t.profit_loss || 0) > 0);
  const losingTrades = closedTrades.filter((t) => (t.profit_loss || 0) < 0);
  const breakevenTrades = closedTrades.filter((t) => (t.profit_loss || 0) === 0);

  const totalProfit = closedTrades.reduce(
    (sum, t) => sum + (t.profit_loss || 0),
    0
  );
  const totalWins = winningTrades.reduce(
    (sum, t) => sum + (t.profit_loss || 0),
    0
  );
  const totalLosses = Math.abs(
    losingTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)
  );

  const winRate =
    closedTrades.length > 0
      ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1)
      : "0.0";

  const profitFactor =
    totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : "0.00";

  const avgWin =
    winningTrades.length > 0
      ? (totalWins / winningTrades.length).toFixed(2)
      : "0.00";
  
  const avgLoss =
    losingTrades.length > 0
      ? (totalLosses / losingTrades.length).toFixed(2)
      : "0.00";

  // Calculate R:R ratio
  const rrTrades = closedTrades.filter(
    (t) => t.risk_reward_ratio && parseFloat(t.risk_reward_ratio.toString()) > 0
  );
  const avgRR =
    rrTrades.length > 0
      ? (
          rrTrades.reduce(
            (sum, t) => sum + parseFloat(t.risk_reward_ratio?.toString() || "0"),
            0
          ) / rrTrades.length
        ).toFixed(2)
      : "0.00";

  // Calculate streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreak = 0;
  let lastResult = "";

  [...closedTrades].reverse().forEach((trade) => {
    const isProfitable = (trade.profit_loss || 0) > 0;
    if (lastResult === (isProfitable ? "win" : "loss") || lastResult === "") {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    lastResult = isProfitable ? "win" : "loss";

    if (isProfitable && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    if (!isProfitable && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
  });

  const largestWin =
    winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.profit_loss || 0))
      : 0;
  const largestLoss =
    losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.profit_loss || 0))
      : 0;

  // Calculate starting and current capital
  const startingCapital = accounts.reduce((sum, a) => sum + (a.initial_balance || 0), 0);
  const currentCapital = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalReturn = startingCapital > 0 
    ? (((currentCapital - startingCapital) / startingCapital) * 100).toFixed(2)
    : "0.00";

  const totalBalance = accounts.reduce(
    (sum, a) => sum + Number(a.current_balance || 0),
    0
  );

  // Calculate previous period for comparison (last 30 days vs previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentTrades = closedTrades.filter(
    (t) => new Date(t.exit_time || t.entry_time) >= thirtyDaysAgo
  );
  const previousTrades = closedTrades.filter(
    (t) => {
      const date = new Date(t.exit_time || t.entry_time);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    }
  );

  const recentProfit = recentTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const previousProfit = previousTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const profitChange = previousProfit !== 0 
    ? (((recentProfit - previousProfit) / Math.abs(previousProfit)) * 100).toFixed(1)
    : "0.0";

  // P&L by weekday - use exit_time for closed trades, entry_time for open trades
  const plByWeekday = closedTrades.reduce((acc, trade) => {
    const tradeDate = trade.exit_time || trade.entry_time;
    if (tradeDate) {
      const day = format(new Date(tradeDate), "EEEE");
      acc[day] = (acc[day] || 0) + (trade.profit_loss || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const weekdayEntries = Object.entries(plByWeekday);
  const bestDay =
    weekdayEntries.length > 0
      ? weekdayEntries.reduce((best, curr) =>
          curr[1] > best[1] ? curr : best
        )
      : null;
  const worstDay =
    weekdayEntries.length > 0
      ? weekdayEntries.reduce((worst, curr) =>
          curr[1] < worst[1] ? curr : worst
        )
      : null;

  // P&L by month
  const plByMonth = closedTrades.reduce((acc, trade) => {
    const monthKey = format(new Date(trade.exit_time || trade.entry_time), "yyyy-MM");
    acc[monthKey] = (acc[monthKey] || 0) + (trade.profit_loss || 0);
    return acc;
  }, {} as Record<string, number>);

  const monthEntries = Object.entries(plByMonth);
  const bestMonth =
    monthEntries.length > 0
      ? monthEntries.reduce((best, curr) =>
          curr[1] > best[1] ? curr : best
        )
      : null;
  const worstMonth =
    monthEntries.length > 0
      ? monthEntries.reduce((worst, curr) =>
          curr[1] < worst[1] ? curr : worst
        )
      : null;

  const stats = [
    {
      name: "Total P&L",
      value: `$${Math.abs(totalProfit).toFixed(2)}`,
      prefix: totalProfit >= 0 ? "+" : "-",
      change: `${totalProfit >= 0 ? "+" : ""}${profitChange}%`,
      trend: totalProfit >= 0 ? "up" : "down",
      color: totalProfit >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      name: "Win Rate",
      value: `${winRate}%`,
      change: `${winningTrades.length}W / ${losingTrades.length}L`,
      trend: Number(winRate) >= 50 ? "up" : "down",
      color: "text-white",
    },
    {
      name: "Total Trades",
      value: us30Trades.length.toString(),
      change: `${closedTrades.length} closed`,
      trend: "neutral" as const,
      color: "text-white",
    },
    {
      name: "Profit Factor",
      value: profitFactor,
      change: Number(profitFactor) >= 1 ? "Good" : "Needs improvement",
      trend: Number(profitFactor) >= 1 ? "up" : "down",
      color: "text-white",
    },
    {
      name: "Account Balance",
      value: `$${currentCapital.toFixed(2)}`,
      change: `${accounts.length} active account${accounts.length !== 1 ? "s" : ""}`,
      trend: "neutral" as const,
      color: "text-white",
    },
    {
      name: "Avg Win",
      value: `$${avgWin}`,
      change: "",
      trend: "neutral" as const,
      color: "text-green-400",
    },
    {
      name: "Avg Loss",
      value: `$${avgLoss}`,
      change: "",
      trend: "neutral" as const,
      color: "text-red-400",
    },
    {
      name: "Avg R:R",
      value: avgRR,
      change: "",
      trend: "neutral" as const,
      color: "text-white",
    },
    {
      name: "Largest Win",
      value: `$${largestWin.toFixed(2)}`,
      change: "",
      trend: "neutral" as const,
      color: "text-green-400",
    },
    {
      name: "Largest Loss",
      value: `$${Math.abs(largestLoss).toFixed(2)}`,
      change: "",
      trend: "neutral" as const,
      color: "text-red-400",
    },
    {
      name: "Max Win Streak",
      value: maxWinStreak.toString(),
      change: "",
      trend: "neutral" as const,
      color: "text-white",
    },
    {
      name: "Max Loss Streak",
      value: maxLossStreak.toString(),
      change: "",
      trend: "neutral" as const,
      color: "text-white",
    },
    {
      name: "Total Return",
      value: `${totalReturn}%`,
      change: "",
      trend: parseFloat(totalReturn) >= 0 ? "up" : "down",
      color: parseFloat(totalReturn) >= 0 ? "text-green-400" : "text-red-400",
    },
    bestDay && {
      name: "Best Day",
      value: bestDay[0],
      change: `$${bestDay[1].toFixed(2)} P&L`,
      trend: bestDay[1] >= 0 ? "up" : "down",
      icon: "📆",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      iconBg: "bg-emerald-100",
    },
    worstDay && {
      name: "Worst Day",
      value: worstDay[0],
      change: `$${worstDay[1].toFixed(2)} P&L`,
      trend: worstDay[1] >= 0 ? "up" : "down",
      icon: "📆",
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconBg: "bg-red-100",
    },
    bestMonth && {
      name: "Best Month",
      value: format(new Date(bestMonth[0] + "-01"), "MMM yyyy"),
      change: `$${bestMonth[1].toFixed(2)} P&L`,
      trend: bestMonth[1] >= 0 ? "up" : "down",
      icon: "🗓️",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100",
    },
    worstMonth && {
      name: "Worst Month",
      value: format(new Date(worstMonth[0] + "-01"), "MMM yyyy"),
      change: `$${worstMonth[1].toFixed(2)} P&L`,
      trend: worstMonth[1] >= 0 ? "up" : "down",
      icon: "🗓️",
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconBg: "bg-red-100",
    },
  ].filter(Boolean) as Array<{
    name: string;
    value: string;
    prefix?: string;
    change: string;
    trend: "up" | "down" | "neutral";
    icon: string;
    color: string;
    bgColor: string;
    iconBg: string;
  }>;

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-6 border border-slate-700">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">US30 Performance Metrics</h2>
        <p className="text-sm text-slate-400">Trading statistics for US30 only</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-slate-700 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition"
          >
            <p className="text-slate-400 text-xs mb-1">{stat.name}</p>
            <p className={`text-lg font-bold ${stat.color}`}>
              {stat.prefix && <span>{stat.prefix}</span>}
              {stat.value}
            </p>
            {stat.change && (
              <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
            )}
            {stat.trend !== "neutral" && (
              <div className="mt-1">
                <span className={`text-xs ${stat.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                  {stat.trend === "up" ? "↑" : "↓"}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {((bestDay || worstDay) || (bestMonth || worstMonth)) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-600">
          {[
            bestDay && {
              name: "Best Day",
              value: bestDay[0],
              change: `$${bestDay[1].toFixed(2)} P&L`,
              color: bestDay[1] >= 0 ? "text-green-400" : "text-red-400",
            },
            worstDay && {
              name: "Worst Day",
              value: worstDay[0],
              change: `$${worstDay[1].toFixed(2)} P&L`,
              color: worstDay[1] >= 0 ? "text-green-400" : "text-red-400",
            },
            bestMonth && {
              name: "Best Month",
              value: format(new Date(bestMonth[0] + "-01"), "MMM yyyy"),
              change: `$${bestMonth[1].toFixed(2)} P&L`,
              color: bestMonth[1] >= 0 ? "text-green-400" : "text-red-400",
            },
            worstMonth && {
              name: "Worst Month",
              value: format(new Date(worstMonth[0] + "-01"), "MMM yyyy"),
              change: `$${worstMonth[1].toFixed(2)} P&L`,
              color: worstMonth[1] >= 0 ? "text-green-400" : "text-red-400",
            },
          ]
            .filter(Boolean)
            .map((stat) => (
              stat && (
                <div
                  key={stat.name}
                  className="bg-slate-700 rounded-lg p-3 border border-slate-600"
                >
                  <p className="text-slate-400 text-xs mb-1">{stat.name}</p>
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
                </div>
              )
            ))}
        </div>
      )}
    </div>
  );
}
