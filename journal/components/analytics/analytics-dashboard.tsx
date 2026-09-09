"use client";

import { useState, useEffect } from "react";
import { Database } from "@/types/database.types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { createClient } from "@/lib/supabase/client";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Account = Database["public"]["Tables"]["trading_accounts"]["Row"];

interface AnalyticsDashboardProps {
  trades: Trade[];
  accounts: Account[];
}

export function AnalyticsDashboard({ trades, accounts }: AnalyticsDashboardProps) {
  const [emotionStats, setEmotionStats] = useState<any[]>([]);
  const [mistakeStats, setMistakeStats] = useState<any[]>([]);

  const closedTrades = trades.filter((t) => t.status === "closed");

  const totalPnl = trades.reduce((sum, trade) => sum + Number(trade.profit_loss || 0), 0);
  const winners = closedTrades.filter((trade) => Number(trade.profit_loss || 0) >= 0);
  const totalWins = winners.length;
  const winRate = closedTrades.length > 0 ? (totalWins / closedTrades.length) * 100 : 0;
  const grossProfit = closedTrades.filter((t) => Number(t.profit_loss || 0) > 0).reduce((sum, trade) => sum + Number(trade.profit_loss || 0), 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => Number(t.profit_loss || 0) < 0).reduce((sum, trade) => sum + Number(trade.profit_loss || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgR = closedTrades.length > 0
    ? closedTrades.reduce((sum, trade) => sum + Number(trade.r_multiple || 0), 0) / closedTrades.length
    : 0;

  const selectedAccountBalances = accounts
    .filter((account) => account.id && trades.some((trade) => trade.account_id === account.id))
    .map((account) => ({
      account: account.account_name,
      balance: Number(account.current_balance || 0),
      currency: account.currency || "USD",
    }));

  useEffect(() => {
    loadPsychologyData();
  }, [trades]);

  const loadPsychologyData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const tradeIds = closedTrades.map((t) => t.id);
    if (tradeIds.length === 0) {
      return;
    }

    // Get emotion stats
    const { data: emotions } = await supabase
      .from("trade_emotions")
      .select("emotion_id, timing, trades!inner(profit_loss)")
      .in("trade_id", tradeIds);

    // Get mistake stats
    const { data: mistakes } = await supabase
      .from("trade_mistakes")
      .select("mistake_id, trades!inner(profit_loss)")
      .in("trade_id", tradeIds);

    // Get tag names
    const { data: emotionTags } = await supabase
      .from("emotion_tags")
      .select("id, name")
      .eq("user_id", user.id);

    const { data: mistakeTags } = await supabase
      .from("mistake_tags")
      .select("id, name")
      .eq("user_id", user.id);

    // Process emotion stats
    if (emotions && emotionTags) {
      const emotionMap = new Map(emotionTags.map((t) => [t.id, t.name]));
      const emotionData = emotions.reduce((acc: any, e: any) => {
        const name = emotionMap.get(e.emotion_id) || "Unknown";
        if (!acc[name]) {
          acc[name] = { count: 0, totalProfit: 0, wins: 0 };
        }
        acc[name].count++;
        acc[name].totalProfit += e.trades.profit_loss || 0;
        if ((e.trades.profit_loss || 0) > 0) acc[name].wins++;
        return acc;
      }, {});

      setEmotionStats(
        Object.entries(emotionData).map(([name, data]: [string, any]) => ({
          name,
          count: data.count,
          avgProfit: data.totalProfit / data.count,
          winRate: (data.wins / data.count) * 100,
        }))
      );
    }

    // Process mistake stats
    if (mistakes && mistakeTags) {
      const mistakeMap = new Map(mistakeTags.map((t) => [t.id, t.name]));
      const mistakeData = mistakes.reduce((acc: any, m: any) => {
        const name = mistakeMap.get(m.mistake_id) || "Unknown";
        if (!acc[name]) {
          acc[name] = { count: 0, totalCost: 0 };
        }
        acc[name].count++;
        acc[name].totalCost += Math.abs(m.trades.profit_loss || 0);
        return acc;
      }, {});

      setMistakeStats(
        Object.entries(mistakeData).map(([name, data]: [string, any]) => ({
          name,
          count: data.count,
          avgCost: data.totalCost / data.count,
          totalCost: data.totalCost,
        }))
      );
    }
  };
  
  // Calculate equity curve
  const equityData = closedTrades.reduce((acc, trade, index) => {
    const previousEquity = acc.length > 0 ? acc[acc.length - 1].equity : 0;
    const newEquity = previousEquity + (trade.profit_loss || 0);
    acc.push({
      trade: index + 1,
      equity: newEquity,
      date: new Date(trade.exit_time || trade.entry_time).toLocaleDateString(),
    });
    return acc;
  }, [] as { trade: number; equity: number; date: string }[]);

  const monthlyPnl = closedTrades.reduce((acc, trade) => {
    const date = new Date(trade.exit_time || trade.entry_time || trade.created_at || new Date());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) {
      acc[key] = { month: key, pnl: 0 };
    }
    acc[key].pnl += Number(trade.profit_loss || 0);
    return acc;
  }, {} as Record<string, { month: string; pnl: number }>);

  const monthlyCurveData = Object.values(monthlyPnl).map((entry) => ({
    month: entry.month,
    pnl: Number(entry.pnl.toFixed(2)),
  }));

  const accountHealth = accounts.length > 0
    ? accounts.reduce((acc, account) => {
        acc.totalBalance += Number(account.current_balance || 0);
        return acc;
      }, { totalBalance: 0 })
    : { totalBalance: 0 };

  // Performance by currency pair
  const pairPerformance = closedTrades.reduce((acc, trade) => {
    const pair = trade.currency_pair;
    if (!acc[pair]) {
      acc[pair] = { trades: 0, profit: 0, wins: 0 };
    }
    acc[pair].trades++;
    acc[pair].profit += trade.profit_loss || 0;
    if ((trade.profit_loss || 0) > 0) acc[pair].wins++;
    return acc;
  }, {} as Record<string, { trades: number; profit: number; wins: number }>);

  const pairData = Object.entries(pairPerformance).map(([pair, data]) => ({
    pair,
    profit: data.profit,
    winRate: (data.wins / data.trades) * 100,
    trades: data.trades,
  }));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Net P&L", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`, tone: totalPnl >= 0 ? "emerald" : "rose" },
          { label: "Win Rate", value: `${winRate.toFixed(1)}%`, tone: "blue" },
          { label: "Profit Factor", value: profitFactor.toFixed(2), tone: "violet" },
          { label: "Avg R", value: avgR.toFixed(2), tone: "amber" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{metric.label}</div>
            <div className={`mt-2 text-3xl font-black ${metric.tone === "emerald" ? "text-emerald-700" : metric.tone === "rose" ? "text-rose-700" : metric.tone === "blue" ? "text-blue-700" : metric.tone === "violet" ? "text-violet-700" : "text-amber-700"}`}>{metric.value}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Closed Trades</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{closedTrades.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Accounts Linked</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{accounts.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Account Balance</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{accountHealth.totalBalance.toFixed(2)}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Equity Curve</h3>
          {equityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trade" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="equity" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No closed trades to display</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly P&amp;L Curve</h3>
          {monthlyCurveData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyCurveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="pnl" stroke="#10B981" fill="#B7F7D4" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No monthly curve to display</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Pair</h3>
          {pairData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pairData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pair" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profit" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data to display</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Balance Map</h3>
          {selectedAccountBalances.length > 0 ? (
            <div className="space-y-3">
              {selectedAccountBalances.map((account) => (
                <div key={account.account} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span className="font-semibold text-slate-800">{account.account}</span>
                  <span className="font-black text-slate-900">{account.currency} {account.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No account balance data</p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pair Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pair</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total P&L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pairData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                pairData.map((data) => (
                  <tr key={data.pair}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {data.pair}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.trades}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        data.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${data.profit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.winRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Psychology Insights */}
      {(emotionStats.length > 0 || mistakeStats.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {emotionStats.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Emotion</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Emotion</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg P&L</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {emotionStats.map((stat) => (
                      <tr key={stat.name}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{stat.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{stat.count}</td>
                        <td
                          className={`px-4 py-2 text-sm font-medium ${
                            stat.avgProfit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${stat.avgProfit.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{stat.winRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mistakeStats.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cost of Mistakes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mistake</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Times</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mistakeStats
                      .sort((a, b) => b.totalCost - a.totalCost)
                      .map((stat) => (
                        <tr key={stat.name}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{stat.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{stat.count}</td>
                          <td className="px-4 py-2 text-sm text-red-600 font-medium">
                            ${stat.avgCost.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-red-600 font-semibold">
                            ${stat.totalCost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

